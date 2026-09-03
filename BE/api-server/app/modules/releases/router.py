from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.core.security import require_auth
from app.core.store import store
from app.modules.releases.schemas import ReleaseCreate, ReleaseResponse

router = APIRouter(prefix="/api/v1/releases", tags=["releases"])


@router.post("", response_model=ReleaseResponse, status_code=201)
async def create_release(payload: ReleaseCreate, _: dict = Depends(require_auth)):
    return store.create("releases", {**payload.model_dump(mode="json"), "status": "draft"})


@router.get("", response_model=list[ReleaseResponse])
async def list_releases(_: dict = Depends(require_auth)):
    return store.list("releases")


@router.post("/{release_id}/publish", response_model=ReleaseResponse)
async def publish_release(release_id: UUID, _: dict = Depends(require_auth)):
    from app.core.errors import AppError

    release = store.get("releases", release_id)
    if not release:
        raise AppError("RELEASE_NOT_FOUND", "Không tìm thấy release", 404)
    if not release.get("signature"):
        raise AppError("RELEASE_SIGNATURE_REQUIRED", "Release phải có chữ ký trước khi publish", 422)
    return store.update("releases", release_id, {"status": "published"})


@router.post("/{release_id}/unpublish", response_model=ReleaseResponse)
async def unpublish_release(release_id: UUID, _: dict = Depends(require_auth)):
    from app.core.errors import AppError

    release = store.get("releases", release_id)
    if not release:
        raise AppError("RELEASE_NOT_FOUND", "Không tìm thấy release", 404)
    return store.update("releases", release_id, {"status": "draft"})


@router.delete("/{release_id}")
async def delete_release(release_id: UUID, _: dict = Depends(require_auth)):
    from app.core.errors import AppError

    release = store.get("releases", release_id)
    if not release:
        raise AppError("RELEASE_NOT_FOUND", "Không tìm thấy release", 404)
    store.delete("releases", release_id)
    return {"data": {"success": True}}


def _version(value: str) -> tuple[int, int, int]:
    try:
        major, minor, patch = value.removeprefix("v").split(".")
        return int(major), int(minor), int(patch)
    except (AttributeError, ValueError):
        return (0, 0, 0)


@router.get("/check")
async def check_update(
    platform: str = Query(pattern=r"^(windows|macos)$"),
    current_version: str = Query(pattern=r"^v\d+\.\d+\.\d+$"),
    channel: str = Query(default="stable", pattern=r"^(stable|beta)$"),
):
    releases = [item for item in store.list("releases") if item.get("status") == "published" and item.get("platform") == platform and item.get("channel") == channel]
    candidates = [item for item in releases if _version(item["version"]) > _version(current_version)]
    latest = max(candidates, key=lambda item: _version(item["version"]), default=None)
    return {"data": {"update_available": latest is not None, "release": latest}}
