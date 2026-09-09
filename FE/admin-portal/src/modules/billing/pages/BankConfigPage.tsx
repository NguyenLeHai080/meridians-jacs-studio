import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Building2,
  Plus,
  RefreshCw,
  ShieldCheck,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Home,
  ChevronRight,
  Zap,
} from "lucide-react";
import type { BankConfig, BankAccount } from "../../../core/types";
import { BankCardGrid } from "../components/BankCardGrid";
import { PricingPlansCard } from "../components/PricingPlansCard";
import { SepayWebhookBox } from "../components/SepayWebhookBox";
import { BankModal } from "./modal/BankModal";
import { BankQrViewModal } from "./modal/BankQrViewModal";
import { billingService } from "../services/billingService";
import { confirmDialog, showToast } from "../../../core/swal";
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

  const onNotifyRef = useRef(onNotify);
  useEffect(() => {
    onNotifyRef.current = onNotify;
  }, [onNotify]);

  const notify = useCallback((msg: string, type: "success" | "error" = "success") => {
    showToast(msg, type);
    if (onNotifyRef.current) onNotifyRef.current(msg, type);
  }, []);

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
  }, [propSetBankConfig, notify]);

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
    const confirmed = await confirmDialog({
      title: "Xác nhận xóa tài khoản ngân hàng?",
      html: `<div style="text-align: left; font-size: 13.5px; color: #475569; line-height: 1.6;">
        <p>Bạn có chắc muốn xóa tài khoản <b>${account.bank_name}</b> (STK: <code>${account.account_number}</code>)?</p>
      </div>`,
      icon: "warning",
      confirmButtonText: "Xóa tài khoản",
      cancelButtonText: "Hủy bỏ",
      isDestructive: true,
    });
    if (!confirmed) return;

    try {
      await billingService.deleteBankAccount(account.id);
      notify(`Đã xóa tài khoản ${account.account_number} thành công`, "success");
      await loadData();
    } catch (err: any) {
      notify(err instanceof Error ? err.message : "Lỗi khi xóa tài khoản", "error");
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
              Ngân Hàng & VietQR
            </span>
          </nav>

          {/* Title and Subtitle */}
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-orange-500 via-amber-600 to-orange-600 flex items-center justify-center text-white shadow-md shadow-orange-500/20 shrink-0">
              <Building2 size={22} className="stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight m-0">
                  Cấu Hình Ngân Hàng & VietQR Thanh Toán
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>VietQR Instant & SePay Auto</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Quản lý danh sách tài khoản ngân hàng nhận tiền nạp tự động qua SePay, tạo mã QR động và bảng giá gói gia hạn.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0 self-start md:self-center flex-wrap sm:flex-nowrap">
          <button
            type="button"
            onClick={handleAddNew}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl shadow-sm transition-all active:scale-95"
          >
            <Plus size={15} />
            <span>Thêm tài khoản mới</span>
          </button>

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

      {/* 2. 3 KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Total Accounts */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-blue-300 transition-all duration-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Tổng Tài Khoản
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <CreditCard size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {totalAccounts}{" "}
            <span className="text-xs font-semibold text-slate-400">tài khoản</span>
          </div>
          <div className="text-[11px] text-blue-600 font-semibold mt-1">
            {activeAccounts} tài khoản đang nhận tiền
          </div>
        </div>

        {/* Card 2: Default Account */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-orange-300 transition-all duration-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Tài Khoản Mặc Định
            </span>
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <Building2 size={16} />
            </div>
          </div>
          <div className="text-lg font-black text-slate-900 truncate">
            {defaultAccount ? defaultAccount.bank_short || defaultAccount.bank_name.split("(")[0].trim() : "Chưa đặt"}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 truncate">
            {defaultAccount ? `STK: ${defaultAccount.account_number} (${defaultAccount.account_name})` : "Nhấn 'Đặt mặc định'"}
          </div>
        </div>

        {/* Card 3: SePay Webhook Status */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-all duration-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Cổng Webhook SePay
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${activeBankConfig.sepay_api_key ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
              <ShieldCheck size={16} />
            </div>
          </div>
          <div className="text-lg font-black flex items-center gap-1.5">
            {activeBankConfig.sepay_api_key ? (
              <span className="text-emerald-600 flex items-center gap-1.5">
                <CheckCircle2 size={18} /> Đã Kết Nối API Key
              </span>
            ) : (
              <span className="text-amber-600 flex items-center gap-1.5">
                <AlertCircle size={18} /> Sẵn Sàng (Chưa nhập Key)
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Tự động kích hoạt khi có biến động số dư
          </div>
        </div>
      </div>

      {/* 3. Bank Cards Grid */}
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

      {/* 4. Two-Column Grid: Pricing Plans & SePay Webhook */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
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

      {/* 5. Modals */}
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

export default BankConfigPage;
