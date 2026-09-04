import { apiRequest } from "../../../core/api";
import { getToken } from "../../../core/session";
import type { License } from "../../../core/types";

export interface ManualRenewalPayload {
  license_id: string;
  days: number;
  amount: number;
  plan_type: string;
  reason: string;
}

export const renewalService = {
  async renewLicense(payload: ManualRenewalPayload): Promise<License> {
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + payload.days);
    baseDate.setHours(23, 59, 59, 999);

    return apiRequest<License>(`/api/v1/licenses/${payload.license_id}/renew`, {
      method: "POST",
      body: JSON.stringify({
        expires_at: baseDate.toISOString(),
        amount: payload.amount,
        plan_type: payload.plan_type,
        reason: payload.reason,
        payment_method: "bank_transfer",
      }),
    }, getToken() || undefined);
  },
};
