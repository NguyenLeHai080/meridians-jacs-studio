# Bộ hồ sơ bàn giao

Thư mục này là checklist để bàn giao JACS Studio cho khách hàng hoặc đội vận
hành. Mã nguồn hiện tại là **MVP vertical slice đã chạy và có test API**; các
mục được đánh dấu `Production gate` phải hoàn thành trước khi dùng dữ liệu thật.

| Tài liệu | Mục đích |
| --- | --- |
| [deployment-runbook.md](deployment-runbook.md) | Cài đặt, cấu hình, backup và rollback |
| [security-checklist.md](security-checklist.md) | Kiểm tra secret, auth, mạng và release |
| [uat-test-cases.md](uat-test-cases.md) | Kịch bản nghiệm thu cho Admin và Desktop |
| [release-checklist.md](release-checklist.md) | Cổng phát hành và chữ ký build |
| [known-limitations.md](known-limitations.md) | Giới hạn đã biết và hướng nâng cấp |
| [verification-report.md](verification-report.md) | Kết quả kiểm tra trên workspace hiện tại |

## Tiêu chí bàn giao tối thiểu

- CI pass lint, test và build cả hai ứng dụng React.
- Snapshot OpenAPI được xuất lại bằng `make export-openapi` và review cùng PR.
- API chạy với PostgreSQL/Redis/secret vault thật; không dùng `InMemoryStore`.
- Admin account dùng password hash, token rotation và RBAC theo vai trò.
- Provider adapter thật đã test quota, timeout, retry và không lộ key.
- Desktop có native shell, secure storage, HWID, FFmpeg/GPU probe và OTA ký số.
- UAT đạt toàn bộ case bắt buộc; có backup, monitoring, rollback và người nhận
  bàn giao được xác nhận.
