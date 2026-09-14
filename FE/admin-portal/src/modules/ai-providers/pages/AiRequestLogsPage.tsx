import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Activity,
  Check,
  CheckCircle2,
  Clock,
  Coins,
  Copy,
  Cpu,
  Eye,
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
  ChevronRight,
  ChevronLeft,
  Home,
  Sliders,
  Filter,
} from "lucide-react";
import { getToken } from "../../../core/session";
import { apiRequest } from "../../../core/api";
import { showToast } from "../../../core/swal";

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

  const onNotifyRef = useRef(onNotify);
  useEffect(() => {
    onNotifyRef.current = onNotify;
  }, [onNotify]);

  const notify = useCallback((msg: string, type: "success" | "error" = "success") => {
    showToast(msg, type);
    if (onNotifyRef.current) onNotifyRef.current(msg, type);
  }, []);

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
      // ignore network hiccups silently during auto-refresh
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
    notify("Đã sao chép vào bộ nhớ tạm", "success");
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
    <div className="w-full max-w-full space-y-6">
      {/* 1. Spacious Single-Tier Header with Breadcrumb & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          {/* Breadcrumb Navigation Trail */}
          <nav className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-2.5">
            <span className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 transition-colors">
              <Home size={12} className="text-slate-400" />
              <span>JACS Studio</span>
            </span>
            <ChevronRight size={12} className="text-slate-300" />
            <span className="text-slate-500">Dịch Vụ AI</span>
            <ChevronRight size={12} className="text-slate-300" />
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
              Nhật Ký Requests Toàn Cục
            </span>
          </nav>

          {/* Title and Status */}
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-600 to-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 shrink-0">
              <Activity size={22} className="stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight m-0">
                  Nhật Ký Toàn Bộ Request AI & Giám Sát Độ Trễ
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Thời gian thực (Real-time DB)</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Giám sát 100% lượt gọi API, trích xuất cảnh multimodal, tạo kịch bản, độ trễ ms và mã lỗi từ Desktop Tool theo máy khách hàng.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0 self-start md:self-center flex-wrap sm:flex-nowrap">
          {/* Auto Refresh Toggle */}
          <button
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold rounded-xl border transition-all duration-150 active:scale-95 ${
              autoRefresh
                ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                : "bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${autoRefresh ? "bg-emerald-500" : "bg-slate-400"}`} />
            <span>{autoRefresh ? "Tự động làm mới (12s)" : "Tạm dừng auto"}</span>
          </button>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => fetchLogs()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-400 border border-slate-300/90 rounded-xl shadow-xs transition-all duration-150 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-emerald-600" : "text-slate-500"} />
            <span>{loading ? "Đang đồng bộ..." : "Làm mới"}</span>
          </button>
        </div>
      </div>

      {/* 2. 4 Glassmorphic KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Requests */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-blue-300 transition-all duration-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Tổng Lượt Request
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Layers size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {summary?.total_requests ? summary.total_requests.toLocaleString() : logs.length.toLocaleString()}{" "}
            <span className="text-xs font-semibold text-slate-400">lượt</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Ghi nhận trực tiếp từ database</div>
        </div>

        {/* Card 2: Success Rate */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-all duration-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Tỷ Lệ Thành Công
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600">
            {summary?.success_rate_pct ?? 100}%
          </div>
          <div className="text-[11px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
            <Zap size={12} className="text-emerald-500" />
            <span>{summary?.smoothness_status || "Hệ thống hoạt động mượt mà"}</span>
          </div>
        </div>

        {/* Card 3: Avg Latency */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-amber-300 transition-all duration-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Độ Trễ Trung Bình
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {summary?.avg_latency_ms !== undefined
              ? Math.round(summary.avg_latency_ms).toLocaleString()
              : logs.length > 0
              ? Math.round(logs.reduce((acc, l) => acc + l.latency_ms, 0) / logs.length).toLocaleString()
              : 0}{" "}
            <span className="text-xs font-bold text-amber-600">ms</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Thời gian phản hồi AI thực tế</div>
        </div>

        {/* Card 4: Failed Requests */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-rose-300 transition-all duration-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Lỗi Phát Sinh
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <XCircle size={16} />
            </div>
          </div>
          <div className={`text-2xl font-black ${(summary?.failed_requests ?? 0) > 0 ? "text-rose-600" : "text-slate-900"}`}>
            {summary?.failed_requests ?? 0}{" "}
            <span className="text-xs font-semibold text-slate-400">lỗi</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Rate limit, timeout hoặc mạng</div>
        </div>
      </div>

      {/* Active Focused Device Filter Banner */}
      {activeSelectedDevice && (
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-white border border-emerald-300 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <Laptop size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-black text-slate-900">{activeSelectedDevice.device_name}</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  ● Đang lọc máy này
                </span>
                {activeSelectedDevice.license_key && (
                  <span className="font-mono text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                    Key: {activeSelectedDevice.license_key}
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-600 mt-1 flex items-center gap-3 flex-wrap">
                <span>🪙 Số dư: <strong className="text-amber-600">{activeSelectedDevice.credit_balance.toLocaleString()} Credits</strong></span>
                <span>⚡ Tổng Request: <strong>{activeSelectedDevice.total_requests.toLocaleString()}</strong></span>
                <span>🎯 Thành công: <strong className="text-emerald-600">{activeSelectedDevice.success_rate_pct}%</strong></span>
                <span>⏱️ Độ trễ TB: <strong className="text-blue-600">{activeSelectedDevice.avg_latency_ms}ms</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedDeviceModal(activeSelectedDevice)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all active:scale-95"
            >
              <Eye size={13} />
              <span>Xem chi tiết máy</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedDevice("all")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-all active:scale-95"
            >
              <span>Bỏ lọc máy</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Main Data Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Filter Toolbar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs font-bold text-slate-700">
            Hiển thị{" "}
            <span className="text-slate-900">
              {filteredLogs.length > 0 ? startIndex + 1 : 0}–{Math.min(startIndex + pageSize, totalItems)}
            </span>{" "}
            / <span className="text-slate-900">{totalItems}</span> logs
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Search Input */}
            <div className="relative min-w-[240px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm Model, Key, Khách, Lỗi..."
                value={localSearch}
                onChange={(e) => {
                  setLocalSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-8 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
              />
              {localSearch && (
                <button
                  type="button"
                  onClick={() => setLocalSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Device Filter */}
            <select
              value={selectedDevice}
              onChange={(e) => {
                setSelectedDevice(e.target.value);
                setCurrentPage(1);
              }}
              className={`py-1.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                selectedDevice !== "all"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-400"
                  : "bg-white text-slate-700 border-slate-300"
              }`}
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
              className="py-1.5 px-3 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-300 cursor-pointer"
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
              className="py-1.5 px-3 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-300 cursor-pointer"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="Oke">🟢 Oke (200 OK)</option>
              <option value="Fail">🔴 Fail (Lỗi / Timeout)</option>
            </select>
          </div>
        </div>

        {/* High-End Single-Line Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 w-[160px]">THỜI GIAN</th>
                <th className="py-3 px-3 w-[220px]">MÔ HÌNH AI & TÁC VỤ</th>
                <th className="py-3 px-3 w-[230px]">MÁY / KEY CLIENT</th>
                <th className="py-3 px-3 w-[120px] text-center">TRẠNG THÁI</th>
                <th className="py-3 px-3 w-[100px] text-right">TOKENS VÀO</th>
                <th className="py-3 px-3 w-[100px] text-right">TOKENS RA</th>
                <th className="py-3 px-3 w-[130px] text-right">CHI PHÍ & CREDIT</th>
                <th className="py-3 px-3 w-[120px] text-right">ĐỘ TRỄ</th>
                <th className="py-3 px-4 w-[70px] text-center">CHI TIẾT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Không tìm thấy lượt gọi API nào phù hợp.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((row) => {
                  const isFail = row.status === "Fail";
                  const lat = row.latency_ms;
                  const latColor =
                    lat < 2500
                      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                      : lat < 8000
                      ? "text-amber-700 bg-amber-50 border-amber-200"
                      : "text-rose-700 bg-rose-50 border-rose-200";

                  const httpBadge = row.status_code
                    ? row.status_code === 200
                      ? "200 OK"
                      : `${row.status_code} Error`
                    : isFail
                    ? "500 Error"
                    : "200 OK";

                  const ts = formatTimestamp(row.timestamp);

                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-slate-50/80 transition-colors duration-100 whitespace-nowrap"
                    >
                      {/* 1. Timestamp */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800">
                          <Clock size={12} className="text-slate-400 shrink-0" />
                          <span>{ts.formatted}</span>
                        </div>
                        {ts.relative && (
                          <div className="text-[10.5px] text-slate-400 pl-4.5">{ts.relative}</div>
                        )}
                      </td>

                      {/* 2. Model & Task */}
                      <td className="py-3 px-3">
                        <div className="font-mono font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          <span>{row.model}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                          <span className="font-semibold text-blue-600">{row.feature_name || "Phân tích AI"}</span>
                          <span>•</span>
                          <span>{row.provider}</span>
                        </div>
                      </td>

                      {/* 3. Machine / Key */}
                      <td className="py-3 px-3">
                        <div>
                          <button
                            type="button"
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
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-[11px] max-w-[180px] truncate transition-colors cursor-pointer"
                            title={`Xem chi tiết máy: ${row.client_name || "Desktop Client"}`}
                          >
                            <Laptop size={11} className="shrink-0 text-blue-600" />
                            <span className="truncate">{row.client_name || "Desktop Client"}</span>
                          </button>
                        </div>
                        <div className="mt-0.5">
                          <button
                            type="button"
                            onClick={() => handleCopy(row.key)}
                            className="inline-flex items-center gap-1 font-mono text-[10.5px] font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 px-1.5 py-0.5 rounded border border-sky-200 transition-colors"
                            title="Click để copy key"
                          >
                            <span>{row.key}</span>
                            {copiedKey === row.key ? (
                              <Check size={10} className="text-emerald-600" />
                            ) : (
                              <Copy size={10} className="text-sky-400" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* 4. Status Badge */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${
                            isFail
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}
                        >
                          {httpBadge}
                        </span>
                        {row.error_message && (
                          <div
                            onClick={() => setSelectedRow(row)}
                            className="text-[10px] text-rose-600 underline truncate max-w-[120px] mx-auto mt-0.5 cursor-pointer"
                            title={row.error_message}
                          >
                            {row.error_message}
                          </div>
                        )}
                      </td>

                      {/* 5. Tokens In */}
                      <td className="py-3 px-3 text-right font-bold text-slate-700">
                        {row.tokens_in > 0 ? row.tokens_in.toLocaleString() : "0"}
                      </td>

                      {/* 6. Tokens Out */}
                      <td className="py-3 px-3 text-right font-semibold text-slate-500">
                        {row.tokens_out > 0 ? row.tokens_out.toLocaleString() : "0"}
                      </td>

                      {/* 7. Cost & Credit */}
                      <td className="py-3 px-3 text-right">
                        <div className="font-bold text-slate-900">
                          {row.cost_vnd > 0 ? `${row.cost_vnd.toLocaleString()}đ` : "0đ"}
                        </div>
                        {row.credit_used > 0 && (
                          <div className="text-[10.5px] font-bold text-amber-600">
                            {row.credit_used.toFixed(2)} Cr
                          </div>
                        )}
                      </td>

                      {/* 8. Latency */}
                      <td className="py-3 px-3 text-right">
                        <span className={`inline-block font-mono text-[11.5px] font-bold px-2 py-0.5 rounded-md border ${latColor}`}>
                          {lat.toLocaleString()}ms
                        </span>
                      </td>

                      {/* 9. View Details Action */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedRow(row)}
                          className="inline-flex items-center justify-center p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-300 transition-colors"
                          title="Xem chi tiết snapshot"
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

        {/* Table Pagination Footer */}
        <div className="p-3.5 border-t border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span>Số dòng mỗi trang:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="py-1 px-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 bg-white"
            >
              <option value={15}>15 dòng</option>
              <option value={30}>30 dòng</option>
              <option value={50}>50 dòng</option>
              <option value={100}>100 dòng</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={13} />
              <span>Trước</span>
            </button>

            <span className="text-xs font-bold text-slate-800 px-2">
              Trang {currentPage} / {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>Sau</span>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Modal: Device Telemetry Inspector */}
      {selectedDeviceModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onClick={() => setSelectedDeviceModal(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md">
                  <Laptop size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900 m-0">{selectedDeviceModal.device_name}</h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                        selectedDeviceModal.status === "active"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                          : "bg-slate-100 text-slate-700 border-slate-300"
                      }`}
                    >
                      {selectedDeviceModal.status === "active" ? "● Hoạt động" : "Tạm dừng"}
                    </span>
                  </div>
                  <div className="text-[11.5px] text-slate-500 mt-0.5 flex gap-3">
                    {selectedDeviceModal.license_key && <span>Key: <strong>{selectedDeviceModal.license_key}</strong></span>}
                    {selectedDeviceModal.hwid && <span>HWID: <strong>{selectedDeviceModal.hwid}</strong></span>}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDeviceModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 max-h-[75vh] overflow-y-auto space-y-5">
              {/* 4 Mini Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <div className="text-[10.5px] font-bold text-slate-500 uppercase">TỔNG REQUESTS</div>
                  <div className="text-lg font-black text-slate-900 mt-1">{selectedDeviceModal.total_requests.toLocaleString()}</div>
                  <div className="text-[11px] font-bold text-emerald-600 mt-0.5">{selectedDeviceModal.success_rate_pct}% thành công</div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <div className="text-[10.5px] font-bold text-slate-500 uppercase">ĐỘ TRỄ TB</div>
                  <div className="text-lg font-black text-blue-600 mt-1">{selectedDeviceModal.avg_latency_ms} <span className="text-xs">ms</span></div>
                  <div className="text-[11px] text-slate-500 mt-0.5 truncate">{selectedDeviceModal.last_used_model || "Phản hồi AI"}</div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <div className="text-[10.5px] font-bold text-slate-500 uppercase">SỐ DƯ CREDITS</div>
                  <div className="text-lg font-black text-amber-600 mt-1">{selectedDeviceModal.credit_balance.toLocaleString()} <span className="text-xs">Cr</span></div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Dùng: {selectedDeviceModal.credits_used.toFixed(1)} Cr</div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <div className="text-[10.5px] font-bold text-slate-500 uppercase">TIÊU HAO TOKENS</div>
                  <div className="text-lg font-black text-slate-900 mt-1">{selectedDeviceModal.total_tokens.toLocaleString()}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{selectedDeviceModal.cost_vnd.toLocaleString()}đ</div>
                </div>
              </div>

              {/* Models Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-4">
                  <div className="text-xs font-black text-slate-900 mb-3 flex items-center gap-1.5">
                    <Cpu size={14} className="text-blue-600" />
                    <span>Mô Hình AI Tiêu Thụ Nhiều Nhất</span>
                  </div>
                  {!selectedDeviceModal.top_models || selectedDeviceModal.top_models.length === 0 ? (
                    <div className="text-xs text-slate-400 py-3 text-center">Chưa có dữ liệu gọi model</div>
                  ) : (
                    <div className="space-y-2.5">
                      {selectedDeviceModal.top_models.slice(0, 4).map((m) => {
                        const pct = Math.round((m.count / Math.max(1, selectedDeviceModal.total_requests)) * 100);
                        return (
                          <div key={m.model}>
                            <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                              <span className="font-mono text-slate-900 font-bold">{m.model}</span>
                              <span>{m.count} ({pct}%)</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-600 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-4">
                  <div className="text-xs font-black text-slate-900 mb-3 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-emerald-600" />
                    <span>Tác Vụ Video Thực Hiện Nhiều Nhất</span>
                  </div>
                  {!selectedDeviceModal.top_features || selectedDeviceModal.top_features.length === 0 ? (
                    <div className="text-xs text-slate-400 py-3 text-center">Chưa có dữ liệu tác vụ</div>
                  ) : (
                    <div className="space-y-2.5">
                      {selectedDeviceModal.top_features.slice(0, 4).map((f) => {
                        const pct = Math.round((f.count / Math.max(1, selectedDeviceModal.total_requests)) * 100);
                        return (
                          <div key={f.feature}>
                            <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                              <span className="truncate max-w-[180px]">{f.feature}</span>
                              <span>{f.count} ({pct}%)</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setSelectedDevice(selectedDeviceModal.device_name);
                  setSelectedDeviceModal(null);
                  setCurrentPage(1);
                  notify(`Đã lọc nhật ký theo máy: ${selectedDeviceModal.device_name}`, "success");
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
              >
                <Search size={13} />
                <span>Lọc Toàn Bộ Nhật Ký Theo Máy Này</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedDeviceModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Modal: Request Payload Snapshot */}
      {selectedRow && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onClick={() => setSelectedRow(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 px-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-600">
                <Activity size={18} />
                <h3 className="text-sm font-black text-slate-900 m-0">
                  Chi Tiết Request AI #{selectedRow.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRow(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 max-h-[70vh] overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="text-[10.5px] font-bold text-slate-500">MÔ HÌNH (MODEL)</div>
                  <div className="font-mono font-bold text-slate-900 mt-1">{selectedRow.model}</div>
                  <div className="text-[11px] text-blue-600 mt-0.5">{selectedRow.provider}</div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="text-[10.5px] font-bold text-slate-500">TÁC VỤ</div>
                  <div className="font-bold text-slate-900 mt-1">{selectedRow.feature_name || "Phân tích AI"}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{selectedRow.client_name || "Desktop Client"}</div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="text-[10.5px] font-bold text-slate-500">ĐỘ TRỄ & TRẠNG THÁI</div>
                  <div className={`font-bold mt-1 ${selectedRow.latency_ms < 3000 ? "text-emerald-600" : "text-rose-600"}`}>
                    {selectedRow.latency_ms} ms · {selectedRow.status_code || (selectedRow.status === "Oke" ? 200 : 500)} {selectedRow.status}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{formatTimestamp(selectedRow.timestamp).formatted}</div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="text-[10.5px] font-bold text-slate-500">TOKENS & CHI PHÍ</div>
                  <div className="font-bold text-slate-900 mt-1">{selectedRow.total_tokens.toLocaleString()} tokens ({selectedRow.cost_vnd.toLocaleString()}đ)</div>
                  <div className="text-[11px] font-bold text-amber-600 mt-0.5">Đã trừ: {selectedRow.credit_used} Cr</div>
                </div>
              </div>

              {/* Error Box if Fail */}
              {selectedRow.error_message && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                  <div className="text-xs font-bold text-rose-700 flex items-center gap-1.5 mb-1">
                    <AlertTriangle size={14} /> CHI TIẾT LỖI GỌI API:
                  </div>
                  <div className="text-xs font-mono text-rose-800 break-words whitespace-pre-wrap">
                    {selectedRow.error_message}
                  </div>
                </div>
              )}

              {/* JSON Snapshot Viewer */}
              <div className="bg-slate-900 rounded-2xl p-3.5 text-slate-200 font-mono text-[11px]">
                <div className="flex justify-between items-center pb-2 mb-2 border-b border-slate-800">
                  <span className="text-slate-400 font-bold">PAYLOAD SNAPSHOT</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(JSON.stringify(selectedRow, null, 2))}
                    className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[10.5px] px-2 py-0.5 rounded transition-colors"
                  >
                    Sao chép JSON
                  </button>
                </div>
                <pre className="overflow-x-auto text-[10.5px] text-emerald-400">
                  {JSON.stringify(selectedRow, null, 2)}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 px-5 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedRow(null)}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 transition-colors"
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

export default AiRequestLogsPage;
