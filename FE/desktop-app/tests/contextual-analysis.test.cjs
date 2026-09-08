const assert = require("node:assert/strict");
const test = require("node:test");
const { frameTimeline, hasTimestampedTranscript, parseTimestampedTranscript, buildSceneMatches, restoreSceneVoiceovers, enrichAnalysis } = require("../electron/contextual-analysis.cjs");

test("preserves a timestamp beside each visual frame sent to the model", () => {
  assert.equal(frameTimeline([{ timestampSeconds: 0 }, { timestampSeconds: 65.2 }]), "Frame 1: 00:00 (0.0s); Frame 2: 01:05 (65.2s)");
});

test("detects optional timestamped transcript evidence", () => {
  assert.equal(hasTimestampedTranscript("[00:03-00:07] The door opens."), true);
  assert.equal(hasTimestampedTranscript("The door opens."), false);
});

test("parses structured transcript segments without losing word metadata", () => {
  const segments = parseTimestampedTranscript([{ start: 1.25, end: 3.5, text: "Hello", words: [{ start: 1.25, end: 1.8, text: "Hello" }] }]);
  assert.equal(segments[0].text, "Hello");
  assert.deepEqual(segments[0].words, [{ start: 1.25, end: 1.8, text: "Hello", confidence: undefined }]);
});

test("ranks scene matches and marks uncertain reorderings for review", () => {
  const result = buildSceneMatches([
    { id: "scene-a", start: "00:00", end: "00:05", title: "Bãi biển", detail: "Sóng và cát" },
    { id: "scene-b", start: "00:05", end: "00:10", title: "Nhà bếp", detail: "Đầu bếp thái rau" },
  ]);
  assert.equal(result.voiceSegments.length, 2);
  assert.equal(result.sceneMatches[0].sceneId, "scene-a");
  assert.ok(result.sceneMatches[0].sourceClips.length >= 1);
  assert.equal(typeof result.sceneMatches[0].matchScore, "number");
});

test("enriches a provider result with AIDA draft and contextual links", () => {
  const result = enrichAnalysis({ summary: "x", score: 50, tokensUsed: 2, creditsUsed: 1, scenes: [{ id: "s1", start: "00:00", end: "00:04", title: "Hook", detail: "Mở đầu", voiceover: "Một câu chuyện" }] }, "[00:00-00:04] Một câu chuyện");
  assert.equal(result.storyPlan.status, "draft");
  assert.equal(result.transcriptSegments.length, 1);
  assert.equal(result.voiceSegments[0].sceneId, "s1");
  assert.equal(result.sceneMatches[0].sourceStart, 0);
});

test("splits a contextual script across scenes when a gateway omits per-scene voice-over", () => {
  const scenes = restoreSceneVoiceovers([
    { id: "scene-1", start: "00:00", end: "00:04", title: "Mở đầu", detail: "" },
    { id: "scene-2", start: "00:04", end: "00:08", title: "Cao trào", detail: "" },
  ], { voiceScript: "Cô ấy phát hiện chiếc hộp bị mở. Bí mật bên trong khiến mọi người bất ngờ." });
  assert.equal(scenes[0].voiceover, "Cô ấy phát hiện chiếc hộp bị mở.");
  assert.equal(scenes[1].voiceover, "Bí mật bên trong khiến mọi người bất ngờ.");
});

test("guarantees scene narrations contain pure Vietnamese without raw transcript splicing", () => {
  const rawEnglishTranscript = "We stood at the gate with a kitchen knife saying he's going to stab police.";
  const scenes = [
    { id: "scene-1", start: "00:00", end: "00:10", title: "Hook Mở Màn", voiceover: "Tình huống căng thẳng bùng nổ khi đối tượng đối đầu với lực lượng chức năng." },
    { id: "scene-2", start: "00:10", end: "00:30", title: "Hồi 1", voiceover: "Cảnh sát tuần tra tiếp cận hiện trường để ổn định trật tự." },
    { id: "scene-3", start: "00:30", end: "01:00", title: "Hồi 2", voiceover: "Cuộc đối đầu kịch tính nhanh chóng được giải quyết an toàn." },
  ];
  const enriched = enrichAnalysis({
    summary: "Tóm tắt chuyên sâu 100% tiếng Việt.",
    score: 95,
    tokensUsed: 100,
    creditsUsed: 1,
    scenes,
  }, rawEnglishTranscript);

  assert.equal(enriched.scenes.length, 3);
  for (const sc of enriched.scenes) {
    assert.ok(!sc.voiceover.includes("Tại thời điểm này của video,"));
    assert.ok(!sc.voiceover.includes("kitchen knife"));
    assert.ok(sc.voiceover.length > 5);
  }
});
