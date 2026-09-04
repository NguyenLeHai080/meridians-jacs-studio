import React, { useState, useEffect, useCallback } from "react";
import { Building2, Plus, RefreshCw, ShieldCheck, CreditCard, CheckCircle2, AlertCircle } from "lucide-react";
import type { BankConfig, BankAccount } from "../../../core/types";
import { BankCardGrid } from "../components/BankCardGrid";
import { PricingPlansCard } from "../components/PricingPlansCard";
import { SepayWebhookBox } from "../components/SepayWebhookBox";
import { BankModal } from "./modal/BankModal";
import { BankQrViewModal } from "./modal/BankQrViewModal";
import { billingService } from "../services/billingService";
import { Button } from "../../../components/common";
import { useI18n } from "../../../core/i18n";
import "../lang";

interface BankConfigPageProps {
  bankConfig?: BankConfig;
  setBankConfig?: (cfg: BankConfig) => void;
  onRefresh?: () => Promise<void>;
  searchTerm?: string;
  onNotify?: (msg: string, type?: "success" | "error") => void;
}

export const BankConfigPage: React.FC<BankConfigPageProps> = ({
  bankConfig: propBankConfig,
  setBankConfig: propSetBankConfig,
  onRefresh: propOnRefresh,
  searchTerm: _searchTerm,
  onNotify,
}) => {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
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

  // Modals state
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrViewingAccount, setQrViewingAccount] = useState<BankAccount | null>(null);

  const activeBankConfig = propBankConfig || localBankConfig;

  const notify = (msg: string, type: "success" | "error" = "success") => {
    if (onNotify) onNotify(msg, type);
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [accounts, cfg] = await Promise.all([
        billingService.getBankAccounts(),
        billingService.getBankConfig(),
      ]);
      if (accounts) setBankAccounts(accounts);
      if (cfg) {
        setLocalBankConfig(cfg);
        if (propSetBankConfig) propSetBankConfig(cfg);
      }
    } catch (err: any) {
      notify(err instanceof Error ? err.message : "Lỗi nạp dữ liệu ngân hàng", "error");
    } finally {
      setLoading(false);
    }
  }, [propSetBankConfig]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    if (propOnRefresh) await propOnRefresh();
    await loadData();
    notify("Đã làm mới dữ liệu ngân hàng & VietQR", "success");
  };

  // Bank Account Actions
  const handleAddNew = () => {
    setEditingAccount(null);
    setIsBankModalOpen(true);
  };

  const handleEdit = (account: BankAccount) => {
    setEditingAccount(account);
    setIsBankModalOpen(true);
  };

  const handleDelete = async (account: BankAccount) => {
    if (confirm(`Bạn có chắc chắn muốn xóa tài khoản ${account.bank_name} - ${account.account_number}?`)) {
      try {
        await billingService.deleteBankAccount(account.id);
        notify(`Đã xóa tài khoản ${account.account_number} thành công`, "success");
        await loadData();
      } catch (err: any) {
        notify(err instanceof Error ? err.message : "Lỗi khi xóa tài khoản", "error");
      }
    }
  };

  const handleSetDefault = async (account: BankAccount) => {
    try {
      await billingService.setDefaultBankAccount(account.id);
      notify(`Đã đặt tài khoản ${account.bank_name} làm mặc định nhận tiền`, "success");
      await loadData();
    } catch (err: any) {
      notify(err instanceof Error ? err.message : "Lỗi đặt tài khoản mặc định", "error");
    }
  };

  const handleToggleStatus = async (account: BankAccount) => {
    try {
      const updated = await billingService.toggleBankAccountStatus(account.id);
      notify(
        `Đã ${updated.is_active ? "kích hoạt" : "tạm dừng"} tài khoản ${account.account_number}`,
        "success"
      );
      await loadData();
    } catch (err: any) {
      notify(err instanceof Error ? err.message : "Lỗi đổi trạng thái tài khoản", "error");
    }
  };

  const handleViewQr = (account: BankAccount) => {
    setQrViewingAccount(account);
    setIsQrModalOpen(true);
  };

  // KPIs
  const totalAccounts = bankAccounts.length;
  const activeAccounts = bankAccounts.filter((a) => a.is_active).length;
  const defaultAccount = bankAccounts.find((a) => a.is_default) || bankAccounts[0];

  return (
    <div className="view-container animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Page Header */}
      <div className="view-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <Building2 size={24} style={{ color: "var(--primary)" }} />
            <h1 className="view-title">{t("bankConfigTitle", "Cấu Hình Ngân Hàng & VietQR")}</h1>
          </div>
          <p className="view-subtitle">
            Quản lý danh sách tài khoản ngân hàng thụ hưởng, mã VietQR tự động và kết nối SePay Webhook
          </p>
        </div>
        <div className="view-actions" style={{ display: "flex", gap: "0.5rem" }}>
          <Button
            variant="secondary"
            onClick={handleRefresh}
            loading={loading}
            icon={<RefreshCw size={15} />}
          >
            Làm mới
          </Button>
          <Button
            variant="primary"
            onClick={handleAddNew}
            icon={<Plus size={16} />}
          >
            Thêm Tài Khoản Mới
          </Button>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="billing-kpi-grid">
        <div className="billing-kpi-card">
          <div className="billing-kpi-header">
            <span className="billing-kpi-label">Tổng Tài Khoản</span>
            <div className="billing-kpi-icon" style={{ background: "rgba(59, 130, 246, 0.1)", color: "#3b82f6" }}>
              <CreditCard size={18} />
            </div>
          </div>
          <div className="billing-kpi-value">{totalAccounts}</div>
          <div className="billing-kpi-subtext" style={{ color: "#3b82f6" }}>
            {activeAccounts} tài khoản đang nhận tiền
          </div>
        </div>

        <div className="billing-kpi-card">
          <div className="billing-kpi-header">
            <span className="billing-kpi-label">Tài Khoản Mặc Định (Default)</span>
            <div className="billing-kpi-icon" style={{ background: "rgba(255, 107, 0, 0.1)", color: "var(--primary)" }}>
              <Building2 size={18} />
            </div>
          </div>
          <div className="billing-kpi-value" style={{ fontSize: "1.1rem" }}>
            {defaultAccount ? defaultAccount.bank_short || defaultAccount.bank_name.split("(")[0].trim() : "Chưa đặt"}
          </div>
          <div className="billing-kpi-subtext">
            {defaultAccount ? `STK: ${defaultAccount.account_number} (${defaultAccount.account_name})` : "Nhấn 'Đặt mặc định'"}
          </div>
        </div>

        <div className="billing-kpi-card">
          <div className="billing-kpi-header">
            <span className="billing-kpi-label">Cổng Webhook SePay</span>
            <div className="billing-kpi-icon" style={{ background: activeBankConfig.sepay_api_key ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)", color: activeBankConfig.sepay_api_key ? "#10b981" : "#f59e0b" }}>
              <ShieldCheck size={18} />
            </div>
          </div>
          <div className="billing-kpi-value" style={{ fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            {activeBankConfig.sepay_api_key ? (
              <>
                <CheckCircle2 size={18} style={{ color: "#10b981" }} /> Đã Kết Nối API Key
              </>
            ) : (
              <>
                <AlertCircle size={18} style={{ color: "#f59e0b" }} /> Sẵn Sàng (Chưa nhập Key)
              </>
            )}
          </div>
          <div className="billing-kpi-subtext">
            Tự động kích hoạt khi có biến động số dư
          </div>
        </div>
      </div>

      {/* Dynamic Bank Cards Grid (Full Multi-Account CRUD) */}
      <BankCardGrid
        bankAccounts={bankAccounts}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onSetDefault={handleSetDefault}
        onToggleStatus={handleToggleStatus}
        onViewQr={handleViewQr}
        onAddNew={handleAddNew}
        onNotify={notify}
      />

      {/* Two-Column Section: Pricing Plans & SePay Webhook */}
      <div className="mf-two-col-grid" style={{ marginTop: "0.5rem" }}>
        <PricingPlansCard
          bankConfig={activeBankConfig}
          onUpdate={(updated) => {
            setLocalBankConfig(updated);
            if (propSetBankConfig) propSetBankConfig(updated);
          }}
          onNotify={notify}
        />

        <SepayWebhookBox
          bankConfig={activeBankConfig}
          onUpdateConfig={(updated) => {
            setLocalBankConfig(updated);
            if (propSetBankConfig) propSetBankConfig(updated);
          }}
          onCopySuccess={(msg) => notify(msg, "success")}
        />
      </div>

      {/* Modals */}
      <BankModal
        isOpen={isBankModalOpen}
        initialData={editingAccount}
        onClose={() => setIsBankModalOpen(false)}
        onSuccess={async (msg) => {
          notify(msg, "success");
          await loadData();
        }}
      />

      <BankQrViewModal
        isOpen={isQrModalOpen}
        bankAccount={qrViewingAccount}
        onClose={() => setIsQrModalOpen(false)}
        onNotify={(msg) => notify(msg, "success")}
      />
    </div>
  );
};
