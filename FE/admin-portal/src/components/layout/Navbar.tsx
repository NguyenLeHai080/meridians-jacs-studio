import React, { useState, useRef, useEffect } from "react";
import {
  Menu,
  Search,
  RotateCw,
  Bell,
  Globe,
  ChevronDown,
  User,
  ShieldCheck,
  Scale,
  Power,
  Zap,
} from "lucide-react";
import { useI18n, SupportedLanguage } from "../../core/i18n";

interface NavbarProps {
  onToggleMobileMenu: () => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
  loading: boolean;
  onOpenAccountModal: () => void;
  onOpenTerms: () => void;
  onLogout: () => void;
  activeLicensesCount?: number;
  onlineSessionsCount?: number;
}

export function Navbar({
  onToggleMobileMenu,
  searchTerm,
  onSearchChange,
  onRefresh,
  loading,
  onOpenAccountModal,
  onOpenTerms,
  onLogout,
  activeLicensesCount = 0,
  onlineSessionsCount = 0,
}: NavbarProps) {
  const { language, setLanguage, t } = useI18n();

  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [showUserPopover, setShowUserPopover] = useState(false);
  const [showNotifPopover, setShowNotifPopover] = useState(false);
  const [hasUnreadAlerts, setHasUnreadAlerts] = useState(true);

  const langRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setShowLangDropdown(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserPopover(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(event.target as Node)) {
        setShowNotifPopover(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getLangLabel = (lang: SupportedLanguage) => {
    switch (lang) {
      case "vi":
        return "🇻🇳 Tiếng Việt";
      case "en":
        return "🇬🇧 English";
      case "jp":
        return "🇯🇵 日本語";
      default:
        return "🇻🇳 Tiếng Việt";
    }
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        {/* Mobile menu toggle */}
        <button
          type="button"
          className="mobile-menu-toggle"
          onClick={onToggleMobileMenu}
          title="Toggle Navigation Menu"
        >
          <Menu size={20} />
        </button>

        {/* Global Search Bar */}
        <div className="topbar-search">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder={t("searchPlaceholder", "Tìm kiếm nhanh khách hàng, thiết bị, HWID, giao dịch...")}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      <div className="topbar-right">
        {/* Refresh button */}
        <button
          type="button"
          className="btn-icon"
          onClick={onRefresh}
          title={t("refreshData", "Làm mới dữ liệu")}
          disabled={loading}
        >
          <RotateCw size={17} className={loading ? "spin" : ""} />
        </button>

        {/* Notifications Popover */}
        <div className="header-popover-container" ref={notifMenuRef}>
          <button
            type="button"
            className={`btn-icon ${hasUnreadAlerts ? "has-badge" : ""}`}
            onClick={() => {
              setShowNotifPopover(!showNotifPopover);
              setHasUnreadAlerts(false);
            }}
            title={t("notifications", "Thông báo hệ thống")}
          >
            <Bell size={17} />
          </button>

          {showNotifPopover && (
            <div className="header-dropdown notif-dropdown animate-fade-in">
              <div className="dropdown-header">
                <span className="dropdown-title">Thông báo hệ thống</span>
                <span className="badge-pill badge-primary">Mới nhất</span>
              </div>
              <div className="notif-list">
                <div className="notif-item">
                  <div className="notif-icon notif-success">
                    <Zap size={14} />
                  </div>
                  <div className="notif-content">
                    <div className="notif-title">Hệ thống đang hoạt động ổn định</div>
                    <div className="notif-desc">
                      Có {onlineSessionsCount} máy đang online và {activeLicensesCount} bản quyền hoạt động.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Language Switcher Pill */}
        <div className="header-popover-container" ref={langRef}>
          <button
            type="button"
            className="lang-selector-pill"
            onClick={() => setShowLangDropdown(!showLangDropdown)}
          >
            <Globe size={14} color="var(--primary)" />
            <span>{getLangLabel(language)}</span>
            <ChevronDown size={14} />
          </button>

          {showLangDropdown && (
            <div className="header-dropdown lang-dropdown animate-fade-in">
              <button
                type="button"
                className={`dropdown-item ${language === "vi" ? "active" : ""}`}
                onClick={() => {
                  setLanguage("vi");
                  setShowLangDropdown(false);
                }}
              >
                🇻🇳 Tiếng Việt
              </button>
              <button
                type="button"
                className={`dropdown-item ${language === "en" ? "active" : ""}`}
                onClick={() => {
                  setLanguage("en");
                  setShowLangDropdown(false);
                }}
              >
                🇬🇧 English
              </button>
              <button
                type="button"
                className={`dropdown-item ${language === "jp" ? "active" : ""}`}
                onClick={() => {
                  setLanguage("jp");
                  setShowLangDropdown(false);
                }}
              >
                🇯🇵 日本語
              </button>
            </div>
          )}
        </div>

        {/* Superadmin User Profile Menu */}
        <div className="header-popover-container" ref={userMenuRef}>
          <button
            type="button"
            className="user-profile-btn"
            onClick={() => setShowUserPopover(!showUserPopover)}
          >
            <div className="user-avatar">
              <span>AD</span>
            </div>
            <div className="user-info">
              <span className="user-name">Superadmin</span>
              <span className="user-role">ADMINISTRATOR</span>
            </div>
            <ChevronDown size={14} />
          </button>

          {showUserPopover && (
            <div className="header-dropdown user-dropdown animate-fade-in">
              <div className="user-dropdown-header">
                <div className="user-dropdown-name">Superadmin</div>
                <div className="user-dropdown-email">admin@example.com</div>
              </div>

              <div className="dropdown-divider" />

              <button
                type="button"
                className="dropdown-item"
                onClick={() => {
                  setShowUserPopover(false);
                  onOpenAccountModal();
                }}
              >
                <ShieldCheck size={16} color="var(--primary)" />
                <span>Tài khoản & Bảo mật</span>
              </button>

              <button
                type="button"
                className="dropdown-item"
                onClick={() => {
                  setShowUserPopover(false);
                  onOpenTerms();
                }}
              >
                <Scale size={16} color="var(--text-muted)" />
                <span>Điều khoản & Pháp lý</span>
              </button>

              <div className="dropdown-divider" />

              <button
                type="button"
                className="dropdown-item text-danger"
                onClick={() => {
                  setShowUserPopover(false);
                  onLogout();
                }}
              >
                <Power size={16} />
                <span>Đăng xuất</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
