import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { jobService } from "../services/jobService";
import type { JobItem, JobMetrics, CreateJobInput } from "../types";
import { showToast, confirmDialog } from "../../../core/swal";

export function useJobs(onNotify?: (msg: string, type?: "success" | "error") => void) {
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [loading, setLoading] = useState(false);
  const isFetchingRef = useRef(false);

  const notify = useCallback(
    (msg: string, type: "success" | "error" = "success") => {
      showToast(msg, type);
      if (onNotify) onNotify(msg, type);
    },
    [onNotify]
  );

  const fetchJobs = useCallback(async () => {
    if (isFetchingRef.current) return;
    try {
      isFetchingRef.current = true;
      setLoading(true);
      const data = await jobService.getJobs();
      setJobs(data);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleCreateJob = async (input: CreateJobInput) => {
    try {
      const created = await jobService.createJob(input);
      setJobs((prev) => [created, ...prev]);
      notify(`Đã tạo tác vụ "${created.name}" thành công`, "success");
      return true;
    } catch (e: any) {
      notify(e?.message || "Lỗi tạo tác vụ mới", "error");
      return false;
    }
  };

  const handleCancelJob = async (job: JobItem) => {
    const ok = await confirmDialog({
      title: "Xác nhận hủy tác vụ?",
      text: `Bạn có chắc chắn muốn hủy Job "${job.name}"?`,
    });
    if (!ok) return;

    try {
      await jobService.cancelJob(job.id);
      setJobs((prev) =>
        prev.map((j) => (j.id === job.id ? { ...j, status: "cancelled", stage: "cancelled" } : j))
      );
      notify("Đã hủy tác vụ thành công", "success");
    } catch (e: any) {
      notify(e?.message || "Lỗi hủy tác vụ", "error");
    }
  };

  const handleDeleteJob = async (job: JobItem) => {
    const ok = await confirmDialog({
      title: "Xác nhận xóa bản ghi?",
      text: `Xóa lịch sử tác vụ "${job.name}" khỏi hệ thống?`,
      isDestructive: true,
    });
    if (!ok) return;

    try {
      await jobService.deleteJob(job.id);
      setJobs((prev) => prev.filter((j) => j.id !== job.id));
      notify("Đã xóa tác vụ thành công", "success");
    } catch (e: any) {
      notify(e?.message || "Lỗi xóa tác vụ", "error");
    }
  };

  const metrics: JobMetrics = useMemo(() => {
    const total = jobs.length;
    const running = jobs.filter((j) => j.status === "running" || j.status === "queued").length;
    const completed = jobs.filter((j) => j.status === "completed").length;
    const failed = jobs.filter((j) => j.status === "failed" || j.status === "cancelled").length;
    return { total, running, completed, failed };
  }, [jobs]);

  return {
    jobs,
    loading,
    metrics,
    fetchJobs,
    handleCreateJob,
    handleCancelJob,
    handleDeleteJob,
  };
}
