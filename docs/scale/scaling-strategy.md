# Chiến lược mở rộng

## Theo chiều ngang

- Python API stateless, chạy nhiều replica sau load balancer.
- Queue tách theo workload; worker scale độc lập và có concurrency riêng.
- Provider adapter chạy qua gateway để áp dụng quota, circuit breaker và cache
  capability; không để mỗi request tạo client/connection mới.
- Admin Portal và release asset phân phối qua CDN.

## Theo chiều dọc và tối ưu job

Ưu tiên tối ưu codec, preset, batch size, model và cache trước khi tăng máy.
Render engine chọn encoder theo probe runtime (Apple VideoToolbox, NVIDIA NVENC,
AMD AMF, CPU fallback). Mỗi job phải ghi duration, codec, engine, peak RAM/VRAM,
chi phí provider và thời gian chờ queue.

## Database và dữ liệu lớn

PostgreSQL giữ metadata, license, job state và audit; media/log raw đưa vào
object storage. Telemetry có thể partition theo ngày/tháng và archive sau
retention. Không dùng Redis làm nguồn sự thật cho trạng thái giao dịch.

## Kiểm soát chi phí cloud AI

- Mỗi khách có quota/ngân sách và cảnh báo usage.
- Hiển thị ước tính trước task; force cloud chỉ khi khách consent.
- Retry tính phí phải có idempotency; cache kết quả chỉ khi policy dữ liệu cho phép.
- BYOK mặc định tính usage theo provider của khách; managed provider cần quota
  và chargeback riêng.

## SLO cần chốt

| SLO | Mục tiêu ban đầu |
| --- | --- |
| API availability | `TBD` |
| API p95 latency (request đồng bộ) | `TBD` ms |
| License validation success | `TBD`% |
| Job queue wait p95 | `TBD` phút |
| OTA download success | `TBD`% |
| Telemetry ingest durability | `TBD`% |

Khi có dữ liệu production, cập nhật tier, autoscaling và SLO trong cùng một PR
có issue ID; không thay đổi ngưỡng trực tiếp trên production.
