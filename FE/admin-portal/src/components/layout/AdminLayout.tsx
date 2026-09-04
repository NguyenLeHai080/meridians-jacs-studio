import React, { useState } from "react";
import { Sidebar, MenuKey } from "./Sidebar";
import { Navbar } from "./Navbar";

interface AdminLayoutProps {
  activeMenu: MenuKey;
  onSelectMenu: (menu: MenuKey) => void;
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
  onRefresh,
  onLogout,
  loading = false,
  onlineCount = 0,
  activeLicenseCount = 0,
  children,
}: AdminLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="app-container">
      <Sidebar
        activeMenu={activeMenu}
        onSelectMenu={onSelectMenu}
        onlineCount={onlineCount}
        mobileMenuOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />
      <div className="main-content">
        <Navbar
          onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onRefresh={onRefresh}
          loading={loading}
          onOpenAccountModal={() => onSelectMenu("settings")}
          onOpenTerms={() => onSelectMenu("terms")}
          onLogout={onLogout}
          activeLicensesCount={activeLicenseCount}
          onlineSessionsCount={onlineCount}
        />
        <main className="content-body">{children}</main>
      </div>
    </div>
  );
}
