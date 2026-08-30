from __future__ import annotations

from hmac import compare_digest

from fastapi import APIRouter, Depends, Header, Request

from app.core.config import get_settings
from app.core.errors import AppError
from app.core.security import require_auth
from app.core.store import store
from app.modules.telemetry.schemas import Severity, TelemetryEvent

router = APIRouter(prefix="/api/v1/telemetry", tags=["telemetry"])


@router.post("/logs", status_code=202)
async def ingest(request: Request, event: TelemetryEvent, telemetry_token: str | None = Header(default=None, alias="X-Telemetry-Token")):
    settings = get_settings()
    content_length = request.headers.get("content-length")
    try:
        payload_size = int(content_length) if content_length else 0
    except ValueError:
        raise AppError("TELEMETRY_CONTENT_LENGTH_INVALID", "Content-Length không hợp lệ", 400)
    if payload_size > settings.telemetry_max_payload_bytes:
        raise AppError("TELEMETRY_PAYLOAD_TOO_LARGE", "Telemetry payload vượt quá giới hạn", 413)
    if not settings.telemetry_enabled:
        raise AppError("TELEMETRY_DISABLED", "Telemetry đang tắt", 503)
    if settings.telemetry_ingest_token and (not telemetry_token or not compare_digest(telemetry_token, settings.telemetry_ingest_token)):
        raise AppError("TELEMETRY_UNAUTHORIZED", "Telemetry token không hợp lệ", 401)
    record = store.create("telemetry", event.model_dump())
    return {"data": {"accepted": True, "event_id": str(record["id"])} }


@router.get("/logs")
async def list_logs(_: dict = Depends(require_auth), severity: Severity | None = None, limit: int = 100):
    limit = max(1, min(limit, 500))
    records = store.list("telemetry")
    if severity:
        records = [item for item in records if item["severity"] == severity]
    return {"data": records[-limit:]}
