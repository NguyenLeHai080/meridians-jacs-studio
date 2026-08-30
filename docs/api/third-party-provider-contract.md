# Hợp đồng tích hợp API bên thứ ba

## Provider profile

```json
{
  "name": "Khach OpenAI",
  "provider_type": "openai",
  "base_url": "https://api.openai.com/v1",
  "model": "<model-do-khach-chon>",
  "capabilities": ["analysis", "vision", "tts"],
  "execution_defaults": { "analysis": "cloud", "render": "local-gpu" }
}
```

Request tạo/cập nhật profile nhận `api_key` qua HTTPS nhưng response không bao
giờ trả lại trường này. Response chỉ có `has_api_key: true` và masked hint. API
phải validate schema URL, provider type, quyền chủ sở hữu và capability.

## Endpoint nội bộ đề xuất

| Endpoint | Mục đích |
| --- | --- |
| `POST /api/v1/ai-providers` | Tạo profile BYOK/managed provider |
| `POST /api/v1/ai-providers/{id}/test` | Kiểm tra kết nối, không lưu payload nhạy cảm |
| `GET /api/v1/ai-providers/{id}/capabilities` | Lấy capability đã chuẩn hóa |
| `PATCH /api/v1/ai-providers/{id}` | Sửa profile hoặc rotate API key |
| `DELETE /api/v1/ai-providers/{id}` | Xóa profile và secret liên quan |
| `POST /api/v1/jobs` | Tạo job có provider profile và execution mode |
| `POST /api/v1/projects` | Tạo metadata project trước khi tạo job |
| `POST /api/v1/render-jobs` | Tạo remote render job khi mode cho phép |
| `GET /api/v1/render-jobs/{id}` | Xem tiến độ và kết quả remote render |
| `POST /api/v1/render-jobs/{id}/cancel` | Hủy remote render job |

`POST /api/v1/ai-providers/{id}/test` thực hiện request tối thiểu với timeout cấu
hình trong `JACS_PROVIDER_TIMEOUT_SECONDS` và trả về trạng thái chuẩn hóa:
`reachable`, `invalid_credentials`, `vendor_error`, `unreachable` hoặc
`unsupported`, kèm `http_status`, `latency_ms`, `detail` và capability. Adapter
đã hỗ trợ OpenAI, Gemini, Anthropic và OpenAI-compatible; `custom` phải có
adapter riêng để tránh gọi URL tùy ý.

`api_key`, prompt, raw media, authorization header và URL ký không được đưa vào
telemetry. Mọi endpoint tạo tác vụ tính phí cần idempotency key.

## Error codes

| Code | Ý nghĩa | Hành động UI |
| --- | --- | --- |
| `PROVIDER_AUTH_FAILED` | Key không hợp lệ hoặc hết hạn | Yêu cầu thay key |
| `PROVIDER_CAPABILITY_UNSUPPORTED` | Model không có chức năng đã chọn | Chọn model/profile khác |
| `PROVIDER_QUOTA_EXCEEDED` | Hết quota hoặc billing bị chặn | Thông báo khách và không retry tự động |
| `PROVIDER_TIMEOUT` | Vendor không phản hồi đúng hạn | Cho phép retry có xác nhận |
| `LOCAL_GPU_UNAVAILABLE` | Không có GPU/driver/VRAM phù hợp | Chọn CPU hoặc remote render |
| `REMOTE_RENDER_UPLOAD_FAILED` | Không upload được asset | Retry upload hoặc hủy job |
