#!/usr/bin/env python3
"""
MFR Module Facade Rover — Idempotent Baseline & SIMULATED_MOCK Demo Seeder
---------------------------------------------------------------------------
Populates honest baseline records:
  - Robot `MFR-BASE-01` (`IN_DEVELOPMENT`, verified CAD envelope 224.0 x 220.2 x 228.0 mm)
  - ModelRegistry `MFRDefectNet-SmokeTest-v1.0` (`real_dataset_trained=False`)
  - TelemetryLog sample rows strictly tagged `telemetry_source="SIMULATED_MOCK"`
  - SafetyEvent baseline policy record (`hardware_estop_independent=True`)

Zero hardcoded credentials; uses `database/db.py` (`MFR_DATABASE_URL` or local SQLite).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Dict

sys.dont_write_bytecode = True

THIS_DIR = Path(__file__).resolve().parent
M7_ROOT = THIS_DIR.parent
MFR_MASTER_ROOT = M7_ROOT.parent
EVAL_SUMMARY_PATH = MFR_MASTER_ROOT / "06_AI_COMPUTER_VISION" / "evaluation" / "evaluation_summary.json"

if str(M7_ROOT) not in sys.path:
    sys.path.insert(0, str(M7_ROOT))

from sqlalchemy import func, select  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from database.db import SessionLocal, init_db  # noqa: E402
from database.models import ModelRegistry, Robot, SafetyEvent, TelemetryLog  # noqa: E402

CV_DISCLAIMER = "SMOKE_TEST_FIXTURE_ONLY (Real Facade Accuracy: NOT TRAINED / NOT EVALUATED)"


def _load_eval_metadata() -> Dict[str, str]:
    if not EVAL_SUMMARY_PATH.exists():
        return {
            "weights_sha256": "0" * 64,
            "model_tier": "SMOKE_TEST_FIXTURE_ONLY",
        }
    data = json.loads(EVAL_SUMMARY_PATH.read_text(encoding="utf-8"))
    return {
        "weights_sha256": str(data.get("weights_sha256", "0" * 64)),
        "model_tier": str(data.get("dataset_tier", "SMOKE_TEST_FIXTURE_ONLY")),
    }


def seed_all(session: Session) -> Dict[str, int]:
    """Idempotently seed robots, model registry, simulated telemetry, and safety baseline."""
    robot = session.execute(select(Robot).where(Robot.robot_code == "MFR-BASE-01")).scalar_one_or_none()
    if robot is None:
        robot = Robot(
            robot_code="MFR-BASE-01",
            name="Module Facade Rover — Ground Prototype Base",
            status="IN_DEVELOPMENT",
            cad_length_mm=224.0,
            cad_width_mm=220.2,
            cad_height_mm=228.0,
            wheelbase_mm=135.0,
            vertical_glass_certified=False,
            ai_safety_control_enabled=False,
            estop_override_allowed=False,
            notes=(
                "Verified Assembly_1.step envelope 224.000 x 220.197 x 228.000 mm "
                "(16 instances, 8 solids, 3.0 mm chassis clearance). Ground prototype under "
                "development; no vertical-glass climbing certification."
            ),
        )
        session.add(robot)
        session.flush()

    meta = _load_eval_metadata()
    model = session.execute(
        select(ModelRegistry).where(
            ModelRegistry.model_name == "MFRDefectNet-SmokeTest-v1.0",
            ModelRegistry.model_version == "1.0.0-smoke",
        )
    ).scalar_one_or_none()
    if model is None:
        model = ModelRegistry(
            model_name="MFRDefectNet-SmokeTest-v1.0",
            model_version="1.0.0-smoke",
            model_tier=meta["model_tier"],
            real_dataset_trained=False,
            is_real_facade_evaluated=False,
            weights_sha256=meta["weights_sha256"],
            advisory_only=True,
            safety_actuation_allowed=False,
            disclaimer=CV_DISCLAIMER,
        )
        session.add(model)
        session.flush()

    existing_telemetry = session.execute(select(func.count(TelemetryLog.id))).scalar_one()
    if existing_telemetry == 0:
        session.add_all(
            [
                TelemetryLog(
                    robot_id=robot.id,
                    telemetry_source="SIMULATED_MOCK",
                    system_state="E_STOP",
                    surface_mode="HORIZONTAL_GROUND_ONLY",
                    battery_voltage_v=11.9,
                    wheel_rpm_avg=0.0,
                    wifi_rssi_dbm=-54,
                    camera_link_ok=False,
                    hardware_estop_engaged=True,
                    ai_safety_control_enabled=False,
                    estop_override_allowed=False,
                    note="SIMULATED_MOCK seed baseline: hardware E-stop engaged; ESP32 bench not connected.",
                ),
                TelemetryLog(
                    robot_id=robot.id,
                    telemetry_source="SIMULATED_MOCK",
                    system_state="NORMAL",
                    surface_mode="BENCH_RIG_NO_LOAD",
                    battery_voltage_v=12.1,
                    wheel_rpm_avg=0.0,
                    wifi_rssi_dbm=-49,
                    camera_link_ok=True,
                    hardware_estop_engaged=False,
                    ai_safety_control_enabled=False,
                    estop_override_allowed=False,
                    note="SIMULATED_MOCK seed preview: bench no-load idle simulation (NOT live hardware).",
                ),
            ]
        )

    existing_safety = session.execute(select(func.count(SafetyEvent.id))).scalar_one()
    if existing_safety == 0:
        session.add(
            SafetyEvent(
                robot_id=robot.id,
                event_type="SAFETY_ISOLATION_BASELINE",
                severity="INFO",
                source_component="M7_BACKEND",
                blocked_by_policy=False,
                hardware_estop_independent=True,
                description=(
                    "Safety Layer 4 isolation active: ai_safety_control_enabled=FALSE, "
                    "estop_override_allowed=FALSE. Hardware E-stop & roof-tether remain physically independent."
                ),
            )
        )

    session.commit()
    return {
        "robots": int(session.execute(select(func.count(Robot.id))).scalar_one()),
        "model_registry": int(session.execute(select(func.count(ModelRegistry.id))).scalar_one()),
        "telemetry_logs": int(session.execute(select(func.count(TelemetryLog.id))).scalar_one()),
        "safety_events": int(session.execute(select(func.count(SafetyEvent.id))).scalar_one()),
    }


def main() -> None:
    init_db()
    with SessionLocal() as session:
        counts = seed_all(session)
    print(json.dumps({"status": "seeded", "row_counts": counts}, indent=2))


if __name__ == "__main__":
    main()
