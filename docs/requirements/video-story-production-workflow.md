# Đặc tả workflow: Video dài thành video ngắn có kể chuyện

## 1. Mục tiêu sản phẩm

JACS Studio biến một video gốc dài thành một hoặc nhiều video ngắn có khả năng
giữ người xem: hiểu đúng nội dung, viết lại thành lời kể tự nhiên theo đúng
ngách, tạo voice, chọn đúng cảnh trong video gốc để khớp với voice, rồi xuất
bản hoàn chỉnh có phụ đề và logo.

Nguyên tắc quan trọng nhất: AI được phép chọn và sắp xếp các đoạn có trong
video gốc, nhưng không được dựng cảnh không tồn tại hoặc thêm dữ kiện không có
trong transcript/frame. Voice và hình phải cùng nói về một ý tại cùng một mốc
thời gian.

## 2. Đầu vào và đầu ra

### Đầu vào

- Một video dài từ file local hoặc URL HTTP(S) (TikTok, CDN, MP4...).
- Ngách nội dung: giáo dục, review, bán hàng, podcast, giải trí, tin tức...
- Phong cách kể: chuyên gia, gần gũi, kịch tính, hài hước, documentary...
- Ngôn ngữ, giọng nam/nữ, voice preset và tỷ lệ đầu ra.
- Tuỳ chọn giữ tiếng gốc, nhạc nền, phụ đề, logo, watermark và số lượng output.

### Đầu ra

- Kịch bản có cấu trúc: hook, các ý chính, chi tiết theo scene, kết luận/CTA.
- Audio voice-over được tạo từ đúng kịch bản đã duyệt.
- Danh sách clip nguồn với `start`, `end`, lý do chọn và điểm khớp voice.
- Video hoàn chỉnh: cảnh gốc đã cắt, voice, tiếng gốc/nhạc nền, phụ đề và logo.
- Nhiều phiên bản theo ngôn ngữ, tỷ lệ hoặc nền tảng; mỗi phiên bản là một job.

## 3. Workflow chuẩn

### Bước 0 - Tạo project

Người dùng tạo project, đặt tên, chọn ngách, phong cách kể, ngôn ngữ và nền
tảng đích. Các thông tin này trở thành context dùng xuyên suốt mọi job.

### Bước 1 - Nạp và chuẩn hoá video

1. Chọn một hoặc nhiều file/video URL.
2. Tải URL vào cache local, probe duration, kích thước, FPS và audio stream.
3. Tạo proxy/thumbnail nếu video quá lớn; giữ video gốc bất biến.
4. Lưu `source_asset` và checksum để retry không tải lại không cần thiết.

### Bước 2 - Phân tích nội dung video dài

Pipeline trích transcript (nếu provider hỗ trợ), frame timeline và tín hiệu âm
thanh. Kết quả phải gồm:

- `summary`: tóm tắt một đoạn dễ hiểu.
- `topics`: các chủ đề/ý chính theo thứ tự xuất hiện.
- `scenes`: mốc `start/end`, chủ thể, hành động, bối cảnh, cảm xúc và độ tin cậy.
- `hook_candidates`: các đoạn 3-5 giây đầu hoặc cao trào có khả năng giữ view.
- `quotes/facts`: câu nói và dữ kiện có thể kiểm chứng từ transcript/frame.
- `safety_notes`: phần không rõ, cần bỏ hoặc cần người dùng duyệt.

Nếu không có transcript, frame timeline là nguồn sự thật tối thiểu. AI không
được tạo lời thoại, tên riêng, số liệu hoặc sự kiện chỉ dựa trên suy đoán.

### Bước 3 - Lập dàn ý theo đúng ngách

AI chuyển `topics` thành dàn ý có chủ đích giữ view:

1. Hook nêu vấn đề/lợi ích trong vài giây đầu.
2. Bối cảnh tối thiểu để người mới vẫn hiểu.
3. Các ý chính, mỗi ý có bằng chứng/cảnh nguồn.
4. Nhịp chuyển ý và cao trào; loại bỏ đoạn lặp, lan man.
5. Kết luận hoặc CTA phù hợp nền tảng.

Dàn ý phải ghi rõ `target_duration`, `audience`, `tone`, `claim_source` và mức
độ chắc chắn. Người dùng có thể sửa dàn ý trước khi tạo voice.

### Bước 4 - Viết và duyệt kịch bản kể chuyện

Từ dàn ý, AI viết `voice_script` tự nhiên, đúng ngôn ngữ và phong cách. Mỗi
đoạn script phải liên kết với một hoặc nhiều `scene_id`; không viết một bài
tóm tắt chung rồi cắt cảnh ngẫu nhiên.

Màn hình cần cho phép sửa text, regenerate một đoạn, khoá câu đã duyệt và xem
ước tính thời lượng (khoảng 2-3,5 từ/giây tuỳ ngôn ngữ). Có thể tạo nhiều bản
script để so sánh hook và điểm dự đoán giữ chân.

### Bước 5 - Chuyển text thành voice

1. Chọn voice pack/locale/gender và tốc độ đọc.
2. Tạo audio theo từng đoạn script để có thể kéo giãn, thay câu hoặc retry.
3. Gắn `audio_start/audio_end` và waveform vào timeline.
4. Cho phép nghe thử toàn bài hoặc từng scene.

API TTS cloud là tuỳ chọn; voice worker local là fallback. API key không đi qua
renderer và không được gửi vào worker local.

### Bước 6 - Nhặt cảnh từ chính video gốc theo voice

Đây là bước bắt buộc để voice và hình khớp nhau. Với mỗi đoạn voice, AI phải:

- Tìm một hoặc nhiều khoảng thời gian trong **video gốc** phù hợp với ý đang đọc.
- Ưu tiên cảnh có hành động/chủ thể khớp trực tiếp, sau đó mới dùng cảnh minh hoạ.
- Không lấy frame ngoài khoảng `start/end` của video gốc và không bịa cảnh.
- Trả về `source_start`, `source_end`, `voice_start`, `voice_end`, `match_score`,
  `reason` và `fallback_reason` nếu chỉ tìm được cảnh gần đúng.
- Cắt dư 0,2-0,5 giây ở đầu/cuối để tránh jump cut; giữ thứ tự kể chuyện.

Nếu một câu voice dài hơn cảnh phù hợp, chia câu hoặc ghép nhiều cảnh nguồn.
Nếu không có cảnh kiểm chứng, đánh dấu `needs_review` và yêu cầu người dùng
chọn lại thay vì tự động dùng footage không liên quan.

### Bước 7 - Dựng timeline và tự động reframe

Timeline có các track: `video_source`, `voice`, `original_audio`, `music`,
`subtitle`, `logo`. Người dùng xem song song video gốc và preview theo tỷ lệ
9:16/1:1/16:9. Auto-reframe được phép crop/pan/track chủ thể nhưng không thay
đổi nội dung cảnh.

### Bước 8 - Phụ đề và logo

- Tạo phụ đề từ voice đã chốt, ưu tiên word/phrase timing của audio.
- Hỗ trợ style, vị trí an toàn, màu, font, highlight từ khoá và song ngữ.
- Logo có file, vị trí, kích thước, opacity, margin safe-area và bật/tắt theo
  output. Logo phải nằm trên track riêng để preview đúng kết quả.

### Bước 9 - Render, kiểm tra và xuất bản

1. Render preview nhẹ để người dùng duyệt sync voice/cảnh.
2. Chạy kiểm tra tự động: không clip rỗng, không vượt duration, phụ đề không
   tràn safe-area, audio không clipping, logo đúng vị trí.
3. Render final bằng FFmpeg/GPU; lưu output, checksum, metadata và log.
4. Tạo hàng loạt theo ngôn ngữ/tỷ lệ/nền tảng, mỗi biến thể là một child job.

## 4. Trạng thái job

`queued` → `downloading` → `probing` → `analyzing` → `outlining` →
`script_review` → `generating_voice` → `matching_scenes` → `timeline_review` →
`rendering` → `completed` hoặc `failed/cancelled`.

Mỗi trạng thái phải có progress, log, retry an toàn và khả năng mở lại đúng
scene đang lỗi. Không đánh dấu hoàn tất nếu voice hoặc scene mapping còn thiếu.

## 5. Cấu trúc menu/module đề xuất

- **Tổng quan**: KPI, project gần đây, cảnh báo chất lượng và job đang chạy.
- **Nguồn video**: project, asset, upload/URL, metadata và proxy.
- **Phân tích AI**: transcript, frame timeline, chủ đề, hook, fact/safety notes.
- **Kịch bản & Voice**: dàn ý, editor text, voice preset, nghe thử và duyệt.
- **Chọn cảnh & Timeline**: mapping voice-scene, preview gốc/reframe, chỉnh clip.
- **Phụ đề & Thương hiệu**: subtitle style, logo, watermark, safe-area.
- **Tạo hàng loạt**: ngôn ngữ, tỷ lệ, nền tảng, preset và số lượng child job.
- **Render & Xuất bản**: queue, preview, final output, mở thư mục và lịch sử.
- **License & Thiết bị / Cài đặt**: provider, engine, cache, cập nhật và bảo mật.

## 6. Yêu cầu UI/UX

- Menu trái phân nhóm `WORKFLOW`, `OUTPUT`, `SYSTEM`; mỗi mục có icon và hint.
- Màn hình nhỏ chuyển menu thành thanh cuộn ngang hoặc drawer; không cắt nội
  dung form/timeline.
- Dùng Tailwind utility cho layout, spacing và breakpoint; component riêng cho
  card, field, stepper, badge, empty state và pagination.
- Icon dùng `react-bootstrap-icons`, có tooltip/title cho nút icon-only.
- Danh sách job, asset, scene và output có phân trang, page size 10/25/50,
  giữ bộ lọc khi chuyển trang và hiển thị tổng số bản ghi.
- Mọi bước dài có step indicator, autosave trạng thái và nút `Quay lại`, `Lưu`
  hoặc `Chạy lại` rõ ràng.

## 7. Tiêu chí nghiệm thu nội dung

- Kịch bản đọc lên nghe như người kể chuyện đúng ngách, không phải bản chép
  transcript hoặc danh sách bullet.
- Mỗi câu/đoạn voice có source scene và mốc thời gian từ video gốc.
- Không có cảnh minh hoạ không tồn tại trong source; mapping thiếu phải báo rõ.
- Preview cho thấy voice, cảnh, phụ đề và logo khớp trước khi render final.
- Một video dài có thể tạo nhiều output mà không phân tích/tải lại cùng asset.
- Job lỗi có log nguyên nhân và retry từ bước gần nhất còn hợp lệ.

## 8. Dữ liệu tối thiểu nên bổ sung

```text
Project { niche, style, audience, targetPlatforms, defaults }
SourceAsset { path, url, checksum, duration, proxyPath, analysisId }
StoryPlan { topics, hookCandidates, outline, targetDuration, approvedAt }
VoiceSegment { id, text, start, end, audioPath, sceneIds, status }
SceneMatch { voiceSegmentId, sourceStart, sourceEnd, score, reason, needsReview }
BrandPreset { subtitleStyle, logoPath, logoPosition, logoOpacity, safeArea }
OutputVariant { language, aspectRatio, platform, jobId, outputPath }
```
