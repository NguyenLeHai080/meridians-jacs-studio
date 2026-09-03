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
const { extractPageVideoUrls, extractResolverVideoUrls, extractTikTokVideoUrls, isTikTokHost, isYouTubeHost, normalizeVideoUrl, resolveYouTubeVideoUrl } = require("./video-url.cjs");
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

// Chromium's Metal renderer has crashed on a few macOS/Electron combinations.
if (process.platform === "darwin") {
  app.disableHardwareAcceleration();
}

let cachedMachineInfo;
const activeOperations = new Map();

function waitMs(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function findExecutable(name) {
  const isWin = process.platform === "win32";
  const cmd = isWin && !name.toLowerCase().endsWith(".exe") ? `${name}.exe` : name;
  const pathEnv = process.env.PATH || "";
  const parts = pathEnv.split(path.delimiter);
  for (const part of parts) {
    const full = path.join(part, cmd);
    if (fs.existsSync(full)) return full;
  }
  return null;
}

function stripSceneMetadata(text) {
  if (!text) return "";
  return String(text || "")
    .replace(/\[\s*(?:Phân cảnh|Cảnh|Scene|Segment|Part)\s*\d+[^\]]*\]/gi, "")
    .replace(/(?:^|\n)\s*(?:Phân cảnh|Cảnh|Scene|Segment|Part)\s*\d+[:\-\.]\s*/gi, " ")
    .replace(/\[\d{1,2}:\d{2}(?::\d{2})?\s*-\s*\d{1,2}:\d{2}(?::\d{2})?\]/g, "")
    .replace(/\(\d{1,2}:\d{2}(?::\d{2})?\s*-\s*\d{1,2}:\d{2}(?::\d{2})?\)/g, "")
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
      if (process.platform === "win32" && /^\/[A-Za-z]:[\\/]/.test(filePath)) filePath = filePath.slice(1);
      filePath = path.resolve(filePath);
      if (!fs.existsSync(filePath)) return new Response("Media not found", { status: 404 });
      const stat = fs.statSync(filePath);
      if (!stat.isFile()) return new Response("Not a file", { status: 404 });

      return net.fetch(pathToFileURL(filePath).toString());
    } catch (err) {
      return new Response(`Error: ${err.message}`, { status: 500 });
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

function findExecutable(name) {
  const projectBin = path.join(__dirname, "..", "bin");
  const platformDirectory = process.platform === "darwin" ? "darwin" : process.platform === "win32" ? "win32" : process.platform;
  const architectureDirectory = `${platformDirectory}-${process.arch}`;
  const candidates = [
    process.env[`JACS_${name.toUpperCase()}_PATH`],
    path.join(projectBin, architectureDirectory, name),
    path.join(projectBin, architectureDirectory, `${name}.exe`),
    // Keep compatibility with 0.3.2 media bundles that used bin/darwin.
    path.join(projectBin, platformDirectory, name),
    path.join(projectBin, platformDirectory, `${name}.exe`),
    path.join(process.resourcesPath || "", "bin", architectureDirectory, name),
    path.join(process.resourcesPath || "", "bin", architectureDirectory, `${name}.exe`),
    path.join(process.resourcesPath || "", "bin", platformDirectory, name),
    path.join(process.resourcesPath || "", "bin", platformDirectory, `${name}.exe`),
    name,
    `${name}.exe`,
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      childProcess.execFileSync(candidate, ["-version"], { stdio: "ignore", windowsHide: true });
      return candidate;
    } catch { /* Try the next bundled/system candidate. */ }
  }
  return null;
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
  const ffmpeg = findExecutable("ffmpeg");
  if (!ffmpeg) throw new Error("Không tìm thấy FFmpeg để ghép video. Hãy cài bản Desktop đầy đủ.");
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

async function downloadVideo(event, url, operationId) {
  let parsed;
  try { parsed = new URL(normalizeVideoUrl(url)); } catch { throw new Error("URL video không hợp lệ"); }
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("URL video phải dùng HTTP hoặc HTTPS");
  const cache = cachedDownloadPath(parsed.href);
  if (typeof cache === "string") {
    event.sender.send("runtime:download-progress", { progress: 100, stage: "downloaded", outputPath: cache, operationId });
    return cache;
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

function generateLocalStoryAnalysis(probe, customPrompt, language = "vi") {
  const duration = Math.max(1, Number(probe.durationSeconds || 1));
  const targetCount = Math.max(4, Math.min(35, Math.ceil(duration / 14)));
  const partDuration = duration / targetCount;
  const scenes = [];
  for (let i = 0; i < targetCount; i++) {
    const pStart = i * partDuration;
    const pEnd = i === targetCount - 1 ? duration : (i + 1) * partDuration;
    const progressPct = Math.round((i / targetCount) * 100);
    let stageName = "Khởi đầu tình huống";
    let narrative = `Ở mốc thời gian ${formatTime(pStart)}, câu chuyện bắt đầu mở ra với những quan sát ban đầu về không gian và hành động của các nhân vật tại hiện trường.`;
    if (progressPct >= 15 && progressPct < 40) {
      stageName = "Diễn biến tiếp nối & Phát hiện tình tiết";
      narrative = `Bước sang thời điểm ${formatTime(pStart)}, tình huống dần trở nên rõ nét hơn khi các nhân vật bắt đầu có những phản ứng và tương tác trực tiếp với nhau.`;
    } else if (progressPct >= 40 && progressPct < 70) {
      stageName = "Tình huống cao trào & Đối thoại gay cấn";
      narrative = `Tại thời điểm ${formatTime(pStart)} đến ${formatTime(pEnd)}, sự căng thẳng được đẩy lên cao trào khi các bên phải đưa ra những quyết định xử lý nhanh chóng trong tình thế khó khăn.`;
    } else if (progressPct >= 70 && progressPct < 90) {
      stageName = "Bước ngoặt xử lý & Diễn biến quyết định";
      narrative = `Đến giai đoạn ${formatTime(pStart)}, tình thế đã có sự chuyển biến rõ rệt khi các hành động thực tế đã mang lại kết quả và làm sáng tỏ nguyên nhân của sự việc.`;
    } else if (progressPct >= 90) {
      stageName = "Tổng kết sự việc & Kết thúc";
      narrative = `Ở những giây cuối cùng từ ${formatTime(pStart)} đến ${formatTime(pEnd)}, toàn bộ diễn biến của sự việc đã được làm rõ, khép lại quá trình ghi nhận một cách trọn vẹn và đầy đủ.`;
    }
    scenes.push({
      id: `scene-${i + 1}`,
      start: formatTime(pStart),
      end: formatTime(pEnd),
      title: `${stageName} (Đoạn ${i + 1})`,
      detail: `Ghi nhận bối cảnh thực tế phân đoạn ${formatTime(pStart)} - ${formatTime(pEnd)}`,
      translation: narrative,
      voiceover: narrative,
    });
  }
  return {
    summary: customPrompt ? `Kịch bản phân tích theo yêu cầu: "${String(customPrompt).slice(0, 120)}..."` : "Kịch bản phân tích chi tiết và thuyết minh toàn diện theo bối cảnh video.",
    scenes,
    score: 95,
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
  if (record.providerType === "gemini") {
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
  const timeoutMs = Number(process.env.JACS_PROVIDER_TIMEOUT_MS ?? 45000);
  const timeout = timeoutMs > 0 ? AbortSignal.timeout(timeoutMs) : null;
  const signal = state ? (timeout ? AbortSignal.any([state.controller.signal, timeout]) : state.controller.signal) : timeout || undefined;
  return fetch(url, { method: "POST", headers, body: JSON.stringify(body), signal }).then(async (response) => {
    assertOperationActive(operationId);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = String(payload?.error?.message || payload?.error?.detail || payload?.message || "").replace(/\s+/g, " ").trim().slice(0, 240);
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

    // Auto fallback for Gemini 503 (High demand / Overloaded), 429 (Rate Limit), 404, 500, 502, 504
    if ([400, 404, 429, 500, 502, 503, 504, 524].includes(Number(error?.status)) && record.providerType === "gemini" && attempt < 4) {
      const fallbackModels = [
        "gemini-1.5-flash",
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-1.5-pro",
        "gemini-2.5-pro",
        "gemini-flash-lite-latest",
      ];
      const currentModel = String(record.model || "").trim().replace(/^models\//i, "");
      const candidates = fallbackModels.filter((m) => m !== currentModel);
      const nextModel = candidates[attempt % candidates.length] || "gemini-1.5-flash";
      const nextImages = attempt >= 2 ? [] : images;

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
    if (([429, 500, 502, 503, 504, 524].includes(Number(error?.status)) || error?.name === "TimeoutError" || error?.code === "UND_ERR_CONNECT_TIMEOUT") && attempt < 3) {
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
  const frameCount = dur > 300 ? 8 : (dur > 60 ? 6 : 4);
  const interval = dur / frameCount;
  try {
    await runProcess(ffmpeg, ["-hide_banner", "-loglevel", "error", "-i", path.resolve(filePath), "-vf", `fps=1/${interval},scale=384:-2`, "-q:v", "6", "-frames:v", String(frameCount), path.join(directory, "frame-%02d.jpg")], undefined, operationId);
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
  const parts = String(value || "").split(":").map(Number);
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

function normalizeScenes(value, duration, fallbackScenes) {
  const total = Math.max(0.25, Number(duration) || 0.25);
  let parsedScenes = Array.isArray(value) ? value.map((scene, index) => {
    const start = Math.max(0, Math.min(total, parseTimeSeconds(scene?.start, 0)));
    const rawVoice = String(scene?.voiceover || scene?.voice_over || scene?.voiceOver || scene?.narration || scene?.voice_script || "").trim().slice(0, 2500);
    const rawDetail = String(scene?.detail || "").trim().slice(0, 1000);
    const rawTrans = String(scene?.translation || "").trim().slice(0, 2500);
    return {
      id: String(scene?.id || `scene-${index + 1}`).trim().slice(0, 80) || `scene-${index + 1}`,
      start,
      rawEnd: scene?.end === undefined ? undefined : parseTimeSeconds(scene.end, Number.NaN),
      title: String(scene?.title || `Phân cảnh ${index + 1}`).trim().slice(0, 160) || `Phân cảnh ${index + 1}`,
      detail: isRefusalText(rawDetail) ? `Bối cảnh phân cảnh ${index + 1}` : rawDetail,
      translation: isRefusalText(rawTrans) ? undefined : (rawTrans || undefined),
      voiceover: isRefusalText(rawVoice) ? undefined : (rawVoice || undefined),
      keywords: Array.isArray(scene?.keywords) ? scene.keywords.map((item) => String(item).trim()).filter(Boolean).slice(0, 20) : undefined,
      confidence: Number.isFinite(Number(scene?.confidence)) ? Math.max(0, Math.min(1, Number(scene.confidence))) : undefined,
    };
  }).filter((scene) => scene.start < total).sort((left, right) => left.start - right.start) : [];

  if (!parsedScenes.length) {
    parsedScenes = fallbackScenes || [];
  }

  // Chain and normalize starts and ends
  const chained = parsedScenes.map((scene, index) => {
    const nextStart = parsedScenes[index + 1]?.start ?? total;
    const explicitEnd = Number.isFinite(scene.rawEnd) && scene.rawEnd > scene.start ? scene.rawEnd : nextStart;
    const end = Math.max(scene.start + 0.25, Math.min(total, explicitEnd));
    const { rawEnd, ...rest } = scene;
    return { ...rest, end };
  }).filter((scene) => scene.end > scene.start);

  const continuous = [];
  for (const scene of chained) {
    const prev = continuous[continuous.length - 1];
    if (!prev) {
      scene.start = 0;
    } else {
      scene.start = prev.end;
      if (scene.end <= scene.start) continue;
    }
    continuous.push(scene);
  }
  if (!continuous.length) {
    continuous.push({ id: "scene-1", start: 0, end: total, title: "Phân cảnh 1", detail: "Bối cảnh phân cảnh 1" });
  }

  continuous[continuous.length - 1].end = total;

  const granular = [];
  let sceneCounter = 1;
  for (const sc of continuous) {
    const sceneDuration = sc.end - sc.start;
    if (sceneDuration > 24) {
      const parts = Math.ceil(sceneDuration / 15);
      const partDuration = sceneDuration / parts;
      const cleanVoice = (sc.voiceover && !isRefusalText(sc.voiceover) && sc.voiceover.length > 20) ? sc.voiceover : "";
      const sentences = cleanVoice.split(/(?<=[.?!…])\s+/).filter((s) => s.trim().length > 10);
      for (let p = 0; p < parts; p++) {
        const pStart = Number((sc.start + p * partDuration).toFixed(2));
        const pEnd = p === parts - 1 ? sc.end : Number((sc.start + (p + 1) * partDuration).toFixed(2));
        const progPct = Math.round((pStart / total) * 100);
        let fallbackText = `Ở mốc ${formatTime(pStart)}, diễn biến tiếp tục mở ra với các hành động cụ thể tại hiện trường.`;
        if (progPct >= 20 && progPct < 50) {
          fallbackText = `Đến thời điểm ${formatTime(pStart)}, tình thế trở nên căng thẳng hơn khi nhân vật đưa ra các quyết định xử lý trực tiếp.`;
        } else if (progPct >= 50 && progPct < 80) {
          fallbackText = `Tại giai đoạn cao trào ${formatTime(pStart)} đến ${formatTime(pEnd)}, các tình huống kịch tính bùng nổ đòi hỏi sự can thiệp nhanh chóng.`;
        } else if (progPct >= 80) {
          fallbackText = `Bước vào những phút cuối từ ${formatTime(pStart)} đến ${formatTime(pEnd)}, sự việc dần đi đến hồi kết và được giải quyết trọn vẹn.`;
        }
        const pVoice = (sentences.length >= parts ? sentences[p] : sentences[p % sentences.length]) || fallbackText;
        granular.push({
          id: `scene-${sceneCounter++}`,
          start: pStart,
          end: pEnd,
          title: `Phân cảnh ${sceneCounter - 1}`,
          detail: `Bối cảnh chi tiết phân cảnh ${formatTime(pStart)} - ${formatTime(pEnd)}`,
          translation: pVoice,
          voiceover: pVoice,
          keywords: sc.keywords,
          confidence: sc.confidence,
        });
      }
    } else {
      const cleanVoice = (sc.voiceover && !isRefusalText(sc.voiceover) && sc.voiceover.length > 20) ? sc.voiceover : `Tại mốc ${formatTime(sc.start)} - ${formatTime(sc.end)}, diễn biến câu chuyện tiếp tục mở ra những chi tiết quan trọng.`;
      granular.push({
        ...sc,
        id: `scene-${sceneCounter++}`,
        title: sc.title || `Phân cảnh ${sceneCounter - 1}`,
        detail: sc.detail || `Bối cảnh phân cảnh ${formatTime(sc.start)} - ${formatTime(sc.end)}`,
        translation: cleanVoice,
        voiceover: cleanVoice,
      });
    }
  }

  return granular.map((scene) => ({
    id: scene.id,
    start: formatTime(scene.start),
    end: formatTime(scene.end),
    title: scene.title,
    detail: scene.detail,
    translation: scene.translation,
    voiceover: scene.voiceover,
    keywords: scene.keywords,
    confidence: scene.confidence,
  }));
}

function cleanField(str) {
  if (!str) return "";
  let val = String(str).trim();
  // Strip markdown code fences, leaked json brackets or keys
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

function parseAnalysis(text, probe, usage, customPrompt) {
  const fallback = generateLocalStoryAnalysis(probe, customPrompt);
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
      title: cleanField(s.title) || `Phân cảnh ${idx + 1}`,
      detail: cleanField(s.detail) || `Bối cảnh phân cảnh ${idx + 1}`,
      translation: stripSceneMetadata(cleanField(s.translation || s.voiceover)),
      voiceover: stripSceneMetadata(cleanField(s.voiceover || s.translation || s.detail)),
    }));

    const rawSummary = cleanField(unwrapped?.summary || fallback.summary);
    const summary = isRefusalText(rawSummary) ? fallback.summary : rawSummary;

    return {
      summary,
      scenes: normalizeScenes(cleanScenes, probe.durationSeconds, fallback.scenes),
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
    "vi-adam-review": { voice: "vi-VN-NamMinhNeural", rate: "+12%", pitch: "-2Hz" },
    "vi-namminh": { voice: "vi-VN-NamMinhNeural", rate: "+10%", pitch: "-2Hz" },
    "vi-mystery-deep": { voice: "vi-VN-NamMinhNeural", rate: "+0%", pitch: "-6Hz" },
    "vi-hoaimy-review": { voice: "vi-VN-HoaiMyNeural", rate: "+14%", pitch: "+1Hz" },
    "vi-hoaimy": { voice: "vi-VN-HoaiMyNeural", rate: "+4%", pitch: "+0Hz" },
    "vi-baolong": { voice: "vi-VN-NamMinhNeural", rate: "+6%", pitch: "+2Hz" },
    "vi-thihuong": { voice: "vi-VN-HoaiMyNeural", rate: "-2%", pitch: "-2Hz" },
    "vi-male": { voice: "vi-VN-NamMinhNeural", rate: "+10%", pitch: "-2Hz" },
    "vi-female": { voice: "vi-VN-HoaiMyNeural", rate: "+5%", pitch: "+0Hz" },
    "en-adam": { voice: "en-US-GuyNeural", rate: "+0%", pitch: "-4Hz" },
    "en-guy": { voice: "en-US-GuyNeural", rate: "+0%", pitch: "-4Hz" },
    "en-brian": { voice: "en-US-BrianNeural", rate: "+0%", pitch: "+0Hz" },
    "en-jenny": { voice: "en-US-JennyNeural", rate: "+0%", pitch: "+0Hz" },
    "en-aria": { voice: "en-US-AriaNeural", rate: "+5%", pitch: "+1Hz" },
    "en-male": { voice: "en-US-GuyNeural", rate: "+0%", pitch: "-4Hz" },
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

  // Step 1: High-Quality Microsoft Edge Neural TTS via JACS Cloud Engine
  try {
    const res = await fetch("https://jacs-studio.nexoratech.com.vn/api/v1/client/synthesize-speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      body: JSON.stringify({
        text: cleanText,
        voice: selectedVoice,
        language: languageCode || "vi",
        gender: gender || "male",
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (res.ok) {
      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length > 200) {
        fs.writeFileSync(outputPath, buffer);
        return outputPath;
      }
    }
  } catch (err) {
    // try local fallback
  }

  // Step 2: High-Quality Microsoft Edge Neural TTS via Local Python
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
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "jacs-local-narration-"));
  const textPath = path.join(directory, "script.txt");
  const outputPath = path.join(directory, "narration.mp3");
  const cleanText = stripSceneMetadata(text).slice(0, 4000);
  if (!cleanText) {
    fs.rmSync(directory, { recursive: true, force: true });
    return null;
  }
  fs.writeFileSync(textPath, cleanText, { encoding: "utf8", mode: 0o600 });

  const selectedVoice = resolveNeuralVoice(voice, languageCode, gender);
  const python = findExecutable("python") || process.env.JACS_PYTHON || (process.platform === "win32" ? "python.exe" : "python3");

  // Step 1: Edge Neural TTS via Python (High-quality natural voice for all languages)
  try {
    await runProcess(python, ["-m", "edge_tts", "--voice", selectedVoice, "--text", cleanText, "--write-media", outputPath], undefined, operationId);
    if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 200) {
      return outputPath;
    }
  } catch (err) {
    // try next fallback
  }

  // Step 2: Web TTS Audio Stream download (Google Translate TTS with correct language)
  try {
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(cleanText.slice(0, 300))}&tl=${lang}&client=tw-ob`;
    const res = await fetch(ttsUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36",
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

  // Step 3: Platform native speech engine (macOS say or Windows System.Speech)
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
  fs.rmSync(directory, { recursive: true, force: true });
  throw new Error("Không thể tạo file âm thanh giọng đọc AI. Hãy kiểm tra kết nối mạng hoặc bật provider OpenAI/TTS trong Cài đặt tool.");
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

function escapeFilterPath(value) { return String(value).replace(/\\/g, "/").replace(/:/g, "\\:").replace(/'/g, "\\'"); }
function subtitleForceStyle(style, aspectRatio) {
  const alignment = style === "top" ? 8 : style === "center" ? 5 : 2;
  // Keep captions readable without covering the speaker/content on vertical
  // exports. FFmpeg/libass sizes fonts in script pixels, not CSS pixels.
  const fontSize = aspectRatio === "9:16" ? 32 : aspectRatio === "1:1" ? 30 : 28;
  return `FontName=Arial,FontSize=${fontSize},PrimaryColour=&H00FFFFFF,OutlineColour=&H00101820,BackColour=&H78000000,Outline=2,Shadow=1,BorderStyle=1,Alignment=${alignment},MarginV=${aspectRatio === "9:16" ? 58 : 42},WrapStyle=2`;
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
  const renderedDuration = clipDuration || Number(probe.durationSeconds || 0);
  const ffmpeg = findExecutable("ffmpeg");
  const warnings = [];
  let narrationPath = null;
  let subtitlePath = null;
  let subtitlesPath = null;
  let subtitleCueCount = 0;
  let voiceEngine = "none";
  let narrationTempo = 1;
  let narrationDuration = 0;
  if (options.narratorEnabled && options.narrationText) {
    // Prefer the explicitly selected TTS profile. If the local voice pack is
    // unavailable, automatically use the first enabled OpenAI-compatible
    // profile with a key and TTS capability instead of silently dropping voice.
    const store = providerStore();
    // Analysis and narration may intentionally use different BYOK profiles.
    // Prefer the dedicated TTS profile for speech, then fall back to the
    // analysis profile when it also exposes TTS.
    let record = options.ttsProviderId ? store.find(options.ttsProviderId) : undefined;
    if (!record && options.providerId) record = store.find(options.providerId);
    if (!record?.apiKey || !record.capabilities?.includes("tts")) {
      const fallback = store.list().find((item) => item.enabled && item.hasApiKey && item.capabilities.includes("tts"));
      record = fallback ? store.find(fallback.id) : undefined;
    }
    let providerError;
    const canUseProviderTts = Boolean(record?.enabled && record.apiKey && record.capabilities?.includes("tts"));
    // When a TTS profile is selected, use it first. The previous local-first
    // order made a macOS/Windows system voice silently replace the requested
    // OpenAI voice, which produced the wrong pronunciation for translations.
    if (canUseProviderTts) {
      try {
        narrationPath = await synthesizeNarration(record, options.narrationText, options.narratorVoice, options.narratorGender, options.language, operationId);
        if (narrationPath) voiceEngine = "provider";
      } catch (error) {
        providerError = error;
      }
    }
    if (!narrationPath) {
      try {
        narrationPath = await synthesizeLocalNarration(options.narrationText, options.narratorVoice, options.narratorGender, options.language, operationId);
        if (narrationPath) voiceEngine = "local";
      } catch (localError) {
        if (providerError) throw new Error(`${providerError instanceof Error ? providerError.message : providerError}. Local voice fallback cũng thất bại: ${localError?.message || localError}`);
        throw new Error(`Không tạo được voice pack local: ${localError?.message || localError}`);
      }
      if (providerError) warnings.push(`Provider TTS không khả dụng, đã dùng voice local: ${providerError instanceof Error ? providerError.message : providerError}`);
    }
    narrationDuration = await probeMediaDuration(narrationPath);
    if (narrationDuration > renderedDuration * 1.03 && renderedDuration > 0) {
      narrationTempo = narrationDuration / renderedDuration;
      if (narrationTempo > 4) throw new Error("Lời đọc dài hơn thời lượng cảnh quá nhiều. Hãy rút ngắn bản thảo của scene trước khi render.");
    }
  }
  if (options.subtitlesEnabled !== false && (Array.isArray(options.subtitleSegments) && options.subtitleSegments.length || String(options.subtitleText || options.narrationText || "").trim())) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "jacs-subtitles-"));
    subtitlePath = path.join(directory, "captions.srt");
    // When voice-over is present, keep captions inside the actual speech
    // window. This prevents a short narration from leaving subtitles on screen
    // long after the voice has finished.
    const subtitleEnd = Math.max(1, narrationPath && narrationDuration > 0
      ? Math.min(renderedDuration || narrationDuration, narrationDuration)
      : renderedDuration || Number(probe.durationSeconds || 1));
    const segments = Array.isArray(options.subtitleSegments)
      ? options.subtitleSegments.map((segment) => ({ start: Math.max(0, Number(segment.start) - clipStart), end: Math.min(subtitleEnd, Number(segment.end) - clipStart), text: String(segment.text || "").trim() })).filter((segment) => segment.text && segment.end > segment.start)
      : [];
    const fallbackText = String(options.subtitleText || options.narrationText).trim().slice(0, 12000);
    subtitleCueCount = buildCaptionCues(segments, subtitleEnd, fallbackText).length;
    if (!subtitleCueCount) {
      fs.rmSync(path.dirname(subtitlePath), { recursive: true, force: true });
      subtitlePath = null;
      if (options.subtitlesEnabled !== false) warnings.push("Không có nội dung phụ đề theo scene; video vẫn được render.");
    } else {
      fs.writeFileSync(subtitlePath, buildSrt(segments, subtitleEnd, fallbackText), { encoding: "utf8", mode: 0o600 });
    }
  }
  const requestedBase = String(options.outputFileName || "").replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  const outputBase = requestedBase || base;
  const clipSuffix = clipDuration && !requestedBase ? `-${Math.round(clipStart)}s-${Math.round(clipEnd)}s` : "";
  const destination = path.join(directory, `${outputBase}${clipSuffix}-jacs-${Date.now()}${ffmpeg ? ".mp4" : path.extname(filePath)}`);
  event.sender.send("runtime:render-progress", { progress: 2, stage: "rendering", operationId });
  if (!ffmpeg) {
    if (narrationPath || options.logoPath || options.subtitlesEnabled !== false && (String(options.subtitleText || options.narrationText || "").trim() || Array.isArray(options.subtitleSegments) && options.subtitleSegments.length)) {
      if (narrationPath) fs.rmSync(path.dirname(narrationPath), { recursive: true, force: true });
      if (subtitlePath) fs.rmSync(path.dirname(subtitlePath), { recursive: true, force: true });
      throw new Error("Không thể render phụ đề/logo/voice vì máy chưa có FFmpeg. Hãy cài lại bản Desktop đầy đủ hoặc cài FFmpeg rồi chạy lại.");
    }
    // Keep the workflow usable on a clean machine; installer can ship FFmpeg for encoded output.
    fs.copyFileSync(filePath, destination);
    const manifest = writeRenderManifest(destination, { passthrough: true, durationSeconds: renderedDuration, voiceEngine });
    event.sender.send("runtime:render-progress", { progress: 100, stage: "completed", outputPath: destination, operationId });
    if (narrationPath) fs.rmSync(path.dirname(narrationPath), { recursive: true, force: true });
    if (subtitlePath) fs.rmSync(path.dirname(subtitlePath), { recursive: true, force: true });
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
    const args = ["-y"];
    if (clipStart) args.push("-ss", String(clipStart));
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
    const subtitleFilter = shouldSubtitle && subtitlePath ? `subtitles='${escapeFilterPath(subtitlePath)}':charenc=UTF-8:force_style='${subtitleForceStyle(options.subtitleStyle, options.aspectRatio)}'` : "";
    const videoChain = [baseVideoFilter, subtitleFilter].filter(Boolean).join(",");
    const logoInputIndex = validLogo ? 1 + (validNarration ? 1 : 0) + (validMusic ? 1 : 0) : -1;
    const audioFilter = buildAudioFilter({ hasOriginalAudio: probe.hasAudio === true, narrationInputIndex: validNarration ? 1 : undefined, musicInputIndex: validMusic ? (validNarration ? 2 : 1) : undefined, keepOriginalAudio: options.keepOriginalAudio !== false, musicVolume: options.backgroundMusicVolume ?? 20, narrationTempo, duckOriginalAudio: validNarration });
    const needsVideoGraph = Boolean(validLogo || videoChain);
    const graph = [];
    if (validLogo) {
      const opacity = Math.max(0.1, Math.min(1, Number(options.logoOpacity ?? 0.82)));
      const position = logoOverlayPosition(options.logoPosition);
      graph.push(`[0:v]${videoChain || "null"}[base]`, `[${logoInputIndex}:v]format=rgba,colorchannelmixer=aa=${opacity}[logo]`, `[base][logo]overlay=${position}[vout]`);
    } else if (videoChain) graph.push(`[0:v]${videoChain}[vout]`);
    args.push("-c:v", codec);
    // Hardware encoders do not share libx264's `fast` preset name. Passing
    // the wrong option makes an otherwise capable GPU job fall back to CPU.
    if (codec === "libx264") args.push("-preset", "fast");
    if (codec === "h264_nvenc") args.push("-preset", "p4");
    if (codec === "h264_videotoolbox") args.push("-b:v", "8M");
    args.push("-pix_fmt", "yuv420p");
    if (audioFilter) graph.push(audioFilter);
    if (graph.length) {
      args.push("-filter_complex", graph.join(";"), "-map", needsVideoGraph ? "[vout]" : "0:v:0");
      if (audioFilter) args.push("-map", "[aout]", "-c:a", "aac");
      else if (options.keepOriginalAudio === false || narrationPath || musicPath) args.push("-an");
      else args.push("-map", "0:a:0?", "-c:a", "aac");
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
      // Keep a UTF-8 sidecar beside the video. It lets the customer inspect
      // or reuse captions while the same SRT has already been burned in.
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
      if (narrationPath) fs.rmSync(path.dirname(narrationPath), { recursive: true, force: true });
      if (subtitlePath) fs.rmSync(path.dirname(subtitlePath), { recursive: true, force: true });
      return { outputPath: destination, durationSeconds: renderedDuration, passthrough: false, warnings, narrationGenerated: Boolean(narrationPath), narrationDurationSeconds: narrationDuration || undefined, subtitlesBurned: Boolean(subtitlePath), subtitleCueCount, subtitlesPath: subtitlesPath || undefined, voiceEngine, outputChecksum: manifest.checksum, manifestPath: manifest.manifestPath };
    } catch (error) {
      lastError = error;
      if (error?.code === "JACS_OPERATION_CANCELLED" || operationState(operationId)?.cancelled) {
        if (narrationPath) fs.rmSync(path.dirname(narrationPath), { recursive: true, force: true });
        if (subtitlePath) fs.rmSync(path.dirname(subtitlePath), { recursive: true, force: true });
        throw cancelledOperationError();
      }
      event.sender.send("runtime:render-progress", { progress: 3, stage: "rendering", operationId });
    }
  }
  if (narrationPath) fs.rmSync(path.dirname(narrationPath), { recursive: true, force: true });
  if (subtitlePath) fs.rmSync(path.dirname(subtitlePath), { recursive: true, force: true });
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

  if (record.providerType === "gemini") {
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
      // Keep the timestamps beside the frame payload so a multimodal model
      // cannot confuse a visual detail from one scene with another scene.
      const providerFrames = frames;
      event.sender.send("runtime:analysis-progress", { progress: 68, stage: transcript ? "transcribed" : "frames-ready", operationId });
      const transcriptContext = transcript ? `\n- Lời thoại gốc bóc băng: ${transcript}` : "";
      const frameContext = providerFrames.length ? `\n- Có ${providerFrames.length} khung hình mẫu đại diện theo thứ tự thời gian: ${frameTimeline(providerFrames)}.` : "";
      const languageCode = Array.isArray(options.languages) && options.languages.length ? options.languages[0] : "vi";
      const outputLanguage = languageName(languageCode);
      const isVietnamese = languageCode === "vi";
      const targetSceneCount = Math.max(4, Math.min(25, Math.ceil(probe.durationSeconds / 15)));
      const customPromptText = options.customPrompt && String(options.customPrompt).trim()
        ? String(options.customPrompt).trim()
        : (isVietnamese
            ? "Đóng vai người dẫn chuyện (Narrator) ngôi thứ 3, kể lại toàn bộ câu chuyện và diễn biến theo phong cách Review Phim lôi cuốn, kịch tính, hấp dẫn và tự nhiên."
            : "Act as a professional 3rd-person narrator and film analyst, narrating the entire story and scene-by-scene progression in an engaging, cinematic, suspenseful, and natural style.");
      const endStamp = `${Math.floor(probe.durationSeconds / 60).toString().padStart(2, "0")}:${Math.floor(probe.durationSeconds % 60).toString().padStart(2, "0")}`;

      const languageRule = isVietnamese
        ? "TẤT CẢ NỘI DUNG (summary, title, detail, translation, voiceover, voice_script) BẮT BUỘC VIẾT 100% BẰNG TIẾNG VIỆT."
        : `CRITICAL LANGUAGE DIRECTIVE: The user requested target language: "${outputLanguage}" (Language Code: ${languageCode}). ALL fields ("summary", "title", "detail", "translation", "voiceover", and "voice_script") MUST BE WRITTEN 100% AND EXCLUSIVELY IN ${outputLanguage}. Under no circumstances should Vietnamese or any other language be returned.`;

      const sampleSceneObj = isVietnamese
        ? {
            id: "scene-1",
            start: "00:00",
            end: "00:15",
            title: "Cuộc dừng xe bất ngờ trong đêm",
            detail: "Ánh đèn xe tuần tra rọi sáng chiếc xe dừng lại bên lề đường vắng",
            translation: "Chiếc xe tuần tra phát hiện phương tiện có biểu hiện nghi vấn di chuyển trong đêm.",
            voiceover: "Màn đêm tĩnh lặng bỗng bị xé toạc khi ánh đèn ưu tiên của xe tuần tra bật sáng rực rỡ. Sĩ quan cảnh sát lập tức yêu cầu tài xế chiếc xe phía trước tấp vào lề đường để kiểm tra hành chính. Bầu không khí bắt đầu trở nên căng thẳng khi đối tượng bên trong xe có những biểu hiện lúng túng và chần chừ không chịu hợp tác ngay từ những giây đầu tiên."
          }
        : {
            id: "scene-1",
            start: "00:00",
            end: "00:15",
            title: "Unexpected Midnight Interception",
            detail: "Patrol cruiser flashing lights illuminate a suspicious vehicle pulled over on a deserted road",
            translation: "Police cruiser intercepts a suspicious vehicle moving erratically in the dark.",
            voiceover: "The stillness of the night was shattered as emergency lights lit up the deserted highway. The officer commanded the vehicle ahead to pull over immediately for an urgent inspection. Tension mounted rapidly as the driver hesitated, showing clear signs of unease and uncooperative behavior from the very start."
          };

      const isCopsBodycam = /cops|bodycam|police|cảnh sát|tuần tra|rượt đuổi|tội phạm/i.test(customPromptText);
      const isRealityShow = /reality|show thực tế|truyền hình thực tế|drama|hẹn hò|sinh tồn|talkshow/i.test(customPromptText);

      let genreGuidance = "";
      if (isCopsBodycam) {
        genreGuidance = `
SPECIALIZED COPS BODYCAM / POLICE PURSUIT RULES:
- TONE: Dồn dập, nghẹt thở, gay cấn từng giây, tường thuật nghiệp vụ cảnh sát sắc bén như các kênh Cops Bodycam triệu view (Code Blue Cam, Police Activity).
- TERMINOLOGY: Sử dụng chuẩn xác thuật ngữ nghiệp vụ cảnh sát Việt ngữ (sĩ quan tuần tra, camera gắn ngực bodycam, phương tiện khả nghi, đèn ưu tiên & còi hụ, hiệu lệnh dừng xe, không chấp hành mệnh lệnh, tăng ga phóng bạt mạng, cú húc cản PIT, rút súng điện Taser cảnh cáo, rút súng nghiệp vụ, buông vũ khí, nằm sấp xuống đường, áp sát khóa tay tra còng số 8, kiểm tra cốp xe...).
- FRAME-BY-FRAME ACTION MATCHING: Lời thoại của từng phân cảnh PHẢI KHỚP TUYỆT ĐỐI với từng hành động trên màn hình lúc đó (khi cảnh sát bước xuống xe, gõ cửa kính, khi nghi phạm bất ngờ nổ máy bỏ chạy, khi xe lật hoặc cảnh sát áp sát quật ngã khống chế...). Tuyệt đối không nói lan man ngoài diễn biến hình ảnh.`;
      } else if (isRealityShow) {
        genreGuidance = `
SPECIALIZED REALITY TV & SOCIAL DRAMA RULES:
- TONE: Sôi nổi, cuốn hút, dí dỏm, bình luận sắc sảo, đẩy cao trào cảm xúc và kịch tính giữa các nhân vật.
- FOCUS: Nêu bật biểu cảm khuôn mặt (sững sờ, ngơ ngác, lúng túng), các cuộc đối thoại tranh luận nảy lửa, phản ứng bất ngờ của ban giám khảo/người chơi, và cú twist bất ngờ.
- FRAME MATCHING: Khung hình đang chiếu vào ai hoặc tình huống gì thì lời dẫn phải bình luận chính xác vào người và hành động đó.`;
      }

      const prompt = `Role: Senior Video Screenplay Editor, Content Creator & 3rd-Person Narrative Expert.
Target Output Language: ${outputLanguage} (${languageCode}).
Video Duration: ${probe.durationSeconds.toFixed(1)} seconds (${endStamp}).${frameContext}${transcriptContext}

USER DIRECTIVE & NICHE STYLE:
"${customPromptText}"
${genreGuidance}

MANDATORY SCRIPTING & SCENE ALIGNMENT REQUIREMENTS:
1. ${languageRule}
2. ABSOLUTE VISUAL-TEMPORAL ALIGNMENT: Examine the timestamps and actions in the video frames. The "voiceover" narration for each scene MUST describe the EXACT visual action and events occurring at that specific timestamp range.
3. Divide the timeline from 00:00 to ${endStamp} into continuous chronological scenes (~${targetSceneCount} scenes, each 10-18 seconds long).
4. For EACH scene in the "scenes" array:
   - "title": Compelling, punchy scene title written in ${outputLanguage}
   - "detail": Precise visual observation of what characters/objects are doing in this timestamp
   - "translation": Subtitle line written in ${outputLanguage}
   - "voiceover": Full, expressive, engaging 3rd-person narration (60-90 words) written in ${outputLanguage} perfectly matched with the visual actions and chosen style tone.
5. "summary": Concise executive story summary written in ${outputLanguage}.
6. "voice_script": Complete, seamless continuous narration script written in ${outputLanguage}.

EXAMPLE JSON STRUCTURE (All text must be in ${outputLanguage}):
${JSON.stringify({
  summary: isVietnamese ? (isCopsBodycam ? "Tóm tắt vụ việc rượt đuổi cảnh sát kịch tính..." : "Tóm tắt diễn biến ngắn gọn...") : "Executive narrative summary in " + outputLanguage + "...",
  score: 95,
  scenes: [sampleSceneObj],
  voice_script: isVietnamese ? (isCopsBodycam ? "Toàn bộ kịch bản tường thuật Cops Bodycam liền mạch..." : "Toàn bộ lời đọc nối liền mạch...") : "Complete combined narration script in " + outputLanguage + "..."
}, null, 2)}

Return ONLY valid JSON with no markdown wrapping.`;
      event.sender.send("runtime:analysis-progress", { progress: 76, stage: "requesting-provider", operationId });
      const result = await providerRequest(record, prompt, providerFrames, operationId);
      event.sender.send("runtime:analysis-progress", { progress: 100, stage: "completed", operationId });
      return enrichAnalysis({ ...parseAnalysis(result.text, probe, result.usage, options.customPrompt), transcript, transcriptSegments, previewFrames: frames.map((frame) => ({ timestampSeconds: frame.timestampSeconds, imageDataUrl: `data:image/jpeg;base64,${frame.data}` })) }, transcript);
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
  ipcMain.handle("runtime:synthesize-speech", async (_event, text, languageCode = "vi", gender = "female", voice) => {
    const cleanText = stripSceneMetadata(text);
    if (!cleanText) return null;
    const voiceKey = String(voice || "").trim().toLowerCase();
    const profile = resolveNeuralVoiceProfile(voiceKey, languageCode, gender);

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
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) {
        const buffer = Buffer.from(await res.arrayBuffer());
        if (buffer.length > 200) {
          return `data:audio/mpeg;base64,${buffer.toString("base64")}`;
        }
      }
    } catch {}

    // 2. Try Local Python edge_tts
    try {
      const cacheDir = path.join(app.getPath("userData"), "voice_cache");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
      const cacheFile = path.join(cacheDir, `voice_${Date.now()}.mp3`);
      const python = findPythonExecutable();
      await runProcess(
        python,
        ["-m", "edge_tts", "--voice", profile.voice, "--rate", profile.rate, "--pitch", profile.pitch, "--text", cleanText.slice(0, 1000), "--write-media", cacheFile],
        undefined,
        undefined
      );
      if (fs.existsSync(cacheFile) && fs.statSync(cacheFile).size > 200) {
        const buffer = fs.readFileSync(cacheFile);
        return `data:audio/mpeg;base64,${buffer.toString("base64")}`;
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
