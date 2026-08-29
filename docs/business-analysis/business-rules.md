# Quy tắc nghiệp vụ

## License

| Mã | Quy tắc |
| --- | --- |
| LIC-01 | License có trạng thái `active`, `blocked`, `expired` hoặc `revoked`. |
| LIC-02 | Chỉ `active` và chưa quá hạn mới được dùng tính năng có kiểm tra license. |
| LIC-03 | Một license mặc định gắn một HWID; reset HWID phải lưu audit log và lý do. |
| LIC-04 | Gói license quyết định ngày hết hạn, job/ngày và quyền dùng AI premium. |
| LIC-05 | Key hiển thị một lần khi tạo; server chỉ lưu hash/key material bảo vệ. |
| LIC-06 | Không dùng RSA-256: RSA tối thiểu 2048-bit hoặc ưu tiên Ed25519 để ký dữ liệu. |

## Telemetry

| Mã | Quy tắc |
| --- | --- |
| TEL-01 | Chỉ gửi telemetry theo chính sách đồng ý và thông báo quyền riêng tư. |
| TEL-02 | Không gửi access token, license key thô, API key AI, nội dung video hoặc PII không cần thiết. |
| TEL-03 | `fatal` gửi cảnh báo ngay; `error` cùng fingerprint vượt ngưỡng trong khoảng thời gian xác định cũng cảnh báo. Ngưỡng: `TBD`. |
| TEL-04 | Log có thời hạn lưu trữ và quyền truy cập theo vai trò. Thời hạn: `TBD`. |

## OTA và render

| Mã | Quy tắc |
| --- | --- |
| REL-01 | Client chỉ cài update có manifest hợp lệ, chữ ký hợp lệ và checksum khớp. |
| REL-02 | Force update chỉ áp dụng cho lỗi bảo mật/không tương thích; cần nêu lý do trong release notes. |
| REN-01 | Job render có trạng thái `queued`, `running`, `completed`, `failed`, `cancelled`. |
| REN-02 | Hủy job không xóa project nguồn; tệp tạm phải được dọn theo chính sách. |
