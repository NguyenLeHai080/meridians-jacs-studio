import React, { useState, useEffect, useCallback } from "react";
import { Wallet, RefreshCw, Plus, ArrowDownLeft } from "lucide-react";
import type { BillingTransaction, BillingSummary } from "../../../core/types";
import { useBilling } from "../hooks/useBilling";
import { BillingKpiGrid } from "../components/BillingKpiGrid";
import { CashflowTable } from "../components/CashflowTable";
import { AddTransactionModal } from "./modal/AddTransactionModal";
import { RefundModal } from "./modal/RefundModal";
import { billingService } from "../services/billingService";
import { Button } from "../../../components/common";
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
  searchTerm: _searchTerm,
  onNotify,
}) => {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [localTransactions, setLocalTransactions] = useState<BillingTransaction[]>(propTransactions || []);
  const [localSummary, setLocalSummary] = useState<BillingSummary | null>(propBillingSummary || null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);

  const activeTransactions = propTransactions || localTransactions;
  const activeSummary = propBillingSummary !== undefined ? propBillingSummary : localSummary;

  const fetchBillingData = useCallback(async () => {
    try {
      setLoading(true);
      const [txs, sum] = await Promise.allSettled([
        billingService.getTransactions(),
        billingService.getSummary(),
      ]);
      if (txs.status === "fulfilled") setLocalTransactions(txs.value);
      if (sum.status === "fulfilled") setLocalSummary(sum.value);
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

  const notify = (msg: string, type: "success" | "error" = "success") => {
    if (onNotify) onNotify(msg, type);
    else if (type === "error" && propSetError) propSetError(msg);
    else if (propSetMessage) propSetMessage(msg);
  };

  const {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalPages,
    paginatedTransactions,
    netRevenue,
    totalDeposits,
    totalRefunds,
    thisMonthRevenue,
    depositCount,
    refundCount,
    totalTransactions,
  } = useBilling(activeTransactions, activeSummary);

  const handleRefresh = async () => {
    if (propOnRefresh) await propOnRefresh();
    else await fetchBillingData();
  };

  const handleDeleteTransaction = async (tx: BillingTransaction) => {
    if (!confirm(`Bạn có chắc muốn xóa giao dịch ${tx.id.slice(0, 8)}...?`)) return;
    try {
      await billingService.deleteTransaction(tx.id);
      notify("Đã xóa giao dịch thành công", "success");
      await handleRefresh();
    } catch (err: any) {
      notify(err instanceof Error ? err.message : "Không xóa được giao dịch", "error");
    }
  };

  return (
    <div className="view-container animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Page Header */}
      <div className="view-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <Wallet size={24} style={{ color: "var(--primary)" }} />
            <h1 className="view-title">{t("billingTitle", "Ví & Dòng Tiền (Quản Lý Doanh Thu)")}</h1>
          </div>
          <p className="view-subtitle">
            Theo dõi chi tiết các giao dịch nạp tiền, hoàn tiền, doanh thu thực thu và lịch sử thanh toán license
          </p>
        </div>
        <div className="view-actions">
          <Button
            variant="secondary"
            onClick={() => setShowRefundModal(true)}
            icon={<ArrowDownLeft size={15} />}
          >
            Ghi Nhận Hoàn Tiền
          </Button>
          <Button
            variant="primary"
            onClick={() => setShowAddModal(true)}
            icon={<Plus size={15} />}
          >
            Ghi Nhận Nạp Tiền
          </Button>
          <Button
            variant="secondary"
            onClick={handleRefresh}
            loading={loading}
            icon={<RefreshCw size={15} />}
          >
            Làm mới
          </Button>
        </div>
      </div>

      {/* KPI Stats Summary */}
      <BillingKpiGrid
        netRevenue={netRevenue}
        totalDeposits={totalDeposits}
        totalRefunds={totalRefunds}
        thisMonthRevenue={thisMonthRevenue}
        depositCount={depositCount}
        refundCount={refundCount}
      />

      {/* Cashflow Transactions Table */}
      <CashflowTable
        transactions={paginatedTransactions}
        totalCount={totalTransactions}
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
        onAddDeposit={() => setShowAddModal(true)}
        onAddRefund={() => setShowRefundModal(true)}
        onDeleteTransaction={handleDeleteTransaction}
      />

      {/* Modals */}
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
