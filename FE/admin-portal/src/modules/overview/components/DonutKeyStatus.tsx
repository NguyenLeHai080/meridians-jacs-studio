import React from "react";
import { useI18n } from "../../../core/i18n";
import { calculateDonutOffset } from "../utils/overviewHelper";

interface DonutKeyStatusProps {
  totalLicenses: number;
  activeLicensesCount: number;
  inactiveKeysCount: number;
  lifetimeKeysCount: number;
}

export const DonutKeyStatus: React.FC<DonutKeyStatusProps> = ({
  totalLicenses,
  activeLicensesCount,
  inactiveKeysCount,
  lifetimeKeysCount,
}) => {
  const { t } = useI18n();
  const activePercent = totalLicenses > 0 ? Math.round((activeLicensesCount / totalLicenses) * 100) : 0;
  const donutDashOffset = calculateDonutOffset(activePercent);

  return (
    <div className="mf-card-panel">
      <div className="mf-card-header">
        <div className="mf-card-title-group">
          <h3>{t("chartKeyStatusTitle")}</h3>
          <p>{totalLicenses} {t("chartKeyStatusSub")}</p>
        </div>
      </div>

      <div className="mf-donut-status-layout">
        <div className="mf-donut-left">
          <svg viewBox="0 0 100 100" width="160" height="160">
            <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="11" />
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="#10b981"
              strokeWidth="11"
              strokeLinecap="round"
              strokeDasharray="251"
              strokeDashoffset={donutDashOffset}
              transform="rotate(-90 50 50)"
            />
          </svg>
          <div className="mf-donut-center-text">
            <span className="mf-donut-count">{activeLicensesCount}</span>
            <span className="mf-donut-label">API key</span>
          </div>
        </div>

        <div className="mf-donut-breakdown">
          <div className="mf-breakdown-row">
            <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span style={{ color: "#10b981" }}>●</span> {t("donutStatusActive")}
            </span>
            <strong style={{ color: "var(--text-dark)" }}>{activeLicensesCount}</strong>
          </div>
          <div className="mf-breakdown-row">
            <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span style={{ color: "#9ca3af" }}>●</span> {t("donutStatusOther")}
            </span>
            <strong style={{ color: "var(--text-dark)" }}>{inactiveKeysCount}</strong>
          </div>
          <div className="mf-breakdown-row">
            <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span style={{ color: "#f95738" }}>●</span> {t("donutStatusLifetime")}
            </span>
            <strong style={{ color: "var(--text-dark)" }}>{lifetimeKeysCount}</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
