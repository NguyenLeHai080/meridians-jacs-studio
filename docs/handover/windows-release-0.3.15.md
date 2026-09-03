# Windows Release v0.3.15

Installer x64 được build bằng Electron Builder/NSIS:

- Artifact: `Tool/desktop-app/release/JACS Studio Setup 0.3.15.exe`
- Dung lượng: khoảng 255 MB
- SHA-512: `fc88a163adf3aab5dcc17de13e78ddfa3007cb0e93c651585f2cebb9b368df3e2788deb2c411e379a13c96745dde54fd706e0854898a6e471960e6ef09b92acb`
- Kiểu cập nhật: Windows NSIS silent install (`/S`)

## Publish OTA

Upload artifact lên CDN HTTPS, sau đó tạo release trong Admin với các giá trị:

```json
{
  "version": "v0.3.15",
  "platform": "windows",
  "channel": "stable",
  "download_url": "https://<cdn>/JACS%20Studio%20Setup%200.3.15.exe",
  "sha512": "fc88a163adf3aab5dcc17de13e78ddfa3007cb0e93c651585f2cebb9b368df3e2788deb2c411e379a13c96745dde54fd706e0854898a6e471960e6ef09b92acb",
  "release_notes": "Cải thiện timeline, preflight và QA output.",
  "force_update": false,
  "signature": "<release-signature>"
}
```

Release phải được ký và publish trong Admin. Sau khi publish, khách mở `Cài đặt
tool` → `Kiểm tra ngay` → `Cập nhật` để tải và cài tự động. Build hiện chưa có
Authenticode certificate nên Windows SmartScreen có thể cảnh báo lần cài đầu.
