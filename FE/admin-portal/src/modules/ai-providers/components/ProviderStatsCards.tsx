import React from "react";
import { Sliders, Activity, Coins, Layers } from "lucide-react";
import type { Provider } from "../../../core/types";

interface ProviderStatsCardsProps {
  primaryProvider: Provider | null;
  latencies: Record<string, { latency_ms: number; status: string }>;
  activeCount: number;
  totalModelsCount: number;
}

export const ProviderStatsCards: React.FC<ProviderStatsCardsProps> = ({
  primaryProvider,
  latencies,
  activeCount,
  totalModelsCount,
}) => {
  const currentPing =
    primaryProvider && latencies[primaryProvider.id]?.latency_ms
      ? `${latencies[primaryProvider.id].latency_ms} ms`
      : "49290 ms";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* Card 1: CỔNG NCC CHÍNH */}
      <div className="bg-white border-2 border-orange-200/90 rounded-2xl p-4 shadow-xs flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            CỔNG NCC CHÍNH
          </span>
          <div className="text-base font-extrabold text-slate-900 mt-0.5 tracking-tight">
            {primaryProvider?.name || "Nhà Cung Cấp 01"}
          </div>
          <div className="text-[11px] font-bold text-orange-600 mt-0.5">
            Model: {primaryProvider?.model || "gpt-image-2.5-flare"}
          </div>
        </div>
        <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-500 shrink-0">
          <Sliders size={18} />
        </div>
      </div>

      {/* Card 2: ĐỘ TRỄ PHẢN HỒI (PING) */}
      <div className="bg-white border-2 border-emerald-200/80 rounded-2xl p-4 shadow-xs flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            ĐỘ TRỄ PHẢN HỒI (PING)
          </span>
          <div className="text-base font-extrabold text-emerald-700 mt-0.5 tracking-tight">
            {currentPing}
          </div>
          <div className="text-[11px] font-bold text-emerald-600 mt-0.5 flex items-center gap-1">
            <span>✓</span>
            <span>Tốc độ cao Native API</span>
          </div>
        </div>
        <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
          <Activity size={18} />
        </div>
      </div>

      {/* Card 3: TỔNG SỐ MODEL KHẢ DỤNG */}
      <div className="bg-white border-2 border-amber-200/80 rounded-2xl p-4 shadow-xs flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            TỔNG SỐ MODEL KHẢ DỤNG
          </span>
          <div className="text-base font-extrabold text-slate-900 mt-0.5 tracking-tight">
            {totalModelsCount} Models
          </div>
          <div className="text-[11px] font-medium text-emerald-600 mt-0.5">
            ✓ Sẵn sàng cấp phép sinh ảnh & vision
          </div>
        </div>
        <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-500 shrink-0">
          <Layers size={18} />
        </div>
      </div>

      {/* Card 4: HẠ TẦNG CỔNG KẾT NỐI */}
      <div className="bg-white border-2 border-purple-200/80 rounded-2xl p-4 shadow-xs flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            HẠ TẦNG CỔNG KẾT NỐI
          </span>
          <div className="text-base font-extrabold text-purple-900 mt-0.5 tracking-tight">
            {activeCount || 2} NCC Sẵn Sàng
          </div>
          <div className="text-[11px] font-bold text-purple-600 mt-0.5">
            {totalModelsCount} Model AI sinh ảnh
          </div>
        </div>
        <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 shrink-0">
          <Layers size={18} />
        </div>
      </div>
    </div>
  );
};
