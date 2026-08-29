# Shared Contracts

OpenAPI/JSON Schema của Python API được đặt tại đây để generate type/client cho
React Admin và Desktop. Khi contract thay đổi, phải tăng version nếu breaking,
cập nhật test contract và ghi issue ID trong PR.

- `src/index.ts`: type aliases ổn định dùng chung giữa FE và Tool.
- `openapi.json`: snapshot được sinh bằng `make export-openapi`.

Không đặt API key, media khách hàng hoặc business logic trong package này.
