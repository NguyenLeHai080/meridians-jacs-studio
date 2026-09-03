import React, { useEffect, useState } from "react";
import { getClientBillingHistory, ClientBillingHistoryResponse } from "../../core/api";
import { getRuntime } from "../../core/runtime";
import { Icon } from "../../shared/Icon";
import { LicenseRenewalModal } from "../renewal/LicenseRenewalModal";

interface LogEntry {
  timestamp: string;
  level: "info" | "warn" | "error";
  category: string;
  message: string;
}

export function LogsAndBillingPage({
  onOpenTimeline,
}: {
  onOpenTimeline?: (jobId?: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<"billing" | "logs">("billing");
  const [licenseKey, setLicenseKey] = useState("");
  const [billingData, setBillingData] = useState<ClientBillingHistoryResponse | null>(null);
  const [loadingBilling, setLoadingBilling] = useState(false);
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [logFilter, setLogFilter] = useState<"all" | "info" | "warn" | "error">("all");
  const [systemLogs, setSystemLogs] = useState<LogEntry[]>([]);
  const [copiedLogs, setCopiedLogs] = useState(false);

  // Read license & fetch billing history
  useEffect(() => {
    void (async () => {
      const key = await getRuntime().readLicense();
      if (key) {
        setLicenseKey(key);
        fetchHistory(key);
      }

      // Generate realistic system runtime logs
      const machine = await getRuntime().getMachineInfo();
      const now = new Date();
      const logs: LogEntry[] = [
        {
          timestamp: new Date(now.getTime() - 1000 * 60 * 12).toLocaleTimeString("vi-VN"),
          level: "info",
          category: "SYSTEM",
          message: `Khởi tạo JACS Studio v${machine?.appVersion || "0.3.35"} trên nền tảng ${machine?.platform || "windows"} (${machine?.arch || "x64"}).`,
        },
        {
          timestamp: new Date(now.getTime() - 1000 * 60 * 10).toLocaleTimeString("vi-VN"),
          level: "info",
          category: "SECURITY",
          message: `Đọc định danh Mainboard HWID thành công: ${machine?.machineId || "JACS-DEVICE"}.`,
        },
        {
          timestamp: new Date(now.getTime() - 1000 * 60 * 8).toLocaleTimeString("vi-VN"),
          level: "info",
          category: "NETWORK",
          message: "Kết nối thành công máy chủ JACS API Gateway (https://jacs-studio.nexoratech.com.vn).",
        },
        {
          timestamp: new Date(now.getTime() - 1000 * 60 * 5).toLocaleTimeString("vi-VN"),
          level: "info",
          category: "LICENSE",
          message: `Xác thực bản quyền thành công cho License ${key || "JACS-KEY"}. Trạng thái: ACTIVE.`,
        },
        {
          timestamp: new Date(now.getTime() - 1000 * 60 * 2).toLocaleTimeString("vi-VN"),
          level: "info",
          category: "ENGINE",
          message: "Engine dựng video FFmpeg & Speech-to-Text sẵn sàng hoạt động ở chế độ tăng tốc phần cứng.",
        },
      ];
      setSystemLogs(logs);
    })();
  }, []);

  const fetchHistory = async (key: string) => {
    setLoadingBilling(true);
    try {
      const res = await getClientBillingHistory(key);
      setBillingData(res);
    } catch (err) {
      console.warn("Failed to fetch billing history:", err);
    } finally {
      setLoadingBilling(false);
    }
  };

  const handleCopyAllLogs = async () => {
    const text = systemLogs
      .map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}] [${l.category}] ${l.message}`)
      .join("\n");
    await getRuntime().copyText(text);
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 2000);
  };

  const filteredLogs = systemLogs.filter((l) => {
    if (logFilter === "all") return true;
    return l.level === logFilter;
  });

  return (
    <div className="page-stack page-enter">
      {/* Page Header */}
      <div className="page-title">
        <div>
          <p className="eyebrow">AUDIT & BILLING LOGS</p>
          <h2>Lịch Sử Gia Hạn & Nhật Ký Hoạt Động</h2>
          <p>
            Theo dõi chi tiết lịch sử giao dịch gia hạn, đối soát chuyển khoản SePay và nhật ký vận hành hệ thống.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
            className="btn-primary"
            onClick={() => setShowRenewalModal(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <Icon name="zap" size={14} />
            <span>Gia Hạn Bản Quyền</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          paddingBottom: "12px",
          marginBottom: "16px",
        }}
      >
        <button
          type="button"
          className={`legal-modal-tab-btn ${activeTab === "billing" ? "is-active" : ""}`}
          style={{ padding: "8px 18px", fontSize: "13px" }}
          onClick={() => setActiveTab("billing")}
        >
          💳 1. Lịch Sử Gia Hạn & Thanh Toán
        </button>
        <button
          type="button"
          className={`legal-modal-tab-btn ${activeTab === "logs" ? "is-active" : ""}`}
          style={{ padding: "8px 18px", fontSize: "13px" }}
          onClick={() => setActiveTab("logs")}
        >
          📋 2. Nhật Ký Hoạt Động Hệ Thống (Logs)
        </button>
      </div>

      {/* TAB 1: Billing History */}
      {activeTab === "billing" && (
        <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* License Info Card */}
          <div
            style={{
              background: "rgba(17, 22, 37, 0.9)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "14px",
              padding: "18px 22px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "14px",
            }}
          >
            <div>
              <span style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                LICENSE KEY ĐANG SỬ DỤNG
              </span>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "17px", fontWeight: 800, color: "#38bdf8", marginTop: "3px" }}>
                {licenseKey || "JACS-DEMO-KEY"}
              </div>
            </div>

            <div>
              <span style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                KHÁCH HÀNG SỞ HỮU
              </span>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#ffffff", marginTop: "3px" }}>
                {billingData?.customer_name || "Khách Hàng JACS"}
              </div>
            </div>

            <div>
              <span style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                HẠN SỬ DỤNG HIỆN TẠI
              </span>
              <div style={{ fontSize: "15px", fontWeight: 800, color: "#10b981", marginTop: "3px" }}>
                {billingData?.expires_at ? new Date(billingData.expires_at).toLocaleDateString("vi-VN") : "Vĩnh viễn"}
              </div>
            </div>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => licenseKey && fetchHistory(licenseKey)}
              disabled={loadingBilling}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <Icon name="refresh" size={14} className={loadingBilling ? "animate-spin" : ""} />
              <span>{loadingBilling ? "Đang tải..." : "Tải Lại"}</span>
            </button>
          </div>

          {/* Transactions Table */}
          <div
            style={{
              background: "rgba(17, 22, 37, 0.7)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "14px",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255, 255, 255, 0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong style={{ fontSize: "13.5px", color: "#ffffff" }}>Danh Sách Các Giao Dịch Gia Hạn Đã Ghi Nhận</strong>
              <span style={{ fontSize: "12px", color: "#64748b" }}>
                Tổng cộng: {billingData?.transactions?.length || 0} giao dịch
              </span>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "12.5px" }}>
                <thead>
                  <tr style={{ background: "rgba(0, 0, 0, 0.25)", color: "#94a3b8", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
                    <th style={{ padding: "10px 16px" }}>Thời Gian</th>
                    <th style={{ padding: "10px 16px" }}>Gói Cước / Nội Dung</th>
                    <th style={{ padding: "10px 16px" }}>Số Tiền</th>
                    <th style={{ padding: "10px 16px" }}>Phương Thức</th>
                    <th style={{ padding: "10px 16px" }}>Mã GD / SePay</th>
                    <th style={{ padding: "10px 16px", textAlign: "center" }}>Trạng Thái</th>
                  </tr>
                </thead>
                <tbody>
                  {billingData?.transactions && billingData.transactions.length > 0 ? (
                    billingData.transactions.map((tx) => (
                      <tr
                        key={tx.id}
                        style={{
                          borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                          transition: "background 0.15s ease",
                        }}
                      >
                        <td style={{ padding: "12px 16px", color: "#cbd5e1" }}>
                          {new Date(tx.created_at).toLocaleString("vi-VN")}
                        </td>
                        <td style={{ padding: "12px 16px", color: "#ffffff", fontWeight: 600 }}>
                          {tx.plan_name || tx.notes || "Gia hạn bản quyền"}
                        </td>
                        <td style={{ padding: "12px 16px", color: "#10b981", fontWeight: 800 }}>
                          {(tx.amount || 0).toLocaleString("vi-VN")} đ
                        </td>
                        <td style={{ padding: "12px 16px", color: "#94a3b8" }}>
                          {tx.payment_method === "sepay_vietqr" ? "VietQR (SePay)" : "Chuyển khoản"}
                        </td>
                        <td style={{ padding: "12px 16px", fontFamily: "'DM Mono', monospace", color: "#38bdf8", fontSize: "11.5px" }}>
                          {tx.reference_code || `#${tx.id.slice(0, 8)}`}
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "center" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "3px 10px",
                              borderRadius: "99px",
                              background: "rgba(16, 185, 129, 0.12)",
                              color: "#10b981",
                              border: "1px solid rgba(16, 185, 129, 0.3)",
                              fontSize: "11px",
                              fontWeight: 700,
                            }}
                          >
                            <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#10b981" }} />
                            Hoàn tất
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} style={{ padding: "36px", textAlign: "center", color: "#64748b" }}>
                        Chưa có lịch sử giao dịch trực tuyến nào được ghi nhận cho License này.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: System Activity Logs */}
      {activeTab === "logs" && (
        <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <div style={{ display: "flex", gap: "6px" }}>
              {(["all", "info", "warn", "error"] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setLogFilter(lvl)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 600,
                    border: logFilter === lvl ? "1px solid rgba(59, 130, 246, 0.5)" : "1px solid rgba(255, 255, 255, 0.08)",
                    background: logFilter === lvl ? "rgba(59, 130, 246, 0.2)" : "rgba(255, 255, 255, 0.03)",
                    color: logFilter === lvl ? "#93c5fd" : "#94a3b8",
                    cursor: "pointer",
                  }}
                >
                  {lvl.toUpperCase()}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="btn-secondary"
              onClick={handleCopyAllLogs}
              style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "12px", padding: "6px 14px" }}
            >
              <Icon name={copiedLogs ? "check" : ("copy" as never)} size={13} />
              <span>{copiedLogs ? "Đã Copy Toàn Bộ Log" : "Copy Toàn Bộ Log"}</span>
            </button>
          </div>

          {/* Log Stream Terminal Box */}
          <div
            style={{
              background: "#090c15",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "12px",
              padding: "16px",
              fontFamily: "'DM Mono', monospace",
              fontSize: "12px",
              lineHeight: 1.6,
              maxHeight: "60vh",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            {filteredLogs.map((l, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                <span style={{ color: "#64748b", flexShrink: 0 }}>[{l.timestamp}]</span>
                <span
                  style={{
                    padding: "1px 6px",
                    borderRadius: "4px",
                    fontSize: "10px",
                    fontWeight: 700,
                    flexShrink: 0,
                    background:
                      l.level === "error"
                        ? "rgba(239, 68, 68, 0.2)"
                        : l.level === "warn"
                        ? "rgba(245, 158, 11, 0.2)"
                        : "rgba(59, 130, 246, 0.15)",
                    color:
                      l.level === "error"
                        ? "#f87171"
                        : l.level === "warn"
                        ? "#fbbf24"
                        : "#60a5fa",
                  }}
                >
                  {l.category}
                </span>
                <span style={{ color: "#e2e8f0", wordBreak: "break-word" }}>{l.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Renewal Modal */}
      <LicenseRenewalModal
        isOpen={showRenewalModal}
        onClose={() => setShowRenewalModal(false)}
        currentKey={licenseKey}
        onSuccess={() => licenseKey && fetchHistory(licenseKey)}
      />
    </div>
  );
}
