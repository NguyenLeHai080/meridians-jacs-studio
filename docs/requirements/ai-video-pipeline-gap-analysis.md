# Phân tích mức đáp ứng AI Video Pipeline

## 1. Kết luận điều hành

Tool JACS Studio hiện đã có một **vertical slice native chạy được** trên
Electron: nhận file local, nhận URL, probe video bằng FFmpeg, phát hiện scene,
gọi provider AI tùy chọn, tạo voice local trên macOS/Windows, render FFmpeg,
phụ đề/logo, batch queue, lưu job cục bộ và cập nhật OTA.

Tuy nhiên, tool **chưa đáp ứng đầy đủ proposal để nghiệm thu production**. Các
blocker P0 đã được triển khai ở mức native/offline: transcript được chuẩn hóa
thành segment/word timestamp khi gateway trả về verbose JSON, story plan AIDA có
trạng thái duyệt, matcher có điểm/reason/review và queue có gate `script_review`.
Các phần còn thiếu để đạt production là embedding matcher thật, waveform/word
timing của audio đã render, timeline chỉnh sửa sâu và preflight QA đầy đủ.

Vì vậy trạng thái hiện tại là:

| Mức | Ý nghĩa | Đánh giá |
| --- | --- | --- |
| Đã có | Có thể chạy demo hoặc dùng cho luồng cơ bản | Nhập video, scene split, voice local, render, batch, license/provider cơ bản |
| Một phần | Có code nhưng chưa đủ tiêu chí nghiệp vụ hoặc chưa đủ độ tin cậy | Phân tích context, story script, timeline, reframe, subtitle/branding, OTA, telemetry |
| Còn thiếu | Chưa có hoặc chưa đủ để cam kết với khách | Embedding semantic matching, waveform/word timing audio thật, QA media nâng cao, resume theo stage, dữ liệu dự án bền vững |

Không nên giới thiệu phiên bản hiện tại là hệ thống tự động “khớp cảnh theo
giọng đọc” hoàn chỉnh; nên mô tả là **scene-based video production với AI
contextual script và voice local** cho đến khi hoàn thành các P0 dưới đây.

## 2. Phạm vi và bằng chứng kiểm tra

- Mã nguồn đối chiếu: `Tool/desktop-app` (React/TypeScript + Electron),
  `BE/api-server` (Python) và tài liệu trong `docs/requirements`.
- Phiên bản package desktop hiện tại: `0.3.15`.
- Các kiểm tra nền tảng đã có trong báo cáo bàn giao: build React/Electron,
  native test, probe/render FFmpeg, persistence job, provider store, license và
  artifact macOS/Windows.
- Các kết luận bên dưới đánh giá **khả năng nghiệp vụ**, không suy luận rằng
  một test build thành công đồng nghĩa với chất lượng nội dung AI đã đạt UAT.

## 3. Ma trận đối chiếu proposal

### 3.1. Bước 1 - Nạp và phân tích video gốc

| Hạng mục proposal | Hiện trạng | Bằng chứng | Phần còn thiếu / điều kiện đạt |
| --- | --- | --- | --- |
| Chọn nhiều file local | Đã có | `BatchJobsPage.tsx`, `runtime.pickVideos` | Cần kiểm thử file lớn, file trùng và quyền đọc file trên cả hai OS |
| Nhập URL HTTP(S)/TikTok | Một phần | `main.cjs` có resolver, cache và retry | Cần danh sách domain được phép, checksum, retry policy và thông báo bản quyền/consent |
| Probe duration, kích thước, audio | Đã có | `probeVideoFile()` trong `main.cjs` | Cần lưu metadata bền vững trong `SourceAsset` thay vì chỉ giữ trên job |
| Cache/proxy không tải lại | Một phần | Cache URL và merge nhiều video đã có | Chưa có checksum asset, proxy/thumbnail chuẩn hóa và cache kết quả phân tích dùng lại |
| Transcript có timestamp | Một phần | `transcribeVideo()` yêu cầu `verbose_json`, segment + word granularity; `AnalysisResult.transcriptSegments` lưu cấu trúc | Cần kiểm thử gateway thật, diarization và fallback UI rõ ràng khi chỉ trả text |
| Frame timeline | Một phần | Trích frame local và gửi vision khi capability cho phép | Cần frame index, checksum, embedding/label và lưu lại để matching/review |
| Phân tích audio/speaker/emotion | Còn thiếu | Chưa có entity hoặc API kết quả tương ứng | Bổ sung speaker diarization, nhịp, cảm xúc và độ tin cậy |

### 3.2. Bước 2 - Storytelling và kịch bản AIDA

| Hạng mục proposal | Hiện trạng | Bằng chứng | Phần còn thiếu / điều kiện đạt |
| --- | --- | --- | --- |
| Tạo summary và voice script | Một phần | `AnalysisResult.voiceScript`, prompt contextual trong `main.cjs` | Cần lưu version, model, prompt, nguồn claim và người duyệt |
| Hook 0-3 giây | Một phần | Có tùy chọn `emphasizeHook`/highlight | Chưa có `hook_candidates` có timestamp, điểm và lý do |
| Build-up, climax, CTA | Một phần | `StoryPlan` có hook/setup/build-up/climax/CTA và hiển thị trên Story page | Cần đánh giá chất lượng nội dung và version/audit phía backend |
| Tone/ngách/audience/platform | Một phần | Có tone/ngôn ngữ ở UI editor | Chưa truyền context đầy đủ vào project và chưa dùng nhất quán cho mọi job |
| Script theo từng scene | Một phần | Có `scene.voiceover`/`translation` | Chưa có `scene_id` ổn định và chưa khóa câu đã duyệt |
| Sửa/regenerate một đoạn | Chưa đạt | `StoryPage` chỉ sửa toàn văn bản | Cần editor theo segment, regenerate cục bộ và lịch sử phiên bản |
| Duyệt trước khi tạo voice | Một phần | Story page có nút Duyệt; queue dừng ở `script_review` nếu chưa duyệt | Cần actor/audit server và quyền duyệt nhiều người |

### 3.3. Bước 3 - Voice generation

| Hạng mục proposal | Hiện trạng | Bằng chứng | Phần còn thiếu / điều kiện đạt |
| --- | --- | --- | --- |
| Voice local trên macOS/Windows | Đã có | Python worker + macOS `say` + Windows `System.Speech` | Cần test ma trận locale/voice thực tế trên máy khách |
| Chọn ngôn ngữ, giới tính, voice pack | Đã có | `voice-packs.ts`, `narration.cjs`, UI batch/editor | Cần hiển thị rõ locale thiếu và chất lượng voice trước khi render |
| Voice theo từng scene | Một phần | Có `VoiceSegment` và child job dùng `scene.voiceover`/`translation` | Cần audio asset/metadata riêng cho từng segment |
| Word/phrase timestamps | Một phần | Giữ transcript word timestamps nếu provider trả; voice segment có timing ước lượng | Cần timing từ audio worker thật và confidence âm thanh |
| Waveform/audio preview | Chưa đạt | Timeline đang dùng waveform giả lập | Cần waveform lấy từ audio thật và preview từng segment |
| Emotion/rate/pause | Chưa đạt | Chưa có tham số tương ứng | Bổ sung rate, pitch, emotion, pause và kiểm tra duration fit |
| Cloud TTS tùy chọn | Một phần | Có OpenAI-compatible `/audio/speech` + local fallback | Cần capability matrix theo provider, pricing/idempotency và không để lỗi TTS làm mất script đã duyệt |

### 3.4. Bước 4 - Smart Scene Matching

Đây là **blocker P0** của proposal.

| Yêu cầu bắt buộc | Hiện trạng |
| --- | --- |
| Tìm một hoặc nhiều đoạn footage phù hợp với từng voice segment | Một phần; matcher offline xếp hạng lexical + temporal và giữ tối đa 2 clip ứng viên |
| Cho phép đổi thứ tự cảnh theo mạch kể | Một phần; timeline lưu thứ tự clip và có điều khiển đổi vị trí |
| Trả `source_start/source_end` và `voice_start/voice_end` | Đã có trong `SceneMatch` |
| Trả `match_score`, `reason`, `fallback_reason` | Đã có trong `SceneMatch` |
| Đánh dấu `needs_review` khi không chắc chắn | Đã có; UI hiển thị cảnh cần duyệt |
| Chia câu dài qua nhiều clip | Chưa có |
| Không dùng footage không liên quan | Chưa có kiểm tra tự động |

Code tạo child job từ `analysis.sceneMatches` (fallback về scene tương ứng) và
render `clipStartSeconds`/`clipEndSeconds` trong `main.tsx`. Matcher hiện là
deterministic/offline để chạy được trên máy khách không có embedding service;
trước UAT cần thay bằng adapter embedding/vision có đánh giá chất lượng và cho
phép người dùng thay thế ứng viên trực tiếp trên timeline.

### 3.5. Bước 5 - Timeline, reframe, subtitle và branding

| Hạng mục | Hiện trạng | Khoảng cách |
| --- | --- | --- |
| Track video/voice/original audio/subtitle | Có giao diện | Có thứ tự clip, trim và split lưu trong `Job.timelineClips`; kéo-thả/merge vẫn còn |
| Chọn nhiều scene và tạo queue | Một phần | Có chọn nhiều, reorder, trim/split, undo/redo và lưu local/API; merge/kéo-thả vẫn còn |
| Playhead/preview original | Có | Cần đồng bộ playhead với toàn bộ track và voice segment |
| Auto-reframe 9:16/1:1/16:9 | Có crop FFmpeg cố định | Chưa có face/object detection, tracking, pan/zoom và safe-area |
| SRT và vị trí subtitle | Có | Chưa có word timing, karaoke/highlight, song ngữ và style editor đầy đủ |
| Logo overlay | Có | Chưa có size/margin/safe-area track và preview fidelity |
| Nhạc nền/tiếng gốc/ducking | Có ở mức filter | Cần waveform, keyframe âm lượng và kiểm tra clipping |

### 3.6. Bước 6 - Render, batch và chất lượng đầu ra

| Hạng mục | Hiện trạng | Khoảng cách |
| --- | --- | --- |
| Render FFmpeg và progress | Đã có | Cần lưu log/chunk và resume từ stage cuối thành công |
| GPU macOS/Windows, CPU fallback | Một phần | Cần preflight codec thực tế và báo rõ khi rơi về CPU |
| Output theo folder từng source | Đã có | Cần manifest, checksum và metadata output |
| Preview render trước final | Chưa đạt | Hiện chủ yếu preview source/crop, chưa có preview encode nhẹ |
| Batch child jobs | Một phần | Child scene jobs có; chưa có true parallel worker/priority/concurrency limit |
| Retry/cancel | Đã có | Retry chưa bắt đầu từ stage hợp lệ cho từng loại lỗi |
| QA tự động | Một phần | Có preflight trước FFmpeg và probe output sau encode cho output/range/voice/scene-map/audio/duration; còn thiếu clipping, safe-area, codec chi tiết và checksum |
| 4K output | Chưa đạt | Preset hiện tập trung 1080p crop |

## 4. Đối chiếu yêu cầu chức năng FR-01 đến FR-15

| ID | Trạng thái | Nhận xét ngắn |
| --- | --- | --- |
| FR-01 | Đạt cơ bản | HWID thật, secure license store và activation đã có; cần test negative/expiry đầy đủ |
| FR-02 | Một phần | Admin CRUD license có; RBAC/audit chi tiết và identity đa người dùng còn thiếu |
| FR-03 | Một phần | File/URL/multi-source có; checksum/proxy/allowed-source policy còn thiếu |
| FR-04 | Một phần | Scene, summary, score, frame có; topics/hook/facts/safety/confidence chưa có |
| FR-05 | Chưa đạt | Timeline có UI nhưng chưa hỗ trợ thao tác biên tập thực sự |
| FR-06 | Một phần | TTS local, audio mix, preview và FFmpeg có; timestamp/fit/QA còn thiếu |
| FR-07 | Một phần | Queue/progress/retry/cancel có; workflow stage và resume/parallel chưa đủ |
| FR-08 | Đạt cơ bản | Client telemetry và Admin inspector có; retention/redaction/incident workflow cần harden |
| FR-09 | Chưa đạt production | Có cấu trúc webhook nhưng cần alert threshold, dedup, retry và kiểm thử endpoint thật |
| FR-10 | Một phần | Release manifest/check có; quy trình upload/sign/promotion cần hoàn thiện |
| FR-11 | Một phần | OTA download/checksum/install có; code signing, rollback và Windows/macOS UAT còn thiếu |
| FR-12 | Đạt cơ bản | BYOK profile, URL/model/key và test connection đã có |
| FR-13 | Một phần | Capability model có; adapter vendor và contract chuẩn hóa chưa đủ để cam kết Gemini/Anthropic/custom |
| FR-14 | Một phần | Có local CPU/GPU/cloud/hybrid; routing theo từng task và preflight resource còn thiếu |
| FR-15 | Chưa đạt | Chưa có màn hình payload/chi phí/consent cloud trước khi upload ở mức đầy đủ |

## 5. Khoảng cách mô hình dữ liệu

`AnalysisResult` hiện chỉ gồm summary, scenes, score, token/credit, transcript,
translation và voiceScript (`Tool/desktop-app/src/core/types.ts`). Để đáp ứng
proposal cần bổ sung và đồng bộ giữa TypeScript, Python API và persistence:

```text
Project
  niche, audience, tone, targetPlatforms, defaultLanguage, settings
SourceAsset
  checksum, localPath, sourceUrl, duration, proxyPath, thumbnailPath, probe
TranscriptSegment
  start, end, text, speaker, language, confidence, words[]
Scene
  sourceStart, sourceEnd, subjects, actions, setting, emotion, confidence
StoryPlan
  hook, setup, buildUp, climax, cta, topics, claims, targetDuration, status
VoiceSegment
  sceneId, text, audioPath, audioStart, audioEnd, words[], status
SceneMatch
  voiceSegmentId, sourceStart, sourceEnd, score, reason, needsReview
TimelineClip
  track, sourceAssetId, start, end, trimIn, trimOut, order, effects
RenderJob / OutputVariant
  stage, progress, previewPath, outputPath, checksum, metadata, qaResults
```

Các entity này cần ID ổn định, `created_at/updated_at`, version và audit actor;
không nên tiếp tục nhúng toàn bộ kết quả vào một JSON `Job` khi chuyển sang
PostgreSQL production.

## 6. Rủi ro và ưu tiên triển khai

### P0 - Phải hoàn thành trước UAT khách hàng

1. Embedding semantic scene matching và review/thay thế ứng viên trên timeline.
2. Voice worker trả timing audio/word thật, waveform và duration-fit.
3. Timeline model có trim/split và undo/redo; merge/kéo-thả vẫn là P1 kế tiếp.
4. Render preflight deterministic và output duration/audio probe đã có; codec/audio clipping/safe-area/checksum vẫn cần probe nâng cao.
5. Workflow resume/idempotency và persistence PostgreSQL cho project/output.
6. Parent job chỉ hoàn tất sau khi mọi child job/QA pass (native gate đã có, cần harden server).

### P1 - Cần hoàn thành trước phát hành thương mại rộng

1. Auto-reframe theo chủ thể và safe-area.
2. Word-highlight subtitle, song ngữ, style và logo track.
3. Preview render nhẹ, 4K preset, checksum/manifest output.
4. Durable queue worker, idempotency provider calls, project sync PostgreSQL.
5. Signed installer/OTA, rollback và test Windows/macOS trên máy sạch.
6. Cloud consent, payload/cost estimate, retention và redaction telemetry.

### P2 - Nâng chất lượng và quy mô

1. Speaker diarization, emotion/rhythm, claim verification.
2. Nhiều script variant và retention evaluation offline.
3. True parallel batch với quota theo license/GPU.
4. Embedding/index scene để tái sử dụng phân tích và tìm kiếm asset nhanh.

## 7. Tiêu chí nghiệm thu đề xuất

Một project chỉ được coi là hoàn tất khi tất cả điều kiện sau đúng:

- Mỗi input có `SourceAsset` và checksum; URL được tải/cache một lần.
- Transcript có segment timestamp; nếu không có transcript thì UI hiển thị rõ
  giới hạn frame-only và không bịa thoại.
- StoryPlan được người dùng duyệt; mỗi VoiceSegment liên kết với script và
  có audio/timestamp thực.
- Mỗi VoiceSegment có SceneMatch từ video gốc, score và lý do; match không chắc
  phải vào `needs_review` thay vì tự render cảnh ngẫu nhiên.
- Preview thể hiện đúng voice, cảnh, subtitle, logo và tỷ lệ trước final render.
- QA không có clip rỗng, mapping thiếu, subtitle tràn vùng an toàn, audio clip
  hoặc duration vượt giới hạn.
- Job parent chỉ `completed` sau khi toàn bộ child job và QA đã pass; lỗi có thể
  retry từ stage gần nhất còn hợp lệ.
- Output có checksum, metadata, manifest và nằm trong folder riêng theo project,
  source và output variant.
- Test pass trên macOS Apple Silicon/Intel và Windows 10/11 với provider mock,
  provider thật tùy credential, FFmpeg bundled và máy không có GPU.

## 8. Kế hoạch Sprint tiếp theo

| Sprint | Mục tiêu | Kết quả bắt buộc |
| --- | --- | --- |
| S7 | Data contract và analysis v2 | PostgreSQL migration, `SourceAsset`, transcript segments, topics/hooks/facts/safety |
| S8 | Story approval và voice segments | StoryPlan AIDA, script review, local/cloud TTS segment, word timing fallback |
| S9 | Semantic matching và timeline model | SceneMatch API, review UI, reorder/trim/split, autosave timeline |
| S10 | Render QA và release gate | Preview render, QA checks, stage machine, resume, signed cross-platform artifacts |

Mỗi Sprint phải có issue ID, API/IPC contract, test fixture video, expected
output và demo theo tiêu chí ở mục 7. Chỉ sau khi S10 pass mới chuyển trạng thái
proposal từ “đáp ứng một phần” sang “sẵn sàng UAT production”.

## 9. Phạm vi có thể demo ngay

Phiên bản hiện tại có thể demo an toàn các luồng sau:

1. Chọn nhiều file hoặc URL, tải/probe và lưu job local.
2. Phân tích scene bằng FFmpeg và tùy chọn contextual analysis qua provider.
3. Chỉnh voice script hiện có, chọn ngôn ngữ/giới tính và tạo voice local.
4. Chọn nhiều scene, tạo child jobs, render FFmpeg với crop 9:16/1:1/16:9,
   subtitle, logo, tiếng gốc và nhạc nền.
5. Xem progress, retry/cancel, output folder, license/provider và OTA baseline.

Các nội dung chưa nên cam kết trong demo khách hàng: “AI tự hiểu toàn bộ kịch bản
và chọn đúng cảnh cho từng câu”, “word-level subtitle đồng bộ tuyệt đối”, “tự
động reframe theo khuôn mặt”, “QA không cần người duyệt” và “render 4K song song
ở quy mô hàng trăm video/ngày”.
