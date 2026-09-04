import { apiRequest } from "../api";
import type { Release } from "../types";

export class ReleaseService {
  static async listReleases(token: string): Promise<Release[]> {
    const res = await apiRequest<{ data: Release[] }>("/api/v1/releases", {}, token);
    return res?.data || (res as unknown as Release[]) || [];
  }

  static async publishRelease(id: string, token: string): Promise<Release> {
    const res = await apiRequest<{ data: Release }>(`/api/v1/releases/${id}/publish`, {
      method: "POST",
    }, token);
    return res?.data || (res as unknown as Release);
  }

  static async unpublishRelease(id: string, token: string): Promise<Release> {
    const res = await apiRequest<{ data: Release }>(`/api/v1/releases/${id}/unpublish`, {
      method: "POST",
    }, token);
    return res?.data || (res as unknown as Release);
  }

  static async deleteRelease(id: string, token: string): Promise<boolean> {
    await apiRequest(`/api/v1/releases/${id}`, { method: "DELETE" }, token);
    return true;
  }
}
