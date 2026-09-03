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
const { extractPageVideoUrls, extractResolverVideoUrls, extractTikTokVideoUrls, isTikTokHost, normalizeVideoUrl } = require("./video-url.cjs");
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
// VideoToolbox encoding remains available because this only disables the UI GPU.
app.disableHardwareAcceleration();

let cachedMachineInfo;
const activeOperations = new Map();

function waitMs(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
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
    let filePath;
    try {
      const parsed = new URL(request.url);
      // Prefer the query form so absolute macOS paths and Windows drive paths
      // survive URL parsing. Keep accepting the legacy pathname form for
      // previews cached by older renderer builds.
      filePath = parsed.searchParams.get("path") || decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
      // URL parsing turns a Windows drive path into /C:/...; restore it.
      if (process.platform === "win32" && /^\/[A-Za-z]:[\\/]/.test(filePath)) filePath = filePath.slice(1);
      filePath = path.resolve(filePath);
      const stat = fs.statSync(filePath);
      if (!stat.isFile()) throw new Error("Not a file");
    } catch {
      return new Response("Media not found", { status: 404 });
    }
    return net.fetch(pathToFileURL(filePath).toString(), { headers: request.headers });
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

function providerRequest(record, prompt, images = [], operationId, attempt = 0) {
  const headers = { Accept: "application/json", "Content-Type": "application/json" };
  // Scene-level translations plus a continuous voice script can exceed the
  // old 2.4k-token cap and leave the JSON response truncated mid-sentence.
  const maxOutputTokens = prompt.includes("voice_script") ? 6000 : 1200;
  let url = record.baseUrl;
  const endpoint = (base, suffix) => base.endsWith(suffix) ? base : `${base}/${suffix}`;
  let body;
  const visualImages = images.map((image) => typeof image === "string" ? { data: image } : image);
  const visualText = (index) => ({ type: "text", text: `[Khung hình ${index + 1} · ${Number(visualImages[index]?.timestampSeconds || 0).toFixed(1)} giây]` });
  if (record.providerType === "gemini") {
    url = `${record.baseUrl}/models/${encodeURIComponent(record.model)}:generateContent`;
    headers["x-goog-api-key"] = record.apiKey;
    // Gemini's REST schema uses snake_case for inline binary parts.
    body = { contents: [{ parts: [{ text: prompt }, ...visualImages.flatMap((image, index) => [{ text: visualText(index).text }, { inline_data: { mime_type: "image/jpeg", data: image.data } }])] }], generationConfig: { temperature: 0.2, maxOutputTokens } };
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
    body = { model: record.model, temperature: 0.2, max_tokens: maxOutputTokens, messages: [{ role: "user", content }] };
  }
  const state = operationState(operationId);
  // Long videos may require transcription plus multimodal reasoning; allow
  // gateways several minutes instead of aborting at the old 90-second limit.
  const timeoutMs = Number(process.env.JACS_PROVIDER_TIMEOUT_MS ?? 0);
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
    // OpenAI-compatible gateways may return message.content as either a
    // string or an array of typed text blocks. Normalize both shapes before
    // parsing the structured scene/voice response.
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
    // Gateways occasionally return transient 502/503/504 responses while
    // routing a large multimodal request. Retry a few times before surfacing
    // the provider error to the user.
    if (([502, 503, 504].includes(Number(error?.status)) || error?.name === "TimeoutError" || error?.code === "UND_ERR_CONNECT_TIMEOUT") && attempt < 2) {
      return waitMs(1200 * (attempt + 1)).then(() => providerRequest(record, prompt, images, operationId, attempt + 1));
    }
    // Some OpenAI-compatible gateways expose chat but reject multimodal
    // content for the configured model. Retry as text-only so transcription
    // context can still produce a localized, scene-aware script instead of
    // failing the entire job at HTTP 400.
    if (visualImages.length && [400, 404, 415, 422].includes(Number(error?.status))) {
      return providerRequest(record, prompt, [], operationId, attempt);
    }
    throw error;
  });
}

async function extractAnalysisFrames(filePath, durationSeconds, operationId) {
  const ffmpeg = findExecutable("ffmpeg");
  if (!ffmpeg) return [];
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "jacs-analysis-"));
  const interval = Math.max(1, Number(durationSeconds || 30) / 6);
  try {
    await runProcess(ffmpeg, ["-hide_banner", "-loglevel", "error", "-i", path.resolve(filePath), "-vf", `fps=1/${interval},scale=512:-2`, "-q:v", "5", "-frames:v", "6", path.join(directory, "frame-%02d.jpg")], undefined, operationId);
    return fs.readdirSync(directory).filter((name) => name.endsWith(".jpg")).sort().map((name, index) => ({
      data: fs.readFileSync(path.join(directory, name)).toString("base64"),
      timestampSeconds: Math.min(Number(durationSeconds || 0), index * interval),
    }));
  } catch (error) {
    if (operationState(operationId)?.cancelled || error?.code === "JACS_OPERATION_CANCELLED") throw cancelledOperationError();
    // A damaged/unsupported stream should not prevent local scene detection
    // or a text-only provider from returning a useful analysis.
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
  const scenes = boundaries.slice(0, -1).map((seconds, index) => ({ start: formatTime(seconds), end: formatTime(boundaries[index + 1]), title: `Scene ${index + 1}`, detail: "Phát hiện điểm chuyển cảnh bằng FFmpeg" }));
  return {
    summary: sceneTimes.length ? "Đã phát hiện các điểm chuyển cảnh cục bộ. Kết nối AI provider để nhận transcript và nhãn ngữ cảnh." : "Đã tạo scene toàn video bằng metadata cục bộ. Kết nối AI provider để nhận transcript và nhãn ngữ cảnh chi tiết.",
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

function normalizeScenes(value, duration, fallbackScenes) {
  const total = Math.max(0.25, Number(duration) || 0.25);
  if (!Array.isArray(value)) return fallbackScenes;
  const parsedScenes = value.map((scene, index) => {
    const start = Math.max(0, Math.min(total, parseTimeSeconds(scene?.start, 0)));
    return {
      id: String(scene?.id || `scene-${index + 1}`).trim().slice(0, 80) || `scene-${index + 1}`,
      start,
      rawEnd: scene?.end === undefined ? undefined : parseTimeSeconds(scene.end, Number.NaN),
      title: String(scene?.title || "Scene").trim().slice(0, 160) || "Scene",
      detail: String(scene?.detail || "").trim().slice(0, 500),
      translation: String(scene?.translation || "").trim().slice(0, 900) || undefined,
      voiceover: String(scene?.voiceover || scene?.voice_over || scene?.voiceOver || scene?.narration || scene?.voice_script || "").trim().slice(0, 900) || undefined,
      keywords: Array.isArray(scene?.keywords) ? scene.keywords.map((item) => String(item).trim()).filter(Boolean).slice(0, 20) : undefined,
      confidence: Number.isFinite(Number(scene?.confidence)) ? Math.max(0, Math.min(1, Number(scene.confidence))) : undefined,
    };
  }).filter((scene) => scene.start < total)
    .sort((left, right) => left.start - right.start);
  const scenes = parsedScenes.map((scene, index) => {
    const nextStart = parsedScenes[index + 1]?.start ?? total;
    const explicitEnd = Number.isFinite(scene.rawEnd) && scene.rawEnd > scene.start ? scene.rawEnd : nextStart;
    const end = Math.max(scene.start + 0.25, Math.min(total, explicitEnd));
    const { rawEnd, ...rest } = scene;
    return { ...rest, end };
  }).filter((scene) => scene.end > scene.start);
  const unique = [];
  for (const scene of scenes) {
    const previous = unique[unique.length - 1];
    if (!previous) {
      // A provider may round the first timestamp; narration must always start
      // at the beginning of the source video.
      scene.start = 0;
    } else {
      // Treat the model's scene list as an ordered timeline. This removes
      // overlaps and fills timestamp gaps so audio/subtitles never disappear.
      scene.start = previous.end;
      if (scene.end <= scene.start) continue;
    }
    unique.push(scene);
  }
  if (!unique.length) return fallbackScenes;
  const limited = unique.slice(0, 12);
  // If the UI/provider caps scene count, keep the final scene responsible for
  // the remaining tail instead of silently dropping the end of the video.
  limited[limited.length - 1].end = total;
  return limited.map((scene) => ({ id: scene.id, start: formatTime(scene.start), end: formatTime(scene.end), title: scene.title, detail: scene.detail, translation: scene.translation, voiceover: scene.voiceover, keywords: scene.keywords, confidence: scene.confidence }));
}

function parseAnalysis(text, probe, usage) {
  const fallback = localAnalysis(probe);
  try {
    const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || "");
    // Some gateways wrap the model JSON in `data`, `result`, or `output`.
    // Unwrap those envelopes before normalizing the scene/script contract.
    const json = parsed?.data && typeof parsed.data === "object" ? parsed.data
      : parsed?.result && typeof parsed.result === "object" ? parsed.result
        : parsed?.output && typeof parsed.output === "object" ? parsed.output
          : parsed;
    const scenes = json.scenes || json.scene_map || json.sceneMap || json.segments;
    return {
      summary: String(json.summary || fallback.summary).slice(0, 500),
      scenes: normalizeScenes(scenes, probe.durationSeconds, fallback.scenes),
      score: Math.max(0, Math.min(100, Number(json.score ?? fallback.score))),
      tokensUsed: usage,
      creditsUsed: usage ? Math.max(1, Math.ceil(usage / 1000)) : 0,
      topics: Array.isArray(json.topics) ? json.topics.map((item) => String(item).trim()).filter(Boolean).slice(0, 20) : undefined,
      hookCandidates: Array.isArray(json.hook_candidates || json.hookCandidates) ? (json.hook_candidates || json.hookCandidates).slice(0, 12) : undefined,
      facts: Array.isArray(json.facts) ? json.facts.slice(0, 30) : undefined,
      safetyNotes: Array.isArray(json.safety_notes || json.safetyNotes) ? (json.safety_notes || json.safetyNotes).map((item) => String(item).trim()).filter(Boolean).slice(0, 30) : undefined,
      storyPlan: json.story_plan && typeof json.story_plan === "object" ? {
        hook: String(json.story_plan.hook || "").trim(),
        setup: String(json.story_plan.setup || "").trim(),
        buildUp: String(json.story_plan.build_up || json.story_plan.buildUp || "").trim(),
        climax: String(json.story_plan.climax || "").trim(),
        cta: String(json.story_plan.cta || "").trim(),
        targetDurationSeconds: Number(json.story_plan.target_duration_seconds || json.story_plan.targetDurationSeconds || 0) || undefined,
        status: "draft",
        version: 1,
      } : undefined,
      translatedTranscript: String(json.translated_transcript || json.translatedTranscript || json.translation || "").trim().slice(0, 12000) || undefined,
      sourceLanguage: String(json.source_language || json.sourceLanguage || "").trim().slice(0, 40) || undefined,
      voiceScript: String(json.voice_script || json.voiceScript || json.voice_over || json.voiceOver || json.narration || "").trim().slice(0, 12000) || undefined,
    };
  } catch { return { ...fallback, summary: text.slice(0, 500), tokensUsed: usage, creditsUsed: usage ? Math.max(1, Math.ceil(usage / 1000)) : 0 }; }
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

async function synthesizeLocalNarration(text, voice, gender, languageCode, operationId) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "jacs-local-narration-"));
  const textPath = path.join(directory, "script.txt");
  const sourcePath = path.join(directory, process.platform === "darwin" ? "narration.aiff" : "narration.wav");
  const outputPath = path.join(directory, "narration.mp3");
  fs.writeFileSync(textPath, String(text).slice(0, 4000), { encoding: "utf8", mode: 0o600 });
  try {
    const selectedPack = resolveVoicePack(voice, languageCode, gender);
    if (process.platform === "darwin") {
      // Prefer neural Edge voices before the bundled `say` worker. The latter
      // is reliable offline but sounds robotic for many languages.
      const edgePython = process.env.JACS_PYTHON || "python3";
      const edgeVoices = { vi: gender === "male" ? "vi-VN-NamMinhNeural" : "vi-VN-HoaiMyNeural", en: gender === "male" ? "en-US-GuyNeural" : "en-US-JennyNeural", ja: gender === "male" ? "ja-JP-KeitaNeural" : "ja-JP-NanamiNeural", ko: gender === "male" ? "ko-KR-InJoonNeural" : "ko-KR-SunHiNeural", "zh-CN": gender === "male" ? "zh-CN-YunxiNeural" : "zh-CN-XiaoxiaoNeural", fr: gender === "male" ? "fr-FR-HenriNeural" : "fr-FR-DeniseNeural", es: gender === "male" ? "es-ES-AlvaroNeural" : "es-ES-ElviraNeural" };
      const edgeVoice = edgeVoices[languageCode] || edgeVoices[String(languageCode || "").split("-")[0]];
      if (edgeVoice) {
        try {
          await runProcess(edgePython, ["-m", "edge_tts", "--voice", edgeVoice, "--file", textPath, "--write-media", outputPath], undefined, operationId);
          if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) return outputPath;
        } catch { /* use local native fallback below */ }
      }
    }
    const worker = voiceWorkerInvocation();
    if (worker) {
      // Packaged builds may be launched on a machine without Python. Keep the
      // native speech engines as a reliable fallback when the worker fails.
      try {
        await runProcess(worker.command, [...worker.prefix, "synthesize", "--language", languageCode || "vi", "--voice", selectedPack.id, "--gender", gender || "female", "--text-file", textPath, "--output", sourcePath], undefined, operationId);
        if (!fs.existsSync(sourcePath) || fs.statSync(sourcePath).size === 0) throw new Error("Python voice worker trả về audio rỗng");
      } catch (error) {
        try { fs.rmSync(sourcePath, { force: true }); } catch { /* best effort */ }
      }
    }
    if (!fs.existsSync(sourcePath) || fs.statSync(sourcePath).size === 0) {
      if (process.platform === "darwin") {
        // Prefer Microsoft Edge neural voices when the optional local CLI is
        // installed. It produces markedly more natural multilingual speech
        // without requiring an API key; /usr/bin/say remains the offline fallback.
        const edgePython = process.env.JACS_PYTHON || "python3";
        const edgeVoices = { vi: gender === "male" ? "vi-VN-NamMinhNeural" : "vi-VN-HoaiMyNeural", en: gender === "male" ? "en-US-GuyNeural" : "en-US-JennyNeural", ja: gender === "male" ? "ja-JP-KeitaNeural" : "ja-JP-NanamiNeural", ko: gender === "male" ? "ko-KR-InJoonNeural" : "ko-KR-SunHiNeural", "zh-CN": gender === "male" ? "zh-CN-YunxiNeural" : "zh-CN-XiaoxiaoNeural", fr: gender === "male" ? "fr-FR-HenriNeural" : "fr-FR-DeniseNeural", es: gender === "male" ? "es-ES-AlvaroNeural" : "es-ES-ElviraNeural" };
        const edgeVoice = edgeVoices[languageCode] || edgeVoices[String(languageCode || "").split("-")[0]];
        if (edgeVoice) {
          try {
            await runProcess(edgePython, ["-m", "edge_tts", "--voice", edgeVoice, "--file", textPath, "--write-media", outputPath], undefined, operationId);
          } catch { /* optional dependency; continue with native macOS voice */ }
        }
        if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) return outputPath;
        const sayPath = "/usr/bin/say";
        if (!fs.existsSync(sayPath)) throw new Error("macOS không có System Voice (say)");
        const selectedVoice = chooseMacSpeechVoice(sayPath, languageCode, gender);
        // `say` documents the short `-v` option; using it works across older
        // and newer macOS releases bundled with customer machines.
        await runProcess(sayPath, ["-f", textPath, "-o", sourcePath, "-v", selectedVoice], undefined, operationId);
      } else if (process.platform === "win32") {
        const powershell = process.env.SystemRoot
          ? path.join(process.env.SystemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe")
          : "powershell.exe";
        const scriptPath = path.join(directory, "synthesize.ps1");
        // Use a file-based script so customer text never becomes PowerShell code.
        fs.writeFileSync(scriptPath, [
          "Add-Type -AssemblyName System.Speech",
          "$text = [IO.File]::ReadAllText($args[0], [Text.Encoding]::UTF8)",
          "$output = $args[1]",
          "$wanted = $args[2]",
          "$locale = $args[3]",
          "$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer",
          "$voice = $synth.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Gender.ToString() -eq $wanted -and $_.VoiceInfo.Culture.Name -like ($locale + '*') } | Select-Object -First 1",
          "if (-not $voice) { $voice = $synth.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Culture.Name -like ($locale + '*') } | Select-Object -First 1 }",
          // A missing locale should not make an otherwise valid render fail.
          // Use an installed voice as a last resort; the UI/provider warning
          // still tells the operator that the requested locale is unavailable.
          "if (-not $voice) { $voice = $synth.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Gender.ToString() -eq $wanted } | Select-Object -First 1 }",
          "if (-not $voice) { $voice = $synth.GetInstalledVoices() | Select-Object -First 1 }",
          "if (-not $voice) { throw \"No Windows speech voices installed.\" }",
          "$synth.SelectVoice($voice.VoiceInfo.Name)",
          "$synth.SetOutputToWaveFile($output)",
          "$synth.Speak($text)",
          "$synth.Dispose()",
        ].join("\n"), { encoding: "utf8", mode: 0o600 });
        await runProcess(powershell, ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", scriptPath, textPath, sourcePath, gender === "male" ? "Male" : "Female", speechLocale(languageCode)], undefined, operationId);
      } else {
        throw new Error("Hệ điều hành này không có local speech engine");
      }
    }
    const ffmpeg = findExecutable("ffmpeg");
    if (!ffmpeg) throw new Error("Không tìm thấy FFmpeg để mã hóa giọng đọc local");
    await runProcess(ffmpeg, ["-y", "-hide_banner", "-loglevel", "error", "-i", sourcePath, "-ac", "2", "-ar", "44100", "-codec:a", "libmp3lame", "-q:a", "4", outputPath], undefined, operationId);
    if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) throw new Error("Local speech engine trả về audio rỗng");
    return outputPath;
  } catch (error) {
    fs.rmSync(directory, { recursive: true, force: true });
    throw error;
  }
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
  const probe = await probeVideoFile(filePath);
  const directory = folder ? path.resolve(folder) : outputPath();
  fs.mkdirSync(directory, { recursive: true });
  const base = path.basename(filePath, path.extname(filePath)).replace(/[^A-Za-z0-9._-]+/g, "-");
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
  const subjectFocus = options.subjectTracking === false ? null : await detectSubjectFocus(filePath, renderedDuration, operationId);
  const renderWithCodec = (codec) => {
    const args = ["-y"];
    if (clipStart) args.push("-ss", String(clipStart));
    args.push("-i", path.resolve(filePath));
    const musicPath = options.backgroundMusic && options.backgroundMusicPath && fs.existsSync(options.backgroundMusicPath) ? options.backgroundMusicPath : null;
    if (options.backgroundMusic && !musicPath) warnings.push("Đã bật nhạc nền nhưng chưa chọn file nhạc hợp lệ.");
    if (narrationPath) args.push("-i", narrationPath);
    if (musicPath) args.push("-stream_loop", "-1", "-i", musicPath);
    const logoPath = options.logoPath && fs.existsSync(options.logoPath) ? options.logoPath : null;
    if (options.logoPath && !logoPath) warnings.push("Đã bật logo nhưng file logo không còn tồn tại.");
    if (logoPath) args.push("-i", logoPath);
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
    const logoInputIndex = logoPath ? 1 + (narrationPath ? 1 : 0) + (musicPath ? 1 : 0) : -1;
    const audioFilter = buildAudioFilter({ hasOriginalAudio: probe.hasAudio === true, narrationInputIndex: narrationPath ? 1 : undefined, musicInputIndex: musicPath ? (narrationPath ? 2 : 1) : undefined, keepOriginalAudio: options.keepOriginalAudio !== false, musicVolume: options.backgroundMusicVolume ?? 20, narrationTempo, duckOriginalAudio: Boolean(narrationPath) });
    const needsVideoGraph = Boolean(logoPath || videoChain);
    const graph = [];
    if (logoPath) {
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
  if (!record || !record.apiKey) return { status: "invalid_credentials", detail: "Provider chưa có API key", latencyMs: 0 };
  const started = Date.now();
  const headers = { Accept: "application/json", "Content-Type": "application/json" };
  let url = record.baseUrl;
  const endpoint = (base, suffix) => base.endsWith(suffix) ? base : `${base}/${suffix}`;
  let body;
  // Groq's model catalogue is the stable, inexpensive connectivity check.
  // It avoids a misleading 404 from a retired chat model and does not send a
  // transcription request without a real customer media file.
  const isGroq = /(^|\.)api\.groq\.com$/i.test(new URL(record.baseUrl).hostname);
  if (isGroq && ["openai", "openai-compatible"].includes(record.providerType)) {
    try {
      const response = await fetch(endpoint(record.baseUrl, "models"), { headers: { Accept: "application/json", Authorization: `Bearer ${record.apiKey}` }, signal: AbortSignal.timeout(10000) });
      const latencyMs = Date.now() - started;
      if (response.status === 401 || response.status === 403) return { status: "invalid_credentials", detail: "Groq từ chối API key", latencyMs, httpStatus: response.status };
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) return { status: "unreachable", detail: `Groq trả về HTTP ${response.status}`, latencyMs, httpStatus: response.status };
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
    url = `${record.baseUrl}/models/${encodeURIComponent(record.model)}:generateContent`;
    headers["x-goog-api-key"] = record.apiKey;
    body = JSON.stringify({ contents: [{ parts: [{ text: "ping" }] }] });
  } else if (record.providerType === "anthropic") {
    url = endpoint(record.baseUrl, "messages");
    headers["x-api-key"] = record.apiKey;
    headers["anthropic-version"] = "2023-06-01";
    body = JSON.stringify({ model: record.model, max_tokens: 1, messages: [{ role: "user", content: "ping" }] });
  } else if (["openai", "openai-compatible", "custom"].includes(record.providerType)) {
    url = endpoint(record.baseUrl, "chat/completions");
    headers.Authorization = `Bearer ${record.apiKey}`;
    body = JSON.stringify({ model: record.model, max_tokens: 1, messages: [{ role: "user", content: "ping" }] });
  } else return { status: "unsupported", detail: "Provider type chưa được hỗ trợ", latencyMs: 0 };
  try {
    const response = await fetch(url, { method: body ? "POST" : "GET", headers, body, signal: AbortSignal.timeout(10000) });
    const latencyMs = Date.now() - started;
    if (response.status === 401 || response.status === 403) return { status: "invalid_credentials", detail: "Provider từ chối API key", latencyMs, httpStatus: response.status };
    if (response.ok) return { status: "reachable", detail: "Kết nối provider thành công", latencyMs, httpStatus: response.status };
    // Groq may return 404 when a configured chat model is retired while the
    // account and API endpoint remain valid. Probe /models so the UI can give
    // an actionable message instead of reporting a broken API key.
    if (response.status === 404 && ["openai", "openai-compatible"].includes(record.providerType)) {
      const modelsResponse = await fetch(endpoint(record.baseUrl, "models"), { headers: { Accept: "application/json", Authorization: `Bearer ${record.apiKey}` }, signal: AbortSignal.timeout(10000) });
      if (modelsResponse.ok) return { status: "reachable", detail: `API key hợp lệ nhưng model \"${record.model}\" không tồn tại hoặc đã ngừng hỗ trợ. Hãy chọn model trong danh sách Groq hiện tại.`, latencyMs: Date.now() - started, httpStatus: 404 };
    }
    return { status: "unreachable", detail: `Provider trả về HTTP ${response.status}`, latencyMs, httpStatus: response.status };
  } catch (error) {
    return { status: "unreachable", detail: error?.name === "TimeoutError" ? "Provider timeout sau 10 giây" : "Không thể kết nối provider", latencyMs: Date.now() - started };
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
  ipcMain.handle("runtime:check-update", (_event, channel) => checkForUpdate(channel));
  ipcMain.handle("runtime:download-update", (event, release) => downloadAndInstallUpdate(event, release));
  ipcMain.handle("runtime:open-external", async (_event, value) => {
    if (!isTrustedReleaseUrl(value)) throw new Error("URL cập nhật không được tin cậy");
    await shell.openExternal(String(value));
  });
  ipcMain.handle("runtime:pick-video", async () => { const result = await dialog.showOpenDialog({ properties: ["openFile"], filters: [{ name: "Video", extensions: ["mp4", "mov", "mkv", "webm", "avi"] }] }); return result.canceled ? null : result.filePaths[0] ?? null; });
  ipcMain.handle("runtime:pick-videos", async () => { const result = await dialog.showOpenDialog({ properties: ["openFile", "multiSelections"], filters: [{ name: "Video", extensions: ["mp4", "mov", "mkv", "webm", "avi"] }] }); return result.canceled ? [] : result.filePaths; });
  ipcMain.handle("runtime:pick-output-folder", async () => { const result = await dialog.showOpenDialog({ properties: ["openDirectory", "createDirectory"] }); return result.canceled ? null : result.filePaths[0] ?? null; });
  ipcMain.handle("runtime:pick-audio", async () => { const result = await dialog.showOpenDialog({ properties: ["openFile"], filters: [{ name: "Audio", extensions: ["mp3", "wav", "m4a", "aac", "flac", "ogg"] }] }); return result.canceled ? null : result.filePaths[0] ?? null; });
  ipcMain.handle("runtime:pick-image", async () => { const result = await dialog.showOpenDialog({ properties: ["openFile"], filters: [{ name: "Logo", extensions: ["png", "jpg", "jpeg", "webp"] }] }); return result.canceled ? null : result.filePaths[0] ?? null; });
  ipcMain.handle("runtime:probe-video", (_event, value) => probeVideoFile(value));
  ipcMain.handle("runtime:download-video", async (event, value, operationId) => {
    const state = beginOperation(operationId);
    try { return await downloadVideo(event, value, operationId); }
    finally { if (state) endOperation(operationId); }
  });
  ipcMain.handle("runtime:analyze-video", async (event, filePath, providerId, operationId, options = {}) => {
    const state = beginOperation(operationId);
    try {
      event.sender.send("runtime:analysis-progress", { progress: 4, stage: "probing", operationId });
      const probe = await probeVideoFile(filePath);
      const storeInstance = providerStore();
      // An explicit empty provider id means local-only analysis. The analysis
      // screen omits the argument when it wants the configured default provider.
      const defaultProvider = providerId === undefined ? storeInstance.list().find((item) => item.enabled && item.hasApiKey && item.capabilities.includes("analysis")) : undefined;
      const record = storeInstance.find(providerId || defaultProvider?.id);
      if (record && /whisper/i.test(String(record.model || ""))) {
        throw new Error("Model analysis đang là Whisper nên không hỗ trợ chat completions. Hãy dùng một model text của API phân tích; đặt whisper-large-v3-turbo ở Transcription model/provider riêng.");
      }
      if (providerId && (!record || !record.enabled || !record.apiKey || !record.capabilities?.includes("analysis"))) {
        throw new Error("Provider AI phân tích không còn khả dụng, chưa có API key hoặc chưa bật capability analysis. Hãy kiểm tra lại Cài đặt tool.");
      }
      if (options.narratorEnabled && (!record || !record.capabilities?.includes("analysis"))) {
        throw new Error("Dịch/lồng tiếng theo ngữ cảnh cần provider analysis đang bật và có API key. Hãy kiểm tra Cài đặt tool rồi thử lại.");
      }
      if (!record) {
        event.sender.send("runtime:analysis-progress", { progress: 35, stage: "detecting-scenes", operationId });
        const result = localAnalysis(probe, await detectSceneTimes(filePath, probe.durationSeconds, operationId));
        const frames = await extractAnalysisFrames(filePath, probe.durationSeconds, operationId);
        event.sender.send("runtime:analysis-progress", { progress: 100, stage: "completed", operationId });
        return enrichAnalysis({ ...result, previewFrames: frames.map((frame) => ({ timestampSeconds: frame.timestampSeconds, imageDataUrl: `data:image/jpeg;base64,${frame.data}` })) }, "");
      }
      event.sender.send("runtime:analysis-progress", { progress: 18, stage: "extracting-frames", operationId });
      const transcriptionProviderId = options.transcriptionProviderId || record?.id;
      const transcriptionRecord = storeInstance.find(transcriptionProviderId);
      if (options.transcriptionProviderId && (!transcriptionRecord || !transcriptionRecord.enabled || !transcriptionRecord.apiKey || !transcriptionRecord.capabilities?.includes("transcription"))) {
        throw new Error("Provider transcription chưa sẵn sàng hoặc chưa bật capability transcription. Hãy cấu hình Groq Whisper trong Cài đặt tool.");
      }
      const [frames, transcriptResult] = await Promise.all([
        // Frame extraction is local and safe for every provider. Only vision
        // capable providers receive the extracted images below.
        extractAnalysisFrames(filePath, probe.durationSeconds, operationId),
        transcribeVideo(filePath, transcriptionRecord || record, operationId, probe.durationSeconds),
      ]);
      const transcript = transcriptResult?.text || "";
      const transcriptSegments = transcriptResult?.segments || [];
      // Keep the timestamps beside the frame payload so a multimodal model
      // cannot confuse a visual detail from one scene with another scene.
      const providerFrames = (record.capabilities?.includes("vision") || ["openai", "openai-compatible"].includes(record.providerType)) ? frames : [];
      event.sender.send("runtime:analysis-progress", { progress: 68, stage: transcript ? "transcribed" : "frames-ready", operationId });
      const transcriptContext = transcript ? ` Transcript đã nhận dạng (các mốc [mm:ss-mm:ss] chỉ là metadata, tuyệt đối không chép các mốc này vào bản dịch hay lời đọc): ${transcript}` : " Transcript không khả dụng trong lần chạy này. Hãy dùng frame timeline và metadata hình ảnh làm nguồn sự thật; voiceover chỉ mô tả hành động, chủ thể và cảm xúc nhìn thấy, không bịa lời thoại, tên riêng, con số hay sự kiện ngoài khung hình.";
      const frameContext = providerFrames.length ? ` Timeline frame theo thứ tự thời gian: ${frameTimeline(providerFrames)}.` : " Không có frame gửi tới provider.";
      const languageCode = Array.isArray(options.languages) && options.languages.length ? options.languages[0] : "vi";
      const outputLanguage = languageName(languageCode);
      const localized = Array.isArray(options.languages) && options.languages.length > 0;
      const languageHint = localized ? ` Ngôn ngữ đầu ra bắt buộc: ${outputLanguage} (mã ${languageCode}).` : "";
      const narrationHint = options.narratorEnabled ? ` Người dùng muốn giọng kể ${options.narratorGender === "female" ? "nữ" : "nam"}${options.narratorVoice ? ` (${options.narratorVoice})` : ""}. Phải tạo voice_script và voiceover cho TỪNG scene bằng ${outputLanguage}, bám sát ý nghĩa, sắc thái và dữ kiện của transcript/hình ảnh; không dịch từng từ máy móc. Voiceover là lời nói tự nhiên, có chủ ngữ và đại từ nhất quán, không đọc metadata thời gian, không thêm thông tin mới và phải vừa thời lượng scene (khoảng 2-3,5 từ/giây). Khi transcript không có hoặc không có timestamp, chỉ đọc những gì có thể kiểm chứng từ frame/context, không giả làm lời thoại. voice_script chỉ được nối các voiceover theo đúng thứ tự scene, không được viết lại thành nội dung khác.` : "";
      const audioHint = options.keepOriginalAudio === false ? " Người dùng chọn cắt tiếng gốc khỏi bản render." : " Giữ tiếng gốc nếu phù hợp.";
      const hookHint = options.emphasizeHook ? " Đánh dấu rõ hook 3 giây đầu và các cao trào cần nhấn mạnh." : "";
      const highlightHint = options.highlightOnly ? ` Chọn đúng một scene nổi bật nhất, đặt title bắt đầu bằng "HIGHLIGHT", ưu tiên đoạn tự đủ nghĩa và không dài quá ${Math.max(3, Number(options.highlightMaxSeconds || 30))} giây.` : "";
      const voiceSchema = `${localized ? `,"source_language":"ngôn ngữ nguồn hoặc unknown","translated_transcript":"bản dịch transcript sang ${outputLanguage}"` : ""}${options.narratorEnabled ? `,"voice_script":"Lời đọc liền mạch tự nhiên bằng ${outputLanguage}"` : ""},"topics":["các chủ đề theo thứ tự"],"hook_candidates":[{"scene_id":"scene-1","reason":"lý do chọn hook"}],"facts":[{"text":"dữ kiện kiểm chứng được","source":"transcript hoặc frame","confidence":0.0}],"safety_notes":["điểm cần người dùng duyệt"],"story_plan":{"hook":"...","setup":"...","build_up":"...","climax":"...","cta":"...","target_duration_seconds":0}`;
      const sceneVoiceSchema = `${localized ? `,"translation":"bản dịch đúng ngữ cảnh bằng ${outputLanguage}"` : ""}${options.narratorEnabled ? `,"voiceover":"câu đọc tự nhiên, ngắn, dễ đọc bằng ${outputLanguage}"` : ""},"confidence":0.0`;
      const groundingInstruction = transcript ? "Hãy đọc toàn bộ transcript trước khi dịch để khôi phục mạch chuyện, người nói, chủ ngữ, đại từ, thành ngữ, thuật ngữ, con số và sắc thái cảm xúc. Với transcript có mốc thời gian, phân bổ câu vào scene tương ứng; không lấy câu của scene khác." : "Không có transcript đáng tin cậy; hãy dựa vào frame timeline để mô tả hành động nhìn thấy. Không tạo hội thoại hoặc chi tiết không thể kiểm chứng.";
      const endStamp = `${Math.floor(probe.durationSeconds / 60).toString().padStart(2, "0")}:${Math.floor(probe.durationSeconds % 60).toString().padStart(2, "0")}`;
      const prompt = `Bạn là biên tập viên video và dịch giả bản địa. Bạn đang nhận ${providerFrames.length} frame lấy đều từ video dài ${probe.durationSeconds.toFixed(1)} giây (${probe.width || "?"}x${probe.height || "?"}).${frameContext} Phân tích TOÀN BỘ video, không chỉ highlight.${transcriptContext}${languageHint}${narrationHint}${audioHint}${hookHint}${highlightHint} ${groundingInstruction} Lập story_plan theo AIDA (hook, setup, build_up, climax, cta), chọn topics và hook_candidates có scene_id. Ghi facts/safety_notes và confidence 0-1. Bắt buộc đối chiếu mốc transcript với timeline frame trước khi tạo từng scene. Tạo scene liên tục phủ kín từ 00:00 đến ${endStamp}, không bỏ khoảng trống và không dừng lời đọc khi video còn hội thoại; nếu không có lời ở đoạn nào thì tạo scene đó với voiceover mô tả im lặng/hành động phù hợp. Mỗi câu thoại trong transcript phải được giữ lại hoặc dịch đầy đủ theo đúng scene, không tự ý tóm tắt. Không dịch từng từ máy móc, không bịa lời không có trong transcript/frame. Mỗi translation/voiceover chỉ dùng ngôn ngữ đích và không chứa mốc [mm:ss]. Trả về JSON duy nhất dạng {"summary":"...","score":0,"scenes":[{"id":"scene-1","start":"00:00","end":"00:12","title":"...","detail":"..."${sceneVoiceSchema}}]${voiceSchema}}. Mốc thời gian phải tăng dần, scene đầu bắt đầu 00:00, scene cuối kết thúc đúng thời lượng video.`;
      event.sender.send("runtime:analysis-progress", { progress: 76, stage: "requesting-provider", operationId });
      const result = await providerRequest(record, prompt, providerFrames, operationId);
      event.sender.send("runtime:analysis-progress", { progress: 100, stage: "completed", operationId });
      return enrichAnalysis({ ...parseAnalysis(result.text, probe, result.usage), transcript, transcriptSegments, previewFrames: frames.map((frame) => ({ timestampSeconds: frame.timestampSeconds, imageDataUrl: `data:image/jpeg;base64,${frame.data}` })) }, transcript);
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
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: "#111817",
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
