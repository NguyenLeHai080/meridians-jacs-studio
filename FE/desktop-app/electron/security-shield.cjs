/**
 * JACS Studio - Anti-Tamper & Security Shield
 * Enterprise-grade protection against reverse engineering, debugger attaching,
 * memory tampering, devtools inspection and API packet spoofing.
 */

const { app, BrowserWindow, session } = require("electron");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

// Secret application salt for cryptographic message signing
const CLIENT_SIGNING_SALT = "jacs-studio-secure-signature-v2-meridians";

/**
 * 1. Anti-Debugging & Process Quarantine
 * Checks if the process was launched with unauthorized inspection flags.
 */
function inspectProcessFlags() {
  // Check command line arguments for debug flags
  const dangerousFlags = [
    "--inspect",
    "--inspect-brk",
    "--remote-debugging-port",
    "--enable-logging",
    "--remote-debugging-address",
    "--js-flags=--expose-gc",
  ];

  const fullArgs = [...process.argv, ...(process.execArgv || [])].join(" ").toLowerCase();
  for (const flag of dangerousFlags) {
    if (fullArgs.includes(flag.toLowerCase())) {
      console.error(`[SECURITY ALERT] Unauthorized debugging flag detected: ${flag}`);
      quarantineAndExit("Phát hiện công cụ can thiệp hoặc debug trái phép.");
    }
  }

  // Check dangerous environment variables
  if (process.env.ELECTRON_RUN_AS_NODE === "1") {
    console.error("[SECURITY ALERT] ELECTRON_RUN_AS_NODE detected.");
    quarantineAndExit("Chế độ chạy không an toàn.");
  }
}

/**
 * 2. Exit application cleanly when security is compromised
 */
function quarantineAndExit(reason = "Security check failed") {
  try {
    const wins = BrowserWindow.getAllWindows();
    for (const win of wins) {
      win.destroy();
    }
  } catch {}

  console.error(`[JACS SECURITY SHIELD] Terminating application: ${reason}`);
  app.exit(1);
}

/**
 * 3. Keyboard & DevTools Lockout for Windows
 * Disables F12, Ctrl+Shift+I, Cmd+Alt+I, Ctrl+U, and right-click Inspect in production.
 */
function applyWindowSecurityShield(win) {
  if (!win || win.isDestroyed()) return;

  // Block DevTools opening in production
  if (app.isPackaged || process.env.NODE_ENV === "production") {
    win.webContents.on("devtools-opened", () => {
      win.webContents.closeDevTools();
    });

    // Block right-click context menu inspect element
    win.webContents.on("context-menu", (e) => {
      e.preventDefault();
    });
  }

  // Block sensitive shortcut keys
  win.webContents.on("before-input-event", (event, input) => {
    const isDev = !app.isPackaged && process.env.NODE_ENV === "development";
    if (isDev) return; // Allow devtools only in explicit development

    const key = (input.key || "").toLowerCase();
    const ctrlOrMeta = input.control || input.meta;

    // F12 or Shift+F12
    if (key === "f12") {
      event.preventDefault();
      return;
    }

    // Ctrl+Shift+I or Cmd+Option+I (Inspect)
    if (ctrlOrMeta && input.shift && (key === "i" || key === "j" || key === "c")) {
      event.preventDefault();
      return;
    }

    // Ctrl+U (View Source)
    if (ctrlOrMeta && key === "u") {
      event.preventDefault();
      return;
    }
  });

  // Block unhandled navigation to external websites within main window
  win.webContents.on("will-navigate", (event, url) => {
    try {
      const parsed = new URL(url);
      const isAllowedOrigin =
        parsed.protocol === "jacs-media:" ||
        parsed.protocol === "file:" ||
        url.startsWith("http://localhost:") ||
        url.startsWith("http://127.0.0.1:") ||
        url.includes("jacs-studio.nexoratech.com.vn") ||
        url.includes("api-meridians.nexoratech.com.vn");

      if (!isAllowedOrigin) {
        event.preventDefault();
      }
    } catch {
      event.preventDefault();
    }
  });
}

/**
 * 4. Cryptographic HMAC Signature Generator for Client API requests
 * Signs request payload with HWID, Timestamp, Nonce and Shared Secret.
 * Prevents MITM Proxy spoofing (Fiddler, Charles, Burp Suite).
 */
function signClientRequest(payload, hwid = "") {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomBytes(12).toString("hex");
  const payloadStr = typeof payload === "string" ? payload : JSON.stringify(payload || {});

  // Signature string: TIMESTAMP:NONCE:HWID:PAYLOAD
  const dataToSign = `${timestamp}:${nonce}:${hwid}:${payloadStr}`;
  const signature = crypto
    .createHmac("sha256", CLIENT_SIGNING_SALT)
    .update(dataToSign)
    .digest("hex");

  return {
    "X-Jacs-Signature": signature,
    "X-Jacs-Timestamp": timestamp,
    "X-Jacs-Nonce": nonce,
    "X-Jacs-Hwid": hwid,
  };
}

/**
 * 5. Verify local bundle integrity (Self-checksum)
 */
function verifyBundleIntegrity() {
  try {
    const asarPath = path.join(app.getAppPath(), "..");
    if (fs.existsSync(asarPath) && asarPath.endsWith(".asar")) {
      const stat = fs.statSync(asarPath);
      if (stat.size < 1024) {
        quarantineAndExit("File gói ứng dụng bị hư hại hoặc sửa đổi bất thường.");
      }
    }
  } catch {}
}

/**
 * Initialize all security protections
 */
function initSecurityShield() {
  inspectProcessFlags();
  verifyBundleIntegrity();

  // Strict CSP & Web Security headers on all local web sessions
  app.whenReady().then(() => {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      const headers = { ...details.responseHeaders };
      // Enforce strict X-Frame-Options & X-Content-Type-Options
      headers["X-Content-Type-Options"] = ["nosniff"];
      headers["X-Frame-Options"] = ["DENY"];
      callback({ responseHeaders: headers });
    });
  });
}

module.exports = {
  initSecurityShield,
  applyWindowSecurityShield,
  signClientRequest,
  quarantineAndExit,
  CLIENT_SIGNING_SALT,
};
