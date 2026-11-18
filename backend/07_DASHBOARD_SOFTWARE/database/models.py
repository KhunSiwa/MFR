#!/usr/bin/env python3
"""
MFR Module Facade Rover — SQLAlchemy 2.0 Declarative ORM Models
---------------------------------------------------------------
Mirrors `schema_postgres.sql` 1-to-1 with strict CHECK constraints for:
  - `telemetry_source IN ('SIMULATED_MOCK', 'LIVE_BENCH', 'UNCONNECTED')`
  - `advisory_only = TRUE` on defect detections and inspections
  - Hard safety isolation (`ai_safety_control_enabled = FALSE`,
    `estop_override_allowed = FALSE`, `safety_actuation_allowed = FALSE`,
    `hardware_estop_independent = TRUE`, `vertical_glass_certified = FALSE`)
  - Zero AI actuator / E-stop override command fields.
"""

from __future__ import annotations

import sys
from datetime import datetime, timezone
from typing import List, Optional

sys.dont_write_bytecode = True

from sqlalchemy import Boolean, CheckConstraint, DateTime, Float, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Robot(Base):
    __tablename__ = "robots"
    __table_args__ = (
        CheckConstraint("status IN ('IN_DEVELOPMENT', 'BENCH_TESTING', 'OFFLINE', 'SIMULATED_ONLY')", name="ck_robots_status"),
        CheckConstraint("cad_length_mm > 0 AND cad_width_mm > 0 AND cad_height_mm > 0 AND wheelbase_mm > 0", name="ck_robots_dims_pos"),
        CheckConstraint("vertical_glass_certified = 0", name="ck_robots_vertical_glass_false"),
        CheckConstraint("ai_safety_control_enabled = 0", name="ck_robots_ai_safety_false"),
        CheckConstraint("estop_override_allowed = 0", name="ck_robots_estop_override_false"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    robot_code: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="IN_DEVELOPMENT")
    cad_length_mm: Mapped[float] = mapped_column(Float, nullable=False)
    cad_width_mm: Mapped[float] = mapped_column(Float, nullable=False)
    cad_height_mm: Mapped[float] = mapped_column(Float, nullable=False)
    wheelbase_mm: Mapped[float] = mapped_column(Float, nullable=False)
    vertical_glass_certified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    ai_safety_control_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    estop_override_allowed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utc_now)

    inspections: Mapped[List["Inspection"]] = relationship(back_populates="robot")
    telemetry_logs: Mapped[List["TelemetryLog"]] = relationship(back_populates="robot")
    safety_events: Mapped[List["SafetyEvent"]] = relationship(back_populates="robot")


class ModelRegistry(Base):
    __tablename__ = "model_registry"
    __table_args__ = (
        UniqueConstraint("model_name", "model_version", name="uq_model_name_version"),
        CheckConstraint("model_tier IN ('SMOKE_TEST_FIXTURE_ONLY', 'REAL_FACADE_VERIFIED')", name="ck_model_tier"),
        CheckConstraint("advisory_only = 1", name="ck_model_advisory_true"),
        CheckConstraint("safety_actuation_allowed = 0", name="ck_model_safety_actuation_false"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    model_name: Mapped[str] = mapped_column(String(128), nullable=False)
    model_version: Mapped[str] = mapped_column(String(64), nullable=False)
    model_tier: Mapped[str] = mapped_column(String(64), nullable=False)
    real_dataset_trained: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_real_facade_evaluated: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    weights_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    advisory_only: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    safety_actuation_allowed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    disclaimer: Mapped[str] = mapped_column(Text, nullable=False)
    registered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utc_now)

    inspections: Mapped[List["Inspection"]] = relationship(back_populates="model")


class Inspection(Base):
    __tablename__ = "inspections"
    __table_args__ = (
        CheckConstraint(
            "source_type IN ('UPLOAD', 'SMOKE_FIXTURE', 'UNLABELED_CURTAINWALL_AUDIT', 'WORKSPACE_PATH')",
            name="ck_inspections_source_type",
        ),
        CheckConstraint("image_width > 0 AND image_height > 0", name="ck_inspections_image_size"),
        CheckConstraint("inference_ms >= 0.0", name="ck_inspections_inference_ms"),
        CheckConstraint("advisory_only = 1", name="ck_inspections_advisory_true"),
        CheckConstraint("safety_actuation_allowed = 0", name="ck_inspections_safety_actuation_false"),
        CheckConstraint(
            "operator_review_status IN ('PENDING_HUMAN_REVIEW', 'CONFIRMED', 'DISMISSED')",
            name="ck_inspections_review_status",
        ),
        Index("idx_inspections_robot_created", "robot_id", "created_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    robot_id: Mapped[int] = mapped_column(ForeignKey("robots.id", ondelete="RESTRICT"), nullable=False)
    model_id: Mapped[int] = mapped_column(ForeignKey("model_registry.id", ondelete="RESTRICT"), nullable=False)
    source_type: Mapped[str] = mapped_column(String(64), nullable=False)
    source_name: Mapped[str] = mapped_column(String(255), nullable=False)
    input_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    image_width: Mapped[int] = mapped_column(Integer, nullable=False)
    image_height: Mapped[int] = mapped_column(Integer, nullable=False)
    inference_ms: Mapped[float] = mapped_column(Float, nullable=False)
    model_tier: Mapped[str] = mapped_column(String(64), nullable=False)
    real_dataset_trained: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    advisory_only: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    safety_actuation_allowed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    disclaimer: Mapped[str] = mapped_column(Text, nullable=False)
    class_probabilities_json: Mapped[str] = mapped_column(Text, nullable=False)
    operator_review_status: Mapped[str] = mapped_column(String(32), nullable=False, default="PENDING_HUMAN_REVIEW")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utc_now)

    robot: Mapped["Robot"] = relationship(back_populates="inspections")
    model: Mapped["ModelRegistry"] = relationship(back_populates="inspections")
    detections: Mapped[List["DefectDetectionRow"]] = relationship(
        back_populates="inspection",
        cascade="all, delete-orphan",
    )


class DefectDetectionRow(Base):
    __tablename__ = "defect_detections"
    __table_args__ = (
        CheckConstraint("class_id >= 0 AND class_id <= 4", name="ck_det_class_id"),
        CheckConstraint(
            "class_name IN ('Crack', 'Sealant deterioration', 'Rust / corrosion', 'Water stain', 'Normal surface')",
            name="ck_det_class_name",
        ),
        CheckConstraint("confidence >= 0.0 AND confidence <= 1.0", name="ck_det_conf"),
        CheckConstraint(
            "bbox_cx >= 0.0 AND bbox_cx <= 1.0 AND bbox_cy >= 0.0 AND bbox_cy <= 1.0 "
            "AND bbox_w >= 0.0 AND bbox_w <= 1.0 AND bbox_h >= 0.0 AND bbox_h <= 1.0",
            name="ck_det_bbox",
        ),
        CheckConstraint("advisory_only = 1", name="ck_det_advisory_true"),
        Index("idx_defect_detections_inspection", "inspection_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    inspection_id: Mapped[int] = mapped_column(ForeignKey("inspections.id", ondelete="CASCADE"), nullable=False)
    class_id: Mapped[int] = mapped_column(Integer, nullable=False)
    class_name: Mapped[str] = mapped_column(String(64), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    bbox_cx: Mapped[float] = mapped_column(Float, nullable=False)
    bbox_cy: Mapped[float] = mapped_column(Float, nullable=False)
    bbox_w: Mapped[float] = mapped_column(Float, nullable=False)
    bbox_h: Mapped[float] = mapped_column(Float, nullable=False)
    advisory_only: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    inspection: Mapped["Inspection"] = relationship(back_populates="detections")


class TelemetryLog(Base):
    __tablename__ = "telemetry_logs"
    __table_args__ = (
        CheckConstraint(
            "telemetry_source IN ('SIMULATED_MOCK', 'LIVE_BENCH', 'UNCONNECTED')",
            name="ck_telemetry_source",
        ),
        CheckConstraint(
            "system_state IN ('NORMAL', 'CAMERA_DISCONNECTED', 'COMMUNICATION_FAILURE', "
            "'SENSOR_FAILURE', 'MOTOR_FAULT', 'E_STOP', 'UNCONNECTED')",
            name="ck_telemetry_system_state",
        ),
        CheckConstraint(
            "surface_mode IN ('HORIZONTAL_GROUND_ONLY', 'BENCH_RIG_NO_LOAD')",
            name="ck_telemetry_surface_mode",
        ),
        CheckConstraint("ai_safety_control_enabled = 0", name="ck_telemetry_ai_safety_false"),
        CheckConstraint("estop_override_allowed = 0", name="ck_telemetry_estop_override_false"),
        Index("idx_telemetry_robot_recorded", "robot_id", "recorded_at"),
        Index("idx_telemetry_source", "telemetry_source"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    robot_id: Mapped[int] = mapped_column(ForeignKey("robots.id", ondelete="RESTRICT"), nullable=False)
    telemetry_source: Mapped[str] = mapped_column(String(32), nullable=False)
    system_state: Mapped[str] = mapped_column(String(32), nullable=False)
    surface_mode: Mapped[str] = mapped_column(String(32), nullable=False, default="HORIZONTAL_GROUND_ONLY")
    battery_voltage_v: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    wheel_rpm_avg: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    wifi_rssi_dbm: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    camera_link_ok: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    hardware_estop_engaged: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    ai_safety_control_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    estop_override_allowed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utc_now)

    robot: Mapped["Robot"] = relationship(back_populates="telemetry_logs")


class SafetyEvent(Base):
    __tablename__ = "safety_events"
    __table_args__ = (
        CheckConstraint("severity IN ('INFO', 'WARNING', 'CRITICAL', 'BLOCKED_403')", name="ck_safety_severity"),
        CheckConstraint("hardware_estop_independent = 1", name="ck_safety_estop_independent"),
        Index("idx_safety_events_created", "created_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    robot_id: Mapped[int] = mapped_column(ForeignKey("robots.id", ondelete="RESTRICT"), nullable=False)
    event_type: Mapped[str] = mapped_column(String(64), nullable=False)
    severity: Mapped[str] = mapped_column(String(16), nullable=False)
    source_component: Mapped[str] = mapped_column(String(64), nullable=False)
    blocked_by_policy: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    hardware_estop_independent: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utc_now)

    robot: Mapped["Robot"] = relationship(back_populates="safety_events")
