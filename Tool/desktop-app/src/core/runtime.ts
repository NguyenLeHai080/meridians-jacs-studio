import { DEFAULT_PREFERENCES, type DesktopRuntime, type MachineInfo, type ToolPreferences } from "./types";
const fallbackInfo: MachineInfo = { machineId: "WEB-DEMO-MACHINE", platform: "linux", arch: "x64", appVersion: "0.3.0" };
function browserPreferences(): ToolPreferences { try { return { ...DEFAULT_PREFERENCES, ...JSON.parse(localStorage.getItem("jacs.preferences") ?? "{}") }; } catch { return DEFAULT_PREFERENCES; } }
const browserRuntime: DesktopRuntime = { getMachineInfo: async () => fallbackInfo, readLicense: async () => localStorage.getItem("jacs.license"), saveLicense: async (value) => localStorage.setItem("jacs.license", value), clearLicense: async () => localStorage.removeItem("jacs.license"), getPreferences: async () => browserPreferences(), savePreferences: async (value) => localStorage.setItem("jacs.preferences", JSON.stringify(value)), pickVideo: async () => null, revealPath: async () => undefined };
export function getRuntime(): DesktopRuntime { return window.jacsRuntime ?? browserRuntime; }

export function readLocalJobs<T>(fallback: T): T {
  try { return JSON.parse(localStorage.getItem("jacs.jobs") ?? "null") ?? fallback; } catch { return fallback; }
}

export function saveLocalJobs(value: unknown): void {
  try { localStorage.setItem("jacs.jobs", JSON.stringify(value)); } catch { /* storage may be unavailable in private browser mode */ }
}
