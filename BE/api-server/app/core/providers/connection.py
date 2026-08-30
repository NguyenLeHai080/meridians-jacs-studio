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
    parts = urlsplit(base_url)
    base_path = parts.path.rstrip("/")
    suffix = suffix.lstrip("/")
    path = f"{base_path}/{suffix}" if base_path else f"/{suffix}"
    return urlunsplit((parts.scheme, parts.netloc, path, "", ""))


def _request(provider_type: str, base_url: str, model: str, api_key: str, timeout: float) -> Request:
    headers = {"Accept": "application/json", "Content-Type": "application/json"}
    if provider_type in {"openai", "openai-compatible"}:
        url = _url(base_url, "chat/completions")
        headers["Authorization"] = f"Bearer {api_key}"
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": "Reply with OK"}],
            "max_tokens": 1,
        }
    elif provider_type == "gemini":
        url = _url(base_url, f"models/{model}:generateContent")
        # Gemini supports the key header, keeping credentials out of URLs/logs.
        headers["x-goog-api-key"] = api_key
        payload = {"contents": [{"parts": [{"text": "Reply with OK"}]}], "generationConfig": {"maxOutputTokens": 1}}
    elif provider_type == "anthropic":
        url = _url(base_url, "messages")
        headers["x-api-key"] = api_key
        headers["anthropic-version"] = "2023-06-01"
        payload = {"model": model, "max_tokens": 1, "messages": [{"role": "user", "content": "Reply with OK"}]}
    else:
        raise ValueError("Provider custom cần adapter riêng; chưa thể kiểm tra tự động")
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
        detail = "Kết nối provider thành công" if status == "reachable" else "Provider trả về lỗi"
        return ConnectionResult(status, status_code, _latency(started), detail)
    except HTTPError as exc:
        # 401/403 prove that the endpoint is reachable, but credentials are bad.
        status = "invalid_credentials" if exc.code in {401, 403} else "vendor_error"
        return ConnectionResult(status, exc.code, _latency(started), "API key không hợp lệ" if status == "invalid_credentials" else "Provider trả về lỗi")
    except (TimeoutError, URLError):
        return ConnectionResult("unreachable", None, _latency(started), "Không thể kết nối provider trong thời gian cho phép")
    except ValueError as exc:
        return ConnectionResult("unsupported", None, _latency(started), str(exc))


def _latency(started: float) -> int:
    return max(0, round((time.perf_counter() - started) * 1000))
