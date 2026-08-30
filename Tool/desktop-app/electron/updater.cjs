const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const childProcess = require("node:child_process");
const { once } = require("node:events");

const MAX_UPDATE_BYTES = 4 * 1024 * 1024 * 1024;
const VERSION_PATTERN = /^v(\d+)\.(\d+)\.(\d+)$/;

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
  if (!a || !b) return 0;
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] > b[index] ? 1 : -1;
  }
  return 0;
}

function validateRelease(release, platform, currentVersion) {
  if (!release || typeof release !== "object") throw new Error("Manifest cập nhật trống");
  if (release.platform !== platform) throw new Error("Bản cập nhật không dành cho hệ điều hành này");
  if (!versionParts(release.version) || compareVersions(release.version, currentVersion) <= 0) throw new Error("Phiên bản cập nhật không hợp lệ hoặc đã cũ");
  if (!trustedUrl(release.download_url)) throw new Error("URL cập nhật không được tin cậy");
  if (!/^[a-f0-9]{128}$/i.test(String(release.sha512 || ""))) throw new Error("Manifest thiếu SHA-512 hợp lệ");
  return release;
}

function releaseKind(filePath, platform) {
  const extension = path.extname(String(filePath)).toLowerCase();
  if (platform === "windows" && extension === ".exe") return "windows-installer";
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
  if (!candidate || candidate === "." || candidate === "..") candidate = platform === "windows" ? `JACS-Studio-${version}.exe` : `JACS-Studio-${version}.zip`;
  return candidate;
}

async function downloadRelease({ release, platform, currentVersion, tempDirectory, signal, onProgress, fetchImpl = fetch }) {
  validateRelease(release, platform, currentVersion);
  const directory = path.join(tempDirectory || os.tmpdir(), "jacs-studio-updates", release.version);
  await fsp.mkdir(directory, { recursive: true, mode: 0o700 });
  const targetPath = path.join(directory, safeFileName(release.download_url, release.version, platform));
  const partialPath = `${targetPath}.part`;
  await fsp.rm(partialPath, { force: true });
  const response = await fetchImpl(release.download_url, { redirect: "follow", signal, headers: { Accept: "application/octet-stream" } });
  const finalUrl = response.url || release.download_url;
  if (!trustedUrl(finalUrl)) throw new Error("Máy chủ chuyển hướng tới URL không được tin cậy");
  if (!response.ok || !response.body) throw new Error(`Không tải được bản cập nhật (HTTP ${response.status})`);
  const contentLength = Number(response.headers?.get?.("content-length") || 0);
  if (contentLength > MAX_UPDATE_BYTES) throw new Error("Bản cập nhật vượt quá dung lượng cho phép");
  const output = fs.createWriteStream(partialPath, { mode: 0o600 });
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
  if (platform === "windows" && kind === "windows-installer") {
    const child = childProcess.spawn(filePath, ["/S"], { detached: true, stdio: "ignore", windowsHide: true });
    child.unref();
    appModule.quit();
    return { status: "installing" };
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
