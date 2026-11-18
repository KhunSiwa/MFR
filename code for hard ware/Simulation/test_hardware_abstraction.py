#!/usr/bin/env python3
"""Unit & Safety Verification Suite for MFR Hardware Abstraction Layer + C++ Firmware Core."""

import os
import subprocess
import tempfile
import time
import unittest
from pathlib import Path
import sys

HW_ROOT = Path(__file__).resolve().parent.parent
if str(HW_ROOT) not in sys.path:
    sys.path.insert(0, str(HW_ROOT))

# Import modules cleanly despite numeric/space folder names
from Driving_System.ZK_BM1.zk_bm1_driver import ZKBM1DriverHAL, ZK_BM1_MAX_PWM_HZ
from Cleaner_Module.L9110S.l9110s_guard import verify_l9110s_compatibility
from Communication.API_Protocol.robot_protocol import CommandGuardError, RobotMotionCommand
from Simulation.sim_robot_harness import MFRRobotControlService


class TestMFRHardwareSafety(unittest.TestCase):
    def test_zkbm1_rejects_excessive_pwm_frequency(self):
        with self.assertRaises(ValueError):
            ZKBM1DriverHAL(pwm_hz=ZK_BM1_MAX_PWM_HZ + 500)

    def test_l9110s_rejects_unknown_or_overcurrent_pump(self):
        self.assertFalse(verify_l9110s_compatibility(None, None)["compatible"])
        over = verify_l9110s_compatibility(12.0, 1200)
        self.assertFalse(over["compatible"])
        ok = verify_l9110s_compatibility(5.0, 550)
        self.assertTrue(ok["compatible"])

    def test_ai_cannot_issue_motor_commands(self):
        svc = MFRRobotControlService(hardware_verified=False)
        with self.assertRaises(CommandGuardError):
            svc.execute_command(
                RobotMotionCommand(command="FORWARD", left_pct=50, right_pct=50, source_layer="AI_CV_MODEL")
            )

    def test_estop_blocks_motion_until_human_clear_and_cuts_all_outputs(self):
        svc = MFRRobotControlService(hardware_verified=False)
        with self.assertRaises(CommandGuardError):
            svc.execute_command(RobotMotionCommand(command="FORWARD", left_pct=40, right_pct=40))
        svc.execute_command(RobotMotionCommand(command="CLEAR_ESTOP", human_approved=True))
        res = svc.execute_command(RobotMotionCommand(command="FORWARD", left_pct=40, right_pct=40))
        self.assertEqual(res["hardware"]["driving_system"]["left_pct"], 40)
        self.assertFalse(res["hardware"]["physical_outputs_armed"])

        # Immediate E-Stop neutralizes drive + cleaner + ESC
        est = svc.execute_command(RobotMotionCommand(command="ESTOP"))
        self.assertTrue(est["hardware"]["estop_engaged"])
        self.assertEqual(est["hardware"]["driving_system"]["left_pct"], 0)
        self.assertEqual(est["hardware"]["impeller_esc"]["pulse_us"], 1000)

    def test_watchdog_stops_motors_on_timeout(self):
        svc = MFRRobotControlService(hardware_verified=False)
        svc.dispatcher.watchdog_timeout_sec = 0.05
        svc.execute_command(RobotMotionCommand(command="CLEAR_ESTOP", human_approved=True))
        svc.execute_command(RobotMotionCommand(command="FORWARD", left_pct=50, right_pct=50))
        time.sleep(0.08)
        trig = svc.check_watchdog_tick()
        self.assertIsNotNone(trig)
        self.assertEqual(trig["hardware"]["driving_system"]["left_pct"], 0)

    def test_cleaner_blocks_structural_crack_auto_cleaning(self):
        svc = MFRRobotControlService(hardware_verified=False)
        svc.execute_command(RobotMotionCommand(command="CLEAR_ESTOP", human_approved=True))
        with self.assertRaises(PermissionError):
            svc.pump.start_cleaning(
                task_id="T-001",
                human_approved=True,
                defect_decision_type="REPAIR_REQUIRED",
                duration_sec=5.0,
            )

    def test_native_cpp_firmware_compiles_and_passes_watchdog(self):
        harness = r"""
        #include <cassert>
        #include <iostream>
        #include "src/main.cpp"
        int main() {
          MFRControllerCore core;
          core.begin(0);
          assert(!core.telemetry().hardware_outputs_armed);
          assert(!core.apply_drive_command(60, 60, 1200, 10)); // blocked under default estop
          core.clear_estop(20);
          assert(core.apply_drive_command(60, 60, 1200, 30));
          core.tick(500, 50);
          assert(core.telemetry().left_pct == 60);
          core.tick(2000, 50); // triggers 1200ms watchdog
          assert(core.telemetry().left_pct == 0);
          assert(core.telemetry().impeller_us == mfr_safety::ESC_DISARM_US);
          std::cout << "CPP_FIRMWARE_SIM_OK\n";
          return 0;
        }
        """
        fw_dir = HW_ROOT / "ESP32_S3_Firmware"
        with tempfile.TemporaryDirectory() as td:
            cpp_file = Path(td) / "test_fw.cpp"
            bin_file = Path(td) / "test_fw"
            cpp_file.write_text(harness)
            subprocess.run(
                ["clang++", "-std=c++17", "-I", str(fw_dir), str(cpp_file), "-o", str(bin_file)],
                check=True,
            )
            out = subprocess.check_output([str(bin_file)], text=True)
            self.assertIn("CPP_FIRMWARE_SIM_OK", out)


if __name__ == "__main__":
    unittest.main(verbosity=2)
