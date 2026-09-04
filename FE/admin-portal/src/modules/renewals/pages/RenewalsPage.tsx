import React, { useState, useEffect, useCallback } from "react";
import { RotateCw, Check } from "lucide-react";
import type { License, BillingTransaction, BankConfig } from "../../../core/types";
import { DEFAULT_PLANS, PlanItem } from "../../plans/utils/planHelper";
import { useRenewals } from "../hooks/useRenewals";
import { renewalService } from "../services/renewalService";
import { licenseService } from "../../licenses/services/licenseService";
import { billingService } from "../../billing/services/billingService";
import { formatCurrency } from "../../billing/utils/currencyHelper";
import { Table, StatusBadge, Pagination } from "../../../components/common";
import { useI18n } from "../../../core/i18n";
import "../lang"; // Auto-registers renewals translation


interface RenewalsPageProps {
  licenses?: License[];
  transactions?: BillingTransaction[];
  plansList?: PlanItem[];
  bankConfig?: BankConfig;
  onRefresh?: () => Promise<void>;
  setMessage?: (msg: string) => void;
  setError?: (err: string) => void;
  searchTerm?: string;
  onNotify?: (msg: string, type?: "success" | "error") => void;
}

export const RenewalsPage: React.FC<RenewalsPageProps> = ({
  licenses: propLicenses,
  transactions: propTransactions,
  plansList: propPlansList,
  bankConfig: propBankConfig,
  onRefresh: propOnRefresh,
  setMessage: propSetMessage,
  setError: propSetError,
  searchTerm: _searchTerm,
  onNotify,
}) => {
  const { t, language } = useI18n();

  const [localLicenses, setLocalLicenses] = useState<License[]>(propLicenses || []);
  const [localTransactions, setLocalTransactions] = useState<BillingTransaction[]>(propTransactions || []);
  const [localBankConfig, setLocalBankConfig] = useState<BankConfig>(
    propBankConfig || {
      bank_name: "MB Bank",
      bank_bin: "970422",
      account_number: "0988888888",
      account_name: "JACS STUDIO",
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

  const activeLicenses = propLicenses || localLicenses;
  const activeTransactions = propTransactions || localTransactions;
  const activeBankConfig = propBankConfig || localBankConfig;
  const activePlansList = propPlansList || DEFAULT_PLANS;

  const fetchData = useCallback(async () => {
    try {
      const [lics, txs, cfg] = await Promise.allSettled([
        licenseService.getLicenses(),
        billingService.getTransactions(),
        billingService.getBankConfig(),
      ]);
      if (lics.status === "fulfilled") setLocalLicenses(lics.value);
      if (txs.status === "fulfilled") setLocalTransactions(txs.value);
      if (cfg.status === "fulfilled") setLocalBankConfig(cfg.value);
    } catch {
      // Handled
    }
  }, []);

  useEffect(() => {
    if (!propLicenses || !propTransactions) {
      fetchData();
    }
  }, [propLicenses, propTransactions, fetchData]);

  const notify = (msg: string, type: "success" | "error" = "success") => {
    if (onNotify) onNotify(msg, type);
    else if (type === "error" && propSetError) propSetError(msg);
    else if (propSetMessage) propSetMessage(msg);
  };

  const {
    renewalTransactions,
    selectedLicenseId,
    setSelectedLicenseId,
    selectedPlanKey,
    setSelectedPlanKey,
    customDays,
    setCustomDays,
    customAmount,
    setCustomAmount,
  } = useRenewals(activeTransactions);

  const [isProcessing, setIsProcessing] = useState(false);

  const handleExecuteRenewal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLicenseId) {
      notify("Vui lòng chọn License Key cần gia hạn", "error");
      return;
    }
    setIsProcessing(true);

    try {
      const selectedPlan = activePlansList.find((p) => p.id === selectedPlanKey);
      const days = selectedPlan ? selectedPlan.days : parseInt(customDays) || 30;
      const amount = selectedPlan
        ? activeBankConfig.plans_pricing?.[selectedPlan.id] || selectedPlan.price
        : parseFloat(customAmount) || 500000;

      const lic = activeLicenses.find((l) => l.id === selectedLicenseId);
      await renewalService.renewLicense({
        license_id: selectedLicenseId,
        days,
        amount,
        plan_type: selectedPlan ? selectedPlan.name : `Gia hạn ${days} ngày`,
        reason: `Gia hạn thủ công qua Admin Portal cho ${lic?.customer_name || selectedLicenseId}`,
      });

      notify(`Đã gia hạn thành công ${days} ngày cho ${lic?.customer_name || selectedLicenseId}`, "success");
      if (propOnRefresh) {
        await propOnRefresh();
      } else {
        await fetchData();
      }
    } catch (err: any) {
      notify(err instanceof Error ? err.message : "Lỗi khi gia hạn license", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Manual Renewal Action Card */}
      <div className="mf-card-panel">
        <div className="mf-card-header">
          <div className="mf-card-title-group">
            <h3>{t("manualRenewalTitle")}</h3>
            <p>{t("manualRenewalSubtitle")}</p>
          </div>
        </div>

        <form onSubmit={handleExecuteRenewal} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="mf-form-two-col">
            <div className="form-group-mf">
              <label className="form-label-mf">{t("selectLicenseLabel")}</label>
              <select
                className="form-input-mf"
                value={selectedLicenseId}
                onChange={(e) => setSelectedLicenseId(e.target.value)}
                required
              >
                <option value="">-- Chọn License Key khách hàng --</option>
                {activeLicenses.map((lic) => (
                  <option key={lic.id} value={lic.id}>
                    {lic.customer_name} ({lic.key_hint}) - Hết hạn:{" "}
                    {lic.expires_at ? new Date(lic.expires_at).toLocaleDateString() : "Vĩnh viễn"}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group-mf">
              <label className="form-label-mf">{t("selectPlanLabel")}</label>
              <select
                className="form-input-mf"
                value={selectedPlanKey}
                onChange={(e) => {
                  setSelectedPlanKey(e.target.value);
                  const plan = activePlansList.find((p) => p.id === e.target.value);
                  if (plan) {
                    setCustomDays(String(plan.days));
                    setCustomAmount(String(activeBankConfig.plans_pricing?.[plan.id] || plan.price));
                  }
                }}
              >
                {activePlansList.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} ({plan.days} ngày -{" "}
                    {formatCurrency(activeBankConfig.plans_pricing?.[plan.id] || plan.price)})
                  </option>
                ))}
                <option value="custom">Gia hạn tùy chỉnh</option>
              </select>
            </div>
          </div>

          {selectedPlanKey === "custom" && (
            <div className="mf-form-two-col">
              <div className="form-group-mf">
                <label className="form-label-mf">{t("customDaysLabel")}</label>
                <input
                  type="number"
                  className="form-input-mf"
                  value={customDays}
                  onChange={(e) => setCustomDays(e.target.value)}
                />
              </div>
              <div className="form-group-mf">
                <label className="form-label-mf">{t("customAmountLabel")}</label>
                <input
                  type="number"
                  className="form-input-mf"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            className="btn-primary-orange"
            disabled={isProcessing}
            style={{ marginTop: "0.5rem", width: "fit-content" }}
          >
            {isProcessing ? <RotateCw size={16} className="animate-spin" /> : <Check size={16} />}
            {t("btnExecuteRenewal")}
          </button>
        </form>
      </div>

      {/* SePay / Renewal Transactions Table */}
      <div className="mf-card-panel">
        <div className="mf-card-header">
          <div className="mf-card-title-group">
            <h3>{t("sepayTransactionsTitle")} ({renewalTransactions.length})</h3>
            <p>{t("sepayTransactionsSubtitle")}</p>
          </div>
        </div>

        <div className="table-responsive">
          <table className="mf-table">
            <thead>
              <tr>
                <th>MÃ GD</th>
                <th>KHÁCH HÀNG</th>
                <th>GÓI</th>
                <th>SỐ TIỀN</th>
                <th>KÊNH</th>
                <th>THỜI GIAN</th>
                <th>TRẠNG THÁI</th>
              </tr>
            </thead>
            <tbody>
              {renewalTransactions.map((tx) => (
                <tr key={tx.id}>
                  <td><span className="code-chip">{tx.id.slice(0, 10)}...</span></td>
                  <td>
                    <strong>{tx.customer_name}</strong>
                    {tx.notes && <div style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>{tx.notes}</div>}
                  </td>
                  <td>{tx.plan_name || tx.plan_type || "Gia hạn"}</td>
                  <td>
                    <strong style={{ color: "var(--success-text)" }}>+{formatCurrency(tx.amount)}</strong>
                  </td>
                  <td>{(tx.payment_method || "bank_transfer").toUpperCase()}</td>
                  <td style={{ fontSize: "0.78rem" }}>
                    {new Date(tx.created_at).toLocaleString(language === "vi" ? "vi-VN" : language === "jp" ? "ja-JP" : "en-US")}
                  </td>
                  <td>
                    <span className="pill-status pill-active" style={{ fontSize: "0.72rem" }}>
                      ● Đã kích hoạt
                    </span>
                  </td>
                </tr>
              ))}
              {renewalTransactions.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                    Chưa có giao dịch gia hạn nào được ghi nhận
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
