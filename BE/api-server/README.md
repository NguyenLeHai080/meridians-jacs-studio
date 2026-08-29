# JACS Python API

## Chạy local

```bash
cd BE/api-server
python -m venv .venv
source .venv/bin/activate
pip install -e '.[dev]'
uvicorn app.main:app --reload --port 8000
```

Swagger: `http://localhost:8000/docs`.

Xuất contract JSON cho FE/Tool bằng `PYTHONPATH=. python scripts/export_openapi.py`.

Mặc định API dùng `InMemoryStore`; đặt `JACS_STORE_BACKEND=sqlite` để chạy demo
có persistence. Production cần PostgreSQL repository, Redis queue, secret vault,
JWT/RBAC/MFA và provider adapter thật theo
[python-architecture.md](../../docs/backend/python-architecture.md).

Tạo password hash cho staging/production:

```bash
PYTHONPATH=. python scripts/hash_password.py
```
