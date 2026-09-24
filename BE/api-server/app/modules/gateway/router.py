from __future__ import annotations

import asyncio
import json
import logging
import time
import urllib.error
import urllib.request
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Header
from pydantic import BaseModel, Field

from app.core.errors import AppError
from app.core.providers.secrets import secret_store
from app.core.store import store
from app.modules.licensing.router import _active_license

logger = logging.getLogger("jacs.gateway")

router = APIRouter(tags=["ai-gateway"])

# Default client costs
DEFAULT_CREDIT_PER_IMAGE = 5.0
DEFAULT_COST_PER_IMAGE_VND = 3560.0


class ImageGenerationRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=4000)
    model: str | None = Field(default=None, description="gpt-image-2, gpt-image-2.5-flare, etc.")
    n: int | None = Field(default=1, ge=1, le=4)
    size: str | None = Field(default="1024x1024")
    response_format: str | None = Field(default="url", pattern=r"^(url|b64_json)$")
    quality: str | None = None
    style: str | None = None


class ChatCompletionRequest(BaseModel):
    model: str = Field(min_length=1)
    messages: list[dict[str, Any]]
    temperature: float | None = Field(default=0.7)
    max_tokens: int | None = Field(default=1024)
    stream: bool | None = Field(default=False)


def _resolve_client_license(license_key: str | None, device_id: str | None) -> dict | None:
    """Validate client license if provided in headers."""
    if not license_key or not device_id:
        return None
    try:
        return _active_license(license_key, device_id)
    except AppError:
        # Fallback search in store
        clean_k = license_key.strip().upper()
        clean_h = device_id.strip().lower()
        for lic in store.list("licenses"):
            raw_k = str(lic.get("raw_key") or lic.get("key") or "").upper()
            raw_h = str(lic.get("hwid") or "").lower()
            if clean_k and (clean_k == raw_k or raw_k.endswith(clean_k[-4:])):
                return lic
            if clean_h and raw_h and clean_h == raw_h:
                return lic
        raise


def _get_providers_for_dispatch() -> list[dict]:
    """Retrieve enabled providers sorted by primary status."""
    all_providers = store.list("providers")
    enabled = [p for p in all_providers if p.get("enabled", True)]
    # Put primary first, then others
    enabled.sort(key=lambda x: (not x.get("is_primary", False)))
    return enabled


def _dispatch_upstream(
    url: str,
    payload: dict,
    api_key: str,
    timeout: float = 60.0,
) -> tuple[int, dict, int]:
    """Send request to upstream AI provider with standard headers."""
    req_data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=req_data,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        method="POST",
    )

    t0 = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            latency_ms = max(1, int((time.perf_counter() - t0) * 1000))
            raw_body = resp.read().decode("utf-8")
            data = json.loads(raw_body)
            return resp.status, data, latency_ms
    except urllib.error.HTTPError as exc:
        latency_ms = max(1, int((time.perf_counter() - t0) * 1000))
        raw_err = exc.read().decode("utf-8", errors="ignore")
        try:
            err_data = json.loads(raw_err)
        except Exception:
            err_data = {"error": {"message": raw_err or str(exc)}}
        return exc.code, err_data, latency_ms
    except Exception as exc:
        latency_ms = max(1, int((time.perf_counter() - t0) * 1000))
        return 504, {"error": {"message": f"Gateway timeout / unreachable: {exc}"}}, latency_ms


def _record_gateway_log(
    model: str,
    provider_name: str,
    endpoint: str,
    status_code: int,
    latency_ms: int,
    cost_vnd: float,
    credit_used: float,
    lic: dict | None,
    hwid: str | None,
    error_msg: str | None = None,
):
    """Save request telemetry to ai_gateway_logs for live monitoring."""
    now = datetime.now(UTC)
    is_fail = status_code >= 400
    
    log_id = f"gw-{int(now.timestamp()*1000)}"
    cust_name = lic.get("customer_name") if lic else "Khách hàng Desktop"
    lic_id = lic.get("id") if lic else None
    lic_key = lic.get("raw_key") or lic.get("key") if lic else None

    entry = {
        "id": log_id,
        "timestamp": now.isoformat(),
        "model": model,
        "provider_type": "openai",
        "provider_name": provider_name,
        "endpoint": endpoint,
        "status": "Fail" if is_fail else "Oke",
        "status_code": status_code,
        "latency_ms": latency_ms,
        "tokens_in": 0,
        "tokens_out": 0,
        "total_tokens": 0,
        "credits_deducted": credit_used,
        "credit_used": credit_used,
        "cost_vnd": cost_vnd,
        "license_id": lic_id,
        "license_key": lic_key,
        "hwid": hwid or (lic.get("hwid") if lic else "HWID-DESKTOP"),
        "customer_name": cust_name,
        "client_name": cust_name,
        "feature_name": "Tạo Ảnh AI (Image Generation)",
        "error_message": error_msg if is_fail else None,
    }
    try:
        store.create("ai_gateway_logs", entry)
    except Exception as e:
        logger.warning("Failed to store gateway log: %s", e)


# ==============================================================================
# 1. IMAGE GENERATION (INTERMEDIARY GATEWAY)
# ==============================================================================

@router.post("/api/v1/gateway/images/generations")
@router.post("/api/v1/client/ai/generate-image")
async def gateway_generate_image(
    payload: ImageGenerationRequest,
    license_key: str | None = Header(default=None, alias="X-License-Key"),
    device_id: str | None = Header(default=None, alias="X-Device-Id"),
):
    """
    Intermediary AI Gateway for Image Generation.
    1. Validates client license and credit balance (if provided).
    2. Dispatches to active Upstream Provider (Xompet) with secret key.
    3. Handles automatic failover to backup provider if primary fails.
    4. Deducts client credit balance and logs telemetry into the system.
    """
    # 1. License & Credit Check
    lic = _resolve_client_license(license_key, device_id)
    credit_cost = DEFAULT_CREDIT_PER_IMAGE
    
    if lic:
        current_bal = float(lic.get("credit_balance", 0.0) or 0.0)
        if current_bal < credit_cost:
            raise AppError(
                "INSUFFICIENT_CREDITS",
                f"Tài khoản không đủ Credit (Số dư: {current_bal} Cr, Cần: {credit_cost} Cr). Vui lòng nạp thêm Credit!",
                402,
                {"balance": current_bal, "required": credit_cost},
            )

    # 2. Select Upstream Provider with Failover
    providers = _get_providers_for_dispatch()
    if not providers:
        raise AppError("NO_AI_PROVIDER", "Hệ thống chưa cấu hình nhà cung cấp AI nào khả dụng", 503)

    last_status = 500
    last_error = "All providers failed"
    result_data = None
    used_provider = None
    final_latency = 0

    for prov in providers:
        p_name = prov.get("name") or "Nhà Cung Cấp"
        base_url = str(prov.get("base_url") or "https://api.xompet.io.vn/v1").rstrip("/")
        if not base_url.endswith("/v1"):
            base_url = f"{base_url}/v1"
        target_url = f"{base_url}/images/generations"

        secret = secret_store.get(prov.get("secret_ref", ""))
        if not secret:
            continue

        chosen_model = payload.model or prov.get("model") or "gpt-image-2"
        fwd_payload = {
            "model": chosen_model,
            "prompt": payload.prompt,
            "n": payload.n or 1,
            "size": payload.size or "1024x1024",
            "response_format": payload.response_format or "url",
        }
        if payload.quality:
            fwd_payload["quality"] = payload.quality
        if payload.style:
            fwd_payload["style"] = payload.style

        # Call upstream in thread
        http_status, resp_data, latency_ms = await asyncio.to_thread(
            _dispatch_upstream,
            target_url,
            fwd_payload,
            secret,
            60.0,
        )

        final_latency = latency_ms

        if 200 <= http_status < 300:
            result_data = resp_data
            used_provider = prov
            last_status = http_status
            break
        else:
            err_msg = resp_data.get("error", {}).get("message") if isinstance(resp_data, dict) else str(resp_data)
            last_error = f"[{p_name}] {err_msg}"
            last_status = http_status
            logger.warning("Provider %s failed with %s: %s", p_name, http_status, last_error)

    # 3. Handle Failure or Success
    if not result_data:
        _record_gateway_log(
            model=payload.model or "gpt-image-2",
            provider_name="AI Gateway (Failed)",
            endpoint="/v1/images/generations",
            status_code=last_status,
            latency_ms=final_latency,
            cost_vnd=0.0,
            credit_used=0.0,
            lic=lic,
            hwid=device_id,
            error_msg=last_error,
        )
        raise AppError("UPSTREAM_PROVIDER_ERROR", f"Lỗi từ nhà cung cấp AI: {last_error}", last_status)

    # 4. Success: Deduct credit and record telemetry
    cost_vnd = float(used_provider.get("cost_per_image") or DEFAULT_COST_PER_IMAGE_VND)
    if lic:
        new_bal = max(0.0, round(float(lic.get("credit_balance", 0.0) or 0.0) - credit_cost, 2))
        try:
            store.update("licenses", lic["id"], {"credit_balance": new_bal})
        except Exception as e:
            logger.error("Failed to deduct license credit: %s", e)

    _record_gateway_log(
        model=payload.model or used_provider.get("model", "gpt-image-2"),
        provider_name=used_provider.get("name", "Nhà Cung Cấp 01"),
        endpoint="/v1/images/generations",
        status_code=200,
        latency_ms=final_latency,
        cost_vnd=cost_vnd,
        credit_used=credit_cost if lic else 0.0,
        lic=lic,
        hwid=device_id,
    )

    # Attach metadata for client
    result_data["gateway_meta"] = {
        "provider": used_provider.get("name"),
        "latency_ms": final_latency,
        "credits_deducted": credit_cost if lic else 0.0,
        "credit_balance": new_bal if lic else None,
    }
    return result_data


# ==============================================================================
# 2. AVAILABLE MODELS FROM ACTIVE GATEWAY
# ==============================================================================

@router.get("/api/v1/gateway/models")
@router.get("/api/v1/client/ai/models")
async def gateway_list_models():
    """Returns available models from the active Primary Gateway Provider."""
    providers = _get_providers_for_dispatch()
    if not providers:
        return {"data": []}

    primary = providers[0]
    supported = primary.get("supported_models") or [
        "gpt-image-2",
        "gpt-image-2.5-flare",
        "gpt-image-2.5-sunburst",
        "gemini-3.1-flash-image-preview",
        "gemini-3-pro-image",
    ]

    models_list = [
        {
            "id": m,
            "object": "model",
            "owned_by": primary.get("name", "jacs-gateway"),
            "capabilities": primary.get("capabilities", ["image_generation"]),
            "cost_per_image": primary.get("cost_per_image", 75.0),
        }
        for m in supported
    ]
    return {"data": models_list, "provider": primary.get("name")}
