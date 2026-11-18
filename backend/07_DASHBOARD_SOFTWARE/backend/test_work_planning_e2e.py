#!/usr/bin/env python3
"""End-to-end API + Persistence + Safety Integration Tests for /api/mfr/*."""

from __future__ import annotations

import sys
from pathlib import Path

sys.dont_write_bytecode = True

THIS_DIR = Path(__file__).resolve().parent
M7_ROOT = THIS_DIR.parent
if str(M7_ROOT) not in sys.path:
    sys.path.insert(0, str(M7_ROOT))

from fastapi.testclient import TestClient  # noqa: E402
from backend.main import app  # noqa: E402


def run_tests() -> None:
    with TestClient(app) as client:
        # 1. Buildings + 3D Panels
        b_res = client.get("/api/mfr/buildings")
        assert b_res.status_code == 200, b_res.text
        buildings = b_res.json()["items"]
        assert len(buildings) >= 1
        bid = buildings[0]["id"]

        f_res = client.get(f"/api/mfr/buildings/{bid}/facades")
        assert f_res.status_code == 200
        panels = f_res.json()["panels"]
        assert len(panels) >= 24
        panel_crack = panels[0]
        panel_clean = panels[1]

        # 2. Sequential inspection session + capture (uses honest smoke fixture fallback if no USB camera)
        s_res = client.post("/api/mfr/inspection/start", json={"building_id": bid, "facade_code": "NORTH", "operator_name": "TestEng"})
        assert s_res.status_code == 200
        sess_id = s_res.json()["session_id"]

        # Pick deterministic Crack smoke sample so we verify AI + crack cleaning guard end-to-end
        samples = sorted((M7_ROOT.parent / "06_AI_COMPUTER_VISION" / "dataset_spec" / "smoke_fixture" / "images" / "test").glob("*.png"))
        crack_sample = next((p.name for p in samples if "crack" in p.name.lower()), samples[0].name)

        c_res = client.post(
            "/api/mfr/inspection/capture",
            json={
                "session_id": sess_id,
                "building_id": bid,
                "panel_id": panel_crack["id"],
                "position_mode": "MANUAL_ASSIGNED",
                "sample_name": crack_sample,
            },
        )
        assert c_res.status_code == 200, c_res.text
        cap_id = c_res.json()["capture_id"]

        # 3. AI 06 real PyTorch inference + annotated PNG persistence
        a_res = client.post("/api/mfr/inspection/analyze", json={"capture_id": cap_id})
        assert a_res.status_code == 200, a_res.text
        a_json = a_res.json()
        assert a_json["advisory_only"] is True
        assert a_json["safety_actuation_allowed"] is False
        assert a_json["real_dataset_trained"] is False
        assert "NOT TRAINED / NOT EVALUATED ON REAL BUILDING IMAGES" in a_json["disclaimer"]
        marker_id = a_json["markers"][0]["id"]
        assert a_json["markers"][0]["verification_status"] == "UNVERIFIED"

        # Original & annotated image serving
        assert client.get(a_json["original_url"]).status_code == 200
        assert client.get(a_json["annotated_url"]).status_code == 200

        # 4. Human verification + manual position correction + block crack auto-cleaning
        bad_rev = client.post(
            "/api/mfr/inspection/review",
            json={
                "defect_location_id": marker_id,
                "action": "CONFIRM",
                "decision_type": "Cleaning appropriate",
            },
        )
        if a_json["markers"][0]["defect_category"] == "Crack":
            assert bad_rev.status_code == 400

        good_rev = client.post(
            "/api/mfr/inspection/review",
            json={
                "defect_location_id": marker_id,
                "action": "CONFIRM",
                "panel_id": panel_clean["id"],
                "notes": "Verified manual reposition to panel #2",
                "auto_create_work_plan": True,
            },
        )
        assert good_rev.status_code == 200, good_rev.text
        assert good_rev.json()["verification_status"] == "CONFIRMED"
        assert good_rev.json()["panel_code"] == panel_clean["panel_code"]

        # 5. Work plans CRUD + crack cleaning rejection
        crack_clean = client.post(
            "/api/mfr/work-plans",
            json={
                "building_id": bid,
                "facade_code": "NORTH",
                "floor_number": 2,
                "zone_code": "ZONE-N2",
                "mission_type": "CLEANING",
                "defect_type": "Crack",
                "decision_type": "Repair required",
            },
        )
        assert crack_clean.status_code == 400

        wp_ok = client.post(
            "/api/mfr/work-plans",
            json={
                "building_id": bid,
                "facade_code": "NORTH",
                "floor_number": 2,
                "zone_code": "ZONE-N2",
                "panel_id": panel_clean["id"],
                "mission_type": "CLEANING",
                "defect_type": "Water stain",
                "decision_type": "Cleaning appropriate",
                "priority": "MEDIUM",
                "assigned_module": "CLEANER_L9110S",
                "estimated_duration_min": 18,
                "status": "Planned",
            },
        )
        assert wp_ok.status_code == 201, wp_ok.text
        wp_id = wp_ok.json()["id"]

        wp_patch = client.patch(f"/api/mfr/work-plans/{wp_id}", json={"priority": "HIGH", "status": "Ready for review"})
        assert wp_patch.status_code == 200
        assert wp_patch.json()["priority"] == "HIGH"

        # 6. Robot Control & E-Stop isolation + Cleaner Simulation
        # Blocked under default E-Stop
        blocked_move = client.post("/api/mfr/robot/command", json={"command": "FORWARD", "left_pct": 40, "right_pct": 40})
        assert blocked_move.status_code == 403

        # Blocked AI motor attempt
        blocked_ai = client.post(
            "/api/mfr/robot/command",
            json={"command": "CLEAR_ESTOP", "human_approved": True, "source_layer": "AI_CV_MODEL"},
        )
        assert blocked_ai.status_code == 403

        # Valid human clear + simulation drive + cleaner simulation + E-Stop cutoff
        assert client.post("/api/mfr/robot/command", json={"command": "CLEAR_ESTOP", "human_approved": True}).status_code == 200
        mv = client.post("/api/mfr/robot/command", json={"command": "FORWARD", "left_pct": 40, "right_pct": 40})
        assert mv.status_code == 200
        assert mv.json()["hardware"]["simulation_mode"] is True
        assert mv.json()["hardware"]["physical_outputs_armed"] is False

        cl = client.post("/api/mfr/cleaner/control", json={"work_plan_id": wp_id, "action": "START_SIMULATION", "duration_sec": 6.0, "human_approved": True})
        assert cl.status_code == 200
        assert cl.json()["cleaner"]["state"] == "CLEANING_SIMULATION"

        es = client.post("/api/mfr/robot/command", json={"command": "ESTOP"})
        assert es.status_code == 200
        assert es.json()["hardware"]["estop_engaged"] is True
        assert es.json()["hardware"]["driving_system"]["left_pct"] == 0

        # Stop session cleanly
        assert client.post("/api/mfr/inspection/stop", json={"session_id": sess_id}).status_code == 200

        print("WORK_PLANNING_E2E_ALL_PASSED")


if __name__ == "__main__":
    run_tests()
