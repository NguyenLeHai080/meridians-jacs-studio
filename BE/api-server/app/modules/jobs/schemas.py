from __future__ import annotations

from uuid import UUID
from typing import Optional

from pydantic import BaseModel, Field
from app.core.compat import StrEnum


class JobKind(StrEnum):
    analysis = "analysis"
    tts = "tts"
    render = "render"


class ExecutionMode(StrEnum):
    local_cpu = "local-cpu"
    local_gpu = "local-gpu"
    cloud = "cloud"
    hybrid = "hybrid"


class JobCreate(BaseModel):
    kind: JobKind
    execution_mode: ExecutionMode
    provider_id: Optional[UUID] = None
    project_id: str = Field(min_length=1, max_length=160)


class JobResponse(JobCreate):
    id: UUID
    status: str
    progress: int
