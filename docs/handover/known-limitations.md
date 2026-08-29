# Giới hạn hiện tại

- API mặc định dùng `InMemoryStore`; chỉ dùng demo/test. SQLite adapter phù hợp
  local hoặc single-node, chưa thay thế PostgreSQL HA.
- Auth hỗ trợ password hash PBKDF2-SHA256 nhưng token vẫn in-memory; production gate
  yêu cầu identity store, JWT/session chuẩn, refresh rotation, RBAC và MFA.
- Provider connection test đang trả `mock_reachable`; adapter OpenAI/Gemini/
  Anthropic thật, usage/cost và circuit breaker chưa hoàn tất.
- Frontend mới có login/dashboard cơ bản; form quản lý provider, telemetry,
  release, job progress và license actions cần hoàn thiện.
- Desktop hiện là React renderer prototype; Electron/Tauri, secure storage,
  HWID, IPC allowlist, FFmpeg, GPU probe, native packaging và signed OTA chưa có.
- Docker Compose cung cấp dependency local; chưa phải topology HA production.
- Các SLO, retention, quota, pricing và chính sách dữ liệu còn cần Product/Tech
  Lead chốt bằng issue trước UAT chính thức.
