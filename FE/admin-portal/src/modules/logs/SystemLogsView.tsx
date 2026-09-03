import React, { useState } from "react";
import { TelemetryLog, AuditLog } from "../../core/types";
import { Button } from "../../components/common/Button";
import { Badge } from "../../components/common/Badge";
import { Select } from "../../components/common/Select";
import { Pagination } from "../../components/common/Pagination";

interface SystemLogsViewProps {
  telemetryLogs: TelemetryLog[];
  auditLogs: AuditLog[];
  onRefresh: () => void;
  loading?: boolean;
}

export function SystemLogsView({
  telemetryLogs,
  auditLogs,
  onRefresh,
  loading = false,
}: SystemLogsViewProps) {
  const [activeTab, setActiveTab] = useState<"audit" | "telemetry">("audit");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [auditPage, setAuditPage] = useState(1);
  const [telemetryPage, setTelemetryPage] = useState(1);
  const pageSize = 12;

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

  return (
    <div className="view-container animate-fade-in">
      <div className="view-header">
        <div>
          <h1 className="view-title">Nhật Ký & Cảnh Báo Hệ Thống</h1>
          <p className="view-subtitle">
            Theo dõi vết thao tác quản trị (Audit Trail) và các lỗi phát sinh từ Desktop Tool
          </p>
        </div>
        <div className="view-actions">
          <Button variant="ghost" onClick={onRefresh} loading={loading} icon={<span>↻</span>}>
            Làm mới
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-pill-group mb-6">
        <button
          type="button"
          className={`tab-pill ${activeTab === "audit" ? "is-active" : ""}`}
          onClick={() => setActiveTab("audit")}
        >
          📜 Thao Tác Quản Trị (Audit Logs) ({auditLogs.length})
        </button>
        <button
          type="button"
          className={`tab-pill ${activeTab === "telemetry" ? "is-active" : ""}`}
          onClick={() => setActiveTab("telemetry")}
        >
          🚨 Cảnh Báo & Lỗi Desktop (Telemetry) ({telemetryLogs.length})
        </button>
      </div>

      {activeTab === "audit" ? (
        <div className="admin-card">
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Hành Động</th>
                  <th>Người Thực Hiện</th>
                  <th>Khách Hàng / Đối Tượng</th>
                  <th>Thời Gian</th>
                  <th>Chi Tiết</th>
                </tr>
              </thead>
              <tbody>
                {paginatedAudit.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <code className="text-emerald font-semibold">{log.action}</code>
                    </td>
                    <td>
                      <span className="text-white text-xs">{log.actor}</span>
                    </td>
                    <td>
                      <span className="text-muted text-xs">
                        {log.customer ? String(log.customer) : log.license_id ? `License: ${String(log.license_id).slice(0, 8)}...` : "--"}
                      </span>
                    </td>
                    <td>
                      <span className="text-muted text-xs">
                        {log.created_at ? new Date(log.created_at).toLocaleString("vi-VN") : "--"}
                      </span>
                    </td>
                    <td>
                      <span className="text-xs text-muted font-mono max-w-xs truncate block" title={JSON.stringify(log)}>
                        {JSON.stringify(log)}
                      </span>
                    </td>
                  </tr>
                ))}
                {paginatedAudit.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center text-muted py-10">
                      Chưa có nhật ký thao tác
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={auditPage}
            totalPages={totalAuditPages}
            onPageChange={setAuditPage}
            totalItems={auditLogs.length}
            pageSize={pageSize}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="filter-bar admin-card">
            <div className="status-select-wrap">
              <Select
                value={severityFilter}
                onChange={(e) => {
                  setSeverityFilter(e.target.value);
                  setTelemetryPage(1);
                }}
              >
                <option value="all">Tất cả mức độ</option>
                <option value="fatal">Fatal (Nghiêm trọng)</option>
                <option value="error">Error (Lỗi)</option>
                <option value="warning">Warning (Cảnh báo)</option>
                <option value="info">Info (Thông tin)</option>
              </Select>
            </div>
          </div>

          <div className="admin-card">
            <div className="log-list">
              {paginatedTelemetry.map((log) => (
                <div className="log-item" key={log.id}>
                  <div className="log-header">
                    <Badge
                      variant={
                        log.severity === "fatal"
                          ? "fatal"
                          : log.severity === "error"
                          ? "warning"
                          : "info"
                      }
                    >
                      {log.severity.toUpperCase()}
                    </Badge>
                    <span className="log-event">{log.event_name}</span>
                    <span className="log-version">v{log.app_version}</span>
                    {log.created_at && (
                      <span className="text-muted text-xs ml-auto">
                        {new Date(log.created_at).toLocaleString("vi-VN")}
                      </span>
                    )}
                  </div>
                  <div className="log-msg">{log.message}</div>
                  {log.fingerprint && (
                    <div className="text-xs text-muted mt-1 font-mono">
                      Fingerprint: {log.fingerprint}
                    </div>
                  )}
                </div>
              ))}
              {paginatedTelemetry.length === 0 && (
                <div className="text-center text-muted py-10">
                  Không có bản ghi telemetry nào
                </div>
              )}
            </div>

            <Pagination
              currentPage={telemetryPage}
              totalPages={totalTelemetryPages}
              onPageChange={setTelemetryPage}
              totalItems={filteredTelemetry.length}
              pageSize={pageSize}
            />
          </div>
        </div>
      )}
    </div>
  );
}
