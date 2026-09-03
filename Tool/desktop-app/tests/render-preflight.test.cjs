const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");
const typescript = require("../node_modules/typescript");

function load(relativePath) {
  const sourcePath = path.resolve(__dirname, "..", relativePath);
  const output = typescript.transpileModule(fs.readFileSync(sourcePath, "utf8"), { compilerOptions: { target: typescript.ScriptTarget.ES2022, module: typescript.ModuleKind.CommonJS }, fileName: sourcePath }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function (require, module, exports) { ${output}\n })(require, module, module.exports);`, { require, module, console }, { filename: sourcePath });
  return module.exports;
}

const { runRenderPreflight } = load("src/core/render-preflight.ts");

test("render preflight accepts a valid scene render", () => {
  const result = runRenderPreflight({ job: { narratorEnabled: true, subtitlesEnabled: true, backgroundMusic: true, backgroundMusicVolume: 25, aspectRatio: "9:16" }, sourcePath: "/tmp/video.mp4", sourceDuration: 20, startSeconds: 2, endSeconds: 10, narrationText: "Lời kể theo cảnh", subtitleSegments: [{ start: 2, end: 5, text: "Caption" }], outputPath: "/tmp/output.mp4" });
  assert.equal(result.passed, true);
});

test("render preflight rejects invalid clip and audio settings", () => {
  const result = runRenderPreflight({ job: { narratorEnabled: true, subtitlesEnabled: true, backgroundMusic: true, backgroundMusicVolume: 140, aspectRatio: "9:16" }, sourcePath: "/tmp/video.mp4", sourceDuration: 10, startSeconds: 8, endSeconds: 4, narrationText: "", outputPath: "/tmp/output.mp4" });
  assert.equal(result.passed, false);
  assert.equal(JSON.stringify(result.checks.filter((check) => !check.passed).map((check) => check.id).sort()), JSON.stringify(["audio-level", "clip-range", "subtitle-content", "voice-script"]));
});

test("render preflight can validate inputs before output exists", () => {
  const result = runRenderPreflight({ job: { narratorEnabled: false, subtitlesEnabled: false, backgroundMusic: false, aspectRatio: "16:9" }, sourcePath: "/tmp/video.mp4", sourceDuration: 12, startSeconds: 1, endSeconds: 8, requireOutput: false });
  assert.equal(result.passed, true);
  assert.equal(result.checks.find((check) => check.id === "output").passed, true);
});
