# Báo cáo kiểm tra hiện tại

Ngày kiểm tra: 2026-08-30.

## Đã chạy thành công

- Bổ sung kiểm tra cập nhật từ Desktop qua release manifest có kiểm tra platform,
  semver và HTTPS/loopback URL; bổ sung hủy tiến trình native (download, phân tích,
  FFmpeg) và nút chạy lại job lỗi/hủy trong Batch Queue.
- Màn hình phân tích video giữ đúng execution mode (CPU/GPU/Cloud/Hybrid) khi tạo
  scene jobs; không tự gửi video local lên provider nếu người dùng chưa chọn cloud.

- `31` bài test API đã pass bằng Python 3.12, bao gồm auth, licensing/HWID,
  provider, telemetry, release, persistence adapter, readiness và request ID.
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
- Native machine ID test chạy bằng Electron Node: đọc/parsing macOS
  `IOPlatformUUID`, Windows `MachineGuid`, không làm lộ giá trị gốc và giữ ổn
  định installation fallback giữa các lần khởi động.
- Native provider-store test chạy bằng Electron Node: metadata được mã hóa trước
  khi ghi, API key không xuất hiện trong DTO hoặc file lưu trữ, chỉnh sửa provider
  giữ key khi để trống và endpoint không an toàn bị từ chối.
- Desktop media smoke build đã pass với typed IPC cho multi-file picker, URL
  download, persistent jobs, provider analysis, render progress và output path;
  TypeScript/Vite build và Electron syntax check đều pass.
- Native media pipeline smoke test đã pass: tạo video thật bằng FFmpeg, probe
  duration/kích thước, trích frame, render clip 9:16 và xác minh output duration.
- Desktop release `0.3.3` đã được build tuần tự để tránh tranh chấp archive:
  macOS ARM64/Intel DMG/ZIP và Windows x64 NSIS đều kiểm tra archive thành công.
  SHA-256 artifact hiện tại: ARM64 DMG
  `691201aacd922eb32fbd7766db9068c6dee2bdae56848ce074cd329c6cd7ec17`, ARM64
  ZIP `ef540a4119e786838725eae5ae43a4d846289ed431321f9a6403e6983a489123`, Intel
  DMG `9acbb7cd5a309a7e0b81d825b15ba41fe2c6f1d0d90decd0ea84cec00ead2407`, Intel
  ZIP `6c4ef205c85c1ac48f87327ecbf56fcebc147182c24b514cd3506c0627fe6491`, Windows
  EXE `812f8110b5bdf4adcc6a720381b574d80bd21d7ca23ff7ebc7d5210c2bc049c8`.
  Cả macOS và Windows packaged app đều chứa `electron/machine-id.cjs`,
  `main.cjs` và `preload.cjs` trong `app.asar`.
- Smoke test qua Cloudflare: hai hostname public trả HTTP 200 cho frontend và
  `/health/live`; cả staging và production đã chạy mã commit `10a7c47` với
  Desktop version `0.3.3`.

## Chưa chạy được trên máy hiện tại

- GitHub Actions chưa được kích hoạt trên remote vì máy hiện tại chưa có quyền
  xác thực GitHub và repository chưa đặt các Actions secrets. Các branch local đã
  được promote đến `prod`; cần push sau khi cấu hình credential.
- Code signing, FFmpeg/GPU probe và provider vendor thật: chưa có
  credential/toolchain tương ứng trong workspace; Windows x64 NSIS đã được
  cross-build thành công bằng electron-builder/Wine để QA.

Các mục chưa chạy được là production gate, không được đánh dấu pass trong biên
bản UAT chỉ dựa trên báo cáo này.
