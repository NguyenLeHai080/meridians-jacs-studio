import React from "react";
import { Search, X, Filter, Sparkles, SlidersHorizontal, Layers, CheckCircle2, PauseCircle } from "lucide-react";
import { useI18n } from "../../../core/i18n";

interface ModelPricingTableFilterProps {
  filterCategory: string;
  setFilterCategory: (cat: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  totalCount: number;
  sellingCount: number;
  pausedCount: number;
  filteredCount: number;
}

export const ModelPricingTableFilter: React.FC<ModelPricingTableFilterProps> = ({
  filterCategory,
  setFilterCategory,
  searchQuery,
  setSearchQuery,
  totalCount,
  sellingCount,
  pausedCount,
  filteredCount,
}) => {
  const { t } = useI18n();

  const filterTabs = [
    { key: "all", label: t("filterAll", "Tất cả"), count: totalCount, emoji: "✨" },
    { key: "selling", label: t("filterSellingOnly", "Đang mở bán"), count: sellingCount, emoji: "🟢" },
    { key: "paused", label: t("filterPausedOnly", "Đang tắt"), count: pausedCount, emoji: "⚪" },
    { key: "analysis", label: "Kịch bản & Phân tích", count: undefined, emoji: "📝" },
    { key: "cinema", label: t("filterCinema", "Điện ảnh"), count: undefined, emoji: "🎬" },
    { key: "vision", label: t("filterVision", "Thị giác"), count: undefined, emoji: "👁️" },
    { key: "reasoning", label: t("filterReasoning", "Suy luận CoT"), count: undefined, emoji: "🧠" },
    { key: "speed", label: t("filterSpeed", "Siêu tốc"), count: undefined, emoji: "⚡" },
    { key: "tts", label: t("filterTts", "Voice TTS"), count: undefined, emoji: "🗣️" },
  ];

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
      {/* Top Search & Filter Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-50/70 via-white to-orange-50/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500/15 via-amber-500/15 to-yellow-500/15 text-orange-600 flex items-center justify-center border border-orange-200/80 shrink-0 shadow-xs">
            <SlidersHorizontal size={18} className="stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                {t("pricingTableTitle", "Bảng Giá Cấp Phép & Định Giá Chi Tiết Cho Tool")}
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200/80 font-mono">
                {filteredCount} / {totalCount} model
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {t("pricingTableSubtitle", "Bỏ tick = Khóa quyền gọi model. Nhấn 'Sửa' để chỉnh chi tiết giá vốn và biên lợi nhuận.")}
            </p>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("searchPlaceholderModels", "Tìm mã model, hãng cung cấp...")}
            className="w-full pl-9.5 pr-8 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-200/90 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-3 focus:ring-orange-500/10 placeholder-slate-400 shadow-2xs transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Filter Category Tabs */}
      <div className="px-4 py-3 bg-slate-50/50 border-b border-slate-100/90 flex items-center gap-2 overflow-x-auto scrollbar-none">
        {filterTabs.map((tab) => {
          const isSelected = filterCategory === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilterCategory(tab.key)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer select-none ${
                isSelected
                  ? "bg-slate-900 text-white shadow-sm ring-2 ring-slate-900/10"
                  : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 hover:bg-slate-100/80 hover:border-slate-300"
              }`}
            >
              <span>{tab.emoji}</span>
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                    isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
