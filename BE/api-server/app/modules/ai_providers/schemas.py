from __future__ import annotations

from uuid import UUID

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
    code: str | None = Field(default=None, max_length=120)
    provider_type: ProviderType
    base_url: HttpUrl
    model: str = Field(default="", max_length=160)
    tts_model: str | None = Field(default=None, max_length=160)
    api_key: str = Field(min_length=1, max_length=4096)
    capabilities: list[str] = Field(default_factory=list)
    supported_models: list[str] = Field(default_factory=list)
    cost_per_image: float = 75.0
    is_primary: bool = False
    enabled: bool = True


class FetchModelsRequest(BaseModel):
    base_url: str
    api_key: str | None = None
    provider_id: str | None = None
    provider_type: str | None = "openai"


class ProviderUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    code: str | None = Field(default=None, max_length=120)
    provider_type: ProviderType | None = None
    base_url: HttpUrl | None = None
    model: str | None = Field(default=None, min_length=1, max_length=160)
    tts_model: str | None = Field(default=None, max_length=160)
    capabilities: list[str] | None = None
    supported_models: list[str] | None = None
    cost_per_image: float | None = None
    is_primary: bool | None = None
    latency_ms: int | None = None
    enabled: bool | None = None
    api_key: str | None = Field(default=None, min_length=8, max_length=4096)


class ProviderResponse(BaseModel):
    id: UUID
    name: str
    code: str | None = None
    provider_type: ProviderType
    base_url: HttpUrl
    model: str
    tts_model: str | None = None
    capabilities: list[str] = Field(default_factory=list)
    supported_models: list[str] = Field(default_factory=list)
    cost_per_image: float = 75.0
    is_primary: bool = False
    latency_ms: int | None = None
    enabled: bool
    has_api_key: bool
    masked_key: str


class FailoverConfig(BaseModel):
    enabled: bool = True
    timeout_seconds: int = 45


class ModelPricingItem(BaseModel):
    id: str | None = None
    model: str
    provider_name: str = "Anthropic"
    category: str | None = "analysis"
    cost_input_price: float | None = 0.0
    cost_output_price: float | None = 0.0
    input_price: float = 0.0
    output_price: float = 0.0
    cache_discount_pct: float | None = 20.0
    price_per_request: float | None = 0.0
    is_selling: bool = True
    status: str = "selling"  # "selling" | "need_pricing"
    purpose: str | None = None


class ModelPricingUpdateRequest(BaseModel):
    items: list[ModelPricingItem]

