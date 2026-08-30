from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl

from app.core.compat import StrEnum


class ReleaseChannel(StrEnum):
    stable = "stable"
    beta = "beta"


class ReleaseCreate(BaseModel):
    version: str = Field(pattern=r"^v\d+\.\d+\.\d+$")
    platform: str = Field(pattern=r"^(windows|macos)$")
    channel: ReleaseChannel = ReleaseChannel.stable
    download_url: HttpUrl
    sha512: str = Field(min_length=64, max_length=128)
    release_notes: str = Field(min_length=1, max_length=10000)
    force_update: bool = False
    signature: str | None = Field(default=None, min_length=32, max_length=4096)
    rollout_percent: int = Field(default=100, ge=1, le=100)
    min_app_version: str | None = Field(default=None, pattern=r"^v\d+\.\d+\.\d+$")


class ReleaseResponse(ReleaseCreate):
    id: UUID
    status: str
