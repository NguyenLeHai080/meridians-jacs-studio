from __future__ import annotations

from fastapi import APIRouter

from app.core.config import get_settings

router = APIRouter(tags=["health"])


@router.get("/health/live")
async def live() -> dict:
    return {"data": {"status": "live"}}


@router.get("/health/ready")
async def ready() -> dict:
    settings = get_settings()
    return {"data": {"status": "ready", "dependencies": {"store": "ok"}, "store_backend": settings.store_backend}}
