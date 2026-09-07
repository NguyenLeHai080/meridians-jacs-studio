import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  const { t, language } = useI18n();
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

  const notify = (msg: string, type: "success" | "error" = "success") => {
    showToast(msg, type);
    if (onNotify) onNotify(msg, type);
    else if (type === "error" && propSetError) propSetError(msg);
    else if (propSetMessage) propSetMessage(msg);
  };

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
    <div style={{ display: "flex", flexDirection: "column", gap: "18px", paddingBottom: "24px" }} className="animate-fade-in">
      
      {/* 1. Page Header & Actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "#ea580c", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "3px" }}>
            MintForge / API • Quản lý tài chính
          </div>
          <h1 style={{ fontSize: "22px", fontWeight: 850, color: "#0f172a", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
            <Wallet size={22} color="#ea580c" /> Ví & Dòng Tiền
          </h1>
          <p style={{ fontSize: "13px", color: "#64748b", margin: "4px 0 0" }}>
            Theo dõi số dư, tiền nạp, chi phí và lịch sử giao dịch tự động từ SePay VietQR và gia hạn thủ công.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setShowRefundModal(true)}
            style={{
              background: "#ffffff",
              border: "1.5px solid #fecdd3",
              color: "#e11d48",
              padding: "7px 14px",
              borderRadius: "8px",
              fontSize: "12.5px",
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              transition: "all 0.15s ease",
            }}
          >
            <ArrowUpRight size={15} /> Ghi Nhận Chi / Hoàn Tiền
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            style={{
              background: "linear-gradient(135deg, #ea580c 0%, #f97316 100%)",
              border: "none",
              color: "#ffffff",
              padding: "7px 16px",
              borderRadius: "8px",
              fontSize: "12.5px",
              fontWeight: 750,
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(234, 88, 12, 0.25)",
              transition: "all 0.15s ease",
            }}
          >
            <Plus size={15} /> Ghi Nhận Nạp Tiền
          </button>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            style={{
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              color: "#475569",
              padding: "7px 12px",
              borderRadius: "8px",
              fontSize: "12.5px",
              fontWeight: 650,
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Làm mới
          </button>
        </div>
      </div>

      {/* 2. MAIN HERO WALLET CARD (MintForge Dark Navy Theme) */}
      <div
        style={{
          background: "linear-gradient(135deg, #0b132b 0%, #1c2541 45%, #2a3d66 100%)",
          borderRadius: "16px",
          padding: "24px 30px",
          color: "#ffffff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 10px 30px rgba(11, 19, 43, 0.25)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          flexWrap: "wrap",
          gap: "20px",
        }}
      >
        {/* Glow ambient background accent */}
        <div
          style={{
            position: "absolute",
            right: "-30px",
            top: "-30px",
            width: "220px",
            height: "220px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(234, 88, 12, 0.25) 0%, rgba(234, 88, 12, 0) 70%)",
            pointerEvents: "none",
          }}
        />

        <div style={{ zIndex: 1 }}>
          <div style={{ fontSize: "13px", fontWeight: 650, color: "rgba(255, 255, 255, 0.75)", letterSpacing: "0.2px" }}>
            Số dư khả dụng (Quỹ thu tích lũy)
          </div>
          <div style={{ fontSize: "38px", fontWeight: 900, marginTop: "4px", color: "#ffffff", letterSpacing: "-0.5px" }}>
            {formatCurrency(netRevenue)}
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginTop: "10px", fontSize: "12.5px", color: "#4ade80", fontWeight: 650 }}>
            <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 8px #4ade80" }} />
            Ví đang hoạt động • Tự động hạch toán realtime
          </div>
        </div>

        <div
          style={{
            zIndex: 1,
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: "50%",
            width: "124px",
            height: "124px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            backdropFilter: "blur(10px)",
          }}
        >
          <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "rgba(234, 88, 12, 0.25)", color: "#ea580c", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "4px" }}>
            <Wallet size={18} />
          </div>
          <div style={{ fontSize: "10.5px", color: "rgba(255, 255, 255, 0.65)" }}>Cập nhật gần nhất</div>
          <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#ffffff", marginTop: "2px" }}>
            {lastUpdated || new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) + " " + new Date().toLocaleDateString("vi-VN")}
          </div>
        </div>
      </div>

      {/* 3. 3 METRIC SUMMARY CARDS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "14px" }}>
        
        {/* Card 1: Tổng tiền vào */}
        <div style={{ background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "16px 20px", display: "flex", alignItems: "center", gap: "14px", boxShadow: "0 1px 4px rgba(0,0,0,0.03)" }}>
          <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "#ecfdf5", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <ArrowDownLeft size={22} />
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 650 }}>Tổng tiền vào</div>
            <div style={{ fontSize: "19px", fontWeight: 850, color: "#059669", marginTop: "2px" }}>
              {formatCurrency(totalDeposits)}
            </div>
            <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
              Theo giao dịch đã tải • {depositCount} lần thu
            </div>
          </div>
        </div>

        {/* Card 2: Tổng tiền ra */}
        <div style={{ background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "16px 20px", display: "flex", alignItems: "center", gap: "14px", boxShadow: "0 1px 4px rgba(0,0,0,0.03)" }}>
          <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "#fff1f2", color: "#e11d48", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <ArrowUpRight size={22} />
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 650 }}>Tổng tiền ra</div>
            <div style={{ fontSize: "19px", fontWeight: 850, color: "#e11d48", marginTop: "2px" }}>
              {formatCurrency(totalRefunds)}
            </div>
            <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
              Chi phí sử dụng API & hoàn tiền • {refundCount} lần chi
            </div>
          </div>
        </div>

        {/* Card 3: Giao dịch */}
        <div style={{ background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "16px 20px", display: "flex", alignItems: "center", gap: "14px", boxShadow: "0 1px 4px rgba(0,0,0,0.03)" }}>
          <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Receipt size={22} />
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 650 }}>Giao dịch</div>
            <div style={{ fontSize: "19px", fontWeight: 850, color: "#0f172a", marginTop: "2px" }}>
              {activeTransactions.length}
            </div>
            <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
              Bản ghi gần nhất đã ghi nhận
            </div>
          </div>
        </div>

      </div>

      {/* 4. TRANSACTION HISTORY TABLE CARD */}
      <div style={{ background: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", overflow: "hidden" }}>
        
        {/* Table Top Bar */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h3 style={{ fontSize: "15.5px", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                Lịch sử giao dịch ví & dòng tiền
              </h3>
              <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#ea580c", background: "#fff7ed", border: "1px solid #fed7aa", padding: "2px 8px", borderRadius: "10px" }}>
                {filteredTransactions.length} bản ghi
              </span>
            </div>
            <p style={{ fontSize: "12px", color: "#64748b", margin: "2px 0 0" }}>
              Theo dõi biến động số dư, tiền nạp bản quyền, gia hạn SePay/Thủ công và chi phí API.
            </p>
          </div>

          {/* Search and Filters Toolbar */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            
            {/* Search Input */}
            <div style={{ position: "relative", minWidth: "220px" }}>
              <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
              <input
                type="text"
                placeholder="Tìm khách hàng, key, ghi chú..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  width: "100%",
                  padding: "6px 10px 6px 30px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontSize: "12.5px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                padding: "6px 10px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "12.5px",
                fontWeight: 600,
                color: "#334155",
                outline: "none",
                background: "#ffffff",
              }}
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
              style={{
                padding: "6px 10px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "12.5px",
                fontWeight: 600,
                color: "#334155",
                outline: "none",
                background: "#ffffff",
              }}
            >
              <option value="all">🏦 Tất cả phương thức</option>
              <option value="sepay">VietQR (SePay Auto)</option>
              <option value="bank_transfer">Chuyển khoản</option>
              <option value="momo">Ví MoMo</option>
              <option value="cash">Tiền mặt</option>
            </select>

          </div>
        </div>

        {/* Table Body */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "12.5px" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569", fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                <th style={{ padding: "10px 14px" }}>LOẠI</th>
                <th style={{ padding: "10px 14px" }}>SỐ TIỀN</th>
                <th style={{ padding: "10px 14px" }}>KHÁCH HÀNG / BẢN QUYỀN</th>
                <th style={{ padding: "10px 14px" }}>NỘI DUNG GIAO DỊCH</th>
                <th style={{ padding: "10px 14px" }}>PHƯƠNG THỨC</th>
                <th style={{ padding: "10px 14px" }}>NGƯỜI THỰC HIỆN</th>
                <th style={{ padding: "10px 14px" }}>THỜI GIAN</th>
                <th style={{ padding: "10px 14px", textAlign: "right" }}>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8" }}>
                    <Receipt size={36} color="#cbd5e1" style={{ margin: "0 auto 8px" }} />
                    <div style={{ fontSize: "13.5px", fontWeight: 700, color: "#475569" }}>Chưa có giao dịch dòng tiền nào</div>
                    <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "3px" }}>
                      Khi bạn tạo người dùng, gia hạn hoặc khách nạp qua SePay, giao dịch sẽ tự động xuất hiện tại đây.
                    </div>
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
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        transition: "background 0.15s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#fafafa")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      {/* 1. LOẠI */}
                      <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                        {isNegative ? (
                          <span style={{ fontSize: "11px", fontWeight: 800, color: "#e11d48", background: "#fff1f2", border: "1px solid #fecdd3", padding: "3px 8px", borderRadius: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <ArrowUpRight size={11} /> HOÀN TIỀN
                          </span>
                        ) : isRenewal ? (
                          <span style={{ fontSize: "11px", fontWeight: 800, color: "#16a34a", background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "3px 8px", borderRadius: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <RefreshCw size={11} /> GIA HẠN
                          </span>
                        ) : isNewKey ? (
                          <span style={{ fontSize: "11px", fontWeight: 800, color: "#ea580c", background: "#fff7ed", border: "1px solid #fed7aa", padding: "3px 8px", borderRadius: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <Sparkles size={11} /> CẤP KEY MỚI
                          </span>
                        ) : (
                          <span style={{ fontSize: "11px", fontWeight: 800, color: "#0284c7", background: "#f0f9ff", border: "1px solid #bae6fd", padding: "3px 8px", borderRadius: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <ArrowDownLeft size={11} /> NẠP TIỀN
                          </span>
                        )}
                      </td>

                      {/* 2. SỐ TIỀN */}
                      <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                        <strong style={{ fontSize: "13.5px", fontWeight: 800, color: isNegative ? "#e11d48" : "#059669" }}>
                          {isNegative ? `-${formatCurrency(Math.abs(tx.amount))}` : `+${formatCurrency(tx.amount)}`}
                        </strong>
                      </td>

                      {/* 3. KHÁCH HÀNG */}
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ fontWeight: 750, color: "#0f172a" }}>
                          {tx.customer_name || "Khách hàng"}
                        </div>
                        {tx.plan_name && (
                          <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                            {tx.plan_name}
                          </div>
                        )}
                      </td>

                      {/* 4. NỘI DUNG GIAO DỊCH */}
                      <td style={{ padding: "12px 14px", maxWidth: "260px" }}>
                        <div style={{ fontSize: "12px", color: "#334155", lineHeight: 1.4, wordBreak: "break-word" }}>
                          {tx.notes || "Giao dịch bản quyền phần mềm"}
                        </div>
                        {tx.reference_code && (
                          <span style={{ fontSize: "10.5px", fontFamily: "monospace", color: "#0284c7", background: "#f0f9ff", padding: "1px 5px", borderRadius: "4px", border: "1px solid #e0f2fe", display: "inline-block", marginTop: "3px" }}>
                            Ref: {tx.reference_code}
                          </span>
                        )}
                      </td>

                      {/* 5. PHƯƠNG THỨC */}
                      <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                        {isSePay ? (
                          <span style={{ fontSize: "11.5px", fontWeight: 750, color: "#0284c7", background: "#f0f9ff", border: "1px solid #bae6fd", padding: "2px 7px", borderRadius: "6px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <Building2 size={12} /> VietQR (SePay Auto)
                          </span>
                        ) : (
                          <span style={{ fontSize: "11.5px", fontWeight: 650, color: "#475569", background: "#f8fafc", border: "1px solid #e2e8f0", padding: "2px 7px", borderRadius: "6px" }}>
                            {(tx.payment_method || "bank_transfer").toUpperCase()}
                          </span>
                        )}
                      </td>

                      {/* 6. NGƯỜI THỰC HIỆN */}
                      <td style={{ padding: "12px 14px", whiteSpace: "nowrap", fontSize: "11.5px", color: "#64748b" }}>
                        {tx.actor || "system"}
                      </td>

                      {/* 7. THỜI GIAN */}
                      <td style={{ padding: "12px 14px", whiteSpace: "nowrap", fontSize: "11.5px", color: "#475569" }}>
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
                      <td style={{ padding: "12px 14px", textAlign: "right" }}>
                        <button
                          type="button"
                          onClick={() => handleDeleteTransaction(tx)}
                          title="Xóa giao dịch này"
                          style={{
                            background: "#fff1f2",
                            border: "1px solid #fecdd3",
                            color: "#f43f5e",
                            padding: "4px 8px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                          }}
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

        {/* Table Pagination Footer */}
        <div style={{ padding: "12px 18px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
          <div style={{ fontSize: "12px", color: "#64748b" }}>
            Hiển thị <strong>{filteredTransactions.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</strong> -{" "}
            <strong>{Math.min(currentPage * pageSize, filteredTransactions.length)}</strong> trong tổng số{" "}
            <strong>{filteredTransactions.length}</strong> giao dịch
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              style={{
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                padding: "4px 8px",
                borderRadius: "6px",
                fontSize: "12px",
                cursor: currentPage <= 1 ? "not-allowed" : "pointer",
                opacity: currentPage <= 1 ? 0.5 : 1,
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              <ChevronLeft size={14} /> Trước
            </button>

            <span style={{ fontSize: "12px", fontWeight: 700, color: "#334155", padding: "0 4px" }}>
              Trang {currentPage} / {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              style={{
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                padding: "4px 8px",
                borderRadius: "6px",
                fontSize: "12px",
                cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
                opacity: currentPage >= totalPages ? 0.5 : 1,
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              Sau <ChevronRight size={14} />
            </button>

            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value) || 10);
                setCurrentPage(1);
              }}
              style={{
                marginLeft: "8px",
                padding: "4px 8px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "12px",
                outline: "none",
                background: "#ffffff",
              }}
            >
              <option value={10}>10 dòng / trang</option>
              <option value={20}>20 dòng / trang</option>
              <option value={50}>50 dòng / trang</option>
              <option value={100}>100 dòng / trang</option>
            </select>
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
