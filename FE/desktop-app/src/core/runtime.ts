import {
  DEFAULT_PREFERENCES,
  type DesktopRuntime,
  type Job,
  type MachineInfo,
  type ProviderDraft,
  type ProviderProfile,
  type ToolPreferences,
  type VoiceProfile,
} from "./types";

const fallbackInfo: MachineInfo = {
  machineId: "JACS-WIN-6CEE353124BD6146710EEBC9A3141263",
  machineIdSource: "platform",
  platform: "windows",
  arch: "x64",
  appVersion: "0.8.28",
};

const browserProviders: ProviderProfile[] = [];

function browserPreferences(): ToolPreferences {
  try {
    return {
      ...DEFAULT_PREFERENCES,
      ...JSON.parse(localStorage.getItem("jacs.preferences") ?? "{}"),
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function detectBrowserHardware() {
  let gpuName = "Standard GPU Acceleration";
  let encoder: "nvenc" | "qsv" | "amf" | "videotoolbox" | "cpu" = "cpu";
  let hasNvidia = false;
  let hasIntel = false;
  let hasAmd = false;
  let hasApple = typeof navigator !== "undefined" && navigator.userAgent.includes("Mac");

  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (gl) {
      const debugInfo = (gl as any).getExtension("WEBGL_debug_renderer_info");
      if (debugInfo) {
        const unmasked = (gl as any).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || "";
        if (unmasked) {
          gpuName = unmasked.replace(/^ANGLE \(([^,]+), /, "").replace(/, [^)]+\)$/, "").trim();
          if (/nvidia/i.test(unmasked)) { encoder = "nvenc"; hasNvidia = true; }
          else if (/intel/i.test(unmasked)) { encoder = "qsv"; hasIntel = true; }
          else if (/amd|radeon/i.test(unmasked)) { encoder = "amf"; hasAmd = true; }
          else if (/apple/i.test(unmasked) || hasApple) { encoder = "videotoolbox"; hasApple = true; }
        }
      }
    }
  } catch {}

  const cores = typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 8 : 8;
  const memGb = typeof navigator !== "undefined" && (navigator as any).deviceMemory ? (navigator as any).deviceMemory : 16;

  return {
    cpuModel: hasApple ? "Apple Silicon SoC" : `Multi-Core Processor (${cores} Cores)`,
    cpuCores: cores,
    totalMemoryGb: memGb,
    freeMemoryGb: Number((memGb * 0.45).toFixed(1)),
    gpuName,
    gpuVramGb: hasApple ? Math.round(memGb * 0.75) : (hasNvidia ? 8.0 : 4.0),
    gpuUsedVramGb: hasNvidia ? 2.4 : 1.2,
    gpuTemperature: 32,
    gpuUtilization: 18,
    encoder,
    hasNvidia,
    hasIntel,
    hasAmd,
    hasApple,
  };
}

const browserRuntime: DesktopRuntime = {
  getMachineInfo: async () => fallbackInfo,
  getHardwareStats: async () => detectBrowserHardware(),
  readLicense: async () => localStorage.getItem("jacs.license") || null,
  saveLicense: async (value: string) => localStorage.setItem("jacs.license", value),
  clearLicense: async () => localStorage.removeItem("jacs.license"),
  getPreferences: async () => browserPreferences(),
  savePreferences: async (value: ToolPreferences) =>
    localStorage.setItem("jacs.preferences", JSON.stringify(value)),
  getMediaCapabilities: async () => ({ ffmpeg: false, ffprobe: false }),
  clearCache: async () => undefined,
  getProviderProfiles: async () => browserProviders.map((item) => ({ ...item })),
  syncManagedProviders: async (_providers: any[]) => browserProviders.map((item) => ({ ...item })),
  listVoices: async (_language?: string): Promise<VoiceProfile[]> => [],
  saveProviderProfile: async (_value: ProviderDraft) => {
    throw new Error(
      "Cấu hình API key chỉ khả dụng trong bản Electron đã cài đặt; không nhập secret trên trình duyệt."
    );
  },
  deleteProviderProfile: async (_id) => undefined,
  testProviderConnection: async () => ({
    status: "unsupported",
    detail: "Hãy chạy bản Electron để kiểm tra provider qua secure network bridge",
    latencyMs: 0,
  }),
  checkForUpdate: async (channel = "stable") => {
    try {
      const platform = typeof navigator !== "undefined" && navigator.userAgent.includes("Mac") ? "macos" : "windows";
      const currentVersion = "v0.3.17";
      const apiBase = "http://localhost:8000";
      const res = await fetch(`${apiBase}/api/v1/releases/check?platform=${platform}&current_version=${currentVersion}&channel=${channel}`);
      if (!res.ok) return { update_available: false, release: null };
      const data = await res.json();
      return data.data || data;
    } catch {
      return { update_available: false, release: null };
    }
  },
  downloadUpdate: async () => {
    await new Promise((r) => setTimeout(r, 1200));
    window.location.reload();
    return { status: "installing" };
  },
  openExternal: async () => undefined,
  pickVideo: async () => null,
  pickVideos: async () => [],
  pickOutputFolder: async () => null,
  pickImage: async () => null,
  probeVideo: async (path) => ({ path, durationSeconds: 0 }),
  analyzeVideo: async () => {
    throw new Error("Phân tích video cần chạy bản Electron");
  },
  renderVideo: async () => {
    throw new Error("Render video cần chạy bản Electron");
  },
  mergeVideos: async () => {
    throw new Error("Ghép nhiều video cần chạy bản Electron");
  },
  readJobs: async () => readLocalJobs<Job[]>([]),
  saveJobs: async (value) => saveLocalJobs(value),
  revealPath: async () => undefined,
  copyText: async (value) => {
    await navigator.clipboard?.writeText(value);
  },
};

export function getRuntime(): DesktopRuntime {
  return window.jacsRuntime ?? browserRuntime;
}

export function isNativeRuntime(): boolean {
  return Boolean(window.jacsRuntime);
}

export function readLocalJobs<T>(fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem("jacs.jobs") ?? "null") ?? fallback;
  } catch {
    return fallback;
  }
}

export function saveLocalJobs(value: unknown): void {
  try {
    localStorage.setItem("jacs.jobs", JSON.stringify(value));
  } catch {
    /* storage may be unavailable in private browser mode */
  }
}
