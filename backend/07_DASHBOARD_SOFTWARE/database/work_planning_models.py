#!/usr/bin/env python3
"""
MFR Module Facade Rover — Persistent 3D Building, Inspection Session, Defect Location,
Work Planning, Cleaning Mission & Hardware Status ORM Models.
"""

from __future__ import annotations

import sys
from datetime import datetime, timezone
from typing import List, Optional

sys.dont_write_bytecode = True

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Building(Base):
    __tablename__ = "buildings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    floors_count: Mapped[int] = mapped_column(Integer, nullable=False, default=6)
    bays_per_floor: Mapped[int] = mapped_column(Integer, nullable=False, default=4)
    width_m: Mapped[float] = mapped_column(Float, nullable=False, default=16.0)
    depth_m: Mapped[float] = mapped_column(Float, nullable=False, default=12.0)
    floor_height_m: Mapped[float] = mapped_column(Float, nullable=False, default=3.5)
    is_simulated_geometry: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utc_now)

    facades: Mapped[List["BuildingFacade"]] = relationship(back_populates="building", cascade="all, delete-orphan")
    floors: Mapped[List["BuildingFloor"]] = relationship(back_populates="building", cascade="all, delete-orphan")
    panels: Mapped[List["FacadePanel"]] = relationship(back_populates="building", cascade="all, delete-orphan")


class BuildingFacade(Base):
    __tablename__ = "building_facades"
    __table_args__ = (UniqueConstraint("building_id", "face_code", name="uq_building_face_code"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    building_id: Mapped[int] = mapped_column(ForeignKey("buildings.id", ondelete="CASCADE"), nullable=False)
    face_code: Mapped[str] = mapped_column(String(16), nullable=False)  # NORTH, EAST, SOUTH, WEST
    label: Mapped[str] = mapped_column(String(64), nullable=False)
    azimuth_deg: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    width_m: Mapped[float] = mapped_column(Float, nullable=False)
    height_m: Mapped[float] = mapped_column(Float, nullable=False)

    building: Mapped["Building"] = relationship(back_populates="facades")
    panels: Mapped[List["FacadePanel"]] = relationship(back_populates="facade", cascade="all, delete-orphan")


class BuildingFloor(Base):
    __tablename__ = "building_floors"
    __table_args__ = (UniqueConstraint("building_id", "floor_number", name="uq_building_floor_num"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    building_id: Mapped[int] = mapped_column(ForeignKey("buildings.id", ondelete="CASCADE"), nullable=False)
    floor_number: Mapped[int] = mapped_column(Integer, nullable=False)
    label: Mapped[str] = mapped_column(String(64), nullable=False)
    elevation_m: Mapped[float] = mapped_column(Float, nullable=False)
    height_m: Mapped[float] = mapped_column(Float, nullable=False)

    building: Mapped["Building"] = relationship(back_populates="floors")
    panels: Mapped[List["FacadePanel"]] = relationship(back_populates="floor", cascade="all, delete-orphan")


class FacadePanel(Base):
    __tablename__ = "facade_panels"
    __table_args__ = (
        UniqueConstraint("building_id", "panel_code", name="uq_building_panel_code"),
        Index("idx_facade_panels_lookup", "building_id", "facade_id", "floor_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    building_id: Mapped[int] = mapped_column(ForeignKey("buildings.id", ondelete="CASCADE"), nullable=False)
    facade_id: Mapped[int] = mapped_column(ForeignKey("building_facades.id", ondelete="CASCADE"), nullable=False)
    floor_id: Mapped[int] = mapped_column(ForeignKey("building_floors.id", ondelete="CASCADE"), nullable=False)
    panel_code: Mapped[str] = mapped_column(String(32), nullable=False)
    zone_code: Mapped[str] = mapped_column(String(32), nullable=False)
    col_index: Mapped[int] = mapped_column(Integer, nullable=False)
    x_m: Mapped[float] = mapped_column(Float, nullable=False)
    y_m: Mapped[float] = mapped_column(Float, nullable=False)
    z_m: Mapped[float] = mapped_column(Float, nullable=False)
    width_m: Mapped[float] = mapped_column(Float, nullable=False)
    height_m: Mapped[float] = mapped_column(Float, nullable=False)

    building: Mapped["Building"] = relationship(back_populates="panels")
    facade: Mapped["BuildingFacade"] = relationship(back_populates="panels")
    floor: Mapped["BuildingFloor"] = relationship(back_populates="panels")


class InspectionSession(Base):
    __tablename__ = "inspection_sessions"
    __table_args__ = (
        CheckConstraint("status IN ('ACTIVE', 'STOPPED', 'COMPLETED')", name="ck_session_status"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_code: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    building_id: Mapped[int] = mapped_column(ForeignKey("buildings.id", ondelete="RESTRICT"), nullable=False)
    facade_code: Mapped[str] = mapped_column(String(16), nullable=False, default="NORTH")
    operator_name: Mapped[str] = mapped_column(String(64), nullable=False, default="Operator")
    camera_source: Mapped[str] = mapped_column(String(64), nullable=False, default="UNCONNECTED")
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="ACTIVE")
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utc_now)
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class CapturedImage(Base):
    __tablename__ = "captured_images"
    __table_args__ = (
        CheckConstraint("position_mode IN ('MANUAL_ASSIGNED', 'ESTIMATED', 'LOCALIZED')", name="ck_capture_pos_mode"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("inspection_sessions.id", ondelete="CASCADE"), nullable=False)
    building_id: Mapped[int] = mapped_column(ForeignKey("buildings.id", ondelete="RESTRICT"), nullable=False)
    facade_code: Mapped[str] = mapped_column(String(16), nullable=False)
    floor_number: Mapped[int] = mapped_column(Integer, nullable=False)
    panel_id: Mapped[int] = mapped_column(ForeignKey("facade_panels.id", ondelete="RESTRICT"), nullable=False)
    zone_code: Mapped[str] = mapped_column(String(32), nullable=False)
    original_rel_path: Mapped[str] = mapped_column(String(255), nullable=False)
    annotated_rel_path: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    camera_source: Mapped[str] = mapped_column(String(64), nullable=False)
    position_mode: Mapped[str] = mapped_column(String(24), nullable=False, default="MANUAL_ASSIGNED")
    est_x_m: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    est_y_m: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    est_z_m: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    image_width: Mapped[int] = mapped_column(Integer, nullable=False)
    image_height: Mapped[int] = mapped_column(Integer, nullable=False)
    input_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    inspection_id: Mapped[Optional[int]] = mapped_column(ForeignKey("inspections.id", ondelete="SET NULL"), nullable=True)
    captured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utc_now)


class DefectLocation(Base):
    __tablename__ = "defect_locations"
    __table_args__ = (
        CheckConstraint(
            "verification_status IN ('UNVERIFIED', 'CONFIRMED', 'DISMISSED', 'NORMAL_VERIFIED')",
            name="ck_defect_loc_verif",
        ),
        CheckConstraint(
            "decision_type IN ('Inspection required', 'Cleaning appropriate', 'Repair required', 'Human assessment required')",
            name="ck_defect_loc_decision",
        ),
        CheckConstraint("advisory_only = 1", name="ck_defect_loc_advisory"),
        Index("idx_defect_loc_building", "building_id", "panel_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    building_id: Mapped[int] = mapped_column(ForeignKey("buildings.id", ondelete="CASCADE"), nullable=False)
    facade_code: Mapped[str] = mapped_column(String(16), nullable=False)
    floor_number: Mapped[int] = mapped_column(Integer, nullable=False)
    panel_id: Mapped[int] = mapped_column(ForeignKey("facade_panels.id", ondelete="RESTRICT"), nullable=False)
    panel_code: Mapped[str] = mapped_column(String(32), nullable=False)
    zone_code: Mapped[str] = mapped_column(String(32), nullable=False)
    captured_image_id: Mapped[int] = mapped_column(ForeignKey("captured_images.id", ondelete="CASCADE"), nullable=False)
    inspection_id: Mapped[int] = mapped_column(ForeignKey("inspections.id", ondelete="CASCADE"), nullable=False)
    defect_category: Mapped[str] = mapped_column(String(64), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    advisory_only: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    verification_status: Mapped[str] = mapped_column(String(24), nullable=False, default="UNVERIFIED")
    decision_type: Mapped[str] = mapped_column(String(32), nullable=False, default="Human assessment required")
    position_mode: Mapped[str] = mapped_column(String(24), nullable=False, default="MANUAL_ASSIGNED")
    marker_x_m: Mapped[float] = mapped_column(Float, nullable=False)
    marker_y_m: Mapped[float] = mapped_column(Float, nullable=False)
    marker_z_m: Mapped[float] = mapped_column(Float, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    verified_by: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utc_now)


class WorkPlan(Base):
    __tablename__ = "work_plans"
    __table_args__ = (
        CheckConstraint("mission_type IN ('INSPECTION', 'CLEANING')", name="ck_wp_mission"),
        CheckConstraint("priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')", name="ck_wp_priority"),
        CheckConstraint(
            "status IN ('Pending', 'Planned', 'Ready for review', 'In progress', 'Completed', 'Requires human verification')",
            name="ck_wp_status",
        ),
        CheckConstraint(
            "decision_type IN ('Inspection required', 'Cleaning appropriate', 'Repair required', 'Human assessment required')",
            name="ck_wp_decision",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    task_code: Mapped[str] = mapped_column(String(40), nullable=False, unique=True)
    building_id: Mapped[int] = mapped_column(ForeignKey("buildings.id", ondelete="CASCADE"), nullable=False)
    facade_code: Mapped[str] = mapped_column(String(16), nullable=False)
    floor_number: Mapped[int] = mapped_column(Integer, nullable=False)
    zone_code: Mapped[str] = mapped_column(String(32), nullable=False)
    panel_id: Mapped[Optional[int]] = mapped_column(ForeignKey("facade_panels.id", ondelete="SET NULL"), nullable=True)
    defect_location_id: Mapped[Optional[int]] = mapped_column(ForeignKey("defect_locations.id", ondelete="SET NULL"), nullable=True)
    mission_type: Mapped[str] = mapped_column(String(24), nullable=False, default="INSPECTION")
    defect_type: Mapped[str] = mapped_column(String(64), nullable=False)
    decision_type: Mapped[str] = mapped_column(String(32), nullable=False, default="Inspection required")
    priority: Mapped[str] = mapped_column(String(16), nullable=False, default="MEDIUM")
    assigned_module: Mapped[str] = mapped_column(String(48), nullable=False, default="INSPECTION_CAM")
    estimated_duration_min: Mapped[int] = mapped_column(Integer, nullable=False, default=20)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="Requires human verification")
    human_approved: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    verification_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utc_now)


class CleaningTask(Base):
    __tablename__ = "cleaning_tasks"
    __table_args__ = (
        CheckConstraint(
            "cleaner_state IN ('PUMP_OFF', 'PUMP_ON', 'CLEANING_SIMULATION', 'CLEANING_TASK_ACTIVE', 'CLEANING_COMPLETED', 'ERROR')",
            name="ck_cleaner_state",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    work_plan_id: Mapped[int] = mapped_column(ForeignKey("work_plans.id", ondelete="CASCADE"), nullable=False)
    panel_id: Mapped[Optional[int]] = mapped_column(ForeignKey("facade_panels.id", ondelete="SET NULL"), nullable=True)
    cleaner_state: Mapped[str] = mapped_column(String(32), nullable=False, default="PUMP_OFF")
    simulation_mode: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    human_approved: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    max_duration_sec: Mapped[float] = mapped_column(Float, nullable=False, default=15.0)
    path_summary: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utc_now)


class HardwareStatusRow(Base):
    __tablename__ = "hardware_status"
    __table_args__ = (UniqueConstraint("robot_code", "component_name", name="uq_hw_component"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    robot_code: Mapped[str] = mapped_column(String(64), nullable=False, default="MFR-BASE-01")
    component_name: Mapped[str] = mapped_column(String(64), nullable=False)
    verification_state: Mapped[str] = mapped_column(String(32), nullable=False)
    simulation_mode: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    estop_engaged: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    details_json: Mapped[str] = mapped_column(Text, nullable=False, default="{}")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utc_now)
