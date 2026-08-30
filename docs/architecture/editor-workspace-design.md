# Editor Workspace Design

## Mục tiêu

Editor là màn hình làm việc chính của Desktop Tool. Mọi thao tác từ phân tích
video, chọn narrator, auto-reframe, tạo subtitle đến render đều phải nhìn thấy
trong một ngữ cảnh dự án; các module nghiệp vụ còn lại chỉ điều hướng hoặc mở
rộng luồng chuyên sâu.

## Bố cục module

```text
EditorWorkspace
├── ProjectBar         Tên dự án, trạng thái lưu, đồng bộ, render scene
├── Inspector          Narrator, ngôn ngữ, tone, thời lượng, toggle, tỉ lệ
├── PreviewStage       Original video và Auto-reframe preview
├── Transport          Play/pause, timecode, volume, fullscreen
├── Timeline           Video, AI voice, original audio, subtitle tracks
└── ActionBar          Scene đang chọn, phân tích lại, tạo job
```

`EditorWorkspace` chỉ quản lý state giao diện và phát command ra `core`;
không gọi trực tiếp database hoặc Electron IPC. Khi tạo job, command đi qua
`App.addJob`, lưu local queue trước rồi đồng bộ `POST /api/v1/client/jobs`.

## State và command

| State | Nguồn | Ý nghĩa |
| --- | --- | --- |
| `sceneId` | Editor local | Scene đang chọn trong timeline |
| `fields` | Editor local/project config | Narrator, language, gender, tone, duration |
| `settings` | Editor local/project config | Song ngữ, hook, nhạc nền |
| `jobs` | `core/runtime` + API | Queue render và trạng thái đồng bộ |
| `license` | Secure storage + heartbeat | Gating toàn bộ thao tác tạo job |

Các command chính:

1. `selectScene(sceneId)` cập nhật preview kép và scene summary.
2. `createSceneJob()` tạo job hybrid, giữ source và scene metadata để worker
   xử lý sau.
3. `openAnalysis()` chuyển sang module phân tích nhưng không làm mất project.
4. `openRender()` chuyển sang output manager để chọn preset và theo dõi render.

## Nguyên tắc mở rộng

- Component dùng lại đặt trong `Tool/desktop-app/src/modules/editor` hoặc
  `src/shared`, type thuần đặt trong `editor.types.ts`.
- Provider AI, FFmpeg và GPU engine chỉ được gọi từ backend/native service;
  renderer không giữ API key và không tự thực thi process hệ điều hành.
- Preview hiện dùng lớp hiển thị an toàn khi chưa có media pipeline thật; khi
  worker hoàn thiện chỉ thay adapter dữ liệu, không thay đổi contract UI.
- Timeline phải giữ khả năng scroll ngang trên màn hình nhỏ và không làm vỡ
  inspector ở macOS/Windows.
