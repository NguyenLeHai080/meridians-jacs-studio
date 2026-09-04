import React from "react";
import { Icon, type IconName } from "../../shared/Icon";
import { NAV_ITEMS, type NavKey, type Job } from "../../core/types";

export interface ToolConfig {
  studio_brand_name?: string;
  tool_slogan?: string;
  custom_logo_url?: string;
  support_contact?: string;
  menu_locks?: Record<string, { locked?: boolean; title?: string; message?: string }>;
}

export interface SidebarProps {
  active: NavKey;
  onNavigate: (key: NavKey) => void;
  jobs?: Job[];
  toolConfig?: ToolConfig;
  licenseExpiresAt?: string | null;
  onOpenRenewal?: () => void;
  onOpenTerms?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  active,
  onNavigate,
  jobs = [],
  toolConfig,
  licenseExpiresAt,
  onOpenRenewal,
  onOpenTerms,
}) => {
  const brandName = toolConfig?.studio_brand_name || "JACS Studio";
  const brandSlogan = toolConfig?.tool_slogan || "AI VIDEO SUITE";

  const runningCount = jobs.filter((j) => j.status === "running").length;
  const queuedCount = jobs.filter((j) => j.status === "queued").length;
  const failedCount = jobs.filter((j) => j.status === "failed").length;

  const workflowKeys: NavKey[] = [
    "sources",
    "analysis",
    "story",
    "timeline",
    "brand",
    "render",
  ];

  const systemKeys: NavKey[] = [
    "overview",
    "batch",
    "billing",
    "logs",
    "activation",
    "settings",
  ];

  const renderNavItem = (item: (typeof NAV_ITEMS)[0]) => {
    const isLocked = Boolean(toolConfig?.menu_locks?.[item.key]?.locked);
    const isActive = active === item.key;

    let badgeContent: React.ReactNode = null;
    if (isLocked) {
      badgeContent = (
        <span className="menu-lock-pill" title="Tính năng đang bảo trì / nâng cấp">
          🔒
        </span>
      );
    } else if (item.key === "render" && (runningCount > 0 || queuedCount > 0)) {
      badgeContent = (
        <span className="badge-render-count">
          {runningCount > 0 ? `⚡ ${runningCount}` : queuedCount}
        </span>
      );
    } else if (item.key === "logs" && failedCount > 0) {
      badgeContent = (
        <span className="badge-error-count">
          {failedCount}
        </span>
      );
    }

    return (
      <button
        key={item.key}
        type="button"
        className={`nav-btn ${isActive ? "active" : ""} ${isLocked ? "nav-btn-locked" : ""}`}
        onClick={() => onNavigate(item.key)}
      >
        <span className="nav-icon-wrap">
          <Icon name={item.icon as IconName} size={16} />
        </span>
        <div className="nav-text">
          <span className="nav-label">{item.label}</span>
          <span className="nav-hint">{item.hint}</span>
        </div>
        {badgeContent}
      </button>
    );
  };

  const workflowItems = NAV_ITEMS.filter((i) => workflowKeys.includes(i.key));
  const systemItems = NAV_ITEMS.filter((i) => systemKeys.includes(i.key));

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="brand-header">
        <a
          href="#"
          className="brand-logo"
          onClick={(e) => {
            e.preventDefault();
            onNavigate("overview");
          }}
        >
          {toolConfig?.custom_logo_url ? (
            <img
              src={toolConfig.custom_logo_url}
              alt="Logo"
              className="brand-custom-img"
            />
          ) : (
            <div className="brand-logo-icon">JS</div>
          )}
          <div className="brand-title-box">
            <span className="brand-title">{brandName}</span>
            <span className="brand-badge-sub">{brandSlogan}</span>
          </div>
        </a>
      </div>

      {/* Nav Menu Groups */}
      <div className="sidebar-menu-scroll">
        <div className="nav-group-heading">QUY TRÌNH VIDEO AI</div>
        <nav className="nav-group">{workflowItems.map(renderNavItem)}</nav>

        <div className="nav-group-heading" style={{ marginTop: "1rem" }}>
          HỆ THỐNG & QUẢN TRỊ
        </div>
        <nav className="nav-group">{systemItems.map(renderNavItem)}</nav>
      </div>

      {/* License / Footer Promo Card */}
      <div className="sidebar-footer-card">
        {licenseExpiresAt && (
          <div className="license-info-box">
            <div className="license-exp-header">
              <span className="dot-online" />
              <span>Bản quyền thiết bị</span>
            </div>
            <div className="license-exp-date">
              Hạn dùng: {new Date(licenseExpiresAt).toLocaleDateString("vi-VN")}
            </div>
          </div>
        )}

        <div className="sidebar-footer-actions">
          {onOpenRenewal && (
            <button
              type="button"
              className="btn-footer-renew"
              onClick={onOpenRenewal}
            >
              <Icon name="zap" size={13} />
              <span>Gia hạn License</span>
            </button>
          )}

          {onOpenTerms && (
            <button
              type="button"
              className="btn-footer-terms"
              onClick={onOpenTerms}
            >
              <Icon name="file-text" size={12} />
              <span>Điều khoản</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
