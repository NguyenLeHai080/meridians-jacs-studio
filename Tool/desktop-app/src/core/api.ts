function apiUrl() { return import.meta.env.VITE_API_URL ?? window.jacsRuntime?.getApiBaseUrl?.() ?? "http://localhost:8000"; }
type ApiEnvelope<T> = { data?: T; error?: { message?: string } } & T;
async function request<T>(path: string, init: RequestInit = {}, headers: Record<string, string> = {}): Promise<T> {
  const response = await fetch(`${apiUrl()}${path}`, { ...init, headers: { "Content-Type": "application/json", ...headers, ...(init.headers ?? {}) } });
  const body = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;
  if (!response.ok) throw new Error(body.error?.message ?? "Không thể kết nối JACS API");
  return (body.data ?? body) as T;
}
export async function validateLicense(key: string, hwid: string) {
  return request<{ valid: boolean; license_id: string; premium_ai: boolean; expires_at: string | null }>("/api/v1/licenses/validate", { method: "POST", body: JSON.stringify({ key, hwid }) });
}

export async function heartbeatLicense(key: string, hwid: string, appVersion: string, platform: string) {
  return request<{ valid: boolean; license_id: string; premium_ai: boolean; expires_at: string | null }>("/api/v1/licenses/heartbeat", { method: "POST", body: JSON.stringify({ key, hwid, app_version: appVersion, platform }) });
}

export async function createClientJob(key: string, deviceId: string, job: { id: string; name: string; source: string; mode: string }) {
  return request<{ id: string; status: string; progress: number }>("/api/v1/client/jobs", { method: "POST", body: JSON.stringify({ client_job_id: job.id, name: job.name, source_name: job.source, execution_mode: job.mode, kind: "render", project_id: "desktop" }) }, { "X-License-Key": key, "X-Device-Id": deviceId });
}

export async function listClientJobs(key: string, deviceId: string) {
  return request<Array<{ client_job_id: string; name: string; source_name: string; execution_mode: string; status: string; progress: number }>>("/api/v1/client/jobs", {}, { "X-License-Key": key, "X-Device-Id": deviceId });
}
