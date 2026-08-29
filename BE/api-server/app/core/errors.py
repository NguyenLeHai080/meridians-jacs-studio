from __future__ import annotations

from fastapi import Request
from fastapi.responses import JSONResponse
from typing import Optional


class AppError(Exception):
    def __init__(self, code: str, message: str, status_code: int = 400, details: Optional[dict] = None):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details or {}


async def app_error_handler(_: Request, exc: AppError) -> JSONResponse:
    request_id = getattr(_.state, "request_id", getattr(_, "request_id", "unknown"))
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details,
                "request_id": request_id,
            }
        },
    )
