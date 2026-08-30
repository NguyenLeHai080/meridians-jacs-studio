const TOKEN_KEY = "jacs.admin.token";

export function getToken(): string | null {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    const claims = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as { exp?: number };
    if (typeof claims.exp === "number" && claims.exp <= Math.floor(Date.now() / 1000)) {
      sessionStorage.removeItem(TOKEN_KEY);
      return null;
    }
  } catch {
    // The API remains the source of truth for malformed tokens.
  }
  return token;
}

export function setToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}
