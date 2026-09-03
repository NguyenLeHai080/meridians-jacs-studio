from uuid import UUID

from fastapi import APIRouter, Depends, status

from app.core.security import require_auth
from app.core.store import store
from app.modules.jobs.schemas import JobCreate, JobResponse

router = APIRouter(prefix="/api/v1/jobs", tags=["jobs"])


@router.post("", response_model=JobResponse, status_code=status.HTTP_202_ACCEPTED)
async def create_job(payload: JobCreate, _: dict = Depends(require_auth)):
    from app.core.errors import AppError

    if payload.execution_mode in {"cloud", "hybrid"} and not payload.provider_id:
        raise AppError("JOB_PROVIDER_REQUIRED", "Job cloud/hybrid phải chỉ định provider", 422)
    provider = store.get("providers", payload.provider_id) if payload.provider_id else None
    if payload.provider_id and not provider:
        raise AppError("PROVIDER_NOT_FOUND", "Không tìm thấy provider", 404)
    required_capability = "analysis" if payload.kind == "render" and payload.execution_mode == "hybrid" else {"analysis": "analysis", "tts": "tts", "render": "video_render"}[payload.kind]
    if provider and payload.execution_mode in {"cloud", "hybrid"} and required_capability not in provider.get("capabilities", []):
        raise AppError("PROVIDER_CAPABILITY_UNSUPPORTED", "Provider không hỗ trợ capability của job", 422, {"required": required_capability})
    return store.create("jobs", {**payload.model_dump(), "status": "queued", "progress": 0, "engine": payload.execution_mode.value})


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(job_id: UUID, _: dict = Depends(require_auth)):
    from app.core.errors import AppError

    job = store.get("jobs", UUID(str(job_id)))
    if not job:
        raise AppError("JOB_NOT_FOUND", "Không tìm thấy job", 404)
    return job


@router.get("", response_model=list[JobResponse])
async def list_jobs(_: dict = Depends(require_auth)):
    return store.list("jobs")


@router.post("/{job_id}/cancel", response_model=JobResponse)
async def cancel_job(job_id: UUID, _: dict = Depends(require_auth)):
    from app.core.errors import AppError

    job = store.get("jobs", UUID(str(job_id)))
    if not job:
        raise AppError("JOB_NOT_FOUND", "Không tìm thấy job", 404)
    if job["status"] in {"completed", "failed", "cancelled"}:
        raise AppError("JOB_NOT_CANCELLABLE", "Job đã kết thúc và không thể hủy", 409)
    return store.update("jobs", job["id"], {"status": "cancelled"})
