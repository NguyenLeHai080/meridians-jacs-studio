# Giới hạn hiện tại

- Staging/production đã chạy `PostgresStore` với PostgreSQL 16 volume riêng;
  local API chạy trực tiếp vẫn mặc định `InMemoryStore` nếu không đặt biến môi
  trường. PostgreSQL hiện là single-node, chưa có HA/replica tự động.
- Auth đã dùng bearer token ký HMAC với expiry và danh sách revoke lưu qua store;
  production gate còn lại là identity store đa người dùng, refresh rotation, RBAC
  chi tiết, rate-limit login và MFA.
- Provider connection test đã gọi request kiểm tra tối thiểu tới OpenAI, Gemini,
  Anthropic và OpenAI-compatible; custom provider vẫn cần adapter được phê duyệt.
  Usage/cost, circuit breaker và job adapter thực thi thật vẫn là production gate.
- Admin Portal hiện có login/dashboard và các thao tác license/provider/telemetry
  cốt lõi; release management, job progress realtime và RBAC chi tiết vẫn cần
  hoàn thiện theo backlog.
- Desktop đã có Electron shell, UI module, IPC preload allowlist, Device ID dẫn
  xuất, secure storage cho license, heartbeat định kỳ, đồng bộ client job có
  quota/idempotency và local queue trong renderer. Pipeline build tạo DMG/ZIP
  macOS cùng NSIS Windows. Artifact macOS ARM64 và Windows x64 hiện unsigned.
  Device ID hiện là fingerprint dẫn xuất, chưa phải hardware attestation;
  FFmpeg/GPU worker, provider execution thật, queue worker nền và OTA ký số vẫn
  là production gate.
- Docker Compose cung cấp dependency local; chưa phải topology HA production.
- Các SLO, retention, quota, pricing và chính sách dữ liệu còn cần Product/Tech
  Lead chốt bằng issue trước UAT chính thức.
