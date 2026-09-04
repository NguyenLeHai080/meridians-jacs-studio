import React, { useState, useEffect, useCallback } from "react";
import { CreditCard, Building2 } from "lucide-react";
import type { BillingTransaction, BillingSummary, BankConfig } from "../../../core/types";
import { useBilling } from "../hooks/useBilling";
import { BillingKpiGrid } from "../components/BillingKpiGrid";
import { CashflowTable } from "../components/CashflowTable";
import { BankCardGrid } from "../components/BankCardGrid";
import { BankConfigForm } from "../components/BankConfigForm";
import { SepayWebhookBox } from "../components/SepayWebhookBox";
import { AddTransactionModal } from "./modal/AddTransactionModal";
import { RefundModal } from "./modal/RefundModal";
import { billingService } from "../services/billingService";
import { useI18n } from "../../../core/i18n";
import "../lang"; // Auto-registers billing translation

interface BillingPageProps {
  transactions?: BillingTransaction[];
  billingSummary?: BillingSummary | null;
  bankConfig?: BankConfig;
  setBankConfig?: (cfg: BankConfig) => void;
  billingTab?: "transactions" | "bank_config";
  setBillingTab?: (tab: "transactions" | "bank_config") => void;
  initialTab?: "transactions" | "bank_config";
  onRefresh?: () => Promise<void>;
  setMessage?: (msg: string) => void;
  setError?: (err: string) => void;
  searchTerm?: string;
  onNotify?: (msg: string, type?: "success" | "error") => void;
}

export const BillingPage: React.FC<BillingPageProps> = ({
  transactions: propTransactions,
  billingSummary: propBillingSummary,
  bankConfig: propBankConfig,
  setBankConfig: propSetBankConfig,
  billingTab: propBillingTab,
  setBillingTab: propSetBillingTab,
  initialTab = "transactions",
  onRefresh: propOnRefresh,
  setMessage: propSetMessage,
  setError: propSetError,
  searchTerm: _searchTerm,
  onNotify,
}) => {
  const { t } = useI18n();

  const [localTransactions, setLocalTransactions] = useState<BillingTransaction[]>(propTransactions || []);
  const [localSummary, setLocalSummary] = useState<BillingSummary | null>(propBillingSummary || null);
  const [localBankConfig, setLocalBankConfig] = useState<BankConfig>(
    propBankConfig || {
      bank_name: "VietinBank",
      bank_bin: "970415",
      account_number: "109873538727",
      account_name: "NGUYEN LE HAI",
      qr_template: "compact2",
      plans_pricing: {
        "1_month": 500000,
        "3_months": 1350000,
        "6_months": 2500000,
        "1_year": 4500000,
        "lifetime": 10000000,
      },
    }
  );

  const [internalTab, setInternalTab] = useState<"transactions" | "bank_config">(initialTab);
  const currentTab = propBillingTab || internalTab;
  const setTab = propSetBillingTab || setInternalTab;

  const activeTransactions = propTransactions || localTransactions;
  const activeSummary = propBillingSummary !== undefined ? propBillingSummary : localSummary;
  const activeBankConfig = propBankConfig || localBankConfig;

  const fetchBillingData = useCallback(async () => {
    try {
      const [txs, sum, cfg] = await Promise.allSettled([
        billingService.getTransactions(),
        billingService.getSummary(),
        billingService.getBankConfig(),
      ]);
      if (txs.status === "fulfilled") setLocalTransactions(txs.value);
      if (sum.status === "fulfilled") setLocalSummary(sum.value);
      if (cfg.status === "fulfilled") setLocalBankConfig(cfg.value);
    } catch {
      // Handled
    }
  }, []);

  useEffect(() => {
    if (!propTransactions || propBillingSummary === undefined || !propBankConfig) {
      fetchBillingData();
    }
  }, [propTransactions, propBillingSummary, propBankConfig, fetchBillingData]);

  const notify = (msg: string, type: "success" | "error" = "success") => {
    if (onNotify) onNotify(msg, type);
    else if (type === "error" && propSetError) propSetError(msg);
    else if (propSetMessage) propSetMessage(msg);
  };

  const updateBankConfig = (next: BankConfig) => {
    if (propSetBankConfig) propSetBankConfig(next);
    else setLocalBankConfig(next);
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

  const [showAddModal, setShowAddModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);

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
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Top Sub-tabs */}
      <div style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid var(--border-light)", paddingBottom: "0.5rem" }}>
        <button
          type="button"
          onClick={() => setTab("transactions")}
          className={`btn-white-outline ${currentTab === "transactions" ? "active" : ""}`}
          style={{
            background: currentTab === "transactions" ? "var(--primary)" : "transparent",
            color: currentTab === "transactions" ? "#fff" : "var(--text-dark)",
            borderColor: currentTab === "transactions" ? "var(--primary)" : "var(--border-light)",
            fontWeight: 700,
          }}
        >
          <CreditCard size={15} /> {t("tabCashflow")}
        </button>
        <button
          type="button"
          onClick={() => setTab("bank_config")}
          className={`btn-white-outline ${currentTab === "bank_config" ? "active" : ""}`}
          style={{
            background: currentTab === "bank_config" ? "var(--primary)" : "transparent",
            color: currentTab === "bank_config" ? "#fff" : "var(--text-dark)",
            borderColor: currentTab === "bank_config" ? "var(--primary)" : "var(--border-light)",
            fontWeight: 700,
          }}
        >
          <Building2 size={15} /> {t("tabBankConfig")}
        </button>
      </div>

      {currentTab === "transactions" ? (
        <>
          <BillingKpiGrid
            netRevenue={netRevenue}
            totalDeposits={totalDeposits}
            totalRefunds={totalRefunds}
            thisMonthRevenue={thisMonthRevenue}
            depositCount={depositCount}
            refundCount={refundCount}
          />

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
        </>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Two-column Bank Cards Grid */}
          <BankCardGrid
            bankConfig={activeBankConfig}
            onEditBank={() => {
              const el = document.getElementById("bank-config-form-section");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
            onDeleteBank={() => {
              if (confirm("Bạn có chắc muốn xóa thông tin tài khoản này?")) {
                const updated = {
                  ...activeBankConfig,
                  account_number: "",
                  account_name: "",
                };
                updateBankConfig(updated);
                notify("Đã xóa thông tin tài khoản", "success");
              }
            }}
          />

          {/* Form & SePay Webhook */}
          <div id="bank-config-form-section" className="mf-two-col-grid">
            <BankConfigForm
              bankConfig={activeBankConfig}
              setBankConfig={updateBankConfig}
              onSuccess={(msg) => notify(msg, "success")}
              onError={(err) => notify(err, "error")}
            />

            <SepayWebhookBox
              bankConfig={activeBankConfig}
              onCopySuccess={(msg) => notify(msg, "success")}
            />
          </div>
        </div>
      )}

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
