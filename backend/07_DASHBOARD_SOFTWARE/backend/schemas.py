#!/usr/bin/env python3
"""
MFR Module Facade Rover — Pydantic v2 API Schemas (M7 Backend)
---------------------------------------------------------------
Enforces strict truthfulness invariants and hard hardware safety isolation:
  - advisory_only = True, safety_actuation_allowed = False
  - ai_safety_control_enabled = False, estop_override_allowed = False
  - telemetry_source segregated: SIMULATED_MOCK | LIVE_BENCH | UNCONNECTED
"""

from __future__ import annotations

import sys
from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

sys.dont_write_bytecode = True

from pydantic import BaseModel, ConfigDict, Field


class HealthOut(BaseModel):
    status: str
    service: str
    database_connected: bool
    database_dialect: str
    cv_model_loaded: bool
    weights_sha256: str
    model_tier: str
    real_dataset_trained: bool
    is_real_facade_evaluated: bool
    advisory_only: bool = True
    safety_actuation_allowed: bool = False
    ai_safety_control_enabled: bool = False
    estop_override_allowed: bool = False
    disclaimer: str


class ModelStatusOut(BaseModel):
    model_name: str
    model_version: str
    model_tier: str
    real_dataset_trained: bool
    is_real_facade_evaluated: bool
    real_facade_status: str
    weights_sha256: str
    taxonomy: Dict[str, str]
    input_size: List[int]
    smoke_test_metrics: Optional[Dict[str, Any]] = None
    host_inference_latency: Optional[Dict[str, Any]] = None
    advisory_only: bool = True
    safety_actuation_allowed: bool = False
    disclaimer: str
    model_card_path: str


class RobotOut(BaseModel):
    id: int
    robot_code: str
    name: str
    status: str
    cad_length_mm: float
    cad_width_mm: float
    cad_height_mm: float
    wheelbase_mm: float
    vertical_glass_certified: bool = False
    ai_safety_control_enabled: bool = False
    estop_override_allowed: bool = False
    notes: Optional[str] = None
    created_at: datetime


class BoundingBoxOut(BaseModel):
    cx: float = Field(..., ge=0.0, le=1.0)
    cy: float = Field(..., ge=0.0, le=1.0)
    w: float = Field(..., ge=0.0, le=1.0)
    h: float = Field(..., ge=0.0, le=1.0)


class DefectDetectionOut(BaseModel):
    id: int
    class_id: int = Field(..., ge=0, le=4)
    class_name: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    bbox: BoundingBoxOut
    advisory_only: bool = True


class InspectionOut(BaseModel):
    inspection_id: int
    robot_code: str
    model_name: str
    source_type: str
    source_name: str
    input_sha256: str
    image_size: List[int]
    inference_ms: float
    model_tier: str
    real_dataset_trained: bool
    is_real_facade_evaluated: bool
    advisory_only: bool = True
    safety_actuation_allowed: bool = False
    disclaimer: str
    operator_review_status: str
    class_probabilities: Dict[str, float]
    detections: List[DefectDetectionOut]
    created_at: datetime


class InspectionListOut(BaseModel):
    total_count: int
    items: List[InspectionOut]


class InspectionReviewIn(BaseModel):
    operator_review_status: Literal["PENDING_HUMAN_REVIEW", "CONFIRMED", "DISMISSED"]


class TelemetryCreateIn(BaseModel):
    """Telemetry ingest payload with explicit safety-override detection fields."""

    model_config = ConfigDict(extra="allow")

    robot_code: str = "MFR-BASE-01"
    telemetry_source: str = Field(..., description="Must be SIMULATED_MOCK, LIVE_BENCH, or UNCONNECTED")
    system_state: str = Field(..., description="NORMAL, CAMERA_DISCONNECTED, COMMUNICATION_FAILURE, SENSOR_FAILURE, MOTOR_FAULT, E_STOP, UNCONNECTED")
    surface_mode: str = "HORIZONTAL_GROUND_ONLY"
    battery_voltage_v: Optional[float] = Field(default=None, ge=0.0, le=60.0)
    wheel_rpm_avg: Optional[float] = Field(default=None, ge=-500.0, le=500.0)
    wifi_rssi_dbm: Optional[int] = Field(default=None, ge=-120, le=0)
    camera_link_ok: bool = False
    hardware_estop_engaged: bool = True
    note: Optional[str] = None
    # Explicit trap fields to detect and reject any forbidden safety-bypass attempt with HTTP 403/422
    ai_safety_override: Optional[bool] = None
    estop_override: Optional[bool] = None
    tether_release: Optional[bool] = None
    vertical_glass_autonomous: Optional[bool] = None


class TelemetryOut(BaseModel):
    id: int
    robot_code: str
    telemetry_source: str
    system_state: str
    surface_mode: str
    battery_voltage_v: Optional[float] = None
    wheel_rpm_avg: Optional[float] = None
    wifi_rssi_dbm: Optional[int] = None
    camera_link_ok: bool
    hardware_estop_engaged: bool
    ai_safety_control_enabled: bool = False
    estop_override_allowed: bool = False
    note: Optional[str] = None
    recorded_at: datetime


class TelemetryListOut(BaseModel):
    total_count: int
    counts_by_source: Dict[str, int]
    items: List[TelemetryOut]


class SafetyCommandIn(BaseModel):
    robot_code: str = "MFR-BASE-01"
    command: str
    reason: Optional[str] = None


class SafetyEventOut(BaseModel):
    id: int
    robot_code: str
    event_type: str
    severity: str
    source_component: str
    blocked_by_policy: bool
    hardware_estop_independent: bool = True
    description: str
    created_at: datetime


class SafetyEventsResponseOut(BaseModel):
    ai_safety_control_enabled: bool = False
    estop_override_allowed: bool = False
    hardware_estop_independent: bool = True
    control_layer: str = "LAYER_4_ADVISORY_INSPECTION_ONLY"
    prohibited_actions: List[str]
    events: List[SafetyEventOut]


class SampleImageOut(BaseModel):
    sample_id: str
    tier: str
    label_status: str
    source_group: str
    url: str


class SurfaceGoConceptOut(BaseModel):
    status: str
    disclaimer: str
    external_repo_accessed: bool = False
    ssot_reference: str
    routes: List[str]
    mockup_kpis: Dict[str, Any]
    backend_base_url: str
