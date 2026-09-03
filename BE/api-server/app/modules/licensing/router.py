from __future__ import annotations

import re
import secrets
from datetime import UTC, datetime
from hashlib import sha256
from uuid import UUID

from fastapi import APIRouter, Depends, Request

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
    LicenseUpdateRequest,
    ValidateLicenseRequest,
)

router = APIRouter(prefix="/api/v1/licenses", tags=["licensing"])
DEVICE_ID_PATTERN = re.compile(r"^JACS-(MAC|WIN|LNX)-[A-F0-9]{32}$")
LICENSE_KEY_PATTERN = re.compile(r"^JACS-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$")
DEVICE_ID_SEARCH_PATTERN = re.compile(r"JACS-(?:MAC|WIN|LNX)-[A-F0-9]{32}")


def _normalize_hwid(hwid: str) -> str:
    normalized = re.sub(r"[\s\u200b-\u200d\ufeff]+", "", str(hwid)).upper()
    if not DEVICE_ID_PATTERN.fullmatch(normalized):
        matches = DEVICE_ID_SEARCH_PATTERN.findall(normalized)
        if len(matches) == 1:
            normalized = matches[0]
    if normalized == "WEB-DEMO-MACHINE":
        raise AppError("LICENSE_HWID_INVALID", "Không thể cấp hoặc kích hoạt license bằng mã máy demo", 422)
    return normalized


def _normalize_key(key: str) -> str:
    """Normalize keys copied from chat/email without accepting malformed keys."""
    normalized = re.sub(r"[\s\u200b-\u200d\ufeff]+", "", str(key)).upper()
    if not LICENSE_KEY_PATTERN.fullmatch(normalized):
        raise AppError("LICENSE_INVALID", "License không hợp lệ hoặc đã bị khóa", 401)
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


def _as_utc(value: datetime | str | None) -> datetime | None:
    """Keep expiry comparisons safe for clients that omit an ISO timezone."""
    if value is None:
        return None
    parsed = datetime.fromisoformat(value) if isinstance(value, str) else value
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=UTC)
    return parsed.astimezone(UTC)


def make_key() -> str:
    parts = [secrets.token_hex(2).upper(), secrets.token_hex(2).upper(), secrets.token_hex(2).upper()]
    return "JACS-" + "-".join(parts)


def hash_key(value: str) -> str:
    return sha256(value.encode("utf-8")).hexdigest()


def _active_license(key: str, hwid: str, client_ip: str | None = None) -> dict:
    """Resolve a client license and update its last-seen timestamp."""
    hwid = _validate_hwid(hwid)
    normalized_key = _normalize_key(key)
    submitted_hash = hash_key(normalized_key)
    match = next((item for item in store.list("licenses") if item["key_hash"] == submitted_hash), None)
    if not match or match["status"] != LicenseStatus.active:
        raise AppError("LICENSE_INVALID", "License không hợp lệ hoặc đã bị khóa", 401)
    if match["hwid"] != hwid:
        raise AppError("LICENSE_HWID_MISMATCH", "License không thuộc thiết bị này", 403)
    now = datetime.now(UTC)
    expires_at = _as_utc(match.get("expires_at"))
    if expires_at and expires_at <= now:
        store.update("licenses", match["id"], {"status": LicenseStatus.expired})
        raise AppError("LICENSE_EXPIRED", "License đã hết hạn", 403)
    update_data: dict = {"last_seen_at": now}
    if client_ip:
        update_data["last_ip"] = client_ip
    updated = store.update("licenses", match["id"], update_data)
    return updated or match


@router.post("", response_model=LicenseCreatedResponse, status_code=201)
async def create_license(payload: CreateLicenseRequest, user: dict = Depends(require_auth)):
    hwid = _validate_hwid(payload.hwid)
    raw_key = make_key()
    values = payload.model_dump(exclude={"hwid", "amount", "plan_type", "payment_method"})
    values["expires_at"] = _as_utc(values.get("expires_at"))
    record = store.create(
        "licenses",
        {
            **values,
            "hwid": hwid,
            "key_hash": hash_key(raw_key),
            "key_hint": f"JACS-****-{raw_key[-4:]}",
            "status": LicenseStatus.active,
            "created_at": datetime.now(UTC),
        },
    )
    store.create("audit", {"action": "license.created", "license_id": str(record["id"]), "actor": user["email"], "customer": payload.customer_name})
    
    # Auto record billing transaction if amount is provided
    if payload.amount > 0:
        store.create(
            "billing_transactions",
            {
                "license_id": str(record["id"]),
                "customer_name": payload.customer_name,
                "amount": payload.amount,
                "plan_type": payload.plan_type or "new_key",
                "payment_method": payload.payment_method or "bank_transfer",
                "transaction_type": "new_key",
                "actor": user["email"],
                "notes": f"Tạo key mới {record['key_hint']}",
                "created_at": datetime.now(UTC),
            },
        )
    return {**record, "key": raw_key}


@router.get("", response_model=list[LicenseResponse])
async def list_licenses(_: dict = Depends(require_auth)):
    return store.list("licenses")


@router.get("/{license_id}", response_model=LicenseResponse)
async def get_license(license_id: UUID, _: dict = Depends(require_auth)):
    record = store.get("licenses", UUID(str(license_id)))
    if not record:
        raise AppError("LICENSE_NOT_FOUND", "Không tìm thấy license", 404)
    return record


@router.patch("/{license_id}", response_model=LicenseResponse)
@router.put("/{license_id}", response_model=LicenseResponse)
async def update_license(license_id: UUID, payload: LicenseUpdateRequest, user: dict = Depends(require_auth)):
    existing = store.get("licenses", UUID(str(license_id)))
    if not existing:
        raise AppError("LICENSE_NOT_FOUND", "Không tìm thấy license", 404)
    update_data = {k: v for k, v in payload.model_dump().items() if v is not None}
    if "expires_at" in update_data:
        update_data["expires_at"] = _as_utc(update_data["expires_at"])
    updated = store.update("licenses", UUID(str(license_id)), update_data)
    store.create("audit", {"action": "license.updated", "license_id": str(license_id), "actor": user["email"]})
    return updated


@router.delete("/{license_id}")
async def delete_license(license_id: UUID, user: dict = Depends(require_auth)):
    existing = store.get("licenses", UUID(str(license_id)))
    if not existing:
        raise AppError("LICENSE_NOT_FOUND", "Không tìm thấy license", 404)
    store.delete("licenses", UUID(str(license_id)))
    store.create("audit", {"action": "license.deleted", "license_id": str(license_id), "key_hint": existing.get("key_hint"), "actor": user["email"]})
    return {"data": {"success": True, "message": "Đã xóa license thành công"}}


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
    
    # Auto record billing transaction if amount > 0
    if payload.amount > 0:
        store.create(
            "billing_transactions",
            {
                "license_id": str(license_id),
                "customer_name": updated.get("customer_name", "Khách hàng"),
                "amount": payload.amount,
                "plan_type": payload.plan_type or "renewal",
                "payment_method": payload.payment_method or "bank_transfer",
                "transaction_type": "renewal",
                "actor": user["email"],
                "notes": f"Gia hạn key {updated.get('key_hint')} đến {expires_at.strftime('%Y-%m-%d')}: {payload.reason}",
                "created_at": datetime.now(UTC),
            },
        )
    return updated


@router.post("/{license_id}/reset-hwid", response_model=LicenseResponse)
async def reset_hwid(license_id: UUID, payload: HwidResetRequest, user: dict = Depends(require_auth)):
    updated = store.update("licenses", UUID(str(license_id)), {"hwid": _validate_hwid(payload.hwid)})
    if not updated:
        raise AppError("LICENSE_NOT_FOUND", "Không tìm thấy license", 404)
    store.create("audit", {"action": "license.hwid_reset", "license_id": str(license_id), "reason": payload.reason, "actor": user["email"]})
    return updated


@router.post("/validate")
async def validate_license(payload: ValidateLicenseRequest, request: Request):
    client_ip = request.client.host if request.client else None
    match = _active_license(payload.key, payload.hwid, client_ip)
    return {
        "data": {
            "valid": True,
            "license_id": str(match["id"]),
            "customer_name": match.get("customer_name"),
            "logo_url": match.get("logo_url"),
            "premium_ai": match.get("premium_ai", False),
            "expires_at": match.get("expires_at"),
            "max_jobs_per_day": match.get("max_jobs_per_day", 100),
        }
    }


@router.post("/heartbeat")
async def license_heartbeat(payload: LicenseHeartbeatRequest, request: Request):
    """Revalidate a running desktop session without issuing a new token."""
    client_ip = request.client.host if request.client else None
    match = _active_license(payload.key, payload.hwid, client_ip)
    update_fields: dict = {
        "last_app_version": payload.app_version,
        "last_platform": payload.platform,
    }
    if client_ip:
        update_fields["last_ip"] = client_ip
    updated = store.update("licenses", match["id"], update_fields) or match
    return {
        "data": {
            "valid": True,
            "license_id": str(updated["id"]),
            "customer_name": updated.get("customer_name"),
            "logo_url": updated.get("logo_url"),
            "premium_ai": updated.get("premium_ai", False),
            "expires_at": updated.get("expires_at"),
            "max_jobs_per_day": updated.get("max_jobs_per_day", 100),
            "app_version": payload.app_version,
            "platform": payload.platform,
        }
    }
