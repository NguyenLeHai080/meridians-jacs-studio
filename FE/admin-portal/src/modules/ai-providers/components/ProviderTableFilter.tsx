import React from "react";
import { Search, X, SlidersHorizontal, List, FolderTree } from "lucide-react";
import type { ProviderFilterType } from "../hooks/useProvidersManagement";
import { useI18n } from "../../../core/i18n";

interface ProviderTableFilterProps {
  filteredCount: number;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filterTab: ProviderFilterType;
  setFilterTab: (tab: ProviderFilterType) => void;
  viewMode: "flat" | "grouped";
  setViewMode: (mode: "flat" | "grouped") => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  metrics: {
    total: number;
    active: number;
    disabled: number;
    visionCount: number;
    ttsCount: number;
    cinemaCount: number;
    reasoningCount: number;
  };
}

export const ProviderTableFilter: React.FC<ProviderTableFilterProps> = ({
  filteredCount,
  searchQuery,
  setSearchQuery,
  filterTab,
  setFilterTab,
  viewMode,
  setViewMode,
  pageSize,
  setPageSize,
  metrics,
}) => {
  const { t } = useI18n();

  const tabs: Array<{
    id: ProviderFilterType;
    label: string;
    count?: number;
  }> = [
    {
      id: "all",
      label: t("filterAll", "Tất cả"),
      count: metrics.total,
    },
    {
      id: "active",
      label: t("filterActive", "Đang bật"),
      count: metrics.active,
    },
    {
      id: "disabled",
      label: t("filterDisabled", "Đã tắt"),
      count: metrics.disabled,
    },
    {
      id: "cinema",
      label: t("filterCinema", "Kịch bản & Điện ảnh"),
      count: metrics.cinemaCount,
    },
    {
      id: "vision",
      label: t("filterVision", "Thị giác Video"),
      count: metrics.visionCount,
    },
    {
      id: "tts",
      label: t("filterTts", "Voice & Lồng tiếng"),
      count: metrics.ttsCount,
    },
    {
      id: "transcription",
      label: t("filterTranscription", "Bóc tách Whisper"),
    },
  ];

  return (
    <div className="p-4 sm:p-5 border-b border-slate-200/90 bg-white space-y-3">
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3.5">
        {/* Horizontal Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 xl:pb-0 scrollbar-thin">
          {tabs.map((tab) => {
            const isActive = filterTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterTab(tab.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-150 whitespace-nowrap active:scale-95 shrink-0 ${
                  isActive
                    ? "bg-orange-50 text-orange-700 border border-orange-200 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-transparent"
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold ${
                      isActive
                        ? "bg-orange-600 text-white shadow-2xs"
                        : "bg-slate-100 text-slate-600 border border-slate-200"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search, View Mode & Page Size */}
        <div className="flex items-center gap-2.5 flex-1 max-w-full xl:max-w-xl justify-end">
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
              placeholder={t(
                "searchPlaceholderProviders",
                "Tìm theo tên provider, model, loại kết nối, URL..."
              )}
              className="w-full pl-9 pr-8 py-2 text-xs font-semibold text-slate-800 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 focus:border-orange-500 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500/15 transition-all shadow-2xs"
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

          {/* View Mode Toggle */}
          <div className="flex items-center p-1 bg-slate-100 border border-slate-200 rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => setViewMode("flat")}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === "flat"
                  ? "bg-white text-orange-600 shadow-2xs font-bold"
                  : "text-slate-500 hover:text-slate-900"
              }`}
              title={t("viewModeFlat", "Xem danh sách")}
            >
              <List size={15} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grouped")}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === "grouped"
                  ? "bg-white text-orange-600 shadow-2xs font-bold"
                  : "text-slate-500 hover:text-slate-900"
              }`}
              title={t("viewModeGrouped", "Xem theo nhóm chức năng")}
            >
              <FolderTree size={15} />
            </button>
          </div>

          {/* Page Size */}
          {viewMode === "flat" && (
            <div className="flex items-center gap-1.5 shrink-0">
              <SlidersHorizontal size={14} className="text-slate-400 hidden sm:block" />
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                aria-label={t("pageSizeLabel", "Số bản ghi")}
                className="px-2.5 py-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15 transition-all"
              >
                <option value={5}>5 / {t("pageUnit", "trang")}</option>
                <option value={10}>10 / {t("pageUnit", "trang")}</option>
                <option value={20}>20 / {t("pageUnit", "trang")}</option>
                <option value={50}>50 / {t("pageUnit", "trang")}</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Filter summary when searching */}
      {searchQuery && (
        <div className="text-xs text-slate-500 flex items-center justify-between pt-1">
          <span>
            {t("foundResults", "Tìm thấy")}{" "}
            <strong className="text-slate-900">{filteredCount}</strong>{" "}
            {t("providersUnit", "provider phù hợp")}
          </span>
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="text-[11px] font-bold text-orange-600 hover:underline"
          >
            {t("clearSearch", "Xóa tìm kiếm")}
          </button>
        </div>
      )}
    </div>
  );
};
