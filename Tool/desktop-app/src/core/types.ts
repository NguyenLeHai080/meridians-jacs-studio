export type NavKey = "overview" | "sources" | "analysis" | "story" | "timeline" | "brand" | "batch" | "render" | "activation" | "settings";
export type JobStatus = "queued" | "running" | "completed" | "failed" | "cancelled";
export type JobStage = "queued" | "downloading" | "probing" | "analyzing" | "outlining" | "script_review" | "generating_voice" | "matching_scenes" | "timeline_review" | "rendering" | "qa" | "completed" | "failed" | "cancelled";
export type Job = {
  id: string;
  name: string;
  source: string;
  sourceType?: "file" | "url";
  localPath?: string;
  /** Ordered local inputs for a project assembled from multiple videos. */
  sourcePaths?: string[];
  /** Library-only source record; it must not enter the processing worker. */
  sourceOnly?: boolean;
  mode: "local-gpu" | "local-cpu" | "cloud" | "hybrid";
  providerId?: string;
  /** Separate BYOK profile used for speech-to-text (for example Groq Whisper). */
  transcriptionProviderId?: string;
  /** Separate BYOK profile used for narration/TTS when analysis uses another provider. */
  ttsProviderId?: string;
  parentJobId?: string;
  /** Source scene identity for a manually exported scene clip. */
  sceneId?: string;
  childJobIds?: string[];
  qa?: { passed: boolean; checks: Array<{ id: string; passed: boolean; detail: string }> };
  timelineClips?: TimelineClip[];
  /** Automatic scene fan-out waits here until the contextual script is approved. */
  requiresScriptApproval?: boolean;
  splitScenes?: boolean;
  /** Run context/scene analysis and save the result without rendering output. */
  analysisOnly?: boolean;
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
  subtitlesEnabled?: boolean;
  subtitleStyle?: "bottom" | "center" | "top";
  subtitleText?: string;
  logoPath?: string;
  logoPosition?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  logoOpacity?: number;
  analysis?: AnalysisResult;
  status: JobStatus;
  progress: number;
  stage?: JobStage;
  error?: string;
  outputPath?: string;
  /** Sidecar SRT generated for the rendered output, when subtitles are enabled. */
  subtitlesPath?: string;
  outputFolder?: string;
  /** Stable filename stem used when a scene is exported as its own clip. */
  outputFileName?: string;
  passthrough?: boolean;
  narrationGenerated?: boolean;
  /** Number of caption cues written to the rendered SRT/burn-in track. */
  subtitleCueCount?: number;
  /** Actual voice engine used for this output (provider or local fallback). */
  voiceEngine?: "provider" | "local" | "none";
  /** Duration measured from the generated narration audio before fit-to-scene. */
  narrationDurationSeconds?: number;
  subtitlesBurned?: boolean;
  outputChecksum?: string;
  manifestPath?: string;
  durationSeconds?: number;
  creditsUsed?: number;
  tokensUsed?: number;
  createdAt: string;
  synced?: boolean;
};
export type MachineInfo = { machineId: string; machineIdSource: "platform" | "installation" | "browser-demo"; platform: "windows" | "macos" | "linux"; arch: string; appVersion: string };
export type ToolPreferences = {
  workspaceName: string;
  operatorName: string;
  workspacePath: string;
  cachePath: string;
  outputPath: string;
  telemetryEnabled: boolean;
  autoUpdateEnabled: boolean;
  preferredEngine: "auto" | "apple" | "nvidia" | "cpu";
  logoPath?: string;
  brandKitLogo?: string;
};
export type ProviderType = "openai" | "gemini" | "anthropic" | "openai-compatible" | "custom";
export type ProviderProfile = { id: string; name: string; providerType: ProviderType; baseUrl: string; model: string; transcriptionModel?: string; ttsModel?: string; capabilities: string[]; enabled: boolean; hasApiKey: boolean; maskedKey: string };
export type ProviderDraft = { id?: string; name: string; providerType: ProviderType; baseUrl: string; model: string; transcriptionModel?: string; ttsModel?: string; apiKey?: string; capabilities: string[]; enabled: boolean };
export type VoiceProfile = { id: string; label: string; language: string; locale: string; gender: "male" | "female"; engine?: string };
export const DEFAULT_PREFERENCES: ToolPreferences = {
  workspaceName: "Workspace của tôi",
  operatorName: "Người dùng",
  workspacePath: "~/Movies/JACS Studio/Projects",
  cachePath: "~/Library/Application Support/JACS/cache",
  outputPath: "~/Movies/JACS Studio/Outputs",
  telemetryEnabled: true,
  autoUpdateEnabled: true,
  preferredEngine: "auto",
};

export type ProviderConnectionResult = { status: "reachable" | "invalid_credentials" | "unsupported" | "unreachable"; detail: string; latencyMs: number; httpStatus?: number };
export type ClientMetrics = { total_jobs: number; failed_jobs: number; completed_jobs: number; tokens_used: number; credits_used: number };
export type VideoProbe = { path: string; durationSeconds: number; width?: number; height?: number; fps?: number; sizeBytes?: number; hasAudio?: boolean };
export type AnalysisFrame = { timestampSeconds: number; imageDataUrl: string };
export type TranscriptSegment = { start: number; end: number; text: string; speaker?: string; confidence?: number; words?: Array<{ start: number; end: number; text: string; confidence?: number }> };
export type StoryPlan = { hook: string; setup: string; buildUp: string; climax: string; cta: string; targetDurationSeconds?: number; status: "draft" | "approved"; approvedAt?: string; version?: number; approvedBy?: string };
export type VoiceSegment = { id: string; sceneId: string; text: string; start: number; end: number; audioStart?: number; audioEnd?: number; audioPath?: string; words?: Array<{ start: number; end: number; text: string; confidence?: number }>; status: "draft" | "ready" | "failed" };
export type SceneMatchClip = { sceneId: string; sourceStart: number; sourceEnd: number; score: number };
export type TimelineClip = { sceneId: string; order: number; trimIn?: number; trimOut?: number; sourceSceneId?: string };
export type SceneMatch = { voiceSegmentId: string; sceneId: string; sourceStart: number; sourceEnd: number; sourceClips?: SceneMatchClip[]; voiceStart: number; voiceEnd: number; matchScore: number; reason: string; fallbackReason?: string; needsReview: boolean };
export type AnalysisScene = { id?: string; start: string; end?: string; title: string; detail: string; translation?: string; voiceover?: string; keywords?: string[]; confidence?: number };
export type AnalysisResult = { summary: string; scenes: AnalysisScene[]; score: number; tokensUsed: number; creditsUsed: number; transcript?: string; transcriptSegments?: TranscriptSegment[]; translatedTranscript?: string; sourceLanguage?: string; voiceScript?: string; topics?: string[]; hookCandidates?: Array<{ sceneId?: string; start?: string; end?: string; reason?: string }>; facts?: Array<{ text: string; source?: string; confidence?: number }>; safetyNotes?: string[]; storyPlan?: StoryPlan; voiceSegments?: VoiceSegment[]; sceneMatches?: SceneMatch[]; previewFrames?: AnalysisFrame[] };
export type RenderResult = { outputPath: string; durationSeconds: number; passthrough?: boolean; warnings?: string[]; narrationGenerated?: boolean; narrationDurationSeconds?: number; subtitleCueCount?: number; voiceEngine?: "provider" | "local" | "none"; subtitlesBurned?: boolean; subtitlesPath?: string; outputChecksum?: string; manifestPath?: string };
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
  listVoices?: (language?: string) => Promise<VoiceProfile[]>;
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
  pickImage?: () => Promise<string | null>;
  downloadVideo?: (url: string, operationId?: string) => Promise<string>;
  probeVideo?: (path: string) => Promise<VideoProbe>;
  analyzeVideo?: (path: string, providerId?: string, operationId?: string, options?: Pick<Job, "narratorEnabled" | "narratorVoice" | "narratorGender" | "languages" | "keepOriginalAudio" | "emphasizeHook" | "highlightOnly" | "highlightMaxSeconds" | "backgroundMusic" | "transcriptionProviderId">) => Promise<AnalysisResult>;
  renderVideo?: (path: string, outputFolder?: string, options?: { mode?: string; startSeconds?: number; endSeconds?: number; outputFileName?: string; aspectRatio?: Job["aspectRatio"]; preferredEngine?: ToolPreferences["preferredEngine"]; subjectTracking?: boolean; keepOriginalAudio?: boolean; backgroundMusic?: boolean; backgroundMusicVolume?: number; backgroundMusicPath?: string; narrationText?: string; narratorEnabled?: boolean; narratorVoice?: string; narratorGender?: "male" | "female"; language?: string; providerId?: string; ttsProviderId?: string; subtitlesEnabled?: boolean; subtitleStyle?: Job["subtitleStyle"]; subtitleText?: string; subtitleSegments?: Array<{ start: number; end: number; text: string }>; logoPath?: string; logoPosition?: Job["logoPosition"]; logoOpacity?: number }, operationId?: string) => Promise<RenderResult>;
  mergeVideos?: (paths: string[], operationId?: string) => Promise<string>;
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
  { key: "sources", label: "Nguồn video", hint: "Assets & proxy", icon: "folder" },
  { key: "analysis", label: "Phân tích AI", hint: "Transcript & scenes", icon: "scan" },
  { key: "story", label: "Kịch bản & Voice", hint: "Story + narration", icon: "mic" },
  { key: "timeline", label: "Chọn cảnh & Timeline", hint: "Voice to footage", icon: "timeline" },
  { key: "brand", label: "Phụ đề & Thương hiệu", hint: "Captions + logo", icon: "captions" },
  { key: "batch", label: "Tạo job hàng loạt", hint: "Batch queue", icon: "layers" },
  { key: "render", label: "Render & xuất bản", hint: "Media engine", icon: "play" },
  { key: "activation", label: "License & thiết bị", hint: "Activation", icon: "key" },
  { key: "settings", label: "Cài đặt tool", hint: "Preferences", icon: "sliders" },
];
