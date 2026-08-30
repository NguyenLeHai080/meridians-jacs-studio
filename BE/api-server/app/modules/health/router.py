from __future__ import annotations

from fastapi import APIRouter
from fastapi import status
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.store import store

router = APIRouter(tags=["health"])


@router.get("/health/live")
async def live() -> dict:
    return {"data": {"status": "live"}}


@router.get("/health/ready")
async def ready() -> dict:
    settings = get_settings()
    if not store.healthcheck():
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"data": {"status": "not_ready", "dependencies": {"store": "error"}, "store_backend": settings.store_backend}},
        )
    return {"data": {"status": "ready", "dependencies": {"store": "ok"}, "store_backend": settings.store_backend}}
