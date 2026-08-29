from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Header

from app.core.config import get_settings
from app.core.errors import AppError
from app.core.security import issue_token, require_auth, revoke_token, verify_password
from app.modules.auth.schemas import LoginRequest, TokenResponse, UserResponse

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest) -> TokenResponse:
    settings = get_settings()
    password_valid = verify_password(payload.password, settings.admin_password_hash) if settings.admin_password_hash else payload.password == settings.admin_password
    if payload.email != settings.admin_email or not password_valid:
        raise AppError("AUTH_INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng", 401)
    token, expires_in = issue_token(payload.email)
    return TokenResponse(access_token=token, expires_in=expires_in)


@router.get("/me", response_model=UserResponse)
async def me(user: dict = Depends(require_auth)) -> UserResponse:
    return UserResponse(**user)


@router.post("/logout", status_code=204)
async def logout(authorization: Optional[str] = Header(default=None), _: dict = Depends(require_auth)) -> None:
    revoke_token(authorization)
