import { useState, useMemo } from "react";
import type { TelemetryLog } from "../../../core/types";

export function useTelemetry(logs: TelemetryLog[] = []) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [severityFilter, setSeverityFilter] = useState("all");

  const filteredLogs = useMemo(() => {
    if (severityFilter === "all") return logs;
    return logs.filter((l) => l.severity === severityFilter);
  }, [logs, severityFilter]);

  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;
  const paginatedLogs = useMemo(() => {
    return filteredLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  return {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize: (size: number) => {
      setPageSize(size);
      setCurrentPage(1);
    },
    severityFilter,
    setSeverityFilter: (filter: string) => {
      setSeverityFilter(filter);
      setCurrentPage(1);
    },
    totalPages,
    paginatedLogs,
    totalCount: logs.length,
  };
}
