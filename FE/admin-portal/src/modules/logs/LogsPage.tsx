import React, { useState, useEffect, useCallback } from "react";
import { ScrollText, RefreshCw } from "lucide-react";
import type { TelemetryLog, AuditLog } from "../../core/types";
import { telemetryService } from "../telemetry/services/telemetryService";
import { apiRequest } from "../../core/api";
import { getToken } from "../../core/session";
import { DataTable, StatusBadge, FilterSelect, Column } from "../../components/common";

interface LogsPageProps {
  onNotify?: (msg: string, type?: "success" | "error") => void;
}

export const LogsPage: React.FC<LogsPageProps> = ({ onNotify }) => {
  const [activeTab, setActiveTab] = useState<"audit" | "telemetry">("audit");
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [telemetryLogs, setTelemetryLogs] = useState<TelemetryLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [severityFilter, setSeverityFilter] = useState("all");
  const [auditPage, setAuditPage] = useState(1);
  const [telemetryPage, setTelemetryPage] = useState(1);
  const pageSize = 12;

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const token = getToken() || "";
      const [telemetryData, auditData] = await Promise.allSettled([
        telemetryService.getLogs(),
        apiRequest<AuditLog[]>("/api/v1/audit-logs", {}, token).catch(() => [] as AuditLog[]),
      ]);

      if (telemetryData.status === "fulfilled" && Array.isArray(telemetryData.value)) {
        setTelemetryLogs(telemetryData.value);
      }
      if (auditData.status === "fulfilled" && Array.isArray(auditData.value)) {
        setAuditLogs(auditData.value);
      }
    } catch {
      if (onNotify) onNotify("Không thể làm mới nhật ký", "error");
    } finally {
      setLoading(false);
    }
  }, [onNotify]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredTelemetry = telemetryLogs.filter((log) => {
    if (severityFilter === "all") return true;
    return log.severity === severityFilter;
  });

  const totalAuditPages = Math.ceil(auditLogs.length / pageSize) || 1;
  const paginatedAudit = auditLogs.slice((auditPage - 1) * pageSize, auditPage * pageSize);

  const totalTelemetryPages = Math.ceil(filteredTelemetry.length / pageSize) || 1;
  const paginatedTelemetry = filteredTelemetry.slice(
    (telemetryPage - 1) * pageSize,
    telemetryPage * pageSize
  );

  const auditColumns: Column<AuditLog>[] = [
    {
      key: "action",
      header: "Hành Động",
      render: (log) => <StatusBadge status="active" label={log.action} />,
    },
    {
      key: "actor",
      header: "Người Thực Hiện",
      render: (log) => <span style={{ fontWeight: 700, color: "#0f172a" }}>{log.actor}</span>,
    },
    {
      key: "customer",
      header: "Đối Tượng / Khách Hàng",
      render: (log) => (
        <span style={{ color: "#64748b", fontSize: "0.8rem" }}>
          {log.customer ? String(log.customer) : log.license_id ? `License: ${String(log.license_id).slice(0, 8)}...` : "--"}
        </span>
      ),
    },
    {
      key: "time",
      header: "Thời Gian",
      render: (log) => (
        <span style={{ color: "#64748b", fontSize: "0.8rem" }}>
          {log.created_at ? new Date(log.created_at).toLocaleString("vi-VN") : "--"}
        </span>
      ),
    },
    {
      key: "details",
      header: "Chi Tiết",
      render: (log) => (
        <span
          className="code-chip"
          style={{
            maxWidth: "260px",
            display: "inline-block",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {JSON.stringify(log)}
        </span>
      ),
    },
  ];

  const telemetryColumns: Column<TelemetryLog>[] = [
    {
      key: "severity",
      header: "Mức Độ",
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
      key: "event",
      header: "Sự Kiện",
      render: (log) => <strong style={{ color: "#0f172a" }}>{log.event_name}</strong>,
    },
    {
      key: "version",
      header: "Phiên Bản",
      render: (log) => <span className="code-chip">v{log.app_version}</span>,
    },
    {
      key: "message",
      header: "Thông Điệp / Ngoại Lệ",
      render: (log) => (
        <div style={{ maxWidth: "450px", wordBreak: "break-word" }}>
          <span style={{ fontSize: "0.8rem", color: "#334155" }}>{log.message}</span>
          {log.fingerprint && (
            <div style={{ fontSize: "0.7rem", color: "#94a3b8", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
              HWID: {log.fingerprint}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "time",
      header: "Thời Gian",
      render: (log) => (
        <span style={{ color: "#64748b", fontSize: "0.78rem" }}>
          {log.created_at ? new Date(log.created_at).toLocaleString("vi-VN") : "--"}
        </span>
      ),
    },
  ];

  return (
    <div className="view-container animate-fade-in">
      {/* Header */}
      <div className="page-header-row">
        <div className="page-title-group">
          <h1>
            <ScrollText size={24} color="var(--primary)" />
            Nhật Ký & Hoạt Động Hệ Thống
          </h1>
          <p>
            Theo dõi toàn diện vết thao tác quản trị (Audit Trail) và các lỗi phát sinh từ ứng dụng Desktop
          </p>
        </div>
        <div className="page-actions-group">
          <button
            type="button"
            className="btn-white-outline"
            onClick={fetchLogs}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-pill-group mb-6" style={{ maxWidth: "420px" }}>
        <button
          type="button"
          className={`tab-pill ${activeTab === "audit" ? "active" : ""}`}
          onClick={() => setActiveTab("audit")}
        >
          📜 Thao Tác Quản Trị ({auditLogs.length})
        </button>
        <button
          type="button"
          className={`tab-pill ${activeTab === "telemetry" ? "active" : ""}`}
          onClick={() => setActiveTab("telemetry")}
        >
          🚨 Cảnh Báo Desktop ({telemetryLogs.length})
        </button>
      </div>

      {/* Tab 1: Audit Logs */}
      {activeTab === "audit" && (
        <DataTable
          title={`Vết Thao Tác Quản Trị (${auditLogs.length})`}
          subtitle="Lịch sử các thay đổi dữ liệu được thực hiện bởi Admin"
          columns={auditColumns}
          data={paginatedAudit}
          loading={loading}
          emptyTitle="Chưa có bản ghi nhật ký thao tác quản trị"
          pagination={{
            currentPage: auditPage,
            totalPages: totalAuditPages,
            onPageChange: setAuditPage,
            totalItems: auditLogs.length,
            pageSize,
          }}
        />
      )}

      {/* Tab 2: Telemetry Logs */}
      {activeTab === "telemetry" && (
        <DataTable
          title={`Nhật Ký & Cảnh Báo Desktop (${filteredTelemetry.length})`}
          subtitle="Lỗi ngoại lệ, trạng thái runtime gửi về từ máy khách"
          columns={telemetryColumns}
          data={paginatedTelemetry}
          loading={loading}
          emptyTitle="Không tìm thấy bản ghi telemetry phù hợp"
          filters={
            <FilterSelect
              value={severityFilter}
              onChange={(e) => {
                setSeverityFilter(e.target.value);
                setTelemetryPage(1);
              }}
              options={[
                { value: "all", label: "Tất cả mức độ" },
                { value: "fatal", label: "Fatal (Nghiêm trọng)" },
                { value: "error", label: "Error (Lỗi)" },
                { value: "warning", label: "Warning (Cảnh báo)" },
                { value: "info", label: "Info (Thông tin)" },
              ]}
            />
          }
          pagination={{
            currentPage: telemetryPage,
            totalPages: totalTelemetryPages,
            onPageChange: setTelemetryPage,
            totalItems: filteredTelemetry.length,
            pageSize,
          }}
        />
      )}
    </div>
  );
};
