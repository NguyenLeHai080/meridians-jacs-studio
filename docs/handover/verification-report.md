# Báo cáo kiểm tra hiện tại

Ngày kiểm tra: 2026-08-30.

## Đã chạy thành công

- `23` bài test API (auth, logout, token tamper, license, provider, jobs, projects,
  telemetry, release, persistence adapter và request ID).
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
- Docker build và triển khai thành công trên server `221.121.1.3` với hai stack
  độc lập: staging `localhost:85`, production `localhost:84`.
- Sau lần promote mới nhất, cả hai hostname public đều trả `200` cho `/health/live`
  và `/health/ready`; readiness xác nhận backend đang dùng PostgreSQL.
- Signed-token và revoke smoke test đã chạy trực tiếp trong container API của cả
  staging và production; database healthcheck trả thành công.
- Workflow deploy đã dùng tar stream qua SSH, không phụ thuộc `rsync` trên server.
- Docker image API đã cài `psycopg[binary]`; PostgreSQL CRUD và khởi tạo bảng
  `jacs_records` đã được kiểm tra trong Compose local.
- Build Electron macOS ARM64 thành công: DMG và ZIP trong
  `Tool/desktop-app/release/` (unsigned).
- Smoke test qua Cloudflare thành công:
  `https://test-jacs-studio.nexoratech.com.vn` và
  `https://jacs-studio.nexoratech.com.vn` trả HTTP 200; `/health/live` và đăng
  nhập admin hoạt động trên cả hai hostname.

## Chưa chạy được trên máy hiện tại

- GitHub Actions chưa được kích hoạt trên remote vì máy hiện tại chưa có quyền
  xác thực GitHub và repository chưa đặt các Actions secrets. Các branch local đã
  được promote đến `prod`; cần push sau khi cấu hình credential.
- Code signing, FFmpeg/GPU probe và provider vendor thật: chưa có
  credential/toolchain tương ứng trong workspace; Windows x64 NSIS đã được
  cross-build thành công bằng electron-builder/Wine để QA.

Các mục chưa chạy được là production gate, không được đánh dấu pass trong biên
bản UAT chỉ dựa trên báo cáo này.
