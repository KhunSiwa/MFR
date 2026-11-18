#!/usr/bin/env python3
"""
MFR Work Planning, USB Webcam Capture, AI 06 Defect Mapping & Robot Control Router
---------------------------------------------------------------------------------
Mounts cleanly at `/api/mfr/*` on M7 FastAPI Backend without disturbing existing `/api/v1/*` routes.
Enforces strict safety isolation, simulation defaults, and human verification before decisions.
"""

from __future__ import annotations

import base64
import hashlib
import importlib
import json
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional

sys.dont_write_bytecode = True

import cv2
import numpy as np
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

THIS_DIR = Path(__file__).resolve().parent
M7_ROOT = THIS_DIR.parent
MFR_MASTER_ROOT = M7_ROOT.parent
HW_CODE_ROOT = MFR_MASTER_ROOT / "11 code for hard ware mfr"
if not HW_CODE_ROOT.exists():
    HW_CODE_ROOT = MFR_MASTER_ROOT.parent / "code for hard ware"
CV_ROOT = MFR_MASTER_ROOT / "06_AI_COMPUTER_VISION"
CAPTURES_DIR = (M7_ROOT / "database" / "captures").resolve()
CAPTURES_DIR.mkdir(parents=True, exist_ok=True)
SMOKE_SAMPLE = (CV_ROOT / "dataset_spec" / "smoke_fixture" / "images" / "test").resolve()

for _p in (str(M7_ROOT), str(CV_ROOT / "inference_api"), str(HW_CODE_ROOT)):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from cv_service import MFRVisionService  # noqa: E402
from database.db import get_db  # noqa: E402
from database.models import DefectDetectionRow, Inspection, ModelRegistry, Robot, SafetyEvent, TelemetryLog  # noqa: E402
from database.seed_work_planning import rebuild_building_panels  # noqa: E402
from database.work_planning_models import (  # noqa: E402
    Building,
    BuildingFacade,
    BuildingFloor,
    CapturedImage,
    CleaningTask,
    DefectLocation,
    FacadePanel,
    HardwareStatusRow,
    InspectionSession,
    WorkPlan,
)

USBWebcamService = importlib.import_module("Camera_System.usb_webcam_service").USBWebcamService
_harness_mod = importlib.import_module("Simulation.sim_robot_harness")
MFRRobotControlService = _harness_mod.MFRRobotControlService
_proto_mod = importlib.import_module("Communication.API_Protocol.robot_protocol")
CommandGuardError = _proto_mod.CommandGuardError
RobotMotionCommand = _proto_mod.RobotMotionCommand

router = APIRouter(prefix="/api/mfr", tags=["MFR Work Planning & Hardware"])

_vision_svc = MFRVisionService()
_webcam_svc = USBWebcamService(device_index=0)
_robot_svc = MFRRobotControlService(hardware_verified=False)

MARKER_COLOR_BY_STATE = {
    "Crack": "red",
    "Rust / corrosion": "orange",
    "Sealant deterioration": "yellow",
    "Water stain": "blue",
    "Normal surface": "green",
    "Unverified inspection point": "gray",
}


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _default_decision_for_defect(category: str) -> str:
    if category == "Crack":
        return "Repair required"
    if category == "Rust / corrosion":
        return "Human assessment required"
    if category in {"Sealant deterioration", "Water stain"}:
        return "Cleaning appropriate"
    return "Inspection required"


def _recommended_module_for_defect(category: str, mission_type: str) -> str:
    if category == "Crack":
        return "REPAIR_CREW_MANUAL"
    if mission_type == "CLEANING":
        return "CLEANER_L9110S"
    return "INSPECTION_CAM"


def _get_robot_and_model(db: Session):
    robot = db.execute(select(Robot).where(Robot.robot_code == "MFR-BASE-01")).scalar_one_or_none()
    model = db.execute(select(ModelRegistry).order_by(ModelRegistry.id.asc())).scalars().first()
    if robot is None or model is None:
        raise HTTPException(status_code=500, detail="Baseline MFR robot or model_registry not seeded.")
    return robot, model


def _annotate_png_bytes(raw: bytes, detections: List[Dict[str, Any]], label_header: str) -> bytes:
    arr = np.frombuffer(raw, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        return raw
    h, w = img.shape[:2]
    out = img.copy()
    color_bgr = {
        "Crack": (48, 48, 239),
        "Rust / corrosion": (22, 115, 249),
        "Sealant deterioration": (8, 179, 234),
        "Water stain": (246, 130, 59),
        "Normal surface": (94, 197, 34),
    }
    for det in detections:
        cname = det["class_name"]
        conf = float(det["confidence"])
        bb = det["bbox"]
        x0 = max(2, int((bb["cx"] - bb["w"] * 0.5) * w))
        y0 = max(2, int((bb["cy"] - bb["h"] * 0.5) * h))
        x1 = min(w - 2, int((bb["cx"] + bb["w"] * 0.5) * w))
        y1 = min(h - 2, int((bb["cy"] + bb["h"] * 0.5) * h))
        col = color_bgr.get(cname, (248, 189, 56))
        cv2.rectangle(out, (x0, y0), (x1, y1), col, max(2, min(4, w // 180)))
        txt = f"{cname} ({conf*100:.1f}% conf - ADVISORY)"
        cv2.rectangle(out, (x0, max(0, y0 - 24)), (min(w, x0 + len(txt) * 8 + 10), y0), col, -1)
        cv2.putText(out, txt, (x0 + 4, max(16, y0 - 6)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1, cv2.LINE_AA)

    cv2.rectangle(out, (0, h - 24), (w, h), (15, 23, 42), -1)
    cv2.putText(out, label_header[:90], (8, h - 7), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (251, 191, 36), 1, cv2.LINE_AA)
    ok, enc = cv2.imencode(".png", out)
    return enc.tobytes() if ok else raw


# ---------------- Schemas ----------------
class BuildingConfigureIn(BaseModel):
    floors_count: int = Field(..., ge=1, le=30)
    bays_per_floor: int = Field(..., ge=1, le=16)
    width_m: float = Field(..., ge=4.0, le=120.0)
    depth_m: float = Field(..., ge=4.0, le=120.0)
    floor_height_m: float = Field(..., ge=2.5, le=6.0)


class SessionStartIn(BaseModel):
    building_id: int = 1
    facade_code: str = "NORTH"
    operator_name: str = "Operator"
    notes: Optional[str] = None


class SessionStopIn(BaseModel):
    session_id: int


class CaptureRequestIn(BaseModel):
    session_id: Optional[int] = None
    building_id: int = 1
    panel_id: Optional[int] = None
    facade_code: str = "NORTH"
    floor_number: int = 1
    zone_code: Optional[str] = None
    position_mode: Literal["MANUAL_ASSIGNED", "ESTIMATED", "LOCALIZED"] = "MANUAL_ASSIGNED"
    est_x_m: Optional[float] = None
    est_y_m: Optional[float] = None
    est_z_m: Optional[float] = None
    sample_name: Optional[str] = None
    image_base64: Optional[str] = None
    allow_fallback: bool = True


class AnalyzeIn(BaseModel):
    capture_id: int


class DefectReviewIn(BaseModel):
    defect_location_id: int
    action: Literal["CONFIRM", "DISMISS", "MARK_NORMAL"]
    panel_id: Optional[int] = None
    est_x_m: Optional[float] = None
    est_y_m: Optional[float] = None
    est_z_m: Optional[float] = None
    decision_type: Optional[
        Literal["Inspection required", "Cleaning appropriate", "Repair required", "Human assessment required"]
    ] = None
    notes: Optional[str] = None
    reviewer_name: str = "Human Operator"
    auto_create_work_plan: bool = False


class WorkPlanCreateIn(BaseModel):
    building_id: int = 1
    facade_code: str = "NORTH"
    floor_number: int = Field(default=1, ge=1, le=50)
    zone_code: str = "ZONE-N1"
    panel_id: Optional[int] = None
    defect_location_id: Optional[int] = None
    mission_type: Literal["INSPECTION", "CLEANING"] = "INSPECTION"
    defect_type: str = "Pending Surface Check"
    decision_type: Literal[
        "Inspection required", "Cleaning appropriate", "Repair required", "Human assessment required"
    ] = "Inspection required"
    priority: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"] = "MEDIUM"
    assigned_module: Literal["INSPECTION_CAM", "CLEANER_L9110S", "REPAIR_CREW_MANUAL", "UNASSIGNED"] = "INSPECTION_CAM"
    estimated_duration_min: int = Field(default=20, ge=1, le=600)
    status: Literal[
        "Pending", "Planned", "Ready for review", "In progress", "Completed", "Requires human verification"
    ] = "Planned"
    human_approved: bool = False
    verification_notes: Optional[str] = None


class WorkPlanUpdateIn(BaseModel):
    priority: Optional[Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]] = None
    status: Optional[
        Literal["Pending", "Planned", "Ready for review", "In progress", "Completed", "Requires human verification"]
    ] = None
    assigned_module: Optional[Literal["INSPECTION_CAM", "CLEANER_L9110S", "REPAIR_CREW_MANUAL", "UNASSIGNED"]] = None
    estimated_duration_min: Optional[int] = Field(default=None, ge=1, le=600)
    mission_type: Optional[Literal["INSPECTION", "CLEANING"]] = None
    decision_type: Optional[
        Literal["Inspection required", "Cleaning appropriate", "Repair required", "Human assessment required"]
    ] = None
    human_approved: Optional[bool] = None
    verification_notes: Optional[str] = None


class CleanerCommandIn(BaseModel):
    work_plan_id: int
    action: Literal["START_SIMULATION", "STOP", "EMERGENCY_STOP"]
    duration_sec: float = Field(default=8.0, ge=1.0, le=15.0)
    human_approved: bool = False


# ---------------- Buildings & 3D Mapping Endpoints ----------------
@router.get("/buildings")
def list_buildings(db: Session = Depends(get_db)) -> Dict[str, Any]:
    rows = db.execute(select(Building).order_by(Building.id.asc())).scalars().all()
    out = []
    for b in rows:
        total_panels = db.execute(select(func.count(FacadePanel.id)).where(FacadePanel.building_id == b.id)).scalar_one()
        inspected_panels = db.execute(
            select(func.count(func.distinct(CapturedImage.panel_id))).where(CapturedImage.building_id == b.id)
        ).scalar_one()
        images_count = db.execute(select(func.count(CapturedImage.id)).where(CapturedImage.building_id == b.id)).scalar_one()
        defects_total = db.execute(
            select(func.count(DefectLocation.id)).where(
                DefectLocation.building_id == b.id,
                DefectLocation.defect_category != "Normal surface",
                DefectLocation.verification_status != "DISMISSED",
            )
        ).scalar_one()
        defects_confirmed = db.execute(
            select(func.count(DefectLocation.id)).where(
                DefectLocation.building_id == b.id,
                DefectLocation.verification_status == "CONFIRMED",
            )
        ).scalar_one()
        out.append({
            "id": b.id,
            "code": b.code,
            "name": b.name,
            "floors_count": b.floors_count,
            "bays_per_floor": b.bays_per_floor,
            "width_m": b.width_m,
            "depth_m": b.depth_m,
            "floor_height_m": b.floor_height_m,
            "is_simulated_geometry": b.is_simulated_geometry,
            "notes": b.notes,
            "progress": {
                "total_zones": int(total_panels),
                "completed_zones": int(inspected_panels),
                "pending_zones": max(0, int(total_panels) - int(inspected_panels)),
                "defects_detected": int(defects_total),
                "human_confirmed_defects": int(defects_confirmed),
                "images_collected": int(images_count),
            },
        })
    return {"items": out, "ai_notice": "NOT TRAINED / NOT EVALUATED ON REAL BUILDING IMAGES"}


@router.patch("/buildings/{building_id}")
def configure_building(building_id: int, payload: BuildingConfigureIn, db: Session = Depends(get_db)) -> Dict[str, Any]:
    b = db.execute(select(Building).where(Building.id == building_id)).scalar_one_or_none()
    if b is None:
        raise HTTPException(status_code=404, detail="Building not found.")
    captures_exist = db.execute(select(func.count(CapturedImage.id)).where(CapturedImage.building_id == building_id)).scalar_one()
    if captures_exist > 0:
        raise HTTPException(status_code=409, detail="Cannot rebuild facade panel grid while captured images reference existing panel IDs.")
    for f in db.execute(select(BuildingFacade).where(BuildingFacade.building_id == building_id)).scalars().all():
        db.delete(f)
    for fl in db.execute(select(BuildingFloor).where(BuildingFloor.building_id == building_id)).scalars().all():
        db.delete(fl)
    db.flush()
    b.floors_count = payload.floors_count
    b.bays_per_floor = payload.bays_per_floor
    b.width_m = payload.width_m
    b.depth_m = payload.depth_m
    b.floor_height_m = payload.floor_height_m
    n_panels = rebuild_building_panels(db, b)
    db.commit()
    return {"building_id": b.id, "panels_generated": n_panels}


@router.get("/buildings/{building_id}/facades")
def get_building_facades(building_id: int, db: Session = Depends(get_db)) -> Dict[str, Any]:
    b = db.execute(select(Building).where(Building.id == building_id)).scalar_one_or_none()
    if b is None:
        raise HTTPException(status_code=404, detail="Building not found.")
    facades = db.execute(select(BuildingFacade).where(BuildingFacade.building_id == building_id).order_by(BuildingFacade.id)).scalars().all()
    floors = db.execute(select(BuildingFloor).where(BuildingFloor.building_id == building_id).order_by(BuildingFloor.floor_number)).scalars().all()
    panels = db.execute(select(FacadePanel).where(FacadePanel.building_id == building_id).order_by(FacadePanel.id)).scalars().all()
    floor_by_id = {fl.id: fl.floor_number for fl in floors}
    face_by_id = {fc.id: fc.face_code for fc in facades}
    return {
        "building": {
            "id": b.id,
            "code": b.code,
            "name": b.name,
            "floors_count": b.floors_count,
            "bays_per_floor": b.bays_per_floor,
            "width_m": b.width_m,
            "depth_m": b.depth_m,
            "floor_height_m": b.floor_height_m,
            "is_simulated_geometry": b.is_simulated_geometry,
        },
        "facades": [{"id": f.id, "face_code": f.face_code, "label": f.label, "azimuth_deg": f.azimuth_deg, "width_m": f.width_m, "height_m": f.height_m} for f in facades],
        "floors": [{"id": fl.id, "floor_number": fl.floor_number, "label": fl.label, "elevation_m": fl.elevation_m, "height_m": fl.height_m} for fl in floors],
        "panels": [
            {
                "id": p.id,
                "panel_code": p.panel_code,
                "zone_code": p.zone_code,
                "face_code": face_by_id[p.facade_id],
                "floor_number": floor_by_id[p.floor_id],
                "col_index": p.col_index,
                "x_m": p.x_m,
                "y_m": p.y_m,
                "z_m": p.z_m,
                "width_m": p.width_m,
                "height_m": p.height_m,
            }
            for p in panels
        ],
    }


# ---------------- Camera & Inspection Session Endpoints ----------------
@router.get("/camera/status")
def camera_status() -> Dict[str, Any]:
    return {**_webcam_svc.status(), "host_connection": "COMPUTER_USB_UVC_HOST"}


@router.post("/camera/probe")
def camera_probe(db: Session = Depends(get_db)) -> Dict[str, Any]:
    devices = _webcam_svc.probe_devices()
    row = db.execute(
        select(HardwareStatusRow).where(
            HardwareStatusRow.robot_code == "MFR-BASE-01",
            HardwareStatusRow.component_name == "USB_WEBCAM_HOST",
        )
    ).scalar_one_or_none()
    if row:
        row.verification_state = "CONNECTED_HOST_PC" if devices else "DISCONNECTED"
        row.details_json = json.dumps({"probed_devices": devices, "checked_at": _utc_now().isoformat()})
        row.updated_at = _utc_now()
        db.commit()
    return {"devices": devices, "connected": len(devices) > 0}


@router.get("/inspection/sessions")
def list_sessions(db: Session = Depends(get_db)) -> Dict[str, Any]:
    rows = db.execute(select(InspectionSession).order_by(desc(InspectionSession.id)).limit(40)).scalars().all()
    items = []
    for s in rows:
        caps = db.execute(select(func.count(CapturedImage.id)).where(CapturedImage.session_id == s.id)).scalar_one()
        items.append({
            "id": s.id,
            "session_code": s.session_code,
            "building_id": s.building_id,
            "facade_code": s.facade_code,
            "operator_name": s.operator_name,
            "camera_source": s.camera_source,
            "status": s.status,
            "captures_count": int(caps),
            "started_at": s.started_at,
            "ended_at": s.ended_at,
            "notes": s.notes,
        })
    return {"items": items}


@router.post("/inspection/start")
def start_session(payload: SessionStartIn, db: Session = Depends(get_db)) -> Dict[str, Any]:
    b = db.execute(select(Building).where(Building.id == payload.building_id)).scalar_one_or_none()
    if b is None:
        raise HTTPException(status_code=404, detail="Building not found.")
    code = f"INSP-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}-{uuid.uuid4().hex[:4].upper()}"
    sess = InspectionSession(
        session_code=code,
        building_id=b.id,
        facade_code=payload.facade_code.upper(),
        operator_name=payload.operator_name,
        camera_source="HOST_WEBCAM_OR_UPLOAD",
        status="ACTIVE",
        notes=payload.notes,
    )
    db.add(sess)
    db.commit()
    db.refresh(sess)
    return {"session_id": sess.id, "session_code": sess.session_code, "status": sess.status, "started_at": sess.started_at}


@router.post("/inspection/stop")
def stop_session(payload: SessionStopIn, db: Session = Depends(get_db)) -> Dict[str, Any]:
    sess = db.execute(select(InspectionSession).where(InspectionSession.id == payload.session_id)).scalar_one_or_none()
    if sess is None:
        raise HTTPException(status_code=404, detail="Session not found.")
    sess.status = "STOPPED"
    sess.ended_at = _utc_now()
    db.commit()
    return {"session_id": sess.id, "status": sess.status, "ended_at": sess.ended_at}


def _resolve_panel(db: Session, building_id: int, panel_id: Optional[int], facade_code: str, floor_number: int) -> FacadePanel:
    if panel_id is not None:
        p = db.execute(select(FacadePanel).where(FacadePanel.id == panel_id, FacadePanel.building_id == building_id)).scalar_one_or_none()
        if p:
            return p
    f = db.execute(
        select(BuildingFacade).where(BuildingFacade.building_id == building_id, BuildingFacade.face_code == facade_code.upper())
    ).scalar_one_or_none()
    fl = db.execute(
        select(BuildingFloor).where(BuildingFloor.building_id == building_id, BuildingFloor.floor_number == floor_number)
    ).scalar_one_or_none()
    if f and fl:
        p = db.execute(select(FacadePanel).where(FacadePanel.facade_id == f.id, FacadePanel.floor_id == fl.id)).scalars().first()
        if p:
            return p
    p = db.execute(select(FacadePanel).where(FacadePanel.building_id == building_id)).scalars().first()
    if p is None:
        raise HTTPException(status_code=404, detail="No panels configured for building.")
    return p


@router.post("/inspection/capture")
def capture_inspection_image(payload: CaptureRequestIn, db: Session = Depends(get_db)) -> Dict[str, Any]:
    # Ensure active or newly created sequential session
    if payload.session_id is not None:
        sess = db.execute(select(InspectionSession).where(InspectionSession.id == payload.session_id)).scalar_one_or_none()
        if sess is None:
            raise HTTPException(status_code=404, detail="Inspection session not found.")
    else:
        code = f"INSP-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}-{uuid.uuid4().hex[:4].upper()}"
        sess = InspectionSession(
            session_code=code,
            building_id=payload.building_id,
            facade_code=payload.facade_code.upper(),
            operator_name="Operator",
            camera_source="HOST_WEBCAM_OR_UPLOAD",
            status="ACTIVE",
        )
        db.add(sess)
        db.flush()

    panel = _resolve_panel(db, payload.building_id, payload.panel_id, payload.facade_code, payload.floor_number)
    facade = db.execute(select(BuildingFacade).where(BuildingFacade.id == panel.facade_id)).scalar_one()
    floor = db.execute(select(BuildingFloor).where(BuildingFloor.id == panel.floor_id)).scalar_one()

    # Source 1: Browser webcam base64 snapshot
    if payload.image_base64:
        b64 = payload.image_base64.split(",", 1)[-1]
        try:
            raw = base64.b64decode(b64)
            arr = np.frombuffer(raw, dtype=np.uint8)
            img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
            if img is None:
                raise ValueError("Invalid image bytes")
            h, w = img.shape[:2]
            cam_src = "BROWSER_USB_WEBCAM"
            sha = hashlib.sha256(raw).hexdigest()
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=400, detail=f"Failed to decode camera snapshot: {exc}") from exc
    else:
        # Source 2: Optional smoke fixture sample OR live OpenCV host USB webcam
        fallback_path: Optional[Path] = None
        if payload.sample_name and SMOKE_SAMPLE.exists():
            cand = (SMOKE_SAMPLE / Path(payload.sample_name).name).resolve()
            if cand.exists():
                fallback_path = cand
        elif SMOKE_SAMPLE.exists():
            # Pick deterministic sample image when webcam hardware is disconnected cleanly
            samples = sorted(SMOKE_SAMPLE.glob("*.png"))
            if samples:
                fallback_path = samples[(panel.id - 1) % len(samples)]

        cap_res = _webcam_svc.capture_frame_bytes(fallback_image_path=fallback_path, allow_fallback=payload.allow_fallback)
        raw = cap_res["bytes"]
        w, h = cap_res["width"], cap_res["height"]
        cam_src = cap_res["source_kind"]
        sha = cap_res["sha256"]

    fname = f"orig_{uuid.uuid4().hex[:12]}.png"
    (CAPTURES_DIR / fname).write_bytes(raw)
    sess.camera_source = cam_src

    cap_row = CapturedImage(
        session_id=sess.id,
        building_id=payload.building_id,
        facade_code=facade.face_code,
        floor_number=floor.floor_number,
        panel_id=panel.id,
        zone_code=payload.zone_code or panel.zone_code,
        original_rel_path=fname,
        camera_source=cam_src,
        position_mode=payload.position_mode,
        est_x_m=payload.est_x_m if payload.est_x_m is not None else panel.x_m,
        est_y_m=payload.est_y_m if payload.est_y_m is not None else panel.y_m,
        est_z_m=payload.est_z_m if payload.est_z_m is not None else panel.z_m,
        image_width=w,
        image_height=h,
        input_sha256=sha,
    )
    db.add(cap_row)
    db.commit()
    db.refresh(cap_row)

    return {
        "capture_id": cap_row.id,
        "session_id": sess.id,
        "session_code": sess.session_code,
        "panel_id": panel.id,
        "panel_code": panel.panel_code,
        "facade_code": facade.face_code,
        "floor_number": floor.floor_number,
        "zone_code": cap_row.zone_code,
        "position_mode": cap_row.position_mode,
        "camera_source": cap_row.camera_source,
        "est_position_m": [cap_row.est_x_m, cap_row.est_y_m, cap_row.est_z_m],
        "captured_at": cap_row.captured_at,
        "original_url": f"/api/mfr/media/{cap_row.id}/original",
    }


@router.post("/inspection/analyze")
def analyze_capture(payload: AnalyzeIn, db: Session = Depends(get_db)) -> Dict[str, Any]:
    cap = db.execute(select(CapturedImage).where(CapturedImage.id == payload.capture_id)).scalar_one_or_none()
    if cap is None:
        raise HTTPException(status_code=404, detail="Captured image record not found.")

    orig_file = (CAPTURES_DIR / cap.original_rel_path).resolve()
    if not orig_file.exists():
        raise HTTPException(status_code=404, detail="Original image file missing from storage.")
    raw = orig_file.read_bytes()

    robot, model = _get_robot_and_model(db)
    panel = db.execute(select(FacadePanel).where(FacadePanel.id == cap.panel_id)).scalar_one()

    pred = _vision_svc.predict_bytes(raw, source_name=cap.original_rel_path)
    src_type = "SMOKE_FIXTURE" if "FIXTURE" in cap.camera_source else "UPLOAD"
    insp = Inspection(
        robot_id=robot.id,
        model_id=model.id,
        source_type=src_type,
        source_name=cap.original_rel_path,
        input_sha256=pred.input_sha256,
        image_width=pred.image_size[0],
        image_height=pred.image_size[1],
        inference_ms=pred.inference_ms,
        model_tier=pred.model_tier,
        real_dataset_trained=False,
        advisory_only=True,
        safety_actuation_allowed=False,
        disclaimer="NOT TRAINED / NOT EVALUATED ON REAL BUILDING IMAGES",
        class_probabilities_json=json.dumps(pred.class_probabilities),
        operator_review_status="PENDING_HUMAN_REVIEW",
    )
    db.add(insp)
    db.flush()

    det_payloads = [d.model_dump() for d in pred.detections]
    ann_bytes = _annotate_png_bytes(
        raw,
        det_payloads,
        "AI 06 ADVISORY ONLY - NOT TRAINED / NOT EVALUATED ON REAL BUILDING IMAGES",
    )
    ann_name = f"ann_{cap.id}_{uuid.uuid4().hex[:8]}.png"
    (CAPTURES_DIR / ann_name).write_bytes(ann_bytes)
    cap.annotated_rel_path = ann_name
    cap.inspection_id = insp.id

    created_markers = []
    for d in pred.detections:
        det_row = DefectDetectionRow(
            inspection_id=insp.id,
            class_id=d.class_id,
            class_name=d.class_name,
            confidence=d.confidence,
            bbox_cx=d.bbox.cx,
            bbox_cy=d.bbox.cy,
            bbox_w=d.bbox.w,
            bbox_h=d.bbox.h,
            advisory_only=True,
        )
        db.add(det_row)
        db.flush()

        loc = DefectLocation(
            building_id=cap.building_id,
            facade_code=cap.facade_code,
            floor_number=cap.floor_number,
            panel_id=cap.panel_id,
            panel_code=panel.panel_code,
            zone_code=cap.zone_code,
            captured_image_id=cap.id,
            inspection_id=insp.id,
            defect_category=d.class_name,
            confidence=d.confidence,
            advisory_only=True,
            verification_status="UNVERIFIED",
            decision_type=_default_decision_for_defect(d.class_name),
            position_mode=cap.position_mode,
            marker_x_m=cap.est_x_m,
            marker_y_m=cap.est_y_m,
            marker_z_m=cap.est_z_m,
            notes=f"AI 06 advisory detection ({cap.camera_source}); requires human verification.",
        )
        db.add(loc)
        db.flush()
        created_markers.append(loc)

    db.commit()

    return {
        "capture_id": cap.id,
        "inspection_id": insp.id,
        "advisory_only": True,
        "safety_actuation_allowed": False,
        "real_dataset_trained": False,
        "disclaimer": "NOT TRAINED / NOT EVALUATED ON REAL BUILDING IMAGES",
        "inference_ms": pred.inference_ms,
        "class_probabilities": pred.class_probabilities,
        "original_url": f"/api/mfr/media/{cap.id}/original",
        "annotated_url": f"/api/mfr/media/{cap.id}/annotated",
        "markers": [
            {
                "id": m.id,
                "panel_code": m.panel_code,
                "defect_category": m.defect_category,
                "confidence": m.confidence,
                "verification_status": m.verification_status,
                "decision_type": m.decision_type,
                "marker_color": "gray",
            }
            for m in created_markers
        ],
    }


@router.post("/inspection/review")
def review_defect_location(payload: DefectReviewIn, db: Session = Depends(get_db)) -> Dict[str, Any]:
    loc = db.execute(select(DefectLocation).where(DefectLocation.id == payload.defect_location_id)).scalar_one_or_none()
    if loc is None:
        raise HTTPException(status_code=404, detail="Defect marker not found.")

    if payload.panel_id is not None:
        new_panel = db.execute(select(FacadePanel).where(FacadePanel.id == payload.panel_id)).scalar_one_or_none()
        if new_panel is None:
            raise HTTPException(status_code=404, detail="Target facade panel not found.")
        f = db.execute(select(BuildingFacade).where(BuildingFacade.id == new_panel.facade_id)).scalar_one()
        fl = db.execute(select(BuildingFloor).where(BuildingFloor.id == new_panel.floor_id)).scalar_one()
        loc.panel_id = new_panel.id
        loc.panel_code = new_panel.panel_code
        loc.zone_code = new_panel.zone_code
        loc.facade_code = f.face_code
        loc.floor_number = fl.floor_number
        loc.marker_x_m = payload.est_x_m if payload.est_x_m is not None else new_panel.x_m
        loc.marker_y_m = payload.est_y_m if payload.est_y_m is not None else new_panel.y_m
        loc.marker_z_m = payload.est_z_m if payload.est_z_m is not None else new_panel.z_m
        loc.position_mode = "MANUAL_ASSIGNED"
    elif payload.est_x_m is not None or payload.est_y_m is not None or payload.est_z_m is not None:
        if payload.est_x_m is not None:
            loc.marker_x_m = payload.est_x_m
        if payload.est_y_m is not None:
            loc.marker_y_m = payload.est_y_m
        if payload.est_z_m is not None:
            loc.marker_z_m = payload.est_z_m
        loc.position_mode = "MANUAL_ASSIGNED"

    if payload.decision_type is not None:
        if loc.defect_category == "Crack" and payload.decision_type == "Cleaning appropriate":
            raise HTTPException(
                status_code=400,
                detail="Safety rule: Structural 'Crack' defects cannot be classified as 'Cleaning appropriate'. Select 'Repair required' or 'Human assessment required'.",
            )
        loc.decision_type = payload.decision_type

    if payload.action == "CONFIRM":
        loc.verification_status = "CONFIRMED"
        insp_status = "CONFIRMED"
    elif payload.action == "DISMISS":
        loc.verification_status = "DISMISSED"
        insp_status = "DISMISSED"
    else:
        loc.verification_status = "NORMAL_VERIFIED"
        loc.defect_category = "Normal surface"
        loc.decision_type = "Inspection required"
        insp_status = "CONFIRMED"

    loc.verified_by = payload.reviewer_name
    loc.verified_at = _utc_now()
    if payload.notes is not None:
        loc.notes = payload.notes

    insp = db.execute(select(Inspection).where(Inspection.id == loc.inspection_id)).scalar_one_or_none()
    if insp:
        insp.operator_review_status = insp_status

    created_plan = None
    if payload.auto_create_work_plan and loc.verification_status == "CONFIRMED":
        mission_type = "CLEANING" if loc.decision_type == "Cleaning appropriate" else "INSPECTION"
        if loc.defect_category == "Crack":
            mission_type = "INSPECTION"
        task_code = f"WP-{loc.facade_code[0]}{loc.floor_number:02d}-{uuid.uuid4().hex[:5].upper()}"
        wp = WorkPlan(
            task_code=task_code,
            building_id=loc.building_id,
            facade_code=loc.facade_code,
            floor_number=loc.floor_number,
            zone_code=loc.zone_code,
            panel_id=loc.panel_id,
            defect_location_id=loc.id,
            mission_type=mission_type,
            defect_type=loc.defect_category,
            decision_type=loc.decision_type,
            priority="HIGH" if loc.defect_category == "Crack" else "MEDIUM",
            assigned_module=_recommended_module_for_defect(loc.defect_category, mission_type),
            estimated_duration_min=25 if mission_type == "CLEANING" else 15,
            status="Planned" if mission_type == "INSPECTION" else "Ready for review",
            human_approved=False,
            verification_notes=loc.notes or f"Created from human review of defect #{loc.id}",
        )
        db.add(wp)
        db.flush()
        created_plan = wp.task_code

    db.commit()
    return {
        "defect_location_id": loc.id,
        "verification_status": loc.verification_status,
        "decision_type": loc.decision_type,
        "panel_code": loc.panel_code,
        "auto_created_work_plan": created_plan,
    }


@router.get("/defects")
def list_defects(building_id: Optional[int] = Query(default=None), db: Session = Depends(get_db)) -> Dict[str, Any]:
    stmt = select(DefectLocation).order_by(desc(DefectLocation.id))
    if building_id is not None:
        stmt = stmt.where(DefectLocation.building_id == building_id)
    rows = db.execute(stmt).scalars().all()
    items = []
    for d in rows:
        cap = db.execute(select(CapturedImage).where(CapturedImage.id == d.captured_image_id)).scalar_one_or_none()
        if d.verification_status == "UNVERIFIED":
            color = "gray"
        elif d.verification_status == "NORMAL_VERIFIED" or d.defect_category == "Normal surface":
            color = "green"
        else:
            color = MARKER_COLOR_BY_STATE.get(d.defect_category, "gray")
        items.append({
            "id": d.id,
            "building_id": d.building_id,
            "facade_code": d.facade_code,
            "floor_number": d.floor_number,
            "panel_id": d.panel_id,
            "panel_code": d.panel_code,
            "zone_code": d.zone_code,
            "captured_image_id": d.captured_image_id,
            "inspection_id": d.inspection_id,
            "defect_category": d.defect_category,
            "confidence": round(d.confidence, 4),
            "advisory_only": True,
            "verification_status": d.verification_status,
            "decision_type": d.decision_type,
            "marker_color": color,
            "position_mode": d.position_mode,
            "marker_position_m": [d.marker_x_m, d.marker_y_m, d.marker_z_m],
            "notes": d.notes,
            "verified_by": d.verified_by,
            "verified_at": d.verified_at,
            "inspected_at": cap.captured_at if cap else d.created_at,
            "camera_source": cap.camera_source if cap else "UNKNOWN",
            "original_url": f"/api/mfr/media/{d.captured_image_id}/original",
            "annotated_url": f"/api/mfr/media/{d.captured_image_id}/annotated",
        })
    return {"total": len(items), "items": items}


@router.get("/media/{capture_id}/{kind}")
def get_capture_media(capture_id: int, kind: Literal["original", "annotated"], db: Session = Depends(get_db)):
    cap = db.execute(select(CapturedImage).where(CapturedImage.id == capture_id)).scalar_one_or_none()
    if cap is None:
        raise HTTPException(status_code=404, detail="Capture not found.")
    rel = cap.original_rel_path if kind == "original" else (cap.annotated_rel_path or cap.original_rel_path)
    target = (CAPTURES_DIR / Path(rel).name).resolve()
    if not target.exists() or target.parent != CAPTURES_DIR:
        raise HTTPException(status_code=404, detail="Image artifact missing.")
    return FileResponse(target, media_type="image/png")


# ---------------- Work Planning & Cleaner Mission Endpoints ----------------
@router.get("/work-plans")
def list_work_plans(building_id: Optional[int] = Query(default=None), db: Session = Depends(get_db)) -> Dict[str, Any]:
    stmt = select(WorkPlan).order_by(desc(WorkPlan.id))
    if building_id is not None:
        stmt = stmt.where(WorkPlan.building_id == building_id)
    rows = db.execute(stmt).scalars().all()
    items = [
        {
            "id": w.id,
            "task_code": w.task_code,
            "building_id": w.building_id,
            "facade_code": w.facade_code,
            "floor_number": w.floor_number,
            "zone_code": w.zone_code,
            "panel_id": w.panel_id,
            "defect_location_id": w.defect_location_id,
            "mission_type": w.mission_type,
            "defect_type": w.defect_type,
            "decision_type": w.decision_type,
            "priority": w.priority,
            "assigned_module": w.assigned_module,
            "estimated_duration_min": w.estimated_duration_min,
            "status": w.status,
            "human_approved": w.human_approved,
            "verification_notes": w.verification_notes,
            "created_at": w.created_at,
            "updated_at": w.updated_at,
        }
        for w in rows
    ]
    return {"total": len(items), "items": items}


@router.post("/work-plans", status_code=201)
def create_work_plan(payload: WorkPlanCreateIn, db: Session = Depends(get_db)) -> Dict[str, Any]:
    if "crack" in payload.defect_type.lower() and payload.mission_type == "CLEANING":
        raise HTTPException(
            status_code=400,
            detail="Safety rule: Structural 'Crack' tasks cannot be assigned as CLEANING missions. Assign INSPECTION or REPAIR_CREW_MANUAL.",
        )
    if payload.mission_type == "CLEANING" and payload.decision_type == "Repair required":
        raise HTTPException(status_code=400, detail="Tasks marked 'Repair required' cannot run CLEANING missions.")

    code = f"WP-{payload.facade_code[0].upper()}{payload.floor_number:02d}-{uuid.uuid4().hex[:5].upper()}"
    wp = WorkPlan(
        task_code=code,
        building_id=payload.building_id,
        facade_code=payload.facade_code.upper(),
        floor_number=payload.floor_number,
        zone_code=payload.zone_code,
        panel_id=payload.panel_id,
        defect_location_id=payload.defect_location_id,
        mission_type=payload.mission_type,
        defect_type=payload.defect_type,
        decision_type=payload.decision_type,
        priority=payload.priority,
        assigned_module=payload.assigned_module,
        estimated_duration_min=payload.estimated_duration_min,
        status=payload.status,
        human_approved=payload.human_approved,
        verification_notes=payload.verification_notes,
    )
    db.add(wp)
    db.commit()
    db.refresh(wp)
    return {"id": wp.id, "task_code": wp.task_code, "status": wp.status, "mission_type": wp.mission_type}


@router.patch("/work-plans/{plan_id}")
def update_work_plan(plan_id: int, payload: WorkPlanUpdateIn, db: Session = Depends(get_db)) -> Dict[str, Any]:
    wp = db.execute(select(WorkPlan).where(WorkPlan.id == plan_id)).scalar_one_or_none()
    if wp is None:
        raise HTTPException(status_code=404, detail="Work plan not found.")

    next_mission = payload.mission_type or wp.mission_type
    next_decision = payload.decision_type or wp.decision_type
    if "crack" in wp.defect_type.lower() and next_mission == "CLEANING":
        raise HTTPException(status_code=400, detail="Safety rule: Structural cracks cannot be converted to CLEANING missions.")
    if next_mission == "CLEANING" and next_decision == "Repair required":
        raise HTTPException(status_code=400, detail="Repair-required tasks cannot use CLEANING mission.")

    for field in ("priority", "status", "assigned_module", "estimated_duration_min", "mission_type", "decision_type", "human_approved", "verification_notes"):
        val = getattr(payload, field)
        if val is not None:
            setattr(wp, field, val)
    wp.updated_at = _utc_now()
    db.commit()
    return {"id": wp.id, "task_code": wp.task_code, "status": wp.status, "priority": wp.priority, "human_approved": wp.human_approved}


@router.post("/cleaner/control")
def control_cleaner_task(payload: CleanerCommandIn, db: Session = Depends(get_db)) -> Dict[str, Any]:
    wp = db.execute(select(WorkPlan).where(WorkPlan.id == payload.work_plan_id)).scalar_one_or_none()
    if wp is None:
        raise HTTPException(status_code=404, detail="Work plan not found.")

    if payload.action == "EMERGENCY_STOP":
        st = _robot_svc.pump.emergency_stop()
        db.add(
            CleaningTask(
                work_plan_id=wp.id,
                panel_id=wp.panel_id,
                cleaner_state="PUMP_OFF",
                simulation_mode=True,
                human_approved=False,
                max_duration_sec=payload.duration_sec,
                path_summary="Emergency Stop halted cleaner module.",
            )
        )
        db.commit()
        return {"cleaner": st, "work_plan_id": wp.id}

    if payload.action == "STOP":
        st = _robot_svc.pump.stop(completed=True)
        wp.status = "Completed"
        wp.updated_at = _utc_now()
        db.add(
            CleaningTask(
                work_plan_id=wp.id,
                panel_id=wp.panel_id,
                cleaner_state=st["state"],
                simulation_mode=True,
                human_approved=wp.human_approved,
                max_duration_sec=payload.duration_sec,
                path_summary=f"Manual stop on {wp.facade_code} F{wp.floor_number} {wp.zone_code}",
            )
        )
        db.commit()
        return {"cleaner": st, "work_plan_id": wp.id}

    decision_enum = wp.decision_type.upper().replace(" ", "_")
    try:
        st = _robot_svc.pump.start_cleaning(
            task_id=wp.task_code,
            human_approved=payload.human_approved,
            defect_decision_type=decision_enum,
            duration_sec=payload.duration_sec,
        )
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except (RuntimeError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    wp.human_approved = True
    wp.status = "In progress"
    wp.updated_at = _utc_now()
    path = f"Vertical raster pass on {wp.facade_code} Floor {wp.floor_number} ({wp.zone_code}), max {payload.duration_sec:.1f}s [SIMULATION]"
    db.add(
        CleaningTask(
            work_plan_id=wp.id,
            panel_id=wp.panel_id,
            cleaner_state=st["state"],
            simulation_mode=st["simulation_mode"],
            human_approved=True,
            max_duration_sec=payload.duration_sec,
            path_summary=path,
        )
    )
    db.commit()
    return {"cleaner": st, "path_summary": path, "work_plan_id": wp.id}


# ---------------- Controlled ESP32-S3 Robot Telemetry & Commands ----------------
@router.get("/robot/hardware-status")
def get_hardware_status(db: Session = Depends(get_db)) -> Dict[str, Any]:
    _robot_svc.check_watchdog_tick()
    rows = db.execute(select(HardwareStatusRow).order_by(HardwareStatusRow.id)).scalars().all()
    return {
        "live_hal": _robot_svc.hardware_status(),
        "camera": _webcam_svc.status(),
        "inventory_audit": [
            {
                "component": r.component_name,
                "verification_state": r.verification_state,
                "simulation_mode": r.simulation_mode,
                "estop_engaged": r.estop_engaged,
                "details": json.loads(r.details_json),
            }
            for r in rows
        ],
    }


@router.post("/robot/telemetry")
def post_robot_telemetry(payload: Dict[str, Any], db: Session = Depends(get_db)) -> Dict[str, Any]:
    robot, _ = _get_robot_and_model(db)
    src = str(payload.get("telemetry_source", "SIMULATED_MOCK"))
    if src not in {"SIMULATED_MOCK", "LIVE_BENCH", "UNCONNECTED"}:
        src = "SIMULATED_MOCK"
    state = str(payload.get("system_state", "NORMAL"))
    if state not in {"NORMAL", "CAMERA_DISCONNECTED", "COMMUNICATION_FAILURE", "SENSOR_FAILURE", "MOTOR_FAULT", "E_STOP", "UNCONNECTED"}:
        state = "NORMAL"

    entry = TelemetryLog(
        robot_id=robot.id,
        telemetry_source=src,
        system_state=state,
        surface_mode="HORIZONTAL_GROUND_ONLY",
        battery_voltage_v=payload.get("battery_voltage_v"),
        wheel_rpm_avg=payload.get("wheel_rpm_avg"),
        wifi_rssi_dbm=payload.get("wifi_rssi_dbm"),
        camera_link_ok=bool(payload.get("camera_link_ok", False)),
        hardware_estop_engaged=bool(payload.get("hardware_estop_engaged", True)),
        ai_safety_control_enabled=False,
        estop_override_allowed=False,
        note=payload.get("note"),
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return {"telemetry_id": entry.id, "telemetry_source": entry.telemetry_source, "system_state": entry.system_state}


@router.post("/robot/command")
def post_robot_command(payload: RobotMotionCommand, db: Session = Depends(get_db)) -> Dict[str, Any]:
    robot, _ = _get_robot_and_model(db)
    try:
        res = _robot_svc.execute_command(payload)
    except CommandGuardError as exc:
        db.add(
            SafetyEvent(
                robot_id=robot.id,
                event_type="ROBOT_COMMAND_BLOCKED",
                severity="BLOCKED_403",
                source_component=f"POST /api/mfr/robot/command ({payload.source_layer})",
                blocked_by_policy=True,
                hardware_estop_independent=True,
                description=str(exc),
            )
        )
        db.commit()
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    # Update telemetry snapshot cleanly inside DB
    hw = res["hardware"]
    db.add(
        TelemetryLog(
            robot_id=robot.id,
            telemetry_source="SIMULATED_MOCK" if hw["simulation_mode"] else "LIVE_BENCH",
            system_state="E_STOP" if hw["estop_engaged"] else "NORMAL",
            surface_mode="HORIZONTAL_GROUND_ONLY",
            wheel_rpm_avg=float(abs(hw["driving_system"]["left_pct"]) + abs(hw["driving_system"]["right_pct"])) * 0.6,
            camera_link_ok=_webcam_svc.connected,
            hardware_estop_engaged=hw["estop_engaged"],
            ai_safety_control_enabled=False,
            estop_override_allowed=False,
            note=f"Command executed via backend HAL: {payload.command} (physical_armed={hw['physical_outputs_armed']})",
        )
    )
    db.commit()
    return res


@router.get("/hardware/files")
def list_hardware_code_files() -> Dict[str, Any]:
    """List verified source files and docs inside `MFR_MASTER/11 code for hard ware mfr/`."""
    if not HW_CODE_ROOT.exists():
        return {"root": str(HW_CODE_ROOT), "exists": False, "count": 0, "files": []}
    files = []
    for p in sorted(HW_CODE_ROOT.rglob("*")):
        if p.is_file() and "__pycache__" not in p.parts:
            rel = p.relative_to(HW_CODE_ROOT).as_posix()
            files.append({"path": rel, "size_bytes": p.stat().st_size, "category": rel.split("/", 1)[0]})
    return {"root": str(HW_CODE_ROOT), "exists": True, "count": len(files), "files": files}
