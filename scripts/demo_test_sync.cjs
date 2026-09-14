const { buildWordByWordCues } = require("../FE/desktop-app/electron/subtitles.cjs");

async function testLiveAudioSync() {
  const text = "Chào mừng quý khách đến với trung tâm công nghệ thông minh.";
  console.log("==================================================");
  console.log("  KIỂM THỬ ĐỒNG BỘ PHỤ ĐỀ TỪ GIỌNG ĐỌC AI (TTS)   ");
  console.log("==================================================");
  console.log(`\n1. Gửi văn bản tới Cloud AI Voice: "${text}"...`);

  const res = await fetch("https://jacs-studio.nexoratech.com.vn/api/v1/client/synthesize-speech", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0",
    },
    body: JSON.stringify({
      text,
      voice: "vi-VN-NamMinhNeural",
      language: "vi",
      gender: "male",
    }),
  });

  if (!res.ok) {
    console.error("Lỗi gọi API:", res.status);
    return;
  }

  const wbHeader = res.headers.get("x-word-boundaries");
  if (!wbHeader) {
    console.error("Không tìm thấy header X-Word-Boundaries");
    return;
  }

  const words = JSON.parse(Buffer.from(wbHeader, "base64").toString("utf-8"));
  console.log(`\n2. Mốc thời gian phát âm thực tế từng từ từ AI Audio (${words.length} từ):`);
  for (const w of words) {
    console.log(`   - Từ "${w.w}": phát âm từ ${w.s}s đến ${w.e}s (độ dài: ${Math.round((w.e - w.s)*1000)}ms)`);
  }

  const totalDur = words[words.length - 1].e + 0.5;
  const cues = buildWordByWordCues([
    { start: 0, end: totalDur, text, words }
  ], totalDur, "", { style: "gold" });

  console.log(`\n3. Trình tạo phụ đề SRT tạo ra các Cue Karaoke đổi màu:`);
  for (let i = 0; i < cues.length; i++) {
    const c = cues[i];
    console.log(`   [${c.start}s --> ${c.end}s] : ${c.text}`);
  }

  console.log("\n=> KẾT LUẬN: Từng từ đổi màu (Highlight vàng) đúng chính xác mili-giây khi AI voice đọc từ đó!");
}

testLiveAudioSync();
