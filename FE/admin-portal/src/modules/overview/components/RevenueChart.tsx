import React from "react";
import { useI18n } from "../../../core/i18n";

export const RevenueChart: React.FC = () => {
  const { t } = useI18n();

  return (
    <div className="mf-card-panel">
      <div className="mf-card-header">
        <div className="mf-card-title-group">
          <h3>{t("chartApiUsageTitle")}</h3>
          <p>{t("chartApiUsageSubtitle")}</p>
        </div>

        <div className="mf-chart-legend">
          <div className="legend-item">
            <span className="legend-color-dot" style={{ background: "#f95738" }} />
            <span>{t("chartCostLegend")}</span>
          </div>
          <div className="legend-item">
            <span className="legend-color-dot" style={{ background: "#1e293b" }} />
            <span>{t("chartRequestLegend")}</span>
          </div>
        </div>
      </div>

      <div className="mf-chart-container">
        <svg viewBox="0 0 600 200" className="mf-trend-svg">
          <line x1="40" y1="30" x2="580" y2="30" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="40" y1="75" x2="580" y2="75" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="40" y1="120" x2="580" y2="120" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="40" y1="165" x2="580" y2="165" stroke="#f1f5f9" strokeWidth="1" />

          <text x="25" y="34" fontSize="10" fill="#94a3b8" textAnchor="end">1.5M</text>
          <text x="25" y="79" fontSize="10" fill="#94a3b8" textAnchor="end">1.0M</text>
          <text x="25" y="124" fontSize="10" fill="#94a3b8" textAnchor="end">500k</text>
          <text x="25" y="169" fontSize="10" fill="#94a3b8" textAnchor="end">0</text>

          <path
            d="M 50 170 Q 200 170 320 168 T 480 160 T 570 145 L 570 170 L 50 170 Z"
            fill="rgba(249, 87, 56, 0.08)"
          />
          <path
            d="M 50 170 Q 200 170 320 168 T 480 160 T 570 145"
            fill="none"
            stroke="#f95738"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <circle cx="570" cy="145" r="4.5" fill="#f95738" stroke="#ffffff" strokeWidth="2" />

          <path
            d="M 50 170 Q 240 170 380 169 T 570 166"
            fill="none"
            stroke="#1e293b"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {[t("dayThu"), t("dayFri"), t("daySat"), t("daySun"), t("dayMon"), t("dayTue"), t("dayWed")].map((day, idx) => {
            const x = 50 + idx * 86;
            return (
              <text key={idx} x={x} y="190" fontSize="10" fill="#6b7280" textAnchor="middle" fontWeight="600">
                {day}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
