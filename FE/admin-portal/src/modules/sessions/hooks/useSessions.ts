import { useState, useMemo } from "react";
import type { ClientSession } from "../../../core/types";

export function useSessions(sessions: ClientSession[] = []) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalPages = Math.ceil(sessions.length / pageSize) || 1;
  const paginatedSessions = useMemo(() => {
    return sessions.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [sessions, currentPage, pageSize]);

  const onlineCount = useMemo(() => sessions.filter((s) => s.is_online).length, [sessions]);

  return {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize: (size: number) => {
      setPageSize(size);
      setCurrentPage(1);
    },
    totalPages,
    paginatedSessions,
    onlineCount,
    totalCount: sessions.length,
  };
}
