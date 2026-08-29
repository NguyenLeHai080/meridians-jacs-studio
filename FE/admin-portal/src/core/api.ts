const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export type ApiError = { error?: { code?: string; message?: string } };

export async function apiRequest<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  const raw = response.status === 204 ? undefined : await response.json();
  const body = raw as (T & ApiError & { data?: T }) | undefined;
  if (!response.ok) throw new Error(body?.error?.message ?? "API request failed");
  // API endpoints may return an envelope or a direct resource during the MVP.
  return (body && "data" in body ? body.data : body) as T;
}

export async function login(email: string, password: string) {
  return apiRequest<{ access_token: string; expires_in: number }>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}
