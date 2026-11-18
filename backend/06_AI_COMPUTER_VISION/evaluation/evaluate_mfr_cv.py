#!/usr/bin/env python3
"""
MFR Module Facade Rover — Smoke-Test Evaluation & Host Timing Script
--------------------------------------------------------------------
1. Runs real inference of weights/mfr_smoke_best.pt on smoke_fixture/test (25 images).
2. Computes exact 5x5 confusion matrix, per-class P/R/F1, macro-F1, and bbox IoU.
3. Measures real synchronized wall-clock latency (ms/frame, FPS) on CPU vs MPS.
4. Executes an unlabeled sanity inference pass on 2 real curtain-wall audit tiles
   (no ground truth, no accuracy claim).
5. Writes evaluation_summary.json and QA_Eval_Sample_Predictions.png.

MANDATORY HONESTY NOTICE:
  All metrics apply ONLY to the procedural smoke_fixture/test split.
  is_real_facade_evaluated = false. Real facade accuracy = NOT TRAINED / NOT EVALUATED.
"""

from __future__ import annotations

import hashlib
import json
import sys
import time
from pathlib import Path
from typing import Dict, List, Tuple

sys.dont_write_bytecode = True

import numpy as np
from PIL import Image, ImageDraw, ImageFont
import torch

THIS_DIR = Path(__file__).resolve().parent
CV_ROOT = THIS_DIR.parent
TRAIN_DIR = CV_ROOT / "training_pipeline"
DATASET_DIR = CV_ROOT / "dataset_spec"
SMOKE_DIR = DATASET_DIR / "smoke_fixture"
AUDIT_DIR = DATASET_DIR / "real_curtainwall_unlabeled_audit"
WEIGHTS_PT = TRAIN_DIR / "weights" / "mfr_smoke_best.pt"

SUMMARY_JSON = THIS_DIR / "evaluation_summary.json"
QA_EVAL_PNG = THIS_DIR / "QA_Eval_Sample_Predictions.png"

sys.path.insert(0, str(TRAIN_DIR))
from model_arch import CLASSES, INPUT_SIZE, MFRDefectNet, bbox_iou_cxcywh  # noqa: E402

DISCLAIMER = "[PIPELINE SMOKE-TEST ONLY — PROCEDURAL FIXTURE; REAL FACADE ACCURACY = NOT TRAINED / NOT EVALUATED]"


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def load_font(size: int = 13) -> ImageFont.ImageFont:
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ]
    for c in candidates:
        p = Path(c)
        if p.exists():
            try:
                return ImageFont.truetype(str(p), size=size)
            except Exception:
                pass
    return ImageFont.load_default()


def load_test_split() -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor, List[Path]]:
    img_dir = SMOKE_DIR / "images" / "test"
    lbl_dir = SMOKE_DIR / "labels" / "test"
    img_paths = sorted(img_dir.glob("*.png"))
    if not img_paths:
        raise FileNotFoundError(f"Missing test images in {img_dir}")

    imgs: List[np.ndarray] = []
    labels: List[int] = []
    bboxes: List[List[float]] = []

    for ip in img_paths:
        lp = lbl_dir / f"{ip.stem}.txt"
        parts = lp.read_text(encoding="utf-8").strip().splitlines()[0].split()
        cls_id = int(parts[0])
        bbox = [float(x) for x in parts[1:5]]
        with Image.open(ip) as im:
            arr = np.asarray(im.convert("RGB").resize((INPUT_SIZE, INPUT_SIZE)), dtype=np.float32) / 255.0
        imgs.append(np.transpose(arr, (2, 0, 1)))
        labels.append(cls_id)
        bboxes.append(bbox)

    x_tensor = torch.from_numpy(np.ascontiguousarray(np.stack(imgs, axis=0)))
    y_cls = torch.tensor(labels, dtype=torch.long)
    y_box = torch.tensor(bboxes, dtype=torch.float32)
    return x_tensor, y_cls, y_box, img_paths


def benchmark_device(state_dict: Dict, device_str: str, warmup: int = 10, iters: int = 50) -> Dict:
    device = torch.device(device_str)
    model = MFRDefectNet(num_classes=len(CLASSES)).to(device).eval()
    model.load_state_dict(state_dict)
    dummy = torch.randn(1, 3, INPUT_SIZE, INPUT_SIZE, dtype=torch.float32, device=device)

    def sync() -> None:
        if device_str == "mps":
            torch.mps.synchronize()

    with torch.no_grad():
        for _ in range(warmup):
            _ = model(dummy)
        sync()

        lat_ms: List[float] = []
        for _ in range(iters):
            t0 = time.perf_counter()
            _ = model(dummy)
            sync()
            lat_ms.append((time.perf_counter() - t0) * 1000.0)

    arr = np.array(lat_ms, dtype=np.float64)
    mean_ms = float(arr.mean())
    return {
        "device": device_str,
        "input_shape": [1, 3, INPUT_SIZE, INPUT_SIZE],
        "warmup_iters": warmup,
        "measured_iters": iters,
        "mean_ms_per_frame": round(mean_ms, 3),
        "p50_ms_per_frame": round(float(np.percentile(arr, 50)), 3),
        "p95_ms_per_frame": round(float(np.percentile(arr, 95)), 3),
        "theoretical_fps": round(1000.0 / mean_ms, 1) if mean_ms > 0 else 0.0,
        "note": "Smoke-test MFRDefectNet forward-pass only (excludes network/MJPEG decode; NOT production YOLOv8)",
    }


def _cxcywh_to_xyxy_px(box: List[float], size: int = 256) -> Tuple[int, int, int, int]:
    cx, cy, w, h = box
    x1 = int(round((cx - w * 0.5) * size))
    y1 = int(round((cy - h * 0.5) * size))
    x2 = int(round((cx + w * 0.5) * size))
    y2 = int(round((cy + h * 0.5) * size))
    return (
        max(0, min(size - 1, x1)),
        max(0, min(size - 1, y1)),
        max(0, min(size - 1, x2)),
        max(0, min(size - 1, y2)),
    )


def render_eval_sheet(samples: List[Dict], summary_metrics: Dict) -> None:
    """Render 5x3 grid (3 test images per class) showing GT (green) vs Pred (cyan) bboxes."""
    cols = 3
    rows = 5
    tile_w = 256
    pad_x = 28
    pad_y = 54
    margin_x = 32
    header_h = 104
    row_hdr_h = 24

    canvas_w = margin_x * 2 + cols * tile_w + (cols - 1) * pad_x
    canvas_h = header_h + rows * (row_hdr_h + tile_w + pad_y) + 24

    canvas = Image.new("RGB", (canvas_w, canvas_h), (10, 26, 51))
    draw = ImageDraw.Draw(canvas)
    font_title = load_font(18)
    font_sub = load_font(13)
    font_lbl = load_font(12)

    draw.rectangle([0, 0, canvas_w, header_h], fill=(5, 7, 12))
    draw.rectangle([0, header_h - 4, canvas_w, header_h], fill=(255, 59, 59))
    draw.text(
        (24, 12),
        "SMOKE-TEST EVALUATION ONLY (PROCEDURAL FIXTURE)  |  MFRDefectNet",
        fill=(255, 176, 32),
        font=font_title,
    )
    draw.text(
        (24, 40),
        "REAL FACADE ACCURACY: NOT TRAINED / NOT EVALUATED (0 real labeled images)",
        fill=(255, 95, 95),
        font=font_sub,
    )
    draw.text(
        (24, 66),
        f"Fixture Test (N=25): Acc={summary_metrics['smoke_test_accuracy']:.3f}  "
        f"Macro-F1={summary_metrics['smoke_test_macro_f1']:.3f}  "
        f"Mean IoU={summary_metrics['smoke_test_mean_iou_all']:.3f}  |  "
        "Legend: GREEN=GT  CYAN=PRED",
        fill=(244, 247, 251),
        font=font_sub,
    )

    y_cursor = header_h + 12
    for cid in sorted(CLASSES.keys()):
        cls_samples = [s for s in samples if s["gt_class_id"] == cid][:cols]
        draw.text(
            (margin_x, y_cursor),
            f"CLASS {cid}: {CLASSES[cid].upper()}  (Smoke-Fixture Test Samples)",
            fill=(56, 214, 255),
            font=font_sub,
        )
        y_tile = y_cursor + row_hdr_h
        for col_i, rec in enumerate(cls_samples):
            x_tile = margin_x + col_i * (tile_w + pad_x)
            im = Image.open(rec["image_abs_path"]).convert("RGB")
            canvas.paste(im, (x_tile, y_tile))

            gx1, gy1, gx2, gy2 = _cxcywh_to_xyxy_px(rec["gt_bbox_cxcywh"])
            px1, py1, px2, py2 = _cxcywh_to_xyxy_px(rec["pred_bbox_cxcywh"])
            draw.rectangle([x_tile + gx1, y_tile + gy1, x_tile + gx2, y_tile + gy2], outline=(34, 197, 94), width=3)
            draw.rectangle([x_tile + px1, y_tile + py1, x_tile + px2, y_tile + py2], outline=(56, 214, 255), width=2)

            ok = rec["gt_class_id"] == rec["pred_class_id"]
            status_col = (34, 197, 94) if ok else (255, 59, 59)
            draw.text(
                (x_tile, y_tile + tile_w + 6),
                f"GT: C{rec['gt_class_id']} {rec['gt_class_name']}",
                fill=(34, 197, 94),
                font=font_lbl,
            )
            draw.text(
                (x_tile, y_tile + tile_w + 22),
                f"PRED: C{rec['pred_class_id']} ({rec['confidence']:.2f}) | IoU={rec['iou']:.2f}",
                fill=status_col,
                font=font_lbl,
            )
        y_cursor += row_hdr_h + tile_w + pad_y

    canvas.save(QA_EVAL_PNG, format="PNG", optimize=True)


def main() -> None:
    if not WEIGHTS_PT.exists():
        raise FileNotFoundError(f"Trained smoke weights missing: {WEIGHTS_PT}")

    ckpt = torch.load(WEIGHTS_PT, map_location="cpu", weights_only=True)
    state_dict = ckpt["state_dict"]

    model = MFRDefectNet(num_classes=len(CLASSES)).cpu().eval()
    model.load_state_dict(state_dict)

    x_test, y_cls, y_box, img_paths = load_test_split()
    with torch.no_grad():
        logits, pred_boxes = model(x_test)
        probs = torch.softmax(logits, dim=1)
        confs, pred_cls = probs.max(dim=1)
        ious = bbox_iou_cxcywh(pred_boxes, y_box)

    num_cls = len(CLASSES)
    cm = [[0 for _ in range(num_cls)] for _ in range(num_cls)]
    samples: List[Dict] = []

    for i, ip in enumerate(img_paths):
        gt_c = int(y_cls[i].item())
        pr_c = int(pred_cls[i].item())
        cm[gt_c][pr_c] += 1
        samples.append({
            "filename": ip.name,
            "image_abs_path": str(ip),
            "gt_class_id": gt_c,
            "gt_class_name": CLASSES[gt_c],
            "pred_class_id": pr_c,
            "pred_class_name": CLASSES[pr_c],
            "confidence": round(float(confs[i].item()), 4),
            "gt_bbox_cxcywh": [round(float(v), 5) for v in y_box[i].tolist()],
            "pred_bbox_cxcywh": [round(float(v), 5) for v in pred_boxes[i].tolist()],
            "iou": round(float(ious[i].item()), 4),
        })

    per_class: Dict[str, Dict] = {}
    f1s: List[float] = []
    for cid in range(num_cls):
        tp = cm[cid][cid]
        fp = sum(cm[r][cid] for r in range(num_cls) if r != cid)
        fn = sum(cm[cid][c] for c in range(num_cls) if c != cid)
        support = sum(cm[cid])
        prec = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        rec = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = (2 * prec * rec / (prec + rec)) if (prec + rec) > 0 else 0.0
        cls_ious = [s["iou"] for s in samples if s["gt_class_id"] == cid]
        f1s.append(f1)
        per_class[CLASSES[cid]] = {
            "class_id": cid,
            "support": support,
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1": round(f1, 4),
            "mean_iou": round(float(np.mean(cls_ious)), 4),
        }

    total_correct = sum(cm[i][i] for i in range(num_cls))
    overall_acc = total_correct / len(samples)
    macro_f1 = float(np.mean(f1s))
    mean_iou_all = float(ious.mean().item())
    defect_ious = [s["iou"] for s in samples if s["gt_class_id"] != 4]
    mean_iou_defects_0_to_3 = float(np.mean(defect_ious))

    # Real host latency measurements
    timing = {"cpu": benchmark_device(state_dict, "cpu")}
    if torch.backends.mps.is_available():
        timing["mps"] = benchmark_device(state_dict, "mps")

    # Non-destructive sanity inference on 2 unlabeled real curtain-wall tiles (NO GT / NO accuracy)
    unlabeled_checks: List[Dict] = []
    for tname in ["S01_audit_tile_00.png", "S04_audit_tile_00.png"]:
        tp = AUDIT_DIR / tname
        if tp.exists():
            with Image.open(tp) as im:
                arr = np.asarray(im.convert("RGB").resize((INPUT_SIZE, INPUT_SIZE)), dtype=np.float32) / 255.0
            xt = torch.from_numpy(np.ascontiguousarray(np.transpose(arr, (2, 0, 1))[None, ...]))
            with torch.no_grad():
                lg, bx = model(xt)
                pb = torch.softmax(lg, dim=1)
                cf, pc = pb.max(dim=1)
            unlabeled_checks.append({
                "tile_filename": tname,
                "tile_sha256": sha256_file(tp),
                "ground_truth_available": False,
                "advisory_only": True,
                "raw_pred_class_id": int(pc.item()),
                "raw_pred_class_name": CLASSES[int(pc.item())],
                "raw_confidence": round(float(cf.item()), 4),
                "raw_bbox_cxcywh": [round(float(v), 5) for v in bx[0].tolist()],
                "note": "Unlabeled real curtain-wall tile sanity pass; NOT a valid accuracy measurement.",
            })

    summary = {
        "disclaimer": DISCLAIMER,
        "is_real_facade_evaluated": False,
        "real_facade_status": "NOT TRAINED / NOT EVALUATED (0 real labeled defect images)",
        "dataset_tier": "SMOKE_TEST_FIXTURE_ONLY",
        "advisory_only": True,
        "safety_actuation_allowed": False,
        "weights_path": str(WEIGHTS_PT),
        "weights_sha256": sha256_file(WEIGHTS_PT),
        "test_sample_count": len(samples),
        "smoke_test_accuracy": round(overall_acc, 4),
        "smoke_test_macro_f1": round(macro_f1, 4),
        "smoke_test_mean_iou_all": round(mean_iou_all, 4),
        "smoke_test_mean_iou_defects_0_to_3": round(mean_iou_defects_0_to_3, 4),
        "confusion_matrix_rows_gt_cols_pred": cm,
        "per_class_metrics": per_class,
        "host_inference_latency": timing,
        "unlabeled_audit_inference_check": unlabeled_checks,
        "sample_predictions": [
            {k: v for k, v in s.items() if k != "image_abs_path"} for s in samples
        ],
    }

    SUMMARY_JSON.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    render_eval_sheet(samples, summary)

    print(DISCLAIMER)
    print(f"Smoke-Fixture Test (N={len(samples)}): Acc={overall_acc:.4f}, Macro-F1={macro_f1:.4f}, "
          f"MeanIoU(all)={mean_iou_all:.4f}, MeanIoU(0..3)={mean_iou_defects_0_to_3:.4f}")
    for dev, t in timing.items():
        print(f"  Latency [{dev}]: mean={t['mean_ms_per_frame']} ms/frame, "
              f"p95={t['p95_ms_per_frame']} ms, FPS={t['theoretical_fps']}")
    print(f"Saved: {SUMMARY_JSON}")
    print(f"Saved: {QA_EVAL_PNG}")


if __name__ == "__main__":
    main()
