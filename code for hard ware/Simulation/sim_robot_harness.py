"""Unified MFR Robot Simulation & Safe Backend Control Harness."""

from __future__ import annotations

import importlib
import sys
from pathlib import Path
from typing import Any, Dict, Optional

HW_ROOT = Path(__file__).resolve().parent.parent
if str(HW_ROOT) not in sys.path:
    sys.path.insert(0, str(HW_ROOT))

ZKBM1DriverHAL = importlib.import_module("Driving_System.ZK_BM1.zk_bm1_driver").ZKBM1DriverHAL
Motor25GAInterface = importlib.import_module("Driving_System.25GA_Motor.motor_25ga_interface").Motor25GAInterface
BrushlessESCInterface = importlib.import_module("Driving_System.Brushless_ESC.esc_interface").BrushlessESCInterface
PumpController = importlib.import_module("Cleaner_Module.Pump_Motor.pump_controller").PumpController
_proto = importlib.import_module("Communication.API_Protocol.robot_protocol")
CommandGuardError = _proto.CommandGuardError
RobotCommandDispatcher = _proto.RobotCommandDispatcher
RobotMotionCommand = _proto.RobotMotionCommand
ESP32Bridge = importlib.import_module("Communication.WebSocket.esp32_ws_bridge").ESP32Bridge


class MFRRobotControlService:
    """
    Single controlled backend entry point bridging FastAPI -> Communication -> HALs / Simulation.
    Physical motor & pump energization stays DISABLED unless explicitly verified.
    """

    def __init__(self, hardware_verified: bool = False) -> None:
        self.hardware_verified = hardware_verified
        self.zkbm1 = ZKBM1DriverHAL(pwm_hz=1000, hardware_verified=hardware_verified)
        self.motors = Motor25GAInterface()
        self.esc = BrushlessESCInterface(bench_verified=hardware_verified)
        self.pump = PumpController(max_duration_sec=15.0, simulation_mode=not hardware_verified)
        self.dispatcher = RobotCommandDispatcher(watchdog_timeout_sec=1.2)
        self.bridge = ESP32Bridge(transport="SIMULATION" if not hardware_verified else "WEBSOCKET")
        self.last_command = "STOP"

    def execute_command(self, cmd: RobotMotionCommand) -> Dict[str, Any]:
        self.dispatcher.validate(cmd)
        self.dispatcher.touch()

        if cmd.command == "ESTOP":
            self.dispatcher.estop_engaged = True
            self.zkbm1.stop_all()
            self.motors.command_speed(0, 0)
            self.esc.disarm()
            self.pump.emergency_stop()
            self.last_command = "ESTOP"
            packet = self.bridge.send_packet({"cmd": "ESTOP"})
            return {"status": "E_STOP_ENGAGED", "hardware": self.hardware_status(), "packet": packet}

        if cmd.command == "CLEAR_ESTOP":
            if not cmd.human_approved:
                raise CommandGuardError("Releasing E-Stop requires explicit human confirmation.")
            self.dispatcher.estop_engaged = False
            self.pump.estop_engaged = False
            self.last_command = "STOP"
            packet = self.bridge.send_packet({"cmd": "CLEAR_ESTOP"})
            return {"status": "ESTOP_CLEARED_SAFE_IDLE", "hardware": self.hardware_status(), "packet": packet}

        if cmd.command in {"STOP", "FORWARD", "BACKWARD", "TURN_LEFT", "TURN_RIGHT"}:
            mapping = {
                "STOP": (0, 0),
                "FORWARD": (cmd.left_pct or 45, cmd.right_pct or 45),
                "BACKWARD": (-(cmd.left_pct or 40), -(cmd.right_pct or 40)),
                "TURN_LEFT": (-35, 35),
                "TURN_RIGHT": (35, -35),
            }
            lp, rp = mapping[cmd.command]
            self.motors.command_speed(lp, rp)
            ch1 = self.zkbm1.set_channel("CH1_LEFT", lp)
            ch2 = self.zkbm1.set_channel("CH2_RIGHT", rp)
            self.motors.step_simulation(0.1)
            self.last_command = cmd.command
            packet = self.bridge.send_packet({"cmd": "DRIVE", "left": lp, "right": rp, "impeller_us": self.esc.pulse_us})
            return {"status": "OK", "ch1": ch1, "ch2": ch2, "hardware": self.hardware_status(), "packet": packet}

        if cmd.command == "IMPELLER_SET":
            res = self.esc.set_throttle_pct(cmd.impeller_pct)
            self.last_command = "IMPELLER_SET"
            packet = self.bridge.send_packet({"cmd": "DRIVE", "left": self.motors.left_target_pct, "right": self.motors.right_target_pct, "impeller_us": res["pulse_us"]})
            return {"status": "OK", "impeller": res, "hardware": self.hardware_status(), "packet": packet}

        if cmd.command == "PUMP_ON":
            st = self.pump.set_pump_state(True, human_approved=cmd.human_approved)
            self.last_command = "PUMP_ON"
            packet = self.bridge.send_packet({"cmd": "PUMP", "enable": True})
            return {"status": "OK", "cleaner": st, "hardware": self.hardware_status(), "packet": packet}

        if cmd.command == "PUMP_OFF":
            st = self.pump.set_pump_state(False)
            self.last_command = "PUMP_OFF"
            packet = self.bridge.send_packet({"cmd": "PUMP", "enable": False})
            return {"status": "OK", "cleaner": st, "hardware": self.hardware_status(), "packet": packet}

        raise CommandGuardError(f"Unknown robot command: {cmd.command}")

    def check_watchdog_tick(self) -> Optional[Dict[str, Any]]:
        self.pump.check_watchdog()
        if self.dispatcher.check_timeout() and (
            self.motors.left_target_pct != 0 or self.motors.right_target_pct != 0 or self.esc.armed
        ):
            self.zkbm1.stop_all()
            self.motors.command_speed(0, 0)
            self.esc.disarm()
            self.last_command = "WATCHDOG_STOP"
            return {"watchdog_triggered": True, "hardware": self.hardware_status()}
        return None

    def hardware_status(self) -> Dict[str, Any]:
        return {
            "simulation_mode": not self.hardware_verified,
            "physical_outputs_armed": self.hardware_verified,
            "estop_engaged": self.dispatcher.estop_engaged,
            "last_command": self.last_command,
            "esp32_s3": {
                "board": "ESP32-S3-WROOM (MFR.step Verified Geometry)",
                "transport": self.bridge.transport,
                "connected": self.bridge.connected,
                "pins_verified": False,
                "usb_host_uvc_supported_for_prod": False,
            },
            "driving_system": {
                "driver": "ZK-BM1 (3-18V, 10A cont / 15A peak, PWM <= 2kHz)",
                "pwm_hz": self.zkbm1.pwm_hz,
                "left_pct": self.motors.left_target_pct,
                "right_pct": self.motors.right_target_pct,
                "encoder_ticks": [self.motors.left_ticks, self.motors.right_ticks],
                "motor_spec_verified": self.motors.is_electrically_verified(),
            },
            "impeller_esc": {
                "armed": self.esc.armed,
                "pulse_us": self.esc.pulse_us,
                "bench_verified": self.esc.bench_verified,
            },
            "cleaner_module": self.pump.status(),
        }
