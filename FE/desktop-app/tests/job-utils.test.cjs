const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");
const typescript = (() => {
  const candidates = [
    path.resolve(__dirname, "../../admin-portal/node_modules/typescript"),
    path.resolve(__dirname, "../node_modules/typescript"),
    path.resolve(__dirname, "../../../node_modules/typescript"),
    "typescript",
  ];
  for (const c of candidates) {
    try { return require(c); } catch (_) {}
  }
  return require("typescript");
})();

function loadTypeScriptModule(relativePath) {
  const sourcePath = path.resolve(__dirname, "..", relativePath);
  const source = fs.readFileSync(sourcePath, "utf8");
  const output = typescript.transpileModule(source, {
    compilerOptions: { target: typescript.ScriptTarget.ES2022, module: typescript.ModuleKind.CommonJS },
    fileName: sourcePath,
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function (require, module, exports) { ${output}\n })(require, module, module.exports);`, {
    require,
    module,
    console,
    URL,
    decodeURIComponent,
  }, { filename: sourcePath });
  return module.exports;
}

const { approveSceneMatches, hasUnreviewedSceneMatches, highlightRange, normalizePastedUrl, replaceSceneMatch, resolveReadyProvider, shouldResumeJob, sourceNameFromUrl, timestampSeconds } = loadTypeScriptModule("src/core/job-utils.ts");

test("normalizes copied TikTok Markdown links and names their video id", () => {
  const url = normalizePastedUrl("[TikTok](https://www.tiktok.com/@demo/video/7677523402785164557?\\_r=1). ");
  assert.equal(url, "https://www.tiktok.com/@demo/video/7677523402785164557?_r=1");
  assert.equal(sourceNameFromUrl(url), "TikTok · 7677523402785164557");
});

test("parses timestamps in mm:ss and hh:mm:ss forms", () => {
  assert.equal(timestampSeconds("01:05"), 65);
  assert.equal(timestampSeconds("01:02:03"), 3723);
  assert.equal(timestampSeconds("bad", 9), 9);
});

test("chooses a bounded highlight scene and preserves explicit clip ranges", () => {
  const analysis = { scenes: [
    { start: "00:02", end: "00:55", title: "Intro", detail: "Giới thiệu" },
    { start: "01:10", end: "02:40", title: "Cao trào", detail: "Highlight nổi bật" },
  ] };
  const range = highlightRange({ highlightOnly: true, highlightMaxSeconds: 30 }, analysis, 120);
  assert.equal(range.startSeconds, 70);
  assert.equal(range.endSeconds, 100);
  const explicitRange = highlightRange({ highlightOnly: true, highlightMaxSeconds: 30, clipStartSeconds: 4, clipEndSeconds: 12 }, analysis, 120);
  assert.equal(explicitRange.startSeconds, 4);
  assert.equal(explicitRange.endSeconds, 12);
});

test("never extends a highlight beyond the source duration", () => {
  const range = highlightRange({ highlightOnly: true, highlightMaxSeconds: 60 }, { scenes: [{ start: "00:50", end: "02:00", title: "Scene", detail: "" }] }, 55);
  assert.equal(range.startSeconds, 50);
  assert.equal(range.endSeconds, 55);
});

test("recovers a retry from a stale provider id", () => {
  const providers = [
    { id: "stale", providerType: "openai", enabled: false, hasApiKey: true, capabilities: ["analysis"] },
    { id: "ready", providerType: "gemini", enabled: true, hasApiKey: true, capabilities: ["analysis", "vision"] },
  ];
  assert.equal(resolveReadyProvider(providers, "stale", "analysis")?.id, "ready");
  assert.equal(resolveReadyProvider(providers, undefined, "tts", ["openai", "openai-compatible"]), undefined);
});

test("accepts a minimal OpenAI-compatible profile for analysis and TTS", () => {
  const provider = { id: "gateway", providerType: "openai-compatible", enabled: true, hasApiKey: true, capabilities: [] };
  assert.equal(resolveReadyProvider([provider], undefined, "analysis")?.id, "gateway");
  assert.equal(resolveReadyProvider([provider], undefined, "tts", ["openai", "openai-compatible"])?.id, "gateway");
});

test("resumes interrupted jobs but not review gates or split parents", () => {
  assert.equal(shouldResumeJob({ status: "running", stage: "rendering", localPath: "/tmp/video.mp4" }), true);
  assert.equal(shouldResumeJob({ status: "running", stage: "script_review", localPath: "/tmp/video.mp4" }), false);
  assert.equal(shouldResumeJob({ status: "running", stage: "timeline_review", localPath: "/tmp/video.mp4", childJobIds: ["child-1"] }), false);
  assert.equal(shouldResumeJob({ status: "queued", stage: "queued", sourceType: "url" }), true);
  assert.equal(shouldResumeJob({ status: "completed", stage: "completed", localPath: "/tmp/video.mp4" }), false);
});

test("requires timeline review when a scene match is uncertain", () => {
  assert.equal(hasUnreviewedSceneMatches([{ needsReview: false }]), false);
  assert.equal(hasUnreviewedSceneMatches([{ needsReview: true }]), true);
  assert.equal(hasUnreviewedSceneMatches(undefined), false);
});

test("approves and replaces scene matches immutably", () => {
  const matches = [{ sceneId: "a", sourceStart: 0, sourceEnd: 2, needsReview: true }, { sceneId: "b", sourceStart: 2, sourceEnd: 4, needsReview: false }];
  const approved = approveSceneMatches(matches);
  assert.deepEqual(approved.map((item) => item.needsReview), [false, false]);
  assert.equal(matches[0].needsReview, true);
  const replaced = replaceSceneMatch(matches, 0, { sceneId: "c", sourceStart: 8, sourceEnd: 10 });
  assert.equal(replaced[0].sceneId, "c");
  assert.equal(replaced[0].sourceStart, 8);
  assert.equal(replaced[0].sourceEnd, 10);
  assert.equal(replaced[0].needsReview, false);
  assert.equal(replaceSceneMatch(matches, 99, { sceneId: "x", sourceStart: 0, sourceEnd: 1 }), matches);
});
