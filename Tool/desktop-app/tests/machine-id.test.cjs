const test = require("node:test");
const assert = require("node:assert/strict");
const { createMachineInfo, readMacPlatformUuid, readWindowsMachineGuid } = require("../electron/machine-id.cjs");

test("reads the macOS IOPlatformUUID and never exposes the raw value", () => {
  const raw = "A1B2C3D4-E5F6-4789-ABCD-001122334455";
  const info = createMachineInfo({
    platform: "darwin",
    arch: "arm64",
    appVersion: "0.3.0",
    userDataPath: "/tmp/jacs-machine-id-test",
    dependencies: { execFileSync: () => `\"IOPlatformUUID\" = \"${raw}\"` },
  });
  assert.equal(info.machineIdSource, "platform");
  assert.match(info.machineId, /^JACS-MAC-[A-F0-9]{32}$/);
  assert.equal(info.machineId.includes(raw), false);
});

test("parses the Windows MachineGuid registry value", () => {
  const raw = "12345678-90ab-cdef-1234-567890abcdef";
  assert.equal(readWindowsMachineGuid(() => `MachineGuid    REG_SZ    ${raw}`), raw);
});

test("returns a stable installation identifier when platform lookup fails", () => {
  const files = new Map();
  const fsImpl = {
    readFileSync: (filePath) => {
      if (!files.has(filePath)) throw new Error("ENOENT");
      return files.get(filePath);
    },
    mkdirSync: () => undefined,
    writeFileSync: (filePath, value) => files.set(filePath, value),
    renameSync: (from, to) => { files.set(to, files.get(from)); files.delete(from); },
  };
  const dependencies = { execFileSync: () => { throw new Error("unavailable"); }, fsImpl, randomUUID: () => "fallback-installation-id" };
  const first = createMachineInfo({ platform: "win32", arch: "x64", appVersion: "0.3.0", userDataPath: "/jacs", dependencies });
  const second = createMachineInfo({ platform: "win32", arch: "x64", appVersion: "0.3.0", userDataPath: "/jacs", dependencies });
  assert.equal(first.machineIdSource, "installation");
  assert.equal(first.machineId, second.machineId);
});
