# Frontend

`FE/admin-portal` là ứng dụng ReactJS dành cho Admin, Support và Developer.

```bash
corepack enable
pnpm install
pnpm dev:admin
```

Code được chia thành `src/core`, `src/modules`, `src/shared` và `src/routes`.
Mọi request đi qua `src/core/api.ts` và contract của Python API.
