import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Activity,
  ArrowUpDown,
  Check,
  CheckCircle2,
  Clock,
  Coins,
  Copy,
  Cpu,
  Layers,
  RefreshCw,
  Search,
  Sparkles,
  X,
  XCircle,
  AlertTriangle,
  Zap,
} from "lucide-react";
import { getToken } from "../../../core/session";
import { apiRequest } from "../../../core/api";

interface RequestLogRow {
  id: string;
  timestamp: string;
  model: string;
  provider: string;
  key: string;
  status: "Oke" | "Fail";
  status_code: number;
  tokens_in: number;
  tokens_out: number;
  total_tokens: number;
  cost_vnd: number;
  credit_used: number;
  latency_ms: number;
  client_name?: string;
  error_message?: string;
}

interface SummaryData {
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  success_rate_pct: number;
  avg_latency_ms: number;
  smoothness_status: string;
}

interface AiRequestLogsPageProps {
  searchTerm?: string;
  onNotify?: (msg: string, type?: "success" | "error") => void;
}

export const AiRequestLogsPage: React.FC<AiRequestLogsPageProps> = ({
  searchTerm: globalSearch = "",
  onNotify,
}) => {
  const token = getToken() ?? "";
  const [logs, setLogs] = useState<RequestLogRow[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [localSearch, setLocalSearch] = useState("");
  const [selectedModel, setSelectedModel] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchLogs = useCallback(async (quiet = false) => {
    if (!token) return;
    try {
      if (!quiet) setLoading(true);
      const res = await apiRequest<{ summary: SummaryData; logs: RequestLogRow[]; total: number }>(
        "/api/v1/telemetry/global-requests?limit=300",
        {},
        token
      );
      if (res && res.logs) {
        setLogs(res.logs);
        setSummary(res.summary);
      }
    } catch {
      // ignore
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Auto-refresh interval (15s)
  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => {
      fetchLogs(true);
    }, 15000);
    return () => clearInterval(timer);
  }, [autoRefresh, fetchLogs]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    onNotify?.("Đã sao chép vào bộ nhớ tạm", "success");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const formatTimestamp = (raw: string) => {
    if (!raw) return { formatted: "Vừa xong", relative: "" };
    try {
      let d: Date;
      if (/^\d{13}$/.test(raw)) {
        d = new Date(Number(raw));
      } else if (raw.includes(" ") && !raw.includes("T") && !raw.endsWith("Z")) {
        // SQL timestamp format 'YYYY-MM-DD HH:MM:SS' stored in UTC
        d = new Date(raw.replace(" ", "T") + "Z");
      } else {
        d = new Date(raw);
      }

      if (isNaN(d.getTime())) {
        return { formatted: raw, relative: "" };
      }

      // Format in Vietnam Time GMT+7
      const timeStr = d.toLocaleTimeString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });

      const dateStr = d.toLocaleDateString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

      // Relative time calculation
      const now = Date.now();
      const diffSec = Math.floor((now - d.getTime()) / 1000);
      let relative = "";
      if (diffSec < 60) {
        relative = "Vừa xong";
      } else if (diffSec < 3600) {
        relative = `${Math.floor(diffSec / 60)} phút trước`;
      } else if (diffSec < 86400) {
        relative = `${Math.floor(diffSec / 3600)} giờ trước`;
      } else {
        const days = Math.floor(diffSec / 86400);
        relative = days === 1 ? "Hôm qua" : `${days} ngày trước`;
      }

      return {
        formatted: `${timeStr} - ${dateStr}`,
        relative,
      };
    } catch {
      return { formatted: raw, relative: "" };
    }
  };

  // Filtered dataset
  const filteredLogs = useMemo(() => {
    const q = (localSearch || globalSearch).trim().toLowerCase();
    return logs.filter((r) => {
      const matchSearch =
        !q ||
        r.id.toLowerCase().includes(q) ||
        r.model.toLowerCase().includes(q) ||
        r.key.toLowerCase().includes(q) ||
        (r.client_name && r.client_name.toLowerCase().includes(q)) ||
        (r.error_message && r.error_message.toLowerCase().includes(q));

      const matchModel = selectedModel === "all" || r.model.toLowerCase() === selectedModel.toLowerCase();
      const matchStatus = selectedStatus === "all" || r.status.toLowerCase() === selectedStatus.toLowerCase();

      return matchSearch && matchModel && matchStatus;
    });
  }, [logs, localSearch, globalSearch, selectedModel, selectedStatus]);

  // Pagination calculation
  const totalItems = filteredLogs.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + pageSize);

  // Available unique models for filter
  const uniqueModels = useMemo(() => {
    return Array.from(new Set(logs.map((l) => l.model))).sort();
  }, [logs]);

  return (
    <div style={{ padding: "20px 24px", color: "#0f172a", maxWidth: "1680px", margin: "0 auto" }}>
      {/* Top Breadcrumb & Actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ fontSize: "11.5px", color: "#64748b", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
            <span>DỊCH VỤ & MÔ HÌNH AI</span>
            <span>/</span>
            <span style={{ color: "#0f172a", fontWeight: 800 }}>NHẬT KÝ REQUESTS TOÀN CỤC</span>
          </div>
          <h1 style={{ fontSize: "1.65rem", fontWeight: 850, color: "#0f172a", margin: 0, letterSpacing: "-0.4px" }}>
            Nhật Ký Toàn Bộ Request AI & Giám Sát Độ Trễ
          </h1>
          <p style={{ color: "#64748b", fontSize: "13px", margin: "3px 0 0" }}>
            Tổng hợp thời gian thực tất cả lượt gọi API từ Desktop Tool, kiểm tra độ mượt, latency và phát hiện lỗi kết nối.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* Auto Refresh Toggle */}
          <button
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            style={{
              background: autoRefresh ? "#f0fdf4" : "#f8fafc",
              border: autoRefresh ? "1px solid #bbf7d0" : "1px solid #cbd5e1",
              borderRadius: "8px",
              padding: "7px 12px",
              fontSize: "12px",
              fontWeight: 700,
              color: autoRefresh ? "#16a34a" : "#64748b",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span style={{ color: autoRefresh ? "#16a34a" : "#94a3b8" }}>●</span>
            {autoRefresh ? "Tự động làm mới (15s)" : "Đã tạm dừng auto"}
          </button>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => fetchLogs()}
            disabled={loading}
            style={{
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              padding: "7px 14px",
              fontSize: "12.5px",
              fontWeight: 700,
              color: "#334155",
              cursor: loading ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
            }}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            {loading ? "Đang đồng bộ..." : "Làm Mới"}
          </button>
        </div>
      </div>

      {/* 4 KPI Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "14px", marginBottom: "20px" }}>
        {/* Card 1: Total Requests */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "16px 18px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
              Tổng Lượt Request
            </span>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Layers size={16} />
            </div>
          </div>
          <div style={{ fontSize: "24px", fontWeight: 850, color: "#0f172a", marginTop: "6px" }}>
            {summary?.total_requests ? summary.total_requests.toLocaleString() : logs.length} <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 600 }}>lượt</span>
          </div>
          <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "4px" }}>
            Ghi nhận trên toàn hệ thống
          </div>
        </div>

        {/* Card 2: Success Rate */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "16px 18px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
              Tỷ Lệ Thành Công
            </span>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#f0fdf4", color: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div style={{ fontSize: "24px", fontWeight: 850, color: "#16a34a", marginTop: "6px" }}>
            {summary?.success_rate_pct ?? 100}%
          </div>
          <div style={{ fontSize: "11.5px", color: "#16a34a", fontWeight: 700, marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
            <Zap size={12} /> {summary?.smoothness_status || "Hệ thống hoạt động mượt mà"}
          </div>
        </div>

        {/* Card 3: Avg Latency */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "16px 18px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
              Độ Trễ Trung Bình
            </span>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#fffbeb", color: "#d97706", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Clock size={16} />
            </div>
          </div>
          <div style={{ fontSize: "24px", fontWeight: 850, color: "#0f172a", marginTop: "6px" }}>
            {summary?.avg_latency_ms !== undefined ? Math.round(summary.avg_latency_ms).toLocaleString() : (logs.length > 0 ? Math.round(logs.reduce((acc, l) => acc + l.latency_ms, 0) / logs.length).toLocaleString() : 0)} <span style={{ fontSize: "13px", color: "#d97706", fontWeight: 700 }}>ms</span>
          </div>
          <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "4px" }}>
            Thời gian phản hồi AI Gateway
          </div>
        </div>

        {/* Card 4: Failed Requests */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "16px 18px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
              Lỗi Phát Sinh
            </span>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#fef2f2", color: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <XCircle size={16} />
            </div>
          </div>
          <div style={{ fontSize: "24px", fontWeight: 850, color: (summary?.failed_requests ?? 0) > 0 ? "#dc2626" : "#0f172a", marginTop: "6px" }}>
            {summary?.failed_requests ?? 0} <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 600 }}>lỗi</span>
          </div>
          <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "4px" }}>
            Timeout, Rate limit hoặc Invalid Key
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          overflow: "hidden",
        }}
      >
        {/* Table Filter Bar */}
        <div
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            background: "#fafafa",
          }}
        >
          {/* Record Count Badge */}
          <div style={{ fontSize: "13px", fontWeight: 750, color: "#334155" }}>
            Hiển thị <strong>{filteredLogs.length > 0 ? startIndex + 1 : 0}–{Math.min(startIndex + pageSize, totalItems)}</strong> / <strong>{totalItems}</strong> logs
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            {/* Search Box */}
            <div style={{ position: "relative", minWidth: "220px" }}>
              <Search size={13} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
              <input
                type="text"
                placeholder="Tìm Model, Key, Request ID..."
                value={localSearch}
                onChange={(e) => {
                  setLocalSearch(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  width: "100%",
                  padding: "6px 10px 6px 30px",
                  borderRadius: "7px",
                  border: "1px solid #cbd5e1",
                  fontSize: "12.5px",
                  outline: "none",
                  background: "#ffffff",
                }}
              />
              {localSearch && (
                <button
                  type="button"
                  onClick={() => setLocalSearch("")}
                  style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Model Filter */}
            <select
              value={selectedModel}
              onChange={(e) => {
                setSelectedModel(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                padding: "6px 10px",
                borderRadius: "7px",
                border: "1px solid #cbd5e1",
                fontSize: "12.5px",
                fontWeight: 650,
                color: "#334155",
                background: "#ffffff",
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="all">Tất cả Model</option>
              {uniqueModels.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                padding: "6px 10px",
                borderRadius: "7px",
                border: "1px solid #cbd5e1",
                fontSize: "12.5px",
                fontWeight: 650,
                color: "#334155",
                background: "#ffffff",
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="Oke">🟢 Oke (Thành công)</option>
              <option value="Fail">🔴 Fail (Lỗi / Timeout)</option>
            </select>
          </div>
        </div>

        {/* Main Logs Table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: "1200px", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "#ffffff", borderBottom: "1px solid #f1f5f9", color: "#64748b", fontSize: "11px", fontWeight: 750, letterSpacing: "0.3px" }}>
                <th style={{ padding: "12px 18px", width: "180px" }}>THỜI GIAN</th>
                <th style={{ padding: "12px 14px", width: "180px" }}>MODEL</th>
                <th style={{ padding: "12px 14px", width: "190px" }}>KEY</th>
                <th style={{ padding: "12px 12px", width: "110px", textAlign: "center" }}>TRẠNG THÁI</th>
                <th style={{ padding: "12px 14px", width: "130px", textAlign: "right" }}>TOKEN VÀO</th>
                <th style={{ padding: "12px 14px", width: "120px", textAlign: "right" }}>TOKEN RA</th>
                <th style={{ padding: "12px 14px", width: "130px", textAlign: "right" }}>CHI PHÍ</th>
                <th style={{ padding: "12px 18px", width: "150px", textAlign: "right" }}>ĐỘ TRỄ</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: "40px 20px", textAlign: "center", color: "#94a3b8" }}>
                    Không tìm thấy lượt gọi API nào phù hợp.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((row) => {
                  const isFail = row.status === "Fail";
                  const lat = row.latency_ms;
                  
                  // Color grading for latency
                  const latColor = lat < 2500 ? "#16a34a" : lat < 8000 ? "#d97706" : "#dc2626";
                  const latBg = lat < 2500 ? "#f0fdf4" : lat < 8000 ? "#fffbeb" : "#fef2f2";

                  return (
                    <tr
                      key={row.id}
                      style={{
                        borderBottom: "1px solid #f8fafc",
                        transition: "background 0.15s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#fafafa")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      {/* 1. Timestamp */}
                      <td style={{ padding: "12px 18px", color: "#334155", fontSize: "12px", whiteSpace: "nowrap" }}>
                        {(() => {
                          const ts = formatTimestamp(row.timestamp);
                          return (
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: "5px", fontWeight: 700, color: "#1e293b" }}>
                                <Clock size={12} color="#64748b" />
                                <span>{ts.formatted}</span>
                              </div>
                              {ts.relative && (
                                <div style={{ fontSize: "10.5px", color: "#94a3b8", marginTop: "2px", paddingLeft: "17px" }}>
                                  {ts.relative}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      {/* 2. Model */}
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ fontWeight: 750, color: "#0f172a", fontSize: "13px", fontFamily: "monospace" }}>
                          {row.model}
                        </div>
                        <div style={{ fontSize: "11px", color: "#64748b" }}>
                          {row.provider}
                        </div>
                      </td>

                      {/* 3. Key */}
                      <td style={{ padding: "12px 14px" }}>
                        <span
                          onClick={() => handleCopy(row.key)}
                          title={`Click để sao chép: ${row.key}`}
                          style={{
                            fontFamily: "monospace",
                            fontSize: "11.5px",
                            fontWeight: 700,
                            color: "#0369a1",
                            background: "#f0f9ff",
                            border: "1px solid #bae6fd",
                            padding: "3px 7px",
                            borderRadius: "5px",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <span>{row.key}</span>
                          {copiedKey === row.key ? <Check size={11} color="#16a34a" /> : <Copy size={11} color="#38bdf8" />}
                        </span>
                      </td>

                      {/* 4. Status Badge */}
                      <td style={{ padding: "12px 12px", textAlign: "center" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 10px",
                            borderRadius: "6px",
                            fontSize: "11.5px",
                            fontWeight: 800,
                            background: isFail ? "#fee2e2" : "#ecfdf5",
                            color: isFail ? "#dc2626" : "#059669",
                            border: isFail ? "1px solid #fecaca" : "1px solid #a7f3d0",
                            whiteSpace: "nowrap",
                          }}
                          title={row.error_message || (isFail ? "Lỗi gọi API" : "Hoàn thành 200 OK")}
                        >
                          {row.status}
                        </span>
                        {row.error_message && (
                          <div style={{ fontSize: "10.5px", color: "#dc2626", marginTop: "2px", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={row.error_message}>
                            {row.error_message}
                          </div>
                        )}
                      </td>

                      {/* 5. Token In */}
                      <td style={{ padding: "12px 14px", textAlign: "right", color: "#334155", fontWeight: 700, fontSize: "12.5px" }}>
                        {row.tokens_in > 0 ? row.tokens_in.toLocaleString() : "0"}
                      </td>

                      {/* 6. Token Out */}
                      <td style={{ padding: "12px 14px", textAlign: "right", color: "#64748b", fontWeight: 650, fontSize: "12.5px" }}>
                        {row.tokens_out > 0 ? row.tokens_out.toLocaleString() : "0"}
                      </td>

                      {/* 7. Cost / Credit */}
                      <td style={{ padding: "12px 14px", textAlign: "right" }}>
                        <div style={{ fontSize: "12.5px", fontWeight: 800, color: "#0f172a" }}>
                          {row.cost_vnd > 0 ? `${row.cost_vnd.toLocaleString()}đ` : "0đ"}
                        </div>
                        {row.credit_used > 0 && (
                          <div style={{ fontSize: "10.5px", color: "#d97706", fontWeight: 750 }}>
                            {row.credit_used.toFixed(2)} Cr
                          </div>
                        )}
                      </td>

                      {/* 8. Latency */}
                      <td style={{ padding: "12px 18px", textAlign: "right" }}>
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontSize: "12px",
                            fontWeight: 800,
                            color: latColor,
                            background: latBg,
                            padding: "2px 7px",
                            borderRadius: "5px",
                            display: "inline-block",
                            border: `1px solid ${latColor}30`,
                          }}
                        >
                          {lat.toLocaleString()}ms
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination */}
        <div
          style={{
            padding: "12px 20px",
            borderTop: "1px solid #f1f5f9",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
            background: "#fafafa",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", color: "#64748b" }}>Số dòng mỗi trang:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              style={{
                padding: "3px 8px",
                borderRadius: "5px",
                border: "1px solid #cbd5e1",
                fontSize: "12px",
                color: "#334155",
                background: "#ffffff",
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value={10}>10 dòng</option>
              <option value={20}>20 dòng</option>
              <option value={50}>50 dòng</option>
              <option value={100}>100 dòng</option>
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              style={{
                padding: "5px 12px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                background: currentPage <= 1 ? "#f1f5f9" : "#ffffff",
                color: currentPage <= 1 ? "#94a3b8" : "#334155",
                fontSize: "12px",
                fontWeight: 700,
                cursor: currentPage <= 1 ? "not-allowed" : "pointer",
              }}
            >
              Trước
            </button>

            <span style={{ fontSize: "12.5px", fontWeight: 750, color: "#334155" }}>
              Trang {currentPage} / {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              style={{
                padding: "5px 12px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                background: currentPage >= totalPages ? "#f1f5f9" : "#ffffff",
                color: currentPage >= totalPages ? "#94a3b8" : "#334155",
                fontSize: "12px",
                fontWeight: 700,
                cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
              }}
            >
              Sau
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
