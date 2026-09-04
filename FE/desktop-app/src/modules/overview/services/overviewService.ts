import { getRuntime } from "../../../core/runtime";
import { getClientMetrics, type ClientMetrics } from "../../../core/api";
import type { Job } from "../../../core/types";

export const overviewService = {
  async getMetrics(): Promise<ClientMetrics | null> {
    try {
      const runtime = getRuntime();
      const key = await runtime.readLicense();
      if (!key) return null;
      const machine = await runtime.getMachineInfo();
      return await getClientMetrics(key, machine.machineId);
    } catch {
      return null;
    }
  },

  async loadJobs(): Promise<Job[]> {
    try {
      const runtime = getRuntime();
      const loaded = await runtime.readJobs?.();
      return Array.isArray(loaded) ? loaded : [];
    } catch {
      return [];
    }
  },
};
