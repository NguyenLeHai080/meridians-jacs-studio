import React, { useState } from "react";
import { Icon } from "../../shared/Icon";
import { NAV_ITEMS, type NavKey, type MachineInfo } from "../../core/types";
import { isNativeRuntime } from "../../core/runtime";
import type { ToolConfig } from "./Sidebar";

export interface NavbarProps {
  active: NavKey;
  onNavigate: (key: NavKey) => void;
  machineInfo?: MachineInfo | null;
  toolConfig?: ToolConfig;
  activated?: boolean | null;
  licenseExpiresAt?: string | null;
  daysRemaining?: number | null;
  planName?: string | null;
  creditBalance?: number;
  allowedModels?: string[] | null;
  onSyncAdminGrant?: () => void;
  onRefresh?: () => void;
  loading?: boolean;
  onOpenRenewal?: () => void;
  onOpenTopup?: () => void;
  onOpenTerms?: () => void;
  onOpenSettings?: () => void;
  onOpenActivation?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  active,
  onNavigate,
  machineInfo,
  toolConfig,
  activated,
  licenseExpiresAt,
  daysRemaining,
  planName,
  onRefresh,
  loading = false,
  onOpenRenewal,
  onOpenTerms,
  onOpenSettings,
  onOpenActivation,
}) => {
  const [copiedHwid, setCopiedHwid] = useState(false);
  const currentNav = NAV_ITEMS.find((item) => item.key === active);

  const brandName = toolConfig?.studio_brand_name || "MERIDIANS JACS STUDIO";
  const brandSlogan = toolConfig?.tool_slogan || "JUDICIOUS AI CONTENT SCANNER & VIDEO PRODUCTION";

  const handleCopyHwid = () => {
    if (!machineInfo?.machineId) return;
    navigator.clipboard.writeText(machineInfo.machineId);
    setCopiedHwid(true);
    setTimeout(() => setCopiedHwid(false), 2000);
  };

  const isNative = isNativeRuntime();

  // Dynamic License Status determination
  const getLicenseBadge = () => {
    if (activated === false || (!activated && activated !== null)) {
      return {
        className: "navbar-license-pill license-unactivated",
        icon: "red-dot",
        text: "Bản quyền: Chưa kích hoạt",
        cta: "Kích hoạt ngay ➔",
        title: "Bản quyền chưa được kích hoạt. Nhấp để kích hoạt ngay!",
        action: onOpenActivation || (() => onNavigate("activation")),
      };
    }

    const currentPlan = planName || toolConfig?.studio_brand_name || "Gói Pro";

    const isNumDays = typeof daysRemaining === "number";

    // Lifetime plan (> 10 years or no expiry limit)
    if (isNumDays && daysRemaining > 3650) {
      return {
        className: "navbar-license-pill license-active",
        icon: "green-dot",
        text: `${currentPlan} (Vĩnh viễn)`,
        cta: undefined,
        title: `Bản quyền ${currentPlan} - Thời hạn Vĩnh viễn (Lifetime)`,
        action: onOpenRenewal,
      };
    }

    // Expired plan
    if (isNumDays && daysRemaining <= 0) {
      return {
        className: "navbar-license-pill license-unactivated",
        icon: "red-dot",
        text: `${currentPlan} (Đã hết hạn)`,
        cta: "Gia hạn ngay ➔",
        title: `Bản quyền ${currentPlan} đã hết hạn. Nhấp để gia hạn ngay!`,
        action: onOpenRenewal,
      };
    }

    // Expiring soon (<= 7 days)
    if (isNumDays && daysRemaining <= 7) {
      return {
        className: "navbar-license-pill license-expiring",
        icon: "yellow-dot",
        text: `${currentPlan} (Còn ${daysRemaining} ngày)`,
        cta: "Sắp hết hạn ➔",
        title: `Bản quyền ${currentPlan} chỉ còn ${daysRemaining} ngày. Nhấp để gia hạn!`,
        action: onOpenRenewal,
      };
    }

    // Active healthy plan
    const daysText = isNumDays ? ` (Còn ${daysRemaining} ngày)` : "";
    return {
      className: "navbar-license-pill license-active",
      icon: "green-dot",
      text: `${currentPlan}${daysText}`,
      cta: undefined,
      title: `Bản quyền ${currentPlan}${daysText} - Hết hạn: ${
        licenseExpiresAt ? new Date(licenseExpiresAt).toLocaleDateString("vi-VN") : "N/A"
      }. Nhấp để xem chi tiết hoặc gia hạn!`,
      action: onOpenRenewal,
    };
  };

  const licenseBadge = getLicenseBadge();

  return (
    <header className="top-navbar">
      {/* Brand Logo & Title + Page Title & Breadcrumb */}
      <div className="navbar-left">
        <a
          href="#"
          className="navbar-brand-link"
          onClick={(e) => {
            e.preventDefault();
            onNavigate("overview");
          }}
          title="Về trang Tổng quan"
        >
          {toolConfig?.custom_logo_url ? (
            <img src={toolConfig.custom_logo_url} alt="Logo" className="navbar-brand-img" />
          ) : (
            <div className="navbar-brand-badge">
              <span className="badge-text">JS</span>
            </div>
          )}
          <div className="navbar-brand-titles">
            <span className="navbar-brand-name">{brandName}</span>
            <span className="navbar-brand-slogan">{brandSlogan}</span>
          </div>
        </a>

        <div className="navbar-crumb-divider" />

        <div className="navbar-page-meta">
          <div className="navbar-breadcrumb">
            <span className="crumb-root">JACS Studio</span>
            <span className="crumb-sep">/</span>
            <span className="crumb-current">{currentNav?.label || "Tổng quan"}</span>
          </div>
          <div className="navbar-page-title">
            <h2>{currentNav?.label || "Tổng quan"}</h2>
            {currentNav?.hint && <span className="navbar-page-hint">{currentNav.hint}</span>}
          </div>
        </div>
      </div>

      {/* Status Badges & Quick Action Controls */}
      <div className="navbar-right">
        {/* Dynamic License Plan Status Badge */}
        <div
          className={licenseBadge.className}
          onClick={licenseBadge.action}
          title={licenseBadge.title}
        >
          <span className={`license-status-dot ${licenseBadge.icon}`} />
          <span className="license-val">{licenseBadge.text}</span>
          {licenseBadge.cta && <span className="license-btn-cta">{licenseBadge.cta}</span>}
        </div>

        {/* Machine ID / HWID Pill */}
        {machineInfo && (
          <div
            className="navbar-hwid-pill"
            onClick={handleCopyHwid}
            title="Bấm để sao chép Machine ID (HWID)"
          >
            <span className="hwid-icon">💻</span>
            <span className="hwid-label">HWID:</span>
            <span className="hwid-val">
              {machineInfo.machineId.slice(0, 8)}...{machineInfo.machineId.slice(-6)}
            </span>
            <span className="hwid-copy-hint">
              {copiedHwid ? "✓ Đã chép" : "📋"}
            </span>
          </div>
        )}

        {/* Runtime Pill */}
        <div
          className={`navbar-runtime-pill ${isNative ? "runtime-native" : "runtime-web"}`}
          title={isNative ? "Electron Native Desktop Shell" : "Web Preview Mode"}
        >
          <span className="runtime-dot" />
          <span>{isNative ? "DESKTOP APP" : "WEB PREVIEW"}</span>
        </div>

        {/* Refresh Button */}
        {onRefresh && (
          <button
            type="button"
            className="btn-nav-action"
            onClick={onRefresh}
            disabled={loading}
            title="Làm mới dữ liệu"
          >
            <Icon name="refresh" size={14} className={loading ? "spin" : ""} />
          </button>
        )}

        {/* Renewal Button */}
        {onOpenRenewal && (
          <button
            type="button"
            className="btn-nav-renew"
            onClick={onOpenRenewal}
            title="Quét mã VietQR gia hạn bản quyền"
          >
            <Icon name="zap" size={13} />
            <span>Gia Hạn</span>
          </button>
        )}

        {/* Terms Button */}
        {onOpenTerms && (
          <button
            type="button"
            className="btn-nav-action"
            onClick={onOpenTerms}
            title="Xem Điều Khoản Sử Dụng & Miễn Trừ Trách Nhiệm Pháp Lý"
          >
            <Icon name="file-text" size={13} />
          </button>
        )}

        {/* Settings Button */}
        {onOpenSettings && (
          <button
            type="button"
            className="btn-nav-action"
            onClick={onOpenSettings}
            title="Cài đặt hệ thống & AI Engine"
          >
            <Icon name="sliders" size={14} />
          </button>
        )}
      </div>
    </header>
  );
};
