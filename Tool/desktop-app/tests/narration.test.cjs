const assert = require("node:assert/strict");
const test = require("node:test");
const { buildNarrationText, languageName, speechLocale } = require("../electron/narration.cjs");

test("uses the contextual voice script before generic analysis labels", () => {
  const result = buildNarrationText({
    voiceScript: "Cô ấy phát hiện chiếc hộp đã bị mở trước đó.",
    scenes: [{ title: "Scene 1", detail: "A box" }],
  });
  assert.equal(result, "Cô ấy phát hiện chiếc hộp đã bị mở trước đó.");
});

test("uses per-scene voice-over before a literal translation", () => {
  const result = buildNarrationText({
    scenes: [
      { title: "Scene 1", detail: "Fallback", translation: "Bản dịch sát nghĩa", voiceover: "Cô ấy mở cánh cửa và sững người." },
    ],
  });
  assert.equal(result, "Cô ấy mở cánh cửa và sững người.");
});

test("uses a scene translation when timestamped transcription is unavailable", () => {
  const result = buildNarrationText({
    scenes: [
      { start: "00:00", end: "00:05", title: "Scene 1", translation: "Cô ấy mở cánh cửa." },
    ],
  }, { startSeconds: 0, endSeconds: 5 });
  assert.equal(result, "Cô ấy mở cánh cửa.");
});

test("does not repeat a full script when a scene has no contextual voiceover", () => {
  const result = buildNarrationText({
    voiceScript: "Toàn bộ câu chuyện của video.",
    translatedTranscript: "Bản dịch transcript đầy đủ.",
    scenes: [
      { start: "00:00", end: "00:05", voiceover: "Cảnh đầu tiên." },
      { start: "00:05", end: "00:10" },
    ],
  }, { startSeconds: 5, endSeconds: 10 });
  assert.equal(result, "");
});

test("maps selected output language to a clear prompt instruction", () => {
  assert.equal(languageName("vi"), "tiếng Việt tự nhiên");
  assert.equal(languageName("pt-BR"), "português do Brasil");
});

test("maps output language to the local speech locale", () => {
  assert.equal(speechLocale("vi"), "vi-VN");
  assert.equal(speechLocale("ja"), "ja-JP");
  assert.equal(speechLocale("en-US"), "en-US");
  assert.equal(speechLocale("unknown"), "en-US");
});
