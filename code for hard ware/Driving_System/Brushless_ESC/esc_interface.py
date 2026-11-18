"""Brushless Impeller ESC Interface (50 Hz Servo PWM — Disarmed by Default)."""

from __future__ import annotations

ESC_DISARM_US = 1000
ESC_MIN_SPIN_US = 1080
ESC_BENCH_CEILING_US = 1450
ESC_MAX_STANDARD_US = 2000


class BrushlessESCInterface:
    """Safe wrapper enforcing arming at 1000 us and bench throttling until KV/BEC specs are verified."""

    def __init__(self, bench_verified: bool = False) -> None:
        self.bench_verified = bench_verified
        self.armed = False
        self.pulse_us = ESC_DISARM_US

    def disarm(self) -> dict:
        self.armed = False
        self.pulse_us = ESC_DISARM_US
        return {"armed": False, "pulse_us": self.pulse_us, "physical_enabled": False}

    def set_throttle_pct(self, pct: int) -> dict:
        if not 0 <= pct <= 100:
            raise ValueError("ESC throttle percentage must be in [0, 100]")
        if pct == 0:
            return self.disarm()
        ceiling = ESC_MAX_STANDARD_US if self.bench_verified else ESC_BENCH_CEILING_US
        span = ceiling - ESC_MIN_SPIN_US
        self.pulse_us = ESC_MIN_SPIN_US + int((pct / 100.0) * span)
        self.armed = True
        return {
            "armed": self.armed,
            "pulse_us": self.pulse_us,
            "physical_enabled": self.bench_verified,
            "bench_capped": not self.bench_verified,
        }
