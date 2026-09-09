import React, { useState, useRef, useEffect } from "react";
import {
  Menu,
  Search,
  RotateCw,
  Bell,
  Globe,
  ChevronDown,
  ShieldCheck,
  Scale,
  Power,
  Zap,
  X,
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
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [hasUnreadAlerts, setHasUnreadAlerts] = useState(true);

  const langRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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
        return "Tiếng Việt";
      case "en":
        return "English";
      case "jp":
        return "日本語";
      default:
        return "Tiếng Việt";
    }
  };

  const getLangFlag = (lang: SupportedLanguage) => {
    switch (lang) {
      case "vi":
        return "🇻🇳";
      case "en":
        return "🇬🇧";
      case "jp":
        return "🇯🇵";
      default:
        return "🇻🇳";
    }
  };

  return (
    <header className="h-16 px-4 sm:px-6 bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 flex items-center justify-between gap-3 shadow-xs">
      {/* LEFT SECTION */}
      <div className="flex items-center gap-2.5 flex-1 min-w-0 max-w-xl">
        {/* Mobile Navigation Toggle */}
        <button
          type="button"
          className="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition-all active:scale-95 shrink-0 cursor-pointer"
          onClick={onToggleMobileMenu}
          title="Toggle Navigation Menu"
        >
          <Menu size={18} />
        </button>

        {/* Global Desktop Search Input */}
        <div className="relative w-full hidden sm:block">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            type="text"
            ref={searchInputRef}
            placeholder={t(
              "searchPlaceholder",
              "Tìm kiếm khách hàng, thiết bị, HWID, bản quyền..."
            )}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-12 py-2 text-xs font-medium text-slate-800 bg-slate-50/90 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-orange-500 focus:ring-3 focus:ring-orange-500/15 transition-all duration-150 placeholder:text-slate-400 shadow-2xs"
          />
          {searchTerm ? (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full cursor-pointer"
            >
              <X size={13} />
            </button>
          ) : (
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[9.5px] font-mono font-semibold text-slate-400 bg-slate-100 border border-slate-200/80 px-1.5 py-0.5 rounded-md pointer-events-none">
              ⌘K
            </kbd>
          )}
        </div>

        {/* Mobile Search Icon Toggle */}
        <button
          type="button"
          onClick={() => setShowMobileSearch(!showMobileSearch)}
          className="sm:hidden inline-flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition-all active:scale-95 cursor-pointer"
          title="Tìm kiếm"
        >
          <Search size={16} />
        </button>
      </div>

      {/* Mobile Search Overlay Bar */}
      {showMobileSearch && (
        <div className="sm:hidden absolute inset-x-0 top-0 h-16 bg-white border-b border-slate-200 px-4 flex items-center gap-2 z-40 animate-fade-in shadow-md">
          <Search size={16} className="text-slate-400 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder={t("searchPlaceholderMobile", "Tìm kiếm nhanh...")}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="flex-1 text-xs font-medium text-slate-800 bg-transparent border-none outline-hidden"
          />
          <button
            type="button"
            onClick={() => setShowMobileSearch(false)}
            className="p-1.5 text-slate-500 hover:text-slate-700 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* RIGHT SECTION: Quick Action Controls */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* Live System Online Badge */}
        <div className="hidden xl:inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-200/80 rounded-full text-xs font-bold text-emerald-700 shadow-2xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>{onlineSessionsCount} {t("onlineDevicesCount", "Máy Online")}</span>
        </div>

        {/* Refresh Button */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="w-9 h-9 inline-flex items-center justify-center rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 shadow-2xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          title={t("refreshData", "Làm mới dữ liệu")}
        >
          <RotateCw size={15} className={loading ? "animate-spin text-orange-500" : ""} />
        </button>

        {/* Notifications Popover */}
        <div className="relative" ref={notifMenuRef}>
          <button
            type="button"
            onClick={() => {
              setShowNotifPopover(!showNotifPopover);
              setHasUnreadAlerts(false);
            }}
            className="w-9 h-9 inline-flex items-center justify-center rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 shadow-2xs transition-all active:scale-95 relative cursor-pointer"
            title={t("notifications", "Thông báo hệ thống")}
          >
            <Bell size={15} />
            {hasUnreadAlerts && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-orange-500 ring-2 ring-white animate-pulse" />
            )}
          </button>

          {showNotifPopover && (
            <div className="absolute right-0 top-full mt-2 w-80 sm:w-88 bg-white border border-slate-200/90 rounded-2xl shadow-xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-900">{t("notifications", "Thông báo hệ thống")}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
                  Live
                </span>
              </div>
              <div className="space-y-2">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Zap size={14} />
                  </div>
                  <div className="text-xs">
                    <div className="font-bold text-slate-800">JACS Studio Core Online</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {onlineSessionsCount} {t("onlineDevicesCount", "Máy Online")} • {activeLicensesCount} licenses.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Language Selector Pill */}
        <div className="relative" ref={langRef}>
          <button
            type="button"
            onClick={() => setShowLangDropdown(!showLangDropdown)}
            className="h-9 px-2.5 sm:px-3 inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs transition-all active:scale-95 cursor-pointer"
            title="Ngôn ngữ"
          >
            <Globe size={14} className="text-orange-600 shrink-0" />
            <span className="hidden sm:inline">{getLangFlag(language)} {getLangLabel(language)}</span>
            <span className="sm:hidden font-bold uppercase">{language}</span>
            <ChevronDown size={13} className="text-slate-400" />
          </button>

          {showLangDropdown && (
            <div className="absolute right-0 top-full mt-2 w-44 bg-white border border-slate-200/90 rounded-2xl shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
              <button
                type="button"
                onClick={() => {
                  setLanguage("vi");
                  setShowLangDropdown(false);
                }}
                className={`w-full px-3 py-2 text-xs font-bold rounded-xl text-left flex items-center gap-2 transition-colors cursor-pointer ${
                  language === "vi"
                    ? "bg-orange-50 text-orange-700 font-extrabold"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span>🇻🇳</span>
                <span>Tiếng Việt</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setLanguage("en");
                  setShowLangDropdown(false);
                }}
                className={`w-full px-3 py-2 text-xs font-bold rounded-xl text-left flex items-center gap-2 transition-colors cursor-pointer ${
                  language === "en"
                    ? "bg-orange-50 text-orange-700 font-extrabold"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span>🇬🇧</span>
                <span>English</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setLanguage("jp");
                  setShowLangDropdown(false);
                }}
                className={`w-full px-3 py-2 text-xs font-bold rounded-xl text-left flex items-center gap-2 transition-colors cursor-pointer ${
                  language === "jp"
                    ? "bg-orange-50 text-orange-700 font-extrabold"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span>🇯🇵</span>
                <span>日本語</span>
              </button>
            </div>
          )}
        </div>

        {/* Superadmin User Profile Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setShowUserPopover(!showUserPopover)}
            className="h-9 pl-1.5 pr-2 sm:pr-2.5 inline-flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 shadow-2xs transition-all active:scale-95 cursor-pointer"
          >
            <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-orange-500 via-orange-600 to-amber-500 text-white font-black text-[10px] flex items-center justify-center shadow-xs">
              AD
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-bold text-slate-800 leading-tight">Superadmin</span>
              <span className="text-[9px] font-extrabold text-orange-600 tracking-wider">ADMIN</span>
            </div>
            <ChevronDown size={13} className="text-slate-400" />
          </button>

          {showUserPopover && (
            <div className="absolute right-0 top-full mt-2 w-60 bg-white border border-slate-200/90 rounded-2xl shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="p-2.5 pb-3 mb-1 border-b border-slate-100">
                <div className="text-xs font-bold text-slate-900">Superadmin</div>
                <div className="text-[11px] text-slate-400 font-medium truncate">admin@example.com</div>
              </div>

              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowUserPopover(false);
                    onOpenAccountModal();
                  }}
                  className="w-full px-2.5 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <ShieldCheck size={15} className="text-orange-600" />
                  <span>{t("accountSettings", "Tài khoản & Bảo mật")}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowUserPopover(false);
                    onOpenTerms();
                  }}
                  className="w-full px-2.5 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Scale size={15} className="text-slate-400" />
                  <span>{t("menuTerms", "Điều khoản & Pháp lý")}</span>
                </button>

                <div className="my-1 border-t border-slate-100" />

                <button
                  type="button"
                  onClick={() => {
                    setShowUserPopover(false);
                    onLogout();
                  }}
                  className="w-full px-2.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Power size={15} />
                  <span>{t("logout", "Đăng xuất")}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
