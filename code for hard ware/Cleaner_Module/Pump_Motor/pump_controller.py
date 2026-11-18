"""Cleaner Module & Pump Motor Controller (Simulation Default + Safety Interlocks)."""

from __future__ import annotations

import time
from enum import Enum
from typing import Optional

from ..L9110S.l9110s_guard import verify_l9110s_compatibility


class CleanerState(str, Enum):
    PUMP_OFF = "PUMP_OFF"
    PUMP_ON = "PUMP_ON"
    CLEANING_SIMULATION = "CLEANING_SIMULATION"
    CLEANING_TASK_ACTIVE = "CLEANING_TASK_ACTIVE"
    CLEANING_COMPLETED = "CLEANING_COMPLETED"
    ERROR = "ERROR"


class PumpController:
    """Manages cleaner pump activation with max duration limit, human approval check, and E-Stop isolation."""

    def __init__(
        self,
        max_duration_sec: float = 15.0,
        simulation_mode: bool = True,
        pump_voltage_v: Optional[float] = None,
        pump_stall_ma: Optional[int] = None,
    ) -> None:
        self.max_duration_sec = float(max_duration_sec)
        self.simulation_mode = simulation_mode
        self.compat = verify_l9110s_compatibility(pump_voltage_v, pump_stall_ma)
        self.state = CleanerState.PUMP_OFF
        self.estop_engaged = True
        self.active_task_id: Optional[str] = None
        self.started_at: Optional[float] = None
        self.last_error: Optional[str] = None

    def start_cleaning(
        self,
        *,
        task_id: Optional[str],
        human_approved: bool,
        defect_decision_type: str,
        duration_sec: float,
    ) -> dict:
        if not human_approved:
            self.state = CleanerState.ERROR
            self.last_error = "Cleaning rejected: explicit human approval required."
            raise PermissionError(self.last_error)

        if defect_decision_type in {"REPAIR_REQUIRED", "HUMAN_ASSESSMENT_REQUIRED"}:
            self.state = CleanerState.ERROR
            self.last_error = (
                f"Safety rule blocked auto-cleaning for '{defect_decision_type}' (structural cracks must not be cleaned)."
            )
            raise PermissionError(self.last_error)

        if self.estop_engaged:
            self.state = CleanerState.ERROR
            self.last_error = "Cannot start cleaner while E-Stop is engaged."
            raise PermissionError(self.last_error)

        if not self.simulation_mode and not self.compat["compatible"]:
            self.state = CleanerState.ERROR
            self.last_error = str(self.compat["reason"])
            raise RuntimeError(self.last_error)

        if duration_sec <= 0 or duration_sec > self.max_duration_sec:
            raise ValueError(f"Requested pump duration {duration_sec}s exceeds limit (0, {self.max_duration_sec}]s")

        self.active_task_id = task_id
        self.started_at = time.monotonic()
        self.last_error = None
        self.state = CleanerState.CLEANING_SIMULATION if self.simulation_mode else CleanerState.CLEANING_TASK_ACTIVE
        return self.status()

    def set_pump_state(self, on: bool, human_approved: bool = False) -> dict:
        if not on:
            return self.stop(completed=False)
        if not human_approved:
            raise PermissionError("Human confirmation required to energize pump.")
        if self.estop_engaged:
            raise PermissionError("E-Stop engaged.")
        if not self.simulation_mode and not self.compat["compatible"]:
            self.state = CleanerState.ERROR
            self.last_error = str(self.compat["reason"])
            raise RuntimeError(self.last_error)
        self.started_at = time.monotonic()
        self.state = CleanerState.CLEANING_SIMULATION if self.simulation_mode else CleanerState.PUMP_ON
        return self.status()

    def stop(self, completed: bool = False) -> dict:
        self.state = CleanerState.CLEANING_COMPLETED if completed else CleanerState.PUMP_OFF
        self.started_at = None
        return self.status()

    def emergency_stop(self) -> dict:
        self.estop_engaged = True
        self.started_at = None
        self.state = CleanerState.PUMP_OFF
        self.last_error = "Emergency Stop isolated pump outputs."
        return self.status()

    def check_watchdog(self) -> dict:
        if self.started_at is not None:
            elapsed = time.monotonic() - self.started_at
            if elapsed >= self.max_duration_sec:
                self.started_at = None
                self.state = CleanerState.CLEANING_COMPLETED
        return self.status()

    def status(self) -> dict:
        elapsed = (time.monotonic() - self.started_at) if self.started_at else 0.0
        return {
            "state": self.state.value,
            "simulation_mode": self.simulation_mode,
            "physical_driver_compatible": self.compat["compatible"],
            "compatibility_note": self.compat["reason"],
            "estop_engaged": self.estop_engaged,
            "active_task_id": self.active_task_id,
            "elapsed_sec": round(elapsed, 2),
            "max_duration_sec": self.max_duration_sec,
            "last_error": self.last_error,
        }
