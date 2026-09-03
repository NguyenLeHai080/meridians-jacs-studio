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
    parent_job_id: str | None = Field(default=None, min_length=1, max_length=128)
    scene_id: str | None = Field(default=None, min_length=1, max_length=128)
    split_scenes: bool = False
    analysis_only: bool = False
    clip_start_seconds: float | None = Field(default=None, ge=0)
    clip_end_seconds: float | None = Field(default=None, ge=0)
    output_file_name: str | None = Field(default=None, max_length=180)
    timeline_clips: list[dict] = Field(default_factory=list, max_length=500)
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
    # Branding metadata is safe to sync; local file paths are intentionally
    # excluded because they are only meaningful on the desktop device.
    subtitles_enabled: bool = True
    subtitle_style: str = Field(default="bottom", pattern=r"^(bottom|center|top)$")
    subtitle_text: str | None = Field(default=None, max_length=12000)
    logo_position: str = Field(default="bottom-right", pattern=r"^(top-left|top-right|bottom-left|bottom-right)$")
    logo_opacity: float = Field(default=0.82, ge=0.1, le=1)


class DesktopJobResponse(DesktopJobCreate):
    id: UUID
    status: str
    progress: int
    engine: str
    stage: str | None = None
    error: str | None = None
    output_path: str | None = None
