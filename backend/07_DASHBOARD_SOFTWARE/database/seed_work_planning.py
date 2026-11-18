#!/usr/bin/env python3
"""
Idempotent baseline seeder for MFR Building Geometry & Hardware Audit Registry.
Preserves all existing rows and seeds ZERO fabricated defect records.
"""

from __future__ import annotations

import json
import sys
from typing import Dict

sys.dont_write_bytecode = True

from sqlalchemy import select
from sqlalchemy.orm import Session

from database.work_planning_models import (
    Building,
    BuildingFacade,
    BuildingFloor,
    FacadePanel,
    HardwareStatusRow,
)


def rebuild_building_panels(session: Session, b: Building) -> int:
    """Populate facades, floors, and uniquely IDed facade panels for a building if empty."""
    existing_facades = session.execute(select(BuildingFacade).where(BuildingFacade.building_id == b.id)).scalars().all()
    if existing_facades:
        return len(session.execute(select(FacadePanel).where(FacadePanel.building_id == b.id)).scalars().all())

    face_defs = [
        ("NORTH", "ด้านหน้า (North)", 0.0, b.width_m),
        ("EAST", "ด้านขวา (East)", 90.0, b.depth_m),
        ("SOUTH", "ด้านหลัง (South)", 180.0, b.width_m),
        ("WEST", "ด้านซ้าย (West)", 270.0, b.depth_m),
    ]
    total_h = b.floors_count * b.floor_height_m
    facades = {}
    for code, label, az, w in face_defs:
        f = BuildingFacade(building_id=b.id, face_code=code, label=label, azimuth_deg=az, width_m=w, height_m=total_h)
        session.add(f)
        session.flush()
        facades[code] = f

    floors = {}
    for fl in range(1, b.floors_count + 1):
        fl_obj = BuildingFloor(
            building_id=b.id,
            floor_number=fl,
            label=f"Floor {fl}",
            elevation_m=(fl - 1) * b.floor_height_m,
            height_m=b.floor_height_m,
        )
        session.add(fl_obj)
        session.flush()
        floors[fl] = fl_obj

    created = 0
    for code, _, _, face_w in face_defs:
        panel_w = face_w / b.bays_per_floor
        for fl in range(1, b.floors_count + 1):
            z_center = (fl - 0.5) * b.floor_height_m
            for bay in range(1, b.bays_per_floor + 1):
                offset = (-face_w * 0.5) + (bay - 0.5) * panel_w
                if code == "NORTH":
                    xm, ym = offset, -b.depth_m * 0.5
                elif code == "SOUTH":
                    xm, ym = -offset, b.depth_m * 0.5
                elif code == "EAST":
                    xm, ym = b.width_m * 0.5, offset
                else:
                    xm, ym = -b.width_m * 0.5, -offset

                panel_code = f"{code[0]}-F{fl:02d}-P{bay:02d}"
                zone_code = f"ZONE-{code[0]}{bay}"
                session.add(
                    FacadePanel(
                        building_id=b.id,
                        facade_id=facades[code].id,
                        floor_id=floors[fl].id,
                        panel_code=panel_code,
                        zone_code=zone_code,
                        col_index=bay,
                        x_m=round(xm, 3),
                        y_m=round(ym, 3),
                        z_m=round(z_center, 3),
                        width_m=round(panel_w, 3),
                        height_m=b.floor_height_m,
                    )
                )
                created += 1
    session.flush()
    return created


def seed_work_planning_baseline(session: Session) -> Dict[str, int]:
    b = session.execute(select(Building).where(Building.code == "BLDG-ACT-01")).scalar_one_or_none()
    if b is None:
        b = Building(
            code="BLDG-ACT-01",
            name="อาคารทดสอบกระจก MFR Tower A (Configurable 3D Model)",
            floors_count=6,
            bays_per_floor=4,
            width_m=16.0,
            depth_m=12.0,
            floor_height_m=3.5,
            is_simulated_geometry=True,
            notes="Configurable facade building model for MFR first implementation; zero fabricated confirmed defects seeded.",
        )
        session.add(b)
        session.flush()
    panel_count = rebuild_building_panels(session, b)

    hw_defaults = [
        ("ESP32-S3-WROOM", "UNVERIFIED_SIMULATION_ONLY", {"carrier_pcb": "82x82mm MFR.step verified", "usb_uvc_host": "Full-Speed 12Mbps limit; camera on host PC"}),
        ("ZK-BM1_DRIVER", "UNVERIFIED_SIMULATION_ONLY", {"spec": "3-18VDC, 10A cont / 15A peak, PWM<=2kHz", "pins": "unassigned (-1)"}),
        ("25GA_DC_MOTOR", "UNVERIFIED_SIMULATION_ONLY", {"wheel_mm": 60.0, "missing": "Exact 6V vs 12V SKU, stall amps, encoder 3.3V vs 5V"}),
        ("BRUSHLESS_ESC", "UNVERIFIED_SIMULATION_ONLY", {"impeller_mm": 84.0, "pwm": "50Hz 1000us disarm", "missing": "KV/BEC check"}),
        ("L9110S_PUMP", "UNVERIFIED_SIMULATION_ONLY", {"limit": "2.5-12VDC, 800mA cont MAX", "missing": "Pump stall current <= 800mA check"}),
        ("USB_WEBCAM_HOST", "DISCONNECTED", {"interface": "USB 2.0 UVC -> Backend Host PC", "note": "Uses browser camera or OpenCV capture with safe fallback"}),
    ]
    for cname, vstate, details in hw_defaults:
        row = session.execute(
            select(HardwareStatusRow).where(
                HardwareStatusRow.robot_code == "MFR-BASE-01",
                HardwareStatusRow.component_name == cname,
            )
        ).scalar_one_or_none()
        if row is None:
            session.add(
                HardwareStatusRow(
                    robot_code="MFR-BASE-01",
                    component_name=cname,
                    verification_state=vstate,
                    simulation_mode=True,
                    estop_engaged=True,
                    details_json=json.dumps(details),
                )
            )
    session.commit()
    return {"building_id": b.id, "panels": panel_count}
