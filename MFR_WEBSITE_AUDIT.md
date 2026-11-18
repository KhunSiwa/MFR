# MFR Website Audit Report (`MFR_WEBSITE_AUDIT.md`)

**Audit Date:** 2026-11-16  
**Target Repository:** `/Users/Siwakorn/i-new-gen`  
**Live Inspected Origin:** `http://127.0.0.1:3000` (inspected via live Chromium webview across desktop `1440×900` and mobile `390×844` viewports, dark & light themes, 50 network requests)  
**Companion Master Project:** `/Users/Siwakorn/Downloads/mfr` (`MFR_MASTER` & `MFR_SINGLE_SOURCE_OF_TRUTH.md`)

---

## 1. Discovered & Applied Skills

Before any code modification, available skills in the workspace and plugin catalog were checked directly:
- **Applied:**
  - `react-best-practices` (`/Users/Siwakorn/.gemini/config/plugins/vercel-plugin/skills/react-best-practices/SKILL.md`): Bundle optimization, eliminating client waterfalls, `next/dynamic` for WebGL/3D, avoiding barrel/waterfall bottlenecks.
  - `a11y-debugging` (`/Users/Siwakorn/.gemini/config/plugins/chrome-devtools-plugin/skills/a11y-debugging/SKILL.md`): Semantic landmarks, heading order, contrast checks, keyboard navigation, form labeling, tap targets.
  - `mfr-software-dashboard` (`/Users/Siwakorn/Downloads/mfr/.agents/skills/mfr-software-dashboard/SKILL.md`): Localhost binding rules, zero secret exposure, `SIMULATED_MOCK` vs `LIVE_BENCH` telemetry segregation.
  - `mfr-ai-vision` (`/Users/Siwakorn/Downloads/mfr/.agents/skills/mfr-ai-vision/SKILL.md`): 5-class facade taxonomy (`Crack`, `Sealant deterioration`, `Rust / corrosion`, `Water stain`, `Normal surface`), mandatory `NOT TRAINED / NOT EVALUATED` disclosure, strict advisory isolation.
  - `mfr-project-governance` (`/Users/Siwakorn/Downloads/mfr/.agents/skills/mfr-project-governance/SKILL.md`): Official name **Module Facade Rover (MFR)**, strict 5-tier status separation, zero fabricated claims.
  - `mfr-security-validation` (`/Users/Siwakorn/Downloads/mfr/.agents/skills/mfr-security-validation/SKILL.md`): Upload bounds checking, path confinement, SHA-256 asset verification.
- **Unavailable (Checked, Not Installed):** `Impeccable`, `Hallmark` (covered instead via engineering visual hierarchy, disciplined navy/blue/white palette, and typography best practices).

---

## 2. Existing Website Architecture

- **Framework & Runtime:** Next.js `16.2.6` (App Router), React `19.2.4`, TypeScript `^5`, Tailwind CSS `@tailwindcss/postcss ^4`.
- **Package Manager:** `npm` (`package-lock.json`).
- **Installed UI & Chart Dependencies:** `@radix-ui/react-progress`, `@radix-ui/react-select`, `@radix-ui/react-slot`, `@radix-ui/react-tabs`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `next-themes`, `recharts`.
- **Entry & Shell:** `src/app/layout.tsx` (`Inter`, Thai `lang="th"`, `ThemeProvider`, `AppShell`), `src/app/globals.css`.
- **Active Routes (`8`):**
  1. `/` (`LoginPage` — mock sign-in gate using `localStorage`)
  2. `/home` (Operations overview + mock KPIs + `RobotHeroSlider`)
  3. `/dashboard` (Mock analytics charts via Recharts + KPI cards)
  4. `/robot` (Mock robot telemetry + client-only `RobotActions` buttons + `ModuleCards`)
  5. `/inspection` (`LiveCameraConsole` polling `/api/robot-camera` every 1 s + `AnalysisPanel` + `InspectionGallery`)
  6. `/ai-analysis` (`AnalysisPanel` with static `database.json` Unsplash URLs + `AiChatConsole`)
  7. `/reports` (`ReportActions` print/CSV + `ReportDocument` with static `Aurelia Tower` fixture data)
  8. `/settings` (`SettingsPanel` with client state toggles + theme toggle)
- **Empty / Unused Route Directories Left Over From Earlier Scaffold:**
  - App pages: `defects/`, `digital-twin/`, `history/`, `inspection-gallery/`, `live-camera/`, `missions/`, `module-dashboard/`, `modules/`, `report/`, `roadmap/`, `robot-control/`, `telemetry/` (`0` files).
  - API dirs: `building/`, `defects/`, `digital-twin/`, `facade-zones/`, `inspection-history/`, `inspection-images/`, `missions/`, `modules/`, `report/`, `roadmap/`, `robot-gallery/`, `robot-platform/`, `robot-status/`, `robot-telemetry/` (`0` files).
- **Implemented API Endpoints (`2`):**
  - `POST /api/ai-chat` — Keyword-matching static reply builder reading `database.json` and `robot-platform.ts`.
  - `GET /api/robot-camera` — Generates synthetic SVG `data:image/svg+xml` frames per second.
- **Database & AI Connection on Website:** **None.** All website data originates from `src/data/database.json` and `src/data/robot-platform.ts`. Meanwhile, the verified M7 FastAPI + SQLite + AI 06 service (`MFR_MASTER/07_DASHBOARD_SOFTWARE/backend/main.py`) runs separately at `http://127.0.0.1:8008` with CORS already enabled for `127.0.0.1:3000`.
- **Authentication:** Mock `localStorage` flag (`mfr-session`) on `/` with hardcoded `demo@mfr.ai` / `mfr-demo`; no real server auth exists.

---

## 3. Observed Visual, UX, Functional & Truthfulness Problems

### A. Visual & Typography Problems (Observed on Live Site & Screenshots)
1. **Unwelcoming Mock Login Gate on `/`:** Visitors landing on `http://127.0.0.1:3000` are greeted by a fake login form (`demo@mfr.ai`) blocking the actual engineering platform, AND in light mode (`final_step_61.png`) the input boxes retain dark `#020617` fill inside a translucent card causing poor text legibility/contrast.
2. **Hero Branding Typo:** `M.F.R. Modul Facade Rover` renders on the hero `<h1>` and navbar subtitle (`"ระบบ Modul Facade Rover"`) instead of **Module Facade Rover**.
3. **Generic AI-Template Aesthetic:** Excessive cyan blur orbs (`bg-cyan-300/20 blur-3xl`), floating frosted glassmorphism badges over imagery, uniform repetitive rounded card grids across every route (`/home`, `/dashboard`, `/robot`, `/inspection`), and over-styled SVG HUD overlays (`AI ROI`).
4. **3D/CAD Presentation Gap:** Landing/Hero slider uses only 2 static PNG crops (`mfr-cleaner-module.png`, `mfr-camera-module.png`) with an awkward frosted overlay bar covering half the image. None of the MFR CAD/T4 3D assets (`MFR_T4_Facade_Rig_v01.glb` 55-part assembly or the 4 architectural renders) are integrated.
5. **Fake Bounding Box Styling (`AnalysisPanel`):** Defect overlays use thick dashed **circles** (`rounded-full border-[6px] border-dashed`) rather than crisp rectangular bounding boxes with telemetry coordinates.
6. **Camera HUD Text Overlap (`/inspection`):** Top-left telemetry metadata in the SVG camera stream collides vertically with zone labels inside small containers.

### B. Functional & Engineering Integrity Problems
1. **Zero Connection to AI 06 (`MFRDefectNet`):** Users cannot upload real images to run actual PyTorch defect inference or review detections with human verification (`CONFIRMED` / `DISMISSED`), nor view persisted SQLite inspection records.
2. **Internal Data Contradiction on `/dashboard`:** Top KPI card states battery **74%** (`robotTwin.batteryStatus`), while the lower panel hardcodes **87%**; top KPI card states AI confidence **96%** (`MetricPanel`), contradicting real AI 06 status.
3. **Unlabeled Simulated vs Real Engineering Claims (Violates SSOT Charter):**
   - Website presents `Aurelia Tower` 42-floor inspection counts, `"หุ่นยนต์ไต่ผิวอาคาร"`, `"แรงยึดเกาะ 96 N"`, `"ความมั่นใจของ AI 96%"`, `"อายุใช้งานคงเหลือ 18 เดือน"` as if operational rather than simulated prototype data.
   - `Assembly_1.step` verified specs (`224.0 x 220.2 mm`, `60.0 mm` wheels, `135.0 mm` wheelbase, ground-wheel prototype) are completely absent from `/robot`.
4. **Safety Isolation Context Missing on Control UI:** `/robot` displays an `"Emergency Stop"` button (`RobotActions`) that only flips local React state without clarifying that hardware E-Stop (`ai_safety_control_enabled = false`, `estop_override_allowed = false`) is physically isolated from software/AI.
5. **Reports Filter Inputs Non-Functional:** Search box and category `<select>` on `/reports` (`reports/page.tsx` L28-37) are uncontrolled static inputs wired to nothing.

---

## 4. Opportunities & Recommended Implementation Sequence

### Phase 1–2: Visual Identity, IA & Core Navigation
- Replace the mock login screen on `/` with the flagship **M.F.R. Engineering Product Overview** (making `/home` stay functional as an alias or overview portal so no existing links break), with optional demo session switch only where appropriate.
- Establish a restrained precision-robotics palette (Deep Navy `#081226`, Engineering Blue `#1D4ED8` / `#2563EB`, Cool Slate `#64748B` / `#F8FAFC`, White, Crisp Cyan `#0891B2` / `#22D3EE` semantic accents).
- Add dedicated **System Architecture** (`/architecture`) and **About & Development Status** (`/about`) routes alongside refined `/`, `/robot`, `/ai-analysis`, `/inspection`, `/dashboard`, `/reports`, `/settings`.

### Phase 3: Real 3D Asset Integration (`MFR_T4_Facade_Rig_v01.glb`)
- Copy verified `MFR_T4_Facade_Rig_v01.glb` (`55` parts, `138,264` tris) + 4 `1920x1080` renders cleanly into `public/models/` & `public/images/` without altering the source GLB under `MFR_MASTER/`.
- Build a dedicated reusable Three.js WebGL component (`next/dynamic` `ssr: false`) with Orbit, Zoom, Pan, Reset Camera, 4 View Presets (`Hero 3/4`, `Full Building`, `Side Clearance`, `Close-Up`), loading progress, WebGL error boundary + high-res fallback render gallery, mobile-friendly controls, and clear disclosure (`T2 Verified CAD Chassis + T4 Concept Facade/Tether Scene — Not Wall-Adhesion Validated`).

### Phase 4: Real AI 06 Integration (`M7 FastAPI Proxy + SQLite + Human Review`)
- Implement Next.js API Route Handlers (`/api/mfr/*`) proxying safely to `http://127.0.0.1:8008` (configurable via `MFR_BACKEND_URL`) with upload validation (`<= 10 MiB`, image types only), safe `503` offline fallback, and zero leakage of filesystem paths or secrets.
- Upgrade `/ai-analysis` and `/dashboard` to run live PyTorch inference (`POST /api/v1/infer`) via file upload or whitelisted audit samples, draw real normalized `[cx, cy, w, h]` rectangular bounding boxes over uploaded/sample previews, inspect all 5 class probabilities (`Crack`, `Sealant deterioration`, `Rust / corrosion`, `Water stain`, `Normal surface`), persist & verify detections (`CONFIRMED` / `DISMISSED`), display inference latency (`ms`) + SHA-256, and prominently display:
  - `SMOKE_TEST_FIXTURE_ONLY — NOT TRAINED / NOT EVALUATED ON REAL BUILDING IMAGES`
  - `ADVISORY ONLY — HUMAN VERIFICATION REQUIRED`
  - Hardware safety isolation status (`ai_safety_control_enabled: false`, `estop_override_allowed: false`).

### Phase 5–9: Component Refactoring, Performance, Accessibility & Verification
- Fix broken report search/filter, eliminate `/dashboard` metric inconsistencies, fix SVG camera overlay spacing, ensure Thai wrapping + contrast + keyboard focus rings across all screens, verify production build (`npm run build`), API tests, and live headless browser checks across desktop & mobile.
