# Thiết kế Provider AI và Render Engine

## Kiến trúc đề xuất

```text
Settings UI -> Provider Registry -> Capability Check -> Task Router
     |                 |                    |                |
 Secure Storage     Adapter             Policy/Cost       +-- Local Engine -> FFmpeg -> GPU/CPU
 (key + URL)        OpenAI/Gemini/...   + consent          +-- Cloud Gateway -> Provider/Render Worker
```

`Provider Registry` chỉ lưu metadata không nhạy cảm. Secret được lưu trong OS
secure storage trên Desktop (Keychain, Credential Manager, Secret Service). Nếu
khách cần dùng chung key giữa nhiều máy, backend lưu secret qua KMS/vault và
Desktop gọi qua gateway đã xác thực; không trả secret về client.

## Adapter contract

Mỗi adapter chuẩn hóa provider về các hàm như `validateConnection`,
`getCapabilities`, `analyze`, `transcribe`, `synthesizeSpeech` và `generate`.
Remote render là adapter riêng `submitRender`, `getRenderStatus`,
`cancelRender`, không được gộp với LLM adapter.

Adapter phải chuyển đổi DTO, timeout, retry, usage và error của vendor thành
error code chung. `openai-compatible` chỉ hỗ trợ contract đã xác định; endpoint
tự định nghĩa cần adapter mới và review bảo mật, không phải chỉ nhập URL là chạy.

## Router cho một job

1. Đọc profile, capability, consent, quota và execution mode từ job snapshot.
2. Phân tích/TTS chọn adapter AI; encode chọn local FFmpeg hoặc remote render
   adapter độc lập.
3. Kiểm tra local GPU bằng probe khi job bắt đầu; không chỉ dựa vào lựa chọn UI.
4. Gắn idempotency key, request ID, timeout và cancellation token.
5. Lưu usage/cost estimate không chứa payload/key; đưa lỗi đã chuẩn hóa về UI.

## Bảo mật endpoint và key

- Mã hóa secret tại rest; xóa secret khỏi memory càng sớm càng tốt; tuyệt đối
  không truyền key qua IPC log, analytics hoặc URL query string.
- Với gateway server, áp dụng allowlist provider và chặn private IP, loopback,
  metadata IP sau DNS resolution để chống SSRF. HTTPS là bắt buộc trừ môi trường
  development được đánh dấu rõ.
- URL/adapter/provider thay đổi phải có audit log. Chỉ Owner/Admin được sửa
  shared provider profile.

## Local render

FFmpeg chạy ở native/main process với input path đã kiểm tra, command được tạo
từ tham số allowlist, process limit và thư mục tạm riêng cho từng job. Ưu tiên
encoder theo hệ điều hành: VideoToolbox (Apple), NVENC (NVIDIA), AMF (AMD), rồi
software fallback. Các encoder khả dụng do probe runtime quyết định.

## Remote render

Tệp được upload qua URL ký có thời hạn hoặc provider adapter; metadata job và
asset tách riêng. Worker cập nhật tiến độ qua polling/WSS. Hệ thống cần checksum,
retry upload có giới hạn, TTL xóa asset và khả năng hủy/rollback job.
