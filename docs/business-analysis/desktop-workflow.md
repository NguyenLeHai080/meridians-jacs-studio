# Mô hình nghiệp vụ Desktop Tool

## Mục tiêu sản phẩm

JACS Studio là công cụ desktop cho người làm nội dung video trên macOS và
Windows. Sản phẩm không chỉ là một trình render: nó tổ chức toàn bộ luồng từ
footage thô đến video xuất bản, đồng thời cho phép khách hàng lựa chọn phần
việc chạy tại máy, qua AI cloud hoặc theo mô hình hybrid.

ReactJS là lớp giao diện của Desktop Tool và Admin Portal. Dịch vụ backend là
Python/FastAPI; ReactJS không phù hợp làm backend vì không xử lý được hàng đợi
render, tích hợp worker và nghiệp vụ server an toàn theo kiến trúc hiện tại.

## Các menu và giá trị mang lại

| Menu | Người dùng làm gì | Kết quả cần có |
| --- | --- | --- |
| Tổng quan | Xem queue, engine, insight và hoạt động gần đây | Biết ngay job nào cần xử lý hoặc đang lỗi |
| Tạo job hàng loạt | Chọn nhiều file và áp dụng cùng preset | Mỗi file tạo một job độc lập, có thể retry/hủy riêng |
| Phân tích video | Chọn một video, chạy AI context analysis | Scene, hook, chủ thể, transcript, gợi ý crop/subtitle |
| Render & xuất bản | Chọn preset và theo dõi FFmpeg/local-cloud render | Artifact có checksum, đường dẫn output và lịch sử render |
| License & thiết bị | Sao chép HWID, nhập key, kiểm tra trạng thái | Tool chỉ hoạt động khi license còn hiệu lực trên đúng máy |
| Cài đặt tool | Chọn thư mục project/cache, provider, telemetry, update, engine | Cấu hình được lưu cục bộ, secret được lưu secure storage |

## Luồng chính: video thành job

```text
Chọn video local
  -> tạo Project + Media Asset local
  -> chọn preset (analysis, subtitle, reframe, render)
  -> chọn execution mode và provider
  -> preflight (license, disk, GPU, capability, consent)
  -> tạo một hoặc nhiều Job
  -> worker local/cloud chạy, phát progress
  -> output + metadata + log được lưu
```

### Tạo job hàng loạt

1. Khách chọn một hoặc nhiều video trong thư mục project.
2. Khách chọn preset; mỗi tùy chọn phải hiển thị rõ AI nào được gọi, có gửi
   media ra ngoài hay không, engine render và ước lượng chi phí/thời gian.
3. Hệ thống tạo một `Batch` và nhiều `Job` con. Một job thất bại không được làm
   hỏng các job khác trong batch.
4. Local queue giới hạn đồng thời theo CPU/GPU/RAM; cloud queue bị giới hạn theo
   license, quota provider và ngân sách đã đặt.
5. Khách có thể hủy job đang chờ/running; file nguồn không bị xóa. Tệp tạm của
   job bị hủy được dọn theo chính sách cache.

### Phân tích video và tạo job theo scene

1. Tool tạo proxy/thumbnail local trước; chỉ gửi đoạn media cần thiết khi khách
   chọn cloud AI và đã đồng ý truyền dữ liệu.
2. Phân tích trả về transcript, cảnh, speaker, nhịp, hook, đối tượng, vùng an
   toàn crop và confidence. Mỗi kết quả có model/provider/version để truy vết.
3. Khách có thể chọn từng scene hoặc toàn bộ video để tạo job dựng riêng. Job
   snapshot cấu hình tại lúc tạo, không tham chiếu API key thô.
4. Kết quả AI chỉ là gợi ý: người dùng luôn có quyền sửa, bỏ qua hoặc không gửi
   bất kỳ cảnh nào vào render cloud.

## Luồng license, HWID và hỗ trợ khách hàng

```text
Cài Tool -> Tool tạo Device ID/HWID ổn định -> khách gửi ID cho Admin
  -> Admin tạo license, hạn dùng, quota và bind HWID
  -> khách nhập key trong Tool -> API validate key + HWID + trạng thái
  -> Tool lưu material cục bộ trong secure storage -> heartbeat định kỳ
```

- Tool phải hiển thị Device ID để copy; chỉ `hwid_hash` được đính kèm telemetry.
- Admin chỉ xem key ở thời điểm tạo. Sau đó server chỉ lưu key hash và key hint.
- Khi khách đổi máy, Support xác minh thông tin rồi dùng chức năng reset HWID;
  thao tác bắt buộc có lý do, actor và audit log.
- Nếu offline, Tool chỉ được chạy trong `offline grace period` đã ký trong policy
  license (`TBD`); hết thời gian phải xác thực lại trước khi tạo job mới.
- License bị `blocked`, `revoked` hoặc `expired` phải chặn job mới. Không tự xóa
  project local hoặc output của khách chỉ vì license bị khóa.

## Cập nhật tự động

1. Developer sửa lỗi qua branch/PR, build và kiểm thử tại staging.
2. Release Manager publish manifest đã ký cho Windows/macOS ở kênh `beta` hoặc
   `stable`; manifest có version, SHA-512, chữ ký, rollout và release notes.
3. Tool kiểm tra update khi khởi động và theo lịch người dùng bật. Tool tải asset
   mới, kiểm checksum/chữ ký rồi hiển thị nút cập nhật; không bắt khách gỡ app.
4. `force update` chỉ dùng cho lỗi bảo mật hoặc incompatibility đã được duyệt;
   phải hiển thị lý do, khả năng rollback và ảnh hưởng job đang chạy.

## Telemetry, log và dữ liệu local

| Loại dữ liệu | Vị trí | Quy tắc |
| --- | --- | --- |
| Project, proxy, output, cache | Thư mục khách chọn trên máy | Có dung lượng, chính sách dọn cache và nút mở thư mục |
| License material, API key BYOK | Keychain macOS / Credential Manager Windows | Không để trong React state, localStorage, URL hay log |
| Cấu hình không bí mật | File config versioned ở app-data directory | Có schema/version/migration và backup cục bộ |
| Error telemetry đã redaction | Python API/PostgreSQL | Không có video, key, token hoặc PII không cần thiết |

Lỗi `fatal`, hoặc lỗi cùng fingerprint vượt ngưỡng, phải tạo incident và gửi
webhook Telegram/Discord cho Dev/Admin. Mọi telemetry cần consent và có nút tắt
trừ telemetry tối thiểu cần thiết cho security/license, nội dung phải được nêu
rõ trong chính sách quyền riêng tư.

## Tiêu chí nghiệm thu cấp nghiệp vụ

- Khách có thể tạo một batch từ nhiều video; trạng thái từng job hiển thị riêng.
- Khách có thể tạo ít nhất một job từ scene do AI phân tích.
- Tool chưa kích hoạt chỉ xem được Device ID/activation/settings cơ bản; không
  được chạy feature cần license.
- Key sai, HWID khác, hết hạn hoặc bị khóa trả lỗi dễ hiểu và có mã cho Support.
- Update hợp lệ cài được không cần gỡ app; update không có chữ ký/checksum đúng
  phải bị từ chối.
- Khách có thể xác định rõ tác vụ nào chạy local GPU/CPU, cloud hoặc hybrid.
