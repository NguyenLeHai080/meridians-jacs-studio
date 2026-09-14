from __future__ import annotations

import hmac
import json
import time
from collections import defaultdict
from hashlib import sha256
from typing import ClassVar

from fastapi import Request

from app.core.errors import AppError

# Must match the secret signing salt in electron/security-shield.cjs
CLIENT_SIGNING_SALT = b"jacs-studio-secure-signature-v2-meridians"
MAX_TIMESTAMP_DRIFT_SECONDS = 120  # Allow up to 2 minutes clock skew


class AntiTamperGuard:
    """Enterprise-grade anti-tamper and packet verification for Desktop Client interactions."""

    _seen_nonces: ClassVar[dict[str, float]] = {}
    _rate_limits: ClassVar[dict[str, list[float]]] = defaultdict(list)

    @classmethod
    def verify_request_signature(
        cls,
        signature: str | None,
        timestamp_str: str | None,
        nonce: str | None,
        hwid: str | None,
        payload_data: bytes | str | dict | None,
    ) -> bool:
        """Verifies cryptographic signature for Desktop client requests to prevent MITM tampering."""
        if not signature or not timestamp_str or not nonce:
            return False

        # 1. Check timestamp freshness (anti-replay attack)
        try:
            req_time = int(timestamp_str)
            now = int(time.time())
            if abs(now - req_time) > MAX_TIMESTAMP_DRIFT_SECONDS:
                return False
        except (ValueError, TypeError):
            return False

        # 2. Check nonce uniqueness
        now_f = time.time()
        cls._cleanup_expired_nonces(now_f)
        if nonce in cls._seen_nonces:
            return False  # Replay detected
        cls._seen_nonces[nonce] = now_f

        # 3. Reconstruct payload string for HMAC validation
        if isinstance(payload_data, dict):
            payload_str = json.dumps(payload_data, separators=(",", ":"))
        elif isinstance(payload_data, bytes):
            payload_str = payload_data.decode("utf-8", errors="ignore")
        else:
            payload_str = str(payload_data or "{}")

        hwid_clean = str(hwid or "")
        data_to_sign = f"{timestamp_str}:{nonce}:{hwid_clean}:{payload_str}"

        # 4. Compute expected signature
        expected = hmac.new(CLIENT_SIGNING_SALT, data_to_sign.encode("utf-8"), sha256).hexdigest()
        return hmac.compare_digest(signature.lower(), expected.lower())

    @classmethod
    def check_rate_limit(
        cls,
        client_ip: str,
        endpoint_key: str = "general",
        max_requests: int = 15,
        window_seconds: int = 60,
    ) -> None:
        """Enforces rate limiting to prevent brute-force attacks on license/key endpoints."""
        now = time.time()
        key = f"{client_ip}:{endpoint_key}"

        # Clean old timestamps
        cls._rate_limits[key] = [t for t in cls._rate_limits[key] if now - t < window_seconds]

        if len(cls._rate_limits[key]) >= max_requests:
            raise AppError(
                "RATE_LIMITED",
                f"Quá nhiều yêu cầu thử nghiệm. Vui lòng đợi {window_seconds} giây trước khi thử lại.",
                429,
            )

        cls._rate_limits[key].append(now)

    @classmethod
    def _cleanup_expired_nonces(cls, current_time: float) -> None:
        cutoff = current_time - MAX_TIMESTAMP_DRIFT_SECONDS
        expired_keys = [k for k, t in cls._seen_nonces.items() if t < cutoff]
        for k in expired_keys:
            del cls._seen_nonces[k]


async def require_anti_tamper_signature(request: Request) -> None:
    """FastAPI Dependency for critical client endpoints (activation/validation)."""
    # Allow local development and standard browser admin requests without blocking
    auth_header = request.headers.get("Authorization") or ""
    if auth_header.startswith("Bearer "):
        return  # Admin token requests use standard JWT authentication

    sig = request.headers.get("X-Jacs-Signature")
    ts = request.headers.get("X-Jacs-Timestamp")
    nonce = request.headers.get("X-Jacs-Nonce")
    hwid = request.headers.get("X-Jacs-Hwid")

    client_ip = request.client.host if request.client else "unknown"

    # Enforce Rate Limiting
    AntiTamperGuard.check_rate_limit(client_ip, endpoint_key="client_security", max_requests=30, window_seconds=60)

    if sig:
        body = await request.body()
        is_valid = AntiTamperGuard.verify_request_signature(sig, ts, nonce, hwid, body)
        if not is_valid:
            raise AppError(
                "SECURITY_SIGNATURE_MISMATCH",
                "Chữ ký xác thực gói tin không hợp lệ hoặc đã bị can thiệp bởi phần mềm trung gian (MITM).",
                403,
            )
