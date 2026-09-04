import { apiRequest } from "../../../core/api";
import { setToken, clearToken, getToken } from "../../../core/session";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type?: string;
  user?: {
    email: string;
    role: string;
  };
}

export const authService = {
  async login(payload: LoginPayload): Promise<LoginResponse> {
    const result = await apiRequest<LoginResponse>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: payload.email.trim(), password: payload.password }),
    });
    if (result.access_token) {
      setToken(result.access_token);
    }
    return result;
  },

  logout(): void {
    clearToken();
  },

  isAuthenticated(): boolean {
    return Boolean(getToken());
  },
};
