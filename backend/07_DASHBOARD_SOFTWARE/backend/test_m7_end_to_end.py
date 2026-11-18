#!/usr/bin/env python3
"""
MFR Module Facade Rover — M7 End-to-End Backend, DB & Dashboard Test Suite
---------------------------------------------------------------------------
Runs against an isolated temporary SQLite database via `MFR_DATABASE_URL` so
the baseline `mfr_m7_dev.db` stays clean while testing real persistence.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import sys
import tempfile
from pathlib import Path

sys.dont_write_bytecode = True

THIS_DIR = Path(__file__).resolve().parent
M7_ROOT = THIS_DIR.parent
MFR_MASTER_ROOT = M7_ROOT.parent
CV_ROOT = MFR_MASTER_ROOT / "06_AI_COMPUTER_VISION"
FRONTEND_DIR = M7_ROOT / "frontend_dashboard"

SMOKE_TEST_IMG = CV_ROOT / "dataset_spec" / "smoke_fixture" / "images" / "test" / "smoke_test_c0_00.png"
AUDIT_TILE_IMG = CV_ROOT / "dataset_spec" / "real_curtainwall_unlabeled_audit" / "S01_audit_tile_00.png"

if str(M7_ROOT) not in sys.path:
    sys.path.insert(0, str(M7_ROOT))


def main() -> None:
    with tempfile.TemporaryDirectory(prefix="mfr_m7_test_") as tmp_dir:
        tmp_db = Path(tmp_dir) / "test_m7.db"
        os.environ["MFR_DATABASE_URL"] = f"sqlite:///{tmp_db.as_posix()}"

        from fastapi.testclient import TestClient  # noqa: E402
        from database.db import SessionLocal, init_db  # noqa: E402
        from database.seed_demo_data import seed_all  # noqa: E402
        from backend.main import app  # noqa: E402

        passed = 0

        # 1. Verify idempotent DB init + seed
        init_db()
        with SessionLocal() as s:
            c1 = seed_all(s)
            c2 = seed_all(s)
        assert c1 == c2 == {"robots": 1, "model_registry": 1, "telemetry_logs": 2, "safety_events": 1}, (
            f"Unexpected seed counts: {c1} vs {c2}"
        )
        passed += 1

        with TestClient(app) as client:
            # 2. Dashboard HTML, static assets, brand logo, and zero external URLs
            r_root = client.get("/")
            assert r_root.status_code == 200, r_root.text
            assert "SMOKE-TEST FIXTURE ONLY" in r_root.text
            assert "Hardware E-Stop" in r_root.text
            assert client.get("/static/styles.css").status_code == 200
            assert client.get("/static/app.js").status_code == 200
            assert client.get("/assets/MFR_logo_original.png").status_code == 200

            for fname in ("index.html", "styles.css", "app.js"):
                txt = (FRONTEND_DIR / fname).read_text(encoding="utf-8")
                assert not re.search(r"https?://", txt, flags=re.IGNORECASE), (
                    f"External URL found in offline frontend file {fname}"
                )
            passed += 1

            # 3. GET /health
            r_health = client.get("/health")
            assert r_health.status_code == 200, r_health.text
            h = r_health.json()
            assert h["status"] == "ok"
            assert h["database_connected"] is True
            assert h["cv_model_loaded"] is True
            assert h["advisory_only"] is True
            assert h["safety_actuation_allowed"] is False
            assert h["ai_safety_control_enabled"] is False
            assert h["estop_override_allowed"] is False
            assert h["real_dataset_trained"] is False
            passed += 1

            # 4. GET /api/v1/model-status
            r_ms = client.get("/api/v1/model-status")
            assert r_ms.status_code == 200, r_ms.text
            ms = r_ms.json()
            assert ms["model_tier"] == "SMOKE_TEST_FIXTURE_ONLY"
            assert ms["real_dataset_trained"] is False
            assert ms["is_real_facade_evaluated"] is False
            assert ms["advisory_only"] is True
            assert ms["safety_actuation_allowed"] is False
            assert ms["smoke_test_metrics"]["test_sample_count"] == 25
            passed += 1

            # 5. GET /api/v1/robots
            r_robots = client.get("/api/v1/robots")
            assert r_robots.status_code == 200, r_robots.text
            robots = r_robots.json()
            assert len(robots) == 1
            rb = robots[0]
            assert rb["robot_code"] == "MFR-BASE-01"
            assert rb["cad_length_mm"] == 224.0
            assert rb["cad_width_mm"] == 220.2
            assert rb["cad_height_mm"] == 228.0
            assert rb["vertical_glass_certified"] is False
            assert rb["ai_safety_control_enabled"] is False
            assert rb["estop_override_allowed"] is False
            passed += 1

            # 6. POST /api/v1/infer on smoke_test_c0_00.png (UploadFile) + DB round-trip + review PATCH
            assert SMOKE_TEST_IMG.exists()
            smoke_bytes = SMOKE_TEST_IMG.read_bytes()
            smoke_sha = hashlib.sha256(smoke_bytes).hexdigest()
            r_inf1 = client.post(
                "/api/v1/infer",
                files={"file": (SMOKE_TEST_IMG.name, smoke_bytes, "image/png")},
                data={"robot_code": "MFR-BASE-01"},
            )
            assert r_inf1.status_code == 200, r_inf1.text
            p1 = r_inf1.json()
            assert p1["source_type"] == "UPLOAD"
            assert p1["input_sha256"] == smoke_sha
            assert p1["advisory_only"] is True
            assert p1["safety_actuation_allowed"] is False
            assert p1["real_dataset_trained"] is False
            assert len(p1["detections"]) == 1

            r_get1 = client.get(f"/api/v1/inspections/{p1['inspection_id']}")
            assert r_get1.status_code == 200, r_get1.text
            assert r_get1.json()["input_sha256"] == smoke_sha

            r_rev = client.patch(
                f"/api/v1/inspections/{p1['inspection_id']}/review",
                json={"operator_review_status": "CONFIRMED"},
            )
            assert r_rev.status_code == 200, r_rev.text
            assert r_rev.json()["operator_review_status"] == "CONFIRMED"
            passed += 1

            # 7. POST /api/v1/infer on S01_audit_tile_00.png (sample_id) + sample serving + list
            assert AUDIT_TILE_IMG.exists()
            audit_sha = hashlib.sha256(AUDIT_TILE_IMG.read_bytes()).hexdigest()
            r_inf2 = client.post("/api/v1/infer", data={"sample_id": "S01_audit_tile_00.png"})
            assert r_inf2.status_code == 200, r_inf2.text
            p2 = r_inf2.json()
            assert p2["source_type"] == "UNLABELED_CURTAINWALL_AUDIT"
            assert p2["input_sha256"] == audit_sha
            assert p2["advisory_only"] is True

            r_list = client.get("/api/v1/inspections")
            assert r_list.status_code == 200
            assert r_list.json()["total_count"] == 2

            r_sample_img = client.get("/api/v1/sample-images/S01_audit_tile_00.png")
            assert r_sample_img.status_code == 200
            assert r_sample_img.headers["content-type"].startswith("image/png")
            passed += 1

            # 8. Path traversal & invalid input blocking
            assert client.post("/api/v1/infer", data={"image_path": "/etc/passwd"}).status_code == 403
            assert client.post("/api/v1/infer", data={"image_path": "../../outside.png"}).status_code == 403
            assert client.post("/api/v1/infer", data={"sample_id": "../secret.png"}).status_code == 403
            assert client.get("/api/v1/sample-images/..secret.png").status_code == 403
            assert client.get("/api/v1/sample-images/..%2Fsecret.png").status_code in (403, 404)
            assert client.post("/api/v1/infer", files={"file": ("bad.png", b"corrupt", "image/png")}).status_code == 400
            passed += 1

            # 9. Telemetry segregation + 403/422 safety boundary enforcement
            r_tel_list = client.get("/api/v1/telemetry")
            assert r_tel_list.status_code == 200
            assert r_tel_list.json()["counts_by_source"]["SIMULATED_MOCK"] == 2

            r_tel_ok = client.post(
                "/api/v1/telemetry",
                json={
                    "robot_code": "MFR-BASE-01",
                    "telemetry_source": "LIVE_BENCH",
                    "system_state": "NORMAL",
                    "surface_mode": "HORIZONTAL_GROUND_ONLY",
                    "battery_voltage_v": 12.2,
                    "hardware_estop_engaged": False,
                    "note": "Bench test log",
                },
            )
            assert r_tel_ok.status_code == 201, r_tel_ok.text
            assert r_tel_ok.json()["ai_safety_control_enabled"] is False
            assert r_tel_ok.json()["estop_override_allowed"] is False

            r_tel_override = client.post(
                "/api/v1/telemetry",
                json={
                    "robot_code": "MFR-BASE-01",
                    "telemetry_source": "LIVE_BENCH",
                    "system_state": "NORMAL",
                    "ai_safety_override": True,
                },
            )
            assert r_tel_override.status_code == 403, r_tel_override.text

            r_tel_vert = client.post(
                "/api/v1/telemetry",
                json={
                    "robot_code": "MFR-BASE-01",
                    "telemetry_source": "SIMULATED_MOCK",
                    "system_state": "NORMAL",
                    "surface_mode": "VERTICAL_GLASS_AUTONOMOUS",
                    "vertical_glass_autonomous": True,
                },
            )
            assert r_tel_vert.status_code == 422, r_tel_vert.text
            passed += 1

            # 10. Safety command hard 403 rejection & audit logging + SurfaceGo concept
            r_sc1 = client.post(
                "/api/v1/safety/command",
                json={"robot_code": "MFR-BASE-01", "command": "AI_ESTOP_OVERRIDE", "reason": "unit_test"},
            )
            assert r_sc1.status_code == 403, r_sc1.text

            r_sc2 = client.post(
                "/api/v1/safety/command",
                json={"robot_code": "MFR-BASE-01", "command": "RELEASE_ROOF_TETHER"},
            )
            assert r_sc2.status_code == 403, r_sc2.text

            r_se = client.get("/api/v1/safety-events")
            assert r_se.status_code == 200
            se_data = r_se.json()
            assert se_data["ai_safety_control_enabled"] is False
            assert se_data["estop_override_allowed"] is False
            assert se_data["hardware_estop_independent"] is True
            blocked_events = [e for e in se_data["events"] if e["blocked_by_policy"]]
            assert len(blocked_events) == 3, f"Expected 3 blocked_403 events, got {len(blocked_events)}"

            r_sg = client.get("/api/v1/surfacego-concept")
            assert r_sg.status_code == 200
            assert r_sg.json()["external_repo_accessed"] is False
            assert client.get("/api/v1/samples").status_code == 200
            passed += 1

        print(
            json.dumps(
                {
                    "test_suite": "test_m7_end_to_end.py",
                    "passed_groups": passed,
                    "failed_groups": 0,
                    "smoke_inspection": {
                        "id": p1["inspection_id"],
                        "class_name": p1["detections"][0]["class_name"],
                        "confidence": p1["detections"][0]["confidence"],
                        "advisory_only": p1["advisory_only"],
                    },
                    "audit_tile_inspection": {
                        "id": p2["inspection_id"],
                        "source_type": p2["source_type"],
                        "class_name": p2["detections"][0]["class_name"],
                        "confidence": p2["detections"][0]["confidence"],
                        "advisory_only": p2["advisory_only"],
                    },
                    "blocked_403_events_logged": len(blocked_events),
                },
                indent=2,
            )
        )


if __name__ == "__main__":
    main()
