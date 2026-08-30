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
    provider_id: UUID | None = None
    project_id: str = Field(default="desktop", min_length=1, max_length=160)


class DesktopJobResponse(DesktopJobCreate):
    id: UUID
    status: str
    progress: int
    engine: str
