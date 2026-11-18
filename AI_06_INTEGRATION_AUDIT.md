# AI 06 Integration Audit (`AI_06_INTEGRATION_AUDIT.md`)

**Audit Date:** 2026-11-16  
**Audited Systems:**
- AI 06 Core Module: `/Users/Siwakorn/Downloads/mfr/MFR_MASTER/06_AI_COMPUTER_VISION/`
- Unified Backend Service: `/Users/Siwakorn/Downloads/mfr/MFR_MASTER/07_DASHBOARD_SOFTWARE/backend/main.py`
- Website Client Target: `/Users/Siwakorn/i-new-gen/`

---

## 1. Actual AI 06 Location & Related Files

AI 06 resides under `/Users/Siwakorn/Downloads/mfr/MFR_MASTER/06_AI_COMPUTER_VISION/` and is imported into the M7 unified FastAPI backend at `/Users/Siwakorn/Downloads/mfr/MFR_MASTER/07_DASHBOARD_SOFTWARE/backend/main.py` (currently running on `http://127.0.0.1:8008`).

Key source files verified:
- `06_AI_COMPUTER_VISION/training_pipeline/model_arch.py` — PyTorch `MFRDefectNet` definition & 5-class taxonomy.
- `06_AI_COMPUTER_VISION/training_pipeline/train_mfr_cv.py` — Pure-PyTorch smoke-test training script (`training_history.json`).
- `06_AI_COMPUTER_VISION/training_pipeline/train_yolo_target.py` + `yolo_training_config.yaml` — Future production `YOLOv8n` target launcher (blocked because `ultralytics`/`torchvision` and real labeled defect datasets are absent on host).
- `06_AI_COMPUTER_VISION/inference_api/cv_service.py` — Reusable `MFRVisionService` class + Pydantic schemas (`CVPredictionResponse`, `HealthResponse`, `ModelCardResponse`, `SafetyPolicyResponse`).
- `06_AI_COMPUTER_VISION/inference_api/app.py` — Standalone FastAPI microservice (default port `8006`).
- `06_AI_COMPUTER_VISION/evaluation/{Model_Card.md, Evaluation_Report.md, evaluation_summary.json}` — Model documentation & measured smoke-test results.
- `06_AI_COMPUTER_VISION/dataset_spec/` — Auditable dataset manifest (`dataset_manifest.json`), `smoke_fixture/` (`100` train / `25` val / `25` test synthetic PNGs), and `real_curtainwall_unlabeled_audit/` (`16` unlabeled `256×256` tiles cropped from `CC0`/`CC BY-SA 3.0` facade photos).
- `07_DASHBOARD_SOFTWARE/backend/main.py` — Unified FastAPI server integrating `MFRVisionService` with SQLite (`database/mfr_m7_dev.db`) via SQLAlchemy 2.0.

---

## 2. Model Architecture & Artifact Inventory

- **Active Deployable Model Identifier:** `MFRDefectNet-SmokeTest-v1.0`
- **Architecture (`model_arch.py`):** 5-stage Conv2d + BatchNorm + ReLU CNN (`395,705` parameters) with:
  1. Global Average Pooling classification head → `5` class logits.
  2. `4×4` spatial-grid average-pooling bbox regressor → normalized `[cx, cy, w, h]` via `Sigmoid`.
- **Target Classes (`CLASSES`):**
  - `0`: `Crack`
  - `1`: `Sealant deterioration`
  - `2`: `Rust / corrosion`
  - `3`: `Water stain`
  - `4`: `Normal surface`
- **Model Weights Verified on Disk:**
  - `training_pipeline/weights/mfr_smoke_best.pt` (`1,598,053` bytes, SHA-256: `cbb0c4d4d6c8da6eb6c5239e217ba167302d3c78d33fad87712d4f9ee96949c7`)
  - `training_pipeline/weights/mfr_smoke_best.ts` (`1,639,606` bytes TorchScript export)
- **Production Target Architecture (Not Active on Host):** `YOLOv8n` (`imgsz=640`, `train_yolo_target.py`), explicitly blocked without silent fallback until `ultralytics`, `torchvision`, and labeled building defect data exist.

---

## 3. Input / Output Contract

- **Model Input:** RGB image resized to `256 × 256`, float32 normalized `[0.0, 1.0]`, shape `[1, 3, 256, 256]`.
- **Accepted Upload Formats (`cv_service.py`):** `.png`, `.jpg`, `.jpeg`, `.bmp`, `.webp` (`MAX_UPLOAD_BYTES = 10 MiB` = `10,485,760` bytes).
- **Primary Unified Backend API (`http://127.0.0.1:8008`):**
  - `GET /health` → DB status, `cv_model_loaded`, `weights_sha256`, `model_tier`, `real_dataset_trained: false`, `advisory_only: true`, `safety_actuation_allowed: false`, `ai_safety_control_enabled: false`, `estop_override_allowed: false`, `disclaimer`.
  - `GET /api/v1/model-status` → Taxonomy, input size, smoke-test benchmark metadata, host latency (`cpu` / `mps`), `real_facade_status`.
  - `GET /api/v1/samples` & `GET /api/v1/sample-images/{sample_name}` → Whitelisted audit curtain-wall tiles (`S01_*`, `S04_*`) and `smoke_fixture/test` images.
  - `POST /api/v1/infer` → Accepts multipart `file` OR whitelisted `sample_id` (+ `robot_code`). Returns & persists `InspectionOut`:
    - `inspection_id`, `robot_code`, `model_name`, `source_type`, `source_name`, `input_sha256`, `image_size: [orig_w, orig_h]`, `inference_ms`
    - `model_tier: "SMOKE_TEST_FIXTURE_ONLY"`, `real_dataset_trained: false`, `is_real_facade_evaluated: false`
    - `advisory_only: true`, `safety_actuation_allowed: false`, `disclaimer`
    - `operator_review_status` (`PENDING_HUMAN_REVIEW` | `CONFIRMED` | `DISMISSED`)
    - `class_probabilities`: probabilities across all 5 classes
    - `detections`: `[{ id, class_id, class_name, confidence, bbox: { cx, cy, w, h }, advisory_only: true }]`
  - `GET /api/v1/inspections` & `GET /api/v1/inspections/{id}` → Persisted SQLite inspection history.
  - `PATCH /api/v1/inspections/{id}/review` → Updates `operator_review_status`.
  - `GET /api/v1/telemetry` & `POST /api/v1/telemetry` → Segregates `SIMULATED_MOCK`, `LIVE_BENCH`, `UNCONNECTED`; rejects `vertical_glass_autonomous: true` (`HTTP 422`) and forbidden actuator override fields (`HTTP 403`).
  - `GET /api/v1/safety-events` & `POST /api/v1/safety/command` → Hardware isolation policy + `HTTP 403` audit trail.

---

## 4. Dataset Provenance & Limitations (Mandatory Honesty Disclosure)

1. **Zero Real Labeled Facade Defect Photos (`real_labeled_defect_images_count = 0`):** `mfr_smoke_best.pt` was trained exclusively on `smoke_fixture/` (`100` train / `25` val / `25` test synthetic PNG shapes, `seed=42`).
2. **Smoke-Test Numbers Are NOT Real Accuracy:** The `1.0000` classification accuracy (`25/25`) and `0.6113` mean IoU reported in `evaluation_summary.json` verify pipeline convergence on synthetic shapes only.
3. **Observed Out-of-Distribution Failure (`Model_Card.md` §4.1):** On unlabeled real curtain-wall tiles (`S01_audit_tile_00.png`, `S04_audit_tile_00.png`), the smoke model outputs `1.0` softmax confidence for incorrect classes due to the synthetic-to-real domain gap.
4. **Single Primary Bounding Box Per Inference:** `MFRDefectNet` predicts 1 primary class + 1 primary normalized bbox `[cx, cy, w, h]` per `256×256` frame (`class_probabilities` reports all 5 softmax scores). Multi-object detection requires real-data `YOLOv8n` training.
5. **Advisory-Only Safety Boundary:** AI outputs must NEVER control robot motion, vacuum adhesion, roof tether brakes, or E-Stop circuits (`ai_safety_control_enabled = false`, `estop_override_allowed = false`).

---

## 5. Recommended Integration Architecture for `/Users/Siwakorn/i-new-gen`

```text
Browser UI (/ai-analysis, /dashboard, /inspection, /architecture)
        │  (same-origin HTTPS/HTTP fetch, multipart upload <= 10 MiB)
        ▼
Next.js App Router Proxy Layer (src/app/api/mfr/*)
        │  - Validates file extension/MIME & size before forwarding
        │  - Reads MFR_BACKEND_URL (default: http://127.0.0.1:8008)
        │  - Never exposes local filesystem paths or stack traces
        │  - Returns structured 503 if backend is down
        ▼
M7 Unified FastAPI + AI 06 Service (127.0.0.1:8008)
        │  ├── MFRVisionService (PyTorch MFRDefectNet-SmokeTest-v1.0)
        │  ├── SQLite Persistence (inspections, defect_detections, telemetry_logs, safety_events)
        │  └── Safety Isolation Enforcement (403 on actuator/E-stop overrides)
```

Why this architecture:
1. Preserves AI 06 and SQLite persistence in the verified M7 Python backend without duplicating PyTorch logic or executing models in the browser.
2. Protects Next.js clients with same-origin requests, strict upload validation, and graceful offline/disconnected UI states.
3. Keeps CORS, secrets, and filesystem paths isolated on the server side (`image_path` arbitrary server file reads are NOT exposed via the web upload UI — only browser file uploads and whitelisted `sample_id` endpoints).
