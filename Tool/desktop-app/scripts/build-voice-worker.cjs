const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const childProcess = require("node:child_process");

const root = path.resolve(__dirname, "..");
const source = path.join(root, "voice-runtime", "voice_worker.py");
const output = path.join(root, "voice-runtime");
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "jacs-voice-build-"));
const executable = process.platform === "win32" ? "jacs-voice-worker.exe" : "jacs-voice-worker";
const destination = path.join(output, executable);

function run(command, args) {
  return childProcess.spawnSync(command, args, { cwd: root, stdio: "inherit", windowsHide: true });
}

if (!fs.existsSync(source)) {
  console.error(`Không tìm thấy voice worker: ${source}`);
  process.exit(1);
}

const explicit = process.env.JACS_PYINSTALLER_PATH;
const candidates = explicit ? [explicit] : (process.platform === "win32" ? ["pyinstaller", "python.exe"] : ["pyinstaller", "python3"]);
let command;
let prefix = [];
for (const candidate of candidates) {
  const probe = childProcess.spawnSync(candidate, candidate === "python3" || candidate === "python.exe" ? ["-m", "PyInstaller", "--version"] : ["--version"], { stdio: "ignore", windowsHide: true });
  if (probe.status === 0) {
    command = candidate;
    prefix = candidate === "python3" || candidate === "python.exe" ? ["-m", "PyInstaller"] : [];
    break;
  }
}

if (!command) {
  console.warn("PyInstaller chưa được cài; sẽ đóng gói voice_worker.py và dùng fallback System Voice khi máy khách không có Python.");
  process.exit(0);
}

fs.mkdirSync(output, { recursive: true });
const result = run(command, [
  ...prefix,
  "--noconfirm",
  "--clean",
  "--onefile",
  "--name", "jacs-voice-worker",
  "--distpath", output,
  "--workpath", path.join(temporary, "build"),
  "--specpath", temporary,
  source,
]);
fs.rmSync(temporary, { recursive: true, force: true });
if (result.status !== 0 || !fs.existsSync(destination)) process.exit(result.status || 1);
if (process.platform !== "win32") fs.chmodSync(destination, 0o755);
console.log(`Đã build local voice worker: ${destination}`);
