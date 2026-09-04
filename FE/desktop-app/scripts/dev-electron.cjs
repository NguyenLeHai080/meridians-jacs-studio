const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const devUrl = process.env.JACS_DESKTOP_DEV_URL || "http://127.0.0.1:5174";
const viteEntry = path.join(path.dirname(require.resolve("vite/package.json")), "bin", "vite.js");
const electronLauncher = path.join(projectRoot, "electron", "launch.cjs");

const environment = { ...process.env, JACS_DESKTOP_DEV_URL: devUrl };
const vite = spawn(process.execPath, [viteEntry, "--host", "127.0.0.1", "--port", "5174", "--strictPort"], {
  cwd: projectRoot,
  env: environment,
  stdio: "inherit",
  windowsHide: false,
});

let electron;
let restarting = false;
let stopping = false;
let restartTimer;

async function waitForVite() {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(devUrl, { signal: AbortSignal.timeout(500) });
      if (response.ok) return;
    } catch { /* Vite is still starting. */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Vite không khởi động tại ${devUrl}`);
}

function startElectron() {
  electron = spawn(process.execPath, [electronLauncher, ...process.argv.slice(2)], {
    cwd: projectRoot,
    env: environment,
    stdio: "inherit",
    windowsHide: false,
  });
  electron.once("error", (error) => {
    console.error(`Không thể khởi động Electron: ${error.message}`);
    stop(1);
  });
  electron.once("exit", (code, signal) => {
    electron = undefined;
    if (stopping || restarting) return;
    stop(signal ? 0 : (code ?? 0));
  });
}

function restartElectron() {
  if (stopping) return;
  restarting = true;
  const previous = electron;
  electron = undefined;
  if (!previous) {
    restarting = false;
    startElectron();
    return;
  }
  previous.once("exit", () => {
    restarting = false;
    if (!stopping) startElectron();
  });
  previous.kill("SIGTERM");
  setTimeout(() => {
    if (previous.exitCode === null) previous.kill("SIGKILL");
  }, 2_000).unref();
}

function scheduleRestart() {
  clearTimeout(restartTimer);
  restartTimer = setTimeout(restartElectron, 150);
}

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  clearTimeout(restartTimer);
  if (electron) electron.kill("SIGTERM");
  if (vite.exitCode === null) vite.kill("SIGTERM");
  setTimeout(() => process.exit(code), 250).unref();
}

for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) process.once(signal, () => stop(0));
vite.once("exit", (code) => {
  if (!stopping && code !== 0) stop(code ?? 1);
});

fs.watch(path.join(projectRoot, "electron"), { recursive: true }, (_event, filename) => {
  if (filename) scheduleRestart();
});

waitForVite().then(startElectron).catch((error) => {
  console.error(error.message);
  stop(1);
});
