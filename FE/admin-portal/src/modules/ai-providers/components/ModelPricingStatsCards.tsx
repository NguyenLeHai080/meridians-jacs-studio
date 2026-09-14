import React from "react";
import {
  Bot,
  CheckCircle2,
  PauseCircle,
  TrendingUp,
  Sparkles,
  ShieldCheck,
  Zap,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import { useI18n } from "../../../core/i18n";

interface ModelPricingStatsCardsProps {
  metrics: {
    total: number;
    selling: number;
    paused: number;
    avgMargin: number;
    providerGroupsCount: number;
  };
}

export const ModelPricingStatsCards: React.FC<ModelPricingStatsCardsProps> = ({ metrics }) => {
  const { t } = useI18n();
  const sellingPercent = metrics.total > 0 ? Math.round((metrics.selling / metrics.total) * 100) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Models */}
      <div className="group relative bg-white/95 backdrop-blur-sm border border-slate-200/80 hover:border-amber-400/60 rounded-2xl p-5 shadow-xs hover:shadow-lg hover:shadow-amber-500/5 hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute -top-10 -right-10 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/20 transition-all duration-300" />

        <div className="relative flex items-start justify-between gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500/15 via-orange-500/15 to-yellow-500/15 border border-amber-300/60 flex items-center justify-center text-amber-600 shrink-0 shadow-xs group-hover:scale-105 transition-transform duration-200">
            <Bot size={24} className="stroke-[2.2]" />
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60 shadow-2xs">
            <Layers size={11} className="text-amber-600" />
            <span>{metrics.providerGroupsCount} hãng</span>
          </span>
        </div>

        <div className="relative mt-4">
          <div className="text-[11.5px] font-bold text-slate-500 uppercase tracking-wider">
            {t("statTotalModels", "Tổng số Model AI")}
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight mt-1 flex items-baseline gap-2">
            <span>{metrics.total}</span>
            <span className="text-xs font-bold text-slate-400">
              {t("statModelsUnit", "model")}
            </span>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5 truncate">
              <Sparkles size={12} className="text-amber-500 shrink-0" />
              <span className="truncate">Sẵn sàng cho Tool Desktop</span>
            </span>
            <span className="font-mono font-bold text-slate-700">100% catalog</span>
          </div>
        </div>
      </div>

      {/* 2. Active Selling Models */}
      <div className="group relative bg-white/95 backdrop-blur-sm border border-slate-200/80 hover:border-emerald-400/60 rounded-2xl p-5 shadow-xs hover:shadow-lg hover:shadow-emerald-500/5 hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
        <div className="absolute -top-10 -right-10 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/20 transition-all duration-300" />

        <div className="relative flex items-start justify-between gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500/15 via-teal-500/15 to-emerald-500/15 border border-emerald-300/60 flex items-center justify-center text-emerald-600 shrink-0 shadow-xs group-hover:scale-105 transition-transform duration-200">
            <CheckCircle2 size={24} className="stroke-[2.2]" />
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>{sellingPercent}% kích hoạt</span>
          </span>
        </div>

        <div className="relative mt-4">
          <div className="text-[11.5px] font-bold text-slate-500 uppercase tracking-wider">
            {t("statActiveSellingModels", "Đang cấp phép Desktop")}
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 leading-tight mt-1 flex items-baseline gap-2">
            <span>{metrics.selling}</span>
            <span className="text-xs font-bold text-slate-400">
              /{metrics.total} {t("statModelsUnit", "model")}
            </span>
          </div>

          {/* Mini Progress Bar */}
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${sellingPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10.5px] text-slate-500">
              <span>Đang mở quyền gọi API</span>
              <span className="font-bold text-emerald-600">Khách dùng được</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Paused Models */}
      <div className="group relative bg-white/95 backdrop-blur-sm border border-slate-200/80 hover:border-slate-400/60 rounded-2xl p-5 shadow-xs hover:shadow-lg hover:shadow-slate-500/5 hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
        <div className="absolute -top-10 -right-10 w-28 h-28 bg-slate-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-slate-500/10 transition-all duration-300" />

        <div className="relative flex items-start justify-between gap-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0 shadow-xs group-hover:scale-105 transition-transform duration-200">
            <PauseCircle size={24} className="stroke-[2.2]" />
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200/80 shadow-2xs">
            <ShieldCheck size={11} className="text-slate-500" />
            <span>Khóa gọi</span>
          </span>
        </div>

        <div className="relative mt-4">
          <div className="text-[11.5px] font-bold text-slate-500 uppercase tracking-wider">
            {t("statPausedModels", "Tạm khóa / Chưa mở")}
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-700 leading-tight mt-1 flex items-baseline gap-2">
            <span>{metrics.paused}</span>
            <span className="text-xs font-bold text-slate-400">
              {t("statModelsUnit", "model")}
            </span>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
              <span className="truncate">{t("statPausedDesc", "Chặn gọi từ tool Desktop")}</span>
            </span>
            <span className="font-mono font-bold text-slate-600">Bảo trì/Ẩn</span>
          </div>
        </div>
      </div>

      {/* 4. Average Profit Margin */}
      <div className="group relative bg-white/95 backdrop-blur-sm border border-slate-200/80 hover:border-indigo-400/60 rounded-2xl p-5 shadow-xs hover:shadow-lg hover:shadow-indigo-500/5 hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
        <div className="absolute -top-10 -right-10 w-28 h-28 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-indigo-500/20 transition-all duration-300" />

        <div className="relative flex items-start justify-between gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500/15 via-purple-500/15 to-pink-500/15 border border-indigo-300/60 flex items-center justify-center text-indigo-600 shrink-0 shadow-xs group-hover:scale-105 transition-transform duration-200">
            <TrendingUp size={24} className="stroke-[2.2]" />
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60 shadow-2xs">
            <ArrowUpRight size={12} className="text-indigo-600" />
            <span>Markup Rate</span>
          </span>
        </div>

        <div className="relative mt-4">
          <div className="text-[11.5px] font-bold text-slate-500 uppercase tracking-wider">
            {t("statAvgMargin", "Biên lợi nhuận trung bình")}
          </div>
          <div className="text-2xl sm:text-3xl font-black text-indigo-600 leading-tight mt-1 flex items-baseline gap-1.5">
            <span>+{metrics.avgMargin}%</span>
            <span className="text-xs font-bold text-slate-400">gộp</span>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5 truncate">
              <Zap size={12} className="text-indigo-500 shrink-0" />
              <span className="truncate">{t("statAvgMarginDesc", "Chênh lệch giá bán / giá vốn")}</span>
            </span>
            <span className="font-mono font-bold text-indigo-600">Tối ưu Cr</span>
          </div>
        </div>
      </div>
    </div>
  );
};
