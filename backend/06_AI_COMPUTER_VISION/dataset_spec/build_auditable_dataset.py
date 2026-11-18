#!/usr/bin/env python3
"""
MFR Module Facade Rover — Auditable Dataset & Smoke-Test Fixture Builder
------------------------------------------------------------------------
Generates two strictly separated artifact tiers under dataset_spec/:
  1) real_curtainwall_unlabeled_audit/ : 16 deterministic 256x256 RGB tiles
     cropped from verified read-only CC0 / CC BY-SA 3.0 curtain-wall photos.
     Explicitly cataloged as UNLABELED_CURTAINWALL_AUDIT_ONLY (0 defect labels).
  2) smoke_fixture/ : Deterministic (seed=42) 100 train / 25 val / 25 test
     256x256 RGB PNG synthetic defect-shape fixture across all 5 MFR classes
     with YOLO .txt labels, COCO .json annotations, leakage-free panel_id split,
     SHA-256 dataset_manifest.json, and QA_Annotation_Sheet.png.

NO matplotlib. NO network calls. NO modification to read-only upstream files.
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path
from typing import Dict, List, Tuple

sys.dont_write_bytecode = True

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

SEED = 42
IMG_SIZE = 256

BASE_DIR = Path(__file__).resolve().parent
REPO_ROOT = BASE_DIR.parents[2]
BROLL_DIR = REPO_ROOT / "MFR_PRODUCTION" / "08_SHARED_ASSETS" / "external_broll_verified"
PHOTOS_PLACEHOLDER_DIR = REPO_ROOT / "source" / "photos_PLACEHOLDER"

REAL_AUDIT_DIR = BASE_DIR / "real_curtainwall_unlabeled_audit"
SMOKE_DIR = BASE_DIR / "smoke_fixture"
MANIFEST_PATH = BASE_DIR / "dataset_manifest.json"
QA_SHEET_PATH = BASE_DIR / "QA_Annotation_Sheet.png"

CLASSES: Dict[int, str] = {
    0: "Crack",
    1: "Sealant deterioration",
    2: "Rust / corrosion",
    3: "Water stain",
    4: "Normal surface",
}

CLASS_COLORS_RGB: Dict[int, Tuple[int, int, int]] = {
    0: (255, 59, 59),    # Signal Red
    1: (255, 176, 32),   # Amber Caution
    2: (234, 88, 12),    # Rust Orange
    3: (56, 214, 255),   # Cyan Accent
    4: (34, 197, 94),    # Normal Green
}

SPLIT_COUNTS_PER_CLASS = {
    "train": 20,  # 20 * 5 = 100
    "val": 5,     # 5 * 5 = 25
    "test": 5,    # 5 * 5 = 25
}


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def load_font(size: int = 14) -> ImageFont.ImageFont:
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


def build_real_curtainwall_audit_tiles() -> List[Dict]:
    """Sample deterministic 256x256 unlabeled audit tiles from verified CC0/CC-BY assets."""
    REAL_AUDIT_DIR.mkdir(parents=True, exist_ok=True)
    sources = [
        {
            "id": "S01",
            "path": BROLL_DIR / "S01_curtain_wall_cc0.jpg",
            "license": "CC0",
            "attribution": "LapGaNaiom Bimdio (Wikimedia Commons, CC0)",
            "crops": [
                (80, 1240), (350, 1240), (1340, 1240), (1610, 1240),
                (80, 1430), (350, 1430), (1340, 1430), (1610, 1430),
            ],
        },
        {
            "id": "S04",
            "path": BROLL_DIR / "S04_curtain_wall_mullions_ccbysa3.jpg",
            "license": "CC BY-SA 3.0",
            "attribution": "Tim1965 (Wikimedia Commons, CC BY-SA 3.0)",
            "crops": [
                (160, 120), (680, 140), (1180, 180), (1500, 220),
                (220, 620), (740, 640), (1120, 700), (1460, 740),
            ],
        },
    ]

    records: List[Dict] = []
    for src in sources:
        src_path = src["path"]
        if not src_path.exists():
            raise FileNotFoundError(f"Missing verified source asset: {src_path}")
        src_sha = sha256_file(src_path)
        with Image.open(src_path) as im:
            im_rgb = im.convert("RGB")
            w, h = im_rgb.size
            for idx, (x0, y0) in enumerate(src["crops"]):
                x0 = max(0, min(x0, w - IMG_SIZE))
                y0 = max(0, min(y0, h - IMG_SIZE))
                tile = im_rgb.crop((x0, y0, x0 + IMG_SIZE, y0 + IMG_SIZE))
                tile_name = f"{src['id']}_audit_tile_{idx:02d}.png"
                tile_path = REAL_AUDIT_DIR / tile_name
                tile.save(tile_path, format="PNG", optimize=True)
                records.append({
                    "tile_filename": tile_name,
                    "rel_path": str(tile_path.relative_to(BASE_DIR)),
                    "source_asset": src_path.name,
                    "source_sha256": src_sha,
                    "tile_sha256": sha256_file(tile_path),
                    "crop_xywh": [x0, y0, IMG_SIZE, IMG_SIZE],
                    "license": src["license"],
                    "attribution": src["attribution"],
                    "label_status": "UNLABELED_CURTAINWALL_AUDIT_ONLY",
                    "defect_annotations": [],
                })
    return records


def _make_curtainwall_backdrop(rng: np.random.Generator) -> Tuple[np.ndarray, int, int]:
    """Generate a synthetic curtain-wall glass & mullion tile (BGR uint8) + seam coords."""
    base_b = int(rng.integers(145, 205))
    base_g = int(rng.integers(120, 165))
    base_r = int(rng.integers(95, 138))

    yy, xx = np.mgrid[0:IMG_SIZE, 0:IMG_SIZE].astype(np.float32)
    grad = ((xx + 0.6 * yy) / (1.6 * IMG_SIZE)) * float(rng.uniform(-24.0, 24.0))

    img = np.zeros((IMG_SIZE, IMG_SIZE, 3), dtype=np.float32)
    img[:, :, 0] = np.clip(base_b + grad, 40, 240)
    img[:, :, 1] = np.clip(base_g + grad * 0.9, 40, 235)
    img[:, :, 2] = np.clip(base_r + grad * 0.8, 35, 230)

    # Subtle diagonal sky/window reflection band
    band_center = float(rng.uniform(40, 216))
    band = np.exp(-((xx * 0.7 - yy * 0.7 - (band_center - 128.0)) ** 2) / (2.0 * 26.0 ** 2))
    img += band[:, :, None] * float(rng.uniform(10.0, 24.0))

    # Subtle sensor noise (lightly smoothed for realistic optics & compact lossless PNG)
    noise = rng.normal(0.0, 3.0, size=img.shape).astype(np.float32)
    noise = cv2.GaussianBlur(noise, (3, 3), 0.75)
    img = np.clip(img + noise, 0, 255).astype(np.uint8)

    # Aluminum mullion & dark intact gasket seam
    mullion_x = int(rng.integers(48, IMG_SIZE - 48))
    mullion_y = int(rng.integers(48, IMG_SIZE - 48))
    mullion_tone = int(rng.integers(70, 105))
    cv2.rectangle(img, (mullion_x - 6, 0), (mullion_x + 6, IMG_SIZE - 1),
                  (mullion_tone + 10, mullion_tone + 4, mullion_tone), -1)
    cv2.rectangle(img, (0, mullion_y - 5), (IMG_SIZE - 1, mullion_y + 5),
                  (mullion_tone + 8, mullion_tone + 2, mullion_tone), -1)
    cv2.line(img, (mullion_x, 0), (mullion_x, IMG_SIZE - 1), (32, 34, 38), 2)
    cv2.line(img, (0, mullion_y), (IMG_SIZE - 1, mullion_y), (32, 34, 38), 2)
    return img, mullion_x, mullion_y


def _draw_crack(img: np.ndarray, rng: np.random.Generator) -> Tuple[int, int, int, int]:
    """Class 0: Jagged branching dark fissure with subtle edge highlight."""
    cx = int(rng.integers(62, IMG_SIZE - 62))
    cy = int(rng.integers(62, IMG_SIZE - 62))
    pts = [(cx + int(rng.integers(-35, -15)), cy + int(rng.integers(-35, 35)))]
    cur_x, cur_y = pts[0]
    steps = int(rng.integers(6, 10))
    xs, ys = [cur_x], [cur_y]
    for _ in range(steps):
        cur_x = int(np.clip(cur_x + rng.integers(8, 18), 16, IMG_SIZE - 16))
        cur_y = int(np.clip(cur_y + rng.integers(-16, 17), 16, IMG_SIZE - 16))
        pts.append((cur_x, cur_y))
        xs.append(cur_x)
        ys.append(cur_y)

    # Branch off mid-point
    mid = pts[len(pts) // 2]
    b_pts = [mid]
    bx, by = mid
    for _ in range(3):
        bx = int(np.clip(bx + rng.integers(-14, 15), 16, IMG_SIZE - 16))
        by = int(np.clip(by + rng.integers(8, 18) * rng.choice([-1, 1]), 16, IMG_SIZE - 16))
        b_pts.append((bx, by))
        xs.append(bx)
        ys.append(by)

    for p_seq, thick in [(pts, 3), (b_pts, 2)]:
        for i in range(len(p_seq) - 1):
            p1, p2 = p_seq[i], p_seq[i + 1]
            cv2.line(img, (p1[0] + 1, p1[1] + 1), (p2[0] + 1, p2[1] + 1), (225, 232, 240), 1, cv2.LINE_AA)
            cv2.line(img, p1, p2, (20, 22, 26), thick, cv2.LINE_AA)

    pad = 6
    return (
        max(4, min(xs) - pad),
        max(4, min(ys) - pad),
        min(IMG_SIZE - 4, max(xs) + pad),
        min(IMG_SIZE - 4, max(ys) + pad),
    )


def _draw_sealant_deterioration(
    img: np.ndarray, rng: np.random.Generator, mullion_x: int, mullion_y: int
) -> Tuple[int, int, int, int]:
    """Class 1: Peeling, gapped, cracked elastomer sealant along a joint."""
    horizontal = bool(rng.integers(0, 2))
    if horizontal:
        y_c = int(np.clip(mullion_y, 44, IMG_SIZE - 44))
        x1 = int(rng.integers(24, 110))
        x2 = int(min(IMG_SIZE - 20, x1 + rng.integers(68, 118)))
        # Dark sealant base + bright exposed substrate gaps + peeling amber/gray chunks
        cv2.rectangle(img, (x1, y_c - 8), (x2, y_c + 8), (28, 30, 34), -1)
        for gx in range(x1 + 6, x2 - 8, int(rng.integers(14, 22))):
            gw = int(rng.integers(7, 14))
            cv2.rectangle(img, (gx, y_c - 6), (gx + gw, y_c + 6), (175, 178, 180), -1)
            cv2.line(img, (gx, y_c - 7), (gx + gw, y_c + 7), (45, 58, 82), 2)
        # Flapping curled sealant strip
        cv2.polylines(
            img,
            [np.array([[x1 + 8, y_c - 6], [(x1 + x2) // 2, y_c - 15], [x2 - 10, y_c - 5]], dtype=np.int32)],
            False,
            (22, 24, 28),
            3,
        )
        return max(4, x1 - 4), max(4, y_c - 18), min(IMG_SIZE - 4, x2 + 4), min(IMG_SIZE - 4, y_c + 14)
    else:
        x_c = int(np.clip(mullion_x, 44, IMG_SIZE - 44))
        y1 = int(rng.integers(24, 110))
        y2 = int(min(IMG_SIZE - 20, y1 + rng.integers(68, 118)))
        cv2.rectangle(img, (x_c - 8, y1), (x_c + 8, y2), (28, 30, 34), -1)
        for gy in range(y1 + 6, y2 - 8, int(rng.integers(14, 22))):
            gh = int(rng.integers(7, 14))
            cv2.rectangle(img, (x_c - 6, gy), (x_c + 6, gy + gh), (175, 178, 180), -1)
            cv2.line(img, (x_c - 7, gy), (x_c + 7, gy + gh), (45, 58, 82), 2)
        cv2.polylines(
            img,
            [np.array([[x_c - 6, y1 + 8], [x_c - 15, (y1 + y2) // 2], [x_c - 5, y2 - 10]], dtype=np.int32)],
            False,
            (22, 24, 28),
            3,
        )
        return max(4, x_c - 18), max(4, y1 - 4), min(IMG_SIZE - 4, x_c + 14), min(IMG_SIZE - 4, y2 + 4)


def _draw_rust_corrosion(
    img: np.ndarray, rng: np.random.Generator, mullion_x: int, mullion_y: int
) -> Tuple[int, int, int, int]:
    """Class 2: Mottled orange-brown oxidation & pitting near metallic frame."""
    cx = int(np.clip(mullion_x + rng.integers(-18, 19), 52, IMG_SIZE - 52))
    cy = int(np.clip(mullion_y + rng.integers(-45, 46), 52, IMG_SIZE - 52))
    rw = int(rng.integers(26, 48))
    rh = int(rng.integers(26, 48))

    # Draw metallic bracket plate behind corrosion
    cv2.rectangle(img, (cx - rw // 2, cy - rh // 2), (cx + rw // 2, cy + rh // 2), (145, 148, 152), -1)

    pts_x: List[int] = []
    pts_y: List[int] = []
    for _ in range(38):
        ox = int(np.clip(cx + rng.integers(-rw, rw + 1) * 0.75, 10, IMG_SIZE - 10))
        oy = int(np.clip(cy + rng.integers(-rh, rh + 1) * 0.75, 10, IMG_SIZE - 10))
        rad = int(rng.integers(4, 12))
        # BGR rust palette: deep umber to burnt orange
        color = (
            int(rng.integers(12, 38)),
            int(rng.integers(52, 105)),
            int(rng.integers(145, 215)),
        )
        cv2.circle(img, (ox, oy), rad, color, -1)
        pts_x.extend([ox - rad, ox + rad])
        pts_y.extend([oy - rad, oy + rad])

    # Dark pitting specks
    for _ in range(18):
        px = int(np.clip(cx + rng.integers(-rw // 2, rw // 2 + 1), 10, IMG_SIZE - 10))
        py = int(np.clip(cy + rng.integers(-rh // 2, rh // 2 + 1), 10, IMG_SIZE - 10))
        cv2.circle(img, (px, py), int(rng.integers(1, 3)), (16, 26, 58), -1)

    return (
        max(4, min(pts_x) - 3),
        max(4, min(pts_y) - 3),
        min(IMG_SIZE - 4, max(pts_x) + 3),
        min(IMG_SIZE - 4, max(pts_y) + 3),
    )


def _draw_water_stain(img: np.ndarray, rng: np.random.Generator) -> Tuple[int, int, int, int]:
    """Class 3: Translucent vertical drip plume with calcified mineral tide-mark rim."""
    cx = int(rng.integers(54, IMG_SIZE - 54))
    y_top = int(rng.integers(26, 95))
    h_stain = int(rng.integers(68, 118))
    w_stain = int(rng.integers(42, 78))
    y_bot = min(IMG_SIZE - 18, y_top + h_stain)
    x_l = max(14, cx - w_stain // 2)
    x_r = min(IMG_SIZE - 14, cx + w_stain // 2)

    overlay = img.copy()
    mask = np.zeros((IMG_SIZE, IMG_SIZE), dtype=np.float32)

    # Multi-lobe vertical drip streaks
    n_streaks = int(rng.integers(3, 6))
    for i in range(n_streaks):
        sx = int(np.clip(x_l + (i + 0.5) * (x_r - x_l) / n_streaks + rng.integers(-4, 5), x_l, x_r))
        sw = int(rng.integers(6, 13))
        sy_end = int(np.clip(y_bot - rng.integers(0, 22), y_top + 28, y_bot))
        cv2.rectangle(mask, (sx - sw // 2, y_top), (sx + sw // 2, sy_end), 1.0, -1)
        cv2.circle(mask, (sx, sy_end), sw // 2 + 2, 1.0, -1)

    mask = cv2.GaussianBlur(mask, (9, 9), 2.5)
    # Pale cloudy mineral deposit tint
    mineral = np.array([228, 232, 236], dtype=np.float32)
    alpha = (mask * 0.58)[:, :, None]
    blended = overlay.astype(np.float32) * (1.0 - alpha) + mineral * alpha
    img[:] = np.clip(blended, 0, 255).astype(np.uint8)

    # Calcified rim edge at bottom tide-mark
    edges = cv2.Canny((mask * 255).astype(np.uint8), 55, 140)
    img[edges > 0] = (238, 240, 244)

    return max(4, x_l - 4), max(4, y_top - 4), min(IMG_SIZE - 4, x_r + 4), min(IMG_SIZE - 4, y_bot + 4)


def _xyxy_to_yolo(x1: int, y1: int, x2: int, y2: int) -> Tuple[float, float, float, float]:
    cx = ((x1 + x2) / 2.0) / IMG_SIZE
    cy = ((y1 + y2) / 2.0) / IMG_SIZE
    w = (x2 - x1) / IMG_SIZE
    h = (y2 - y1) / IMG_SIZE
    return (round(cx, 6), round(cy, 6), round(w, 6), round(h, 6))


def build_smoke_fixture() -> Dict:
    """Create 100 train / 25 val / 25 test synthetic RGB PNGs + YOLO + COCO + panel-ID checks."""
    rng = np.random.default_rng(SEED)
    for split in SPLIT_COUNTS_PER_CLASS:
        (SMOKE_DIR / "images" / split).mkdir(parents=True, exist_ok=True)
        (SMOKE_DIR / "labels" / split).mkdir(parents=True, exist_ok=True)

    coco = {
        "info": {
            "description": "MFR Smoke-Test Procedural Facade Fixture (SMOKE_TEST_FIXTURE_ONLY)",
            "version": "1.0.0",
            "year": 2026,
            "contributor": "MFR Agent 06",
            "real_facade_images": 0,
        },
        "licenses": [{"id": 1, "name": "Project-Internal Synthetic Test Fixture", "url": ""}],
        "categories": [{"id": cid, "name": cname, "supercategory": "facade_inspection"} for cid, cname in CLASSES.items()],
        "images": [],
        "annotations": [],
    }

    split_records: Dict[str, List[Dict]] = {"train": [], "val": [], "test": []}
    panels_by_split: Dict[str, set] = {"train": set(), "val": set(), "test": set()}
    img_id = 1
    ann_id = 1

    # Strict panel_id grouping: every split receives completely disjoint panel IDs
    split_prefix = {"train": "TRN", "val": "VAL", "test": "TST"}
    panel_counter = 0

    for split, count_per_cls in SPLIT_COUNTS_PER_CLASS.items():
        for cls_id in sorted(CLASSES.keys()):
            for local_i in range(count_per_cls):
                # Group 2 images per panel_id within the same split only
                if local_i % 2 == 0:
                    panel_counter += 1
                    current_panel = f"PANEL_{split_prefix[split]}_{panel_counter:03d}"
                panels_by_split[split].add(current_panel)

                img, mx, my = _make_curtainwall_backdrop(rng)
                if cls_id == 0:
                    x1, y1, x2, y2 = _draw_crack(img, rng)
                elif cls_id == 1:
                    x1, y1, x2, y2 = _draw_sealant_deterioration(img, rng, mx, my)
                elif cls_id == 2:
                    x1, y1, x2, y2 = _draw_rust_corrosion(img, rng, mx, my)
                elif cls_id == 3:
                    x1, y1, x2, y2 = _draw_water_stain(img, rng)
                else:
                    # Normal surface: explicit inspection ROI (no defect)
                    x1, y1, x2, y2 = 19, 19, IMG_SIZE - 19, IMG_SIZE - 19

                stem = f"smoke_{split}_c{cls_id}_{local_i:02d}"
                img_path = SMOKE_DIR / "images" / split / f"{stem}.png"
                lbl_path = SMOKE_DIR / "labels" / split / f"{stem}.txt"

                rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                Image.fromarray(rgb).save(img_path, format="PNG", optimize=True)

                cx, cy, bw, bh = _xyxy_to_yolo(x1, y1, x2, y2)
                lbl_path.write_text(f"{cls_id} {cx:.6f} {cy:.6f} {bw:.6f} {bh:.6f}\n", encoding="utf-8")

                coco["images"].append({
                    "id": img_id,
                    "file_name": f"images/{split}/{stem}.png",
                    "width": IMG_SIZE,
                    "height": IMG_SIZE,
                    "split": split,
                    "panel_id": current_panel,
                })
                coco["annotations"].append({
                    "id": ann_id,
                    "image_id": img_id,
                    "category_id": cls_id,
                    "bbox": [x1, y1, x2 - x1, y2 - y1],
                    "area": (x2 - x1) * (y2 - y1),
                    "iscrowd": 0,
                })

                split_records[split].append({
                    "image_rel_path": f"smoke_fixture/images/{split}/{stem}.png",
                    "label_rel_path": f"smoke_fixture/labels/{split}/{stem}.txt",
                    "image_sha256": sha256_file(img_path),
                    "label_sha256": sha256_file(lbl_path),
                    "class_id": cls_id,
                    "class_name": CLASSES[cls_id],
                    "panel_id": current_panel,
                    "bbox_xyxy": [x1, y1, x2, y2],
                    "bbox_yolo": [cx, cy, bw, bh],
                })
                img_id += 1
                ann_id += 1

    # Assert leakage-free panel_id split
    assert panels_by_split["train"].isdisjoint(panels_by_split["val"]), "Panel leakage train/val!"
    assert panels_by_split["train"].isdisjoint(panels_by_split["test"]), "Panel leakage train/test!"
    assert panels_by_split["val"].isdisjoint(panels_by_split["test"]), "Panel leakage val/test!"

    coco_path = SMOKE_DIR / "coco_annotations.json"
    coco_path.write_text(json.dumps(coco, indent=2), encoding="utf-8")

    return {
        "coco_annotations_rel_path": "smoke_fixture/coco_annotations.json",
        "coco_sha256": sha256_file(coco_path),
        "split_counts": {k: len(v) for k, v in split_records.items()},
        "panel_counts": {k: len(v) for k, v in panels_by_split.items()},
        "panel_leakage_detected": False,
        "records": split_records,
    }


def render_qa_sheet(smoke_meta: Dict, audit_tiles: List[Dict]) -> None:
    """Render QA_Annotation_Sheet.png via Pillow with zero overlapping boxes/labels."""
    cols = 4
    rows = 6  # 5 defect classes + 1 row of unlabeled real curtain-wall audit tiles
    tile_w = 256
    pad_x = 24
    pad_y = 48  # space for caption below each tile
    margin_x = 32
    header_h = 92
    row_hdr_h = 28

    canvas_w = margin_x * 2 + cols * tile_w + (cols - 1) * pad_x
    canvas_h = header_h + rows * (row_hdr_h + tile_w + pad_y) + 28

    canvas = Image.new("RGB", (canvas_w, canvas_h), (10, 26, 51))
    draw = ImageDraw.Draw(canvas)
    font_title = load_font(19)
    font_sub = load_font(13)
    font_lbl = load_font(12)

    # Prominent Warning Banner
    draw.rectangle([0, 0, canvas_w, header_h], fill=(5, 7, 12))
    draw.rectangle([0, header_h - 4, canvas_w, header_h], fill=(255, 176, 32))
    draw.text(
        (24, 14),
        "MFR CV DATASET QA SHEET  |  [SMOKE-TEST PROCEDURAL FIXTURE + UNLABELED REAL AUDIT TILES]",
        fill=(255, 176, 32),
        font=font_title,
    )
    draw.text(
        (24, 46),
        "REAL FACADE DEFECT LABELS = 0 (source/photos_PLACEHOLDER empty)  |  REAL FACADE ACCURACY = NOT TRAINED / NOT EVALUATED",
        fill=(255, 95, 95),
        font=font_sub,
    )

    # First 5 rows: 4 samples per class (2 train, 1 val, 1 test)
    by_cls: Dict[int, List[Dict]] = {c: [] for c in CLASSES}
    for sp, idx in [("train", 0), ("train", 1), ("val", 0), ("test", 0)]:
        recs = smoke_meta["records"][sp]
        for cid in sorted(CLASSES):
            cls_recs = [r for r in recs if r["class_id"] == cid]
            by_cls[cid].append({**cls_recs[idx], "split": sp})

    y_cursor = header_h + 12
    for cid in sorted(CLASSES):
        cname = CLASSES[cid]
        c_rgb = CLASS_COLORS_RGB[cid]
        draw.text(
            (margin_x, y_cursor),
            f"CLASS {cid}: {cname.upper()}  (Procedural Smoke Fixture — GT Bounding Boxes)",
            fill=c_rgb,
            font=font_sub,
        )
        y_tile = y_cursor + row_hdr_h
        for col_i, rec in enumerate(by_cls[cid]):
            x_tile = margin_x + col_i * (tile_w + pad_x)
            im = Image.open(BASE_DIR / rec["image_rel_path"]).convert("RGB")
            canvas.paste(im, (x_tile, y_tile))
            x1, y1, x2, y2 = rec["bbox_xyxy"]
            draw.rectangle([x_tile + x1, y_tile + y1, x_tile + x2, y_tile + y2], outline=c_rgb, width=3)
            # Tag pill at top-left outside box or clamped safely
            tag = f"C{cid}: {cname}"
            pill_w = int(draw.textlength(tag, font=font_lbl)) + 8
            ty = max(y_tile + 2, y_tile + y1 - 18) if y1 >= 20 else y_tile + y1 + 3
            tx = max(x_tile + 2, min(x_tile + tile_w - pill_w - 2, x_tile + x1))
            draw.rectangle([tx, ty, tx + pill_w, ty + 16], fill=(5, 7, 12))
            draw.text((tx + 4, ty + 2), tag, fill=c_rgb, font=font_lbl)
            # Clean non-overlapping caption below tile
            draw.text(
                (x_tile, y_tile + tile_w + 6),
                f"{rec['split'].upper()} | {rec['panel_id']}",
                fill=(244, 247, 251),
                font=font_lbl,
            )
            draw.text(
                (x_tile, y_tile + tile_w + 22),
                f"bbox=[{x1},{y1},{x2},{y2}] sha={rec['image_sha256'][:10]}",
                fill=(156, 174, 201),
                font=font_lbl,
            )
        y_cursor += row_hdr_h + tile_w + pad_y

    # Row 6: Unlabeled Real Curtain-Wall Audit Tiles (2 from S01 CC0, 2 from S04 CC BY-SA 3.0)
    draw.text(
        (margin_x, y_cursor),
        "TIER A AUDIT: REAL CURTAIN-WALL TILES (UNLABELED_CURTAINWALL_AUDIT_ONLY — 0 DEFECT LABELS)",
        fill=(56, 214, 255),
        font=font_sub,
    )
    y_tile = y_cursor + row_hdr_h
    audit_picks = [audit_tiles[0], audit_tiles[3], audit_tiles[8], audit_tiles[12]]
    for col_i, rec in enumerate(audit_picks):
        x_tile = margin_x + col_i * (tile_w + pad_x)
        im = Image.open(BASE_DIR / rec["rel_path"]).convert("RGB")
        canvas.paste(im, (x_tile, y_tile))
        draw.rectangle([x_tile, y_tile, x_tile + tile_w - 1, y_tile + tile_w - 1], outline=(56, 214, 255), width=2)
        draw.text(
            (x_tile, y_tile + tile_w + 6),
            f"{rec['tile_filename']} ({rec['license']})",
            fill=(56, 214, 255),
            font=font_lbl,
        )
        draw.text(
            (x_tile, y_tile + tile_w + 22),
            f"UNLABELED AUDIT | sha={rec['tile_sha256'][:10]}",
            fill=(156, 174, 201),
            font=font_lbl,
        )

    canvas.save(QA_SHEET_PATH, format="PNG", optimize=True)


def main() -> None:
    real_placeholder_files = [
        p.name for p in PHOTOS_PLACEHOLDER_DIR.iterdir()
        if p.is_file() and not p.name.startswith(".")
    ] if PHOTOS_PLACEHOLDER_DIR.exists() else []

    audit_tiles = build_real_curtainwall_audit_tiles()
    smoke_meta = build_smoke_fixture()
    render_qa_sheet(smoke_meta, audit_tiles)

    manifest = {
        "schema_version": "1.0.0",
        "generated_by": "dataset_spec/build_auditable_dataset.py",
        "seed": SEED,
        "real_labeled_defect_images_count": 0,
        "source_photos_placeholder_files": real_placeholder_files,
        "disclaimer": "[PIPELINE SMOKE-TEST ONLY — PROCEDURAL FIXTURE; REAL FACADE ACCURACY = NOT TRAINED / NOT EVALUATED]",
        "taxonomy": {str(k): v for k, v in CLASSES.items()},
        "tier_a_real_curtainwall_unlabeled_audit": {
            "status": "UNLABELED_CURTAINWALL_AUDIT_ONLY",
            "tile_count": len(audit_tiles),
            "tiles": audit_tiles,
        },
        "tier_b_smoke_fixture": {
            "status": "SMOKE_TEST_FIXTURE_ONLY",
            "image_size": [IMG_SIZE, IMG_SIZE],
            "split_counts": smoke_meta["split_counts"],
            "panel_counts": smoke_meta["panel_counts"],
            "panel_leakage_detected": smoke_meta["panel_leakage_detected"],
            "coco_annotations_rel_path": smoke_meta["coco_annotations_rel_path"],
            "coco_sha256": smoke_meta["coco_sha256"],
            "splits": smoke_meta["records"],
        },
        "qa_sheet_sha256": sha256_file(QA_SHEET_PATH),
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    print("Built auditable dataset tiers:")
    print(f"  Tier A (UNLABELED_CURTAINWALL_AUDIT_ONLY): {len(audit_tiles)} tiles -> {REAL_AUDIT_DIR}")
    print(f"  Tier B (SMOKE_TEST_FIXTURE_ONLY): {smoke_meta['split_counts']} -> {SMOKE_DIR}")
    print(f"  Manifest: {MANIFEST_PATH}")
    print(f"  QA Sheet: {QA_SHEET_PATH}")


if __name__ == "__main__":
    main()
