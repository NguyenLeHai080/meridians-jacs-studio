import { getRuntime } from "../../../core/runtime";
import type { Job } from "../../../core/types";

export const jobService = {
  async readJobs(): Promise<Job[]> {
    const runtime = getRuntime();
    return (await runtime.readJobs?.()) || [];
  },

  async saveJobs(jobs: Job[]): Promise<void> {
    const runtime = getRuntime();
    await runtime.saveJobs?.(jobs);
  },

  async cancelOperation(id: string): Promise<boolean> {
    const runtime = getRuntime();
    return (await runtime.cancelOperation?.(id)) || false;
  },
};
