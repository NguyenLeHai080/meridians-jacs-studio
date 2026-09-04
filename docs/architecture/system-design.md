# Thiết kế hệ thống

## Tổng quan kiến trúc

```text
Desktop App (Windows/macOS) -- HTTPS/WSS --> Cloud Services <-- HTTPS --> Admin Portal
       |                                      |                         |
       +-- Local AI/FFmpeg/SQLite              +-- PostgreSQL, Redis     +-- Admin/Support
                                              +-- Object storage/CDN
                                              +-- Telegram/Discord webhook
```

## Thành phần và trách nhiệm

- **Desktop Shell:** Electron + React + TypeScript là lựa chọn mặc định; Tauri
  chỉ dùng khi team chấp nhận thay đổi hệ sinh thái native. Main process xử lý
  file I/O, secure storage, HWID và chạy FFmpeg; renderer không có quyền trực tiếp.
- **Media Engine:** FFmpeg, hardware acceleration và hàng đợi cục bộ. Engine
  phải giới hạn tài nguyên, hủy được job, báo tiến độ và cô lập lỗi process.
- **Cloud Services:** Python (đề xuất FastAPI) theo cấu trúc `core` + `modules`;
  module License/Auth, Telemetry, Release, AI Provider, Rendering và
  Notification. PostgreSQL lưu dữ liệu giao dịch; Redis phục vụ rate-limit,
  cache và queue; object storage/CDN phân phối asset OTA.
- **Admin Portal:** ReactJS + TypeScript, TailwindCSS và ShadcnUI. Phân quyền
  RBAC, audit log và không hiển thị dữ liệu bí mật ngoài mức cần thiết.
- **Provider & Render Router:** quản lý profile BYOK, adapter OpenAI/Gemini/các
  provider tương thích, capability và routing local GPU/cloud/hybrid. Chi tiết
  tại [provider-and-rendering-design.md](provider-and-rendering-design.md).

## Monorepo đề xuất

```text
FE/desktop-app          Desktop shell và renderer
FE/admin-portal         ReactJS web quản trị
BE/api-server           Python API và workers
packages/core           Contract, kiểu dữ liệu và tiện ích không phụ thuộc UI
packages/ui-kit         Design system
packages/timeline-engine Timeline đa lớp
packages/video-player   Dual-view preview
packages/configs        ESLint, TypeScript, Tailwind dùng chung
```

`core` không được chứa nghiệp vụ riêng của module, API key, logic native hoặc
truy cập database trực tiếp. DTO chia sẻ phải có version để Desktop cũ vẫn hoạt
động trong thời gian rollout. Chi tiết boundary xem
[core-and-modules.md](core-and-modules.md).
