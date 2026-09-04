const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { test } = require("node:test");

const root = path.resolve(__dirname, "..");
const platformDir = process.platform === "darwin" ? "darwin" : process.platform === "win32" ? "win32" : null;
const architectureDir = platformDir ? `${platformDir}-${process.arch}` : null;
const executableExtension = process.platform === "win32" ? ".exe" : "";
const binaryPath = (name) => {
  if (!platformDir) return "";
  const architecturePath = path.join(root, "bin", architectureDir, `${name}${executableExtension}`);
  const legacyPath = path.join(root, "bin", platformDir, `${name}${executableExtension}`);
  return fs.existsSync(architecturePath) ? architecturePath : legacyPath;
};
const ffmpeg = binaryPath("ffmpeg");
const ffprobe = binaryPath("ffprobe");
const mediaAvailable = Boolean(ffmpeg && ffprobe && fs.existsSync(ffmpeg) && fs.existsSync(ffprobe));

function run(command, args) {
  return childProcess.execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

test("bundled media engine probes, extracts and renders a real video clip", { skip: !mediaAvailable }, () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "jacs-media-test-"));
  try {
    const input = path.join(directory, "input.mp4");
    const output = path.join(directory, "output.mp4");
    run(ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "testsrc=size=320x180:rate=24", "-t", "2", "-c:v", "libx264", "-pix_fmt", "yuv420p", input]);

    const probe = JSON.parse(run(ffprobe, ["-v", "error", "-show_entries", "format=duration:stream=width,height", "-of", "json", input]));
    assert.equal(probe.streams[0].width, 320);
    assert.equal(probe.streams[0].height, 180);
    assert.ok(Number(probe.format.duration) >= 1.9);

    run(ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", "-i", input, "-vf", "fps=1/0.333,scale=512:-2", "-frames:v", "6", path.join(directory, "frame-%02d.jpg")]);
    assert.ok(fs.readdirSync(directory).filter((name) => /^frame-\d+\.jpg$/.test(name)).length > 0);

    run(ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", "-ss", "0.5", "-i", input, "-t", "1", "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920", "-c:v", "libx264", "-preset", "fast", "-movflags", "+faststart", output]);
    const rendered = JSON.parse(run(ffprobe, ["-v", "error", "-show_entries", "format=duration:stream=width,height", "-of", "json", output]));
    assert.equal(rendered.streams[0].width, 1080);
    assert.equal(rendered.streams[0].height, 1920);
    assert.ok(Math.abs(Number(rendered.format.duration) - 1) < 0.15);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
