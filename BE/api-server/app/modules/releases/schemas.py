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
    sha512: str = Field(pattern=r"^[a-fA-F0-9]{128}$")
    release_notes: str = Field(min_length=1, max_length=10000)
    signature: str | None = None
    force_update: bool = False
class ReleaseResponse(BaseModel):
    id: UUID
    version: str
    platform: str
    channel: str = "stable"
    download_url: str
    sha512: str
    release_notes: str = ""
    force_update: bool = False
    signature: str | None = None
    rollout_percent: int = 100
    min_app_version: str | None = None
    status: str = "published"
    created_at: str | None = None
