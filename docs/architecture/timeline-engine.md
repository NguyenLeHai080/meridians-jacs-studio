# Timeline Engine

Timeline của Desktop Tool được xử lý bằng module thuần trong `FE/desktop-app/src/core/timeline.ts`. Module không phụ thuộc React, Electron hay FFmpeg nên có thể tái sử dụng cho editor, batch queue và test.

## Mô hình

Mỗi clip có `sceneId`, `order`, `trimIn`, `trimOut` và tùy chọn `sourceSceneId` khi một scene được tách thành nhiều đoạn. Trạng thái được lưu trong `Job.timelineClips` và đồng bộ lên API client.

## Thao tác được hỗ trợ

- Chọn nhiều scene và đổi thứ tự.
- Cắt đầu/cuối clip theo giây.
- Tách clip tại vị trí giữa thành hai clip độc lập.
- Hoàn tác/làm lại bằng history trong phiên làm việc.
- Tự chuẩn hóa order trước khi lưu để không tạo khoảng trống hoặc thứ tự trùng.

Editor chỉ phát command qua `onUpdateJob`; việc lưu local queue và đồng bộ PostgreSQL/API do lớp App/runtime đảm nhiệm.
