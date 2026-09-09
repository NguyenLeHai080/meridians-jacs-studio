import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  RotateCw,
  Search,
  Eye,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Copy,
  Plus,
  Coins,
  Cpu,
  Layers,
  Sparkles,
  Zap,
  Sliders,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Check,
  HelpCircle,
  Clock,
  ArrowRight,
  Home,
  X,
} from "lucide-react";
import type { License, SepayTransaction, BankConfig, CreditConfig } from "../../../core/types";
import { renewalService } from "../services/renewalService";
import { licenseService } from "../../licenses/services/licenseService";
import { planService } from "../../plans/services/planService";
import { billingService } from "../../billing/services/billingService";
import { formatCurrency } from "../../billing/utils/currencyHelper";
import { showToast, confirmDialog } from "../../../core/swal";
import { useI18n } from "../../../core/i18n";
import "../lang";

interface RenewalsPageProps {
  licenses?: License[];
  searchTerm?: string;
  onNotify?: (msg: string, type?: "success" | "error") => void;
}



export const RenewalsPage: React.FC<RenewalsPageProps> = ({
  licenses: propLicenses,
  searchTerm: _externalSearch = "",
  onNotify,
}) => {
  const { t } = useI18n();

  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<SepayTransaction[]>([]);
  const [licenses, setLicenses] = useState<License[]>(propLicenses || []);
  const [creditConfig, setCreditConfig] = useState<CreditConfig | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Pagination State
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Detail & API Quota Modal State
  const [selectedTx, setSelectedTx] = useState<SepayTransaction | null>(null);
  const [selectedLicense, setSelectedLicense] = useState<License | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [modalActiveTab, setModalActiveTab] = useState<"detail" | "api_config">("detail");

  // Form State for API Key Quota in Detail Modal
  const [keyConfigForm, setKeyConfigForm] = useState({
    token_in_price: 700,
    token_out_price: 900,
    max_requests_per_day: 1000,
    credit_balance: 160000,
    is_custom_quota: false,
  });

  // Simulator in Detail Modal
  const [simTokenIn, setSimTokenIn] = useState<number>(1);
  const [simTokenOut, setSimTokenOut] = useState<number>(2);
  const [savingKeyConfig, setSavingKeyConfig] = useState(false);

  // Manual Topup Modal State
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualForm, setManualForm] = useState({
    license_id: "",
    amount: 100000,
    credit_amount: 80000,
    days: 30,
    notes: "",
  });

  const onNotifyRef = useRef(onNotify);
  useEffect(() => {
    onNotifyRef.current = onNotify;
  }, [onNotify]);

  const notify = useCallback((msg: string, type: "success" | "error" = "success") => {
    showToast(msg, type);
    if (onNotifyRef.current) onNotifyRef.current(msg, type);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [txRes, licRes, cfgRes] = await Promise.allSettled([
        renewalService.getSepayTransactions(),
        licenseService.getLicenses(),
        planService.getCreditConfig(),
      ]);

      if (txRes.status === "fulfilled" && Array.isArray(txRes.value)) {
        setTransactions(txRes.value);
      } else {
        setTransactions([]);
      }

      if (licRes.status === "fulfilled") {
        setLicenses(licRes.value);
      }

      if (cfgRes.status === "fulfilled") {
        setCreditConfig(cfgRes.value);
      }
    } catch {
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Copy helper
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    notify(`Đã sao chép ${label}: ${text}`, "success");
  };

  // KPIs
  const totalApiKeysCount = useMemo(() => {
    if (licenses.length > 0) return licenses.length;
    return new Set(transactions.map((t) => t.api_key_name)).size || 4;
  }, [licenses, transactions]);

  const totalSepayTxsCount = transactions.length;
  const pendingCount = useMemo(
    () => transactions.filter((t) => t.status === "PENDING").length,
    [transactions]
  );

  // Filtered dataset
  const filteredTransactions = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return transactions.filter((tx) => {
      const matchSearch =
        !q ||
        tx.sepay_code.toLowerCase().includes(q) ||
        tx.api_key_name.toLowerCase().includes(q) ||
        tx.api_key_masked.toLowerCase().includes(q) ||
        tx.status.toLowerCase().includes(q) ||
        (tx.notes && tx.notes.toLowerCase().includes(q));

      const matchStatus =
        statusFilter === "ALL" || tx.status.toUpperCase() === statusFilter.toUpperCase();

      return matchSearch && matchStatus;
    });
  }, [transactions, searchQuery, statusFilter]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, currentPage, pageSize]);

  // Revoke Credit Action
  const handleRevokeCredit = async (tx: SepayTransaction) => {
    const confirmed = await confirmDialog({
      title: "Xác nhận thu hồi Credit?",
      html: `<div style="text-align: left; font-size: 13.5px; color: #475569; line-height: 1.6;">
        <p>Bạn có chắc muốn <b>thu hồi Credit</b> của mã SePay <b>${tx.sepay_code}</b>?</p>
        <p style="font-size: 12px; color: #dc2626; margin-top: 6px;">
          ⚠️ Credit đã cấp (${formatCurrency(tx.credit_amount)}) sẽ bị trừ ngược khỏi Key [${tx.api_key_name}].
        </p>
      </div>`,
      icon: "warning",
      confirmButtonText: "Thu hồi ngay",
      cancelButtonText: "Hủy bỏ",
      isDestructive: true,
    });
    if (!confirmed) return;

    try {
      await renewalService.revokeCredit(tx.id);
      notify(`Đã thu hồi thành công Credit giao dịch [${tx.sepay_code}]`, "success");
      setTransactions((prev) =>
        prev.map((t) => (t.id === tx.id ? { ...t, status: "REVOKED" } : t))
      );
    } catch (err: any) {
      notify(err instanceof Error ? err.message : "Lỗi khi thu hồi Credit", "error");
    }
  };

  // Open Detail Modal
  const handleOpenDetail = (tx: SepayTransaction) => {
    setSelectedTx(tx);
    const matchedLic = licenses.find(
      (l) => l.id === tx.license_id || l.customer_name === tx.api_key_name
    );
    setSelectedLicense(matchedLic || null);

    const pIn = matchedLic?.token_in_price ?? creditConfig?.token_in_price ?? 700;
    const pOut = matchedLic?.token_out_price ?? creditConfig?.token_out_price ?? 900;
    const maxReq = matchedLic?.max_requests_per_day ?? matchedLic?.max_jobs_per_day ?? 1000;
    const credBal = matchedLic?.credit_balance ?? tx.credit_amount ?? 160000;

    setKeyConfigForm({
      token_in_price: pIn,
      token_out_price: pOut,
      max_requests_per_day: maxReq,
      credit_balance: credBal,
      is_custom_quota: matchedLic?.is_custom_quota ?? false,
    });

    setModalActiveTab("detail");
    setIsDetailModalOpen(true);
  };

  // Save Key API & Quota Config
  const handleSaveKeyConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTx) return;

    const licId = selectedTx.license_id || selectedLicense?.id;
    if (!licId) {
      notify("Không tìm thấy ID License Key của giao dịch này để cập nhật cấu hình", "error");
      return;
    }

    try {
      setSavingKeyConfig(true);
      await renewalService.updateLicenseApiConfig(licId, {
        token_in_price: keyConfigForm.token_in_price,
        token_out_price: keyConfigForm.token_out_price,
        max_requests_per_day: keyConfigForm.max_requests_per_day,
        credit_balance: keyConfigForm.credit_balance,
        is_custom_quota: keyConfigForm.is_custom_quota,
      });

      notify(`Đã lưu cấu hình API Key & Quota cho [${selectedTx.api_key_name}]!`, "success");
      setIsDetailModalOpen(false);
      fetchData();
    } catch (err: any) {
      notify(err instanceof Error ? err.message : "Lỗi lưu cấu hình API Key", "error");
    } finally {
      setSavingKeyConfig(false);
    }
  };

  // Handle Manual Topup Submission
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.license_id) {
      notify("Vui lòng chọn License Key cần nạp Credit", "error");
      return;
    }

    try {
      setManualSubmitting(true);
      const lic = licenses.find((l) => l.id === manualForm.license_id);
      await renewalService.renewLicense({
        license_id: manualForm.license_id,
        days: manualForm.days || 30,
        amount: manualForm.amount,
        plan_type: `Nạp ${formatCurrency(manualForm.credit_amount)} Credit`,
        reason: manualForm.notes || `Nạp thủ công cho ${lic?.customer_name}`,
      });

      notify(
        `Đã nạp thành công ${formatCurrency(manualForm.credit_amount)} Credit cho [${
          lic?.customer_name || "khách hàng"
        }]!`,
        "success"
      );
      setIsManualModalOpen(false);
      fetchData();
    } catch (err: any) {
      notify(err instanceof Error ? err.message : "Lỗi khi nạp Credit thủ công", "error");
    } finally {
      setManualSubmitting(false);
    }
  };

  // Simulated consumption calculation in Modal
  const simCreditCost = useMemo(() => {
    const pIn = keyConfigForm.token_in_price || 700;
    const pOut = keyConfigForm.token_out_price || 900;
    return (simTokenIn || 0) * pIn + (simTokenOut || 0) * pOut;
  }, [simTokenIn, simTokenOut, keyConfigForm.token_in_price, keyConfigForm.token_out_price]);

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
            <span className="text-slate-500">Tài Chính & Bản Quyền</span>
            <ChevronRight size={12} className="text-slate-300" />
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-orange-500/10 text-orange-700 border border-orange-500/20">
              Giao Dịch Nạp Credit
            </span>
          </nav>

          {/* Title and Status */}
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-orange-500 via-amber-600 to-orange-600 flex items-center justify-center text-white shadow-md shadow-orange-500/20 shrink-0">
              <Coins size={22} className="stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight m-0">
                  Giao Dịch Nạp Credit & Hạch Toán SePay
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>SePay · VietinBank · BIDV</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Theo dõi tiền khách nạp, vốn API chi trả, Credit đã cấp và biên lợi nhuận ròng tự động.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0 self-start md:self-center flex-wrap sm:flex-nowrap">
          <button
            type="button"
            onClick={() => setIsManualModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl shadow-sm transition-all active:scale-95"
          >
            <Plus size={15} />
            <span>Nạp thủ công</span>
          </button>

          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-400 border border-slate-300/90 rounded-xl shadow-xs transition-all duration-150 active:scale-95 disabled:opacity-50"
          >
            <RotateCw size={14} className={loading ? "animate-spin text-orange-600" : "text-slate-500"} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* 2. 3 Glassmorphic KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: API Keys */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-orange-300 transition-all duration-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              API Keys
            </span>
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <Cpu size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {totalApiKeysCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Đang quản lý trong hệ thống</div>
        </div>

        {/* Card 2: Giao dịch SePay */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-blue-300 transition-all duration-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Giao Dịch SePay
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Coins size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {totalSepayTxsCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Tất cả trạng thái nạp</div>
        </div>

        {/* Card 3: Chờ xử lý */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-amber-300 transition-all duration-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Chờ Xử Lý
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock size={16} />
            </div>
          </div>
          <div className={`text-2xl font-black ${pendingCount > 0 ? "text-amber-600" : "text-slate-900"}`}>
            {pendingCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Cần đối soát thanh toán</div>
        </div>
      </div>

      {/* 3. Main Data Card & Single-Line Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Top Filter Bar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative min-w-[260px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm mã, tài khoản, trạng thái..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
            />
          </div>

          {/* Quick Status Filters */}
          <div className="flex items-center gap-1.5">
            {[
              { id: "ALL", label: "Tất cả" },
              { id: "COMPLETED", label: "Đã nạp" },
              { id: "PENDING", label: "Chờ duyệt" },
              { id: "REVOKED", label: "Đã thu hồi" },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => {
                  setStatusFilter(st.id);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  statusFilter === st.id
                    ? "bg-orange-50 text-orange-700 border-orange-300 shadow-2xs"
                    : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* High-End Single-Line Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 w-[160px]">MÃ SEPAY</th>
                <th className="py-3 px-3 w-[220px]">API KEY NHẬN CREDIT</th>
                <th className="py-3 px-3 w-[140px]">TIỀN KHÁCH NẠP</th>
                <th className="py-3 px-3 w-[130px]">VỐN BIDV</th>
                <th className="py-3 px-3 w-[130px]">CREDIT CẤP</th>
                <th className="py-3 px-3 w-[140px]">LỢI NHUẬN</th>
                <th className="py-3 px-3 w-[120px] text-center">TRẠNG THÁI</th>
                <th className="py-3 px-4 text-right w-[200px]">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Không tìm thấy giao dịch nạp SePay nào phù hợp.
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((tx) => {
                  const isRevoked = tx.status === "REVOKED";
                  const isPending = tx.status === "PENDING";

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-50/80 transition-colors duration-100 whitespace-nowrap"
                    >
                      {/* 1. Mã SePay */}
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => handleCopy(tx.sepay_code, "Mã SePay")}
                          className="font-mono font-bold text-slate-900 hover:text-orange-600 transition-colors"
                          title="Click để sao chép mã SePay"
                        >
                          {tx.sepay_code}
                        </button>
                      </td>

                      {/* 2. API Key */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{tx.api_key_name}</div>
                        <div className="font-mono text-[10.5px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 inline-block mt-0.5">
                          {tx.api_key_masked}
                        </div>
                      </td>

                      {/* 3. Tiền Khách Nạp */}
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {formatCurrency(tx.deposit_amount)}
                      </td>

                      {/* 4. Vốn BIDV */}
                      <td className="py-3 px-3 text-slate-600 font-semibold">
                        {formatCurrency(tx.cost_amount)}
                      </td>

                      {/* 5. Credit Cấp */}
                      <td className="py-3 px-3 font-bold text-orange-600">
                        {formatCurrency(tx.credit_amount)}
                      </td>

                      {/* 6. Lợi Nhuận */}
                      <td className="py-3 px-3 font-black text-emerald-600">
                        {isRevoked ? (
                          <span className="text-slate-400">0đ</span>
                        ) : (
                          <span>+{formatCurrency(tx.profit_amount)}</span>
                        )}
                      </td>

                      {/* 7. Trạng Thái */}
                      <td className="py-3 px-3 text-center">
                        {isRevoked ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            REVOKED
                          </span>
                        ) : isPending ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            PENDING
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            COMPLETED
                          </span>
                        )}
                      </td>

                      {/* 8. Thao Tác */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleRevokeCredit(tx)}
                            disabled={isRevoked}
                            className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-colors ${
                              isRevoked
                                ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                                : "bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200"
                            }`}
                          >
                            Thu hồi
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenDetail(tx)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors"
                          >
                            <Eye size={12} />
                            <span>Chi tiết</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-3.5 border-t border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-600">
            Hiển thị{" "}
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="py-0.5 px-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 bg-white mx-1"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>{" "}
            dòng mỗi trang · <strong>{filteredTransactions.length}</strong> giao dịch
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

      {/* 4. MODAL: Chi Tiết Giao Dịch & Cấu Hình Quota API Key */}
      {isDetailModalOpen && selectedTx && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onClick={() => setIsDetailModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-orange-800 border border-orange-300">
                  Chi tiết giao dịch & Quota
                </span>
                <h3 className="text-base font-black text-slate-900 mt-1.5 m-0">
                  Mã SePay: {selectedTx.sepay_code}
                </h3>
              </div>

              {/* Tabs Switcher */}
              <div className="bg-slate-200/80 p-1 rounded-xl flex gap-1">
                <button
                  type="button"
                  onClick={() => setModalActiveTab("detail")}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                    modalActiveTab === "detail"
                      ? "bg-white text-orange-600 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Thông tin GD
                </button>
                <button
                  type="button"
                  onClick={() => setModalActiveTab("api_config")}
                  className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                    modalActiveTab === "api_config"
                      ? "bg-white text-orange-600 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Sliders size={12} />
                  <span>Cấu hình API</span>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 max-h-[75vh] overflow-y-auto">
              {/* TAB 1: THÔNG TIN GIAO DỊCH */}
              {modalActiveTab === "detail" && (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <div>
                      <span className="text-slate-400 font-semibold text-[11px]">API Key Nhận Credit</span>
                      <div className="font-bold text-slate-900 text-sm mt-0.5">
                        {selectedTx.api_key_name} ({selectedTx.api_key_masked})
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400 font-semibold text-[11px]">Thời gian thực hiện</span>
                      <div className="font-semibold text-slate-800 text-xs mt-0.5">
                        {selectedTx.created_at ? new Date(selectedTx.created_at).toLocaleString("vi-VN") : "Vừa xong"}
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400 font-semibold text-[11px]">Tiền khách chuyển</span>
                      <div className="font-black text-slate-900 text-base mt-0.5">
                        {formatCurrency(selectedTx.deposit_amount)}
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400 font-semibold text-[11px]">Credit đã cấp</span>
                      <div className="font-black text-orange-600 text-base mt-0.5">
                        {formatCurrency(selectedTx.credit_amount)}
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400 font-semibold text-[11px]">Vốn API chi trả</span>
                      <div className="font-bold text-slate-700 text-sm mt-0.5">
                        {formatCurrency(selectedTx.cost_amount)}
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400 font-semibold text-[11px]">Lợi nhuận ròng</span>
                      <div className="font-black text-emerald-600 text-sm mt-0.5">
                        +{formatCurrency(selectedTx.profit_amount)} ({selectedTx.profit_percent}%)
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Nội dung giao dịch / Ghi chú
                    </label>
                    <div className="bg-slate-100 p-3 rounded-xl font-mono text-slate-700 text-xs">
                      {selectedTx.notes || selectedTx.raw_content || "Không có ghi chú"}
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleRevokeCredit(selectedTx)}
                      disabled={selectedTx.status === "REVOKED"}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors ${
                        selectedTx.status === "REVOKED"
                          ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                          : "bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200"
                      }`}
                    >
                      {selectedTx.status === "REVOKED" ? "Đã thu hồi Credit" : "Thu hồi Credit giao dịch này"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setModalActiveTab("api_config")}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 transition-colors"
                    >
                      <Sliders size={13} />
                      <span>Chỉnh sửa Quota API Key</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: CẤU HÌNH API KEY */}
              {modalActiveTab === "api_config" && (
                <form onSubmit={handleSaveKeyConfig} className="space-y-4 text-xs">
                  <div className="bg-orange-50 border border-orange-200 p-3 rounded-xl flex items-start gap-2.5">
                    <Sparkles size={16} className="text-orange-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-orange-900 leading-relaxed">
                      <strong>Cấu hình Quota API riêng cho Key [{selectedTx.api_key_name}]:</strong> Bạn có thể set chỉnh số lượng Request, đơn giá Token IN, đơn giá Token OUT và số Credit cấp chạy trực tiếp.
                    </div>
                  </div>

                  {/* Mode Toggle Switch */}
                  <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <div>
                      <div className="font-bold text-slate-900 text-xs">
                        Áp dụng cấu hình Quota tùy chỉnh riêng
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Bật để ghi đè công thức Credit chung cho Key này
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={keyConfigForm.is_custom_quota}
                      onChange={(e) =>
                        setKeyConfigForm((prev) => ({
                          ...prev,
                          is_custom_quota: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 accent-orange-600"
                    />
                  </div>

                  {/* Inputs Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Giá Token IN / 1M Token (VNĐ)
                      </label>
                      <input
                        type="number"
                        value={keyConfigForm.token_in_price}
                        onChange={(e) =>
                          setKeyConfigForm((prev) => ({
                            ...prev,
                            token_in_price: Number(e.target.value),
                          }))
                        }
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Giá Token OUT / 1M Token (VNĐ)
                      </label>
                      <input
                        type="number"
                        value={keyConfigForm.token_out_price}
                        onChange={(e) =>
                          setKeyConfigForm((prev) => ({
                            ...prev,
                            token_out_price: Number(e.target.value),
                          }))
                        }
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Giới hạn Requests (Req / ngày)
                      </label>
                      <input
                        type="number"
                        value={keyConfigForm.max_requests_per_day}
                        onChange={(e) =>
                          setKeyConfigForm((prev) => ({
                            ...prev,
                            max_requests_per_day: Number(e.target.value),
                          }))
                        }
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Số dư Credit khả dụng
                      </label>
                      <input
                        type="number"
                        value={keyConfigForm.credit_balance}
                        onChange={(e) =>
                          setKeyConfigForm((prev) => ({
                            ...prev,
                            credit_balance: Number(e.target.value),
                          }))
                        }
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-orange-600 bg-white focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>

                  {/* Simulator Box */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                      <Zap size={14} className="text-orange-600" />
                      <span>Mô phỏng tiêu thụ Credit theo Token:</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-[10.5px] text-slate-500">Token IN (M)</span>
                        <input
                          type="number"
                          value={simTokenIn}
                          onChange={(e) => setSimTokenIn(Number(e.target.value))}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs font-bold bg-white mt-0.5"
                        />
                      </div>
                      <div>
                        <span className="text-[10.5px] text-slate-500">Token OUT (M)</span>
                        <input
                          type="number"
                          value={simTokenOut}
                          onChange={(e) => setSimTokenOut(Number(e.target.value))}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs font-bold bg-white mt-0.5"
                        />
                      </div>
                      <div>
                        <span className="text-[10.5px] text-slate-500">Credit tiêu hao</span>
                        <div className="px-2 py-1.5 rounded-lg border border-slate-300 text-xs font-black text-orange-600 bg-white mt-0.5">
                          {formatCurrency(simCreditCost)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="pt-4 border-t border-slate-200 flex justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setIsDetailModalOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 transition-colors"
                    >
                      Đóng
                    </button>
                    <button
                      type="submit"
                      disabled={savingKeyConfig}
                      className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 transition-colors"
                    >
                      {savingKeyConfig ? <RotateCw size={13} className="animate-spin" /> : <Check size={13} />}
                      <span>Lưu cấu hình API Key</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL: Nạp Credit Thủ Công */}
      {isManualModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onClick={() => setIsManualModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-orange-800 border border-orange-300">
                  Nạp tiền thủ công
                </span>
                <h3 className="text-base font-black text-slate-900 mt-1 m-0">
                  Cấp Credit / Gia hạn cho khách
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Chọn License Key khách hàng *
                </label>
                <select
                  required
                  value={manualForm.license_id}
                  onChange={(e) => setManualForm((p) => ({ ...p, license_id: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white text-slate-800"
                >
                  <option value="">-- Chọn khách hàng cần cấp Credit --</option>
                  {licenses.map((lic) => (
                    <option key={lic.id} value={lic.id}>
                      {lic.customer_name} ({lic.key_hint || "sk-***"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Số tiền khách chuyển (VNĐ)
                  </label>
                  <input
                    type="number"
                    value={manualForm.amount}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      const pSell = creditConfig?.price_per_1m_token || 1000;
                      const pCost = creditConfig?.cost_per_1m_token || 800;
                      const cred = pSell > 0 ? (val / pSell) * pCost : val * 0.8;
                      setManualForm((p) => ({ ...p, amount: val, credit_amount: cred }));
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white text-slate-800"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Credit cấp vào Key
                  </label>
                  <input
                    type="number"
                    value={manualForm.credit_amount}
                    onChange={(e) => setManualForm((p) => ({ ...p, credit_amount: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-black text-orange-600 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Ghi chú
                </label>
                <input
                  type="text"
                  value={manualForm.notes}
                  onChange={(e) => setManualForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Ghi chú nạp tiền..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-800"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={manualSubmitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 transition-colors"
                >
                  {manualSubmitting ? <RotateCw size={13} className="animate-spin" /> : <Check size={13} />}
                  <span>Xác nhận & Cấp Credit</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RenewalsPage;
