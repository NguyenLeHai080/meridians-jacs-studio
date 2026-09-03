# Desktop Tool

## 0.3.15 - Bundled multilingual local voice worker for macOS/Windows

- OpenAI-compatible gateway chỉ phân tích hình ảnh/transcript và tạo kịch bản; không bắt buộc endpoint TTS hoặc pricing TTS.
- Voice worker Python được build thành executable trong installer khi CI có PyInstaller; nếu không có executable, app tự fallback sang System Voice của macOS/Windows.
- Chọn ngôn ngữ + nam/nữ trong job sẽ dùng đúng voice pack/locale và đọc chính kịch bản contextual mà AI trả về, không đọc summary hoặc transcript gốc.
- Bổ sung profile local cho tiếng Việt, English, Nhật, Hàn, Trung, Thái, Indonesia, Malay, Filipino, Pháp, Tây Ban Nha, Bồ Đào Nha, Đức, Ý, Nga, Thổ Nhĩ Kỳ, Ả Rập, Hindi và Hà Lan.

## 0.3.13 - Localized voice fallback for chat-only gateways

- Gateway chỉ có chat model vẫn phân tích/dịch theo ngôn ngữ đã chọn; không còn dừng job vì thiếu transcript timestamp.
- Khi gateway trả `pricing_not_found` cho `/audio/transcriptions` hoặc `/audio/speech`, desktop dùng giọng hệ điều hành theo locale đã chọn (macOS/Windows) rồi ghép bằng FFmpeg.
- macOS ưu tiên voice đúng locale (ví dụ `Linh` cho tiếng Việt); Windows ưu tiên Installed Voice đúng culture và giới tính, sau đó dùng voice cùng locale nếu hệ điều hành chỉ có một giới tính. Nếu locale chưa được cài, tool dừng với hướng dẫn cài language voice thay vì đọc nhầm ngôn ngữ.

## 0.3.12 - OpenAI-compatible contextual narration fallback

- Gắn mốc thời gian vào từng frame gửi cho provider vision để model đối chiếu đúng cảnh.
- Transcript có timestamp là dữ liệu tăng cường, không còn là điều kiện bắt buộc để render voice-over.
- Provider OpenAI/OpenAI-compatible có thể dùng frame timeline khi gateway không hỗ trợ transcription hoặc trả transcript không có segment.
- Tự thử lại chat text-only khi gateway từ chối ảnh; TTS ưu tiên model `tts-1` cho gateway tương thích.

## 0.3.11 - Timestamp-aware contextual translation

- Gắn mốc thời gian vào từng frame gửi cho provider vision để model đối chiếu đúng cảnh.

## 0.3.10 - Contextual narration alignment

- Không đọc lại transcript tổng cho từng clip scene khi AI thiếu `voiceover` riêng.
- Tăng giới hạn phản hồi phân tích để tránh JSON dịch/voice-over bị cắt giữa chừng.
- Prompt yêu cầu khôi phục mạch chuyện, giữ chủ ngữ/đại từ và phân bổ câu đúng mốc scene.
- Job tách scene chỉ chạy khi mọi scene có voice-over riêng; cache cũ sẽ được phân tích lại.

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

Ở chế độ phát triển, Vite tự cập nhật thay đổi trong `src/` và Electron tự
khởi động lại khi sửa file trong `electron/`. Chỉ cần giữ lệnh này chạy trong
terminal; không cần build hoặc mở lại thủ công.

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

### Cấu hình OpenAI-compatible gateway

Trong **Cài đặt tool**, chọn `OpenAI compatible`, nhập Base URL dạng
`https://<gateway>/v1`, model chat và API key. Chỉ cần capability `analysis`
(có thể thêm `vision` nếu gateway/model nhận ảnh); không cần bật `tts` và ô
**TTS model** có thể để trống. Model transcription cũng là tùy chọn: tool thử
nhận transcript nếu gateway hỗ trợ, nhưng việc render không phụ thuộc endpoint
này. Chọn ngôn ngữ/nam-nữ trong **Tạo job hàng loạt**; AI tạo kịch bản đúng ngữ
cảnh, sau đó voice worker local đọc chính kịch bản đó. API key chỉ dùng cho
phân tích, không được gửi vào Python worker.

Nếu gateway chỉ công bố chat model (không có `/audio/transcriptions` hoặc
`/audio/speech`), tool vẫn chạy: AI dựa vào frame timeline để tạo lời kể an
toàn theo nội dung nhìn thấy và voice worker local tạo audio. Khi cần bản dịch
đúng từng câu thoại trong audio, cần thêm transcription provider có hỗ trợ
audio; frame-only không thể khôi phục câu nói không xuất hiện trên hình.

### Voice pack local cho macOS và Windows

Installer đóng gói `jacs-voice-worker` (Python/PyInstaller) nên máy khách không
cần cài Python. Worker dùng speech engine có sẵn của hệ điều hành và FFmpeg đã
được kèm trong installer để ghép voice vào video.

- **macOS:** vào `System Settings > Accessibility > Spoken Content > System
  Voice > Manage Voices`, tải voice của ngôn ngữ cần dùng (ví dụ Linh cho tiếng
  Việt). Tool ưu tiên đúng locale/voice rồi mới fallback.
- **Windows 10/11:** vào `Settings > Time & language > Language & region`, cài
  language pack và phần `Text-to-speech`; sau đó `Settings > Accessibility >
  Speech` để xác nhận Installed voice. Tool ưu tiên culture (như `vi-VN`) và
  giới tính đã chọn.

Chạy voice worker để QA trước khi phát hành (đường dẫn macOS tương tự với file
`.exe` trên Windows):

```bash
Tool/desktop-app/voice-runtime/jacs-voice-worker list --language vi
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

URL TikTok được xử lý theo thứ tự: đọc URL video trong trang, gọi resolver
HTTPS (mặc định TikWM), rồi tải CDN đã ký vào cache. Resolver/CDN có retry khi
gặp `503`, `429` hoặc thông báo rate-limit; nếu TikTok vẫn chặn nguồn, lỗi job
hiển thị nguyên nhân trong **Job inspector** và nút **Chạy lại** giữ nguyên
cấu hình. Có thể đặt resolver riêng bằng `JACS_TIKTOK_RESOLVER_URL`.

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

File cài đặt nằm trong `Tool/desktop-app/release/`: macOS Universal bản mới nhất
`JACS Studio-0.3.15-universal.dmg`/`.zip`, cùng artifact macOS ARM64/Intel và
Windows x64 được build trên Windows runner của
workflow; artifact local dùng cho QA. Workflow
`.github/workflows/desktop-release.yml` tự build artifact macOS và Windows khi
push tag `vX.Y.Z`. Bản macOS local chưa ký Developer ID nên chỉ dùng QA; muốn
phân phối rộng cần ký và notarize bằng tài khoản Apple Developer. Bản Windows
local cũng chưa ký Authenticode; nên phát hành artifact từ Windows runner sau
khi cấu hình chứng thư ký.

Để cập nhật tự động cho cả Mac Intel và Apple Silicon, dùng lệnh
`pnpm dist:mac:universal`. Lệnh tạo `JACS Studio-<version>-universal-mac.zip`
(manifest updater) và `JACS Studio-<version>-universal.dmg` (cài đặt mới); cả
hai artifact chứa app và FFmpeg Universal (`x86_64 arm64`).

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

Batch preset hỗ trợ tách một video theo nhiều ngôn ngữ đầu ra (mỗi ngôn ngữ là
một job), giọng kể AI nam/nữ và voice preset, giữ/cắt tiếng gốc, nhấn hook, trộn
nhạc nền theo âm lượng, cùng tùy chọn tách scene thành các job con. Frame preview
luôn được trích xuất cục bộ để hiển thị trong inspector; chỉ provider có
capability `vision` mới nhận frame qua API.

Luồng khách hàng: mở **License & thiết bị** để copy Device ID thật gửi Admin;
nhập License Key được cấp rồi mở **Cài đặt tool** để tự thêm URL/model/API key
của provider. Key được lưu bằng Keychain/Credential Manager và không đi qua
React renderer. Vào **Tạo job hàng loạt**, chọn nhiều file hoặc dán nhiều URL,
chọn `Cloud AI + render local`, tỷ lệ 9:16/1:1/16:9 và tùy chọn tách scene;
queue sẽ phân tích, hiển thị tiến trình, render clip và mở output sau khi xong.
Trong **Cài đặt tool**, tùy chọn tự kiểm tra cập nhật gọi release manifest của
server. Khi có bản mới, nút **Cập nhật** tải asset qua HTTPS vào thư mục tạm,
kiểm tra SHA-512 trước khi cài. Windows chạy NSIS installer ở chế độ silent và
tự khởi động lại; macOS ZIP được giải nén, thay thế app sau khi app thoát rồi
tự mở lại. Asset DMG đã xác minh sẽ được mở để người dùng kéo vào Applications.
Nếu checksum sai, redirect không an toàn hoặc định dạng không đúng, bản cập
nhật bị từ chối và file tạm bị xóa.

Để phân tích frame và encode H.264/GPU thật, installer cần kèm `ffmpeg` và
`ffprobe` trong `resources/bin/<platform>-<arch>/` (ví dụ
`resources/bin/darwin-arm64/`, `resources/bin/darwin-x64/` hoặc
`resources/bin/win32-x64/`) hoặc đặt biến môi trường
`JACS_FFMPEG_PATH` và `JACS_FFPROBE_PATH`. Màn hình **Cài đặt tool** hiển thị
trạng thái hai binary. Khi chưa có binary, app chỉ tạo output passthrough giữ
nguyên container nguồn và không thể phân tích ngữ cảnh từ frame; đây là trạng
thái tương thích có cảnh báo, không phải kết quả render H.264.
