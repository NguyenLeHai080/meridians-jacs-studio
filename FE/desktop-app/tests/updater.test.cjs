const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createMacSwapScript, downloadRelease, releaseKind, trustedUrl, validateRelease } = require("../electron/updater.cjs");

function release(overrides = {}) {
  return {
    version: "v0.4.0",
    platform: "macos",
    channel: "stable",
    download_url: "https://cdn.example.test/JACS-Studio-0.4.0.zip",
    sha512: "a".repeat(128),
    release_notes: "Bản cập nhật kiểm thử",
    force_update: false,
    ...overrides,
  };
}

test("accepts only newer HTTPS releases for the current platform", () => {
  assert.equal(trustedUrl("https://cdn.example.test/update.zip"), true);
  assert.equal(trustedUrl("http://cdn.example.test/update.zip"), false);
  assert.doesNotThrow(() => validateRelease(release(), "macos", "v0.3.3"));
  assert.throws(() => validateRelease(release({ version: "v0.3.3" }), "macos", "v0.3.3"), /đã cũ/);
  assert.throws(() => validateRelease(release({ platform: "windows" }), "macos", "v0.3.3"), /hệ điều hành/);
  assert.throws(() => validateRelease(release({ sha512: "a".repeat(64) }), "macos", "v0.3.3"), /SHA-512/);
  assert.throws(() => validateRelease(release({ sha512: "bad" }), "macos", "v0.3.3"), /SHA-512/);
});

test("downloads an update, reports progress, and verifies SHA-512 before renaming", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "jacs-updater-test-"));
  const payload = Buffer.from("fake installer payload");
  const digest = crypto.createHash("sha512").update(payload).digest("hex");
  const progress = [];
  const body = { getReader() {
    let consumed = false;
    return { read: async () => {
      if (consumed) return { done: true };
      consumed = true;
      return { done: false, value: payload };
    } };
  } };
  try {
    const result = await downloadRelease({
      release: release({ sha512: digest }),
      platform: "macos",
      currentVersion: "v0.3.3",
      tempDirectory: directory,
      fetchImpl: async () => ({ ok: true, status: 200, url: "https://cdn.example.test/JACS-Studio-0.4.0.zip", body, headers: { get: () => String(payload.length) } }),
      onProgress: (value) => progress.push(value),
    });
    assert.equal(fs.readFileSync(result.filePath).toString(), payload.toString());
    assert.equal(result.kind, "macos-zip");
    assert.equal(progress.at(-1).stage, "verifying");
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("rejects a checksum mismatch and leaves no partial installer", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "jacs-updater-test-"));
  const body = { getReader() {
    let consumed = false;
    return { read: async () => consumed ? { done: true } : (consumed = true, { done: false, value: Buffer.from("tampered") }) };
  } };
  await assert.rejects(downloadRelease({ release: release(), platform: "macos", currentVersion: "v0.3.3", tempDirectory: directory, fetchImpl: async () => ({ ok: true, status: 200, url: release().download_url, body, headers: { get: () => "8" } }) }), /SHA-512 không khớp/);
  assert.deepEqual(fs.readdirSync(directory), []);
  fs.rmSync(directory, { recursive: true, force: true });
});

test("generates a detached macOS replacement script and classifies installers", () => {
  const script = createMacSwapScript({ currentApp: "/Applications/JACS Studio.app", newApp: "/tmp/extracted/JACS Studio.app", pid: 1234, cleanupDirectory: "/tmp/extracted" });
  assert.match(script, /kill -0 1234/);
  assert.match(script, /mv "\$target" "\$backup"/);
  assert.equal(releaseKind("JACS Studio Setup.exe", "windows"), "windows-installer");
  assert.equal(releaseKind("JACS Studio.zip", "macos"), "macos-zip");
});
