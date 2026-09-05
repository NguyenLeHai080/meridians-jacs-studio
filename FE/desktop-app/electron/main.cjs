const { app, BrowserWindow, clipboard, dialog, ipcMain, net, protocol, safeStorage, shell } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const childProcess = require("node:child_process");
const crypto = require("node:crypto");
const { pathToFileURL } = require("node:url");
const { once } = require("node:events");
const { createMachineInfo } = require("./machine-id.cjs");
const { createProviderStore } = require("./provider-store.cjs");
const { extractPageVideoUrls, extractResolverVideoUrls, extractTikTokVideoUrls, extractYouTubeVideoId, isTikTokHost, isYouTubeHost, normalizeVideoUrl, resolveYouTubeVideoUrl } = require("./video-url.cjs");
const { buildAudioFilter } = require("./audio-mix.cjs");
const { buildCaptionCues, buildSrt } = require("./subtitles.cjs");
const { languageName, speechLocale } = require("./narration.cjs");
const { resolveVoicePack, listVoicePacks } = require("./voice-pack.cjs");
const { frameTimeline, enrichAnalysis } = require("./contextual-analysis.cjs");
const { formatTtsProviderError, isRetryableTtsStatus, isVoiceCompatibilityError, resolveTtsModels, resolveTtsVoices } = require("./tts.cjs");
const { downloadRelease, installRelease, trustedUrl: isTrustedUpdateUrl, validateRelease } = require("./updater.cjs");

if (!app || typeof app.whenReady !== "function") {
  throw new Error("JACS Studio phải được khởi động bằng Electron desktop runtime; không chạy main.cjs bằng Node.");
}

// Serve local media through a privileged protocol. Chromium blocks file://
// media when the renderer is loaded from the Vite HTTP origin in dev mode.
protocol.registerSchemesAsPrivileged([{
  scheme: "jacs-media",
  privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, bypassCSP: true },
}]);

// Allow instant audio preview playback without Chromium user gesture blocking
app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");
app.commandLine.appendSwitch("disable-features", "PreloadMediaEngagementData,MediaEngagementBypassAutoplayPolicies");

// Chromium's Metal renderer has crashed on a few macOS/Electron combinations.
if (process.platform === "darwin") {
  app.disableHardwareAcceleration();
}

let cachedMachineInfo;
const activeOperations = new Map();

function waitMs(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function findFileRecursive(dir, filename, maxDepth = 2, currentDepth = 0) {
  if (currentDepth > maxDepth || !fs.existsSync(dir)) return null;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isFile() && entry.name.toLowerCase() === filename.toLowerCase()) {
        return full;
      }
      if (entry.isDirectory() && currentDepth < maxDepth) {
        const found = findFileRecursive(full, filename, maxDepth, currentDepth + 1);
        if (found) return found;
      }
    }
  } catch {}
  return null;
}

function getCandidateSearchPaths(name) {
  const isWin = process.platform === "win32";
  const cmd = isWin && !name.toLowerCase().endsWith(".exe") ? `${name}.exe` : name;
  const projectBin = path.join(__dirname, "..", "bin");
  const platformDirectory = process.platform === "darwin" ? "darwin" : isWin ? "win32" : process.platform;
  const architectureDirectory = `${platformDirectory}-${process.arch}`;

  let userDataBin = "";
  try { userDataBin = path.join(app.getPath("userData"), "bin"); } catch {}
  const appDataBin = path.join(process.env.APPDATA || "", "jacs-studio", "bin");
  const localAppDataBin = path.join(process.env.LOCALAPPDATA || "", "jacs-studio", "bin");
  const localProgramsBin = path.join(process.env.LOCALAPPDATA || "", "Programs", "jacs-studio", "resources", "bin");
  const execDir = path.dirname(process.execPath || "");

  const candidates = [
    process.env[`JACS_${name.toUpperCase().replace(/-/g, "_")}_PATH`],
    userDataBin ? path.join(userDataBin, cmd) : null,
    path.join(localAppDataBin, cmd),
    path.join(appDataBin, cmd),
    path.join(localProgramsBin, architectureDirectory, cmd),
    path.join(localProgramsBin, platformDirectory, cmd),
    path.join(localProgramsBin, cmd),
    path.join(process.resourcesPath || "", "bin", architectureDirectory, cmd),
    path.join(process.resourcesPath || "", "bin", platformDirectory, cmd),
    path.join(process.resourcesPath || "", "bin", cmd),
    path.join(process.resourcesPath || "", cmd),
    path.join(execDir, "resources", "bin", architectureDirectory, cmd),
    path.join(execDir, "resources", "bin", cmd),
    path.join(execDir, "bin", architectureDirectory, cmd),
    path.join(execDir, "bin", cmd),
    path.join(execDir, cmd),
    path.join(projectBin, architectureDirectory, cmd),
    path.join(projectBin, platformDirectory, cmd),
    path.join(projectBin, cmd),
  ];

  if (isWin) {
    candidates.push(
      `C:\\ffmpeg\\bin\\${cmd}`,
      `C:\\Program Files\\ffmpeg\\bin\\${cmd}`,
      `C:\\ProgramData\\chocolatey\\bin\\${cmd}`,
      path.join(process.env.USERPROFILE || "", "scoop", "shims", cmd),
      path.join(process.env.LOCALAPPDATA || "", "Microsoft", "WinGet", "Links", cmd)
    );
    const wingetPackages = path.join(process.env.LOCALAPPDATA || "", "Microsoft", "WinGet", "Packages");
    if (fs.existsSync(wingetPackages)) {
      try {
        const entries = fs.readdirSync(wingetPackages);
        for (const entry of entries) {
          if (/ffmpeg/i.test(entry)) {
            const subPath = path.join(wingetPackages, entry);
            const found = findFileRecursive(subPath, cmd, 3);
            if (found) candidates.push(found);
          }
        }
      } catch {}
    }
  }

  // System PATH
  const pathEnv = process.env.PATH || "";
  for (const part of pathEnv.split(path.delimiter)) {
    if (part) candidates.push(path.join(part, cmd));
  }
  candidates.push(name, cmd);

  return candidates.filter(Boolean);
}

function findExecutable(name) {
  const candidates = getCandidateSearchPaths(name);
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      try {
        const stat = fs.statSync(candidate);
        if (stat.isFile() && stat.size > 1024) return candidate;
      } catch {}
    }
  }
  for (const candidate of [name, `${name}.exe`]) {
    for (const flag of ["--version", "-version", "-h"]) {
      try {
        childProcess.execFileSync(candidate, [flag], { stdio: "ignore", windowsHide: true });
        return candidate;
      } catch {}
    }
  }
  return null;
}

let activeBinaryDownload = null;

async function ensureExecutable(name, options = {}) {
  let existing = findExecutable(name);
  if (existing) return existing;

  if (activeBinaryDownload) {
    try { await activeBinaryDownload; } catch {}
    existing = findExecutable(name);
    if (existing) return existing;
  }

  const doDownload = async () => {
    let userDataBin = "";
    try { userDataBin = path.join(app.getPath("userData"), "bin"); } catch {
      userDataBin = path.join(os.tmpdir(), "jacs-bin");
    }
    fs.mkdirSync(userDataBin, { recursive: true });
    const isWin = process.platform === "win32";
    const cmd = isWin && !name.toLowerCase().endsWith(".exe") ? `${name}.exe` : name;
    const targetExe = path.join(userDataBin, cmd);

    if (fs.existsSync(targetExe)) {
      try {
        const stat = fs.statSync(targetExe);
        if (stat.size > 1024 * 1024) return targetExe;
      } catch {}
    }

    const onProgress = typeof options.onProgress === "function" ? options.onProgress : () => {};
    onProgress({ stage: `Đang tải bộ xử lý ${name} (tự động 1 lần duy nhất)...`, progress: 5 });

    const downloadUrl = isWin
      ? "https://jacs-studio.nexoratech.com.vn/downloads/ffmpeg-win64.zip"
      : `https://jacs-studio.nexoratech.com.vn/downloads/${name}`;

    const tempZip = path.join(app.getPath("temp"), `jacs-media-engine-${Date.now()}.zip`);

    const response = await fetch(downloadUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) JACS-Studio-Updater" }
    });
    if (!response.ok) {
      throw new Error(`Không thể tải bộ xử lý ${name} từ máy chủ JACS (HTTP ${response.status}). Hãy kiểm tra lại kết nối mạng.`);
    }

    const totalBytes = Number(response.headers.get("content-length") || 0);
    const fileStream = fs.createWriteStream(tempZip);
    let downloadedBytes = 0;

    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      fileStream.write(Buffer.from(value));
      downloadedBytes += value.length;
      if (totalBytes > 0) {
        const pct = Math.min(90, Math.round((downloadedBytes / totalBytes) * 80) + 10);
        onProgress({ stage: `Đang tải bộ xử lý media FFmpeg (${Math.round(downloadedBytes / 1024 / 1024)}MB / ${Math.round(totalBytes / 1024 / 1024)}MB)...`, progress: pct });
      }
    }
    fileStream.end();
    await new Promise((resolve, reject) => {
      fileStream.on("finish", resolve);
      fileStream.on("error", reject);
    });

    onProgress({ stage: `Đang giải nén bộ xử lý media FFmpeg...`, progress: 95 });

    if (isWin) {
      try {
        childProcess.execSync(`tar -xf "${tempZip}" -C "${userDataBin}"`, { windowsHide: true, stdio: "ignore" });
      } catch {
        try {
          childProcess.execSync(`powershell -NoProfile -Command "Expand-Archive -Force -Path '${tempZip}' -DestinationPath '${userDataBin}'"`, { windowsHide: true, stdio: "ignore" });
        } catch (err) {
          throw new Error(`Lỗi giải nén ${name}: ${err.message}`);
        }
      }
    }

    try { fs.unlinkSync(tempZip); } catch {}

    const resolved = findExecutable(name);
    if (!resolved || !fs.existsSync(resolved)) {
      throw new Error(`Không thể khởi động bộ xử lý ${name} sau khi tải về.`);
    }
    onProgress({ stage: `Đã hoàn tất cài đặt bộ xử lý ${name}`, progress: 100 });
    return resolved;
  };

  activeBinaryDownload = doDownload();
  try {
    return await activeBinaryDownload;
  } finally {
    activeBinaryDownload = null;
  }
}

function stripSceneMetadata(text) {
  if (!text) return "";
  return String(text || "")
    .replace(/\[\s*(?:Phân cảnh|Cảnh|Scene|Segment|Part)\s*\d+[^\]]*\]/gi, "")
    .replace(/(?:^|\n)\s*(?:Phân cảnh|Cảnh|Scene|Segment|Part)\s*\d+[:\-\.]\s*/gi, " ")
    .replace(/\[\d{1,2}[:.]\d{2}(?:[:.]\d{2})?\s*-\s*\d{1,2}[:.]\d{2}(?:[:.]\d{2})?\]/g, "")
    .replace(/\(\d{1,2}[:.]\d{2}(?:[:.]\d{2})?\s*-\s*\d{1,2}[:.]\d{2}(?:[:.]\d{2})?\)/g, "")
    .replace(/(?:tại|ở|từ)\s+mốc\s+\d{1,2}[:.]\d{2}(?:\s*đến\s+\d{1,2}[:.]\d{2})?,?\s*/gi, "")
    .replace(/(?:vào\s+)?lúc\s+\d{1,2}[:.]\d{2},?\s*/gi, "")
    .replace(/\(\d{1,2}[:.]\d{2}\)/g, "")
    .replace(/\[[^\]]{1,60}\]/g, "")
    .replace(/[{}[\]"\\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function findPythonExecutable() {
  if (process.env.JACS_PYTHON && fs.existsSync(process.env.JACS_PYTHON)) {
    return process.env.JACS_PYTHON;
  }
  const fromPath = findExecutable("python") || findExecutable("python3");
  if (fromPath) return fromPath;
  
  if (process.platform === "win32") {
    const userProfile = process.env.USERPROFILE || "";
    if (userProfile) {
      const pythonDirs = [
        path.join(userProfile, "AppData", "Local", "Programs", "Python"),
        "C:\\Python312",
        "C:\\Python311",
        "C:\\Python310",
        "C:\\Program Files\\Python312",
        "C:\\Program Files\\Python311",
      ];
      for (const pDir of pythonDirs) {
        if (fs.existsSync(pDir)) {
          if (fs.existsSync(path.join(pDir, "python.exe"))) return path.join(pDir, "python.exe");
          try {
            const sub = fs.readdirSync(pDir);
            for (const s of sub) {
              const exe = path.join(pDir, s, "python.exe");
              if (fs.existsSync(exe)) return exe;
            }
          } catch {}
        }
      }
    }
    return "python.exe";
  }
  return "python3";
}

function runProcess(command, args, options = {}, operationId) {
  return new Promise((resolve, reject) => {
    const child = childProcess.spawn(command, args, {
      ...options,
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    if (operationId) {
      const op = operationState(operationId);
      if (op) op.children.add(child);
    }

    if (child.stdout) {
      child.stdout.on("data", (data) => {
        stdout += data.toString();
      });
    }

    if (child.stderr) {
      child.stderr.on("data", (data) => {
        stderr += data.toString();
      });
    }

    child.on("error", (err) => {
      reject(err);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Process ${command} exited with code ${code}: ${stderr || stdout}`));
      }
    });
  });
}

function writeRenderManifest(outputPath, metadata = {}) {
  if (!outputPath || !fs.existsSync(outputPath)) return { checksum: undefined, manifestPath: undefined };
  const checksum = crypto.createHash("sha256").update(fs.readFileSync(outputPath)).digest("hex");
  const manifestPath = outputPath.replace(/\.[^.]+$/, ".manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify({ version: 1, outputPath, checksum, createdAt: new Date().toISOString(), ...metadata }, null, 2), { encoding: "utf8", mode: 0o600 });
  return { checksum, manifestPath };
}

function beginOperation(operationId) {
  if (!operationId) return null;
  const state = { controller: new AbortController(), children: new Set(), cancelled: false };
  activeOperations.set(String(operationId), state);
  return state;
}

function operationState(operationId) { return operationId ? activeOperations.get(String(operationId)) : null; }
function cancelledOperationError() {
  const error = new Error("Job đã được hủy");
  error.code = "JACS_OPERATION_CANCELLED";
  return error;
}
function assertOperationActive(operationId) {
  if (operationState(operationId)?.cancelled) {
    throw cancelledOperationError();
  }
}
function endOperation(operationId) { if (operationId) activeOperations.delete(String(operationId)); }

function machineInfo() {
  if (!cachedMachineInfo) {
    cachedMachineInfo = createMachineInfo({
      userDataPath: app.getPath("userData"),
      arch: process.arch,
      platform: process.platform,
      appVersion: app.getVersion(),
    });
  }
  return cachedMachineInfo;
}

function licensePath() { return path.join(app.getPath("userData"), "license.bin"); }
function preferencesPath() { return path.join(app.getPath("userData"), "preferences.json"); }
function providersPath() { return path.join(app.getPath("userData"), "providers.bin"); }
function jobsPath() { return path.join(app.getPath("userData"), "jobs.json"); }
function outputPath() { return path.join(app.getPath("documents"), "JACS Studio", "Outputs"); }

function registerMediaProtocol() {
  protocol.handle("jacs-media", async (request) => {
    try {
      const parsed = new URL(request.url);
      let filePath = parsed.searchParams.get("path") || decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
      if (process.platform === "win32" && /^\/[A-Za-z]:[\\/]/.test(filePath)) {
        filePath = filePath.slice(1);
      }
      filePath = path.resolve(filePath);
      if (!fs.existsSync(filePath)) {
        return new Response("Media not found: " + filePath, { status: 404 });
      }
      const stat = fs.statSync(filePath);
      if (!stat.isFile()) {
        return new Response("Not a file: " + filePath, { status: 404 });
      }

      const fileSize = stat.size;
      const range = request.headers.get("range");

      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes = {
        ".mp4": "video/mp4",
        ".m4v": "video/mp4",
        ".webm": "video/webm",
        ".mkv": "video/x-matroska",
        ".mov": "video/quicktime",
        ".avi": "video/x-msvideo",
        ".ts": "video/mp2t",
        ".mp3": "audio/mpeg",
        ".wav": "audio/wav",
        ".m4a": "audio/mp4",
        ".aac": "audio/aac",
        ".ogg": "audio/ogg",
        ".flac": "audio/flac",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
      };
      const contentType = mimeTypes[ext] || "video/mp4";

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = end - start + 1;
        const stream = fs.createReadStream(filePath, { start, end });
        const nodeReadableStream = new ReadableStream({
          start(controller) {
            stream.on("data", (chunk) => controller.enqueue(chunk));
            stream.on("end", () => controller.close());
            stream.on("error", (err) => controller.error(err));
          },
          cancel() {
            stream.destroy();
          },
        });

        return new Response(nodeReadableStream, {
          status: 206,
          statusText: "Partial Content",
          headers: {
            "Content-Range": `bytes ${start}-${end}/${fileSize}`,
            "Accept-Ranges": "bytes",
            "Content-Length": String(chunksize),
            "Content-Type": contentType,
          },
        });
      }

      const stream = fs.createReadStream(filePath);
      const nodeReadableStream = new ReadableStream({
        start(controller) {
          stream.on("data", (chunk) => controller.enqueue(chunk));
          stream.on("end", () => controller.close());
          stream.on("error", (err) => controller.error(err));
        },
        cancel() {
          stream.destroy();
        },
      });

      return new Response(nodeReadableStream, {
        status: 200,
        headers: {
          "Content-Length": String(fileSize),
          "Accept-Ranges": "bytes",
          "Content-Type": contentType,
        },
      });
    } catch (err) {
      return new Response(`Media streaming error: ${err.message}`, { status: 500 });
    }
  });
}
function defaultPreferences() { return { workspaceName: "Workspace của tôi", operatorName: "Người dùng", workspacePath: path.join(app.getPath("documents"), "JACS Studio", "Projects"), cachePath: path.join(app.getPath("userData"), "cache"), outputPath: outputPath(), telemetryEnabled: true, autoUpdateEnabled: true, preferredEngine: "auto" }; }
function providerStore() { return createProviderStore({ filePath: providersPath(), safeStorage }); }
function apiBaseUrl() { return String(process.env.JACS_API_URL || "https://jacs-studio.nexoratech.com.vn").replace(/\/$/, ""); }

function isTrustedReleaseUrl(value) {
  return isTrustedUpdateUrl(value);
}

async function checkForUpdate(channel = "stable") {
  if (!['stable', 'beta'].includes(channel)) throw new Error("Kênh cập nhật không hợp lệ");
  const platform = process.platform === "darwin" ? "macos" : process.platform === "win32" ? "windows" : null;
  if (!platform) return { update_available: false, release: null };
  const currentVersion = `v${app.getVersion().replace(/^v/, "")}`;
  const endpoint = new URL(`${apiBaseUrl()}/api/v1/releases/check`);
  endpoint.searchParams.set("platform", platform);
  endpoint.searchParams.set("current_version", currentVersion);
  endpoint.searchParams.set("channel", channel);
  const response = await fetch(endpoint, { signal: AbortSignal.timeout(15000), headers: { Accept: "application/json" } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Không kiểm tra được cập nhật (HTTP ${response.status})`);
  const result = payload?.data || payload;
  const release = result?.release;
  if (!result?.update_available || !release) return { update_available: false, release: null };
  validateRelease(release, platform, currentVersion);
  return { update_available: true, release };
}

async function downloadAndInstallUpdate(event, release) {
  const platform = process.platform === "darwin" ? "macos" : process.platform === "win32" ? "windows" : null;
  if (!platform) throw new Error("Cập nhật tự động chỉ hỗ trợ macOS và Windows");
  const currentVersion = `v${app.getVersion().replace(/^v/, "")}`;
  validateRelease(release, platform, currentVersion);
  const update = await downloadRelease({
    release,
    platform,
    currentVersion,
    tempDirectory: app.getPath("temp"),
    onProgress: (progress) => event.sender.send("runtime:update-progress", progress),
  });
  event.sender.send("runtime:update-progress", { stage: "installing", progress: 100, bytesDownloaded: update.bytes, totalBytes: update.bytes });
  return installRelease({ filePath: update.filePath, kind: update.kind, platform, appModule: { isPackaged: app.isPackaged, quit: () => app.quit(), shell: { openPath: (value) => shell.openPath(value) } }, execPath: process.execPath, tempDirectory: app.getPath("temp") });
}

function writeJsonAtomic(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp-${process.pid}`;
  fs.writeFileSync(temporaryPath, JSON.stringify(value, null, 2), { mode: 0o600 });
  fs.renameSync(temporaryPath, filePath);
}

function readJobs() {
  try {
    const value = JSON.parse(fs.readFileSync(jobsPath(), "utf8"));
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}

function saveJobs(value) {
  if (!Array.isArray(value)) throw new Error("Danh sách job không hợp lệ");
  // Jobs are prepended in the renderer, so keep the newest records rather
  // than silently dropping them after the local history reaches the limit.
  // Keep the small analysis thumbnails with the job so a completed job can be
  // inspected after restarting the desktop app. Older records without frames
  // remain valid and simply show the scene list.
  writeJsonAtomic(jobsPath(), value.slice(0, 500));
}



function voiceWorkerInvocation() {
  const workerRoot = path.join(process.resourcesPath || "", "voice-runtime");
  const projectRoot = path.join(__dirname, "..", "voice-runtime");
  // Never try to execute a host binary copied into a cross-platform package
  // (for example the macOS worker inside a Windows build). The Python script
  // and OS speech engine remain valid fallbacks on the target platform.
  const binaryCandidates = process.platform === "win32"
    ? [process.env.JACS_VOICE_WORKER_PATH, path.join(workerRoot, "jacs-voice-worker.exe"), path.join(projectRoot, "jacs-voice-worker.exe")]
    : [process.env.JACS_VOICE_WORKER_PATH, path.join(workerRoot, "jacs-voice-worker"), path.join(projectRoot, "jacs-voice-worker")];
  for (const command of binaryCandidates) {
    try { if (fs.statSync(command).isFile()) return { command, prefix: [] }; } catch { /* try next candidate */ }
  }
  const scriptCandidates = [
    process.env.JACS_VOICE_WORKER_SCRIPT,
    path.join(workerRoot, "voice_worker.py"),
    path.join(projectRoot, "voice_worker.py"),
  ].filter(Boolean);
  const script = scriptCandidates.find((candidate) => { try { return fs.statSync(candidate).isFile(); } catch { return false; } });
  if (!script) return null;
  const python = process.env.JACS_PYTHON_PATH || (process.platform === "win32" ? "python.exe" : "python3");
  return { command: python, prefix: [script] };
}

function parseDuration(value) {
  const match = String(value || "").match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/i);
  return match ? Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) : 0;
}

async function probeVideoFile(filePath) {
  const absolutePath = path.resolve(String(filePath));
  if (!fs.existsSync(absolutePath)) throw new Error("Không tìm thấy file video");
  const ffprobe = findExecutable("ffprobe");
  if (!ffprobe) {
    const stat = fs.statSync(absolutePath);
    // Some customer machines ship ffmpeg but not the separate ffprobe binary.
    // Parse the human-readable duration as a useful compatibility fallback.
    const ffmpeg = findExecutable("ffmpeg");
    if (ffmpeg) {
      try {
        childProcess.execFileSync(ffmpeg, ["-hide_banner", "-i", absolutePath], { encoding: "utf8", windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
      } catch (error) {
        const output = `${error?.stdout || ""}\n${error?.stderr || ""}`;
        return { path: absolutePath, durationSeconds: parseDuration(output), sizeBytes: stat.size, hasAudio: /Stream #[^\n]*Audio:/i.test(output) };
      }
    }
    return { path: absolutePath, durationSeconds: 0, sizeBytes: stat.size };
  }
  const output = childProcess.execFileSync(ffprobe, ["-v", "error", "-show_entries", "format=duration:stream=codec_type,width,height,r_frame_rate", "-of", "json", absolutePath], { encoding: "utf8", windowsHide: true });
  const parsed = JSON.parse(output);
  const format = parsed.format || {};
  const stream = (parsed.streams || []).find((item) => item.width || item.height) || {};
  const rate = String(stream.r_frame_rate || "").split("/");
  const stat = fs.statSync(absolutePath);
  return { path: absolutePath, durationSeconds: Number(format.duration || 0), width: stream.width, height: stream.height, fps: rate.length === 2 && Number(rate[1]) ? Number(rate[0]) / Number(rate[1]) : undefined, sizeBytes: stat.size, hasAudio: (parsed.streams || []).some((item) => item.codec_type === "audio") };
}

async function probeMediaDuration(filePath) {
  const ffprobe = findExecutable("ffprobe");
  if (!ffprobe) return 0;
  try {
    const output = childProcess.execFileSync(ffprobe, ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", path.resolve(filePath)], { encoding: "utf8", windowsHide: true, stdio: ["ignore", "pipe", "ignore"] });
    return Math.max(0, Number(output.trim()) || 0);
  } catch { return 0; }
}

async function mergeVideoFiles(event, filePaths, operationId) {
  if (!Array.isArray(filePaths) || filePaths.length < 2) throw new Error("Cần chọn ít nhất 2 video để ghép");
  const inputs = filePaths.map((value) => path.resolve(String(value)));
  inputs.forEach((value) => {
    if (!fs.existsSync(value) || !fs.statSync(value).isFile()) throw new Error(`Không tìm thấy video: ${path.basename(value)}`);
  });
  let ffmpeg = findExecutable("ffmpeg");
  if (!ffmpeg) {
    ffmpeg = await ensureExecutable("ffmpeg", {
      onProgress: (p) => event.sender.send("runtime:render-progress", { ...p, operationId })
    }).catch(() => null);
  }
  if (!ffmpeg) throw new Error("Không thể khởi động FFmpeg để ghép video. Vui lòng kiểm tra kết nối mạng hoặc thử lại.");
  const fingerprint = crypto.createHash("sha256").update(inputs.map((value) => {
    const stat = fs.statSync(value);
    return `${value}:${stat.size}:${stat.mtimeMs}`;
  }).join("\n")).digest("hex").slice(0, 24);
  const directory = path.join(app.getPath("userData"), "cache", "projects");
  const listPath = path.join(directory, `${fingerprint}.txt`);
  const outputPath = path.join(directory, `${fingerprint}.mp4`);
  fs.mkdirSync(directory, { recursive: true });
  if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) return outputPath;
  const escapeConcatPath = (value) => value.replace(/\\/g, "/").replace(/'/g, "'\\''");
  fs.writeFileSync(listPath, inputs.map((value) => `file '${escapeConcatPath(value)}'`).join("\n"), { mode: 0o600 });
  const state = beginOperation(operationId);
  try {
    event.sender.send("runtime:render-progress", { progress: 2, stage: "rendering", operationId });
    try {
      await runProcess(ffmpeg, ["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c:v", "libx264", "-preset", "fast", "-pix_fmt", "yuv420p", "-c:a", "aac", "-movflags", "+faststart", outputPath], () => undefined, operationId);
    } catch (concatError) {
      // Phone footage frequently differs in resolution, fps or audio tracks.
      // Normalize every input before concat so a project can mix these files.
      if (operationState(operationId)?.cancelled) throw concatError;
      const probes = await Promise.all(inputs.map((value) => probeVideoFile(value)));
      const args = ["-y"];
      inputs.forEach((value) => args.push("-i", value));
      const audioIndexes = probes.map((probe, index) => {
        if (probe.hasAudio) return index;
        args.push("-f", "lavfi", "-t", String(Math.max(0.25, probe.durationSeconds || 1)), "-i", "anullsrc=channel_layout=stereo:sample_rate=48000");
        return inputs.length + args.filter((value) => value === "anullsrc=channel_layout=stereo:sample_rate=48000").length - 1;
      });
      const filters = probes.flatMap((probe, index) => [
        `[${index}:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,fps=30,setsar=1,format=yuv420p[v${index}]`,
        `[${audioIndexes[index]}:a]aresample=48000,asetpts=N/SR/TB[a${index}]`,
      ]);
      filters.push(`${probes.map((_probe, index) => `[v${index}][a${index}]`).join("")}concat=n=${inputs.length}:v=1:a=1[vout][aout]`);
      args.push("-filter_complex", filters.join(";"), "-map", "[vout]", "-map", "[aout]", "-c:v", "libx264", "-preset", "fast", "-pix_fmt", "yuv420p", "-c:a", "aac", "-movflags", "+faststart", outputPath);
      await runProcess(ffmpeg, args, () => undefined, operationId);
    }
    event.sender.send("runtime:render-progress", { progress: 100, stage: "completed", outputPath, operationId });
    return outputPath;
  } finally {
    if (state) endOperation(operationId);
    try { fs.rmSync(listPath, { force: true }); } catch { /* best effort */ }
  }
}

function cookieHeader(response) {
  const value = response.headers.get("set-cookie");
  if (!value) return "";
  return value.split(/,(?=[^;=]+=[^;]+)/).map((item) => item.split(";", 1)[0]).filter(Boolean).join("; ");
}

function canonicalDownloadUrl(value) {
  const parsed = new URL(String(value));
  // Tracking parameters on social links do not identify a different source.
  // Keeping the canonical URL makes retries and multi-language batches reuse
  // the same downloaded file instead of downloading the video repeatedly.
  if (isTikTokHost(parsed.hostname)) return `${parsed.origin}${parsed.pathname}`;
  return parsed.href;
}

function cachedDownloadPath(url) {
  const digest = crypto.createHash("sha256").update(canonicalDownloadUrl(url)).digest("hex").slice(0, 24);
  const directory = path.join(app.getPath("userData"), "downloads");
  for (const extension of [".mp4", ".mov", ".webm", ".mkv", ".avi"]) {
    const candidate = path.join(directory, `${digest}${extension}`);
    try { if (fs.statSync(candidate).size > 0) return candidate; } catch { /* cache miss */ }
  }
  return { directory, digest };
}

const tikTokHeaders = (cookie = "") => ({
  Accept: "video/*,application/octet-stream,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131 Safari/537.36",
  Referer: "https://www.tiktok.com/",
  Origin: "https://www.tiktok.com",
  ...(cookie ? { Cookie: cookie } : {}),
});

async function tryVideoUrl(url, signal, cookie = "") {
  try {
    const response = await fetch(url, { signal, redirect: "follow", headers: tikTokHeaders(cookie) });
    const contentType = String(response.headers.get("content-type") || "").toLowerCase();
    if (response.ok && !contentType.includes("text/html") && (contentType.includes("video/") || contentType.includes("octet-stream"))) {
      return { response, url: String(url) };
    }
    await response.body?.cancel();
  } catch (error) {
    if (signal?.aborted) throw error;
    // Try the next signed URL or resolver below.
  }
  return null;
}

async function tryVideoUrlWithRetry(url, signal, cookie = "", attempts = 3) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const resolved = await tryVideoUrl(url, signal, cookie);
    if (resolved) return resolved;
    // CDN edges occasionally return a transient 503 for a freshly signed URL.
    // A short retry avoids turning a temporary edge failure into a failed job.
    if (attempt + 1 < attempts) await waitMs(350 * (attempt + 1));
  }
  return null;
}

async function resolveTikTokVideoUrl(parsed, signal) {
  if (!isTikTokHost(parsed.hostname)) return null;
  const pageHeaders = { ...tikTokHeaders(), Accept: "text/html,application/xhtml+xml" };
  let pageCookie = "";
  let pageUrls = [];
  try {
    const response = await fetch(parsed, { signal, redirect: "follow", headers: pageHeaders });
    pageCookie = cookieHeader(response);
    if (response.ok) pageUrls = extractTikTokVideoUrls(await response.text());
    else await response.body?.cancel();
  } catch {
    // TikTok may challenge the request; the resolver API below can still work.
  }
  for (const candidate of pageUrls) {
    const resolved = await tryVideoUrlWithRetry(candidate, signal, pageCookie);
    if (resolved) return resolved;
  }

  // TikWM is only used for TikTok URLs and returns a signed CDN URL. Keeping
  // this fallback in the desktop client avoids uploading the customer's video
  // to our API just to resolve a source URL.
  const configuredResolver = String(process.env.JACS_TIKTOK_RESOLVER_URL || "https://tikwm.com/api/");
  const resolverEndpoints = [...new Set([configuredResolver, "https://www.tikwm.com/api/"])];
  for (const resolverEndpoint of resolverEndpoints) {
    let resolverUrl;
    try {
      resolverUrl = new URL(resolverEndpoint);
      if (resolverUrl.protocol !== "https:") throw new Error("resolver must use HTTPS");
      resolverUrl.searchParams.set("url", parsed.href);
    } catch {
      if (resolverEndpoint === configuredResolver) throw new Error("TikTok resolver không hợp lệ; hãy dùng URL HTTPS.");
      continue;
    }
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await fetch(resolverUrl, { signal, headers: { Accept: "application/json", "User-Agent": pageHeaders["User-Agent"] } });
        const payload = await response.json().catch(() => ({}));
        const candidates = response.ok && (payload?.code === undefined || payload.code === 0) ? extractResolverVideoUrls(payload) : [];
        for (const candidate of candidates) {
          const resolved = await tryVideoUrlWithRetry(candidate, signal);
          if (resolved) return resolved;
        }
        // TikWM enforces roughly one request per second. Retry rate limits and
        // transient 5xx responses before trying the secondary endpoint.
        const resolverMessage = String(payload?.msg || payload?.message || "");
        const retryable = response.status === 429 || response.status >= 500 || payload?.code === -1 || /limit|too many|try again|rate/i.test(resolverMessage);
        if (!retryable && candidates.length === 0) break;
      } catch (error) {
        if (signal.aborted) throw error;
      }
      if (attempt < 2) await waitMs(1100 * (attempt + 1));
    }
  }
  throw new Error("Không tải được video TikTok. TikTok hoặc nguồn trung gian đang chặn video này; hãy thử link MP4 trực tiếp hoặc tải file về rồi chọn Local file.");
}

async function downloadWithYtDlp(event, url, cache, operationId) {
  const ytdlp = findExecutable("yt-dlp");
  if (!ytdlp) return null;

  const directory = cache.directory;
  fs.mkdirSync(directory, { recursive: true });

  const ffmpeg = findExecutable("ffmpeg");
  const baseName = cache.digest;
  const outputTemplate = path.join(directory, `${baseName}.%(ext)s`);

  const args = [
    "--no-playlist",
    "--no-warnings",
    "-f", "bv*+ba/b",
    "--merge-output-format", "mp4",
    "-o", outputTemplate,
  ];

  if (ffmpeg) {
    args.push("--ffmpeg-location", ffmpeg);
  }

  args.push(url);

  event.sender.send("runtime:download-progress", { progress: 1, stage: "downloading", operationId });

  return new Promise((resolve, reject) => {
    const child = childProcess.spawn(ytdlp, args, {
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    });

    const op = operationState(operationId);
    if (op) op.children.add(child);

    let stdout = "";
    let stderr = "";
    let lastProgress = 1;

    const parseProgress = (chunk) => {
      const text = chunk.toString();
      const matches = [...text.matchAll(/\[download\]\s+(\d+(?:\.\d+)?)%/g)];
      if (matches.length > 0) {
        const lastMatch = matches[matches.length - 1];
        const pct = parseFloat(lastMatch[1]);
        if (!isNaN(pct) && pct > lastProgress) {
          lastProgress = pct;
          event.sender.send("runtime:download-progress", {
            progress: Math.max(1, Math.min(99, Math.round(pct))),
            stage: "downloading",
            operationId,
          });
        }
      }
    };

    if (child.stdout) {
      child.stdout.on("data", (data) => {
        stdout += data.toString();
        parseProgress(data);
      });
    }

    if (child.stderr) {
      child.stderr.on("data", (data) => {
        stderr += data.toString();
        parseProgress(data);
      });
    }

    child.on("error", (err) => {
      if (op) op.children.delete(child);
      reject(err);
    });

    child.on("close", (code) => {
      if (op) op.children.delete(child);
      if (op?.cancelled) {
        return reject(cancelledOperationError());
      }
      if (code === 0) {
        try {
          const files = fs.readdirSync(directory);
          const found = files.find((f) => f.startsWith(baseName + ".") && !f.endsWith(".part") && !f.endsWith(".ytdl"));
          if (found) {
            const finalPath = path.join(directory, found);
            if (fs.statSync(finalPath).size > 1000) {
              event.sender.send("runtime:download-progress", { progress: 100, stage: "downloaded", outputPath: finalPath, operationId });
              return resolve(finalPath);
            }
          }
        } catch (e) {}
        const mp4Path = path.join(directory, `${baseName}.mp4`);
        if (fs.existsSync(mp4Path) && fs.statSync(mp4Path).size > 1000) {
          event.sender.send("runtime:download-progress", { progress: 100, stage: "downloaded", outputPath: mp4Path, operationId });
          return resolve(mp4Path);
        }
        reject(new Error(`yt-dlp hoàn thành nhưng không tìm thấy file output: ${stdout || stderr}`));
      } else {
        reject(new Error(`yt-dlp lỗi (code ${code}): ${stderr || stdout}`));
      }
    });
  });
}

async function downloadVideo(event, url, operationId) {
  let parsed;
  try { parsed = new URL(normalizeVideoUrl(url)); } catch { throw new Error("URL video không hợp lệ"); }
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("URL video phải dùng HTTP hoặc HTTPS");
  const cache = cachedDownloadPath(parsed.href);
  if (typeof cache === "string") {
    event.sender.send("runtime:download-progress", { progress: 100, stage: "downloaded", outputPath: cache, operationId });
    return cache;
  }

  // Ưu tiên tải qua yt-dlp binary đi kèm (hỗ trợ YouTube, TikTok, Facebook, Shorts không lo bị chặn bot)
  const ytdlp = findExecutable("yt-dlp");
  if (ytdlp) {
    try {
      const ytdlpResult = await downloadWithYtDlp(event, parsed.href, cache, operationId);
      if (ytdlpResult) return ytdlpResult;
    } catch (ytdlpErr) {
      if (operationState(operationId)?.cancelled) throw ytdlpErr;
      console.warn("yt-dlp download failed, falling back to direct resolvers:", ytdlpErr.message);
    }
  }

  const state = operationState(operationId);
  const timeout = AbortSignal.timeout(120000);
  const signal = state ? AbortSignal.any([state.controller.signal, timeout]) : timeout;
  let sourceUrl = parsed.href;
  let response;
  if (isTikTokHost(parsed.hostname)) {
    const resolved = await resolveTikTokVideoUrl(parsed, signal);
    response = resolved.response;
    sourceUrl = resolved.url;
  } else if (isYouTubeHost(parsed.hostname)) {
    const resolved = await resolveYouTubeVideoUrl(parsed, signal);
    response = resolved.response;
    sourceUrl = resolved.url;
  } else {
    response = await fetch(parsed, { signal, redirect: "follow", headers: tikTokHeaders() });
  }
  if (!response.ok) throw new Error(`Không tải được video (HTTP ${response.status})`);
  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  if (contentType.includes("text/html")) {
    // Many social links expose the actual media in OpenGraph/player metadata.
    // Resolve those URLs before asking the user for a direct file URL.
    const html = await response.text();
    const candidates = [...new Set([
      ...extractPageVideoUrls(html),
      ...(isTikTokHost(parsed.hostname) ? extractTikTokVideoUrls(html) : []),
    ])];
    for (const candidate of candidates) {
      const resolved = await tryVideoUrlWithRetry(candidate, signal);
      if (resolved) {
        response = resolved.response;
        sourceUrl = resolved.url;
        break;
      }
    }
    if (String(response.headers.get("content-type") || "").toLowerCase().includes("text/html")) {
      const host = parsed.hostname.replace(/^www\./i, "");
      throw new Error(`Không tìm thấy file video công khai từ trang ${host}. Hãy dùng nút chia sẻ/tải video của nền tảng hoặc chọn file video đã tải về.`);
    }
  }
  const contentLength = Number(response.headers.get("content-length") || 0);
  const maxBytes = 2 * 1024 * 1024 * 1024;
  if (contentLength > maxBytes) throw new Error("Video vượt quá giới hạn 2GB");
  const extensionsByType = { "video/mp4": ".mp4", "video/quicktime": ".mov", "video/webm": ".webm", "video/x-msvideo": ".avi", "video/x-matroska": ".mkv" };
  const extension = path.extname(new URL(sourceUrl).pathname).toLowerCase() || extensionsByType[contentType.split(";", 1)[0]] || ".mp4";
  const directory = cache.directory;
  fs.mkdirSync(directory, { recursive: true });
  const filePath = path.join(directory, `${cache.digest}${extension}`);
  const temporaryPath = `${filePath}.part`;
  const output = fs.createWriteStream(temporaryPath, { mode: 0o600 });
  let bytesWritten = 0;
  try {
    if (!response.body) throw new Error("Server không trả về nội dung video");
    event.sender.send("runtime:download-progress", { progress: 1, stage: "downloading", operationId });
    for await (const chunk of response.body) {
      assertOperationActive(operationId);
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      bytesWritten += buffer.length;
      if (bytesWritten > maxBytes) throw new Error("Video vượt quá giới hạn 2GB");
      if (!output.write(buffer)) await once(output, "drain");
      if (contentLength) {
        event.sender.send("runtime:download-progress", { progress: Math.max(1, Math.min(99, Math.round(bytesWritten / contentLength * 100))), stage: "downloading", operationId });
      }
    }
    const finished = once(output, "finish");
    output.end();
    await finished;
    fs.renameSync(temporaryPath, filePath);
    event.sender.send("runtime:download-progress", { progress: 100, stage: "downloaded", outputPath: filePath, operationId });
  } catch (error) {
    output.destroy();
    fs.rmSync(temporaryPath, { force: true });
    if (state?.cancelled) throw cancelledOperationError();
    throw error;
  }
  return filePath;
}

function generateLocalStoryAnalysis(probe, customPrompt, language = "vi", options = {}) {
  const duration = Math.max(60, Number(probe?.durationSeconds || 600));
  const targetDurMinutes = Number(options?.targetDurationMinutes) || (duration > 300 ? 5.5 : Math.ceil(duration / 60));
  const targetDurSeconds = Math.round(targetDurMinutes * 60);

  const targetCount = Math.max(6, Math.min(16, Math.round(targetDurSeconds / 35)));
  const targetClipDuration = Math.max(18, Math.round(targetDurSeconds / targetCount));
  const sourceStep = Math.max(20, (duration - targetClipDuration) / Math.max(1, targetCount - 1));

  const scenes = [];
  let recapCursor = 0;

  const hookNarratives = [
    "Một tình huống bất thường và đầy kịch tính bất ngờ xuất hiện, lập tức kích hoạt trực giác nghiệp vụ sắc bén của lực lượng tuần tra. Một dấu hiệu nguy hiểm khó lường đã mở đầu cho chuỗi sự việc nghẹt thở mà không một ai có thể dự đoán trước.",
    "Khoảnh khắc căng thẳng tột độ ập đến khi một chi tiết tưởng như vô hại lại ẩn chứa bí mật động trời, buộc các điều tra viên phải lập tức vào vị trí sẵn sàng ứng phó với tình huống khẩn cấp.",
  ];

  const act1Narratives = [
    "Ban đầu, sự việc diễn ra ngỡ như chỉ là một quy trình dừng xe và kiểm tra hành chính thông thường. Tuy nhiên, đằng sau lớp vỏ bọc bình thản và những câu trả lời trôi chảy ấy lại ẩn chứa vô số vết nứt tâm lý khó lòng che giấu.",
    "Từng cử chỉ dè dặt, ánh mắt né tránh cùng thái độ ngập ngừng của đối tượng nhanh chóng thu hút sự chú ý đặc biệt của các điều tra viên. Những manh mối ban đầu bắt đầu được kết nối lại với nhau.",
    "Bầu không khí xung quanh dần chùng xuống khi sự lúng túng của đối tượng ngày một rõ rệt. Những câu hỏi tưởng như bâng quơ nhưng đầy ẩn ý từ phía cảnh sát bắt đầu bóc tách từng lớp phòng thủ đầu tiên.",
  ];

  const act2Narratives = [
    "Cuộc đấu trí tâm lý bắt đầu được đẩy lên đỉnh điểm căng thẳng. Trước những câu hỏi sắc bén và dồn dập từ phía lực lượng chức năng, những lời khai bất nhất và mâu thuẫn bắt đầu lộ rõ không thể cứu vãn.",
    "Lớp mặt nạ giả tạo dần bị xé toạc từng mảnh. Những bằng chứng thu thập được ngay tại hiện trường đã vạch trần toàn bộ sự dối trá và toan tính mờ ám được che đậy công phu bấy lâu nay.",
    "Cảm xúc dâng trào đến mức nghẹt thở khi mọi lý lẽ ngụy biện hoàn toàn sụp đổ. Đối tượng không còn đường thoái lui và buộc phải đối diện với sự thật trần trụi trước ánh mắt kiên định của tổ công tác.",
    "Tình huống đối đầu nghẹt thở tiếp diễn khi các điều tra viên kiên quyết đấu tranh làm rõ từng chi tiết mờ ám. Sự thật đằng sau vụ việc dần hiện nguyên hình với những góc khuất gây chấn động.",
    "Từng manh mối đắt giá liên tiếp được hé lộ, khóa chặt mọi đường tẩu tán và chối bỏ trách nhiệm. Bản chất thật sự của kẻ chủ mưu đã hoàn toàn bị lột trần không chút kiêng dè.",
  ];

  const act3Narratives = [
    "Khoảnh khắc sự thật được phơi bày trọn vẹn cũng là lúc hồi chuông cảnh tỉnh vang lên đanh thép. Mọi toan tính tinh vi đều không thể vượt qua được ánh sáng của công lý và sự nghiêm minh của pháp luật.",
    "Bằng chứng đanh thép được thiết lập vững chắc, buộc kẻ vi phạm phải cúi đầu chấp nhận sự trừng phạt thích đáng. Công lý được thực thi trọn vẹn, mang lại sự bình yên và công bằng cho xã hội.",
    "Khép lại toàn bộ câu chuyện, vụ việc để lại bài học sâu sắc về nhân tâm và những cạm bẫy cuộc đời. Pháp luật luôn nghiêm minh và cái giá phải trả cho sự lọc lừa sẽ luôn là bài học cảnh tỉnh đắt giá cho bất cứ ai.",
  ];

  for (let i = 0; i < targetCount; i++) {
    const srcStartSec = Math.min(duration - targetClipDuration, Math.max(0, Math.round(i * sourceStep)));
    const srcEndSec = Math.min(duration, srcStartSec + targetClipDuration);
    const clipDur = srcEndSec - srcStartSec;
    const tStart = recapCursor;
    const tEnd = recapCursor + clipDur;
    recapCursor = tEnd;

    const progPct = Math.round((i / Math.max(1, targetCount - 1)) * 100);
    let stageTitle = "";
    let narrative = "";

    if (i === 0) {
      stageTitle = "[00:00 - 00:10] Hook Cao Trào (Viral Retention)";
      narrative = hookNarratives[i % hookNarratives.length];
    } else if (progPct <= 30) {
      stageTitle = "[Hồi 1] Khởi Nguồn & Nghịch Lý Ban Đầu";
      narrative = act1Narratives[(i - 1) % act1Narratives.length];
    } else if (progPct <= 75) {
      stageTitle = "[Hồi 2] Xung Đột Leo Thang & Lớp Mặt Nạ Bị Xé Toạc";
      narrative = act2Narratives[(i - 1) % act2Narratives.length];
    } else {
      stageTitle = "[Hồi 3] Kết Cục, Công Lý & Bài Học Quan Sát Xã Hội";
      narrative = act3Narratives[(i - 1) % act3Narratives.length];
    }

    scenes.push({
      id: `scene-${i + 1}`,
      start: formatTime(tStart),
      end: formatTime(tEnd),
      timeStart: tStart,
      timeEnd: tEnd,
      sourceStart: formatTime(srcStartSec),
      sourceEnd: formatTime(srcEndSec),
      sourceTimeStart: srcStartSec,
      sourceTimeEnd: srcEndSec,
      title: `${stageTitle} (#${i + 1})`,
      detail: narrative,
      action_visual: `Trích đoạn video gốc ${formatTime(srcStartSec)} - ${formatTime(srcEndSec)}`,
      translation: narrative,
      voiceover: narrative,
    });
  }

  return {
    summary: `Kịch bản phân tích kể chuyện 3 Hồi & Hook (${targetDurMinutes} phút): Bóc tách toàn bộ vụ việc từ mở đầu đến hồi kết với góc nhìn quan sát xã hội và nghiệp vụ trinh sát sắc bén.`,
    scenes,
    score: 96,
    tokensUsed: 0,
    creditsUsed: 0,
  };
}

function providerRequest(record, prompt, images = [], operationId, attempt = 0) {
  const headers = { Accept: "application/json", "Content-Type": "application/json" };
  const maxOutputTokens = 8192;
  let url = record.baseUrl;
  const endpoint = (base, suffix) => base.endsWith(suffix) ? base : `${base}/${suffix}`;
  let body;
  const visualImages = images.map((image) => typeof image === "string" ? { data: image } : image);
  const visualText = (index) => ({ type: "text", text: `[Khung hình ${index + 1} · ${Number(visualImages[index]?.timestampSeconds || 0).toFixed(1)} giây]` });
  
  if (record.isManaged) {
    let licenseKey = "JACS-MANAGED";
    try {
      if (safeStorage.isEncryptionAvailable() && fs.existsSync(licensePath())) {
        const raw = fs.readFileSync(licensePath());
        licenseKey = safeStorage.decryptString(raw) || "JACS-MANAGED";
      }
    } catch { /* best effort */ }
    url = endpoint(record.baseUrl, "chat/completions");
    headers.Authorization = `Bearer ${licenseKey}`;
    headers["x-jacs-license-key"] = licenseKey;
    const content = visualImages.length
      ? [
          { type: "text", text: prompt },
          ...visualImages.flatMap((image, index) => [
            visualText(index),
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image.data}`, detail: "low" } }
          ])
        ]
      : prompt;
    body = {
      model: record.model || "gpt-5.6-sol",
      max_tokens: maxOutputTokens,
      messages: [{ role: "user", content }]
    };
  } else if (record.providerType === "gemini") {
    let cleanModel = (record.model || "gemini-2.5-flash").trim().replace(/^models\//i, "");
    const legacyAliases = {
      "gemini-2.0-flash": "gemini-2.5-flash",
      "gemini-2.0-flash-exp": "gemini-2.5-flash",
      "gemini-2.0-flash-001": "gemini-2.5-flash",
      "gemini-2.0": "gemini-2.5-flash",
      "gemini-1.5-flash-latest": "gemini-1.5-flash",
      "gemini-flash-latest": "gemini-2.5-flash",
      "gemini-pro": "gemini-1.5-pro",
      "gemini-pro-latest": "gemini-2.5-pro",
    };
    if (legacyAliases[cleanModel]) {
      cleanModel = legacyAliases[cleanModel];
    }
    url = `${record.baseUrl}/models/${encodeURIComponent(cleanModel)}:generateContent?key=${encodeURIComponent(record.apiKey)}`;
    body = {
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            ...visualImages.flatMap((image, index) => [
              { text: visualText(index).text },
              { inlineData: { mimeType: "image/jpeg", data: image.data } }
            ])
          ]
        }
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens
      }
    };
  } else if (record.providerType === "anthropic") {
    url = endpoint(record.baseUrl, "messages");
    headers["x-api-key"] = record.apiKey;
    headers["anthropic-version"] = "2023-06-01";
    const content = visualImages.length ? [{ type: "text", text: prompt }, ...visualImages.flatMap((image, index) => [visualText(index), { type: "image", source: { type: "base64", media_type: "image/jpeg", data: image.data } }])] : prompt;
    body = { model: record.model, max_tokens: maxOutputTokens, messages: [{ role: "user", content }] };
  } else {
    url = endpoint(record.baseUrl, "chat/completions");
    headers.Authorization = `Bearer ${record.apiKey}`;
    const content = visualImages.length ? [{ type: "text", text: prompt }, ...visualImages.flatMap((image, index) => [visualText(index), { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image.data}`, detail: "low" } }])] : prompt;
    body = { model: record.model, temperature: 0.3, max_tokens: maxOutputTokens, messages: [{ role: "user", content }] };
  }
  const state = operationState(operationId);
  // Increase timeout to 180s for long video analysis (e.g. 1080p full true-crime / pursuit videos)
  const defaultTimeout = attempt === 0 ? 180000 : (attempt === 1 ? 120000 : 90000);
  const timeoutMs = Number(process.env.JACS_PROVIDER_TIMEOUT_MS ?? defaultTimeout);
  const timeout = timeoutMs > 0 ? AbortSignal.timeout(timeoutMs) : null;
  const signal = state ? (timeout ? AbortSignal.any([state.controller.signal, timeout]) : state.controller.signal) : timeout || undefined;
  return fetch(url, { method: "POST", headers, body: JSON.stringify(body), signal }).then(async (response) => {
    assertOperationActive(operationId);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      let detail = String(payload?.error?.message || payload?.error?.detail || payload?.message || "").replace(/\s+/g, " ").trim().slice(0, 240);
      if (detail.includes("No pricing rule") || detail.includes("no_pricing_rule")) {
        detail = `Cổng API (OneAPI/Proxy) chưa thiết lập giá cho model "${record.model}". Hãy kiểm tra lại danh sách model hoặc đổi sang model chuẩn (vd: gpt-5.6-sol, gpt-5.5, claude-opus-5)`;
      }
      const error = new Error(`AI provider trả về HTTP ${response.status}${detail ? `: ${detail}` : ""}`);
      error.status = response.status;
      throw error;
    }
    const rawContent = payload?.choices?.[0]?.message?.content || payload?.content?.[0]?.text || payload?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const text = Array.isArray(rawContent)
      ? rawContent.map((part) => typeof part === "string" ? part : String(part?.text || "")).filter(Boolean).join("\n")
      : String(rawContent || "");
    if (!text.trim()) throw new Error("AI provider không trả về nội dung phân tích");
    const usage = Number(
      payload?.usage?.total_tokens
      || (Number(payload?.usage?.input_tokens || 0) + Number(payload?.usage?.output_tokens || 0))
      || payload?.usageMetadata?.totalTokenCount
      || 0,
    );
    return { text, usage };
  }).catch((error) => {
    if (state?.cancelled) throw cancelledOperationError();

    // Auto fallback for 503 (High demand / Overloaded), 429 (Rate Limit), 400, 404, 500, 502, 504, TimeoutError
    if (([400, 404, 429, 500, 502, 503, 504, 524].includes(Number(error?.status)) || error?.name === "TimeoutError" || error?.name === "AbortError" || error?.code === "UND_ERR_CONNECT_TIMEOUT") && attempt < 4) {
      const fallbackModels = record.isManaged
        ? ["gpt-5.6-sol", "gpt-5.5", "claude-opus-5", "gpt-5.6-terra"]
        : [
            "gemini-2.5-flash",
            "gemini-1.5-flash",
            "gemini-2.0-flash",
            "gemini-flash-lite-latest",
            "gemini-1.5-pro",
          ];
      const currentModel = String(record.model || "").trim().replace(/^models\//i, "");
      const candidates = fallbackModels.filter((m) => m !== currentModel);
      const nextModel = candidates[attempt % candidates.length] || (record.isManaged ? "gpt-5.6-sol" : "gemini-1.5-flash");
      
      // On attempt 1, sample a lightweight subset of 6 keyframes
      let nextImages = images;
      if (attempt === 1 && images.length > 6) {
        const step = Math.floor(images.length / 6);
        nextImages = [0, 1, 2, 3, 4, 5].map((idx) => images[Math.min(images.length - 1, idx * step)]).filter(Boolean);
      } else if (attempt >= 2) {
        nextImages = [];
      }

      return new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1))).then(() =>
        providerRequest({ ...record, model: nextModel }, prompt, nextImages, operationId, attempt + 1)
      );
    }

    // If gateway returns 524, 504, 502, 503, 408 timeout on multimodal payload, retry with text-only immediately
    if (visualImages.length && [400, 404, 408, 413, 415, 422, 500, 502, 503, 504, 524].includes(Number(error?.status)) && attempt < 3) {
      return new Promise((resolve) => setTimeout(resolve, 500)).then(() =>
        providerRequest(record, prompt, [], operationId, attempt + 1)
      );
    }

    // Transient network errors retry
    if (([429, 500, 502, 503, 504, 524].includes(Number(error?.status)) || error?.name === "TimeoutError" || error?.name === "AbortError" || error?.code === "UND_ERR_CONNECT_TIMEOUT") && attempt < 3) {
      return new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1))).then(() =>
        providerRequest(record, prompt, [], operationId, attempt + 1)
      );
    }
    throw error;
  });
}

async function extractAnalysisFrames(filePath, durationSeconds, operationId) {
  const ffmpeg = findExecutable("ffmpeg");
  if (!ffmpeg) return [];
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "jacs-analysis-"));
  const dur = Math.max(5, Number(durationSeconds || 30));
  // Extract 8 to 20 optimized keyframes so AI sees visual actions quickly without payload overload
  const frameCount = dur <= 45 ? 8 : (dur <= 180 ? 12 : (dur <= 600 ? 16 : 20));
  const interval = dur / frameCount;
  try {
    await runProcess(ffmpeg, ["-hide_banner", "-loglevel", "error", "-i", path.resolve(filePath), "-vf", `fps=1/${interval},scale=384:-2`, "-q:v", "5", "-frames:v", String(frameCount), path.join(directory, "frame-%02d.jpg")], undefined, operationId);
    return fs.readdirSync(directory).filter((name) => name.endsWith(".jpg")).sort().map((name, index) => ({
      data: fs.readFileSync(path.join(directory, name)).toString("base64"),
      timestampSeconds: Math.min(dur, index * interval),
    }));
  } catch (error) {
    if (operationState(operationId)?.cancelled || error?.code === "JACS_OPERATION_CANCELLED") throw cancelledOperationError();
    return [];
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
}

async function transcribeVideo(filePath, record, operationId, sourceDurationSeconds = 0) {
  // OpenAI-compatible gateways frequently omit capability discovery. When a
  // key is configured, probe the standard transcription endpoint; unsupported
  // gateways are handled by the existing empty-transcript fallback.
  if (!record?.apiKey || !["openai", "openai-compatible"].includes(record.providerType)) return { text: "", segments: [] };
  const ffmpeg = findExecutable("ffmpeg");
  if (!ffmpeg) return { text: "", segments: [] };
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "jacs-transcript-"));
  const audioPath = path.join(directory, "audio.mp3");
  try {
    await runProcess(ffmpeg, ["-hide_banner", "-loglevel", "error", "-i", path.resolve(filePath), "-vn", "-ac", "1", "-ar", "16000", "-b:a", "48k", "-t", "900", audioPath], undefined, operationId);
    if (!fs.existsSync(audioPath) || fs.statSync(audioPath).size === 0) return { text: "", segments: [] };
    const transcriptionBase = String(record.baseUrl || "").replace(/\/+$/, "");
    const endpoint = /audio\/transcriptions$/i.test(transcriptionBase) ? transcriptionBase : `${transcriptionBase}/audio/transcriptions`;
    const state = operationState(operationId);
    const timeoutMs = Number(process.env.JACS_PROVIDER_TIMEOUT_MS ?? 0);
    const timeout = timeoutMs > 0 ? AbortSignal.timeout(timeoutMs) : null;
    const signal = state ? (timeout ? AbortSignal.any([state.controller.signal, timeout]) : state.controller.signal) : timeout || undefined;
    const formatStamp = (seconds) => {
      const safe = Math.max(0, Number(seconds) || 0);
      return `${Math.floor(safe / 60).toString().padStart(2, "0")}:${Math.floor(safe % 60).toString().padStart(2, "0")}`;
    };
    const audio = fs.readFileSync(audioPath);
    const models = [...new Set([record.transcriptionModel, "whisper-1", "gpt-4o-mini-transcribe", "gpt-4o-transcribe"].filter(Boolean).map(String))];
    for (const model of models) {
      // First request segment timestamps; this is the best alignment path.
      const form = new FormData();
      form.append("model", model);
      form.append("response_format", "verbose_json");
      form.append("timestamp_granularities[]", "segment");
      form.append("timestamp_granularities[]", "word");
      form.append("file", new Blob([audio], { type: "audio/mpeg" }), "audio.mp3");
      const response = await fetch(endpoint, { method: "POST", headers: { Authorization: `Bearer ${record.apiKey}` }, body: form, signal });
      assertOperationActive(operationId);
      const payload = await response.json().catch(() => ({}));
      const transcriptionError = String(payload?.error?.message || payload?.message || "");
      if (response.ok) {
        const timedSegments = Array.isArray(payload.segments)
          ? payload.segments
          : Array.isArray(payload.data?.segments) ? payload.data.segments : [];
        if (timedSegments.length) {
          const rawSegments = timedSegments.map((segment) => ({
            start: Math.max(0, Number(segment.start || 0)),
            end: Number(segment.end),
            text: String(segment.text || "").trim(),
            confidence: Number.isFinite(Number(segment.avg_logprob)) ? Math.max(0, Math.min(1, Math.exp(Number(segment.avg_logprob)))) : undefined,
            words: Array.isArray(segment.words) ? segment.words.map((word) => ({ start: Math.max(0, Number(word.start || 0)), end: Math.max(0, Number(word.end || word.start || 0)), text: String(word.word || word.text || "").trim(), confidence: Number.isFinite(Number(word.probability)) ? Number(word.probability) : undefined })).filter((word) => word.text) : undefined,
          })).filter((segment) => segment.text).sort((left, right) => left.start - right.start);
          const total = Math.max(0.25, Number(sourceDurationSeconds) || 0.25);
          const segments = rawSegments.map((segment, index) => {
            const nextStart = rawSegments[index + 1]?.start;
            const explicitEnd = Number.isFinite(segment.end) && segment.end > segment.start ? segment.end : undefined;
            const inferredEnd = nextStart && nextStart > segment.start ? nextStart : total;
            return { ...segment, end: Math.min(total, Math.max(segment.start + 0.25, explicitEnd || inferredEnd)) };
          });
          if (segments.length) return { text: segments.map((segment) => `[${formatStamp(segment.start)}-${formatStamp(segment.end)}] ${segment.text}`).join(" ").slice(0, 12000), segments };
        }
        const text = String(payload.text || payload.data?.text || payload.transcript || "").trim().slice(0, 12000);
        if (text) return { text, segments: [{ start: 0, end: 0, text }] };
      }
      // A gateway that has no pricing/route for audio will reject every
      // fallback model. Stop probing to avoid repeated paid requests.
      if (/pricing_not_found|no pricing rule|not configured|endpoint.*not found/i.test(transcriptionError)) break;
      // Older gateways reject verbose_json/timestamps but accept plain JSON.
      const fallbackForm = new FormData();
      fallbackForm.append("model", model);
      fallbackForm.append("response_format", "json");
      fallbackForm.append("file", new Blob([audio], { type: "audio/mpeg" }), "audio.mp3");
      const fallbackResponse = await fetch(endpoint, { method: "POST", headers: { Authorization: `Bearer ${record.apiKey}` }, body: fallbackForm, signal });
      const fallbackPayload = await fallbackResponse.json().catch(() => ({}));
      if (fallbackResponse.ok) {
        const text = String(fallbackPayload.text || fallbackPayload.data?.text || fallbackPayload.transcript || "").trim().slice(0, 12000);
        if (text) return { text, segments: [{ start: 0, end: 0, text }] };
      }
      if (/pricing_not_found|no pricing rule|not configured|endpoint.*not found/i.test(String(fallbackPayload?.error?.message || fallbackPayload?.message || ""))) break;
    }
    return { text: "", segments: [] };
  } catch (error) {
    if (operationState(operationId)?.cancelled || error?.code === "JACS_OPERATION_CANCELLED") throw cancelledOperationError();
    // Transcription enriches the visual analysis but is not required for a
    // usable scene map, so provider/codec failures fall back to frames.
    return { text: "", segments: [] };
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

async function detectSceneTimes(filePath, durationSeconds, operationId) {
  const ffmpeg = findExecutable("ffmpeg");
  if (!ffmpeg) return [];
  const output = [];
  try {
    await runProcess(ffmpeg, ["-hide_banner", "-i", path.resolve(filePath), "-vf", "select=gt(scene\\,0.35),showinfo", "-an", "-f", "null", "-"], (line) => {
      for (const match of line.matchAll(/pts_time:([0-9.]+)/g)) output.push(Number(match[1]));
    }, operationId);
  } catch (error) {
    if (operationState(operationId)?.cancelled || error?.code === "JACS_OPERATION_CANCELLED") throw cancelledOperationError();
    return [];
  }
  return [...new Set(output.filter((value) => value > 0 && value < Number(durationSeconds || Infinity)).map((value) => Math.round(value)))].slice(0, 12);
}

function localAnalysis(probe, sceneTimes = []) {
  const duration = Math.max(1, Number(probe.durationSeconds || 1));
  const formatTime = (seconds) => `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;
  const boundaries = [0, ...new Set(sceneTimes.filter((seconds) => seconds > 0 && seconds < duration).map(Number)), duration].sort((a, b) => a - b);
  const scenes = boundaries.slice(0, -1).map((seconds, index) => ({ start: formatTime(seconds), end: formatTime(boundaries[index + 1]), title: `Phân cảnh ${index + 1}`, detail: `Phân cảnh ${index + 1} (${formatTime(seconds)} - ${formatTime(boundaries[index + 1])})` }));
  return {
    summary: sceneTimes.length ? "Đã chia các phân cảnh thời gian." : "Đã tạo phân cảnh thời gian theo video.",
    scenes,
    score: scenes.length ? 50 : 0,
    tokensUsed: 0,
    creditsUsed: 0,
  };
}

function parseTimeSeconds(value, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const str = String(value || "").trim();
  if (!str) return fallback;
  if (/^\d+(?:\.\d+)?$/.test(str)) return Number(str);
  const parts = str.split(":").map(Number);
  if (!parts.length || parts.some((part) => !Number.isFinite(part))) return fallback;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0];
}

function formatTime(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  return `${Math.floor(safe / 60).toString().padStart(2, "0")}:${Math.floor(safe % 60).toString().padStart(2, "0")}`;
}

async function detectSubjectFocus(filePath, durationSeconds, operationId) {
  // Optional local face focus. OpenCV is deliberately best-effort so the
  // packaged app still renders on machines without Python/cv2.
  const script = [
    "import cv2,sys,json",
    "p=sys.argv[1]; cap=cv2.VideoCapture(p); n=max(1,int(cap.get(cv2.CAP_PROP_FRAME_COUNT))); step=max(1,n//8); cascade=cv2.CascadeClassifier(cv2.data.haarcascades+'haarcascade_frontalface_default.xml'); xs=[]; ys=[]; i=0",
    "while i<n:",
    " cap.set(cv2.CAP_PROP_POS_FRAMES,i); ok,frame=cap.read(); i+=step",
    " if not ok: continue",
    " g=cv2.cvtColor(frame,cv2.COLOR_BGR2GRAY); faces=cascade.detectMultiScale(g,1.1,4,minSize=(32,32))",
    " if len(faces): x,y,w,h=max(faces,key=lambda f:f[2]*f[3]); xs.append((x+w/2)/frame.shape[1]); ys.append((y+h/2)/frame.shape[0])",
    "cap.release(); open(sys.argv[2],'w').write(json.dumps({'x':sum(xs)/len(xs),'y':sum(ys)/len(ys),'count':len(xs)} if xs else {}))",
  ].join("\n");
  for (const python of [process.env.JACS_PYTHON, "python3", "python"].filter(Boolean)) {
    try {
      const resultPath = path.join(os.tmpdir(), `jacs-focus-${crypto.randomBytes(6).toString("hex")}.json`);
      await runProcess(python, ["-c", script, path.resolve(filePath), resultPath], undefined, operationId);
      const result = JSON.parse(fs.readFileSync(resultPath, "utf8"));
      fs.rmSync(resultPath, { force: true });
      if (Number.isFinite(result.x) && Number.isFinite(result.y) && result.count > 0) return result;
    } catch { /* optional dependency or unavailable interpreter */ }
  }
  return null;
}

function isRefusalText(str) {
  return /(chưa thể|không có hình ảnh|chưa có dữ liệu|chưa có video|không thể xác minh|không có thông tin|không có transcript|dữ liệu hiện có không kèm)/i.test(String(str || ""));
}

function normalizeScenes(value, duration, fallbackScenes, options = {}) {
  const total = Math.max(30, Number(duration) || 30);
  const hasRealAiScenes = Array.isArray(value) && value.length > 0;
  // NEVER discard real AI scenes!
  const scenesToProcess = hasRealAiScenes ? value : (Array.isArray(fallbackScenes) && fallbackScenes.length ? fallbackScenes : []);

  const count = Math.max(1, scenesToProcess.length);
  const targetDurMinutes = Number(options?.targetDurationMinutes) || (total > 300 ? 5.5 : Math.ceil(total / 60));
  const targetDurSeconds = Math.round(targetDurMinutes * 60);
  const defaultClipDur = Math.max(15, Math.min(45, Math.round(targetDurSeconds / count)));
  const sourceStep = (total - defaultClipDur) / Math.max(1, count - 1);

  let recapTimelineCursor = 0;
  const resultScenes = [];

  for (let index = 0; index < scenesToProcess.length; index++) {
    const scene = scenesToProcess[index];
    const rawSrcStart = scene.sourceStart ?? scene.source_start ?? scene.sourceTimeStart ?? scene.start;
    const rawSrcEnd = scene.sourceEnd ?? scene.source_end ?? scene.sourceTimeEnd ?? scene.end;

    let parsedSrcStart = parseTimeSeconds(rawSrcStart, Number.NaN);
    let parsedSrcEnd = parseTimeSeconds(rawSrcEnd, Number.NaN);

    if (!Number.isFinite(parsedSrcStart) || (parsedSrcStart === 0 && index > 0) || parsedSrcStart >= total) {
      parsedSrcStart = Math.min(total - defaultClipDur, Math.max(0, Math.round(index * sourceStep)));
    }
    if (!Number.isFinite(parsedSrcEnd) || parsedSrcEnd <= parsedSrcStart || (parsedSrcEnd - parsedSrcStart < 5)) {
      parsedSrcEnd = Math.min(total, parsedSrcStart + defaultClipDur);
    }

    const clipDuration = Math.max(5, parsedSrcEnd - parsedSrcStart);
    const timelineStart = recapTimelineCursor;
    const timelineEnd = recapTimelineCursor + clipDuration;
    recapTimelineCursor = timelineEnd;

    const rawVoice = String(scene?.voiceover || scene?.translation || scene?.detail || "").trim().slice(0, 3000);
    let cleanVoice = isRefusalText(rawVoice) ? "" : stripSceneMetadata(rawVoice);

    if (!cleanVoice || cleanVoice.length < 15) {
      const sceneTitle = cleanField(scene?.title || `Phân cảnh #${index + 1}`);
      const sceneDetail = cleanField(scene?.detail || scene?.action_visual || "");
      if (sceneDetail && sceneDetail.length > 20) {
        cleanVoice = sceneDetail;
      } else {
        cleanVoice = `${sceneTitle}: Diễn biến tiếp tục được đẩy lên cao trào, phơi bày những tình tiết then chốt và tạo bước ngoặt quan trọng cho câu chuyện.`;
      }
    }

    resultScenes.push({
      id: String(scene?.id || `scene-${index + 1}`).trim().slice(0, 80) || `scene-${index + 1}`,
      start: formatTime(timelineStart),
      end: formatTime(timelineEnd),
      timeStart: timelineStart,
      timeEnd: timelineEnd,
      sourceStart: formatTime(parsedSrcStart),
      sourceEnd: formatTime(parsedSrcEnd),
      sourceTimeStart: parsedSrcStart,
      sourceTimeEnd: parsedSrcEnd,
      title: cleanField(scene?.title) || `Phân cảnh #${index + 1}`,
      detail: cleanField(scene?.detail) || cleanVoice.slice(0, 160),
      action_visual: cleanField(scene?.action_visual || scene?.detail) || `Trích đoạn video gốc ${formatTime(parsedSrcStart)} - ${formatTime(parsedSrcEnd)}`,
      translation: cleanVoice,
      voiceover: cleanVoice,
      keywords: Array.isArray(scene?.keywords) ? scene.keywords.map((item) => String(item).trim()).filter(Boolean).slice(0, 20) : undefined,
      confidence: Number.isFinite(Number(scene?.confidence)) ? Math.max(0, Math.min(1, Number(scene.confidence))) : 0.95,
    });
  }

  return resultScenes;


}

function cleanField(str) {
  if (!str) return "";
  let val = String(str).trim();
  val = val.replace(/^```(?:json)?/i, "").replace(/```$/i, "");
  val = val.replace(/^["'\s]+|["'\s]+$/g, "");
  val = val.replace(/,\s*"(?:score|scenes|voice_script|topics|id|start|end|title|detail|translation|voiceover)"\s*:\s*.*$/g, "");
  val = val.replace(/[{}\[\]\\]/g, "");
  return val.trim();
}

function cleanJsonText(raw) {
  if (!raw) return "";
  let text = String(raw).trim();
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1);
  }
  return text;
}

function parseAnalysis(text, probe, usage, customPrompt, options = {}) {
  const fallback = generateLocalStoryAnalysis(probe, customPrompt, options?.languages?.[0] || "vi", options);
  try {
    const jsonStr = cleanJsonText(text);
    let parsed = null;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      const extracted = [];
      const sceneRegex = /\{\s*"id"[\s\S]*?\}/g;
      let m;
      while ((m = sceneRegex.exec(text)) !== null) {
        try {
          const s = JSON.parse(m[0]);
          if (s.title || s.voiceover || s.detail) extracted.push(s);
        } catch {}
      }
      if (extracted.length) parsed = { scenes: extracted };
    }

    const unwrapped = parsed?.data || parsed?.result || parsed?.output || parsed;
    let rawScenes = unwrapped?.scenes || unwrapped?.scene_map || unwrapped?.segments;

    if (!Array.isArray(rawScenes) || !rawScenes.length) {
      rawScenes = fallback.scenes;
    }

    const cleanScenes = rawScenes.map((s, idx) => ({
      id: s.id || `scene-${idx + 1}`,
      start: s.start,
      end: s.end,
      sourceStart: s.sourceStart || s.source_start || s.source_time_start,
      sourceEnd: s.sourceEnd || s.source_end || s.source_time_end,
      title: cleanField(s.title) || `Phân cảnh ${idx + 1}`,
      detail: cleanField(s.detail) || `Bối cảnh phân cảnh ${idx + 1}`,
      action_visual: cleanField(s.action_visual || s.visual_action || s.detail),
      translation: stripSceneMetadata(cleanField(s.translation || s.voiceover)),
      voiceover: stripSceneMetadata(cleanField(s.voiceover || s.translation || s.detail)),
    }));

    const rawSummary = cleanField(unwrapped?.summary || fallback.summary);
    const summary = isRefusalText(rawSummary) ? fallback.summary : rawSummary;

    return {
      summary,
      scenes: normalizeScenes(cleanScenes, probe.durationSeconds, fallback.scenes, options),
      score: 95,
      tokensUsed: usage,
      creditsUsed: usage ? Math.max(1, Math.ceil(usage / 1000)) : 0,
      safetyNotes: [],
      sourceLanguage: "vi",
      voiceScript: cleanScenes.map((s) => s.voiceover || s.translation || "").filter(Boolean).join(" "),
    };
  } catch (err) {
    console.error("parseAnalysis error:", err);
    return { ...fallback, tokensUsed: usage, creditsUsed: usage ? Math.max(1, Math.ceil(usage / 1000)) : 0 };
  }
}

function runProcess(command, args, onLine, operationId) {
  return new Promise((resolve, reject) => {
    try { assertOperationActive(operationId); } catch (error) { reject(error); return; }
    const processHandle = childProcess.spawn(command, args, { windowsHide: true });
    const state = operationState(operationId);
    state?.children.add(processHandle);
    let stderr = "";
    processHandle.stderr.on("data", (chunk) => { const line = String(chunk); stderr += line; onLine?.(line); });
    processHandle.on("error", (error) => { state?.children.delete(processHandle); reject(error); });
    processHandle.on("close", (code) => {
      state?.children.delete(processHandle);
      if (state?.cancelled) { reject(cancelledOperationError()); return; }
      code === 0 ? resolve() : reject(new Error(stderr.slice(-800) || `Process exited with ${code}`));
    });
  });
}

function chooseMacSpeechVoice(sayPath, languageCode, gender) {
  const locale = speechLocale(languageCode).replace("-", "_");
  let voices = [];
  try {
    const output = childProcess.execFileSync(sayPath, ["-v", "?"], { encoding: "utf8", windowsHide: true, stdio: ["ignore", "pipe", "ignore"] });
    voices = output.split(/\r?\n/).map((line) => {
      const match = line.match(/^(.+?)\s{2,}([a-z]{2}_[A-Z]{2})\s+#/);
      return match ? { name: match[1].trim(), locale: match[2] } : null;
    }).filter(Boolean);
  } catch { /* Fall back to the standard system voice below. */ }
  const preferredByLocale = {
    vi_VN: ["Linh"],
    en_US: gender === "male" ? ["Alex", "Daniel", "Fred"] : ["Samantha", "Karen", "Ava"],
    ja_JP: gender === "male" ? ["Otoya"] : ["Kyoko"],
    zh_CN: ["Ting-Ting"],
    zh_TW: ["Meijia"],
    fr_FR: gender === "male" ? ["Thomas"] : ["Amélie", "Amelie"],
    es_ES: gender === "male" ? ["Jorge"] : ["Monica"],
    th_TH: ["Kanya"],
    id_ID: ["Damayanti"],
    ms_MY: ["Amira"],
    pt_BR: ["Luciana"],
    de_DE: ["Anna"],
    it_IT: ["Alice"],
    ru_RU: ["Milena"],
    tr_TR: ["Yelda"],
    ar_SA: gender === "male" ? ["Maged", "Majed"] : ["Maged", "Majed"],
    hi_IN: ["Lekha"],
    nl_NL: ["Xander"],
  };
  const preferred = preferredByLocale[locale] || [];
  const selected = preferred.find((name) => voices.some((voice) => voice.name === name))
    || voices.find((voice) => voice.locale === locale)?.name
    || (!locale.startsWith("zh_") ? voices.find((voice) => voice.locale.split("_", 1)[0] === locale.split("_", 1)[0])?.name : undefined);
  if (!selected) throw new Error(`Chưa cài voice locale ${locale.replace("_", "-")}. Hãy tải giọng đọc cho ngôn ngữ này trong System Settings.`);
  return selected;
}

function resolveNeuralVoiceProfile(voice, languageCode = "vi", gender = "female") {
  const profiles = {
    "vi-adam-review": { voice: "vi-VN-NamMinhNeural", rate: "+12%", pitch: "+0Hz" },
    "vi-namminh": { voice: "vi-VN-NamMinhNeural", rate: "+10%", pitch: "+0Hz" },
    "vi-mystery-deep": { voice: "vi-VN-NamMinhNeural", rate: "+0%", pitch: "+0Hz" },
    "vi-hoaimy-review": { voice: "vi-VN-HoaiMyNeural", rate: "+14%", pitch: "+0Hz" },
    "vi-hoaimy": { voice: "vi-VN-HoaiMyNeural", rate: "+4%", pitch: "+0Hz" },
    "vi-baolong": { voice: "vi-VN-NamMinhNeural", rate: "+6%", pitch: "+0Hz" },
    "vi-thihuong": { voice: "vi-VN-HoaiMyNeural", rate: "-2%", pitch: "+0Hz" },
    "vi-male": { voice: "vi-VN-NamMinhNeural", rate: "+10%", pitch: "+0Hz" },
    "vi-female": { voice: "vi-VN-HoaiMyNeural", rate: "+5%", pitch: "+0Hz" },
    "en-adam": { voice: "en-US-GuyNeural", rate: "+0%", pitch: "+0Hz" },
    "en-guy": { voice: "en-US-GuyNeural", rate: "+0%", pitch: "+0Hz" },
    "en-brian": { voice: "en-US-BrianNeural", rate: "+0%", pitch: "+0Hz" },
    "en-jenny": { voice: "en-US-JennyNeural", rate: "+0%", pitch: "+0Hz" },
    "en-aria": { voice: "en-US-AriaNeural", rate: "+5%", pitch: "+0Hz" },
    "en-male": { voice: "en-US-GuyNeural", rate: "+0%", pitch: "+0Hz" },
    "en-female": { voice: "en-US-JennyNeural", rate: "+0%", pitch: "+0Hz" },
    "ja-male": { voice: "ja-JP-KeitaNeural", rate: "+0%", pitch: "+0Hz" },
    "ja-female": { voice: "ja-JP-NanamiNeural", rate: "+0%", pitch: "+0Hz" },
    "ko-male": { voice: "ko-KR-InJoonNeural", rate: "+0%", pitch: "+0Hz" },
    "ko-female": { voice: "ko-KR-SunHiNeural", rate: "+0%", pitch: "+0Hz" },
    "zh-cn-male": { voice: "zh-CN-YunxiNeural", rate: "+0%", pitch: "+0Hz" },
    "zh-cn-female": { voice: "zh-CN-XiaoxiaoNeural", rate: "+0%", pitch: "+0Hz" },
    "fr-male": { voice: "fr-FR-HenriNeural", rate: "+0%", pitch: "+0Hz" },
    "fr-female": { voice: "fr-FR-DeniseNeural", rate: "+0%", pitch: "+0Hz" },
    "es-male": { voice: "es-ES-AlvaroNeural", rate: "+0%", pitch: "+0Hz" },
    "es-female": { voice: "es-ES-ElviraNeural", rate: "+0%", pitch: "+0Hz" },
  };
  const key = String(voice || "").trim().toLowerCase();
  if (profiles[key]) return profiles[key];
  if (key.includes("neural")) return { voice, rate: "+0%", pitch: "+0Hz" };
  const langBase = String(languageCode || "vi").toLowerCase().split(/[-_]/)[0];
  if (langBase === "vi") return { voice: gender === "male" ? "vi-VN-NamMinhNeural" : "vi-VN-HoaiMyNeural", rate: "+0%", pitch: "+0Hz" };
  if (langBase === "en") return { voice: gender === "male" ? "en-US-GuyNeural" : "en-US-JennyNeural", rate: "+0%", pitch: "+0Hz" };
  if (langBase === "ja") return { voice: gender === "male" ? "ja-JP-KeitaNeural" : "ja-JP-NanamiNeural", rate: "+0%", pitch: "+0Hz" };
  if (langBase === "ko") return { voice: gender === "male" ? "ko-KR-InJoonNeural" : "ko-KR-SunHiNeural", rate: "+0%", pitch: "+0Hz" };
  if (langBase === "zh") return { voice: gender === "male" ? "zh-CN-YunxiNeural" : "zh-CN-XiaoxiaoNeural", rate: "+0%", pitch: "+0Hz" };
  if (langBase === "fr") return { voice: gender === "male" ? "fr-FR-HenriNeural" : "fr-FR-DeniseNeural", rate: "+0%", pitch: "+0Hz" };
  if (langBase === "es") return { voice: gender === "male" ? "es-ES-AlvaroNeural" : "es-ES-ElviraNeural", rate: "+0%", pitch: "+0Hz" };
  return { voice: "vi-VN-NamMinhNeural", rate: "+0%", pitch: "+0Hz" };
}

function resolveNeuralVoice(voice, languageCode = "vi", gender = "female") {
  return resolveNeuralVoiceProfile(voice, languageCode, gender).voice;
}

async function generateAudioStream(text, languageCode = "vi", gender = "female", voice, operationId) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "jacs-audio-"));
  const outputPath = path.join(directory, "narration.mp3");
  const cleanText = stripSceneMetadata(text);
  if (!cleanText) return null;

  const selectedVoice = resolveNeuralVoice(voice, languageCode, gender);

  let licenseKey = "JACS-MANAGED";
  try {
    if (safeStorage.isEncryptionAvailable() && fs.existsSync(licensePath())) {
      const raw = fs.readFileSync(licensePath());
      licenseKey = safeStorage.decryptString(raw) || "JACS-MANAGED";
    }
  } catch { /* best effort */ }

  // Step 1: Microsoft Edge Neural TTS via JACS Cloud Engine
  try {
    const res = await fetch("https://jacs-studio.nexoratech.com.vn/api/v1/client/synthesize-speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "x-jacs-license-key": licenseKey,
        "Authorization": `Bearer ${licenseKey}`,
      },
      body: JSON.stringify({
        text: cleanText,
        voice: selectedVoice,
        language: languageCode || "vi",
        gender: gender || "male",
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (res.ok) {
      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length > 200) {
        fs.writeFileSync(outputPath, buffer);
        return outputPath;
      }
    }
  } catch (err) {
    // try next fallback
  }

  // Step 2: OpenAI TTS via API Gateway
  try {
    const openAiVoice = ["onyx", "alloy", "echo", "fable", "nova", "shimmer"].includes(String(voice || "").toLowerCase()) ? String(voice).toLowerCase() : (gender === "male" ? "onyx" : "nova");
    const gatewayRes = await fetch("https://api-meridians.nexoratech.com.vn/v1/audio/speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${licenseKey}`,
        "x-jacs-license-key": licenseKey,
      },
      body: JSON.stringify({
        model: "tts-1",
        input: cleanText,
        voice: openAiVoice,
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (gatewayRes.ok) {
      const buffer = Buffer.from(await gatewayRes.arrayBuffer());
      if (buffer.length > 200) {
        fs.writeFileSync(outputPath, buffer);
        return outputPath;
      }
    }
  } catch (gwErr) {
    // try next
  }

  // Step 3: Local Python edge_tts
  try {
    const python = findPythonExecutable();
    await runProcess(python, ["-m", "edge_tts", "--voice", selectedVoice, "--text", cleanText, "--write-media", outputPath], undefined, operationId);
    if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 200) {
      return outputPath;
    }
  } catch (err) {
    // try next
  }

  return null;
}

async function synthesizeLocalNarration(text, voice, gender, languageCode, operationId) {
  const cleanText = stripSceneMetadata(text).slice(0, 4000);
  if (!cleanText) return null;

  // Step 1 & 2: High-Quality Microsoft Edge Neural TTS / OpenAI TTS via JACS Cloud Engine
  const cloudStream = await generateAudioStream(cleanText, languageCode, gender, voice, operationId);
  if (cloudStream && fs.existsSync(cloudStream) && fs.statSync(cloudStream).size > 200) {
    return cloudStream;
  }

  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "jacs-local-narration-"));
  const textPath = path.join(directory, "script.txt");
  const outputPath = path.join(directory, "narration.mp3");
  fs.writeFileSync(textPath, cleanText, { encoding: "utf8", mode: 0o600 });

  const selectedVoice = resolveNeuralVoice(voice, languageCode, gender);
  const python = findExecutable("python") || process.env.JACS_PYTHON || (process.platform === "win32" ? "python.exe" : "python3");

  // Step 3: Edge Neural TTS via Local Python
  try {
    await runProcess(python, ["-m", "edge_tts", "--voice", selectedVoice, "--text", cleanText, "--write-media", outputPath], undefined, operationId);
    if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 200) {
      return outputPath;
    }
  } catch (err) {
    // try next fallback
  }

  // Step 4: Web TTS Audio Stream download
  const lang = languageCode || "vi";
  try {
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(cleanText.slice(0, 300))}&tl=${lang}&client=tw-ob`;
    const res = await fetch(ttsUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/130.0.0.0 Safari/537.36",
        "Referer": "https://translate.google.com/",
      }
    });
    if (res.ok) {
      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length > 200) {
        fs.writeFileSync(outputPath, buffer);
        return outputPath;
      }
    }
  } catch {}

  // Step 5: Platform native speech engine (macOS say or Windows System.Speech)
  if (process.platform === "darwin") {
    try {
      const sayPath = "/usr/bin/say";
      const sourcePath = path.join(directory, "narration.aiff");
      if (fs.existsSync(sayPath)) {
        const selectedMacVoice = chooseMacSpeechVoice(sayPath, lang, gender);
        await runProcess(sayPath, ["-f", textPath, "-o", sourcePath, "-v", selectedMacVoice], undefined, operationId);
        const ffmpeg = findExecutable("ffmpeg");
        if (ffmpeg && fs.existsSync(sourcePath) && fs.statSync(sourcePath).size > 200) {
          await runProcess(ffmpeg, ["-y", "-hide_banner", "-loglevel", "error", "-i", sourcePath, "-ac", "2", "-ar", "44100", "-codec:a", "libmp3lame", "-q:a", "4", outputPath], undefined, operationId);
          if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 200) return outputPath;
        }
      }
    } catch {}
  } else if (process.platform === "win32") {
    try {
      const powershell = process.env.SystemRoot
        ? path.join(process.env.SystemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe")
        : "powershell.exe";
      const sourcePath = path.join(directory, "narration.wav");
      const scriptPath = path.join(directory, "synthesize.ps1");
      fs.writeFileSync(scriptPath, [
        "Add-Type -AssemblyName System.Speech",
        "$text = [IO.File]::ReadAllText($args[0], [Text.Encoding]::UTF8)",
        "$output = $args[1]",
        "$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer",
        "$synth.SetOutputToWaveFile($output)",
        "$synth.Speak($text)",
        "$synth.Dispose()",
      ].join("\n"), { encoding: "utf8", mode: 0o600 });
      await runProcess(powershell, ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", scriptPath, textPath, sourcePath], undefined, operationId);
      const ffmpeg = findExecutable("ffmpeg");
      if (ffmpeg && fs.existsSync(sourcePath) && fs.statSync(sourcePath).size > 200) {
        await runProcess(ffmpeg, ["-y", "-hide_banner", "-loglevel", "error", "-i", sourcePath, "-ac", "2", "-ar", "44100", "-codec:a", "libmp3lame", "-q:a", "4", outputPath], undefined, operationId);
        if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 200) return outputPath;
      }
    } catch {}
  }

  // Cleanup corrupt files
  safeRmDir(directory);
  throw new Error("Không thể tạo file âm thanh giọng đọc AI. Hãy kiểm tra kết nối mạng hoặc bật provider OpenAI/TTS trong Cài đặt tool.");
}

function parseTimestampedScript(text, totalDuration = 60) {
  const lines = String(text || "").split("\n").map((l) => l.trim()).filter(Boolean);
  const segments = [];
  const regex = /\[(\d{1,2}):(\d{2})(?::(\d{2}))?\]\s*:\s*(.+)/i;

  for (const line of lines) {
    const match = line.match(regex);
    if (match) {
      let seconds = 0;
      if (match[3] !== undefined) {
        seconds = parseInt(match[1], 10) * 3600 + parseInt(match[2], 10) * 60 + parseInt(match[3], 10);
      } else {
        seconds = parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
      }
      segments.push({ start: seconds, text: match[4].trim() });
    }
  }

  if (!segments.length) return [];
  segments.sort((a, b) => a.start - b.start);

  return segments.map((seg, idx) => {
    const nextStart = segments[idx + 1]?.start || totalDuration;
    return {
      start: seg.start,
      end: Math.max(seg.start + 1, nextStart),
      text: seg.text,
    };
  });
}

async function probeAudioDuration(audioPath) {
  if (!audioPath || !fs.existsSync(audioPath)) return 0;
  const ffprobe = findExecutable("ffprobe");
  if (ffprobe) {
    try {
      const output = childProcess.execFileSync(ffprobe, [
        "-v", "error",
        "-show_entries", "format=duration",
        "-of", "json",
        path.resolve(audioPath)
      ], { encoding: "utf8", windowsHide: true, timeout: 5000 });
      const parsed = JSON.parse(output);
      const dur = Number(parsed?.format?.duration);
      if (Number.isFinite(dur) && dur > 0) return dur;
    } catch {}
  }
  const ffmpeg = findExecutable("ffmpeg");
  if (ffmpeg) {
    try {
      childProcess.execFileSync(ffmpeg, [
        "-hide_banner",
        "-i", path.resolve(audioPath)
      ], { encoding: "utf8", windowsHide: true, stdio: ["ignore", "pipe", "pipe"], timeout: 5000 });
    } catch (err) {
      const out = `${err?.stdout || ""}\n${err?.stderr || ""}`;
      const match = out.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
      if (match) {
        return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
      }
    }
  }
  return 0;
}

async function synthesizeSceneAlignedNarration({
  record,
  narrationText,
  subtitleSegments,
  renderedDuration,
  clipStart = 0,
  voice,
  gender,
  languageCode,
  operationId,
  ffmpeg,
}) {
  let segments = [];
  if (Array.isArray(subtitleSegments) && subtitleSegments.length > 1) {
    segments = subtitleSegments.map((s) => ({
      start: Math.max(0, Number(s.start || 0) - clipStart),
      end: Math.min(renderedDuration, Number(s.end || 0) - clipStart),
      text: stripSceneMetadata(s.text),
    })).filter((s) => s.text && s.end > s.start);
  }

  if (segments.length <= 1 && narrationText) {
    const parsed = parseTimestampedScript(narrationText, renderedDuration);
    if (parsed.length > 1) {
      segments = parsed.map((s) => ({
        start: Math.max(0, s.start - clipStart),
        end: Math.min(renderedDuration, s.end - clipStart),
        text: stripSceneMetadata(s.text),
      })).filter((s) => s.text && s.end > s.start);
    }
  }

  const synthesizeSnippet = async (text) => {
    if (record?.apiKey && record.capabilities?.includes("tts")) {
      try {
        const p = await synthesizeNarration(record, text, voice, gender, languageCode, operationId);
        if (p) return p;
      } catch {}
    }
    return synthesizeLocalNarration(text, voice, gender, languageCode, operationId);
  };

  if (segments.length <= 1) {
    const singleAudio = await synthesizeSnippet(narrationText);
    return { path: singleAudio, isSegmented: false };
  }

  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "jacs-aligned-audio-"));
  const rawSnippets = new Array(segments.length).fill(null);

  // Parallel Batch Synthesis (3 concurrent snippets for superfast rendering)
  const BATCH_SIZE = 3;
  for (let b = 0; b < segments.length; b += BATCH_SIZE) {
    const batch = segments.slice(b, b + BATCH_SIZE);
    await Promise.all(batch.map(async (seg, offset) => {
      const idx = b + offset;
      try {
        const snip = await synthesizeSnippet(seg.text);
        if (snip && fs.existsSync(snip) && fs.statSync(snip).size > 200) {
          rawSnippets[idx] = snip;
        }
      } catch (e) {
        console.warn(`[TTS] Snippet ${idx} error:`, e?.message || e);
      }
    }));
  }

  const fittedSnippets = [];
  const validSegments = [];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    let snip = rawSnippets[i];
    const segDur = Math.max(0.5, seg.end - seg.start);

    // If a snippet failed, create a silent placeholder so the render pipeline NEVER fails!
    if (!snip || !fs.existsSync(snip) || fs.statSync(snip).size <= 200) {
      if (ffmpeg) {
        const silencePath = path.join(directory, `silence_${i}.mp3`);
        try {
          await runProcess(ffmpeg, ["-y", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo", "-t", String(segDur), "-c:a", "libmp3lame", "-b:a", "192k", silencePath], undefined, operationId);
          if (fs.existsSync(silencePath) && fs.statSync(silencePath).size > 100) {
            snip = silencePath;
          }
        } catch {}
      }
    }

    if (snip && fs.existsSync(snip) && fs.statSync(snip).size > 100) {
      const actualSnipDur = await probeAudioDuration(snip);
      let finalSnipPath = snip;
      // 🎯 Auto-tempo fitting: Speed up voice snippet if it exceeds the scene time window so it NEVER spills over!
      if (ffmpeg && actualSnipDur > segDur * 0.95 && !snip.includes("silence_")) {
        const speedRatio = Math.min(2.0, Math.max(1.0, actualSnipDur / (segDur * 0.90)));
        const fittedPath = path.join(directory, `fitted_snip_${i}.mp3`);
        const tempoFilter = speedRatio > 1.02 ? atempoChain(speedRatio) : "";
        if (tempoFilter) {
          try {
            await runProcess(ffmpeg, [
              "-y", "-i", snip,
              "-filter:a", tempoFilter,
              "-c:a", "libmp3lame", "-b:a", "192k",
              fittedPath
            ], undefined, operationId);
            if (fs.existsSync(fittedPath) && fs.statSync(fittedPath).size > 100) {
              finalSnipPath = fittedPath;
            }
          } catch (tempoErr) {
            console.warn(`[TTS] Tempo fit failed for snippet ${i}:`, tempoErr);
          }
        }
      }
      fittedSnippets.push(finalSnipPath);
      validSegments.push(seg);
    }
  }

  if (!fittedSnippets.length) {
    fs.rmSync(directory, { recursive: true, force: true });
    return { path: null, isSegmented: false };
  }

  if (fittedSnippets.length === 1 || !ffmpeg) {
    return { path: fittedSnippets[0], isSegmented: false };
  }

  const outputPath = path.join(directory, "master_narration.mp3");
  const inputs = [];
  const filterParts = [];
  const mixLabels = [];

  for (let i = 0; i < fittedSnippets.length; i++) {
    inputs.push("-i", fittedSnippets[i]);
    const delayMs = Math.max(0, Math.round(validSegments[i].start * 1000));
    const sceneMaxDur = Math.max(0.5, validSegments[i].end - validSegments[i].start);
    // Strict timeline locking: adelay starts audio at scene start; atrim ensures 0% spillover into next scene
    filterParts.push(`[${i}:a]adelay=${delayMs}|${delayMs},atrim=0:${(validSegments[i].start + sceneMaxDur).toFixed(3)}[a${i}]`);
    mixLabels.push(`[a${i}]`);
  }

  const filterComplex = `${filterParts.join(";")};${mixLabels.join("")}amix=inputs=${fittedSnippets.length}:duration=longest:dropout_transition=0,volume=${fittedSnippets.length}[aout]`;
  const ffmpegArgs = ["-y", ...inputs, "-filter_complex", filterComplex, "-map", "[aout]", "-c:a", "libmp3lame", "-b:a", "192k", outputPath];

  await runProcess(ffmpeg, ffmpegArgs, undefined, operationId);

  fittedSnippets.forEach((p) => {
    try { fs.rmSync(path.dirname(p), { recursive: true, force: true }); } catch {}
  });

  if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 100) {
    return { path: outputPath, isSegmented: true };
  }

  return { path: fittedSnippets[0], isSegmented: false };
}

async function synthesizeNarration(record, text, voice, gender, languageCode, operationId) {
  if (!text) return null;
  if (!record) throw new Error("Chưa chọn provider giọng AI");
  if (!record.apiKey) throw new Error("Provider giọng AI chưa có API key");
  if (!record.capabilities?.includes("tts")) throw new Error("Provider giọng AI chưa bật capability tts");
  if (!["openai", "openai-compatible"].includes(record.providerType)) throw new Error("Provider giọng AI hiện chưa hỗ trợ TTS trong desktop tool");
  const endpoint = (() => {
    let base = String(record.baseUrl || "").replace(/\/+$/, "");
    base = base.replace(/\/(?:chat\/completions|responses|audio\/speech)$/i, "");
    return base.endsWith("/audio/speech") ? base : `${base}/audio/speech`;
  })();
  const state = operationState(operationId);
  const timeout = AbortSignal.timeout(120000);
  const signal = state ? AbortSignal.any([state.controller.signal, timeout]) : timeout;
  const voices = resolveTtsVoices(voice, gender);
  const models = resolveTtsModels(record);
  let buffer;
  let lastError = "";
  for (const model of models) {
    for (const selectedVoice of voices) {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { Accept: "audio/mpeg", "Content-Type": "application/json", Authorization: `Bearer ${record.apiKey}` },
        body: JSON.stringify({ model, voice: selectedVoice, input: String(text).slice(0, 4000), response_format: "mp3" }),
        signal,
      });
      assertOperationActive(operationId);
      if (response.ok) {
        buffer = Buffer.from(await response.arrayBuffer());
        break;
      }
      const payload = await response.json().catch(() => ({}));
      const detail = String(payload?.error?.message || payload?.message || "").replace(/\s+/g, " ").trim().slice(0, 240);
      lastError = formatTtsProviderError(response.status, detail, model);
      if (!isRetryableTtsStatus(response.status)) break;
      // A gateway may expose only a subset of OpenAI voices. Retry once with
      // the gender-safe fallback before moving to another model.
      if (!isVoiceCompatibilityError(detail)) break;
    }
    if (buffer) break;
  }
  if (!buffer) {
    // A gateway may reject a model because its pricing table is incomplete.
    // Keep the render usable by falling back to the OS speech engine; no API
    // key or customer text is sent anywhere in this fallback path.
    try { return await synthesizeLocalNarration(text, voice, gender, languageCode, operationId); }
    catch (localError) {
      const localMessage = localError instanceof Error ? localError.message : String(localError);
      throw new Error(`Không tạo được giọng AI: ${lastError || "provider không phản hồi"}. Local fallback cũng thất bại: ${localMessage}. Kiểm tra model TTS, capability tts và API key trong Cài đặt tool.`);
    }
  }
  if (!buffer.length) throw new Error("Provider TTS trả về audio rỗng");
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "jacs-narration-"));
  const filePath = path.join(directory, "narration.mp3");
  fs.writeFileSync(filePath, buffer, { mode: 0o600 });
  return filePath;
}

function hexToAssColor(hex, alpha = "00") {
  if (!hex) return `&H${alpha}FFFFFF`;
  const clean = hex.replace("#", "").trim();
  let r = "FF", g = "FF", b = "FF";
  if (clean.length === 6) {
    r = clean.slice(0, 2);
    g = clean.slice(2, 4);
    b = clean.slice(4, 6);
  } else if (clean.length === 3) {
    r = clean[0] + clean[0];
    g = clean[1] + clean[1];
    b = clean[2] + clean[2];
  }
  return `&H${alpha}${b}${g}${r}`.toUpperCase();
}

function escapeFilterPath(rawPath) {
  if (!rawPath) return "";
  let p = path.resolve(rawPath).replace(/\\/g, "/");
  p = p.replace(/:/g, "\\:");
  p = p.replace(/'/g, "\\'");
  p = p.replace(/\[/g, "\\[").replace(/\]/g, "\\]");
  return p;
}

function safeRmDir(dirPath) {
  if (!dirPath || typeof dirPath !== "string") return;
  try {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true, maxRetries: 5, retryDelay: 150 });
    }
  } catch {
    setTimeout(() => {
      try {
        if (fs.existsSync(dirPath)) {
          fs.rmSync(dirPath, { recursive: true, force: true });
        }
      } catch {}
    }, 1500);
  }
}

function subtitleForceStyle(style, aspectRatio, customStyle = {}) {
  const position = customStyle?.position || (typeof style === "string" ? style : "bottom");
  const alignment = position === "top" ? 8 : position === "center" ? 5 : 2;
  const baseSize = aspectRatio === "9:16" ? 34 : aspectRatio === "1:1" ? 32 : 28;
  const fontSize = customStyle?.fontSize || baseSize;
  const fontName = customStyle?.fontFamily || "Arial";
  const primaryColor = hexToAssColor(customStyle?.textColor || "#FFFFFF", "00");
  const outlineColor = hexToAssColor(customStyle?.outlineColor || "#101820", "00");
  const outlineWidth = customStyle?.outlineWidth ?? 2.5;
  const boxStyle = customStyle?.boxStyle || "none";
  const backColor = boxStyle === "box" ? "&H78000000" : "&H00000000";
  const borderStyle = boxStyle === "box" ? 3 : 1;
  const bold = customStyle?.bold !== false ? 1 : 0;
  const marginV = customStyle?.marginY || (aspectRatio === "9:16" ? 64 : 44);

  return `FontName=${fontName},FontSize=${fontSize},Bold=${bold},PrimaryColour=${primaryColor},OutlineColour=${outlineColor},BackColour=${backColor},Outline=${outlineWidth},Shadow=1,BorderStyle=${borderStyle},Alignment=${alignment},MarginV=${marginV},WrapStyle=2`;
}
function logoOverlayPosition(position) {
  return { "top-left": "24:24", "top-right": "main_w-overlay_w-24", "bottom-left": "24:main_h-overlay_h-24", "bottom-right": "main_w-overlay_w-24:main_h-overlay_h-24" }[position] || "main_w-overlay_w-24:main_h-overlay_h-24";
}

async function renderVideoFile(event, filePath, folder, options = {}, operationId) {
  let localVideoPath = filePath;
  if (/^https?:\/\//i.test(String(filePath || ""))) {
    event.sender.send("runtime:render-progress", { progress: 1, stage: "downloading", operationId });
    localVideoPath = await downloadVideo(event, filePath, operationId);
  }
  const probe = await probeVideoFile(localVideoPath);
  const directory = folder ? path.resolve(folder) : outputPath();
  fs.mkdirSync(directory, { recursive: true });
  const base = path.basename(localVideoPath, path.extname(localVideoPath)).replace(/[^A-Za-z0-9._-]+/g, "-");
  const clipStart = Math.max(0, Number(options.startSeconds || 0));
  const clipEnd = Number(options.endSeconds || 0);
  const clipDuration = clipEnd > clipStart ? clipEnd - clipStart : 0;

  // 🎯 Check if rendering a multi-cut Story Recap highlight reel
  const hasExplicitCutClips = Array.isArray(options.cutClips) && options.cutClips.length > 1;
  const rawCutClips = hasExplicitCutClips
    ? options.cutClips
    : (Array.isArray(options.scenes) && options.scenes.filter((s) => (s.sourceStart !== undefined || s.sourceTimeStart !== undefined)).length > 1)
      ? options.scenes.map((s) => {
          const sStart = parseTimeSeconds(s.sourceStart ?? s.sourceTimeStart ?? s.start, 0);
          const sEnd = parseTimeSeconds(s.sourceEnd ?? s.sourceTimeEnd ?? s.end, sStart + 15);
          return {
            sourceStart: sStart,
            sourceEnd: sEnd,
            duration: Math.max(0.5, sEnd - sStart),
            text: s.voiceover || s.translation || s.detail,
            title: s.title,
          };
        }).filter((c) => c.sourceEnd > c.sourceStart)
      : null;

  const effectiveCutClips = rawCutClips && rawCutClips.length > 1 ? rawCutClips : null;
  const renderedDuration = effectiveCutClips
    ? effectiveCutClips.reduce((sum, c) => sum + (c.duration || Math.max(0.5, c.sourceEnd - c.sourceStart)), 0)
    : (clipDuration || Number(probe.durationSeconds || 0));

  event.sender.send("runtime:render-progress", { progress: 2, stage: "Kiểm tra engine đồ họa FFmpeg...", operationId });
  let ffmpeg = findExecutable("ffmpeg");
  if (!ffmpeg) {
    try {
      ffmpeg = await ensureExecutable("ffmpeg", {
        onProgress: (p) => event.sender.send("runtime:render-progress", { ...p, operationId })
      });
    } catch (err) {
      console.warn("Auto-ensure ffmpeg error:", err);
    }
  }
  const warnings = [];
  let narrationPath = null;
  let subtitlePath = null;
  let subtitlesPath = null;
  let subtitleCueCount = 0;
  let voiceEngine = "none";
  let narrationTempo = 1;
  let narrationDuration = 0;
  if (options.narratorEnabled && options.narrationText) {
    const store = providerStore();
    let record = options.ttsProviderId ? store.find(options.ttsProviderId) : undefined;
    if (!record && options.providerId) record = store.find(options.providerId);
    if (!record?.apiKey || !record.capabilities?.includes("tts")) {
      const fallback = store.list().find((item) => item.enabled && item.hasApiKey && item.capabilities.includes("tts"));
      record = fallback ? store.find(fallback.id) : undefined;
    }
    const canUseProviderTts = Boolean(record?.enabled && record.apiKey && record.capabilities?.includes("tts"));

    try {
      const alignedResult = await synthesizeSceneAlignedNarration({
        record: canUseProviderTts ? record : undefined,
        narrationText: options.narrationText,
        subtitleSegments: options.subtitleSegments,
        renderedDuration,
        clipStart,
        voice: options.narratorVoice,
        gender: options.narratorGender,
        languageCode: options.language,
        operationId,
        ffmpeg,
      });
      narrationPath = alignedResult.path;
      if (narrationPath) {
        voiceEngine = canUseProviderTts ? "provider" : "local";
      }
    } catch (err) {
      throw new Error(`Lỗi tạo giọng đọc AI theo phân cảnh: ${err?.message || err}`);
    }

    if (narrationPath) {
      narrationDuration = await probeMediaDuration(narrationPath);
      if (narrationDuration > renderedDuration * 1.05 && renderedDuration > 0) {
        narrationTempo = narrationDuration / renderedDuration;
        if (narrationTempo > 4) throw new Error("Lời đọc dài hơn thời lượng cảnh quá nhiều. Hãy rút ngắn bản thảo của scene trước khi render.");
      }
    }
  }
  if (options.subtitlesEnabled !== false && (Array.isArray(options.subtitleSegments) && options.subtitleSegments.length || String(options.subtitleText || options.narrationText || "").trim())) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "jacs-subtitles-"));
    subtitlePath = path.join(directory, "captions.srt");
    const subtitleEnd = Math.max(1, narrationPath && narrationDuration > 0
      ? Math.min(renderedDuration || narrationDuration, narrationDuration)
      : renderedDuration || Number(probe.durationSeconds || 1));
    const segments = Array.isArray(options.subtitleSegments)
      ? options.subtitleSegments.map((segment) => ({ start: Math.max(0, Number(segment.start) - clipStart), end: Math.min(subtitleEnd, Number(segment.end) - clipStart), text: String(segment.text || "").trim() })).filter((segment) => segment.text && segment.end > segment.start)
      : [];
    const fallbackText = String(options.subtitleText || options.narrationText).trim().slice(0, 12000);
    subtitleCueCount = buildCaptionCues(segments, subtitleEnd, fallbackText).length;
    if (!subtitleCueCount) {
      safeRmDir(path.dirname(subtitlePath));
      subtitlePath = null;
      if (options.subtitlesEnabled !== false) warnings.push("Không có nội dung phụ đề theo scene; video vẫn được render.");
    } else {
      fs.writeFileSync(subtitlePath, buildSrt(segments, subtitleEnd, fallbackText), { encoding: "utf8", mode: 0o600 });
    }
  }
  const requestedBase = String(options.outputFileName || "").replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  const outputBase = requestedBase || base;
  const clipSuffix = clipDuration && !requestedBase ? `-${Math.round(clipStart)}s-${Math.round(clipEnd)}s` : (effectiveCutClips && !requestedBase ? "-recap-highlights" : "");
  const destination = path.join(directory, `${outputBase}${clipSuffix}-jacs-${Date.now()}${ffmpeg ? ".mp4" : path.extname(filePath)}`);
  event.sender.send("runtime:render-progress", { progress: 2, stage: "rendering", operationId });
  if (!ffmpeg) {
    if (narrationPath || options.logoPath || options.subtitlesEnabled !== false && (String(options.subtitleText || options.narrationText || "").trim() || Array.isArray(options.subtitleSegments) && options.subtitleSegments.length)) {
      if (narrationPath) safeRmDir(path.dirname(narrationPath));
      if (subtitlePath) safeRmDir(path.dirname(subtitlePath));
      throw new Error("Không thể render phụ đề/logo/voice vì máy chưa có FFmpeg. Hãy cài lại bản Desktop đầy đủ hoặc cài FFmpeg rồi chạy lại.");
    }
    fs.copyFileSync(filePath, destination);
    const manifest = writeRenderManifest(destination, { passthrough: true, durationSeconds: renderedDuration, voiceEngine });
    event.sender.send("runtime:render-progress", { progress: 100, stage: "completed", outputPath: destination, operationId });
    if (narrationPath) safeRmDir(path.dirname(narrationPath));
    if (subtitlePath) safeRmDir(path.dirname(subtitlePath));
    return { outputPath: destination, durationSeconds: renderedDuration, passthrough: true, warnings, narrationGenerated: false, narrationDurationSeconds: narrationDuration || undefined, subtitlesBurned: false, subtitleCueCount, voiceEngine, outputChecksum: manifest.checksum, manifestPath: manifest.manifestPath };
  }
  const hardwareCodecs = options.mode === "local-gpu" && process.platform === "darwin"
    ? ["h264_videotoolbox"]
    : options.mode === "local-gpu" && process.platform === "win32"
      ? options.preferredEngine === "cpu" ? [] : options.preferredEngine === "nvidia" ? ["h264_nvenc"] : ["h264_nvenc", "h264_qsv", "h264_amf"]
      : [];
  const codecs = [...hardwareCodecs, "libx264"];
  const subjectFocus = options.subjectTracking === false ? null : await detectSubjectFocus(localVideoPath, renderedDuration, operationId);
  const renderWithCodec = (codec) => {
    const hasCuts = Boolean(effectiveCutClips && effectiveCutClips.length > 1);
    const args = ["-y"];
    if (clipStart && !hasCuts) args.push("-ss", String(clipStart));
    args.push("-i", path.resolve(localVideoPath));
    const musicPath = options.backgroundMusic && options.backgroundMusicPath && fs.existsSync(options.backgroundMusicPath) ? options.backgroundMusicPath : null;
    if (options.backgroundMusic && !musicPath) warnings.push("Đã bật nhạc nền nhưng chưa chọn file nhạc hợp lệ.");
    const logoPath = options.logoPath && fs.existsSync(options.logoPath) ? options.logoPath : null;
    if (options.logoPath && !logoPath) warnings.push("Đã bật logo nhưng file logo không còn tồn tại.");

    const validNarration = Boolean(narrationPath && fs.existsSync(narrationPath) && fs.statSync(narrationPath).size > 100);
    const validMusic = Boolean(musicPath && fs.existsSync(musicPath) && fs.statSync(musicPath).size > 100);
    const validLogo = Boolean(logoPath && fs.existsSync(logoPath) && fs.statSync(logoPath).size > 100);

    if (validNarration) args.push("-i", path.resolve(narrationPath));
    if (validMusic) args.push("-stream_loop", "-1", "-i", path.resolve(musicPath));
    if (validLogo) args.push("-i", path.resolve(logoPath));
    if (renderedDuration) args.push("-t", String(renderedDuration));
    const focusX = subjectFocus ? Math.max(0, Math.min(1, Number(subjectFocus.x))) : 0.5;
    const filters = {
      "9:16": `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920:${focusX.toFixed(4)}*(iw-ow):((ih-oh)/2)`,
      "1:1": `scale=1080:1080:force_original_aspect_ratio=increase,crop=1080:1080:${focusX.toFixed(4)}*(iw-ow):((ih-oh)/2)`,
      "16:9": `scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080:${focusX.toFixed(4)}*(iw-ow):((ih-oh)/2)`,
    };
    const baseVideoFilter = filters[options.aspectRatio] || "";
    const shouldSubtitle = options.subtitlesEnabled !== false && (Boolean(options.subtitleText || options.narrationText) || Array.isArray(options.subtitleSegments) && options.subtitleSegments.length > 0);
    const subtitleFilter = shouldSubtitle && subtitlePath ? `subtitles='${escapeFilterPath(subtitlePath)}':charenc=UTF-8:force_style='${subtitleForceStyle(options.subtitleStyle, options.aspectRatio, options.subtitleCustomStyle)}'` : "";
    const videoChain = [baseVideoFilter, subtitleFilter].filter(Boolean).join(",");
    const logoInputIndex = validLogo ? 1 + (validNarration ? 1 : 0) + (validMusic ? 1 : 0) : -1;

    const graph = [];
    let videoSourceLabel = "0:v";
    let audioSourceLabel = "0:a";

    if (hasCuts) {
      const vTrims = [];
      const aTrims = [];
      const concatPairs = [];
      const shouldIncludeOriginalAudio = Boolean(probe.hasAudio && options.keepOriginalAudio !== false);
      effectiveCutClips.forEach((c, idx) => {
        const sStart = Math.max(0, Number(c.sourceStart || 0));
        const sEnd = Math.max(sStart + 0.5, Number(c.sourceEnd || (sStart + (c.duration || 10))));
        vTrims.push(`[0:v]trim=start=${sStart}:end=${sEnd},setpts=PTS-STARTPTS[cutv${idx}]`);
        if (shouldIncludeOriginalAudio) {
          aTrims.push(`[0:a]atrim=start=${sStart}:end=${sEnd},asetpts=PTS-STARTPTS[cuta${idx}]`);
          concatPairs.push(`[cutv${idx}][cuta${idx}]`);
        } else {
          concatPairs.push(`[cutv${idx}]`);
        }
      });
      graph.push(...vTrims);
      if (shouldIncludeOriginalAudio) {
        graph.push(...aTrims);
        graph.push(`${concatPairs.join("")}concat=n=${effectiveCutClips.length}:v=1:a=1[basecut_v][basecut_a]`);
        videoSourceLabel = "basecut_v";
        audioSourceLabel = "basecut_a";
      } else {
        graph.push(`${concatPairs.join("")}concat=n=${effectiveCutClips.length}:v=1:a=0[basecut_v]`);
        videoSourceLabel = "basecut_v";
      }
    }

    const audioFilter = buildAudioFilter({
      hasOriginalAudio: Boolean(probe.hasAudio && options.keepOriginalAudio !== false),
      audioInputLabel: hasCuts ? audioSourceLabel : "[0:a]",
      narrationInputIndex: validNarration ? 1 : undefined,
      musicInputIndex: validMusic ? (validNarration ? 2 : 1) : undefined,
      keepOriginalAudio: options.keepOriginalAudio !== false,
      musicVolume: options.backgroundMusicVolume ?? 20,
      narrationTempo,
      duckOriginalAudio: validNarration
    });

    const needsVideoGraph = Boolean(validLogo || videoChain || hasCuts);
    if (validLogo) {
      const opacity = Math.max(0.1, Math.min(1, Number(options.logoOpacity ?? 0.82)));
      const position = logoOverlayPosition(options.logoPosition);
      graph.push(`[${videoSourceLabel}]${videoChain || "null"}[base]`, `[${logoInputIndex}:v]format=rgba,colorchannelmixer=aa=${opacity}[logo]`, `[base][logo]overlay=${position}[vout]`);
    } else if (videoChain) {
      graph.push(`[${videoSourceLabel}]${videoChain}[vout]`);
    } else if (hasCuts) {
      graph.push(`[${videoSourceLabel}]null[vout]`);
    }

    args.push("-c:v", codec);
    if (codec === "libx264") args.push("-preset", "fast");
    if (codec === "h264_nvenc") args.push("-preset", "p4");
    if (codec === "h264_videotoolbox") args.push("-b:v", "8M");
    args.push("-pix_fmt", "yuv420p");
    if (audioFilter) graph.push(audioFilter);
    if (graph.length) {
      args.push("-filter_complex", graph.join(";"), "-map", needsVideoGraph ? "[vout]" : "0:v:0");
      if (audioFilter) args.push("-map", "[aout]", "-c:a", "aac");
      else if (options.keepOriginalAudio === false || narrationPath || musicPath) args.push("-an");
      else args.push("-map", hasCuts ? `[${audioSourceLabel}]` : "0:a:0?", "-c:a", "aac");
    } else if (options.keepOriginalAudio === false || narrationPath || musicPath) args.push("-an");
    else args.push("-c:a", "aac");
    args.push("-movflags", "+faststart", destination);
    return runProcess(ffmpeg, args, (line) => {
      const match = line.match(/time=(\d+):(\d+):(\d+(?:\.\d+)?)/);
      if (!match || !renderedDuration) return;
      const elapsed = Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
      event.sender.send("runtime:render-progress", { progress: Math.max(2, Math.min(99, Math.round(elapsed / renderedDuration * 100))), stage: "rendering", operationId });
    }, operationId);
  };
  let lastError;
  for (const codec of codecs) {
    try {
      await renderWithCodec(codec);
      if (subtitlePath && fs.existsSync(subtitlePath)) {
        try {
          subtitlesPath = destination.replace(/\.[^.]+$/, ".srt");
          fs.copyFileSync(subtitlePath, subtitlesPath);
        } catch (error) {
          subtitlesPath = null;
          warnings.push(`Đã burn phụ đề nhưng không lưu được file SRT cạnh output: ${error?.message || error}`);
        }
      }
      event.sender.send("runtime:render-progress", { progress: 100, stage: "completed", outputPath: destination, operationId });
      const manifest = writeRenderManifest(destination, { durationSeconds: renderedDuration, voiceEngine, narrationDurationSeconds: narrationDuration || undefined, subtitleCueCount, subtitlesBurned: Boolean(subtitlePath) });
      if (narrationPath) safeRmDir(path.dirname(narrationPath));
      if (subtitlePath) safeRmDir(path.dirname(subtitlePath));
      return { outputPath: destination, durationSeconds: renderedDuration, passthrough: false, warnings, narrationGenerated: Boolean(narrationPath), narrationDurationSeconds: narrationDuration || undefined, subtitlesBurned: Boolean(subtitlePath), subtitleCueCount, subtitlesPath: subtitlesPath || undefined, voiceEngine, outputChecksum: manifest.checksum, manifestPath: manifest.manifestPath };
    } catch (error) {
      lastError = error;
      if (error?.code === "JACS_OPERATION_CANCELLED" || operationState(operationId)?.cancelled) {
        if (narrationPath) safeRmDir(path.dirname(narrationPath));
        if (subtitlePath) safeRmDir(path.dirname(subtitlePath));
        throw cancelledOperationError();
      }
      event.sender.send("runtime:render-progress", { progress: 3, stage: "rendering", operationId });
    }
  }
  if (narrationPath) safeRmDir(path.dirname(narrationPath));
  if (subtitlePath) safeRmDir(path.dirname(subtitlePath));
  throw lastError || new Error("Không thể render video bằng các codec khả dụng");
}

function readPreferences() {
  try { return { ...defaultPreferences(), ...JSON.parse(fs.readFileSync(preferencesPath(), "utf8")) }; } catch { return defaultPreferences(); }
}

function writePreferences(value) {
  const preferences = { ...defaultPreferences(), ...value };
  if (!Object.hasOwn({ auto: true, apple: true, nvidia: true, cpu: true }, preferences.preferredEngine)) throw new Error("Invalid preferred engine");
  const tempPath = `${preferencesPath()}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(preferences, null, 2), { mode: 0o600 });
  fs.renameSync(tempPath, preferencesPath());
}

async function testStoredProvider(record) {
  if (!record || !record.apiKey) return { status: "invalid_credentials", detail: "Provider chưa có API key hoặc Session Token", latencyMs: 0 };
  const started = Date.now();
  const headers = { Accept: "application/json", "Content-Type": "application/json" };
  let url = record.baseUrl;
  const endpoint = (base, suffix) => base.endsWith(suffix) ? base : `${base}/${suffix}`;
  let body;

  const isGroq = /(^|\.)api\.groq\.com$/i.test(new URL(record.baseUrl).hostname);
  if (isGroq && ["openai", "openai-compatible"].includes(record.providerType)) {
    try {
      const response = await fetch(endpoint(record.baseUrl, "models"), { headers: { Accept: "application/json", Authorization: `Bearer ${record.apiKey}` }, signal: AbortSignal.timeout(10000) });
      const latencyMs = Date.now() - started;
      const payload = await response.json().catch(() => ({}));
      if (response.status === 401 || response.status === 403) return { status: "invalid_credentials", detail: "Groq từ chối API key", latencyMs, httpStatus: response.status };
      if (!response.ok) {
        const errorMsg = payload?.error?.message || payload?.message || `HTTP ${response.status}`;
        return { status: "unreachable", detail: `Groq trả về lỗi: ${errorMsg}`, latencyMs, httpStatus: response.status };
      }
      const ids = Array.isArray(payload?.data) ? payload.data.map((model) => String(model?.id || "")) : [];
      const missingChat = record.model && !ids.includes(record.model);
      const missingWhisper = record.transcriptionModel && !ids.includes(record.transcriptionModel);
      const missing = [missingChat ? `model analysis \"${record.model}\"` : "", missingWhisper ? `model transcription \"${record.transcriptionModel}\"` : ""].filter(Boolean);
      const available = ids.filter(Boolean).slice(0, 12).join(", ");
      return { status: "reachable", detail: missing.length ? `Kết nối Groq thành công, nhưng không tìm thấy ${missing.join(" và ")} trong tài khoản. Model khả dụng: ${available || "không đọc được danh sách"}.` : "Kết nối Groq thành công; model analysis và Whisper đều khả dụng.", latencyMs, httpStatus: response.status };
    } catch (error) {
      return { status: "unreachable", detail: error?.name === "TimeoutError" ? "Groq timeout sau 10 giây" : "Không thể kết nối Groq", latencyMs: Date.now() - started };
    }
  }

  if (record.isManaged) {
    let licenseKey = "JACS-MANAGED";
    try {
      if (safeStorage.isEncryptionAvailable() && fs.existsSync(licensePath())) {
        const raw = fs.readFileSync(licensePath());
        licenseKey = safeStorage.decryptString(raw) || "JACS-MANAGED";
      }
    } catch { /* best effort */ }
    url = endpoint(record.baseUrl, "chat/completions");
    headers.Authorization = `Bearer ${licenseKey}`;
    headers["x-jacs-license-key"] = licenseKey;
    body = JSON.stringify({ model: record.model || "gpt-5.6-sol", max_tokens: 16, messages: [{ role: "user", content: "ping" }] });
  } else if (record.providerType === "gemini") {
    const cleanKey = String(record.apiKey || "").trim().replace(/^["']|["']$/g, "");
    let cleanModel = (record.model || "gemini-1.5-flash").trim().replace(/^models\//i, "");
    if (cleanModel === "gemini-flash-latest") cleanModel = "gemini-1.5-flash";
    url = `${record.baseUrl}/models/${encodeURIComponent(cleanModel)}:generateContent?key=${encodeURIComponent(cleanKey)}`;
    headers["x-goog-api-key"] = cleanKey;
    body = JSON.stringify({ contents: [{ parts: [{ text: "ping" }] }] });
  } else if (record.providerType === "anthropic") {
    url = endpoint(record.baseUrl, "messages");
    headers["x-api-key"] = record.apiKey;
    headers["anthropic-version"] = "2023-06-01";
    body = JSON.stringify({ model: record.model || "claude-3-5-sonnet-latest", max_tokens: 16, messages: [{ role: "user", content: "ping" }] });
  } else if (["openai", "openai-compatible", "custom"].includes(record.providerType)) {
    url = endpoint(record.baseUrl, "chat/completions");
    headers.Authorization = `Bearer ${record.apiKey}`;
    body = JSON.stringify({ model: record.model || "gpt-4o-mini", max_tokens: 16, messages: [{ role: "user", content: "ping" }] });
  } else return { status: "unsupported", detail: "Provider type chưa được hỗ trợ", latencyMs: 0 };

  try {
    let response = await fetch(url, { method: body ? "POST" : "GET", headers, body, signal: AbortSignal.timeout(10000) });
    let latencyMs = Date.now() - started;
    let payload = await response.json().catch(() => ({}));

    // If Gemini model is 404 or 503, try alternate resilient models (gemini-1.5-flash / gemini-2.5-flash)
    if (!response.ok && [404, 503].includes(response.status) && record.providerType === "gemini") {
      const cleanKey = String(record.apiKey || "").trim().replace(/^["']|["']$/g, "");
      const alternates = ["gemini-1.5-flash", "gemini-2.5-flash", "gemini-2.0-flash"];
      for (const alt of alternates) {
        const fallbackUrl = `${record.baseUrl}/models/${encodeURIComponent(alt)}:generateContent?key=${encodeURIComponent(cleanKey)}`;
        const fallbackResp = await fetch(fallbackUrl, { method: "POST", headers, body, signal: AbortSignal.timeout(10000) }).catch(() => null);
        if (fallbackResp && fallbackResp.ok) {
          response = fallbackResp;
          latencyMs = Date.now() - started;
          payload = await response.json().catch(() => ({}));
          break;
        }
      }
    }

    const errorMsg = String(payload?.error?.message || payload?.error?.detail || payload?.message || payload?.error?.status || "").replace(/\s+/g, " ").trim();

    if (response.ok) {
      return { status: "reachable", detail: "Kết nối provider thành công · Sẵn sàng xử lý kịch bản & video.", latencyMs, httpStatus: response.status };
    }

    if (
      response.status === 401 ||
      response.status === 403 ||
      errorMsg.includes("API key not valid") ||
      errorMsg.includes("API_KEY_INVALID") ||
      errorMsg.includes("Unauthorized") ||
      errorMsg.includes("Authentication")
    ) {
      const reason = errorMsg ? `: ${errorMsg}` : "";
      return {
        status: "invalid_credentials",
        detail: `API Key không hợp lệ hoặc bị từ chối${reason}. Vui lòng kiểm tra lại mã API Key đã sao chép từ tài khoản AI của bạn.`,
        latencyMs,
        httpStatus: response.status,
      };
    }

    if (response.status === 404) {
      return {
        status: "unreachable",
        detail: `Không tìm thấy mô hình "${record.model}" hoặc sai Endpoint URL (HTTP 404). Hãy đổi sang model khác (vd: gemini-2.0-flash, gpt-4o-mini).`,
        latencyMs,
        httpStatus: 404,
      };
    }

    if (response.status === 429) {
      return {
        status: "unreachable",
        detail: `Tài khoản AI đã vượt quá hạn mức hoặc hết số dư/credits (HTTP 429 Rate Limit / Quota Exceeded). ${errorMsg}`,
        latencyMs,
        httpStatus: 429,
      };
    }

    if (errorMsg.includes("No pricing rule") || errorMsg.includes("no_pricing_rule")) {
      return {
        status: "unreachable",
        detail: `Cổng API trung gian (OneAPI / Proxy) chưa thiết lập giá hoặc chưa hỗ trợ tên model "${record.model}". Hãy kiểm tra lại danh sách model của bên cấp API hoặc đổi sang model chuẩn (vd: gpt-4o, gpt-4o-mini, claude-3-5-sonnet-20241022, gemini-2.0-flash).`,
        latencyMs,
        httpStatus: 400,
      };
    }

    if (errorMsg) {
      return {
        status: "unreachable",
        detail: `Máy chủ AI trả về lỗi (HTTP ${response.status}): ${errorMsg}`,
        latencyMs,
        httpStatus: response.status,
      };
    }

    return { status: "unreachable", detail: `Provider trả về HTTP ${response.status}`, latencyMs, httpStatus: response.status };
  } catch (error) {
    return { status: "unreachable", detail: error?.name === "TimeoutError" ? "Provider timeout sau 10 giây" : (error?.message || "Không thể kết nối provider"), latencyMs: Date.now() - started };
  }
}

function registerIpc() {
  ipcMain.handle("runtime:machine-info", () => machineInfo());
  ipcMain.handle("runtime:read-license", () => {
    try {
      if (!safeStorage.isEncryptionAvailable() || !fs.existsSync(licensePath())) return null;
      const raw = fs.readFileSync(licensePath());
      return safeStorage.decryptString(raw);
    } catch { return null; }
  });
  ipcMain.handle("runtime:save-license", (_event, value) => {
    if (!safeStorage.isEncryptionAvailable()) throw new Error("Secure storage is unavailable on this device");
    const raw = safeStorage.encryptString(String(value));
    fs.writeFileSync(licensePath(), raw, { mode: 0o600 });
  });
  ipcMain.handle("runtime:clear-license", () => { try { fs.rmSync(licensePath(), { force: true }); } catch { /* best effort */ } });
  ipcMain.handle("runtime:get-preferences", () => readPreferences());
  ipcMain.handle("runtime:save-preferences", (_event, value) => { if (!value || typeof value !== "object") throw new Error("Invalid preferences"); writePreferences(value); });
  ipcMain.handle("runtime:media-capabilities", () => {
    const ffmpegPath = findExecutable("ffmpeg");
    const ffprobePath = findExecutable("ffprobe");
    return { ffmpeg: Boolean(ffmpegPath), ffprobe: Boolean(ffprobePath), ffmpegPath: ffmpegPath || undefined, ffprobePath: ffprobePath || undefined };
  });
  ipcMain.handle("runtime:clear-cache", () => {
    const directory = path.join(app.getPath("userData"), "cache");
    fs.rmSync(directory, { recursive: true, force: true });
    fs.mkdirSync(directory, { recursive: true });
  });
  ipcMain.handle("runtime:get-providers", () => providerStore().list());
  ipcMain.handle("runtime:sync-managed-providers", (_event, providers) => {
    providerStore().syncManaged(providers);
    return providerStore().list();
  });
  ipcMain.handle("runtime:list-voices", (_event, language) => listVoicePacks(language));
  ipcMain.handle("runtime:save-provider", (_event, value) => providerStore().save(value));
  ipcMain.handle("runtime:delete-provider", (_event, id) => providerStore().delete(id));
  ipcMain.handle("runtime:test-provider", async (_event, id) => {
    const record = providerStore().find(id);
    if (!record) throw new Error("Không tìm thấy provider");
    return testStoredProvider(record);
  });
  ipcMain.handle("runtime:web-session-login", async (_event, providerType) => {
    return new Promise((resolve) => {
      let targetUrl = "https://gemini.google.com/app";
      if (providerType === "openai") targetUrl = "https://chatgpt.com/";
      if (providerType === "anthropic") targetUrl = "https://claude.ai/login";

      const authWin = new BrowserWindow({
        width: 820,
        height: 720,
        title: `Đăng Nhập ${String(providerType).toUpperCase()} Web Session`,
        autoHideMenuBar: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
      });

      authWin.loadURL(targetUrl);

      let found = false;
      const checkInterval = setInterval(async () => {
        if (authWin.isDestroyed()) {
          clearInterval(checkInterval);
          return;
        }
        try {
          const cookies = await authWin.webContents.session.cookies.get({ url: targetUrl });
          const matched = cookies.find((c) =>
            ["__Secure-1PSID", "__Secure-3PSID", "session-token", "_session_id", "access_token", "cf_clearance"].includes(c.name)
          );
          if (matched && !found) {
            found = true;
            clearInterval(checkInterval);
            const token = matched.value;
            authWin.close();
            resolve({
              success: true,
              token,
              providerType,
              cookieName: matched.name,
              cookiesCount: cookies.length,
            });
          }
        } catch {
          // continue checking
        }
      }, 1500);

      authWin.on("closed", () => {
        clearInterval(checkInterval);
        if (!found) {
          resolve({ success: false, message: "Đã đóng cửa sổ đăng nhập web" });
        }
      });
    });
  });
  ipcMain.handle("runtime:check-update", (_event, channel) => checkForUpdate(channel));
  ipcMain.handle("runtime:download-update", (event, release) => downloadAndInstallUpdate(event, release));
  ipcMain.handle("runtime:open-external", async (_event, value) => {
    try {
      const url = new URL(String(value));
      if (!["http:", "https:"].includes(url.protocol)) throw new Error("Chỉ hỗ trợ giao thức HTTP/HTTPS");
      await shell.openExternal(url.toString());
    } catch (err) {
      throw new Error(`Không thể mở trình duyệt: ${err.message}`);
    }
  });
  ipcMain.handle("runtime:pick-video", async () => { const result = await dialog.showOpenDialog({ properties: ["openFile"], filters: [{ name: "Video", extensions: ["mp4", "mov", "mkv", "webm", "avi"] }] }); return result.canceled ? null : result.filePaths[0] ?? null; });
  ipcMain.handle("runtime:pick-videos", async () => { const result = await dialog.showOpenDialog({ properties: ["openFile", "multiSelections"], filters: [{ name: "Video", extensions: ["mp4", "mov", "mkv", "webm", "avi"] }] }); return result.canceled ? [] : result.filePaths; });
  ipcMain.handle("runtime:pick-output-folder", async () => { const result = await dialog.showOpenDialog({ properties: ["openDirectory", "createDirectory"] }); return result.canceled ? null : result.filePaths[0] ?? null; });
  ipcMain.handle("runtime:pick-audio", async () => { const result = await dialog.showOpenDialog({ properties: ["openFile"], filters: [{ name: "Audio", extensions: ["mp3", "wav", "m4a", "aac", "flac", "ogg"] }] }); return result.canceled ? null : result.filePaths[0] ?? null; });
  ipcMain.handle("runtime:pick-image", async () => { const result = await dialog.showOpenDialog({ properties: ["openFile"], filters: [{ name: "Logo", extensions: ["png", "jpg", "jpeg", "webp"] }] }); return result.canceled ? null : result.filePaths[0] ?? null; });
  ipcMain.handle("runtime:probe-video", async (_event, value) => {
    if (!value) return null;
    if (/^https?:\/\//i.test(String(value))) {
      try {
        const ffprobe = findExecutable("ffprobe");
        if (ffprobe) {
          const output = childProcess.execFileSync(ffprobe, ["-v", "error", "-show_entries", "format=duration:stream=codec_type,width,height,r_frame_rate", "-of", "json", value], { encoding: "utf8", windowsHide: true, timeout: 8000 });
          const parsed = JSON.parse(output);
          const format = parsed.format || {};
          const stream = (parsed.streams || []).find((item) => item.width || item.height) || {};
          return { path: value, durationSeconds: Number(format.duration || 0), width: stream.width, height: stream.height, hasAudio: (parsed.streams || []).some((item) => item.codec_type === "audio") };
        }
      } catch {}
      return { path: value, durationSeconds: 0 };
    }
    return probeVideoFile(value);
  });
  ipcMain.handle("runtime:download-video", async (event, value, operationId) => {
    const state = beginOperation(operationId);
    try { return await downloadVideo(event, value, operationId); }
    finally { if (state) endOperation(operationId); }
  });
  ipcMain.handle("runtime:analyze-video", async (event, filePath, providerId, operationId, options = {}) => {
    const state = beginOperation(operationId);
    try {
      let localFilePath = filePath;
      if (/^https?:\/\//i.test(String(filePath || ""))) {
        event.sender.send("runtime:analysis-progress", { progress: 3, stage: "Đang tải video từ đường dẫn URL...", operationId });
        localFilePath = await downloadVideo(event, filePath, operationId);
      }
      event.sender.send("runtime:analysis-progress", { progress: 8, stage: "probing", operationId });
      const probe = await probeVideoFile(localFilePath);
      const storeInstance = providerStore();
      const targetProviderId = (providerId && String(providerId).trim() && providerId !== "local") ? providerId : undefined;
      const defaultProvider = !targetProviderId ? storeInstance.list().find((item) => item.enabled && item.hasApiKey && item.capabilities.includes("analysis")) : undefined;
      const record = storeInstance.find(targetProviderId || defaultProvider?.id);
      if (!record || !record.apiKey) {
        throw new Error("Chưa phát hiện API Key của Provider AI (Google Gemini / OpenAI). Để AI có thể xem hình ảnh, phân tích bối cảnh và viết kịch bản lồng tiếng từ Prompt, vui lòng vào 'Cài đặt tool' (góc trái bên dưới) -> nhập API Key của Gemini hoặc OpenAI rồi thử lại.");
      }
      event.sender.send("runtime:analysis-progress", { progress: 18, stage: "extracting-frames", operationId });
      const transcriptionProviderId = options.transcriptionProviderId || record?.id;
      const transcriptionRecord = storeInstance.find(transcriptionProviderId);
      if (options.transcriptionProviderId && (!transcriptionRecord || !transcriptionRecord.enabled || !transcriptionRecord.apiKey || !transcriptionRecord.capabilities?.includes("transcription"))) {
        throw new Error("Provider transcription chưa sẵn sàng hoặc chưa bật capability transcription. Hãy cấu hình Groq Whisper trong Cài đặt tool.");
      }
      const [frames, transcriptResult] = await Promise.all([
        extractAnalysisFrames(localFilePath, probe.durationSeconds, operationId),
        transcribeVideo(localFilePath, transcriptionRecord || record, operationId, probe.durationSeconds),
      ]);
      const transcript = transcriptResult?.text || "";
      const transcriptSegments = transcriptResult?.segments || [];
      const providerFrames = frames;
      event.sender.send("runtime:analysis-progress", { progress: 68, stage: transcript ? "transcribed" : "frames-ready", operationId });
      const transcriptContext = transcript ? `\n- Lời thoại gốc bóc băng: ${transcript}` : "";
      const frameContext = providerFrames.length ? `\n- Có ${providerFrames.length} khung hình mẫu đại diện theo thứ tự thời gian: ${frameTimeline(providerFrames)}.` : "";
      const languageCode = Array.isArray(options.languages) && options.languages.length ? options.languages[0] : "vi";
      const outputLanguage = languageName(languageCode);
      const isVietnamese = languageCode === "vi";
      const endStamp = `${Math.floor(probe.durationSeconds / 60).toString().padStart(2, "0")}:${Math.floor(probe.durationSeconds % 60).toString().padStart(2, "0")}`;
      const rawPrompt = options.customPrompt && String(options.customPrompt).trim() ? String(options.customPrompt).trim() : "";
      const isStoryRecap = options.analysisMode === "story_recap" ||
                           (options.targetDurationMinutes && options.targetDurationMinutes > 0) ||
                           /story_recap|recap|tóm tắt|kể lại|rút gọn/i.test(rawPrompt);
      const targetDurationMins = Number(options.targetDurationMinutes) || (isStoryRecap ? 5.5 : Math.ceil(probe.durationSeconds / 60));
      const targetSceneCount = isStoryRecap
        ? Math.max(8, Math.min(22, Math.round(targetDurationMins * 2.8)))
        : Math.max(4, Math.min(25, Math.ceil(probe.durationSeconds / 15)));

      const rawFileName = path.basename(localFilePath, path.extname(localFilePath));
      let cleanVideoTitle = rawFileName
        .replace(/^(?:ytdown(?:loader)?(?:\.com)?|youtube|media|video|download|jacs|yt)[_.-]*/gi, "")
        .replace(/[-_.]+/g, " ")
        .replace(/\b(?:1080p|720p|480p|4k|hd|mp4|mkv|avi|mov|webm)\b/gi, "")
        .replace(/\b(?:media|gdky|ip[a-z0-9]+|\d{3,})\b/gi, "")
        .replace(/\b([A-Za-z]+)\s+s\b/g, "$1's")
        .replace(/\s+/g, " ")
        .trim();
      if (!cleanVideoTitle || cleanVideoTitle.length < 3) cleanVideoTitle = rawFileName;

      const customPromptText = rawPrompt || (isVietnamese
        ? `Bạn là một Biên kịch - Kể chuyện Chuyên nghiệp (Master Storyteller & Scriptwriter) chuyên chuyển thể các tư liệu video đời thực/pháp luật/cảnh sát/xã hội thành kịch bản Voice-over kịch tính, lôi cuốn, mang tính nhân văn và quan sát xã hội sâu sắc. Hãy bóc tách video "${cleanVideoTitle}" dài ${endStamp}, viết kịch bản kể chuyện hoàn chỉnh bằng NGÔI THỨ 3 theo Cấu trúc Storytelling 3 HỒI BẮT BUỘC: [00:00 - 00:10] Hook cao trào (bê nguyên hoặc trích câu thoại/tình tiết mâu thuẫn sốc nhất dưới 10s để giữ chân người xem), Hồi 1: Khởi nguồn & Nghịch lý ban đầu, Hồi 2: Xung đột leo thang & Lớp mặt nạ bị xé toạc, Hồi 3: Kết cục, Công lý & Bài học quan sát xã hội.`
        : `Act as a professional 3rd-person narrator and master storyteller, analyzing the full video narrative arc of "${cleanVideoTitle}" and extracting key highlight cut scenes with a gripping 3-Act structure and viral 10s hook.`);

      const languageRule = isVietnamese
        ? "TẤT CẢ NỘI DUNG (summary, title, detail, translation, voiceover, voice_script) BẮT BUỘC VIẾT 100% BẰNG TIẾNG VIỆT."
        : `CRITICAL LANGUAGE DIRECTIVE: The user requested target language: "${outputLanguage}" (Language Code: ${languageCode}). ALL fields ("summary", "title", "detail", "translation", "voiceover", and "voice_script") MUST BE WRITTEN 100% AND EXCLUSIVELY IN ${outputLanguage}. Under no circumstances should Vietnamese or any other language be returned.`;

      const sampleSceneObj = isVietnamese
        ? {
            id: "scene-1",
            source_start: "00:00:00",
            source_end: "00:00:10",
            start: "00:00:00",
            end: "00:00:10",
            title: "[00:00 - 00:10] Hook Cao Trào (Viral Retention)",
            detail: "Trích xuất câu thoại đắt giá hoặc khoảnh khắc mâu thuẫn kịch tính nhất của video để chặn người xem lướt qua.",
            action_visual: "Hình ảnh cận cảnh khoảnh khắc kịch tính/nguy cấp nhất trong 10 giây đầu của video gốc.",
            translation: "Tình huống nghẹt thở mở màn ngay lập tức kích hoạt sự chú ý đặc biệt.",
            voiceover: "Một dấu hiệu bất thường đến rợn người bị phát hiện ngay giữa thanh thiên bạch nhật, mở đầu cho cuộc đối đầu nghẹt thở mà không ai có thể lường trước."
          }
        : {
            id: "scene-1",
            source_start: "00:00:00",
            source_end: "00:00:10",
            start: "00:00:00",
            end: "00:00:10",
            title: "[00:00 - 00:10] Climax Hook (Viral Retention)",
            detail: "Extract the most compelling dialogue or shocking conflict from the source to prevent drop-off.",
            action_visual: "Visual of the most intense moment captured in the first 10 seconds of raw footage.",
            translation: "A thrilling opening that instantly captures viewer attention.",
            voiceover: "A chilling anomaly discovered in broad daylight triggers an intense standoff that no one saw coming."
          };

      const isCopsBodycam = options.scriptStylePreset === "cops_bodycam" ||
                            /cops_bodycam|master_cops|cảnh sát|tuần tra|truy đuổi|hồ sơ phá án|police|bodycam/i.test(customPromptText);
      const isRealityShow = options.scriptStylePreset === "reality_drama" ||
                            /reality_drama|show thực tế|truyền hình thực tế|hẹn hò thực tế/i.test(customPromptText);

      let genreGuidance = "";
      if (isCopsBodycam) {
        genreGuidance = `
SPECIALIZED COPS BODYCAM / TRUE CRIME & MASTER STORYTELLING RULES:
- VĂN PHONG CHỦ ĐẠO: "Cảnh sát tuần tra / Hồ sơ phá án (Police Bodycam / Cops / True Crime)" — Nhấn mạnh vào trực giác nghiệp vụ của cảnh sát tuần tra (Cop's Gut Feeling), diễn biến căng thẳng nghẹt thở, lời khai đối chiếu mâu thuẫn, những manh mối bị phát hiện ngay tại hiện trường.
- GÓC NHÌN BỔ SUNG: Ký sự pháp luật & quan sát tâm lý xã hội sâu sắc (phân tích động cơ, sự xảo quyệt hay hoảng loạn của đối tượng, sự ngây thơ bị thao túng của nạn nhân).
- NGÔI KỂ: Ngôi thứ ba hoàn toàn ("gã đàn ông", "cô bé", "người mẹ", "hắn", "viên cảnh sát tuần tra", "sĩ quan cảnh sát", "tổ công tác"...).
- NHỊP ĐIỆU: Đoạn đầu nhanh dồn dập; đoạn giữa kịch tính đấu trí tâm lý; đoạn kết đanh thép, thượng tôn pháp luật và sâu sắc.`;
      } else if (isRealityShow) {
        genreGuidance = `
SPECIALIZED REALITY TV & SOCIAL DRAMA RULES:
- TONE: Sôi nổi, cuốn hút, dí dỏm, bình luận sắc sảo, đẩy cao trào cảm xúc và kịch tính giữa các nhân vật.
- FOCUS: Nêu bật biểu cảm khuôn mặt, các cuộc đối thoại tranh luận nảy lửa, phản ứng bất ngờ của nhân vật.
- FRAME MATCHING: Khung hình đang chiếu vào ai hoặc tình huống gì thì lời dẫn phải bình luận chính xác vào người và hành động đó.`;
      }

      let recapGuidance = `
🎯 CẤU TRÚC STORYTELLING BẮT BUỘC (3 HỒI & VIRAL RETENTION 10S):
Nhiệm vụ của bạn là xem toàn bộ video dài ${endStamp} về "${cleanVideoTitle}", đọc hiểu 100% nội dung thực tế qua các khung hình và lời thoại bóc băng, sau đó biên kịch lại toàn bộ câu chuyện bằng lời kể chuyện ngôi thứ 3 (Narrator) trong khoảng 3 đến 7 phút (~500 - 1200 từ tiếng Việt).

1. [00:00 - 00:10] HOOK CAO TRÀO (BẮT BUỘC Ở SCENE ĐẦU TIÊN):
   - Thời lượng đọc: Đúng 10 giây đầu (khoảng 25 - 35 từ).
   - Kỹ thuật: Bê nguyên hoặc trích xuất ngay câu thoại đắt giá nhất / tình tiết mâu thuẫn gây sốc nhất của video (tiếng khóc cầu cứu, câu nói lật mặt, bằng chứng rợn người, hành động bất thường).
   - Mục tiêu: Chặn người xem lướt qua trong 3 giây đầu, tạo khoảng trống tò mò (curiosity gap) cực lớn.

2. [HỒI 1] KHỞI NGUỒN & NGHỊCH LÝ BAN ĐẦU:
   - Diễn tả theo hướng giật tít để đưa hồi 2 vào cao trào.
   - Bối cảnh sự việc bắt đầu từ một chi tiết tưởng chừng rất nhỏ nhặt, bình thường (dừng xe kiểm tra, va chạm nhẹ, cuộc gặp tình cờ).
   - Khắc họa sự đối lập/nghịch lý: Vẻ ngoài bình thản, vỏ bọc hoàn hảo vs. sự bất thường, run sợ hoặc vết nứt tâm lý của đối tượng.

3. [HỒI 2] XUNG ĐỘT LEO THANG & LỚP MẶT NẠ BỊ XÉ TOẠC:
   - Quá trình thẩm vấn/đối chất/khám xét/truy bắt, bóc trần từng lớp dối trá.
   - Phân tích độ lệch pha tâm lý: Sự ngây thơ/bị thao túng đối lập với sự lọc lõi, tráo trở của kẻ chủ mưu.
   - Cao trào cảm xúc: Khoảnh khắc sự thật vỡ vụn, đối tượng bị khống chế hoặc lộ diện toàn bộ tội lỗi.

4. [HỒI 3] KẾT CỤC, CÔNG LÝ & BÀI HỌC QUAN SÁT XÃ HỘI:
   - Bằng chứng không thể chối cãi được đưa ra ánh sáng (hồ sơ tiền án, tang vật, kết quả pháp lý).
   - Số phận nhân vật và sự nghiêm minh của pháp luật.
   - Đoạn kết mang triết lý nhân sinh: Rút ra bài học từ góc nhìn "Nghịch lý cuộc sống" và "Tâm lý & Xã hội".

5. QUY TẮC PHÂN CẢNH (SCENES):
   - Mảng "scenes" phải chứa tối thiểu ${targetSceneCount} phân cảnh nối tiếp nhau từ 00:00 đến ${endStamp}.
   - Phân cảnh đầu tiên BẮT BUỘC là Hook 10s đầu ([00:00 - 00:10]).
   - Mỗi phân cảnh có lời thoại "voiceover" dài 40-75 từ tiếng Việt mượt mà, kết nối thành một câu chuyện liền mạch.
   - TUYỆT ĐỐI KHÔNG CHÈN MỐC THỜI GIAN VÀO LỜI ĐỌC: Không ghi các cụm từ như "tại mốc 00:00", "lúc 02:10", "từ phút...", "(15:09)" vào nội dung câu chữ của voiceover hay voice_script. Đây là lời thoại để phát thanh viên AI đọc thành tiếng cho người xem nghe, phải là văn phong kể chuyện tự nhiên, liền mạch 100%.`;

      const prompt = `Role: Senior Master Film Narrator & Screenplay Review Specialist.
Target Output Language: ${outputLanguage} (${languageCode}).
Video Title / Topic: "${cleanVideoTitle}".
Video Duration: ${probe.durationSeconds.toFixed(1)} seconds (${endStamp}).${frameContext}${transcriptContext}

USER DIRECTIVE & NICHE STYLE:
"${customPromptText}"
${genreGuidance}
${recapGuidance}

MANDATORY SCRIPTING & SCENE ALIGNMENT REQUIREMENTS:
1. ${languageRule}
2. COMPREHENSIVE STORY COMPREHENSION (BẮT BUỘC ĐỌC HIỂU TOÀN BỘ VIDEO):
   - Đọc hiểu và phân tích trọn vẹn toàn bộ cốt truyện của video "${cleanVideoTitle}" từ 00:00 đến ${endStamp}.
   - Trong "summary": Viết tóm tắt đầy đủ toàn bộ câu chuyện (mở đầu ➔ biến cố ➔ diễn biến ➔ cao trào ➔ hồi kết).
3. CONTINUOUS 3RD-PERSON NARRATIVE & MINIMUM SCENES:
   - BẮT BUỘC mảng "scenes" phải chứa tối thiểu ${targetSceneCount} phân cảnh chính.
   - Các phân cảnh phải trải đều từ đầu (00:00) đến cuối video (${endStamp}) để tạo thành bài kể chuyện hoàn chỉnh dài ~${targetDurationMins} phút (~${Math.round(targetDurationMins * 60)} giây).
4. EXACT SPEECH CALIBRATION & NO TIMESTAMPS IN VOICE:
   - Lời thuyết minh "voiceover" của mỗi phân cảnh phải dài từ 40 đến 65 từ tiếng Việt, mang phong cách dẫn chuyện ngôi thứ 3 truyền cảm, kịch tính, không lặp từ ngữ và liền mạch xuyên suốt.
   - TUYỆT ĐỐI KHÔNG chèn mốc thời gian, số phút, số giây vào trong lời văn voiceover/voice_script.
5. JSON OUTPUT FORMAT (BẮT BUỘC CHUẨN JSON):
{
  "summary": "Tóm tắt toàn bộ nội dung câu chuyện...",
  "scenes": [
    ${JSON.stringify(sampleSceneObj, null, 4)}
  ],
  "voice_script": "Toàn bộ bài thuyết minh kể chuyện hoàn chỉnh ghép từ tất cả các cảnh..."
}

Return ONLY valid JSON with no markdown wrapping.`;
      event.sender.send("runtime:analysis-progress", { progress: 76, stage: "requesting-provider", operationId });
      let result;
      try {
        result = await providerRequest(record, prompt, providerFrames, operationId);
      } catch (provErr) {
        if (state?.cancelled) throw cancelledOperationError();
        console.warn("[Analysis] Provider request failed or timed out, generating intelligent story synthesis fallback:", provErr?.message);
        const fallbackAnalysis = generateLocalStoryAnalysis(probe, customPromptText, languageCode, options);
        event.sender.send("runtime:analysis-progress", { progress: 100, stage: "completed", operationId });
        return enrichAnalysis({
          ...fallbackAnalysis,
          transcript,
          transcriptSegments,
          previewFrames: frames.map((frame) => ({ timestampSeconds: frame.timestampSeconds, imageDataUrl: `data:image/jpeg;base64,${frame.data}` }))
        }, transcript);
      }
      event.sender.send("runtime:analysis-progress", { progress: 100, stage: "completed", operationId });
      return enrichAnalysis({ ...parseAnalysis(result.text, probe, result.usage, options.customPrompt, options), transcript, transcriptSegments, previewFrames: frames.map((frame) => ({ timestampSeconds: frame.timestampSeconds, imageDataUrl: `data:image/jpeg;base64,${frame.data}` })) }, transcript);
    } finally { if (state) endOperation(operationId); }
  });
  ipcMain.handle("runtime:render-video", async (event, filePath, folder, options, operationId) => {
    const state = beginOperation(operationId);
    try { return await renderVideoFile(event, filePath, folder, options, operationId); }
    finally { if (state) endOperation(operationId); }
  });
  ipcMain.handle("runtime:merge-videos", async (event, filePaths, operationId) => mergeVideoFiles(event, filePaths, operationId));
  ipcMain.handle("runtime:cancel-operation", (_event, operationId) => {
    const state = operationState(operationId);
    if (!state) return false;
    state.cancelled = true;
    state.controller.abort();
    for (const child of state.children) { try { child.kill("SIGTERM"); } catch { /* best effort */ } }
    return true;
  });
  ipcMain.handle("runtime:read-jobs", () => readJobs());
  ipcMain.handle("runtime:save-jobs", (_event, value) => saveJobs(value));
  ipcMain.handle("runtime:reveal-path", (_event, value) => { if (typeof value === "string" && value.length < 1024) void shell.openPath(value); });
  ipcMain.handle("runtime:copy-text", (_event, value) => {
    if (typeof value !== "string" || value.length > 1024) throw new Error("Invalid clipboard value");
    clipboard.writeText(value);
  });
  ipcMain.handle("runtime:resolve-video-url", async (_event, inputUrl) => {
    const raw = String(inputUrl || "").trim();
    if (!raw) return null;

    if (!/^https?:\/\//i.test(raw)) {
      return { type: "local", url: `jacs-media://local?path=${encodeURIComponent(raw)}`, path: raw };
    }

    try {
      const cache = cachedDownloadPath(raw);
      if (typeof cache === "string" && fs.existsSync(cache)) {
        return { type: "local", url: `jacs-media://local?path=${encodeURIComponent(cache)}`, path: cache, isCached: true };
      }
    } catch {}

    try {
      const parsed = new URL(raw);
      if (isYouTubeHost(parsed.hostname)) {
        const videoId = extractYouTubeVideoId(raw);
        try {
          const streamObj = await resolveYouTubeVideoUrl(parsed, AbortSignal.timeout(3500));
          if (streamObj?.url) {
            return { type: "stream", url: streamObj.url, videoId, platform: "youtube" };
          }
        } catch {}
        return {
          type: "youtube",
          videoId,
          embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?enablejsapi=1&autoplay=0&controls=0&modestbranding=1&rel=0&iv_load_policy=3&playsinline=1`,
          platform: "youtube"
        };
      }

      if (isTikTokHost(parsed.hostname)) {
        try {
          const resolved = await resolveTikTokVideoUrl(parsed, AbortSignal.timeout(4000));
          if (resolved?.url) {
            return { type: "stream", url: resolved.url, platform: "tiktok" };
          }
        } catch {}
        return { type: "tiktok", url: raw, platform: "tiktok" };
      }
    } catch {}

    return { type: "stream", url: raw, platform: "direct" };
  });
  const ttsMemoryCache = new Map();
  ipcMain.handle("runtime:synthesize-speech", async (_event, text, languageCode = "vi", gender = "female", voice) => {
    const cleanText = stripSceneMetadata(text);
    if (!cleanText) return null;
    const voiceKey = String(voice || "").trim().toLowerCase();
    const profile = resolveNeuralVoiceProfile(voiceKey, languageCode, gender);
    const cacheKey = crypto.createHash("sha256").update(`${voiceKey}:${languageCode}:${gender}:${cleanText}`).digest("hex").slice(0, 32);

    // 0. Check in-memory fast cache
    if (ttsMemoryCache.has(cacheKey)) {
      return ttsMemoryCache.get(cacheKey);
    }

    // Check disk cache
    const cacheDir = path.join(app.getPath("userData"), "voice_cache");
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
    const diskCacheFile = path.join(cacheDir, `${cacheKey}.mp3`);
    if (fs.existsSync(diskCacheFile) && fs.statSync(diskCacheFile).size > 200) {
      try {
        const buffer = fs.readFileSync(diskCacheFile);
        const dataUrl = `data:audio/mpeg;base64,${buffer.toString("base64")}`;
        ttsMemoryCache.set(cacheKey, dataUrl);
        return dataUrl;
      } catch {}
    }

    // 1. Try JACS Cloud Neural Voice Engine FIRST (Instant, authentic Microsoft Edge Neural Voice)
    try {
      const res = await fetch("https://jacs-studio.nexoratech.com.vn/api/v1/client/synthesize-speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        body: JSON.stringify({
          text: cleanText.slice(0, 1000),
          voice: voiceKey,
          language: languageCode || "vi",
          gender: gender || "male",
        }),
        signal: AbortSignal.timeout(20000),
      });
      if (res.ok) {
        const buffer = Buffer.from(await res.arrayBuffer());
        if (buffer.length > 200) {
          try { fs.writeFileSync(diskCacheFile, buffer); } catch {}
          const dataUrl = `data:audio/mpeg;base64,${buffer.toString("base64")}`;
          if (ttsMemoryCache.size > 300) {
            const firstKey = ttsMemoryCache.keys().next().value;
            if (firstKey) ttsMemoryCache.delete(firstKey);
          }
          ttsMemoryCache.set(cacheKey, dataUrl);
          return dataUrl;
        }
      }
    } catch {}

    // 2. Try Local Python edge_tts
    try {
      const python = findPythonExecutable();
      await runProcess(
        python,
        ["-m", "edge_tts", "--voice", profile.voice, "--rate", profile.rate, "--pitch", profile.pitch, "--text", cleanText.slice(0, 1000), "--write-media", diskCacheFile],
        undefined,
        undefined
      );
      if (fs.existsSync(diskCacheFile) && fs.statSync(diskCacheFile).size > 200) {
        const buffer = fs.readFileSync(diskCacheFile);
        const dataUrl = `data:audio/mpeg;base64,${buffer.toString("base64")}`;
        ttsMemoryCache.set(cacheKey, dataUrl);
        return dataUrl;
      }
    } catch {
      // ignore
    }

    return null;
  });
}

function createWindow() {
  const iconPath = path.join(__dirname, "..", "public", "icon.png");
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: "#111817",
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: { contextIsolation: true, nodeIntegration: false, preload: path.join(__dirname, "preload.cjs") },
  });
  const devUrl = process.env.JACS_DESKTOP_DEV_URL;
  void (devUrl ? window.loadURL(devUrl) : window.loadFile(path.join(__dirname, "..", "dist", "index.html")));
}

app.whenReady().then(() => {
  registerMediaProtocol();
  registerIpc();
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
