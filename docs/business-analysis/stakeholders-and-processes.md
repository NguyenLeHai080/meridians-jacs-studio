# Tác nhân và quy trình nghiệp vụ

## Vai trò

| Vai trò | Quyền và trách nhiệm |
| --- | --- |
| Khách hàng | Kích hoạt app, tạo/render project, gửi lỗi theo lựa chọn đồng ý |
| Admin | Tạo/gia hạn/khóa key, gán HWID, quản lý bản phát hành |
| Support | Tra cứu license và hỗ trợ reset HWID theo chính sách |
| Developer | Xem telemetry đã phân quyền, xử lý sự cố và phát hành build |
| System | Xác thực, nhận log, gửi cảnh báo và phân phối OTA |

## Luồng kích hoạt license

1. Desktop tạo HWID ổn định theo nền tảng và chỉ gửi giá trị hash qua HTTPS.
2. Khách gửi HWID cho Admin qua kênh hỗ trợ; Admin tạo license, thời hạn và gói.
3. Khách nhập key; Desktop gửi `license_key`, `hwid`, phiên bản app đến API.
4. Server kiểm tra key, trạng thái, hạn dùng, HWID và quota; trả access token có
   thời hạn ngắn cùng chính sách license đã ký.
5. Desktop lưu token trong secure storage của hệ điều hành, không lưu key/token
   trong log; heartbeat định kỳ kiểm tra trạng thái khi có mạng.

## Luồng xử lý video

1. Khách tạo project, nhập file/URL và chọn thư mục cache/render.
2. App tạo job phân tích; AI Engine trả scene, script, hook/retention score và
   đề xuất chỉnh sửa.
3. Khách chỉnh sửa trên timeline: video, voice AI, audio gốc/nhạc và subtitle.
4. App kiểm tra dung lượng, codec, quyền license và queue; FFmpeg render nền.
5. Khách nhận trạng thái, lỗi có thể hành động và đường dẫn tệp đầu ra.

## Luồng telemetry và cảnh báo

1. Khi lỗi, app lọc dữ liệu nhạy cảm, tạo event gồm mã lỗi, version, OS,
   hardware summary, HWID đã hash và stack trace đã scrub.
2. Gateway xác thực client, chống spam và lưu event; không nhận file tùy ý.
3. Admin/Dev lọc theo key, version và severity. Lỗi `fatal` hoặc vượt ngưỡng
   nhóm lỗi gửi webhook Telegram/Discord.
4. Dev liên kết incident với issue, sửa lỗi, kiểm thử và phát hành bản OTA.

## Luồng phát hành OTA

1. Dev merge PR đã kiểm thử vào nhánh phát hành; CI build, ký code và tạo asset.
2. Release Manager tạo manifest gồm version, platform, URL, SHA-512, chữ ký,
   release notes, rollout và chế độ bắt buộc/tùy chọn.
3. Desktop gọi endpoint kiểm tra update, xác minh chữ ký/checksum trước tải.
4. App thông báo người dùng, tải bản cập nhật, restart an toàn và báo kết quả.
