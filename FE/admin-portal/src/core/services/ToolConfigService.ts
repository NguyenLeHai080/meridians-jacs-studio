import { apiRequest } from "../api";
import type { ToolConfig } from "../types";

export class ToolConfigService {
  static async getToolConfig(token: string): Promise<ToolConfig> {
    const res = await apiRequest<{ data: ToolConfig }>("/api/v1/system/tool-config", {}, token);
    return res?.data || (res as unknown as ToolConfig);
  }

  static async updateToolConfig(data: Partial<ToolConfig>, token: string): Promise<ToolConfig> {
    const res = await apiRequest<{ data: ToolConfig }>("/api/v1/system/tool-config", {
      method: "PUT",
      body: JSON.stringify(data),
    }, token);
    return res?.data || (res as unknown as ToolConfig);
  }
}
