import { DEFAULT_PREFERENCES, type DesktopRuntime, type Job, type MachineInfo, type ProviderDraft, type ProviderProfile, type ToolPreferences } from "./types";
const fallbackInfo: MachineInfo = { machineId: "WEB-DEMO-MACHINE", machineIdSource: "browser-demo", platform: "linux", arch: "x64", appVersion: "0.3.4" };
const browserProviders: ProviderProfile[] = [];
function browserPreferences(): ToolPreferences { try { return { ...DEFAULT_PREFERENCES, ...JSON.parse(localStorage.getItem("jacs.preferences") ?? "{}") }; } catch { return DEFAULT_PREFERENCES; } }
const browserRuntime: DesktopRuntime = { getMachineInfo: async () => fallbackInfo, readLicense: async () => localStorage.getItem("jacs.license"), saveLicense: async (value) => localStorage.setItem("jacs.license", value), clearLicense: async () => localStorage.removeItem("jacs.license"), getPreferences: async () => browserPreferences(), savePreferences: async (value) => localStorage.setItem("jacs.preferences", JSON.stringify(value)), getMediaCapabilities: async () => ({ ffmpeg: false, ffprobe: false }), clearCache: async () => undefined, getProviderProfiles: async () => browserProviders.map((item) => ({ ...item })), saveProviderProfile: async (_value: ProviderDraft) => { throw new Error("Cấu hình API key chỉ khả dụng trong bản Electron đã cài đặt; không nhập secret trên trình duyệt."); }, deleteProviderProfile: async (_id) => undefined, testProviderConnection: async () => ({ status: "unsupported", detail: "Hãy chạy bản Electron để kiểm tra provider qua secure network bridge", latencyMs: 0 }), checkForUpdate: async () => ({ update_available: false, release: null }), downloadUpdate: async () => { throw new Error("Cập nhật cần chạy bản Electron đã cài đặt."); }, openExternal: async () => undefined, pickVideo: async () => null, pickVideos: async () => [], pickOutputFolder: async () => null, probeVideo: async (path) => ({ path, durationSeconds: 0 }), analyzeVideo: async () => { throw new Error("Phân tích video cần chạy bản Electron"); }, renderVideo: async () => { throw new Error("Render video cần chạy bản Electron"); }, readJobs: async () => readLocalJobs<Job[]>([]), saveJobs: async (value) => saveLocalJobs(value), revealPath: async () => undefined, copyText: async (value) => { await navigator.clipboard?.writeText(value); } };
export function getRuntime(): DesktopRuntime { return window.jacsRuntime ?? browserRuntime; }
export function isNativeRuntime(): boolean { return Boolean(window.jacsRuntime); }

export function readLocalJobs<T>(fallback: T): T {
  try { return JSON.parse(localStorage.getItem("jacs.jobs") ?? "null") ?? fallback; } catch { return fallback; }
}

export function saveLocalJobs(value: unknown): void {
  try { localStorage.setItem("jacs.jobs", JSON.stringify(value)); } catch { /* storage may be unavailable in private browser mode */ }
}
