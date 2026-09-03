import React, { useState, useMemo } from "react";
import { ClientSession } from "../../core/types";
import { Button } from "../../components/common/Button";
import { Badge } from "../../components/common/Badge";
import { Input } from "../../components/common/Input";
import { Select } from "../../components/common/Select";
import { Toast } from "../../components/common/Toast";
import { Pagination } from "../../components/common/Pagination";
import { CopyButton } from "../../components/common/CopyButton";

interface ActiveSessionsViewProps {
  sessions: ClientSession[];
  onTerminateSession: (licenseId: string) => Promise<void>;
  onRefresh: () => void;
  loading?: boolean;
}

export function ActiveSessionsView({
  sessions,
  onTerminateSession,
  onRefresh,
  loading = false,
}: ActiveSessionsViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const filteredSessions = useMemo(() => {
    return (sessions || []).filter((session) => {
      if (!session) return false;
      const matchesSearch =
        (session.customer_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (session.customer_contact || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (session.hwid || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (session.key_hint || "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "online"
          ? session.is_online
          : !session.is_online;

      return matchesSearch && matchesStatus;
    });
  }, [sessions, searchTerm, statusFilter]);

  const totalPages = Math.ceil(filteredSessions.length / pageSize) || 1;
  const paginatedSessions = filteredSessions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  async function handleTerminate(licenseId: string, name: string) {
    if (!window.confirm(`Bạn có chắc muốn ngắt kết nối phiên làm việc của "${name}"?`)) return;
    try {
      await onTerminateSession(licenseId);
      setMessage(`Đã ngắt phiên thiết bị của ${name}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi ngắt phiên");
    }
  }

  const onlineCount = sessions.filter((s) => s.is_online).length;

  return (
    <div className="view-container animate-fade-in">
      <div className="view-header">
        <div>
          <h1 className="view-title">Quản Lý Thiết Bị / Máy Khách Đang Online</h1>
          <p className="view-subtitle">
            Giám sát trạng thái hoạt động thực tế của các bản cài Desktop theo tín hiệu Heartbeat
          </p>
        </div>
        <div className="view-actions">
          <Button variant="ghost" onClick={onRefresh} loading={loading} icon={<span>↻</span>}>
            Làm mới ({onlineCount} Đang Online)
          </Button>
        </div>
      </div>

      {message && <Toast type="success" message={message} onClose={() => setMessage("")} />}
      {error && <Toast type="error" message={error} onClose={() => setError("")} />}

      <div className="filter-bar admin-card mb-6">
        <div className="filter-group-row">
          <div className="search-input-wrap">
            <Input
              placeholder="🔍 Tìm kiếm theo tên khách, HWID, IP..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="status-select-wrap">
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">Tất cả ({sessions.length})</option>
              <option value="online">Chỉ thiết bị Online ({onlineCount})</option>
              <option value="offline">Thiết bị Offline ({sessions.length - onlineCount})</option>
            </Select>
          </div>
        </div>
      </div>

      <div className="admin-card">
        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Khách Hàng / Key</th>
                <th>Mã Máy (HWID)</th>
                <th>Hệ Điều Hành / Bản Tool</th>
                <th>Địa Chỉ IP</th>
                <th>Lần Cuối Hoạt Động</th>
                <th>Trạng Thái</th>
                <th className="text-right">Hành Động</th>
              </tr>
            </thead>
            <tbody>
              {paginatedSessions.map((session) => (
                <tr key={session.license_id}>
                  <td>
                    <strong className="text-white">{session.customer_name}</strong>
                    <div className="text-muted text-xs">
                      <code>{session.key_hint}</code> · {session.customer_contact}
                    </div>
                  </td>
                  <td>
                    <div className="hwid-cell">
                      <code className="hwid-code" title={session.hwid}>
                        {session.hwid.slice(0, 16)}...
                      </code>
                      <CopyButton text={session.hwid} label="" />
                    </div>
                  </td>
                  <td>
                    <div className="text-xs">
                      <span className="font-semibold text-white">
                        {session.last_platform === "windows"
                          ? "🪟 Windows"
                          : session.last_platform === "macos"
                          ? "🍏 macOS"
                          : "🐧 Linux"}
                      </span>
                      <div className="text-muted">v{session.last_app_version || "0.3.x"}</div>
                    </div>
                  </td>
                  <td>
                    <code className="text-xs">{session.last_ip || "127.0.0.1"}</code>
                  </td>
                  <td>
                    {session.last_seen_at ? (
                      <div className="text-xs">
                        <span>{new Date(session.last_seen_at).toLocaleDateString("vi-VN")}</span>
                        <div className="text-muted">
                          {new Date(session.last_seen_at).toLocaleTimeString("vi-VN")}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted text-xs">Chưa từng kết nối</span>
                    )}
                  </td>
                  <td>
                    <Badge variant={session.is_online ? "online" : "offline"}>
                      {session.is_online ? "Đang Online" : "Offline"}
                    </Badge>
                  </td>
                  <td className="text-right">
                    {session.is_online && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleTerminate(session.license_id, session.customer_name)}
                      >
                        Ngắt phiên
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {paginatedSessions.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-muted py-10">
                    Không có thiết bị nào phù hợp
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
          totalItems={filteredSessions.length}
          pageSize={pageSize}
        />
      </div>
    </div>
  );
}
