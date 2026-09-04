const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { test } = require("node:test");
const { buildCaptionCues, buildSrt, normalizeSubtitleSegments } = require("../electron/subtitles.cjs");

const root = path.resolve(__dirname, "..");
const platformDir = process.platform === "darwin" ? "darwin" : process.platform === "win32" ? "win32" : null;
const architectureDir = platformDir ? `${platformDir}-${process.arch}` : null;
const extension = process.platform === "win32" ? ".exe" : "";
const mediaBinary = (name) => {
  if (!platformDir) return "";
  const archPath = path.join(root, "bin", architectureDir, `${name}${extension}`);
  const legacyPath = path.join(root, "bin", platformDir, `${name}${extension}`);
  if (fs.existsSync(archPath)) return archPath;
  if (fs.existsSync(legacyPath)) return legacyPath;
  return "";
};

test("builds clip-relative UTF-8 SRT cues and splits long narration", () => {
  const srt = buildSrt([{ start: 0, end: 4, text: "Xin chào đây là một lời kể dài cần được chia thành nhiều câu dễ đọc trên màn hình." }], 4);
  assert.match(srt, /00:00:00,000 --> 00:00:0[12],/);
  assert.match(srt, /Xin chào/);
  assert.ok((srt.match(/\n\n/g) || []).length >= 1);
});

test("falls back to the selected scene script when no timed cues survive", () => {
  const cues = normalizeSubtitleSegments([], 3, "Nội dung scene");
  assert.deepEqual(cues, [{ start: 0, end: 3, text: "Nội dung scene" }]);
});

test("creates readable weighted cues for long Vietnamese and CJK scripts", () => {
  const cues = buildCaptionCues([{ start: 0, end: 10, text: "Đây là một câu kể dài cần chia nhỏ để người xem đọc kịp trong từng đoạn phụ đề rõ ràng." }], 10);
  assert.ok(cues.length >= 2);
  assert.equal(cues[0].start, 0);
  assert.equal(cues.at(-1).end, 10);
  assert.ok(cues.every((cue) => cue.end > cue.start && cue.text.length <= 50));

  const cjk = buildCaptionCues([{ start: 0, end: 6, text: "これは字幕が画面からはみ出さないように分割される日本語の長い文章です" }], 6);
  assert.ok(cjk.length >= 2);
  assert.equal(cjk.at(-1).end, 6);
});

test("recovers missing transcript end timestamps from the next cue and duration", () => {
  const cues = normalizeSubtitleSegments([
    { start: 1, text: "Cảnh đầu" },
    { start: 3, end: 4, text: "Cảnh sau" },
  ], 6);
  assert.deepEqual(cues, [
    { start: 1, end: 3, text: "Cảnh đầu" },
    { start: 3, end: 4, text: "Cảnh sau" },
  ]);
});

test("burns UTF-8 subtitles into a real output when bundled FFmpeg is available", { skip: !mediaBinary("ffmpeg") }, () => {
  const tmpDir = typeof fs.realpathSync.native === "function" ? fs.realpathSync.native(os.tmpdir()) : os.tmpdir();
  const directory = fs.mkdtempSync(path.join(tmpDir, "jacs-subtitle-test-"));
  try {
    const input = path.join(directory, "input.mp4");
    const subtitle = path.join(directory, "captions.srt");
    const output = path.join(directory, "output.mp4");
    const run = (command, args) => childProcess.execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    run(mediaBinary("ffmpeg"), ["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "color=c=black:s=320x180:r=25", "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=44100", "-t", "2", "-c:v", "libx264", "-c:a", "aac", "-pix_fmt", "yuv420p", input]);
    fs.writeFileSync(subtitle, buildSrt([{ start: 0, end: 2, text: "Phụ đề theo đúng cảnh" }], 2), "utf8");
    const filterPath = subtitle.split(path.sep).join("/").replace(/:/g, "\\:").replace(/'/g, "\\'");
    run(mediaBinary("ffmpeg"), ["-hide_banner", "-loglevel", "error", "-y", "-i", input, "-vf", `subtitles='${filterPath}'`, "-c:v", "libx264", "-c:a", "aac", output]);
    assert.ok(fs.statSync(output).size > 0);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
