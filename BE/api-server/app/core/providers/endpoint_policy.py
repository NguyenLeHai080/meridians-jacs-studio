from __future__ import annotations

import ipaddress
from urllib.parse import urlparse

from app.core.config import get_settings
from app.core.errors import AppError


def validate_provider_endpoint(value: str) -> str:
    """Reject endpoint forms that could enable SSRF from the provider gateway."""
    parsed = urlparse(value)
    if parsed.scheme not in {"https", "http"} or not parsed.hostname:
        raise AppError("PROVIDER_URL_INVALID", "Endpoint provider phải là URL HTTP(S)", 422)
    if parsed.username or parsed.password:
        raise AppError("PROVIDER_URL_INVALID", "Endpoint không được chứa thông tin đăng nhập", 422)
    host = parsed.hostname.lower().rstrip(".")
    local_dev = get_settings().environment.lower() in {"dev", "development", "test"}
    if parsed.scheme != "https" and not (local_dev and host in {"localhost", "127.0.0.1", "::1"}):
        raise AppError("PROVIDER_HTTPS_REQUIRED", "Endpoint provider phải dùng HTTPS", 422)
    if host in {"localhost", "metadata.google.internal"} or host.endswith(".local"):
        if not local_dev:
            raise AppError("PROVIDER_PRIVATE_ENDPOINT", "Không cho phép endpoint mạng nội bộ", 422)
    try:
        address = ipaddress.ip_address(host)
    except ValueError:
        address = None
    if address and (address.is_private or address.is_loopback or address.is_link_local or address.is_reserved):
        if not (local_dev and address.is_loopback):
            raise AppError("PROVIDER_PRIVATE_ENDPOINT", "Không cho phép endpoint mạng nội bộ", 422)
    return value
