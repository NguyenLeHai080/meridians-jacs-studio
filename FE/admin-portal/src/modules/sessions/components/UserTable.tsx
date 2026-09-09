import React from "react";
import {
  Users,
  Sparkles,
  Laptop,
  Check,
  Copy,
  RefreshCw,
  Lock,
  Unlock,
  Clock,
  ShieldCheck,
  Calendar,
  CalendarPlus,
  AlertCircle,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Layers,
  KeyRound,
  Activity,
  Wifi,
  WifiOff,
} from "lucide-react";
import type { License } from "../../../core/types";
import { useI18n } from "../../../core/i18n";

export interface UserTableItem extends License {
  isOnline: boolean;
  isExpired: boolean;
  daysRemaining: number | null;
  activeSession?: any;
}

export interface UserTableProps {
  paginatedItems: UserTableItem[];
  filteredCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  setCurrentPage: (updater: number | ((p: number) => number)) => void;
  copiedKey: string | null;
  handleCopy: (text: string, keyId: string) => void;
  handleRegenerateKey: (lic: License) => void;
  handleOpenLegalCert: (lic: License) => void;
  handleOpenRenew: (lic: License) => void;
  handleOpenEdit: (lic: License) => void;
  handleOpenResetHwid: (lic: License) => void;
  handleToggleStatus: (lic: License) => void;
  handleTerminateSession: (lic: License) => void;
  handleOpenDelete: (lic: License) => void;
}

export function UserTable({
  paginatedItems,
  filteredCount,
  currentPage,
  totalPages,
  pageSize,
  setCurrentPage,
  copiedKey,
  handleCopy,
  handleRegenerateKey,
  handleOpenLegalCert,
  handleOpenRenew,
  handleOpenEdit,
  handleOpenResetHwid,
  handleToggleStatus,
  handleTerminateSession: _handleTerminateSession,
  handleOpenDelete,
}: UserTableProps) {
  const { t } = useI18n();

  const getPlatformBadge = (platform?: string | null) => {
    const p = (platform || "").toLowerCase();
    if (p.includes("win")) return { label: "Win", color: "bg-blue-500/10 text-blue-700 border-blue-500/20" };
    if (p.includes("mac") || p.includes("darwin")) return { label: "Mac", color: "bg-purple-500/10 text-purple-700 border-purple-500/20" };
    if (p.includes("linux")) return { label: "Linux", color: "bg-amber-500/10 text-amber-700 border-amber-500/20" };
    return { label: "PC", color: "bg-slate-100 text-slate-700 border-slate-200" };
  };

  const getPlanBadge = (item: UserTableItem) => {
    if (!item.expires_at) {
      return {
        label: "Lifetime VIP",
        style: "bg-gradient-to-r from-amber-500 to-orange-500 text-white font-extrabold shadow-xs shadow-orange-500/20",
        isLifetime: true,
      };
    }
    if (item.premium_ai) {
      return {
        label: "AI Pro",
        style: "bg-gradient-to-r from-blue-500/15 to-indigo-500/15 text-blue-700 border border-blue-500/25 font-bold shadow-2xs",
        isPro: true,
      };
    }
    return {
      label: "Standard",
      style: "bg-slate-100 text-slate-700 border border-slate-200 font-semibold",
    };
  };

  return (
    <div className="flex flex-col bg-white">
      {/* 1. MOBILE & TABLET CARD VIEW (Visible on < lg screens) */}
      <div className="block lg:hidden divide-y divide-slate-100">
        {paginatedItems.length === 0 ? (
          <div className="py-16 px-4 text-center text-slate-400">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 shadow-2xs">
              <Users size={24} className="opacity-60" />
            </div>
            <div className="text-sm font-bold text-slate-700">{t("noUsersFound")}</div>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              {t("noUsersFoundSub")}
            </p>
          </div>
        ) : (
          paginatedItems.map((item) => {
            const initials = (item.customer_name || "Khách")
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();

            const formattedExp = item.expires_at
              ? new Date(item.expires_at).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })
              : t("statusLifetime");

            const isOnline = Boolean(item.isOnline);
            const isExpired = Boolean(item.isExpired);
            const isBlocked = item.status === "blocked";
            const planBadge = getPlanBadge(item);
            const platformBadge = getPlatformBadge(item.last_platform);
            const keyRaw = item.key || item.raw_key || item.key_hint;
            const hwidShort = item.hwid ? `${item.hwid.slice(0, 10)}...${item.hwid.slice(-6)}` : t("noMachineBound");

            return (
              <div key={item.id} className="p-4 space-y-3 hover:bg-slate-50/70 transition-colors">
                {/* Mobile Card Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-900 to-slate-700 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm truncate">
                          {item.customer_name || "Khách hàng"}
                        </span>
                        {item.credit_balance !== undefined && item.credit_balance > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-[9.5px] font-extrabold text-amber-700 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded-md">
                            <CreditCard size={9} />
                            <span>{item.credit_balance.toFixed(0)} Cr</span>
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 font-medium truncate">
                        {item.customer_contact || t("noEmail")}
                      </div>
                    </div>
                  </div>

                  {/* Status Pill */}
                  <span className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold border ${
                    isBlocked
                      ? "bg-amber-500/10 text-amber-700 border-amber-500/20"
                      : isExpired
                      ? "bg-rose-500/10 text-rose-700 border-rose-500/20"
                      : isOnline
                      ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 shadow-2xs"
                      : "bg-slate-100 text-slate-600 border-slate-200"
                  }`}>
                    {isBlocked ? (
                      <Lock size={11} className="text-amber-600 shrink-0" />
                    ) : isExpired ? (
                      <AlertCircle size={11} className="text-rose-600 shrink-0" />
                    ) : isOnline ? (
                      <Wifi size={11} className="text-emerald-600 shrink-0" />
                    ) : (
                      <WifiOff size={11} className="text-slate-400 shrink-0" />
                    )}
                    <span>{isBlocked ? t("statusBlocked") : isExpired ? t("statusExpired") : isOnline ? t("statusOnline") : t("statusOffline")}</span>
                  </span>
                </div>

                {/* Mobile Card Meta Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                  {/* Plan & Jobs */}
                  <div className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-xl border border-slate-200/80">
                    <span className="text-slate-500 text-[11px] font-medium">{t("thPlanRole")}:</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] ${planBadge.style}`}>
                        {item.premium_ai && <Sparkles size={10} className="text-amber-300" />}
                        {planBadge.label}
                      </span>
                      <span className="text-[11px] text-slate-400 font-semibold">
                        {item.max_jobs_per_day || 100}/d
                      </span>
                    </div>
                  </div>

                  {/* Expiration */}
                  <div className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-xl border border-slate-200/80">
                    <span className="text-slate-500 text-[11px] font-medium">{t("thExpires")}:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-slate-800 text-[11px]">{formattedExp}</span>
                      {item.expires_at && (
                        item.isExpired ? (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md text-[9px] font-bold bg-rose-500/10 text-rose-700 border border-rose-500/20">
                            {t("statusExpired")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md text-[9px] font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                            {item.daysRemaining}d
                          </span>
                        )
                      )}
                    </div>
                  </div>

                  {/* HWID */}
                  <div className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-xl border border-slate-200/80">
                    <div className="flex items-center gap-1.5">
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${platformBadge.color}`}>
                        {platformBadge.label}
                      </span>
                      <span className="font-mono text-[11px] text-slate-700">{hwidShort}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {item.hwid && (
                        <button
                          type="button"
                          onClick={() => handleCopy(item.hwid, `hwid-m-${item.id}`)}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                          title={t("copyHwid")}
                        >
                          {copiedKey === `hwid-m-${item.id}` ? <Check size={12} className="text-emerald-600 font-bold" /> : <Copy size={12} />}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleOpenResetHwid(item)}
                        className="p-1 text-cyan-600 hover:text-cyan-800 rounded transition-colors"
                        title={t("btnResetHwid")}
                      >
                        <Laptop size={12} />
                      </button>
                    </div>
                  </div>

                  {/* License Key */}
                  <div className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-xl border border-slate-200/80">
                    <span className="font-mono font-bold text-[11px] text-slate-800">
                      {item.key_hint || "JACS-****-****"}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleCopy(keyRaw, `key-m-${item.id}`)}
                        className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                        title={t("copyKey")}
                      >
                        {copiedKey === `key-m-${item.id}` ? <Check size={12} className="text-emerald-600 font-bold" /> : <Copy size={12} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRegenerateKey(item)}
                        className="p-1 text-slate-400 hover:text-orange-600 rounded transition-colors"
                        title={t("btnRegenerateKey")}
                      >
                        <RefreshCw size={11} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Mobile Card Actions Toolbar */}
                <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleOpenRenew(item)}
                    className="flex-1 h-8 px-3 inline-flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl shadow-xs shadow-emerald-600/20 active:scale-95 transition-all"
                  >
                    <CalendarPlus size={13} />
                    <span>{t("btnRenew")}</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenLegalCert(item)}
                      className="w-8 h-8 flex items-center justify-center text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200/80 active:scale-95 transition-all"
                      title={t("btnLegalCert")}
                    >
                      <ShieldCheck size={14} />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleStatus(item)}
                      className={`w-8 h-8 flex items-center justify-center rounded-xl border active:scale-95 transition-all ${
                        isBlocked
                          ? "text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                          : "text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100"
                      }`}
                      title={isBlocked ? t("btnUnlock") : t("btnLock")}
                    >
                      {isBlocked ? <Unlock size={14} /> : <Lock size={14} />}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(item)}
                      className="w-8 h-8 flex items-center justify-center text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-200 active:scale-95 transition-all"
                      title={t("btnEdit")}
                    >
                      <Edit2 size={13} />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenDelete(item)}
                      className="w-8 h-8 flex items-center justify-center text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200/80 active:scale-95 transition-all"
                      title={t("btnDelete")}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 2. DESKTOP TABLE VIEW (Visible on >= lg screens) */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse min-w-[1020px]">
          <thead>
            <tr className="bg-slate-50/70 border-b border-slate-200/80 text-slate-500 font-extrabold tracking-wider text-[11px] uppercase">
              <th className="py-3.5 px-4 sm:px-5 min-w-[240px]">
                <div className="flex items-center gap-1.5">
                  <Users size={13} className="text-slate-400" />
                  <span>{t("thCustomer")}</span>
                </div>
              </th>
              <th className="py-3.5 px-3 min-w-[120px]">
                <div className="flex items-center gap-1.5">
                  <Layers size={13} className="text-slate-400" />
                  <span>{t("thPlanRole")}</span>
                </div>
              </th>
              <th className="py-3.5 px-3 min-w-[170px]">
                <div className="flex items-center gap-1.5">
                  <Laptop size={13} className="text-slate-400" />
                  <span>{t("thHwid")}</span>
                </div>
              </th>
              <th className="py-3.5 px-3 min-w-[160px]">
                <div className="flex items-center gap-1.5">
                  <KeyRound size={13} className="text-slate-400" />
                  <span>{t("thKey")}</span>
                </div>
              </th>
              <th className="py-3.5 px-3 min-w-[150px]">
                <div className="flex items-center gap-1.5">
                  <Calendar size={13} className="text-slate-400" />
                  <span>{t("thExpires")}</span>
                </div>
              </th>
              <th className="py-3.5 px-3 min-w-[135px]">
                <div className="flex items-center gap-1.5">
                  <Activity size={13} className="text-slate-400" />
                  <span>{t("thSessionStatus")}</span>
                </div>
              </th>
              <th className="py-3.5 px-4 sm:px-5 text-right min-w-[190px]">
                <span>{t("thActions")}</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/90 text-slate-800">
            {paginatedItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-20 text-center text-slate-400">
                  <div className="w-16 h-16 mx-auto mb-3.5 rounded-2xl bg-slate-100/80 border border-slate-200 flex items-center justify-center text-slate-400 shadow-2xs">
                    <Users size={28} className="opacity-60" />
                  </div>
                  <div className="text-sm font-bold text-slate-700">{t("noUsersFound")}</div>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    {t("noUsersFoundSub")}
                  </p>
                </td>
              </tr>
            ) : (
              paginatedItems.map((item) => {
                const initials = (item.customer_name || "Khách")
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();

                const formattedExp = item.expires_at
                  ? new Date(item.expires_at).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })
                  : t("statusLifetime");

                const isOnline = Boolean(item.isOnline);
                const isExpired = Boolean(item.isExpired);
                const isBlocked = item.status === "blocked";
                const planBadge = getPlanBadge(item);
                const platformBadge = getPlatformBadge(item.last_platform);
                const keyRaw = item.key || item.raw_key || item.key_hint;
                const hwidShort = item.hwid ? `${item.hwid.slice(0, 10)}...${item.hwid.slice(-6)}` : t("noMachineBound");

                return (
                  <tr
                    key={item.id}
                    className="hover:bg-orange-500/[0.03] transition-colors group h-14"
                  >
                    {/* 1. KHÁCH HÀNG */}
                    <td className="py-2.5 px-4 sm:px-5 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-slate-900 to-slate-700 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs border border-slate-700">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 group-hover:text-orange-600 transition-colors text-[13px] truncate">
                              {item.customer_name || "Khách hàng"}
                            </span>
                            {(item.credit_balance !== undefined && item.credit_balance > 0) && (
                              <span className="inline-flex items-center gap-0.5 text-[9.5px] font-extrabold text-amber-700 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded-md">
                                <CreditCard size={9} />
                                <span>{item.credit_balance.toFixed(0)} Cr</span>
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-medium truncate">
                            {item.customer_contact || t("noEmail")}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* 2. GÓI & QUYỀN HẠN */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10.5px] ${planBadge.style}`}>
                          {item.premium_ai && <Sparkles size={11} className="text-amber-300" />}
                          {planBadge.label}
                        </span>
                        <span className="text-[11px] text-slate-400 font-semibold">
                          {item.max_jobs_per_day || 100}/d
                        </span>
                      </div>
                    </td>

                    {/* 3. MÃ MÁY HWID */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/90 px-2.5 py-1 rounded-xl transition-colors">
                        <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold border ${platformBadge.color}`}>
                          {platformBadge.label}
                        </span>
                        <span className="font-mono text-xs font-semibold text-slate-700" title={item.hwid}>
                          {hwidShort}
                        </span>
                        {item.hwid && (
                          <button
                            type="button"
                            onClick={() => handleCopy(item.hwid, `hwid-${item.id}`)}
                            className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition-colors ml-0.5"
                            title={t("copyHwid")}
                          >
                            {copiedKey === `hwid-${item.id}` ? (
                              <Check size={12} className="text-emerald-600 font-bold" />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenResetHwid(item)}
                          className="text-cyan-600 hover:text-cyan-800 hover:bg-cyan-50 p-0.5 rounded transition-colors"
                          title={t("btnResetHwid")}
                        >
                          <Laptop size={12} />
                        </button>
                      </div>
                    </td>

                    {/* 4. LICENSE KEY */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 bg-slate-900/[0.04] hover:bg-slate-900/[0.07] border border-slate-200/90 px-2.5 py-1 rounded-xl transition-colors">
                        <span className="font-mono font-bold text-xs text-slate-800 tracking-tight">
                          {item.key_hint || "JACS-****-****"}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(keyRaw, `key-${item.id}`)}
                          className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition-colors ml-0.5"
                          title={t("copyKey")}
                        >
                          {copiedKey === `key-${item.id}` ? (
                            <Check size={12} className="text-emerald-600 font-bold" />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRegenerateKey(item)}
                          className="text-slate-400 hover:text-orange-600 hover:bg-orange-50 p-0.5 rounded transition-colors"
                          title={t("btnRegenerateKey")}
                        >
                          <RefreshCw size={11} />
                        </button>
                      </div>
                    </td>

                    {/* 5. THỜI HẠN */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {item.expires_at ? (
                        <div className="inline-flex items-center gap-1.5">
                          <div className="inline-flex items-center gap-1.5 font-bold text-slate-800 text-xs bg-slate-50 border border-slate-200/90 px-2.5 py-1 rounded-lg">
                            <Calendar size={12} className="text-orange-500" />
                            <span className="font-mono">{formattedExp}</span>
                          </div>
                          {item.isExpired ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/10 text-rose-700 border border-rose-500/20">
                              <AlertCircle size={10} />
                              {t("statusExpired")}
                            </span>
                          ) : item.daysRemaining !== null && item.daysRemaining <= 7 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-800 border border-amber-500/30 animate-pulse">
                              <Clock size={10} />
                              {item.daysRemaining}d
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                              <Clock size={10} />
                              {item.daysRemaining}d
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-extrabold bg-gradient-to-r from-purple-500/10 to-indigo-500/10 text-purple-700 border border-purple-500/20 shadow-2xs">
                          <Sparkles size={12} className="text-purple-600" />
                          {t("statusLifetime")}
                        </span>
                      )}
                    </td>

                    {/* 6. TRẠNG THÁI & PHIÊN */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold border ${
                          isBlocked
                            ? "bg-amber-500/10 text-amber-700 border-amber-500/20"
                            : isExpired
                            ? "bg-rose-500/10 text-rose-700 border-rose-500/20"
                            : isOnline
                            ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 shadow-2xs"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}>
                          {isBlocked ? (
                            <Lock size={12} className="text-amber-600 shrink-0" />
                          ) : isExpired ? (
                            <AlertCircle size={12} className="text-rose-600 shrink-0" />
                          ) : isOnline ? (
                            <Wifi size={12} className="text-emerald-600 shrink-0" />
                          ) : (
                            <WifiOff size={12} className="text-slate-400 shrink-0" />
                          )}
                          <span>{isBlocked ? t("statusBlocked") : isExpired ? t("statusExpired") : isOnline ? t("statusOnline") : t("statusOffline")}</span>
                        </span>
                        {item.last_ip && (
                          <span className="text-[10px] font-mono text-slate-400">
                            {item.last_ip}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 7. THAO TÁC */}
                    <td className="py-2.5 px-4 sm:px-5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        {/* Gia hạn */}
                        <button
                          type="button"
                          onClick={() => handleOpenRenew(item)}
                          className="h-8 px-3 inline-flex items-center gap-1.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl shadow-xs shadow-emerald-600/20 transition-all active:scale-95"
                          title={t("btnRenew")}
                        >
                          <CalendarPlus size={13} />
                          <span>{t("btnRenew")}</span>
                        </button>

                        {/* Chứng nhận pháp lý */}
                        <button
                          type="button"
                          onClick={() => handleOpenLegalCert(item)}
                          className="w-8 h-8 flex items-center justify-center text-blue-600 hover:text-blue-800 bg-blue-50/80 hover:bg-blue-100/80 rounded-xl border border-blue-200/80 transition-all active:scale-95 shadow-2xs"
                          title={t("btnLegalCert")}
                        >
                          <ShieldCheck size={14} />
                        </button>

                        {/* Khóa / Mở khóa */}
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(item)}
                          className={`w-8 h-8 flex items-center justify-center rounded-xl border transition-all active:scale-95 shadow-2xs ${
                            isBlocked
                              ? "text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                              : "text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100"
                          }`}
                          title={isBlocked ? t("btnUnlock") : t("btnLock")}
                        >
                          {isBlocked ? <Unlock size={14} /> : <Lock size={14} />}
                        </button>

                        {/* Chỉnh sửa */}
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className="w-8 h-8 flex items-center justify-center text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 rounded-xl border border-slate-200 transition-all active:scale-95 shadow-2xs"
                          title={t("btnEdit")}
                        >
                          <Edit2 size={13} />
                        </button>

                        {/* Xóa */}
                        <button
                          type="button"
                          onClick={() => handleOpenDelete(item)}
                          className="w-8 h-8 flex items-center justify-center text-rose-600 hover:text-rose-700 bg-rose-50/80 hover:bg-rose-100/80 rounded-xl border border-rose-200/80 transition-all active:scale-95 shadow-2xs"
                          title={t("btnDelete")}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 0 && (
        <div className="px-4 sm:px-6 py-3.5 border-t border-slate-200/80 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs font-medium text-slate-500 text-center sm:text-left">
            {t("paginationShowing")}{" "}
            <span className="font-bold text-slate-800">{Math.min(filteredCount, (currentPage - 1) * pageSize + 1)}</span> -{" "}
            <span className="font-bold text-slate-800">{Math.min(filteredCount, currentPage * pageSize)}</span>{" "}
            {t("paginationOf")}{" "}
            <span className="font-bold text-slate-800">{filteredCount}</span> {t("paginationUsers")}
          </div>

          <div className="inline-flex items-center justify-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl shadow-2xs hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-all"
            >
              <ChevronLeft size={14} />
              <span className="hidden xs:inline">{t("paginationPrev")}</span>
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum = i + 1;
                if (totalPages > 5 && currentPage > 3) {
                  pageNum = Math.min(totalPages - 4 + i, currentPage - 2 + i);
                }
                const isActive = pageNum === currentPage;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-xl text-xs font-black transition-all ${
                      isActive
                        ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-xs"
                        : "text-slate-700 bg-white border border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl shadow-2xs hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-all"
            >
              <span className="hidden xs:inline">{t("paginationNext")}</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
