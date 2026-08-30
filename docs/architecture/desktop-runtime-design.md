# Thiết kế runtime Desktop đa nền tảng

## Boundary bảo mật

Electron được chia ba lớp. Renderer React không có Node.js, không được đọc hệ
thống file tùy ý, spawn FFmpeg, lấy HWID hay đọc secret. Mọi quyền native đều đi
qua IPC allowlist có DTO nhỏ và kiểm tra input.

```text
React modules -> core/native client -> preload allowlist -> Electron main
                                                      -> secure storage
                                                      -> file dialog / app paths
                                                      -> FFmpeg worker / GPU probe
                                                      -> updater
```

`Tool/desktop-app/electron/preload.cjs` chỉ expose các hàm tối thiểu: lấy thông
tin thiết bị, đọc/ghi/xóa license, mở file chooser và reveal path. Main process
không trả secret về renderer. Lớp bridge này là điểm duy nhất được phép thêm API
native mới; mỗi method mới cần threat review và test Windows/macOS.

## Cấu trúc code mục tiêu

```text
Tool/desktop-app/
├── electron/
│   ├── main.cjs                 # cửa sổ, IPC, lifecycle
│   ├── preload.cjs              # public native API allowlist
│   └── services/                # secure-store, hwid, ffmpeg, updater
└── src/
    ├── core/
    │   ├── api/                 # HTTP client, API errors, request ID
    │   ├── config/              # runtime config + migration settings
    │   ├── native/              # typed wrapper của preload API
    │   ├── licensing/           # activation state + heartbeat facade
    │   ├── jobs/                # state machine, queue and progress
    │   ├── telemetry/           # redaction + delivery policy
    │   └── providers/           # registry/capability, không giữ raw secret
    ├── modules/
    │   ├── overview/
    │   ├── batch-jobs/
    │   ├── video-analysis/
    │   ├── rendering/
    │   ├── activation/
    │   └── settings/
    └── shared/                  # UI primitive, icon, formatters thuần
```

Code hiện tại đã khởi tạo `src/core`, `src/modules` và `src/shared` theo boundary
này. Khi module lớn hơn, không import component/hook nội bộ của module khác;
chỉ import facade/type công khai qua `core` hoặc `shared`.

## Adapter platform

| Khả năng | macOS | Windows | Yêu cầu chung |
| --- | --- | --- | --- |
| Secure secret | Keychain | Credential Manager / DPAPI | Secret không đi vào log hoặc renderer |
| Video encoder ưu tiên | VideoToolbox | NVENC, AMF, Quick Sync | Probe ở runtime, CPU fallback |
| Device identity | Identifier được hash + app salt | Identifier được hash + app salt | Không dùng một hardware serial thô duy nhất |
| Installer/update | DMG/ZIP, ký + notarize | NSIS/MSI, Authenticode | Manifest ký + checksum + rollback |
| App data | Application Support | AppData | Schema config versioned và migration |

Lưu ý: `safeStorage` là lớp mã hóa theo OS của Electron, phù hợp lưu license
material ngắn hạn trong MVP. API key BYOK production cần secure-store adapter đã
được kiểm thử trên từng OS; không coi fallback plaintext là production-ready.

## Local media runtime

`MediaRuntime` nhận command đã validate thay vì nhận raw shell command từ UI.
Command builder chỉ cho phép codec, filter và đường dẫn đã nằm trong allowlist.
Mỗi job có temp directory riêng, cancellation token, timeout, progress parser và
cleanup handler.

```text
Render module -> JobCommand -> IPC -> MediaRuntime
  -> GPU probe -> encoder selection -> FFmpeg child process
  -> progress event -> renderer query cache
  -> artifact manifest + local history
```

Ưu tiên engine: Apple VideoToolbox trên macOS, NVENC/NVIDIA, AMF/AMD hoặc Quick
Sync trên Windows, sau đó mới CPU software. UI chỉ là preference; runtime probe
và preflight mới quyết định engine thực sự. Khi GPU thiếu VRAM/driver, Tool nêu
rõ lựa chọn CPU, remote render hoặc hủy - không tự upload video lên cloud.

## License và OTA tại client

- `ActivationModule` lấy Device ID từ native service; license được validate bởi
  Python API qua HTTPS. Desktop không tự quyết định trạng thái key.
- Token/policy cache phải có expiry, device binding và chữ ký server. UI chỉ
  mở feature khi state machine nằm ở `valid` hoặc grace period cho phép.
- `UpdaterService` tải manifest và asset từ HTTPS, verify signing key, SHA-512
  và version trước cài đặt. Chỉ updater main process được ghi vào installer path.
- Job đang render phải được checkpoint hoặc yêu cầu người dùng chọn thời điểm
  restart trước update; không đóng ứng dụng làm hỏng output.

## Các ràng buộc chưa hoàn tất

Shell đã có typed IPC cho activation/file picking, nhưng FFmpeg worker, GPU
probe, provider generation thực, updater signing và persistent local job store
vẫn là các story triển khai tiếp theo. Không được quảng bá UI prototype là chức
năng render/OTA production cho đến khi các story này đạt Definition of Done.
