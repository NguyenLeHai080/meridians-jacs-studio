# Yêu cầu phi chức năng

| Nhóm | Yêu cầu |
| --- | --- |
| Bảo mật | TLS, RBAC, secret management, mã hóa secure storage, rate-limit và audit log. |
| API bên thứ ba | Không log secret/payload nhạy cảm, timeout/retry có kiểm soát, idempotency cho request tính phí và chặn SSRF tại gateway. |
| Riêng tư | Thu thập tối thiểu, hash HWID, consent telemetry, retention và quyền xóa dữ liệu. |
| Tương thích | Build và kiểm thử Windows 11, macOS Apple Silicon và Intel. Version tối thiểu: `TBD`. |
| Hiệu năng | UI không bị block khi phân tích/render; giới hạn RAM/CPU/GPU và báo tiến độ. Mục tiêu số đo: `TBD`. |
| Tin cậy | Retry có backoff, idempotency telemetry/license, backup DB và rollback release. |
| Quan sát | Log có request ID, metrics, tracing và cảnh báo có ngưỡng/fingerprint. |
| Chất lượng | Lint, type-check, unit/integration/e2e test; build ký code trên cả hai OS. |
| Khả năng bảo trì | Monorepo, ReactJS/Python theo `core` + `modules`, API versioning, migration có rollback và tài liệu OpenAPI. |
