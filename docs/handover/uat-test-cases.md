# Kịch bản UAT

| ID | Kịch bản | Kết quả mong đợi |
| --- | --- | --- |
| UAT-01 | Admin đăng nhập sai/đúng | Sai trả lỗi; đúng vào dashboard; logout vô hiệu token |
| UAT-02 | Tạo license và gửi key | Raw key chỉ hiển thị lần tạo; danh sách chỉ có key hint |
| UAT-03 | Kích hoạt đúng HWID/sai HWID/hết hạn | Đúng thành công; sai bị từ chối với mã lỗi hành động được |
| UAT-04 | Khóa, gia hạn, reset HWID | Trạng thái/hạn/HWID cập nhật và có audit |
| UAT-05 | Cấu hình OpenAI/Gemini/custom | URL/key/model/capability lưu; key không xuất hiện response/log |
| UAT-06 | Test provider và lỗi quota/timeout | Hiển thị capability và lỗi chuẩn hóa; không retry mù request tính phí |
| UAT-07 | Tạo job analysis/TTS/render | Trả `202`, progress, cancel/retry và kết quả không block UI |
| UAT-08 | Chọn local CPU/GPU/cloud/hybrid | Hiển thị dữ liệu/chi phí/consent; không tự upload ngoài lựa chọn |
| UAT-09 | Render timeline 4 lớp | Preview original/9:16, audio ducking, subtitle và file output đúng |
| UAT-10 | Crash telemetry fatal/error | Scrub PII, inspector lọc được, alert dedup theo fingerprint |
| UAT-11 | OTA optional/force | Verify chữ ký/checksum, tải lỗi có retry, rollback được |
| UAT-12 | Mất mạng/thiếu GPU/thiếu quota | Thông báo có hướng xử lý, không mất project nguồn |

Mỗi case cần đính kèm phiên bản build, OS, input fixture, request ID và bằng
chứng (ảnh/video/log đã scrub) trong biên bản nghiệm thu.
