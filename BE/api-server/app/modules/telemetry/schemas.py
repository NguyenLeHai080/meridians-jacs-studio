from __future__ import annotations

from pydantic import BaseModel, Field
from app.core.compat import StrEnum
from typing import Optional


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
    hwid_hash: Optional[str] = Field(default=None, max_length=128)
