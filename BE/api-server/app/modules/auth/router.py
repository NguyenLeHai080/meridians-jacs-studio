from __future__ import annotations

import time
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Header, Request
from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.core.errors import AppError
from app.core.security import (
    hash_password,
    issue_token,
    require_auth,
    revoke_token,
    verify_password,
)
from app.core.store import store
from app.modules.auth.schemas import LoginRequest, TokenResponse, UserResponse

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

# Rate-limiting failed login attempts: { ip_or_email: [timestamps] }
_failed_attempts: dict[str, list[float]] = {}
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_WINDOW_SECONDS = 60


def _check_rate_limit(key: str) -> None:
    now = time.time()
    history = [t for t in _failed_attempts.get(key, []) if now - t < LOCKOUT_WINDOW_SECONDS]
    _failed_attempts[key] = history
    if len(history) >= MAX_FAILED_ATTEMPTS:
        retry_after = int(LOCKOUT_WINDOW_SECONDS - (now - history[0]))
        raise AppError(
            "AUTH_RATE_LIMITED",
            f"Quá nhiều lần thử đăng nhập sai. Vui lòng thử lại sau {max(1, retry_after)} giây để bảo vệ an toàn.",
            429,
        )


def _record_failed_attempt(key: str) -> None:
    now = time.time()
    history = _failed_attempts.get(key, [])
    history.append(now)
    _failed_attempts[key] = history


def _clear_failed_attempts(key: str) -> None:
    _failed_attempts.pop(key, None)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6, max_length=128)
    new_email: str | None = None


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, request: Request) -> TokenResponse:
    settings = get_settings()
    client_ip = request.client.host if request.client else "unknown"
    rate_key = f"{client_ip}:{payload.email.lower()}"

    _check_rate_limit(rate_key)

    # Check custom credentials in store first if changed
    custom_cred = store.get("system_auth", "admin_credentials")
    target_email = custom_cred.get("email") if custom_cred else settings.admin_email
    target_hash = custom_cred.get("password_hash") if custom_cred else settings.admin_password_hash
    target_plain = settings.admin_password if not target_hash else None

    password_valid = False
    if target_hash:
        password_valid = verify_password(payload.password, target_hash)
    elif target_plain:
        password_valid = payload.password == target_plain

    if payload.email.lower() != target_email.lower() or not password_valid:
        _record_failed_attempt(rate_key)
        raise AppError("AUTH_INVALID_CREDENTIALS", "Email hoặc mật khẩu không chính xác", 401)

    _clear_failed_attempts(rate_key)
    token, expires_in = issue_token(target_email)
    store.create("audit", {"action": "auth.login_success", "email": target_email, "ip": client_ip})
    return TokenResponse(access_token=token, expires_in=expires_in)


@router.get("/me", response_model=UserResponse)
async def me(user: dict = Depends(require_auth)) -> UserResponse:
    return UserResponse(**user)


@router.post("/logout")
async def logout(authorization: str | None = Header(default=None), _: dict = Depends(require_auth)):
    revoke_token(authorization)
    return {"data": {"success": True, "message": "Đã đăng xuất an toàn"}}


@router.post("/change-password")
async def change_password(
    payload: ChangePasswordRequest,
    user: dict = Depends(require_auth),
    authorization: str | None = Header(default=None),
) -> dict:
    settings = get_settings()
    custom_cred = store.get("system_auth", "admin_credentials")
    current_hash = custom_cred.get("password_hash") if custom_cred else settings.admin_password_hash
    current_plain = settings.admin_password if not current_hash else None

    # Validate current password
    current_valid = False
    if current_hash:
        current_valid = verify_password(payload.current_password, current_hash)
    elif current_plain:
        current_valid = payload.current_password == current_plain

    if not current_valid:
        raise AppError("AUTH_INVALID_CREDENTIALS", "Mật khẩu hiện tại không chính xác", 401)

    new_hash = hash_password(payload.new_password)
    target_email = payload.new_email.strip() if payload.new_email else user["email"]

    cred_data = {
        "id": "admin_credentials",
        "email": target_email,
        "password_hash": new_hash,
        "updated_at": datetime.now(UTC).isoformat(),
    }

    if custom_cred:
        store.update("system_auth", "admin_credentials", cred_data)
    else:
        store.create("system_auth", cred_data)

    # Issue new token for updated user
    new_token, expires_in = issue_token(target_email)
    store.create("audit", {"action": "auth.password_changed", "email": target_email, "actor": user["email"]})

    return {
        "data": {
            "success": True,
            "message": "Đã cập nhật mật khẩu quản trị thành công",
            "access_token": new_token,
            "expires_in": expires_in,
        }
    }
