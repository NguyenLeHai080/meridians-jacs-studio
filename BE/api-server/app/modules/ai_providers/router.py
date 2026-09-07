import asyncio
from uuid import UUID

from fastapi import APIRouter, Depends

from app.core.config import get_settings
from app.core.errors import AppError
from app.core.providers.connection import test_connection
from app.core.providers.endpoint_policy import validate_provider_endpoint
from app.core.providers.secrets import secret_store
from app.core.security import require_auth
from app.core.store import store
from app.modules.ai_providers.schemas import (
    ProviderCreate,
    ProviderResponse,
    ProviderUpdate,
)

router = APIRouter(prefix="/api/v1/ai-providers", tags=["ai-providers"])


def public_provider(item: dict) -> dict:
    return {key: value for key, value in item.items() if key not in {"api_key", "secret_ref", "masked_key"}} | {
        "has_api_key": bool(item.get("secret_ref")),
        "masked_key": item.get("masked_key", "********"),
    }


@router.post("", response_model=ProviderResponse, status_code=201)
async def create_provider(payload: ProviderCreate, _: dict = Depends(require_auth)):
    validate_provider_endpoint(str(payload.base_url))
    values = payload.model_dump(mode="json")
    api_key = values.pop("api_key")
    values["secret_ref"] = secret_store.put(api_key)
    values["masked_key"] = "********" + api_key[-4:]
    record = store.create("providers", values)
    return public_provider(record)


@router.get("", response_model=list[ProviderResponse])
async def list_providers(_: dict = Depends(require_auth)):
    return [public_provider(item) for item in store.list("providers")]


@router.patch("/{provider_id}", response_model=ProviderResponse)
@router.put("/{provider_id}", response_model=ProviderResponse)
async def update_provider(provider_id: UUID, payload: ProviderUpdate, _: dict = Depends(require_auth)):
    provider = store.get("providers", UUID(str(provider_id)))
    if not provider:
        raise AppError("PROVIDER_NOT_FOUND", "Không tìm thấy provider", 404)
    values = payload.model_dump(mode="json", exclude_unset=True)
    if "base_url" in values:
        validate_provider_endpoint(values["base_url"])
    api_key = values.pop("api_key", None)
    if api_key:
        old_ref = provider.get("secret_ref")
        values["secret_ref"] = secret_store.put(api_key)
        values["masked_key"] = "********" + api_key[-4:]
        secret_store.delete(old_ref)
    updated = store.update("providers", provider["id"], values)
    return public_provider(updated or provider)


@router.get("/{provider_id}/capabilities", response_model=list[str])
async def provider_capabilities(provider_id: UUID, _: dict = Depends(require_auth)):
    provider = store.get("providers", UUID(str(provider_id)))
    if not provider:
        raise AppError("PROVIDER_NOT_FOUND", "Không tìm thấy provider", 404)
    return provider["capabilities"]


@router.delete("/{provider_id}")
async def delete_provider(provider_id: UUID, _: dict = Depends(require_auth)):
    provider = store.get("providers", UUID(str(provider_id)))
    if not provider:
        raise AppError("PROVIDER_NOT_FOUND", "Không tìm thấy provider", 404)
    secret_store.delete(provider.get("secret_ref"))
    store.delete("providers", provider["id"])
    return {"data": {"success": True, "message": "Đã xóa provider thành công"}}


@router.post("/{provider_id}/test")
async def test_provider(provider_id: UUID, _: dict = Depends(require_auth)):
    provider = store.get("providers", UUID(str(provider_id)))
    if not provider:
        raise AppError("PROVIDER_NOT_FOUND", "Không tìm thấy provider", 404)
    secret = secret_store.get(provider.get("secret_ref", ""))
    if not secret or secret.startswith("secret://"):
        return {"data": {
            "provider_id": str(provider["id"]),
            "status": "missing_api_key",
            "http_status": 400,
            "latency_ms": 0,
            "detail": "Chưa có API Key thực tế (Bấm 'Sửa' để nhập API Key của bạn)",
            "capabilities": provider.get("capabilities", [])
        }}
    result = await asyncio.to_thread(
        test_connection,
        str(provider["provider_type"]),
        str(provider["base_url"]),
        provider["model"],
        secret,
        get_settings().provider_timeout_seconds,
    )
    return {"data": {"provider_id": str(provider["id"]), **result.__dict__, "capabilities": provider["capabilities"]}}


DEFAULT_MODELS_PRICING = [
    {
        "id": "mp-1",
        "model": "gemini-2.5-flash",
        "provider_name": "Google Gemini",
        "category": "vision",
        "cost_input_price": 300.0,
        "cost_output_price": 600.0,
        "input_price": 500.0,
        "output_price": 900.0,
        "is_selling": True,
        "status": "selling",
        "purpose": "Thị giác video 1M tokens, trích xuất cảnh & multimodal siêu tốc",
    },
    {
        "id": "mp-2",
        "model": "gemini-flash-latest",
        "provider_name": "Google Gemini",
        "category": "vision",
        "cost_input_price": 300.0,
        "cost_output_price": 600.0,
        "input_price": 500.0,
        "output_price": 900.0,
        "is_selling": True,
        "status": "selling",
        "purpose": "Bản Flash mới nhất luôn cập nhật từ Google AI Studio",
    },
    {
        "id": "mp-3",
        "model": "claude-3-7-sonnet",
        "provider_name": "Anthropic Claude",
        "category": "cinema",
        "cost_input_price": 750.0,
        "cost_output_price": 1200.0,
        "input_price": 1100.0,
        "output_price": 1800.0,
        "is_selling": True,
        "status": "selling",
        "purpose": "Biên kịch điện ảnh chuyên sâu, văn phong tự nhiên sâu sắc",
    },
    {
        "id": "mp-4",
        "model": "claude-opus-4.8",
        "provider_name": "Anthropic Claude",
        "category": "cinema",
        "cost_input_price": 850.0,
        "cost_output_price": 1400.0,
        "input_price": 1250.0,
        "output_price": 2100.0,
        "is_selling": True,
        "status": "selling",
        "purpose": "Kịch bản điện ảnh & review phim triệu view, xây dựng cao trào",
    },
    {
        "id": "mp-5",
        "model": "gpt-5.5",
        "provider_name": "OpenAI",
        "category": "cinema",
        "cost_input_price": 700.0,
        "cost_output_price": 1100.0,
        "input_price": 1050.0,
        "output_price": 1650.0,
        "is_selling": True,
        "status": "selling",
        "purpose": "Kịch bản điện ảnh thế hệ mới, văn phong đa tầng nghĩa",
    },
    {
        "id": "mp-6",
        "model": "gpt-4o",
        "provider_name": "OpenAI",
        "category": "vision",
        "cost_input_price": 650.0,
        "cost_output_price": 1000.0,
        "input_price": 950.0,
        "output_price": 1500.0,
        "is_selling": True,
        "status": "selling",
        "purpose": "Thị giác nhận diện khung hình, trích xuất nhân vật & âm thanh",
    },
    {
        "id": "mp-7",
        "model": "deepseek-reasoner",
        "provider_name": "DeepSeek",
        "category": "reasoning",
        "cost_input_price": 200.0,
        "cost_output_price": 450.0,
        "input_price": 350.0,
        "output_price": 700.0,
        "is_selling": True,
        "status": "selling",
        "purpose": "Suy luận logic CoT (Chain-of-Thought) độc lập, chi phí siêu rẻ",
    },
    {
        "id": "mp-8",
        "model": "llama-3.3-70b-versatile",
        "provider_name": "Groq",
        "category": "speed",
        "cost_input_price": 150.0,
        "cost_output_price": 300.0,
        "input_price": 280.0,
        "output_price": 500.0,
        "is_selling": True,
        "status": "selling",
        "purpose": "Phản hồi kịch bản thời gian thực dưới 200ms trên chip LPU",
    },
    {
        "id": "mp-9",
        "model": "eleven_multilingual_v2",
        "provider_name": "ElevenLabs",
        "category": "tts",
        "cost_input_price": 800.0,
        "cost_output_price": 1200.0,
        "input_price": 1200.0,
        "output_price": 1800.0,
        "is_selling": True,
        "status": "selling",
        "purpose": "Lồng tiếng AI đa cảm xúc phòng thu điện ảnh",
    },
    {
        "id": "mp-10",
        "model": "vi-manhdung",
        "provider_name": "Vbee",
        "category": "tts",
        "cost_input_price": 400.0,
        "cost_output_price": 700.0,
        "input_price": 650.0,
        "output_price": 1100.0,
        "is_selling": True,
        "status": "selling",
        "purpose": "Giọng đọc Review Phim YouTube quốc dân Việt Nam",
    },
    {
        "id": "mp-11",
        "model": "whisper-large-v3",
        "provider_name": "Whisper",
        "category": "transcription",
        "cost_input_price": 350.0,
        "cost_output_price": 500.0,
        "input_price": 550.0,
        "output_price": 850.0,
        "is_selling": True,
        "status": "selling",
        "purpose": "Bóc tách audio phim thành phụ đề chuẩn xác từng mili-giây",
    },
]


def _get_or_seed_models_pricing() -> list[dict]:
    existing = store.list("models_pricing")
    if not existing:
        for item in DEFAULT_MODELS_PRICING:
            store.create("models_pricing", item.copy())
        existing = store.list("models_pricing")
    return existing


@router.get("/models-pricing")
async def get_models_pricing(_: dict = Depends(require_auth)):
    items = _get_or_seed_models_pricing()
    return {"data": items}


@router.put("/models-pricing")
async def save_models_pricing(payload: dict, user: dict = Depends(require_auth)):
    items = payload.get("items", [])
    # Clear existing and write new
    existing = store.list("models_pricing")
    for e in existing:
        store.delete("models_pricing", e["id"])
    
    saved = []
    for idx, item in enumerate(items):
        clean_item = {
            "id": item.get("id") or f"mp-{idx+1}",
            "model": item.get("model", "custom-model"),
            "provider_name": item.get("provider_name", "API"),
            "category": item.get("category", "analysis"),
            "cost_input_price": float(item.get("cost_input_price", 0.0) or 0.0),
            "cost_output_price": float(item.get("cost_output_price", 0.0) or 0.0),
            "input_price": float(item.get("input_price", 0.0) or 0.0),
            "output_price": float(item.get("output_price", 0.0) or 0.0),
            "cache_discount_pct": float(item.get("cache_discount_pct", 20.0) or 20.0),
            "price_per_request": float(item.get("price_per_request", 0.0) or 0.0),
            "is_selling": bool(item.get("is_selling", False)),
            "status": "selling" if item.get("is_selling") else "need_pricing",
            "purpose": item.get("purpose", ""),
        }
        rec = store.create("models_pricing", clean_item)
        saved.append(rec)
    
    store.create("audit", {
        "action": "ai_providers.models_pricing_updated",
        "count": len(saved),
        "actor": user["email"],
    })
    return {"data": saved, "message": "Đã lưu toàn bộ bảng giá model thành công"}


@router.post("/models-sync")
async def sync_provider_models(user: dict = Depends(require_auth)):
    providers = store.list("providers")
    current_pricing = _get_or_seed_models_pricing()
    existing_models = {p.get("model") for p in current_pricing}

    added = 0
    for p in providers:
        m = p.get("model")
        if m and m not in existing_models:
            p_name = p.get("provider_type", "API").capitalize()
            store.create("models_pricing", {
                "id": f"mp-{len(current_pricing) + added + 1}",
                "model": m,
                "provider_name": p_name,
                "category": "analysis",
                "cost_input_price": 500.0,
                "cost_output_price": 800.0,
                "input_price": 800.0,
                "output_price": 1250.0,
                "is_selling": True,
                "status": "selling",
                "purpose": p.get("purpose", "Xử lý tác vụ AI"),
            })
            existing_models.add(m)
            added += 1

    return {"data": store.list("models_pricing"), "message": f"Đã đồng bộ thành công ({added} model mới được thêm)"}


@router.get("/models-available")
async def get_available_models():
    """Public/Client endpoint: Return only models currently licensed/selling for Desktop Tool."""
    all_pricing = _get_or_seed_models_pricing()
    # Filter only is_selling
    active_models = [m for m in all_pricing if m.get("is_selling", False)]
    return {"data": active_models}

