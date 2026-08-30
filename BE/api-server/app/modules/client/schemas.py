from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, Field

from app.modules.jobs.schemas import ExecutionMode, JobKind


class DesktopJobCreate(BaseModel):
    """Non-sensitive job metadata submitted from an activated desktop tool."""

    client_job_id: str = Field(min_length=8, max_length=128, pattern=r"^[A-Za-z0-9_-]+$")
    name: str = Field(min_length=1, max_length=160)
    source_name: str = Field(min_length=1, max_length=255)
    kind: JobKind = JobKind.render
    execution_mode: ExecutionMode
    # Desktop BYOK profiles live in the customer's OS secure storage, so their
    # identifier is intentionally opaque to the API (it is not a managed
    # provider UUID from the Admin Portal).
    provider_id: str | None = Field(default=None, min_length=1, max_length=128)
    tts_provider_id: str | None = Field(default=None, min_length=1, max_length=128)
    project_id: str = Field(default="desktop", min_length=1, max_length=160)
    source_type: str = Field(default="file", pattern=r"^(file|url)$")
    duration_seconds: float | None = Field(default=None, ge=0)
    tokens_used: int = Field(default=0, ge=0)
    credits_used: int = Field(default=0, ge=0)
    narrator_enabled: bool = False
    narrator_voice: str | None = Field(default=None, max_length=80)
    narrator_gender: str | None = Field(default=None, pattern=r"^(male|female)$")
    languages: list[str] = Field(default_factory=list, max_length=12)
    keep_original_audio: bool = True
    emphasize_hook: bool = False
    highlight_only: bool = False
    highlight_max_seconds: int = Field(default=30, ge=3, le=600)
    background_music: bool = False
    background_music_volume: int = Field(default=20, ge=0, le=100)


class DesktopJobResponse(DesktopJobCreate):
    id: UUID
    status: str
    progress: int
    engine: str
    stage: str | None = None
    error: str | None = None
    output_path: str | None = None
