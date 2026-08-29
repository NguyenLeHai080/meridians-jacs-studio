# Kế hoạch triển khai Scrum

Mỗi Sprint kéo dài 2 tuần; kế hoạch dự kiến 6 Sprint trong 12 tuần.

| Sprint | Mục tiêu | Kết quả nghiệm thu |
| --- | --- | --- |
| 1 | Monorepo, Python API core, React shell và UI kit | API health/auth chạy được, Admin và Desktop prototype khởi động |
| 2 | License, HWID và Admin Portal | Cấp/kích hoạt/khóa/reset key, audit log và danh sách license |
| 3 | Nhập video, settings, AI analysis, dual preview | Tạo project và xem kết quả phân tích/crop 9:16 |
| 4 | Timeline, TTS, audio ducking, FFmpeg | Render được một video hoàn chỉnh từ timeline 4 lớp |
| 5 | Batch queue, telemetry, CI/CD và OTA | Job hàng loạt, alert sự cố, build/cập nhật thử thành công |
| 6 | Hardening và release | Stress test, signing, rollback test, UAT và bàn giao |

## Definition of Ready

User Story chỉ vào Sprint khi có wireframe/UI flow, acceptance criteria, API
contract, error code, phụ thuộc và dữ liệu test đã rõ.

## Definition of Done

Code qua lint/type-check/test, được review qua PR, có tài liệu cập nhật, build
thành công trên Windows/macOS và không có lỗi nghiêm trọng/memory leak trong
kịch bản render đã xác định.
