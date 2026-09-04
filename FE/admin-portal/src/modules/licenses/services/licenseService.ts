import { apiRequest } from "../../../core/api";
import { getToken } from "../../../core/session";
import type { License } from "../../../core/types";

export interface CreateLicensePayload {
  customer_name: string;
  customer_contact: string;
  hwid: string;
  days_valid: number;
  max_jobs_per_day: number;
  premium_ai: boolean;
  notes?: string | null;
  logo_url?: string | null;
}

export interface UpdateLicensePayload {
  customer_name: string;
  customer_contact: string;
  max_jobs_per_day: number;
  premium_ai: boolean;
  notes?: string | null;
  logo_url?: string | null;
  expires_at?: string | null;
}

export interface RenewLicensePayload {
  expires_at: string;
  amount: number;
  plan_type: string;
  reason: string;
  payment_method: string;
}

export interface ResetHwidPayload {
  hwid: string;
  reason: string;
}

export const licenseService = {
  async getAll(): Promise<License[]> {
    return apiRequest<License[]>("/api/v1/licenses", { method: "GET" }, getToken() || undefined);
  },

  async getLicenses(): Promise<License[]> {
    return this.getAll();
  },

  async create(payload: CreateLicensePayload): Promise<License> {
    return apiRequest<License>("/api/v1/licenses", {
      method: "POST",
      body: JSON.stringify(payload),
    }, getToken() || undefined);
  },

  async update(id: string, payload: UpdateLicensePayload): Promise<License> {
    return apiRequest<License>(`/api/v1/licenses/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }, getToken() || undefined);
  },

  async toggleStatus(id: string, status: "active" | "blocked"): Promise<License> {
    return apiRequest<License>(`/api/v1/licenses/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }, getToken() || undefined);
  },

  async renew(id: string, payload: RenewLicensePayload): Promise<License> {
    return apiRequest<License>(`/api/v1/licenses/${id}/renew`, {
      method: "POST",
      body: JSON.stringify(payload),
    }, getToken() || undefined);
  },

  async resetHwid(id: string, payload: ResetHwidPayload): Promise<License> {
    return apiRequest<License>(`/api/v1/licenses/${id}/hwid`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }, getToken() || undefined);
  },

  async delete(id: string): Promise<void> {
    return apiRequest<void>(`/api/v1/licenses/${id}`, { method: "DELETE" }, getToken() || undefined);
  },
};
