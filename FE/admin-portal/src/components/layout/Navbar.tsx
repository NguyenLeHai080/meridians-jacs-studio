import React from "react";
import { Button } from "../common/Button";

interface NavbarProps {
  environmentUrl: string;
  adminEmail: string;
  onRefresh: () => void;
  onLogout: () => void;
  loading?: boolean;
}

export function Navbar({
  environmentUrl,
  adminEmail,
  onRefresh,
  onLogout,
  loading = false,
}: NavbarProps) {
  return (
    <header className="admin-navbar">
      <div className="navbar-left">
        <span className="navbar-env-badge" title={`Connected to: ${environmentUrl}`}>
          <span className="env-dot" />
          <span>API: {environmentUrl}</span>
        </span>
      </div>

      <div className="navbar-right">
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          loading={loading}
          icon={<span>↻</span>}
        >
          Làm mới
        </Button>

        <div className="navbar-user">
          <div className="user-avatar">{adminEmail.slice(0, 2).toUpperCase()}</div>
          <div className="user-info">
            <span className="user-email">{adminEmail}</span>
            <span className="user-badge">Super Admin</span>
          </div>
        </div>

        <Button variant="danger" size="sm" onClick={onLogout} icon={<span>⎋</span>}>
          Đăng xuất
        </Button>
      </div>
    </header>
  );
}
