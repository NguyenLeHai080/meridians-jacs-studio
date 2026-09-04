const { spawn } = require("node:child_process");
const path = require("node:path");

// Electron inherits ELECTRON_RUN_AS_NODE in some IDE/agent shells. Remove it
// before launching the actual desktop process so Electron exposes `app` and
// BrowserWindow instead of behaving like a plain Node runtime.
const electronBinary = require("electron");
const environment = { ...process.env };
delete environment.ELECTRON_RUN_AS_NODE;

const projectRoot = path.resolve(__dirname, "..");
const child = spawn(electronBinary, [projectRoot, ...process.argv.slice(2)], {
  cwd: projectRoot,
  env: environment,
  stdio: "inherit",
  windowsHide: false,
});

let stopping = false;
for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.once(signal, () => {
    stopping = true;
    child.kill(signal);
  });
}

child.once("error", (error) => {
  console.error(`Không thể khởi động JACS Studio: ${error.message}`);
  process.exitCode = 1;
});
child.once("exit", (code, signal) => {
  if (stopping) {
    process.exitCode = 0;
    return;
  }
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exitCode = code ?? 1;
});
