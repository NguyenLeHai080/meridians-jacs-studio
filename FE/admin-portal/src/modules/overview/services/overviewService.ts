import { apiRequest } from "../../../core/api";
import { getToken } from "../../../core/session";

export interface OverviewStats {
  totalLicenses: number;
  activeLicenses: number;
  totalRevenue: number;
  thisMonthRevenue: number;
  onlineSessions: number;
  totalSessions: number;
}

export const overviewService = {
  async getSystemSummary(): Promise<Record<string, any>> {
    return apiRequest("/api/v1/system/info", { method: "GET" }, getToken() || undefined);
  },
  async getBillingSummary(): Promise<Record<string, any>> {
    return apiRequest("/api/v1/billing/summary", { method: "GET" }, getToken() || undefined);
  },
};
