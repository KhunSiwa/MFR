#!/usr/bin/env python3
"""
MFR Module Facade Rover — Advisory Computer Vision Inference Service
---------------------------------------------------------------------
Clean, importable offline inference service (`MFRVisionService`) designed for:
  1. Direct import by Agent 07's unified MFR FastAPI backend.
  2. Standalone FastAPI microservice (`inference_api/app.py`).
  3. CLI inspection (`python -B cv_service.py --image <workspace_image>`).

STRICT SAFETY & HONESTY INVARIANTS:
  - advisory_only = True (always)
  - safety_actuation_allowed = False (always; zero E-stop / tether / PWM links)
  - model_tier = "SMOKE_TEST_FIXTURE_ONLY"
  - real_dataset_trained = False
"""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import sys
import time
from pathlib import Path
from typing import Dict, List, Optional

sys.dont_write_bytecode = True

import numpy as np
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel, Field
import torch

THIS_DIR = Path(__file__).resolve().parent
CV_ROOT = THIS_DIR.parent
WORKSPACE_ROOT = CV_ROOT.parents[1].resolve()
TRAIN_DIR = CV_ROOT / "training_pipeline"
DEFAULT_WEIGHTS_PT = TRAIN_DIR / "weights" / "mfr_smoke_best.pt"
EVAL_SUMMARY_JSON = CV_ROOT / "evaluation" / "evaluation_summary.json"

sys.path.insert(0, str(TRAIN_DIR))
from model_arch import CLASSES, INPUT_SIZE, MFRDefectNet  # noqa: E402

ALLOWED_IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".bmp", ".webp"}
MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MiB safety cap
DISCLAIMER = "[PIPELINE SMOKE-TEST ONLY — PROCEDURAL FIXTURE; REAL FACADE ACCURACY = NOT TRAINED / NOT EVALUATED]"


class BoundingBox(BaseModel):
    cx: float = Field(..., ge=0.0, le=1.0)
    cy: float = Field(..., ge=0.0, le=1.0)
    w: float = Field(..., ge=0.0, le=1.0)
    h: float = Field(..., ge=0.0, le=1.0)


class DefectDetection(BaseModel):
    class_id: int = Field(..., ge=0, le=4)
    class_name: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    bbox: BoundingBox
    advisory_only: bool = True


class CVPredictionResponse(BaseModel):
    advisory_only: bool = True
    safety_actuation_allowed: bool = False
    model_tier: str = "SMOKE_TEST_FIXTURE_ONLY"
    real_dataset_trained: bool = False
    is_real_facade_evaluated: bool = False
    disclaimer: str = DISCLAIMER
    source_name: str
    input_sha256: str
    image_size: List[int]
    inference_ms: float
    detections: List[DefectDetection]
    class_probabilities: Dict[str, float]


class HealthResponse(BaseModel):
    status: str
    service: str
    model_loaded: bool
    weights_sha256: str
    device: str
    model_tier: str
    real_dataset_trained: bool
    advisory_only: bool
    safety_actuation_allowed: bool
    disclaimer: str


class ModelCardResponse(BaseModel):
    model_name: str
    model_tier: str
    real_dataset_trained: bool
    is_real_facade_evaluated: bool
    real_facade_status: str
    taxonomy: Dict[str, str]
    input_size: List[int]
    weights_sha256: str
    smoke_test_metrics: Optional[Dict] = None
    disclaimer: str
    advisory_only: bool = True
    safety_actuation_allowed: bool = False


class SafetyPolicyResponse(BaseModel):
    advisory_only: bool = True
    safety_actuation_allowed: bool = False
    control_layer: str = "LAYER_4_ADVISORY_INSPECTION_ONLY"
    prohibited_actions: List[str]
    permitted_actions: List[str]
    ssot_reference: str


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def resolve_workspace_image_path(path_str: str, workspace_root: Path = WORKSPACE_ROOT) -> Path:
    """Confine image path access strictly inside the MFR workspace root."""
    if not path_str or not path_str.strip():
        raise ValueError("Empty image path supplied.")
    candidate = Path(path_str)
    if not candidate.is_absolute():
        candidate = (workspace_root / candidate).resolve()
    else:
        candidate = candidate.resolve()

    if not candidate.is_relative_to(workspace_root):
        raise PermissionError(
            f"Access denied: path '{path_str}' resolves outside confined workspace '{workspace_root}'."
        )
    if not candidate.exists() or not candidate.is_file():
        raise FileNotFoundError(f"Image file not found inside workspace: '{candidate}'.")
    if candidate.suffix.lower() not in ALLOWED_IMAGE_EXTS:
        raise ValueError(f"Unsupported image extension '{candidate.suffix}'. Allowed: {sorted(ALLOWED_IMAGE_EXTS)}")
    return candidate


class MFRVisionService:
    """Offline pure-PyTorch inference service for MFR facade inspection (advisory only)."""

    def __init__(self, weights_path: Path = DEFAULT_WEIGHTS_PT, device: str = "cpu") -> None:
        self.weights_path = Path(weights_path).resolve()
        if not self.weights_path.exists():
            raise FileNotFoundError(f"Weights file missing: {self.weights_path}")

        self.device = torch.device(device)
        ckpt = torch.load(self.weights_path, map_location=self.device, weights_only=True)
        self.weights_sha256 = sha256_bytes(self.weights_path.read_bytes())
        self.model = MFRDefectNet(num_classes=len(CLASSES)).to(self.device).eval()
        self.model.load_state_dict(ckpt["state_dict"])
        self.model_tier = str(ckpt.get("dataset_tier", "SMOKE_TEST_FIXTURE_ONLY"))
        self.real_dataset_trained = bool(ckpt.get("real_dataset_trained", False))

    def health(self) -> HealthResponse:
        return HealthResponse(
            status="ok",
            service="MFRVisionService",
            model_loaded=True,
            weights_sha256=self.weights_sha256,
            device=str(self.device),
            model_tier=self.model_tier,
            real_dataset_trained=self.real_dataset_trained,
            advisory_only=True,
            safety_actuation_allowed=False,
            disclaimer=DISCLAIMER,
        )

    def model_card(self) -> ModelCardResponse:
        smoke_metrics = None
        if EVAL_SUMMARY_JSON.exists():
            raw = json.loads(EVAL_SUMMARY_JSON.read_text(encoding="utf-8"))
            smoke_metrics = {
                "note": "SMOKE_TEST_FIXTURE_ONLY — NOT real-world accuracy",
                "test_sample_count": raw.get("test_sample_count"),
                "smoke_test_accuracy": raw.get("smoke_test_accuracy"),
                "smoke_test_macro_f1": raw.get("smoke_test_macro_f1"),
                "smoke_test_mean_iou_all": raw.get("smoke_test_mean_iou_all"),
            }
        return ModelCardResponse(
            model_name="MFRDefectNet-SmokeTest-v1.0",
            model_tier=self.model_tier,
            real_dataset_trained=self.real_dataset_trained,
            is_real_facade_evaluated=False,
            real_facade_status="NOT TRAINED / NOT EVALUATED (0 real labeled defect images)",
            taxonomy={str(k): v for k, v in CLASSES.items()},
            input_size=[1, 3, INPUT_SIZE, INPUT_SIZE],
            weights_sha256=self.weights_sha256,
            smoke_test_metrics=smoke_metrics,
            disclaimer=DISCLAIMER,
            advisory_only=True,
            safety_actuation_allowed=False,
        )

    @staticmethod
    def safety_policy() -> SafetyPolicyResponse:
        return SafetyPolicyResponse(
            advisory_only=True,
            safety_actuation_allowed=False,
            control_layer="LAYER_4_ADVISORY_INSPECTION_ONLY",
            prohibited_actions=[
                "Trigger or inhibit hardware E-Stop circuits",
                "Control, release, or brake roof-anchored safety tethers or rope-grabs",
                "Override vacuum retention cutoffs or motor power isolation relays",
                "Command ESP32 DevKitC motor PWM or steering actuators directly",
                "Authorize autonomous vertical high-rise glass climbing",
            ],
            permitted_actions=[
                "Log advisory defect classifications and bounding boxes with input SHA-256",
                "Display non-critical visual inspection overlays on operator dashboard",
                "Flag candidate regions for human structural reviewer confirmation",
            ],
            ssot_reference="MFR_SINGLE_SOURCE_OF_TRUTH.md §3 & §6; Control_System_Architecture.md §1.1",
        )

    def predict_bytes(self, image_bytes: bytes, source_name: str = "upload") -> CVPredictionResponse:
        if not image_bytes:
            raise ValueError("Empty image payload.")
        if len(image_bytes) > MAX_UPLOAD_BYTES:
            raise ValueError(f"Image payload exceeds {MAX_UPLOAD_BYTES} bytes limit.")

        digest = sha256_bytes(image_bytes)
        try:
            with Image.open(io.BytesIO(image_bytes)) as im:
                orig_w, orig_h = im.size
                rgb = im.convert("RGB").resize((INPUT_SIZE, INPUT_SIZE))
        except (UnidentifiedImageError, OSError) as exc:
            raise ValueError(f"Invalid or corrupted image data: {exc}") from exc

        arr = np.asarray(rgb, dtype=np.float32) / 255.0
        chw = np.ascontiguousarray(np.transpose(arr, (2, 0, 1))[None, ...])
        tensor = torch.from_numpy(chw).to(self.device)

        t0 = time.perf_counter()
        with torch.no_grad():
            logits, bbox = self.model(tensor)
            probs = torch.softmax(logits, dim=1)[0].cpu().numpy()
            box_vals = torch.clamp(bbox[0], 0.0, 1.0).cpu().tolist()
        elapsed_ms = (time.perf_counter() - t0) * 1000.0

        pred_cid = int(np.argmax(probs))
        pred_conf = float(probs[pred_cid])

        detection = DefectDetection(
            class_id=pred_cid,
            class_name=CLASSES[pred_cid],
            confidence=round(pred_conf, 4),
            bbox=BoundingBox(
                cx=round(float(box_vals[0]), 5),
                cy=round(float(box_vals[1]), 5),
                w=round(float(box_vals[2]), 5),
                h=round(float(box_vals[3]), 5),
            ),
            advisory_only=True,
        )

        prob_map = {CLASSES[i]: round(float(probs[i]), 5) for i in range(len(CLASSES))}
        return CVPredictionResponse(
            advisory_only=True,
            safety_actuation_allowed=False,
            model_tier=self.model_tier,
            real_dataset_trained=self.real_dataset_trained,
            is_real_facade_evaluated=False,
            disclaimer=DISCLAIMER,
            source_name=source_name,
            input_sha256=digest,
            image_size=[int(orig_w), int(orig_h)],
            inference_ms=round(elapsed_ms, 3),
            detections=[detection],
            class_probabilities=prob_map,
        )

    def predict_file(self, image_path: str) -> CVPredictionResponse:
        resolved = resolve_workspace_image_path(image_path)
        return self.predict_bytes(resolved.read_bytes(), source_name=resolved.name)


def main() -> None:
    parser = argparse.ArgumentParser(description="MFR Advisory CV CLI Inference")
    parser.add_argument("--image", required=True, help="Workspace image path to run advisory inference on")
    args = parser.parse_args()

    svc = MFRVisionService()
    res = svc.predict_file(args.image)
    print(json.dumps(res.model_dump(), indent=2))


if __name__ == "__main__":
    main()
