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
  Eye,
  Info,
  Layers,
  Laptop,
  RefreshCw,
  Search,
  Server,
  Sparkles,
  Terminal,
  User,
  X,
  XCircle,
  AlertTriangle,
  Zap,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { getToken } from "../../../core/session";
import { apiRequest } from "../../../core/api";

export interface RequestLogRow {
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
  feature_name?: string;
  client_name?: string;
  customer_name?: string;
  hwid?: string;
  license_id?: string;
  error_message?: string;
}

export interface SummaryData {
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  success_rate_pct: number;
  avg_latency_ms: number;
  smoothness_status: string;
}

export interface DeviceData {
  id: string;
  device_name: string;
  customer_name: string;
  customer_contact?: string;
  hwid?: string;
  license_key?: string;
  credit_balance: number;
  status: string;
  expires_at?: string;
  total_requests: number;
  success_requests: number;
  failed_requests: number;
  avg_latency_ms: number;
  tokens_in?: number;
  tokens_out?: number;
  total_tokens: number;
  cost_vnd: number;
  credits_used: number;
  last_active_at?: string;
  last_used_model?: string;
  top_models?: {
    model: string;
    count: number;
    tokens_in?: number;
    tokens_out?: number;
    total_tokens?: number;
    credits_used?: number;
    cost_vnd?: number;
  }[];
  top_features?: {
    feature: string;
    count: number;
    tokens?: number;
    credits?: number;
  }[];
  success_rate_pct: number;
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
  const [devices, setDevices] = useState<DeviceData[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [localSearch, setLocalSearch] = useState("");
  const [selectedModel, setSelectedModel] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedDevice, setSelectedDevice] = useState<string>("all");
  const [selectedDeviceModal, setSelectedDeviceModal] = useState<DeviceData | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedRow, setSelectedRow] = useState<RequestLogRow | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const fetchLogs = useCallback(async (quiet = false) => {
    if (!token) return;
    try {
      if (!quiet) setLoading(true);
      const res = await apiRequest<{
        summary: SummaryData;
        devices?: DeviceData[];
        logs: RequestLogRow[];
        total: number;
      }>("/api/v1/telemetry/global-requests?limit=500", {}, token);
      if (res && res.logs) {
        setLogs(res.logs);
        setSummary(res.summary);
        if (res.devices) {
          setDevices(res.devices);
        }
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

  // Auto-refresh interval (12s)
  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => {
      fetchLogs(true);
    }, 12000);
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

  // Currently active selected device object if filtered
  const activeSelectedDevice = useMemo(() => {
    if (selectedDevice === "all") return null;
    return (
      devices.find(
        (d) =>
          d.device_name === selectedDevice ||
          d.customer_name === selectedDevice ||
          d.id === selectedDevice
      ) || null
    );
  }, [devices, selectedDevice]);

  // Filtered dataset
  const filteredLogs = useMemo(() => {
    const q = (localSearch || globalSearch).trim().toLowerCase();
    return logs.filter((r) => {
      const matchSearch =
        !q ||
        r.id.toLowerCase().includes(q) ||
        r.model.toLowerCase().includes(q) ||
        r.key.toLowerCase().includes(q) ||
        (r.feature_name && r.feature_name.toLowerCase().includes(q)) ||
        (r.client_name && r.client_name.toLowerCase().includes(q)) ||
        (r.customer_name && r.customer_name.toLowerCase().includes(q)) ||
        (r.hwid && r.hwid.toLowerCase().includes(q)) ||
        (r.error_message && r.error_message.toLowerCase().includes(q));

      const matchModel = selectedModel === "all" || r.model.toLowerCase() === selectedModel.toLowerCase();
      const matchStatus = selectedStatus === "all" || r.status.toLowerCase() === selectedStatus.toLowerCase();
      
      const matchDevice =
        selectedDevice === "all" ||
        (r.client_name && r.client_name.toLowerCase() === selectedDevice.toLowerCase()) ||
        (r.customer_name && r.customer_name.toLowerCase() === selectedDevice.toLowerCase()) ||
        (r.license_id && r.license_id === selectedDevice) ||
        (r.hwid && r.hwid === selectedDevice);

      return matchSearch && matchModel && matchStatus && matchDevice;
    });
  }, [logs, localSearch, globalSearch, selectedModel, selectedStatus, selectedDevice]);

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
            Giám sát thời gian thực 100% lượt gọi API, trích xuất cảnh multimodal, tạo kịch bản, độ trễ ms và mã lỗi từ Desktop Tool theo máy người dùng.
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
            {autoRefresh ? "Tự động làm mới (12s)" : "Đã tạm dừng auto"}
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
            Ghi nhận trực tiếp từ database
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
            Thời gian phản hồi AI thực tế
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
            Rate limit, timeout hoặc lỗi kết nối
          </div>
        </div>
      </div>

      {/* Active Device Focused Filter Banner */}
      {activeSelectedDevice && (
        <div
          style={{
            background: "linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)",
            border: "1px solid #86efac",
            borderRadius: "12px",
            padding: "14px 18px",
            marginBottom: "18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "14px",
            boxShadow: "0 2px 6px rgba(22, 163, 74, 0.06)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "10px",
                background: "#16a34a",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 5px rgba(22, 163, 74, 0.25)",
              }}
            >
              <Laptop size={20} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "15px", fontWeight: 850, color: "#0f172a" }}>
                  {activeSelectedDevice.device_name}
                </span>
                <span
                  style={{
                    padding: "2px 7px",
                    borderRadius: "5px",
                    fontSize: "11px",
                    fontWeight: 750,
                    background: "#dcfce7",
                    color: "#15803d",
                    border: "1px solid #86efac",
                  }}
                >
                  ● Đang lọc máy này
                </span>
                {activeSelectedDevice.license_key && (
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontSize: "11px",
                      color: "#475569",
                      background: "#f1f5f9",
                      padding: "2px 6px",
                      borderRadius: "4px",
                    }}
                  >
                    Key: {activeSelectedDevice.license_key}
                  </span>
                )}
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#475569",
                  marginTop: "3px",
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  flexWrap: "wrap",
                }}
              >
                <span>🪙 Số dư: <strong style={{ color: "#d97706" }}>{activeSelectedDevice.credit_balance.toLocaleString()} Credits</strong></span>
                <span>⚡ Tổng Request: <strong>{activeSelectedDevice.total_requests.toLocaleString()}</strong></span>
                <span>🎯 Tỷ lệ thành công: <strong style={{ color: "#16a34a" }}>{activeSelectedDevice.success_rate_pct}%</strong></span>
                <span>⏱️ Độ trễ TB: <strong style={{ color: "#2563eb" }}>{activeSelectedDevice.avg_latency_ms}ms</strong></span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              onClick={() => setSelectedDeviceModal(activeSelectedDevice)}
              style={{
                background: "#16a34a",
                color: "#ffffff",
                border: "none",
                borderRadius: "7px",
                padding: "7px 13px",
                fontSize: "12px",
                fontWeight: 750,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                boxShadow: "0 2px 4px rgba(22, 163, 74, 0.2)",
              }}
            >
              <Eye size={13} /> Xem Chi Tiết Máy
            </button>
            <button
              type="button"
              onClick={() => setSelectedDevice("all")}
              style={{
                background: "#ffffff",
                color: "#64748b",
                border: "1px solid #cbd5e1",
                borderRadius: "7px",
                padding: "7px 11px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Bỏ Lọc Máy
            </button>
          </div>
        </div>
      )}

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
            <div style={{ position: "relative", minWidth: "240px" }}>
              <Search size={13} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
              <input
                type="text"
                placeholder="Tìm Model, Key, Khách, Lỗi..."
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

            {/* Device Filter (Máy người dùng) */}
            <select
              value={selectedDevice}
              onChange={(e) => {
                setSelectedDevice(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                padding: "6px 10px",
                borderRadius: "7px",
                border: selectedDevice !== "all" ? "1.5px solid #16a34a" : "1px solid #cbd5e1",
                fontSize: "12.5px",
                fontWeight: 650,
                color: selectedDevice !== "all" ? "#15803d" : "#334155",
                background: selectedDevice !== "all" ? "#f0fdf4" : "#ffffff",
                outline: "none",
                cursor: "pointer",
                maxWidth: "240px",
              }}
            >
              <option value="all">🖥️ Tất cả máy ({devices.length})</option>
              {devices.map((d) => (
                <option key={d.id || d.device_name} value={d.device_name}>
                  🖥️ {d.device_name} ({d.total_requests} reqs · {d.credit_balance} Cr)
                </option>
              ))}
            </select>

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
                <th style={{ padding: "12px 18px", width: "170px" }}>THỜI GIAN</th>
                <th style={{ padding: "12px 14px", width: "220px" }}>TÁC VỤ & MODEL</th>
                <th style={{ padding: "12px 14px", width: "220px" }}>KHÁCH HÀNG / MÁY</th>
                <th style={{ padding: "12px 12px", width: "120px", textAlign: "center" }}>TRẠNG THÁI</th>
                <th style={{ padding: "12px 14px", width: "120px", textAlign: "right" }}>TOKEN VÀO</th>
                <th style={{ padding: "12px 14px", width: "110px", textAlign: "right" }}>TOKEN RA</th>
                <th style={{ padding: "12px 14px", width: "130px", textAlign: "right" }}>CHI PHÍ</th>
                <th style={{ padding: "12px 18px", width: "140px", textAlign: "right" }}>ĐỘ TRỄ</th>
                <th style={{ padding: "12px 14px", width: "60px", textAlign: "center" }}>CHI TIẾT</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: "40px 20px", textAlign: "center", color: "#94a3b8" }}>
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

                  // HTTP Status label
                  const httpBadge = row.status_code
                    ? (row.status_code === 200 ? "200 OK" : `${row.status_code} Error`)
                    : (isFail ? "500 Error" : "200 OK");

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

                      {/* 2. Task & Model */}
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ fontWeight: 750, color: "#0f172a", fontSize: "13px", fontFamily: "monospace", display: "flex", alignItems: "center", gap: "6px" }}>
                          <span>{row.model}</span>
                        </div>
                        <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
                          <span style={{ fontWeight: 600, color: "#2563eb" }}>{row.feature_name || "Phân tích AI"}</span>
                          <span>•</span>
                          <span>{row.provider}</span>
                        </div>
                      </td>

                      {/* 3. Key & Customer / Machine */}
                      <td style={{ padding: "12px 14px" }}>
                        <div>
                          {/* Machine name badge - Clickable */}
                          <div
                            onClick={() => {
                              const found = devices.find(
                                (d) =>
                                  d.device_name === row.client_name ||
                                  d.customer_name === row.client_name ||
                                  (row.hwid && d.hwid === row.hwid) ||
                                  (row.license_id && d.id === row.license_id)
                              );
                              if (found) {
                                setSelectedDeviceModal(found);
                              } else {
                                setSelectedDeviceModal({
                                  id: row.license_id || "client",
                                  device_name: row.client_name || "Desktop Client",
                                  customer_name: row.client_name || "Desktop Client",
                                  hwid: row.hwid || "",
                                  license_key: row.key,
                                  credit_balance: 0,
                                  status: "active",
                                  total_requests: 1,
                                  success_requests: row.status === "Oke" ? 1 : 0,
                                  failed_requests: row.status === "Fail" ? 1 : 0,
                                  avg_latency_ms: row.latency_ms,
                                  total_tokens: row.total_tokens,
                                  cost_vnd: row.cost_vnd,
                                  credits_used: row.credit_used,
                                  success_rate_pct: row.status === "Oke" ? 100 : 0,
                                  top_models: [{ model: row.model, count: 1 }],
                                  top_features: [{ feature: row.feature_name || "AI Task", count: 1 }],
                                });
                              }
                            }}
                            title={`Click để xem chi tiết thông số & giám sát máy: ${row.client_name || "Desktop Client"}`}
                            style={{
                              fontSize: "12px",
                              fontWeight: 750,
                              color: "#1e40af",
                              marginBottom: "3px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              cursor: "pointer",
                              background: "#eff6ff",
                              border: "1px solid #dbeafe",
                              padding: "2px 7px",
                              borderRadius: "5px",
                              transition: "all 0.15s ease",
                              maxWidth: "200px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "#dbeafe";
                              e.currentTarget.style.borderColor = "#93c5fd";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "#eff6ff";
                              e.currentTarget.style.borderColor = "#dbeafe";
                            }}
                          >
                            <Laptop size={12} color="#2563eb" />
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                              {row.client_name || "Desktop Client"}
                            </span>
                          </div>

                          <div>
                            <span
                              onClick={() => handleCopy(row.key)}
                              title={`Click để sao chép Key: ${row.key}`}
                              style={{
                                fontFamily: "monospace",
                                fontSize: "11px",
                                fontWeight: 650,
                                color: "#0369a1",
                                background: "#f0f9ff",
                                border: "1px solid #bae6fd",
                                padding: "1px 5px",
                                borderRadius: "4px",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "3px",
                                whiteSpace: "nowrap",
                              }}
                            >
                              <span>{row.key}</span>
                              {copiedKey === row.key ? <Check size={10} color="#16a34a" /> : <Copy size={10} color="#38bdf8" />}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 4. Status Badge */}
                      <td style={{ padding: "12px 12px", textAlign: "center" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 8px",
                            borderRadius: "6px",
                            fontSize: "11px",
                            fontWeight: 800,
                            background: isFail ? "#fee2e2" : "#ecfdf5",
                            color: isFail ? "#dc2626" : "#059669",
                            border: isFail ? "1px solid #fecaca" : "1px solid #a7f3d0",
                            whiteSpace: "nowrap",
                          }}
                          title={row.error_message || (isFail ? "Lỗi gọi API" : "Hoàn thành 200 OK")}
                        >
                          {httpBadge}
                        </span>
                        {row.error_message && (
                          <div
                            onClick={() => setSelectedRow(row)}
                            style={{
                              fontSize: "10px",
                              color: "#dc2626",
                              marginTop: "2px",
                              maxWidth: "140px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              cursor: "pointer",
                              textDecoration: "underline",
                            }}
                            title={`Click để xem lỗi chi tiết: ${row.error_message}`}
                          >
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

                      {/* 9. View Details Action */}
                      <td style={{ padding: "12px 14px", textAlign: "center" }}>
                        <button
                          type="button"
                          onClick={() => setSelectedRow(row)}
                          title="Xem chi tiết snapshot request"
                          style={{
                            background: "#f1f5f9",
                            border: "1px solid #cbd5e1",
                            borderRadius: "6px",
                            padding: "4px 8px",
                            color: "#475569",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Eye size={13} />
                        </button>
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
              <option value={15}>15 dòng</option>
              <option value={30}>30 dòng</option>
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

      {/* Machine Details Inspector Modal */}
      {selectedDeviceModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setSelectedDeviceModal(null)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              maxWidth: "760px",
              width: "100%",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              overflow: "hidden",
              animation: "fadeIn 0.2s ease-out",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "18px 24px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#f8fafc",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "10px",
                    background: "#2563eb",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 2px 4px rgba(37, 99, 235, 0.25)",
                  }}
                >
                  <Laptop size={20} />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 850, color: "#0f172a" }}>
                      {selectedDeviceModal.device_name}
                    </h3>
                    <span
                      style={{
                        padding: "2px 7px",
                        borderRadius: "5px",
                        fontSize: "11px",
                        fontWeight: 750,
                        background: selectedDeviceModal.status === "active" ? "#dcfce7" : "#f1f5f9",
                        color: selectedDeviceModal.status === "active" ? "#15803d" : "#64748b",
                        border: `1px solid ${selectedDeviceModal.status === "active" ? "#86efac" : "#cbd5e1"}`,
                      }}
                    >
                      {selectedDeviceModal.status === "active" ? "● Hoạt Động" : "Tạm Dừng"}
                    </span>
                  </div>
                  <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "2px", display: "flex", gap: "10px" }}>
                    {selectedDeviceModal.license_key && <span>Key: <strong>{selectedDeviceModal.license_key}</strong></span>}
                    {selectedDeviceModal.hwid && <span>HWID: <strong>{selectedDeviceModal.hwid}</strong></span>}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDeviceModal(null)}
                style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: "4px" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "22px 24px", maxHeight: "78vh", overflowY: "auto" }}>
              {/* 4 Machine Telemetry KPI Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "20px" }}>
                {/* 1. Requests */}
                <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>TỔNG REQUESTS</div>
                  <div style={{ fontSize: "18px", fontWeight: 850, color: "#0f172a", marginTop: "4px" }}>
                    {selectedDeviceModal.total_requests.toLocaleString()}
                  </div>
                  <div style={{ fontSize: "11px", color: "#16a34a", fontWeight: 700, marginTop: "2px" }}>
                    {selectedDeviceModal.success_rate_pct}% thành công ({selectedDeviceModal.success_requests} Oke / {selectedDeviceModal.failed_requests} Fail)
                  </div>
                </div>

                {/* 2. Latency */}
                <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>ĐỘ TRỄ TRUNG BÌNH</div>
                  <div style={{ fontSize: "18px", fontWeight: 850, color: "#2563eb", marginTop: "4px" }}>
                    {selectedDeviceModal.avg_latency_ms.toLocaleString()} <span style={{ fontSize: "12px" }}>ms</span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                    {selectedDeviceModal.last_used_model ? `Model gần nhất: ${selectedDeviceModal.last_used_model}` : "Phản hồi AI"}
                  </div>
                </div>

                {/* 3. Credits Balance */}
                <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>SỐ DƯ CREDITS</div>
                  <div style={{ fontSize: "18px", fontWeight: 850, color: "#d97706", marginTop: "4px" }}>
                    {selectedDeviceModal.credit_balance.toLocaleString()} <span style={{ fontSize: "12px" }}>Cr</span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                    Đã dùng: <strong style={{ color: "#0f172a" }}>{selectedDeviceModal.credits_used.toFixed(2)}</strong> Cr · Quỹ: <strong>{((selectedDeviceModal.credit_balance || 0) + (selectedDeviceModal.credits_used || 0)).toFixed(1)}</strong> Cr
                  </div>
                </div>

                {/* 4. Total Tokens & Cost */}
                <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>TIÊU HAO TOKENS</div>
                  <div style={{ fontSize: "18px", fontWeight: 850, color: "#0f172a", marginTop: "4px" }}>
                    {selectedDeviceModal.total_tokens.toLocaleString()} <span style={{ fontSize: "12px", color: "#64748b" }}>tokens</span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                    Vào: <strong style={{ color: "#2563eb" }}>{(selectedDeviceModal.tokens_in || 0).toLocaleString()}</strong> · Ra: <strong style={{ color: "#16a34a" }}>{(selectedDeviceModal.tokens_out || 0).toLocaleString()}</strong> ({selectedDeviceModal.cost_vnd.toLocaleString()}đ)
                  </div>
                </div>
              </div>

              {/* Models & Features Breakdown */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "20px" }}>
                {/* Top Models */}
                <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px" }}>
                  <div style={{ fontSize: "12px", fontWeight: 800, color: "#0f172a", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Cpu size={14} color="#2563eb" /> Mô Hình AI Máy Này Đang Dùng & Tiêu Hao Token
                  </div>
                  {(!selectedDeviceModal.top_models || selectedDeviceModal.top_models.length === 0) ? (
                    <div style={{ fontSize: "12px", color: "#94a3b8" }}>Chưa có dữ liệu gọi model</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {selectedDeviceModal.top_models.slice(0, 5).map((m) => {
                        const pct = Math.round((m.count / Math.max(1, selectedDeviceModal.total_requests)) * 100);
                        return (
                          <div key={m.model}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11.5px", fontWeight: 650, color: "#334155", marginBottom: "2px" }}>
                              <span style={{ fontFamily: "monospace", fontWeight: 750, color: "#0f172a" }}>{m.model}</span>
                              <span><strong>{m.count}</strong> lượt ({pct}%)</span>
                            </div>
                            {(m.tokens_in !== undefined || m.tokens_out !== undefined || m.credits_used !== undefined) && (
                              <div style={{ fontSize: "10.5px", color: "#64748b", marginBottom: "4px", display: "flex", gap: "8px" }}>
                                <span>Vào: <strong style={{ color: "#2563eb" }}>{(m.tokens_in || 0).toLocaleString()}</strong></span>
                                <span>•</span>
                                <span>Ra: <strong style={{ color: "#16a34a" }}>{(m.tokens_out || 0).toLocaleString()}</strong></span>
                                {m.credits_used !== undefined && m.credits_used > 0 && (
                                  <>
                                    <span>•</span>
                                    <span>Trừ: <strong style={{ color: "#d97706" }}>{m.credits_used.toFixed(2)} Cr</strong></span>
                                  </>
                                )}
                              </div>
                            )}
                            <div style={{ width: "100%", height: "5px", background: "#f1f5f9", borderRadius: "3px", overflow: "hidden" }}>
                              <div style={{ width: `${pct}%`, height: "100%", background: "#2563eb", borderRadius: "3px" }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Top Features */}
                <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px" }}>
                  <div style={{ fontSize: "12px", fontWeight: 800, color: "#0f172a", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Sparkles size={14} color="#16a34a" /> Tác Vụ Video Thực Hiện Nhiều Nhất
                  </div>
                  {(!selectedDeviceModal.top_features || selectedDeviceModal.top_features.length === 0) ? (
                    <div style={{ fontSize: "12px", color: "#94a3b8" }}>Chưa có dữ liệu tác vụ</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {selectedDeviceModal.top_features.slice(0, 5).map((f) => {
                        const pct = Math.round((f.count / Math.max(1, selectedDeviceModal.total_requests)) * 100);
                        return (
                          <div key={f.feature}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11.5px", fontWeight: 650, color: "#334155", marginBottom: "2px" }}>
                              <span>{f.feature}</span>
                              <span><strong>{f.count}</strong> lần ({pct}%)</span>
                            </div>
                            <div style={{ width: "100%", height: "5px", background: "#f1f5f9", borderRadius: "3px", overflow: "hidden" }}>
                              <div style={{ width: `${pct}%`, height: "100%", background: "#16a34a", borderRadius: "3px" }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Requests from this machine */}
              <div>
                <div style={{ fontSize: "12.5px", fontWeight: 800, color: "#0f172a", marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>📋 Lịch Sử 5 Request AI Gần Nhất Của Máy Này</span>
                  <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>Thời gian thực</span>
                </div>
                <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
                  {(() => {
                    const devLogs = logs.filter(
                      (l) =>
                        l.client_name === selectedDeviceModal.device_name ||
                        l.customer_name === selectedDeviceModal.customer_name ||
                        (selectedDeviceModal.hwid && l.hwid === selectedDeviceModal.hwid)
                    ).slice(0, 5);

                    if (devLogs.length === 0) {
                      return (
                        <div style={{ padding: "18px", textAlign: "center", color: "#94a3b8", fontSize: "12px" }}>
                          Không có lượt gọi AI trực tiếp nào được ghi nhận gần đây.
                        </div>
                      );
                    }

                    return (
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                        <thead>
                          <tr style={{ background: "#f8fafc", color: "#64748b", fontSize: "10.5px", fontWeight: 750 }}>
                            <th style={{ padding: "8px 12px", textAlign: "left" }}>THỜI GIAN</th>
                            <th style={{ padding: "8px 10px", textAlign: "left" }}>MODEL</th>
                            <th style={{ padding: "8px 10px", textAlign: "center" }}>TRẠNG THÁI</th>
                            <th style={{ padding: "8px 10px", textAlign: "right" }}>TOKENS</th>
                            <th style={{ padding: "8px 12px", textAlign: "right" }}>ĐỘ TRỄ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {devLogs.map((l) => (
                            <tr key={l.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                              <td style={{ padding: "8px 12px", color: "#334155" }}>
                                {formatTimestamp(l.timestamp).formatted}
                              </td>
                              <td style={{ padding: "8px 10px", fontFamily: "monospace", fontWeight: 700, color: "#0f172a" }}>
                                {l.model}
                              </td>
                              <td style={{ padding: "8px 10px", textAlign: "center" }}>
                                <span
                                  style={{
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    fontSize: "10.5px",
                                    fontWeight: 750,
                                    background: l.status === "Oke" ? "#ecfdf5" : "#fee2e2",
                                    color: l.status === "Oke" ? "#059669" : "#dc2626",
                                  }}
                                >
                                  {l.status === "Oke" ? "200 OK" : "Error"}
                                </span>
                              </td>
                              <td style={{ padding: "8px 10px", textAlign: "right", color: "#475569" }}>
                                {l.total_tokens.toLocaleString()}
                              </td>
                              <td style={{ padding: "8px 12px", textAlign: "right", fontFamily: "monospace", fontWeight: 750, color: l.latency_ms < 2500 ? "#16a34a" : "#d97706" }}>
                                {l.latency_ms}ms
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "14px 24px",
                borderTop: "1px solid #e2e8f0",
                background: "#f8fafc",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setSelectedDevice(selectedDeviceModal.device_name);
                  setSelectedDeviceModal(null);
                  setCurrentPage(1);
                  onNotify?.(`Đã lọc bảng nhật ký theo máy: ${selectedDeviceModal.device_name}`, "success");
                }}
                style={{
                  background: "#eff6ff",
                  color: "#2563eb",
                  border: "1px solid #bfdbfe",
                  borderRadius: "7px",
                  padding: "7px 14px",
                  fontSize: "12.5px",
                  fontWeight: 750,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Search size={13} /> Lọc Toàn Bộ Nhật Ký Theo Máy Này
              </button>

              <button
                type="button"
                onClick={() => setSelectedDeviceModal(null)}
                style={{
                  background: "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "7px",
                  padding: "7px 18px",
                  fontSize: "12.5px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request Details Modal */}
      {selectedRow && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.55)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setSelectedRow(null)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "14px",
              maxWidth: "620px",
              width: "100%",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              overflow: "hidden",
              animation: "fadeIn 0.2s ease-out",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#f8fafc",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Activity size={18} color="#2563eb" />
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#0f172a" }}>
                  Chi Tiết Request AI #{selectedRow.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRow(null)}
                style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: "4px" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: "20px", maxHeight: "75vh", overflowY: "auto" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 700 }}>MÔ HÌNH (MODEL)</div>
                  <div style={{ fontSize: "13.5px", fontWeight: 800, color: "#0f172a", marginTop: "2px", fontFamily: "monospace" }}>
                    {selectedRow.model}
                  </div>
                  <div style={{ fontSize: "11px", color: "#2563eb", marginTop: "2px" }}>{selectedRow.provider}</div>
                </div>

                <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 700 }}>TÁC VỤ THỰC HIỆN</div>
                  <div style={{ fontSize: "13.5px", fontWeight: 800, color: "#0f172a", marginTop: "2px" }}>
                    {selectedRow.feature_name || "Phân tích AI"}
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>{selectedRow.client_name || "Desktop Client"}</div>
                </div>

                <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 700 }}>ĐỘ TRỄ & TRẠNG THÁI</div>
                  <div style={{ fontSize: "13.5px", fontWeight: 800, color: selectedRow.latency_ms < 3000 ? "#16a34a" : "#dc2626", marginTop: "2px" }}>
                    {selectedRow.latency_ms} ms · {selectedRow.status_code || (selectedRow.status === "Oke" ? 200 : 500)} {selectedRow.status}
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>{formatTimestamp(selectedRow.timestamp).formatted}</div>
                </div>

                <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 700 }}>TOKENS & CHI PHÍ</div>
                  <div style={{ fontSize: "13.5px", fontWeight: 800, color: "#0f172a", marginTop: "2px" }}>
                    {selectedRow.total_tokens.toLocaleString()} tokens ({selectedRow.cost_vnd.toLocaleString()}đ)
                  </div>
                  <div style={{ fontSize: "11px", color: "#d97706", marginTop: "2px" }}>Đã trừ: {selectedRow.credit_used} Credits</div>
                </div>
              </div>

              {/* Error Box if Fail */}
              {selectedRow.error_message && (
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "12px", marginBottom: "16px" }}>
                  <div style={{ fontSize: "11.5px", fontWeight: 800, color: "#dc2626", display: "flex", alignItems: "center", gap: "5px", marginBottom: "4px" }}>
                    <AlertTriangle size={14} /> CHI TIẾT LỖI GỌI API:
                  </div>
                  <div style={{ fontSize: "12px", color: "#991b1b", fontFamily: "monospace", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {selectedRow.error_message}
                  </div>
                </div>
              )}

              {/* Raw JSON viewer */}
              <div style={{ background: "#0f172a", borderRadius: "8px", padding: "12px", color: "#e2e8f0", fontFamily: "monospace", fontSize: "11.5px", position: "relative" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", borderBottom: "1px solid #334155", paddingBottom: "6px" }}>
                  <span style={{ color: "#94a3b8", fontWeight: 700 }}>PAYLOAD SNAPSHOT</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(JSON.stringify(selectedRow, null, 2))}
                    style={{ background: "#1e293b", border: "1px solid #475569", borderRadius: "4px", color: "#94a3b8", fontSize: "11px", padding: "2px 6px", cursor: "pointer" }}
                  >
                    Sao chép JSON
                  </button>
                </div>
                <pre style={{ margin: 0, overflowX: "auto" }}>
                  {JSON.stringify(selectedRow, null, 2)}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: "12px 20px", borderTop: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setSelectedRow(null)}
                style={{
                  background: "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "7px",
                  padding: "6px 16px",
                  fontSize: "12.5px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
