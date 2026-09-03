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
