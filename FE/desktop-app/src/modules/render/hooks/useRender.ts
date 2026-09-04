import { useMemo } from "react";
import type { Job } from "../../../core/types";

export function useRender(jobs: Job[]) {
  const renderJobs = useMemo(() => {
    return jobs.filter((j) => !j.sourceOnly);
  }, [jobs]);

  const activeJobs = useMemo(() => {
    return renderJobs.filter((j) => j.status === "running" || j.status === "queued");
  }, [renderJobs]);

  const completedJobs = useMemo(() => {
    return renderJobs.filter((j) => j.status === "completed");
  }, [renderJobs]);

  const failedJobs = useMemo(() => {
    return renderJobs.filter((j) => j.status === "failed");
  }, [renderJobs]);

  return {
    renderJobs,
    activeJobs,
    completedJobs,
    failedJobs,
  };
}
