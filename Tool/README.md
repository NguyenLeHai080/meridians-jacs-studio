# Desktop Tool

`Tool/desktop-app` là ứng dụng Desktop JACS Studio gồm React renderer và
Electron shell. UI được tách thành `core`, `modules` và `shared`; editor chính
gồm inspector cài đặt narrator, preview Original/Auto-reframe, timeline nhiều
track (video, AI voice, audio, subtitle), đồng thời vẫn giữ các module batch
job, phân tích video, render, kích hoạt license và cài đặt. Electron bật
`contextIsolation`, tắt `nodeIntegration` và chỉ expose IPC allowlist qua
preload.

```bash
pnpm install
pnpm dev:desktop
```

Lệnh trên mở renderer bằng Vite để kiểm tra nhanh trên trình duyệt. Để kiểm
tra đúng native bridge (Device ID, secure storage và file picker), dùng:

```bash
pnpm dev:electron
```

Chạy API local ở `http://localhost:8000` trước khi thử kích hoạt key. Bản
Electron packaged mặc định gọi production API; có thể chọn môi trường khi chạy
shell bằng biến `JACS_API_URL`, ví dụ:

```bash
JACS_API_URL=https://test-jacs-studio.nexoratech.com.vn pnpm dev:desktop
```

License material được Electron mã hóa bằng OS secure storage. Khi mở app, tool
gọi heartbeat định kỳ để phát hiện key bị khóa/hết hạn; job mới được đồng bộ lên
`/api/v1/client/jobs` với header license + device ID và vẫn giữ hàng đợi local nếu
API tạm thời không sẵn sàng. Device ID trong bản Electron là mã ổn định theo
từng máy: macOS đọc `IOPlatformUUID` bằng `ioreg`, Windows đọc `MachineGuid` từ
registry, Linux đọc `/etc/machine-id`. Giá trị gốc không bao giờ gửi lên API;
app băm với salt riêng của JACS và chỉ gửi mã dạng `JACS-MAC-...`,
`JACS-WIN-...` hoặc `JACS-LNX-...`. Nếu hệ điều hành không cung cấp định danh,
app tạo một installation ID ngẫu nhiên, lưu cục bộ với quyền hạn chế và giữ ổn
định giữa các lần mở. Cấu hình không
nhạy cảm (workspace, cache, telemetry, auto-update, engine) được tự lưu trong
thư mục app-data của từng hệ điều hành. API key provider chưa được lưu từ UI
Desktop; chỉ đưa qua provider secure adapter sau khi story đó hoàn tất. Mã
`WEB-DEMO-MACHINE` chỉ tồn tại khi mở renderer bằng Vite trong trình duyệt để
xem UI; bản Electron không sử dụng mã demo và không cho phép kích hoạt license
từ renderer đó.

Desktop hiện chạy trong Electron để có thể tạo installer native:

```bash
pnpm --dir Tool/desktop-app dist:mac   # macOS .dmg + .zip
pnpm --dir Tool/desktop-app dist:win   # Windows NSIS .exe (chạy trên Windows)
```

File cài đặt nằm trong `Tool/desktop-app/release/`: macOS ARM64
`JACS Studio-0.3.1-arm64.dmg`/`.zip` vừa build; Windows x64 được build trên
Windows runner của workflow. Workflow
`.github/workflows/desktop-release.yml` tự build artifact macOS và Windows khi
push tag `vX.Y.Z`. Bản macOS local chưa ký Developer ID nên chỉ dùng QA; muốn
phân phối rộng cần ký và notarize bằng tài khoản Apple Developer. Bản Windows
local cũng chưa ký Authenticode; nên phát hành artifact từ Windows runner sau
khi cấu hình chứng thư ký.
