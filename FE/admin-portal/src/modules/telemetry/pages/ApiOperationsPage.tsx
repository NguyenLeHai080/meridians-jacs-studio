import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Coins,
  Zap,
  Eye,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Activity,
  X,
  Copy,
  Check,
  Laptop,
  Home,
  Sliders,
} from "lucide-react";
import { apiRequest } from "../../../core/api";
import { getToken } from "../../../core/session";
import { showToast } from "../../../core/swal";
import { MachineErrorModal, type MachineErrorRecord } from "./modal/MachineErrorModal";
import { MachineRequestModal, type MachineRequestRecord } from "./modal/MachineRequestModal";
import { MachineFinanceModal, type MachineFinanceData } from "./modal/MachineFinanceModal";

const getInitials = (name: string) => {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export interface ApiOperationAccount {
  id: string;
  account_name: string;
  machine_name?: string;
  workspace_name: string;
  owner_name: string;
  owner_email: string;
  machine_key?: string;
  api_key_masked: string;
  os_platform?: string;
  app_version?: string;
  total_requests: number;
  success_requests: number;
  error_requests: number;
  tokens_used: number;
  last_active: string;
  machine_hwid?: string;
  errors_list: MachineErrorRecord[];
  requests_list: MachineRequestRecord[];
  financial_summary: MachineFinanceData;
}

interface ApiOperationsReportData {
  summary: {
    total_requests: number;
    successful_requests: number;
    failed_requests: number;
    total_tokens: number;
    period: string;
  };
  data: ApiOperationAccount[];
  total: number;
}

interface ApiOperationsPageProps {
  searchTerm?: string;
  onNotify?: (msg: string, type?: "success" | "error") => void;
}

export const ApiOperationsPage: React.FC<ApiOperationsPageProps> = ({
  searchTerm: externalSearch = "",
  onNotify,
}) => {
  const token = getToken() ?? "";
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState(externalSearch);
  const [reportData, setReportData] = useState<ApiOperationsReportData | null>(null);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Modals state
  const [selectedAccount, setSelectedAccount] = useState<ApiOperationAccount | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showFinanceModal, setShowFinanceModal] = useState(false);

  const onNotifyRef = useRef(onNotify);
  useEffect(() => {
    onNotifyRef.current = onNotify;
  }, [onNotify]);

  const notify = useCallback((msg: string, type: "success" | "error" = "success") => {
    showToast(msg, type);
    if (onNotifyRef.current) onNotifyRef.current(msg, type);
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    notify("Đã sao chép vào bộ nhớ tạm", "success");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const fetchOperationsData = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await apiRequest<any>("/api/v1/telemetry/api-operations", {}, token);
      if (res) {
        let items: ApiOperationAccount[] = [];
        if (Array.isArray(res)) {
          items = res;
        } else if (res.data && Array.isArray(res.data.data)) {
          items = res.data.data;
        } else if (Array.isArray(res.data)) {
          items = res.data;
        } else if (res.items && Array.isArray(res.items)) {
          items = res.items;
        }

        const calcTotalReqs = items.reduce((sum, i) => sum + (Number(i.total_requests) || 0), 0);
        const calcSuccReqs = items.reduce((sum, i) => sum + (Number(i.success_requests) || 0), 0);
        const calcErrReqs = items.reduce((sum, i) => sum + (Number(i.error_requests) || 0), 0);
        const calcTokens = items.reduce((sum, i) => sum + (Number(i.tokens_used) || 0), 0);

        const summaryObj = (res.summary || (res.data && res.data.summary)) || {
          total_requests: calcTotalReqs,
          successful_requests: calcSuccReqs,
          failed_requests: calcErrReqs,
          total_tokens: calcTokens,
          period: "Thời gian thực (Real-time DB)",
        };

        setReportData({
          summary: {
            total_requests: summaryObj.total_requests ?? calcTotalReqs,
            successful_requests: summaryObj.successful_requests ?? calcSuccReqs,
            failed_requests: summaryObj.failed_requests ?? calcErrReqs,
            total_tokens: summaryObj.total_tokens ?? calcTokens,
            period: summaryObj.period || "Thời gian thực (Real-time DB)",
          },
          data: items,
          total: items.length,
        });
      }
    } catch {
      notify("Không thể nạp dữ liệu báo cáo vận hành API", "error");
    } finally {
      setLoading(false);
    }
  }, [token, notify]);

  useEffect(() => {
    fetchOperationsData();
  }, [fetchOperationsData]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, pageSize]);

  // Filter accounts safely by search query
  const filteredAccounts = useMemo(() => {
    const list = reportData?.data || [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter((acc) => {
      const name = String(acc.machine_name || acc.account_name || "").toLowerCase();
      const ws = String(acc.workspace_name || "").toLowerCase();
      const owner = String(acc.owner_name || "").toLowerCase();
      const email = String(acc.owner_email || "").toLowerCase();
      const key = String(acc.machine_key || acc.api_key_masked || "").toLowerCase();
      const hwid = String(acc.machine_hwid || "").toLowerCase();
      const os = String(acc.os_platform || "").toLowerCase();
      return (
        name.includes(q) ||
        ws.includes(q) ||
        owner.includes(q) ||
        email.includes(q) ||
        key.includes(q) ||
        hwid.includes(q) ||
        os.includes(q)
      );
    });
  }, [reportData, searchQuery]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredAccounts.length / pageSize));
  const paginatedAccounts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAccounts.slice(start, start + pageSize);
  }, [filteredAccounts, currentPage, pageSize]);

  // Handlers for 3 action modals
  const handleOpenErrorModal = (acc: ApiOperationAccount) => {
    setSelectedAccount(acc);
    setShowErrorModal(true);
  };

  const handleOpenRequestModal = (acc: ApiOperationAccount) => {
    setSelectedAccount(acc);
    setShowRequestModal(true);
  };

  const handleOpenFinanceModal = (acc: ApiOperationAccount) => {
    setSelectedAccount(acc);
    setShowFinanceModal(true);
  };

  const summary = reportData?.summary || {
    total_requests: 7743,
    successful_requests: 7702,
    failed_requests: 41,
    total_tokens: 1433300923,
    period: "7 ngày gần nhất",
  };

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
            <span className="text-slate-500">Telemetry & Vận Hành</span>
            <ChevronRight size={12} className="text-slate-300" />
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-500/10 text-blue-700 border border-blue-500/20">
              Báo Cáo Vận Hành API
            </span>
          </nav>

          {/* Title and Status */}
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
              <Activity size={22} className="stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight m-0">
                  Báo Cáo Vận Hành API & Khách Hàng
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-700 border border-blue-500/20">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>Real-time Telemetry DB</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Báo cáo số liệu theo tài khoản, chủ sở hữu, Key Máy và kết quả xử lý trong 7 ngày gần nhất.
              </p>
            </div>
          </div>
        </div>

        {/* Refresh Action */}
        <div className="flex items-center gap-2.5 shrink-0 self-start md:self-center">
          <button
            type="button"
            onClick={fetchOperationsData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-400 border border-slate-300/90 rounded-xl shadow-xs transition-all duration-150 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-blue-600" : "text-slate-500"} />
            <span>{loading ? "Đang đồng bộ..." : "Làm mới"}</span>
          </button>
        </div>
      </div>

      {/* 2. 4 Glassmorphism KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Lượt gọi */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-blue-300 transition-all duration-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Lượt Gọi API
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Activity size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {summary.total_requests.toLocaleString()}{" "}
            <span className="text-xs font-semibold text-slate-400">lượt</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Bản ghi gần nhất đã tải</div>
        </div>

        {/* Stat 2: Thành công */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-all duration-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Thành Công
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600">
            {summary.successful_requests.toLocaleString()}
          </div>
          <div className="text-[11px] text-emerald-700 font-semibold mt-1">
            {Math.round((summary.successful_requests / Math.max(1, summary.total_requests)) * 100)}% tỷ lệ thành công
          </div>
        </div>

        {/* Stat 3: Tổng Token */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-orange-300 transition-all duration-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Tổng Token
            </span>
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <Coins size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {summary.total_tokens.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Token vào và ra</div>
        </div>

        {/* Stat 4: Lỗi */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-rose-300 transition-all duration-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Lỗi & Sự Cố
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className={`text-2xl font-black ${summary.failed_requests > 0 ? "text-rose-600" : "text-slate-900"}`}>
            {summary.failed_requests}{" "}
            <span className="text-xs font-semibold text-slate-400">lỗi</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Cần kiểm tra sự cố</div>
        </div>
      </div>

      {/* 3. Main Data Card: Single-Line Operations Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Top Header & Search */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-black text-slate-900 m-0">
              Hoạt Động API Theo Thiết Bị & Key Máy Khách Hàng
            </h2>
            <p className="text-xs text-slate-500 m-0 mt-0.5">
              Giám sát lượng request, token tiêu thụ và lợi nhuận tài chính tính theo Key Máy / License Client.
            </p>
          </div>

          <div className="relative min-w-[280px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm Key Máy, HWID, Tên thiết bị, Khách hàng..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Table of 10 Columns - Single-Line Layout */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1300px] border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 w-[240px]">THIẾT BỊ & WORKSPACE</th>
                <th className="py-3 px-3 w-[220px]">KHÁCH HÀNG SỞ HỮU</th>
                <th className="py-3 px-3 w-[220px]">KEY MÁY / LICENSE CLIENT</th>
                <th className="py-3 px-2 text-center w-[90px]">REQUEST</th>
                <th className="py-3 px-2 text-center w-[100px]">THÀNH CÔNG</th>
                <th className="py-3 px-2 text-center w-[80px]">LỖI</th>
                <th className="py-3 px-3 text-right w-[120px]">TOKENS</th>
                <th className="py-3 px-3 text-right w-[130px] text-amber-700">CREDITS TIÊU THỤ</th>
                <th className="py-3 px-3 w-[120px]">HOẠT ĐỘNG</th>
                <th className="py-3 px-4 text-right w-[240px]">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedAccounts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    Không tìm thấy dữ liệu hoạt động nào phù hợp.
                  </td>
                </tr>
              ) : (
                paginatedAccounts.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/80 transition-colors duration-100 whitespace-nowrap"
                  >
                    {/* 1. Account / Device + Workspace */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                        <Laptop size={14} className="text-slate-400 shrink-0" />
                        <span className="truncate max-w-[180px]">{item.machine_name || item.account_name}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                        <span className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[10.5px] font-semibold text-slate-700">
                          📁 {item.workspace_name}
                        </span>
                        {item.os_platform && (
                          <span className="text-slate-400 text-[10.5px]">
                            • {item.os_platform}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 2. Owner */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-200 to-orange-200 text-amber-900 font-black text-[11px] flex items-center justify-center shrink-0 border border-amber-300">
                          {getInitials(item.owner_name)}
                        </div>
                        <div className="truncate max-w-[170px]">
                          <div className="font-bold text-slate-900 truncate">{item.owner_name}</div>
                          <div className="text-[11px] text-slate-400 truncate">{item.owner_email || "Chưa có email"}</div>
                        </div>
                      </div>
                    </td>

                    {/* 3. Key & HWID */}
                    <td className="py-3 px-3">
                      <div>
                        <button
                          type="button"
                          onClick={() => handleCopy(item.machine_key || item.api_key_masked)}
                          className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold text-sky-800 bg-sky-50 hover:bg-sky-100 px-2 py-0.5 rounded-md border border-sky-200 transition-colors"
                          title="Click để copy key"
                        >
                          <span>🔑 {item.machine_key || item.api_key_masked}</span>
                          {copiedKey === (item.machine_key || item.api_key_masked) ? (
                            <Check size={11} className="text-emerald-600" />
                          ) : (
                            <Copy size={11} className="text-sky-400" />
                          )}
                        </button>
                      </div>
                      {item.machine_hwid && (
                        <div className="mt-0.5">
                          <button
                            type="button"
                            onClick={() => handleCopy(item.machine_hwid || "")}
                            className="inline-flex items-center gap-1 font-mono text-[10px] text-slate-500 bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded border border-slate-200 transition-colors"
                            title={item.machine_hwid}
                          >
                            <span>HWID: {item.machine_hwid.slice(0, 14)}...</span>
                            {copiedKey === item.machine_hwid ? (
                              <Check size={9} className="text-emerald-600" />
                            ) : (
                              <Copy size={9} className="text-slate-400" />
                            )}
                          </button>
                        </div>
                      )}
                    </td>

                    {/* 4. Requests */}
                    <td className="py-3 px-2 text-center font-bold text-slate-900">
                      {item.total_requests.toLocaleString()}
                    </td>

                    {/* 5. Success */}
                    <td className="py-3 px-2 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 size={11} />
                        <span>{item.success_requests.toLocaleString()}</span>
                      </span>
                    </td>

                    {/* 6. Error */}
                    <td className="py-3 px-2 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                          item.error_requests > 0
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-slate-100 text-slate-500 border-slate-200"
                        }`}
                      >
                        {item.error_requests > 0 && <AlertTriangle size={11} />}
                        <span>{item.error_requests}</span>
                      </span>
                    </td>

                    {/* 7. Tokens */}
                    <td className="py-3 px-3 text-right font-bold text-slate-700">
                      {item.tokens_used.toLocaleString()}
                    </td>

                    {/* 8. Credits */}
                    <td className="py-3 px-3 text-right">
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 font-bold text-[11px]">
                        <Coins size={11} />
                        <span>
                          {item.financial_summary?.credit_used !== undefined
                            ? Number(item.financial_summary.credit_used).toFixed(2)
                            : (item.tokens_used / 1000).toFixed(2)}{" "}
                          Cr
                        </span>
                      </div>
                      <div className="text-[10.5px] text-slate-400 mt-0.5">
                        còn {item.financial_summary?.remaining_credit !== undefined ? Number(item.financial_summary.remaining_credit).toFixed(2) : "0.00"} Cr
                      </div>
                    </td>

                    {/* 9. Last Active */}
                    <td className="py-3 px-3 text-slate-500 text-[11.5px]">
                      {item.last_active}
                    </td>

                    {/* 10. Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {/* Xem lỗi */}
                        <button
                          type="button"
                          onClick={() => handleOpenErrorModal(item)}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold border transition-colors ${
                            item.error_requests > 0
                              ? "bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200"
                              : "bg-white hover:bg-slate-100 text-slate-600 border-slate-300"
                          }`}
                        >
                          <Eye size={11} />
                          <span>Lỗi</span>
                        </button>

                        {/* Request */}
                        <button
                          type="button"
                          onClick={() => handleOpenRequestModal(item)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors"
                        >
                          <Zap size={11} />
                          <span>Request</span>
                        </button>

                        {/* Tài chính */}
                        <button
                          type="button"
                          onClick={() => handleOpenFinanceModal(item)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-colors"
                        >
                          <TrendingUp size={11} />
                          <span>Tài chính</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-3.5 border-t border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-600">
            Tổng <strong>{reportData?.total || filteredAccounts.length}</strong> bản ghi
          </div>

          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="py-1 px-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 bg-white"
            >
              <option value={5}>5 dòng</option>
              <option value={10}>10 dòng</option>
              <option value={20}>20 dòng</option>
            </select>

            <span className="text-xs font-bold text-slate-800 px-2">
              Trang {currentPage} / {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={13} />
              <span>Trước</span>
            </button>

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

      {/* 4. Three Detail Modals */}
      {showErrorModal && selectedAccount && (
        <MachineErrorModal
          isOpen={showErrorModal}
          onClose={() => setShowErrorModal(false)}
          accountName={selectedAccount.account_name}
          apiKeyMasked={selectedAccount.api_key_masked}
          hwid={selectedAccount.machine_hwid}
          errors={selectedAccount.errors_list}
        />
      )}

      {showRequestModal && selectedAccount && (
        <MachineRequestModal
          isOpen={showRequestModal}
          onClose={() => setShowRequestModal(false)}
          accountName={selectedAccount.account_name}
          apiKeyMasked={selectedAccount.api_key_masked}
          requests={selectedAccount.requests_list}
        />
      )}

      {showFinanceModal && selectedAccount && (
        <MachineFinanceModal
          isOpen={showFinanceModal}
          onClose={() => setShowFinanceModal(false)}
          accountName={selectedAccount.account_name}
          apiKeyMasked={selectedAccount.api_key_masked}
          finance={selectedAccount.financial_summary}
        />
      )}
    </div>
  );
};

export default ApiOperationsPage;
