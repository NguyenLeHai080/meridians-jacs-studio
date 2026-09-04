import React, { useState, useEffect } from "react";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import type { BankConfig } from "../../../core/types";
import { DEFAULT_PLANS, PlanItem } from "../utils/planHelper";
import { usePlans } from "../hooks/usePlans";
import { PlanEditModal } from "./modal/PlanEditModal";
import { planService } from "../services/planService";
import { billingService } from "../../billing/services/billingService";
import { formatCurrency } from "../../billing/utils/currencyHelper";
import { useI18n } from "../../../core/i18n";
import "../lang"; // Auto-registers plans translation

interface PlansPageProps {
  plansList?: PlanItem[];
  setPlansList?: (plans: PlanItem[]) => void;
  bankConfig?: BankConfig;
  setBankConfig?: (cfg: BankConfig) => void;
  setMessage?: (msg: string) => void;
  setError?: (err: string) => void;
  searchTerm?: string;
  onNotify?: (msg: string, type?: "success" | "error") => void;
}

export const PlansPage: React.FC<PlansPageProps> = ({
  plansList: propPlansList,
  setPlansList: propSetPlansList,
  bankConfig: propBankConfig,
  setBankConfig: propSetBankConfig,
  setMessage: propSetMessage,
  setError: propSetError,
  searchTerm: propSearchTerm = "",
  onNotify,
}) => {
  const { t } = useI18n();

  const notify = (msg: string, type: "success" | "error" = "success") => {
    if (onNotify) onNotify(msg, type);
    else if (type === "error" && propSetError) propSetError(msg);
    else if (propSetMessage) propSetMessage(msg);
  };

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

  const activeBankConfig = propBankConfig || localBankConfig;

  useEffect(() => {
    if (!propBankConfig) {
      billingService.getBankConfig().then((cfg) => {
        setLocalBankConfig(cfg);
      }).catch(() => {});
    }
  }, [propBankConfig]);

  const {
    plans,
    setPlans,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    filteredPlans,
  } = usePlans(propPlansList || DEFAULT_PLANS);

  useEffect(() => {
    if (propSearchTerm) {
      setSearchTerm(propSearchTerm);
    }
  }, [propSearchTerm, setSearchTerm]);

  const [editingPlan, setEditingPlan] = useState<PlanItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSavePlan = async (plan: PlanItem) => {
    const nextPricing = { ...activeBankConfig.plans_pricing, [plan.id]: plan.price };
    const updatedConfig = { ...activeBankConfig, plans_pricing: nextPricing };

    const existingIdx = plans.findIndex((p) => p.id === plan.id);
    let nextList = [...plans];
    if (existingIdx >= 0) {
      nextList[existingIdx] = { ...plan };
    } else {
      nextList.push({ ...plan });
    }
    setPlans(nextList);
    if (propSetPlansList) propSetPlansList(nextList);

    try {
      await planService.savePlansPricing(updatedConfig);
      if (propSetBankConfig) propSetBankConfig(updatedConfig);
      else setLocalBankConfig(updatedConfig);
      notify(`Đã lưu cấu hình gói ${plan.name} thành công!`, "success");
    } catch (err: any) {
      notify(err instanceof Error ? err.message : "Lỗi khi lưu gói cước", "error");
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm("Bạn có chắc muốn xóa gói cước này khỏi hệ thống?")) return;
    const nextList = plans.filter((p) => p.id !== planId);
    setPlans(nextList);
    if (propSetPlansList) propSetPlansList(nextList);

    const nextPricing = { ...activeBankConfig.plans_pricing };
    delete nextPricing[planId];
    const updatedConfig = { ...activeBankConfig, plans_pricing: nextPricing };

    try {
      await planService.savePlansPricing(updatedConfig);
      if (propSetBankConfig) propSetBankConfig(updatedConfig);
      else setLocalBankConfig(updatedConfig);
      notify("Đã xóa gói cước khỏi hệ thống", "success");
    } catch (err: any) {
      notify(err instanceof Error ? err.message : "Lỗi khi xóa gói cước", "error");
    }
  };

  return (
    <div className="mf-card-panel">
      <div className="mf-card-header">
        <div className="mf-card-title-group">
          <h3>{t("plansTitle")}</h3>
          <p>{t("plansSubtitle")}</p>
        </div>
        <button
          type="button"
          className="btn-primary-orange"
          onClick={() => {
            setEditingPlan(null);
            setIsModalOpen(true);
          }}
        >
          <Plus size={16} /> {t("addPlanBtn")}
        </button>
      </div>

      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
        <div className="table-search-box" style={{ flex: 1, minWidth: "240px" }}>
          <Search size={14} color="#94a3b8" />
          <input
            type="text"
            placeholder={t("searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="form-input-mf"
          style={{ width: "auto", minWidth: "160px" }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">{t("filterAll")}</option>
          <option value="active">{t("filterActive")}</option>
          <option value="hidden">{t("filterHidden")}</option>
        </select>
      </div>

      <div className="table-responsive">
        <table className="mf-table">
          <thead>
            <tr>
              <th>{t("thPlanName")}</th>
              <th>{t("thDuration")}</th>
              <th>{t("thPrice")}</th>
              <th>{t("thRenderLimit")}</th>
              <th>{t("thDiscount")}</th>
              <th>{t("thStatus")}</th>
              <th style={{ textAlign: "right" }}>{t("thActions")}</th>
            </tr>
          </thead>
          <tbody>
            {filteredPlans.map((plan) => (
              <tr key={plan.id}>
                <td>
                  <strong>{plan.name}</strong>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>ID: {plan.id}</div>
                </td>
                <td>{plan.days} {t("daysSuffix")}</td>
                <td>
                  <strong style={{ color: "var(--primary)" }}>{formatCurrency(plan.price)}</strong>
                </td>
                <td>{plan.max_jobs_per_day} {t("jobsPerDay")}</td>
                <td>{plan.discount_percent ? `${plan.discount_percent}%` : "--"}</td>
                <td>
                  <span className={`pill-status ${plan.active !== false ? "pill-active" : "pill-danger"}`}>
                    {plan.active !== false ? t("badgeActive") : t("badgeHidden")}
                  </span>
                </td>
                <td style={{ textAlign: "right" }}>
                  <div className="table-actions-row">
                    <button
                      type="button"
                      className="btn-icon-action action-edit"
                      onClick={() => {
                        setEditingPlan(plan);
                        setIsModalOpen(true);
                      }}
                      title={t("edit")}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      className="btn-icon-action action-delete"
                      onClick={() => handleDeletePlan(plan.id)}
                      title={t("delete")}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PlanEditModal
        plan={editingPlan}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSavePlan}
      />
    </div>
  );
};
