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
    logo_url: str | None = Field(default=None, max_length=1000)
    notes: str | None = Field(default=None, max_length=1000)
    credit_balance: float = Field(default=0.0, ge=0)
    token_in_price: float | None = Field(default=None, ge=0)
    token_out_price: float | None = Field(default=None, ge=0)
    max_requests_per_day: int | None = Field(default=None, ge=1, le=1000000)
    is_custom_quota: bool = False
    allowed_models: list[str] | None = None
    ai_gateway_enabled: bool = True
    terms_accepted: bool = True
    terms_accepted_at: datetime | None = None
    terms_version: str | None = Field(default="JACS-LEGAL-2026-v2.4", max_length=64)


class CreateLicenseRequest(LicenseBase):
    amount: float = Field(default=0.0, ge=0)
    plan_type: str | None = Field(default=None, max_length=64)
    payment_method: str | None = Field(default=None, max_length=64)


class LicenseUpdateRequest(BaseModel):
    customer_name: str | None = Field(default=None, min_length=1, max_length=160)
    customer_contact: str | None = Field(default=None, min_length=1, max_length=160)
    max_jobs_per_day: int | None = Field(default=None, ge=1, le=100000)
    premium_ai: bool | None = None
    logo_url: str | None = Field(default=None, max_length=1000)
    notes: str | None = Field(default=None, max_length=1000)
    expires_at: datetime | None = None
    credit_balance: float | None = Field(default=None, ge=0)
    token_in_price: float | None = Field(default=None, ge=0)
    token_out_price: float | None = Field(default=None, ge=0)
    max_requests_per_day: int | None = Field(default=None, ge=1, le=1000000)
    is_custom_quota: bool | None = None
    allowed_models: list[str] | None = None
    ai_gateway_enabled: bool | None = None
    terms_accepted: bool | None = None
    terms_accepted_at: datetime | None = None
    terms_version: str | None = Field(default=None, max_length=64)


class GrantCreditRequest(BaseModel):
    amount: float = Field(description="Số credit muốn cộng hoặc đặt lại")
    mode: str = Field(default="add", pattern="^(add|set)$")
    reason: str | None = Field(default=None, max_length=255)


class UpdateAllowedModelsRequest(BaseModel):
    allowed_models: list[str]
    ai_gateway_enabled: bool = True


class LicenseApiConfigRequest(BaseModel):
    credit_balance: float | None = Field(default=None, ge=0)
    token_in_price: float | None = Field(default=None, ge=0)
    token_out_price: float | None = Field(default=None, ge=0)
    max_requests_per_day: int | None = Field(default=None, ge=1, le=1000000)
    is_custom_quota: bool | None = None
    allowed_models: list[str] | None = None
    ai_gateway_enabled: bool | None = None


class LicenseResponse(LicenseBase):
    id: UUID
    key_hint: str
    status: LicenseStatus
    created_at: datetime
    last_seen_at: datetime | None = None
    last_app_version: str | None = None
    last_platform: str | None = None
    last_ip: str | None = None


class LicenseCreatedResponse(LicenseResponse):
    key: str



class ValidateLicenseRequest(BaseModel):
    key: str = Field(min_length=8, max_length=256)
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
    amount: float = Field(default=0.0, ge=0)
    plan_type: str | None = Field(default=None, max_length=64)
    payment_method: str | None = Field(default=None, max_length=64)


class HwidResetRequest(BaseModel):
    hwid: str = Field(min_length=8, max_length=256)
    reason: str = Field(min_length=3, max_length=500)
