import type { ClientMetrics, TimelineClip } from "./types";

function apiUrl() {
  return (
    import.meta.env.VITE_API_URL ||
    window.jacsRuntime?.getApiBaseUrl?.() ||
    "https://jacs-studio.nexoratech.com.vn"
  ).replace(/\/$/, "");
}
type ApiEnvelope<T> = { data?: T; error?: { code?: string; message?: string; details?: Record<string, unknown>; request_id?: string } } & T;

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
    public readonly requestId?: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export function getApiBaseUrl() { return apiUrl(); }
export function normalizeLicenseKey(value: string) { return value.replace(/[\s\u200b-\u200d\ufeff]+/g, "").toUpperCase(); }
export function normalizeDeviceId(value: string) { return value.replace(/[\s\u200b-\u200d\ufeff]+/g, "").toUpperCase(); }

async function request<T>(path: string, init: RequestInit = {}, headers: Record<string, string> = {}): Promise<T> {
  const response = await fetch(`${apiUrl()}${path}`, { ...init, headers: { "Content-Type": "application/json", ...headers, ...(init.headers ?? {}) } });
  const body = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;
  if (!response.ok) throw new ApiRequestError(body.error?.message ?? "Không thể kết nối JACS API", body.error?.code ?? "API_REQUEST_FAILED", response.status, body.error?.request_id, body.error?.details);
  return (body.data ?? body) as T;
}

export type BankConfigPublic = {
  bank_name: string;
  bank_bin: string;
  account_number: string;
  account_name: string;
  qr_template?: string;
  custom_qr_url?: string | null;
  plans_pricing?: Record<string, number>;
};

export async function getBankConfig(): Promise<BankConfigPublic> {
  return request<BankConfigPublic>("/api/v1/billing/bank-config");
}

export async function validateLicense(key: string, hwid: string) {
  return request<{ valid: boolean; license_id: string; customer_name?: string | null; logo_url?: string | null; premium_ai: boolean; expires_at: string | null; max_jobs_per_day?: number }>("/api/v1/licenses/validate", { method: "POST", body: JSON.stringify({ key: normalizeLicenseKey(key), hwid: normalizeDeviceId(hwid) }) });
}

export async function heartbeatLicense(key: string, hwid: string, appVersion: string, platform: string) {
  return request<{ valid: boolean; license_id: string; customer_name?: string | null; logo_url?: string | null; premium_ai: boolean; expires_at: string | null; max_jobs_per_day?: number }>("/api/v1/licenses/heartbeat", { method: "POST", body: JSON.stringify({ key: normalizeLicenseKey(key), hwid: normalizeDeviceId(hwid), app_version: appVersion, platform }) });
}

export async function createClientJob(key: string, deviceId: string, job: { id: string; name: string; source: string; mode: string; providerId?: string; ttsProviderId?: string; sourceType?: "file" | "url"; durationSeconds?: number; tokensUsed?: number; creditsUsed?: number; narratorEnabled?: boolean; narratorVoice?: string; narratorGender?: "male" | "female"; languages?: string[]; keepOriginalAudio?: boolean; emphasizeHook?: boolean; highlightOnly?: boolean; highlightMaxSeconds?: number; backgroundMusic?: boolean; backgroundMusicVolume?: number; subtitlesEnabled?: boolean; subtitleStyle?: "bottom" | "center" | "top"; subtitleText?: string; logoPosition?: "top-left" | "top-right" | "bottom-left" | "bottom-right"; logoOpacity?: number; parentJobId?: string; sceneId?: string; splitScenes?: boolean; analysisOnly?: boolean; clipStartSeconds?: number; clipEndSeconds?: number; outputFileName?: string; timelineClips?: TimelineClip[] }) {
  return request<{ id: string; status: string; progress: number }>("/api/v1/client/jobs", { method: "POST", body: JSON.stringify({ client_job_id: job.id, name: job.name, source_name: job.source, execution_mode: job.mode, kind: "render", project_id: "desktop", provider_id: job.providerId, tts_provider_id: job.ttsProviderId, parent_job_id: job.parentJobId, scene_id: job.sceneId, split_scenes: job.splitScenes ?? false, analysis_only: job.analysisOnly ?? false, clip_start_seconds: job.clipStartSeconds, clip_end_seconds: job.clipEndSeconds, output_file_name: job.outputFileName, timeline_clips: job.timelineClips || [], source_type: job.sourceType || "file", duration_seconds: job.durationSeconds, tokens_used: job.tokensUsed || 0, credits_used: job.creditsUsed || 0, narrator_enabled: job.narratorEnabled ?? false, narrator_voice: job.narratorVoice, narrator_gender: job.narratorGender, languages: job.languages || [], keep_original_audio: job.keepOriginalAudio ?? true, emphasize_hook: job.emphasizeHook ?? false, highlight_only: job.highlightOnly ?? false, highlight_max_seconds: job.highlightMaxSeconds ?? 30, background_music: job.backgroundMusic ?? false, background_music_volume: job.backgroundMusicVolume ?? 20, subtitles_enabled: job.subtitlesEnabled ?? true, subtitle_style: job.subtitleStyle ?? "bottom", subtitle_text: job.subtitleText, logo_position: job.logoPosition ?? "bottom-right", logo_opacity: job.logoOpacity ?? 0.82 }) }, { "X-License-Key": normalizeLicenseKey(key), "X-Device-Id": normalizeDeviceId(deviceId) });
}

export async function listClientJobs(key: string, deviceId: string) {
  return request<Array<{ client_job_id: string; name: string; source_name: string; execution_mode: string; status: string; progress: number; stage?: string; error?: string; output_path?: string; tokens_used?: number; credits_used?: number; source_type?: "file" | "url"; provider_id?: string; tts_provider_id?: string; parent_job_id?: string; scene_id?: string; split_scenes?: boolean; analysis_only?: boolean; clip_start_seconds?: number; clip_end_seconds?: number; output_file_name?: string; timeline_clips?: TimelineClip[]; narrator_enabled?: boolean; narrator_voice?: string; narrator_gender?: "male" | "female"; languages?: string[]; keep_original_audio?: boolean; emphasize_hook?: boolean; highlight_only?: boolean; highlight_max_seconds?: number; background_music?: boolean; background_music_volume?: number; subtitles_enabled?: boolean; subtitle_style?: "bottom" | "center" | "top"; subtitle_text?: string; logo_position?: "top-left" | "top-right" | "bottom-left" | "bottom-right"; logo_opacity?: number }>>("/api/v1/client/jobs", {}, { "X-License-Key": normalizeLicenseKey(key), "X-Device-Id": normalizeDeviceId(deviceId) });
}

export async function updateClientJob(key: string, deviceId: string, jobId: string, values: Record<string, unknown>) {
  return request<{ client_job_id: string; status: string; progress: number }>(`/api/v1/client/jobs/${encodeURIComponent(jobId)}`, { method: "PATCH", body: JSON.stringify(values) }, { "X-License-Key": normalizeLicenseKey(key), "X-Device-Id": normalizeDeviceId(deviceId) });
}

export async function deleteClientJob(key: string, deviceId: string, jobId: string) {
  return request<void>(`/api/v1/client/jobs/${encodeURIComponent(jobId)}`, { method: "DELETE" }, { "X-License-Key": normalizeLicenseKey(key), "X-Device-Id": normalizeDeviceId(deviceId) });
}

export async function getClientMetrics(key: string, deviceId: string): Promise<ClientMetrics> {
  return request<ClientMetrics>("/api/v1/client/metrics", {}, { "X-License-Key": normalizeLicenseKey(key), "X-Device-Id": normalizeDeviceId(deviceId) });
}

export async function sendClientTelemetry(key: string, deviceId: string, event: { event_name: string; severity: "warning" | "error" | "fatal"; app_version: string; fingerprint: string; message: string }) {
  return request<{ accepted: boolean; event_id: string }>("/api/v1/telemetry/logs", { method: "POST", body: JSON.stringify({ ...event, hwid_hash: normalizeDeviceId(deviceId) }) }, { "X-License-Key": normalizeLicenseKey(key), "X-Device-Id": normalizeDeviceId(deviceId) });
}

export type RenewQrResponse = {
  qr_url: string;
  bank_name: string;
  bank_bin: string;
  account_number: string;
  account_name: string;
  amount: number;
  transfer_content: string;
  plan_type: string;
  months: number;
  notes?: string | null;
};

export async function getRenewQr(licenseKey: string, planType: string = "1_month") {
  return request<RenewQrResponse>("/api/v1/billing/renew-qr", {
    method: "POST",
    body: JSON.stringify({
      license_key: normalizeLicenseKey(licenseKey),
      plan_type: planType,
    }),
  });
}

export type ClientBillingHistoryResponse = {
  license_key: string;
  customer_name?: string | null;
  expires_at?: string | null;
  status?: string;
  transactions: Array<{
    id: string;
    customer_name: string;
    amount: number;
    plan_type?: string;
    plan_name?: string;
    payment_method?: string;
    transaction_type?: string;
    reference_code?: string;
    notes?: string;
    created_at: string;
  }>;
};

export async function getClientBillingHistory(licenseKey: string) {
  return request<ClientBillingHistoryResponse>(
    `/api/v1/billing/client-history?license_key=${encodeURIComponent(normalizeLicenseKey(licenseKey))}`
  );
}

