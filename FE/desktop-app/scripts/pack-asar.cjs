const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const childProcess = require("node:child_process");

const ROOT_DIR = path.resolve(__dirname, "..");
const STAGING_DIR = path.join(ROOT_DIR, "temp_app");
const RELEASE_DIR = path.join(ROOT_DIR, "release");
const ASAR_OUTPUT = path.join(RELEASE_DIR, "app.asar");

// 1. Prepare Staging Directory
if (fs.existsSync(STAGING_DIR)) {
  fs.rmSync(STAGING_DIR, { recursive: true, force: true });
}
fs.mkdirSync(STAGING_DIR, { recursive: true });
fs.mkdirSync(RELEASE_DIR, { recursive: true });

console.log("📦 Copying dist, electron, and package.json to staging folder...");
fs.cpSync(path.join(ROOT_DIR, "dist"), path.join(STAGING_DIR, "dist"), { recursive: true });
fs.cpSync(path.join(ROOT_DIR, "electron"), path.join(STAGING_DIR, "electron"), { recursive: true });
fs.copyFileSync(path.join(ROOT_DIR, "package.json"), path.join(STAGING_DIR, "package.json"));

// 2. Pack asar
console.log("⚡ Packing app.asar with npx asar...");
childProcess.execSync(`npx asar pack "${STAGING_DIR}" "${ASAR_OUTPUT}"`, { stdio: "inherit", cwd: ROOT_DIR });

// 3. Clean up staging
fs.rmSync(STAGING_DIR, { recursive: true, force: true });

// 4. Calculate SHA-512
const asarBuffer = fs.readFileSync(ASAR_OUTPUT);
const sha512 = crypto.createHash("sha512").update(asarBuffer).digest("hex");
console.log(`✅ app.asar generated successfully! Size: ${(asarBuffer.length / 1024 / 1024).toFixed(2)} MB`);
console.log(`🔑 SHA-512: ${sha512}`);

// 5. Update local installed app if available
const candidateFolders = ["JACS Studio", "jacs-studio", "@jacsdesktop-app"];
for (const folder of candidateFolders) {
  const localAsar = path.join(process.env.LOCALAPPDATA || "", "Programs", folder, "resources", "app.asar");
  if (fs.existsSync(path.dirname(localAsar))) {
    try {
      fs.copyFileSync(ASAR_OUTPUT, localAsar);
      console.log(`🚀 Updated local installed app at: ${localAsar}`);
    } catch (err) {
      console.warn(`⚠️ Could not overwrite local installed app.asar at ${folder}: ${err.message}`);
    }
  }
}
