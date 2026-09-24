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


@router.get("")
async def list_jobs(_: dict = Depends(require_auth)):
    from datetime import datetime, UTC
    now = datetime.now(UTC)
    all_jobs = list(store.list("jobs"))
    licenses = {str(lic.get("id")): lic for lic in store.list("licenses")}

    # Seed initial demo jobs if empty
    if not all_jobs:
        first_lic = next(iter(licenses.values()), None)
        lic_id = first_lic["id"] if first_lic else None
        cust_name = first_lic.get("customer_name", "Studio Media Pro") if first_lic else "Studio Media Pro"
        
        seeds = [
            {
                "name": "Trích xuất Highlight Video tự động",
                "source_name": "podcast_interview_ep12.mp4",
                "kind": "render",
                "execution_mode": "hybrid",
                "status": "completed",
                "progress": 100,
                "stage": "done",
                "tokens_used": 1420,
                "credits_used": 1.42,
                "duration_seconds": 45,
                "license_id": lic_id,
                "customer_name": cust_name,
                "created_at": now.isoformat(),
            },
            {
                "name": "Lồng tiếng AI & Thuyết minh đa ngữ",
                "source_name": "review_cong_nghe_v2.mp4",
                "kind": "tts",
                "execution_mode": "cloud",
                "status": "completed",
                "progress": 100,
                "stage": "done",
                "tokens_used": 850,
                "credits_used": 0.85,
                "duration_seconds": 28,
                "license_id": lic_id,
                "customer_name": cust_name,
                "created_at": now.isoformat(),
            },
            {
                "name": "Tạo Thumbnail AI Siêu Nét 1024x1024",
                "source_name": "ai_cover_prompt_hero.png",
                "kind": "analysis",
                "execution_mode": "cloud",
                "status": "completed",
                "progress": 100,
                "stage": "done",
                "tokens_used": 3500,
                "credits_used": 3.5,
                "duration_seconds": 18,
                "license_id": lic_id,
                "customer_name": cust_name,
                "created_at": now.isoformat(),
            },
            {
                "name": "Phân tích kịch bản & Chèn Subtitle",
                "source_name": "tiktok_livestream_cut.mp4",
                "kind": "render",
                "execution_mode": "hybrid",
                "status": "running",
                "progress": 68,
                "stage": "generating_subtitles",
                "tokens_used": 620,
                "credits_used": 0.62,
                "duration_seconds": 32,
                "license_id": lic_id,
                "customer_name": cust_name,
                "created_at": now.isoformat(),
            },
        ]
        for s in seeds:
            store.create("jobs", s)
        all_jobs = list(store.list("jobs"))

    enriched = []
    for j in all_jobs:
        lid = str(j.get("license_id") or "")
        lic = licenses.get(lid)
        c_name = j.get("customer_name") or (lic.get("customer_name") if lic else "Khách Desktop")
        k_hint = lic.get("key_hint") or lic.get("raw_key") if lic else (j.get("license_key") or "JACS-KEY")
        
        c_at = j.get("created_at")
        c_at_str = c_at.isoformat() if isinstance(c_at, datetime) else str(c_at or now.isoformat())

        enriched.append({
            "id": str(j.get("id")),
            "client_job_id": j.get("client_job_id") or str(j.get("id"))[:8],
            "name": j.get("name") or j.get("source_name") or "Tác vụ Render AI",
            "source_name": j.get("source_name") or "",
            "kind": j.get("kind", "render"),
            "execution_mode": j.get("execution_mode") or j.get("engine", "hybrid"),
            "status": j.get("status", "completed"),
            "progress": int(j.get("progress", 100)),
            "stage": j.get("stage", "done"),
            "tokens_used": int(j.get("tokens_used") or j.get("tokensUsed") or 0),
            "credits_used": float(j.get("credits_used") or j.get("creditsUsed") or 0.0),
            "duration_seconds": int(j.get("duration_seconds") or 30),
            "customer_name": c_name,
            "license_key": k_hint,
            "error": j.get("error"),
            "created_at": c_at_str,
        })

    return {"data": enriched}


@router.post("/{job_id}/cancel")
async def cancel_job(job_id: str, _: dict = Depends(require_auth)):
    from app.core.errors import AppError
    found = None
    for j in store.list("jobs"):
        if str(j.get("id")) == str(job_id) or str(j.get("client_job_id")) == str(job_id):
            found = j
            break
    if not found:
        raise AppError("JOB_NOT_FOUND", "Không tìm thấy job", 404)
    if found.get("status") in {"completed", "failed", "cancelled"}:
        raise AppError("JOB_NOT_CANCELLABLE", "Job đã kết thúc và không thể hủy", 409)
    updated = store.update("jobs", found["id"], {"status": "cancelled", "stage": "cancelled"})
    return {"data": updated, "message": "Đã hủy job thành công", "status": "cancelled"}



@router.delete("/{job_id}")
async def delete_job(job_id: str, _: dict = Depends(require_auth)):
    from app.core.errors import AppError
    found = None
    for j in store.list("jobs"):
        if str(j.get("id")) == str(job_id) or str(j.get("client_job_id")) == str(job_id):
            found = j
            break
    if not found:
        raise AppError("JOB_NOT_FOUND", "Không tìm thấy job", 404)
    store.delete("jobs", found["id"])
    return {"data": {"success": True, "message": "Đã xóa job thành công"}}

