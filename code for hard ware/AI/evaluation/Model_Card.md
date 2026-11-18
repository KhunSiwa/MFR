# Model_Card.md — MFR Facade Defect Inspection Vision Model (`MFRDefectNet` Smoke-Test Artifact)

> **CRITICAL REAL-WORLD STATUS BANNER**  
> **Real-World Facade Performance:** **`NOT TRAINED / NOT EVALUATED`**  
> **Real Labeled Facade Defect Images on Disk (`source/photos_PLACEHOLDER/`):** **`0`**  
> **Current Checkpoint (`mfr_smoke_best.pt` / `mfr_smoke_best.ts`):** Trained **exclusively** on a deterministic procedural smoke-test fixture (`smoke_fixture/`) to verify code, tensor shapes, TorchScript export, and FastAPI integration. **NEVER** cite smoke-test numbers as real-world defect detection accuracy.

---

## 1. Model Details
- **Model Identifier:** `MFRDefectNet-SmokeTest-v1.0` (`training_pipeline/model_arch.py`)
- **Project:** Module Facade Rover (MFR) — Milestone M7 (AI & Computer Vision)
- **Developer:** Agent 06 (`mfr-master-agent-06`)
- **Date:** `2026-11-14`
- **Architecture:** Lightweight 5-stage Conv2d + BatchNorm + ReLU CNN (`395,705` parameters) with dual heads:
  - Global Average Pooling classification head -> `5` logits (`Crack`, `Sealant deterioration`, `Rust / corrosion`, `Water stain`, `Normal surface`)
  - `4x4` spatial-grid pooling bbox regressor -> normalized `[cx, cy, w, h]`
- **Input Specification:** `1 x 3 x 256 x 256` RGB float32 normalized `[0.0, 1.0]`
- **Artifact Formats:**
  - PyTorch checkpoint: `training_pipeline/weights/mfr_smoke_best.pt` (`1,598,053` bytes, SHA-256 `cbb0c4d4d6c8da6eb6c5239e217ba167302d3c78d33fad87712d4f9ee96949c7`)
  - TorchScript export: `training_pipeline/weights/mfr_smoke_best.ts` (`1,639,606` bytes)
- **Production Target Architecture (Not Yet Trained on Host):** Ultralytics `YOLOv8n` (`training_pipeline/train_yolo_target.py` + `yolo_training_config.yaml`), blocked pending real labeled facade images and `ultralytics`/`torchvision` packages.

---

## 2. Intended Use & Hard Safety Boundaries

### 2.1 Intended Use
- **Software/Pipeline Integration Verification:** End-to-end validation of dataset schema, training loop, evaluation reporting, and `Agent 07` FastAPI dashboard overlay integration (`inference_api/cv_service.py`).
- **Future Real-Model Role (Post-Real-Data Training Only):** Strictly **advisory visual inspection logging and operator dashboard display** during ground-level or human-supervised facade inspection.

### 2.2 Out-of-Scope & Prohibited Uses (`Non-Negotiable Safety Rule`)
Per [`MFR_SINGLE_SOURCE_OF_TRUTH.md`](file:///Users/Siwakorn/Downloads/mfr/MFR_SINGLE_SOURCE_OF_TRUTH.md) §6 and [`Control_System_Architecture.md`](file:///Users/Siwakorn/Downloads/mfr/MFR_MASTER/02_MECHANICAL_SAFETY/Control_System_Architecture.md) §1.1:
1. **NO Safety-Critical Actuation:** CV outputs (`advisory_only: true`, `safety_actuation_allowed: false`) **MUST NEVER** trigger, gate, or override Hardware Emergency Stop (`E-Stop`), roof-anchored tether brakes/rope-grabs, vacuum suction cutoffs, or `ESP32 DevKitC` motor `PWM` watchdogs.
2. **NO Autonomous High-Rise Glass Climbing:** The current MFR CAD chassis (`Assembly_1.step`) is a ground-wheel prototype; CV inference cannot authorize vertical climbing or navigation.
3. **NO Clinical/Structural Certification:** Advisory detections require human structural engineer verification before building repair decisions.

---

## 3. Training & Evaluation Data Separation

| Dataset Tier | Path | Composition | Labeling Status |
|---|---|---|---|
| **Tier A — Real Curtain-Wall Audit Tiles** | `dataset_spec/real_curtainwall_unlabeled_audit/` | `16` `256x256` PNG tiles cropped from verified `S01_curtain_wall_cc0.jpg` (`CC0`) & `S04_curtain_wall_mullions_ccbysa3.jpg` (`CC BY-SA 3.0`) | **`UNLABELED_CURTAINWALL_AUDIT_ONLY`** (`0` defect labels; used only for non-accuracy domain-sanity checks) |
| **Tier B — Procedural Smoke Fixture** | `dataset_spec/smoke_fixture/` | `100` train / `25` val / `25` test `256x256` RGB PNGs (`seed=42`, panel-ID disjoint split) | **`SMOKE_TEST_FIXTURE_ONLY`** (procedural synthetic shapes; `0` real defect photos) |

---

## 4. Quantitative Performance

### 4.1 Real-World Building Facade Metrics
- **Overall Precision / Recall / mAP / F1 / Confusion Matrix:** **`NOT TRAINED / NOT EVALUATED`** (`0` real labeled defect images).
- **Domain-Gap Observation on Unlabeled Real Tiles (`evaluation_summary.json`):** Running `mfr_smoke_best.pt` on `S01_audit_tile_00.png` (curtain wall behind tree branches) and `S04_audit_tile_00.png` (clean curtain-wall reflection) yielded confident false-domain predictions (`Sealant deterioration` at `1.0` and `Water stain` at `1.0`), directly confirming that procedural smoke-test weights do **not** generalize to real facades.

### 4.2 Pipeline Smoke-Test Metrics (`[PIPELINE SMOKE-TEST ONLY — PROCEDURAL FIXTURE]`)
Measured on `smoke_fixture/test` (`N = 25`, `5` samples per class, `seed = 42`):
- **Classification Accuracy (Procedural Fixture Only):** `1.0000` (`25 / 25`)
- **Macro-F1 (Procedural Fixture Only):** `1.0000`
- **Mean Bounding-Box IoU (All 5 Classes):** `0.6113`
- **Mean Bounding-Box IoU (Defect Classes `0–3`):** `0.5221`
- **Host Forward-Pass Latency (`1x3x256x256`, `MFRDefectNet` only):**
  - `CPU`: `4.228 ms/frame` mean (`p95 = 4.872 ms`, `236.5` theoretical FPS)
  - `MPS` (Apple Silicon): `1.238 ms/frame` mean (`p95 = 2.590 ms`, `807.8` theoretical FPS)

---

## 5. Failure Modes, Biases & Ethical/Safety Risks
1. **Synthetic-to-Real Domain Gap:** Procedural geometric lines, blobs, and drips cannot capture real glass specular reflections, clouds, interior blinds, dust, oblique viewing angles, or variable sunlight.
2. **ESP32-CAM Sensor & Stream Artifacts:** Real `ESP32-CAM (OV2640)` MJPEG compression artifacts, rolling-shutter vibration, and `2.4 GHz` Wi-Fi frame drops (`> 2 s` camera timeout state) are not modeled in `smoke_fixture/`.
3. **False Negatives vs. False Positives:** Missing a real structural crack (`FN`) on a building facade creates maintenance risk if operators over-rely on AI overlays; false positives (`FP`) from tree shadows or sky reflections create operator alert fatigue. Both motivate mandatory human review and `advisory_only: true` enforcement.
4. **Privacy Risk:** Real facade captures near occupied windows may inadvertently capture building occupants; `Dataset_and_Annotation_Specification.md` mandates EXIF stripping and visual privacy review before dataset archival.
