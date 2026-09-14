import React from "react";
import { ShieldCheck, Server, Database, Bot, CheckCircle2 } from "lucide-react";
import { useI18n } from "../../../core/i18n";

export const SystemHealthWidget: React.FC = () => {
  const { t } = useI18n();

  const healthItems = [
    {
      title: t("healthBackend"),
      status: t("statusOperational"),
      icon: <Server size={18} className="text-blue-600" />,
      badge: "HTTP 200 OK",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    {
      title: t("healthDatabase"),
      status: t("statusOperational"),
      icon: <Database size={18} className="text-purple-600" />,
      badge: "Read / Write OK",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    {
      title: t("healthSecurity"),
      status: t("statusProtected"),
      icon: <ShieldCheck size={18} className="text-emerald-600" />,
      badge: "Shield 2.0 Active",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    {
      title: t("healthAiGateway"),
      status: t("statusOperational"),
      icon: <Bot size={18} className="text-amber-600" />,
      badge: "3 Providers Ready",
      badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm my-1">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-600" />
            {t("systemHealthTitle")}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">{t("systemHealthSubtitle")}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          100% Sẵn Sàng
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {healthItems.map((item, idx) => (
          <div
            key={idx}
            className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 hover:border-slate-300 hover:bg-slate-50 transition-all duration-150"
          >
            <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-xs">
              {item.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-800 truncate">{item.title}</div>
              <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
                <span className="truncate">{item.status}</span>
              </div>
            </div>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border shrink-0 ${item.badgeColor}`}>
              {item.badge}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
