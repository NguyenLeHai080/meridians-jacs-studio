const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const projectDir = path.resolve(__dirname, "..");
const releaseDir = path.join(projectDir, "release");
const sourceBin = path.join(projectDir, "bin");
const electronBuilder = path.join(projectDir, "node_modules", ".bin", "electron-builder");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "jacs-studio-universal-"));
const configPath = path.join(tempRoot, "electron-builder.json");
const x64Output = path.join(releaseDir, "mac-universal-x64-temp");
const arm64Output = path.join(releaseDir, "mac-universal-arm64-temp");
const universalOutput = path.join(releaseDir, "mac-universal");
const packageVersion = require(path.join(projectDir, "package.json")).version;

function fail(message) {
  throw new Error(message);
}

function copy(source, destination) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.cpSync(source, destination, { recursive: true });
}

function stageBin(architecture) {
  const architectureSource = path.join(sourceBin, `darwin-${architecture}`);
  if (!fs.existsSync(path.join(architectureSource, "ffmpeg")) || !fs.existsSync(path.join(architectureSource, "ffprobe"))) {
    fail(`Thiếu FFmpeg/FFprobe cho darwin-${architecture}. Hãy chạy prepare-media trên runner ${architecture}.`);
  }
  const destination = path.join(tempRoot, `bin-${architecture}`);
  fs.mkdirSync(destination, { recursive: true });
  copy(architectureSource, path.join(destination, "darwin"));
  for (const entry of ["licenses", "README.md"]) {
    const source = path.join(sourceBin, entry);
    if (fs.existsSync(source)) copy(source, path.join(destination, entry));
  }
  return destination;
}

function run(args) {
  console.log(`$ electron-builder ${args.join(" ")}`);
  const result = spawnSync(electronBuilder, args, {
    cwd: projectDir,
    env: process.env,
    stdio: "inherit",
  });
  if (result.status !== 0) fail(`electron-builder thất bại với mã ${result.status ?? "không xác định"}.`);
}

function appPath(output) {
  const candidates = [path.join(output, "JACS Studio.app"), path.join(output, "mac", "JACS Studio.app"), path.join(output, "mac-arm64", "JACS Studio.app")];
  const value = candidates.find((candidate) => fs.existsSync(candidate));
  if (!value) fail(`Không tìm thấy app đã build trong: ${output}`);
  return value;
}

async function main() {
  if (process.platform !== "darwin") fail("Đóng gói macOS Universal cần chạy trên macOS.");
  fs.mkdirSync(releaseDir, { recursive: true });
  const x64Bin = stageBin("x64");
  const arm64Bin = stageBin("arm64");
  for (const output of [x64Output, arm64Output, universalOutput]) fs.rmSync(output, { recursive: true, force: true });
  const baseConfig = {
    appId: "vn.nexoratech.jacs.studio",
    productName: "JACS Studio",
    files: ["dist/**/*", "electron/**/*", "package.json"],
    mac: { target: ["dir"], category: "public.app-category.video" },
  };

  try {
    fs.writeFileSync(configPath, JSON.stringify({ ...baseConfig, directories: { output: x64Output }, extraResources: [{ from: x64Bin, to: "bin", filter: ["**/*"] }] }, null, 2));
    run(["--mac", "dir", "--x64", "--config", configPath, "--publish", "never"]);
    fs.writeFileSync(configPath, JSON.stringify({ ...baseConfig, directories: { output: arm64Output }, extraResources: [{ from: arm64Bin, to: "bin", filter: ["**/*"] }] }, null, 2));
    run(["--mac", "dir", "--arm64", "--config", configPath, "--publish", "never"]);

    fs.rmSync(universalOutput, { recursive: true, force: true });
    const builderPackage = require.resolve("electron-builder");
    const universalModule = require(require.resolve("@electron/universal", { paths: [path.dirname(builderPackage)] }));
    await universalModule.makeUniversalApp({
      x64AppPath: appPath(x64Output),
      arm64AppPath: appPath(arm64Output),
      outAppPath: path.join(universalOutput, "JACS Studio.app"),
      force: true,
    });
    fs.writeFileSync(configPath, JSON.stringify({ ...baseConfig, directories: { output: releaseDir } }, null, 2));
    run(["--mac", "dmg", "zip", "--prepackaged", appPath(universalOutput), "--config", configPath, "--publish", "never"]);
    // electron-builder derives the artifact arch from the current host when
    // packaging a prebuilt app; publish explicit Universal filenames instead.
    const generatedZip = path.join(releaseDir, `JACS Studio-${packageVersion}-arm64-mac.zip`);
    const generatedDmg = path.join(releaseDir, `JACS Studio-${packageVersion}-arm64.dmg`);
    if (!fs.existsSync(generatedZip) || !fs.existsSync(generatedDmg)) fail("Không tìm thấy artifact Universal sau khi đóng gói.");
    fs.copyFileSync(generatedZip, path.join(releaseDir, `JACS Studio-${packageVersion}-universal-mac.zip`));
    fs.copyFileSync(generatedDmg, path.join(releaseDir, `JACS Studio-${packageVersion}-universal.dmg`));
  } finally {
    fs.rmSync(configPath, { force: true });
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});
