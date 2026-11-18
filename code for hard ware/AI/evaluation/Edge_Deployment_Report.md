# Edge_Deployment_Report.md — MFR CV Edge & Host Deployment Architecture

**Document ID:** `MFR-M7-EDGE-001`  
**Date:** `2026-11-14`  
**Author:** Agent 06 (AI & Computer Vision Specialist)  
**Authoritative References:**
- [`MFR_SINGLE_SOURCE_OF_TRUTH.md`](file:///Users/Siwakorn/Downloads/mfr/MFR_SINGLE_SOURCE_OF_TRUTH.md)
- [`Control_System_Architecture.md`](file:///Users/Siwakorn/Downloads/mfr/MFR_MASTER/02_MECHANICAL_SAFETY/Control_System_Architecture.md)
- [`.agents/skills/mfr-ai-vision/SKILL.md`](file:///Users/Siwakorn/Downloads/mfr/.agents/skills/mfr-ai-vision/SKILL.md)

---

## 1. End-to-End Inference Topology & Safety Isolation

Per [`Control_System_Architecture.md`](file:///Users/Siwakorn/Downloads/mfr/MFR_MASTER/02_MECHANICAL_SAFETY/Control_System_Architecture.md) §2.1, MFR decouples real-time motor control (`Layer 2` on `ESP32 DevKitC`) and hardware fail-safes (`Layer 1` Hardware E-Stop) from all camera/CV processing (`Layer 4` Advisory):

```text
[ESP32-CAM (OV2640)] --(2.4 GHz Wi-Fi MJPEG [NOT YET TESTED])--> [Ground Host / Edge SBC]
                                                                       |
                                                                       v
                                                       [FastAPI / MFRVisionService]
                                                       (advisory_only: true)
                                                       (safety_actuation_allowed: false)
                                                                       |
                                                                       v
                                                       [Operator Dashboard + Defect Log]
                                                       (Human Decision Only — ZERO link
                                                        to E-Stop / Tether / Motor PWM)
```

### Why CV Does Not Run Directly on `ESP32-CAM`
- The `ESP32-CAM` (`OV2640`) is memory- and compute-constrained (`PSRAM` / `~240 MHz` Xtensa MCU) and shares `2.4 GHz` Wi-Fi airspace with telemetry. Running multi-class CNN/YOLO inference on-module risks brownouts and frame drops.
- Therefore, `ESP32-CAM` acts purely as an **MJPEG camera source**, while `MFRVisionService` (`inference_api/cv_service.py`) executes on the operator ground station or a dedicated companion SBC (e.g., future Jetson/Linux edge compute).

---

## 2. Verified Runtime & Format Export Compatibility Matrix (Current Host)

Audited directly on this host (`macOS arm64`, Python `3.12.4`, `/Users/Siwakorn/Downloads/mfr/MFR_PRODUCTION/.venv/bin/python -B`):

| Component / Runtime | Current Host Status | Evidence / Technical Reason | Deployment Impact |
|---|---|---|---|
| **PyTorch (`torch 2.13.0`)** | **INSTALLED & VERIFIED** | `cpu` (`4.228 ms/frame`) & `mps` (`1.238 ms/frame`) verified on `MFRDefectNet` | Ready for offline smoke-test & ground-host PyTorch inference |
| **TorchScript (`.ts`)** | **VERIFIED EXPORT** | `weights/mfr_smoke_best.ts` (`1,639,606` B) traced & saved cleanly | Enables C++/Python LibTorch deployment without `model_arch.py` import |
| **OpenCV (`cv2 4.10.0`) & Pillow (`12.0.0`)** | **INSTALLED & VERIFIED** | Image I/O, preprocessing, and bounding-box QA rendering verified | Ready for MJPEG frame decoding & overlay generation |
| **FastAPI (`0.115.2`) & Pydantic (`2.13.4`)** | **INSTALLED & VERIFIED** | `inference_api/app.py` verified via `TestClient` (`httpx 0.28.1`) | Ready for `Agent 07` unified backend integration |
| **TorchVision (`torchvision`)** | **ABSENT** | `ImportError` verified on host | Blocks `ultralytics` and standard torchvision NMS utilities on this venv |
| **Ultralytics (`ultralytics`)** | **ABSENT** | `ImportError` verified on host | `train_yolo_target.py` aborts cleanly; YOLOv8 training requires external/updated env |
| **ONNX / ONNX Runtime (`onnx`, `onnxruntime`)** | **ABSENT** | `ImportError` verified on host | `.onnx` export and `onnxruntime` CPU/DirectML/CoreML benchmarks NOT executed |
| **NVIDIA TensorRT (`tensorrt`)** | **INCOMPATIBLE & ABSENT** | Apple Silicon (`arm64` macOS) lacks NVIDIA CUDA GPU; `tensorrt` requires NVIDIA x86_64/Jetson Linux | **ZERO TensorRT benchmarks claimed.** TensorRT FP16/INT8 optimization reserved strictly for future NVIDIA Jetson / CUDA edge targets |
| **`ESP32-CAM` Live Wi-Fi MJPEG Stream** | **NOT YET TESTED** | `0` bench camera stream captures or latency logs in workspace (`SSOT §4`) | Stream FPS, packet loss, and `> 2 s` camera-drop trigger remain unvalidated |

---

## 3. Target Edge Promotion Path (Pending Real Data & Hardware Bench)

1. **Stage 1 — Current Ground-Station Baseline (Verified Software Contract):**
   - `Agent 07` unified backend imports `MFRVisionService` directly (`inference_api/cv_service.py`) or calls `127.0.0.1` FastAPI `/predict`.
   - Enforce input size validation, workspace-confined file paths, `advisory_only=true`, and SHA-256 audit logging per frame.
2. **Stage 2 — Real Dataset Acquisition & Production `YOLOv8n` Training:**
   - Populate `source/photos_PLACEHOLDER/` from real `ESP32-CAM` / inspection camera captures, annotate in CVAT/Label Studio (`Dataset_and_Annotation_Specification.md`), and train `train_yolo_target.py` on a workstation/cloud GPU with `ultralytics` + `torchvision`.
3. **Stage 3 — Cross-Platform Export (`ONNX` -> Target Edge):**
   - Export validated `YOLOv8n` weights to `ONNX (opset 17)` for portable CPU/CoreML (`onnxruntime`) or to **NVIDIA TensorRT FP16** strictly if an NVIDIA Jetson companion computer is added to the robot in future Phase C/D hardware revisions.
4. **Stage 4 — End-to-End Bench Latency Validation (`NOT YET TESTED`):**
   - Measure total glass-to-glass budget (`ESP32-CAM capture -> JPEG encode -> 2.4 GHz Wi-Fi -> FastAPI decode -> model forward -> dashboard WebSocket render`) alongside `ESP32 DevKitC` telemetry to verify zero interference with the proposed `500 ms` drive-link watchdog.
