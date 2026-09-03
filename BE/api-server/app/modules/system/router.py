from __future__ import annotations

import platform
import sys
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.config import get_settings
from app.core.security import require_auth
from app.core.store import store

router = APIRouter(prefix="/api/v1/system", tags=["system"])


class SystemSettingsUpdate(BaseModel):
    app_name: str | None = None
    default_days_valid: int | None = 30
    default_max_jobs: int | None = 200
    telemetry_enabled: bool | None = True
    auto_backup: bool | None = True
    notification_email: str | None = None
    studio_brand_name: str | None = None
    custom_logo_url: str | None = None


@router.get("/info")
async def system_info(_: dict = Depends(require_auth)) -> dict:
    settings = get_settings()
    licenses = store.list("licenses")
    transactions = store.list("billing_transactions")
    providers = store.list("providers")
    telemetry = store.list("telemetry")

    return {
        "data": {
            "app_name": settings.app_name,
            "version": "0.3.17",
            "environment": settings.environment,
            "python_version": sys.version.split()[0],
            "platform": platform.platform(),
            "store_backend": settings.store_backend,
            "telemetry_enabled": settings.telemetry_enabled,
            "total_licenses": len(licenses),
            "total_transactions": len(transactions),
            "total_providers": len(providers),
            "total_telemetry_events": len(telemetry),
            "timestamp": datetime.now(UTC).isoformat(),
        }
    }


@router.get("/settings")
async def get_system_settings(_: dict = Depends(require_auth)) -> dict:
    settings = get_settings()
    stored_settings = store.get("system_settings", "main") or {}
    return {
        "data": {
            "app_name": stored_settings.get("app_name", settings.app_name),
            "default_days_valid": stored_settings.get("default_days_valid", 30),
            "default_max_jobs": stored_settings.get("default_max_jobs", 200),
            "telemetry_enabled": stored_settings.get("telemetry_enabled", settings.telemetry_enabled),
            "auto_backup": stored_settings.get("auto_backup", True),
            "notification_email": stored_settings.get("notification_email", settings.admin_email),
            "studio_brand_name": stored_settings.get("studio_brand_name", "JACS Studio"),
            "custom_logo_url": stored_settings.get("custom_logo_url", ""),
        }
    }


@router.put("/settings")
async def update_system_settings(payload: SystemSettingsUpdate, user: dict = Depends(require_auth)) -> dict:
    values = {k: v for k, v in payload.model_dump().items() if v is not None}
    values["id"] = "main"
    values["updated_at"] = datetime.now(UTC).isoformat()
    values["updated_by"] = user["email"]

    if store.get("system_settings", "main"):
        store.update("system_settings", "main", values)
    else:
        store.create("system_settings", values)

    store.create("audit", {"action": "system.settings_updated", "actor": user["email"]})
    return {"data": {"success": True, "settings": values}}


@router.get("/export")
async def export_data(_: dict = Depends(require_auth)) -> dict:
    return {
        "data": {
            "version": "0.3.17",
            "exported_at": datetime.now(UTC).isoformat(),
            "licenses": store.list("licenses"),
            "billing_transactions": store.list("billing_transactions"),
            "providers": store.list("providers"),
            "telemetry": store.list("telemetry"),
            "audit": store.list("audit"),
        }
    }


@router.post("/import")
async def import_data(payload: dict[str, Any], user: dict = Depends(require_auth)) -> dict:
    count = 0
    if "licenses" in payload and isinstance(payload["licenses"], list):
        for item in payload["licenses"]:
            if not store.get("licenses", item.get("id")):
                store.create("licenses", item)
                count += 1
    if "billing_transactions" in payload and isinstance(payload["billing_transactions"], list):
        for item in payload["billing_transactions"]:
            if not store.get("billing_transactions", item.get("id")):
                store.create("billing_transactions", item)
                count += 1
    if "providers" in payload and isinstance(payload["providers"], list):
        for item in payload["providers"]:
            if not store.get("providers", item.get("id")):
                store.create("providers", item)
                count += 1

    store.create("audit", {"action": "system.data_imported", "records_count": count, "actor": user["email"]})
    return {"data": {"success": True, "imported_records": count}}
