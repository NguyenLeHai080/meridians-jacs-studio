import React from "react";
import { KeyRound, Coins, Laptop, RefreshCw } from "lucide-react";
import { useI18n } from "../../../core/i18n";

interface QuickActionsBarProps {
  onNavigate: (menu: string) => void;
  onRefresh: () => void;
  loading?: boolean;
}

export const QuickActionsBar: React.FC<QuickActionsBarProps> = ({
  onNavigate,
  onRefresh,
  loading = false,
}) => {
  const { t } = useI18n();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white border border-slate-200 rounded-xl shadow-sm my-1">
      <div className="flex items-center gap-2.5">
        <span className="flex h-2.5 w-2.5 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
        </span>
        <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
          {t("quickActionsTitle")}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={() => onNavigate("sessions")}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 rounded-lg shadow-sm transition-all duration-150 active:scale-95"
        >
          <KeyRound size={14} className="text-white" />
          <span>{t("actionCreateLicense")}</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate("ai_key_grants")}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-amber-50 hover:bg-amber-100 hover:text-amber-900 border border-amber-200/80 rounded-lg shadow-sm transition-all duration-150 active:scale-95"
        >
          <Coins size={14} className="text-amber-600" />
          <span>{t("actionGrantCredit")}</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate("sessions")}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-cyan-50 hover:bg-cyan-100 hover:text-cyan-900 border border-cyan-200/80 rounded-lg shadow-sm transition-all duration-150 active:scale-95"
        >
          <Laptop size={14} className="text-cyan-600" />
          <span>{t("actionViewSessions")}</span>
        </button>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 border border-slate-200 rounded-lg transition-all duration-150 disabled:opacity-50 active:scale-95"
          title={t("actionRefresh")}
        >
          <RefreshCw size={14} className={loading ? "animate-spin text-orange-500" : "text-slate-500"} />
          <span className="hidden sm:inline">{loading ? t("actionRefreshing") : t("actionRefresh")}</span>
        </button>
      </div>
    </div>
  );
};
