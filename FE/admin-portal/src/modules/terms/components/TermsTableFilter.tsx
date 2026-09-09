import React from "react";
import { Search, X, SlidersHorizontal } from "lucide-react";
import type { EulaStatusFilter, TermsMetrics } from "../types";
import { useI18n } from "../../../core/i18n";

interface TermsTableFilterProps {
  filteredCount: number;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  statusFilter: EulaStatusFilter;
  setStatusFilter: (f: EulaStatusFilter) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  metrics: TermsMetrics;
}

export const TermsTableFilter: React.FC<TermsTableFilterProps> = ({
  filteredCount,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  pageSize,
  setPageSize,
  metrics,
}) => {
  const { t } = useI18n();

  const tabs: Array<{
    id: EulaStatusFilter;
    label: string;
    count: number;
  }> = [
    {
      id: "all",
      label: t("filterAll", "Tất cả"),
      count: metrics.total,
    },
    {
      id: "active",
      label: t("filterActive", "Đang có hiệu lực"),
      count: metrics.active,
    },
    {
      id: "draft",
      label: t("filterDraft", "Dự thảo"),
      count: metrics.draft,
    },
    {
      id: "archived",
      label: t("filterArchived", "Hết hiệu lực"),
      count: metrics.archived,
    },
  ];

  return (
    <div className="p-4 sm:p-5 border-b border-slate-200/90 bg-white">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Horizontal Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-thin">
          {tabs.map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-150 whitespace-nowrap active:scale-95 shrink-0 ${
                  isActive
                    ? "bg-orange-50 text-orange-700 border border-orange-200 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-transparent"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold ${
                    isActive
                      ? "bg-orange-600 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 border border-slate-200"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input & Page Size Select */}
        <div className="flex items-center gap-2.5 flex-1 max-w-full lg:max-w-md justify-end">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("searchPlaceholderTerms", "Tìm theo số hiệu, trích yếu, nội dung điều khoản...")}
              className="w-full pl-9 pr-8 py-2 text-xs font-semibold text-slate-800 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 focus:border-orange-500 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500/15 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Page Size */}
          <div className="flex items-center gap-1.5 shrink-0">
            <SlidersHorizontal size={14} className="text-slate-400 hidden sm:block" />
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              aria-label={t("pageSizeLabel", "Số văn bản mỗi trang")}
              className="px-2.5 py-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15 transition-all"
            >
              <option value={5}>5 / {t("pageUnit", "trang")}</option>
              <option value={10}>10 / {t("pageUnit", "trang")}</option>
              <option value={20}>20 / {t("pageUnit", "trang")}</option>
              <option value={50}>50 / {t("pageUnit", "trang")}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Filter summary on search */}
      {searchQuery && (
        <div className="mt-2.5 text-xs text-slate-500 flex items-center justify-between">
          <span>
            {t("foundResults", "Tìm thấy")}{" "}
            <strong className="text-slate-900">{filteredCount}</strong>{" "}
            {t("termsDocumentUnit", "văn bản phù hợp")}
          </span>
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="text-[11px] font-bold text-orange-600 hover:underline"
          >
            {t("clearSearch", "Xóa bộ lọc")}
          </button>
        </div>
      )}
    </div>
  );
};
