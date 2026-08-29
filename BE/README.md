# Backend

`BE/api-server` là Python API theo cấu trúc `core` + `modules`.

```bash
cd api-server
python -m venv .venv
source .venv/bin/activate
pip install -e '.[dev]'
uvicorn app.main:app --reload --port 8000
```

Mặc định dùng store trong memory; SQLite là adapter persistence cho demo hoặc
single-node. PostgreSQL, Redis worker và secret vault là production gate.
