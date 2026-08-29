from __future__ import annotations

from uuid import uuid4

from fastapi import Request


async def request_context_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-Id", str(uuid4()))[:128]
    request.state.request_id = request_id
    request.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-Id"] = request_id
    return response
