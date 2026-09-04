import React from "react";
import { Wallet, ArrowUpRight, Key, Laptop } from "lucide-react";
import { useI18n } from "../../../core/i18n";
import { formatCurrencyVND } from "../utils/overviewHelper";

interface OverviewKpiCardsProps {
  thisMonthRevenue: number;
  totalRevenue: number;
  totalTransactions: number;
  activeLicensesCount: number;
  inactiveKeysCount: number;
  onlineSessionsCount: number;
  totalSessionsCount: number;
  onNavigate: (menu: string) => void;
}

export const OverviewKpiCards: React.FC<OverviewKpiCardsProps> = ({
  thisMonthRevenue,
  totalRevenue,
  totalTransactions,
  activeLicensesCount,
  inactiveKeysCount,
  onlineSessionsCount,
  totalSessionsCount,
  onNavigate,
}) => {
  const { t } = useI18n();

  return (
    <div className="kpi-cards-grid-mintforge">
      {/* Card 1: Số dư / Doanh thu tháng */}
      <div className="kpi-card-mf" onClick={() => onNavigate("billing")} style={{ cursor: "pointer" }}>
        <div className="kpi-circle-icon circle-orange"><Wallet size={22} /></div>
        <div className="kpi-content-box">
          <div className="kpi-label-mf">{t("kpiBalanceLabel")}</div>
          <div className="kpi-value-mf">{formatCurrencyVND(thisMonthRevenue)}</div>
          <div className="kpi-subtext-indicator">
            <span className="subtext-green">{t("kpiBalanceSub1")}</span>
            <span className="subtext-gray">{t("kpiBalanceSub2")}</span>
          </div>
        </div>
      </div>

      {/* Card 2: Tổng tiền nạp / Doanh thu */}
      <div className="kpi-card-mf" onClick={() => onNavigate("billing")} style={{ cursor: "pointer" }}>
        <div className="kpi-circle-icon circle-green"><ArrowUpRight size={22} /></div>
        <div className="kpi-content-box">
          <div className="kpi-label-mf">{t("kpiTotalRevenueLabel")}</div>
          <div className="kpi-value-mf">{formatCurrencyVND(totalRevenue)}</div>
          <div className="kpi-subtext-indicator">
            <span className="subtext-green">{t("kpiTotalRevenueSub1")}</span>
            <span className="subtext-gray">{t("kpiTotalRevenueSub2")} ({totalTransactions} tx)</span>
          </div>
        </div>
      </div>

      {/* Card 3: License đang hoạt động */}
      <div className="kpi-card-mf" onClick={() => onNavigate("licenses")} style={{ cursor: "pointer" }}>
        <div className="kpi-circle-icon circle-blue"><Key size={22} /></div>
        <div className="kpi-content-box">
          <div className="kpi-label-mf">{t("kpiActiveKeysLabel")}</div>
          <div className="kpi-value-mf">{activeLicensesCount} key</div>
          <div className="kpi-subtext-indicator">
            <span className="subtext-orange">↘ {inactiveKeysCount} {t("kpiActiveKeysSub1")}</span>
          </div>
        </div>
      </div>

      {/* Card 4: Máy khách Online */}
      <div className="kpi-card-mf" onClick={() => onNavigate("sessions")} style={{ cursor: "pointer" }}>
        <div className="kpi-circle-icon circle-purple"><Laptop size={22} /></div>
        <div className="kpi-content-box">
          <div className="kpi-label-mf">{t("kpiDesktopOnlineLabel")}</div>
          <div className="kpi-value-mf">{onlineSessionsCount} online</div>
          <div className="kpi-subtext-indicator">
            <span className="subtext-green">● {onlineSessionsCount} {t("kpiDesktopOnlineSub1")}</span>
            <span className="subtext-gray">/ {totalSessionsCount} {t("kpiDesktopOnlineSub2")}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
