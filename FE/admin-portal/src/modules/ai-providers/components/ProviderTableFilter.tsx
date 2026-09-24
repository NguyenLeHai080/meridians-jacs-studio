import React from "react";
import { Search, List as ListIcon, LayoutGrid } from "lucide-react";

interface ProviderTableFilterProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filterTab: "all" | "active";
  setFilterTab: (tab: "all" | "active") => void;
  viewMode: "table" | "grid";
  setViewMode: (mode: "table" | "grid") => void;
  totalCount: number;
  activeCount: number;
}

export const ProviderTableFilter: React.FC<ProviderTableFilterProps> = ({
  searchQuery,
  setSearchQuery,
  filterTab,
  setFilterTab,
  viewMode,
  setViewMode,
  totalCount,
  activeCount,
}) => {
  return (
    <div className="p-3.5 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
      {/* Search Box */}
      <div className="relative flex-1 max-w-md">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm kiếm theo tên nhà cung cấp, cổng URL, model..."
          className="w-full pl-8 pr-3 py-1.5 text-[11px] rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-slate-50/50"
        />
      </div>

      {/* Filter Tabs & View Mode */}
      <div className="flex items-center justify-between md:justify-end gap-2.5">
        <div className="flex items-center bg-slate-100/80 p-0.5 rounded-xl border border-slate-200/70">
          <button
            type="button"
            onClick={() => setFilterTab("all")}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
              filterTab === "all"
                ? "bg-white text-slate-800 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Tất cả ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("active")}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
              filterTab === "active"
                ? "bg-white text-slate-800 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Đang hoạt động ({activeCount})
          </button>
        </div>

        {/* Layout Toggle */}
        <div className="flex items-center gap-1 border border-slate-200 rounded-xl p-0.5 bg-slate-50">
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={`p-1.5 rounded-lg transition-all ${
              viewMode === "table"
                ? "bg-white text-orange-600 shadow-xs"
                : "text-slate-400 hover:text-slate-700"
            }`}
            title="Dạng bảng"
          >
            <ListIcon size={14} />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded-lg transition-all ${
              viewMode === "grid"
                ? "bg-white text-orange-600 shadow-xs"
                : "text-slate-400 hover:text-slate-700"
            }`}
            title="Dạng lưới"
          >
            <LayoutGrid size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
