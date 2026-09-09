import React from "react";
import {
  Calculator,
  Sparkles,
  TrendingUp,
  Coins,
  Video,
  Layers,
  DollarSign,
  Zap,
  ArrowUpRight,
  Clock,
  Film,
} from "lucide-react";
import type { ModelPricing } from "../services/modelPricingService";
import { useI18n } from "../../../core/i18n";

interface ModelPricingSimulatorCardProps {
  models: ModelPricing[];
  simModel: string;
  setSimModel: (model: string) => void;
  simVideoMinutes: number;
  setSimVideoMinutes: (min: number) => void;
  simVideosCount: number;
  setSimVideosCount: (count: number) => void;
  simulation: {
    estTokensIn: number;
    estTokensOut: number;
    revenueVnd: number;
    costVnd: number;
    profitVnd: number;
    profitPct: number;
    selected: ModelPricing | null;
  };
}

export const ModelPricingSimulatorCard: React.FC<ModelPricingSimulatorCardProps> = ({
  models,
  simModel,
  setSimModel,
  simVideoMinutes,
  setSimVideoMinutes,
  simVideosCount,
  setSimVideosCount,
  simulation,
}) => {
  const { t } = useI18n();

  return (
    <div className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white border border-slate-800/90 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6 overflow-hidden">
      {/* Background Decorative Glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-orange-500/20 to-yellow-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shadow-lg shadow-amber-500/10 shrink-0">
            <Calculator size={22} className="stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight">
                {t("simulatorModelTitle", "Giả Lập Ước Tính Lợi Nhuận Cho Model AI")}
              </h3>
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                <Sparkles size={10} className="text-amber-400" />
                <span>Live Calculator</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {t("simulatorModelSubtitle", "Tính toán doanh thu, chi phí vốn và biên lợi nhuận theo khối lượng video xử lý.")}
            </p>
          </div>
        </div>

        <div className="text-xs text-slate-400 bg-slate-800/60 border border-slate-700/60 px-3 py-1.5 rounded-xl font-mono self-start sm:self-auto">
          Quy đổi: <strong className="text-amber-300">1đ = 1 Credit</strong>
        </div>
      </div>

      {/* Simulator Inputs Controls */}
      <div className="relative grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* 1. Select Model */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-300">
            {t("lblSelectModelSim", "Chọn Model thử nghiệm:")}
          </label>
          <div className="relative">
            <select
              value={simModel}
              onChange={(e) => setSimModel(e.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-xs font-bold text-white focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20 shadow-inner appearance-none cursor-pointer"
            >
              {models.map((m) => (
                <option key={m.id || m.model} value={m.model} className="bg-slate-900 text-white">
                  {m.model} ({m.provider_name}) — Vào: {m.input_price}đ / Ra: {m.output_price}đ
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
              <span className="text-xs">▼</span>
            </div>
          </div>
          {simulation.selected && (
            <div className="text-[11px] text-slate-400 flex items-center gap-2">
              <span>Vốn: <strong className="text-rose-400">{simulation.selected.cost_input_price ?? 0}đ</strong></span>
              <span>•</span>
              <span>Bán: <strong className="text-emerald-400">{simulation.selected.input_price}đ</strong></span>
            </div>
          )}
        </div>

        {/* 2. Video Duration (Minutes) */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-300 flex items-center justify-between">
            <span>{t("lblVideoDuration", "Thời lượng TB mỗi video (Phút):")}</span>
            <span className="text-amber-400 font-mono font-bold">{simVideoMinutes} phút</span>
          </label>
          <div className="flex items-center gap-1.5">
            {[10, 20, 30, 60].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setSimVideoMinutes(m)}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  simVideoMinutes === m
                    ? "bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20 scale-102"
                    : "bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/80"
                }`}
              >
                {m}m
              </button>
            ))}
          </div>
          <div className="relative">
            <input
              type="number"
              min="1"
              value={simVideoMinutes}
              onChange={(e) => setSimVideoMinutes(Math.max(1, Number(e.target.value) || 1))}
              className="w-full rounded-2xl border border-slate-700 bg-slate-900/90 px-4 py-2 font-mono text-xs font-bold text-white focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20 shadow-inner"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-mono">
              phút / video
            </span>
          </div>
        </div>

        {/* 3. Number of Videos */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-300 flex items-center justify-between">
            <span>{t("lblVideoCount", "Số lượng video dự kiến xử lý:")}</span>
            <span className="text-amber-400 font-mono font-bold">{simVideosCount} video</span>
          </label>
          <div className="flex items-center gap-1.5">
            {[5, 10, 50, 100].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setSimVideosCount(c)}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  simVideosCount === c
                    ? "bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20 scale-102"
                    : "bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/80"
                }`}
              >
                {c} vid
              </button>
            ))}
          </div>
          <div className="relative">
            <input
              type="number"
              min="1"
              value={simVideosCount}
              onChange={(e) => setSimVideosCount(Math.max(1, Number(e.target.value) || 1))}
              className="w-full rounded-2xl border border-slate-700 bg-slate-900/90 px-4 py-2 font-mono text-xs font-bold text-white focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20 shadow-inner"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-mono">
              videos
            </span>
          </div>
        </div>
      </div>

      {/* Simulator Results Dashboard Cards */}
      <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-slate-800/80">
        {/* 1. Estimated Tokens */}
        <div className="group rounded-2xl bg-slate-900/90 p-4 border border-slate-800 hover:border-slate-700 transition-all duration-200 space-y-1.5 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            {t("simTotalTokens", "Tổng Tokens Ước Tính")}
          </span>
          <div className="text-xl sm:text-2xl font-black text-amber-400 font-mono">
            {((simulation.estTokensIn + simulation.estTokensOut) / 1000).toFixed(1)}K{" "}
            <span className="text-xs font-bold text-slate-400">Tokens</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono pt-1 border-t border-slate-800/80 flex items-center justify-between">
            <span>In: {(simulation.estTokensIn / 1000).toFixed(0)}K</span>
            <span>•</span>
            <span>Out: {(simulation.estTokensOut / 1000).toFixed(0)}K</span>
          </div>
        </div>

        {/* 2. Expected Revenue */}
        <div className="group rounded-2xl bg-slate-900/90 p-4 border border-slate-800 hover:border-slate-700 transition-all duration-200 space-y-1.5 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            {t("simExpectedRevenue", "Doanh Thu Dự Kiến")}
          </span>
          <div className="text-xl sm:text-2xl font-black text-white font-mono">
            {simulation.revenueVnd.toLocaleString()}{" "}
            <span className="text-xs font-bold text-slate-400">VNĐ</span>
          </div>
          <div className="text-[11px] text-amber-300 font-mono pt-1 border-t border-slate-800/80 flex items-center justify-between">
            <span>{simulation.revenueVnd.toLocaleString()} Credit</span>
            <span className="text-slate-500 font-sans">Trừ ví tool</span>
          </div>
        </div>

        {/* 3. Estimated Cost */}
        <div className="group rounded-2xl bg-slate-900/90 p-4 border border-slate-800 hover:border-slate-700 transition-all duration-200 space-y-1.5 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            {t("simEstimatedCost", "Chi Phí Vốn Ước Tính")}
          </span>
          <div className="text-xl sm:text-2xl font-black text-rose-400 font-mono">
            {simulation.costVnd.toLocaleString()}{" "}
            <span className="text-xs font-bold text-slate-400">VNĐ</span>
          </div>
          <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/80 flex items-center justify-between">
            <span>Trả cho Provider</span>
            <span className="text-rose-400/80 font-mono font-bold">Vốn API</span>
          </div>
        </div>

        {/* 4. Estimated Profit & Margin */}
        <div className="group rounded-2xl bg-gradient-to-br from-emerald-950/80 via-emerald-900/30 to-slate-900 p-4 border border-emerald-500/50 hover:border-emerald-400 transition-all duration-200 space-y-1.5 shadow-lg shadow-emerald-500/10">
          <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
            {t("simGrossProfit", "Lợi Nhuận & Tỷ Suất")}
          </span>
          <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
            +{simulation.profitVnd.toLocaleString()}{" "}
            <span className="text-xs font-bold text-emerald-300">VNĐ</span>
          </div>
          <div className="text-[11px] font-bold text-emerald-300 pt-1 border-t border-emerald-500/30 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <TrendingUp size={13} className="text-emerald-400" />
              <span>Biên lãi:</span>
            </span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-mono font-black">
              {simulation.profitPct}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
