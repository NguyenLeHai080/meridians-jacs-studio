from __future__ import annotations

from base64 import b64decode, b64encode
from datetime import UTC, datetime, timedelta
from hashlib import pbkdf2_hmac, sha256
from hmac import compare_digest, new as hmac_new
import json
import secrets

from fastapi import Security
from fastapi.security import APIKeyHeader

from app.core.config import get_settings
from app.core.errors import AppError

authorization_scheme = APIKeyHeader(name="Authorization", auto_error=False)


def _signing_key() -> bytes:
    settings = get_settings()
    # Development keeps a deterministic local key; production validation rejects
    # missing JACS_SECRET_KEY before the application starts.
    return (settings.secret_key or "local-development-only-change-me").encode("utf-8")


def _b64url(value: bytes) -> str:
    return b64encode(value).decode("ascii").replace("+", "-").replace("/", "_").rstrip("=")


def _unb64url(value: str) -> bytes:
    return b64decode(value + "=" * (-len(value) % 4), altchars=b"-_")


def _token_hash(token: str) -> str:
    """Store only a digest so a database read cannot recover bearer tokens."""
    return sha256(token.encode("utf-8")).hexdigest()


def issue_token(subject: str) -> tuple[str, int]:
    settings = get_settings()
    now = datetime.now(UTC)
    expires_at = now + timedelta(minutes=settings.token_ttl_minutes)
    header = _b64url(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode())
    claims = {
        "sub": subject,
        "role": "admin",
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
        "jti": secrets.token_urlsafe(16),
    }
    payload = _b64url(json.dumps(claims, separators=(",", ":")).encode())
    unsigned = f"{header}.{payload}"
    signature = _b64url(hmac_new(_signing_key(), unsigned.encode("ascii"), sha256).digest())
    token = f"{unsigned}.{signature}"
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
    from app.core.store import store

    try:
        header, payload, signature = token.split(".", 2)
        unsigned = f"{header}.{payload}"
        expected = _b64url(hmac_new(_signing_key(), unsigned.encode("ascii"), sha256).digest())
        claims = json.loads(_unb64url(payload))
        if not compare_digest(signature, expected) or claims.get("exp", 0) <= int(datetime.now(UTC).timestamp()):
            raise ValueError
    except (ValueError, TypeError, json.JSONDecodeError):
        raise AppError("AUTH_INVALID", "Token không hợp lệ hoặc đã hết hạn", 401)
    token_hash = _token_hash(token)
    revoked = next(
        (item for item in store.list("auth_revocations") if compare_digest(item.get("token_hash", ""), token_hash)),
        None,
    )
    if revoked:
        raise AppError("AUTH_INVALID", "Token không hợp lệ hoặc đã hết hạn", 401)
    if not claims.get("sub") or claims.get("role") != "admin":
        raise AppError("AUTH_INVALID", "Token không hợp lệ hoặc đã hết hạn", 401)
    return {"email": claims["sub"], "role": claims["role"]}


async def require_auth(authorization: str | None = Security(authorization_scheme)) -> dict:
    return current_user(authorization)


def revoke_token(authorization: str | None) -> None:
    if not authorization or not authorization.startswith("Bearer "):
        return
    token = authorization.removeprefix("Bearer ").strip()
    from app.core.store import store

    # Revocation is persisted so logout remains effective after API restarts.
    if token.count(".") == 2:
        try:
            claims = json.loads(_unb64url(token.split(".", 2)[1]))
            store.create(
                "auth_revocations",
                {
                    "token_hash": _token_hash(token),
                    "expires_at": datetime.fromtimestamp(claims.get("exp", 0), UTC),
                },
            )
        except (ValueError, TypeError, json.JSONDecodeError):
            return
