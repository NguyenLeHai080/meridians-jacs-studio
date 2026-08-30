# Kế hoạch kiểm thử Desktop Tool

## Ma trận bắt buộc

| Nhóm | macOS | Windows |
| --- | --- | --- |
| Cài đặt và khởi động | Apple Silicon và Intel nếu được hỗ trợ | Windows 10/11 x64 |
| License/HWID | Keychain enabled, offline/online | Credential Manager/DPAPI, offline/online |
| Media | VideoToolbox, CPU fallback, disk thấp | NVENC/AMF/Quick Sync/CPU fallback |
| Update | DMG/ZIP signed/notarized | NSIS signed Authenticode |

## Smoke test trước UAT

1. Mở app 0.3.2, sao chép Device ID, tạo license từ Admin và kích hoạt trên đúng máy.
2. Nhập key sai, key khóa, key hết hạn và HWID sai; UI hiển thị lỗi đúng, feature
   job bị chặn và không mất dữ liệu local.
3. Chọn bốn video, tạo batch, hủy một job, retry một job lỗi; các job khác vẫn
   tiếp tục và progress không lùi bất thường.
4. Chạy analysis local/hybrid; từ chối consent cloud phải không upload media.
5. Render test bằng GPU và CPU fallback; kiểm duration, codec, checksum output
   và cleanup temp directory.
6. Tạo error đã scrub; xác minh API nhận `hwid_hash` mà không có key/API key,
   đồng thời `fatal` tạo thông báo alert trong môi trường test.
7. Publish beta/stable signed; Tool tải/verify/install update và restart không
   mất project hoặc làm hỏng job đang chạy.

## Điều kiện chặn bàn giao

- Installer chưa ký/notarize, update manifest chưa có chữ ký, hoặc không có
  rollback test thì không phát hành production.
- Chưa có test thực tế trên Windows và macOS target thì không tuyên bố
  cross-platform production-ready.
- FFmpeg/GPU worker, provider execution, background queue worker hoặc OTA còn
  mock thì UI phải đánh dấu rõ beta/prototype, không được coi là hoàn tất chức
  năng.
