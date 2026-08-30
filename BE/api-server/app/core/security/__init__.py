from __future__ import annotations

import secrets
from base64 import b64decode, b64encode
from datetime import UTC, datetime, timedelta
from hashlib import pbkdf2_hmac
from hmac import compare_digest
from threading import Lock

from fastapi import Security
from fastapi.security import APIKeyHeader

from app.core.config import get_settings
from app.core.errors import AppError

_tokens: dict[str, dict] = {}
_token_lock = Lock()
authorization_scheme = APIKeyHeader(name="Authorization", auto_error=False)


def issue_token(subject: str) -> tuple[str, int]:
    settings = get_settings()
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(UTC) + timedelta(minutes=settings.token_ttl_minutes)
    with _token_lock:
        _tokens[token] = {"sub": subject, "role": "admin", "expires_at": expires_at}
    return token, settings.token_ttl_minutes * 60


def hash_password(password: str) -> str:
    """Create a portable PBKDF2-SHA256 hash for environment storage."""
    salt = secrets.token_bytes(16)
    iterations = 600_000
    digest = pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    return f"pbkdf2_sha256${iterations}${b64encode(salt).decode()}${b64encode(digest).decode()}"


def verify_password(password: str, encoded: str) -> bool:
    try:
        algorithm, iterations, salt, expected = encoded.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        actual = pbkdf2_hmac("sha256", password.encode("utf-8"), b64decode(salt), int(iterations))
        return compare_digest(b64encode(actual).decode(), expected)
    except (ValueError, TypeError):
        return False


def current_user(authorization: str | None) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise AppError("AUTH_REQUIRED", "Yêu cầu đăng nhập", 401)
    token = authorization.removeprefix("Bearer ").strip()
    with _token_lock:
        session = _tokens.get(token)
        if session and session["expires_at"] <= datetime.now(UTC):
            _tokens.pop(token, None)
            session = None
    if not session:
        raise AppError("AUTH_INVALID", "Token không hợp lệ hoặc đã hết hạn", 401)
    return {"email": session["sub"], "role": session["role"]}


async def require_auth(authorization: str | None = Security(authorization_scheme)) -> dict:
    return current_user(authorization)


def revoke_token(authorization: str | None) -> None:
    if not authorization or not authorization.startswith("Bearer "):
        return
    token = authorization.removeprefix("Bearer ").strip()
    with _token_lock:
        # Compare all token values without exposing whether a token exists.
        for stored in list(_tokens):
            if compare_digest(stored, token):
                _tokens.pop(stored, None)
                break
