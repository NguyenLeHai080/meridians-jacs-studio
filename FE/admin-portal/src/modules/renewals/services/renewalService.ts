import { apiRequest } from "../../../core/api";
import { getToken } from "../../../core/session";
import type { License, SepayTransaction } from "../../../core/types";

export interface ManualRenewalPayload {
  license_id: string;
  days: number;
  amount: number;
  plan_type: string;
  reason: string;
}

export interface LicenseApiConfigPayload {
  token_in_price?: number | null;
  token_out_price?: number | null;
  max_requests_per_day?: number | null;
  credit_balance?: number | null;
  is_custom_quota?: boolean;
}

export const renewalService = {
  async getSepayTransactions(): Promise<SepayTransaction[]> {
    return apiRequest<SepayTransaction[]>(
      "/api/v1/billing/sepay-transactions",
      {},
      getToken() || undefined
    );
  },

  async renewLicense(payload: ManualRenewalPayload): Promise<License> {
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + payload.days);
    baseDate.setHours(23, 59, 59, 999);

    return apiRequest<License>(
      `/api/v1/licenses/${payload.license_id}/renew`,
      {
        method: "POST",
        body: JSON.stringify({
          expires_at: baseDate.toISOString(),
          amount: payload.amount,
          plan_type: payload.plan_type,
          reason: payload.reason,
          payment_method: "bank_transfer",
        }),
      },
      getToken() || undefined
    );
  },

  async revokeCredit(transactionId: string): Promise<any> {
    return apiRequest<any>(
      `/api/v1/billing/transactions/${transactionId}/revoke-credit`,
      {
        method: "POST",
      },
      getToken() || undefined
    );
  },

  async updateLicenseApiConfig(
    licenseId: string,
    payload: LicenseApiConfigPayload
  ): Promise<License> {
    return apiRequest<License>(
      `/api/v1/licenses/${licenseId}/api-config`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      },
      getToken() || undefined
    );
  },
};

