import React, { useState } from "react";
import { Icon } from "../../shared/Icon";
import { NAV_ITEMS, type NavKey, type MachineInfo } from "../../core/types";
import { isNativeRuntime } from "../../core/runtime";

export interface NavbarProps {
  active: NavKey;
  onNavigate: (key: NavKey) => void;
  machineInfo?: MachineInfo | null;
  onRefresh?: () => void;
  loading?: boolean;
  onOpenRenewal?: () => void;
  onOpenSettings?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  active,
  onNavigate,
  machineInfo,
  onRefresh,
  loading = false,
  onOpenRenewal,
  onOpenSettings,
}) => {
  const [copiedHwid, setCopiedHwid] = useState(false);
  const currentNav = NAV_ITEMS.find((item) => item.key === active);

  const handleCopyHwid = () => {
    if (!machineInfo?.machineId) return;
    navigator.clipboard.writeText(machineInfo.machineId);
    setCopiedHwid(true);
    setTimeout(() => setCopiedHwid(false), 2000);
  };

  const isNative = isNativeRuntime();

  return (
    <header className="top-navbar">
      {/* Page Title & Breadcrumb */}
      <div className="navbar-left">
        <div className="navbar-breadcrumb">
          <span className="crumb-root">JACS Studio</span>
          <span className="crumb-sep">/</span>
          <span className="crumb-current">{currentNav?.label || "Bảng điều khiển"}</span>
        </div>
        <div className="navbar-page-title">
          <h2>{currentNav?.label || "Bảng điều khiển"}</h2>
          {currentNav?.hint && <span className="navbar-page-hint">{currentNav.hint}</span>}
        </div>
      </div>

      {/* Status Badges & Quick Action Controls */}
      <div className="navbar-right">
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
          <span>{isNative ? "Desktop App" : "Web Preview"}</span>
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

        {/* Settings Button */}
        {onOpenSettings && (
          <button
            type="button"
            className="btn-nav-action"
            onClick={onOpenSettings}
            title="Cài đặt hệ thống"
          >
            <Icon name="sliders" size={14} />
          </button>
        )}
      </div>
    </header>
  );
};
