import React from "react";
import { Search, X, LayoutGrid, Wifi, WifiOff, Clock, Lock } from "lucide-react";
import type { StatusFilter } from "../pages/UserManagementPage";
import { useI18n } from "../../../core/i18n";

export interface UserTableFilterProps {
  filteredCount: number;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  statusFilter: StatusFilter;
  setStatusFilter: (s: StatusFilter) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  metrics: {
    total: number;
    online: number;
    offline: number;
    expired: number;
    blocked: number;
  };
}

export function UserTableFilter({
  filteredCount,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  pageSize,
  setPageSize,
  metrics,
}: UserTableFilterProps) {
  const { t } = useI18n();

  const tabs = [
    {
      key: "all",
      label: t("tabAll"),
      count: metrics.total,
      icon: LayoutGrid,
      color: "text-slate-500",
      activeColor: "text-orange-600",
    },
    {
      key: "online",
      label: t("tabOnline"),
      count: metrics.online,
      icon: Wifi,
      color: "text-emerald-500",
      activeColor: "text-emerald-600",
    },
    {
      key: "offline",
      label: t("tabOffline"),
      count: metrics.offline,
      icon: WifiOff,
      color: "text-slate-400",
      activeColor: "text-slate-700",
    },
    {
      key: "expired",
      label: t("tabExpired"),
      count: metrics.expired,
      icon: Clock,
      color: "text-rose-500",
      activeColor: "text-rose-600",
    },
    {
      key: "blocked",
      label: t("tabBlocked"),
      count: metrics.blocked,
      icon: Lock,
      color: "text-amber-500",
      activeColor: "text-amber-600",
    },
  ];

  return (
    <div className="border-b border-slate-200/80 bg-white">
      {/* Search Header Bar */}
      <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 m-0 tracking-tight">
              {t("tableTitle")}
            </h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200">
              {filteredCount} {t("devicesCount")}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {t("tableSubtitle")}
          </p>
        </div>

        {/* Search Box Input */}
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder={t("searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-orange-500 focus:ring-3 focus:ring-orange-500/15 transition-all duration-150 placeholder:text-slate-400 shadow-2xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
              title={t("clearSearch")}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs & Pagination Options */}
      <div className="px-4 sm:px-5 py-3 bg-slate-50/70 border-t border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0 scrollbar-thin">
          {tabs.map((tab) => {
            const isActive = statusFilter === tab.key;
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key as StatusFilter)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-all duration-150 active:scale-95 ${
                  isActive
                    ? "bg-white text-slate-900 shadow-xs border border-slate-300/80"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 border border-transparent"
                }`}
              >
                <TabIcon size={13} className={isActive ? tab.activeColor : tab.color} />
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
                  isActive ? "bg-orange-100 text-orange-700" : "bg-slate-200 text-slate-600"
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Page Size Select */}
        <div className="flex items-center justify-end gap-2 text-xs text-slate-600 font-medium shrink-0">
          <span className="text-slate-500">{t("pageSizeLabel")}</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg shadow-2xs focus:outline-hidden focus:border-orange-500"
          >
            <option value={10}>10 {t("pageSizeRows")}</option>
            <option value={20}>20 {t("pageSizeRows")}</option>
            <option value={50}>50 {t("pageSizeRows")}</option>
            <option value={100}>100 {t("pageSizeRows")}</option>
          </select>
        </div>
      </div>
    </div>
  );
}
