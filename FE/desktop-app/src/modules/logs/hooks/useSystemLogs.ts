import { useState, useMemo } from "react";
import type { Job } from "../../../core/types";

export function useSystemLogs(jobs: Job[]) {
  const [levelFilter, setLevelFilter] = useState<"all" | "error" | "info">("all");
  const [searchTerm, setSearchTerm] = useState("");

  const errorJobs = useMemo(() => {
    return jobs.filter((j) => j.status === "failed" || Boolean(j.error));
  }, [jobs]);

  return {
    errorJobs,
    levelFilter,
    setLevelFilter,
    searchTerm,
    setSearchTerm,
  };
}
