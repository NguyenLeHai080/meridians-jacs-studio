from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.errors import AppError
from app.core.security import require_auth
from app.core.store import store

router = APIRouter(prefix="/api/v1/clients", tags=["client-sessions"])


class ClientSessionResponse(BaseModel):
    license_id: UUID
    customer_name: str
    customer_contact: str
    key_hint: str
    hwid: str
    last_platform: str | None = None
    last_app_version: str | None = None
    last_ip: str | None = None
    last_seen_at: datetime | None = None
    is_online: bool
    status: str


@router.get("/sessions", response_model=list[ClientSessionResponse])
async def list_active_sessions(_: dict = Depends(require_auth)):
    licenses = store.list("licenses")
    now = datetime.now(UTC)
    threshold = now - timedelta(minutes=5)

    results: list[ClientSessionResponse] = []
    for lic in licenses:
        last_seen = lic.get("last_seen_at")
        is_online = False
        if last_seen:
            last_seen_dt = datetime.fromisoformat(last_seen) if isinstance(last_seen, str) else last_seen
            if last_seen_dt.tzinfo is None:
                last_seen_dt = last_seen_dt.replace(tzinfo=UTC)
            is_online = last_seen_dt >= threshold and lic.get("status") == "active"

        results.append(
            ClientSessionResponse(
                license_id=UUID(str(lic["id"])),
                customer_name=lic.get("customer_name", "Khách hàng"),
                customer_contact=lic.get("customer_contact", ""),
                key_hint=lic.get("key_hint", "JACS-****"),
                hwid=lic.get("hwid", ""),
                last_platform=lic.get("last_platform"),
                last_app_version=lic.get("last_app_version"),
                last_ip=lic.get("last_ip"),
                last_seen_at=last_seen,
                is_online=is_online,
                status=lic.get("status", "active"),
            )
        )

    # Sort online devices first, then by last_seen_at
    return sorted(results, key=lambda x: (x.is_online, str(x.last_seen_at or "")), reverse=True)


@router.delete("/sessions/{license_id}")
async def terminate_session(license_id: UUID, user: dict = Depends(require_auth)):
    lic = store.get("licenses", UUID(str(license_id)))
    if not lic:
        raise AppError("LICENSE_NOT_FOUND", "Không tìm thấy phiên thiết bị", 404)
    store.update("licenses", UUID(str(license_id)), {"last_seen_at": None})
    store.create(
        "audit",
        {
            "action": "session.terminated",
            "license_id": str(license_id),
            "hwid": lic.get("hwid"),
            "actor": user["email"],
        },
    )
    return {"data": {"success": True, "message": "Đã ngắt phiên thiết bị thành công"}}
