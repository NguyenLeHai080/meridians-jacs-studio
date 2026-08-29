# Báo cáo kiểm tra hiện tại

Ngày kiểm tra: 2026-08-29.

## Đã chạy thành công

- `16` bài test API (auth, logout, license, provider, jobs, projects,
  telemetry, release, persistence SQLite và request ID).
- Python bytecode compile cho `BE/api-server/app` và tests.
- Ruff lint `BE/api-server/app` và tests.
- Docker Compose schema validation.
- Export OpenAPI snapshot vào `packages/contracts/openapi.json`.
- Root command `pnpm verify:api` đã được chuẩn hóa cho CI/local sau khi cài Python
  dependencies.
- Build production FE Admin Portal bằng `pnpm build:admin`.
- Build production Desktop Tool bằng `pnpm build:desktop`.
- Smoke test các endpoint đang chạy: `/health/live`, `/health/ready`, đăng nhập
  admin và HTTP response của hai Vite dev server.

## Chưa chạy được trên máy hiện tại

- Docker image build: Docker Desktop đang lỗi I/O storage; Compose syntax vẫn pass.
- Native Windows/macOS packaging, code signing, FFmpeg/GPU probe và provider
  vendor thật: chưa có toolchain/credential trong workspace.

Các mục chưa chạy được là production gate, không được đánh dấu pass trong biên
bản UAT chỉ dựa trên báo cáo này.
