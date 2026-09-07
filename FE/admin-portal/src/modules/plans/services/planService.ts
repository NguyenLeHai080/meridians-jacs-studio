import { apiRequest } from "../../../core/api";
import { getToken } from "../../../core/session";
import type { BankConfig, CreditConfig } from "../../../core/types";

export const planService = {
  async savePlansPricing(config: BankConfig): Promise<BankConfig> {
    return apiRequest<BankConfig>("/api/v1/billing/bank-config", {
      method: "PUT",
      body: JSON.stringify(config),
    }, getToken() || undefined);
  },

  async getCreditConfig(): Promise<CreditConfig> {
    return apiRequest<CreditConfig>("/api/v1/billing/credit-config", {}, getToken() || undefined);
  },

  async saveCreditConfig(config: CreditConfig): Promise<CreditConfig> {
    return apiRequest<CreditConfig>("/api/v1/billing/credit-config", {
      method: "PUT",
      body: JSON.stringify(config),
    }, getToken() || undefined);
  },
};
