# Desktop Tool

`Tool/desktop-app` là React renderer cho ứng dụng Desktop JACS Studio. Native
shell sẽ sở hữu IPC, HWID, secure storage, local queue và FFmpeg/GPU; React
renderer chỉ gọi các capability qua bridge được allowlist.

```bash
pnpm install
pnpm dev:desktop
```
