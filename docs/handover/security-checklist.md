# Checklist bảo mật

## Trước khi nhận dữ liệu khách

- [ ] Thay toàn bộ giá trị mẫu trong `.env`; không commit `.env` hoặc log secret.
- [ ] Password admin dùng PBKDF2-SHA256 hiện tại; nâng Argon2id khi bổ sung identity store; bật MFA nếu chính sách yêu cầu.
- [ ] JWT/session có expiry, refresh rotation, revoke và RBAC; giới hạn login.
- [ ] API chạy HTTPS, CORS allowlist, security headers, rate-limit và request ID.
- [ ] Provider URL qua allowlist/SSRF protection; không cho private IP hoặc URL có credential.
- [ ] API key nằm trong KMS/Vault hoặc OS keychain; không trả về API/log/telemetry/project.
- [ ] License key chỉ trả một lần, lưu hash/key material và audit mọi thao tác admin.
- [ ] Telemetry có consent, token, scrub PII, retention và quyền xóa.
- [ ] Asset bucket private, signed URL TTL ngắn, checksum/chữ ký OTA bắt buộc.
- [ ] Dependency, container image và code signing được scan; bật branch protection.

## Kiểm tra sau triển khai

- [ ] Thử token hết hạn, logout/revoke, quyền sai và replay request.
- [ ] Thử provider key sai, quota, timeout, endpoint không hợp lệ và không có fallback cloud ngoài consent.
- [ ] Thử upload file lớn, path traversal, telemetry payload lớn và webhook chậm.
- [ ] Kiểm tra audit trail, alert Telegram/Discord và backup restore.
