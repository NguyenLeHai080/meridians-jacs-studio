import type { Job } from "../../../core/types";

export function getJobStats(jobs: Job[]) {
  const queued = jobs.filter((j) => !j.sourceOnly && j.status === "queued").length;
  const running = jobs.filter((j) => !j.sourceOnly && j.status === "running").length;
  const completed = jobs.filter((j) => !j.sourceOnly && j.status === "completed").length;
  const failed = jobs.filter((j) => !j.sourceOnly && j.status === "failed").length;
  return { queued, running, completed, failed, total: queued + running + completed + failed };
}
