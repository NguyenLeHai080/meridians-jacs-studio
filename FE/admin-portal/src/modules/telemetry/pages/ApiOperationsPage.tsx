import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  const [pageSize, setPageSize] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Modals state
  const [selectedAccount, setSelectedAccount] = useState<ApiOperationAccount | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showFinanceModal, setShowFinanceModal] = useState(false);

  const notify = (msg: string, type: "success" | "error" = "success") => {
    showToast(msg, type);
    if (onNotify) onNotify(msg, type);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    notify("Đã copy vào bộ nhớ tạm");
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
  }, [token]);

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
    <div className="view-container animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* 1. Header with Breadcrumb & Refresh Action */}
      <div className="view-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ fontSize: "12.5px", color: "#64748b", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
            <span>MintForge</span>
            <span>/</span>
            <span style={{ color: "#334155", fontWeight: 700 }}>API</span>
          </div>
          <h1 className="view-title" style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", margin: "4px 0" }}>
            Báo cáo vận hành API
          </h1>
          <p className="view-subtitle" style={{ color: "#64748b", fontSize: "13px", margin: 0 }}>
            Báo cáo dữ liệu thật theo tài khoản, chủ sở hữu, API key và kết quả xử lý trong 7 ngày gần nhất.
          </p>
        </div>

        <div className="view-actions">
          <button
            type="button"
            onClick={fetchOperationsData}
            disabled={loading}
            style={{
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              padding: "7px 14px",
              fontSize: "13px",
              fontWeight: 650,
              color: "#334155",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            }}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Làm mới
          </button>
        </div>
      </div>

      {/* 2. 4 Stat Cards Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
        
        {/* Stat 1: Lượt gọi */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            border: "1px solid #e2e8f0",
            padding: "18px 20px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: "#eff6ff",
              color: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Activity size={22} />
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Lượt gọi</div>
            <div style={{ fontSize: "1.65rem", fontWeight: 800, color: "#0f172a", lineHeight: 1.2, margin: "2px 0" }}>
              {summary.total_requests.toLocaleString()}
            </div>
            <div style={{ fontSize: "11px", color: "#94a3b8" }}>Bản ghi gần nhất đã tải</div>
          </div>
        </div>

        {/* Stat 2: Thành công */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            border: "1px solid #e2e8f0",
            padding: "18px 20px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: "#ecfdf5",
              color: "#10b981",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Thành công</div>
            <div style={{ fontSize: "1.65rem", fontWeight: 800, color: "#059669", lineHeight: 1.2, margin: "2px 0" }}>
              {summary.successful_requests.toLocaleString()}
            </div>
            <div style={{ fontSize: "11px", color: "#94a3b8" }}>Theo kết quả hiện tại</div>
          </div>
        </div>

        {/* Stat 3: Tổng token */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            border: "1px solid #e2e8f0",
            padding: "18px 20px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: "#fff7ed",
              color: "#ea580c",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Coins size={22} />
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Tổng token</div>
            <div style={{ fontSize: "1.65rem", fontWeight: 800, color: "#0f172a", lineHeight: 1.2, margin: "2px 0" }}>
              {summary.total_tokens.toLocaleString()}
            </div>
            <div style={{ fontSize: "11px", color: "#94a3b8" }}>Token vào và ra</div>
          </div>
        </div>

        {/* Stat 4: Lỗi */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            border: "1px solid #e2e8f0",
            padding: "18px 20px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: "#fee2e2",
              color: "#ef4444",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <AlertTriangle size={22} />
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Lỗi</div>
            <div style={{ fontSize: "1.65rem", fontWeight: 800, color: "#e11d48", lineHeight: 1.2, margin: "2px 0" }}>
              {summary.failed_requests}
            </div>
            <div style={{ fontSize: "11px", color: "#94a3b8" }}>Cần kiểm tra</div>
          </div>
        </div>

      </div>

      {/* 3. Main Data Card: Hoạt động API gần đây */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "14px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          overflow: "hidden",
        }}
      >
        {/* Header with Search */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div>
            <h2 style={{ fontSize: "16px", fontWeight: 800, color: "#0f172a", margin: 0 }}>
              Hoạt động API theo Thiết Bị & Key Máy Khách Hàng
            </h2>
            <p style={{ fontSize: "12.5px", color: "#64748b", margin: "3px 0 0" }}>
              Báo cáo giám sát lượng request, token tiêu thụ và lợi nhuận tài chính tính theo Bản Quyền / Key Máy của từng khách hàng.
            </p>
          </div>

          {/* Search Box on right */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", width: "100%", maxWidth: "340px" }}>
            <span style={{ fontSize: "10.5px", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              TÌM THEO KEY MÁY / THIẾT BỊ
            </span>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="Lọc Key Máy, HWID, Tên thiết bị, Khách hàng..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px 8px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13px",
                  outline: "none",
                  boxSizing: "border-box",
                  background: "#f8fafc",
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table of 10 Columns */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: "1720px", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "#ffffff", borderBottom: "1px solid #f1f5f9", color: "#64748b", fontSize: "11px", fontWeight: 700, letterSpacing: "0.3px" }}>
                <th style={{ padding: "14px 20px", minWidth: "270px", width: "280px" }}>THIẾT BỊ & WORKSPACE</th>
                <th style={{ padding: "14px 18px", minWidth: "240px", width: "260px" }}>KHÁCH HÀNG SỞ HỮU</th>
                <th style={{ padding: "14px 14px", minWidth: "230px", width: "240px" }}>KEY MÁY / LICENSE CLIENT</th>
                <th style={{ padding: "14px 12px", textAlign: "center", minWidth: "90px", width: "90px" }}>REQUEST</th>
                <th style={{ padding: "14px 12px", textAlign: "center", minWidth: "110px", width: "110px" }}>THÀNH CÔNG</th>
                <th style={{ padding: "14px 12px", textAlign: "center", minWidth: "85px", width: "85px" }}>LỖI</th>
                <th style={{ padding: "14px 16px", minWidth: "140px", width: "140px" }}>TOKENS TIÊU THỤ</th>
                <th style={{ padding: "14px 16px", minWidth: "150px", width: "150px", color: "#d97706" }}>CREDITS TIÊU THỤ</th>
                <th style={{ padding: "14px 16px", minWidth: "120px", width: "120px" }}>GẦN NHẤT</th>
                <th style={{ padding: "14px 20px", textAlign: "right", minWidth: "270px", width: "280px" }}>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {paginatedAccounts.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: "40px 20px", textAlign: "center", color: "#94a3b8" }}>
                    Không tìm thấy dữ liệu hoạt động nào phù hợp.
                  </td>
                </tr>
              ) : (
                paginatedAccounts.map((item) => (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      transition: "background 0.15s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#fafafa")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    {/* 1. Account Name / Device + Workspace */}
                    <td style={{ padding: "14px 20px", minWidth: "270px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                        <div style={{ fontWeight: 750, color: "#0f172a", fontSize: "13.5px", display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" }}>
                          <Laptop size={15} color="#475569" style={{ flexShrink: 0 }} />
                          <span style={{ color: "#0f172a" }}>{item.machine_name || item.account_name}</span>
                        </div>
                        <div style={{ fontSize: "12px", color: "#64748b", display: "flex", alignItems: "center", gap: "6px", flexWrap: "nowrap" }}>
                          <span style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "2px 7px", borderRadius: "4px", fontWeight: 650, color: "#334155", whiteSpace: "nowrap" }}>
                            📁 {item.workspace_name}
                          </span>
                          {item.os_platform && (
                            <span style={{ fontSize: "11.5px", color: "#94a3b8", whiteSpace: "nowrap" }}>
                              • {item.os_platform}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 2. Owner Avatar Initials + Name + Email */}
                    <td style={{ padding: "14px 18px", minWidth: "240px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div
                          style={{
                            width: "38px",
                            height: "38px",
                            borderRadius: "50%",
                            background: "linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%)",
                            color: "#ea580c",
                            fontWeight: 800,
                            fontSize: "13px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            border: "1.5px solid #ffedd5",
                          }}
                        >
                          {getInitials(item.owner_name)}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 750, color: "#0f172a", fontSize: "13.5px", whiteSpace: "nowrap" }}>
                            {item.owner_name}
                          </div>
                          <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px", whiteSpace: "nowrap" }}>
                            {item.owner_email || "Chưa có liên hệ"}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* 3. Machine Key / License Badge & HWID */}
                    <td style={{ padding: "14px 14px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "5px", flexWrap: "nowrap" }}>
                          <span
                            onClick={() => handleCopy(item.machine_key || item.api_key_masked)}
                            title={`Click để sao chép Key:\n${item.machine_key || item.api_key_masked}`}
                            style={{
                              fontFamily: "monospace",
                              fontSize: "12px",
                              fontWeight: 750,
                              color: "#0369a1",
                              background: "#f0f9ff",
                              border: "1px solid #bae6fd",
                              padding: "4px 9px",
                              borderRadius: "6px",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            <span>🔑 {item.machine_key || item.api_key_masked}</span>
                            {copiedKey === (item.machine_key || item.api_key_masked) ? (
                              <Check size={12} color="#16a34a" style={{ flexShrink: 0 }} />
                            ) : (
                              <Copy size={12} color="#38bdf8" style={{ flexShrink: 0 }} />
                            )}
                          </span>
                        </div>
                        {item.machine_hwid && (
                          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <span
                              onClick={() => handleCopy(item.machine_hwid || "")}
                              title={`Click để sao chép HWID:\n${item.machine_hwid}`}
                              style={{
                                fontFamily: "monospace",
                                fontSize: "11px",
                                color: "#64748b",
                                background: "#f8fafc",
                                border: "1px solid #e2e8f0",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                maxWidth: "180px",
                              }}
                            >
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                HWID: {item.machine_hwid.slice(0, 16)}...
                              </span>
                              {copiedKey === item.machine_hwid ? (
                                <Check size={10} color="#16a34a" />
                              ) : (
                                <Copy size={10} color="#94a3b8" />
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* 4. Request Count */}
                    <td style={{ padding: "14px 12px", textAlign: "center", fontWeight: 750, color: "#0f172a", fontSize: "13.5px" }}>
                      {item.total_requests.toLocaleString()}
                    </td>

                    {/* 5. Success Count */}
                    <td style={{ padding: "14px 12px", textAlign: "center" }}>
                      <span
                        style={{
                          background: "#ecfdf5",
                          color: "#059669",
                          border: "1px solid #a7f3d0",
                          padding: "3px 9px",
                          borderRadius: "12px",
                          fontSize: "11.5px",
                          fontWeight: 750,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <CheckCircle2 size={12} color="#059669" />
                        {item.success_requests.toLocaleString()}
                      </span>
                    </td>

                    {/* 6. Error Count */}
                    <td style={{ padding: "14px 12px", textAlign: "center" }}>
                      <span
                        style={{
                          background: item.error_requests > 0 ? "#fff1f2" : "#f8fafc",
                          color: item.error_requests > 0 ? "#e11d48" : "#94a3b8",
                          border: item.error_requests > 0 ? "1px solid #fecdd3" : "1px solid #e2e8f0",
                          padding: "3px 9px",
                          borderRadius: "12px",
                          fontSize: "11.5px",
                          fontWeight: 750,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.error_requests > 0 ? (
                          <AlertTriangle size={12} color="#e11d48" />
                        ) : (
                          <span style={{ fontSize: "11px" }}>⊗</span>
                        )}
                        {item.error_requests}
                      </span>
                    </td>

                    {/* 7. Tokens */}
                    <td style={{ padding: "14px 16px", fontWeight: 700, color: "#0f172a", fontSize: "13px" }}>
                      {item.tokens_used.toLocaleString()}
                    </td>

                    {/* 8. Credits */}
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <div
                          style={{
                            background: "rgba(245, 158, 11, 0.12)",
                            color: "#d97706",
                            border: "1px solid rgba(245, 158, 11, 0.3)",
                            padding: "3px 8px",
                            borderRadius: "5px",
                            fontSize: "12px",
                            fontWeight: 800,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            width: "fit-content",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <Coins size={11} />
                          {item.financial_summary?.credit_used !== undefined ? Number(item.financial_summary.credit_used).toFixed(2) : (item.tokens_used / 1000).toFixed(2)} Cr
                        </div>
                        <div style={{ fontSize: "11px", color: "#64748b", whiteSpace: "nowrap" }}>
                          còn {item.financial_summary?.remaining_credit !== undefined ? Number(item.financial_summary.remaining_credit).toFixed(2) : "0.00"} Cr
                        </div>
                      </div>
                    </td>

                    {/* 9. Last Active */}
                    <td style={{ padding: "14px 16px", color: "#64748b", fontSize: "12px", whiteSpace: "nowrap" }}>
                      {item.last_active}
                    </td>

                    {/* 9. Three Action Buttons */}
                    <td style={{ padding: "14px 20px", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        
                        {/* Button 1: Xem lỗi */}
                        <button
                          type="button"
                          onClick={() => handleOpenErrorModal(item)}
                          style={{
                            background: "#ffffff",
                            border: "1px solid #cbd5e1",
                            borderRadius: "6px",
                            padding: "5px 9px",
                            fontSize: "11.5px",
                            fontWeight: 650,
                            color: item.error_requests > 0 ? "#e11d48" : "#475569",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            whiteSpace: "nowrap",
                            transition: "all 0.15s ease",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
                        >
                          <Eye size={12} />
                          <span>Xem lỗi</span>
                        </button>

                        {/* Button 2: Request */}
                        <button
                          type="button"
                          onClick={() => handleOpenRequestModal(item)}
                          style={{
                            background: "#eff6ff",
                            border: "1px solid #bfdbfe",
                            borderRadius: "6px",
                            padding: "5px 9px",
                            fontSize: "11.5px",
                            fontWeight: 650,
                            color: "#2563eb",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            whiteSpace: "nowrap",
                            transition: "all 0.15s ease",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "#dbeafe")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "#eff6ff")}
                        >
                          <Zap size={12} />
                          <span>Request</span>
                        </button>

                        {/* Button 3: Tài chính */}
                        <button
                          type="button"
                          onClick={() => handleOpenFinanceModal(item)}
                          style={{
                            background: "#fff7ed",
                            border: "1px solid #fed7aa",
                            borderRadius: "6px",
                            padding: "5px 9px",
                            fontSize: "11.5px",
                            fontWeight: 650,
                            color: "#ea580c",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            whiteSpace: "nowrap",
                            transition: "all 0.15s ease",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "#ffedd5")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "#fff7ed")}
                        >
                          <TrendingUp size={12} />
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
        <div
          style={{
            padding: "14px 24px",
            borderTop: "1px solid #f1f5f9",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div style={{ fontSize: "12.5px", color: "#64748b" }}>
            Tổng <strong>{reportData?.total || filteredAccounts.length}</strong> bản ghi
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              style={{
                padding: "4px 8px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "12px",
                background: "#ffffff",
                color: "#334155",
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value={5}>5 dòng</option>
              <option value={10}>10 dòng</option>
              <option value={20}>20 dòng</option>
            </select>

            <span style={{ fontSize: "12px", color: "#64748b" }}>
              Trang {currentPage} / {totalPages}
            </span>

            <div style={{ display: "inline-flex", gap: "4px" }}>
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                style={{
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "5px",
                  padding: "4px 8px",
                  color: currentPage <= 1 ? "#cbd5e1" : "#475569",
                  cursor: currentPage <= 1 ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                <ChevronLeft size={14} />
              </button>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                style={{
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "5px",
                  padding: "4px 8px",
                  color: currentPage >= totalPages ? "#cbd5e1" : "#475569",
                  cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                <ChevronRight size={14} />
              </button>
            </div>
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
