# Mô hình triển khai

## Topology production

```text
Internet
   |
[DNS/CDN/WAF]
   |
[Load Balancer]
   |
+------------------- Private Network -------------------+
| [Python API x N] [Worker CPU x N] [Worker GPU x N]    |
|        |                 |                 |            |
|   [Redis HA]       [Queue]          [Object Storage]   |
|        |                 |                 |            |
|              [PostgreSQL HA + Backup]                 |
+-------------------------------------------------------+
                 |
        [Telegram/Discord Webhook]
```

Desktop client chỉ kết nối tới HTTPS API, WSS progress và CDN/signed URL. Không
mở database, Redis hoặc worker ra Internet. Admin Portal có thể deploy trên CDN
hoặc cùng domain với API nhưng phải dùng authentication và RBAC riêng.

## Môi trường

| Môi trường | Mục đích | Dữ liệu |
| --- | --- | --- |
| `dev` | Phát triển tính năng và mock provider | Dữ liệu giả, secret riêng |
| `staging` | QA/UAT, demo và kiểm thử release | Dữ liệu test đã scrub |
| `prod` | Khách hàng thật và release chính thức | Backup, retention và audit bắt buộc |

Mỗi môi trường có database, Redis, bucket, webhook và secret namespace riêng.
Không copy dữ liệu production xuống staging nếu chưa scrub PII và asset.

## Availability và failure isolation

- API stateless, tối thiểu hai replica ở production; session nằm ở token/Redis.
- Staging/production dùng PostgreSQL adapter với volume tách biệt; topology hiện
  là single-node và cần nâng cấp HA/connection pooler trước khi chạy nhiều
  replica API.
- Worker tách queue `analysis`, `tts`, `render`, `telemetry`; một queue lỗi không
  làm nghẽn request API hoặc license validation.
- Provider timeout/circuit breaker áp dụng theo từng provider; không retry mù các
  request có tính phí.
- PostgreSQL backup hằng ngày, point-in-time recovery (mục tiêu RPO/RTO: `TBD`).
- Release có canary/percentage rollout, checksum, chữ ký và rollback manifest.

## Bảo mật mạng

WAF/rate-limit ở edge, TLS end-to-end, private subnet cho database/worker, allowlist
egress provider và chặn SSRF. Signed URL có TTL ngắn; bucket asset không public.
