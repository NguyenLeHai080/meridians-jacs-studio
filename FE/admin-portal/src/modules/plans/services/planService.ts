import { apiRequest } from "../../../core/api";
import { getToken } from "../../../core/session";
import type { BankConfig } from "../../../core/types";

export const planService = {
  async savePlansPricing(config: BankConfig): Promise<BankConfig> {
    return apiRequest<BankConfig>("/api/v1/billing/bank-config", {
      method: "PUT",
      body: JSON.stringify(config),
    }, getToken() || undefined);
  },
};
