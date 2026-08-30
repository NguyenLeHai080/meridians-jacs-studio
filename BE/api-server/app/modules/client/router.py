from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Header, status

from app.core.errors import AppError
from app.core.store import store
from app.modules.client.schemas import DesktopJobCreate, DesktopJobResponse
from app.modules.licensing.router import _active_license

router = APIRouter(prefix="/api/v1/client", tags=["desktop-client"])


def _license_from_headers(
    license_key: str | None = Header(default=None, alias="X-License-Key"),
    device_id: str | None = Header(default=None, alias="X-Device-Id"),
) -> dict:
    if not license_key or not device_id:
        raise AppError("CLIENT_LICENSE_REQUIRED", "Tool phải được kích hoạt trước khi dùng dịch vụ", 401)
    return _active_license(license_key, device_id)


def _provider_for_job(provider_id: UUID | None, execution_mode: str, kind: str) -> dict | None:
    if execution_mode not in {"cloud", "hybrid"}:
        return None
    if not provider_id:
        raise AppError("JOB_PROVIDER_REQUIRED", "Job cloud/hybrid phải chỉ định provider", 422)
    provider = store.get("providers", provider_id)
    if not provider:
        raise AppError("PROVIDER_NOT_FOUND", "Không tìm thấy provider", 404)
    capability = {"analysis": "analysis", "tts": "tts", "render": "video_render"}[kind]
    if capability not in provider.get("capabilities", []):
        raise AppError("PROVIDER_CAPABILITY_UNSUPPORTED", "Provider không hỗ trợ capability của job", 422, {"required": capability})
    return provider


@router.post("/jobs", response_model=DesktopJobResponse, status_code=status.HTTP_202_ACCEPTED)
async def create_desktop_job(
    payload: DesktopJobCreate,
    license_key: str | None = Header(default=None, alias="X-License-Key"),
    device_id: str | None = Header(default=None, alias="X-Device-Id"),
):
    license_record = _license_from_headers(license_key, device_id)
    # Client retries are safe: return the original accepted job for the same id.
    existing = next(
        (
            item
            for item in store.list("jobs")
            if item.get("license_id") == license_record["id"] and item.get("client_job_id") == payload.client_job_id
        ),
        None,
    )
    if existing:
        return existing

    today = datetime.now(UTC).date()
    jobs_today = sum(
        1
        for item in store.list("jobs")
        if item.get("license_id") == license_record["id"]
        and isinstance(item.get("created_at"), datetime)
        and item["created_at"].astimezone(UTC).date() == today
    )
    if jobs_today >= license_record["max_jobs_per_day"]:
        raise AppError("LICENSE_DAILY_QUOTA_EXCEEDED", "Đã đạt giới hạn job trong ngày của license", 429)

    _provider_for_job(payload.provider_id, payload.execution_mode.value, payload.kind.value)
    return store.create(
        "jobs",
        {
            **payload.model_dump(),
            "license_id": license_record["id"],
            "status": "queued",
            "progress": 0,
            "engine": payload.execution_mode.value,
            "created_at": datetime.now(UTC),
        },
    )


@router.get("/jobs", response_model=list[DesktopJobResponse])
async def list_desktop_jobs(
    license_key: str | None = Header(default=None, alias="X-License-Key"),
    device_id: str | None = Header(default=None, alias="X-Device-Id"),
):
    license_record = _license_from_headers(license_key, device_id)
    return [item for item in store.list("jobs") if item.get("license_id") == license_record["id"]]
