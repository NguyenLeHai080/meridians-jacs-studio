import React, { useState, useRef, useEffect } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, Clock, Infinity as InfinityIcon } from "lucide-react";

interface DatePickerProps {
  value: string | null;
  onChange: (dateIso: string | null) => void;
  label?: string;
  placeholder?: string;
  allowLifetime?: boolean;
  minDate?: Date;
}

const MONTH_NAMES = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
];

const DAY_NAMES = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

export function DatePicker({
  value,
  onChange,
  label,
  placeholder = "Chọn ngày hết hạn...",
  allowLifetime = true,
  minDate = new Date(),
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial selected date
  const selectedDate = value ? new Date(value) : null;
  const initialViewDate = selectedDate && !isNaN(selectedDate.getTime()) ? selectedDate : new Date();

  const [viewYear, setViewYear] = useState(initialViewDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialViewDate.getMonth());

  // Sync view when value changes from outside
  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [value]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const d = new Date(viewYear, viewMonth, day, 23, 59, 59);
    onChange(d.toISOString());
    setIsOpen(false);
  };

  const handleQuickPreset = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(23, 59, 59, 999);
    onChange(d.toISOString());
    setIsOpen(false);
  };

  const handleSetLifetime = () => {
    onChange(null);
    setIsOpen(false);
  };

  // Generate calendar grid
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7; // Monday = 0

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  // Format display string
  const formatDisplay = () => {
    if (!value) return allowLifetime ? "Vĩnh viễn (Không thời hạn)" : "";
    const d = new Date(value);
    if (isNaN(d.getTime())) return "";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const mins = String(d.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${mins}`;
  };

  const isToday = (day: number) => {
    const now = new Date();
    return (
      now.getFullYear() === viewYear &&
      now.getMonth() === viewMonth &&
      now.getDate() === day
    );
  };

  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    return (
      selectedDate.getFullYear() === viewYear &&
      selectedDate.getMonth() === viewMonth &&
      selectedDate.getDate() === day
    );
  };

  const isPast = (day: number) => {
    if (!minDate) return false;
    const check = new Date(viewYear, viewMonth, day, 23, 59, 59);
    return check.getTime() < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate()).getTime();
  };

  return (
    <div className="datepicker-container" ref={containerRef} style={{ position: "relative", width: "100%" }}>
      {label && <label className="form-label-mf" style={{ display: "block", marginBottom: "6px" }}>{label}</label>}

      {/* Input Display Button */}
      <div
        className="form-input-mf datepicker-trigger"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          userSelect: "none",
          background: "rgba(255, 255, 255, 0.05)",
          borderColor: isOpen ? "var(--primary)" : "rgba(255, 255, 255, 0.12)",
          padding: "0.6rem 0.85rem",
          borderRadius: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <CalendarIcon size={16} color="var(--primary)" />
          <span style={{ color: value ? "#fff" : "rgba(255, 255, 255, 0.85)", fontSize: "0.9rem", fontWeight: value ? 600 : 400 }}>
            {formatDisplay() || placeholder}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          {value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
              style={{
                background: "transparent",
                border: "none",
                color: "rgba(255, 255, 255, 0.4)",
                cursor: "pointer",
                padding: "2px",
                display: "flex",
                alignItems: "center",
              }}
              title="Đặt vĩnh viễn"
            >
              <X size={14} />
            </button>
          )}
          <Clock size={14} color="rgba(255, 255, 255, 0.4)" />
        </div>
      </div>

      {/* Calendar Popup */}
      {isOpen && (
        <div
          className="datepicker-popup"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            zIndex: 1000,
            background: "#16192b",
            border: "1px solid rgba(255, 255, 255, 0.18)",
            borderRadius: "12px",
            boxShadow: "0 16px 36px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.05)",
            padding: "16px",
            width: "320px",
            backdropFilter: "blur(12px)",
          }}
        >
          {/* Quick Presets */}
          <div style={{ marginBottom: "14px" }}>
            <div style={{ fontSize: "0.75rem", color: "rgba(255, 255, 255, 0.5)", marginBottom: "6px", fontWeight: 600, textTransform: "uppercase" }}>
              Gia hạn nhanh:
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
              <button
                type="button"
                className="btn-ghost-sm"
                onClick={() => handleQuickPreset(30)}
                style={{ fontSize: "0.78rem", padding: "5px 8px", background: "rgba(255, 255, 255, 0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", color: "#fff", cursor: "pointer" }}
              >
                +30 ngày (1T)
              </button>
              <button
                type="button"
                className="btn-ghost-sm"
                onClick={() => handleQuickPreset(90)}
                style={{ fontSize: "0.78rem", padding: "5px 8px", background: "rgba(255, 255, 255, 0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", color: "#fff", cursor: "pointer" }}
              >
                +90 ngày (3T)
              </button>
              <button
                type="button"
                className="btn-ghost-sm"
                onClick={() => handleQuickPreset(180)}
                style={{ fontSize: "0.78rem", padding: "5px 8px", background: "rgba(255, 255, 255, 0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", color: "#fff", cursor: "pointer" }}
              >
                +180 ngày (6T)
              </button>
              <button
                type="button"
                className="btn-ghost-sm"
                onClick={() => handleQuickPreset(365)}
                style={{ fontSize: "0.78rem", padding: "5px 8px", background: "rgba(255, 255, 255, 0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", color: "#fff", cursor: "pointer" }}
              >
                +365 ngày (1N)
              </button>
            </div>
            {allowLifetime && (
              <button
                type="button"
                onClick={handleSetLifetime}
                style={{
                  marginTop: "6px",
                  width: "100%",
                  fontSize: "0.78rem",
                  padding: "6px 8px",
                  background: !value ? "rgba(249, 87, 56, 0.18)" : "rgba(255, 255, 255, 0.06)",
                  border: !value ? "1px solid #f95738" : "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "6px",
                  color: !value ? "#f95738" : "#fff",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  cursor: "pointer",
                }}
              >
                <InfinityIcon size={14} /> Vĩnh viễn (Không thời hạn)
              </button>
            )}
          </div>

          <div style={{ height: "1px", background: "rgba(255, 255, 255, 0.1)", margin: "10px 0" }} />

          {/* Month Header Navigation */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <button
              type="button"
              onClick={handlePrevMonth}
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                border: "none",
                borderRadius: "6px",
                color: "#fff",
                padding: "4px 8px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontWeight: 700, fontSize: "0.92rem", color: "#fff" }}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                border: "none",
                borderRadius: "6px",
                color: "#fff",
                padding: "4px 8px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Days Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", textAlign: "center", marginBottom: "6px" }}>
            {DAY_NAMES.map((d) => (
              <div key={d} style={{ fontSize: "0.72rem", color: "rgba(255, 255, 255, 0.4)", fontWeight: 600 }}>
                {d}
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", textAlign: "center" }}>
            {days.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} style={{ height: "30px" }} />;
              }

              const active = isSelected(day);
              const today = isToday(day);
              const disabled = isPast(day);

              return (
                <button
                  key={`day-${day}`}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleSelectDay(day)}
                  style={{
                    height: "30px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.82rem",
                    fontWeight: active || today ? 700 : 400,
                    borderRadius: "6px",
                    border: active ? "1px solid #f95738" : today ? "1px solid rgba(249, 87, 56, 0.5)" : "none",
                    background: active ? "#f95738" : today ? "rgba(249, 87, 56, 0.15)" : "transparent",
                    color: disabled ? "rgba(255, 255, 255, 0.2)" : active ? "#fff" : today ? "#f95738" : "#fff",
                    cursor: disabled ? "not-allowed" : "pointer",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!active && !disabled) {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.12)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active && !disabled) {
                      e.currentTarget.style.background = today ? "rgba(249, 87, 56, 0.15)" : "transparent";
                    }
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
