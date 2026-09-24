import React from "react";
import { Search, Layers, Globe, Plus } from "lucide-react";

interface PricingToolbarProps {
  activeTab: "my_models" | "marketplace";
  onTabChange: (tab: "my_models" | "marketplace") => void;
  myCount: number;
  marketCount: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedGroup: string;
  onGroupChange: (g: string) => void;
  groups: string[];
  onOpenAddCustom: () => void;
}

export const PricingToolbar: React.FC<PricingToolbarProps> = ({
  activeTab,
  onTabChange,
  myCount,
  marketCount,
  searchQuery,
  onSearchChange,
  selectedGroup,
  onGroupChange,
  groups,
  onOpenAddCustom,
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white border border-slate-200 p-3 rounded-xl shadow-xs mb-4">
      {/* Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
        <button
          onClick={() => onTabChange("my_models")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
            activeTab === "my_models"
              ? "bg-white text-blue-600 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Model Đang Phục Vụ</span>
          <span className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full ${
            activeTab === "my_models" ? "bg-blue-50 text-blue-600" : "bg-slate-200 text-slate-600"
          }`}>
            {myCount}
          </span>
        </button>

        <button
          onClick={() => onTabChange("marketplace")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
            activeTab === "marketplace"
              ? "bg-white text-blue-600 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Catalog Nhà Cung Cấp</span>
          <span className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full ${
            activeTab === "marketplace" ? "bg-blue-50 text-blue-600" : "bg-slate-200 text-slate-600"
          }`}>
            {marketCount}
          </span>
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-2 flex-1 md:max-w-md justify-end">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên model..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500"
          />
        </div>

        <select
          value={selectedGroup}
          onChange={(e) => onGroupChange(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:bg-white focus:border-blue-500 font-medium"
        >
          <option value="all">Mọi nhóm</option>
          {groups.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>

        {activeTab === "my_models" && (
          <button
            onClick={onOpenAddCustom}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm Model</span>
          </button>
        )}
      </div>
    </div>
  );
};
