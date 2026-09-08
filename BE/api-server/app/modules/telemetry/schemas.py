from __future__ import annotations

from pydantic import BaseModel, Field

from app.core.compat import StrEnum


class Severity(StrEnum):
    warning = "warning"
    error = "error"
    fatal = "fatal"


class TelemetryEvent(BaseModel):
    event_name: str = Field(min_length=1, max_length=120)
    severity: Severity
    app_version: str = Field(min_length=1, max_length=40)
    fingerprint: str = Field(min_length=1, max_length=160)
    message: str = Field(min_length=1, max_length=2000)
    hwid_hash: str | None = Field(default=None, max_length=128)


class AiRequestTelemetryInput(BaseModel):
    model: str = Field(default="gemini-2.5-flash", max_length=120)
    provider_type: str = Field(default="ai_gateway", max_length=60)
    latency_ms: int = Field(default=0, ge=0)
    status_code: int = Field(default=200)
    status: str = Field(default="Oke", max_length=20)
    tokens_in: int = Field(default=0, ge=0)
    tokens_out: int = Field(default=0, ge=0)
    total_tokens: int = Field(default=0, ge=0)
    credits_deducted: float = Field(default=0.0, ge=0.0)
    cost_vnd: float = Field(default=0.0, ge=0.0)
    feature_name: str = Field(default="Phân tích Video AI", max_length=160)
    error_message: str | None = Field(default=None, max_length=4000)
    license_key: str | None = Field(default=None, max_length=120)
    hwid: str | None = Field(default=None, max_length=160)
    timestamp: str | None = Field(default=None, max_length=60)

