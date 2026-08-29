from __future__ import annotations

from uuid import UUID
from typing import Optional

from pydantic import BaseModel, Field, HttpUrl
from app.core.compat import StrEnum


class ProviderType(StrEnum):
    openai = "openai"
    gemini = "gemini"
    anthropic = "anthropic"
    openai_compatible = "openai-compatible"
    custom = "custom"


class ProviderCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    provider_type: ProviderType
    base_url: HttpUrl
    model: str = Field(min_length=1, max_length=160)
    api_key: str = Field(min_length=8, max_length=4096)
    capabilities: list[str] = Field(default_factory=list)
    enabled: bool = True


class ProviderUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    base_url: Optional[HttpUrl] = None
    model: Optional[str] = Field(default=None, min_length=1, max_length=160)
    capabilities: Optional[list[str]] = None
    enabled: Optional[bool] = None
    api_key: Optional[str] = Field(default=None, min_length=8, max_length=4096)


class ProviderResponse(BaseModel):
    id: UUID
    name: str
    provider_type: ProviderType
    base_url: HttpUrl
    model: str
    capabilities: list[str]
    enabled: bool
    has_api_key: bool
    masked_key: str
