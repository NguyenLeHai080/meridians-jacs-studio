from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    aspect_ratio: str = Field(default="9:16", pattern=r"^\d+:\d+$")
    source_path: Optional[str] = Field(default=None, max_length=2048)


class ProjectResponse(ProjectCreate):
    id: UUID
    created_at: datetime
    updated_at: datetime
