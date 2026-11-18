# MFR Film V3 — Full 4-Presenter Competition Documentary Script (TH / EN)

- **Presenters (โรงเรียนอัสสัมชัญธนบุรี, ชั้น ม.4):**
  - **P1:** นายเมธาวินทร์ ศิวะพรพันธ์ (`30%`) — Problem Statement, Product Concept & Studio Intro
  - **P2:** นายศิวกร รักหนู (`25%`) — `MFR.step` Mechanical CAD, `ESP32-S3-WROOM` Electronics, AI 06 & Bench Progress
  - **P3:** นายพีรวิชช์ หาวนพันธ์ (`23%`) — Modular Top Payload & Conceptual Vertical Facade Safety System
  - **P4:** นายธนกฤต ธนพันธ์ (`12%`) — Candid Limitations, Engineering Validation Roadmap & Closing Statement
- **Total Timing:** `24 Shots` = `168.00 s` (`2:48`) @ `24 fps`

---

## ACT 1 — High-Rise Risk (`0.0 – 29.0 s`)

- **`S01` (`0.0–4.5 s` | Visual Only):** Opening establishing shot of glass curtain-wall skyscraper.
- **`S02` (`4.5–9.5 s` | Visual Only):** Conceptual suspended MFR reveal on exterior glass with dual roof tether.
- **`S03` (`9.5–16.0 s` | P1 On-Camera):**
  - **TH:** "ทุกวันนี้ อาคารสูงในเมืองใช้ผนังกระจกมากขึ้น แต่การตรวจสอบรอยร้าวและซิลิโคนเสื่อมสภาพ ยังต้องอาศัยคนโรยตัวจากที่สูง"
  - **EN:** "Modern high-rises use expansive glass facades, yet inspecting cracks and failing sealant still forces technicians to rappel at extreme height."
- **`S04` (`16.0–23.5 s` | P1 VO):**
  - **TH:** "ทั้งรอยร้าวขอบกระจก ซิลิโคนเสื่อม คราบสนิม และรอยน้ำรั่ว ถ้าพลาดเพียงครั้งเดียว ย่อมหมายถึงความเสี่ยงต่อชีวิตและค่าใช้จ่ายสูง"
  - **EN:** "From edge cracks and degraded sealant to corrosion and water stains, any inspection miss carries life safety risks and steep maintenance cost."
- **`S05` (`23.5–29.0 s` | P1 On-Camera -> Title):**
  - **TH:** "ทีมของเราจากโรงเรียนอัสสัมชัญธนบุรี จึงพัฒนา **Module Facade Rover** หรือ **MFR** หุ่นยนต์ปฏิบัติงานบนผนังอาคารแบบโมดูลาร์"
  - **EN:** "Our team at Assumption College Thonburi developed **Module Facade Rover (MFR)**—a modular robotics platform for safer facade inspection."

---

## ACT 2 — Tabletop Studio Reveal (`29.0 – 53.0 s`)

- **`S06` (`29.0–35.0 s` | P1 VO):**
  - **TH:** "นี่คือโมเดลจริงจากไฟล์ CAD `MFR.step` ขนาดกะทัดรัดเพียง `224 × 220 × 275` มิลลิเมตร ออกแบบให้ปรับเปลี่ยนภารกิจได้บนฐานเดียว"
  - **EN:** "Shown here from our verified `MFR.step` CAD (`224 × 220 × 275 mm`), MFR concentrates actuation, airflow, and modular mounting into one compact frame."
- **`S07` (`35.0–43.0 s` | P1 VO):**
  - **TH:** "ตัวฐานออกแบบแยกชั้นชัดเจน เพื่อให้ประกอบ ซ่อมบำรุง และพัฒนาต่อยอดโมดูลบนหลังคาหุ่นยนต์ได้สะดวก"
  - **EN:** "A tiered enclosure separates drive mechanics from the upper electronics bay, making assembly and future payload swaps straightforward."
- **`S08` (`43.0–53.0 s` | P1 -> P2 On-Camera Handoff):**
  - **TH [P1]:** "แนวคิดที่ดีต้องพิสูจน์ได้ด้วยโครงสร้างวิศวกรรมจริง" / **[P2]:** "มาดูรายละเอียดกลไกและอิเล็กทรอนิกส์จากไฟล์ CAD `MFR.step` กันครับ"
  - **EN [P1]:** "A good concept must hold up under real engineering scrutiny." / **[P2]:** "Let’s break down the actual mechanics and electronics inside `MFR.step`."

---

## ACT 3 — CAD Subassemblies, `ESP32-S3-WROOM` & AI 06 (`53.0 – 101.5 s`)

- **`S09` (`53.0–60.5 s` | P2 On-Camera -> Exploded):**
  - **TH:** "เมื่อแยกชิ้นส่วนทั้ง `1,370` โหนด ออกเป็น 7 กลุ่มหลัก จะเห็นฐานล่าง มอเตอร์ขับเคลื่อน 4 ตัว ล้อ 4 ล้อ และชุดใบพัดกลางลำตัว"
  - **EN:** "Exploding all `1,370` CAD nodes into seven functional groups reveals the lower chassis, four drive motors, four wheels, and the central ducted impeller."
- **`S10` (`60.5–69.5 s` | P2 VO):**
  - **TH:** "โครงสร้างทั้งหมดประกอบกลับเข้าชุดกันอย่างสมมาตร ตั้งแต่ชุดล้อเส้นผ่านศูนย์กลาง `60` มิลลิเมตร ไปจนถึงฝาครอบโมดูลด้านบน"
  - **EN:** "Every module locks back in coaxial alignment—from the `60 mm` drive wheels up through the enclosed carrier bay and `175 × 215 mm` top plate."
- **`S11` (`69.5–76.0 s` | P2 VO — Macro ESP32-S3-WROOM):**
  - **TH:** "ภายในชั้นบนมีบอร์ดควบคุม `ESP32-S3-WROOM` บนแผ่นวงจรหลัก `82 × 82` มิลลิเมตร พร้อมพอร์ต USB-C, ไฟสถานะ `WS2812B` และขั้วต่อสายไฟ 2 พิน"
  - **EN:** "Inside the upper bay sits our `ESP32-S3-WROOM` module on an `82 × 82 mm` carrier PCB with dual USB-C ports, `WS2812B` LEDs, and screw terminals."
- **`S12` (`76.0–82.5 s` | P2 VO — Macro Impeller & Wheels):**
  - **TH:** "ด้านล่างติดตั้งชุดใบพัด 8 กลีบขนาด `84` มิลลิเมตร พร้อมท่ออากาศและตะแกรงป้องกัน เพื่อศึกษาแรงดูดยึดเกาะควบคู่กับล้อขับเคลื่อน 4 จุด"
  - **EN:** "Beneath lies an `84 mm` 8-blade impeller with dual air ducts and protective grilles, designed to pair airflow adhesion studies with 4-wheel drive."
- **`S13` (`82.5–89.0 s` | P2 VO — Safety Architecture):**
  - **TH:** "ระบบออกแบบให้แยกสายจ่ายกำลังมอเตอร์ออกจากวงจรควบคุม และแยกกลไกตัดไฟฉุกเฉินกับสายสลิงนิรภัยออกจาก AI โดยสมบูรณ์"
  - **EN:** "Hardware power rails are separated from controller logic, while physical emergency cutoffs and tether interlocks remain strictly independent from AI."
- **`S14` (`89.0–95.5 s` | P2 VO — AI 06 Smoke Test):**
  - **TH:** "ฝั่งซอฟต์แวร์ AI 06 พัฒนาไปป์ไลน์คัดกรองรอยบกพร่อง 5 ประเภท ปัจจุบันผ่านการทดสอบ `Smoke-Test` บนชุดข้อมูลสังเคราะห์เท่านั้น เพื่อช่วยแจ้งเตือนผู้ควบคุม"
  - **EN:** "On the software side, AI 06 classifies five facade defect classes—currently validated only on a synthetic smoke-test fixture as advisory telemetry."
- **`S15` (`95.5–101.5 s` | P2 VO — Web Dashboard):**
  - **TH:** "ภาพและผลวิเคราะห์ถูกส่งผ่าน `FastAPI` มายังแดชบอร์ดบนเว็บ เพื่อให้ผู้ตรวจสอบตัดสินใจยืนยันผลได้แบบโปร่งใส"
  - **EN:** "Telemetry and defect predictions stream through `FastAPI` to a browser dashboard, keeping human operators in full control of every inspection decision."

---

## ACT 4 — Modularity & Conceptual Facade Operation (`101.5 – 135.0 s`)

- **`S16` (`101.5–108.0 s` | P3 On-Camera):**
  - **TH:** "จุดเด่นของ MFR คือความสามารถแบบโมดูลาร์ เปลี่ยนอุปกรณ์บนแผ่นฐานด้านบนตามภารกิจได้ ตั้งแต่ชุดตรวจสอบกระจกไปจนถึงหัวทำความสะอาดในอนาคต"
  - **EN:** "MFR’s core strength is modularity: its top plate can carry swappable inspection optics today and future maintenance payloads tomorrow."
- **`S17` (`108.0–115.5 s` | P3 VO — Conceptual Wide Climb):**
  - **TH:** "ภาพจำลองแนวคิดนี้ แสดงการทำงานบนผนังกระจกอาคารสูงในอนาคต โดยมีระบบสลิงคู่จากดาดฟ้าเป็นหลักประกันความปลอดภัย"
  - **EN:** "This conceptual visualization illustrates envisioned skyscraper facade operation supported by dual rooftop safety tethers—not yet field validated."
- **`S18` (`115.5–121.5 s` | P3 VO — Roof Tether Close-Up):**
  - **TH:** "ชุดกว้านและจุดยึดบนดาดฟ้าออกแบบในแนวคิดให้รับน้ำหนักสำรองคู่กัน ป้องกันความเสี่ยงจากแรงลมหรือการสูญเสียแรงดูด"
  - **EN:** "Overhead rooftop davits and redundant tether lines are modeled to bear full static backup load against wind gusts or vacuum loss."
- **`S19` (`121.5–129.0 s` | P3 VO — Wheel-to-Glass Contact):**
  - **TH:** "เมื่อล้อทั้ง 4 สัมผัสผิวกระจกแนวดิ่ง แรงกดจากชุดใบพัดและแรงตึงสลิงจะช่วยรักษาเสถียรภาพขณะเคลื่อนที่ผ่านกรอบอะลูมิเนียม"
  - **EN:** "In theory, balanced airflow downforce and tether tension keep all four `60 mm` wheels seated against the curtain-wall glass as MFR traverses mullions."
- **`S20` (`129.0–135.0 s` | P3 VO — Facade Tracking Climb):**
  - **TH:** "ช่วยให้เจ้าหน้าที่ไม่ต้องออกไปเสี่ยงนอกอาคารในภารกิจตรวจเช็กเบื้องต้น แต่ยังต้องผ่านการทดสอบทางกลอย่างเข้มงวดก่อนใช้งานจริง"
  - **EN:** "Such a workflow could reduce risky human rope-access climbs for routine surveys once mechanical adhesion passes rigorous vertical testing."

---

## ACT 5 — Honest Status & Challenges (`135.0 – 152.5 s`)

- **`S21` (`135.0–144.5 s` | P2 On-Camera):**
  - **TH:** "สำหรับสถานะปัจจุบัน เรายึดถือความตรงไปตรงมา โครงสร้าง CAD `MFR.step` และซอฟต์แวร์ AI 06 ถูกจัดทำแล้ว ขณะที่ตัวหุ่นยนต์จริงยังอยู่ระหว่างประกอบและพัฒนา"
  - **EN:** "To state our status transparently: the `MFR.step` CAD and AI 06 software pipeline are built, while physical chassis integration remains actively in progress."
- **`S22` (`144.5–152.5 s` | P4 On-Camera):**
  - **TH:** "ความท้าทายสำคัญที่ยังต้องแก้ คือการผลิตเสายึดระหว่างโครงล่าง-บน การทดสอบแรงยึดเกาะบนกระจกจริง และการเก็บภาพรอยร้าวจากอาคารจริงมาฝึกโมเดล AI"
  - **EN:** "Key unresolved challenges remain: fabricating chassis standoffs, testing real-glass adhesion thrust, and gathering genuine facade defect imagery to train AI 06."

---

## ACT 6 — Roadmap & Credits (`152.5 – 168.0 s`)

- **`S23` (`152.5–160.5 s` | P4 VO / On-Camera):**
  - **TH:** "ก้าวต่อไปของทีมคือ ทดสอบขับเคลื่อนบนพื้นราบด้วย `ESP32-S3` ทดสอบชุดดูดยึดพร้อมสลิงนิรภัย และเก็บข้อมูลภาพกระจกจริงเพื่อลดข้อผิดพลาด"
  - **EN:** "Next, we will validate flat-ground `ESP32-S3` drive control, test tethered suction rigs safely, and benchmark AI 06 on genuine facade photographs."
- **`S24` (`160.5–168.0 s` | P4 + All Credits):**
  - **TH:** "พวกเราทีม MFR โรงเรียนอัสสัมชัญธนบุรี พร้อมพัฒนาวิศวกรรมอย่างรับผิดชอบ เพื่อความปลอดภัยของผู้ปฏิบัติงานทุกคน ขอบคุณครับ"
  - **EN:** "From all of us on Team MFR at Assumption College Thonburi—building responsibly step by step toward safer high-rise maintenance. Thank you."
