# JACS Python API

API Server cho JACS Studio xây dựng trên nền tảng **FastAPI**, **Pydantic v2**, và **PostgreSQL** chuẩn enterprise.

## Khởi chạy Database & Ứng dụng

### 1. Khởi động PostgreSQL qua Docker (hoặc dịch vụ PostgreSQL local)

```bash
docker compose up -d postgres
```

### 2. Cài đặt môi trường Python & Dependencies

```bash
cd BE/api-server
python -m venv .venv
# Trên Windows:
.venv\Scripts\activate
# Trên Linux/macOS:
source .venv/bin/activate

pip install -e ".[dev]"
```

### 3. Khởi tạo Schema PostgreSQL & Indexing (GIN, B-Tree, Triggers)

```bash
python scripts/init_postgres.py
```

Kiểm tra toàn diện cơ sở dữ liệu:

```bash
python scripts/verify_postgres.py
```

### 4. Chạy API Server

```bash
uvicorn app.main:app --reload --port 8000
```

- Swagger UI: `http://localhost:8000/docs`
- Healthcheck Readiness: `http://localhost:8000/health/ready`

## Cấu hình Cơ sở dữ liệu PostgreSQL (`.env`)

Mặc định hệ thống sử dụng **PostgreSQL** với Connection Pooling (`psycopg_pool`):

```env
JACS_STORE_BACKEND=postgres
JACS_DATABASE_URL=postgresql://jacs:jacs-dev-password@localhost:5432/jacs
JACS_DATABASE_MIN_POOL_SIZE=1
JACS_DATABASE_MAX_POOL_SIZE=20
JACS_DATABASE_POOL_TIMEOUT_SECONDS=10.0
JACS_SECRET_KEY=GIh08_tusmQdQaRKw0x94wDJf7C8HzOsB0HU4EE6Anc=
```

### Tính năng kiến trúc PostgreSQL
- **Connection Pool**: Tự động quản trị kết nối, retry, tránh rò rỉ (connection leak) và mở/đóng vòng đời qua `FastAPI lifespan`.
- **JSONB + GIN Index**: Lưu trữ linh hoạt định dạng JSONB, tối ưu hóa tốc độ tìm kiếm subfield với PostgreSQL GIN Index (`idx_jacs_records_data_gin`).
- **Mã hóa Secrets**: Khóa API của AI Providers (BYOK) được mã hóa Fernet đối xứng trước khi lưu vào persistent PostgreSQL (`PersistentSecretStore`).
- **Audit & Timestamps**: Tự động ghi nhận `created_at` và `updated_at` qua database triggers.

## Các công cụ quản trị

- Xuất contract OpenAPI cho Frontend/Desktop: `python scripts/export_openapi.py`
- Tạo hash mật khẩu admin: `python scripts/hash_password.py`
- Chạy unit/integration test suite: `python -m pytest`
