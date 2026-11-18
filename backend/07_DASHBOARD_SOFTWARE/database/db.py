#!/usr/bin/env python3
"""
MFR Module Facade Rover — SQLAlchemy 2.0 Database Engine & Session Factory
--------------------------------------------------------------------------
Supports PostgreSQL via the `MFR_DATABASE_URL` environment variable in
production, and defaults cleanly to a local file-based SQLite database
(`database/mfr_m7_dev.db`) for zero-credential offline execution.

Note on local environment: `psycopg2` / `psycopg2-binary` is absent in the
local `.venv`, so PostgreSQL connections require installing `psycopg2-binary`
or `psycopg` in the target deployment environment before setting
`MFR_DATABASE_URL=postgresql+psycopg2://...`.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Generator, Optional

sys.dont_write_bytecode = True

from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

DB_DIR = Path(__file__).resolve().parent
DEFAULT_SQLITE_PATH = DB_DIR / "mfr_m7_dev.db"
DEFAULT_SQLITE_URL = f"sqlite:///{DEFAULT_SQLITE_PATH.as_posix()}"


class Base(DeclarativeBase):
    """Declarative base for all MFR M7 ORM models."""


def get_database_url(override_url: Optional[str] = None) -> str:
    """Resolve database URL from override or MFR_DATABASE_URL env var (no hardcoded secrets)."""
    if override_url and override_url.strip():
        return override_url.strip()
    env_url = os.environ.get("MFR_DATABASE_URL", "").strip()
    if env_url:
        return env_url
    return DEFAULT_SQLITE_URL


def create_mfr_engine(database_url: Optional[str] = None) -> Engine:
    """Create a configured SQLAlchemy 2.0 Engine with SQLite FK enforcement when applicable."""
    url = get_database_url(database_url)
    is_sqlite = url.startswith("sqlite:")
    connect_args = {"check_same_thread": False} if is_sqlite else {}
    eng = create_engine(url, connect_args=connect_args, future=True, pool_pre_ping=True)

    if is_sqlite:
        @event.listens_for(eng, "connect")
        def _set_sqlite_pragma(dbapi_connection, _connection_record) -> None:  # type: ignore[no-untyped-def]
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

    return eng


engine = create_mfr_engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False, class_=Session)


def init_db(target_engine: Optional[Engine] = None) -> None:
    """Create all schema tables if they do not exist."""
    from . import models as _models  # noqa: F401  Ensure ORM models are registered on Base.metadata
    from . import work_planning_models as _wp_models  # noqa: F401  Register MFR work-planning tables

    Base.metadata.create_all(bind=target_engine or engine)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency yielding a scoped SQLAlchemy Session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
