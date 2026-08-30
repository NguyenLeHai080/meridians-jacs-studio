const { app, BrowserWindow, clipboard, dialog, ipcMain, safeStorage, shell } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const childProcess = require("node:child_process");
const { once } = require("node:events");
const { createMachineInfo } = require("./machine-id.cjs");
const { createProviderStore } = require("./provider-store.cjs");

if (!app || typeof app.whenReady !== "function") {
  throw new Error("JACS Studio phải được khởi động bằng Electron desktop runtime; không chạy main.cjs bằng Node.");
}

// Chromium's Metal renderer has crashed on a few macOS/Electron combinations.
// VideoToolbox encoding remains available because this only disables the UI GPU.
app.disableHardwareAcceleration();

let cachedMachineInfo;
const activeOperations = new Map();

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
function defaultPreferences() { return { workspaceName: "Workspace của tôi", operatorName: "Người dùng", workspacePath: path.join(app.getPath("documents"), "JACS Studio", "Projects"), cachePath: path.join(app.getPath("userData"), "cache"), outputPath: outputPath(), telemetryEnabled: true, autoUpdateEnabled: true, preferredEngine: "auto" }; }
function providerStore() { return createProviderStore({ filePath: providersPath(), safeStorage }); }
function apiBaseUrl() { return String(process.env.JACS_API_URL || "https://jacs-studio.nexoratech.com.vn").replace(/\/$/, ""); }

function isTrustedReleaseUrl(value) {
  try {
    const url = new URL(String(value));
    // Production release files must be HTTPS. HTTP stays available only for
    // a loopback endpoint used during a local updater test.
    return url.protocol === "https:" || (url.protocol === "http:" && ["localhost", "127.0.0.1", "::1"].includes(url.hostname));
  } catch { return false; }
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
  if (release.platform !== platform || !/^v\d+\.\d+\.\d+$/.test(String(release.version)) || !isTrustedReleaseUrl(release.download_url)) {
    throw new Error("Máy chủ trả về thông tin cập nhật không hợp lệ");
  }
  return { update_available: true, release };
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
  const persistent = value.slice(0, 500).map((job) => {
    if (!job?.analysis?.previewFrames) return job;
    const { previewFrames: _previewFrames, ...analysis } = job.analysis;
    return { ...job, analysis };
  });
  writeJsonAtomic(jobsPath(), persistent);
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
        return { path: absolutePath, durationSeconds: parseDuration(output), sizeBytes: stat.size };
      }
    }
    return { path: absolutePath, durationSeconds: 0, sizeBytes: stat.size };
  }
  const output = childProcess.execFileSync(ffprobe, ["-v", "error", "-show_entries", "format=duration:stream=width,height,r_frame_rate", "-of", "json", absolutePath], { encoding: "utf8", windowsHide: true });
  const parsed = JSON.parse(output);
  const format = parsed.format || {};
  const stream = (parsed.streams || []).find((item) => item.width || item.height) || {};
  const rate = String(stream.r_frame_rate || "").split("/");
  const stat = fs.statSync(absolutePath);
  return { path: absolutePath, durationSeconds: Number(format.duration || 0), width: stream.width, height: stream.height, fps: rate.length === 2 && Number(rate[1]) ? Number(rate[0]) / Number(rate[1]) : undefined, sizeBytes: stat.size };
}

async function downloadVideo(event, url, operationId) {
  let parsed;
  try { parsed = new URL(String(url)); } catch { throw new Error("URL video không hợp lệ"); }
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("URL video phải dùng HTTP hoặc HTTPS");
  const state = operationState(operationId);
  const timeout = AbortSignal.timeout(120000);
  const signal = state ? AbortSignal.any([state.controller.signal, timeout]) : timeout;
  const response = await fetch(parsed, { signal });
  if (!response.ok) throw new Error(`Không tải được video (HTTP ${response.status})`);
  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  if (contentType.includes("text/html")) {
    throw new Error("URL đang trỏ tới trang web, không phải file video trực tiếp. Hãy dùng URL tải xuống .mp4/.mov/.webm.");
  }
  const contentLength = Number(response.headers.get("content-length") || 0);
  const maxBytes = 2 * 1024 * 1024 * 1024;
  if (contentLength > maxBytes) throw new Error("Video vượt quá giới hạn 2GB");
  const extensionsByType = { "video/mp4": ".mp4", "video/quicktime": ".mov", "video/webm": ".webm", "video/x-msvideo": ".avi", "video/x-matroska": ".mkv" };
  const extension = path.extname(parsed.pathname).toLowerCase() || extensionsByType[contentType.split(";", 1)[0]] || ".mp4";
  const directory = path.join(app.getPath("userData"), "downloads");
  fs.mkdirSync(directory, { recursive: true });
  const filePath = path.join(directory, `${Date.now()}-${Math.random().toString(16).slice(2)}${extension}`);
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

function providerRequest(record, prompt, images = [], operationId) {
  const headers = { Accept: "application/json", "Content-Type": "application/json" };
  let url = record.baseUrl;
  const endpoint = (base, suffix) => base.endsWith(suffix) ? base : `${base}/${suffix}`;
  let body;
  if (record.providerType === "gemini") {
    url = `${record.baseUrl}/models/${encodeURIComponent(record.model)}:generateContent`;
    headers["x-goog-api-key"] = record.apiKey;
    // Gemini's REST schema uses snake_case for inline binary parts.
    body = { contents: [{ parts: [{ text: prompt }, ...images.map((image) => ({ inline_data: { mime_type: "image/jpeg", data: image } }))] }] };
  } else if (record.providerType === "anthropic") {
    url = endpoint(record.baseUrl, "messages");
    headers["x-api-key"] = record.apiKey;
    headers["anthropic-version"] = "2023-06-01";
    const content = images.length ? [{ type: "text", text: prompt }, ...images.map((image) => ({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: image } }))] : prompt;
    body = { model: record.model, max_tokens: 900, messages: [{ role: "user", content }] };
  } else {
    url = endpoint(record.baseUrl, "chat/completions");
    headers.Authorization = `Bearer ${record.apiKey}`;
    const content = images.length ? [{ type: "text", text: prompt }, ...images.map((image) => ({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${image}`, detail: "low" } }))] : prompt;
    body = { model: record.model, temperature: 0.2, max_tokens: 900, messages: [{ role: "user", content }] };
  }
  const state = operationState(operationId);
  const timeout = AbortSignal.timeout(90000);
  const signal = state ? AbortSignal.any([state.controller.signal, timeout]) : timeout;
  return fetch(url, { method: "POST", headers, body: JSON.stringify(body), signal }).then(async (response) => {
    assertOperationActive(operationId);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`AI provider trả về HTTP ${response.status}`);
    const text = payload?.choices?.[0]?.message?.content || payload?.content?.[0]?.text || payload?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (!text) throw new Error("AI provider không trả về nội dung phân tích");
    const usage = Number(
      payload?.usage?.total_tokens
      || (Number(payload?.usage?.input_tokens || 0) + Number(payload?.usage?.output_tokens || 0))
      || payload?.usageMetadata?.totalTokenCount
      || 0,
    );
    return { text, usage };
  }).catch((error) => { if (state?.cancelled) throw cancelledOperationError(); throw error; });
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

async function transcribeVideo(filePath, record, operationId) {
  if (!record?.capabilities?.includes("transcription")) return "";
  if (!["openai", "openai-compatible"].includes(record.providerType)) return "";
  const ffmpeg = findExecutable("ffmpeg");
  if (!ffmpeg) return "";
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "jacs-transcript-"));
  const audioPath = path.join(directory, "audio.mp3");
  try {
    await runProcess(ffmpeg, ["-hide_banner", "-loglevel", "error", "-i", path.resolve(filePath), "-vn", "-ac", "1", "-ar", "16000", "-b:a", "48k", "-t", "900", audioPath], undefined, operationId);
    if (!fs.existsSync(audioPath) || fs.statSync(audioPath).size === 0) return "";
    const form = new FormData();
    form.append("model", record.transcriptionModel || "whisper-1");
    form.append("response_format", "json");
    form.append("file", new Blob([fs.readFileSync(audioPath)], { type: "audio/mpeg" }), "audio.mp3");
    const endpoint = record.baseUrl.endsWith("audio/transcriptions") ? record.baseUrl : `${record.baseUrl}/audio/transcriptions`;
    const state = operationState(operationId);
    const timeout = AbortSignal.timeout(120000);
    const signal = state ? AbortSignal.any([state.controller.signal, timeout]) : timeout;
    const response = await fetch(endpoint, { method: "POST", headers: { Authorization: `Bearer ${record.apiKey}` }, body: form, signal });
    assertOperationActive(operationId);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return "";
    return String(payload.text || "").trim().slice(0, 12000);
  } catch (error) {
    if (operationState(operationId)?.cancelled || error?.code === "JACS_OPERATION_CANCELLED") throw cancelledOperationError();
    // Transcription enriches the visual analysis but is not required for a
    // usable scene map, so provider/codec failures fall back to frames.
    return "";
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

function normalizeScenes(value, duration, fallbackScenes) {
  const total = Math.max(0.25, Number(duration) || 0.25);
  if (!Array.isArray(value)) return fallbackScenes;
  const scenes = value.map((scene) => {
    const start = Math.max(0, Math.min(total, parseTimeSeconds(scene?.start, 0)));
    const rawEnd = scene?.end === undefined ? total : parseTimeSeconds(scene.end, total);
    const end = Math.max(start + 0.25, Math.min(total, rawEnd));
    return {
      start,
      end,
      title: String(scene?.title || "Scene").trim().slice(0, 160) || "Scene",
      detail: String(scene?.detail || "").trim().slice(0, 500),
    };
  }).filter((scene) => scene.start < total && scene.end > scene.start)
    .sort((left, right) => left.start - right.start);
  const unique = [];
  for (const scene of scenes) {
    const previous = unique[unique.length - 1];
    if (previous && scene.start < previous.end) {
      scene.start = previous.end;
      if (scene.end <= scene.start) continue;
    }
    unique.push(scene);
  }
  return unique.length ? unique.slice(0, 12).map((scene) => ({ start: formatTime(scene.start), end: formatTime(scene.end), title: scene.title, detail: scene.detail })) : fallbackScenes;
}

function parseAnalysis(text, probe, usage) {
  const fallback = localAnalysis(probe);
  try {
    const json = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || "");
    return { summary: String(json.summary || fallback.summary).slice(0, 500), scenes: normalizeScenes(json.scenes, probe.durationSeconds, fallback.scenes), score: Math.max(0, Math.min(100, Number(json.score ?? fallback.score))), tokensUsed: usage, creditsUsed: usage ? Math.max(1, Math.ceil(usage / 1000)) : 0 };
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
  const clipSuffix = clipDuration ? `-${Math.round(clipStart)}s-${Math.round(clipEnd)}s` : "";
  const destination = path.join(directory, `${base}${clipSuffix}-jacs-${Date.now()}${ffmpeg ? ".mp4" : path.extname(filePath)}`);
  event.sender.send("runtime:render-progress", { progress: 2, stage: "rendering", operationId });
  if (!ffmpeg) {
    // Keep the workflow usable on a clean machine; installer can ship FFmpeg for encoded output.
    fs.copyFileSync(filePath, destination);
    event.sender.send("runtime:render-progress", { progress: 100, stage: "completed", outputPath: destination, operationId });
    return { outputPath: destination, durationSeconds: renderedDuration, passthrough: true };
  }
  const hardwareCodecs = options.mode === "local-gpu" && process.platform === "darwin"
    ? ["h264_videotoolbox"]
    : options.mode === "local-gpu" && process.platform === "win32"
      ? options.preferredEngine === "cpu" ? [] : options.preferredEngine === "nvidia" ? ["h264_nvenc"] : ["h264_nvenc", "h264_qsv", "h264_amf"]
      : [];
  const codecs = [...hardwareCodecs, "libx264"];
  const renderWithCodec = (codec) => {
    const args = ["-y"];
    if (clipStart) args.push("-ss", String(clipStart));
    args.push("-i", path.resolve(filePath));
    if (clipDuration) args.push("-t", String(clipDuration));
    const filters = {
      "9:16": "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
      "1:1": "scale=1080:1080:force_original_aspect_ratio=increase,crop=1080:1080",
      "16:9": "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080",
    };
    if (filters[options.aspectRatio]) args.push("-vf", filters[options.aspectRatio]);
    args.push("-c:v", codec);
    // Hardware encoders do not share libx264's `fast` preset name. Passing
    // the wrong option makes an otherwise capable GPU job fall back to CPU.
    if (codec === "libx264") args.push("-preset", "fast");
    if (codec === "h264_nvenc") args.push("-preset", "p4");
    if (codec === "h264_videotoolbox") args.push("-b:v", "8M");
    args.push("-pix_fmt", "yuv420p", "-c:a", "aac", "-movflags", "+faststart", destination);
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
      event.sender.send("runtime:render-progress", { progress: 100, stage: "completed", outputPath: destination, operationId });
      return { outputPath: destination, durationSeconds: renderedDuration, passthrough: false };
    } catch (error) {
      lastError = error;
      if (error?.code === "JACS_OPERATION_CANCELLED" || operationState(operationId)?.cancelled) throw cancelledOperationError();
      event.sender.send("runtime:render-progress", { progress: 3, stage: "rendering", operationId });
    }
  }
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
  ipcMain.handle("runtime:save-provider", (_event, value) => providerStore().save(value));
  ipcMain.handle("runtime:delete-provider", (_event, id) => providerStore().delete(id));
  ipcMain.handle("runtime:test-provider", async (_event, id) => {
    const record = providerStore().find(id);
    if (!record) throw new Error("Không tìm thấy provider");
    return testStoredProvider(record);
  });
  ipcMain.handle("runtime:check-update", (_event, channel) => checkForUpdate(channel));
  ipcMain.handle("runtime:open-external", async (_event, value) => {
    if (!isTrustedReleaseUrl(value)) throw new Error("URL cập nhật không được tin cậy");
    await shell.openExternal(String(value));
  });
  ipcMain.handle("runtime:pick-video", async () => { const result = await dialog.showOpenDialog({ properties: ["openFile"], filters: [{ name: "Video", extensions: ["mp4", "mov", "mkv", "webm", "avi"] }] }); return result.canceled ? null : result.filePaths[0] ?? null; });
  ipcMain.handle("runtime:pick-videos", async () => { const result = await dialog.showOpenDialog({ properties: ["openFile", "multiSelections"], filters: [{ name: "Video", extensions: ["mp4", "mov", "mkv", "webm", "avi"] }] }); return result.canceled ? [] : result.filePaths; });
  ipcMain.handle("runtime:pick-output-folder", async () => { const result = await dialog.showOpenDialog({ properties: ["openDirectory", "createDirectory"] }); return result.canceled ? null : result.filePaths[0] ?? null; });
  ipcMain.handle("runtime:probe-video", (_event, value) => probeVideoFile(value));
  ipcMain.handle("runtime:download-video", async (event, value, operationId) => {
    const state = beginOperation(operationId);
    try { return await downloadVideo(event, value, operationId); }
    finally { if (state) endOperation(operationId); }
  });
  ipcMain.handle("runtime:analyze-video", async (event, filePath, providerId, operationId) => {
    const state = beginOperation(operationId);
    try {
      event.sender.send("runtime:analysis-progress", { progress: 4, stage: "probing", operationId });
      const probe = await probeVideoFile(filePath);
      const storeInstance = providerStore();
      // An explicit empty provider id means local-only analysis. The analysis
      // screen omits the argument when it wants the configured default provider.
      const defaultProvider = providerId === undefined ? storeInstance.list().find((item) => item.enabled && item.capabilities.includes("analysis")) : undefined;
      const record = storeInstance.find(providerId || defaultProvider?.id);
      if (!record) {
        event.sender.send("runtime:analysis-progress", { progress: 35, stage: "detecting-scenes", operationId });
        const result = localAnalysis(probe, await detectSceneTimes(filePath, probe.durationSeconds, operationId));
        event.sender.send("runtime:analysis-progress", { progress: 100, stage: "completed", operationId });
        return result;
      }
      event.sender.send("runtime:analysis-progress", { progress: 18, stage: "extracting-frames", operationId });
      const [frames, transcript] = await Promise.all([
        record.capabilities?.includes("vision") ? extractAnalysisFrames(filePath, probe.durationSeconds, operationId) : Promise.resolve([]),
        transcribeVideo(filePath, record, operationId),
      ]);
      event.sender.send("runtime:analysis-progress", { progress: 68, stage: transcript ? "transcribed" : "frames-ready", operationId });
      const transcriptContext = transcript ? ` Transcript đã nhận dạng: ${transcript}` : " Không có transcript; không được tự bịa lời thoại.";
      const prompt = `Bạn đang nhận ${frames.length} frame lấy đều từ video dài ${probe.durationSeconds.toFixed(1)} giây (${probe.width || "?"}x${probe.height || "?"}). Phân tích nội dung nhìn thấy, hook, nhịp, chủ thể và các đoạn đáng dựng.${transcriptContext} Trả về JSON duy nhất dạng {"summary":"...","score":0,"scenes":[{"start":"00:00","end":"00:12","title":"...","detail":"..."}]}. Mốc thời gian phải tăng dần, nằm trong thời lượng video và không bịa dữ liệu không có trong frame/transcript.`;
      event.sender.send("runtime:analysis-progress", { progress: 76, stage: "requesting-provider", operationId });
      const result = await providerRequest(record, prompt, frames.map((frame) => frame.data), operationId);
      event.sender.send("runtime:analysis-progress", { progress: 100, stage: "completed", operationId });
      return { ...parseAnalysis(result.text, probe, result.usage), transcript, previewFrames: frames.map((frame) => ({ timestampSeconds: frame.timestampSeconds, imageDataUrl: `data:image/jpeg;base64,${frame.data}` })) };
    } finally { if (state) endOperation(operationId); }
  });
  ipcMain.handle("runtime:render-video", async (event, filePath, folder, options, operationId) => {
    const state = beginOperation(operationId);
    try { return await renderVideoFile(event, filePath, folder, options, operationId); }
    finally { if (state) endOperation(operationId); }
  });
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
  registerIpc();
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
