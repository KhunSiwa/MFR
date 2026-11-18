#!/usr/bin/env python3
"""
MFR Module Facade Rover — Standalone Advisory CV FastAPI Microservice
----------------------------------------------------------------------
Binds strictly to 127.0.0.1. Exposes:
  - GET  /health
  - GET  /model-card
  - GET  /safety-policy
  - POST /predict   (multipart UploadFile OR workspace-confined image_path)

Strictly advisory: ZERO safety/E-stop/tether/motor actuation endpoints or fields.
"""

from __future__ import annotations

import inspect
import sys
from functools import lru_cache
from pathlib import Path
from typing import Optional

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

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile

THIS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(THIS_DIR))
from cv_service import (  # noqa: E402
    CVPredictionResponse,
    HealthResponse,
    MAX_UPLOAD_BYTES,
    MFRVisionService,
    ModelCardResponse,
    SafetyPolicyResponse,
)

app = FastAPI(
    title="MFR Advisory Computer Vision API",
    version="1.0.0",
    description=(
        "Strictly advisory facade defect inspection inference API for Module Facade Rover (MFR). "
        "Model tier: SMOKE_TEST_FIXTURE_ONLY (real facade accuracy = NOT TRAINED / NOT EVALUATED). "
        "Safety actuation is strictly prohibited."
    ),
)


@lru_cache(maxsize=1)
def get_service() -> MFRVisionService:
    return MFRVisionService()


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return get_service().health()


@app.get("/model-card", response_model=ModelCardResponse)
def model_card() -> ModelCardResponse:
    return get_service().model_card()


@app.get("/safety-policy", response_model=SafetyPolicyResponse)
def safety_policy() -> SafetyPolicyResponse:
    return get_service().safety_policy()


@app.post("/predict", response_model=CVPredictionResponse)
async def predict(
    request: Request,
    file: Optional[UploadFile] = File(default=None),
    image_path: Optional[str] = Form(default=None),
) -> CVPredictionResponse:
    svc = get_service()
    effective_path = image_path or request.query_params.get("image_path")

    if file is not None:
        raw = await file.read(MAX_UPLOAD_BYTES + 1)
        if len(raw) > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail="Uploaded image exceeds 10 MiB limit.")
        try:
            return svc.predict_bytes(raw, source_name=file.filename or "upload")
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    if effective_path is not None:
        try:
            return svc.predict_file(effective_path)
        except PermissionError as exc:
            raise HTTPException(status_code=403, detail=str(exc)) from exc
        except FileNotFoundError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    raise HTTPException(
        status_code=400,
        detail="Provide either multipart 'file' upload or workspace-confined 'image_path'.",
    )


if __name__ == "__main__":
    import uvicorn  # type: ignore

    uvicorn.run(app, host="127.0.0.1", port=8006)
