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
    tool_slogan: str | None = None
    menu_locks: dict[str, Any] | None = None


class ToolConfigPayload(BaseModel):
    studio_brand_name: str | None = None
    tool_slogan: str | None = None
    custom_logo_url: str | None = None
    support_contact: str | None = None
    menu_locks: dict[str, Any] | None = None


@router.get("/tool-config")
async def get_admin_tool_config(_: dict = Depends(require_auth)) -> dict:
    stored = store.get("system_settings", "main") or {}
    default_locks = {
        "sources": {"locked": False, "title": "1. Nạp Video Nguồn", "message": "Tính năng đang được phát triển"},
        "analysis": {"locked": False, "title": "2. Phân Tích Ngữ Cảnh AI", "message": "Tính năng đang được phát triển"},
        "review": {"locked": False, "title": "3. Kịch Bản & Thuyết Minh", "message": "Tính năng đang được phát triển"},
        "editor": {"locked": False, "title": "4. Timeline & Lồng Tiếng", "message": "Tính năng đang được phát triển"},
        "batch": {"locked": False, "title": "5. Hàng Đợi Render", "message": "Tính năng đang được phát triển"},
        "brand": {"locked": False, "title": "6. Bộ Thương Hiệu", "message": "Tính năng Bộ Thương Hiệu đang được nâng cấp và phát triển, vui lòng quay lại sau!"},
        "render": {"locked": False, "title": "7. Xuất Bản & Tải Video", "message": "Tính năng đang được phát triển"},
        "subtitles": {"locked": False, "title": "8. Phụ Đề & Biên Dịch", "message": "Tính năng Phụ Đề & Biên Dịch đang được nâng cấp và phát triển, vui lòng quay lại sau!"},
        "settings": {"locked": False, "title": "Cài Đặt Hệ Thống", "message": "Tính năng đang được bảo trì"},
        "billing": {"locked": False, "title": "Dòng Tiền & Gia Hạn", "message": "Tính năng đang được bảo trì"},
        "logs": {"locked": False, "title": "Nhật Ký Hoạt Động", "message": "Tính năng đang được bảo trì"},
    }
    current_locks = stored.get("menu_locks") or {}
    merged_locks = {**default_locks, **current_locks}

    return {
        "data": {
            "studio_brand_name": stored.get("studio_brand_name", "JACS Studio"),
            "tool_slogan": stored.get("tool_slogan", "Judicious AI Content Scanner & Video Synthesis Engine"),
            "custom_logo_url": stored.get("custom_logo_url", ""),
            "support_contact": stored.get("support_contact", "https://t.me/jacs_support"),
            "menu_locks": merged_locks,
        }
    }


@router.put("/tool-config")
async def update_admin_tool_config(payload: ToolConfigPayload, user: dict = Depends(require_auth)) -> dict:
    stored = store.get("system_settings", "main") or {}
    updates = payload.model_dump(exclude_unset=True)
    merged = {**stored, **updates, "id": "main", "updated_at": datetime.now(UTC).isoformat(), "updated_by": user["email"]}
    if stored:
        store.update("system_settings", "main", merged)
    else:
        store.create("system_settings", merged)

    store.create("audit", {"action": "system.tool_config_updated", "actor": user["email"]})
    return {"data": {"success": True, "tool_config": merged}}


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


DEFAULT_TERMS = {
    "title": "Điều Khoản Sử Dụng & Miễn Trừ Trách Nhiệm Pháp Lý JACS Studio",
    "updated_at": "2026-09-03T10:00:00Z",
    "disclaimer": """1. BẢN QUYỀN VÀ MIỄN TRỪ TRÁCH NHIỆM NỘI DUNG
- JACS Studio là bộ công cụ hỗ trợ biên tập, dựng video, trích xuất cảnh và tổng hợp giọng đọc AI tự động.
- Người dùng chịu trách nhiệm pháp lý 100% đối với toàn bộ video nguồn, hình ảnh, âm thanh và văn bản do chính người dùng nhập vào hoặc xử lý qua phần mềm.
- Nhà phát triển JACS Studio không sở hữu, không lưu trữ và không chịu bất kỳ trách nhiệm pháp lý nào về tranh chấp quyền tác giả, bản quyền thương hiệu, quyền hình ảnh hoặc các khiếu nại liên quan đến nội dung do người dùng tạo ra.""",
    "ai_usage": """2. QUY ĐỊNH SỬ DỤNG AI & DỊCH VỤ BÊN THỨ BA
- Người dùng tự cấu hình và sử dụng API Key (OpenAI, Gemini, ElevenLabs, Claude...) theo đúng chính sách điều khoản của từng nhà cung cấp dịch vụ tương ứng.
- JACS Studio không chịu trách nhiệm đối với bất kỳ chi phí phát sinh, việc khóa tài khoản API hoặc tính chính xác của nội dung do mô hình AI của bên thứ ba sinh ra.""",
    "license_rights": """3. QUYỀN SỬ DỤNG BẢN QUYỀN & THIẾT BỊ
- Mỗi License Key được cấp quyền kích hoạt sử dụng trên số lượng thiết bị phần cứng (HWID) đã đăng ký theo gói dịch vụ.
- Nghiêm cấm mọi hành vi đảo ngược mã nguồn (Reverse Engineering), bẻ khóa (Crack), chia sẻ trái phép hoặc bán lại license khi chưa có sự đồng ý bằng văn bản của JACS Studio.
- Vi phạm điều khoản sẽ dẫn đến việc thu hồi và khóa vĩnh viễn License Key mà không được hoàn tiền.""",
    "dispute_resolution": """4. GIẢI QUYẾT TRANH CHẤP & LIÊN HỆ
- Mọi thắc mắc, yêu cầu khiếu nại hoặc hỗ trợ kỹ thuật xin vui lòng liên hệ trực tiếp với bộ phận chăm sóc khách hàng của JACS Studio qua kênh hỗ trợ chính thức.
- Trong trường hợp xảy ra tranh chấp pháp lý, các bên cam kết ưu tiên thương lượng trên tinh thần tôn trọng quyền sở hữu trí tuệ và quy định pháp luật hiện hành."""
}


@router.get("/terms")
async def get_system_terms() -> dict:
    """Public endpoint to get current terms and legal disclaimer."""
    stored = store.get("system_settings", "terms_and_disclaimer") or {}
    return {
        "data": {
            **DEFAULT_TERMS,
            **stored,
        }
    }


@router.put("/terms")
async def update_system_terms(payload: dict, user: dict = Depends(require_auth)) -> dict:
    """Admin endpoint to update legal terms and disclaimer."""
    now = datetime.now(UTC).isoformat()
    values = {
        "id": "terms_and_disclaimer",
        "title": payload.get("title", DEFAULT_TERMS["title"]),
        "disclaimer": payload.get("disclaimer", DEFAULT_TERMS["disclaimer"]),
        "ai_usage": payload.get("ai_usage", DEFAULT_TERMS["ai_usage"]),
        "license_rights": payload.get("license_rights", DEFAULT_TERMS["license_rights"]),
        "dispute_resolution": payload.get("dispute_resolution", DEFAULT_TERMS["dispute_resolution"]),
        "updated_at": now,
        "updated_by": user["email"],
    }
    if store.get("system_settings", "terms_and_disclaimer"):
        store.update("system_settings", "terms_and_disclaimer", values)
    else:
        store.create("system_settings", values)

    store.create("audit", {"action": "system.terms_updated", "actor": user["email"]})
    return {"data": {"success": True, "terms": values}}
