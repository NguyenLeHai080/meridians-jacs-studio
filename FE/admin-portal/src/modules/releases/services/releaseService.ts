import { apiRequest } from "../../../core/api";
import { getToken } from "../../../core/session";

export interface Release {
  id: string;
  version: string;
  platform: string;
  channel: string;
  is_mandatory: boolean;
  min_supported_version?: string;
  download_url: string;
  sha256: string;
  file_size_bytes: number;
  release_notes?: string;
  published_at: string;
}

export interface PublishReleasePayload {
  version: string;
  platform: string;
  channel: string;
  is_mandatory: boolean;
  download_url: string;
  sha256: string;
  file_size_bytes: number;
  release_notes?: string;
}

export const releaseService = {
  async getReleases(): Promise<Release[]> {
    return apiRequest<Release[]>("/api/v1/releases", { method: "GET" }, getToken() || undefined);
  },

  async publishRelease(payload: PublishReleasePayload): Promise<Release> {
    return apiRequest<Release>("/api/v1/releases", {
      method: "POST",
      body: JSON.stringify(payload),
    }, getToken() || undefined);
  },

  async deleteRelease(id: string): Promise<void> {
    return apiRequest<void>(`/api/v1/releases/${id}`, { method: "DELETE" }, getToken() || undefined);
  },
};
