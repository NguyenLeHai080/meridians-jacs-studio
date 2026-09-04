from __future__ import annotations

from hmac import compare_digest

from fastapi import APIRouter, Depends, Header, Request

from app.core.config import get_settings
from app.core.errors import AppError
from app.core.security import require_auth
from app.core.store import store
from app.modules.licensing.router import _active_license
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
    license_key = request.headers.get("X-License-Key")
    device_id = request.headers.get("X-Device-Id")
    license_record = None
    if license_key and device_id:
        license_record = _active_license(license_key, device_id)
    else:
        token_valid = bool(telemetry_token and settings.telemetry_ingest_token and compare_digest(telemetry_token, settings.telemetry_ingest_token))
        if not token_valid:
            raise AppError("TELEMETRY_UNAUTHORIZED", "Telemetry token hoặc license không hợp lệ", 401)
    payload = event.model_dump()
    # Keep desktop incidents attributable to a license without ever storing
    # the raw license key. Device IDs are already one-way JACS identifiers.
    if license_record:
        payload["license_id"] = str(license_record["id"])
        if not payload.get("hwid_hash"):
            payload["hwid_hash"] = device_id
    record = store.create("telemetry", payload)
    return {"data": {"accepted": True, "event_id": str(record["id"])} }


@router.get("/logs")
async def list_logs(_: dict = Depends(require_auth), severity: Severity | None = None, limit: int = 200):
    limit = max(1, min(limit, 500))
    telemetry_records = list(store.list("telemetry"))
    audit_records = list(store.list("audit"))

    combined = list(telemetry_records)
    for a in audit_records:
        action = str(a.get("action", "system.event"))
        # Format human-readable event message
        msg = a.get("notes") or a.get("reason")
        if not msg:
            cust = a.get("customer") or a.get("key_hint") or a.get("license_id", "Hệ thống")
            actor = a.get("actor", "Admin")
            msg = f"Sự kiện [{action.upper()}]: Thực hiện bởi {actor} (Khách: {cust})"

        combined.append({
            "id": a.get("id"),
            "event_name": action,
            "severity": "info",
            "message": msg,
            "app_version": a.get("app_version", "v0.3.42"),
            "machine_id": str(a.get("license_id", "SERVER")),
            "fingerprint": a.get("fingerprint") or a.get("hwid") or "system",
            "created_at": a.get("created_at"),
            "actor": a.get("actor"),
            "details": a,
        })

    if severity:
        combined = [item for item in combined if item.get("severity") == severity]

    # Return newest first
    sorted_records = sorted(combined, key=lambda x: str(x.get("created_at", "")), reverse=True)
    return {"data": sorted_records[:limit]}


@router.delete("/logs/{log_id}")
async def delete_log(log_id: str, _: dict = Depends(require_auth)):
    store.delete("telemetry", log_id)
    return {"data": {"success": True, "message": "Đã xóa log thành công"}}


@router.delete("/logs")
async def clear_all_logs(_: dict = Depends(require_auth)):
    records = store.list("telemetry")
    for r in records:
        store.delete("telemetry", r["id"])
    return {"data": {"success": True, "message": f"Đã xóa toàn bộ {len(records)} logs"}}


@router.post("/logs/manual", status_code=201)
async def create_manual_log(event: TelemetryEvent, user: dict = Depends(require_auth)):
    payload = event.model_dump()
    payload["actor"] = user["email"]
    record = store.create("telemetry", payload)
    return {"data": {"success": True, "event_id": str(record["id"])}}


@router.get("/audit")
async def list_audit_logs(_: dict = Depends(require_auth), limit: int = 200):
    limit = max(1, min(limit, 500))
    records = store.list("audit")
    sorted_records = sorted(records, key=lambda x: str(x.get("created_at", "")), reverse=True)
    return {"data": sorted_records[:limit]}

