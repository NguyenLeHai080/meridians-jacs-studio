# Mô hình C4 hệ thống

## Cấp 1: System Context

```text
[Khách hàng] --------------------> [JACS Studio]
    |                                   |  \
    |                                   |   +--> [OpenAI/Gemini/Provider khác]
    |                                   |   +--> [Telegram/Discord]
[Admin/Support/Developer] -----------> |   +--> [Object Storage/CDN]
```

JACS Studio tiếp nhận project và cấu hình từ khách hàng, cung cấp công cụ phân
tích/biên tập/render; Admin vận hành license, telemetry và release. Provider AI,
notification và storage là hệ thống bên ngoài, được gọi qua adapter và policy.

## Cấp 2: Container

| Container | Công nghệ đề xuất | Trách nhiệm |
| --- | --- | --- |
| Desktop App | `FE/desktop-app`: ReactJS + TypeScript + Electron/Tauri | UI, project, timeline, local engine, activation, OTA |
| Admin Portal | `FE/admin-portal`: ReactJS + TypeScript | Dashboard, license, provider, telemetry, release |
| Python API | `BE/api-server`: FastAPI/Pydantic | Auth, nghiệp vụ module, API contract, orchestration |
| Job Workers | Python worker + queue | Analysis, TTS, remote render, telemetry processing |
| PostgreSQL | PostgreSQL | Dữ liệu giao dịch và audit |
| Redis | Redis | Queue, cache, rate-limit, lock/idempotency |
| Object Storage/CDN | S3-compatible + CDN | Build, input/output asset, signed URL |
| Provider Gateway | Python adapters | Chuẩn hóa OpenAI/Gemini/custom và bảo vệ endpoint |
| Notification Gateway | Python module | Telegram/Discord webhook, retry, dedup |

## Cấp 3: Module Backend

```text
core/
├── security       ├── database       ├── http
├── jobs           ├── storage         ├── providers
└── observability

modules/
├── auth           ├── licensing       ├── users
├── ai_providers   ├── projects        ├── analysis
├── rendering      ├── telemetry       ├── releases
├── notifications  └── health
```

Chi tiết ownership và dependency xem [core-and-modules.md](core-and-modules.md)
và [python-architecture.md](../backend/python-architecture.md).

## Luồng runtime chính

### Activation

`Desktop -> Python API/Auth -> Licensing -> PostgreSQL -> signed token -> Desktop secure storage`.

### AI task

`React UI -> Python API -> Task Router -> Provider Adapter -> AI Provider -> Job Worker -> Desktop/API`.

### Local render

`React Timeline -> IPC -> Local Engine -> FFmpeg -> CPU/GPU -> Output Artifact`.

### Remote render

`React UI -> Python API -> Queue -> Remote Worker -> Object Storage/CDN -> Desktop download`.

### OTA

`Admin Portal -> Release Module -> Signed Manifest/CDN -> Desktop verify -> Install/Rollback`.
