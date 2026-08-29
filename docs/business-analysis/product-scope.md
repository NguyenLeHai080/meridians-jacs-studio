# Phạm vi sản phẩm

## Mục tiêu

JACS Studio giúp người làm nội dung nhập video, phân tích cấu trúc/kịch bản,
tạo giọng đọc AI, biên tập timeline nhiều lớp, tự crop tỷ lệ 9:16 và render
video. Hệ thống phải vận hành trên Windows và macOS, hỗ trợ xử lý local hoặc
hybrid, và quản lý license tập trung.

## Phân hệ

| Phân hệ | Người dùng | Giá trị chính |
| --- | --- | --- |
| Desktop App | Khách hàng | Phân tích, biên tập, render, kích hoạt và cập nhật app |
| Admin Portal | Admin/Support/Dev | Cấp key, quản lý khách, xem lỗi, phát hành bản build |
| Cloud Services | Desktop và Admin | Xác thực license, telemetry, manifest OTA, cảnh báo |
| AI & Media Engine | Desktop App | AI analysis, TTS, FFmpeg, auto-reframe và batch jobs |

## Trong phạm vi bản đầu

- License gắn HWID, thời hạn, trạng thái khóa và giới hạn quyền theo gói.
- Nhập video từ file local hoặc URL được hỗ trợ; cần xác nhận nguồn URL hợp lệ
  và tuân thủ điều khoản nền tảng trước khi triển khai.
- Dual-view preview, timeline bốn lớp, TTS, audio ducking và render FFmpeg.
- Gửi crash/telemetry có kiểm soát; Admin nhận cảnh báo lỗi nghiêm trọng.
- Phát hành Windows/macOS bằng OTA có kiểm tra chữ ký và checksum.

## Ngoài phạm vi hoặc cần chốt

- `TBD`: danh sách nhà cung cấp AI/TTS, mô hình tính phí, quota cụ thể.
- `TBD`: cộng tác thời gian thực, cloud render và lưu trữ project trên cloud.
- `TBD`: chính sách hoàn tiền, chuyển nhượng license và số lần đổi máy.
