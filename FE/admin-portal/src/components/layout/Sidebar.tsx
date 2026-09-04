import React from "react";
import {
  Activity,
  User,
  KeyRound,
  ShieldCheck,
  Wallet,
  Building2,
  CreditCard,
  ArrowDownLeft,
  Laptop,
  Settings,
  Rocket,
  FileText,
  X,
} from "lucide-react";
import { useI18n } from "../../core/i18n";

export type MenuKey =
  | "overview"
  | "licenses"
  | "sessions"
  | "billing"
  | "plans"
  | "renewals"
  | "providers"
  | "telemetry"
  | "releases"
  | "terms"
  | "tool_branding"
  | "settings";

interface SidebarProps {
  activeMenu: MenuKey;
  billingTab?: "transactions" | "bank_config";
  onSelectMenu: (menu: MenuKey, subTab?: "transactions" | "bank_config") => void;
  onlineCount?: number;
  mobileMenuOpen?: boolean;
  onCloseMobile?: () => void;
  onOpenAccountModal?: () => void;
}

export function Sidebar({
  activeMenu,
  billingTab = "transactions",
  onSelectMenu,
  onlineCount = 0,
  mobileMenuOpen = false,
  onCloseMobile,
  onOpenAccountModal,
}: SidebarProps) {
  const { t } = useI18n();

  const handleNav = (menu: MenuKey, subTab?: "transactions" | "bank_config") => {
    onSelectMenu(menu, subTab);
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
              <span className="brand-badge-sub">BUSINESS SUITE</span>
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
          <div className="menu-heading">KHÔNG GIAN LÀM VIỆC</div>

          <div className="menu-heading" style={{ paddingTop: "0.4rem" }}>
            TỔNG QUAN
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

          <div className="menu-heading">TÀI KHOẢN & TRUY CẬP</div>
          <button
            type="button"
            className={`menu-item ${activeMenu === "licenses" ? "active" : ""}`}
            onClick={() => handleNav("licenses")}
          >
            <span className="menu-icon">
              <User size={17} />
            </span>
            <span className="menu-label">{t("menuLicenses", "Tài khoản")}</span>
          </button>

          <button
            type="button"
            className={`menu-item ${activeMenu === "providers" ? "active" : ""}`}
            onClick={() => handleNav("providers")}
          >
            <span className="menu-icon">
              <KeyRound size={17} />
            </span>
            <span className="menu-label">{t("menuProviders", "API Keys & gói dịch vụ")}</span>
          </button>

          <button
            type="button"
            className={`menu-item ${activeMenu === "terms" ? "active" : ""}`}
            onClick={() => handleNav("terms")}
          >
            <span className="menu-icon">
              <ShieldCheck size={17} />
            </span>
            <span className="menu-label">{t("menuTerms", "Phân quyền")}</span>
          </button>

          <div className="menu-heading">CREDIT & THANH TOÁN</div>
          <button
            type="button"
            className={`menu-item ${activeMenu === "billing" && billingTab === "transactions" ? "active" : ""}`}
            onClick={() => handleNav("billing", "transactions")}
          >
            <span className="menu-icon">
              <Wallet size={17} />
            </span>
            <span className="menu-label">{t("menuBilling", "Ví & dòng tiền")}</span>
          </button>

          <button
            type="button"
            className={`menu-item ${activeMenu === "billing" && billingTab === "bank_config" ? "active" : ""}`}
            onClick={() => handleNav("billing", "bank_config")}
          >
            <span className="menu-icon">
              <Building2 size={17} />
            </span>
            <span className="menu-label">Ngân hàng & QR</span>
          </button>

          <button
            type="button"
            className={`menu-item ${activeMenu === "plans" ? "active" : ""}`}
            onClick={() => handleNav("plans")}
          >
            <span className="menu-icon">
              <CreditCard size={17} />
            </span>
            <span className="menu-label">{t("menuPlans", "Cấu hình Credit")}</span>
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

          <div className="menu-heading">CẤU HÌNH DỊCH VỤ</div>
          <button
            type="button"
            className={`menu-item ${activeMenu === "sessions" ? "active" : ""}`}
            onClick={() => handleNav("sessions")}
          >
            <span className="menu-icon">
              <Laptop size={17} />
            </span>
            <span className="menu-label">{t("menuSessions", "Máy khách đang Online")}</span>
            <span className="menu-badge badge-primary">{onlineCount}</span>
          </button>

          <button
            type="button"
            className={`menu-item ${activeMenu === "tool_branding" ? "active" : ""}`}
            onClick={() => handleNav("tool_branding")}
          >
            <span className="menu-icon">
              <Settings size={17} />
            </span>
            <span className="menu-label">{t("menuToolConfig", "Cài đặt công cụ")}</span>
          </button>

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
            <span className="menu-label">{t("menuTelemetry", "Nhật ký hệ thống")}</span>
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
            <span className="promo-title">Nâng cấp doanh nghiệp</span>
          </div>
          <div className="promo-desc">
            Mở khóa báo cáo nâng cao và tự động hóa.
          </div>
          <button
            type="button"
            className="btn-promo-action"
            onClick={onOpenAccountModal}
          >
            <span>Nâng cấp ngay</span>
          </button>
        </div>
      </aside>
    </>
  );
}
