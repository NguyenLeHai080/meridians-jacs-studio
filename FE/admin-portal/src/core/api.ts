// Production serves the API behind the same hostname; local Vite keeps the
// explicit API origin so the dev server can run independently.
const API_URL = (import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:8000" : "")).replace(/\/$/, "");

export type ApiError = { error?: { code?: string; message?: string; request_id?: string } };

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly requestId?: string;

  constructor(message: string, status: number, code?: string, requestId?: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

export function getApiBaseUrl() { return API_URL || window.location.origin; }

export async function apiRequest<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  const raw = response.status === 204 ? undefined : await response.json().catch(() => undefined);
  const body = raw as (T & ApiError & { data?: T }) | undefined;
  if (!response.ok) {
    const details = body?.error;
    throw new ApiRequestError(
      details?.message ?? `API request failed (HTTP ${response.status})`,
      response.status,
      details?.code,
      details?.request_id,
    );
  }
  // API endpoints may return an envelope or a direct resource.
  if (body && typeof body === "object" && "data" in body) {
    const data = (body as { data: unknown }).data;
    if (data && typeof data === "object" && !Array.isArray(data) && !("data" in (data as Record<string, unknown>))) {
      try {
        Object.defineProperty(data, "data", { value: data, enumerable: false, configurable: true });
      } catch { /* ignore non-extensible */ }
    }
    return data as T;
  }
  return body as T;
}

export async function login(email: string, password: string) {
  return apiRequest<{ access_token: string; expires_in: number }>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}
