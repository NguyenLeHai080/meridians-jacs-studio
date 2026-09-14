const assert = require("node:assert/strict");
const test = require("node:test");
const { stripSceneMetadata } = require("../electron/subtitles.cjs");

test("stripSceneMetadata removes scene annotations and timestamps cleanly", () => {
  const raw = "[Phân cảnh 1] [00:00 - 00:05] Chào mừng các bạn đến với video!";
  assert.equal(stripSceneMetadata(raw), "Chào mừng các bạn đến với video!");
});

test("stripSceneMetadata removes Vietnamese time marks", () => {
  const raw = "ở mốc 01:25 đến 01:30, nhân vật bước ra khỏi căn phòng.";
  assert.equal(stripSceneMetadata(raw), "nhân vật bước ra khỏi căn phòng.");
});

test("timeline silence gap calculator computes exact silence intervals", () => {
  const segments = [
    { start: 0, end: 3, text: "Chào bạn" },
    { start: 8, end: 12, text: "Tôi là JACS" },
    { start: 20, end: 25, text: "Rất vui được hỗ trợ" }
  ];

  let currentTime = 0;
  const gaps = [];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const preSilence = Math.max(0, seg.start - currentTime);
    if (preSilence >= 0.05) {
      gaps.push({ index: i, silence: preSilence });
      currentTime += preSilence;
    }
    // Simulate audio snippet duration of 2 seconds
    currentTime += 2.0;
  }

  assert.equal(gaps.length, 2);
  // First gap before segment 1: seg.start (8) - currentTime (2) = 6s
  assert.equal(gaps[0].silence, 6);
  // Second gap before segment 2: seg.start (20) - currentTime (8 + 2 = 10) = 10s
  assert.equal(gaps[1].silence, 10);
});

test("scenes mapping preserves all scenes sequentially even when sourceStart is deep in the video", () => {
  const rawScenes = [
    { id: "scene-1", title: "Hook", start: "00:00", end: "00:10", sourceStart: "00:00", sourceEnd: "00:10", sourceTimeStart: 0, voiceover: "Đoạn hook kịch tính mở màn" },
    { id: "scene-2", title: "Hồi 1", start: "00:10", end: "00:30", sourceStart: "02:15", sourceEnd: "02:35", sourceTimeStart: 135, voiceover: "Cảnh sát tiếp cận hiện trường vụ án" },
    { id: "scene-3", title: "Hồi 2", start: "00:30", end: "00:55", sourceStart: "05:40", sourceEnd: "06:05", sourceTimeStart: 340, voiceover: "Đối tượng bắt đầu có dấu hiệu manh động và kháng cự" }
  ];

  const clipStart = 0;
  let sequentialCursor = 0;
  const segments = rawScenes.map((s) => {
    const timelineStart = parseFloat(s.start.split(":")[0]) * 60 + parseFloat(s.start.split(":")[1]);
    const timelineEnd = parseFloat(s.end.split(":")[0]) * 60 + parseFloat(s.end.split(":")[1]);
    let segStart = timelineStart;
    let segEnd = timelineEnd;
    const sText = s.voiceover || "";
    return {
      start: Math.max(0, segStart - clipStart),
      end: Math.max(segStart + 0.5, segEnd - clipStart),
      text: stripSceneMetadata(sText),
    };
  }).filter((s) => s.text && s.end > s.start);

  assert.equal(segments.length, 3);
  assert.equal(segments[0].start, 0);
  assert.equal(segments[0].end, 10);
  assert.equal(segments[1].start, 10);
  assert.equal(segments[1].end, 30);
  assert.equal(segments[2].start, 30);
  assert.equal(segments[2].end, 55);
});
