#!/usr/bin/env python3
"""
MFR Module Facade Rover — Smoke-Test Training Pipeline (Pure PyTorch)
---------------------------------------------------------------------
Trains MFRDefectNet strictly on dataset_spec/smoke_fixture/ (100 train / 25 val)
with deterministic seed=42 to verify the end-to-end training & export pipeline.

MANDATORY HONESTY NOTICE:
  This script trains on a procedural synthetic smoke-test fixture ONLY.
  Real facade accuracy remains NOT TRAINED / NOT EVALUATED (0 real images).
"""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path
from typing import List, Tuple

sys.dont_write_bytecode = True

import numpy as np
from PIL import Image
import torch
import torch.nn as nn

THIS_DIR = Path(__file__).resolve().parent
CV_ROOT = THIS_DIR.parent
SMOKE_DIR = CV_ROOT / "dataset_spec" / "smoke_fixture"
WEIGHTS_DIR = THIS_DIR / "weights"
HISTORY_PATH = THIS_DIR / "training_history.json"

sys.path.insert(0, str(THIS_DIR))
from model_arch import CLASSES, INPUT_SIZE, MFRDefectNet, bbox_iou_cxcywh  # noqa: E402

SEED = 42
EPOCHS = 36
BATCH_SIZE = 16
LR = 1.8e-3
DISCLAIMER = "[PIPELINE SMOKE-TEST ONLY — PROCEDURAL FIXTURE; REAL FACADE ACCURACY = NOT TRAINED / NOT EVALUATED]"


def set_deterministic(seed: int = SEED) -> None:
    np.random.seed(seed)
    torch.manual_seed(seed)


def load_yolo_split(split: str) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor, List[str]]:
    img_dir = SMOKE_DIR / "images" / split
    lbl_dir = SMOKE_DIR / "labels" / split
    img_paths = sorted(img_dir.glob("*.png"))
    if not img_paths:
        raise FileNotFoundError(f"No PNG images found in {img_dir}. Run build_auditable_dataset.py first.")

    imgs: List[np.ndarray] = []
    labels: List[int] = []
    bboxes: List[List[float]] = []
    names: List[str] = []

    for ip in img_paths:
        lp = lbl_dir / f"{ip.stem}.txt"
        line = lp.read_text(encoding="utf-8").strip().splitlines()[0]
        parts = line.split()
        cls_id = int(parts[0])
        bbox = [float(x) for x in parts[1:5]]

        with Image.open(ip) as im:
            arr = np.asarray(im.convert("RGB").resize((INPUT_SIZE, INPUT_SIZE)), dtype=np.float32) / 255.0
        imgs.append(np.transpose(arr, (2, 0, 1)))
        labels.append(cls_id)
        bboxes.append(bbox)
        names.append(ip.name)

    x_tensor = torch.from_numpy(np.ascontiguousarray(np.stack(imgs, axis=0)))
    y_cls = torch.tensor(labels, dtype=torch.long)
    y_box = torch.tensor(bboxes, dtype=torch.float32)
    return x_tensor, y_cls, y_box, names


def main() -> None:
    set_deterministic(SEED)
    WEIGHTS_DIR.mkdir(parents=True, exist_ok=True)

    device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
    x_trn, y_cls_trn, y_box_trn, _ = load_yolo_split("train")
    x_val, y_cls_val, y_box_val, _ = load_yolo_split("val")

    model = MFRDefectNet(num_classes=len(CLASSES)).to(device)
    param_count = sum(p.numel() for p in model.parameters())

    ce_loss_fn = nn.CrossEntropyLoss()
    l1_loss_fn = nn.SmoothL1Loss(beta=0.05)
    optimizer = torch.optim.AdamW(model.parameters(), lr=LR, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=EPOCHS)

    x_val_d = x_val.to(device)
    y_cls_val_d = y_cls_val.to(device)
    y_box_val_d = y_box_val.to(device)

    best_score = -1.0
    best_epoch = 0
    best_state = None
    history = []

    t_start = time.perf_counter()
    n_trn = x_trn.shape[0]

    for epoch in range(1, EPOCHS + 1):
        model.train()
        perm = torch.randperm(n_trn)
        ep_loss = 0.0
        ep_correct = 0

        for i in range(0, n_trn, BATCH_SIZE):
            idx = perm[i : i + BATCH_SIZE]
            xb = x_trn[idx].to(device)
            yb_cls = y_cls_trn[idx].to(device)
            yb_box = y_box_trn[idx].to(device)

            optimizer.zero_grad(set_to_none=True)
            logits, pred_box = model(xb)
            loss_cls = ce_loss_fn(logits, yb_cls)
            loss_box = l1_loss_fn(pred_box, yb_box)
            loss_iou = (1.0 - bbox_iou_cxcywh(pred_box, yb_box)).mean()
            loss = loss_cls + 4.0 * loss_box + 1.0 * loss_iou
            loss.backward()
            optimizer.step()

            bs = xb.shape[0]
            ep_loss += float(loss.item()) * bs
            ep_correct += int((logits.argmax(dim=1) == yb_cls).sum().item())

        scheduler.step()

        model.eval()
        with torch.no_grad():
            v_logits, v_box = model(x_val_d)
            v_loss_cls = ce_loss_fn(v_logits, y_cls_val_d)
            v_loss_box = l1_loss_fn(v_box, y_box_val_d)
            v_iou = bbox_iou_cxcywh(v_box, y_box_val_d)
            v_loss = float((v_loss_cls + 4.0 * v_loss_box + 1.0 * (1.0 - v_iou).mean()).item())
            v_acc = float((v_logits.argmax(dim=1) == y_cls_val_d).float().mean().item())
            v_mean_iou = float(v_iou.mean().item())

        rec = {
            "epoch": epoch,
            "train_loss": round(ep_loss / n_trn, 5),
            "train_cls_acc": round(ep_correct / n_trn, 4),
            "val_loss": round(v_loss, 5),
            "val_cls_acc": round(v_acc, 4),
            "val_mean_iou": round(v_mean_iou, 4),
        }
        history.append(rec)

        composite = v_acc + 0.5 * v_mean_iou
        if composite > best_score:
            best_score = composite
            best_epoch = epoch
            best_state = {k: v.detach().cpu().clone() for k, v in model.state_dict().items()}

    elapsed_s = time.perf_counter() - t_start

    # Save CPU-portable checkpoint & TorchScript export
    pt_path = WEIGHTS_DIR / "mfr_smoke_best.pt"
    ts_path = WEIGHTS_DIR / "mfr_smoke_best.ts"

    torch.save(
        {
            "state_dict": best_state,
            "model_name": "MFRDefectNet",
            "input_size": INPUT_SIZE,
            "num_classes": len(CLASSES),
            "classes": CLASSES,
            "best_epoch": best_epoch,
            "seed": SEED,
            "dataset_tier": "SMOKE_TEST_FIXTURE_ONLY",
            "real_dataset_trained": False,
            "advisory_only": True,
            "safety_actuation_allowed": False,
            "disclaimer": DISCLAIMER,
        },
        pt_path,
    )

    cpu_model = MFRDefectNet(num_classes=len(CLASSES)).cpu().eval()
    cpu_model.load_state_dict(best_state)
    example = torch.zeros(1, 3, INPUT_SIZE, INPUT_SIZE, dtype=torch.float32)
    traced = torch.jit.trace(cpu_model, example)
    traced.save(str(ts_path))

    best_rec = history[best_epoch - 1]
    summary = {
        "disclaimer": DISCLAIMER,
        "dataset_tier": "SMOKE_TEST_FIXTURE_ONLY",
        "real_dataset_trained": False,
        "advisory_only": True,
        "safety_actuation_allowed": False,
        "seed": SEED,
        "device_used": str(device),
        "epochs": EPOCHS,
        "batch_size": BATCH_SIZE,
        "train_samples": int(n_trn),
        "val_samples": int(x_val.shape[0]),
        "param_count": int(param_count),
        "training_wall_time_sec": round(elapsed_s, 3),
        "best_epoch": best_epoch,
        "best_val_cls_acc": best_rec["val_cls_acc"],
        "best_val_mean_iou": best_rec["val_mean_iou"],
        "weights_pt_bytes": pt_path.stat().st_size,
        "weights_ts_bytes": ts_path.stat().st_size,
        "history": history,
    }
    HISTORY_PATH.write_text(json.dumps(summary, indent=2), encoding="utf-8")

    print(DISCLAIMER)
    print(f"Device: {device} | Params: {param_count:,} | Wall time: {elapsed_s:.2f}s")
    print(f"Best epoch {best_epoch}/{EPOCHS}: val_cls_acc={best_rec['val_cls_acc']:.4f}, val_mean_iou={best_rec['val_mean_iou']:.4f}")
    print(f"Saved: {pt_path} ({pt_path.stat().st_size:,} B) & {ts_path} ({ts_path.stat().st_size:,} B)")


if __name__ == "__main__":
    main()
