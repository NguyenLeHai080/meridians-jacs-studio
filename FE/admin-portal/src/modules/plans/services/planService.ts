import { apiRequest } from "../../../core/api";
import { getToken } from "../../../core/session";
import type { BankConfig, CreditConfig } from "../../../core/types";

export interface CreditPackage {
  id: string;
  name: string;
  price: number;
  base_credits: number;
  bonus_percent: number;
  total_credits: number;
  badge?: string | null;
  description?: string | null;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreditTopupTransaction {
  id: string;
  order_code: string;
  license_id?: string | null;
  license_key?: string | null;
  hwid?: string | null;
  customer_name: string;
  package_id?: string | null;
  package_name: string;
  amount: number;
  credits_granted: number;
  bonus_percent: number;
  transfer_content: string;
  payment_method: string;
  status: "PENDING" | "APPROVED" | "COMPLETED" | "REJECTED" | "REVOKED" | string;
  created_at?: string;
  approved_at?: string;
  approved_by?: string | null;
  notes?: string | null;
}

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

  async getCreditPackages(): Promise<CreditPackage[]> {
    const res = await apiRequest<CreditPackage[]>("/api/v1/billing/credit-packages", {}, getToken() || undefined);
    return Array.isArray(res) ? res : ((res as any)?.data || []);
  },

  async createCreditPackage(pkg: Partial<CreditPackage>): Promise<CreditPackage> {
    return apiRequest<CreditPackage>("/api/v1/billing/credit-packages", {
      method: "POST",
      body: JSON.stringify(pkg),
    }, getToken() || undefined);
  },

  async updateCreditPackage(id: string, pkg: Partial<CreditPackage>): Promise<CreditPackage> {
    return apiRequest<CreditPackage>(`/api/v1/billing/credit-packages/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(pkg),
    }, getToken() || undefined);
  },

  async deleteCreditPackage(id: string): Promise<void> {
    return apiRequest<void>(`/api/v1/billing/credit-packages/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }, getToken() || undefined);
  },

  async getCreditTopupTransactions(): Promise<CreditTopupTransaction[]> {
    const res = await apiRequest<CreditTopupTransaction[]>("/api/v1/billing/credit-topup/transactions", {}, getToken() || undefined);
    return Array.isArray(res) ? res : ((res as any)?.data || []);
  },

  async approveCreditTopup(id: string): Promise<{ success: boolean; message: string; new_balance?: number }> {
    const res = await apiRequest<{ data: { success: boolean; message: string; new_balance?: number } }>(
      `/api/v1/billing/credit-topup/transactions/${encodeURIComponent(id)}/approve`,
      { method: "POST" },
      getToken() || undefined
    );
    return res?.data || res;
  },

  async rejectCreditTopup(id: string): Promise<{ success: boolean; message: string }> {
    const res = await apiRequest<{ data: { success: boolean; message: string } }>(
      `/api/v1/billing/credit-topup/transactions/${encodeURIComponent(id)}/reject`,
      { method: "POST" },
      getToken() || undefined
    );
    return res?.data || res;
  },
};

