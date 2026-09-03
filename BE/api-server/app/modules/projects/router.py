from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends

from app.core.errors import AppError
from app.core.security import require_auth
from app.core.store import store
from app.modules.projects.schemas import ProjectCreate, ProjectResponse

router = APIRouter(prefix="/api/v1/projects", tags=["projects"])


@router.post("", response_model=ProjectResponse, status_code=201)
async def create_project(payload: ProjectCreate, _: dict = Depends(require_auth)):
    now = datetime.now(UTC)
    return store.create("projects", {**payload.model_dump(), "created_at": now, "updated_at": now})


@router.get("", response_model=list[ProjectResponse])
async def list_projects(_: dict = Depends(require_auth)):
    return store.list("projects")


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: UUID, _: dict = Depends(require_auth)):
    project = store.get("projects", project_id)
    if not project:
        raise AppError("PROJECT_NOT_FOUND", "Không tìm thấy project", 404)
    return project
