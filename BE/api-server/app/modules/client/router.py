from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Header, status
from pydantic import BaseModel, Field

from app.core.errors import AppError
from app.core.store import store
from app.modules.client.schemas import DesktopJobCreate, DesktopJobResponse
from app.modules.licensing.router import _active_license

router = APIRouter(prefix="/api/v1/client", tags=["desktop-client"])


class DesktopJobUpdate(BaseModel):
    status: str | None = Field(default=None, pattern=r"^(queued|running|completed|failed|cancelled)$")
    progress: int | None = Field(default=None, ge=0, le=100)
    stage: str | None = Field(default=None, max_length=40)
    error: str | None = Field(default=None, max_length=1000)
    output_path: str | None = Field(default=None, max_length=1000)
    parent_job_id: str | None = Field(default=None, min_length=1, max_length=128)
    scene_id: str | None = Field(default=None, min_length=1, max_length=128)
    split_scenes: bool | None = None
    analysis_only: bool | None = None
    clip_start_seconds: float | None = Field(default=None, ge=0)
    clip_end_seconds: float | None = Field(default=None, ge=0)
    output_file_name: str | None = Field(default=None, max_length=180)
    timeline_clips: list[dict] | None = Field(default=None, max_length=500)
    tokens_used: int | None = Field(default=None, ge=0)
    credits_used: int | None = Field(default=None, ge=0)
    subtitles_enabled: bool | None = None
    subtitle_style: str | None = Field(default=None, pattern=r"^(bottom|center|top)$")
    subtitle_text: str | None = Field(default=None, max_length=12000)
    logo_position: str | None = Field(default=None, pattern=r"^(top-left|top-right|bottom-left|bottom-right)$")
    logo_opacity: float | None = Field(default=None, ge=0.1, le=1)


def _license_from_headers(
    license_key: str | None = Header(default=None, alias="X-License-Key"),
    device_id: str | None = Header(default=None, alias="X-Device-Id"),
) -> dict:
    if not license_key or not device_id:
        raise AppError("CLIENT_LICENSE_REQUIRED", "Tool phải được kích hoạt trước khi dùng dịch vụ", 401)
    return _active_license(license_key, device_id)


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

    # The desktop sends an opaque local provider id. Secrets and capability
    # checks are handled in the Electron main process; the API stores only a
    # non-sensitive job snapshot and must not require an Admin-managed UUID.
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


@router.patch("/jobs/{client_job_id}", response_model=DesktopJobResponse)
async def update_desktop_job(
    client_job_id: str,
    payload: DesktopJobUpdate,
    license_key: str | None = Header(default=None, alias="X-License-Key"),
    device_id: str | None = Header(default=None, alias="X-Device-Id"),
):
    license_record = _license_from_headers(license_key, device_id)
    job = next((item for item in store.list("jobs") if item.get("license_id") == license_record["id"] and item.get("client_job_id") == client_job_id), None)
    if not job:
        raise AppError("CLIENT_JOB_NOT_FOUND", "Không tìm thấy job của thiết bị", 404)
    values = payload.model_dump(exclude_none=True)
    updated = store.update("jobs", job["id"], values)
    return updated or job


@router.delete("/jobs/{client_job_id}")
async def delete_desktop_job(
    client_job_id: str,
    license_key: str | None = Header(default=None, alias="X-License-Key"),
    device_id: str | None = Header(default=None, alias="X-Device-Id"),
):
    """Remove one desktop job owned by the activated license.

    The desktop queue is local-first, but deleting the remote snapshot as well
    prevents a removed job from reappearing during the next synchronization.
    """
    license_record = _license_from_headers(license_key, device_id)
    job = next((item for item in store.list("jobs") if item.get("license_id") == license_record["id"] and item.get("client_job_id") == client_job_id), None)
    if not job:
        raise AppError("CLIENT_JOB_NOT_FOUND", "Không tìm thấy job của thiết bị", 404)
    store.delete("jobs", job["id"])
    return {"data": {"success": True, "message": "Đã xóa job thành công"}}


@router.get("/metrics")
async def desktop_metrics(
    license_key: str | None = Header(default=None, alias="X-License-Key"),
    device_id: str | None = Header(default=None, alias="X-Device-Id"),
):
    license_record = _license_from_headers(license_key, device_id)
    jobs = [item for item in store.list("jobs") if item.get("license_id") == license_record["id"]]
    return {
        "total_jobs": len(jobs),
        "failed_jobs": sum(1 for item in jobs if item.get("status") == "failed"),
        "completed_jobs": sum(1 for item in jobs if item.get("status") == "completed"),
        "tokens_used": sum(int(item.get("tokens_used") or 0) for item in jobs),
        "credits_used": sum(int(item.get("credits_used") or 0) for item in jobs),
    }
