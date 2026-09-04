import { apiRequest } from "../../../core/api";
import { getToken } from "../../../core/session";
import type { TelemetryLog } from "../../../core/types";

export const telemetryService = {
  async getLogs(): Promise<TelemetryLog[]> {
    return apiRequest<TelemetryLog[]>("/api/v1/telemetry", { method: "GET" }, getToken() || undefined);
  },

  async createManualLog(): Promise<TelemetryLog> {
    return apiRequest<TelemetryLog>("/api/v1/telemetry", {
      method: "POST",
      body: JSON.stringify({
        app_version: "0.3.17",
        event_name: "manual_diagnostic_ping",
        severity: "info",
        message: "Diagnostic ping created by administrator from Admin Portal",
      }),
    }, getToken() || undefined);
  },

  async clearLogs(): Promise<void> {
    return apiRequest<void>("/api/v1/telemetry", { method: "DELETE" }, getToken() || undefined);
  },
};
