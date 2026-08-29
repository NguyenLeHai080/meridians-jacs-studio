# Giới hạn hiện tại

- Staging/production đã chạy `PostgresStore` với PostgreSQL 16 volume riêng;
  local API chạy trực tiếp vẫn mặc định `InMemoryStore` nếu không đặt biến môi
  trường. PostgreSQL hiện là single-node, chưa có HA/replica tự động.
- Auth hỗ trợ password hash PBKDF2-SHA256 nhưng token vẫn in-memory; production gate
  yêu cầu identity store, JWT/session chuẩn, refresh rotation, RBAC và MFA.
- Provider connection test đang trả `mock_reachable`; adapter OpenAI/Gemini/
  Anthropic thật, usage/cost và circuit breaker chưa hoàn tất.
- Frontend mới có login/dashboard cơ bản; form quản lý provider, telemetry,
  release, job progress và license actions cần hoàn thiện.
- Desktop đã có Electron shell và pipeline build DMG/ZIP macOS cùng NSIS
  Windows; artifact macOS ARM64 và Windows x64 v0.2.0 đã build local nhưng đều
  unsigned. Secure storage, HWID, IPC allowlist, FFmpeg/GPU probe và OTA ký số
  vẫn là production gate.
- Docker Compose cung cấp dependency local; chưa phải topology HA production.
- Các SLO, retention, quota, pricing và chính sách dữ liệu còn cần Product/Tech
  Lead chốt bằng issue trước UAT chính thức.
