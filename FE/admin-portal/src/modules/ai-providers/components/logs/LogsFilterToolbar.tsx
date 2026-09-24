import React from "react";
import { Search, RefreshCw, Radio } from "lucide-react";

interface LogsFilterToolbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: string;
  onStatusChange: (s: string) => void;
  selectedKey: string;
  onKeyChange: (k: string) => void;
  availableKeys: string[];
  liveMode: boolean;
  onToggleLive: () => void;
  loading: boolean;
  onRefresh: () => void;
}

export const LogsFilterToolbar: React.FC<LogsFilterToolbarProps> = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  selectedKey,
  onKeyChange,
  availableKeys,
  liveMode,
  onToggleLive,
  loading,
  onRefresh,
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white border border-slate-200 p-3 rounded-xl shadow-xs mb-4">
      {/* Search & Status Filters */}
      <div className="flex flex-wrap items-center gap-2 flex-1">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo model, key, khách hàng..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:bg-white focus:border-blue-500 font-medium"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="Oke">Thành công (Oke)</option>
          <option value="Fail">Lỗi / Thất bại (Fail)</option>
        </select>

        <select
          value={selectedKey}
          onChange={(e) => onKeyChange(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:bg-white focus:border-blue-500 font-medium"
        >
          <option value="all">Mọi Key ({availableKeys.length})</option>
          {availableKeys.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </div>

      {/* Live Stream & Refresh */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleLive}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
            liveMode
              ? "bg-rose-50 text-rose-600 border-rose-200 shadow-xs"
              : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
          }`}
          title={liveMode ? "Đang bật tự động nhận request mới" : "Bật chế độ live stream"}
        >
          <Radio className={`w-3.5 h-3.5 ${liveMode ? "animate-pulse text-rose-600" : "text-slate-400"}`} />
          <span>{liveMode ? "Live Stream ON" : "Live Stream OFF"}</span>
        </button>

        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-all disabled:opacity-50 shadow-xs"
          title="Tải lại logs"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? "animate-spin text-blue-500" : ""}`} />
          <span>Làm mới</span>
        </button>
      </div>
    </div>
  );
};
