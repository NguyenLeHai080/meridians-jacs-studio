# Kế hoạch capacity

## Giả định baseline

Các số dưới đây là giả định lập kế hoạch, cần thay bằng số đo sau beta:

| Chỉ số | MVP | Growth | Scale |
| --- | ---: | ---: | ---: |
| License đang hoạt động | 100 | 1.000 | 10.000 |
| Desktop online đồng thời | 20 | 200 | 2.000 |
| Job phân tích/render mỗi ngày | 100 | 2.000 | 20.000 |
| API request trung bình | 2 RPS | 20 RPS | 100 RPS |
| Burst cần chịu | 10 RPS | 100 RPS | 500 RPS |
| Telemetry event mỗi ngày | 1.000 | 20.000 | 200.000 |
| Asset lưu mới mỗi ngày | 20 GB | 200 GB | 2 TB |

Giả định media trung bình, tỷ lệ cloud/remote render và retention cần chốt:
video đầu vào `TBD` GB, output `TBD` GB, retention `TBD` ngày.

## Sizing hạ tầng tham khảo

| Thành phần | MVP | Growth | Scale |
| --- | --- | --- | --- |
| Python API | 2 replica x 2 vCPU/4 GB | 3-6 replica x 4 vCPU/8 GB | 6+ replica x 8 vCPU/16 GB |
| PostgreSQL | 2 vCPU/8 GB, 100 GB SSD | Primary 4 vCPU/16 GB + read replica | HA 8-16 vCPU/32-64 GB, partition/replica |
| Redis | 1 GB | 4 GB + replica | HA 16 GB, tách queue/cache |
| CPU workers | 2 worker, concurrency thấp | 4-16 worker autoscale | 20-100 worker theo queue |
| GPU workers | 0-1 GPU tùy job | 1-2 GPU | Pool GPU autoscale theo loại encoder/model |
| Object storage | 1 TB | 10 TB | 100 TB+ theo retention |

Đây là sizing khởi điểm cho cloud; benchmark thực tế phải dùng codec, độ phân
giải, thời lượng video, model AI và encoder GPU giống production.

## Công thức đo

```text
worker_concurrency = ceil((jobs_per_hour * average_runtime_minutes)
                           / (60 * target_utilization))

storage_required = daily_asset_gb * retention_days * replication_factor

api_replicas = ceil(peak_rps / sustainable_rps_per_replica)
```

Mục tiêu `target_utilization`, sustainable RPS, replication và retention là
`TBD`; không đặt CPU 100% vì cần dư tải cho burst và retry.

## Ngưỡng autoscaling đề xuất

- API scale out khi CPU > 65% trong 5 phút hoặc p95 latency vượt 500 ms; scale in
  chậm để tránh dao động.
- Worker scale theo queue age và độ dài queue: cảnh báo khi job chờ > 2 phút,
  scale khi queue age > 5 phút.
- GPU scale theo VRAM/utilization và loại job; không dồn CPU job vào GPU worker.
- PostgreSQL scale trước khi đạt 70% storage/connection; dùng pooler và query
  timeout thay vì tăng connection vô hạn.
- Object storage cảnh báo theo tốc độ tăng trưởng và chi phí egress, không chỉ
  theo dung lượng.

## Load test bắt buộc

1. API auth/license: burst 10x baseline, p95/p99 và tỷ lệ lỗi.
2. Provider gateway: timeout, quota, 429, circuit breaker và idempotency.
3. Render: 50-100 video liên tục, nhiều độ phân giải, thiếu VRAM và cancel.
4. Telemetry: duplicate event, payload lớn, flood fatal và webhook chậm.
5. OTA: nhiều client check đồng thời, download lỗi giữa chừng và rollback.
