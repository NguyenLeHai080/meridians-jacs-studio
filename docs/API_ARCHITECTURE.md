# Kiến trúc API Python

Backend API dùng Python (đề xuất FastAPI) và tổ chức theo `core` + `modules`.
Thiết kế này tách hạ tầng dùng chung khỏi nghiệp vụ, giữ domain độc lập với
framework và cho phép thêm provider AI hoặc loại job mới mà không phá API cũ.

## Cấu trúc tổng thể

```text
BE/api-server/
├── app/
│   ├── core/
│   │   ├── config/             # Environment, feature flags
│   │   ├── security/           # Auth, RBAC, hashing, secret vault
│   │   ├── database/           # Session, unit of work
│   │   ├── http/               # Middleware, request ID, error handler
│   │   ├── observability/      # Log, metric, trace
│   │   ├── jobs/               # Queue, retry, idempotency
│   │   ├── storage/            # Object storage, signed URL
│   │   └── providers/          # Adapter contract và registry
│   ├── modules/
│   │   ├── auth/
│   │   ├── licensing/
│   │   ├── users/
│   │   ├── ai_providers/
│   │   ├── projects/
│   │   ├── analysis/
│   │   ├── rendering/
│   │   ├── telemetry/
│   │   ├── releases/
│   │   ├── notifications/
│   │   └── health/
│   └── main.py
├── migrations/
├── tests/{unit,integration,contract}/
└── pyproject.toml
```

Chi tiết cấu trúc module và quy tắc phụ thuộc xem
[python-architecture.md](backend/python-architecture.md) và
[core-and-modules.md](architecture/core-and-modules.md).

## Quy ước một module

Mỗi module có thể gồm `domain/`, `application/`, `infrastructure/` và
`presentation/`. Domain không import FastAPI/SQLAlchemy; presentation không gọi
database trực tiếp. Module khác chỉ dùng public facade, command/query hoặc event.

## API nền tảng

- Auth: `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`,
  `POST /api/v1/auth/logout`.
- License: tạo/validate/gia hạn/revoke và reset HWID; Admin thao tác phải có audit.
- Provider: `POST /api/v1/ai-providers`, test connection, capabilities và rotate key.
- Jobs: tạo analysis/TTS/render trả `202` với `job_id`; status qua polling/WSS.
- Telemetry: `POST /api/v1/telemetry/logs`, lọc theo fingerprint/severity/version.
- Release: tạo manifest, signed asset, rollout và kiểm tra update.
- Health: `/health/live` không gọi dependency; `/health/ready` kiểm tra dependency bắt buộc.

## Chuẩn request/response

- Version URL: `/api/v1`; JSON UTF-8; mọi request có `X-Request-Id`.
- Thành công: `{ "data": ..., "meta": ... }`; lỗi: `{ "error": { "code", "message", "details", "request_id" } }`.
- Dùng `201` cho tạo đồng bộ, `202` cho job nền, `204` không có body, `401/403/404/422/429` theo ngữ nghĩa HTTP.
- Endpoint tính phí hoặc tạo job phải nhận `Idempotency-Key`.
- Pydantic schema là contract; phát hành OpenAPI cùng mỗi version API.

## Provider và render

AI provider adapter chuẩn hóa `validate_connection`, `get_capabilities`,
`analyze`, `transcribe`, `synthesize_speech`. Render adapter riêng chuẩn hóa
`submit_render`, `get_render_status`, `cancel_render`. API key không xuất hiện
trong response/log/telemetry; secret đi qua vault hoặc secure storage.

Task router quyết định local GPU/CPU, cloud AI hoặc remote render theo snapshot
của job, capability, consent và policy chi phí. Không tự fallback sang cloud nếu
khách chưa xác nhận.
