"""25GA DC Gear Motor (JGA25-370 Class) & Quadrature Encoder Abstraction."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


@dataclass
class Motor25GASpec:
    sku_verified: bool = False
    nominal_voltage_v: Optional[float] = None  # Common 6V or 12V — MUST verify before energizing
    stall_current_a_est: Optional[float] = None  # Typically 1.0..3.7 A depending on gear ratio
    encoder_voltage_v: Optional[float] = None  # 3.3V or 5V — verify before connecting to ESP32-S3 GPIO
    wheel_diameter_mm: float = 60.0  # CAD-verified from MFR.step (Part 1_7..1_15)
    wheelbase_mm: float = 175.0


class Motor25GAInterface:
    """Abstracts 25GA speed targets & encoder odometry while isolating unverified specs."""

    def __init__(self, spec: Optional[Motor25GASpec] = None) -> None:
        self.spec = spec or Motor25GASpec()
        self.left_target_pct = 0
        self.right_target_pct = 0
        self.left_ticks = 0
        self.right_ticks = 0

    def is_electrically_verified(self) -> bool:
        return (
            self.spec.sku_verified
            and self.spec.nominal_voltage_v is not None
            and self.spec.stall_current_a_est is not None
            and self.spec.encoder_voltage_v is not None
        )

    def command_speed(self, left_pct: int, right_pct: int) -> dict:
        if not -100 <= left_pct <= 100 or not -100 <= right_pct <= 100:
            raise ValueError("Speed percentage must stay within [-100, 100]")
        self.left_target_pct = int(left_pct)
        self.right_target_pct = int(right_pct)
        return {
            "left_pct": self.left_target_pct,
            "right_pct": self.right_target_pct,
            "electrically_verified": self.is_electrically_verified(),
        }

    def step_simulation(self, dt_sec: float) -> None:
        # Simulate encoder progress proportionally (~240 ticks/sec at 100%)
        self.left_ticks += int(self.left_target_pct * 2.4 * dt_sec)
        self.right_ticks += int(self.right_target_pct * 2.4 * dt_sec)
