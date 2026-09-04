import React, { useState, useEffect, useCallback } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { TelemetryLog } from "../../../core/types";
import { useTelemetry } from "../hooks/useTelemetry";
import { telemetryService } from "../services/telemetryService";
import { Pagination } from "../../../components/common/Pagination";
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

  return (
    <div className="mf-card-panel">
      <div className="mf-card-header">
        <div className="mf-card-title-group">
          <h3>{t("telemetryTitle")} ({totalCount})</h3>
          <p>{t("telemetrySubtitle")}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <button
            type="button"
            className="btn-white-outline"
            style={{ color: "var(--danger)" }}
            onClick={handleClearLogs}
          >
            <Trash2 size={15} /> {t("btnClearLogs")}
          </button>
          <button
            type="button"
            className="btn-primary-orange"
            onClick={handleCreateManualLog}
          >
            <Plus size={16} /> {t("btnManualLog")}
          </button>
        </div>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <select
          className="form-input-mf"
          style={{ width: "auto", minWidth: "160px" }}
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
        >
          <option value="all">Tất cả mức độ</option>
          <option value="info">INFO</option>
          <option value="warning">WARNING</option>
          <option value="error">ERROR</option>
          <option value="fatal">FATAL</option>
        </select>
      </div>

      <div className="table-responsive">
        <table className="mf-table">
          <thead>
            <tr>
              <th>{t("thTime")}</th>
              <th>{t("thSeverity")}</th>
              <th>{t("thVersion")}</th>
              <th>{t("thEvent")}</th>
              <th>{t("thMessage")}</th>
            </tr>
          </thead>
          <tbody>
            {paginatedLogs.map((log) => (
              <tr key={log.id}>
                <td style={{ fontSize: "0.78rem", whiteSpace: "nowrap" }}>
                  {log.created_at ? (
                    new Date(log.created_at).toLocaleString(
                      language === "vi" ? "vi-VN" : language === "jp" ? "ja-JP" : "en-US"
                    )
                  ) : "--"}
                </td>
                <td>
                  <span
                    className={`pill-status-mf ${
                      log.severity === "fatal" || log.severity === "error"
                        ? "status-locked"
                        : log.severity === "warning"
                        ? "status-expired"
                        : "status-active"
                    }`}
                    style={{ fontSize: "0.68rem" }}
                  >
                    {log.severity.toUpperCase()}
                  </span>
                </td>
                <td>
                  <span className="code-chip">v{log.app_version}</span>
                </td>
                <td>
                  <strong>{log.event_name}</strong>
                </td>
                <td style={{ fontSize: "0.82rem", color: "var(--text-body)" }}>{log.message}</td>
              </tr>
            ))}
            {paginatedLogs.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                  {t("noLogsFound")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        totalItems={totalCount}
        pageSize={pageSize}
        pageSizeOptions={[10, 15, 30, 50]}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
};
