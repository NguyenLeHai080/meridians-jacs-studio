# Product Backlog theo Scrum

## Vai trò Scrum

| Vai trò | Trách nhiệm |
| --- | --- |
| Product Owner | Chốt thị trường, package license, provider, pricing và ưu tiên backlog |
| Scrum Master | Gỡ blocker, bảo vệ Sprint Goal, theo dõi DoR/DoD và cải tiến quy trình |
| Tech Lead | Quyết định contract, security, cấu trúc core/module và chất lượng release |
| Developers | React Desktop/Admin, Python API/worker, Electron native, DevOps |
| QA | Test ma trận Windows/macOS, API contract, OTA, license và UAT |

## Product Goal

Khách hàng cài JACS Studio trên Windows hoặc macOS, gửi Device ID để nhận key,
tạo batch/scene job từ video và hoàn tất render qua local/cloud/hybrid mà không
phải cài lại khi có bản sửa lỗi được phát hành hợp lệ.

## Epics và user story ưu tiên

| Epic | Story | Acceptance criteria tóm tắt | Priority |
| --- | --- | --- | --- |
| E1 License | Là khách hàng, tôi xem/copy Device ID và kích hoạt bằng key | Validate đúng HWID/hạn/trạng thái; secret không xuất hiện trong log | P0 |
| E1 License | Là Admin, tôi tạo/khóa/gia hạn/reset HWID có audit | Key chỉ trả một lần; mọi reset có actor + lý do | P0 |
| E2 Batch | Là creator, tôi tạo nhiều job từ nhiều video | Mỗi job độc lập, có queue/progress/cancel/retry | P0 |
| E3 Analysis | Là creator, tôi phân tích video và tạo job theo scene | Có consent cloud, version model, sửa/chọn scene được | P0 |
| E4 Render | Là creator, tôi chọn local GPU/CPU/cloud/hybrid | Preflight báo engine thực, disk, cost/upload và fallback | P0 |
| E5 Provider | Là khách, tôi kết nối OpenAI/Gemini/provider tương thích bằng BYOK | API key secure, test connection, capability check trước job | P1 |
| E6 Telemetry | Là Dev, tôi nhận fatal incident không lộ dữ liệu nhạy cảm | Redaction, dedup, threshold alert và link issue | P1 |
| E7 OTA | Là khách, tôi cập nhật bản mới không cài lại | Verify signature/checksum, rollback test, release notes | P1 |
| E8 Settings | Là khách, tôi chọn workspace/cache/privacy/engine | Config versioned, migration và dùng đúng OS directory | P1 |

## Lộ trình Sprint đề xuất

| Sprint | Sprint Goal | Stories bắt buộc |
| --- | --- | --- |
| 1 | Khóa contract và desktop foundation | E1 UI activation, native typed bridge, config schema, API contract |
| 2 | License thật end-to-end | E1 API/admin audit, secure store, heartbeat, negative tests |
| 3 | Video intake và batch queue | E2 project/media catalog, local persisted queue, cancel/retry |
| 4 | Phân tích context và provider routing | E3 consent/scene result, E5 capability/usage/error mapping |
| 5 | Render native | E4 FFmpeg command builder, GPU probe, progress, artifact history |
| 6 | Vận hành và phát hành | E6 telemetry alert, E7 signed OTA, E8 settings migration, UAT |

## Definition of Ready

Một story vào Sprint chỉ khi có vấn đề/issue ID, wireflow, acceptance criteria,
API/IPC contract, quyền dữ liệu/consent, error code, test data và phụ thuộc
được ghi rõ. Story liên quan cloud AI bắt buộc chỉ rõ provider, capability, chi
phí và chính sách lưu/xóa dữ liệu.

## Definition of Done

- Code review qua PR có issue ID; không push/merge trực tiếp vào `staging`/`prod`.
- Unit, integration, contract và E2E liên quan đều xanh; không bỏ qua test lỗi.
- React typecheck/build; Python lint/test; desktop smoke test trên Windows và
  macOS target tương ứng.
- Không log key, token, video hoặc PII; có telemetry/error code và tài liệu cập
  nhật cho public behavior.
- Story có demo theo acceptance criteria và Product Owner xác nhận nếu thay đổi
  nghiệp vụ hoặc UX.
