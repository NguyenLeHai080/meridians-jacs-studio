# API

Nguyên tắc thiết kế API, cấu trúc module và các endpoint nền tảng xem tại
[API_ARCHITECTURE.md](../API_ARCHITECTURE.md). Swagger/OpenAPI được sinh tại
`/docs` khi API chạy. Schema Pydantic trong
`BE/api-server/app/modules/*/schemas.py` là nguồn contract hiện tại; khi public
client ổn định cần export `openapi.json` đã version hóa vào `packages/contracts`.

Xuất snapshot contract bằng:

```bash
make export-openapi
```

Không chỉnh tay snapshot; thay đổi schema phải đi kèm test contract và issue ID.

Vertical slice hiện có auth/logout, license validate/heartbeat/renew/status/reset
HWID, desktop client jobs có kiểm tra license/HWID/quota và idempotency, projects,
jobs/cancel, provider CRUD/capability/test, telemetry ingest/inspector, release
publish/check và health.

Hợp đồng profile BYOK, capability và remote render tại
[third-party-provider-contract.md](third-party-provider-contract.md).
