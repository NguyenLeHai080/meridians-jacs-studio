from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.core.compat import StrEnum


class LicenseStatus(StrEnum):
    active = "active"
    blocked = "blocked"
    expired = "expired"
    revoked = "revoked"


class LicenseBase(BaseModel):
    customer_name: str = Field(min_length=1, max_length=160)
    customer_contact: str = Field(min_length=1, max_length=160)
    hwid: str = Field(min_length=8, max_length=256)
    expires_at: datetime | None = None
    max_jobs_per_day: int = Field(default=100, ge=1, le=100000)
    premium_ai: bool = False


class CreateLicenseRequest(LicenseBase):
    pass


class LicenseResponse(LicenseBase):
    id: UUID
    key_hint: str
    status: LicenseStatus
    created_at: datetime
    last_seen_at: datetime | None = None
    last_app_version: str | None = None
    last_platform: str | None = None


class LicenseCreatedResponse(LicenseResponse):
    key: str


class ValidateLicenseRequest(BaseModel):
    key: str = Field(min_length=8, max_length=128)
    hwid: str = Field(min_length=8, max_length=256)


class LicenseHeartbeatRequest(ValidateLicenseRequest):
    """Periodic desktop check-in used to enforce revoke/expiry promptly."""

    app_version: str = Field(min_length=1, max_length=32)
    platform: str = Field(pattern=r"^(windows|macos|linux)$")


class LicenseStatusUpdate(BaseModel):
    status: LicenseStatus


class LicenseRenewRequest(BaseModel):
    expires_at: datetime
    reason: str = Field(min_length=3, max_length=500)


class HwidResetRequest(BaseModel):
    hwid: str = Field(min_length=8, max_length=256)
    reason: str = Field(min_length=3, max_length=500)
