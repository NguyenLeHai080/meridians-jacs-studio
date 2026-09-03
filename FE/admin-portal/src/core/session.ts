const TOKEN_KEY = "jacs.admin.token";

export function getToken(): string | null {
  const token = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    if (payload) {
      const claims = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as { exp?: number };
      if (typeof claims.exp === "number" && claims.exp < Math.floor(Date.now() / 1000) - 3600) {
        localStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(TOKEN_KEY);
        return null;
      }
    }
  } catch {
    // Keep token if unparseable, API will validate
  }
  // Ensure both storages are in sync
  if (!sessionStorage.getItem(TOKEN_KEY) && token) {
    sessionStorage.setItem(TOKEN_KEY, token);
  }
  if (!localStorage.getItem(TOKEN_KEY) && token) {
    localStorage.setItem(TOKEN_KEY, token);
  }
  return token;
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}
