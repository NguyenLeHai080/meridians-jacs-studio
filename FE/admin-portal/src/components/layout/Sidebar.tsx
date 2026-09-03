import React from "react";
import { AdminMenuKey } from "../../core/types";

interface SidebarProps {
  activeMenu: AdminMenuKey;
  onSelectMenu: (menu: AdminMenuKey) => void;
  onlineCount?: number;
  activeLicenseCount?: number;
}

export function Sidebar({
  activeMenu,
  onSelectMenu,
  onlineCount = 0,
  activeLicenseCount = 0,
}: SidebarProps) {
  const menuItems: {
    key: AdminMenuKey;
    label: string;
    icon: string;
    badge?: number;
    badgeColor?: "emerald" | "cyan" | "amber";
  }[] = [
    { key: "overview", label: "Tổng quan", icon: "📊" },
    {
      key: "licenses",
      label: "Quản lý Key theo máy",
      icon: "🔑",
      badge: activeLicenseCount,
      badgeColor: "emerald",
    },
    {
      key: "sessions",
      label: "Máy khách đang Online",
      icon: "💻",
      badge: onlineCount,
      badgeColor: "cyan",
    },
    { key: "billing", label: "Dòng tiền gia hạn", icon: "💰" },
    { key: "clients", label: "Quản lý khách hàng", icon: "👥" },
    { key: "providers", label: "AI Providers", icon: "🤖" },
    { key: "logs", label: "Nhật ký hệ thống", icon: "📜" },
  ];

  return (
    <aside className="admin-sidebar">
      <div className="sidebar-brand">
        <div className="brand-badge">
          <span className="brand-logo-icon">⚡</span>
        </div>
        <div className="brand-text">
          <h2 className="brand-name">JACS STUDIO</h2>
          <span className="brand-role">ADMIN CONTROL</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-title">QUẢN TRỊ HỆ THỐNG</div>
        {menuItems.map((item) => {
          const isActive = activeMenu === item.key;
          return (
            <button
              key={item.key}
              type="button"
              className={`sidebar-nav-item ${isActive ? "is-active" : ""}`}
              onClick={() => onSelectMenu(item.key)}
            >
              <span className="nav-item-icon">{item.icon}</span>
              <span className="nav-item-label">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className={`nav-item-count count-${item.badgeColor || "emerald"}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="system-health-card">
          <div className="health-status">
            <span className="health-dot pulse-dot" />
            <span className="health-label">Hệ thống sẵn sàng</span>
          </div>
          <span className="health-sub">API v0.1.0 · WebSocket Active</span>
        </div>
      </div>
    </aside>
  );
}
