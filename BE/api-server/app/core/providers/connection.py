"""Small, dependency-free provider connection checks.

The admin test endpoint deliberately sends the smallest billable request and
returns only normalized metadata. Vendor response bodies and API keys never
leave this module.
"""

from __future__ import annotations

import json
import time
from dataclasses import dataclass
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit, urlunsplit
from urllib.request import Request, urlopen


@dataclass(frozen=True)
class ConnectionResult:
    status: str
    http_status: int | None
    latency_ms: int
    detail: str


def _url(base_url: str, suffix: str) -> str:
    """Join an API path without duplicating a trailing vendor path."""
    parts = urlsplit(base_url.strip())
    base_path = parts.path.rstrip("/")
    suffix = suffix.lstrip("/")
    path = f"{base_path}/{suffix}" if base_path else f"/{suffix}"
    return urlunsplit((parts.scheme, parts.netloc, path, "", ""))


def _request(provider_type: str, base_url: str, model: str, api_key: str, timeout: float) -> Request:
    headers = {"Accept": "application/json", "Content-Type": "application/json"}
    ptype = provider_type.lower().strip()
    
    if ptype in {"openai", "openai-compatible", "custom"}:
        # Ensure /v1 if missing for standard openai domains
        target_base = base_url.rstrip("/")
        if ("api.openai.com" in target_base or "api-meridians.nexoratech.com.vn" in target_base or "api.deepseek.com" in target_base or "api.groq.com" in target_base) and not target_base.endswith("/v1"):
            target_base = f"{target_base}/v1"
        url = _url(target_base, "chat/completions")
        headers["Authorization"] = f"Bearer {api_key}"
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": "Reply with OK"}],
            "max_tokens": 1,
        }
    elif ptype == "gemini":
        target_base = base_url.rstrip("/")
        if "generativelanguage.googleapis.com" in target_base and not target_base.endswith("/v1beta") and not target_base.endswith("/v1"):
            target_base = f"{target_base}/v1beta"
        url = _url(target_base, f"models/{model}:generateContent")
        headers["x-goog-api-key"] = api_key
        payload = {"contents": [{"parts": [{"text": "Reply with OK"}]}], "generationConfig": {"maxOutputTokens": 1}}
    elif ptype == "anthropic":
        target_base = base_url.rstrip("/")
        if "api.anthropic.com" in target_base and not target_base.endswith("/v1"):
            target_base = f"{target_base}/v1"
        url = _url(target_base, "messages")
        headers["x-api-key"] = api_key
        headers["anthropic-version"] = "2023-06-01"
        payload = {"model": model, "max_tokens": 1, "messages": [{"role": "user", "content": "Reply with OK"}]}
    else:
        # Generic fallback
        url = _url(base_url, "chat/completions")
        headers["Authorization"] = f"Bearer {api_key}"
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": "Reply with OK"}],
            "max_tokens": 1,
        }
    return Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")


def test_connection(provider_type: str, base_url: str, model: str, api_key: str, timeout: float) -> ConnectionResult:
    """Run a bounded vendor request and normalize common failure classes."""
    started = time.perf_counter()
    try:
        request = _request(provider_type, base_url, model, api_key, timeout)
        with urlopen(request, timeout=timeout) as response:
            response.read(4096)
            status_code = response.status
        status = "reachable" if 200 <= status_code < 300 else "vendor_error"
        detail = f"Kết nối provider thành công ({status_code} OK)" if status == "reachable" else f"Provider trả về mã HTTP {status_code}"
        return ConnectionResult(status, status_code, _latency(started), detail)
    except HTTPError as exc:
        latency = _latency(started)
        detail_msg = ""
        try:
            raw_body = exc.read().decode("utf-8", errors="ignore")
            parsed = json.loads(raw_body)
            detail_msg = parsed.get("error", {}).get("message") or parsed.get("message") or ""
        except (json.JSONDecodeError, UnicodeDecodeError, OSError):
            detail_msg = ""

        if exc.code in {401, 403}:
            return ConnectionResult("invalid_credentials", exc.code, latency, detail_msg or "API Key không hợp lệ hoặc chưa được kích hoạt")
        if exc.code == 404:
            return ConnectionResult("not_found", exc.code, latency, detail_msg or f"Model '{model}' không tồn tại hoặc sai URL endpoint (HTTP 404)")
        if exc.code == 429:
            return ConnectionResult("rate_limited", exc.code, latency, detail_msg or "Hết quota hoặc vượt giới hạn rate limit (HTTP 429)")
        return ConnectionResult("vendor_error", exc.code, latency, detail_msg or f"Nhà cung cấp trả về lỗi HTTP {exc.code}")
    except (TimeoutError, URLError) as exc:
        reason = getattr(exc, "reason", "Timeout")
        return ConnectionResult("unreachable", None, _latency(started), f"Không thể kết nối máy chủ ({reason})")
    except ValueError as exc:
        return ConnectionResult("unsupported", None, _latency(started), str(exc))


def _latency(started: float) -> int:
    return max(0, round((time.perf_counter() - started) * 1000))
