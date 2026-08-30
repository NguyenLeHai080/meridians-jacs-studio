export type NavKey = "overview" | "batch" | "analysis" | "render" | "activation" | "settings";
export type JobStatus = "queued" | "running" | "completed" | "failed" | "cancelled";
export type Job = {
  id: string;
  name: string;
  source: string;
  sourceType?: "file" | "url";
  localPath?: string;
  mode: "local-gpu" | "local-cpu" | "cloud" | "hybrid";
  providerId?: string;
  /** Separate BYOK profile used for narration/TTS when analysis uses another provider. */
  ttsProviderId?: string;
  parentJobId?: string;
  splitScenes?: boolean;
  clipStartSeconds?: number;
  clipEndSeconds?: number;
  aspectRatio?: "original" | "9:16" | "1:1" | "16:9";
  narratorEnabled?: boolean;
  narratorVoice?: string;
  narratorGender?: "male" | "female";
  languages?: string[];
  keepOriginalAudio?: boolean;
  emphasizeHook?: boolean;
  highlightOnly?: boolean;
  highlightMaxSeconds?: number;
  backgroundMusic?: boolean;
  backgroundMusicVolume?: number;
  backgroundMusicPath?: string;
  analysis?: AnalysisResult;
  status: JobStatus;
  progress: number;
  stage?: "queued" | "downloading" | "analyzing" | "rendering" | "completed" | "failed" | "cancelled";
  error?: string;
  outputPath?: string;
  outputFolder?: string;
  passthrough?: boolean;
  durationSeconds?: number;
  creditsUsed?: number;
  tokensUsed?: number;
  createdAt: string;
  synced?: boolean;
};
export type MachineInfo = { machineId: string; machineIdSource: "platform" | "installation" | "browser-demo"; platform: "windows" | "macos" | "linux"; arch: string; appVersion: string };
export type ToolPreferences = { workspaceName: string; operatorName: string; workspacePath: string; cachePath: string; outputPath: string; telemetryEnabled: boolean; autoUpdateEnabled: boolean; preferredEngine: "auto" | "apple" | "nvidia" | "cpu" };
export type ProviderType = "openai" | "gemini" | "anthropic" | "openai-compatible" | "custom";
export type ProviderProfile = { id: string; name: string; providerType: ProviderType; baseUrl: string; model: string; transcriptionModel?: string; capabilities: string[]; enabled: boolean; hasApiKey: boolean; maskedKey: string };
export type ProviderDraft = { id?: string; name: string; providerType: ProviderType; baseUrl: string; model: string; transcriptionModel?: string; apiKey?: string; capabilities: string[]; enabled: boolean };
export const DEFAULT_PREFERENCES: ToolPreferences = { workspaceName: "Workspace của tôi", operatorName: "Người dùng", workspacePath: "~/Movies/JACS Studio/Projects", cachePath: "~/Library/Application Support/JACS/cache", outputPath: "~/Movies/JACS Studio/Outputs", telemetryEnabled: true, autoUpdateEnabled: true, preferredEngine: "auto" };
export type ProviderConnectionResult = { status: "reachable" | "invalid_credentials" | "unsupported" | "unreachable"; detail: string; latencyMs: number; httpStatus?: number };
export type ClientMetrics = { total_jobs: number; failed_jobs: number; completed_jobs: number; tokens_used: number; credits_used: number };
export type VideoProbe = { path: string; durationSeconds: number; width?: number; height?: number; fps?: number; sizeBytes?: number; hasAudio?: boolean };
export type AnalysisFrame = { timestampSeconds: number; imageDataUrl: string };
export type AnalysisResult = { summary: string; scenes: Array<{ start: string; end?: string; title: string; detail: string }>; score: number; tokensUsed: number; creditsUsed: number; transcript?: string; previewFrames?: AnalysisFrame[] };
export type RenderResult = { outputPath: string; durationSeconds: number; passthrough?: boolean; warnings?: string[] };
export type RuntimeProgress = { progress: number; stage: string; outputPath?: string; error?: string; operationId?: string };
export type MediaCapabilities = { ffmpeg: boolean; ffprobe: boolean; ffmpegPath?: string; ffprobePath?: string };
export type UpdateRelease = { version: string; platform: "windows" | "macos"; channel: "stable" | "beta"; download_url: string; sha512: string; release_notes: string; force_update: boolean; signature?: string | null };
export type UpdateCheckResult = { update_available: boolean; release: UpdateRelease | null };
export type UpdateProgress = { stage: "downloading" | "verifying" | "installing" | "completed" | "failed"; progress: number; bytesDownloaded?: number; totalBytes?: number; error?: string };
export type DesktopRuntime = {
  getApiBaseUrl?: () => string;
  getMachineInfo: () => Promise<MachineInfo>;
  readLicense: () => Promise<string | null>;
  saveLicense: (value: string) => Promise<void>;
  clearLicense: () => Promise<void>;
  getPreferences: () => Promise<ToolPreferences>;
  savePreferences: (value: ToolPreferences) => Promise<void>;
  getMediaCapabilities?: () => Promise<MediaCapabilities>;
  clearCache?: () => Promise<void>;
  getProviderProfiles: () => Promise<ProviderProfile[]>;
  saveProviderProfile: (value: ProviderDraft) => Promise<ProviderProfile>;
  deleteProviderProfile: (id: string) => Promise<void>;
  testProviderConnection: (id: string) => Promise<ProviderConnectionResult>;
  checkForUpdate?: (channel?: "stable" | "beta") => Promise<UpdateCheckResult>;
  downloadUpdate?: (release: UpdateRelease) => Promise<{ status: "installing" | "manual" }>;
  openExternal?: (url: string) => Promise<void>;
  cancelOperation?: (operationId: string) => Promise<boolean>;
  pickVideo: () => Promise<string | null>;
  pickVideos?: () => Promise<string[]>;
  pickOutputFolder?: () => Promise<string | null>;
  pickAudio?: () => Promise<string | null>;
  downloadVideo?: (url: string, operationId?: string) => Promise<string>;
  probeVideo?: (path: string) => Promise<VideoProbe>;
  analyzeVideo?: (path: string, providerId?: string, operationId?: string, options?: Pick<Job, "narratorEnabled" | "narratorVoice" | "narratorGender" | "languages" | "keepOriginalAudio" | "emphasizeHook" | "highlightOnly" | "highlightMaxSeconds" | "backgroundMusic">) => Promise<AnalysisResult>;
  renderVideo?: (path: string, outputFolder?: string, options?: { mode?: string; startSeconds?: number; endSeconds?: number; aspectRatio?: Job["aspectRatio"]; preferredEngine?: ToolPreferences["preferredEngine"]; keepOriginalAudio?: boolean; backgroundMusic?: boolean; backgroundMusicVolume?: number; backgroundMusicPath?: string; narrationText?: string; narratorEnabled?: boolean; narratorVoice?: string; providerId?: string }, operationId?: string) => Promise<RenderResult>;
  onDownloadProgress?: (listener: (value: RuntimeProgress) => void) => () => void;
  onAnalysisProgress?: (listener: (value: RuntimeProgress) => void) => () => void;
  onRenderProgress?: (listener: (value: RuntimeProgress) => void) => () => void;
  onUpdateProgress?: (listener: (value: UpdateProgress) => void) => () => void;
  readJobs?: () => Promise<Job[]>;
  saveJobs?: (jobs: Job[]) => Promise<void>;
  revealPath: (value: string) => Promise<void>;
  copyText: (value: string) => Promise<void>;
};
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
