import { apiRequest } from "../../../core/api";
import { getToken } from "../../../core/session";
import type { SystemSettings, SystemInfo } from "../../../core/types";

export const settingsService = {
  async getSettings(): Promise<SystemSettings> {
    return apiRequest<SystemSettings>("/api/v1/system/settings", { method: "GET" }, getToken() || undefined);
  },

  async updateSettings(settings: SystemSettings): Promise<SystemSettings> {
    return apiRequest<SystemSettings>("/api/v1/system/settings", {
      method: "PUT",
      body: JSON.stringify(settings),
    }, getToken() || undefined);
  },

  async getInfo(): Promise<SystemInfo> {
    return apiRequest<SystemInfo>("/api/v1/system/info", { method: "GET" }, getToken() || undefined);
  },

  async exportBackup(): Promise<Blob> {
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch("/api/v1/system/backup", { method: "GET", headers });
    if (!res.ok) throw new Error("Không tải được bản sao lưu DB");
    return res.blob();
  },

  async restoreBackup(data: any): Promise<void> {
    return apiRequest<void>("/api/v1/system/restore", {
      method: "POST",
      body: JSON.stringify(data),
    }, getToken() || undefined);
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    return apiRequest<void>("/api/v1/auth/password", {
      method: "PUT",
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    }, getToken() || undefined);
  },
};
