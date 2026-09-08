const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const childProcess = require("node:child_process");
const { once } = require("node:events");

const MAX_UPDATE_BYTES = 4 * 1024 * 1024 * 1024;
const VERSION_PATTERN = /^v?(\d+)\.(\d+)\.(\d+)$/i;

function trustedUrl(value) {
  try {
    const url = new URL(String(value));
    return url.protocol === "https:" || (url.protocol === "http:" && ["localhost", "127.0.0.1", "::1"].includes(url.hostname));
  } catch {
    return false;
  }
}

function versionParts(value) {
  const match = String(value).match(VERSION_PATTERN);
  return match ? match.slice(1).map(Number) : null;
}

function compareVersions(left, right) {
  const a = versionParts(left);
  const b = versionParts(right);
  if (!a && !b) return 0;
  if (!a) return -1;
  if (!b) return 1;
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] > b[index] ? 1 : -1;
  }
  return 0;
}

function validateRelease(release, platform, currentVersion) {
  if (!release || typeof release !== "object") throw new Error("Manifest cập nhật trống");
  if (release.platform && platform && release.platform !== platform) throw new Error("Bản cập nhật không dành cho hệ điều hành này");
  if (!versionParts(release.version) || compareVersions(release.version, currentVersion) <= 0) {
    throw new Error("Phiên bản cập nhật không hợp lệ hoặc đã cũ");
  }
  const downloadUrl = release.download_url || release.url;
  if (!trustedUrl(downloadUrl)) throw new Error("URL cập nhật không được tin cậy");
  if (!/^[a-f0-9]{128}$/i.test(String(release.sha512 || ""))) throw new Error("Manifest thiếu SHA-512 hợp lệ");
  return release;
}

function releaseKind(filePath, platform) {
  const extension = path.extname(String(filePath)).toLowerCase();
  if (platform === "windows" && extension === ".exe") return "windows-installer";
  if (platform === "windows" && extension === ".zip") return "windows-zip";
  if (platform === "macos" && extension === ".zip") return "macos-zip";
  if (platform === "macos" && extension === ".dmg") return "macos-dmg";
  throw new Error(`Định dạng installer không được hỗ trợ: ${extension || "unknown"}`);
}

async function sha512File(filePath) {
  const hash = crypto.createHash("sha512");
  const stream = fs.createReadStream(filePath);
  for await (const chunk of stream) hash.update(chunk);
  return hash.digest("hex");
}

function safeFileName(url, version, platform) {
  let candidate = "";
  try { candidate = path.basename(new URL(String(url)).pathname); } catch { /* validation happens before this helper */ }
  candidate = candidate.replace(/[^A-Za-z0-9._-]/g, "-");
  if (!candidate || candidate === "." || candidate === "..") candidate = platform === "windows" ? `JACS-Studio-${version}.zip` : `JACS-Studio-${version}.zip`;
  return candidate;
}

async function downloadRelease({ release, platform, currentVersion, tempDirectory, signal, onProgress, fetchImpl = fetch }) {
  validateRelease(release, platform, currentVersion);
  const downloadUrl = release.download_url || release.url;
  const directory = path.join(tempDirectory || os.tmpdir(), "jacs-studio-updates", release.version);
  await fsp.mkdir(directory, { recursive: true, mode: 0o755 });
  const targetPath = path.join(directory, safeFileName(downloadUrl, release.version, platform));
  const partialPath = `${targetPath}.part`;
  await fsp.rm(partialPath, { force: true });
  const response = await fetchImpl(downloadUrl, { redirect: "follow", signal, headers: { Accept: "application/octet-stream" } });
  const finalUrl = response.url || downloadUrl;
  if (!trustedUrl(finalUrl)) throw new Error("Máy chủ chuyển hướng tới URL không được tin cậy");
  if (!response.ok || !response.body) throw new Error(`Không tải được bản cập nhật (HTTP ${response.status})`);
  const contentLength = Number(response.headers?.get?.("content-length") || 0);
  if (contentLength > MAX_UPDATE_BYTES) throw new Error("Bản cập nhật vượt quá dung lượng cho phép");
  const output = fs.createWriteStream(partialPath, { mode: 0o755 });
  const reader = response.body.getReader();
  let downloaded = 0;
  try {
    for (;;) {
      const item = await reader.read();
      if (item.done) break;
      const chunk = Buffer.from(item.value);
      downloaded += chunk.length;
      if (downloaded > MAX_UPDATE_BYTES) throw new Error("Bản cập nhật vượt quá dung lượng cho phép");
      if (!output.write(chunk)) await once(output, "drain");
      onProgress?.({ stage: "downloading", progress: contentLength ? Math.min(99, Math.round(downloaded / contentLength * 100)) : 0, bytesDownloaded: downloaded, totalBytes: contentLength || undefined });
    }
    output.end();
    await once(output, "finish");
    onProgress?.({ stage: "verifying", progress: 100, bytesDownloaded: downloaded, totalBytes: contentLength || downloaded });
    const digest = await sha512File(partialPath);
    if (digest.toLowerCase() !== String(release.sha512).toLowerCase()) throw new Error("SHA-512 không khớp; bản cập nhật bị từ chối");
    await fsp.rename(partialPath, targetPath);
    await fsp.chmod(targetPath, 0o755).catch(() => undefined);
    return { filePath: targetPath, bytes: downloaded, sha512: digest, kind: releaseKind(targetPath, platform) };
  } catch (error) {
    output.destroy();
    await fsp.rm(partialPath, { force: true }).catch(() => undefined);
    await fsp.rm(directory, { recursive: true, force: true }).catch(() => undefined);
    const parentDirectory = path.dirname(directory);
    try {
      if ((await fsp.readdir(parentDirectory)).length === 0) await fsp.rm(parentDirectory, { recursive: true, force: true });
    } catch { /* best effort cleanup */ }
    throw error;
  }
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function macBundlePath(execPath) {
  return path.dirname(path.dirname(path.dirname(execPath)));
}

function findMacApp(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const direct = entries.find((entry) => entry.isDirectory() && entry.name.endsWith(".app"));
  if (direct) return path.join(directory, direct.name);
  for (const entry of entries.filter((item) => item.isDirectory())) {
    const nested = findMacApp(path.join(directory, entry.name));
    if (nested) return nested;
  }
  return null;
}

function createMacSwapScript({ currentApp, newApp, pid, cleanupDirectory }) {
  return `#!/bin/sh
set -eu
target=${shellQuote(currentApp)}
replacement=${shellQuote(newApp)}
cleanup=${shellQuote(cleanupDirectory)}
while kill -0 ${Number(pid)} 2>/dev/null; do sleep 1; done
backup="\${target}.previous-$(date +%s)"
mv "$target" "$backup"
mv "$replacement" "$target"
open "$target" >/dev/null 2>&1 || true
rm -rf "$backup" "$cleanup"
`;
}

async function installRelease({ filePath, kind, platform, appModule, execPath = process.execPath, tempDirectory }) {
  if (!fs.existsSync(filePath)) throw new Error("Không tìm thấy file cập nhật đã tải");
  if (platform === "windows") {
    if (kind === "windows-installer") {
      const targetDir = path.dirname(execPath);
      const targetExe = execPath;
      const targetPid = process.pid;
      try {
        fs.chmodSync(filePath, 0o755);
      } catch {}
      try {
        if (appModule.shell?.openPath) {
          void appModule.shell.openPath(filePath);
        } else {
          childProcess.exec(`start "" "${filePath}"`);
        }
      } catch {
        try {
          const child = childProcess.spawn("cmd.exe", ["/c", "start", "", filePath], {
            detached: true,
            stdio: "ignore",
            windowsHide: false,
          });
          child.unref();
        } catch {}
      }
      setTimeout(() => {
        if (typeof appModule.exit === "function") appModule.exit(0);
        else appModule.quit();
      }, 1000);
      return { status: "installing" };
    }
    if (kind === "windows-zip") {
      const currentDir = path.dirname(execPath);
      const exeName = path.basename(execPath);
      const extractDirectory = await fsp.mkdtemp(path.join(tempDirectory || os.tmpdir(), "jacs-update-win-"));
      const scriptPath = path.join(extractDirectory, "install-update.bat");
      const escapedZip = filePath.replace(/'/g, "''");
      const escapedDir = currentDir.replace(/'/g, "''");
      const batContent = `@echo off
rem 1. Terminate running Electron process
%SystemRoot%\\System32\\taskkill.exe /f /im "${exeName}" >nul 2>&1
%SystemRoot%\\System32\\taskkill.exe /f /pid ${Number(process.pid)} >nul 2>&1
%SystemRoot%\\System32\\timeout.exe /t 2 /nobreak >nul

rem 2. Extract update zip to temporary folder where write permissions are 100% guaranteed
%SystemRoot%\\System32\\tar.exe -xf "${filePath}" -C "${extractDirectory}" >nul 2>&1
if not exist "${extractDirectory}\\resources\\app.asar" (
    %SystemRoot%\\System32\\WindowsPowerShell\\v1.0\\powershell.exe -NoProfile -Command "Expand-Archive -LiteralPath '${escapedZip}' -DestinationPath '${extractDirectory}' -Force" >nul 2>&1
)

rem 3. Copy resources\\app.asar to target directory with retry loop
set ATTEMPT=0
:COPY_LOOP
set /a ATTEMPT+=1
if exist "${extractDirectory}\\resources\\app.asar" (
    copy /y /b "${extractDirectory}\\resources\\app.asar" "${currentDir}\\resources\\app.asar" >nul 2>&1
)
if exist "${currentDir}\\resources\\app.asar" (
    if not errorlevel 1 goto LAUNCH_APP
)

if %ATTEMPT% geq 8 goto LAUNCH_APP
%SystemRoot%\\System32\\taskkill.exe /f /im "${exeName}" >nul 2>&1
%SystemRoot%\\System32\\timeout.exe /t 1 /nobreak >nul
goto COPY_LOOP

:LAUNCH_APP
rem 4. Short pause to ensure disk write flush before relaunching
%SystemRoot%\\System32\\timeout.exe /t 1 /nobreak >nul
start "" "${path.join(currentDir, exeName)}"

rem 5. Clean up temporary script folder
%SystemRoot%\\System32\\timeout.exe /t 3 /nobreak >nul
rmdir /s /q "${extractDirectory}" >nul 2>&1
exit
`;
      await fsp.writeFile(scriptPath, batContent, { mode: 0o700 });
      const child = childProcess.spawn("cmd.exe", ["/c", scriptPath], { detached: true, stdio: "ignore", windowsHide: true });
      child.unref();
      if (typeof appModule.exit === "function") {
        appModule.exit(0);
      } else {
        appModule.quit();
      }
      return { status: "installing" };
    }
  }
  if (platform !== "macos") throw new Error("Nền tảng cập nhật không được hỗ trợ");
  if (kind === "macos-dmg") {
    const result = await appModule.shell.openPath(filePath);
    if (result) throw new Error(result);
    return { status: "manual", filePath };
  }
  if (kind !== "macos-zip") throw new Error("Gói macOS phải là ZIP hoặc DMG");
  if (!appModule.isPackaged) throw new Error("Chỉ cài cập nhật cho bản Desktop đã đóng gói");
  const extractDirectory = await fsp.mkdtemp(path.join(tempDirectory || os.tmpdir(), "jacs-update-extract-"));
  const extraction = childProcess.spawnSync("/usr/bin/ditto", ["-x", "-k", filePath, extractDirectory], { encoding: "utf8" });
  if (extraction.status !== 0) {
    await fsp.rm(extractDirectory, { recursive: true, force: true });
    throw new Error(`Không giải nén được bản cập nhật: ${extraction.stderr || "ditto failed"}`);
  }
  const replacement = findMacApp(extractDirectory);
  if (!replacement) throw new Error("ZIP cập nhật không chứa ứng dụng macOS");
  const currentApp = macBundlePath(execPath);
  if (!currentApp.endsWith(".app") || !fs.existsSync(currentApp)) throw new Error("Không xác định được thư mục ứng dụng hiện tại");
  const scriptPath = path.join(extractDirectory, "install-update.sh");
  await fsp.writeFile(scriptPath, createMacSwapScript({ currentApp, newApp: replacement, pid: process.pid, cleanupDirectory: extractDirectory }), { mode: 0o700 });
  const child = childProcess.spawn("/bin/sh", [scriptPath], { detached: true, stdio: "ignore" });
  child.unref();
  appModule.quit();
  return { status: "installing" };
}

module.exports = { compareVersions, createMacSwapScript, downloadRelease, findMacApp, installRelease, macBundlePath, releaseKind, sha512File, trustedUrl, validateRelease, versionParts };
