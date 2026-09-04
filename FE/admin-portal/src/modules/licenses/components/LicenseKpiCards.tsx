import React from "react";
import { User, UserCheck, Lock, Shield } from "lucide-react";
import { useI18n } from "../../../core/i18n";

interface LicenseKpiCardsProps {
  totalCount: number;
  activeCount: number;
  blockedCount: number;
  rolesCount: number;
}

export const LicenseKpiCards: React.FC<LicenseKpiCardsProps> = ({
  totalCount,
  activeCount,
  blockedCount,
  rolesCount,
}) => {
  const { t } = useI18n();

  return (
    <div className="kpi-cards-grid-mintforge">
      {/* Card 1: Tổng người dùng */}
      <div className="kpi-card-mf">
        <div className="kpi-circle-icon circle-orange"><User size={22} /></div>
        <div className="kpi-content-box">
          <div className="kpi-label-mf">{t("kpiTotalUsers")}</div>
          <div className="kpi-value-mf">{totalCount}</div>
        </div>
        <div className="kpi-subtext-right">{t("kpiTotalUsersSub")}</div>
      </div>

      {/* Card 2: Đang hoạt động */}
      <div className="kpi-card-mf">
        <div className="kpi-circle-icon circle-green"><UserCheck size={22} /></div>
        <div className="kpi-content-box">
          <div className="kpi-label-mf">{t("kpiActiveUsers")}</div>
          <div className="kpi-value-mf">{activeCount}</div>
        </div>
        <div className="kpi-subtext-right">{t("kpiActiveUsersSub")}</div>
      </div>

      {/* Card 3: Đang khóa */}
      <div className="kpi-card-mf">
        <div className="kpi-circle-icon circle-rose"><Lock size={22} /></div>
        <div className="kpi-content-box">
          <div className="kpi-label-mf">{t("kpiLockedUsers")}</div>
          <div className="kpi-value-mf">{blockedCount}</div>
        </div>
        <div className="kpi-subtext-right">{t("kpiLockedUsersSub")}</div>
      </div>

      {/* Card 4: Vai trò */}
      <div className="kpi-card-mf">
        <div className="kpi-circle-icon circle-blue"><Shield size={22} /></div>
        <div className="kpi-content-box">
          <div className="kpi-label-mf">{t("kpiRoles")}</div>
          <div className="kpi-value-mf">{rolesCount}</div>
        </div>
        <div className="kpi-subtext-right">{t("kpiRolesSub")}</div>
      </div>
    </div>
  );
};
