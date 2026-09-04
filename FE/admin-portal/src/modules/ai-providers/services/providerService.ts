import { apiRequest } from "../../../core/api";
import { getToken } from "../../../core/session";
import type { Provider } from "../../../core/types";

export interface CreateProviderPayload {
  name: string;
  provider_type: "openai" | "gemini" | "custom";
  base_url: string;
  model: string;
  tts_model?: string;
  api_key: string;
  capabilities: string[];
}

export const providerService = {
  async getProviders(): Promise<Provider[]> {
    return apiRequest<Provider[]>("/api/v1/providers", { method: "GET" }, getToken() || undefined);
  },

  async createProvider(payload: CreateProviderPayload): Promise<Provider> {
    return apiRequest<Provider>("/api/v1/providers", {
      method: "POST",
      body: JSON.stringify(payload),
    }, getToken() || undefined);
  },

  async toggleProvider(id: string, isEnabled: boolean): Promise<Provider> {
    return apiRequest<Provider>(`/api/v1/providers/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ is_enabled: isEnabled }),
    }, getToken() || undefined);
  },

  async deleteProvider(id: string): Promise<void> {
    return apiRequest<void>(`/api/v1/providers/${id}`, { method: "DELETE" }, getToken() || undefined);
  },

  async testLatency(id: string): Promise<{ latency_ms: number; status: string }> {
    return apiRequest<{ latency_ms: number; status: string }>(`/api/v1/providers/${id}/test`, {
      method: "POST",
    }, getToken() || undefined);
  },
};
