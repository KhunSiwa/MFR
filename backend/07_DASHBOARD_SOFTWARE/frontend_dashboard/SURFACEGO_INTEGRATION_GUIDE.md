# SurfaceGo Next.js Integration Guide (M7 Offline Backend)

**Target Backend:** MFR M7 Unified FastAPI Service (`http://127.0.0.1:8000`)  
**Workspace Isolation Notice:** This guide and `mfrApiClient.ts` are prepared inside `MFR_MASTER/07_DASHBOARD_SOFTWARE/frontend_dashboard/`. Do **not** modify `/Users/Siwakorn/i-new-gen(2026)v2` until the Project Owner explicitly grants external workspace write approval.

---

## 1. Environment & Startup Commands

### Backend (Localhost Only — `127.0.0.1`)
1. Initialize and seed the local SQLite database (zero credentials required):
   ```bash
   /Users/Siwakorn/Downloads/mfr/MFR_PRODUCTION/.venv/bin/python -B \
     /Users/Siwakorn/Downloads/mfr/MFR_MASTER/07_DASHBOARD_SOFTWARE/database/seed_demo_data.py
   ```
2. Optional PostgreSQL production mode (requires installing `psycopg2-binary` or `psycopg` in the target environment, as `psycopg2` is absent in the local `.venv`; apply `database/schema_postgres.sql` first):
   ```bash
   export MFR_DATABASE_URL="postgresql+psycopg2://<user>:<password>@127.0.0.1:5432/mfr_m7"
   ```
3. Run the unified FastAPI server strictly on `127.0.0.1`:
   ```bash
   /Users/Siwakorn/Downloads/mfr/MFR_PRODUCTION/.venv/bin/python -B -m uvicorn \
     backend.main:app --host 127.0.0.1 --port 8000
   ```
   *(Run from `/Users/Siwakorn/Downloads/mfr/MFR_MASTER/07_DASHBOARD_SOFTWARE/`.)*

### Companion Next.js Frontend (`SurfaceGo` — Once Owner Approves External Integration)
1. Copy `mfrApiClient.ts` into `src/lib/mfrApiClient.ts` inside the Next.js repo.
2. Add to `.env.local` (never commit secrets):
   ```env
   NEXT_PUBLIC_MFR_API_BASE=http://127.0.0.1:8000
   ```
3. CORS in `backend/main.py` already whitelists `http://127.0.0.1:3000` and `http://localhost:3000`.

---

## 2. Route Mapping (`SurfaceGo` <-> M7 API)

| `SurfaceGo` Route | M7 Endpoint(s) | Truthfulness & UI Contract |
|---|---|---|
| `/` & `/admin` | `GET /health`, `GET /api/v1/robots`, `GET /api/v1/model-status` | Display CAD dimensions (`224.0 x 220.2 x 228.0 mm`), `IN_DEVELOPMENT`, and `real_dataset_trained: false` banner. |
| `/result` | `POST /api/v1/infer`, `GET /api/v1/inspections`, `PATCH /api/v1/inspections/{id}/review` | Must display `disclaimer`, `advisory_only: true`, and `SMOKE_TEST_FIXTURE_ONLY` badge alongside bounding boxes. |
| `/tracking` & `/endpoint` | `GET /api/v1/telemetry`, `POST /api/v1/telemetry`, `GET /api/v1/safety-events` | Must render `telemetry_source` badge (`SIMULATED_MOCK` vs `LIVE_BENCH` vs `UNCONNECTED`) on every card/row. |
| `/order`, `/map`, `/hubs`, `/future` | `GET /api/v1/surfacego-concept` | Keep marked `T4 UI MOCKUP CONCEPT` (do not present `฿184K`, `24 bots`, or `฿259–฿399` as live commercial metrics). |

---

## 3. Hard Safety Isolation Rules for UI Components
- **NO** E-Stop override, tether release, or motor PWM sliders/buttons may be wired to the backend (`POST /api/v1/safety/command` returns `HTTP 403 Forbidden` and logs `BLOCKED_403` to `safety_events`).
- **NO** vertical high-rise glass autonomous status may be submitted (`POST /api/v1/telemetry` rejects `vertical_glass_autonomous: true` or non-ground `surface_mode` with `HTTP 422`).
