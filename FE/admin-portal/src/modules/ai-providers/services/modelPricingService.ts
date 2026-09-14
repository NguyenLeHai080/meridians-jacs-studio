import { apiRequest } from "../../../core/api";
import { getToken } from "../../../core/session";

export interface ModelPricing {
  id: string;
  model: string;
  provider_name: string;
  category?: string;
  cost_input_price?: number;
  cost_output_price?: number;
  input_price: number;
  output_price: number;
  cache_discount_pct?: number;
  price_per_request?: number;
  is_selling: boolean;
  status?: "selling" | "need_pricing" | string;
  purpose?: string;
}

export const modelPricingService = {
  async getModelPricing(): Promise<ModelPricing[]> {
    const token = getToken() ?? "";
    const res = await apiRequest<any>("/api/v1/ai-providers/models-pricing", {}, token);
    const list = Array.isArray(res) ? res : (res?.data || []);
    return Array.isArray(list) ? list : [];
  },

  async saveModelPricing(items: ModelPricing[]): Promise<void> {
    const token = getToken() ?? "";
    await apiRequest(
      "/api/v1/ai-providers/models-pricing",
      {
        method: "PUT",
        body: JSON.stringify({ items }),
      },
      token
    );
  },

  async syncModelsFromProviders(): Promise<ModelPricing[]> {
    const token = getToken() ?? "";
    const res = await apiRequest<any>(
      "/api/v1/ai-providers/models-sync",
      { method: "POST" },
      token
    );
    const list = Array.isArray(res) ? res : (res?.data || []);
    return Array.isArray(list) ? list : [];
  },
};
