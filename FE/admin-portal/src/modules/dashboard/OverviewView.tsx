import React from "react";
import {
  License,
  ClientSession,
  BillingSummary,
  TelemetryLog,
  Provider,
  AdminMenuKey,
} from "../../core/types";
import { StatsCard } from "../../components/common/StatsCard";
import { Badge } from "../../components/common/Badge";
import { Button } from "../../components/common/Button";

interface OverviewViewProps {
  licenses: License[];
  sessions: ClientSession[];
  billingSummary: BillingSummary | null;
  providers: Provider[];
  logs: TelemetryLog[];
  onNavigate: (menu: AdminMenuKey) => void;
  onOpenCreateLicense: () => void;
}

export function OverviewView({
  licenses,
  sessions,
  billingSummary,
  providers,
  logs,
  onNavigate,
  onOpenCreateLicense,
}: OverviewViewProps) {
  const activeLicenses = licenses.filter((item) => item.status === "active").length;
  const onlineDevices = sessions.filter((item) => item.is_online).length;
  const totalRevenue = billingSummary?.total_revenue || 0;
  const thisMonthRevenue = billingSummary?.this_month_revenue || 0;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);
  };

  return (
    <div className="view-container animate-fade-in">
      <div className="view-header">
        <div>
          <h1 className="view-title">Bảng Điều Khiển Tổng Quan</h1>
          <p className="view-subtitle">Theo dõi tài chính, cấp phép license và giám sát thiết bị thời gian thực</p>
        </div>
        <div className="view-actions">
          <Button variant="primary" onClick={onOpenCreateLicense} icon={<span>+</span>}>
            Cấp License Mới
          </Button>
        </div>
      </div>

      {/* Grid thẻ thống kê */}
      <div className="stats-grid">
        <StatsCard
          title="Tổng Doanh Thu Dòng Tiền"
          value={formatCurrency(totalRevenue)}
          subtitle={`Tháng này: ${formatCurrency(thisMonthRevenue)}`}
          icon={<span>💰</span>}
          color="emerald"
        />
        <StatsCard
          title="License Đang Hoạt Động"
          value={`${activeLicenses} / ${licenses.length}`}
          subtitle="Tất cả các máy đã cấp key"
          icon={<span>🔑</span>}
          color="cyan"
        />
        <StatsCard
          title="Máy Khách Đang Online"
          value={onlineDevices}
          subtitle="Gửi heartbeat trong 5 phút qua"
          icon={<span>💻</span>}
          color="purple"
        />
        <StatsCard
          title="AI Providers Khả Dụng"
          value={providers.length}
          subtitle="Đã cấu hình OpenAI/Gemini/Whisper"
          icon={<span>🤖</span>}
          color="amber"
        />
      </div>

      {/* 2 Cột hiển thị: Thiết bị online & Lịch sử cảnh báo */}
      <div className="dashboard-columns mt-6">
        {/* Cột 1: Máy khách online gần nhất */}
        <div className="admin-card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Máy Khách Đang Mở Tool Gần Đây</h3>
              <p className="card-subtitle">Cập nhật theo tín hiệu heartbeat từ Desktop</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onNavigate("sessions")}>
              Xem tất cả
            </Button>
          </div>

          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Khách hàng</th>
                  <th>Mã máy (HWID)</th>
                  <th>Hệ điều hành / Bản tool</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {sessions.slice(0, 5).map((session) => (
                  <tr key={session.license_id}>
                    <td>
                      <strong>{session.customer_name}</strong>
                      <div className="text-muted text-xs">{session.customer_contact}</div>
                    </td>
                    <td>
                      <code className="text-xs">{session.hwid}</code>
                    </td>
                    <td>
                      <span className="text-xs">
                        {session.last_platform || "Windows"} · v{session.last_app_version || "0.3.x"}
                      </span>
                    </td>
                    <td>
                      <Badge variant={session.is_online ? "online" : "offline"}>
                        {session.is_online ? "Đang Online" : "Offline"}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {sessions.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center text-muted py-6">
                      Chưa có thiết bị nào kết nối
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cột 2: Cảnh báo Telemetry gần đây */}
        <div className="admin-card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Cảnh Báo & Lỗi Hệ Thống Gần Đây</h3>
              <p className="card-subtitle">Báo cáo tự động từ các bản Desktop Tool</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onNavigate("logs")}>
              Xem chi tiết
            </Button>
          </div>

          <div className="log-list">
            {logs.slice(0, 5).map((log, idx) => (
              <div className="log-item" key={log.id || idx}>
                <div className="log-header">
                  <Badge variant={log.severity === "fatal" ? "fatal" : log.severity === "error" ? "warning" : "info"}>
                    {log.severity.toUpperCase()}
                  </Badge>
                  <span className="log-event">{log.event_name}</span>
                  <span className="log-version">v{log.app_version}</span>
                </div>
                <div className="log-msg">{log.message}</div>
              </div>
            ))}
            {logs.length === 0 && (
              <div className="text-center text-muted py-8">
                Hệ thống ổn định, không ghi nhận sự cố
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
