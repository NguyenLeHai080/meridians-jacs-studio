# Giới hạn hiện tại

- Staging/production đã chạy `PostgresStore` với PostgreSQL 16 volume riêng;
  local API chạy trực tiếp vẫn mặc định `InMemoryStore` nếu không đặt biến môi
  trường. PostgreSQL hiện là single-node, chưa có HA/replica tự động.
- Auth đã dùng bearer token ký HMAC với expiry và danh sách revoke lưu qua store;
  production gate còn lại là identity store đa người dùng, refresh rotation, RBAC
  chi tiết, rate-limit login và MFA.
- Provider connection test đã gọi request kiểm tra tối thiểu tới OpenAI, Gemini,
  Anthropic và OpenAI-compatible; custom provider vẫn cần adapter được phê duyệt.
  Usage/cost phía provider vẫn phụ thuộc vendor; Desktop đã ghi nhận token/credit
  theo kết quả adapter và đồng bộ metrics theo license.
- Admin Portal hiện có login/dashboard và các thao tác license/provider/telemetry
  cốt lõi; release management, job progress realtime và RBAC chi tiết vẫn cần
  hoàn thiện theo backlog.
- Desktop đã có Electron shell, UI module, IPC preload allowlist, Device ID dẫn
  xuất từ định danh nền tảng (macOS `IOPlatformUUID`, Windows `MachineGuid`,
  Linux `machine-id`), secure storage cho license, heartbeat định kỳ, đồng bộ
  client job có quota/idempotency và local queue trong renderer. Device ID được
  băm một chiều với salt riêng của app; khi không đọc được định danh nền tảng,
  app dùng installation ID ngẫu nhiên ổn định giữa các lần mở. Đây là nhận diện
  thiết bị thực tế, không phải hardware attestation chống giả mạo tuyệt đối.
  Pipeline build tạo DMG/ZIP macOS cùng NSIS Windows. Artifact macOS ARM64 và
  Windows x64 hiện unsigned.
  Desktop hỗ trợ cấu hình provider BYOK và test kết nối trực tiếp trong Electron
  main process. Luồng file/URL, probe, trích frame gửi vision, phân tích JSON,
  render FFmpeg và tiến trình đã được nối trong app; nếu máy không có FFmpeg,
  app dùng passthrough có cảnh báo ngầm trong metadata thay vì giả lập tiến trình.
  Installer hiện đã kèm FFmpeg/FFprobe theo từng nền tảng; artifact `0.3.4`
  chạy được pipeline probe/trích frame/render thật. Artifact vẫn unsigned và
  cần code signing/notarization trước khi phát hành đại trà. Settings kiểm tra
  manifest release qua `/api/v1/releases/check`; nút cập nhật tải asset qua
  HTTPS, giới hạn redirect, xác minh SHA-512 và chỉ sau đó mới chạy NSIS silent
  trên Windows hoặc thay app ZIP trên macOS. DMG được mở sau khi xác minh để
  người dùng hoàn tất thao tác kéo app vào Applications. Chữ ký manifest hiện
  được kiểm soát ở Release Manager/backend; desktop có thể bổ sung public-key
  verification khi môi trường phân phối chốt khóa Ed25519.
- Docker Compose cung cấp dependency local; chưa phải topology HA production.
- Các SLO, retention, quota, pricing và chính sách dữ liệu còn cần Product/Tech
  Lead chốt bằng issue trước UAT chính thức.
