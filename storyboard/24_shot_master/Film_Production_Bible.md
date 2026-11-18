# MFR Film Production Bible — Module Facade Rover (MFR) Master Cut (`24 Shots · 2:48`)

**Document ID:** `M6-FILM-BIBLE-v1.0`  
**Owner:** Agent 04 (`mfr-master-agent-04` — Film Director, Storyboarder & Preview Editor)  
**Project Name:** **Module Facade Rover (MFR)** *(legacy production drafts occasionally wrote "Multi-Functional Robotics"; all M6 Master Project outputs standardize on **Module Facade Rover (MFR)** per `MFR_SINGLE_SOURCE_OF_TRUTH.md`)*  
**Master Cut Specification:** **24 Shots (`S01–S24`)** · **`168.00 s` (`2:48.00`)** · **`4,032` frames @ `24.000 fps`** · **`1920x1080` (`16:9` Rec.709 H.264 `yuv420p`)** · **`48 kHz` Stereo AAC (`-14.0 LUFS`, `<= -1.0 dBTP`)**  
**Delivery Constraint:** Target `<= 3:00` (`180.0 s`) and `<= 100 MB` MP4. **Current Status:** `Film_Preview.mp4` ONLY (`Final_MFR_Film.mp4` is withheld until real 4-presenter live recordings `P1–P4` are supplied under `source/team_footage_PLACEHOLDER/`).

---

## 1. Timeline Reconciliation (`2:30` Draft vs. `210 s / 25-Shot` Animatic vs. `168 s / 24-Shot` Master)

Early project documents contained a three-way structural mismatch that M6 reconciles cleanly without sacrificing a single required content point (`CP-01` through `CP-15`), technical caveat, or presenter role:

| Version / Source | Shot Count | Total Duration | Frames (`24 fps`) | Reconciliation Diagnosis & M6 Resolution |
|---|---:|---:|---:|---|
| **Legacy Outline (`docs/02_Storyboard_24_Shots.md`)** | `24` (title) / `25` (body) | `~2:30` (`150 s`) -> `210 s` | `3,600` -> `5,040` | Began as a 24-shot `~2:30` pitch outline before the `P1 -> P2` handoff (`S09`) was split out and rough `7–12 s` per-shot padding pushed the table to `210 s`. |
| **Studio v1 Baseline (`MFR_PRODUCTION/03_STORYBOARD_SCRIPT/Storyboard.md`)** | `25` (`S01–S25`) | `210.00 s` (`3:30`) | `5,040` | Exceeded the `<= 3:00` (`180 s`) competition/master limit due to `+1.5–3.5 s` dead-air head/tail padding around `950` Thai syllables and `19.0 s` across silent shots. |
| **Studio v2 Dialogue-Driven (`Shot_List_v2.csv`)** | `25` (`S01–S25`) | `168.00 s` (`2:48`) | `4,032` | Tightened Thai script to `652` phonological syllables (`4.58–4.92 syl/s`) + planned pauses, matching `mfr_master_mix_168s_v2.m4a` (`168.00 s`). |
| **M6 Master Cut (This Document & `Revised_Storyboard_24_Shots.md`)** | **Exact `24` (`S01–S24`)** | **`168.00 s` (`2:48`)** | **`4,032`** | **Merges legacy `S08` (Modular Architecture, `7.50 s`) + `S09` (`P1 -> P2` Handoff, `6.00 s`) into unified `S08` (`13.50 s` / `324 fr`)**, preserving exact musical act hits (`29.0 s`, `53.0 s`, `101.5 s`, `135.0 s`, `152.5 s`, `168.0 s`) in `mfr_master_mix_168s_v2.m4a`, honoring the 24-shot cadence, and staying `12.0 s` under the `3:00` ceiling. |

### Act Structure & Pacing (`168.00 s` = `4,032` Frames)
| Act | Narrative Focus | Shots | Time Window | Duration | Frames | Musical / SFX Identity (`mfr_master_mix_168s_v2.m4a`) |
|---|---|---|---:|---:|---:|---|
| **Act 1** | The Real-World Problem & Operational Gap | `S01–S05` | `0:00.00 – 0:29.00` | `29.00 s` | `696` | C minor blue-hour pad, urban wind bed, rope creak & carabiner click (`9.25 s`), 3 UI ticks (`S05`). |
| **Act 2** | Why MFR Exists & Modular Thesis | `S06–S08` | `0:29.00 – 0:53.00` | `24.00 s` | `576` | Brand reveal swell (`29.0 s`), warm `Fmaj7` modular lift (`34.0 s`), `P1 -> P2` floor-ring transition (`47.0–53.0 s`). |
| **Act 3** | Engineering, Verified CAD & Proposed Control/Safety | `S09–S15` | `0:53.00 – 1:41.50` | `48.50 s` | `1,164` | `108 BPM` precision electronic pulse (`53.0 s`), relay E-stop cut (`S14`), 4 fault alert tones (`S15`). |
| **Act 4** | Multi-Mission Concepts & Vertical Glass Safety | `S16–S20` | `1:41.50 – 2:15.00` | `33.50 s` | `804` | Spacious hangar ambience (`101.5 s`), 4 swipe chimes (`S17`), serious caution low pad (`121.5 s` for `S19`). |
| **Act 5** | Authentic Workbench Reality & Honest Limitations | `S21–S22` | `2:15.00 – 2:32.50` | `17.50 s` | `420` | Intimate felt-tone motif + real bench cue ticks (to be replaced by live Day 2 workbench mic audio). |
| **Act 6** | Staged Roadmap (`Phases A–E`) & 4-Team Close | `S23–S24` | `2:32.50 – 2:48.00` | `15.50 s` | `372` | Rising harmonic steps (`153.2–158.3 s`), clean C major chord resolution & `0.8 s` tail fade to `#05070C`. |

---

## 2. Truthfulness Charter & Engineering Honesty Gates (`MFR_SINGLE_SOURCE_OF_TRUTH.md`)

Every frame, badge, narration line, and diagram in `Film_Preview.mp4` and `Final_MFR_Film.mp4` obeys five non-negotiable truth rules:

1. **Mandatory T1–T4 Status Tier Badges (`Zone A`):**
   - **`T1 CONFIRMED` (`#00D4FF` Cyan):** Verified `Assembly_1.step` CAD geometry (`224.000 × 220.197 × 228.000 mm`, `16` instances / `8` unique solids `#17407–#17414`), `MFR_logo_original.png`, and confirmed Web Platform concept scope (`SurfaceGo`).
   - **`T2 IN DEV` (`#1E6BFF` Electric Blue):** Physical 4-wheel mobile base currently under bench assembly (`ESP32 DevKitC`, `ESP32-CAM`, `2× Cytron MDD10A`, `4×` encoder gear motors — pending physical photos & BOM confirmation).
   - **`T3/T4 CONCEPT` (`#FFB020` Amber):** Unbuilt/untested control algorithms (`PID/PCNT`, `>500 ms` watchdog, `>300 ms` stall), isolated power tree/fuse/hardware E-stop, `SIMULATED` dashboard states, and all 4 future mission modules (`A–D`).
   - **`B-ROLL ILLUSTRATIVE` (`#FFB020` / `#38D6FF`):** All external Wikimedia Commons skyscraper/rope-access/curtain-wall media (`S01`, `S02`, `S04`, `S18`, `S19`), with mandatory photographer/license credits on `S24` End Card.
2. **Prohibition of 4-Wheel Chassis on Vertical Glass:**
   - The `Assembly_1.step` 4-wheel chassis (`60.0 mm` wheels, `3.0 mm` floor clearance) operates **strictly on horizontal `Z = 0` surfaces** (`S18`, `S20`).
   - Vertical glass scenes (`S16`, `S19`) exclusively display the separate **`MOD_C_Concept_T4`** tracked-rail / dual-vacuum-zone carriage with mandatory roof-anchored safety tether (`Callout_Plate_S16_VFX_Concept_Glass.png` and `MG_S20_Vertical_Glass_Safety.png`) and carry explicit Thai/EN caveats stating the 4-wheel base cannot climb glass.
3. **Permanent `SIMULATED / ภาพจำลอง` Marking:**
   - Every simulated camera stream (`S12`) and operator telemetry dashboard (`S15`, `S16`, `S19`) keeps `SIMULATED / ภาพจำลอง` visible until replaced by authenticated hardware captures.
4. **Zero AI-Generated Humans:**
   - Team presenters `P1–P4` are **never** synthesized with AI faces/avatars/voices. In `Film_Preview.mp4`, missing live recordings render strictly as transparent Zone D studio camera slots (`Presenter_Slot_P1.png`–`P4.png`) labeled `[LIVE PRESENTER FOOTAGE PENDING — P1..P4]` with burned-in `Sarabun` Thai subtitles in Zone E2.
5. **Zero Fabricated Numbers, Names, Dates, or AI Claims:**
   - No invented student/school/advisor names (`[TBD]` until official `.docx` supplied), no unsourced accident statistics, no calendar dates on `Phases A–E` (`S23`), no claimed YOLO mAP/TensorRT FPS, and **no** AI/CV actuation of fall-arrest or hardware E-stop circuits (`S10`, `S14`, `S19`).

---

## 3. Color Pipeline (`Rec.709`), Safe Grid (`IoU == 0.000`) & Sound Spec

### 3.1 Rec.709 Color Standard
- **Working Color Space:** `Rec.709` (`bt709`), `yuv420p` (`8-bit` H.264 delivery).
- **Signature Look:** Shadows lifted cleanly toward MFR Deep Navy **`#0A1A33`** over Void Black **`#05070C`** backing; neutral skin midtones on live presenters (`6500K` soft cool key `30°–45°` matching 3D renders + `3200K` warm shoulder rim); restrained `#00D4FF` / `#38D6FF` cyan accents strictly on HUDs and practical elements.
- **Semantic Alert Restriction:** `#FFB020` Amber is reserved solely for T3/T4 concepts, CAD gaps (`160 mm` open bay), and engineering limitations (`S22`). `#FF3B3B` Red is reserved solely for fault alerts (`S15`), E-stop rail cut (`S14`), and prohibited glass-climbing warnings (`S10`, `S19`).

### 3.2 1920x1080 Zero-Overlap Screen Zones (`layout_verifier.py`)
| Zone | Bounds `[x1, y1, x2, y2]` | Size (`W × H`) | Role |
|---|---|---:|---|
| **Zone A** | `[48, 36, 540, 96]` | `492 × 60` | Tier / Shot Status Badge (`T1`, `T2`, `T3/T4`, `B-ROLL ILLUSTRATIVE`) |
| **Zone B** | `[1220, 36, 1872, 96]` | `652 × 60` | `MFR_logo_original.png` Lockup + Active Shot / System ID |
| **Zone C** | `[64, 130, 1220, 845]` *(Split)*<br>`[64, 130, 1856, 845]` *(Full-Stage)* | `1156 × 715` *(Split)*<br>`1792 × 715` *(Full)* | Main Stage: 3D Renders, `MFR_Animation_Preview_v01.mp4`, Technical Diagrams, B-Roll, Workbench Camera |
| **Zone D** | `[1260, 130, 1860, 845]` | `600 × 715` | Presenter Slot (`Presenter_Slot_P1..P4.png`) / Live Keyed or PiP Speaker (`40 px` clear gap from Zone C) |
| **Zone E1** | `[120, 870, 1800, 925]` | `1680 × 55` | Lower-Third Speaker Title / Concept Disclosure Strip (`25 px` below C/D) |
| **Zone E2** | `[120, 935, 1800, 1025]` | `1680 × 90` | **Thai Subtitle Safe Band** (`Sarabun Bold >= 30 px` inside `#05070C` pill, `10 px` gutter below E1) |

### 3.3 Audio Mix & Loudness Target
- **Reference Master Mix:** `MFR_PRODUCTION/06_VIDEO_AUDIO/Audio_Mix/mfr_master_mix_168s_v2.m4a` (`168.000 s`, `48,000 Hz` Stereo AAC, `199 kbps`).
- **EBU R128 Target:** `-14.0 LUFS ± 1.0` integrated loudness, true peak `<= -1.0 dBTP` (measured `-14.0 LUFS`, `LRA 3.5 LU`, `Peak -1.5 dBFS`).
- **Final Mix Dialogue Rule:** When real `P1–P4` voice recordings are added (`Final_MFR_Film.mp4`), duck music/SFX beds smoothly so spoken Thai dialogue sits `8–12 dB` above underscore while keeping final output at `-14.0 LUFS`, `<= -1.0 dBTP`.

---

## 4. Presenter-Over-CG & Swappable Preview-to-Final Workflow

1. **Preview Assembly (`Film_Preview.mp4` — Current Milestone M6):**
   - `build_m6_film_preview.py` reads verified M5 3D assets (`MFR_Animation_Preview_v01.mp4`, `MFR_Hero_Render_v01.png`, `Exploded_View_Preview.png`, etc.), Agent 05 overlays (`overlays/*.png`), technical diagrams (`MG_S08..MG_S24`), and Wikimedia B-roll (`external_broll_verified/`), composites exact `1920x1080` RGB frames in memory, asserts `IoU == 0.000` via `layout_verifier.py` (`Preview_Layout_QA.json`), and pipes raw frames straight to `/opt/homebrew/bin/ffmpeg` (`libx264`, `crf 22`, `yuv420p`) muxed with `mfr_master_mix_168s_v2.m4a`.
2. **Live Presenter Swap (`Final_MFR_Film.mp4` — Post-Shoot):**
   - Team films `P1–P4` following `Filming_Guide.md` and saves clips under `/Users/Siwakorn/Downloads/mfr/source/team_footage_PLACEHOLDER/` (`P1_Intro_Architecture.mp4`, `P2_CAD_Safety.mp4`, `P3_AI_Dashboard.mp4`, `P4_Value_Closing.mp4` or per-shot `S03_P1.mp4`, etc.).
   - Presenters are composited via **Method 1 (Green-Screen Chromakey + Despill)**, **Method 2 (Zone D Rounded PiP without Green Screen)**, or **Method 3 (Full-Frame A-Roll + L/J-Cut for `S03`, `S21`, `S22`, `S24`)** as detailed in `Filming_Guide.md` and `05_VFX_MOTION_GRAPHICS/VFX_Pipeline.md`.
   - `S24` End Card `[TBD]` credits are populated with verified student, school, and advisor names alongside retained Wikimedia Commons CC attributions (`Sebastiandoe5`, `FabianHorst`, `Tim1965`).
