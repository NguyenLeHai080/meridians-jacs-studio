import { useState, useEffect, useMemo } from "react";
import type { Job, ClientMetrics } from "../../../core/types";
import { overviewService } from "../services/overviewService";

export function useOverview(initialJobs: Job[] = [], initialMetrics: ClientMetrics | null = null) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [metrics, setMetrics] = useState<ClientMetrics | null>(initialMetrics);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setJobs(initialJobs);
  }, [initialJobs]);

  useEffect(() => {
    setMetrics(initialMetrics);
  }, [initialMetrics]);

  const stats = useMemo(() => {
    const total = jobs.length;
    const running = jobs.filter((j) => j.status === "running").length;
    const completed = jobs.filter((j) => j.status === "completed").length;
    const failed = jobs.filter((j) => j.status === "failed").length;
    const queued = jobs.filter((j) => j.status === "queued").length;
    return { total, running, completed, failed, queued };
  }, [jobs]);

  const refresh = async () => {
    setLoading(true);
    try {
      const [fetchedMetrics, fetchedJobs] = await Promise.all([
        overviewService.getMetrics(),
        overviewService.loadJobs(),
      ]);
      if (fetchedMetrics) setMetrics(fetchedMetrics);
      if (fetchedJobs.length) setJobs(fetchedJobs);
    } finally {
      setLoading(false);
    }
  };

  return { jobs, metrics, stats, loading, refresh };
}
