const fs = require("node:fs");
const path = require("node:path");
const childProcess = require("node:child_process");

const root = path.resolve(__dirname, "..");
const platformDirectory = process.platform === "win32" ? "win32" : process.platform === "darwin" ? "darwin" : null;
if (!platformDirectory) {
  console.error(`Nền tảng ${process.platform} chưa có binary FFmpeg được hỗ trợ.`);
  process.exit(1);
}

const force = process.argv.includes("--force");
const extension = process.platform === "win32" ? ".exe" : "";
// Keep media engines architecture-specific. This prevents an Apple Silicon
// ffmpeg from being silently bundled into the Intel installer (and vice versa).
const requestedArchitecture = process.env.JACS_TARGET_ARCH || process.arch;
if (!["x64", "arm64"].includes(requestedArchitecture)) {
  console.error(`Kiến trúc ${requestedArchitecture} chưa có binary FFmpeg được hỗ trợ.`);
  process.exit(1);
}
const architectureDirectory = `${platformDirectory}-${requestedArchitecture}`;
const destinationDirectory = path.join(root, "bin", architectureDirectory);
fs.mkdirSync(destinationDirectory, { recursive: true });

function resolveExecutable(name) {
  const explicit = process.env[`JACS_${name.toUpperCase()}_PATH`];
  const candidates = explicit ? [explicit] : [];
  candidates.push(name, `${name}.exe`);
  for (const candidate of candidates) {
    const result = childProcess.spawnSync(process.platform === "win32" ? "where" : "which", [candidate], { encoding: "utf8" });
    if (result.status === 0) {
      const first = String(result.stdout || "").split(/\r?\n/).map((item) => item.trim()).find(Boolean);
      if (first && fs.existsSync(first)) return first;
    }
    if (path.isAbsolute(candidate) && fs.existsSync(candidate)) return candidate;
  }
  return null;
}

for (const name of ["ffmpeg", "ffprobe"]) {
  const destination = path.join(destinationDirectory, `${name}${extension}`);
  if (!force && fs.existsSync(destination)) {
    console.log(`Giữ lại ${destination}`);
    continue;
  }
  const source = resolveExecutable(name);
  if (!source) {
    console.error(`Không tìm thấy ${name}. Cài FFmpeg rồi chạy lại, hoặc đặt JACS_${name.toUpperCase()}_PATH.`);
    process.exitCode = 1;
    continue;
  }
  fs.copyFileSync(source, destination);
  if (process.platform !== "win32") fs.chmodSync(destination, 0o755);
  console.log(`Đã chuẩn bị ${destination} từ ${source}`);
}

if (process.exitCode) process.exit(process.exitCode);
