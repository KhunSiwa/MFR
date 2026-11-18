#!/usr/bin/env python3
"""
MFR Module Facade Rover — Lightweight Multi-Task CV Architecture
-----------------------------------------------------------------
Pure-PyTorch (torch 2.13.0, zero torchvision dependency) dual-head network
for 5-class facade defect classification + primary normalized bbox [cx, cy, w, h].
Trained ONLY on the procedural smoke_fixture/ for pipeline verification.
Strictly advisory (never linked to safety/E-stop/tether actuators).
"""

from __future__ import annotations

import sys
from typing import Dict, Tuple

sys.dont_write_bytecode = True

import torch
import torch.nn as nn
import torch.nn.functional as F

INPUT_SIZE = 256

CLASSES: Dict[int, str] = {
    0: "Crack",
    1: "Sealant deterioration",
    2: "Rust / corrosion",
    3: "Water stain",
    4: "Normal surface",
}


class MFRDefectNet(nn.Module):
    """Lightweight pure-PyTorch 5-class classifier + primary bbox regressor."""

    def __init__(self, num_classes: int = 5) -> None:
        super().__init__()
        self.num_classes = num_classes
        self.backbone = nn.Sequential(
            # 256 -> 128
            nn.Conv2d(3, 16, kernel_size=3, stride=2, padding=1, bias=False),
            nn.BatchNorm2d(16),
            nn.ReLU(),
            # 128 -> 64
            nn.Conv2d(16, 32, kernel_size=3, stride=1, padding=1, bias=False),
            nn.BatchNorm2d(32),
            nn.ReLU(),
            nn.MaxPool2d(kernel_size=2, stride=2),
            # 64 -> 32
            nn.Conv2d(32, 64, kernel_size=3, stride=1, padding=1, bias=False),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            nn.MaxPool2d(kernel_size=2, stride=2),
            # 32 -> 16
            nn.Conv2d(64, 96, kernel_size=3, stride=1, padding=1, bias=False),
            nn.BatchNorm2d(96),
            nn.ReLU(),
            nn.MaxPool2d(kernel_size=2, stride=2),
            # 16 -> 8
            nn.Conv2d(96, 128, kernel_size=3, stride=1, padding=1, bias=False),
            nn.BatchNorm2d(128),
            nn.ReLU(),
            nn.MaxPool2d(kernel_size=2, stride=2),
        )
        self.cls_head = nn.Sequential(
            nn.Dropout(p=0.15),
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Linear(64, num_classes),
        )
        # 8x8 feature map pooled 2x2 -> 4x4 grid preserves (cx, cy) coordinate awareness
        self.bbox_head = nn.Sequential(
            nn.Linear(128 * 16, 96),
            nn.ReLU(),
            nn.Linear(96, 4),
            nn.Sigmoid(),
        )

    def forward(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        feat = self.backbone(x.contiguous())
        bsz = feat.shape[0]
        cls_vec = feat.mean(dim=(2, 3))
        box_grid = F.avg_pool2d(feat, kernel_size=2, stride=2)
        box_vec = box_grid.contiguous().reshape(bsz, -1)
        logits = self.cls_head(cls_vec)
        bbox = self.bbox_head(box_vec)
        return logits, bbox


def bbox_iou_cxcywh(pred: torch.Tensor, target: torch.Tensor, eps: float = 1e-6) -> torch.Tensor:
    """Compute element-wise IoU for normalized [cx, cy, w, h] tensors of shape (N, 4)."""
    px1 = pred[:, 0] - pred[:, 2] * 0.5
    py1 = pred[:, 1] - pred[:, 3] * 0.5
    px2 = pred[:, 0] + pred[:, 2] * 0.5
    py2 = pred[:, 1] + pred[:, 3] * 0.5

    tx1 = target[:, 0] - target[:, 2] * 0.5
    ty1 = target[:, 1] - target[:, 3] * 0.5
    tx2 = target[:, 0] + target[:, 2] * 0.5
    ty2 = target[:, 1] + target[:, 3] * 0.5

    ix1 = torch.maximum(px1, tx1)
    iy1 = torch.maximum(py1, ty1)
    ix2 = torch.minimum(px2, tx2)
    iy2 = torch.minimum(py2, ty2)

    inter = torch.clamp(ix2 - ix1, min=0.0) * torch.clamp(iy2 - iy1, min=0.0)
    area_p = torch.clamp(px2 - px1, min=0.0) * torch.clamp(py2 - py1, min=0.0)
    area_t = torch.clamp(tx2 - tx1, min=0.0) * torch.clamp(ty2 - ty1, min=0.0)
    union = torch.clamp(area_p + area_t - inter, min=eps)
    return inter / union
