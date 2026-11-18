# MFR AI 06 Integration Report

- **Existing Model Integrated:** `MFRDefectNet` (`MFR_MASTER/06_AI_COMPUTER_VISION/training_pipeline/model_arch.py`, weights `mfr_smoke_best.pt`) via `MFRVisionService` (`MFR_MASTER/06_AI_COMPUTER_VISION/inference_api/cv_service.py`).
- **Real Facade Training Status:** **`NOT TRAINED / NOT EVALUATED ON REAL BUILDING IMAGES`** (strictly disclosed across API responses, annotated image footers, and `/work-planning` UI).
- **Supported Defect Classes (Verified 5-Class Taxonomy):**
  1. `Crack` (Marker: Red)
  2. `Rust / corrosion` (Marker: Orange)
  3. `Sealant deterioration` (Marker: Yellow)
  4. `Water stain` (Marker: Blue)
  5. `Normal surface` (Marker: Green when human-verified; unverified AI points remain Gray)

---

## End-to-End Flow Implemented (`FastAPI` + `Next.js`)
1. **Capture (`POST /api/mfr/inspection/capture`):** Acquires image from Host/Browser USB webcam (or labeled smoke fixture/diagnostic pattern when hardware camera is disconnected cleanly), saves `orig_<id>.png` inside `database/captures/`, records UTC timestamp, SHA-256, session ID, building/facade/floor/panel ID, and localization tag (`MANUAL_ASSIGNED` vs `ESTIMATED`).
2. **Analyze (`POST /api/mfr/inspection/analyze`):** Invokes real PyTorch `MFRVisionService.predict_bytes(...)`, renders bounding boxes + class confidence (`% conf - ADVISORY`, never labeled "accuracy") onto `ann_<id>.png`, persists rows into `inspections`, `defect_detections`, and `defect_locations` (`advisory_only=True`, `verification_status="UNVERIFIED"`).
3. **Human Verification (`POST /api/mfr/inspection/review`):** Operator confirms, marks normal, or dismisses each detection, may manually correct `panel_id` / XYZ coordinates, and optionally creates a `WorkPlan` task.
4. **Structural Safety Rule:** Structural `Crack` detections are **programmatically prevented** from selecting `Cleaning appropriate` or launching cleaner pump missions (`HTTP 400 / 403`).
