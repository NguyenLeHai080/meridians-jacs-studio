from __future__ import annotations

import re
import secrets
from datetime import UTC, datetime
from hashlib import sha256
from uuid import UUID

from fastapi import APIRouter, Depends

from app.core.errors import AppError
from app.core.security import require_auth
from app.core.store import store
from app.modules.licensing.schemas import (
    CreateLicenseRequest,
    HwidResetRequest,
    LicenseCreatedResponse,
    LicenseHeartbeatRequest,
    LicenseRenewRequest,
    LicenseResponse,
    LicenseStatus,
    LicenseStatusUpdate,
    ValidateLicenseRequest,
)

router = APIRouter(prefix="/api/v1/licenses", tags=["licensing"])
DEVICE_ID_PATTERN = re.compile(r"^JACS-(MAC|WIN|LNX)-[A-F0-9]{32}$")


def _normalize_hwid(hwid: str) -> str:
    normalized = hwid.strip().upper()
    if normalized == "WEB-DEMO-MACHINE":
        raise AppError("LICENSE_HWID_INVALID", "Không thể cấp hoặc kích hoạt license bằng mã máy demo", 422)
    return normalized


def _validate_hwid(hwid: str) -> str:
    normalized = _normalize_hwid(hwid)
    if not DEVICE_ID_PATTERN.fullmatch(normalized):
        raise AppError(
            "LICENSE_HWID_INVALID",
            "Mã máy không hợp lệ; hãy dùng Device ID từ bản Desktop Electron",
            422,
        )
    return normalized


def make_key() -> str:
    parts = [secrets.token_hex(2).upper(), secrets.token_hex(2).upper(), secrets.token_hex(2).upper()]
    return "JACS-" + "-".join(parts)


def hash_key(value: str) -> str:
    return sha256(value.encode("utf-8")).hexdigest()


def _active_license(key: str, hwid: str) -> dict:
    """Resolve a client license and update its last-seen timestamp."""
    hwid = _normalize_hwid(hwid)
    submitted_hash = hash_key(key.strip())
    match = next((item for item in store.list("licenses") if item["key_hash"] == submitted_hash), None)
    if not match or match["status"] != LicenseStatus.active:
        raise AppError("LICENSE_INVALID", "License không hợp lệ hoặc đã bị khóa", 401)
    if match["hwid"] != hwid:
        raise AppError("LICENSE_HWID_MISMATCH", "License không thuộc thiết bị này", 403)
    now = datetime.now(UTC)
    if match["expires_at"] and match["expires_at"] <= now:
        store.update("licenses", match["id"], {"status": LicenseStatus.expired})
        raise AppError("LICENSE_EXPIRED", "License đã hết hạn", 403)
    updated = store.update("licenses", match["id"], {"last_seen_at": now})
    return updated or match


@router.post("", response_model=LicenseCreatedResponse, status_code=201)
async def create_license(payload: CreateLicenseRequest, user: dict = Depends(require_auth)):
    hwid = _validate_hwid(payload.hwid)
    raw_key = make_key()
    record = store.create(
        "licenses",
        {
            **payload.model_dump(exclude={"hwid"}),
            "hwid": hwid,
            "key_hash": hash_key(raw_key),
            "key_hint": f"JACS-****-{raw_key[-4:]}",
            "status": LicenseStatus.active,
            "created_at": datetime.now(UTC),
        },
    )
    store.create("audit", {"action": "license.created", "license_id": str(record["id"]), "actor": user["email"]})
    return {**record, "key": raw_key}


@router.get("", response_model=list[LicenseResponse])
async def list_licenses(_: dict = Depends(require_auth)):
    return store.list("licenses")


@router.patch("/{license_id}/status", response_model=LicenseResponse)
async def update_status(license_id: UUID, payload: LicenseStatusUpdate, user: dict = Depends(require_auth)):

    updated = store.update("licenses", UUID(str(license_id)), {"status": payload.status})
    if not updated:
        raise AppError("LICENSE_NOT_FOUND", "Không tìm thấy license", 404)
    store.create("audit", {"action": "license.status_updated", "license_id": str(license_id), "status": payload.status, "actor": user["email"]})
    return updated


@router.post("/{license_id}/renew", response_model=LicenseResponse)
async def renew_license(license_id: UUID, payload: LicenseRenewRequest, user: dict = Depends(require_auth)):
    expires_at = payload.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=UTC)
    if expires_at <= datetime.now(UTC):
        raise AppError("LICENSE_EXPIRY_INVALID", "Ngày hết hạn phải ở tương lai", 422)
    updated = store.update("licenses", UUID(str(license_id)), {"expires_at": expires_at, "status": LicenseStatus.active})
    if not updated:
        raise AppError("LICENSE_NOT_FOUND", "Không tìm thấy license", 404)
    store.create("audit", {"action": "license.renewed", "license_id": str(license_id), "expires_at": expires_at, "reason": payload.reason, "actor": user["email"]})
    return updated


@router.post("/{license_id}/reset-hwid", response_model=LicenseResponse)
async def reset_hwid(license_id: UUID, payload: HwidResetRequest, user: dict = Depends(require_auth)):
    updated = store.update("licenses", UUID(str(license_id)), {"hwid": _validate_hwid(payload.hwid)})
    if not updated:
        raise AppError("LICENSE_NOT_FOUND", "Không tìm thấy license", 404)
    store.create("audit", {"action": "license.hwid_reset", "license_id": str(license_id), "reason": payload.reason, "actor": user["email"]})
    return updated


@router.post("/validate")
async def validate_license(payload: ValidateLicenseRequest):
    match = _active_license(payload.key, payload.hwid)
    return {"data": {"valid": True, "license_id": str(match["id"]), "premium_ai": match["premium_ai"], "expires_at": match["expires_at"], "max_jobs_per_day": match["max_jobs_per_day"]}}


@router.post("/heartbeat")
async def license_heartbeat(payload: LicenseHeartbeatRequest):
    """Revalidate a running desktop session without issuing a new token."""
    match = _active_license(payload.key, payload.hwid)
    updated = store.update(
        "licenses",
        match["id"],
        {"last_app_version": payload.app_version, "last_platform": payload.platform},
    ) or match
    return {
        "data": {
            "valid": True,
            "license_id": str(updated["id"]),
            "premium_ai": updated["premium_ai"],
            "expires_at": updated["expires_at"],
            "max_jobs_per_day": updated["max_jobs_per_day"],
            "app_version": payload.app_version,
            "platform": payload.platform,
        }
    }
