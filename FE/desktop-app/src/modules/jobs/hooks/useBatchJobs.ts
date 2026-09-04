import { useState, useMemo } from "react";
import type { Job, JobStatus } from "../../../core/types";

export function useBatchJobs(jobs: Job[]) {
  const [filterStatus, setFilterStatus] = useState<JobStatus | "all">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);

  const filteredJobs = useMemo(() => {
    return jobs.filter((j) => {
      if (j.sourceOnly) return false;
      if (filterStatus !== "all" && j.status !== filterStatus) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          j.name.toLowerCase().includes(q) ||
          j.source.toLowerCase().includes(q) ||
          (j.error && j.error.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [jobs, filterStatus, searchTerm]);

  return {
    filteredJobs,
    filterStatus,
    setFilterStatus,
    searchTerm,
    setSearchTerm,
    selectedJobIds,
    setSelectedJobIds,
  };
}
