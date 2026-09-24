import { apiRequest } from "../../../core/api";
import { getToken } from "../../../core/session";
import type { Provider } from "../../../core/types";

export type ProviderType = "openai" | "gemini" | "anthropic" | "openai-compatible" | "custom" | string;

export interface CreateProviderPayload {
  name: string;
  code?: string;
  provider_type: ProviderType;
  base_url: string;
  model: string;
  tts_model?: string;
  api_key: string;
  capabilities: string[];
  supported_models?: string[];
  cost_per_image?: number;
  is_primary?: boolean;
  enabled?: boolean;
}

export interface UpdateProviderPayload {
  name?: string;
  code?: string;
  provider_type?: ProviderType;
  base_url?: string;
  model?: string;
  tts_model?: string;
  api_key?: string;
  capabilities?: string[];
  supported_models?: string[];
  cost_per_image?: number;
  is_primary?: boolean;
  enabled?: boolean;
}

export interface FailoverConfigData {
  enabled: boolean;
  timeout_seconds: number;
}

export const providerService = {
  async getProviders(): Promise<Provider[]> {
    try {
      return await apiRequest<Provider[]>("/api/v1/ai-providers", { method: "GET" }, getToken() || undefined);
    } catch {
      return await apiRequest<Provider[]>("/api/v1/providers", { method: "GET" }, getToken() || undefined);
    }
  },

  async createProvider(payload: CreateProviderPayload): Promise<Provider> {
    try {
      return await apiRequest<Provider>("/api/v1/ai-providers", {
        method: "POST",
        body: JSON.stringify(payload),
      }, getToken() || undefined);
    } catch {
      return await apiRequest<Provider>("/api/v1/providers", {
        method: "POST",
        body: JSON.stringify(payload),
      }, getToken() || undefined);
    }
  },

  async updateProvider(id: string, payload: UpdateProviderPayload): Promise<Provider> {
    try {
      return await apiRequest<Provider>(`/api/v1/ai-providers/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }, getToken() || undefined);
    } catch {
      return await apiRequest<Provider>(`/api/v1/providers/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }, getToken() || undefined);
    }
  },

  async toggleProvider(id: string, isEnabled: boolean): Promise<Provider> {
    try {
      return await apiRequest<Provider>(`/api/v1/ai-providers/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: isEnabled }),
      }, getToken() || undefined);
    } catch {
      return await apiRequest<Provider>(`/api/v1/providers/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ is_enabled: isEnabled }),
      }, getToken() || undefined);
    }
  },

  async deleteProvider(id: string): Promise<void> {
    try {
      return await apiRequest<void>(`/api/v1/ai-providers/${id}`, { method: "DELETE" }, getToken() || undefined);
    } catch {
      return await apiRequest<void>(`/api/v1/providers/${id}`, { method: "DELETE" }, getToken() || undefined);
    }
  },

  async testLatency(id: string): Promise<{ latency_ms: number; status: string; detail?: string }> {
    const res = await apiRequest<{
      data?: { latency_ms: number; status: string; detail?: string };
      latency_ms?: number;
      status?: string;
      detail?: string;
    }>(
      `/api/v1/ai-providers/${id}/test`,
      { method: "POST" },
      getToken() || undefined
    );
    if (res?.data) {
      return {
        latency_ms: res.data.latency_ms || 0,
        status: res.data.status || "OK",
        detail: res.data.detail,
      };
    }
    return {
      latency_ms: res?.latency_ms || 0,
      status: res?.status || "OK",
      detail: res?.detail,
    };
  },

  async setPrimaryProvider(id: string): Promise<Provider> {
    return await apiRequest<Provider>(
      `/api/v1/ai-providers/${id}/set-primary`,
      { method: "POST" },
      getToken() || undefined
    );
  },

  async getFailoverConfig(): Promise<FailoverConfigData> {
    try {
      const res = await apiRequest<{ data: FailoverConfigData }>(
        "/api/v1/ai-providers/failover-config",
        { method: "GET" },
        getToken() || undefined
      );
      return res?.data || { enabled: true, timeout_seconds: 45 };
    } catch {
      return { enabled: true, timeout_seconds: 45 };
    }
  },

  async updateFailoverConfig(payload: FailoverConfigData): Promise<void> {
    await apiRequest(
      "/api/v1/ai-providers/failover-config",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      getToken() || undefined
    );
  },
};


