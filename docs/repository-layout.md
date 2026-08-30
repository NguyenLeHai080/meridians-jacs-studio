# Cấu trúc repository thực tế

Repository hiện dùng ba thư mục gốc do team cung cấp:

```text
FE/                         Frontend ReactJS
└── admin-portal/            Admin Portal
    └── src/{core,modules,shared,routes}

BE/                         Backend Python
└── api-server/
    ├── app/core/            Hạ tầng dùng chung
    ├── app/modules/         Bounded contexts nghiệp vụ
    ├── migrations/
    └── tests/{unit,integration,contract}

Tool/                       Desktop client/tool
└── desktop-app/             React renderer + native shell
    ├── electron/{main,preload,services}
    └── src/{core,modules,shared}
        └── modules/editor/   Editor workspace: inspector, preview, timeline

packages/                   Contract và core dùng chung giữa các app
docs/                       Nghiệp vụ, kiến trúc, API, Git và scale
```

## Quy ước ownership

- `FE/admin-portal` sở hữu UI quản trị và chỉ gọi `BE/api-server` qua API contract.
- `BE/api-server` sở hữu domain, persistence, worker orchestration và provider gateway.
- `Tool/desktop-app` sở hữu trải nghiệm khách hàng, local queue, native bridge,
  secure storage, HWID và local FFmpeg/GPU.
- `packages/contracts` là nguồn OpenAPI/JSON Schema; `packages/core` chỉ chứa
  enum/type/utility thuần, không chứa UI, secret hoặc database adapter.

## Luồng liên kết

```text
FE/admin-portal  ── HTTPS/JSON ──>  BE/api-server  <── HTTPS/JSON ──  Tool/desktop-app
                                         |
                              PostgreSQL / Redis / Workers
                                         |
                         Provider AI / Object Storage / Webhooks
```

Không di chuyển module nghiệp vụ giữa ba root chỉ để tiện import. Nếu cần dùng
chung, đưa contract hoặc utility thuần vào `packages/` và version hóa.
