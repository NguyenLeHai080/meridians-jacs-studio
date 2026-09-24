import React from "react";
import { Search, RefreshCw, Plus, Filter } from "lucide-react";

interface JobFilterToolbarProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  modeFilter: string;
  onModeFilterChange: (val: string) => void;
  loading: boolean;
  onRefresh: () => void;
  onOpenCreate: () => void;
}

export const JobFilterToolbar: React.FC<JobFilterToolbarProps> = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  modeFilter,
  onModeFilterChange,
  loading,
  onRefresh,
  onOpenCreate,
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white border border-slate-200 p-3 rounded-xl shadow-xs mb-4">
      <div className="flex flex-1 items-center gap-2.5">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên job, ID, khách hàng..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:bg-white focus:border-blue-500 font-medium"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="running">Đang chạy (Running)</option>
            <option value="queued">Hàng đợi (Queued)</option>
            <option value="completed">Hoàn thành (Completed)</option>
            <option value="failed">Thất bại (Failed)</option>
            <option value="cancelled">Đã hủy (Cancelled)</option>
          </select>

          <select
            value={modeFilter}
            onChange={(e) => onModeFilterChange(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:bg-white focus:border-blue-500 font-medium"
          >
            <option value="all">Mọi chế độ</option>
            <option value="hybrid">Hybrid</option>
            <option value="cloud">Cloud Only</option>
            <option value="local">Local Only</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-all disabled:opacity-50 shadow-xs"
          title="Tải lại dữ liệu"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? "animate-spin text-blue-500" : ""}`} />
          <span>Làm mới</span>
        </button>

        <button
          onClick={onOpenCreate}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo Tác Vụ</span>
        </button>
      </div>
    </div>
  );
};
