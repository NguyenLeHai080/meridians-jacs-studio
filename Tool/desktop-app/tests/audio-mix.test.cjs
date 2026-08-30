const assert = require("node:assert/strict");
const test = require("node:test");
const { buildAudioFilter } = require("../electron/audio-mix.cjs");

test("keeps original audio when no extra tracks are selected", () => {
  assert.equal(buildAudioFilter({ hasOriginalAudio: true }), null);
});

test("mixes narration with original audio", () => {
  assert.equal(buildAudioFilter({ hasOriginalAudio: true, narrationInputIndex: 1 }), "[0:a]volume=1[a0];[1:a]volume=1[a1];[a0][a1]amix=inputs=2:duration=longest:dropout_transition=2[aout]");
});

test("mixes music at the requested volume", () => {
  const filter = buildAudioFilter({ hasOriginalAudio: true, musicInputIndex: 1, musicVolume: 35 });
  assert.match(filter, /\[1:a\]volume=0\.35\[a1\]/);
  assert.match(filter, /amix=inputs=2/);
});

test("supports narration and music without the original track", () => {
  const filter = buildAudioFilter({ hasOriginalAudio: false, narrationInputIndex: 1, musicInputIndex: 2, musicVolume: 20, keepOriginalAudio: false });
  assert.equal(filter, "[1:a]volume=1[a0];[2:a]volume=0.2[a1];[a0][a1]amix=inputs=2:duration=longest:dropout_transition=2[aout]");
});

test("returns no graph when all audio is disabled", () => {
  assert.equal(buildAudioFilter({ hasOriginalAudio: true, keepOriginalAudio: false }), null);
});
