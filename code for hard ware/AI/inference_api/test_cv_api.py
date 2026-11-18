#!/usr/bin/env python3
"""
MFR Module Facade Rover — Automated FastAPI TestClient Suite
------------------------------------------------------------
Verifies /health, /model-card, /safety-policy, /predict (both UploadFile on
smoke_fixture/test and workspace-confined image_path on unlabeled CC0 tile),
path-traversal confinement (HTTP 403), invalid input rejection (HTTP 400),
and strict absence of any safety/E-stop/tether actuation fields or routes.
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path
from typing import Any

sys.dont_write_bytecode = True

from fastapi.testclient import TestClient

THIS_DIR = Path(__file__).resolve().parent
CV_ROOT = THIS_DIR.parent
SMOKE_TEST_IMG = CV_ROOT / "dataset_spec" / "smoke_fixture" / "images" / "test" / "smoke_test_c0_00.png"
AUDIT_CC0_IMG = CV_ROOT / "dataset_spec" / "real_curtainwall_unlabeled_audit" / "S01_audit_tile_00.png"

sys.path.insert(0, str(THIS_DIR))
from app import app  # noqa: E402

FORBIDDEN_SAFETY_KEYS = {
    "estop",
    "e_stop",
    "emergency_stop",
    "motor_pwm",
    "pwm_command",
    "tether_lock",
    "brake_release",
    "actuate",
    "safety_override",
}

TAXONOMY_NAMES = {
    "Crack",
    "Sealant deterioration",
    "Rust / corrosion",
    "Water stain",
    "Normal surface",
}


def assert_no_forbidden_keys(payload: Any) -> None:
    if isinstance(payload, dict):
        for k, v in payload.items():
            assert k.lower() not in FORBIDDEN_SAFETY_KEYS, f"Forbidden safety control key found: {k}"
            assert_no_forbidden_keys(v)
    elif isinstance(payload, list):
        for item in payload:
            assert_no_forbidden_keys(item)


def main() -> None:
    client = TestClient(app)

    # 1. OpenAPI route audit: confirm zero actuator/E-stop routes
    route_paths = {r.path for r in app.routes}
    for rp in route_paths:
        low = rp.lower()
        assert not any(bad in low for bad in ("estop", "e-stop", "actuate", "motor", "brake", "tether")), (
            f"Forbidden control route exposed: {rp}"
        )

    # 2. GET /health
    r_health = client.get("/health")
    assert r_health.status_code == 200, r_health.text
    h = r_health.json()
    assert h["status"] == "ok"
    assert h["model_loaded"] is True
    assert h["advisory_only"] is True
    assert h["safety_actuation_allowed"] is False
    assert h["real_dataset_trained"] is False
    assert_no_forbidden_keys(h)

    # 3. GET /model-card
    r_mc = client.get("/model-card")
    assert r_mc.status_code == 200, r_mc.text
    mc = r_mc.json()
    assert mc["real_dataset_trained"] is False
    assert mc["is_real_facade_evaluated"] is False
    assert mc["advisory_only"] is True
    assert mc["safety_actuation_allowed"] is False
    assert set(mc["taxonomy"].values()) == TAXONOMY_NAMES
    assert_no_forbidden_keys(mc)

    # 4. GET /safety-policy
    r_sp = client.get("/safety-policy")
    assert r_sp.status_code == 200, r_sp.text
    sp = r_sp.json()
    assert sp["advisory_only"] is True
    assert sp["safety_actuation_allowed"] is False
    assert_no_forbidden_keys(sp)

    # 5. POST /predict via UploadFile on smoke_fixture/test image
    assert SMOKE_TEST_IMG.exists(), f"Missing {SMOKE_TEST_IMG}"
    img_bytes = SMOKE_TEST_IMG.read_bytes()
    expected_sha = hashlib.sha256(img_bytes).hexdigest()
    r_pred_upload = client.post("/predict", files={"file": (SMOKE_TEST_IMG.name, img_bytes, "image/png")})
    assert r_pred_upload.status_code == 200, r_pred_upload.text
    p1 = r_pred_upload.json()
    assert p1["advisory_only"] is True
    assert p1["safety_actuation_allowed"] is False
    assert p1["real_dataset_trained"] is False
    assert p1["model_tier"] == "SMOKE_TEST_FIXTURE_ONLY"
    assert p1["input_sha256"] == expected_sha
    assert p1["image_size"] == [256, 256]
    assert len(p1["detections"]) == 1
    det = p1["detections"][0]
    assert det["class_name"] in TAXONOMY_NAMES
    assert 0.0 <= det["confidence"] <= 1.0
    for k in ("cx", "cy", "w", "h"):
        assert 0.0 <= det["bbox"][k] <= 1.0
    assert_no_forbidden_keys(p1)

    # 6. POST /predict via workspace-confined image_path on unlabeled CC0 tile
    assert AUDIT_CC0_IMG.exists(), f"Missing {AUDIT_CC0_IMG}"
    r_pred_path = client.post("/predict", data={"image_path": str(AUDIT_CC0_IMG)})
    assert r_pred_path.status_code == 200, r_pred_path.text
    p2 = r_pred_path.json()
    assert p2["advisory_only"] is True
    assert p2["safety_actuation_allowed"] is False
    assert p2["real_dataset_trained"] is False
    assert p2["input_sha256"] == hashlib.sha256(AUDIT_CC0_IMG.read_bytes()).hexdigest()
    assert_no_forbidden_keys(p2)

    # 7. Path traversal rejection (must return 403)
    for bad_path in ["/etc/passwd", "../../outside_secret.png"]:
        r_bad = client.post("/predict", data={"image_path": bad_path})
        assert r_bad.status_code == 403, f"Expected 403 for {bad_path}, got {r_bad.status_code}"

    # 8. Invalid upload rejection (must return 400)
    r_corrupt = client.post("/predict", files={"file": ("corrupt.png", b"not-an-image", "image/png")})
    assert r_corrupt.status_code == 400, f"Expected 400, got {r_corrupt.status_code}"

    # 9. Empty request rejection (must return 400)
    r_empty = client.post("/predict")
    assert r_empty.status_code == 400, f"Expected 400, got {r_empty.status_code}"

    print(json.dumps({
        "test_suite": "test_cv_api.py",
        "passed_checks": 9,
        "failed_checks": 0,
        "smoke_upload_pred": {
            "source": p1["source_name"],
            "class_name": det["class_name"],
            "confidence": det["confidence"],
            "inference_ms": p1["inference_ms"],
        },
        "cc0_audit_tile_pred": {
            "source": p2["source_name"],
            "class_name": p2["detections"][0]["class_name"],
            "confidence": p2["detections"][0]["confidence"],
            "note": "Unlabeled audit tile; advisory_only=True",
        },
    }, indent=2))


if __name__ == "__main__":
    main()
