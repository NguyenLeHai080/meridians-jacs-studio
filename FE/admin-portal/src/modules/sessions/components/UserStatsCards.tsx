import React from "react";
import { Users, UserCheck, UserX, Sparkles, ShieldCheck, Wifi, AlertCircle } from "lucide-react";
import { useI18n } from "../../../core/i18n";

export interface UserStatsCardsProps {
  metrics: {
    total: number;
    active: number;
    online: number;
    offline: number;
    expired: number;
    blocked: number;
    expiredOrBlocked: number;
    aiProCount: number;
  };
}

export function UserStatsCards({ metrics }: UserStatsCardsProps) {
  const { t } = useI18n();
  const activePercent = metrics.total > 0 ? Math.round((metrics.active / metrics.total) * 100) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Card 1: Tổng người dùng & Máy khách */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 shrink-0">
          <Users size={22} className="stroke-[2.2]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t("cardTotalUsers")}</div>
          <div className="text-2xl font-black text-slate-900 leading-tight mt-0.5">
            {metrics.total.toLocaleString()}
          </div>
          <div className="text-[11px] font-medium text-slate-500 mt-1 flex items-center gap-1.5">
            <ShieldCheck size={12} className="text-orange-500 shrink-0" />
            <span className="truncate">{t("cardTotalUsersSub")}</span>
          </div>
        </div>
      </div>

      {/* Card 2: Đang hoạt động & Online */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
          <UserCheck size={22} className="stroke-[2.2]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t("cardActiveUsers")}</div>
          <div className="text-2xl font-black text-emerald-600 leading-tight mt-0.5 flex items-baseline gap-2">
            <span>{metrics.active}</span>
            {metrics.online > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                <Wifi size={10} className="text-emerald-600" />
                <span>{metrics.online} {t("badgeOnlineCount")}</span>
              </span>
            )}
          </div>
          <div className="text-[11px] font-medium text-slate-500 mt-1 flex items-center gap-1.5">
            <UserCheck size={12} className="text-emerald-600 shrink-0" />
            <span><strong className="text-emerald-600 font-semibold">{activePercent}%</strong> {t("cardActiveUsersSub")}</span>
          </div>
        </div>
      </div>

      {/* Card 3: Hết hạn & Tạm khóa */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
          <UserX size={22} className="stroke-[2.2]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t("cardExpiredBlocked")}</div>
          <div className={`text-2xl font-black leading-tight mt-0.5 ${metrics.expiredOrBlocked > 0 ? "text-rose-600" : "text-slate-800"}`}>
            {metrics.expiredOrBlocked}
          </div>
          <div className="text-[11px] font-medium text-slate-500 mt-1 flex items-center gap-1.5">
            {metrics.expiredOrBlocked > 0 ? (
              <>
                <AlertCircle size={12} className="text-rose-500 shrink-0" />
                <span className="text-rose-600 font-semibold">{metrics.expired} {t("cardExpiredBlockedSub")} / {metrics.blocked} {t("cardBlockedSub")}</span>
              </>
            ) : (
              <>
                <ShieldCheck size={12} className="text-emerald-500 shrink-0" />
                <span>{t("cardNoIssues")}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Card 4: Bản quyền & Gói AI Pro */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
          <Sparkles size={22} className="stroke-[2.2]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t("cardAiPro")}</div>
          <div className="text-2xl font-black text-blue-600 leading-tight mt-0.5 flex items-baseline gap-1.5">
            <span>{metrics.aiProCount}</span>
            <span className="text-xs font-bold text-slate-400">/ {metrics.total} {t("badgeProKey")}</span>
          </div>
          <div className="text-[11px] font-medium text-slate-500 mt-1 flex items-center gap-1.5">
            <Sparkles size={12} className="text-blue-500 shrink-0" />
            <span className="text-blue-600 font-semibold">{t("cardAiProSub")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
