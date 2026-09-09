import React from "react";
import { Package, CheckCircle2, Clock, Wallet, TrendingUp, Sparkles, AlertCircle } from "lucide-react";
import { useI18n } from "../../../core/i18n";

interface CreditStatsCardsProps {
  metrics: {
    totalPackages: number;
    activePackages: number;
    pendingTopups: number;
    totalRevenue: number;
  };
}

export const CreditStatsCards: React.FC<CreditStatsCardsProps> = ({ metrics }) => {
  const { t } = useI18n();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Packages */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-500/10 via-orange-500/15 to-amber-500/10 border border-orange-200/80 flex items-center justify-center text-orange-600 shrink-0 shadow-2xs">
          <Package size={22} className="stroke-[2.2]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11.5px] font-bold text-slate-500 uppercase tracking-wider">
            {t("statTotalPackages", "Tổng số Gói Credit")}
          </div>
          <div className="text-2xl font-black text-slate-900 leading-tight mt-0.5 flex items-baseline gap-1.5">
            <span>{metrics.totalPackages}</span>
            <span className="text-xs font-semibold text-slate-400">
              {t("statPackagesUnit", "gói")}
            </span>
          </div>
          <div className="text-[11px] font-medium text-slate-500 mt-1 flex items-center gap-1.5 truncate">
            <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
            <span>
              <strong className="text-emerald-600 font-bold">{metrics.activePackages}</strong> {t("statActiveUnit", "đang bán")}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Active Packages */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500/10 via-emerald-500/15 to-teal-500/10 border border-emerald-200/80 flex items-center justify-center text-emerald-600 shrink-0 shadow-2xs">
          <CheckCircle2 size={22} className="stroke-[2.2]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11.5px] font-bold text-slate-500 uppercase tracking-wider">
            {t("statActivePackages", "Đang mở bán online")}
          </div>
          <div className="text-2xl font-black text-emerald-600 leading-tight mt-0.5 flex items-baseline gap-1.5">
            <span>{metrics.activePackages}</span>
            <span className="text-xs font-semibold text-slate-400">
              {t("statPackagesUnit", "gói")}
            </span>
          </div>
          <div className="text-[11px] font-medium text-slate-500 mt-1 flex items-center gap-1.5 truncate">
            <Sparkles size={12} className="text-emerald-500 shrink-0" />
            <span className="truncate">{t("descActivePackages", "Hiển thị trực tiếp trên app Desktop")}</span>
          </div>
        </div>
      </div>

      {/* 3. Pending Top-ups */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-4">
        <div
          className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 shadow-2xs transition-all ${
            metrics.pendingTopups > 0
              ? "bg-gradient-to-tr from-amber-500/15 via-amber-500/20 to-orange-500/15 border-amber-300 text-amber-600 animate-pulse"
              : "bg-slate-50 border-slate-200/80 text-slate-500"
          }`}
        >
          <Clock size={22} className="stroke-[2.2]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11.5px] font-bold text-slate-500 uppercase tracking-wider">
            {t("statPendingTopups", "Đơn nạp chờ duyệt")}
          </div>
          <div className="text-2xl font-black leading-tight mt-0.5 flex items-baseline gap-1.5">
            <span className={metrics.pendingTopups > 0 ? "text-amber-600" : "text-slate-900"}>
              {metrics.pendingTopups}
            </span>
            <span className="text-xs font-semibold text-slate-400">
              {t("statPendingUnit", "đơn chờ")}
            </span>
          </div>
          <div className="text-[11px] font-medium text-slate-500 mt-1 flex items-center gap-1.5 truncate">
            {metrics.pendingTopups > 0 ? (
              <>
                <AlertCircle size={12} className="text-amber-500 shrink-0" />
                <span className="text-amber-700 font-semibold truncate">
                  {t("descPendingTopupsAlert", "Cần xác nhận và duyệt cộng credit")}
                </span>
              </>
            ) : (
              <>
                <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                <span className="truncate">{t("descPendingTopupsDone", "Toàn bộ đơn nạp đã được xử lý")}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 4. Total Topup Revenue */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500/10 via-indigo-500/15 to-purple-500/10 border border-indigo-200/80 flex items-center justify-center text-indigo-600 shrink-0 shadow-2xs">
          <Wallet size={22} className="stroke-[2.2]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11.5px] font-bold text-slate-500 uppercase tracking-wider">
            {t("statTotalRevenue", "Tổng doanh thu nạp")}
          </div>
          <div className="text-2xl font-black text-slate-900 leading-tight mt-0.5 flex items-baseline gap-1.5 flex-wrap">
            <span>{metrics.totalRevenue.toLocaleString()}</span>
            <span className="text-xs font-extrabold text-orange-600">
              {t("statCurrencyUnit", "VNĐ")}
            </span>
          </div>
          <div className="text-[11px] font-medium text-slate-500 mt-1 flex items-center gap-1.5 truncate">
            <TrendingUp size={12} className="text-emerald-500 shrink-0" />
            <span className="truncate">{t("descCompletedTransactions", "Giao dịch hoàn tất từ Desktop")}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
