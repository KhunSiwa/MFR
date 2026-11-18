#!/usr/bin/env python3
"""
MFR Module Facade Rover — Unified M7 FastAPI Backend & Offline Dashboard Server
--------------------------------------------------------------------------------
Integrates `mfr-master-agent-06`'s `MFRVisionService` with SQLAlchemy 2.0
persistence and serves the 100% offline-capable web dashboard.

Strict Security & Truthfulness Invariants:
  - Binds strictly to 127.0.0.1 (never 0.0.0.0).
  - Zero external CDNs, zero hardcoded secrets, zero matplotlib imports.
  - CV outputs strictly tagged `SMOKE_TEST_FIXTURE_ONLY` and `advisory_only=True`.
  - Telemetry strictly segregates `SIMULATED_MOCK`, `LIVE_BENCH`, `UNCONNECTED`.
  - Hard safety isolation: `ai_safety_control_enabled=False`,
    `estop_override_allowed=False`; any AI safety/E-stop/tether override request
    is rejected with HTTP 403 and logged to `safety_events`.
"""

from __future__ import annotations

import inspect
import json
import re
import sys
from contextlib import asynccontextmanager
from functools import lru_cache
from pathlib import Path
from typing import Dict, List, Optional

sys.dont_write_bytecode = True

import starlette.routing

# Compatibility guard: host environment pairs fastapi 0.115.2 with starlette 1.3.1,
# where Router.__init__ dropped deprecated on_startup/on_shutdown kwargs.
if "on_startup" not in inspect.signature(starlette.routing.Router.__init__).parameters:
    _orig_router_init = starlette.routing.Router.__init__

    def _compat_router_init(self, *args, on_startup=None, on_shutdown=None, **kwargs):
        _orig_router_init(self, *args, **kwargs)
        self.on_startup = list(on_startup or [])
        self.on_shutdown = list(on_shutdown or [])

    starlette.routing.Router.__init__ = _compat_router_init

from fastapi import Depends, FastAPI, File, Form, HTTPException, Query, Request, UploadFile  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from fastapi.responses import FileResponse  # noqa: E402
from fastapi.staticfiles import StaticFiles  # noqa: E402
from sqlalchemy import desc, func, select, text  # noqa: E402
from sqlalchemy.orm import Session, selectinload  # noqa: E402

THIS_DIR = Path(__file__).resolve().parent
M7_ROOT = THIS_DIR.parent
MFR_MASTER_ROOT = M7_ROOT.parent
WORKSPACE_ROOT = MFR_MASTER_ROOT.parent
FRONTEND_DIR = M7_ROOT / "frontend_dashboard"

CV_ROOT = MFR_MASTER_ROOT / "06_AI_COMPUTER_VISION"
CV_INFERENCE_DIR = CV_ROOT / "inference_api"
EVAL_SUMMARY_JSON = CV_ROOT / "evaluation" / "evaluation_summary.json"
MODEL_CARD_MD = CV_ROOT / "evaluation" / "Model_Card.md"
SMOKE_TEST_IMAGES_DIR = (CV_ROOT / "dataset_spec" / "smoke_fixture" / "images" / "test").resolve()
AUDIT_TILES_DIR = (CV_ROOT / "dataset_spec" / "real_curtainwall_unlabeled_audit").resolve()
SHARED_LOGO_PATH = (WORKSPACE_ROOT / "MFR_PRODUCTION" / "08_SHARED_ASSETS" / "MFR_logo_original.png").resolve()

for _p in (str(M7_ROOT), str(CV_INFERENCE_DIR)):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from cv_service import (  # noqa: E402
    MAX_UPLOAD_BYTES,
    MFRVisionService,
    resolve_workspace_image_path,
)
from database.db import SessionLocal, engine, get_db, init_db  # noqa: E402
from database.models import (  # noqa: E402
    DefectDetectionRow,
    Inspection,
    ModelRegistry,
    Robot,
    SafetyEvent,
    TelemetryLog,
)
from database.seed_demo_data import seed_all  # noqa: E402
from database.seed_work_planning import seed_work_planning_baseline  # noqa: E402
from backend.work_planning_router import router as work_planning_router  # noqa: E402
from backend.schemas import (  # noqa: E402
    BoundingBoxOut,
    DefectDetectionOut,
    HealthOut,
    InspectionListOut,
    InspectionOut,
    InspectionReviewIn,
    ModelStatusOut,
    RobotOut,
    SafetyCommandIn,
    SafetyEventOut,
    SafetyEventsResponseOut,
    SampleImageOut,
    SurfaceGoConceptOut,
    TelemetryCreateIn,
    TelemetryListOut,
    TelemetryOut,
)

HONEST_DISCLAIMER = "SMOKE_TEST_FIXTURE_ONLY (Real Facade Accuracy: NOT TRAINED / NOT EVALUATED)"
ALLOWED_TELEMETRY_SOURCES = {"SIMULATED_MOCK", "LIVE_BENCH", "UNCONNECTED"}
ALLOWED_SYSTEM_STATES = {
    "NORMAL",
    "CAMERA_DISCONNECTED",
    "COMMUNICATION_FAILURE",
    "SENSOR_FAILURE",
    "MOTOR_FAULT",
    "E_STOP",
    "UNCONNECTED",
}
ALLOWED_SURFACE_MODES = {"HORIZONTAL_GROUND_ONLY", "BENCH_RIG_NO_LOAD"}
FORBIDDEN_OVERRIDE_FIELDS = {
    "ai_safety_override",
    "estop_override",
    "bypass_estop",
    "tether_release",
    "brake_release",
    "motor_pwm",
    "pwm_command",
    "safety_actuation",
    "actuate_safety",
}
SAMPLE_NAME_RE = re.compile(r"^[A-Za-z0-9_.-]+\.png$")


@lru_cache(maxsize=1)
def get_vision_service() -> MFRVisionService:
    return MFRVisionService()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    with SessionLocal() as session:
        seed_all(session)
        seed_work_planning_baseline(session)
    yield


app = FastAPI(
    title="MFR Module Facade Rover — M7 Backend & Dashboard API",
    version="1.0.0",
    description=(
        "Offline-first M7 FastAPI backend integrating MFRVisionService (advisory-only CV) "
        "with SQLAlchemy persistence and strict hardware safety isolation."
    ),
    lifespan=lifespan,
)

# Allow local Next.js SurfaceGo dev server on localhost/127.0.0.1 only
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:3000",
        "http://localhost:3000",
        "http://127.0.0.1:8000",
        "http://localhost:8000",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH"],
    allow_headers=["Content-Type"],
)

if FRONTEND_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")

app.include_router(work_planning_router)


def _resolve_sample_file(sample_name: str) -> tuple[Path, str]:
    """Resolve a whitelisted sample filename from smoke_fixture/test or real_curtainwall_unlabeled_audit."""
    if ".." in sample_name or sample_name.startswith(".") or not SAMPLE_NAME_RE.match(sample_name):
        raise PermissionError(f"Invalid or unsafe sample name '{sample_name}'.")

    candidates = [
        (SMOKE_TEST_IMAGES_DIR, "SMOKE_FIXTURE"),
        (AUDIT_TILES_DIR, "UNLABELED_CURTAINWALL_AUDIT"),
    ]
    for base_dir, source_type in candidates:
        candidate = (base_dir / sample_name).resolve()
        if not candidate.is_relative_to(base_dir):
            raise PermissionError(f"Sample path escapes whitelisted directory: '{sample_name}'.")
        if candidate.exists() and candidate.is_file():
            return candidate, source_type

    raise FileNotFoundError(f"Whitelisted sample image not found: '{sample_name}'.")


def _inspection_to_out(row: Inspection) -> InspectionOut:
    return InspectionOut(
        inspection_id=row.id,
        robot_code=row.robot.robot_code if row.robot else "MFR-BASE-01",
        model_name=row.model.model_name if row.model else "MFRDefectNet-SmokeTest-v1.0",
        source_type=row.source_type,
        source_name=row.source_name,
        input_sha256=row.input_sha256,
        image_size=[row.image_width, row.image_height],
        inference_ms=row.inference_ms,
        model_tier=row.model_tier,
        real_dataset_trained=row.real_dataset_trained,
        is_real_facade_evaluated=False,
        advisory_only=True,
        safety_actuation_allowed=False,
        disclaimer=row.disclaimer,
        operator_review_status=row.operator_review_status,
        class_probabilities=json.loads(row.class_probabilities_json),
        detections=[
            DefectDetectionOut(
                id=d.id,
                class_id=d.class_id,
                class_name=d.class_name,
                confidence=d.confidence,
                bbox=BoundingBoxOut(cx=d.bbox_cx, cy=d.bbox_cy, w=d.bbox_w, h=d.bbox_h),
                advisory_only=True,
            )
            for d in row.detections
        ],
        created_at=row.created_at,
    )


def _log_blocked_safety_event(
    db: Session,
    robot: Robot,
    event_type: str,
    source_component: str,
    description: str,
) -> SafetyEvent:
    ev = SafetyEvent(
        robot_id=robot.id,
        event_type=event_type,
        severity="BLOCKED_403",
        source_component=source_component,
        blocked_by_policy=True,
        hardware_estop_independent=True,
        description=description,
    )
    db.add(ev)
    db.commit()
    db.refresh(ev)
    return ev


def _get_robot_or_404(db: Session, robot_code: str) -> Robot:
    robot = db.execute(select(Robot).where(Robot.robot_code == robot_code)).scalar_one_or_none()
    if robot is None:
        raise HTTPException(status_code=404, detail=f"Robot '{robot_code}' not registered.")
    return robot


# ---------------------------------------------------------------------------
# Frontend & Read-Only Brand Asset Routes
# ---------------------------------------------------------------------------


@app.get("/", include_in_schema=False)
def serve_dashboard() -> FileResponse:
    index_path = FRONTEND_DIR / "index.html"
    if not index_path.exists():
        raise HTTPException(status_code=404, detail="Dashboard index.html not found.")
    return FileResponse(path=str(index_path), media_type="text/html; charset=utf-8")


@app.get("/assets/MFR_logo_original.png", include_in_schema=False)
def serve_brand_logo() -> FileResponse:
    if not SHARED_LOGO_PATH.exists():
        raise HTTPException(status_code=404, detail="Brand logo asset not found.")
    return FileResponse(path=str(SHARED_LOGO_PATH), media_type="image/png")


# ---------------------------------------------------------------------------
# Health, Model Status & Robot Registry
# ---------------------------------------------------------------------------


@app.get("/health", response_model=HealthOut)
def health(db: Session = Depends(get_db)) -> HealthOut:
    db_ok = False
    try:
        db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False

    svc = get_vision_service()
    cv_h = svc.health()
    return HealthOut(
        status="ok" if db_ok and cv_h.model_loaded else "degraded",
        service="MFR_M7_Unified_Backend",
        database_connected=db_ok,
        database_dialect=engine.dialect.name,
        cv_model_loaded=cv_h.model_loaded,
        weights_sha256=cv_h.weights_sha256,
        model_tier=cv_h.model_tier,
        real_dataset_trained=False,
        is_real_facade_evaluated=False,
        advisory_only=True,
        safety_actuation_allowed=False,
        ai_safety_control_enabled=False,
        estop_override_allowed=False,
        disclaimer=HONEST_DISCLAIMER,
    )


@app.get("/api/v1/model-status", response_model=ModelStatusOut)
def get_model_status(db: Session = Depends(get_db)) -> ModelStatusOut:
    svc = get_vision_service()
    mc = svc.model_card()

    latency = None
    if EVAL_SUMMARY_JSON.exists():
        raw_eval = json.loads(EVAL_SUMMARY_JSON.read_text(encoding="utf-8"))
        latency = raw_eval.get("host_inference_latency")

    reg = db.execute(select(ModelRegistry).order_by(ModelRegistry.id.asc())).scalars().first()
    model_version = reg.model_version if reg else "1.0.0-smoke"

    return ModelStatusOut(
        model_name=mc.model_name,
        model_version=model_version,
        model_tier=mc.model_tier,
        real_dataset_trained=False,
        is_real_facade_evaluated=False,
        real_facade_status=mc.real_facade_status,
        weights_sha256=mc.weights_sha256,
        taxonomy=mc.taxonomy,
        input_size=mc.input_size,
        smoke_test_metrics=mc.smoke_test_metrics,
        host_inference_latency=latency,
        advisory_only=True,
        safety_actuation_allowed=False,
        disclaimer=HONEST_DISCLAIMER,
        model_card_path="MFR_MASTER/06_AI_COMPUTER_VISION/evaluation/Model_Card.md",
    )


@app.get("/api/v1/robots", response_model=List[RobotOut])
def list_robots(db: Session = Depends(get_db)) -> List[RobotOut]:
    rows = db.execute(select(Robot).order_by(Robot.id.asc())).scalars().all()
    return [
        RobotOut(
            id=r.id,
            robot_code=r.robot_code,
            name=r.name,
            status=r.status,
            cad_length_mm=r.cad_length_mm,
            cad_width_mm=r.cad_width_mm,
            cad_height_mm=r.cad_height_mm,
            wheelbase_mm=r.wheelbase_mm,
            vertical_glass_certified=False,
            ai_safety_control_enabled=False,
            estop_override_allowed=False,
            notes=r.notes,
            created_at=r.created_at,
        )
        for r in rows
    ]


# ---------------------------------------------------------------------------
# Sample Image Catalog & Whitelisted Serving
# ---------------------------------------------------------------------------


@app.get("/api/v1/samples", response_model=List[SampleImageOut])
def list_samples() -> List[SampleImageOut]:
    samples: List[SampleImageOut] = []
    if AUDIT_TILES_DIR.exists():
        for p in sorted(AUDIT_TILES_DIR.glob("*.png"))[:8]:
            samples.append(
                SampleImageOut(
                    sample_id=p.name,
                    tier="UNLABELED_CURTAINWALL_AUDIT",
                    label_status="UNLABELED_REAL_CURTAINWALL_AUDIT (0 ground-truth labels)",
                    source_group="real_curtainwall_unlabeled_audit",
                    url=f"/api/v1/sample-images/{p.name}",
                )
            )
    if SMOKE_TEST_IMAGES_DIR.exists():
        for p in sorted(SMOKE_TEST_IMAGES_DIR.glob("*.png"))[:10]:
            samples.append(
                SampleImageOut(
                    sample_id=p.name,
                    tier="SMOKE_TEST_FIXTURE_ONLY",
                    label_status="PROCEDURAL_SMOKE_FIXTURE",
                    source_group="smoke_fixture",
                    url=f"/api/v1/sample-images/{p.name}",
                )
            )
    return samples


@app.get("/api/v1/sample-images/{sample_name}")
def get_sample_image(sample_name: str) -> FileResponse:
    try:
        resolved, _ = _resolve_sample_file(sample_name)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return FileResponse(path=str(resolved), media_type="image/png")


# ---------------------------------------------------------------------------
# Advisory CV Inference & Inspection Persistence
# ---------------------------------------------------------------------------


@app.post("/api/v1/infer", response_model=InspectionOut)
async def run_advisory_inference(
    request: Request,
    file: Optional[UploadFile] = File(default=None),
    sample_id: Optional[str] = Form(default=None),
    image_path: Optional[str] = Form(default=None),
    robot_code: str = Form(default="MFR-BASE-01"),
    db: Session = Depends(get_db),
) -> InspectionOut:
    svc = get_vision_service()
    robot = _get_robot_or_404(db, robot_code)
    model_row = db.execute(select(ModelRegistry).order_by(ModelRegistry.id.asc())).scalars().first()
    if model_row is None:
        raise HTTPException(status_code=500, detail="Model registry is not initialized.")

    eff_sample = sample_id or request.query_params.get("sample_id")
    eff_path = image_path or request.query_params.get("image_path")

    if file is not None:
        raw = await file.read(MAX_UPLOAD_BYTES + 1)
        if len(raw) > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail="Uploaded image exceeds 10 MiB limit.")
        try:
            pred = svc.predict_bytes(raw, source_name=file.filename or "upload")
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        source_type = "UPLOAD"
    elif eff_sample is not None:
        try:
            resolved, source_type = _resolve_sample_file(eff_sample)
            pred = svc.predict_bytes(resolved.read_bytes(), source_name=resolved.name)
        except PermissionError as exc:
            raise HTTPException(status_code=403, detail=str(exc)) from exc
        except FileNotFoundError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
    elif eff_path is not None:
        try:
            resolved = resolve_workspace_image_path(eff_path)
            pred = svc.predict_bytes(resolved.read_bytes(), source_name=resolved.name)
        except PermissionError as exc:
            raise HTTPException(status_code=403, detail=str(exc)) from exc
        except FileNotFoundError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        if resolved.is_relative_to(AUDIT_TILES_DIR):
            source_type = "UNLABELED_CURTAINWALL_AUDIT"
        elif resolved.is_relative_to(SMOKE_TEST_IMAGES_DIR.parents[1]):
            source_type = "SMOKE_FIXTURE"
        else:
            source_type = "WORKSPACE_PATH"
    else:
        raise HTTPException(
            status_code=400,
            detail="Provide multipart 'file', whitelisted 'sample_id', or workspace-confined 'image_path'.",
        )

    inspection = Inspection(
        robot_id=robot.id,
        model_id=model_row.id,
        source_type=source_type,
        source_name=pred.source_name,
        input_sha256=pred.input_sha256,
        image_width=pred.image_size[0],
        image_height=pred.image_size[1],
        inference_ms=pred.inference_ms,
        model_tier="SMOKE_TEST_FIXTURE_ONLY",
        real_dataset_trained=False,
        advisory_only=True,
        safety_actuation_allowed=False,
        disclaimer=HONEST_DISCLAIMER,
        class_probabilities_json=json.dumps(pred.class_probabilities),
        operator_review_status="PENDING_HUMAN_REVIEW",
    )
    db.add(inspection)
    db.flush()

    for det in pred.detections:
        db.add(
            DefectDetectionRow(
                inspection_id=inspection.id,
                class_id=det.class_id,
                class_name=det.class_name,
                confidence=det.confidence,
                bbox_cx=det.bbox.cx,
                bbox_cy=det.bbox.cy,
                bbox_w=det.bbox.w,
                bbox_h=det.bbox.h,
                advisory_only=True,
            )
        )

    db.commit()
    persisted = db.execute(
        select(Inspection)
        .options(selectinload(Inspection.detections), selectinload(Inspection.robot), selectinload(Inspection.model))
        .where(Inspection.id == inspection.id)
    ).scalar_one()
    return _inspection_to_out(persisted)


@app.get("/api/v1/inspections", response_model=InspectionListOut)
def list_inspections(
    limit: int = Query(default=25, ge=1, le=200),
    db: Session = Depends(get_db),
) -> InspectionListOut:
    total = int(db.execute(select(func.count(Inspection.id))).scalar_one())
    rows = (
        db.execute(
            select(Inspection)
            .options(selectinload(Inspection.detections), selectinload(Inspection.robot), selectinload(Inspection.model))
            .order_by(desc(Inspection.id))
            .limit(limit)
        )
        .scalars()
        .all()
    )
    return InspectionListOut(total_count=total, items=[_inspection_to_out(r) for r in rows])


@app.get("/api/v1/inspections/{inspection_id}", response_model=InspectionOut)
def get_inspection(inspection_id: int, db: Session = Depends(get_db)) -> InspectionOut:
    row = (
        db.execute(
            select(Inspection)
            .options(selectinload(Inspection.detections), selectinload(Inspection.robot), selectinload(Inspection.model))
            .where(Inspection.id == inspection_id)
        )
        .scalar_one_or_none()
    )
    if row is None:
        raise HTTPException(status_code=404, detail=f"Inspection {inspection_id} not found.")
    return _inspection_to_out(row)


@app.patch("/api/v1/inspections/{inspection_id}/review", response_model=InspectionOut)
def update_inspection_review(
    inspection_id: int,
    payload: InspectionReviewIn,
    db: Session = Depends(get_db),
) -> InspectionOut:
    row = (
        db.execute(
            select(Inspection)
            .options(selectinload(Inspection.detections), selectinload(Inspection.robot), selectinload(Inspection.model))
            .where(Inspection.id == inspection_id)
        )
        .scalar_one_or_none()
    )
    if row is None:
        raise HTTPException(status_code=404, detail=f"Inspection {inspection_id} not found.")
    row.operator_review_status = payload.operator_review_status
    db.commit()
    db.refresh(row)
    return _inspection_to_out(row)


# ---------------------------------------------------------------------------
# Telemetry Segregation & Hard Safety Isolation
# ---------------------------------------------------------------------------


@app.get("/api/v1/telemetry", response_model=TelemetryListOut)
def list_telemetry(
    telemetry_source: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
) -> TelemetryListOut:
    if telemetry_source is not None and telemetry_source not in ALLOWED_TELEMETRY_SOURCES:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid telemetry_source '{telemetry_source}'. Allowed: {sorted(ALLOWED_TELEMETRY_SOURCES)}",
        )

    counts_rows = db.execute(
        select(TelemetryLog.telemetry_source, func.count(TelemetryLog.id)).group_by(TelemetryLog.telemetry_source)
    ).all()
    counts_by_source = {src: int(cnt) for src, cnt in counts_rows}

    stmt = select(TelemetryLog).options(selectinload(TelemetryLog.robot)).order_by(desc(TelemetryLog.id)).limit(limit)
    if telemetry_source is not None:
        stmt = stmt.where(TelemetryLog.telemetry_source == telemetry_source)

    rows = db.execute(stmt).scalars().all()
    total = int(db.execute(select(func.count(TelemetryLog.id))).scalar_one())
    return TelemetryListOut(
        total_count=total,
        counts_by_source=counts_by_source,
        items=[
            TelemetryOut(
                id=t.id,
                robot_code=t.robot.robot_code if t.robot else "MFR-BASE-01",
                telemetry_source=t.telemetry_source,
                system_state=t.system_state,
                surface_mode=t.surface_mode,
                battery_voltage_v=t.battery_voltage_v,
                wheel_rpm_avg=t.wheel_rpm_avg,
                wifi_rssi_dbm=t.wifi_rssi_dbm,
                camera_link_ok=t.camera_link_ok,
                hardware_estop_engaged=t.hardware_estop_engaged,
                ai_safety_control_enabled=False,
                estop_override_allowed=False,
                note=t.note,
                recorded_at=t.recorded_at,
            )
            for t in rows
        ],
    )


@app.post("/api/v1/telemetry", response_model=TelemetryOut, status_code=201)
def ingest_telemetry(payload: TelemetryCreateIn, db: Session = Depends(get_db)) -> TelemetryOut:
    robot = _get_robot_or_404(db, payload.robot_code)

    extras = payload.model_extra or {}
    triggered_forbidden = [
        k for k in FORBIDDEN_OVERRIDE_FIELDS if getattr(payload, k, None) or extras.get(k)
    ]
    if triggered_forbidden:
        _log_blocked_safety_event(
            db=db,
            robot=robot,
            event_type="AI_SAFETY_OVERRIDE_REJECTED",
            source_component="POST /api/v1/telemetry",
            description=(
                f"Rejected forbidden safety override field(s) {triggered_forbidden}. "
                "ai_safety_control_enabled=FALSE, estop_override_allowed=FALSE."
            ),
        )
        raise HTTPException(
            status_code=403,
            detail=(
                f"Safety Isolation Violation: forbidden field(s) {triggered_forbidden} rejected. "
                "AI/software cannot override hardware E-stop, safety tethers, or motor safety interlocks."
            ),
        )

    if extras:
        raise HTTPException(status_code=422, detail=f"Unexpected telemetry field(s): {sorted(extras.keys())}")

    if payload.vertical_glass_autonomous is True or payload.surface_mode not in ALLOWED_SURFACE_MODES:
        raise HTTPException(
            status_code=422,
            detail=(
                "Unverified vertical-glass autonomous climbing claims are prohibited (SSOT §4). "
                f"Allowed surface_mode values: {sorted(ALLOWED_SURFACE_MODES)}."
            ),
        )

    if payload.telemetry_source not in ALLOWED_TELEMETRY_SOURCES:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid telemetry_source '{payload.telemetry_source}'. Allowed: {sorted(ALLOWED_TELEMETRY_SOURCES)}",
        )

    if payload.system_state not in ALLOWED_SYSTEM_STATES:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid system_state '{payload.system_state}'. Allowed: {sorted(ALLOWED_SYSTEM_STATES)}",
        )

    row = TelemetryLog(
        robot_id=robot.id,
        telemetry_source=payload.telemetry_source,
        system_state=payload.system_state,
        surface_mode=payload.surface_mode,
        battery_voltage_v=payload.battery_voltage_v,
        wheel_rpm_avg=payload.wheel_rpm_avg,
        wifi_rssi_dbm=payload.wifi_rssi_dbm,
        camera_link_ok=payload.camera_link_ok,
        hardware_estop_engaged=payload.hardware_estop_engaged,
        ai_safety_control_enabled=False,
        estop_override_allowed=False,
        note=payload.note,
    )
    db.add(row)
    db.commit()
    db.refresh(row)

    return TelemetryOut(
        id=row.id,
        robot_code=robot.robot_code,
        telemetry_source=row.telemetry_source,
        system_state=row.system_state,
        surface_mode=row.surface_mode,
        battery_voltage_v=row.battery_voltage_v,
        wheel_rpm_avg=row.wheel_rpm_avg,
        wifi_rssi_dbm=row.wifi_rssi_dbm,
        camera_link_ok=row.camera_link_ok,
        hardware_estop_engaged=row.hardware_estop_engaged,
        ai_safety_control_enabled=False,
        estop_override_allowed=False,
        note=row.note,
        recorded_at=row.recorded_at,
    )


@app.get("/api/v1/safety-events", response_model=SafetyEventsResponseOut)
def list_safety_events(
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
) -> SafetyEventsResponseOut:
    svc = get_vision_service()
    policy = svc.safety_policy()
    rows = (
        db.execute(
            select(SafetyEvent).options(selectinload(SafetyEvent.robot)).order_by(desc(SafetyEvent.id)).limit(limit)
        )
        .scalars()
        .all()
    )
    return SafetyEventsResponseOut(
        ai_safety_control_enabled=False,
        estop_override_allowed=False,
        hardware_estop_independent=True,
        control_layer=policy.control_layer,
        prohibited_actions=policy.prohibited_actions,
        events=[
            SafetyEventOut(
                id=e.id,
                robot_code=e.robot.robot_code if e.robot else "MFR-BASE-01",
                event_type=e.event_type,
                severity=e.severity,
                source_component=e.source_component,
                blocked_by_policy=e.blocked_by_policy,
                hardware_estop_independent=True,
                description=e.description,
                created_at=e.created_at,
            )
            for e in rows
        ],
    )


@app.post("/api/v1/safety/command")
def reject_safety_command(payload: SafetyCommandIn, db: Session = Depends(get_db)) -> None:
    robot = _get_robot_or_404(db, payload.robot_code)
    _log_blocked_safety_event(
        db=db,
        robot=robot,
        event_type="SAFETY_COMMAND_BLOCKED_403",
        source_component="POST /api/v1/safety/command",
        description=(
            f"Blocked software/AI safety command '{payload.command}' "
            f"(reason={payload.reason or 'unspecified'}). Hardware E-Stop and fall-arrest tether "
            "cannot be actuated or overridden from software."
        ),
    )
    raise HTTPException(
        status_code=403,
        detail=(
            f"403 Forbidden: Safety actuation command '{payload.command}' is physically and "
            "architecturally prohibited. Hardware E-Stop and fall-arrest tethers are independent "
            "of Layer 4 software/AI (ai_safety_control_enabled=false, estop_override_allowed=false)."
        ),
    )


@app.get("/api/v1/surfacego-concept", response_model=SurfaceGoConceptOut)
def get_surfacego_concept() -> SurfaceGoConceptOut:
    return SurfaceGoConceptOut(
        status="T4_UI_MOCKUP_CONCEPT_ONLY",
        disclaimer=(
            "SIMULATED UI MOCKUP DATA from SSOT §3.5 / Engineering_QA.md §8.1 — "
            "NOT live commercial revenue, fleet inventory, or verified vertical-glass capability."
        ),
        external_repo_accessed=False,
        ssot_reference="MFR_SINGLE_SOURCE_OF_TRUTH.md §3.5 & §6; Engineering_QA.md §8.1",
        routes=[
            "/",
            "/order",
            "/tracking",
            "/map",
            "/hubs",
            "/admin",
            "/future",
            "/api",
            "/endpoint",
            "/profile",
            "/result",
        ],
        mockup_kpis={
            "mockup_job_id": "#SG-2048",
            "mockup_unit_card": "SG-WallBot 07 (86%)",
            "mockup_orders": 128,
            "mockup_bots": 24,
            "mockup_hubs": 7,
            "mockup_revenue_placeholder": "฿184K (UI Mockup Only)",
            "mockup_area_placeholder": "4,820 m² (UI Mockup Only)",
            "mockup_pricing_tiers": ["Solar ฿299", "Glass ฿259", "Facade ฿399", "Inspection ฿349"],
            "note": "Placeholder UI prototype values only; external repo edits require explicit owner approval.",
        },
        backend_base_url="http://127.0.0.1:8000",
    )


if __name__ == "__main__":
    import uvicorn  # type: ignore

    uvicorn.run(app, host="127.0.0.1", port=8000)
