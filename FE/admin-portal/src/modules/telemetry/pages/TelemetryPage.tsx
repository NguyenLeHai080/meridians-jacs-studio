import React, { useState, useEffect, useCallback } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { TelemetryLog } from "../../../core/types";
import { useTelemetry } from "../hooks/useTelemetry";
import { telemetryService } from "../services/telemetryService";
import { DataTable, StatusBadge, FilterSelect, Button, Column } from "../../../components/common";
import { useI18n } from "../../../core/i18n";
import "../lang"; // Auto-registers telemetry translation

interface TelemetryPageProps {
  logs?: TelemetryLog[];
  onRefresh?: () => Promise<void>;
  setMessage?: (msg: string) => void;
  setError?: (err: string) => void;
  searchTerm?: string;
  onNotify?: (msg: string, type?: "success" | "error") => void;
}

export const TelemetryPage: React.FC<TelemetryPageProps> = ({
  logs: propLogs,
  onRefresh: propOnRefresh,
  setMessage: propSetMessage,
  setError: propSetError,
  searchTerm: _searchTerm,
  onNotify,
}) => {
  const { t, language } = useI18n();

  const [localLogs, setLocalLogs] = useState<TelemetryLog[]>(propLogs || []);
  const activeLogs = propLogs || localLogs;

  const fetchLogsData = useCallback(async () => {
    try {
      const data = await telemetryService.getLogs();
      setLocalLogs(data);
    } catch {
      // Handled
    }
  }, []);

  useEffect(() => {
    if (!propLogs) {
      fetchLogsData();
    }
  }, [propLogs, fetchLogsData]);

  const notify = (msg: string, type: "success" | "error" = "success") => {
    if (onNotify) onNotify(msg, type);
    else if (type === "error" && propSetError) propSetError(msg);
    else if (propSetMessage) propSetMessage(msg);
  };

  const {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    severityFilter,
    setSeverityFilter,
    totalPages,
    paginatedLogs,
    totalCount,
  } = useTelemetry(activeLogs);

  const handleRefresh = async () => {
    if (propOnRefresh) await propOnRefresh();
    else await fetchLogsData();
  };

  const handleCreateManualLog = async () => {
    try {
      await telemetryService.createManualLog();
      notify("✓ Đã bắn log chẩn đoán test thành công", "success");
      await handleRefresh();
    } catch (err: any) {
      notify(err instanceof Error ? err.message : "Lỗi tạo log", "error");
    }
  };

  const handleClearLogs = async () => {
    if (!confirm("Bạn có chắc muốn xóa toàn bộ nhật ký hệ thống?")) return;
    try {
      await telemetryService.clearLogs();
      notify("Đã xóa toàn bộ nhật ký sự cố", "success");
      await handleRefresh();
    } catch (err: any) {
      notify(err instanceof Error ? err.message : "Lỗi xóa log", "error");
    }
  };

  const columns: Column<TelemetryLog>[] = [
    {
      key: "time",
      header: t("thTime"),
      render: (log) => (
        <span style={{ fontSize: "0.78rem", whiteSpace: "nowrap" }}>
          {log.created_at
            ? new Date(log.created_at).toLocaleString(
                language === "vi" ? "vi-VN" : language === "jp" ? "ja-JP" : "en-US"
              )
            : "--"}
        </span>
      ),
    },
    {
      key: "severity",
      header: t("thSeverity"),
      render: (log) => (
        <StatusBadge
          status={
            log.severity === "fatal" || log.severity === "error"
              ? "danger"
              : log.severity === "warning"
              ? "warning"
              : "active"
          }
          label={log.severity.toUpperCase()}
        />
      ),
    },
    {
      key: "version",
      header: t("thVersion"),
      render: (log) => <span className="code-chip">v{log.app_version}</span>,
    },
    {
      key: "event",
      header: t("thEvent"),
      render: (log) => <strong>{log.event_name}</strong>,
    },
    {
      key: "message",
      header: t("thMessage"),
      render: (log) => (
        <span style={{ fontSize: "0.82rem", color: "var(--text-body)" }}>{log.message}</span>
      ),
    },
  ];

  return (
    <DataTable
      title={`${t("telemetryTitle")} (${totalCount})`}
      subtitle={t("telemetrySubtitle")}
      headerActions={
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <Button
            variant="outline"
            size="sm"
            style={{ color: "var(--danger)", borderColor: "var(--danger)" }}
            onClick={handleClearLogs}
            icon={<Trash2 size={14} />}
          >
            {t("btnClearLogs")}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleCreateManualLog}
            icon={<Plus size={15} />}
          >
            {t("btnManualLog")}
          </Button>
        </div>
      }
      filters={
        <FilterSelect
          value={severityFilter}
          onChange={(e) => {
            setSeverityFilter(e.target.value);
            setCurrentPage(1);
          }}
          options={[
            { value: "all", label: "Tất cả mức độ" },
            { value: "info", label: "INFO" },
            { value: "warning", label: "WARNING" },
            { value: "error", label: "ERROR" },
            { value: "fatal", label: "FATAL" },
          ]}
        />
      }
      columns={columns}
      data={paginatedLogs}
      emptyTitle={t("noLogsFound")}
      pagination={{
        currentPage,
        totalPages,
        onPageChange: setCurrentPage,
        totalItems: totalCount,
        pageSize,
        pageSizeOptions: [10, 15, 30, 50],
        onPageSizeChange: setPageSize,
      }}
    />
  );
};
