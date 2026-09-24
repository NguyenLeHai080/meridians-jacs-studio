import React, { useState, useMemo } from "react";
import { useJobs } from "./hooks/useJobs";
import { JobKpiCards } from "./components/JobKpiCards";
import { JobFilterToolbar } from "./components/JobFilterToolbar";
import { JobTable } from "./components/JobTable";
import { JobDetailModal } from "./components/JobDetailModal";
import { CreateJobModal } from "./components/CreateJobModal";
import type { JobItem } from "./types";

interface JobsPageProps {
  searchTerm?: string;
  onNotify?: (message: string, type?: "success" | "error") => void;
}

export const JobsPage: React.FC<JobsPageProps> = ({ searchTerm: externalSearch = "", onNotify }) => {
  const {
    jobs,
    loading,
    metrics,
    fetchJobs,
    handleCreateJob,
    handleCancelJob,
    handleDeleteJob,
  } = useJobs(onNotify);

  const [searchQuery, setSearchQuery] = useState(externalSearch);

  React.useEffect(() => {
    if (externalSearch) setSearchQuery(externalSearch);
  }, [externalSearch]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [modeFilter, setModeFilter] = useState("all");
  const [selectedJob, setSelectedJob] = useState<JobItem | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const filteredJobs = useMemo(() => {
    return jobs.filter((j) => {
      if (statusFilter !== "all" && j.status !== statusFilter) return false;
      if (modeFilter !== "all" && j.execution_mode !== modeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = j.name?.toLowerCase().includes(q);
        const matchId = (j.client_job_id || j.id)?.toLowerCase().includes(q);
        const matchCustomer = j.customer_name?.toLowerCase().includes(q);
        const matchKey = j.license_key?.toLowerCase().includes(q);
        if (!matchName && !matchId && !matchCustomer && !matchKey) return false;
      }
      return true;
    });
  }, [jobs, statusFilter, modeFilter, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-1">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>⚡ Quản Lý Tác Vụ & Jobs AI</span>
          </h2>
          <p className="text-xs text-slate-500">
            Giám sát tiến độ render, phân tích và thực thi tác vụ AI đa luồng theo khách hàng & license key
          </p>
        </div>
      </div>

      {/* KPI metric cards */}
      <JobKpiCards metrics={metrics} loading={loading} />

      {/* Filter toolbar */}
      <JobFilterToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        modeFilter={modeFilter}
        onModeFilterChange={setModeFilter}
        loading={loading}
        onRefresh={fetchJobs}
        onOpenCreate={() => setIsCreateOpen(true)}
      />

      {/* High-density single-line table */}
      <JobTable
        jobs={filteredJobs}
        loading={loading}
        onView={(job) => setSelectedJob(job)}
        onCancel={handleCancelJob}
        onDelete={handleDeleteJob}
      />

      {/* Modals */}
      <JobDetailModal
        job={selectedJob}
        onClose={() => setSelectedJob(null)}
      />

      <CreateJobModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateJob}
      />
    </div>
  );
};
