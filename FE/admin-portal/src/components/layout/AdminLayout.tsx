import React from "react";
import { AdminMenuKey } from "../../core/types";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";

interface AdminLayoutProps {
  activeMenu: AdminMenuKey;
  onSelectMenu: (menu: AdminMenuKey) => void;
  environmentUrl: string;
  adminEmail: string;
  onRefresh: () => void;
  onLogout: () => void;
  loading?: boolean;
  onlineCount?: number;
  activeLicenseCount?: number;
  children: React.ReactNode;
}

export function AdminLayout({
  activeMenu,
  onSelectMenu,
  environmentUrl,
  adminEmail,
  onRefresh,
  onLogout,
  loading = false,
  onlineCount = 0,
  activeLicenseCount = 0,
  children,
}: AdminLayoutProps) {
  return (
    <div className="admin-app-container">
      <Sidebar
        activeMenu={activeMenu}
        onSelectMenu={onSelectMenu}
        onlineCount={onlineCount}
        activeLicenseCount={activeLicenseCount}
      />
      <div className="admin-main-wrapper">
        <Navbar
          environmentUrl={environmentUrl}
          adminEmail={adminEmail}
          onRefresh={onRefresh}
          onLogout={onLogout}
          loading={loading}
        />
        <main className="admin-content-area">{children}</main>
      </div>
    </div>
  );
}
