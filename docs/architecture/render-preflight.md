# Render Preflight

Trước khi gọi FFmpeg, Desktop Tool chạy các kiểm tra bất biến trong `core/render-preflight.ts`. Một job chỉ được chuyển sang `completed` khi preflight đầu vào và QA sau render đều đạt.

Các kiểm tra gồm:

- Có source path và khoảng clip hợp lệ trong thời lượng video.
- Voice-over bật thì phải có kịch bản theo ngữ cảnh.
- Phụ đề có mốc thời gian hợp lệ, không vượt giới hạn nội dung.
- Âm lượng nhạc nền nằm trong `0-100%`.
- Tỷ lệ output thuộc `original`, `9:16`, `1:1` hoặc `16:9`.
- Có output path sau khi encode (bỏ qua ở preflight đầu vào bằng `requireOutput: false`).

Sau khi encode, queue probe lại output để kiểm tra thời lượng, audio stream khi
voice-over bật và độ lệch so với khoảng clip. Nếu một kiểm tra không đạt, job
được giữ ở trạng thái `failed` để người dùng retry thay vì hiển thị thành phẩm
không hợp lệ.

Preflight là lớp kiểm tra deterministic, không thay thế kiểm thử media thực tế. FFmpeg vẫn phải được probe sau render để bổ sung codec, duration, audio stream và checksum trong release pipeline.
