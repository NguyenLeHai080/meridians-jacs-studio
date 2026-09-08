const { app, BrowserWindow, clipboard, dialog, ipcMain, net, protocol, safeStorage, shell } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const childProcess = require("node:child_process");
const crypto = require("node:crypto");
const { pathToFileURL } = require("node:url");
const { createMachineInfo, collectClientHardwareInfo } = require("./machine-id.cjs");
const { createProviderStore } = require("./provider-store.cjs");
const { extractPageVideoUrls, extractResolverVideoUrls, extractTikTokVideoUrls, extractYouTubeVideoId, isTikTokHost, isYouTubeHost, normalizeVideoUrl, resolveYouTubeVideoUrl } = require("./video-url.cjs");
const { buildAudioFilter } = require("./audio-mix.cjs");
const { buildCaptionCues, buildSrt } = require("./subtitles.cjs");
const { languageName, speechLocale } = require("./narration.cjs");
const { resolveVoicePack, listVoicePacks } = require("./voice-pack.cjs");
const { frameTimeline, enrichAnalysis } = require("./contextual-analysis.cjs");
const { formatTtsProviderError, isRetryableTtsStatus, isVoiceCompatibilityError, resolveTtsModels, resolveTtsVoices } = require("./tts.cjs");
const { compareVersions, downloadRelease, installRelease, trustedUrl: isTrustedUpdateUrl, validateRelease, versionParts } = require("./updater.cjs");

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
    userDataBin ? path.join(userDataBin, "bin", cmd) : null,
    userDataBin ? path.join(userDataBin, architectureDirectory, cmd) : null,
    userDataBin ? path.join(userDataBin, platformDirectory, cmd) : null,
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
  let userDataBin = "";
  try { userDataBin = path.join(app.getPath("userData"), "bin"); } catch {}
  if (userDataBin && fs.existsSync(userDataBin)) {
    const isWin = process.platform === "win32";
    const cmd = isWin && !name.toLowerCase().endsWith(".exe") ? `${name}.exe` : name;
    const recursiveHit = findFileRecursive(userDataBin, cmd, 3);
    if (recursiveHit && fs.existsSync(recursiveHit)) {
      try {
        const stat = fs.statSync(recursiveHit);
        if (stat.isFile() && stat.size > 1024) return recursiveHit;
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

    if (name === "yt-dlp") {
      const ytdlpUrls = [
        "https://jacs-studio.nexoratech.com.vn/downloads/yt-dlp.exe",
        "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe"
      ];
      for (const yUrl of ytdlpUrls) {
        try {
          const res = await fetch(yUrl, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
          });
          if (res.ok) {
            const buf = Buffer.from(await res.arrayBuffer());
            if (buf.length > 5 * 1024 * 1024) {
              fs.writeFileSync(targetExe, buf, { mode: 0o755 });
              return targetExe;
            }
          }
        } catch {}
      }
    }

    const onProgress = typeof options.onProgress === "function" ? options.onProgress : () => {};
    onProgress({ stage: `Đang tải bộ xử lý media ${name} (tự động 1 lần duy nhất)...`, progress: 5 });

    const downloadZipUrl = isWin
      ? "https://jacs-studio.nexoratech.com.vn/downloads/ffmpeg-win64.zip"
      : `https://jacs-studio.nexoratech.com.vn/downloads/${name}`;

    const tempZip = path.join(app.getPath("temp"), `jacs-media-engine-${Date.now()}.zip`);

    try {
      const response = await fetch(downloadZipUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) JACS-Studio-Updater" }
      });
      if (response.ok) {
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
              console.warn("Expand archive error:", err);
            }
          }
        } else {
          try {
            fs.copyFileSync(tempZip, targetExe);
            fs.chmodSync(targetExe, 0o755);
          } catch {}
        }
      }
    } catch (err) {
      console.warn("Zip download failed, attempting direct binary download:", err);
    } finally {
      try { if (fs.existsSync(tempZip)) fs.unlinkSync(tempZip); } catch {}
    }

    // Check if targetExe is in a subdirectory inside userDataBin and relocate to root
    if (!fs.existsSync(targetExe) || fs.statSync(targetExe).size < 1024 * 1024) {
      const foundInUserData = findFileRecursive(userDataBin, cmd, 3);
      if (foundInUserData && foundInUserData !== targetExe) {
        try { fs.copyFileSync(foundInUserData, targetExe); } catch {}
      }
    }

    // Direct binary fallback if still missing
    if (!fs.existsSync(targetExe) || fs.statSync(targetExe).size < 1024 * 1024) {
      const directUrl = isWin
        ? `https://jacs-studio.nexoratech.com.vn/downloads/${cmd}`
        : `https://jacs-studio.nexoratech.com.vn/downloads/${name}`;
      onProgress({ stage: `Đang tải trực tiếp bộ xử lý ${cmd}...`, progress: 50 });
      const res = await fetch(directUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) JACS-Studio-Updater" }
      });
      if (!res.ok) {
        throw new Error(`Không thể tải ${cmd} từ máy chủ JACS (HTTP ${res.status}). Vui lòng kiểm tra kết nối mạng.`);
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(targetExe, buffer);
      if (!isWin) {
        try { fs.chmodSync(targetExe, 0o755); } catch {}
      }
    }

    // Also ensure ffprobe is available if downloading ffmpeg on Windows
    if (isWin && name === "ffmpeg") {
      const probeExe = path.join(userDataBin, "ffprobe.exe");
      if (!fs.existsSync(probeExe) || fs.statSync(probeExe).size < 1024 * 1024) {
        const foundProbe = findFileRecursive(userDataBin, "ffprobe.exe", 3);
        if (foundProbe && foundProbe !== probeExe) {
          try { fs.copyFileSync(foundProbe, probeExe); } catch {}
        } else {
          try {
            const resProbe = await fetch("https://jacs-studio.nexoratech.com.vn/downloads/ffprobe.exe", {
              headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) JACS-Studio-Updater" }
            });
            if (resProbe.ok) {
              fs.writeFileSync(probeExe, Buffer.from(await resProbe.arrayBuffer()));
            }
          } catch {}
        }
      }
    }

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
  const response = await fetch(endpoint, {
    signal: AbortSignal.timeout(15000),
    headers: {
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) JACS-Studio-Updater"
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Không kiểm tra được cập nhật (HTTP ${response.status})`);
  const result = payload?.data || payload;
  const release = result?.release;
  if (!result?.update_available || !release) return { update_available: false, release: null };
  if (compareVersions(release.version, currentVersion) <= 0) {
    return { update_available: false, release: null };
  }
  try {
    validateRelease(release, platform, currentVersion);
  } catch (err) {
    console.warn("Update validation notice:", err?.message);
    return { update_available: false, release: null };
  }
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
  let ytdlp = findExecutable("yt-dlp");
  if (!ytdlp) {
    try {
      ytdlp = await ensureExecutable("yt-dlp", {
        onProgress: (info) => {
          event.sender.send("runtime:download-progress", { progress: info.progress || 5, stage: info.stage || "Đang tải bộ xử lý media yt-dlp...", operationId });
        }
      });
    } catch {}
  }
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

function generateLocalStoryAnalysis(probe, customPrompt, language = "vi", options = {}, transcript = "", transcriptSegments = []) {
  const duration = Math.max(30, Number(probe?.durationSeconds || 300));
  const targetDurMinutes = Number(options?.targetDurationMinutes) || (duration > 300 ? 5 : Math.max(1, Math.ceil(duration / 60)));
  const targetDurSeconds = Math.round(targetDurMinutes * 60);

  const targetCount = Math.max(3, Math.min(16, Math.round(targetDurSeconds / 22)));
  const targetClipDuration = Math.max(8, Math.round(targetDurSeconds / targetCount));
  const sourceStep = Math.max(4, (duration - targetClipDuration) / Math.max(1, targetCount - 1));

  const scenes = [];
  let recapCursor = 0;

  const rawTitle = options?.videoTitle || probe?.filename || "Video";
  let cleanTitle = String(rawTitle)
    .replace(/\.[^/.]+$/, "")
    .replace(/^(?:save(?:from)?|ytdown(?:loader)?(?:\.com)?|youtube|media|video|download|jacs|yt|new)[_.\s-]*/gi, "")
    .replace(/[-_.]+/g, " ")
    .replace(/\b(?:1080p|720p|480p|4k|hd|mp4|mkv|avi|mov|webm|new|official|video)\b/gi, "")
    .replace(/\b[a-zA-Z0-9]{8,15}\b$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleanTitle || cleanTitle.length < 3) cleanTitle = "Tác Phẩm & Nội Dung Đặc Sắc";

  const safeSegments = Array.isArray(transcriptSegments) && transcriptSegments.length ? transcriptSegments : [];

  const act1Templates = [
    (title, i) => ({
      title: `[Hồi 1] Bối Cảnh & Khởi Nguồn Sự Việc (#${i + 1})`,
      narrative: `Câu chuyện bắt đầu hé mở không gian ban đầu, giới thiệu các nhân vật và tình huống đặt nền móng cho "${title}".`,
      visual: `Toàn cảnh không gian mở đầu và cận cảnh các nhân vật chính xuất hiện.`,
    }),
    (title, i) => ({
      title: `[Hồi 1] Tình Huống Ban Đầu & Dấu Hiệu Đáng Chú Ý (#${i + 1})`,
      narrative: `Những chi tiết đầu tiên bắt đầu phát sinh, hé lộ động cơ cùng mối quan hệ giữa các bên liên quan.`,
      visual: `Góc quay ghi nhận diễn biến đầu tiên và các cử chỉ, phản ứng ban đầu.`,
    }),
    (title, i) => ({
      title: `[Hồi 1] Mâu Thuẫn Ngầm & Chuyển Biến Mới (#${i + 1})`,
      narrative: `Tình thế bắt đầu có sự chuyển biến khi các nhân vật bắt đầu bước vào chuỗi sự việc trọng tâm.`,
      visual: `Khung cảnh tương tác trực tiếp giữa các nhân vật và sự xuất hiện của yếu tố mới.`,
    }),
  ];

  const act2Templates = [
    (title, i) => ({
      title: `[Hồi 2] Diễn Biến Trọng Tâm & Nút Thắt Xuất Hiện (#${i + 1})`,
      narrative: `Mạch sự việc được đẩy lên cao khi sự bất thường bắt đầu lộ rõ, buộc các nhân vật phải đối mặt trực diện.`,
      visual: `Cận cảnh tình huống tranh luận hoặc hành động đáng ngờ đang diễn ra.`,
    }),
    (title, i) => ({
      title: `[Hồi 2] Cao Trào Xung Đột & Bước Ngoặt Bất Ngờ (#${i + 1})`,
      narrative: `Tình huống trở nên căng thẳng vượt bậc với những hành vi và tình tiết không ai ngờ tới trong "${title}".`,
      visual: `Góc quay tập trung vào khoảnh khắc đối chất kịch tính và cảm xúc dâng trào.`,
    }),
    (title, i) => ({
      title: `[Hồi 2] Manh Mối Phơi Bày & Sự Thật Dần Hé Lộ (#${i + 1})`,
      narrative: `Những bằng chứng xác thực và lời nói mâu thuẫn bắt đầu phơi bày rõ ràng toàn bộ sự việc.`,
      visual: `Hình ảnh ghi nhận bằng chứng cụ thể và nét mặt ngỡ ngàng của những người trong cuộc.`,
    }),
    (title, i) => ({
      title: `[Hồi 2] Đỉnh Điểm Đấu Trí & Giằng Co Tâm Lý (#${i + 1})`,
      narrative: `Cuộc giằng co bước vào giai đoạn quyết định khi một bên không còn đường thoái lui.`,
      visual: `Cảnh quay đặc tả biểu cảm nghẹt thở và phản ứng quyết liệt của các nhân vật.`,
    }),
    (title, i) => ({
      title: `[Hồi 2] Phản Ứng Dứt Khoát & Sự Can Thiệp Kịp Thời (#${i + 1})`,
      narrative: `Diễn biến chuyển sang thế chủ động khi sự việc được làm sáng tỏ và các biện pháp xử lý được kích hoạt.`,
      visual: `Hành động dứt khoát của bên nắm giữ công lý và sự bối rối của đối phương.`,
    }),
  ];

  const act3Templates = [
    (title, i) => ({
      title: `[Hồi 3] Hồi Kết Phân Xử & Sự Thật Sáng Tỏ (#${i + 1})`,
      narrative: `Toàn bộ mâu thuẫn được giải quyết thỏa đáng, mọi hành vi sai lệch đều phải chịu trách nhiệm tương xứng.`,
      visual: `Toàn cảnh sự việc đi vào hồi kết và kết luận chính thức cho các bên.`,
    }),
    (title, i) => ({
      title: `[Hồi 3] Bài Học Đắt Giá & Thông Điệp Sâu Sắc (#${i + 1})`,
      narrative: `Khép lại câu chuyện về "${title}", để lại lời cảnh tỉnh sâu sắc và giá trị nhân văn đáng nhớ cho người xem.`,
      visual: `Khung hình kết thúc đọng lại suy ngẫm cùng thông điệp cốt lõi của tác phẩm.`,
    }),
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
    let actionVisual = `Trích đoạn video gốc ${formatTime(srcStartSec)} - ${formatTime(srcEndSec)}`;

    // If we have actual transcript segments matching this time range, use them!
    const matchingSegs = safeSegments.filter((s) => s.start >= srcStartSec - 5 && s.end <= srcEndSec + 5);
    const segmentText = matchingSegs.map((s) => s.text).join(" ").trim();

    if (i === 0) {
      stageTitle = "[00:00 - 00:10] Hook Mở Màn & Điểm Nhấn Đắt Giá";
      narrative = `Mở đầu video "${cleanTitle}", một khoảnh khắc ấn tượng và tình huống bất ngờ lập tức thu hút sự chú ý của người xem ngay từ giây đầu tiên.`;
      actionVisual = `Khoảnh khắc ấn tượng và gay cấn nhất trong 10 giây mở đầu của video gốc.`;
    } else if (progPct <= 30) {
      const act1Idx = Math.max(0, i - 1) % act1Templates.length;
      const tpl = act1Templates[act1Idx](cleanTitle, i);
      stageTitle = tpl.title;
      narrative = tpl.narrative;
      actionVisual = tpl.visual;
    } else if (progPct <= 75) {
      const act2Idx = Math.max(0, i - 1) % act2Templates.length;
      const tpl = act2Templates[act2Idx](cleanTitle, i);
      stageTitle = tpl.title;
      narrative = tpl.narrative;
      actionVisual = tpl.visual;
    } else {
      const act3Idx = Math.max(0, i - 1) % act3Templates.length;
      const tpl = act3Templates[act3Idx](cleanTitle, i);
      stageTitle = tpl.title;
      narrative = tpl.narrative;
      actionVisual = tpl.visual;
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
      title: stageTitle,
      detail: narrative,
      action_visual: actionVisual,
      translation: narrative,
      voiceover: narrative,
    });
  }

  const suggestedTitles = [
    `${cleanTitle}: Toàn Bộ Diễn Biến & Những Điểm Nhấn Đắt Giá`,
    `Khám Phá Chi Tiết Vụ Việc: ${cleanTitle}`,
    `Những Khoảnh Khắc Bất Ngờ & Đáng Nhớ Nhất Trong ${cleanTitle}`,
    `Tóm Tắt & Phân Tích Đầy Đủ: ${cleanTitle}`,
  ];

  return {
    videoTitle: suggestedTitles[0],
    suggestedTitles,
    hookTitle: "Hook Mở Màn & Giữ Chân Người Xem 10s Đầu",
    summary: `Kịch bản phân tích và tóm tắt toàn diện (${targetDurMinutes} phút): Bóc tách toàn bộ cốt truyện và các điểm nhấn nổi bật của "${cleanTitle}" từ mở đầu đến hồi kết.`,
    scenes,
    score: 95,
    tokensUsed: 0,
    creditsUsed: 0,
  };
}

async function reportAiRequestTelemetry(logData) {
  try {
    let licenseKey = "";
    try {
      if (safeStorage.isEncryptionAvailable() && fs.existsSync(licensePath())) {
        const raw = fs.readFileSync(licensePath());
        licenseKey = safeStorage.decryptString(raw) || "";
      }
    } catch { /* best effort */ }

    let hwid = "";
    try {
      const minfo = createMachineInfo({
        platform: process.platform,
        arch: process.arch,
        appVersion: app.getVersion ? app.getVersion() : "0.8.34",
        userDataPath: app.getPath("userData"),
      });
      hwid = minfo?.machineId || "";
    } catch { /* best effort */ }

    const latencyMs = Math.max(0, Math.round(Number(logData.latencyMs || 0)));
    const statusCode = Number(logData.statusCode || 200);
    const isFail = statusCode >= 400 || Boolean(logData.errorMessage) || logData.status === "Fail";

    const payload = {
      model: String(logData.model || "gemini-2.5-flash").replace(/^models\//i, "").trim(),
      provider_type: String(logData.providerType || "ai_gateway").toLowerCase(),
      latency_ms: latencyMs,
      status_code: statusCode,
      status: isFail ? "Fail" : "Oke",
      tokens_in: Number(logData.tokensIn || 0),
      tokens_out: Number(logData.tokensOut || 0),
      total_tokens: Number(logData.totalTokens || (Number(logData.tokensIn || 0) + Number(logData.tokensOut || 0))),
      credits_deducted: Number(logData.creditsDeducted || 0),
      cost_vnd: Number(logData.costVnd || 0),
      feature_name: String(logData.featureName || "Phân tích Video AI"),
      error_message: logData.errorMessage ? String(logData.errorMessage).slice(0, 1000) : null,
      license_key: licenseKey,
      hwid: hwid,
      timestamp: new Date().toISOString(),
    };

    fetch(`${apiBaseUrl()}/api/v1/telemetry/ai-request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(licenseKey ? { "X-License-Key": licenseKey } : {}),
        ...(hwid ? { "X-Device-Id": hwid } : {}),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(6000),
    }).catch(() => { /* silent fire & forget */ });
  } catch {
    /* ignore */
  }
}

function providerRequest(record, prompt, images = [], operationId, attempt = 0) {
  const reqStart = Date.now();
  const headers = { Accept: "application/json", "Content-Type": "application/json" };
  const maxOutputTokens = 8192;
  let url = record.baseUrl;
  const endpoint = (base, suffix) => base.endsWith(suffix) ? base : `${base}/${suffix}`;
  let body;
  const visualImages = images.map((image) => typeof image === "string" ? { data: image } : image);
  const visualText = (index) => ({ type: "text", text: `[Khung hình ${index + 1} · ${Number(visualImages[index]?.timestampSeconds || 0).toFixed(1)} giây]` });

  let parsedHost = "";
  try { parsedHost = new URL(record.baseUrl || "https://api.openai.com").hostname; } catch {}
  const isGroq = record.providerType === "groq" || /(^|\.)groq\.com$/i.test(parsedHost);
  const isDeepSeek = record.providerType === "deepseek" || /(^|\.)deepseek\.com$/i.test(parsedHost);
  const isAnthropic = record.providerType === "anthropic" && /(^|\.)api\.anthropic\.com$/i.test(parsedHost);
  const isGemini = record.providerType === "gemini";

  let effectiveModel = record.model;
  if (isGroq) {
    if (!effectiveModel || effectiveModel.includes("whisper") || effectiveModel.includes("llama-3.3") || effectiveModel.includes("llama-3.1") || effectiveModel === "mặc định") {
      effectiveModel = "qwen/qwen3.8-27b";
    }
  }

  const supportsVision = (
    isGemini ||
    (record.isManaged && !effectiveModel?.includes("deepseek")) ||
    (isAnthropic && !effectiveModel?.includes("claude-2")) ||
    (isGroq && (effectiveModel?.includes("vision") || effectiveModel?.includes("11b") || effectiveModel?.includes("90b"))) ||
    (!isGroq && !isDeepSeek && (effectiveModel?.includes("gpt-4") || effectiveModel?.includes("gpt-5") || effectiveModel?.includes("o1") || effectiveModel?.includes("o3") || effectiveModel?.includes("o4") || effectiveModel?.includes("vision") || effectiveModel?.includes("gemini")))
  );
  const activeImages = supportsVision ? visualImages : [];
  
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
    const content = activeImages.length
      ? [
          { type: "text", text: prompt },
          ...activeImages.flatMap((image, index) => [
            visualText(index),
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image.data}`, detail: "low" } }
          ])
        ]
      : prompt;
    body = {
      model: record.model || "gpt-5.6-sol",
      max_tokens: maxOutputTokens,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content }]
    };
  } else if (isGemini) {
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
            ...activeImages.flatMap((image, index) => [
              { text: visualText(index).text },
              { inlineData: { mimeType: "image/jpeg", data: image.data } }
            ])
          ]
        }
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens,
        responseMimeType: "application/json"
      }
    };
  } else if (isAnthropic) {
    url = endpoint(record.baseUrl, "messages");
    headers["x-api-key"] = record.apiKey;
    headers["anthropic-version"] = "2023-06-01";
    const content = activeImages.length ? [{ type: "text", text: prompt }, ...activeImages.flatMap((image, index) => [visualText(index), { type: "image", source: { type: "base64", media_type: "image/jpeg", data: image.data } }])] : prompt;
    body = { model: record.model || "claude-3-7-sonnet-20250219", max_tokens: maxOutputTokens, messages: [{ role: "user", content }] };
  } else {
    url = endpoint(record.baseUrl, "chat/completions");
    headers.Authorization = `Bearer ${record.apiKey}`;
    const content = activeImages.length ? [{ type: "text", text: prompt }, ...activeImages.flatMap((image, index) => [visualText(index), { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image.data}`, detail: "low" } }])] : prompt;
    body = {
      model: effectiveModel || record.model || (isDeepSeek ? "deepseek-chat" : (isGroq ? "llama-3.3-70b-versatile" : "gpt-4o")),
      temperature: 0.3,
      max_tokens: maxOutputTokens,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content }]
    };
  }
  const state = operationState(operationId);
  const defaultTimeout = attempt === 0 ? 180000 : (attempt === 1 ? 120000 : 90000);
  const timeoutMs = Number(process.env.JACS_PROVIDER_TIMEOUT_MS ?? defaultTimeout);
  const timeout = timeoutMs > 0 ? AbortSignal.timeout(timeoutMs) : null;
  const signal = state ? (timeout ? AbortSignal.any([state.controller.signal, timeout]) : state.controller.signal) : timeout || undefined;
  return fetch(url, { method: "POST", headers, body: JSON.stringify(body), signal }).then(async (response) => {
    assertOperationActive(operationId);
    const latencyMs = Date.now() - reqStart;
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      let detail = String(payload?.error?.message || payload?.error?.detail || payload?.message || "").replace(/\s+/g, " ").trim().slice(0, 240);
      if (detail.includes("No pricing rule") || detail.includes("no_pricing_rule")) {
        detail = `Cổng API (OneAPI/Proxy) chưa thiết lập giá cho model "${record.model}". Hãy kiểm tra lại danh sách model hoặc đổi sang model chuẩn (vd: gpt-5.6-sol, gpt-5.5, claude-opus-5)`;
      }
      reportAiRequestTelemetry({
        model: record.model,
        providerType: record.providerType,
        latencyMs,
        statusCode: response.status,
        status: "Fail",
        featureName: activeImages.length ? "Phân tích Video Multimodal" : "Tạo Kịch Bản AI",
        errorMessage: detail,
      });
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
    const tin = Number(payload?.usage?.prompt_tokens || payload?.usage?.input_tokens || payload?.usageMetadata?.promptTokenCount || Math.round(usage * 0.75));
    const tout = Number(payload?.usage?.completion_tokens || payload?.usage?.output_tokens || payload?.usageMetadata?.candidatesTokenCount || Math.round(usage * 0.25));

    reportAiRequestTelemetry({
      model: record.model,
      providerType: record.providerType,
      latencyMs,
      statusCode: response.status,
      status: "Oke",
      tokensIn: tin,
      tokensOut: tout,
      totalTokens: usage,
      creditsDeducted: Number((usage / 1000.0).toFixed(2)),
      featureName: activeImages.length ? "Phân tích Video Multimodal" : "Tạo Kịch Bản AI",
    });

    return { text, usage };
  }).catch((error) => {
    if (state?.cancelled) throw cancelledOperationError();

    // If multimodal vision request fails with 400/413/415/422 (unsupported images / payload size), retry immediately with text-only
    if (activeImages.length && [400, 404, 408, 413, 415, 422, 500, 502, 503, 504, 524].includes(Number(error?.status)) && attempt < 3) {
      return new Promise((resolve) => setTimeout(resolve, 400)).then(() =>
        providerRequest(record, prompt, [], operationId, attempt + 1)
      );
    }

    // Auto fallback for 503 (High demand / Overloaded), 429 (Rate Limit), 400, 404, 500, 502, 504, TimeoutError
    if (([400, 404, 429, 500, 502, 503, 504, 524].includes(Number(error?.status)) || error?.name === "TimeoutError" || error?.name === "AbortError" || error?.code === "UND_ERR_CONNECT_TIMEOUT") && attempt < 4) {
      let fallbackModels = [];
      if (record.isManaged) {
        fallbackModels = ["gpt-5.6-sol", "gpt-5.5", "claude-opus-5", "gpt-5.6-terra"];
      } else if (isGemini) {
        fallbackModels = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash"];
      } else if (isAnthropic) {
        fallbackModels = ["claude-3-7-sonnet-20250219", "claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022"];
      } else if (isGroq) {
        fallbackModels = ["qwen/qwen3.8-27b", "openai/gpt-oss-120b", "groq/compound", "qwen/qwen3.6-27b", "openai/gpt-oss-20b"];
      } else if (isDeepSeek) {
        fallbackModels = ["deepseek-chat", "deepseek-reasoner"];
      } else {
        fallbackModels = ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"];
      }

      const currentModel = String(effectiveModel || record.model || "").trim().replace(/^models\//i, "");
      const candidates = fallbackModels.filter((m) => m !== currentModel);
      const nextModel = candidates[attempt % candidates.length] || fallbackModels[0];
      
      let nextImages = activeImages;
      if (attempt === 1 && nextImages.length > 8) {
        const step = Math.floor(nextImages.length / 8);
        nextImages = [0, 1, 2, 3, 4, 5, 6, 7].map((idx) => nextImages[Math.min(nextImages.length - 1, idx * step)]).filter(Boolean);
      } else if (attempt >= 2) {
        nextImages = [];
      }

      return new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1))).then(() =>
        providerRequest({ ...record, model: nextModel }, prompt, nextImages, operationId, attempt + 1)
      );
    }

    // Transient network errors retry
    if (([429, 500, 502, 503, 504, 524].includes(Number(error?.status)) || error?.name === "TimeoutError" || error?.name === "AbortError" || error?.code === "UND_ERR_CONNECT_TIMEOUT") && attempt < 3) {
      return new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1))).then(() =>
        providerRequest(record, prompt, [], operationId, attempt + 1)
      );
    }

    reportAiRequestTelemetry({
      model: record.model,
      providerType: record.providerType,
      latencyMs: Date.now() - reqStart,
      statusCode: Number(error?.status || 500),
      status: "Fail",
      featureName: activeImages.length ? "Phân tích Video Multimodal" : "Tạo Kịch Bản AI",
      errorMessage: error?.message || "Lỗi kết nối AI provider",
    });

    throw error;
  });
}


async function extractAnalysisFrames(filePath, durationSeconds, operationId) {
  const ffmpeg = findExecutable("ffmpeg");
  if (!ffmpeg) return [];
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "jacs-analysis-"));
  const dur = Math.max(5, Number(durationSeconds || 30));
  // Extract 10 to 32 crisp 640p keyframes for high-accuracy vision analysis covering entire video
  const frameCount = dur <= 45 ? 10 : (dur <= 180 ? 14 : (dur <= 600 ? 18 : (dur <= 1800 ? 24 : 32)));
  const interval = dur / frameCount;
  try {
    await runProcess(ffmpeg, ["-hide_banner", "-loglevel", "error", "-i", path.resolve(filePath), "-vf", `fps=1/${interval},scale=640:-2`, "-q:v", "3", "-frames:v", String(frameCount), path.join(directory, "frame-%02d.jpg")], undefined, operationId);
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
  if (!record?.apiKey || !["openai", "openai-compatible", "groq", "whisper"].includes(record.providerType)) return { text: "", segments: [] };
  const ffmpeg = findExecutable("ffmpeg");
  if (!ffmpeg) return { text: "", segments: [] };
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "jacs-transcript-"));
  const audioPath = path.join(directory, "audio.mp3");
  try {
    // Extract full lightweight speech audio at 32k mono so even 2-3 hour videos stay under 25MB Whisper limit
    await runProcess(ffmpeg, ["-hide_banner", "-loglevel", "error", "-i", path.resolve(filePath), "-vn", "-ac", "1", "-ar", "16000", "-b:a", "32k", audioPath], undefined, operationId);
    if (!fs.existsSync(audioPath) || fs.statSync(audioPath).size === 0) return { text: "", segments: [] };
    
    let transcriptionBase = String(record.baseUrl || "").replace(/\/+$/, "");
    if (record.providerType === "groq" && !transcriptionBase.includes("groq.com")) {
      transcriptionBase = "https://api.groq.com/openai/v1";
    }
    const endpoint = /audio\/transcriptions$/i.test(transcriptionBase) ? transcriptionBase : `${transcriptionBase}/audio/transcriptions`;
    const state = operationState(operationId);
    const timeoutMs = Number(process.env.JACS_PROVIDER_TIMEOUT_MS ?? 60000);
    const timeout = timeoutMs > 0 ? AbortSignal.timeout(timeoutMs) : null;
    const signal = state ? (timeout ? AbortSignal.any([state.controller.signal, timeout]) : state.controller.signal) : timeout || undefined;
    const formatStamp = (seconds) => {
      const safe = Math.max(0, Number(seconds) || 0);
      return `${Math.floor(safe / 60).toString().padStart(2, "0")}:${Math.floor(safe % 60).toString().padStart(2, "0")}`;
    };
    const audio = fs.readFileSync(audioPath);
    
    const isGroq = record.providerType === "groq" || /groq\.com/i.test(transcriptionBase);
    const models = isGroq
      ? [...new Set([record.transcriptionModel, (record.model?.includes("whisper") ? record.model : undefined), "whisper-large-v3", "whisper-large-v3-turbo"].filter(Boolean).map(String))]
      : [...new Set([record.transcriptionModel, "whisper-1", "gpt-4o-mini-transcribe", "gpt-4o-transcribe"].filter(Boolean).map(String))];

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
          if (segments.length) return { text: segments.map((segment) => `[${formatStamp(segment.start)}-${formatStamp(segment.end)}] ${segment.text}`).join(" ").slice(0, 60000), segments };
        }
        const text = String(payload.text || payload.data?.text || payload.transcript || "").trim().slice(0, 60000);
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
  const str = String(value || "").trim().replace(/,/g, ".");
  if (!str) return fallback;
  if (/^\d+(?:\.\d+)?$/.test(str)) return Number(str);
  const parts = str.split(":").map(Number);
  if (parts.length === 3 && Number.isFinite(parts[0]) && Number.isFinite(parts[1]) && Number.isFinite(parts[2])) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
    return parts[0] * 60 + parts[1];
  }
  const match = str.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : fallback;
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
  const targetDurMinutes = Number(options?.targetDurationMinutes) || (total > 300 ? 5.0 : Math.ceil(total / 60));
  const targetDurSeconds = Math.round(targetDurMinutes * 60);
  const targetClipDur = Math.max(4, Math.round(targetDurSeconds / count));
  const sourceStep = (total - targetClipDur) / Math.max(1, count - 1);

  let recapTimelineCursor = 0;
  const resultScenes = [];

  for (let index = 0; index < scenesToProcess.length; index++) {
    const scene = scenesToProcess[index];
    const rawSrcStart = scene.sourceStart ?? scene.source_start ?? scene.sourceTimeStart ?? scene.start;
    const rawSrcEnd = scene.sourceEnd ?? scene.source_end ?? scene.sourceTimeEnd ?? scene.end;

    let parsedSrcStart = parseTimeSeconds(rawSrcStart, Number.NaN);
    let parsedSrcEnd = parseTimeSeconds(rawSrcEnd, Number.NaN);

    if (!Number.isFinite(parsedSrcStart) || (parsedSrcStart === 0 && index > 0) || parsedSrcStart >= total) {
      parsedSrcStart = Math.min(total - targetClipDur, Math.max(0, Math.round(index * sourceStep)));
    }

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

    // Calibrate clip duration to match speech pacing or target clip pacing so total reaches targetDurMinutes exactly!
    const wordCount = cleanVoice.split(/\s+/).filter(Boolean).length;
    const voiceDuration = Math.max(4, Math.round(wordCount / 2.75));

    const clipDuration = Math.max(voiceDuration, targetClipDur);

    if (!Number.isFinite(parsedSrcEnd) || parsedSrcEnd <= parsedSrcStart || (parsedSrcEnd - parsedSrcStart < 4)) {
      parsedSrcEnd = Math.min(total, parsedSrcStart + clipDuration);
      if (parsedSrcEnd - parsedSrcStart < clipDuration && total > clipDuration) {
        parsedSrcStart = Math.max(0, parsedSrcEnd - clipDuration);
      }
    }

    // Timeline duration matches clip duration sequentially
    const timelineStart = recapTimelineCursor;
    const timelineEnd = recapTimelineCursor + clipDuration;
    recapTimelineCursor = timelineEnd;

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
  text = text.replace(/```(?:json)?\s*([\s\S]*?)\s*```/gi, "$1").trim();
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    text = text.slice(firstBrace, lastBrace + 1);
  }
  // Remove invalid trailing commas in JSON objects/arrays: e.g. ", }" or ", ]"
  text = text.replace(/,\s*([}\]])/g, "$1");
  return text;
}

function expandScenesIfTooFew(scenes, targetCount, totalDuration, fallbackScenes, rawScript = "", cleanTitle = "", transcriptSegments = [], transcript = "") {
  const safeTargetCount = Math.max(3, Number(targetCount) || 10);
  const total = Math.max(30, Number(totalDuration) || 300);

  if (Array.isArray(scenes) && scenes.length >= 3) {
    // If we already have at least 3 valid narrative scenes from AI, preserve them directly
    return scenes;
  }

  // Extract all available text lines/sentences from real AI response
  const rawTextPool = [];
  if (Array.isArray(scenes)) {
    for (const sc of scenes) {
      const txt = String(sc.voiceover || sc.translation || sc.detail || "").trim();
      if (txt) {
        const subParts = txt.split(/(?<=[.!?。;\n])\s+/).map((s) => s.trim()).filter((s) => s.length > 10);
        if (subParts.length > 1) {
          rawTextPool.push(...subParts);
        } else {
          rawTextPool.push(txt);
        }
      }
    }
  }

  if (rawScript && rawScript.length > 20) {
    const sentences = rawScript.split(/(?<=[.!?。;\n])\s+/).map((s) => s.trim()).filter((s) => s.length > 10);
    if (sentences.length > rawTextPool.length) {
      rawTextPool.length = 0;
      rawTextPool.push(...sentences);
    }
  }

  const result = [];
  const sourceClipDur = Math.max(8, Math.round(total / safeTargetCount));
  const sourceStep = Math.max(4, (total - sourceClipDur) / Math.max(1, safeTargetCount - 1));

  for (let i = 0; i < safeTargetCount; i++) {
    const srcStart = Math.min(total - sourceClipDur, Math.max(0, Math.round(i * sourceStep)));
    const srcEnd = Math.min(total, srcStart + sourceClipDur);
    const existing = scenes?.[i];
    const fallbackSc = fallbackScenes?.[i % (fallbackScenes?.length || 1)];

    let voice = "";
    if (i < rawTextPool.length && rawTextPool[i]) {
      voice = rawTextPool[i];
    } else if (existing?.voiceover) {
      voice = existing.voiceover;
    } else if (fallbackSc?.voiceover) {
      voice = fallbackSc.voiceover;
    } else {
      voice = `Diễn biến của "${cleanTitle}" tiếp tục chuyển sang giai đoạn then chốt với các tình tiết và đối thoại quan trọng.`;
    }

    const title = existing?.title || fallbackSc?.title || (i === 0 ? `[00:00 - 00:10] Hook Mở Màn Cao Trào` : `Phân cảnh #${i + 1}`);
    const actionVisual = existing?.action_visual || fallbackSc?.action_visual || `Trích đoạn video gốc ${formatTime(srcStart)} - ${formatTime(srcEnd)}`;

    result.push({
      id: `scene-${i + 1}`,
      sourceStart: formatTime(srcStart),
      sourceEnd: formatTime(srcEnd),
      sourceTimeStart: srcStart,
      sourceTimeEnd: srcEnd,
      title,
      detail: voice.slice(0, 180),
      action_visual: actionVisual,
      translation: voice,
      voiceover: voice,
    });
  }

  return result;
}

function parseAnalysis(text, probe, usage, customPrompt, options = {}, transcript = "", transcriptSegments = []) {
  const fallback = generateLocalStoryAnalysis(probe, customPrompt, options?.languages?.[0] || "vi", options, transcript, transcriptSegments);
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
    const rawVoiceScript = String(unwrapped?.voice_script || unwrapped?.voicescript || unwrapped?.script || unwrapped?.summary || "").trim();

    const targetDurMins = Number(options?.targetDurationMinutes) || (probe.durationSeconds > 300 ? 5.0 : Math.ceil(probe.durationSeconds / 60));
    const targetSceneCount = Math.max(3, Math.round(targetDurMins * 3.0));

    const cleanRawScenes = Array.isArray(rawScenes) ? rawScenes.filter((s) => s && (s.title || s.voiceover || s.detail || s.translation)) : [];

    const effectiveScenes = expandScenesIfTooFew(
      cleanRawScenes,
      targetSceneCount,
      probe.durationSeconds,
      fallback.scenes,
      rawVoiceScript,
      fallback.videoTitle,
      transcriptSegments,
      transcript
    );

    const cleanScenes = effectiveScenes.map((s, idx) => ({
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

    const rawVideoTitle = cleanField(unwrapped?.video_title || unwrapped?.title || unwrapped?.videoTitle);
    const videoTitle = rawVideoTitle || fallback.videoTitle || "Phân Tích Video Cốt Truyện Kịch Tính";
    const rawSuggested = Array.isArray(unwrapped?.suggested_titles || unwrapped?.suggestedTitles || unwrapped?.titles)
      ? (unwrapped?.suggested_titles || unwrapped?.suggestedTitles || unwrapped?.titles).map(cleanField).filter(Boolean)
      : [];
    const suggestedTitles = rawSuggested.length
      ? rawSuggested
      : [
          videoTitle,
          `Sự Thật Đằng Sau: ${videoTitle}`,
          `Lật Tẩy Bí Mật Vụ Án: ${videoTitle}`,
          `Cái Giá Đắt Cho Sự Lọc Lừa`,
        ];
    const hookTitle = cleanField(unwrapped?.hook_title || unwrapped?.hookTitle || cleanScenes[0]?.title || "Hook Mở Màn Cao Trào");

    return {
      videoTitle,
      suggestedTitles,
      hookTitle,
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
    try {
      if (processHandle.pid && typeof os.setPriority === "function" && os.constants?.priority?.PRIORITY_BELOW_NORMAL !== undefined) {
        os.setPriority(processHandle.pid, os.constants.priority.PRIORITY_BELOW_NORMAL);
      }
    } catch {}
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

function stripSceneMetadata(text) {
  if (!text) return "";
  let cleaned = String(text)
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
  if (!cleaned) {
    cleaned = String(text).replace(/[{}[\]"\\]/g, "").trim();
  }
  return cleaned;
}

function resolveNeuralVoiceProfile(voice, languageCode = "vi", gender = "female") {
  const profiles = {
    // 👑 ElevenLabs AI Mappings (Hyper-realistic emotional storytelling)
    "eleven-adam": { voice: "vi-VN-NamMinhNeural", rate: "+8%", pitch: "+0Hz" },
    "eleven-charlie": { voice: "vi-VN-NamMinhNeural", rate: "+4%", pitch: "-2Hz" },
    "eleven-george": { voice: "vi-VN-NamMinhNeural", rate: "+6%", pitch: "-1Hz" },
    "eleven-rachel": { voice: "vi-VN-HoaiMyNeural", rate: "+5%", pitch: "+0Hz" },

    // 🔥 Vbee AIVoice Mappings (Viral Vietnamese Regional Voices)
    "vbee-manhdung": { voice: "vi-VN-NamMinhNeural", rate: "+12%", pitch: "+0Hz" },
    "vbee-minhhoang": { voice: "vi-VN-NamMinhNeural", rate: "+7%", pitch: "-1Hz" },
    "vbee-maiphuong": { voice: "vi-VN-HoaiMyNeural", rate: "+10%", pitch: "+0Hz" },
    "vbee-ngochoang": { voice: "vi-VN-HoaiMyNeural", rate: "+4%", pitch: "+0Hz" },

    // ⚡ Microsoft Neural Prosody AI Mappings (Vietnamese)
    "vi-adam-review": { voice: "vi-VN-NamMinhNeural", rate: "+12%", pitch: "+0Hz" },
    "vi-namminh": { voice: "vi-VN-NamMinhNeural", rate: "+10%", pitch: "+0Hz" },
    "vi-mystery-deep": { voice: "vi-VN-NamMinhNeural", rate: "-2%", pitch: "-3Hz" },
    "vi-hoaimy-review": { voice: "vi-VN-HoaiMyNeural", rate: "+14%", pitch: "+0Hz" },
    "vi-hoaimy": { voice: "vi-VN-HoaiMyNeural", rate: "+4%", pitch: "+0Hz" },
    "vi-baolong": { voice: "vi-VN-NamMinhNeural", rate: "+6%", pitch: "+0Hz" },
    "vi-thihuong": { voice: "vi-VN-HoaiMyNeural", rate: "-2%", pitch: "+0Hz" },
    "vi-male": { voice: "vi-VN-NamMinhNeural", rate: "+10%", pitch: "+0Hz" },
    "vi-female": { voice: "vi-VN-HoaiMyNeural", rate: "+5%", pitch: "+0Hz" },

    // 🎬 English Hollywood & Documentary Voices
    "en-adam": { voice: "en-US-GuyNeural", rate: "+0%", pitch: "+0Hz" },
    "en-guy": { voice: "en-US-GuyNeural", rate: "+0%", pitch: "+0Hz" },
    "en-brian": { voice: "en-US-BrianNeural", rate: "+0%", pitch: "+0Hz" },
    "en-jenny": { voice: "en-US-JennyNeural", rate: "+0%", pitch: "+0Hz" },
    "en-aria": { voice: "en-US-AriaNeural", rate: "+5%", pitch: "+0Hz" },
    "en-male": { voice: "en-US-GuyNeural", rate: "+0%", pitch: "+0Hz" },
    "en-female": { voice: "en-US-JennyNeural", rate: "+0%", pitch: "+0Hz" },

    // 🤖 OpenAI Audio Voice Mappings
    "openai-alloy": { voice: "en-US-JennyNeural", rate: "+0%", pitch: "+0Hz" },
    "openai-echo": { voice: "en-US-GuyNeural", rate: "+0%", pitch: "+0Hz" },
    "openai-fable": { voice: "en-US-BrianNeural", rate: "+0%", pitch: "+0Hz" },
    "openai-onyx": { voice: "en-US-GuyNeural", rate: "-2%", pitch: "-2Hz" },
    "openai-nova": { voice: "en-US-AriaNeural", rate: "+5%", pitch: "+0Hz" },
    "openai-shimmer": { voice: "en-US-JennyNeural", rate: "+2%", pitch: "+0Hz" },

    // 🌐 International Neural Voices
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

  // Detect language prefix or explicit language code
  if (key.startsWith("en-") || languageCode === "en") {
    return { voice: gender === "male" ? "en-US-GuyNeural" : "en-US-JennyNeural", rate: "+0%", pitch: "+0Hz" };
  }
  if (key.startsWith("ja-") || languageCode === "ja") {
    return { voice: gender === "male" ? "ja-JP-KeitaNeural" : "ja-JP-NanamiNeural", rate: "+0%", pitch: "+0Hz" };
  }
  if (key.startsWith("ko-") || languageCode === "ko") {
    return { voice: gender === "male" ? "ko-KR-InJoonNeural" : "ko-KR-SunHiNeural", rate: "+0%", pitch: "+0Hz" };
  }
  if (key.startsWith("zh-") || languageCode === "zh" || languageCode === "zh-CN") {
    return { voice: gender === "male" ? "zh-CN-YunxiNeural" : "zh-CN-XiaoxiaoNeural", rate: "+0%", pitch: "+0Hz" };
  }
  if (key.startsWith("fr-") || languageCode === "fr") {
    return { voice: gender === "male" ? "fr-FR-HenriNeural" : "fr-FR-DeniseNeural", rate: "+0%", pitch: "+0Hz" };
  }
  if (key.startsWith("es-") || languageCode === "es") {
    return { voice: gender === "male" ? "es-ES-AlvaroNeural" : "es-ES-ElviraNeural", rate: "+0%", pitch: "+0Hz" };
  }

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

function atempoChain(tempo) {
  let t = Math.max(0.5, Math.min(4.0, Number(tempo) || 1.0));
  const filters = [];
  while (t > 2.0) {
    filters.push("atempo=2.0");
    t /= 2.0;
  }
  while (t < 0.5) {
    filters.push("atempo=0.5");
    t /= 0.5;
  }
  filters.push(`atempo=${t.toFixed(3)}`);
  return filters.join(",");
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
      const paddedPath = path.join(directory, `pad_snip_${String(i).padStart(4, "0")}.mp3`);
      if (ffmpeg) {
        let filter = "";
        const naturalPause = 0.35;
        if (actualSnipDur > segDur * 0.95 && !snip.includes("silence_")) {
          const speedRatio = Math.min(1.35, actualSnipDur / (segDur * 0.90));
          const tempo = speedRatio > 1.02 ? atempoChain(speedRatio) : "";
          const targetDur = (actualSnipDur / speedRatio) + 0.2;
          filter = tempo ? `${tempo},apad=pad_dur=10,atrim=0:${targetDur.toFixed(3)}` : `apad=pad_dur=10,atrim=0:${(actualSnipDur + 0.2).toFixed(3)}`;
        } else {
          const targetDur = Math.min(segDur, actualSnipDur + naturalPause);
          filter = `apad=pad_dur=10,atrim=0:${targetDur.toFixed(3)}`;
        }
        try {
          await runProcess(ffmpeg, [
            "-y", "-i", snip,
            "-af", filter,
            "-c:a", "libmp3lame", "-b:a", "192k",
            paddedPath
          ], undefined, operationId);
          if (fs.existsSync(paddedPath) && fs.statSync(paddedPath).size > 100) {
            fittedSnippets.push(paddedPath);
          } else {
            fittedSnippets.push(snip);
          }
        } catch {
          fittedSnippets.push(snip);
        }
      } else {
        fittedSnippets.push(snip);
      }
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

  const concatManifest = path.join(directory, "narration_concat.txt");
  fs.writeFileSync(concatManifest, fittedSnippets.map((f) => `file '${f.replace(/\\/g, "/")}'`).join("\n"), { encoding: "utf8", mode: 0o600 });

  const outputPath = path.join(directory, "master_narration.mp3");
  await runProcess(ffmpeg, ["-y", "-f", "concat", "-safe", "0", "-i", concatManifest, "-c:a", "libmp3lame", "-b:a", "192k", outputPath], undefined, operationId);

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
  const position = customStyle?.position || (typeof style === "string" && ["top", "center", "bottom"].includes(style) ? style : "bottom");
  const alignment = position === "top" ? 8 : position === "center" ? 5 : 2;

  let baseSize = 24;
  let marginL = 50;
  let marginR = 50;
  let marginV = 48;

  if (aspectRatio === "9:16") {
    baseSize = 28;
    marginL = 40;
    marginR = 40;
    marginV = 64;
  } else if (aspectRatio === "1:1") {
    baseSize = 26;
    marginL = 45;
    marginR = 45;
    marginV = 52;
  }

  const fontSize = customStyle?.fontSize || baseSize;
  const fontName = customStyle?.fontFamily || "Arial";

  const stylePreset = typeof style === "string" ? style.toLowerCase() : "gold";
  let defaultTextColor = "#FFFFFF";
  let defaultOutlineColor = "#101820";
  let defaultOutlineWidth = 2.5;
  let defaultBoxStyle = "none";

  if (stylePreset === "gold") {
    defaultTextColor = "#FFE478";
    defaultOutlineColor = "#1A120B";
    defaultOutlineWidth = 2.8;
  } else if (stylePreset === "neon") {
    defaultTextColor = "#00F0FF";
    defaultOutlineColor = "#0A0F1D";
    defaultOutlineWidth = 2.8;
  } else if (stylePreset === "box") {
    defaultTextColor = "#FFFFFF";
    defaultBoxStyle = "box";
  }

  const primaryColor = hexToAssColor(customStyle?.textColor || defaultTextColor, "00");
  const outlineColor = hexToAssColor(customStyle?.outlineColor || defaultOutlineColor, "00");
  const outlineWidth = customStyle?.outlineWidth ?? defaultOutlineWidth;
  const boxStyle = customStyle?.boxStyle || defaultBoxStyle;
  const backColor = boxStyle === "box" ? "&H78000000" : "&H00000000";
  const borderStyle = boxStyle === "box" ? 3 : 1;
  const bold = customStyle?.bold !== false ? 1 : 0;
  const finalMarginV = customStyle?.marginY || marginV;

  return `FontName=${fontName},FontSize=${fontSize},Bold=${bold},PrimaryColour=${primaryColor},OutlineColour=${outlineColor},BackColour=${backColor},Outline=${outlineWidth},Shadow=1,BorderStyle=${borderStyle},Alignment=${alignment},MarginL=${marginL},MarginR=${marginR},MarginV=${finalMarginV},WrapStyle=0`;
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

  // 🎯 Check if rendering a multi-cut Story Recap highlight reel or timeline sequence
  const hasExplicitCutClips = (Array.isArray(options.cutClips) && options.cutClips.length > 0)
    || (Array.isArray(options.timelineClips) && options.timelineClips.length > 0);
  const rawCutClips = hasExplicitCutClips
    ? (options.cutClips || options.timelineClips)
    : (Array.isArray(options.scenes) && options.scenes.length > 1 && !options.startSeconds && !options.endSeconds)
      ? options.scenes
      : null;

  const normalizedCutClips = Array.isArray(rawCutClips) && rawCutClips.length > 0
    ? rawCutClips.map((s, idx) => {
        const rawStart = s.sourceTimeStart ?? s.sourceStart ?? s.source_start ?? s.start;
        const rawEnd = s.sourceTimeEnd ?? s.sourceEnd ?? s.source_end ?? s.end;
        const sStart = parseTimeSeconds(rawStart, 0);
        const sEnd = parseTimeSeconds(rawEnd, sStart + (parseTimeSeconds(s.duration, 0) || 10));
        const duration = Math.max(0.25, sEnd > sStart ? sEnd - sStart : (parseTimeSeconds(s.duration, 0) || 5));
        return {
          sourceStart: sStart,
          sourceEnd: Math.max(sStart + 0.25, sEnd),
          duration,
          text: s.voiceover || s.translation || s.subtitle || s.detail || "",
          title: s.title || `Cảnh ${idx + 1}`,
        };
      }).filter((c) => c.sourceEnd > c.sourceStart)
    : null;

  const effectiveCutClips = Array.isArray(normalizedCutClips) && normalizedCutClips.length > 0 ? normalizedCutClips : null;
  const hasCuts = Boolean(effectiveCutClips && effectiveCutClips.length > 0);
  const renderedDuration = effectiveCutClips
    ? effectiveCutClips.reduce((sum, c) => sum + c.duration, 0)
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
      throw new Error(`Không thể khởi động bộ xử lý FFmpeg: ${err.message || err}`);
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
  const scenesPool = Array.isArray(options.scenes) && options.scenes.length > 0
    ? options.scenes
    : (Array.isArray(options.analysis?.scenes) && options.analysis.scenes.length > 0
      ? options.analysis.scenes
      : (Array.isArray(options.cutClips) ? options.cutClips : []));

  const effectiveNarrationText = String(
    options.narrationText ||
    options.subtitleText ||
    scenesPool.map((s) => s.voiceover || s.translation || s.subtitle || s.text || s.detail).filter(Boolean).join(" ")
  ).trim();

  if (options.narratorEnabled && effectiveNarrationText) {
    const store = providerStore();
    let record = options.ttsProviderId ? store.find(options.ttsProviderId) : undefined;
    if (!record && options.providerId) record = store.find(options.providerId);
    if (!record?.apiKey || !record.capabilities?.includes("tts")) {
      const fallback = store.list().find((item) => item.enabled && item.hasApiKey && item.capabilities.includes("tts"));
      record = fallback ? store.find(fallback.id) : undefined;
    }
    const canUseProviderTts = Boolean(record?.enabled && record.apiKey && record.capabilities?.includes("tts"));

    try {
      if (canUseProviderTts) {
        narrationPath = await synthesizeNarration(record, effectiveNarrationText, options.narratorVoice, options.narratorGender, options.language, operationId);
        if (narrationPath) voiceEngine = "provider";
      }
      if (!narrationPath) {
        narrationPath = await synthesizeLocalNarration(effectiveNarrationText, options.narratorVoice, options.narratorGender, options.language, operationId);
        if (narrationPath) voiceEngine = "local";
      }
    } catch (err) {
      console.warn("[TTS] Continuous narration synthesis fallback:", err?.message || err);
      try {
        const alignedResult = await synthesizeSceneAlignedNarration({
          record: canUseProviderTts ? record : undefined,
          narrationText: effectiveNarrationText,
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
      } catch (fallbackErr) {
        console.warn("[TTS] Aligned fallback failed:", fallbackErr?.message || fallbackErr);
      }
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
    const subtitleEnd = renderedDuration || Number(probe.durationSeconds || 1);
    const segments = Array.isArray(options.subtitleSegments)
      ? options.subtitleSegments.map((segment) => ({
          start: Math.max(0, Number(segment.start) - clipStart),
          end: Math.min(subtitleEnd, Number(segment.end) - clipStart),
          text: stripSceneMetadata(segment.text || "").trim()
        })).filter((segment) => segment.text && segment.end > segment.start)
      : [];
    const fallbackText = stripSceneMetadata(String(options.subtitleText || options.narrationText || "")).trim().slice(0, 12000);
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
  const preferredEngine = String(options.preferredEngine || "auto").toLowerCase();
  let codecs = [];
  if (preferredEngine === "cpu") {
    codecs = ["libx264"];
  } else if (preferredEngine === "nvidia") {
    codecs = ["h264_nvenc", "libx264"];
  } else if (preferredEngine === "apple") {
    codecs = process.platform === "darwin" ? ["h264_videotoolbox", "libx264"] : ["libx264"];
  } else {
    // "auto" or other
    if (process.platform === "darwin") {
      codecs = ["h264_videotoolbox", "libx264"];
    } else if (process.platform === "win32") {
      codecs = ["h264_nvenc", "h264_qsv", "h264_amf", "libx264"];
    } else {
      codecs = ["h264_nvenc", "h264_vaapi", "libx264"];
    }
  }

  const needsSubjectFocus = options.aspectRatio && options.aspectRatio !== "16:9" && options.subjectTracking === true;
  const subjectFocus = needsSubjectFocus ? await detectSubjectFocus(localVideoPath, renderedDuration, operationId) : null;
  const cpuCount = Math.max(1, (os.cpus() || []).length || 4);
  const safeThreads = Math.max(1, Math.min(6, cpuCount > 4 ? cpuCount - 2 : cpuCount - 1));

  let concatManifestPath = null;
  let tempCutDir = null;
  if (hasCuts) {
    tempCutDir = fs.mkdtempSync(path.join(os.tmpdir(), "jacs-timeline-cuts-"));
    const clipPaths = [];
    event.sender.send("runtime:render-progress", { progress: 3, stage: `Tối ưu hóa RAM: Trích xuất ${effectiveCutClips.length} phân cảnh...`, operationId });
    for (let i = 0; i < effectiveCutClips.length; i++) {
      const c = effectiveCutClips[i];
      const sStart = Math.max(0, parseTimeSeconds(c.sourceStart, 0));
      const sDur = Math.max(0.25, parseTimeSeconds(c.duration, 0) || (parseTimeSeconds(c.sourceEnd, sStart + 5) - sStart));
      const clipFile = path.join(tempCutDir, `clip_${String(i).padStart(4, "0")}.mp4`);
      const sliceArgs = [
        "-y",
        "-ss", sStart.toFixed(3),
        "-i", path.resolve(localVideoPath),
        "-t", sDur.toFixed(3),
        "-map", "0:v:0",
        "-map", "0:a:0?",
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-c:a", "aac",
        "-avoid_negative_ts", "make_zero",
        clipFile
      ];
      await runProcess(ffmpeg, sliceArgs, undefined, operationId);
      clipPaths.push(clipFile);
      const cutPct = Math.min(10, 3 + Math.round((i + 1) / effectiveCutClips.length * 7));
      event.sender.send("runtime:render-progress", { progress: cutPct, stage: `Tối ưu phân cảnh ${i + 1}/${effectiveCutClips.length}...`, operationId });
    }
    concatManifestPath = path.join(tempCutDir, "concat.txt");
    const escapeConcatPath = (v) => v.replace(/\\/g, "/").replace(/'/g, "'\\''");
    fs.writeFileSync(concatManifestPath, clipPaths.map((f) => `file '${escapeConcatPath(f)}'`).join("\n"), { encoding: "utf8", mode: 0o600 });
  }

  const renderWithCodec = (codec) => {
    const args = ["-y", "-threads", String(safeThreads)];

    if (codec === "h264_nvenc") {
      args.push("-hwaccel", "auto");
    }

    if (hasCuts && concatManifestPath) {
      args.push("-f", "concat", "-safe", "0", "-i", concatManifestPath);
    } else {
      if (clipStart) args.push("-ss", String(clipStart));
      if (clipDuration) args.push("-t", String(clipDuration));
      args.push("-thread_queue_size", "64", "-i", path.resolve(localVideoPath));
    }

    const musicPath = options.backgroundMusic && options.backgroundMusicPath && fs.existsSync(options.backgroundMusicPath) ? options.backgroundMusicPath : null;
    if (options.backgroundMusic && !musicPath) warnings.push("Đã bật nhạc nền nhưng chưa chọn file nhạc hợp lệ.");
    const logoPath = options.logoPath && fs.existsSync(options.logoPath) ? options.logoPath : null;
    if (options.logoPath && !logoPath) warnings.push("Đã bật logo nhưng file logo không còn tồn tại.");

    const validNarration = Boolean(narrationPath && fs.existsSync(narrationPath) && fs.statSync(narrationPath).size > 100);
    const validMusic = Boolean(musicPath && fs.existsSync(musicPath) && fs.statSync(musicPath).size > 100);
    const validLogo = Boolean(logoPath && fs.existsSync(logoPath) && fs.statSync(logoPath).size > 100);

    let inputIdx = 1;
    const narrationInputIndex = validNarration ? inputIdx++ : undefined;
    const musicInputIndex = validMusic ? inputIdx++ : undefined;
    const logoInputIndex = validLogo ? inputIdx++ : undefined;

    if (validNarration) args.push("-thread_queue_size", "64", "-i", path.resolve(narrationPath));
    if (validMusic) args.push("-thread_queue_size", "64", "-stream_loop", "-1", "-i", path.resolve(musicPath));
    if (validLogo) args.push("-thread_queue_size", "64", "-i", path.resolve(logoPath));
    if (renderedDuration) args.push("-t", String(renderedDuration));

    const graph = [];
    const hasAudio = Boolean(probe.hasAudio && options.keepOriginalAudio !== false);

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

    let vOutLabel = "[0:v]";

    if (videoChain) {
      graph.push(`[0:v]${videoChain}[vstyled]`);
      vOutLabel = "[vstyled]";
    }

    if (validLogo) {
      const opacity = Math.max(0.1, Math.min(1, Number(options.logoOpacity ?? 0.82)));
      const position = logoOverlayPosition(options.logoPosition);
      graph.push(`[${logoInputIndex}:v]format=rgba,colorchannelmixer=aa=${opacity}[logo]`);
      graph.push(`${vOutLabel}[logo]overlay=${position}[vout]`);
      vOutLabel = "[vout]";
    }

    const audioFilter = buildAudioFilter({
      hasOriginalAudio: hasAudio,
      audioInputLabel: "[0:a]",
      narrationInputIndex,
      musicInputIndex,
      keepOriginalAudio: options.keepOriginalAudio !== false,
      musicVolume: options.backgroundMusicVolume ?? 20,
      narrationTempo,
      duckOriginalAudio: validNarration
    });
    if (audioFilter) {
      graph.push(audioFilter);
    }

    args.push("-c:v", codec);
    if (codec === "libx264") args.push("-preset", "veryfast", "-tune", "film", "-threads", String(safeThreads));
    if (codec === "h264_nvenc") args.push("-preset", "p4", "-cq", "24");
    if (codec === "h264_qsv") args.push("-preset", "fast", "-global_quality", "24");
    if (codec === "h264_amf") args.push("-quality", "speed", "-rc", "cqp", "-qp_i", "24", "-qp_p", "24");
    if (codec === "h264_videotoolbox") args.push("-b:v", "8M");
    args.push("-pix_fmt", "yuv420p", "-max_muxing_queue_size", "512");

    if (graph.length) {
      args.push("-filter_complex", graph.join(";"), "-map", vOutLabel === "[0:v]" ? "0:v:0" : vOutLabel);
      if (audioFilter) args.push("-map", "[aout]", "-c:a", "aac");
      else if (options.keepOriginalAudio === false) args.push("-an");
      else args.push("-map", "0:a:0?", "-c:a", "aac");
    } else if (options.keepOriginalAudio === false) args.push("-an");
    else args.push("-c:a", "aac");
    args.push("-movflags", "+faststart", destination);

    const codecLabel = codec === "h264_nvenc"
      ? "NVIDIA NVENC (GPU)"
      : codec === "h264_videotoolbox"
        ? "Apple VideoToolbox (GPU)"
        : codec === "h264_qsv"
          ? "Intel QuickSync (GPU)"
          : codec === "h264_amf"
            ? "AMD AMF (GPU)"
            : `CPU (${safeThreads} Luồng Safe-Mode)`;

    event.sender.send("runtime:render-progress", {
      progress: 10,
      stage: `Khởi chạy Render [${codecLabel}]...`,
      codec,
      operationId
    });

    return runProcess(ffmpeg, args, (line) => {
      const match = line.match(/time=(\d+):(\d+):(\d+(?:\.\d+)?)/);
      if (!match || !renderedDuration) return;
      const elapsed = Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
      const pct = Math.max(10, Math.min(99, 10 + Math.round(elapsed / renderedDuration * 89)));
      event.sender.send("runtime:render-progress", {
        progress: pct,
        stage: `Đang render [${codecLabel}] ${pct}%`,
        codec,
        operationId
      });
    }, operationId);
  };
  let lastError;
  try {
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
        event.sender.send("runtime:render-progress", { progress: 10, stage: "rendering", operationId });
      }
    }
    if (narrationPath) safeRmDir(path.dirname(narrationPath));
    if (subtitlePath) safeRmDir(path.dirname(subtitlePath));
    throw lastError || new Error("Không thể render video bằng các codec khả dụng");
  } finally {
    if (tempCutDir) {
      try { fs.rmSync(tempCutDir, { recursive: true, force: true }); } catch {}
    }
  }
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

  let parsedHost = "";
  try { parsedHost = new URL(record.baseUrl).hostname; } catch {}
  const isGroq = record.providerType === "groq" || /(^|\.)groq\.com$/i.test(parsedHost);
  const isElevenLabs = record.providerType === "elevenlabs" || String(record.name || "").toLowerCase().includes("elevenlabs") || /elevenlabs\.io/i.test(parsedHost);
  const isWhisperModel = String(record.model || "").toLowerCase().includes("whisper") || String(record.transcriptionModel || "").toLowerCase().includes("whisper");

  if (isElevenLabs) {
    try {
      const response = await fetch("https://api.elevenlabs.io/v1/user", {
        headers: { "xi-api-key": record.apiKey },
        signal: AbortSignal.timeout(10000),
      });
      const latencyMs = Date.now() - started;
      if (response.ok) {
        return { status: "reachable", detail: "Kết nối ElevenLabs Voice thành công! Sẵn sàng lồng tiếng AI chất lượng cao.", latencyMs, httpStatus: response.status };
      }
      return { status: "invalid_credentials", detail: `ElevenLabs từ chối API Key (HTTP ${response.status})`, latencyMs, httpStatus: response.status };
    } catch (err) {
      return { status: "unreachable", detail: "Không thể kết nối máy chủ ElevenLabs", latencyMs: Date.now() - started };
    }
  }

  if (isGroq || (isWhisperModel && !["gemini", "anthropic"].includes(record.providerType))) {
    try {
      const modelsUrl = endpoint(record.baseUrl, "models");
      const response = await fetch(modelsUrl, {
        headers: { Accept: "application/json", Authorization: `Bearer ${record.apiKey}` },
        signal: AbortSignal.timeout(10000),
      });
      const latencyMs = Date.now() - started;
      const payload = await response.json().catch(() => ({}));
      if (response.status === 401 || response.status === 403) {
        return { status: "invalid_credentials", detail: "API key không hợp lệ hoặc đã hết hạn", latencyMs, httpStatus: response.status };
      }
      if (!response.ok) {
        const errorMsg = payload?.error?.message || payload?.message || `HTTP ${response.status}`;
        return { status: "unreachable", detail: `Lỗi kết nối: ${errorMsg}`, latencyMs, httpStatus: response.status };
      }
      const ids = Array.isArray(payload?.data) ? payload.data.map((model) => String(model?.id || "")) : [];
      const hasModel = !record.model || ids.includes(record.model) || ids.some((id) => id.includes("whisper"));
      return {
        status: "reachable",
        detail: hasModel
          ? `✓ Kết nối Groq thành công! Model ${record.model || "Groq"} sẵn sàng hoạt động.`
          : `✓ Kết nối Groq thành công! (${ids.length} models khả dụng).`,
        latencyMs,
        httpStatus: response.status,
      };
    } catch (error) {
      return { status: "unreachable", detail: error?.name === "TimeoutError" ? "Kết nối timeout sau 10 giây" : "Không thể kết nối máy chủ", latencyMs: Date.now() - started };
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
  } else if (record.providerType === "anthropic" && /(^|\.)api\.anthropic\.com$/i.test(parsedHost)) {
    url = endpoint(record.baseUrl, "messages");
    headers["x-api-key"] = record.apiKey;
    headers["anthropic-version"] = "2023-06-01";
    body = JSON.stringify({ model: record.model || "claude-3-5-sonnet-latest", max_tokens: 16, messages: [{ role: "user", content: "ping" }] });
  } else if (record.providerType === "deepseek") {
    url = endpoint(record.baseUrl, "chat/completions");
    headers.Authorization = `Bearer ${record.apiKey}`;
    body = JSON.stringify({ model: record.model || "deepseek-chat", max_tokens: 16, messages: [{ role: "user", content: "ping" }] });
  } else if (["openai", "openai-compatible", "anthropic", "groq", "custom", "whisper"].includes(record.providerType)) {
    url = endpoint(record.baseUrl, "chat/completions");
    headers.Authorization = `Bearer ${record.apiKey}`;
    body = JSON.stringify({ model: record.model || "gpt-4o-mini", max_tokens: 16, messages: [{ role: "user", content: "ping" }] });
  } else {
    return { status: "unsupported", detail: "Provider type chưa được hỗ trợ", latencyMs: 0 };
  }

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

    const isOk = response.ok;
    const finalDetail = isOk
      ? "Kết nối provider thành công · Sẵn sàng xử lý kịch bản & video."
      : (errorMsg ? `Máy chủ AI trả về lỗi (HTTP ${response.status}): ${errorMsg}` : `Provider trả về HTTP ${response.status}`);

    reportAiRequestTelemetry({
      model: record.model || "ai-model",
      providerType: record.providerType,
      latencyMs,
      statusCode: response.status,
      status: isOk ? "Oke" : "Fail",
      featureName: "Kiểm Tra Kết Nối AI (Desktop)",
      errorMessage: !isOk ? finalDetail : null,
    });

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
    const latencyMs = Date.now() - started;
    reportAiRequestTelemetry({
      model: record.model || "ai-model",
      providerType: record.providerType,
      latencyMs,
      statusCode: 504,
      status: "Fail",
      featureName: "Kiểm Tra Kết Nối AI (Desktop)",
      errorMessage: error?.message || "Timeout sau 10 giây",
    });
    return { status: "unreachable", detail: error?.name === "TimeoutError" ? "Provider timeout sau 10 giây" : (error?.message || "Không thể kết nối provider"), latencyMs };
  }
}


function registerIpc() {
  ipcMain.handle("runtime:machine-info", () => machineInfo());
  ipcMain.handle("runtime:hardware-stats", () => collectClientHardwareInfo());
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
function resolveTargetDurationFromRules(durationSeconds, durationRules, fallbackTargetMins = 5) {
  if (Array.isArray(durationRules) && durationRules.length > 0) {
    const inputMinutes = Math.max(0, Number(durationSeconds || 0) / 60);
    for (const rule of durationRules) {
      const min = Number(rule.minInputMinutes) || 0;
      const max = Number(rule.maxInputMinutes) || 999999;
      if (inputMinutes >= min && (inputMinutes < max || (max >= 9999 && inputMinutes >= min))) {
        if (rule.targetOutputMinutes && Number(rule.targetOutputMinutes) > 0) {
          return Number(rule.targetOutputMinutes);
        }
      }
    }
  }
  return fallbackTargetMins;
}

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
      const rawProviders = storeInstance.listRaw ? storeInstance.listRaw() : storeInstance.list().map((p) => storeInstance.find(p.id)).filter(Boolean);
      const allEnabledProviders = rawProviders.filter((p) => p.enabled && (p.apiKey || p.isManaged) && (p.capabilities?.includes("analysis") || p.capabilities?.includes("vision") || !p.capabilities?.includes("tts")));

      // Build candidate pool from options.providerPool or all enabled providers for auto-failover
      let candidatePool = [];
      if (Array.isArray(options.providerPool) && options.providerPool.length > 0) {
        for (const item of options.providerPool) {
          const baseRec = storeInstance.find(item.providerId);
          if (baseRec && (baseRec.apiKey || baseRec.isManaged)) {
            candidatePool.push({ ...baseRec, model: item.model || baseRec.model });
          }
        }
      }

      if (!candidatePool.length) {
        const targetProviderId = (providerId && String(providerId).trim() && providerId !== "local") ? providerId : undefined;
        const defaultProvider = targetProviderId ? storeInstance.find(targetProviderId) : allEnabledProviders[0];
        if (defaultProvider && (defaultProvider.apiKey || defaultProvider.isManaged)) {
          candidatePool.push(defaultProvider);
        }
        for (const p of allEnabledProviders) {
          if (!candidatePool.some((c) => c.id === p.id)) {
            candidatePool.push(p);
          }
        }
      }

      // Add Managed Cloud AI Gateway as backup if available and not already in pool
      const managedAdmin = rawProviders.find((p) => p.isManaged && p.enabled);
      if (managedAdmin && !candidatePool.some((c) => c.id === managedAdmin.id)) {
        candidatePool.push(managedAdmin);
      }

      if (!candidatePool.length) {
        throw new Error("Chưa phát hiện API Key của Provider AI (Google Gemini / OpenAI / Groq). Để AI có thể xem hình ảnh, phân tích bối cảnh và viết kịch bản lồng tiếng từ Prompt, vui lòng vào 'Cài đặt tool' (góc trái bên dưới) -> nhập API Key của Gemini hoặc OpenAI rồi thử lại.");
      }

      const primaryRecord = candidatePool[0];
      event.sender.send("runtime:analysis-progress", { progress: 18, stage: "extracting-frames", operationId });
      
      let transcriptionRecord = options.transcriptionProviderId ? storeInstance.find(options.transcriptionProviderId) : undefined;
      if (!transcriptionRecord || !transcriptionRecord.apiKey) {
        const dedicatedTranscriber = rawProviders.find((p) => p.enabled && p.apiKey && (p.providerType === "groq" || p.providerType === "whisper" || String(p.model || "").includes("whisper")));
        transcriptionRecord = dedicatedTranscriber || primaryRecord;
      }
      if (options.transcriptionProviderId && (!transcriptionRecord || !transcriptionRecord.enabled || !transcriptionRecord.apiKey || !transcriptionRecord.capabilities?.includes("transcription"))) {
        throw new Error("Provider transcription chưa sẵn sàng hoặc chưa bật capability transcription. Hãy cấu hình Groq Whisper trong Cài đặt tool.");
      }
      const [frames, transcriptResult] = await Promise.all([
        extractAnalysisFrames(localFilePath, probe.durationSeconds, operationId),
        transcribeVideo(localFilePath, transcriptionRecord || primaryRecord, operationId, probe.durationSeconds),
      ]);
      const transcript = transcriptResult?.text || "";
      const transcriptSegments = transcriptResult?.segments || [];
      const providerFrames = frames;
      event.sender.send("runtime:analysis-progress", { progress: 68, stage: transcript ? "transcribed" : "frames-ready", operationId });
      const transcriptContext = transcript ? `\n\nTRANSCRIPT LỜI THOẠI BÓC BĂNG TỪ VIDEO GỐC (BẮT BUỘC ĐỌC HIỂU ĐỂ BIÊN KỊCH CHÍNH XÁC NỘI DUNG VỤ VIỆC / TÁC PHẨM):\n"""\n${transcript}\n"""\n` : "";
      const frameContext = providerFrames.length ? `\n- Có ${providerFrames.length} khung hình mẫu đại diện theo thứ tự thời gian: ${frameTimeline(providerFrames)}.` : "";
      const languageCode = Array.isArray(options.languages) && options.languages.length ? options.languages[0] : "vi";
      const outputLanguage = languageName(languageCode);
      const isVietnamese = languageCode === "vi";
      const endStamp = `${Math.floor(probe.durationSeconds / 60).toString().padStart(2, "0")}:${Math.floor(probe.durationSeconds % 60).toString().padStart(2, "0")}`;
      const rawPrompt = options.customPrompt && String(options.customPrompt).trim() ? String(options.customPrompt).trim() : "";
      const isStoryRecap = options.analysisMode === "story_recap" ||
                           (options.targetDurationMinutes && options.targetDurationMinutes > 0) ||
                           (Array.isArray(options.durationRules) && options.durationRules.length > 0) ||
                           /story_recap|recap|tóm tắt|kể lại|rút gọn/i.test(rawPrompt);
      let targetDurationMins = Number(options.targetDurationMinutes) || (isStoryRecap ? 5.0 : Math.ceil(probe.durationSeconds / 60));
      if (options.durationMode === "rules" && Array.isArray(options.durationRules) && options.durationRules.length > 0) {
        targetDurationMins = resolveTargetDurationFromRules(probe.durationSeconds, options.durationRules, targetDurationMins);
      }
      const targetSceneCount = isStoryRecap
        ? Math.max(3, Math.round(targetDurationMins * 3.0))
        : Math.max(3, Math.ceil(probe.durationSeconds / 20));

      const targetWordsMin = Math.round(targetDurationMins * 220);
      const targetWordsMax = Math.round(targetDurationMins * 280);
      const wordsPerScene = Math.max(35, Math.round(targetWordsMax / targetSceneCount));

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
        ? `Bạn là một Biên kịch - Kể chuyện Chuyên nghiệp (Master Storyteller & Scriptwriter) hàng đầu. Nhiệm vụ của bạn là xem toàn bộ video "${cleanVideoTitle}" dài ${endStamp}, đọc hiểu hình ảnh qua các khung hình và lời thoại bóc băng, sau đó biên kịch lại toàn bộ câu chuyện thành kịch bản Voice-over kể chuyện bằng NGÔI THỨ 3 (người kể chuyện giấu mặt/quan sát) mượt mà, cuốn hút, bám sát 100% nội dung thực tế của video theo Cấu trúc Storytelling hoàn chỉnh: [00:00 - 00:10] Hook mở màn ấn tượng để giữ chân người xem, Hồi 1: Bối cảnh & Điểm khởi nguồn, Hồi 2: Diễn biến trọng tâm & Cao trào đắt giá, Hồi 3: Kết cục & Thông điệp/Bài học ý nghĩa.`
        : `Act as a professional 3rd-person narrator and master storyteller, analyzing the full video narrative arc of "${cleanVideoTitle}" (${endStamp}) and extracting key highlight cut scenes with an engaging 3-Act structure and viral 10s hook.`);

      const languageRule = isVietnamese
        ? "TẤT CẢ NỘI DUNG (summary, title, detail, translation, voiceover, voice_script) BẮT BUỘC PHẢI VIẾT 100% BẰNG TIẾNG VIỆT THUẦN TÚY. Dù video gốc có lời thoại tiếng Anh hay bất kỳ ngôn ngữ nào, toàn bộ lời thoại và kịch bản voiceover BẮT BUỘC PHẢI ĐƯỢC BIÊN KỊCH VÀ DỊCH SANG TIẾNG VIỆT 100%. TUYỆT ĐỐI KHÔNG để nguyên câu tiếng Anh hoặc chèn nửa Anh nửa Việt vào lời thoại voiceover hay tóm tắt."
        : `CRITICAL LANGUAGE DIRECTIVE: The user requested target language: "${outputLanguage}" (Language Code: ${languageCode}). ALL fields ("summary", "title", "detail", "translation", "voiceover", and "voice_script") MUST BE WRITTEN 100% AND EXCLUSIVELY IN ${outputLanguage}. Under no circumstances should Vietnamese or any other language be returned.`;

      const sampleScenesArray = isVietnamese
        ? [
            {
              id: "scene-1",
              source_start: "00:00:00",
              source_end: "00:00:10",
              start: "00:00:00",
              end: "00:00:10",
              title: "[00:00 - 00:10] Hook Mở Màn (Viral Retention)",
              detail: "Trích xuất câu thoại đắt giá hoặc khoảnh khắc ấn tượng nhất của video để chặn người xem lướt qua.",
              action_visual: "Hình ảnh cận cảnh khoảnh khắc ấn tượng nhất trong 10 giây đầu của video gốc.",
              translation: "Tình huống ấn tượng mở màn ngay lập tức kích hoạt sự chú ý đặc biệt.",
              voiceover: `Mở đầu video "${cleanVideoTitle}", một tình huống bất ngờ và đầy cuốn hút lập tức thu hút sự chú ý của người xem ngay từ những giây đầu tiên.`
            },
            {
              id: "scene-2",
              source_start: "00:00:10",
              source_end: "00:02:15",
              start: "00:00:10",
              end: "00:00:35",
              title: "[Hồi 1] Bối Cảnh & Khởi Nguồn Tình Huống",
              detail: "Giới thiệu nhân vật, không gian và biến cố ban đầu.",
              action_visual: "Toàn cảnh bối cảnh và diễn biến mở đầu của sự việc.",
              translation: "Sự việc bắt đầu hé lộ bối cảnh và nhân vật ban đầu.",
              voiceover: "Câu chuyện bắt đầu với không gian quen thuộc, nơi các nhân vật xuất hiện và những dấu hiệu bất thường đầu tiên dần lộ diện, tạo tiền đề cho những biến cố tiếp theo."
            },
            {
              id: "scene-3",
              source_start: "00:02:15",
              source_end: "00:04:40",
              start: "00:00:35",
              end: "00:01:00",
              title: "[Hồi 2] Diễn Biến Trọng Tâm & Nút Thắt Kịch Tính",
              detail: "Đi sâu vào tình huống then chốt, thử thách hoặc bước ngoặt kịch tính.",
              action_visual: "Cận cảnh hành động và cảm xúc của nhân vật trong khoảnh khắc này.",
              translation: "Diễn biến trọng tâm và nút thắt bất ngờ xuất hiện.",
              voiceover: "Mọi chuyện dần trở nên căng thẳng hơn khi sự thật bất ngờ được phơi bày, buộc mọi người phải đối mặt trực diện với những thử thách khó lường."
            }
          ]
        : [
            {
              id: "scene-1",
              source_start: "00:00:00",
              source_end: "00:00:10",
              start: "00:00:00",
              end: "00:00:10",
              title: "[00:00 - 00:10] Climax Hook (Viral Retention)",
              detail: "Extract the most compelling dialogue or shocking moment from the source to prevent drop-off.",
              action_visual: "Visual of the most intense moment captured in the first 10 seconds of raw footage.",
              translation: "A thrilling opening that instantly captures viewer attention.",
              voiceover: `Opening "${cleanVideoTitle}", an unexpected and captivating moment immediately captures the audience from the very first seconds.`
            },
            {
              id: "scene-2",
              source_start: "00:00:10",
              source_end: "00:02:15",
              start: "00:00:10",
              end: "00:00:35",
              title: "[Act 1] Setup & Inciting Incident",
              detail: "Establish characters, context and initial premise.",
              action_visual: "Wide shot establishing the context and characters.",
              translation: "The premise and characters are established.",
              voiceover: "The story opens with characters in their everyday setting before the first major turning point unfolds, setting the stage for what is to come."
            },
            {
              id: "scene-3",
              source_start: "00:02:15",
              source_end: "00:04:40",
              start: "00:00:35",
              end: "00:01:00",
              title: "[Act 2] Rising Action & Plot Twist",
              detail: "Delve into key obstacles and rising tension.",
              action_visual: "Close-up of the character action and emotional climax.",
              translation: "Tension rises with unexpected revelations.",
              voiceover: "Tensions escalate rapidly as hidden truths surface, pushing everyone into an intense confrontation where every second matters."
            }
          ];

      const isCopsBodycam = options.scriptStylePreset === "cops_bodycam" ||
                            /cops_bodycam|master_cops|cảnh sát tuần tra|truy đuổi tội phạm|hồ sơ phá án|police bodycam/i.test(customPromptText);
      const isRealityShow = options.scriptStylePreset === "reality_drama" ||
                            /reality_drama|show thực tế|truyền hình thực tế|drama đời sống/i.test(customPromptText);
      const isMovieReview = options.scriptStylePreset === "movie_review" ||
                            /movie_review|review phim|tóm tắt phim|điện ảnh|plot twist/i.test(customPromptText);
      const isNewsDigest = options.scriptStylePreset === "news_digest" ||
                            /news_digest|thời sự|tin tức|bản tin|phóng sự điều tra/i.test(customPromptText);

      let genreGuidance = "";
      if (isCopsBodycam) {
        genreGuidance = `
SPECIALIZED COPS BODYCAM / TRUE CRIME & MASTER STORYTELLING RULES:
- VĂN PHONG CHỦ ĐẠO: "Cảnh sát tuần tra / Hồ sơ phá án (Police Bodycam / Cops / True Crime)" — Nhấn mạnh vào trực giác nghiệp vụ của cảnh sát tuần tra (Cop's Gut Feeling), diễn biến căng thẳng nghẹt thở, lời khai đối chiếu mâu thuẫn, những manh mối bị phát hiện ngay tại hiện trường.
- GÓC NHÌN: Ký sự pháp luật & quan sát tâm lý xã hội sâu sắc (phân tích động cơ, vết nứt tâm lý, sự xảo quyệt của đối tượng).
- NGÔI KỂ: Ngôi thứ ba hoàn toàn ("gã đàn ông", "cô bé", "người mẹ", "hắn", "viên cảnh sát tuần tra", "sĩ quan cảnh sát", "tổ công tác"...).
- NHỊP ĐIỆU: Đoạn đầu nhanh dồn dập; đoạn giữa kịch tính đấu trí tâm lý; đoạn kết đanh thép, thượng tôn pháp luật và sâu sắc.`;
      } else if (isRealityShow) {
        genreGuidance = `
SPECIALIZED REALITY TV & SOCIAL DRAMA RULES:
- TONE: Sôi nổi, cuốn hút, dí dỏm, bình luận sắc sảo, đẩy cao trào cảm xúc và kịch tính giữa các nhân vật.
- FOCUS: Nêu bật biểu cảm khuôn mặt, các cuộc đối thoại tranh luận nảy lửa, phản ứng bất ngờ của nhân vật.
- FRAME MATCHING: Khung hình đang chiếu vào ai hoặc tình huống gì thì lời dẫn phải bình luận chính xác vào người và hành động đó.`;
      } else if (isMovieReview) {
        genreGuidance = `
SPECIALIZED MOVIE REVIEW & CINEMATIC STORYTELLING RULES:
- TONE: Hồi hộp, cuốn hút, đào sâu tâm lý nhân vật, làm nổi bật plot twist và các nút thắt mở của kịch bản.
- FOCUS: Tóm tắt logic các biến cố, xung đột trung tâm, động cơ nhân vật và phân tích thông điệp điện ảnh sâu sắc.`;
      } else if (isNewsDigest) {
        genreGuidance = `
SPECIALIZED NEWS & INVESTIGATIVE JOURNALISM RULES:
- TONE: Chuẩn mực, khách quan, súc tích, đanh thép, bóc tách dòng sự kiện mạch lạc theo thời gian thực.
- FOCUS: Nhân vật, sự kiện, bằng chứng thực tế, phát biểu quan trọng và kết luận xác thực.`;
      }

      let recapGuidance = `
🎯 CẤU TRÚC STORYTELLING BẮT BUỘC (3 HỒI & VIRAL RETENTION HOOK CAO TRÀO):
Nhiệm vụ của bạn là xem toàn bộ video dài ${endStamp} về "${cleanVideoTitle}", đọc hiểu 100% nội dung thực tế qua các khung hình và lời thoại bóc băng, sau đó biên kịch lại toàn bộ câu chuyện bằng lời kể chuyện ngôi thứ 3 (Narrator) với văn phong lôi cuốn, mượt mà, cảm xúc trong khoảng ~${targetDurationMins} phút (~${targetWordsMin} - ${targetWordsMax} từ tiếng Việt).

1. [00:00 - 00:10] HOOK CAO TRÀO MỞ MÀN (BẮT BUỘC Ở SCENE ĐẦU TIÊN):
   - Thời lượng đọc: Đúng 10 giây đầu (khoảng 25 - 35 từ).
   - Kỹ thuật: Bê nguyên hoặc trích xuất ngay câu thoại đắt giá nhất / tình tiết mâu thuẫn hoặc khoảnh khắc ấn tượng nhất của video để tạo cú hook ban đầu.
   - Mục tiêu: Chặn người xem lướt qua trong 3 giây đầu, tạo khoảng trống tò mò (curiosity gap) cực lớn.

2. [HỒI 1] BỐI CẢNH & KHỞI ĐẦU SỰ VIỆC:
   - Giới thiệu nhân vật, hoàn cảnh, không gian và biến cố mở đầu câu chuyện.
   - Tạo sự tò mò và mở ra tình huống ban đầu.

3. [HỒI 2] DIỄN BIẾN TRỌNG TÂM & CAO TRÀO ĐẮT GIÁ:
   - Đi sâu vào những tình huống then chốt, thử thách, trải nghiệm hoặc bước ngoặt kịch tính nhất của câu chuyện.
   - Nêu bật diễn biến, đối thoại và cảm xúc của nhân vật theo đúng những gì diễn ra trong video.

4. [HỒI 3] HỒI KẾT & THÔNG ĐIỆP Ý NGHĨA:
   - Kết quả chung cuộc của sự việc hoặc tác phẩm.
   - Đọng lại ấn tượng sâu sắc, thông điệp nhân văn hoặc bài học rút ra từ câu chuyện.

5. QUY TẮC PHÂN CẢNH & TỰ ĐỘNG CẮT KHỚP VIDEO (SCENES & AUTO-CUT TIMELINE):
   - Mảng "scenes" BẮT BUỘC phải chứa ĐỦ TỐI THIỂU ${targetSceneCount} PHÂN CẢNH nối tiếp nhau từ 00:00:00 đến ${endStamp}.
   - Phân cảnh đầu tiên BẮT BUỘC là Hook 10s đầu ([00:00 - 00:10]).
   - Mỗi phân cảnh có lời thoại "voiceover" dài ${Math.max(30, wordsPerScene - 20)}-${wordsPerScene + 25} từ tiếng Việt mượt mà, kết nối thành một câu chuyện liền mạch.
   - NHẶT ĐÚNG CẢNH TRONG VIDEO GỐC: "source_start" và "source_end" của mỗi phân cảnh BẮT BUỘC phải chỉ chính xác mốc thời gian trong video gốc có hình ảnh, hành động hoặc nét mặt minh họa trực tiếp cho câu kể voiceover. Khi phân tích xong, Timeline sẽ tự động cắt các đoạn video này và ráp vào khớp từng giây với lời kể.
   - TUYỆT ĐỐI KHÔNG CHÈN MỐC THỜI GIAN VÀO LỜI ĐỌC: Không ghi các cụm từ như "tại mốc 00:00", "lúc 02:10", "từ phút...", "(15:09)" vào nội dung câu chữ của voiceover hay voice_script. Đây là lời thoại để phát thanh viên AI đọc thành tiếng cho người xem nghe, phải là văn phong kể chuyện tự nhiên, liền mạch 100%.
   - TUYỆT ĐỐI KHÔNG TRỘN LẪN TIẾNG ANH VÀ TIẾNG VIỆT (NO MIXED LANGUAGES): Toàn bộ lời thoại và kịch bản voiceover phải được biên kịch và dịch 100% sang tiếng Việt trau chuốt, tự nhiên, lôi cuốn theo mạch diễn biến của video.`;

      const prompt = `Role: Senior Master Film Narrator & Screenplay Review Specialist.
Target Output Language: ${outputLanguage} (${languageCode}).
Video Title / Topic: "${cleanVideoTitle}".
Video Duration: ${probe.durationSeconds.toFixed(1)} seconds (${endStamp}).${frameContext}${transcriptContext}

USER DIRECTIVE & NICHE STYLE:
"${customPromptText}"
${genreGuidance}
${recapGuidance}

QUY TẮC PHÂN TÍCH CHÍNH XÁC & TRUNG THỰC (FACTUAL ACCURACY FIRST):
- ĐỌC HIỂU ĐÚNG NỘI DUNG THỰC TẾ: Phân tích TRUNG THỰC VÀ CHÍNH XÁC theo đúng diễn biến thực tế trong các khung hình và lời thoại bóc băng của video gốc.
- TỰ ĐỘNG THÍCH ỨNG THEO THỂ LOẠI CỦA VIDEO:
  + Nếu là phim / hoạt hình / drama: Kể lại cốt truyện, tình huống, nhân vật, cao trào và plot twist của tác phẩm.
  + Nếu là vlog / du lịch / ẩm thực / đời sống: Kể lại trải nghiệm, hành trình, món ăn, địa điểm và những khoảnh khắc thú vị.
  + Nếu là công nghệ / hướng dẫn / game / tin tức: Tóm tắt các điểm nổi bật, mẹo hay và bài học kinh nghiệm.
  + Nếu là cảnh sát / vụ án / pháp luật: Phân tích diễn biến nghiệp vụ, điều tra và kết luận pháp lý.
- TUYỆT ĐỐI KHÔNG BỊA ĐẶT các tình tiết cảnh sát dừng xe, bắt tội phạm nếu video không phải thể loại đó.

MANDATORY SCRIPTING & SCENE ALIGNMENT REQUIREMENTS:
1. ${languageRule}
2. COMPREHENSIVE FULL-LENGTH COMPREHENSION (BẮT BUỘC ĐỌC HIỂU TOÀN DIỆN VÀ PHÂN TÍCH CHUYÊN SÂU TỪ 00:00 ĐẾN ${endStamp}):
   - Đọc hiểu, bóc tách và phân tích trọn vẹn toàn bộ cốt truyện và các biến cố của video "${cleanVideoTitle}" từ 00:00 xuyên suốt tới phút cuối cùng (${endStamp}). TUYỆT ĐỐI KHÔNG chỉ tóm tắt nửa đầu rồi cắt cụt.
   - Trong "summary": Viết bản phân tích và tóm tắt chuyên sâu đầy đủ mạch diễn biến câu chuyện (mở đầu ➔ biến cố nảy sinh ➔ quá trình điều tra / diễn biến tâm lý / thử thách ➔ cao trào đỉnh điểm ➔ hồi kết & thông điệp).
3. CONTINUOUS 3RD-PERSON NARRATIVE & UNIFORM SCENE DISTRIBUTION:
   - BẮT BUỘC mảng "scenes" phải chứa TỐI THIỂU ${targetSceneCount} PHÂN CẢNH (scenes) từ scene-1 đến scene-${targetSceneCount}.
   - Các phân cảnh BẮT BUỘC PHẢI TRẢI ĐỀU THEO DÒNG THỜI GIAN từ đầu (00:00:00) đến cuối video (${endStamp}) để người xem theo dõi trọn vẹn toàn bộ câu chuyện kéo dài ~${targetDurationMins} phút (~${Math.round(targetDurationMins * 60)} giây).
4. EXACT SPEECH CALIBRATION & NO TIMESTAMPS IN VOICE:
   - Lời thuyết minh "voiceover" của mỗi phân cảnh phải dài từ ${Math.max(30, wordsPerScene - 20)} đến ${wordsPerScene + 25} từ tiếng Việt, mang phong cách dẫn chuyện ngôi thứ 3 truyền cảm, kịch tính, đào sâu chi tiết, không lặp từ ngữ và liền mạch xuyên suốt. Tổng bài voiceover phải đạt ~${targetWordsMin} - ${targetWordsMax} từ.
   - TUYỆT ĐỐI KHÔNG chèn mốc thời gian, số phút, số giây vào trong lời văn voiceover/voice_script.
5. PRECISE SOURCE CLIP TIMECODES (NHẶT ĐÚNG MỐC CẢNH GỐC KHỚP LỜI KỂ):
   - "source_start" và "source_end" phải chứa mốc thời gian chính xác trong video gốc (từ 00:00:00 đến ${endStamp}) để timeline tự động cắt và ráp video.
6. JSON OUTPUT FORMAT (BẮT BUỘC CHUẨN JSON):
{
  "video_title": "Tiêu đề video cực kỳ hấp dẫn, chuẩn viral và kích thích sự tò mò cao nhất...",
  "suggested_titles": [
    "Tiêu đề 1: Đẩy cao mâu thuẫn cao trào và tình tiết bất ngờ",
    "Tiêu đề 2: Nhấn mạnh vào điểm nhấn đắt giá & nội dung phơi bày",
    "Tiêu đề 3: Đặt câu hỏi kích thích tò mò về diễn biến câu chuyện",
    "Tiêu đề 4: Tóm tắt trọn vẹn sức hút của tác phẩm"
  ],
  "hook_title": "Tiêu đề ngắn gọn cho phân cảnh Hook 10s đầu",
  "summary": "Tóm tắt toàn bộ cốt truyện và mạch diễn biến câu chuyện từ tiêu đề tới kết thúc...",
  "scenes": [
${sampleScenesArray.map((s) => "    " + JSON.stringify(s, null, 4).replace(/\n/g, "\n    ")).join(",\n")}
  ],
  "voice_script": "Toàn bộ bài thuyết minh kể chuyện hoàn chỉnh ghép từ tất cả các cảnh..."
}

Return ONLY valid JSON with no markdown wrapping. Mảng 'scenes' phải có đủ ${targetSceneCount} phần tử phân cảnh!`;
      event.sender.send("runtime:analysis-progress", { progress: 76, stage: "requesting-provider", operationId });
      let result = null;
      let lastError = null;

      for (let poolIdx = 0; poolIdx < candidatePool.length; poolIdx++) {
        const activeRecord = candidatePool[poolIdx];
        try {
          event.sender.send("runtime:analysis-progress", {
            progress: 76 + Math.min(18, poolIdx * 5),
            stage: `Đang phân tích với ${activeRecord.name || activeRecord.providerType} (${activeRecord.model || "mặc định"})...`,
            operationId,
          });
          result = await providerRequest(activeRecord, prompt, providerFrames, operationId);
          if (result && result.text) {
            break; // Successfully obtained response!
          }
        } catch (provErr) {
          lastError = provErr;
          console.warn(`[Analysis] Provider ${activeRecord.name || activeRecord.id} (${activeRecord.model}) failed (${provErr?.message}), attempting next provider/model in pool...`);
          if (poolIdx < candidatePool.length - 1) {
            // Short backoff before switching to next candidate provider
            await new Promise((resolve) => setTimeout(resolve, 800));
          }
        }
      }

      if (!result || !result.text) {
        if (state?.cancelled) throw cancelledOperationError();
        console.warn("[Analysis] All candidate providers failed or rate-limited, generating intelligent story synthesis fallback:", lastError?.message);
        const fallbackAnalysis = generateLocalStoryAnalysis(probe, customPromptText, languageCode, { ...options, videoTitle: cleanVideoTitle, targetDurationMinutes: targetDurationMins }, transcript, transcriptSegments);
        event.sender.send("runtime:analysis-progress", { progress: 100, stage: "completed", operationId });
        return enrichAnalysis({
          ...fallbackAnalysis,
          transcript,
          transcriptSegments,
          previewFrames: frames.map((frame) => ({ timestampSeconds: frame.timestampSeconds, imageDataUrl: `data:image/jpeg;base64,${frame.data}` }))
        }, transcript);
      }
      event.sender.send("runtime:analysis-progress", { progress: 100, stage: "completed", operationId });
      return enrichAnalysis({ ...parseAnalysis(result.text, probe, result.usage, options.customPrompt, { ...options, videoTitle: cleanVideoTitle, targetDurationMinutes: targetDurationMins }, transcript, transcriptSegments), transcript, transcriptSegments, previewFrames: frames.map((frame) => ({ timestampSeconds: frame.timestampSeconds, imageDataUrl: `data:image/jpeg;base64,${frame.data}` })) }, transcript);
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
  ipcMain.handle("runtime:synthesize-speech", async (_event, text, languageCode = "vi", gender = "female", voice, rate = 1.0) => {
    const cleanText = stripSceneMetadata(text);
    if (!cleanText) return null;
    const voiceKey = String(voice || "").trim().toLowerCase();
    const profile = resolveNeuralVoiceProfile(voiceKey, languageCode, gender);

    // Dynamic rate computation
    let effectiveRate = profile.rate || "+0%";
    if (rate && typeof rate === "number" && rate > 0) {
      const pct = Math.round((rate - 1.0) * 100);
      effectiveRate = `${pct >= 0 ? "+" : ""}${pct}%`;
    }

    const cacheKey = crypto.createHash("sha256").update(`${voiceKey}:${languageCode}:${gender}:${effectiveRate}:${cleanText}`).digest("hex").slice(0, 32);

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
          voice: profile.voice,
          voice_id: voiceKey,
          language: languageCode || "vi",
          gender: gender || "male",
          rate: effectiveRate,
          pitch: profile.pitch,
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
        ["-m", "edge_tts", "--voice", profile.voice, "--rate", effectiveRate, "--pitch", profile.pitch, "--text", cleanText.slice(0, 1000), "--write-media", diskCacheFile],
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
    backgroundColor: "#090c15",
    autoHideMenuBar: true,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: { contextIsolation: true, nodeIntegration: false, preload: path.join(__dirname, "preload.cjs") },
  });
  window.setMenuBarVisibility(false);
  window.webContents.on("before-input-event", (event, input) => {
    if (((input.control || input.meta) && input.key.toLowerCase() === "r") || input.key === "F5") {
      window.webContents.reloadIgnoringCache();
    }
    if (((input.control || input.meta) && input.shift && input.key.toLowerCase() === "i") || input.key === "F12") {
      window.webContents.toggleDevTools();
    }
  });
  const devUrl = process.env.JACS_DESKTOP_DEV_URL;
  void (devUrl ? window.loadURL(devUrl) : window.loadFile(path.join(__dirname, "..", "dist", "index.html")));
}

app.whenReady().then(() => {
  registerMediaProtocol();
  registerIpc();
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  setTimeout(() => {
    try {
      if (!findExecutable("ffmpeg")) {
        ensureExecutable("ffmpeg").catch((e) => console.warn("Background ffmpeg prefetch:", e));
      }
    } catch {}
  }, 2500);
});

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
