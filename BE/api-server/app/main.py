from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.errors import AppError, app_error_handler
from app.core.http import request_context_middleware
from app.core.store import store
from app.modules.ai_providers.router import router as ai_provider_router
from app.modules.auth.router import router as auth_router
from app.modules.billing.router import router as billing_router
from app.modules.client.router import router as client_router
from app.modules.health.router import router as health_router
from app.modules.jobs.router import router as jobs_router
from app.modules.licensing.router import router as licensing_router
from app.modules.projects.router import router as projects_router
from app.modules.releases.router import router as releases_router
from app.modules.sessions.router import router as sessions_router
from app.modules.system.router import router as system_router
from app.modules.telemetry.router import router as telemetry_router

settings = get_settings()
settings.validate_runtime()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: store is eagerly initialized and verified
    yield
    # Shutdown: close connection pool gracefully
    store.close()


app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan)
cors_origins = settings.cors_origin_list
if settings.environment.lower() not in {"prod", "production"}:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
app.middleware("http")(request_context_middleware)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), camera=(), microphone=()"
    return response


app.add_exception_handler(AppError, app_error_handler)


async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Dữ liệu yêu cầu không hợp lệ",
                "details": {"fields": exc.errors()},
                "request_id": getattr(request.state, "request_id", getattr(request, "request_id", "unknown")),
            }
        },
    )


app.add_exception_handler(RequestValidationError, validation_error_handler)
app.include_router(health_router)
app.include_router(auth_router)
app.include_router(client_router)
app.include_router(licensing_router)
app.include_router(billing_router)
app.include_router(sessions_router)
app.include_router(releases_router)
app.include_router(projects_router)
app.include_router(ai_provider_router)
app.include_router(jobs_router)
app.include_router(telemetry_router)
app.include_router(system_router)

