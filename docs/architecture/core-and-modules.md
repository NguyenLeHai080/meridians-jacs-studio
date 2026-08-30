# Chuẩn Core và Module

## Mục đích

`core` là nền móng kỹ thuật ổn định; `module` là phạm vi nghiệp vụ có thể phát
triển, kiểm thử và thay đổi độc lập. Không đưa nghiệp vụ cụ thể vào `core` chỉ
vì có nhiều nơi sử dụng.

## Core dùng chung

### Frontend core

HTTP client, session, permission evaluator, config, error mapping, query cache,
feature flag, event bus và telemetry redaction.

### Backend core

Config, database unit-of-work, security, request ID, logging, metrics, queue,
idempotency, object storage, provider adapter contract và exception mapping.

### Contract core

OpenAPI/JSON Schema là nguồn hợp đồng giữa React và Python. Có thể generate
TypeScript client/type từ schema; không chia sẻ business logic bằng cách copy
code giữa hai ngôn ngữ.

## Boundary bắt buộc

- Mỗi module có public commands/queries/events và không lộ model persistence.
- Database schema có ownership theo module; migration của module nào do module
  đó quản lý.
- Module không đọc secret của module khác. Provider key chỉ được truy cập qua
  `SecretStore`/vault interface.
- Event phải có version, event ID và correlation ID; consumer phải idempotent.
- Không để `core` phụ thuộc `modules`; dependency chỉ đi từ module tới core.

## Naming và versioning

- Frontend dùng `modules/<kebab-case>`; Python dùng `modules/<snake_case>`.
- API URL version theo `/api/v1`; DTO breaking change tạo version mới.
- Tên capability chuẩn: `analysis`, `vision`, `transcription`, `tts`,
  `image_generation`, `video_render`.
- Mọi thay đổi public module phải kèm test contract và issue ID.

## Desktop module hiện tại

`Tool/desktop-app/src` đang dùng các module React sau:

```text
core/       types, runtime bridge, API và state policy dùng chung
modules/
├── overview/       dashboard workspace
├── jobs/           chọn footage và tạo batch queue
├── analysis/       phân tích context và scene
├── render/         output, encoder và render status
├── activation/     Device ID, license validate và lock feature
└── settings/       preferences, workspace/cache và provider registry
shared/             icon, status pill và UI primitive thuần
```

`electron/preload.cjs` là adapter native, không phải module nghiệp vụ. Các
module không gọi Electron IPC trực tiếp; chúng dùng `core/runtime` để có thể
thay shell Electron bằng Tauri hoặc native host khác nếu quyết định kỹ thuật
thay đổi.

## Checklist thêm module

1. Xác định bounded context, owner và dữ liệu module sở hữu.
2. Viết use case, business rule, API schema và error code.
3. Tạo cấu trúc module ở React/Python theo template.
4. Đăng ký route, permission, event và migration.
5. Thêm unit, integration, contract và E2E test cần thiết.
6. Cập nhật tài liệu, OpenAPI, monitoring dashboard và PR có issue ID.
