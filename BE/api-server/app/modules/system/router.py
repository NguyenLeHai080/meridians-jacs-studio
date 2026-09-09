from __future__ import annotations

import platform
import sys
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from uuid import uuid4

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
    "title": "THỎA THUẬN CẤP PHÉP SỬ DỤNG VÀ ĐIỀU KHOẢN DỊCH VỤ PHẦN MỀM JACS STUDIO",
    "updated_at": "2026-09-09T00:00:00Z",
    "disclaimer": """Điều 1. Bản quyền phần mềm và phạm vi cấp phép sử dụng

1. JACS Studio là sản phẩm phần mềm độc quyền được phát triển bởi Nhà phát triển JACS Studio, bao gồm toàn bộ mã nguồn, cấu trúc thuật toán, giao diện đồ họa (UI/UX) và các tài liệu kỹ thuật liên quan, được bảo hộ theo pháp luật về Sở hữu trí tuệ.

2. License Key được cấp cho Khách hàng là quyền sử dụng có giới hạn (Limited), không độc quyền (Non-exclusive), không được chuyển nhượng (Non-transferable) và chỉ phục vụ cho mục đích tác nghiệp, biên tập video nội bộ theo đúng thỏa thuận.

3. Nghiêm cấm mọi hành vi sao chép, phân phối lại, cho thuê, thương mại hóa phần mềm hoặc chuyển nhượng License Key cho bên thứ ba khi chưa có văn bản chấp thuận từ Nhà phát triển.""",
    "license_rights": """Điều 2. Bảo mật phần mềm, kiểm soát thiết bị (HWID) và chống can thiệp mã nguồn

1. Mỗi License Key được định danh và gắn kết chặt chẽ với mã nhận dạng phần cứng (HWID) của số lượng thiết bị đã đăng ký trong gói dịch vụ.

2. Nghiêm cấm tuyệt đối mọi hành vi can thiệp trái phép vào phần mềm, bao gồm nhưng không giới hạn: đảo ngược mã nguồn (Reverse Engineering), dịch ngược (Decompilation), can thiệp bộ nhớ (Debugging/Memory Hooking), bẻ khóa (Crack), hoặc vô hiệu hóa cơ chế xác thực bản quyền.

3. Mọi hành vi vi phạm sẽ dẫn đến việc đình chỉ ngay lập tức và thu hồi vĩnh viễn quyền sử dụng mà không được hoàn lại bất kỳ khoản phí nào, đồng thời Người dùng phải chịu hoàn toàn trách nhiệm bồi thường thiệt hại theo quy định của pháp luật.""",
    "content_warranty": """Điều 3. Trách nhiệm về dữ liệu đầu vào và tuyên bố miễn trừ trách nhiệm bản quyền nội dung

1. JACS Studio là công cụ hỗ trợ công nghệ tự động hóa quy trình phân tích và biên tập video. Nhà phát triển JACS Studio hoàn toàn không sở hữu, không quản lý, không kiểm duyệt và không lưu trữ bất kỳ video nguồn, âm thanh, hình ảnh hoặc tài liệu nào do Người dùng đưa vào xử lý.

2. Người dùng cam đoan và bảo đảm rằng mình là chủ sở hữu hợp pháp hoặc đã được cấp đầy đủ quyền sử dụng, quyền phát hành đối với toàn bộ dữ liệu, nguyên liệu đầu vào và nội dung được tạo ra thông qua phần mềm.

3. Người dùng chịu trách nhiệm pháp lý 100% trước cơ quan nhà nước có thẩm quyền và các bên thứ ba đối với mọi tranh chấp bản quyền, quyền tác giả, nhãn hiệu thương mại, quyền hình ảnh hoặc các nội dung vi phạm pháp luật phát sinh từ việc sử dụng phần mềm.

4. Nhà phát triển JACS Studio được miễn trừ hoàn toàn và vô điều kiện khỏi mọi khiếu nại, khiếu kiện, trách nhiệm dân sự, hình sự hoặc tổn thất phát sinh liên quan đến nội dung do Người dùng tạo ra.""",
    "ai_usage": """Điều 4. Tích hợp mô hình AI và chính sách API bên thứ ba (BYOK)

1. Người dùng tự chịu trách nhiệm cấu hình, quản lý và sử dụng các khóa API cá nhân/doanh nghiệp (OpenAI, Gemini, Anthropic Claude, ElevenLabs...) theo đúng chính sách và điều khoản dịch vụ của từng nhà cung cấp.

2. Toàn bộ API Key được mã hóa an toàn cục bộ trên thiết bị của Người dùng. Nhà phát triển không chịu trách nhiệm đối với chi phí phát sinh, việc khóa tài khoản API hoặc tính chính xác, tính đầy đủ của nội dung do các mô hình trí tuệ nhân tạo bên thứ ba sinh ra.""",
    "limitation_of_liability": """Điều 5. Giới hạn trách nhiệm pháp lý và từ chối bảo đảm (Limitation of Liability)

1. Phần mềm được cung cấp trên nguyên tắc "Theo Nguyên Trạng" (As Is) và "Như Hiện Có" (As Available). Nhà phát triển nỗ lực tối đa để đảm bảo phần mềm hoạt động ổn định nhưng không bảo đảm rằng phần mềm sẽ hoàn toàn không có lỗi kỹ thuật hoặc tương thích 100% với mọi cấu hình máy tính của bên thứ ba.

2. Trong mọi trường hợp, Nhà phát triển JACS Studio không chịu trách nhiệm về bất kỳ thiệt hại gián tiếp, ngẫu nhiên, hệ quả, thiệt hại về lợi nhuận hoặc gián đoạn hoạt động kinh doanh phát sinh từ việc sử dụng hoặc không thể sử dụng phần mềm.""",
    "dispute_resolution": """Điều 6. Hiệu lực thỏa thuận, chấp thuận điện tử và giải quyết tranh chấp

1. Bằng hành động cài đặt, kích hoạt License Key hoặc nhấn nút "Xác nhận & Đồng ý" trên giao diện phần mềm, Người dùng đã đọc, hiểu rõ và tự nguyện cam kết tuân thủ toàn bộ các điều khoản của Thỏa thuận này (có giá trị pháp lý tương đương hợp đồng bằng văn bản theo Luật Giao dịch điện tử).

2. Thỏa thuận này được điều chỉnh và giải thích theo quy định của pháp luật Nước Cộng hòa Xã hội Chủ nghĩa Việt Nam. Mọi tranh chấp nếu không thể giải quyết thông qua thương lượng sẽ được đưa ra giải quyết tại Tòa án có thẩm quyền theo quy định của pháp luật."""
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
        "license_rights": payload.get("license_rights", DEFAULT_TERMS["license_rights"]),
        "content_warranty": payload.get("content_warranty", DEFAULT_TERMS.get("content_warranty", "")),
        "ai_usage": payload.get("ai_usage", DEFAULT_TERMS["ai_usage"]),
        "limitation_of_liability": payload.get("limitation_of_liability", DEFAULT_TERMS.get("limitation_of_liability", "")),
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


DEFAULT_EULA_DOCUMENTS = [
    {
        "id": "eula-doc-1",
        "code": "JACS-EULA-2026-v2.6",
        "title": "Thỏa thuận Cấp phép & Điều khoản Dịch vụ Phần mềm JACS Studio (EULA Tổng Thể)",
        "version": "v2.6.0",
        "category": "enterprise",
        "status": "active",
        "full_content": f"""CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc
---o0o---

{DEFAULT_TERMS['title']}
(Ban hành kèm theo Quyết định quản trị hệ thống phần mềm JACS Studio • Số hiệu: JACS-EULA-2026-v2.6)

Căn cứ Bộ luật Dân sự số 91/2015/QH13 ngày 24 tháng 11 năm 2015;
Căn cứ Luật Sở hữu trí tuệ số 36/2005/QH11 (sửa đổi, bổ sung năm 2022);
Căn cứ Luật Công nghệ thông tin số 67/2006/QH11;
Căn cứ Luật Giao dịch điện tử số 20/2023/QH15;
Căn cứ Nghị định số 30/2020/NĐ-CP về công tác văn thư;
Căn cứ Nghị định số 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân.

{DEFAULT_TERMS['disclaimer']}

{DEFAULT_TERMS['license_rights']}

{DEFAULT_TERMS['content_warranty']}

{DEFAULT_TERMS['ai_usage']}

{DEFAULT_TERMS['limitation_of_liability']}

{DEFAULT_TERMS['dispute_resolution']}

ĐẠI DIỆN BỘ PHẬN PHÁT TRIỂN & BẢO HỘ BẢN QUYỀN JACS STUDIO
Xác thực bản quyền phần mềm: Jacs.Legal.Auth
Chữ ký điện tử / Hash: SHA256:8F92-4B10-AC99-2026-JACS-LEGAL""",
        "summary": "Bản quyền phần mềm chính thức, điều khoản khóa phần cứng HWID và tuyên bố miễn trừ 100% bản quyền nội dung.",
        "legal_basis": [
            "Bộ luật Dân sự 2015",
            "Luật Sở hữu trí tuệ",
            "Luật Giao dịch điện tử 2023",
            "Nghị định 30/2020/NĐ-CP",
            "Nghị định 13/2023/NĐ-CP",
        ],
        "requires_hwid_binding": True,
        "requires_content_disclaimer": True,
        "created_at": "2026-01-15T08:00:00Z",
        "updated_at": "2026-09-09T08:30:00Z",
        "updated_by": "Admin Root (Security Dept)",
        "digital_signature": "SHA256:8F92-4B10-AC99-2026-JACS-LEGAL",
    },
    {
        "id": "eula-doc-2",
        "code": "JACS-BYOK-AI-2026-v1.4",
        "title": "Chính sách Tuyên bố Miễn trừ Trách nhiệm & Tích hợp AI Bên Thứ Ba (BYOK Policy)",
        "version": "v1.4.2",
        "category": "ai_policy",
        "status": "active",
        "full_content": """CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc
---o0o---

QUY CHẾ TÍCH HỢP MÔ HÌNH TRÍ TUỆ NHÂN TẠO & CHÍNH SÁCH BYOK (BRING YOUR OWN KEY)
(Ban hành theo Quyết định số: 18/2026/QĐ-JACS • Áp dụng cho toàn bộ người dùng phần mềm JACS Studio)

Căn cứ Luật An ninh mạng số 24/2018/QH14;
Căn cứ Nghị định số 13/2023/NĐ-CP về Bảo vệ dữ liệu cá nhân;
Căn cứ Tiêu chuẩn bảo mật mã hóa Windows DPAPI & AES-256.

Điều 1. Nguyên tắc mang khóa API cá nhân (Bring Your Own Key - BYOK)
1. Người dùng có toàn quyền kết nối các khóa API từ các nhà cung cấp bên thứ ba (OpenAI, Gemini, Anthropic, ElevenLabs, Runway...) vào JACS Studio.
2. Toàn bộ API Key được lưu trữ và mã hóa an toàn trực tiếp trên bộ nhớ máy tính cục bộ của người dùng thông qua công nghệ Windows DPAPI. Hệ thống máy chủ của JACS Studio tuyệt đối không thu thập hay lưu giữ các API Key này.

Điều 2. Trách nhiệm chi phí và hạn mức sử dụng API
1. Người dùng tự thanh toán và kiểm soát mọi chi phí phát sinh đối với bên cung cấp dịch vụ AI.
2. JACS Studio không can thiệp, không chịu trách nhiệm bồi hoàn đối với việc trừ tiền API, khóa tài khoản bên thứ ba hoặc gián đoạn dịch vụ AI từ nhà cung cấp gốc.

Điều 3. Cam kết miễn trừ trách nhiệm về tính xác thực của nội dung do AI sinh ra
1. Người dùng hiểu rõ trí tuệ nhân tạo có thể tạo ra thông tin không chính xác hoặc vi phạm chính sách nội dung nếu không được kiểm duyệt bởi con người.
2. Người dùng cam kết tự chịu trách nhiệm kiểm duyệt toàn bộ video, kịch bản, âm thanh trước khi xuất bản ra môi trường công cộng.""",
        "summary": "Quy định bảo mật khóa API cục bộ (DPAPI), miễn trừ chi phí token và tính chuẩn xác của nội dung do AI tạo ra.",
        "legal_basis": [
            "Luật An ninh mạng 2018",
            "Nghị định 13/2023/NĐ-CP",
            "Chính sách bảo mật Windows DPAPI",
        ],
        "requires_hwid_binding": False,
        "requires_content_disclaimer": True,
        "created_at": "2026-03-10T10:15:00Z",
        "updated_at": "2026-08-20T14:45:00Z",
        "updated_by": "AI Governance Team",
        "digital_signature": "SHA256:4C81-7D22-EF01-2026-JACS-BYOK",
    },
    {
        "id": "eula-doc-3",
        "code": "JACS-CREATOR-STD-2026",
        "title": "Thỏa thuận Bản quyền Người dùng Cá nhân & Sáng tạo nội dung (Creator Standard)",
        "version": "v2.1.0",
        "category": "standard",
        "status": "active",
        "full_content": """CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc
---o0o---

THỎA THUẬN CẤP PHÉP SỬ DỤNG CHO NGƯỜI SÁNG TẠO NỘI DUNG (CREATOR STANDARD)
Số hiệu: JACS-CREATOR-2026-v2.1

Điều 1. Phạm vi cấp phép cá nhân
1. Giấy phép Creator Standard cho phép 01 người dùng cá nhân kích hoạt trên tối đa số thiết bị chỉ định theo gói đăng ký.
2. Khách hàng được sử dụng video xuất ra từ phần mềm cho mục đích phát hành trên các nền tảng mạng xã hội cá nhân (YouTube, TikTok, Facebook, Instagram...).

Điều 2. Nghiêm cấm chia sẻ License Key
1. Khách hàng không được bán lại, chia sẻ License Key cho nhiều người dùng khác. Hệ thống tự động quét bất thường và đình chỉ license nếu phát hiện nhiều IP đồng thời trên các phần cứng khác nhau.""",
        "summary": "Áp dụng cho gói tài khoản Creator cá nhân, quy định hạn mức thiết bị và mục đích sản xuất video.",
        "legal_basis": [
            "Luật Sở hữu trí tuệ",
            "Luật Giao dịch điện tử 2023",
        ],
        "requires_hwid_binding": True,
        "requires_content_disclaimer": True,
        "created_at": "2026-04-05T09:00:00Z",
        "updated_at": "2026-07-15T11:20:00Z",
        "updated_by": "Licensing Admin",
        "digital_signature": "SHA256:1A99-3B22-88EF-2026-JACS-STD",
    },
    {
        "id": "eula-doc-4",
        "code": "JACS-NDA-SEC-2026-rc",
        "title": "Thỏa thuận Bảo mật Thông tin & Chống Dịch ngược Mã nguồn (Anti-Reverse Engineering)",
        "version": "v3.0.0-rc",
        "category": "security",
        "status": "draft",
        "full_content": """CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc
---o0o---

QUY ĐỊNH BẢO VỆ MÃ NGUỒN VÀ BẢO MẬT HỆ THỐNG JACS STUDIO
(Bản thảo chuẩn bị ban hành phiên bản v3.0)

Điều 1. Định nghĩa hành vi can thiệp trái phép
1. Mọi hành vi gắn trình gỡ lỗi (Debugger), chích mã bộ nhớ (DLL Injection), giả lập máy chủ xác thực giấy phép (Mock Auth Server) đều bị coi là hành vi xâm phạm an ninh hệ thống nghiêm trọng.
2. Hệ thống phòng vệ chủ động sẽ tự hủy phiên làm việc và gửi báo cáo telemetry về trung tâm cảnh báo.""",
        "summary": "Bản thảo quy định kỹ thuật về bảo mật chống crack, hooking và giả lập server xác thực.",
        "legal_basis": [
            "Luật An toàn thông tin mạng 2015",
            "Bộ luật Hình sự 2015 (sửa đổi 2017)",
        ],
        "requires_hwid_binding": True,
        "requires_content_disclaimer": False,
        "created_at": "2026-08-01T15:30:00Z",
        "updated_at": "2026-09-05T16:10:00Z",
        "updated_by": "Security Operations Center",
        "digital_signature": "SHA256:DRAF-9921-EE44-2026-JACS-SEC",
    },
    {
        "id": "eula-doc-5",
        "code": "JACS-EULA-2025-LEGACY",
        "title": "Thỏa thuận Cấp phép Sử dụng Phần mềm JACS Studio phiên bản 2025 (Legacy)",
        "version": "v1.8.4",
        "category": "enterprise",
        "status": "archived",
        "full_content": """THỎA THUẬN CẤP PHÉP SỬ DỤNG JACS STUDIO (PHIÊN BẢN 2025 - ĐÃ HẾT HIỆU LỰC)
Văn bản lưu trữ lịch sử theo quy định quản lý phiên bản phần mềm.""",
        "summary": "Văn bản bản quyền phiên bản cũ năm 2025, đã được thay thế bởi phiên bản 2026 v2.6.",
        "legal_basis": [
            "Bộ luật Dân sự 2015",
        ],
        "requires_hwid_binding": False,
        "requires_content_disclaimer": True,
        "created_at": "2025-01-10T08:00:00Z",
        "updated_at": "2025-12-31T23:59:59Z",
        "updated_by": "System Archive",
        "digital_signature": "SHA256:ARCH-2025-0000-JACS-LEGACY",
    },
]


@router.get("/terms/documents")
async def list_eula_documents() -> dict:
    """Get all EULA and licensing documents stored in DB."""
    docs = store.list("eula_documents")
    return {"data": docs}


@router.post("/terms/documents")
async def create_eula_document(payload: dict, user: dict = Depends(require_auth)) -> dict:
    """Create a new EULA document in DB."""
    now = datetime.now(UTC).isoformat()
    doc_id = payload.get("id") or f"eula-doc-{uuid4()}"
    new_doc = {
        "id": str(doc_id),
        "code": payload.get("code", "JACS-EULA-DOC"),
        "title": payload.get("title", ""),
        "version": payload.get("version", "v1.0.0"),
        "category": payload.get("category", "enterprise"),
        "status": payload.get("status", "draft"),
        "full_content": payload.get("full_content", ""),
        "summary": payload.get("summary", ""),
        "legal_basis": payload.get("legal_basis", []),
        "requires_hwid_binding": payload.get("requires_hwid_binding", True),
        "requires_content_disclaimer": payload.get("requires_content_disclaimer", True),
        "created_at": now,
        "updated_at": now,
        "updated_by": user.get("email", "Admin Root"),
        "digital_signature": payload.get("digital_signature", f"SHA256:{uuid4().hex[:8].upper()}-2026-JACS-LEGAL"),
    }

    if new_doc["status"] == "active":
        all_docs = store.list("eula_documents")
        for d in all_docs:
            if d.get("status") == "active":
                store.update("eula_documents", d["id"], {"status": "draft"})

    created = store.create("eula_documents", new_doc)
    store.create("audit", {"action": "system.eula_created", "actor": user["email"], "doc_id": str(doc_id)})
    return {"data": created}


@router.put("/terms/documents/{doc_id}")
async def update_eula_document(doc_id: str, payload: dict, user: dict = Depends(require_auth)) -> dict:
    """Update an existing EULA document in DB."""
    existing = store.get("eula_documents", doc_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Document not found")

    now = datetime.now(UTC).isoformat()
    values = {
        **existing,
        **payload,
        "id": doc_id,
        "updated_at": now,
        "updated_by": user.get("email", "Admin Root"),
    }

    if values.get("status") == "active":
        all_docs = store.list("eula_documents")
        for d in all_docs:
            if str(d.get("id")) != str(doc_id) and d.get("status") == "active":
                store.update("eula_documents", d["id"], {"status": "draft"})

        # Sync main terms_and_disclaimer
        terms_values = {
            "id": "terms_and_disclaimer",
            "title": values.get("title", ""),
            "disclaimer": values.get("full_content", ""),
            "updated_at": now,
            "updated_by": user["email"],
        }
        if store.get("system_settings", "terms_and_disclaimer"):
            store.update("system_settings", "terms_and_disclaimer", terms_values)
        else:
            store.create("system_settings", terms_values)

    updated = store.update("eula_documents", doc_id, values)
    store.create("audit", {"action": "system.eula_updated", "actor": user["email"], "doc_id": doc_id})
    return {"data": updated}


@router.delete("/terms/documents/{doc_id}")
async def delete_eula_document(doc_id: str, user: dict = Depends(require_auth)) -> dict:
    """Delete an EULA document from DB."""
    deleted = store.delete("eula_documents", doc_id)
    store.create("audit", {"action": "system.eula_deleted", "actor": user["email"], "doc_id": doc_id})
    return {"data": {"success": deleted}}


@router.post("/terms/documents/{doc_id}/activate")
async def activate_eula_document(doc_id: str, user: dict = Depends(require_auth)) -> dict:
    """Set an EULA document as active in DB."""
    existing = store.get("eula_documents", doc_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Document not found")

    now = datetime.now(UTC).isoformat()
    all_docs = store.list("eula_documents")
    for d in all_docs:
        if str(d.get("id")) != str(doc_id) and d.get("status") == "active":
            store.update("eula_documents", d["id"], {"status": "draft"})

    updated = store.update("eula_documents", doc_id, {"status": "active", "updated_at": now, "updated_by": user["email"]})

    # Sync main terms
    terms_values = {
        "id": "terms_and_disclaimer",
        "title": existing.get("title", ""),
        "disclaimer": existing.get("full_content", ""),
        "updated_at": now,
        "updated_by": user["email"],
    }
    if store.get("system_settings", "terms_and_disclaimer"):
        store.update("system_settings", "terms_and_disclaimer", terms_values)
    else:
        store.create("system_settings", terms_values)

    store.create("audit", {"action": "system.eula_activated", "actor": user["email"], "doc_id": doc_id})
    return {"data": updated}

