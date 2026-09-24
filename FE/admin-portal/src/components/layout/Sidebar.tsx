import React from "react";
import {
  Activity,
  Users,
  ShieldCheck,
  Wallet,
  Building2,
  ArrowDownLeft,
  Settings,
  Rocket,
  FileText,
  ScrollText,
  X,
  Coins,
  Cpu,
  BarChart3,
  Layers,
  KeyRound,
  Sparkles,
} from "lucide-react";
import { useI18n } from "../../core/i18n";

export type MenuKey =
  | "overview"
  | "clients"
  | "licenses"
  | "sessions"
  | "jobs"
  | "billing"
  | "bank_config"
  | "renewals"
  | "providers"
  | "ai_models_pricing"
  | "ai_request_logs"
  | "api_operations"
  | "telemetry"
  | "releases"
  | "settings";

interface SidebarProps {
  activeMenu: MenuKey;
  onSelectMenu: (menu: MenuKey) => void;
  onlineCount?: number;
  mobileMenuOpen?: boolean;
  onCloseMobile?: () => void;
  onOpenAccountModal?: () => void;
}

export function Sidebar({
  activeMenu,
  onSelectMenu,
  onlineCount = 0,
  mobileMenuOpen = false,
  onCloseMobile,
  onOpenAccountModal,
}: SidebarProps) {
  const { t } = useI18n();

  const handleNav = (menu: MenuKey) => {
    onSelectMenu(menu);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {mobileMenuOpen && (
        <div className="sidebar-mobile-backdrop" onClick={onCloseMobile} />
      )}

      <aside className={`sidebar ${mobileMenuOpen ? "mobile-open" : ""}`}>
        <div className="sidebar-header">
          <a
            href="#"
            className="brand-logo"
            onClick={(e) => {
              e.preventDefault();
              handleNav("overview");
            }}
          >
            <div className="brand-logo-icon">MI</div>
            <div className="brand-title-box">
              <span className="brand-title">MintForge</span>
              <span className="brand-badge-sub">{t("appSuite", "BUSINESS SUITE")}</span>
            </div>
          </a>
          {mobileMenuOpen && (
            <button
              type="button"
              className="btn-sidebar-logout"
              style={{ color: "#fff" }}
              onClick={onCloseMobile}
            >
              <X size={18} />
            </button>
          )}
        </div>

        <div className="sidebar-menu">
          <div className="menu-heading">{t("headingWorkspace", "KHÔNG GIAN LÀM VIỆC")}</div>

          <div className="menu-heading" style={{ paddingTop: "0.4rem" }}>
            {t("headingOverview", "TỔNG QUAN")}
          </div>
          <button
            type="button"
            className={`menu-item ${activeMenu === "overview" ? "active" : ""}`}
            onClick={() => handleNav("overview")}
          >
            <span className="menu-icon">
              <Activity size={17} />
            </span>
            <span className="menu-label">{t("menuOverview", "Tổng quan hệ thống")}</span>
          </button>

          <div className="menu-heading">{t("headingTasksClients", "TÁC VỤ & KHÁCH HÀNG")}</div>
          <button
            type="button"
            className={`menu-item ${activeMenu === "licenses" ? "active" : ""}`}
            onClick={() => handleNav("licenses")}
          >
            <span className="menu-icon">
              <KeyRound size={17} />
            </span>
            <span className="menu-label">{t("menuLicenses", "Quản lý API Key")}</span>
          </button>

          <button
            type="button"
            className={`menu-item ${activeMenu === "clients" || activeMenu === "sessions" ? "active" : ""}`}
            onClick={() => handleNav("clients")}
          >
            <span className="menu-icon">
              <Users size={17} />
            </span>
            <span className="menu-label">{t("menuClients", "Quản lý khách hàng")}</span>
            <span className="menu-badge badge-primary">{onlineCount}</span>
          </button>

          <button
            type="button"
            className={`menu-item ${activeMenu === "jobs" ? "active" : ""}`}
            onClick={() => handleNav("jobs")}
          >
            <span className="menu-icon">
              <Layers size={17} />
            </span>
            <span className="menu-label">{t("menuJobs", "Quản lý Jobs & Tác vụ")}</span>
          </button>

          <div className="menu-heading">{t("headingAiServices", "DỊCH VỤ & MÔ HÌNH AI")}</div>
          <button
            type="button"
            className={`menu-item ${activeMenu === "providers" ? "active" : ""}`}
            onClick={() => handleNav("providers")}
          >
            <span className="menu-icon">
              <Cpu size={17} />
            </span>
            <span className="menu-label">{t("menuProviders", "Quản lý nhà cung cấp")}</span>
          </button>

          <button
            type="button"
            className={`menu-item ${activeMenu === "ai_models_pricing" ? "active" : ""}`}
            onClick={() => handleNav("ai_models_pricing")}
          >
            <span className="menu-icon">
              <Sparkles size={17} />
            </span>
            <span className="menu-label">{t("menuAiModelsPricing", "Bảng giá & Models AI")}</span>
          </button>

          <button
            type="button"
            className={`menu-item ${activeMenu === "ai_request_logs" ? "active" : ""}`}
            onClick={() => handleNav("ai_request_logs")}
          >
            <span className="menu-icon">
              <Activity size={17} />
            </span>
            <span className="menu-label">{t("menuAiRequestLogs", "Nhật ký Requests AI")}</span>
          </button>

          <button
            type="button"
            className={`menu-item ${activeMenu === "api_operations" ? "active" : ""}`}
            onClick={() => handleNav("api_operations")}
          >
            <span className="menu-icon">
              <BarChart3 size={17} />
            </span>
            <span className="menu-label">{t("menuApiOperations", "Báo cáo vận hành API")}</span>
          </button>

          <div className="menu-heading">{t("headingBillingPayment", "CREDIT & THANH TOÁN")}</div>
          <button
            type="button"
            className={`menu-item ${activeMenu === "billing" ? "active" : ""}`}
            onClick={() => handleNav("billing")}
          >
            <span className="menu-icon">
              <Wallet size={17} />
            </span>
            <span className="menu-label">{t("menuBilling", "Ví & dòng tiền")}</span>
          </button>

          <button
            type="button"
            className={`menu-item ${activeMenu === "bank_config" ? "active" : ""}`}
            onClick={() => handleNav("bank_config")}
          >
            <span className="menu-icon">
              <Building2 size={17} />
            </span>
            <span className="menu-label">{t("menuBankConfig", "Ngân hàng & QR")}</span>
          </button>

          <button
            type="button"
            className={`menu-item ${activeMenu === "renewals" ? "active" : ""}`}
            onClick={() => handleNav("renewals")}
          >
            <span className="menu-icon">
              <ArrowDownLeft size={17} />
            </span>
            <span className="menu-label">{t("menuRenewals", "Giao dịch nạp SePay")}</span>
          </button>

          <div className="menu-heading">{t("headingConfigSystem", "CẤU HÌNH & HỆ THỐNG")}</div>
          <button
            type="button"
            className={`menu-item ${activeMenu === "releases" ? "active" : ""}`}
            onClick={() => handleNav("releases")}
          >
            <span className="menu-icon">
              <Rocket size={17} />
            </span>
            <span className="menu-label">{t("menuReleases", "Bản phát hành OTA")}</span>
          </button>

          <button
            type="button"
            className={`menu-item ${activeMenu === "telemetry" ? "active" : ""}`}
            onClick={() => handleNav("telemetry")}
          >
            <span className="menu-icon">
              <FileText size={17} />
            </span>
            <span className="menu-label">{t("menuTelemetry", "Nhật ký cảnh báo")}</span>
          </button>

          <button
            type="button"
            className={`menu-item ${activeMenu === "settings" ? "active" : ""}`}
            onClick={() => handleNav("settings")}
          >
            <span className="menu-icon">
              <Settings size={17} />
            </span>
            <span className="menu-label">{t("menuSettings", "Cài đặt")}</span>
          </button>
        </div>

        {/* Promo Upgrade Banner Card */}
        <div className="sidebar-promo-card">
          <div className="promo-header-row">
            <span className="promo-sparkle-icon">✨</span>
            <span className="promo-title">{t("promoUpgradeTitle", "Nâng cấp doanh nghiệp")}</span>
          </div>
          <div className="promo-desc">
            {t("promoUpgradeDesc", "Mở khóa báo cáo nâng cao và tự động hóa.")}
          </div>
          <button
            type="button"
            className="btn-promo-action"
            onClick={onOpenAccountModal}
          >
            <span>{t("promoUpgradeBtn", "Nâng cấp ngay")}</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
