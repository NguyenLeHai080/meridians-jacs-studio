import React from "react";
import { formatCurrency } from "../utils/currencyHelper";
import { useI18n } from "../../../core/i18n";

interface BillingKpiGridProps {
  netRevenue: number;
  totalDeposits: number;
  totalRefunds: number;
  thisMonthRevenue: number;
  depositCount: number;
  refundCount: number;
}

export const BillingKpiGrid: React.FC<BillingKpiGridProps> = ({
  netRevenue,
  totalDeposits,
  totalRefunds,
  thisMonthRevenue,
  depositCount,
  refundCount,
}) => {
  const { t } = useI18n();

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
      <div className="mf-card-panel" style={{ padding: "1.1rem", background: "linear-gradient(135deg, #064e3b 0%, #065f46 100%)", color: "#fff" }}>
        <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>
          {t("kpiNetRevenue")}
        </div>
        <div style={{ fontSize: "1.45rem", fontWeight: 800, marginTop: "0.35rem", color: "#a7f3d0" }}>
          {formatCurrency(netRevenue)}
        </div>
        <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.7)", marginTop: "0.35rem" }}>
          = {formatCurrency(totalDeposits)} (Nạp) - {formatCurrency(totalRefunds)} (Hoàn)
        </div>
      </div>

      <div className="mf-card-panel" style={{ padding: "1.1rem" }}>
        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>
          {t("kpiGrossDeposits")}
        </div>
        <div style={{ fontSize: "1.45rem", fontWeight: 800, marginTop: "0.35rem", color: "var(--primary)" }}>
          {formatCurrency(totalDeposits)}
        </div>
        <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginTop: "0.35rem" }}>
          {depositCount} lần thu vào
        </div>
      </div>

      <div className="mf-card-panel" style={{ padding: "1.1rem" }}>
        <div style={{ fontSize: "0.8rem", color: "var(--danger)", fontWeight: 600 }}>
          {t("kpiTotalRefunds")}
        </div>
        <div style={{ fontSize: "1.45rem", fontWeight: 800, marginTop: "0.35rem", color: "var(--danger)" }}>
          {formatCurrency(totalRefunds)}
        </div>
        <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginTop: "0.35rem" }}>
          {refundCount} lần hoàn trả
        </div>
      </div>

      <div className="mf-card-panel" style={{ padding: "1.1rem" }}>
        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>
          {t("kpiThisMonth")}
        </div>
        <div style={{ fontSize: "1.45rem", fontWeight: 800, marginTop: "0.35rem", color: "var(--text-dark)" }}>
          {formatCurrency(thisMonthRevenue)}
        </div>
        <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginTop: "0.35rem" }}>
          Tháng hiện tại
        </div>
      </div>
    </div>
  );
};
