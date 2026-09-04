import React, { useState, useEffect } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { BankConfig } from "../../../core/types";
import { DEFAULT_PLANS, PlanItem } from "../utils/planHelper";
import { usePlans } from "../hooks/usePlans";
import { PlanEditModal } from "./modal/PlanEditModal";
import { planService } from "../services/planService";
import { billingService } from "../../billing/services/billingService";
import { formatCurrency } from "../../billing/utils/currencyHelper";
import { DataTable, StatusBadge, FilterSelect, Button, Column } from "../../../components/common";
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
      billingService
        .getBankConfig()
        .then((cfg) => {
          setLocalBankConfig(cfg);
        })
        .catch(() => {});
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

  const columns: Column<PlanItem>[] = [
    {
      key: "name",
      header: t("thPlanName"),
      render: (plan) => (
        <div>
          <strong>{plan.name}</strong>
          <div style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>ID: {plan.id}</div>
        </div>
      ),
    },
    {
      key: "duration",
      header: t("thDuration"),
      render: (plan) => (
        <span>
          {plan.days} {t("daysSuffix")}
        </span>
      ),
    },
    {
      key: "price",
      header: t("thPrice"),
      render: (plan) => (
        <strong style={{ color: "var(--primary)" }}>{formatCurrency(plan.price)}</strong>
      ),
    },
    {
      key: "renderLimit",
      header: t("thRenderLimit"),
      render: (plan) => (
        <span>
          {plan.max_jobs_per_day} {t("jobsPerDay")}
        </span>
      ),
    },
    {
      key: "discount",
      header: t("thDiscount"),
      render: (plan) => <span>{plan.discount_percent ? `${plan.discount_percent}%` : "--"}</span>,
    },
    {
      key: "status",
      header: t("thStatus"),
      render: (plan) => (
        <StatusBadge
          status={plan.active !== false ? "active" : "danger"}
          label={plan.active !== false ? t("badgeActive") : t("badgeHidden")}
        />
      ),
    },
    {
      key: "actions",
      header: t("thActions"),
      align: "right",
      render: (plan) => (
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
      ),
    },
  ];

  return (
    <>
      <DataTable
        title={t("plansTitle")}
        subtitle={t("plansSubtitle")}
        headerActions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setEditingPlan(null);
              setIsModalOpen(true);
            }}
            icon={<Plus size={15} />}
          >
            {t("addPlanBtn")}
          </Button>
        }
        search={{
          value: searchTerm,
          onChange: setSearchTerm,
          placeholder: t("searchPlaceholder"),
        }}
        filters={
          <FilterSelect
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: "all", label: t("filterAll") },
              { value: "active", label: t("filterActive") },
              { value: "hidden", label: t("filterHidden") },
            ]}
          />
        }
        columns={columns}
        data={filteredPlans}
      />

      <PlanEditModal
        plan={editingPlan}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSavePlan}
      />
    </>
  );
};
