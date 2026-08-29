# Desktop Tool

`Tool/desktop-app` là React renderer cho ứng dụng Desktop JACS Studio. Native
shell sẽ sở hữu IPC, HWID, secure storage, local queue và FFmpeg/GPU; React
renderer chỉ gọi các capability qua bridge được allowlist.

```bash
pnpm install
pnpm dev:desktop
```

Desktop hiện chạy trong Electron để có thể tạo installer native:

```bash
pnpm --dir Tool/desktop-app dist:mac   # macOS .dmg + .zip
pnpm --dir Tool/desktop-app dist:win   # Windows NSIS .exe (chạy trên Windows)
```

File cài đặt nằm trong `Tool/desktop-app/release/`. Workflow
`.github/workflows/desktop-release.yml` tự build artifact macOS và Windows khi
push tag `vX.Y.Z`. Bản macOS local chưa ký Developer ID nên chỉ dùng QA; muốn
phân phối rộng cần ký và notarize bằng tài khoản Apple Developer.
