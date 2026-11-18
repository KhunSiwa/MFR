#!/usr/bin/env python3
"""
MFR Module Facade Rover — Production Target YOLOv8 Training Script
------------------------------------------------------------------
Target training launcher for real labeled facade datasets using Ultralytics YOLOv8.

STRICT HONESTY & NO-SILENT-FALLBACK POLICY:
  1. Checks that `ultralytics` and `torchvision` are installed.
  2. Checks that a real labeled dataset is supplied (refuses to pass off
     smoke_fixture/ as a production model or fall back to fake/mock metrics).
  3. Never links CV outputs to fall-prevention or E-stop actuators.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.dont_write_bytecode = True


def check_runtime_prerequisites() -> None:
    missing = []
    for pkg in ("torchvision", "ultralytics"):
        try:
            __import__(pkg)
        except ImportError:
            missing.append(pkg)
    if missing:
        raise RuntimeError(
            "Production YOLOv8 training aborted: missing required packages "
            f"{missing}. Silent mock fallback is strictly prohibited. "
            "Use training_pipeline/train_mfr_cv.py for pure-PyTorch smoke-test verification."
        )


def parse_args() -> argparse.Namespace:
    default_cfg = Path(__file__).resolve().parent / "yolo_training_config.yaml"
    parser = argparse.ArgumentParser(description="MFR Production YOLOv8 Trainer (Target Spec)")
    parser.add_argument("--data", type=Path, required=True, help="Path to real labeled YOLO dataset.yaml")
    parser.add_argument("--config", type=Path, default=default_cfg, help="Hyperparameter YAML config")
    parser.add_argument("--device", type=str, default="0", help="Compute device (e.g. '0', 'mps', 'cpu')")
    parser.add_argument(
        "--allow-smoke-fixture",
        action="store_true",
        help="Explicitly acknowledge if running on smoke_fixture/ (never produces real accuracy)",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    check_runtime_prerequisites()

    if "smoke_fixture" in str(args.data) and not args.allow_smoke_fixture:
        raise RuntimeError(
            "Refusing to launch production training on smoke_fixture/ without --allow-smoke-fixture."
        )
    if not args.data.exists():
        raise FileNotFoundError(f"Dataset YAML not found: {args.data}")
    if not args.config.exists():
        raise FileNotFoundError(f"Training config YAML not found: {args.config}")

    from ultralytics import YOLO  # type: ignore
    import yaml  # type: ignore

    cfg = yaml.safe_load(args.config.read_text(encoding="utf-8"))
    model = YOLO(cfg.get("model", "yolov8n.pt"))
    model.train(
        data=str(args.data),
        imgsz=int(cfg.get("imgsz", 640)),
        epochs=int(cfg.get("epochs", 100)),
        batch=int(cfg.get("batch", 16)),
        optimizer=str(cfg.get("optimizer", "AdamW")),
        lr0=float(cfg.get("lr0", 0.002)),
        lrf=float(cfg.get("lrf", 0.01)),
        weight_decay=float(cfg.get("weight_decay", 0.0005)),
        seed=int(cfg.get("seed", 42)),
        deterministic=bool(cfg.get("deterministic", True)),
        flipud=float(cfg.get("flipud", 0.0)),
        fliplr=float(cfg.get("fliplr", 0.5)),
        device=args.device,
        project=str(Path(__file__).resolve().parent / "runs"),
        name="mfr_yolov8_target",
    )


if __name__ == "__main__":
    main()
