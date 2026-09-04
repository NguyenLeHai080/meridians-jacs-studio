from __future__ import annotations

import re
from typing import Any

SENSITIVE_PATTERNS = [
    re.compile(r'(password|secret|token|api_key|private_key)["\']?\s*[:=]\s*["\']?([^"\'\s]+)', re.IGNORECASE),
]


def mask_sensitive_data(data: Any) -> Any:
    """Recursively masks passwords, tokens, and secret keys in logs and telemetry."""
    if isinstance(data, dict):
        masked = {}
        for k, v in data.items():
            k_lower = str(k).lower()
            if any(s in k_lower for s in ["password", "secret", "token", "hash", "key"]) and "public" not in k_lower:
                masked[k] = "******"
            else:
                masked[k] = mask_sensitive_data(v)
        return masked
    if isinstance(data, list):
        return [mask_sensitive_data(item) for item in data]
    return data
