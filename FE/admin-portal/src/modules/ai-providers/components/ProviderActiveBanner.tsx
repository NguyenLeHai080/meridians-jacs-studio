import React from "react";
import { Sliders, Zap } from "lucide-react";
import type { Provider } from "../../../core/types";

interface ProviderActiveBannerProps {
  primaryProvider: Provider | null;
  isTestingAll: boolean;
  hasProviders: boolean;
  onTestAllLatencies: () => void;
}

export const ProviderActiveBanner: React.FC<ProviderActiveBannerProps> = ({
  primaryProvider,
  isTestingAll,
  hasProviders,
  onTestAllLatencies,
}) => {
  return (
    <div className="bg-[#181d28] border border-slate-700/60 rounded-2xl p-4 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0">
          <Sliders size={18} className="stroke-[2.2]" />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-xs sm:text-sm tracking-tight text-white">
              Cổng Chính Đang Hoạt Động: {primaryProvider?.name || "Nhà Cung Cấp 01"}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Đang xử lý</span>
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
            Chuẩn Native OpenAI Image API ({primaryProvider?.base_url || "https://api.xompet.io.vn/v1"}) • Điểm ảnh thực • Đơn giá vốn {primaryProvider?.cost_per_image || 75}đ - 75đ • Không phụ thu ảnh tham chiếu.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onTestAllLatencies}
        disabled={isTestingAll || !hasProviders}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-slate-300 bg-slate-800/80 hover:bg-slate-700 hover:text-white border border-slate-600/60 rounded-xl transition-all active:scale-95 shrink-0 self-start md:self-center disabled:opacity-50 cursor-pointer"
      >
        <Zap size={13} className={isTestingAll ? "animate-bounce text-amber-400" : "text-slate-400"} />
        <span>{isTestingAll ? "Đang kiểm tra..." : "Kiểm tra Ping toàn bộ"}</span>
      </button>
    </div>
  );
};
