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

## Triển khai JACS trên server hiện tại

JACS được tách riêng khỏi MintForge tại `/opt/jacs-studio`. Không dùng lại
compose project hoặc volume của MintForge.

| Môi trường | Thư mục release | Cổng bind localhost | Hostname |
| --- | --- | ---: | --- |
| Staging | `/opt/jacs-studio/staging/current` | `85` | `test-jacs-studio.nexoratech.com.vn` |
| Production | `/opt/jacs-studio/prod/current` | `84` | `jacs-studio.nexoratech.com.vn` |

Mỗi môi trường cần file `/opt/jacs-studio/<env>/.env` (không nằm trong Git).
Sao chép từ `deploy/env.staging.example` hoặc `deploy/env.prod.example`, tạo
hash bằng script `BE/api-server/scripts/hash_password.py`, rồi đặt
`JACS_ADMIN_PASSWORD_HASH`, CORS đúng hostname và telemetry token ngẫu nhiên.
Script `deploy/deploy.sh` sẽ từ chối chạy nếu thiếu các biến bắt buộc.

Lần triển khai thủ công đầu tiên (sau khi đã copy mã nguồn vào thư mục release):

```bash
bash /opt/jacs-studio/staging/current/deploy/deploy.sh staging /opt/jacs-studio/staging/current
bash /opt/jacs-studio/prod/current/deploy/deploy.sh prod /opt/jacs-studio/prod/current
```

Compose dùng SQLite volume riêng để giữ dữ liệu single-node của MVP; không chạy
replica thứ hai cho đến khi thay adapter bằng PostgreSQL. Web container phục vụ
Admin Portal và proxy `/api` về API cùng hostname.

## Tự động deploy khi merge

Workflow `.github/workflows/deploy.yml` chạy sau push vào `staging` hoặc `prod`
(tức sau khi PR được merge), chạy lại CI rồi rsync release và build Docker trên
server. Cấu hình các GitHub Actions secrets sau:

- `JACS_DEPLOY_HOST=221.121.1.3`
- `JACS_DEPLOY_USER=root` (khuyến nghị user deploy không có quyền root khi harden)
- `JACS_DEPLOY_PORT=22`
- `JACS_DEPLOY_SSH_KEY` (private key, public key đã thêm vào `authorized_keys`)

Trên server phải tạo sẵn `.env` cho cả `staging` và `prod`. Workflow không truyền
secret qua Git và không xóa `.env` hoặc Docker volume khi đồng bộ release.

Trong lần cài đặt này, public deploy key đã được cài vào `root@221.121.1.3`; file
private key tương ứng chỉ nằm trên máy triển khai tại `/tmp/jacs-deploy-key`.
Để bật workflow, thêm toàn bộ nội dung file đó vào GitHub Secret
`JACS_DEPLOY_SSH_KEY`, cùng với `JACS_DEPLOY_HOST`, `JACS_DEPLOY_USER` và
`JACS_DEPLOY_PORT`. Không commit hoặc gửi private key vào repository.

Cloudflare Tunnel hiện đã phục vụ và smoke test thành công hai ingress:

```text
test-jacs-studio.nexoratech.com.vn -> http://127.0.0.1:85
jacs-studio.nexoratech.com.vn      -> http://127.0.0.1:84
```

Kiểm tra từ bên ngoài: `curl https://<hostname>/health/live` phải trả JSON
`{"data":{"status":"live"}}`. Token tunnel hiện có trên server không được
ghi vào repository.

## Sự cố thường gặp

| Triệu chứng | Kiểm tra |
| --- | --- |
| API không ready | `/health/ready`, database, Redis và biến môi trường |
| Provider timeout/429 | quota vendor, timeout, circuit breaker và request ID |
| GPU render lỗi | driver/encoder probe, chuyển CPU hoặc remote theo consent |
| Telemetry flood | token/rate-limit, fingerprint và ngưỡng cảnh báo |
