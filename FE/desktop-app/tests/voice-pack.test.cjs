const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { listVoicePacks, resolveVoicePack } = require("../electron/voice-pack.cjs");

test("resolves local voice packs by language and gender", () => {
  assert.equal(resolveVoicePack("", "vi", "female").id, "vi-female");
  assert.equal(resolveVoicePack("", "pt-BR", "male").id, "pt-BR-male");
  assert.equal(resolveVoicePack("", "zh-TW", "female").id, "zh-TW-female");
  assert.equal(resolveVoicePack("", "ar", "female").id, "ar-female");
  assert.equal(listVoicePacks("ja").length, 2);
});

test("does not silently select a voice from another language", () => {
  assert.throws(() => resolveVoicePack("", "xx", "female"), /voice pack local/i);
  assert.equal(resolveVoicePack("en-female", "vi", "female").id, "vi-female");
});

test("python voice worker exposes the same locale registry", { skip: !fs.existsSync(path.join(__dirname, "..", "voice-runtime", "voice_worker.py")) }, () => {
  const script = path.join(__dirname, "..", "voice-runtime", "voice_worker.py");
  const python = process.platform === "win32" ? "python.exe" : "python3";
  const result = childProcess.spawnSync(python, [script, "list", "--language", "vi"], { encoding: "utf8", windowsHide: true });
  assert.equal(result.status, 0, result.stderr);
  const voices = JSON.parse(result.stdout);
  assert.deepEqual(voices.map((voice) => voice.id), ["vi-female", "vi-male"]);
});
