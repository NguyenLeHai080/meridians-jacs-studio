# Runbook triển khai

## Local/demo

```bash
docker compose up -d postgres redis
cd BE/api-server
python -m venv .venv
source .venv/bin/activate
pip install -e '.[dev]'
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Admin chạy bằng `pnpm dev:admin`; Desktop prototype chạy bằng
`pnpm dev:desktop`. Swagger ở `/docs`, liveness ở `/health/live` và readiness ở
`/health/ready`.

## Staging/production gate

1. Tạo database, Redis, object storage và secret namespace riêng cho môi trường.
2. Đặt `JACS_ENV=production`, password quản trị mạnh, CORS allowlist cụ thể,
   telemetry token và backend persistence (`sqlite` chỉ dành cho single-node;
   production khuyến nghị PostgreSQL repository).
3. Chạy migration trước khi mở traffic; kiểm tra backup restore trên bản sao.
4. Deploy API sau load balancer, worker theo từng queue, database/Redis trong
   private network; chỉ mở HTTPS qua WAF.
5. Smoke test login, license validate, provider test, tạo/cancel job và telemetry.
6. Phát hành Desktop từ manifest đã ký, checksum SHA-512 và rollout nhỏ trước.

## Backup/rollback

- PostgreSQL: backup hằng ngày + point-in-time recovery; kiểm tra restore tối
  thiểu mỗi tháng.
- Object storage: versioning, lifecycle xóa asset tạm và khóa bucket public.
- Rollback ứng dụng bằng image/tag trước đó; rollback release bằng manifest cũ.
- Không rollback database bằng cách xóa dữ liệu; dùng migration đảo ngược đã review.

## Sự cố thường gặp

| Triệu chứng | Kiểm tra |
| --- | --- |
| API không ready | `/health/ready`, database, Redis và biến môi trường |
| Provider timeout/429 | quota vendor, timeout, circuit breaker và request ID |
| GPU render lỗi | driver/encoder probe, chuyển CPU hoặc remote theo consent |
| Telemetry flood | token/rate-limit, fingerprint và ngưỡng cảnh báo |
