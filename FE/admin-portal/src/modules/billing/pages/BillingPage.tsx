import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Wallet,
  RefreshCw,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  Search,
  Trash2,
  CheckCircle2,
  Calendar,
  CreditCard,
  Building2,
  Filter,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Info,
  X,
  Home,
} from "lucide-react";
import type { BillingTransaction, BillingSummary } from "../../../core/types";
import { billingService } from "../services/billingService";
import { AddTransactionModal } from "./modal/AddTransactionModal";
import { RefundModal } from "./modal/RefundModal";
import { confirmDialog, showToast } from "../../../core/swal";
import { useI18n } from "../../../core/i18n";
import "../lang";

interface BillingPageProps {
  transactions?: BillingTransaction[];
  billingSummary?: BillingSummary | null;
  onRefresh?: () => Promise<void>;
  setMessage?: (msg: string) => void;
  setError?: (err: string) => void;
  searchTerm?: string;
  onNotify?: (msg: string, type?: "success" | "error") => void;
}

export const BillingPage: React.FC<BillingPageProps> = ({
  transactions: propTransactions,
  billingSummary: propBillingSummary,
  onRefresh: propOnRefresh,
  setMessage: propSetMessage,
  setError: propSetError,
  searchTerm: externalSearch = "",
  onNotify,
}) => {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [localTransactions, setLocalTransactions] = useState<BillingTransaction[]>(propTransactions || []);
  const [localSummary, setLocalSummary] = useState<BillingSummary | null>(propBillingSummary || null);

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState(externalSearch);
  const [typeFilter, setTypeFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);

  const activeTransactions = propTransactions || localTransactions;
  const activeSummary = propBillingSummary !== undefined ? propBillingSummary : localSummary;

  const onNotifyRef = useRef(onNotify);
  useEffect(() => {
    onNotifyRef.current = onNotify;
  }, [onNotify]);

  const notify = useCallback((msg: string, type: "success" | "error" = "success") => {
    showToast(msg, type);
    if (onNotifyRef.current) onNotifyRef.current(msg, type);
    else if (type === "error" && propSetError) propSetError(msg);
    else if (propSetMessage) propSetMessage(msg);
  }, [propSetError, propSetMessage]);

  const fetchBillingData = useCallback(async () => {
    try {
      setLoading(true);
      const [txs, sum] = await Promise.allSettled([
        billingService.getTransactions(),
        billingService.getSummary(),
      ]);
      if (txs.status === "fulfilled") setLocalTransactions(txs.value);
      if (sum.status === "fulfilled") setLocalSummary(sum.value);
      setLastUpdated(
        new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) +
          " " +
          new Date().toLocaleDateString("vi-VN")
      );
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!propTransactions || propBillingSummary === undefined) {
      fetchBillingData();
    }
  }, [propTransactions, propBillingSummary, fetchBillingData]);

  useEffect(() => {
    if (externalSearch) {
      setSearchQuery(externalSearch);
    }
  }, [externalSearch]);

  const handleRefresh = async () => {
    if (propOnRefresh) await propOnRefresh();
    else await fetchBillingData();
  };

  // Currency formatter
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  // Calculate stats
  const { totalDeposits, totalRefunds, netRevenue, depositCount, refundCount } = useMemo(() => {
    let dep = 0;
    let ref = 0;
    let depC = 0;
    let refC = 0;

    for (const tx of activeTransactions) {
      const amt = Number(tx.amount) || 0;
      if (amt < 0 || tx.transaction_type === "refund") {
        ref += Math.abs(amt);
        refC += 1;
      } else {
        dep += amt;
        depC += 1;
      }
    }

    if (activeSummary) {
      dep = Math.max(dep, activeSummary.total_deposits || 0);
      ref = Math.max(ref, activeSummary.total_refunds || 0);
    }

    return {
      totalDeposits: dep,
      totalRefunds: ref,
      netRevenue: dep - ref,
      depositCount: depC,
      refundCount: refC,
    };
  }, [activeTransactions, activeSummary]);

  // Filter & Search logic
  const filteredTransactions = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return activeTransactions.filter((tx) => {
      const matchSearch =
        !q ||
        (tx.customer_name || "").toLowerCase().includes(q) ||
        (tx.notes || "").toLowerCase().includes(q) ||
        (tx.plan_type || "").toLowerCase().includes(q) ||
        (tx.plan_name || "").toLowerCase().includes(q) ||
        (tx.reference_code || "").toLowerCase().includes(q) ||
        (tx.id || "").toLowerCase().includes(q);

      const matchType =
        typeFilter === "all" ||
        (typeFilter === "renewal" && tx.transaction_type === "renewal") ||
        (typeFilter === "new_key" && tx.transaction_type === "new_key") ||
        (typeFilter === "deposit" && (tx.transaction_type === "deposit" || tx.transaction_type === "income")) ||
        (typeFilter === "refund" && (tx.transaction_type === "refund" || tx.amount < 0));

      const matchMethod =
        methodFilter === "all" ||
        (tx.payment_method || "").toLowerCase().includes(methodFilter.toLowerCase());

      return matchSearch && matchType && matchMethod;
    });
  }, [activeTransactions, searchQuery, typeFilter, methodFilter]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredTransactions.length / pageSize) || 1;
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, currentPage, pageSize]);

  // Handle Delete
  const handleDeleteTransaction = async (tx: BillingTransaction) => {
    const confirmed = await confirmDialog({
      title: "Xác nhận xóa giao dịch?",
      html: `<div style="text-align: left; font-size: 13.5px; color: #475569; line-height: 1.6;">
        <p>Bạn có chắc muốn xóa giao dịch <b>#${tx.id.slice(0, 8)}</b>?</p>
        <p style="font-size: 12.5px; color: #64748b; margin-top: 6px;">
          Số tiền: <b>${formatCurrency(tx.amount)}</b> | Khách hàng: <b>${tx.customer_name || "Khách hàng"}</b>
        </p>
      </div>`,
      icon: "warning",
      confirmButtonText: "Xóa giao dịch",
      cancelButtonText: "Hủy bỏ",
      isDestructive: true,
    });
    if (!confirmed) return;

    try {
      await billingService.deleteTransaction(tx.id);
      notify("Đã xóa giao dịch thành công", "success");
      await handleRefresh();
    } catch (err: any) {
      notify(err instanceof Error ? err.message : "Không xóa được giao dịch", "error");
    }
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
            <span className="text-slate-500">Tài Chính & Doanh Thu</span>
            <ChevronRight size={12} className="text-slate-300" />
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-orange-500/10 text-orange-700 border border-orange-500/20">
              Ví & Dòng Tiền
            </span>
          </nav>

          {/* Title and Subtitle */}
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-orange-500 via-amber-600 to-orange-600 flex items-center justify-center text-white shadow-md shadow-orange-500/20 shrink-0">
              <Wallet size={22} className="stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight m-0">
                  Ví Quản Trị & Dòng Tiền Doanh Thu
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Real-time Financial Ledger</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Theo dõi số dư khả dụng, dòng tiền nạp bản quyền, thanh toán SePay VietQR và chi phí AI theo thời gian thực.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0 self-start md:self-center flex-wrap sm:flex-nowrap">
          {/* Refund / Outflow Button */}
          <button
            type="button"
            onClick={() => setShowRefundModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 hover:border-rose-400 border border-rose-200 rounded-xl shadow-xs transition-all active:scale-95"
          >
            <ArrowUpRight size={14} />
            <span>Ghi nhận chi / hoàn tiền</span>
          </button>

          {/* Deposit Button */}
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl shadow-sm transition-all active:scale-95"
          >
            <Plus size={15} />
            <span>Ghi nhận nạp tiền</span>
          </button>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-400 border border-slate-300/90 rounded-xl shadow-xs transition-all duration-150 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-orange-600" : "text-slate-500"} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* 2. Main Hero Wallet Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-7 text-white shadow-xl border border-slate-800 flex flex-wrap items-center justify-between gap-6">
        {/* Glow ambient background accent */}
        <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-orange-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Số Dư Khả Dụng (Quỹ Thu Tích Lũy)
          </div>
          <div className="text-3xl sm:text-4xl font-black text-white mt-1.5 tracking-tight">
            {formatCurrency(netRevenue)}
          </div>
          <div className="inline-flex items-center gap-2 mt-3 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Ví đang hoạt động • Tự động hạch toán realtime</span>
          </div>
        </div>

        <div className="relative z-10 bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3 backdrop-blur-md">
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
            <Wallet size={20} />
          </div>
          <div>
            <div className="text-[11px] text-slate-400">Cập nhật gần nhất</div>
            <div className="text-xs font-bold text-white mt-0.5">
              {lastUpdated || new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) + " " + new Date().toLocaleDateString("vi-VN")}
            </div>
          </div>
        </div>
      </div>

      {/* 3. 3 Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Tổng tiền vào */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-all duration-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Tổng Tiền Vào
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowDownLeft size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600">
            {formatCurrency(totalDeposits)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Theo giao dịch đã nạp • {depositCount} lượt thu
          </div>
        </div>

        {/* Card 2: Tổng tiền ra */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-rose-300 transition-all duration-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Tổng Tiền Ra
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowUpRight size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600">
            {formatCurrency(totalRefunds)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Chi phí API & hoàn tiền • {refundCount} lượt chi
          </div>
        </div>

        {/* Card 3: Giao dịch */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-blue-300 transition-all duration-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Tổng Giao Dịch
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Receipt size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {activeTransactions.length}{" "}
            <span className="text-xs font-semibold text-slate-400">giao dịch</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Bản ghi gần nhất đã ghi nhận</div>
        </div>
      </div>

      {/* 4. Transaction History Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Top Filter Bar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-black text-slate-900 m-0">Lịch Sử Giao Dịch Ví & Dòng Tiền</h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-orange-800 border border-orange-300">
              {filteredTransactions.length} bản ghi
            </span>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Search Input */}
            <div className="relative min-w-[220px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm khách hàng, key, ghi chú..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
              />
            </div>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="py-1.5 px-3 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-300 cursor-pointer"
            >
              <option value="all">⚡ Tất cả loại giao dịch</option>
              <option value="renewal">🔄 Gia hạn License</option>
              <option value="new_key">🔑 Cấp Key mới</option>
              <option value="deposit">💳 Nạp tiền Credit</option>
              <option value="refund">↩️ Hoàn tiền / Chi phí</option>
            </select>

            {/* Method Filter */}
            <select
              value={methodFilter}
              onChange={(e) => {
                setMethodFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="py-1.5 px-3 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-300 cursor-pointer"
            >
              <option value="all">🏦 Tất cả phương thức</option>
              <option value="sepay">VietQR (SePay Auto)</option>
              <option value="bank_transfer">Chuyển khoản</option>
              <option value="momo">Ví MoMo</option>
              <option value="cash">Tiền mặt</option>
            </select>
          </div>
        </div>

        {/* High-End Single-Line Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 w-[130px]">LOẠI</th>
                <th className="py-3 px-3 w-[150px]">SỐ TIỀN</th>
                <th className="py-3 px-3 w-[220px]">KHÁCH HÀNG / BẢN QUYỀN</th>
                <th className="py-3 px-3 w-[260px]">NỘI DUNG GIAO DỊCH</th>
                <th className="py-3 px-3 w-[160px]">PHƯƠNG THỨC</th>
                <th className="py-3 px-3 w-[120px]">NGƯỜI THỰC HIỆN</th>
                <th className="py-3 px-3 w-[140px]">THỜI GIAN</th>
                <th className="py-3 px-4 text-right w-[80px]">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Receipt size={32} className="mx-auto text-slate-300 mb-2" />
                    <div className="font-bold text-slate-700 text-sm">Chưa có giao dịch dòng tiền nào</div>
                    <div className="text-xs text-slate-400 mt-1">Khi bạn tạo người dùng hoặc khách nạp qua SePay, giao dịch sẽ tự động xuất hiện tại đây.</div>
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((tx) => {
                  const isNegative = tx.amount < 0 || tx.transaction_type === "refund";
                  const isRenewal = tx.transaction_type === "renewal";
                  const isNewKey = tx.transaction_type === "new_key";
                  const isSePay = (tx.payment_method || "").toLowerCase().includes("sepay");

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-50/80 transition-colors duration-100 whitespace-nowrap"
                    >
                      {/* 1. LOẠI */}
                      <td className="py-3 px-4">
                        {isNegative ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <ArrowUpRight size={11} /> HOÀN TIỀN
                          </span>
                        ) : isRenewal ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <RefreshCw size={11} /> GIA HẠN
                          </span>
                        ) : isNewKey ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
                            <Sparkles size={11} /> CẤP KEY MỚI
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                            <ArrowDownLeft size={11} /> NẠP TIỀN
                          </span>
                        )}
                      </td>

                      {/* 2. SỐ TIỀN */}
                      <td className="py-3 px-3">
                        <strong className={`font-black text-sm ${isNegative ? "text-rose-600" : "text-emerald-600"}`}>
                          {isNegative ? `-${formatCurrency(Math.abs(tx.amount))}` : `+${formatCurrency(tx.amount)}`}
                        </strong>
                      </td>

                      {/* 3. KHÁCH HÀNG */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 truncate max-w-[200px]">
                          {tx.customer_name || "Khách hàng"}
                        </div>
                        {tx.plan_name && (
                          <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[200px]">
                            {tx.plan_name}
                          </div>
                        )}
                      </td>

                      {/* 4. NỘI DUNG */}
                      <td className="py-3 px-3">
                        <div className="text-slate-700 truncate max-w-[240px]" title={tx.notes || "Giao dịch bản quyền phần mềm"}>
                          {tx.notes || "Giao dịch bản quyền phần mềm"}
                        </div>
                        {tx.reference_code && (
                          <span className="inline-block mt-0.5 font-mono text-[10.5px] text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">
                            Ref: {tx.reference_code}
                          </span>
                        )}
                      </td>

                      {/* 5. PHƯƠNG THỨC */}
                      <td className="py-3 px-3">
                        {isSePay ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200 font-bold text-[11px]">
                            <Building2 size={12} /> VietQR (SePay Auto)
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 font-semibold text-[11px]">
                            {(tx.payment_method || "bank_transfer").toUpperCase()}
                          </span>
                        )}
                      </td>

                      {/* 6. NGƯỜI THỰC HIỆN */}
                      <td className="py-3 px-3 text-slate-500 text-[11.5px]">
                        {tx.actor || "system"}
                      </td>

                      {/* 7. THỜI GIAN */}
                      <td className="py-3 px-3 text-slate-600 text-[11.5px]">
                        {tx.created_at
                          ? new Date(tx.created_at).toLocaleString("vi-VN", {
                              hour: "2-digit",
                              minute: "2-digit",
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })
                          : "--"}
                      </td>

                      {/* 8. THAO TÁC */}
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteTransaction(tx)}
                          className="inline-flex items-center justify-center p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors"
                          title="Xóa giao dịch này"
                        >
                          <Trash2 size={13} />
                        </button>
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
            Hiển thị <strong>{filteredTransactions.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</strong> -{" "}
            <strong>{Math.min(currentPage * pageSize, filteredTransactions.length)}</strong> trong tổng số{" "}
            <strong>{filteredTransactions.length}</strong> giao dịch
          </div>

          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="py-1 px-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 bg-white"
            >
              <option value={10}>10 dòng</option>
              <option value={20}>20 dòng</option>
              <option value={50}>50 dòng</option>
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

      {/* 5. Modals */}
      <AddTransactionModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={(msg) => {
          notify(msg, "success");
          void handleRefresh();
        }}
      />

      <RefundModal
        isOpen={showRefundModal}
        onClose={() => setShowRefundModal(false)}
        onSuccess={(msg) => {
          notify(msg, "success");
          void handleRefresh();
        }}
      />
    </div>
  );
};

export default BillingPage;
