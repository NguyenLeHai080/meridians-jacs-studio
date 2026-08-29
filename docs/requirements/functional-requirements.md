# Yêu cầu chức năng

| ID | Yêu cầu | Ưu tiên |
| --- | --- | --- |
| FR-01 | Desktop tạo HWID hash, kích hoạt key và hiển thị trạng thái license. | Must |
| FR-02 | Admin tạo, tìm kiếm, gia hạn, khóa/revoke key và reset HWID có audit log. | Must |
| FR-03 | Desktop nhập video local hoặc nguồn URL đã được cho phép. | Must |
| FR-04 | Hệ thống phân tích scene/script và hiển thị điểm Hook/Retention cùng đề xuất. | Should |
| FR-05 | Người dùng chỉnh sửa timeline Video, Voice, Audio và Subtitle. | Must |
| FR-06 | Desktop tạo TTS, audio ducking, preview gốc/9:16 và render FFmpeg. | Must |
| FR-07 | Job hàng loạt có queue, tiến độ, retry/cancel và kết quả từng job. | Should |
| FR-08 | Client gửi crash event an toàn; Admin lọc và xem chi tiết sự cố. | Must |
| FR-09 | Hệ thống cảnh báo Telegram/Discord cho fatal và lỗi tăng đột biến. | Should |
| FR-10 | Admin tạo release, upload asset, release notes, optional/force update. | Must |
| FR-11 | Client kiểm tra, tải, xác minh và cài OTA update. | Must |
| FR-12 | Khách tạo profile AI bằng API key, endpoint URL, model và kiểm tra kết nối. | Must |
| FR-13 | Hệ thống chuẩn hóa OpenAI, Gemini và provider tương thích theo capability. | Must |
| FR-14 | Khách chọn local GPU/CPU, cloud hoặc hybrid theo từng tác vụ/job. | Must |
| FR-15 | Hệ thống hiển thị dữ liệu gửi, chi phí ước tính và yêu cầu consent trước cloud processing. | Should |

## Trạng thái triển khai vertical slice

Đã có API chạy được cho FR-01, FR-02 (generate/validate/status/reset/renew),
FR-08 cơ bản, FR-10 manifest/check và FR-12 profile BYOK CRUD. FR-03--FR-07,
FR-09, FR-11, FR-13--FR-15 cần hoàn thiện native engine, worker và adapter vendor
thật trước UAT production; xem [known-limitations.md](../handover/known-limitations.md).

Mỗi yêu cầu phải được tách thành User Story với UI flow, API contract, error code
và acceptance criteria trước khi vào Sprint.
