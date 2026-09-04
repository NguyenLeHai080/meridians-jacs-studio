import { apiRequest } from "../../../core/api";
import { getToken } from "../../../core/session";
import type { BillingTransaction, BillingSummary, BankConfig } from "../../../core/types";

export interface CreateTransactionPayload {
  customer_name: string;
  plan_type: string;
  amount: number;
  payment_method: string;
  transaction_type: string;
  notes?: string;
}

export const billingService = {
  async getTransactions(): Promise<BillingTransaction[]> {
    return apiRequest<BillingTransaction[]>("/api/v1/billing/transactions", { method: "GET" }, getToken() || undefined);
  },

  async getSummary(): Promise<BillingSummary> {
    return apiRequest<BillingSummary>("/api/v1/billing/summary", { method: "GET" }, getToken() || undefined);
  },

  async getBankConfig(): Promise<BankConfig> {
    return apiRequest<BankConfig>("/api/v1/billing/bank-config", { method: "GET" }, getToken() || undefined);
  },

  async saveBankConfig(config: BankConfig): Promise<BankConfig> {
    return apiRequest<BankConfig>("/api/v1/billing/bank-config", {
      method: "PUT",
      body: JSON.stringify(config),
    }, getToken() || undefined);
  },

  async createTransaction(payload: CreateTransactionPayload): Promise<BillingTransaction> {
    return apiRequest<BillingTransaction>("/api/v1/billing/transactions", {
      method: "POST",
      body: JSON.stringify(payload),
    }, getToken() || undefined);
  },

  async deleteTransaction(id: string): Promise<void> {
    return apiRequest<void>(`/api/v1/billing/transactions/${id}`, { method: "DELETE" }, getToken() || undefined);
  },
};
