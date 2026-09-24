import React from "react";
import { RotateCw, Plus, Shield } from "lucide-react";

interface ProviderHeaderProps {
  loading: boolean;
  onRefresh: () => void;
  onOpenCreate: () => void;
}

export const ProviderHeader: React.FC<ProviderHeaderProps> = ({
  loading,
  onRefresh,
  onOpenCreate,
}) => {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight m-0">
            Quản Lý Nhà Cung Cấp (AI Upstream Providers)
          </h1>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            Cấu hình dịch vụ
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <Shield size={11} className="text-purple-600" />
            <span>Super Admin (Toàn quyền)</span>
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          Quản trị các cổng kết nối AI Upstream (Xompet Gateway, OpenAI), kiểm tra kết nối thời gian thực, chuyển đổi cổng chính và định tuyến mô hình.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 shrink-0 self-start lg:self-center">
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          <RotateCw size={13} className={loading ? "animate-spin text-orange-500" : "text-slate-500"} />
          <span>Làm mới</span>
        </button>

        <button
          type="button"
          onClick={onOpenCreate}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[11px] font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 rounded-xl shadow-md shadow-orange-500/25 transition-all active:scale-95 cursor-pointer"
        >
          <Plus size={14} />
          <span>+ Thêm Nhà Cung Cấp</span>
        </button>
      </div>
    </div>
  );
};
