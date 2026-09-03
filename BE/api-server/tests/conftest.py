from __future__ import annotations

import os

os.environ["JACS_STORE_BACKEND"] = "memory"
os.environ["JACS_ADMIN_PASSWORD"] = "test-password"
os.environ["JACS_TELEMETRY_INGEST_TOKEN"] = "telemetry-test-token"
os.environ["JACS_SECRET_KEY"] = "GIh08_tusmQdQaRKw0x94wDJf7C8HzOsB0HU4EE6Anc="

import pytest

from app.core.config import get_settings


@pytest.fixture(autouse=True)
def reset_settings_cache():
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()
