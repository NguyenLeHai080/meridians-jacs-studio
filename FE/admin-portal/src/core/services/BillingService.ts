import { apiRequest } from "../api";
import type { BankConfig, BillingSummary } from "../types";

export class BillingService {
  static async getBankConfig(token: string): Promise<BankConfig> {
    const res = await apiRequest<{ data: BankConfig }>("/api/v1/billing/bank-config", {}, token);
    return res?.data || (res as unknown as BankConfig);
  }

  static async updateBankConfig(data: Partial<BankConfig>, token: string): Promise<BankConfig> {
    const res = await apiRequest<{ data: BankConfig }>("/api/v1/billing/bank-config", {
      method: "PUT",
      body: JSON.stringify(data),
    }, token);
    return res?.data || (res as unknown as BankConfig);
  }

  static async getBillingSummary(token: string): Promise<BillingSummary> {
    const res = await apiRequest<{ data: BillingSummary }>("/api/v1/billing/summary", {}, token);
    return res?.data || (res as unknown as BillingSummary);
  }
}
