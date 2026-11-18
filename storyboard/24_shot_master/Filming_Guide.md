# MFR Live Filming & Presenter Compositing Manual (`TH / EN`)

**Document ID:** `M6-FILMING-GUIDE-v1.0`  
**Owner:** Agent 04 (`mfr-master-agent-04`)  
**Purpose:** Step-by-step filming, audio, framing, file-naming, and speaker-over-CG compositing instructions so real recordings from Presenters `P1–P4` drop directly into the `168.00 s` (`24 fps`) timeline to produce `Final_MFR_Film.mp4`.

---

## 1. Camera, Lighting & Audio Setup (`เกณฑ์มาตรฐานการถ่ายทำ`)

| Parameter | Exact Required Spec | Thai Practical Checklist (`สิ่งที่ต้องเช็คหน้ากอง`) |
|---|---|---|
| **Resolution & FPS** | **`1920x1080`** min (`3840x2160` preferred) · **`24.000 fps`** (or `23.976 fps`), Shutter `1/48 s` or `1/50 s` | ตั้งกล้องเป็น `1080p24` หรือ `4K24` ห้ามถ่าย `30fps`/`60fps` ผสมกัน เพื่อไม่ให้ภาพกระตุกเวลาซ้อน 3D |
| **Lighting Match to CG** | **`6500K` Soft Cool Key** (`30°–45°` camera-left) + **`3200K` Warm Rim** behind shoulders | วางไฟหลักแสงขาวอมฟ้า (`6500K`) ด้านซ้ายกล้องให้ตรงทิศแสงโมเดล 3D และวางไฟส้มอ่อน (`3200K`) ด้านหลังไหล่เพื่อตัดตัวคนออกจากพื้นหลัง `#0A1A33` |
| **Wardrobe Rule** | Dark / Navy / Neutral smart-casual (`#0A1A33`, `#13294B`, white/grey); **NO green/teal** | **ห้ามใส่เสื้อสีเขียวหรือฟ้าอมเขียว (Teal)** ในฉาก Green Screen เด็ดขาด เพื่อกันขอบตัวแหว่งเวลาคีย์ฉาก |
| **Audio Recording** | **`48 kHz / 24-bit WAV`** or high-rate AAC, lavalier/shotgun `15–20 cm` off-axis; peak around **`-12 dBFS`** (`-18..-9 dBFS`), clean quiet room | อัดเสียงพูดให้ชัด ใกล้ไมค์ (`15–20 cm`) เช็คเกจเสียงให้อยู่แถว `-12 dBFS` (อย่าให้เสียงแตก `0 dBFS`) ปิดแอร์/พัดลมขณะอัดเทป |
| **90% Title-Safe Framing** | Eyes at upper `1/3` (`y ≈ 0.33`), keep lower `210 px` (`y >= 870`) clear of hands/boards | เหลือพื้นที่ด้านล่างเฟรมไว้เสมอสำหรับ Lower-Third (**Zone E1**) และซับไทย (**Zone E2** `y=935..1025`) |
| **Scale Prop (`S09`, `S10`)** | Place `22.4 × 22.0 × 22.8 cm` box on `~70 cm` knee-height stand + `MFR_Calibration_Marker_Sheet_A4.png` | วางกล่องขนาด `22.4×22.0×22.8 cm` เป็นจุดสายตา (`Take A`) แล้วถ่าย **Clean Plate** เอาเฉพาะคนพูด (`Take B` อย่าเปลี่ยนมุมกล้อง) |

---

## 2. Three Ways to Composite Real Speakers Over CG (`3 วิธีวางคนจริงคู่กับฉาก 3D/CG`)

All three workflows keep **Zone C (`x=64..1220`)** and **Zone E2 Subtitles (`y=935..1025`)** 100% unobstructed (`IoU == 0.000`).

### Method 1 — Green-Screen Chromakey + Despill Cutout (`S05`, `S09`, `S10`, `S16`, `S17`, `S23`)
*แนะนำเมื่อต้องการตัดพื้นหลังฉากเขียวออกทั้งหมด ให้ผู้พูดยืนคู่กับโมเดล 3D หรือกราฟิกเต็มฉาก*
1. **On Set:** ยืนห่างฉากเขียวอย่างน้อย **`2.0 m`** เพื่อลดแสงเขียวสะท้อนขอบผม/ไหล่ (`Green Spill`) และจัดไฟฉากเขียวให้สว่างสม่ำเสมอไม่เป็นเงาด่าง.
2. **Framing:** ยืนใน **Right Third (`Zone D`, `x=1260..1860`)** สำหรับ `S05`, `S09`, `S10`, `S16`, `S17` (หรือ **Left Third** สำหรับ `S23` เพื่อให้แขนกวาดไปทาง Timeline `Phase A–E` ด้านขวาโดยไม่บังข้อความ).
3. **FFmpeg Automated Cutout (`chromakey=0x00B140` or sampled hex):**
   ```bash
   /opt/homebrew/bin/ffmpeg -y \
     -i /Users/Siwakorn/Downloads/mfr/MFR_MASTER/03_3D_MODELING/OUTPUT/MFR_Animation_Preview_v01.mp4 \
     -i /Users/Siwakorn/Downloads/mfr/source/team_footage_PLACEHOLDER/P2_CAD_Safety.mp4 \
     -i /Users/Siwakorn/Downloads/mfr/MFR_MASTER/05_VFX_MOTION_GRAPHICS/overlays/HUD_T2_InDev.png \
     -filter_complex "\
       color=c=#0A1A33:s=1920x1080:r=24[bg]; \
       [0:v]crop=1560:875:180:115,scale=1156:715:force_original_aspect_ratio=decrease,pad=1156:715:(ow-iw)/2:(oh-ih)/2:#0A1A33[cg]; \
       [bg][cg]overlay=64:130:shortest=1[stage]; \
       [1:v]fps=24,scale=-1:715,chromakey=0x00B140:0.12:0.08,despill=type=green:mix=0.65:expand=0.05,\
            eq=saturation=0.95:contrast=1.03,crop=600:715:(iw-600)/2:0[keyed]; \
       [stage][keyed]overlay=1260:130:shortest=1[with_p2]; \
       [with_p2][2:v]overlay=0:0[outv]" \
     -map "[outv]" -map 1:a? \
     -c:v libx264 -pix_fmt yuv420p -crf 18 -r 24 \
     -af "loudnorm=I=-14:TP=-1.0:LRA=11" -c:a aac -ar 48000 -b:a 192k \
     S09_P2_Chromakey.mp4
   ```
4. **In DaVinci Resolve / CapCut:** วาง Background `#0A1A33` + 3D Stage ใน Zone C -> ใช้ **Delta Keyer** (Resolve) หรือ **Chroma Key + Spill Suppression** (CapCut) ตัดฉากเขียวบนคลิปคน -> ย้ายตำแหน่งคนเข้า Zone D (`x=1260..1860`) -> วาง `HUD_*.png` ที่ `(0, 0)` ด้านบนสุด.

### Method 2 — Rounded PiP Frame in Zone D (`ใช้เมื่อไม่มี Green Screen — ถ่ายในห้อง/แล็บจริง`)
*ถ่ายในห้องเรียนหรือห้องแล็บที่มีผนังเรียบสะอาด แล้ววางผู้พูดลงในกรอบมุมมน **Zone D (`562 × 516 px` ที่ `x=1279, y=149`)** แทนช่อง Placeholder*
1. **On Set:** ถ่ายหัว-ไหล่ (`MCU`) ให้สายตาอยู่ระดับ `1/3` บนของเฟรม และพื้นหลังด้านหลังผู้พูดไม่รก.
2. **Swap Into Template:** ใช้ `Presenter_Slot_P1..P4.png` เป็นกรอบหน้ากาก (หรือตัดช่องสี่เหลี่ยม `[1279, 149, 1841, 665]` ให้โปร่งใสแล้ววางคลิปผู้พูดไว้ด้านหลังใน Track V1) เติมขอบโค้ง `rx=12 px` ด้วย FFmpeg:
   ```bash
   /opt/homebrew/bin/ffmpeg -y \
     -i /Users/Siwakorn/Downloads/mfr/MFR_MASTER/03_3D_MODELING/OUTPUT/MFR_Animation_Preview_v01.mp4 \
     -i /Users/Siwakorn/Downloads/mfr/source/team_footage_PLACEHOLDER/P2_CAD_Safety.mp4 \
     -i /Users/Siwakorn/Downloads/mfr/MFR_MASTER/05_VFX_MOTION_GRAPHICS/overlays/HUD_T2_InDev.png \
     -filter_complex "\
       color=c=#0A1A33:s=1920x1080:r=24[bg]; \
       [0:v]crop=1560:875:180:115,scale=1156:715:force_original_aspect_ratio=decrease,pad=1156:715:(ow-iw)/2:(oh-ih)/2:#0A1A33[cg]; \
       [bg][cg]overlay=64:130:shortest=1[stage]; \
       [1:v]fps=24,scale=562:516:force_original_aspect_ratio=increase,crop=562:516,format=yuva420p,\
            geq=lum='p(X,Y)':cb='p(X,Y)':cr='p(X,Y)':a='if(gt(pow(max(0,12-X)+max(0,X-(W-13)),2)+pow(max(0,12-Y)+max(0,Y-(H-13)),2),144),0,255)'[pip]; \
       [stage][pip]overlay=1279:149:shortest=1[with_pip]; \
       [with_pip][2:v]overlay=0:0[outv]" \
     -map "[outv]" -map 1:a? \
     -c:v libx264 -pix_fmt yuv420p -crf 18 -r 24 \
     -af "loudnorm=I=-14:TP=-1.0:LRA=11" -c:a aac -ar 48000 -b:a 192k \
     S09_P2_PiP.mp4
   ```

### Method 3 — Full-Frame A-Roll + L-Cut / J-Cut (`S03`, `S07`, `S21`, `S22`, `S24`)
*บังคับใช้สำหรับช็อตสถานที่จริง (`S03` ริมหน้าต่าง) และโต๊ะประกอบฮาร์ดแวร์จริง (`S21`, `S22`, `S24`)*
1. **On Set (`S21` Unvarnished Workbench):** ถ่ายให้เห็นบอร์ด `ESP32`, `ESP32-CAM`, `MDD10A`, มอเตอร์, สายไฟจริง และมือทีมงานที่กำลังประกอบ **ห้ามใส่ CGI ทับอุปกรณ์จริงเด็ดขาด** และเก็บเสียงคลิก/บัดกรี/ประกอบจริงไว้ใต้เสียงพูด.
2. **Framing:** วางตัวคนและอุปกรณ์ให้อยู่ด้านซ้าย/กลาง (`x < 1200`) เมื่อมีตาราง `T1–T4 Legend` (`S21`) หรือการ์ด Amber (`S22`) อยู่ฝั่งขวา และเว้นด้านล่าง `y >= 870` ให้โล่งสำหรับ Lower-Third + ซับไทย.
3. **L-Cut / J-Cut Edit:** นำเสียงพูดของ `P1–P4` วิ่งต่อเนื่อง (`0.5–1.0 s`) ข้ามรอยตัดเข้าสู่ Callout Plate (`Callout_Plate_S08_Modular.png`, `Callout_Plate_S10_MechanicalSafety.png`) หรือ Diagram (`MG_S13..S24`) เพื่อความลื่นไหล.

---

## 3. Exact Upload Directory & Filenames (`ตำแหน่งและชื่อไฟล์ที่ต้องอัปโหลด`)

Save all recorded presenter videos inside:
`/Users/Siwakorn/Downloads/mfr/source/team_footage_PLACEHOLDER/`

### Option A — 4 Master Presenter Takes *(Simplest)*
| Filename | Presenter | Covered Shots & Dialogue | Shoot Environment |
|---|---|---|---|
| **`P1_Intro_Architecture.mp4`** | **P1** | `S03` (`D01`), `S04` (`D02` VO), `S05` (`D03`), `S07` (`D04`), `S08a/b` (`D05`, `D06`) | Day 1 Window + Day 3 Studio/Green Screen |
| **`P2_CAD_Safety.mp4`** | **P2** | `S08b` (`D07`), `S09` (`D08`), `S10` (`D09`), `S11–S15` (`D10–D14` VO), `S21` (`D20` Real Bench) | Day 2 Real Workbench + Day 3 Studio/Green Screen |
| **`P3_AI_Dashboard.mp4`** | **P3** | `S16` (`D15`), `S17` (`D16`), `S18–S20` (`D17–D19` VO) | Day 3 Studio/Green Screen + Quiet VO Mic |
| **`P4_Value_Closing.mp4`** | **P4 (+ All 4)** | `S22` (`D21` Bench), `S23` (`D22` Roadmap), `S24` (`D23` All 4 Team Sign-off) | Day 2 Real Workbench + Day 3 Studio/Green Screen |

### Option B — Per-Shot Clips *(Preferred for Elastic Conform)*
If uploading separate takes per shot, name files with exact shot + presenter prefix:
- `S03_P1.mp4`, `S05_P1.mp4`, `S07_P1.mp4`, `S08_P1_P2.mp4`
- `S09_P2.mp4`, `S10_P2.mp4`, `S21_P2_Bench.mp4`
- `S16_P3.mp4`, `S17_P3.mp4`
- `S22_P4_Bench.mp4`, `S23_P4.mp4`, `S24_Team_Close.mp4`
- Plus standalone clean VO audio (if recorded separately): `VO_S04_P1.wav`, `VO_S08a_P1.wav`, `VO_S11_S15_P2.wav`, `VO_S18_S20_P3.wav`.

Once uploaded, re-run the analyzer + final conform builder to swap every `Presenter_Slot_P1..P4.png` placeholder cleanly and render `Final_MFR_Film.mp4`.
