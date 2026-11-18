"""ZK-BM1 Dual-Channel MOSFET DC Motor Driver Hardware Abstraction Layer (Python Backend)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict

ZK_BM1_MIN_VCC_V = 3.0
ZK_BM1_MAX_VCC_V = 18.0
ZK_BM1_CONT_CURRENT_A = 10.0
ZK_BM1_PEAK_CURRENT_A = 15.0
ZK_BM1_MAX_PWM_HZ = 2000


@dataclass
class ZKBM1ChannelCommand:
    channel: str  # "CH1_LEFT" | "CH2_RIGHT"
    duty_pct: int  # -100..+100
    pwm_hz: int
    simulation_only: bool = True

    def validate(self) -> None:
        if self.channel not in {"CH1_LEFT", "CH2_RIGHT"}:
            raise ValueError(f"Unsupported ZK-BM1 channel: {self.channel}")
        if not -100 <= self.duty_pct <= 100:
            raise ValueError(f"duty_pct out of bounds [-100, 100]: {self.duty_pct}")
        if not 1 <= self.pwm_hz <= ZK_BM1_MAX_PWM_HZ:
            raise ValueError(
                f"ZK-BM1 PWM frequency {self.pwm_hz} Hz exceeds safe MOSFET limit (<= {ZK_BM1_MAX_PWM_HZ} Hz)"
            )


class ZKBM1DriverHAL:
    """Translates safe backend velocity commands to IN1/IN2 and IN3/IN4 PWM levels."""

    def __init__(self, pwm_hz: int = 1000, hardware_verified: bool = False) -> None:
        if not 1 <= pwm_hz <= ZK_BM1_MAX_PWM_HZ:
            raise ValueError(f"Invalid ZK-BM1 PWM frequency: {pwm_hz}")
        self.pwm_hz = pwm_hz
        self.hardware_verified = hardware_verified
        self.channels: Dict[str, int] = {"CH1_LEFT": 0, "CH2_RIGHT": 0}

    def set_channel(self, channel: str, duty_pct: int) -> Dict[str, int | bool | str]:
        cmd = ZKBM1ChannelCommand(
            channel=channel,
            duty_pct=int(duty_pct),
            pwm_hz=self.pwm_hz,
            simulation_only=not self.hardware_verified,
        )
        cmd.validate()
        self.channels[channel] = cmd.duty_pct
        in_a = max(0, cmd.duty_pct)
        in_b = max(0, -cmd.duty_pct)
        return {
            "channel": channel,
            "duty_pct": cmd.duty_pct,
            "in_pos_pct": in_a,
            "in_neg_pct": in_b,
            "pwm_hz": self.pwm_hz,
            "physical_output_armed": self.hardware_verified,
        }

    def stop_all(self) -> Dict[str, int | bool]:
        self.channels["CH1_LEFT"] = 0
        self.channels["CH2_RIGHT"] = 0
        return {"CH1_LEFT": 0, "CH2_RIGHT": 0, "physical_output_armed": self.hardware_verified}
