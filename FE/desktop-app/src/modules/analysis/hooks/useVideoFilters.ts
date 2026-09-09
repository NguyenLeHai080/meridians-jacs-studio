import { useState, useEffect, useMemo } from "react";
import type { Job } from "../../../core/types";

export function useVideoFilters(jobs: Job[] = [], initialSource?: Job) {
  // 1. Video Sources Filter & Management
  const sourceCandidates = useMemo(() => {
    const list = jobs.filter((j) => j.localPath || j.sourceType === "url" || j.analysis);
    if (initialSource && !list.some((item) => item.id === initialSource.id)) {
      return [initialSource, ...list];
    }
    return list;
  }, [jobs, initialSource]);

  // Expand / Collapse state for hierarchical tree table
  const [expandedJobIds, setExpandedJobIds] = useState<Set<string>>(new Set());

  // Pagination for Parent Videos
  const [parentPage, setParentPage] = useState(1);
  const [parentPageSize, setParentPageSize] = useState(5);

  // Pagination for Child Scenes
  const [scenePages, setScenePages] = useState<Record<string, number>>({});
  const SCENES_PER_PAGE = 5;

  // Multi-selection for batch operations
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());

  // Search, Filter & Sort State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "completed" | "running" | "queued" | "failed">("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [sortBy, setSortBy] = useState<"latest" | "name" | "duration" | "scenes" | "score">("latest");

  // Filtered & Sorted Videos
  const filteredVideos = useMemo(() => {
    return sourceCandidates
      .filter((job) => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = job.name.toLowerCase().includes(q);
          const matchPath = (job.localPath || "").toLowerCase().includes(q);
          const matchScenes = (job.analysis?.scenes || []).some(
            (s) =>
              s.title?.toLowerCase().includes(q) ||
              s.detail?.toLowerCase().includes(q) ||
              s.voiceover?.toLowerCase().includes(q)
          );
          if (!matchName && !matchPath && !matchScenes) return false;
        }

        const isCompleted = job.status === "completed" || Boolean(job.analysis?.scenes?.length);
        const isRunning = job.status === "running";
        const isFailed = job.status === "failed";
        const isQueued = !isCompleted && !isRunning && !isFailed;

        if (filterStatus === "completed" && !isCompleted) return false;
        if (filterStatus === "running" && !isRunning) return false;
        if (filterStatus === "queued" && !isQueued) return false;
        if (filterStatus === "failed" && !isFailed) return false;

        if (filterCategory !== "all") {
          const hasCategory = (job.analysis?.scenes || []).some((s) => {
            const txt = (s.title + " " + s.detail + " " + (s.keywords || []).join(" ")).toLowerCase();
            return txt.includes(filterCategory.toLowerCase());
          });
          if (!hasCategory) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "name") return a.name.localeCompare(b.name);
        if (sortBy === "duration") return (b.durationSeconds || 0) - (a.durationSeconds || 0);
        if (sortBy === "scenes") return (b.analysis?.scenes?.length || 0) - (a.analysis?.scenes?.length || 0);
        if (sortBy === "score") return (b.analysis?.score || 0) - (a.analysis?.score || 0);
        return 0;
      });
  }, [sourceCandidates, searchQuery, filterStatus, filterCategory, sortBy]);

  useEffect(() => {
    setParentPage(1);
  }, [searchQuery, filterStatus, filterCategory, sortBy]);

  const totalParentPages = Math.max(1, Math.ceil(filteredVideos.length / parentPageSize));
  const paginatedVideos = useMemo(() => {
    const start = (parentPage - 1) * parentPageSize;
    return filteredVideos.slice(start, start + parentPageSize);
  }, [filteredVideos, parentPage, parentPageSize]);

  const completedCount = useMemo(() => {
    return sourceCandidates.filter((j) => j.status === "completed" || Boolean(j.analysis?.scenes?.length)).length;
  }, [sourceCandidates]);

  const runningCount = useMemo(() => {
    return sourceCandidates.filter((j) => j.status === "running").length;
  }, [sourceCandidates]);

  const toggleExpand = (jobId: string) => {
    setExpandedJobIds((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  };

  const toggleSelect = (jobId: string) => {
    setSelectedJobIds((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedJobIds(new Set(filteredVideos.map((v) => v.id)));
    } else {
      setSelectedJobIds(new Set());
    }
  };

  return {
    sourceCandidates,
    expandedJobIds,
    setExpandedJobIds,
    toggleExpand,
    parentPage,
    setParentPage,
    parentPageSize,
    setParentPageSize,
    totalParentPages,
    paginatedVideos,
    scenePages,
    setScenePages,
    SCENES_PER_PAGE,
    selectedJobIds,
    setSelectedJobIds,
    toggleSelect,
    handleSelectAll,
    searchQuery,
    setSearchQuery,
    filterStatus,
    setFilterStatus,
    filterCategory,
    setFilterCategory,
    sortBy,
    setSortBy,
    filteredVideos,
    completedCount,
    runningCount,
  };
}
