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
JACS_API_URL=https://test-jacs-studio.nexoratech.com.vn pnpm dev:electron
```

Khi chỉ mở renderer bằng Vite trên trình duyệt, dùng `VITE_API_URL` thay vì
`JACS_API_URL`:

```bash
VITE_API_URL=https://test-jacs-studio.nexoratech.com.vn pnpm dev:desktop
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
thư mục app-data của từng hệ điều hành. Provider BYOK của khách có thể cấu hình
ngay trong màn hình **Cài đặt tool**. Metadata được hiển thị trong UI, còn API
key được mã hóa bằng OS secure storage (Keychain/Credential Manager/Secret
Service) và chỉ được giải mã trong Electron main process khi test connection. Mã
`WEB-DEMO-MACHINE` chỉ tồn tại khi mở renderer bằng Vite trong trình duyệt để
xem UI; bản Electron không sử dụng mã demo và không cho phép kích hoạt license
từ renderer đó.

Desktop hiện chạy trong Electron để có thể tạo installer native. `pnpm
dev:desktop` chỉ là renderer trong trình duyệt, không có file picker, mã máy
thật, secure storage hoặc render native.

```bash
pnpm --dir Tool/desktop-app dist:mac   # macOS .dmg + .zip (tự chuẩn bị FFmpeg)
pnpm --dir Tool/desktop-app dist:win   # Windows NSIS .exe (chạy trên Windows)
```

Lệnh đóng gói sẽ chạy `prepare:media` trước khi build. Script này tìm
`ffmpeg`/`ffprobe` trên máy và copy vào thư mục tạm `bin/<platform>`; CI cũng
thực hiện bước này trên runner native nên installer luôn có media engine.

File cài đặt nằm trong `Tool/desktop-app/release/`: macOS ARM64
`JACS Studio-0.3.3-arm64.dmg`/`.zip`, macOS Intel
`JACS Studio-0.3.3.dmg`/`.zip` và Windows x64
`JACS Studio Setup 0.3.3.exe`. Windows x64 được build trên Windows runner của
workflow; artifact local dùng cho QA. Workflow
`.github/workflows/desktop-release.yml` tự build artifact macOS và Windows khi
push tag `vX.Y.Z`. Bản macOS local chưa ký Developer ID nên chỉ dùng QA; muốn
phân phối rộng cần ký và notarize bằng tài khoản Apple Developer. Bản Windows
local cũng chưa ký Authenticode; nên phát hành artifact từ Windows runner sau
khi cấu hình chứng thư ký.

## Media pipeline

Trong bản Desktop, **Tạo job hàng loạt** cho phép chọn nhiều file video hoặc dán
URL HTTP(S). URL được tải vào thư mục app-data, file được probe metadata, sau đó
render vào thư mục `Documents/JACS Studio/Outputs`. Chỉ chế độ `Cloud AI` hoặc
`Hybrid` mới gửi tối đa sáu frame/transcript cho provider vision đã cấu hình;
`Local CPU/GPU` phân tích scene bằng FFmpeg và không upload media. Job được lưu
bền vững trong app-data nên không mất khi đóng/mở lại app; **Tổng quan** lấy tổng
job, job lỗi, token và credit từ API theo license, đồng thời cộng các job local
chưa đồng bộ khi mạng tạm thời gián đoạn. Queue hỗ trợ **Hủy** job đang chờ/đang
chạy (dừng fetch/FFmpeg qua IPC) và **Chạy lại** job lỗi hoặc đã hủy.

Luồng khách hàng: mở **License & thiết bị** để copy Device ID thật gửi Admin;
nhập License Key được cấp rồi mở **Cài đặt tool** để tự thêm URL/model/API key
của provider. Key được lưu bằng Keychain/Credential Manager và không đi qua
React renderer. Vào **Tạo job hàng loạt**, chọn nhiều file hoặc dán nhiều URL,
chọn `Cloud AI + render local`, tỷ lệ 9:16/1:1/16:9 và tùy chọn tách scene;
queue sẽ phân tích, hiển thị tiến trình, render clip và mở output sau khi xong.
Trong **Cài đặt tool**, tùy chọn tự kiểm tra cập nhật gọi release manifest của
server; chỉ URL HTTPS tin cậy mới được mở để tải bản cài đặt.

Để phân tích frame và encode H.264/GPU thật, installer cần kèm `ffmpeg` và
`ffprobe` trong `resources/bin/<platform>-<arch>/` (ví dụ
`resources/bin/darwin-arm64/`, `resources/bin/darwin-x64/` hoặc
`resources/bin/win32-x64/`) hoặc đặt biến môi trường
`JACS_FFMPEG_PATH` và `JACS_FFPROBE_PATH`. Màn hình **Cài đặt tool** hiển thị
trạng thái hai binary. Khi chưa có binary, app chỉ tạo output passthrough giữ
nguyên container nguồn và không thể phân tích ngữ cảnh từ frame; đây là trạng
thái tương thích có cảnh báo, không phải kết quả render H.264.
