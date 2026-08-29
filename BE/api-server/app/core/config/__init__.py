from __future__ import annotations

from functools import lru_cache

from typing import Optional

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "JACS Studio API"
    environment: str = Field(default="development", validation_alias=AliasChoices("JACS_ENVIRONMENT", "JACS_ENV"))
    cors_origins: str = "http://localhost:5173,http://localhost:4173"
    admin_email: str = "admin@example.com"
    admin_password: str = "change-me"
    admin_password_hash: Optional[str] = None
    token_ttl_minutes: int = 60
    store_backend: str = "memory"
    sqlite_path: str = "./data/jacs.sqlite3"
    telemetry_enabled: bool = True
    telemetry_ingest_token: str = ""
    telemetry_max_payload_bytes: int = 256_000
    provider_timeout_seconds: float = 30.0

    model_config = SettingsConfigDict(
        env_prefix="JACS_",
        env_file=".env",
        extra="ignore",
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    def validate_runtime(self) -> None:
        """Fail fast on unsafe defaults that must never reach production."""
        if self.environment.lower() in {"prod", "production"}:
            if not self.admin_password_hash:
                raise RuntimeError("JACS_ADMIN_PASSWORD_HASH is required in production")
            if self.store_backend == "memory":
                raise RuntimeError("JACS_STORE_BACKEND=memory is not allowed in production")
            if not self.cors_origin_list or "*" in self.cors_origin_list:
                raise RuntimeError("Production CORS must be an explicit allowlist")


@lru_cache
def get_settings() -> Settings:
    return Settings()
