# Phân tích tích hợp Narrator Studio vào JACS Studio

Ngày phân tích: 2026-09-02  
Phạm vi: `/Users/nguyenlehai/Downloads/Narrator Studio` và
`/Users/nguyenlehai/Downloads/meridians-jacs-studio`

## 1. Kết luận

Có thể tích hợp đầy đủ luồng chức năng của Narrator Studio vào JACS Studio,
nhưng không nên chép `Narrator Studio.exe`, các file `.pyc` hoặc toàn bộ thư mục
`_internal` vào dự án. Narrator Studio là ứng dụng Windows đã đóng gói bằng
PyInstaller; phần thực thi đó không phải module có thể import an toàn vào
Electron/macOS.

Phương án đúng là **port lại hành vi và pipeline của Narrator** vào kiến trúc
Electron + React + FFmpeg hiện có của JACS. JACS đã có nhiều nền tảng cần thiết,
nhưng bản hiện tại chưa đủ để cam kết tương đương Narrator ở mức production.

Không được đánh dấu bản phát hành là "đã đủ" cho đến khi toàn bộ tiêu chí ở mục
9 đạt trên macOS và Windows với video fixture, provider mock và provider thật
khi có credential.

## 2. Bằng chứng trạng thái hiện tại

### JACS Studio

- `pnpm build`: thành công.
- `pnpm test:native`: `57/57` test pass.
- Native vertical slice đã có: chọn file/URL, probe FFmpeg, scene detection,
  contextual analysis, script, voice local, subtitle, logo, audio mix, render,
  batch job và local persistence.
- Lỗi chạy đã tái hiện trong môi trường kiểm tra: `Port 5174 is already in use`.
  Đây là do một phiên Vite/Electron cũ đang giữ cổng, không phải lỗi thiếu
  Narrator. Cần đóng phiên cũ trước khi chạy lại `pnpm dev:electron`.

### Narrator Studio

Pipeline quan sát được từ gói Windows:

1. Nhận video local hoặc URL và tải/cache video.
2. Trích audio bằng FFmpeg.
3. Transcribe bằng Whisper, ưu tiên segment/word timestamp.
4. Gửi transcript và frame mẫu cho vision/chat model.
5. Tạo summary, script, fact-check và polishing.
6. Tạo TTS bằng `edge-tts`, fallback `gTTS`.
7. Render video dọc/ngang với subtitle, crop/background blur, nhạc và tiếng gốc.
8. Có chế độ cắt highlight dựa trên word-level Whisper timestamp.

## 3. Ma trận khả năng

| Chức năng Narrator | JACS hiện tại | Đánh giá tích hợp |
| --- | --- | --- |
| File local, URL, nhiều nguồn | Có | Tái sử dụng |
| Probe, trích frame, FFmpeg render | Có | Tái sử dụng renderer/IPC |
| Transcript có segment timestamp | Một phần | Cần kiểm thử gateway và fallback rõ ràng |
| Phân tích hình ảnh/context | Có | Cần harden prompt và payload consent |
| Summary và script theo ngữ cảnh | Có | Cần version/approval/audit đầy đủ |
| Story AIDA, hook, CTA | Có một phần | Cần đánh giá chất lượng và chỉnh từng đoạn |
| Voice local macOS/Windows | Có | Tái sử dụng voice worker và locale registry |
| Cloud TTS | Có một phần | Cần capability, cost và idempotency |
| Voice theo từng scene | Có một phần | Cần audio asset/timing thật |
| Word timestamp và waveform voice | Chưa đủ | P0 |
| Semantic scene matching | Chưa đủ; hiện lexical/temporal fallback | P0 |
| Cắt highlight word-level | Chưa đủ | P1 |
| Timeline reorder/trim/split | Có cơ bản | Cần preview và mapping ổn định |
| Subtitle/logo/nhạc/tiếng gốc | Có | Cần QA nâng cao |
| Auto-reframe theo chủ thể | Chưa đủ; hiện crop cố định | P1 |
| Retry/cancel/batch | Có cơ bản | Cần resume theo stage và concurrency |
| QA output | Có preflight/probe cơ bản | Cần clipping, safe-area, codec, checksum |

## 4. Kiến trúc tích hợp bắt buộc

Giữ boundary hiện có:

```text
React UI
  -> core/runtime typed facade
  -> preload IPC allowlist
  -> Electron main process
  -> analysis/TTS services + FFmpeg worker
  -> local project/output persistence
```

### Không thay đổi tùy tiện

- `provider-store.cjs`: tiếp tục lưu API key bằng OS secure storage; không dùng
  `config.json` plaintext của Narrator.
- `main.cjs` và renderer IPC: chỉ thêm DTO/handler có validation, không expose
  Node.js hoặc raw shell command cho React.
- FFmpeg command builder: tiếp tục allowlist path, codec, filter và cancellation.
- Job queue: giữ parent/child job, stage và progress; bổ sung checkpoint thay vì
  tạo một pipeline riêng song song.

### Các stage cần chuẩn hóa

```text
source_download
  -> probe
  -> extract_frames_audio
  -> transcribe
  -> analyze_context
  -> story_draft
  -> script_review
  -> synthesize_voice_segments
  -> semantic_scene_matching
  -> timeline_review
  -> render_preview
  -> render_final
  -> qa
  -> completed
```

Mỗi stage phải idempotent, có input/output manifest, có lỗi chuẩn hóa và có thể
retry từ stage gần nhất còn hợp lệ.

## 5. Data contract cần hoàn thiện

Không nên tiếp tục nhúng mọi thứ vào một JSON Job khi chuyển production. Cần
ID ổn định và version cho các entity sau:

```text
Project
  id, niche, audience, tone, languages, target_platforms, settings
SourceAsset
  id, checksum, local_path, source_url, duration, probe, proxy, thumbnails
TranscriptSegment
  id, start, end, text, speaker, confidence, words[]
StoryPlan
  id, version, hook, setup, build_up, climax, cta, status, approved_by
VoiceSegment
  id, scene_id, text, audio_path, audio_start, audio_end, words[], status
SceneMatch
  voice_segment_id, scene_id, source_start, source_end, score, reason,
  fallback_reason, needs_review
TimelineClip
  scene_id, source_asset_id, order, trim_in, trim_out, effects
RenderOutput
  stage, preview_path, output_path, checksum, metadata, qa_results
```

Các kiểu TypeScript tương ứng đã tồn tại một phần trong
`Tool/desktop-app/src/core/types.ts`; cần đồng bộ với API Python và persistence,
không tạo contract riêng cho Narrator.

## 6. Các hạng mục bắt buộc để đạt parity

### P0 - Không được bỏ qua

1. **Semantic scene matching**
   - Dùng embedding/vision adapter để xếp hạng cảnh theo ý nghĩa voice segment.
   - Trả `source_start`, `source_end`, `voice_start`, `voice_end`, score, reason.
   - Cảnh điểm thấp phải có `needs_review=true`, không tự chọn ngẫu nhiên.
   - Cho phép người dùng thay ứng viên trực tiếp trên timeline.

2. **Voice timing thật**
   - Worker trả duration audio thực tế và word/phrase timing khi engine hỗ trợ.
   - Nếu không có word timing, phải nêu rõ fallback và dùng cue theo trọng số chữ.
   - Duration voice phải được fit vào scene; không chỉ ước lượng `words / 2.8`.

3. **Script approval theo segment**
   - Người dùng duyệt StoryPlan và từng VoiceSegment.
   - Regenerate một đoạn không làm mất các đoạn đã duyệt.
   - Lưu version, model, prompt metadata và actor approval.

4. **Timeline mapping đúng**
   - Reorder, trim, split, scene replacement và undo/redo phải giữ liên kết với
     voice segment và subtitle.
   - Không render nếu có clip rỗng, mapping thiếu hoặc range vượt source duration.

5. **Render preview và QA**
   - Có preview encode nhẹ trước final.
   - Probe output: duration, stream, codec, audio presence, subtitle range,
     clipping và safe-area.
   - Output có checksum, manifest và metadata của voice/scene map.

6. **Resume/idempotency**
   - Retry provider/FFmpeg không tạo duplicate audio/output.
   - Parent chỉ hoàn tất khi toàn bộ child job và QA pass.
   - Đóng ứng dụng giữa chừng phải khôi phục được stage hợp lệ.

### P1 - Cần trước phát hành thương mại rộng

- Highlight cutter bằng Whisper word-level, chọn 4-8 đoạn và chỉnh keep/drop.
- Auto-reframe theo face/object tracking và safe-area.
- Subtitle karaoke/highlight, song ngữ, style editor và logo track.
- Preview timeline đồng bộ audio waveform thật.
- 4K preset, GPU probe rõ ràng và CPU fallback minh bạch.
- Cloud consent, payload preview, cost estimate, retention và redaction.
- Signed installer, code signing/notarization, rollback và test máy sạch.

## 7. Lộ trình đề xuất

| Giai đoạn | Kết quả bắt buộc |
| --- | --- |
| A. Contract | Chốt DTO, stage machine, manifest, fixture video và error codes |
| B. Narration | StoryPlan approval, VoiceSegment, local/cloud TTS, timing fallback |
| C. Matching | Embedding adapter, candidate review, scene replacement, score threshold |
| D. Timeline | Reorder/trim/split, subtitle/audio mapping, preview render |
| E. Release gate | QA probe, resume/idempotency, checksum, cross-platform UAT |

Không nên bắt đầu bằng việc thay toàn bộ app bằng code Narrator. Mỗi giai đoạn
phải giữ được luồng native hiện tại và có test hồi quy.

## 8. Rủi ro cần chấp thuận trước

- Transcript, frame, script và audio có thể được gửi tới provider cloud; UI phải
  hiển thị consent và loại payload trước khi upload.
- API key của Narrator nằm plaintext trong `config.json`; không được mang cơ chế
  đó sang JACS.
- Custom endpoint có thể chuyển dữ liệu qua proxy bên thứ ba; cần HTTPS,
  allowlist và chống SSRF.
- Whisper model/provider không đồng nhất; phải kiểm tra capability thực tế,
  không tin metadata quảng cáo.
- URL downloader có rủi ro rate-limit, bản quyền và điều khoản nền tảng.
- FFmpeg bundled phải được kiểm tra version/hash trong artifact phát hành.

## 9. Definition of Done - chỉ được coi là “đủ” khi

- Mỗi input có `SourceAsset`, checksum và probe metadata.
- Transcript có timestamp; nếu không có, UI nêu rõ đang chạy frame-only và không
  bịa lời thoại.
- StoryPlan và từng voice segment đã được duyệt trước khi render.
- Mỗi voice segment có audio asset, duration thực, mapping cảnh, score và reason.
- Match không chắc chắn đi vào review, không tự render cảnh không liên quan.
- Timeline preview khớp voice, cảnh, subtitle, logo, tỷ lệ và tiếng gốc.
- QA từ chối clip rỗng, range sai, subtitle tràn, audio clipping và duration sai.
- Parent job chỉ `completed` sau khi child jobs và QA đều pass.
- Retry/cancel/restart không làm mất script đã duyệt và không tạo output trùng.
- Output có checksum, manifest, metadata và thư mục riêng theo project/source.
- `pnpm build`, native tests, Python API tests và test fixture media đều pass.
- UAT thành công trên macOS Apple Silicon/Intel và Windows 10/11.

## 10. Kết luận triển khai

Việc tích hợp là khả thi và nên thực hiện trong JACS Studio hiện tại. JACS đã có
nền móng tốt hơn việc nhúng nguyên binary Narrator: secure provider storage,
typed IPC, local voice fallback, job queue và FFmpeg renderer đã tồn tại.

Tuy nhiên, **chưa thể tuyên bố đủ chức năng ngay hôm nay**. Ba blocker kỹ thuật
lớn nhất là semantic matching, timing/waveform voice thật và stage-resume/QA.
Sau khi hoàn thành các blocker P0 và Definition of Done, có thể phát hành bản
JACS có parity Narrator mà vẫn giữ được bảo mật, khả năng chạy đa nền tảng và
kiến trúc đang có.

## 11. Cách chạy kiểm tra hiện tại

## 12. Nhật ký triển khai

- Đã bổ sung resume job sau khi Electron khởi động lại, có loại trừ các trạng thái review.
- Đã chặn scene match có `needsReview` trước khi fan-out/render; Timeline cho phép thay cảnh và xác nhận để chạy tiếp.
- Đã đo duration narration từ file audio thực tế trước khi fit vào scene.
- Đã tạo SHA-256 checksum và `.manifest.json` cho mỗi output render; QA kiểm tra output probe, audio, duration, subtitle và voice.
- Native regression hiện tại: `60/60` test pass; production build thành công.

Các hạng mục còn cần kiểm chứng bằng fixture/provider thật trước khi phát hành thương mại gồm word-level timing từ mọi TTS engine, auto-reframe tracking, preview encode riêng và UAT macOS/Windows.

```bash
cd /Users/nguyenlehai/Downloads/meridians-jacs-studio
pnpm --dir Tool/desktop-app test:native
pnpm --dir Tool/desktop-app build
pnpm dev:electron
```

Nếu gặp `Port 5174 is already in use`, đóng phiên `vite`/Electron cũ đang chạy
rồi thử lại; không cần chép Narrator vào repo để xử lý lỗi này.
