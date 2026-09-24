import { apiRequest } from "../../../core/api";
import { getToken } from "../../../core/session";
import type { JobItem, CreateJobInput } from "../types";

export const jobService = {
  async getJobs(): Promise<JobItem[]> {
    const token = getToken() ?? "";
    const res = await apiRequest<{ data: JobItem[] }>("/api/v1/jobs", {}, token);
    return res && Array.isArray(res.data) ? res.data : [];
  },

  async createJob(payload: CreateJobInput): Promise<JobItem> {
    const token = getToken() ?? "";
    const res = await apiRequest<{ data: JobItem }>("/api/v1/jobs", {
      method: "POST",
      body: JSON.stringify({
        ...payload,
        project_id: "admin-dashboard",
      }),
    }, token);
    return res.data;
  },

  async cancelJob(jobId: string): Promise<void> {
    const token = getToken() ?? "";
    await apiRequest(`/api/v1/jobs/${jobId}/cancel`, { method: "POST" }, token);
  },

  async deleteJob(jobId: string): Promise<void> {
    const token = getToken() ?? "";
    await apiRequest(`/api/v1/jobs/${jobId}`, { method: "DELETE" }, token);
  },
};
