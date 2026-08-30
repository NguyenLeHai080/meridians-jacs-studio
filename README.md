# JACS Studio

Judicious AI Content Scanner - nền tảng Desktop ReactJS, Admin Portal ReactJS
và Python API theo kiến trúc `core` + `modules`.

## Quick start

### Python API

```bash
cd BE/api-server
python -m venv .venv
source .venv/bin/activate
pip install -e '.[dev]'
uvicorn app.main:app --reload --port 8000
```

Mở Swagger tại `http://localhost:8000/docs`. Tài khoản local mặc định là
`admin@example.com` / `change-me`. Staging/production bắt buộc đặt
`JACS_ADMIN_PASSWORD_HASH`; tạo hash bằng
`PYTHONPATH=. python scripts/hash_password.py` trong `BE/api-server`.

### React Admin Portal (`FE/`)

```bash
corepack enable
pnpm install
pnpm dev:admin
```

Mở `http://localhost:5173`; đặt `VITE_API_URL` nếu API không chạy ở
`http://localhost:8000`. Biến `VITE_ADMIN_EMAIL` có thể dùng để điền sẵn email
quản trị; mật khẩu luôn phải nhập thủ công và không được lưu trong frontend.

### Desktop Tool React/Electron (`Tool/`)

```bash
pnpm dev:electron
```

Desktop có shell điều hướng theo module, activation UI, Device ID dẫn xuất,
secure storage qua Electron, file picker, hàng đợi job bền vững, phân tích frame
qua provider BYOK và render FFmpeg có tiến trình. `pnpm dev:desktop` chỉ dùng để
xem renderer trong trình duyệt; muốn chọn file, lấy mã máy thật, nhập provider
và render video phải chạy `pnpm dev:electron` hoặc installer native.

### Hạ tầng local

```bash
docker compose up -d postgres redis
```

API chạy trong Compose với PostgreSQL và Redis; dữ liệu được giữ trong volume
`postgres_data`. Khi chạy Uvicorn trực tiếp, API mặc định dùng `InMemoryStore`
cho dev nhanh; đặt `JACS_STORE_BACKEND=postgres` và
`JACS_DATABASE_URL=postgresql://...` để dùng PostgreSQL local.

## Tài liệu

Xem [docs/README.md](docs/README.md) để đọc phân tích nghiệp vụ, kiến trúc,
capacity, API bên thứ ba, Gitflow và kế hoạch Sprint.

Checklist triển khai/UAT/bảo mật và giới hạn hiện tại nằm tại
[docs/handover/README.md](docs/handover/README.md).

## Test nhanh

### 1. Test API tự động

Backend yêu cầu Python `3.11+` khi cài package (khuyến nghị Python `3.12`).

```bash
cd BE/api-server
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install -e '.[dev]'
pytest -q
ruff check app tests
```

Kết quả mong đợi hiện tại: `31 passed`.

### 1b. Test native Desktop

```bash
pnpm test:desktop
```

Lệnh này chạy các kiểm thử Device ID, secure provider storage và media
pipeline (FFmpeg probe, trích frame, render clip). Cần cài Node.js và chạy
`pnpm install` trước.

### 2. Chạy API và Swagger

Mở terminal mới, vẫn ở `BE/api-server`:

```bash
source .venv/bin/activate
export JACS_ADMIN_EMAIL=admin@example.com
export JACS_ADMIN_PASSWORD=change-me
uvicorn app.main:app --reload --port 8000
```

Mở `http://localhost:8000/docs`, gọi `POST /api/v1/auth/login`, copy
`access_token`, bấm **Authorize** và nhập `Bearer <access_token>`. Sau đó có thể
thử các luồng tạo license, provider, project, job, telemetry và release ngay
trong Swagger.

### 3. Chạy giao diện React

Cài Node.js `22+`, sau đó chạy từ thư mục gốc:

```bash
corepack enable
pnpm install
pnpm dev:admin       # http://localhost:5173
```

Đăng nhập local bằng `admin@example.com` / `change-me` (hoặc giá trị bạn đặt qua
`JACS_ADMIN_EMAIL`/`JACS_ADMIN_PASSWORD`). Staging và production lấy email từ
`JACS_ADMIN_EMAIL` khi build, không đóng gói mật khẩu demo. Để chạy Desktop renderer,
mở terminal khác và dùng `pnpm dev:desktop`; để kiểm tra native shell + IPC,
dùng `pnpm dev:electron`.

### 4. Kiểm tra hạ tầng local

```bash
docker compose up -d postgres redis
docker compose config --quiet
```

Compose local đã cấu hình PostgreSQL persistence. Nếu chạy API ngoài Compose,
đặt `JACS_STORE_BACKEND=postgres` cùng `JACS_DATABASE_URL` trước khi khởi động.
