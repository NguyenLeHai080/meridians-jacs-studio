import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Calendar,
  Clock,
  Sparkles,
  Check,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  X,
  CalendarDays,
} from "lucide-react";
import { useI18n } from "../../../core/i18n";

export interface DateTimePickerFieldProps {
  label: string;
  value: string; // "YYYY-MM-DDTHH:mm" or ISO string or empty
  onChange: (val: string) => void;
  required?: boolean;
  allowLifetime?: boolean;
  accentColor?: "orange" | "emerald" | "cyan" | "purple";
  quickPresets?: { label: string; days: number }[];
  helperText?: string;
}

export function DateTimePickerField({
  label,
  value,
  onChange,
  required = false,
  allowLifetime = true,
  accentColor = "orange",
  quickPresets,
  helperText,
}: DateTimePickerFieldProps) {
  const { t, language } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Floating coordinates for Portal
  const [coords, setCoords] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 360,
  });

  // Normalize initial date
  const parsedDate = useMemo(() => {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }, [value]);

  // Calendar navigation state
  const [viewDate, setViewDate] = useState<Date>(() => parsedDate || new Date());
  const [hour, setHour] = useState<number>(() => (parsedDate ? parsedDate.getHours() : 23));
  const [minute, setMinute] = useState<number>(() => (parsedDate ? parsedDate.getMinutes() : 59));

  // Sync internal state when prop value changes
  useEffect(() => {
    if (parsedDate) {
      setViewDate(parsedDate);
      setHour(parsedDate.getHours());
      setMinute(parsedDate.getMinutes());
    }
  }, [value]);

  // Calculate coordinates when opening
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverWidth = Math.min(420, Math.max(350, rect.width));
    const estimatedHeight = 440;

    let top = rect.bottom + 8;
    let left = rect.left;

    // Shift left if overflowing viewport right
    if (left + popoverWidth > window.innerWidth - 16) {
      left = window.innerWidth - popoverWidth - 16;
    }
    if (left < 16) left = 16;

    // Flip to top if overflowing bottom
    if (top + estimatedHeight > window.innerHeight - 16) {
      const topAbove = rect.top - estimatedHeight - 8;
      if (topAbove > 16) {
        top = topAbove;
      } else {
        // Fallback: center in viewport
        top = Math.max(16, (window.innerHeight - estimatedHeight) / 2);
      }
    }

    setCoords({ top, left, width: popoverWidth });
  }, []);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      const handleResizeScroll = () => updatePosition();
      window.addEventListener("resize", handleResizeScroll);
      window.addEventListener("scroll", handleResizeScroll, true);
      return () => {
        window.removeEventListener("resize", handleResizeScroll);
        window.removeEventListener("scroll", handleResizeScroll, true);
      };
    }
  }, [isOpen, updatePosition]);

  // Analysis of current value
  const dateAnalysis = useMemo(() => {
    if (!parsedDate) {
      return {
        isValid: false,
        isLifetime: true,
        daysRemaining: null,
        formattedFull: t("statusLifetime"),
        statusType: "lifetime" as const,
      };
    }

    const now = new Date();
    const diffMs = parsedDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    const locale = language === "jp" ? "ja-JP" : language === "en" ? "en-US" : "vi-VN";
    const dateFormatted = parsedDate.toLocaleDateString(locale, {
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const timeFormatted = parsedDate.toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    let statusType: "active" | "expiring_soon" | "expired" | "today" = "active";
    if (daysRemaining < 0) {
      statusType = "expired";
    } else if (daysRemaining === 0) {
      statusType = "today";
    } else if (daysRemaining <= 7) {
      statusType = "expiring_soon";
    }

    return {
      isValid: true,
      isLifetime: false,
      daysRemaining,
      formattedFull: `${timeFormatted} • ${dateFormatted}`,
      statusType,
    };
  }, [parsedDate, language, t]);

  // Emit datetime change helper
  const emitDateTime = (d: Date, h: number, m: number) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hourStr = pad(h);
    const minStr = pad(m);
    onChange(`${year}-${month}-${day}T${hourStr}:${minStr}`);
  };

  const handleSelectDay = (dayDate: Date) => {
    emitDateTime(dayDate, hour, minute);
  };

  const handleHourChange = (newH: number) => {
    const validH = Math.max(0, Math.min(23, newH));
    setHour(validH);
    if (parsedDate) {
      emitDateTime(parsedDate, validH, minute);
    } else {
      const base = new Date();
      base.setDate(base.getDate() + 30);
      emitDateTime(base, validH, minute);
    }
  };

  const handleMinuteChange = (newM: number) => {
    const validM = Math.max(0, Math.min(59, newM));
    setMinute(validM);
    if (parsedDate) {
      emitDateTime(parsedDate, hour, validM);
    } else {
      const base = new Date();
      base.setDate(base.getDate() + 30);
      emitDateTime(base, hour, validM);
    }
  };

  // Quick preset helper
  const applyPresetDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(23, 59, 0, 0);
    setHour(23);
    setMinute(59);
    setViewDate(d);
    emitDateTime(d, 23, 59);
  };

  const applyToday = () => {
    const d = new Date();
    d.setHours(23, 59, 0, 0);
    setHour(23);
    setMinute(59);
    setViewDate(d);
    emitDateTime(d, 23, 59);
  };

  const applyLifetime = () => {
    onChange("");
    setIsOpen(false);
  };

  // Calendar Grid Builder
  const calendarGrid = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    // First day of current month
    const firstDay = new Date(year, month, 1);
    // Monday as first day of week: (firstDay.getDay() + 6) % 7
    const startingDayOfWeek = (firstDay.getDay() + 6) % 7;

    // Total days in current month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // Total days in previous month
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: {
      date: Date;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
    }[] = [];

    const todayStr = new Date().toDateString();
    const selectedStr = parsedDate ? parsedDate.toDateString() : "";

    // 1. Fill previous month days
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, daysInPrevMonth - i);
      days.push({
        date: d,
        isCurrentMonth: false,
        isToday: d.toDateString() === todayStr,
        isSelected: d.toDateString() === selectedStr,
      });
    }

    // 2. Fill current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      days.push({
        date: d,
        isCurrentMonth: true,
        isToday: d.toDateString() === todayStr,
        isSelected: d.toDateString() === selectedStr,
      });
    }

    // 3. Fill next month days to complete grid cells
    const remainingCells = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remainingCells; i++) {
      const d = new Date(year, month + 1, i);
      days.push({
        date: d,
        isCurrentMonth: false,
        isToday: d.toDateString() === todayStr,
        isSelected: d.toDateString() === selectedStr,
      });
    }

    return days;
  }, [viewDate, parsedDate]);

  // Localized Month / Year Title
  const monthYearTitle = useMemo(() => {
    const locale = language === "jp" ? "ja-JP" : language === "en" ? "en-US" : "vi-VN";
    return viewDate.toLocaleDateString(locale, {
      month: "long",
      year: "numeric",
    });
  }, [viewDate, language]);

  // Weekday column headers
  const weekDays = useMemo(() => {
    if (language === "jp") return ["月", "火", "水", "木", "金", "土", "日"];
    if (language === "en") return ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
    return ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
  }, [language]);

  // Color theme definitions
  const theme = {
    orange: {
      boxBg: "bg-orange-50/60 border-orange-200/90",
      accentText: "text-orange-700",
      iconBg: "bg-orange-100 text-orange-600",
      ringFocus: "focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20",
      selectedDay: "bg-gradient-to-r from-orange-500 to-orange-600 text-white font-black shadow-md shadow-orange-500/30",
      btnAction: "bg-orange-500 hover:bg-orange-600 text-white",
      btnPill: "bg-white hover:bg-orange-100/70 text-orange-800 border border-orange-200",
    },
    emerald: {
      boxBg: "bg-emerald-50/60 border-emerald-200/90",
      accentText: "text-emerald-700",
      iconBg: "bg-emerald-100 text-emerald-600",
      ringFocus: "focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20",
      selectedDay: "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-black shadow-md shadow-emerald-500/30",
      btnAction: "bg-emerald-600 hover:bg-emerald-700 text-white",
      btnPill: "bg-white hover:bg-emerald-100/70 text-emerald-800 border border-emerald-200",
    },
    cyan: {
      boxBg: "bg-cyan-50/60 border-cyan-200/90",
      accentText: "text-cyan-700",
      iconBg: "bg-cyan-100 text-cyan-600",
      ringFocus: "focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-500/20",
      selectedDay: "bg-gradient-to-r from-cyan-600 to-cyan-700 text-white font-black shadow-md shadow-cyan-600/30",
      btnAction: "bg-cyan-600 hover:bg-cyan-700 text-white",
      btnPill: "bg-white hover:bg-cyan-100/70 text-cyan-800 border border-cyan-200",
    },
    purple: {
      boxBg: "bg-purple-50/60 border-purple-200/90",
      accentText: "text-purple-700",
      iconBg: "bg-purple-100 text-purple-600",
      ringFocus: "focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-500/20",
      selectedDay: "bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black shadow-md shadow-purple-500/30",
      btnAction: "bg-purple-600 hover:bg-purple-700 text-white",
      btnPill: "bg-white hover:bg-purple-100/70 text-purple-800 border border-purple-200",
    },
  }[accentColor];

  const defaultPresets = quickPresets || [
    { label: "+7d", days: 7 },
    { label: "+30d", days: 30 },
    { label: "+90d", days: 90 },
    { label: "+1y", days: 365 },
  ];

  return (
    <div className="w-full">
      <div className={`p-3.5 rounded-2xl border ${theme.boxBg} transition-all`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <label className={`flex items-center gap-1.5 text-xs font-bold ${theme.accentText}`}>
            <Calendar size={14} />
            <span>{label}</span>
            {required && <span className="text-rose-500">*</span>}
          </label>

          {/* Live Status Badge */}
          {dateAnalysis.isLifetime ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-700 border border-purple-200 shadow-2xs">
              <Sparkles size={11} className="text-purple-600" />
              {t("statusLifetime")}
            </span>
          ) : dateAnalysis.statusType === "expired" ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
              <AlertCircle size={11} />
              {t("statusExpired")} ({Math.abs(dateAnalysis.daysRemaining || 0)} {t("daysAgo")})
            </span>
          ) : dateAnalysis.statusType === "today" ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
              <Clock size={11} />
              {t("expiringToday")}
            </span>
          ) : dateAnalysis.statusType === "expiring_soon" ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
              <Clock size={11} />
              {t("daysRemainingPrefix")} {dateAnalysis.daysRemaining} {t("daysRemainingSuffix")}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <Check size={11} />
              {t("daysRemainingPrefix")} {dateAnalysis.daysRemaining} {t("daysRemainingSuffix")}
            </span>
          )}
        </div>

        {/* Custom Clickable Input Box Trigger */}
        <div
          ref={triggerRef}
          onClick={() => {
            updatePosition();
            setIsOpen(!isOpen);
          }}
          className={`flex items-center bg-white rounded-xl border border-slate-300 shadow-2xs ${theme.ringFocus} p-1.5 gap-2 cursor-pointer transition-all hover:border-slate-400 group`}
        >
          <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${theme.iconBg} shrink-0 transition-transform group-hover:scale-105`}>
            <CalendarDays size={16} />
          </div>

          <div className="flex-1 min-w-0">
            {parsedDate ? (
              <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-slate-900 truncate">
                <span>{dateAnalysis.formattedFull}</span>
              </div>
            ) : (
              <span className="text-xs font-semibold text-purple-700 flex items-center gap-1">
                <Sparkles size={13} />
                {t("statusLifetime")}
              </span>
            )}
          </div>

          {/* Quick End of Day Indicator */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              applyPresetDays(30);
            }}
            className="px-2 py-1 text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors shrink-0"
            title="23:59"
          >
            23:59
          </button>

          {/* Lifetime / Clear Toggle */}
          {allowLifetime && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                applyLifetime();
              }}
              className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-all shrink-0 ${
                dateAnalysis.isLifetime
                  ? "bg-purple-600 text-white shadow-2xs"
                  : "text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200"
              }`}
              title="Vô thời hạn"
            >
              ♾️ {t("statusLifetime")}
            </button>
          )}
        </div>

        {/* Quick Presets Pills Bar */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
          <span className="text-[11px] font-semibold text-slate-500 mr-0.5">{t("quickSelect")}</span>
          {defaultPresets.map((p) => (
            <button
              key={p.days}
              type="button"
              onClick={() => applyPresetDays(p.days)}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${theme.btnPill}`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Footer info text */}
        {helperText && (
          <div className="mt-2 pt-2 border-t border-slate-200/60 text-[11px] text-slate-500 italic">
            {helperText}
          </div>
        )}
      </div>

      {/* FLOATING CALENDAR & TIME PICKER POPOVER (PORTAL OVERLAY) */}
      {isOpen && typeof document !== "undefined" && createPortal(
        <>
          {/* Backdrop Catcher */}
          <div
            className="fixed inset-0 z-[99998] bg-slate-900/10 backdrop-blur-[0.5px]"
            onClick={() => setIsOpen(false)}
          />

          {/* Floating Popover Container */}
          <div
            ref={popoverRef}
            style={{
              position: "fixed",
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              zIndex: 99999,
            }}
            className="bg-white rounded-2xl border border-slate-200 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35)] p-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Popover Header: Month Nav & Jump to Today */}
            <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date(viewDate);
                    d.setMonth(d.getMonth() - 1);
                    setViewDate(d);
                  }}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs font-black text-slate-900 capitalize px-1">
                  {monthYearTitle}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date(viewDate);
                    d.setMonth(d.getMonth() + 1);
                    setViewDate(d);
                  }}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={applyToday}
                  className="px-2 py-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  {t("btnToday")}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Weekday Labels */}
            <div className="grid grid-cols-7 gap-1 text-center mb-1">
              {weekDays.map((wd, i) => (
                <span
                  key={wd}
                  className={`text-[11px] font-black py-1 ${
                    i >= 5 ? "text-rose-500" : "text-slate-400"
                  }`}
                >
                  {wd}
                </span>
              ))}
            </div>

            {/* Calendar Day Cells Grid */}
            <div className="grid grid-cols-7 gap-1 text-center mb-3">
              {calendarGrid.map((item, idx) => {
                const dayNum = item.date.getDate();
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectDay(item.date)}
                    className={`h-8 w-full rounded-xl text-xs font-bold transition-all flex items-center justify-center relative ${
                      item.isSelected
                        ? theme.selectedDay
                        : item.isCurrentMonth
                        ? "text-slate-800 hover:bg-slate-100"
                        : "text-slate-300 hover:bg-slate-50"
                    } ${item.isToday && !item.isSelected ? "border border-orange-400 text-orange-600" : ""}`}
                  >
                    {dayNum}
                  </button>
                );
              })}
            </div>

            {/* Time Picker Section */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <Clock size={14} className="text-slate-500" />
                <span>{t("timeLabel")}</span>
              </div>

              <div className="flex items-center gap-1 font-mono text-xs">
                {/* Hour Input */}
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={String(hour).padStart(2, "0")}
                  onChange={(e) => handleHourChange(Number(e.target.value) || 0)}
                  className="w-10 px-1 py-1 text-center font-bold text-slate-800 bg-white rounded-lg border border-slate-300 focus:outline-hidden"
                />
                <span className="font-bold text-slate-500">:</span>
                {/* Minute Input */}
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={String(minute).padStart(2, "0")}
                  onChange={(e) => handleMinuteChange(Number(e.target.value) || 0)}
                  className="w-10 px-1 py-1 text-center font-bold text-slate-800 bg-white rounded-lg border border-slate-300 focus:outline-hidden"
                />

                {/* Quick Time Pills */}
                <div className="flex items-center gap-1 ml-1.5">
                  {[
                    { label: "00:00", h: 0, m: 0 },
                    { label: "12:00", h: 12, m: 0 },
                    { label: "23:59", h: 23, m: 59 },
                  ].map((tp) => (
                    <button
                      key={tp.label}
                      type="button"
                      onClick={() => {
                        setHour(tp.h);
                        setMinute(tp.m);
                        if (parsedDate) emitDateTime(parsedDate, tp.h, tp.m);
                      }}
                      className={`px-1.5 py-1 text-[10px] font-bold rounded-md transition-colors ${
                        hour === tp.h && minute === tp.m
                          ? "bg-slate-900 text-white"
                          : "bg-white text-slate-700 hover:bg-slate-200 border border-slate-200"
                      }`}
                    >
                      {tp.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={applyLifetime}
                className="text-xs font-bold text-purple-700 hover:text-purple-800 hover:underline flex items-center gap-1"
              >
                <Sparkles size={12} />
                {t("statusLifetime")}
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className={`px-4 py-1.5 text-xs font-bold rounded-xl shadow-xs transition-all ${theme.btnAction}`}
              >
                {t("btnApplyDate")}
              </button>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
