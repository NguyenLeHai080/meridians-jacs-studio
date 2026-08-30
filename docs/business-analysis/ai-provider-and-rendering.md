# Nghiệp vụ tích hợp AI và lựa chọn render

## Mục tiêu

Khách hàng có thể tự chọn nhà cung cấp AI, tự nhập API key và URL endpoint để
giảm phụ thuộc vào một vendor. Đồng thời, họ chọn nơi thực hiện từng tác vụ:
máy cục bộ (CPU/GPU), cloud AI hoặc kết hợp cả hai. Việc chọn này phải minh bạch
về chi phí, dữ liệu gửi đi và khả năng phần cứng.

## Khái niệm cần phân biệt

- **AI analysis/generation:** gửi text, audio hoặc khung hình tới OpenAI,
  Gemini, Anthropic hay provider khác để phân tích kịch bản, tạo subtitle, TTS,
  phát hiện chủ thể hoặc sinh nội dung.
- **Video render/encode:** ghép timeline, codec và xuất tệp bằng FFmpeg. Tác vụ
  này chạy local GPU/CPU hoặc một dịch vụ render chuyên dụng; API LLM thông
  thường không thay thế FFmpeg.
- **Provider endpoint:** URL API do vendor hoặc khách cung cấp. Endpoint chỉ
  được dùng sau khi xác thực kết nối và kiểm tra chính sách an toàn.

## Cấu hình theo khách hàng

Mỗi cấu hình gồm tên hiển thị, provider type, base URL, API key, model, các
capability được bật và giới hạn chi phí. Provider type ban đầu gồm `openai`,
`gemini`, `anthropic`, `openai-compatible` và `custom` (cần adapter được phê
duyệt). Không cho phép gọi URL tùy ý bằng raw HTTP từ workflow nghiệp vụ.

API key chỉ hiển thị lúc nhập hoặc thay thế, sau đó hiển thị dạng che một phần.
Khách có thể tạo nhiều profile, chọn một profile mặc định và kiểm tra kết nối
trước khi lưu. Key không đi vào log, telemetry, file project, export hoặc ảnh
chụp màn hình hỗ trợ.

## Chế độ thực thi

| Chế độ | Phân tích AI | Render video | Phù hợp |
| --- | --- | --- | --- |
| Local GPU | Model local nếu có | FFmpeg dùng GPU/CPU local | Máy mạnh, dữ liệu nhạy cảm, giảm phí cloud |
| Cloud AI + Local Render | API khách chọn | FFmpeg GPU/CPU local | Mặc định đề xuất: giảm tải AI nhưng không upload video render |
| Cloud/Remote Render | API AI và render service | Worker cloud/render API | Máy yếu, chấp nhận upload và chi phí cloud |
| Hybrid | Chọn theo từng bước | Local hoặc remote theo job | Khách cần tối ưu giữa tốc độ, chi phí và riêng tư |

Hệ thống không tự động chuyển local sang cloud nếu chưa có xác nhận, vì có thể
phát sinh phí và truyền dữ liệu video. Khi GPU không khả dụng, app đề xuất CPU,
remote render hoặc hủy job; lựa chọn mặc định do khách thiết lập.

Desktop hiện thực thi `cloud`/`hybrid` theo nghĩa **AI cloud + render local**:
Electron trích frame (và transcript nếu provider hỗ trợ), gửi qua profile BYOK,
sau đó FFmpeg cắt/crop/encode trên máy khách. Remote video render là capability
riêng, chưa được giả định chỉ vì provider có chat/vision.

## Luồng người dùng

1. Khách mở **AI Providers**, thêm provider, nhập URL/key/model và chạy Test
   Connection.
2. App hiển thị capability thực tế (chat, vision, TTS, transcription, image,
   video/render) thay vì giả định mọi model đều hỗ trợ mọi chức năng.
3. Khi tạo project/job, khách chọn profile AI và `execution mode`; app hiển thị
   dữ liệu sẽ gửi, ước lượng thời gian và chi phí nếu provider trả được usage.
4. Job lưu snapshot cấu hình không chứa secret: provider ID, model, mode và
   version adapter. Thay key sau đó không làm lộ key cũ.
5. Nếu gọi thất bại, app trả mã lỗi có thể hành động: key sai, quota, endpoint
   không hỗ trợ, timeout, GPU thiếu driver hoặc hết VRAM.

## Quy tắc nghiệp vụ bổ sung

- `AIP-01`: Khách chịu chi phí và quyền sử dụng API key BYOK của mình.
- `AIP-02`: Cần consent rõ ràng trước lần đầu gửi media/prompt tới provider.
- `AIP-03`: Một task chỉ được chạy khi capability của profile phù hợp.
- `AIP-04`: Không tự retry các request tính phí nếu chưa có idempotency key hoặc
  xác nhận rằng provider chưa xử lý request.
- `REN-03`: Từng job phải ghi rõ engine (`cpu`, `nvidia`, `amd`, `apple`,
  `remote`) và fallback được chọn để Support có thể chẩn đoán.
- `REN-04`: Remote render yêu cầu xác nhận upload, quota/chi phí và chính sách
  giữ/xóa file đầu vào, đầu ra.
