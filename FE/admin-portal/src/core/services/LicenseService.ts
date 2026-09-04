import { apiRequest } from "../api";
import type { License } from "../types";

export class LicenseService {
  static async listLicenses(token: string): Promise<License[]> {
    const res = await apiRequest<{ data: License[] }>("/api/v1/licenses", {}, token);
    return res?.data || (res as unknown as License[]) || [];
  }

  static async createLicense(
    data: {
      customer_name: string;
      customer_contact: string;
      max_devices?: number;
      tier?: string;
      days_valid?: number;
      notes?: string;
      hwid?: string;
    },
    token: string
  ): Promise<License> {
    const res = await apiRequest<{ data: License }>("/api/v1/licenses", {
      method: "POST",
      body: JSON.stringify(data),
    }, token);
    return res?.data || (res as unknown as License);
  }

  static async updateLicense(
    id: string,
    data: Partial<License>,
    token: string
  ): Promise<License> {
    const res = await apiRequest<{ data: License }>(`/api/v1/licenses/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }, token);
    return res?.data || (res as unknown as License);
  }

  static async deleteLicense(id: string, token: string): Promise<boolean> {
    await apiRequest(`/api/v1/licenses/${id}`, { method: "DELETE" }, token);
    return true;
  }

  static async renewLicense(id: string, days: number, token: string): Promise<License> {
    const res = await apiRequest<{ data: License }>(`/api/v1/licenses/${id}/renew`, {
      method: "POST",
      body: JSON.stringify({ days }),
    }, token);
    return res?.data || (res as unknown as License);
  }
}
