# Desktop Tool

`Tool/desktop-app` là ứng dụng Desktop JACS Studio gồm React renderer và
Electron shell. Shell hiện tạo cửa sổ native với `contextIsolation` và tắt
`nodeIntegration`; IPC, HWID, secure storage, local queue và FFmpeg/GPU là các
module sẽ được bổ sung qua bridge allowlist.

```bash
pnpm install
pnpm dev:desktop
```

Desktop hiện chạy trong Electron để có thể tạo installer native:

```bash
pnpm --dir Tool/desktop-app dist:mac   # macOS .dmg + .zip
pnpm --dir Tool/desktop-app dist:win   # Windows NSIS .exe (chạy trên Windows)
```

File cài đặt nằm trong `Tool/desktop-app/release/` (ví dụ bản macOS ARM64 đã
build: `JACS Studio-0.2.0-arm64.dmg`). Workflow
`.github/workflows/desktop-release.yml` tự build artifact macOS và Windows khi
push tag `vX.Y.Z`. Bản macOS local chưa ký Developer ID nên chỉ dùng QA; muốn
phân phối rộng cần ký và notarize bằng tài khoản Apple Developer. Bản Windows
chỉ được tạo trên Windows runner/GitHub Actions để có installer NSIS `.exe`.
