# Kiến trúc Frontend ReactJS

## Phạm vi

Frontend gồm hai ứng dụng ReactJS dùng chung quy ước và package:

- `admin-portal`: web cho Admin, Support và Developer.
- `desktop-app`: React renderer chạy trong Electron/Tauri; native shell chỉ
  cung cấp bridge tối thiểu cho file system, HWID, secure storage và FFmpeg.

Đề xuất dùng TypeScript, Vite, React Router, TanStack Query, Zustand, TailwindCSS
và một design system nội bộ. Đây là lựa chọn kỹ thuật cần Tech Lead chốt trước
khi khởi tạo package.

## Cấu trúc Frontend

```text
FE/
└── admin-portal/
    └── src/
        ├── core/                 # Nền tảng dùng chung của app
        │   ├── auth/             # Session, route guard, permission
        │   ├── http/             # API client, interceptor, request ID
        │   ├── config/           # Runtime config, environment validation
        │   ├── errors/           # Chuẩn hóa API error và notification
        │   └── telemetry/        # Frontend error boundary, redaction
        ├── modules/
        │   ├── auth/             # Login, logout, reset password
        │   ├── licenses/         # Tạo, gia hạn, khóa, reset HWID
        │   ├── ai-providers/     # API key/URL/model/capability
        │   ├── telemetry/        # Log inspector, filter, incident
        │   └── releases/         # Build, manifest, rollout, release notes
        ├── shared/               # UI primitive, table, form, formatters
        └── routes/               # Ghép route của từng module
Tool/
└── desktop-app/
    └── src/
        ├── core/                 # IPC client, local state, job lifecycle
        ├── modules/
        │   ├── projects/         # Project, media import (kế hoạch)
        │   ├── analysis/         # AI context analysis và suggestions
        │   ├── jobs/             # Batch queue, progress, cancel, result
        │   ├── render/           # Engine/output workspace
        │   ├── activation/       # License + Device ID
        │   ├── settings/         # Preferences và secure provider registry
        │   └── updater/          # OTA check, consent, install status
        ├── shared/               # Component và hook dùng trong app
        └── native/               # Adapter gọi preload/native bridge
```

## Nguyên tắc `core` và `modules`

- `core` chỉ chứa hạ tầng và policy dùng chung; không chứa màn hình nghiệp vụ
  hoặc gọi endpoint của một module cụ thể.
- Mỗi `module` sở hữu page, component nghiệp vụ, query/mutation, schema form,
  mapper và permission của mình.
- `shared` chỉ chứa UI primitive hoặc hàm thuần có thể tái sử dụng; không được
  biến thành nơi gom nghiệp vụ.
- Module giao tiếp qua public facade/type; không import file nội bộ của module khác.
- Tất cả request đi qua API client trong `core/http`, có timeout, request ID,
  refresh session và map error code.
- API key chỉ đi qua secure storage/native bridge hoặc backend vault; không đưa
  vào React state, URL, localStorage, Redux devtools hay error report.

## Luồng một tính năng

`route -> page -> feature component -> hook/query -> core API client -> Python API`.

Với Desktop, tác vụ nặng đi qua `core/job-runtime` và native bridge:
`module -> job command -> IPC -> local engine -> progress event -> query cache`.
Renderer không tự spawn FFmpeg hoặc đọc đường dẫn tùy ý.

## Kiểm thử Frontend

- Unit: pure mapper, validator, permission và reducer/state machine.
- Component: form, table, timeline interaction và error state.
- Integration: MSW/mock API cho các mã lỗi và retry.
- E2E: login, cấp license, cắm provider, tạo job, render, update OTA.
- Desktop smoke: kiểm tra IPC, secure storage, GPU probe trên Windows/macOS.
