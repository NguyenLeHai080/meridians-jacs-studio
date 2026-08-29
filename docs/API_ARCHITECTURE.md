# Kien truc API

Thu muc `api/` la skeleton cho backend PHP 8.3 theo huong **modular + layered**.
Moi nghiep vu nam trong mot module rieng, giup team phat trien doc lap va giam
phu thuoc cheo.

## Cau truc thu muc

```text
api/
├── config/                 # Cau hinh ung dung, database, cache, auth
├── public/                 # Entry point HTTP (public/index.php)
├── routes/                 # Route theo version: v1.php, v2.php
├── src/
│   ├── Shared/             # Thanh phan dung chung, khong chua nghiep vu
│   │   ├── Domain/         # Entity/value object/error dung chung
│   │   ├── Application/    # Bus, pagination, transaction abstraction
│   │   └── Infrastructure/ # Logger, clock, UUID, adapters
│   └── Modules/
│       ├── Auth/           # Dang ky, dang nhap, refresh/revoke token, reset mat khau
│       ├── Users/          # Ho so, vai tro, phan quyen, quan ly tai khoan
│       └── Health/         # Health/readiness/liveness checks
├── database/
│   ├── migrations/         # Thay doi schema co the rollback
│   └── seeders/            # Du lieu mau/dev
├── storage/                # Log va cache runtime (khong commit du lieu)
└── tests/                  # Unit, Integration, Feature/API
```

## Quy tac phan lop

- `Interfaces/Http`: controller mong, chi parse request va tra response.
- `Application`: use case (command/query), DTO, handler va validation nghiep vu.
- `Domain`: entity, value object, policy, repository interface; khong phu thuoc framework.
- `Infrastructure`: repository implementation, ORM, token provider va external adapter.
- Khong goi database truc tiep tu controller; controller -> handler -> repository.
- Moi module chi public API can thiet; tranh import truc tiep class noi bo module khac.

## Nghiep vu API can co

### Auth

`POST /api/v1/auth/register`, `POST /api/v1/auth/login`,
`POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`,
`POST /api/v1/auth/forgot-password`, `POST /api/v1/auth/reset-password`.

Dung access token ngan han + refresh token co the revoke; hash mat khau bang
Argon2id, rate-limit login va khong ghi token/mat khau vao log.

### Users

`GET /api/v1/me`, `PATCH /api/v1/me`, `GET /api/v1/users` (admin),
`GET /api/v1/users/{id}`, `PATCH /api/v1/users/{id}/status`,
`PUT /api/v1/users/{id}/roles` (admin).

### He thong

`GET /health/live` chi kiem tra process; `GET /health/ready` kiem tra database,
cache va dependency bat buoc. Khong lo thong tin nhay cam trong response.

## Chuan API

- Version trong URL (`/api/v1`), response JSON va UTF-8.
- Thanh cong: `{ "data": ..., "meta": ... }`; loi: `{ "error": { "code", "message", "details", "request_id" } }`.
- Dung HTTP status: `201` tao moi, `204` xoa/cap nhat khong body, `401` thieu auth,
  `403` khong du quyen, `404` khong ton tai, `422` validation, `429` rate limit.
- Phan trang bang `page`, `per_page` (gioi han toi da); loc/sort phai whitelist.
- Moi request co `X-Request-Id`; log structured va an PII.
- Bat CORS theo allowlist, HTTPS, security headers, input validation va audit log
  cho thao tac admin.

## Quy trinh them module

1. Tao `src/Modules/<Name>` voi bon lop `Domain`, `Application`,
   `Infrastructure`, `Interfaces/Http`.
2. Viet migration va test domain truoc, sau do implement handler/repository.
3. Khai bao route, request validation, resource/transformer va authorization policy.
4. Them Unit + Integration + Feature test; cap nhat OpenAPI va changelog.
5. Tao PR co issue ID, review va chay CI truoc khi merge vao `dev`.

## Moi truong va van hanh

Tach `.env` theo moi truong, khong commit secret; dung migration versioned,
backup database, timeout/retry cho external service, queue cho tac vu cham va
graceful shutdown. CI toi thieu can lint, static analysis, unit/integration test,
security scan va build artifact.
