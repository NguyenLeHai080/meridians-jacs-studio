# Kiến trúc Backend Python

## Stack đề xuất

Backend dùng Python 3.12+ (phiên bản Python chính thức: `TBD`), ưu tiên
FastAPI + Pydantic v2, SQLAlchemy 2 + Alembic, PostgreSQL, Redis và Celery hoặc
worker asyncio cho job dài. Framework có thể thay đổi nhưng boundary module và
contract API phải được giữ nguyên.

## Cấu trúc Backend

```text
BE/api-server/
├── app/
│   ├── core/                         # Hạ tầng và policy dùng chung
│   │   ├── config/                   # Settings, environment, feature flags
│   │   ├── security/                 # JWT/session, RBAC, hashing, KMS
│   │   ├── database/                 # Session, transaction, migrations hook
│   │   ├── http/                     # Middleware, request ID, exception handler
│   │   ├── observability/            # Structured log, metrics, tracing
│   │   ├── jobs/                     # Queue, idempotency, retry, cancellation
│   │   ├── storage/                  # Object storage và signed URL
│   │   └── providers/                # Registry/adapter contract dùng chung
│   ├── modules/                      # Mỗi thư mục là một bounded context
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
│   └── main.py                       # Tạo app, middleware, router
├── migrations/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── contract/
├── pyproject.toml
└── .env.example
```

## Cấu trúc bên trong một module

```text
modules/licensing/
├── domain/
│   ├── entities.py                   # License, LicensePackage
│   ├── value_objects.py              # LicenseKey, Hwid, Expiration
│   ├── policies.py                   # Quy tắc activate/revoke/reset
│   └── repositories.py               # Interface, không phụ thuộc ORM
├── application/
│   ├── commands.py                   # Generate, Renew, Revoke, ResetHwid
│   ├── queries.py                    # List, Detail, Validate
│   ├── dto.py
│   └── handlers.py                   # Điều phối use case/transaction
├── infrastructure/
│   ├── models.py                     # SQLAlchemy models
│   ├── repositories.py               # Repository implementation
│   └── crypto.py                     # Ký/verify license material
└── presentation/
    ├── router.py                     # FastAPI routes
    ├── schemas.py                    # Pydantic request/response
    └── dependencies.py               # Auth, permission, pagination
```

Các module khác dùng cùng mẫu nhưng chỉ tạo những thư mục cần thiết. `domain`
không import FastAPI/SQLAlchemy; `presentation` không truy cập database trực tiếp.

## Danh sách module và trách nhiệm

| Module | Trách nhiệm chính |
| --- | --- |
| `auth` | Đăng nhập Admin, session/token, password reset, MFA (TBD) |
| `licensing` | Generate, bind HWID, validate, renew, revoke và audit |
| `users` | Người dùng, role, permission, trạng thái tài khoản |
| `ai_providers` | BYOK key vault, endpoint, model, capability, connection test |
| `projects` | Metadata project, asset reference và quyền sở hữu |
| `analysis` | AI analysis, transcription, TTS request và usage |
| `rendering` | Local/remote render orchestration, job status, artifact |
| `telemetry` | Crash/error ingest, fingerprint, retention và query Admin |
| `releases` | Build, manifest, signing metadata, rollout và OTA |
| `notifications` | Telegram/Discord webhook, retry và dedup alert |
| `health` | Liveness/readiness và dependency checks |

## Quy tắc phụ thuộc

```text
presentation -> application -> domain
                    |           ^
                    +-> infrastructure (qua interface)
core cung cấp hạ tầng; module không import ngược presentation của module khác.
```

Module chỉ gọi module khác qua application facade hoặc domain event. Ví dụ
`rendering` đọc capability từ `ai_providers` qua `ProviderCapabilityReader`,
không truy cập bảng provider trực tiếp.

## Worker và tác vụ nặng

API request chỉ tạo job và trả `202 Accepted` cùng `job_id` cho phân tích,
transcription, TTS, remote render và batch render. Worker xử lý queue, cập nhật
trạng thái idempotent và phát event; Redis không phải nguồn dữ liệu giao dịch.
FFmpeg local không chạy trong Python API process của cloud; remote worker phải
được cô lập resource và có giới hạn upload/chi phí.
