import type { ClientMetrics } from "./types";

function apiUrl() { return (import.meta.env.VITE_API_URL || window.jacsRuntime?.getApiBaseUrl?.() || "http://localhost:8000").replace(/\/$/, ""); }
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
export async function validateLicense(key: string, hwid: string) {
  return request<{ valid: boolean; license_id: string; premium_ai: boolean; expires_at: string | null }>("/api/v1/licenses/validate", { method: "POST", body: JSON.stringify({ key: normalizeLicenseKey(key), hwid: normalizeDeviceId(hwid) }) });
}

export async function heartbeatLicense(key: string, hwid: string, appVersion: string, platform: string) {
  return request<{ valid: boolean; license_id: string; premium_ai: boolean; expires_at: string | null }>("/api/v1/licenses/heartbeat", { method: "POST", body: JSON.stringify({ key: normalizeLicenseKey(key), hwid: normalizeDeviceId(hwid), app_version: appVersion, platform }) });
}

export async function createClientJob(key: string, deviceId: string, job: { id: string; name: string; source: string; mode: string; providerId?: string; sourceType?: "file" | "url"; durationSeconds?: number; tokensUsed?: number; creditsUsed?: number }) {
  return request<{ id: string; status: string; progress: number }>("/api/v1/client/jobs", { method: "POST", body: JSON.stringify({ client_job_id: job.id, name: job.name, source_name: job.source, execution_mode: job.mode, kind: "render", project_id: "desktop", provider_id: job.providerId, source_type: job.sourceType || "file", duration_seconds: job.durationSeconds, tokens_used: job.tokensUsed || 0, credits_used: job.creditsUsed || 0 }) }, { "X-License-Key": normalizeLicenseKey(key), "X-Device-Id": normalizeDeviceId(deviceId) });
}

export async function listClientJobs(key: string, deviceId: string) {
  return request<Array<{ client_job_id: string; name: string; source_name: string; execution_mode: string; status: string; progress: number; stage?: string; error?: string; output_path?: string; tokens_used?: number; credits_used?: number; source_type?: "file" | "url" }>>("/api/v1/client/jobs", {}, { "X-License-Key": normalizeLicenseKey(key), "X-Device-Id": normalizeDeviceId(deviceId) });
}

export async function updateClientJob(key: string, deviceId: string, jobId: string, values: Record<string, unknown>) {
  return request<{ client_job_id: string; status: string; progress: number }>(`/api/v1/client/jobs/${encodeURIComponent(jobId)}`, { method: "PATCH", body: JSON.stringify(values) }, { "X-License-Key": normalizeLicenseKey(key), "X-Device-Id": normalizeDeviceId(deviceId) });
}

export async function getClientMetrics(key: string, deviceId: string): Promise<ClientMetrics> {
  return request<ClientMetrics>("/api/v1/client/metrics", {}, { "X-License-Key": normalizeLicenseKey(key), "X-Device-Id": normalizeDeviceId(deviceId) });
}

export async function sendClientTelemetry(key: string, deviceId: string, event: { event_name: string; severity: "warning" | "error" | "fatal"; app_version: string; fingerprint: string; message: string }) {
  return request<{ accepted: boolean; event_id: string }>("/api/v1/telemetry/logs", { method: "POST", body: JSON.stringify({ ...event, hwid_hash: normalizeDeviceId(deviceId) }) }, { "X-License-Key": normalizeLicenseKey(key), "X-Device-Id": normalizeDeviceId(deviceId) });
}
