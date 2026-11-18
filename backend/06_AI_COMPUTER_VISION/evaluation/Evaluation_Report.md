# Evaluation_Report.md — MFR M7 Computer Vision Pipeline Evaluation

**Document ID:** `MFR-M7-EVAL-001`  
**Date:** `2026-11-14`  
**Author:** Agent 06 (AI & Computer Vision Specialist)  
**Machine-Readable Source:** [`evaluation_summary.json`](file:///Users/Siwakorn/Downloads/mfr/MFR_MASTER/06_AI_COMPUTER_VISION/evaluation/evaluation_summary.json)  
**Visual Inspection Artifact:** [`QA_Eval_Sample_Predictions.png`](file:///Users/Siwakorn/Downloads/mfr/MFR_MASTER/06_AI_COMPUTER_VISION/evaluation/QA_Eval_Sample_Predictions.png)

> **`[PIPELINE SMOKE-TEST ONLY — PROCEDURAL FIXTURE; REAL FACADE ACCURACY = NOT TRAINED / NOT EVALUATED]`**  
> `is_real_facade_evaluated = false` | `real_labeled_defect_images_count = 0`

---

## 1. Executive Summary
1. **Real Facade Defect Evaluation:** **`NOT TRAINED / NOT EVALUATED`**. Zero labeled defect images exist in `/Users/Siwakorn/Downloads/mfr/source/photos_PLACEHOLDER/`.
2. **Smoke-Test Pipeline Verification:** The pure-PyTorch (`torch 2.13.0`) `MFRDefectNet` pipeline executed end-to-end on the deterministic `smoke_fixture/` (`100` train / `25` val / `25` test, `seed=42`, leakage-free `panel_id` split) in `11.97 s` on Apple Silicon `mps`, converging cleanly and exporting both `.pt` (`1.52 MiB`) and TorchScript `.ts` (`1.56 MiB`).
3. **Safety Isolation Verified:** All evaluation outputs and API schemas carry `advisory_only: true` and `safety_actuation_allowed: false` with zero actuator hooks.

---

## 2. Training Convergence (`training_pipeline/training_history.json`)
- **Device:** `mps` (Apple Silicon)
- **Epochs:** `36` | **Batch Size:** `16` | **Optimizer:** `AdamW (lr=1.8e-3, CosineAnnealingLR)`
- **Parameters:** `395,705`
- **Epoch 1 Baseline:** `train_loss=3.24828`, `train_cls_acc=0.19`, `val_loss=3.07899`, `val_cls_acc=0.20`, `val_mean_iou=0.2099`
- **Best Checkpoint (Epoch 36):** `val_cls_acc=1.0000`, `val_mean_iou=0.6412`
- **Training Wall Time:** `11.967 s`

---

## 3. Smoke-Fixture Test Results (`N = 25`, Procedural Only)

> **Scope Warning:** Every number in §3 measures pipeline behavior on synthetic shapes in `smoke_fixture/test` ONLY.

### 3.1 Aggregate Smoke-Test Metrics
| Metric | Measured Smoke-Test Value | Real-World Facade Status |
|---|---|---|
| Classification Accuracy (`N=25`) | `1.0000` (`25/25`) | `NOT TRAINED / NOT EVALUATED` |
| Macro-F1 | `1.0000` | `NOT TRAINED / NOT EVALUATED` |
| Mean BBox IoU (All 5 Classes) | `0.6113` | `NOT TRAINED / NOT EVALUATED` |
| Mean BBox IoU (Defect Classes `0–3`) | `0.5221` | `NOT TRAINED / NOT EVALUATED` |

### 3.2 Per-Class Smoke-Test Breakdown
| Class ID | Class Name | Support | Precision | Recall | F1 | Mean IoU |
|---|---|---|---|---|---|---|
| `0` | `Crack` | `5` | `1.0000` | `1.0000` | `1.0000` | `0.4283` |
| `1` | `Sealant deterioration` | `5` | `1.0000` | `1.0000` | `1.0000` | `0.4417` |
| `2` | `Rust / corrosion` | `5` | `1.0000` | `1.0000` | `1.0000` | `0.5634` |
| `3` | `Water stain` | `5` | `1.0000` | `1.0000` | `1.0000` | `0.6549` |
| `4` | `Normal surface` | `5` | `1.0000` | `1.0000` | `1.0000` | `0.9682` |

### 3.3 Confusion Matrix (`Rows = Ground Truth`, `Cols = Predicted`)
```text
GT \ Pred | C0  C1  C2  C3  C4
----------+-------------------
C0 Crack  |  5   0   0   0   0
C1 Sealant|  0   5   0   0   0
C2 Rust   |  0   0   5   0   0
C3 Water  |  0   0   0   5   0
C4 Normal |  0   0   0   0   5
```

### 3.4 Localization Behavior Analysis
- `Crack` (`IoU=0.4283`) and `Sealant deterioration` (`IoU=0.4417`) have thin, high-aspect-ratio bounding boxes, making single-box regression from an `8x8 -> 4x4` pooled feature map coarser than multi-scale anchor/anchor-free YOLO feature pyramids (`P3/P4/P5`). This validates why `train_yolo_target.py` (`YOLOv8n`) is specified for production once `ultralytics` + real data are available.
- Visual inspection of `QA_Eval_Sample_Predictions.png` confirms bounding-box alignment is spatially tracking defect quadrants accurately with zero label/box rendering overlap.

---

## 4. Measured Host Inference Timing (`MFRDefectNet`, `1x3x256x256`)

Measured on this Apple Silicon (`arm64` macOS, `torch 2.13.0`) host (`10` warmup iterations, `50` timed single-frame forward passes with explicit `torch.mps.synchronize()`):

| Device | Mean (`ms/frame`) | Median p50 (`ms/frame`) | p95 (`ms/frame`) | Theoretical Throughput (`FPS`) | Scope Caveat |
|---|---|---|---|---|---|
| **`cpu`** | `4.228` | `4.152` | `4.872` | `236.5` | Forward pass only; excludes JPEG decode, HTTP overhead, and `ESP32-CAM` Wi-Fi latency |
| **`mps`** | `1.238` | `1.064` | `2.590` | `807.8` | Forward pass only on Apple GPU; NOT representative of `YOLOv8n` or `ESP32-CAM` FPS |

---

## 5. Unlabeled Real Curtain-Wall Sanity Check (`Tier A`)
Two unlabeled real curtain-wall tiles (`S01_audit_tile_00.png`, `S04_audit_tile_00.png`) were passed through `mfr_smoke_best.pt` strictly to verify image-decode and response-schema compatibility:
- `S01_audit_tile_00.png` (`sha256: 820891437e...`): raw output `Sealant deterioration` (`conf=1.0`, `ground_truth_available=false`)
- `S04_audit_tile_00.png` (`sha256: 84a98eb3e9...`): raw output `Water stain` (`conf=1.0`, `ground_truth_available=false`)

**Engineering Takeaway:** High softmax confidence on out-of-distribution real photos confirms severe synthetic-to-real domain gap and underscores why real human-annotated facade imagery is mandatory prior to any field inspection use.
