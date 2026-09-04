# 📘 JACS STUDIO - HƯỚNG DẪN PHÁT TRIỂN KIẾN TRÚC MODULAR DÀNH CHO DEVELOPER

> **Dành cho các Kỹ sư phần mềm phát triển Frontend Admin Portal, Backend FastAPI và Desktop Electron Tool.**
> Tài liệu này chuẩn hóa toàn bộ cấu trúc dự án, giải thích chi tiết mục đích từng thành phần, luồng chạy của API, cơ chế đa ngôn ngữ tự động (`vn`, `en`, `jp`), và hướng dẫn từng bước (Step-by-step) cách thêm Menu, Trang mới, API mới, hoặc Tính năng Tool mới.

---

## 📑 MỤC LỤC
1. [Tổng Quan Kiến Trúc Hệ Thống (System Overview)](#1-tổng-quan-kiến-trúc-hệ-thống)
2. [Cấu Trúc Chuẩn Của Một Module Frontend (FE Architecture)](#2-cấu-trúc-chuẩn-của-một-module-frontend)
3. [Hệ Thống Đa Ngôn Ngữ Tự Động Nạp (Dynamic i18n Registry)](#3-hệ-thống-đa-ngôn-ngữ-tự-động-nạp-i18n)
4. [Kiến Trúc Backend FastAPI (Clean Architecture BE)](#4-kiến-trúc-backend-fastapi)
5. [Kiến Trúc Desktop Tool Electron (Desktop Architecture)](#5-kiến-trúc-desktop-tool-electron)
6. [Hướng Dẫn: Thêm 1 Menu / Trang / Modal Mới Trên Frontend](#6-hướng-dẫn-thêm-menu--trang-mới-trên-frontend)
7. [Hướng Dẫn: Thêm 1 API Endpoint Mới Trên Backend FastAPI](#7-hướng-dẫn-thêm-api-endpoint-mới-trên-backend)
8. [Hướng Dẫn: Thêm Tính Năng / IPC Mới Cho Desktop Tool](#8-hướng-dẫn-thêm-tính-năng--ipc-cho-desktop-tool)

---

## 1. TỔNG QUAN KIẾN TRÚC HỆ THỐNG

JACS Studio được xây dựng theo mô hình **Vertical Slice / Domain-Driven Modular Architecture**:
- Mỗi nghiệp vụ (Overview, Licenses, Billing, Plans, Renewals, Sessions, Providers, Releases, Telemetry, Settings, Auth) là một **Module độc lập, khép kín (Self-contained package)**.
- Khi cần mở rộng hoặc chỉnh sửa một tính năng, lập trình viên chỉ cần thao tác bên trong thư mục module đó mà không làm ảnh hưởng đến các phần khác của hệ thống.

```text
meridians-jacs-studio/
├── FE/
│   └── admin-portal/          # Trang quản trị Web (Vite + React + TypeScript + SCSS)
├── BE/
│   └── api-server/            # REST API Backend (FastAPI + Python 3.11 + SQLite/PostgreSQL)
├── Tool/
│   └── desktop-app/           # Ứng dụng Desktop (Electron + React + AI Engine)
└── docs/
    └── DEVELOPER_GUIDE.md     # Tài liệu này
```

---

## 2. CẤU TRÚC CHUẨN CỦA MỘT MODULE FRONTEND

Mỗi module nằm trong `FE/admin-portal/src/modules/[module_name]/` **bắt buộc** phải tuân thủ đúng cấu trúc 7 thành phần sau:

```text
FE/admin-portal/src/modules/[module_name]/
├── components/           # Các UI component nhỏ dành riêng cho module (VD: Table, Card, Grid)
│   ├── [Feature]Table.tsx
│   └── [Feature]Cards.tsx
├── hooks/                # Custom React Hooks xử lý logic, state, search & filter
│   └── use[Feature].ts
├── services/             # Lớp giao tiếp API gọi lên Backend (apiRequest client)
│   └── [feature]Service.ts
├── pages/                # Màn hình chính của module
│   ├── [Feature]Page.tsx
│   └── modal/            # Các Popups / Modals CRUD của module
│       ├── Create[Feature]Modal.tsx
│       └── Edit[Feature]Modal.tsx
├── lang/                 # Gói ngôn ngữ độc lập của module (Tự động nạp vào i18n)
│   ├── vn.ts             # Tiếng Việt
│   ├── en.ts             # English
│   ├── jp.ts             # 日本語
│   └── index.ts          # Đăng ký tự động qua registerModuleTranslations()
├── utils/                # Các hàm tiện ích, format tiền tệ, parse dữ liệu, validation
│   └── [feature]Helper.ts
└── index.ts              # Entry point export của module (Page, Components, Hooks, Services)
```

### 🎯 Trách nhiệm của từng thư mục:
1. **`services/`**: Chứa toàn bộ các hàm gọi HTTP (GET, POST, PUT, DELETE, PATCH). **Tuyệt đối không viết `fetch` hay `apiRequest` trực tiếp trong Component UI**. Mọi request đều đi qua Service để dễ bảo trì và mock test.
2. **`hooks/`**: Chứa toàn bộ State Management, phân trang (`pagination`), tìm kiếm (`searchTerm`), bộ lọc (`filter`). Component UI chỉ cần nhận props từ hook để render.
3. **`components/` & `pages/modal/`**: Chỉ đảm nhận hiển thị giao diện (View), nhận dữ liệu qua props và bắn sự kiện qua callback.
4. **`lang/`**: Chứa toàn bộ chuỗi text hiển thị của module theo 3 ngôn ngữ (`vn`, `en`, `jp`).

---

## 3. HỆ THỐNG ĐA NGÔN NGỮ TỰ ĐỘNG NẠP (i18n)

Hệ thống Core i18n tại `FE/admin-portal/src/core/i18n.tsx` hỗ trợ 3 ngôn ngữ:
- 🇻🇳 `vi` (Tiếng Việt - Mặc định)
- 🇬🇧 `en` (English)
- 🇯🇵 `jp` (日本語)

### Cách thức hoạt động tự động:
Khi bạn tạo một module mới, chỉ cần khai báo file `lang/index.ts`:

```typescript
// src/modules/[module_name]/lang/index.ts
import { registerModuleTranslations } from "../../../core/i18n";
import vn from "./vn";
import en from "./en";
import jp from "./jp";

// Tự động gắn gói ngôn ngữ của module vào từ điển toàn cục
registerModuleTranslations("[module_name]", {
  vi: vn,
  en: en,
  jp: jp,
});

export { vn, en, jp };
```

Khi Component import `../lang`, hệ thống sẽ tự nạp các khóa dịch. Trong Component, bạn chỉ cần gọi:
```tsx
import { useI18n } from "../../../core/i18n";
import "../lang";

export function MyComponent() {
  const { t, language, setLanguage } = useI18n();

  return (
    <div>
      <h1>{t("myTitleKey", "Tiêu đề dự phòng")}</h1>
      <p>{t("[module_name].myDescriptionKey")}</p>
    </div>
  );
}
```

---

## 4. KIẾN TRÚC BACKEND FASTAPI

Backend tại `BE/api-server/` áp dụng Clean Architecture:

```text
BE/api-server/app/
├── core/                 # Cấu hình bảo mật, JWT, Database Engine, Config
│   ├── config.py
│   ├── database.py
│   └── security.py
├── modules/              # Các Domain Module của Backend
│   ├── auth/             # Xác thực Admin JWT
│   ├── licenses/         # Cấp phát, kiểm tra HWID, gia hạn Key
│   ├── billing/          # Dòng tiền, VietQR, SePay Webhook
│   ├── sessions/         # Quản lý thiết bị Client Online
│   ├── providers/        # Quản lý AI Engine Providers
│   ├── releases/         # OTA Updater, quản lý file .exe / .dmg
│   ├── telemetry/        # Thu thập Log sự cố từ Tool
│   └── system/           # Sao lưu Backup DB, Cấu hình Brand & Lock Menu
└── main.py               # Khởi tạo FastAPI App & Mount Routers
```

### Chuẩn cấu trúc của 1 Module Backend (`BE/api-server/app/modules/[domain]/`):
1. **`schemas.py`**: Định nghĩa Pydantic Models (Validation dữ liệu Request & Response).
2. **`service.py`**: Xử lý toàn bộ Business Logic nghiệp vụ.
3. **`repository.py`** (hoặc `store.py`): Truy vấn dữ liệu SQLite/Postgres.
4. **`router.py`**: Định nghĩa API Endpoints (`APIRouter`) và kiểm tra quyền (`Depends(get_current_admin)`).

---

## 5. KIẾN TRÚC DESKTOP TOOL ELECTRON

Ứng dụng Desktop nằm trong `FE/desktop-app/`:

```text
FE/desktop-app/
├── electron/             # Main Process (Node.js)
│   ├── main.cjs          # Entry point Electron, khởi tạo Window, Tray, Auto-updater
│   ├── preload.cjs       # Bridge an toàn (contextBridge) giữa Main và Renderer
│   ├── machine-id.cjs    # Trích xuất Hardware ID (HWID) duy nhất của thiết bị
│   ├── voice-pack.cjs    # Quản lý Voice Model offline & online
│   └── updater.cjs       # Trình kiểm tra & cập nhật OTA tự động
└── src/                  # Renderer Process (React UI)
    ├── modules/          # Các module màn hình làm việc của Tool
    │   ├── sources/      # 1. Nguồn Video
    │   ├── analysis/     # 2. Phân Tích AI
    │   ├── story/        # 3. Kịch Bản & Voice TTS
    │   ├── timeline/     # 4. Dựng & Timeline Editor
    │   ├── brand/        # 5. Phụ Đề & Thương Hiệu
    │   └── render/       # 6. Render Xuất Bản Video
    └── core/             # IPC Bridge client, Store, Theme
```

---

## 6. HƯỚNG DẪN: THÊM MENU / TRANG MỚI TRÊN FRONTEND

Giả sử bạn muốn thêm tính năng mới: **Quản lý Đại lý / CTV (`affiliates`)**.

### Bước 1: Tạo thư mục module chuẩn
Tạo thư mục `FE/admin-portal/src/modules/affiliates/` gồm:
- `components/AffiliateTable.tsx`
- `hooks/useAffiliates.ts`
- `services/affiliateService.ts`
- `pages/AffiliatesPage.tsx`
- `lang/vn.ts`, `lang/en.ts`, `lang/jp.ts`, `lang/index.ts`
- `index.ts`

### Bước 2: Khai báo Service gọi API
```typescript
// src/modules/affiliates/services/affiliateService.ts
import { apiRequest } from "../../../core/api";
import { getToken } from "../../../core/session";

export interface AffiliateItem {
  id: string;
  name: string;
  commission_rate: number;
  total_sales: number;
}

export const affiliateService = {
  async getAffiliates(): Promise<AffiliateItem[]> {
    return apiRequest<AffiliateItem[]>("/api/v1/affiliates", { method: "GET" }, getToken() || undefined);
  },
};
```

### Bước 3: Khai báo đa ngôn ngữ cho module
```typescript
// src/modules/affiliates/lang/vn.ts
export default {
  affiliatesTitle: "Quản lý Đại lý & CTV",
  affiliatesSubtitle: "Theo dõi hoa hồng và doanh số đối tác phân phối",
  thPartnerName: "Tên đối tác",
  thCommission: "Hoa hồng (%)",
};
```
```typescript
// src/modules/affiliates/lang/index.ts
import { registerModuleTranslations } from "../../../core/i18n";
import vn from "./vn";
import en from "./en";
import jp from "./jp";

registerModuleTranslations("affiliates", { vi: vn, en, jp });
export { vn, en, jp };
```

### Bước 4: Tạo Component Trang chính
```tsx
// src/modules/affiliates/pages/AffiliatesPage.tsx
import React, { useEffect, useState } from "react";
import { affiliateService, AffiliateItem } from "../services/affiliateService";
import { useI18n } from "../../../core/i18n";
import "../lang";

export function AffiliatesPage() {
  const { t } = useI18n();
  const [data, setData] = useState<AffiliateItem[]>([]);

  useEffect(() => {
    affiliateService.getAffiliates().then(setData).catch(console.error);
  }, []);

  return (
    <div className="mf-card-panel">
      <div className="mf-card-header">
        <h3>{t("affiliatesTitle")}</h3>
        <p>{t("affiliatesSubtitle")}</p>
      </div>
      {/* Render dữ liệu bảng */}
    </div>
  );
}
```

### Bước 5: Thêm Menu vào Sidebar và Dashboard
1. Thêm key vào `FE/admin-portal/src/components/layout/Sidebar.tsx`:
   - Thêm `"affiliates"` vào `MenuKey`.
   - Thêm nút bấm Menu trong Sidebar.
2. Mở `FE/admin-portal/src/modules/dashboard/Dashboard.tsx`:
   - Import `AffiliatesPage` từ `../affiliates`.
   - Thêm vào switch render: `{activeMenu === "affiliates" && <AffiliatesPage />}`.

---

## 7. HƯỚNG DẪN: THÊM API ENDPOINT MỚI TRÊN BACKEND

Giả sử bạn cần tạo API `/api/v1/affiliates` cho module trên.

### Bước 1: Tạo Schema Pydantic
```python
# BE/api-server/app/modules/affiliates/schemas.py
from pydantic import BaseModel

class AffiliateCreate(BaseModel):
    name: str
    commission_rate: float

class AffiliateResponse(BaseModel):
    id: str
    name: str
    commission_rate: float
    total_sales: float
```

### Bước 2: Tạo Router Endpoint
```python
# BE/api-server/app/modules/affiliates/router.py
from fastapi import APIRouter, Depends
from typing import List
from .schemas import AffiliateResponse, AffiliateCreate
from app.modules.auth.dependencies import get_current_admin

router = APIRouter(prefix="/api/v1/affiliates", tags=["Affiliates"])

@router.get("", response_model=List[AffiliateResponse])
async def list_affiliates(admin = Depends(get_current_admin)):
    # Truy vấn DB và trả về danh sách
    return [
        {"id": "aff-1", "name": "Đại lý Hà Nội", "commission_rate": 20.0, "total_sales": 50000000}
    ]
```

### Bước 3: Đăng ký Router trong `main.py`
```python
# BE/api-server/app/main.py
from app.modules.affiliates.router import router as affiliates_router

app.include_router(affiliates_router)
```

---

## 8. HƯỚNG DẪN: THÊM TÍNH NĂNG / IPC CHO DESKTOP TOOL

Desktop Tool hoạt động thông qua cơ chế **IPC (Inter-Process Communication)** giữa Renderer React và Main Process Node.js.

### Bước 1: Định nghĩa Handler trong Main Process
Mở file `FE/desktop-app/electron/main.cjs`:
```javascript
const { ipcMain } = require('electron');

// Lắng nghe sự kiện từ Renderer
ipcMain.handle('tool:export-video-fast', async (event, payload) => {
  console.log('Đang xuất video với cấu hình:', payload);
  // Thực hiện render FFmpeg hoặc gọi Python engine
  return { success: true, outputPath: 'C:/Exports/video.mp4' };
});
```

### Bước 2: Expose qua `preload.cjs` an toàn
Mở file `FE/desktop-app/electron/preload.cjs`:
```javascript
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('jacsApi', {
  exportVideoFast: (payload) => ipcRenderer.invoke('tool:export-video-fast', payload),
});
```

### Bước 3: Sử dụng trong React UI của Tool
```typescript
// FE/desktop-app/src/modules/render/RenderPage.tsx
export function RenderPage() {
  const handleExport = async () => {
    if (window.jacsApi) {
      const res = await window.jacsApi.exportVideoFast({ resolution: '1080p', fps: 60 });
      alert('Xuất video thành công: ' + res.outputPath);
    }
  };

  return <button onClick={handleExport}>Xuất Video Nhanh</button>;
}
```

### Bước 4: Điều khiển Khóa / Mở tính năng từ xa qua Admin Portal
Mỗi menu trên Tool đều được liên kết với `MenuLockItem` trên Admin Portal (`ToolConfigPage.tsx`).
- Admin có thể bấm **Khóa** hoặc **Mở** bất kỳ menu nào trên Tool ngay lập tức.
- Khi bị khóa, Tool sẽ hiển thị thông báo nâng cấp bản quyền hoặc bảo trì mà không cần build lại ứng dụng.

---

## 🚀 QUY TRÌNH DEPLOY & KIỂM THỬ (CI/CD)

1. **Build Kiểm tra cú pháp & Type Check**:
   ```bash
   cd FE/admin-portal
   npm run build
   ```
2. **Deploy lên Server Staging (Port 85) & Production (Port 84)**:
   ```bash
   python scratch/deploy_admin_fe.py
   ```
3. **Quy trình GitFlow**:
   - Mọi tính năng phát triển trên branch: `refactor/[JACS-xxx-feature-name]`.
   - Commit rõ ràng và merge `--no-ff` theo thứ tự: `dev` ➔ `staging` ➔ `prod` ➔ `main`.
   - Push lên remote repository: `git push origin dev staging prod main`.

---
*Tài liệu được cập nhật tự động theo kiến trúc JACS Studio 2026.*
