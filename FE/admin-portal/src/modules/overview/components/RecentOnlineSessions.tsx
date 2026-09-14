import React from "react";
import { Laptop, ArrowUpRight, Copy, Check } from "lucide-react";
import type { ClientSession } from "../../../core/types";
import { useI18n } from "../../../core/i18n";
import { formatTimeAgo } from "../utils/overviewHelper";

interface RecentOnlineSessionsProps {
  sessions: ClientSession[];
  onNavigate: (menu: string) => void;
}

export const RecentOnlineSessions: React.FC<RecentOnlineSessionsProps> = ({
  sessions,
  onNavigate,
}) => {
  const { t } = useI18n();
  const [copiedHwid, setCopiedHwid] = React.useState<string | null>(null);

  const handleCopyHwid = (hwid: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(hwid);
    setCopiedHwid(hwid);
    setTimeout(() => setCopiedHwid(null), 2000);
  };

  const getPlatformBadge = (platform?: string | null) => {
    const p = (platform || "").toLowerCase();
    if (p.includes("win")) return { label: "Windows", color: "bg-blue-50 text-blue-700 border-blue-200" };
    if (p.includes("mac") || p.includes("darwin")) return { label: "macOS", color: "bg-purple-50 text-purple-700 border-purple-200" };
    if (p.includes("linux")) return { label: "Linux", color: "bg-amber-50 text-amber-700 border-amber-200" };
    return { label: platform || "Desktop", color: "bg-slate-100 text-slate-700 border-slate-200" };
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col h-full">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Laptop size={16} className="text-cyan-600" />
            {t("recentSessionsTitle")}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">{t("recentSessionsSubtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate("sessions")}
          className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700 transition-colors"
        >
          <span>{t("viewAllSessions")}</span>
          <ArrowUpRight size={14} />
        </button>
      </div>

      <div className="overflow-x-auto flex-1">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400">
            <Laptop size={32} className="stroke-1 mb-2 opacity-40" />
            <p className="text-xs">{t("noActiveSessions")}</p>
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/50">
                <th className="py-2.5 px-2">{t("colCustomer")}</th>
                <th className="py-2.5 px-2">{t("colDevice")}</th>
                <th className="py-2.5 px-2">{t("colAppVersion")}</th>
                <th className="py-2.5 px-2">{t("colLastSeen")}</th>
                <th className="py-2.5 px-2 text-right">{t("colStatus")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sessions.map((sess) => {
                const platformBadge = getPlatformBadge(sess.last_platform);
                const isOnline = Boolean(sess.is_online);
                const hwidShort = sess.hwid ? `${sess.hwid.slice(0, 10)}...${sess.hwid.slice(-6)}` : "—";

                return (
                  <tr
                    key={sess.license_id || sess.hwid}
                    onClick={() => onNavigate("sessions")}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                  >
                    <td className="py-2.5 px-2 text-slate-800">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-[11px]">
                          {(sess.customer_name || "U")[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800 group-hover:text-orange-600 transition-colors">
                            {sess.customer_name || "Người dùng ẩn danh"}
                          </div>
                          {sess.last_ip && (
                            <div className="text-[10px] text-slate-400 font-mono">{sess.last_ip}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-2.5 px-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${platformBadge.color}`}>
                          {platformBadge.label}
                        </span>
                        <span className="text-[11px] font-mono text-slate-600 font-medium" title={sess.hwid}>
                          {hwidShort}
                        </span>
                        {sess.hwid && (
                          <button
                            type="button"
                            onClick={(e) => handleCopyHwid(sess.hwid, e)}
                            className="text-slate-400 hover:text-slate-600 transition-colors p-0.5"
                            title="Copy HWID"
                          >
                            {copiedHwid === sess.hwid ? (
                              <Check size={12} className="text-emerald-600" />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>
                        )}
                      </div>
                    </td>

                    <td className="py-2.5 px-2 text-slate-600 text-[11px] font-mono font-medium">
                      v{sess.last_app_version || "0.8.74"}
                    </td>

                    <td className="py-2.5 px-2 text-slate-500 text-[11px]">
                      {formatTimeAgo(sess.last_seen_at)}
                    </td>

                    <td className="py-2.5 px-2 text-right">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                        isOnline
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          isOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                        }`} />
                        {isOnline ? "Online" : "Offline"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
