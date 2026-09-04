import { getRuntime } from "../../../core/runtime";
import { getBankConfig } from "../../../core/api";

export const billingService = {
  async getBankConfig() {
    return await getBankConfig();
  },

  async readLicense(): Promise<string | null> {
    const runtime = getRuntime();
    return (await runtime.readLicense?.()) || null;
  },
};
