# Dataset_and_Annotation_Specification.md — Module Facade Rover (MFR)

**Document ID:** `MFR-M7-DS-001`  
**Milestone:** M7 — AI & Computer Vision Pipeline  
**Author:** Agent 06 (AI & Computer Vision Specialist)  
**Date:** 2026-11-14  
**Authoritative References:**
- [`MFR_SINGLE_SOURCE_OF_TRUTH.md`](file:///Users/Siwakorn/Downloads/mfr/MFR_SINGLE_SOURCE_OF_TRUTH.md)
- [`.agents/skills/mfr-ai-vision/SKILL.md`](file:///Users/Siwakorn/Downloads/mfr/.agents/skills/mfr-ai-vision/SKILL.md)
- [`Control_System_Architecture.md`](file:///Users/Siwakorn/Downloads/mfr/MFR_MASTER/02_MECHANICAL_SAFETY/Control_System_Architecture.md)
- [`verified_sources_manifest.json`](file:///Users/Siwakorn/Downloads/mfr/MFR_PRODUCTION/08_SHARED_ASSETS/external_broll_verified/verified_sources_manifest.json)

---

## 0. Current Dataset Truth & Separation of Artifact Tiers

> **CRITICAL HONESTY DISCLOSURE:** As of `2026-11-14`, `/Users/Siwakorn/Downloads/mfr/source/photos_PLACEHOLDER/` contains **`0` real labeled facade defect images**. No real-world MFR defect dataset exists yet. Therefore, real-world model accuracy is **`NOT TRAINED / NOT EVALUATED`**.

To maintain strict traceability without fabricating real-world ground truth, this workspace separates datasets into **two non-interchangeable tiers**:

| Tier | Folder | Source & License | Labeling Status | Permitted Use |
|---|---|---|---|---|
| **Tier A — Auditable Real Facade Source Reference** | `dataset_spec/real_curtainwall_unlabeled_audit/` | Deterministic `256x256` tiles cropped from verified read-only assets `S01_curtain_wall_cc0.jpg` (`CC0`) and `S04_curtain_wall_mullions_ccbysa3.jpg` (`CC BY-SA 3.0`, Tim1965) | **`UNLABELED_CURTAINWALL_AUDIT_ONLY`** (0 defect labels; awaiting human expert annotation) | Visual audit, domain-texture inspection, inference API smoke check (no accuracy claims) |
| **Tier B — Procedural Smoke-Test Fixture** | `dataset_spec/smoke_fixture/` | Deterministic procedural RGB `256x256` PNG generator (`seed=42`, `100` train / `25` val / `25` test) | **`SMOKE_TEST_FIXTURE_ONLY`** (synthetic defect shapes with verified YOLO `.txt` + COCO `.json`) | End-to-end pipeline verification (dataset loader, training loop, evaluation script, API contract) |

---

## 1. Five-Class Facade Defect Taxonomy

Every future labeled facade dataset and every smoke-test fixture adheres to the exact 5-class integer mapping defined in `MFR_SINGLE_SOURCE_OF_TRUTH.md` §3.4:

| Class ID | Class Name | Visual & Physical Definition | Inclusion Criteria (Label Positive) | Exclusion / Disambiguation Criteria |
|---|---|---|---|---|
| `0` | **`Crack`** | Linear or branching structural/surface fracture on glass pane, stone/concrete cladding, or frame coating | Sharp high-contrast fissure line(s), hairline craze network, star-impact fracture, or spalling edge crack | Do NOT label straight architectural panel joints, window blinds inside building, power-line reflections, or intact mullion seams |
| `1` | **`Sealant deterioration`** | Degradation of elastomeric weatherproofing/glazing sealant along glass-to-mullion or panel-to-panel joints | Peeling, shrinkage gap, missing bead section, chalking/splitting, or bubbling along perimeter joint | Do NOT label intact uniform dark silicone/EPDM gaskets; separate from adjacent corrosion unless oxidation is also present |
| `2` | **`Rust / corrosion`** | Oxidation or galvanic corrosion on metallic mullions, transoms, fasteners, brackets, or steel subframes | Reddish-brown/orange iron oxide staining, flaking metal scale, pitted aluminum white-oxide crust near fasteners | Do NOT label bronze/copper architectural anodizing or warm sunset reflections without surface pitting/scale |
| `3` | **`Water stain`** | Mineral deposits, efflorescence, streaking, or moisture seepage trails on glass or cladding | Gravity-aligned vertical drip trails, calcified white/gray tide-mark rims below sills/joints, persistent damp discoloration | Do NOT label temporary clean rainwater droplets during active rain or sky cloud reflections lacking surface boundary edges |
| `4` | **`Normal surface`** | Intact, defect-free curtain-wall glass, anodized mullion, or cladding panel within inspection ROI | Clean or dust-free intact surface with normal specular sky/building reflections and intact joints | Only assign `Normal surface` when zero classes `0–3` appear inside the region/frame |

---

## 2. Bounding-Box & Polygon Annotation Rules

### 2.1 Geometry Standards
1. **Tight Bounding Box (Primary Detection Target):**
   - Enclose the full visible extent of the defect with `<= 4 px` padding at native capture resolution (normalized `[cx, cy, w, h]` in `[0.0, 1.0]` for YOLO `.txt`; `[x_min, y_min, width, height]` in pixels for COCO `.json`).
   - Minimum annotatable defect size: **`>= 12 px`** in at least one dimension (or `>= 48 px^2` area) at capture resolution; smaller sub-pixel artifacts are marked `iscrowd/ignore` or excluded to prevent anchor noise.
2. **Polygon / Segmentation (Optional Phase-2 Upgrade in CVAT/Label Studio):**
   - Recommended for irregular `Water stain` plumes and branching `Crack` networks to compute surface-area coverage (`%` of panel) without bounding-box background inflation.
   - Polygons must be simple (non-self-intersecting) with `>= 6` vertices for irregular stains and `<= 64` vertices per instance.
3. **Class `4` (`Normal surface`) Handling:**
   - **Production YOLO Object Detection Convention:** Images containing *only* normal surface carry an **empty `.txt` label file** (`0` lines) as negative background examples, while image-level classification metadata records `frame_status: "normal_surface"`.
   - **Smoke-Test Hybrid Multi-Task Convention (`smoke_fixture/`):** Because `MFRDefectNet` predicts both global 5-class logits and a primary inspection ROI `[cx, cy, w, h]`, `smoke_fixture/` emits an explicit class-`4` ROI box (`[0.5, 0.5, 0.85, 0.85]`) so all 5 class IDs (`0–4`) are exercised identically by YOLO `.txt`, COCO `.json`, and confusion-matrix tooling.

### 2.2 Edge, Seam, Reflection & Occlusion Rules
- **Pane-Edge & Mullion Seam Split:** If a `Crack` crosses a mullion onto an adjacent glass pane, annotate **two separate boxes** (one per panel/element) if visually interrupted by the mullion frame, or one box if the structural crack spans continuously across mortar/stone cladding.
- **Co-Located Defects (`Sealant deterioration` + `Water stain`):** Annotate **both** classes as overlapping bounding boxes rather than merging into a single label. Every overlapping label must retain its own exact defect boundary.
- **Specular Glass Reflections:** Curtain-wall glass reflects clouds, neighboring towers, and tree branches. Annotators must cross-check continuous reflection geometry across adjacent panes before labeling `Crack` or `Water stain`. Unresolvable glare regions > 50% of tile must be flagged `ambiguous_glare` and excluded from precision/recall denominators.
- **Motion Blur / Partial Occlusion:** Annotate visible defect extent only when `>= 50%` of the defect remains sharp enough to verify class identity; otherwise discard frame during curation.

---

## 3. Leakage-Free Panel-ID Split Rule

Facade inspection imagery is highly correlated spatially (burst frames from `ESP32-CAM` or overlapping tiles from one glass bay). Splitting randomly by frame leaks near-identical textures across `train`, `val`, and `test`, inflating validation metrics artificially.

**Mandatory Split Policy:**
1. Every source image/frame MUST carry an immutable **`panel_id`** (e.g., `BLDG01_FACADE_N_ROW03_COL04`) and **`building_id`**.
2. All tiles/frames sharing the same `panel_id` MUST be assigned to **exactly one** split (`train`, `val`, or `test`).
3. Target split ratio for real datasets: **`70% train / 15% val / 15% test`** grouped by `building_id` first (preferred) and `panel_id` second.
4. Automated verification in `build_auditable_dataset.py` asserts:
   `panels(train) ∩ panels(val) = ∅`, `panels(train) ∩ panels(test) = ∅`, `panels(val) ∩ panels(test) = ∅`.

---

## 4. Inter-Annotator Quality Assurance (QA) Protocol

*Status: Proposed engineering QA protocol (`NOT YET EXECUTED` — `0` real annotators/images currently active).*

1. **Dual-Pass Blind Labeling:** At least `20%` of each real batch (and `100%` of `test` split) is independently annotated by two trained reviewers.
2. **Agreement Gate:**
   - Classification agreement: Cohen's kappa **`>= 0.80`**.
   - Localization agreement: Pairwise bounding-box **`IoU >= 0.70`** for matched class instances.
3. **Adjudication:** Disagreements (`IoU < 0.70` or class mismatch) are resolved by a lead structural/facade reviewer before freezing a dataset release tag and recomputing `dataset_manifest.json` SHA-256 hashes.

---

## 5. Target Annotation Tool Schema (`CVAT` / `Label Studio`)

> **Host Tool Status:** Neither `CVAT` nor `Label Studio` is installed on this macOS host (`mfr-ai-vision/SKILL.md` §2). The schemas below define the target export format for external/team annotation workstations.

### 5.1 Label Studio XML Config (Target)
```xml
<View>
  <Header value="MFR Facade Defect Inspection (Advisory AI Dataset)"/>
  <Image name="image" value="$image_url" zoom="true" zoomControl="true"/>
  <RectangleLabels name="defect_bbox" toName="image" strokeWidth="2">
    <Label value="Crack" background="#FF3B3B"/>
    <Label value="Sealant deterioration" background="#FFB020"/>
    <Label value="Rust / corrosion" background="#D97706"/>
    <Label value="Water stain" background="#38D6FF"/>
    <Label value="Normal surface" background="#22C55E"/>
  </RectangleLabels>
  <Choices name="image_quality" toName="image" choice="single" showInLine="true">
    <Choice value="usable"/>
    <Choice value="ambiguous_glare"/>
    <Choice value="motion_blur_reject"/>
  </Choices>
</View>
```

### 5.2 Export Format Contract
- **YOLO Detection Format:** One `.txt` per image: `<class_id> <cx> <cy> <w> <h>` (space-delimited floats in `[0, 1]`).
- **COCO JSON Format:** Standard `images`, `annotations` (`bbox: [x, y, w, h]` in pixels, `category_id: 0..4`), `categories` (`0..4`), plus custom `mfr_metadata` (`panel_id`, `source_sha256`, `dataset_tier`).

---

## 6. Ingestion Instructions for `source/photos_PLACEHOLDER/`

When real facade inspection photos or `ESP32-CAM` captures become available:
1. **Place Raw Captures:** Copy raw `.jpg`/`.png` files into `/Users/Siwakorn/Downloads/mfr/source/photos_PLACEHOLDER/` organized by capture session folder (e.g., `session_YYYYMMDD_siteA/`). **Do not mix synthetic images into `source/photos_PLACEHOLDER/`.**
2. **Supply Metadata CSV:** Create `session_metadata.csv` alongside raw images containing `filename,building_id,panel_id,camera_model,lighting_condition,capture_date`.
3. **Privacy & EXIF Sanitization:** Strip GPS/operator PII EXIF tags prior to dataset freezing while preserving focal length / resolution metadata.
4. **Annotate & Export:** Label via CVAT or Label Studio using §1–§5 rules; export YOLO `.txt` + COCO `.json`.
5. **Manifest & Split Audit:** Enforce panel-grouped `70/15/15` split, compute SHA-256 hashes for all images and labels, verify zero panel-ID overlap, and store the versioned dataset outside `smoke_fixture/` (e.g., `real_facade_v1/`).
6. **Re-Train & Re-Evaluate:** Only after real labeled data passes §4 QA may `train_yolo_target.py` and `Model_Card.md` be updated with real evaluation metrics.
