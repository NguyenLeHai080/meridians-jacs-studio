export type NavKey = "overview" | "batch" | "analysis" | "render" | "activation" | "settings";
export type JobStatus = "queued" | "running" | "completed" | "failed";
export type Job = { id: string; name: string; source: string; mode: "local-gpu" | "local-cpu" | "cloud" | "hybrid"; status: JobStatus; progress: number; createdAt: string; synced?: boolean };
export type MachineInfo = { machineId: string; machineIdSource: "platform" | "installation" | "browser-demo"; platform: "windows" | "macos" | "linux"; arch: string; appVersion: string };
export type ToolPreferences = { workspacePath: string; cachePath: string; telemetryEnabled: boolean; autoUpdateEnabled: boolean; preferredEngine: "auto" | "apple" | "nvidia" | "cpu" };
export const DEFAULT_PREFERENCES: ToolPreferences = { workspacePath: "~/Movies/JACS Studio/Projects", cachePath: "~/Library/Application Support/JACS/cache", telemetryEnabled: true, autoUpdateEnabled: true, preferredEngine: "auto" };
export type DesktopRuntime = { getApiBaseUrl?: () => string; getMachineInfo: () => Promise<MachineInfo>; readLicense: () => Promise<string | null>; saveLicense: (value: string) => Promise<void>; clearLicense: () => Promise<void>; getPreferences: () => Promise<ToolPreferences>; savePreferences: (value: ToolPreferences) => Promise<void>; pickVideo: () => Promise<string | null>; revealPath: (value: string) => Promise<void>; copyText: (value: string) => Promise<void> };
export const NAV_ITEMS: Array<{ key: NavKey; label: string; hint: string; icon: string }> = [
  { key: "overview", label: "Tổng quan", hint: "Workspace", icon: "grid" },
  { key: "batch", label: "Tạo job hàng loạt", hint: "Batch queue", icon: "layers" },
  { key: "analysis", label: "Phân tích video", hint: "AI context", icon: "scan" },
  { key: "render", label: "Render & xuất bản", hint: "Media engine", icon: "play" },
  { key: "activation", label: "License & thiết bị", hint: "Activation", icon: "key" },
  { key: "settings", label: "Cài đặt tool", hint: "Preferences", icon: "sliders" },
];
export const DEFAULT_JOBS: Job[] = [
  { id: "job-001", name: "Podcast - tập 24", source: "podcast-ep24.mov", mode: "local-gpu", status: "running", progress: 68, createdAt: "Vừa xong" },
  { id: "job-002", name: "Shorts - sản phẩm mùa hè", source: "summer-product.mp4", mode: "hybrid", status: "queued", progress: 0, createdAt: "2 phút trước" },
  { id: "job-003", name: "Review camera X5", source: "camera-review.mp4", mode: "local-gpu", status: "completed", progress: 100, createdAt: "Hôm qua" },
];
