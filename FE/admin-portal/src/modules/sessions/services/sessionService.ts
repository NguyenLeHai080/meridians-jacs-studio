import { apiRequest } from "../../../core/api";
import { getToken } from "../../../core/session";
import type { ClientSession } from "../../../core/types";

export const sessionService = {
  async getSessions(): Promise<ClientSession[]> {
    return apiRequest<ClientSession[]>("/api/v1/clients/sessions", { method: "GET" }, getToken() || undefined);
  },

  async terminateSession(licenseId: string): Promise<void> {
    return apiRequest<void>(`/api/v1/clients/sessions/${licenseId}`, { method: "DELETE" }, getToken() || undefined);
  },
};
