import { getRuntime } from "../../../core/runtime";
import type { ToolPreferences, ProviderDraft, ProviderProfile } from "../../../core/types";

export const settingsService = {
  async getPreferences(): Promise<ToolPreferences | null> {
    const runtime = getRuntime();
    return (await runtime.getPreferences?.()) || null;
  },

  async savePreferences(prefs: ToolPreferences): Promise<void> {
    const runtime = getRuntime();
    await runtime.savePreferences?.(prefs);
  },

  async getProviders(): Promise<ProviderProfile[]> {
    const runtime = getRuntime();
    return (await runtime.getProviderProfiles?.()) || [];
  },

  async saveProvider(provider: ProviderDraft): Promise<ProviderProfile> {
    const runtime = getRuntime();
    if (!runtime.saveProviderProfile) {
      throw new Error("Không thể lưu cấu hình provider.");
    }
    return await runtime.saveProviderProfile(provider);
  },

  async deleteProvider(id: string): Promise<void> {
    const runtime = getRuntime();
    await runtime.deleteProviderProfile?.(id);
  },

  async testConnection(id: string) {
    const runtime = getRuntime();
    if (!runtime.testProviderConnection) {
      throw new Error("Không thể kiểm tra kết nối.");
    }
    return await runtime.testProviderConnection(id);
  },
};
