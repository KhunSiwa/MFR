"""Robot Communication Protocol & Watchdog Dispatcher."""

from __future__ import annotations

import time
from typing import Dict, Optional

from pydantic import BaseModel, Field


class RobotMotionCommand(BaseModel):
    command: str = Field(..., description="STOP | FORWARD | BACKWARD | TURN_LEFT | TURN_RIGHT | PUMP_ON | PUMP_OFF | IMPELLER_SET | CLEAR_ESTOP | ESTOP")
    left_pct: int = Field(default=0, ge=-100, le=100)
    right_pct: int = Field(default=0, ge=-100, le=100)
    impeller_pct: int = Field(default=0, ge=0, le=100)
    pump_duration_sec: float = Field(default=0.0, ge=0.0, le=15.0)
    human_approved: bool = False
    issued_by: str = "operator_console"
    source_layer: str = "BACKEND_CONTROL"  # Reject AI_CV attempting actuator drive


class CommandGuardError(ValueError):
    """Raised on unsafe, out-of-range, or AI-originated actuator requests."""


class RobotCommandDispatcher:
    """Validates commands, enforces watchdog timeouts, and guarantees AI isolation."""

    def __init__(self, watchdog_timeout_sec: float = 1.2) -> None:
        self.watchdog_timeout_sec = watchdog_timeout_sec
        self.estop_engaged = True
        self.last_cmd_monotonic = time.monotonic()

    def validate(self, cmd: RobotMotionCommand) -> None:
        if cmd.source_layer.upper().startswith("AI"):
            raise CommandGuardError("AI/CV subsystems are strictly prohibited from issuing motor/safety commands.")
        if cmd.command in {"FORWARD", "BACKWARD", "TURN_LEFT", "TURN_RIGHT", "IMPELLER_SET"} and self.estop_engaged:
            raise CommandGuardError("Emergency Stop is engaged; release E-Stop via explicit operator action first.")

    def check_timeout(self) -> bool:
        return (time.monotonic() - self.last_cmd_monotonic) > self.watchdog_timeout_sec

    def touch(self) -> None:
        self.last_cmd_monotonic = time.monotonic()
