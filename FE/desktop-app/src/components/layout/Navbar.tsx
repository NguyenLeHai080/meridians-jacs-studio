import React, { useState } from "react";
import { createPortal } from "react-dom";
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
  creditBalance = 0,
  allowedModels = null,
  onSyncAdminGrant,
  onRefresh,
  loading = false,
  onOpenRenewal,
  onOpenTopup,
  onOpenTerms,
  onOpenSettings,
  onOpenActivation,
}) => {
  const [copiedHwid, setCopiedHwid] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
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

        {/* AI Credit Balance Pill */}
        {activated && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.25))",
              border: "1px solid rgba(245, 158, 11, 0.5)",
              padding: "5px 12px",
              borderRadius: "20px",
              cursor: "pointer",
              transition: "all 0.2s ease",
              boxShadow: "0 2px 6px rgba(245, 158, 11, 0.15)",
            }}
            onClick={() => setShowCreditModal(true)}
            title="Số dư AI Credit từ Admin. Nhấp để xem chi tiết hoặc đồng bộ!"
          >
            <span style={{ fontSize: "13px" }}>💎</span>
            <span style={{ fontSize: "12px", fontWeight: 850, color: "#f59e0b", fontFamily: "monospace" }}>
              {Number(creditBalance || 0).toLocaleString("vi-VN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} Cr
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSyncAdminGrant?.();
              }}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                color: "#f59e0b",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                fontSize: "11px",
              }}
              title="Đồng bộ ngay từ Admin"
            >
              🔄
            </button>
          </div>
        )}

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

      {/* Credit & AI Grant Details Modal (Rendered in Portal to escape navbar stacking context) */}
      {showCreditModal && typeof document !== "undefined" && createPortal(
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999999,
            padding: "20px",
            animation: "fadeIn 0.2s ease",
          }}
          onClick={() => setShowCreditModal(false)}
        >
          <div
            style={{
              background: "#141724",
              border: "1px solid rgba(245, 158, 11, 0.4)",
              borderRadius: "16px",
              width: "520px",
              maxWidth: "92vw",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
              overflow: "hidden",
              color: "#f8fafc",
              position: "relative",
              zIndex: 1000000,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: "18px 22px",
                background: "linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(30, 41, 59, 0.8))",
                borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "22px" }}>💎</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#f59e0b" }}>
                    Ví AI Credit & Quyền Mô Hình
                  </h3>
                  <div style={{ fontSize: "11.5px", color: "#94a3b8" }}>
                    Cấp phát và bảo trợ trực tiếp bởi Cloud Admin Gateway
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreditModal(false)}
                style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "20px", cursor: "pointer", padding: "4px" }}
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: "22px", display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Credit Box */}
              <div
                style={{
                  background: "rgba(245, 158, 11, 0.08)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  borderRadius: "12px",
                  padding: "18px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "12px", color: "#f59e0b", fontWeight: 700, textTransform: "uppercase" }}>
                  Số Dư AI Credit Hiện Tại
                </div>
                <div style={{ fontSize: "34px", fontWeight: 900, color: "#fbbf24", margin: "6px 0", fontFamily: "monospace" }}>
                  {Number(creditBalance || 0).toLocaleString("vi-VN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} <span style={{ fontSize: "16px", color: "#f59e0b" }}>Credits</span>
                </div>
                <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                  Tương đương ~{(Number(creditBalance || 0) * 1000).toLocaleString("vi-VN")} VNĐ sử dụng AI Gateway
                </div>
              </div>

              {/* Allowed Models Info */}
              <div>
                <div style={{ fontSize: "12px", fontWeight: 800, color: "#cbd5e1", marginBottom: "8px", textTransform: "uppercase" }}>
                  Danh Sách Model AI Được Phép Dùng:
                </div>
                {!allowedModels || allowedModels.length === 0 ? (
                  <div style={{ background: "rgba(34, 197, 94, 0.1)", border: "1px solid rgba(34, 197, 94, 0.3)", borderRadius: "8px", padding: "10px 14px", color: "#4ade80", fontSize: "12.5px", fontWeight: 700 }}>
                    ✨ Tất cả Model AI hệ thống (Full Access không giới hạn)
                  </div>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", maxHeight: "150px", overflowY: "auto" }}>
                    {allowedModels.map((m) => (
                      <span
                        key={m}
                        style={{
                          background: "rgba(255, 255, 255, 0.06)",
                          border: "1px solid rgba(255, 255, 255, 0.15)",
                          padding: "4px 8px",
                          borderRadius: "6px",
                          fontSize: "11.5px",
                          fontFamily: "monospace",
                          color: "#93c5fd",
                          fontWeight: 700,
                        }}
                      >
                        ✓ {m}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                padding: "14px 22px",
                background: "rgba(0, 0, 0, 0.3)",
                borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setShowCreditModal(false);
                  onNavigate("usage");
                }}
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  color: "#f8fafc",
                  padding: "7px 14px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                📊 Xem Chi Tiết Mức Dùng ➔
              </button>

              <button
                type="button"
                onClick={() => {
                  onSyncAdminGrant?.();
                }}
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  padding: "7px 12px",
                  borderRadius: "8px",
                  color: "#f8fafc",
                  fontSize: "12px",
                  fontWeight: 750,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                🔄 Đồng Bộ
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowCreditModal(false);
                  if (onOpenTopup) {
                    onOpenTopup();
                  } else {
                    onNavigate("usage");
                  }
                }}
                style={{
                  background: "linear-gradient(135deg, #d97706, #f59e0b)",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  color: "#0f172a",
                  fontSize: "12px",
                  fontWeight: 900,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 0 12px rgba(245, 158, 11, 0.35)",
                }}
              >
                ⚡ Nạp Thêm Credits
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
};
