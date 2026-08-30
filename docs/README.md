# Tài liệu dự án JACS Studio

Tài liệu được tổ chức theo chuyên môn. Tên thư mục và tệp dùng tiếng Anh; nội dung
dùng tiếng Việt để đội dự án dễ trao đổi.

| Thư mục | Nội dung |
| --- | --- |
| [business-analysis](business-analysis/) | Phạm vi, vai trò, quy trình và quy tắc nghiệp vụ |
| [architecture](architecture/) | Thiết kế hệ thống Desktop, Server, Admin và AI/Media |
| [requirements](requirements/) | Yêu cầu chức năng, phi chức năng và tiêu chí nghiệm thu |
| [planning](planning/) | Kế hoạch sáu Sprint và điều kiện DoR/DoD |
| [git](git/) | Quy trình nhánh, PR, phát hành và CI/CD |
| [api](api/) | Chuẩn kiến trúc và hợp đồng API |
| [scale](scale/) | Capacity, sizing, autoscaling và kiểm soát chi phí |
| [handover](handover/) | Runbook triển khai, security, UAT, release và giới hạn |

Các nội dung có nhãn `TBD` cần được Product Owner hoặc Tech Lead xác nhận trước
khi đưa vào Sprint.

Tích hợp API bên thứ ba và lựa chọn render xem tại [ai-provider-and-rendering.md](business-analysis/ai-provider-and-rendering.md) và [provider-and-rendering-design.md](architecture/provider-and-rendering-design.md).

Chuẩn ReactJS/Python và phân chia `core` + `modules` xem tại
[react-architecture.md](frontend/react-architecture.md),
[python-architecture.md](backend/python-architecture.md) và
[core-and-modules.md](architecture/core-and-modules.md).

Luồng nghiệp vụ Desktop mới xem tại
[desktop-workflow.md](business-analysis/desktop-workflow.md), thiết kế native
macOS/Windows tại [desktop-runtime-design.md](architecture/desktop-runtime-design.md)
và Product Backlog Scrum tại [product-backlog.md](planning/product-backlog.md).

Mô hình hệ thống và quy mô xem tại [c4-model.md](architecture/c4-model.md),
[deployment-model.md](architecture/deployment-model.md) và [scale](scale/).

Cấu trúc code thực tế của `FE/`, `BE/`, `Tool/` xem tại
[repository-layout.md](repository-layout.md).
