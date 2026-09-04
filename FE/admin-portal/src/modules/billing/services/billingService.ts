import { apiRequest } from "../../../core/api";
import { getToken } from "../../../core/session";
import type { BillingTransaction, BillingSummary, BankConfig, BankAccount } from "../../../core/types";

export interface CreateTransactionPayload {
  customer_name: string;
  plan_type: string;
  amount: number;
  payment_method: string;
  transaction_type: string;
  notes?: string;
}

export const billingService = {
  // --- Bank Accounts Multi-Account CRUD ---
  async getBankAccounts(): Promise<BankAccount[]> {
    return apiRequest<BankAccount[]>("/api/v1/billing/bank-accounts", { method: "GET" }, getToken() || undefined);
  },

  async getBankAccount(id: string): Promise<BankAccount> {
    return apiRequest<BankAccount>(`/api/v1/billing/bank-accounts/${id}`, { method: "GET" }, getToken() || undefined);
  },

  async createBankAccount(data: Partial<BankAccount>): Promise<BankAccount> {
    return apiRequest<BankAccount>("/api/v1/billing/bank-accounts", {
      method: "POST",
      body: JSON.stringify(data),
    }, getToken() || undefined);
  },

  async updateBankAccount(id: string, data: Partial<BankAccount>): Promise<BankAccount> {
    return apiRequest<BankAccount>(`/api/v1/billing/bank-accounts/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }, getToken() || undefined);
  },

  async deleteBankAccount(id: string): Promise<void> {
    return apiRequest<void>(`/api/v1/billing/bank-accounts/${id}`, { method: "DELETE" }, getToken() || undefined);
  },

  async setDefaultBankAccount(id: string): Promise<BankAccount> {
    return apiRequest<BankAccount>(`/api/v1/billing/bank-accounts/${id}/set-default`, {
      method: "POST",
    }, getToken() || undefined);
  },

  async toggleBankAccountStatus(id: string): Promise<BankAccount> {
    return apiRequest<BankAccount>(`/api/v1/billing/bank-accounts/${id}/toggle-status`, {
      method: "POST",
    }, getToken() || undefined);
  },

  // --- Bank Config & Pricing Plans ---
  async getBankConfig(): Promise<BankConfig> {
    return apiRequest<BankConfig>("/api/v1/billing/bank-config", { method: "GET" }, getToken() || undefined);
  },

  async saveBankConfig(config: BankConfig): Promise<BankConfig> {
    return apiRequest<BankConfig>("/api/v1/billing/bank-config", {
      method: "PUT",
      body: JSON.stringify(config),
    }, getToken() || undefined);
  },

  // --- Transactions & Summary ---
  async getTransactions(): Promise<BillingTransaction[]> {
    return apiRequest<BillingTransaction[]>("/api/v1/billing/transactions", { method: "GET" }, getToken() || undefined);
  },

  async getSummary(): Promise<BillingSummary> {
    return apiRequest<BillingSummary>("/api/v1/billing/summary", { method: "GET" }, getToken() || undefined);
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
