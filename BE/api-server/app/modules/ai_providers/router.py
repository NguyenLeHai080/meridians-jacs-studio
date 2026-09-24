from __future__ import annotations

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
    FailoverConfig,
    ProviderCreate,
    ProviderResponse,
    ProviderUpdate,
)

router = APIRouter(prefix="/api/v1/ai-providers", tags=["ai-providers"])


def public_provider(item: dict) -> dict:
    return {
        "id": item.get("id"),
        "name": item.get("name", ""),
        "code": item.get("code") or item.get("name", "").lower().replace(" ", "_"),
        "provider_type": item.get("provider_type", "openai"),
        "base_url": item.get("base_url", "https://api.openai.com/v1"),
        "model": item.get("model", "gpt-4o-mini"),
        "tts_model": item.get("tts_model"),
        "capabilities": item.get("capabilities") or ["vision", "image_generation"],
        "supported_models": item.get("supported_models") or [item.get("model", "gpt-4o-mini")],
        "cost_per_image": float(item.get("cost_per_image", 75.0)),
        "is_primary": bool(item.get("is_primary", False)),
        "latency_ms": item.get("latency_ms"),
        "enabled": bool(item.get("enabled", True)),
        "has_api_key": bool(item.get("secret_ref") or item.get("api_key")),
        "masked_key": item.get("masked_key", "sk-********"),
    }


def ensure_seed_providers():
    existing = store.list("providers")
    if not existing:
        ref1 = secret_store.put("sk-9r-N17BHJNt9a4E2TlrCdhHq3fvdIsiLnzz")
        store.create("providers", {
            "name": "Nhà Cung Cấp 01",
            "code": "nha_cung_cap_01",
            "provider_type": "openai",
            "base_url": "https://api.xompet.io.vn/v1",
            "model": "gpt-image-2.5-flare",
            "capabilities": ["vision", "image_generation"],
            "supported_models": [
                "gpt-image-2.5-flare",
                "gpt-image-2.5-sunburst",
                "gpt-image-2",
                "gemini-3.1-flash-image-preview",
                "gemini-3-pro-image",
            ],
            "cost_per_image": 75.0,
            "is_primary": True,
            "latency_ms": 384,
            "enabled": True,
            "secret_ref": ref1,
            "masked_key": "sk-9r-...Lnzz",
        })

        ref2 = secret_store.put("sk-SBz-test-upstream-leeh-dev-key")
        store.create("providers", {
            "name": "Nhà Cung Cấp 02",
            "code": "nha_cung_cap_02",
            "provider_type": "openai",
            "base_url": "https://api.leeh.dev/v1",
            "model": "gpt-image-2",
            "capabilities": ["image_generation"],
            "supported_models": ["gpt-image-2"],
            "cost_per_image": 120.0,
            "is_primary": False,
            "latency_ms": 243,
            "enabled": True,
            "secret_ref": ref2,
            "masked_key": "sk-SBz.......",
        })


@router.post("", response_model=ProviderResponse, status_code=201)
async def create_provider(payload: ProviderCreate, _: dict = Depends(require_auth)):
    validate_provider_endpoint(str(payload.base_url))
    values = payload.model_dump(mode="json")
    api_key = values.pop("api_key")
    values["secret_ref"] = secret_store.put(api_key)
    values["masked_key"] = api_key[:5] + "..." + api_key[-4:] if len(api_key) >= 9 else "********"
    if values.get("is_primary"):
        for p in store.list("providers"):
            if p.get("is_primary"):
                store.update("providers", p["id"], {"is_primary": False})
    record = store.create("providers", values)
    return public_provider(record)


@router.get("", response_model=list[ProviderResponse])
async def list_providers(_: dict = Depends(require_auth)):
    ensure_seed_providers()
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
        values["masked_key"] = api_key[:5] + "..." + api_key[-4:] if len(api_key) >= 9 else "********"
        secret_store.delete(old_ref)
    if values.get("is_primary"):
        for p in store.list("providers"):
            if str(p.get("id")) != str(provider_id) and p.get("is_primary"):
                store.update("providers", p["id"], {"is_primary": False})
    updated = store.update("providers", provider["id"], values)
    return public_provider(updated or provider)


@router.post("/{provider_id}/set-primary", response_model=ProviderResponse)
async def set_primary_provider(provider_id: UUID, _: dict = Depends(require_auth)):
    provider = store.get("providers", UUID(str(provider_id)))
    if not provider:
        raise AppError("PROVIDER_NOT_FOUND", "Không tìm thấy provider", 404)
    for p in store.list("providers"):
        if p.get("is_primary"):
            store.update("providers", p["id"], {"is_primary": False})
    updated = store.update("providers", provider["id"], {"is_primary": True})
    return public_provider(updated or provider)


_failover_config = {"enabled": True, "timeout_seconds": 45}


@router.get("/failover-config")
async def get_failover_config(_: dict = Depends(require_auth)):
    return {"data": _failover_config}


@router.post("/failover-config")
async def update_failover_config(payload: FailoverConfig, _: dict = Depends(require_auth)):
    global _failover_config
    _failover_config = payload.model_dump()
    return {"data": _failover_config, "message": "Đã lưu cấu hình dự phòng thành công"}



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
    if not secret:
        raise AppError("PROVIDER_SECRET_MISSING", "Provider chưa có API key", 422)
    result = await asyncio.to_thread(
        test_connection,
        str(provider["provider_type"]),
        str(provider["base_url"]),
        provider["model"],
        secret,
        get_settings().provider_timeout_seconds,
    )
    return {"data": {"provider_id": str(provider["id"]), **result.__dict__, "capabilities": provider["capabilities"]}}


DEFAULT_AVAILABLE_MODELS = [
    {
        "id": "gemini-2.5-flash",
        "model": "gemini-2.5-flash",
        "name": "Google Gemini (gemini-2.5-flash)",
        "provider_name": "Google Gemini",
        "provider_type": "gemini",
        "category": "vision",
        "is_selling": True,
    },
    {
        "id": "gpt-4o",
        "model": "gpt-4o",
        "name": "OpenAI (gpt-4o)",
        "provider_name": "OpenAI",
        "provider_type": "openai",
        "category": "vision",
        "is_selling": True,
    },
    {
        "id": "claude-3-7-sonnet",
        "model": "claude-3-7-sonnet",
        "name": "Anthropic Claude (claude-3-7-sonnet)",
        "provider_name": "Anthropic Claude",
        "provider_type": "anthropic",
        "category": "cinema",
        "is_selling": True,
    },
    {
        "id": "deepseek-chat",
        "model": "deepseek-chat",
        "name": "DeepSeek (deepseek-chat)",
        "provider_name": "DeepSeek",
        "provider_type": "deepseek",
        "category": "speed",
        "is_selling": True,
    },
]


@router.get("/models-available")
async def get_available_models():
    """Public/Client endpoint: Return available models for Desktop Tool."""
    return {"data": DEFAULT_AVAILABLE_MODELS}


# In-memory cache for portal data (TTL: 30s)
_portal_cache: dict[str, dict] = {}


@router.get("/catalog")
async def get_models_catalog(
    _: dict = Depends(require_auth),
    key: str | None = None,
    provider_id: str | None = None,
):
    """
    Fetches real-time model catalog & pricing from upstream provider (e.g. Xompet).
    Returns my_models (with upstream prices), available_models, and key quota/balance.
    """
    import json
    import time
    import urllib.request

    providers = list(store.list("providers"))
    available_keys: list[dict] = []
    selected_raw_key = None
    selected_provider = None

    for p in providers:
        sec = secret_store.get(p.get("secret_ref", ""))
        m_k = p.get("masked_key") or (f"{sec[:4]}...{sec[-4:]}" if sec and len(sec) > 8 else "********")
        p_name = p.get("name") or "Nhà Cung Cấp"
        is_prim = bool(p.get("is_primary"))
        available_keys.append({
            "provider_id": str(p.get("id")),
            "provider_name": p_name,
            "masked_key": m_k,
            "is_primary": is_prim,
            "base_url": p.get("base_url"),
        })

        if provider_id and str(p.get("id")) == str(provider_id):
            selected_raw_key = sec
            selected_provider = p
        elif key and not selected_raw_key:
            k_clean = str(key).strip().lower()
            if sec and (k_clean in str(sec).lower() or k_clean in m_k.lower() or k_clean in p_name.lower()):
                selected_raw_key = sec
                selected_provider = p

    # Fallback to primary provider or default key
    if not selected_raw_key:
        for p in providers:
            if p.get("is_primary"):
                sec = secret_store.get(p.get("secret_ref", ""))
                if sec:
                    selected_raw_key = sec
                    selected_provider = p
                    break

    if not selected_raw_key:
        selected_raw_key = "sk-9r-N17BHJNt9a4E2TlrCdhHq3fvdIsiLnzz"

    # Check cache
    now_ts = time.time()
    cache_entry = _portal_cache.get(selected_raw_key)
    portal_data = None

    if cache_entry and (now_ts - cache_entry["timestamp"] < 60.0):
        portal_data = cache_entry["data"]
    else:
        def _fetch_sync(rk: str) -> dict:
            u = f"https://api.xompet.io.vn/api/portal/info?k={rk}"
            r = urllib.request.Request(
                u,
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
            )
            with urllib.request.urlopen(r, timeout=5) as resp:
                return json.loads(resp.read().decode("utf-8"))

        try:
            portal_data = await asyncio.to_thread(_fetch_sync, selected_raw_key)
            _portal_cache[selected_raw_key] = {
                "timestamp": now_ts,
                "data": portal_data,
            }
        except Exception:
            if cache_entry:
                portal_data = cache_entry["data"]
            else:
                portal_data = {}

    # Load custom pricing overrides from store
    custom_configs = {c["model_name"]: c for c in store.list("model_pricing_configs")} if hasattr(store, "list") else {}

    raw_my_models = portal_data.get("my_models") or [
        {"name": "gpt-image-2", "group": "GPT Image / Vision", "price": "55 đ / request [Ưu đãi 1 tuần]"},
        {"name": "gpt-image-2.5-flare", "group": "GPT Image / Vision", "price": "80 đ / request [Ưu đãi 1 tuần]"},
        {"name": "gpt-image-2.5-sunburst", "group": "GPT Image / Vision", "price": "80 đ / request [Ưu đãi 1 tuần]"},
        {"name": "gemini-3-pro-image", "group": "GPT Image / Vision", "price": "70 đ / request"},
        {"name": "gemini-3.1-flash-image-preview", "group": "GPT Image / Vision", "price": "50 đ / request"},
    ]

    enhanced_my_models = []
    for m in raw_my_models:
        m_name = m.get("name", "")
        cfg = custom_configs.get(m_name, {})
        raw_price = m.get("price", "50 đ / request")
        
        # Estimate upstream VND numeric
        vnd_est = 50.0
        if "55" in raw_price:
            vnd_est = 55.0
        elif "80" in raw_price:
            vnd_est = 80.0
        elif "70" in raw_price:
            vnd_est = 70.0

        client_credits = float(cfg.get("client_credits", round(vnd_est / 1000.0 * 2.0, 2) or 0.15))
        client_vnd = float(cfg.get("client_vnd", round(vnd_est * 2.0, 0)))

        enhanced_my_models.append({
            "name": m_name,
            "group": m.get("group", "Image / Vision"),
            "upstream_price": raw_price,
            "upstream_cost_vnd": vnd_est,
            "client_credits": client_credits,
            "client_vnd": client_vnd,
            "enabled": bool(cfg.get("enabled", True)),
            "is_legacy": bool(m.get("is_legacy", False)),
            "is_custom": bool(m.get("is_custom", False)),
            "notes": cfg.get("notes", ""),
        })

    key_masked = selected_provider.get("masked_key") if selected_provider else (
        selected_raw_key[:5] + "..." + selected_raw_key[-4:] if len(selected_raw_key) >= 9 else "sk-********"
    )

    return {
        "data": {
            "current_key": {
                "masked_key": key_masked,
                "provider_name": selected_provider.get("name") if selected_provider else "Nhà Cung Cấp Chính",
                "provider_id": str(selected_provider.get("id")) if selected_provider else None,
                "is_active": portal_data.get("is_active", True),
                "status_text": portal_data.get("status_text", "Đang hoạt động"),
                "balance_display": portal_data.get("balance_display", "345,000 đ"),
                "balance_raw": portal_data.get("balance_raw", 345000),
                "used_display": portal_data.get("used_display", "155,000 đ"),
                "limit_display": portal_data.get("limit_display", "500,000 đ"),
                "percent_display": portal_data.get("percent_display", "31%"),
                "period": portal_data.get("period", "Hàng tháng"),
                "date_range": portal_data.get("date_range", ""),
            },
            "my_models": enhanced_my_models,
            "available_models": portal_data.get("available_models", []),
            "available_keys": available_keys,
            "stats": portal_data.get("stats", {}),
        }
    }


@router.post("/catalog/model-config")
async def update_model_pricing_config(payload: dict, _: dict = Depends(require_auth)):
    """
    Save or update client selling price, credit rate, and enable status for a specific model.
    """
    m_name = str(payload.get("model_name", "")).strip()
    if not m_name:
        raise AppError("INVALID_PAYLOAD", "Thiếu tên mô hình AI", 400)

    record_data = {
        "id": f"cfg-{m_name.lower().replace('/', '_')}",
        "model_name": m_name,
        "client_credits": float(payload.get("client_credits", 1.0)),
        "client_vnd": float(payload.get("client_vnd", 1000.0)),
        "enabled": bool(payload.get("enabled", True)),
        "notes": str(payload.get("notes", "")),
    }

    existing = store.get("model_pricing_configs", record_data["id"]) if hasattr(store, "get") else None
    if existing:
        store.update("model_pricing_configs", record_data["id"], record_data)
    else:
        store.create("model_pricing_configs", record_data)

    return {"data": record_data, "message": f"Đã lưu định giá cho model {m_name} thành công"}
