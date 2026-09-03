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
      {label && (
        <label
          className="form-label-mf"
          style={{ display: "block", marginBottom: "6px", fontSize: "0.8rem", fontWeight: 700, color: "#1e293b" }}
        >
          {label}
        </label>
      )}

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
          background: "#ffffff",
          borderColor: isOpen ? "#f95738" : "#cbd5e1",
          borderWidth: "1px",
          borderStyle: "solid",
          padding: "0.6rem 0.85rem",
          borderRadius: "8px",
          boxShadow: isOpen ? "0 0 0 3px rgba(249, 87, 56, 0.15)" : "none",
          transition: "all 0.15s ease",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
          <CalendarIcon size={16} color="#f95738" />
          <span style={{ color: value ? "#0f172a" : "#64748b", fontSize: "0.88rem", fontWeight: value ? 600 : 400 }}>
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
                color: "#94a3b8",
                cursor: "pointer",
                padding: "2px",
                display: "flex",
                alignItems: "center",
                borderRadius: "4px",
              }}
              title="Đặt vĩnh viễn"
            >
              <X size={14} />
            </button>
          )}
          <Clock size={14} color="#94a3b8" />
        </div>
      </div>

      {/* Calendar Popup */}
      {isOpen && (
        <div
          className="datepicker-popup animate-fade-in"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            zIndex: 99999,
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            boxShadow: "0 18px 40px rgba(15, 23, 42, 0.18), 0 2px 6px rgba(0, 0, 0, 0.06)",
            padding: "16px",
            width: "320px",
          }}
        >
          {/* Quick Presets */}
          <div style={{ marginBottom: "14px" }}>
            <div style={{ fontSize: "0.72rem", color: "#64748b", marginBottom: "6px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>
              Gia hạn nhanh:
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
              <button
                type="button"
                onClick={() => handleQuickPreset(30)}
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  padding: "5px 8px",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "6px",
                  color: "#334155",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.borderColor = "#cbd5e1"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#f8fafc"; e.currentTarget.style.borderColor = "#e2e8f0"; }}
              >
                +30 ngày (1T)
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset(90)}
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  padding: "5px 8px",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "6px",
                  color: "#334155",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.borderColor = "#cbd5e1"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#f8fafc"; e.currentTarget.style.borderColor = "#e2e8f0"; }}
              >
                +90 ngày (3T)
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset(180)}
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  padding: "5px 8px",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "6px",
                  color: "#334155",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.borderColor = "#cbd5e1"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#f8fafc"; e.currentTarget.style.borderColor = "#e2e8f0"; }}
              >
                +180 ngày (6T)
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset(365)}
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  padding: "5px 8px",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "6px",
                  color: "#334155",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.borderColor = "#cbd5e1"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#f8fafc"; e.currentTarget.style.borderColor = "#e2e8f0"; }}
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
                  background: !value ? "#fff1ec" : "#f8fafc",
                  border: !value ? "1px solid #f95738" : "1px solid #e2e8f0",
                  borderRadius: "6px",
                  color: !value ? "#f95738" : "#334155",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <InfinityIcon size={14} /> Vĩnh viễn (Không thời hạn)
              </button>
            )}
          </div>

          <div style={{ height: "1px", background: "#e2e8f0", margin: "10px 0" }} />

          {/* Month Header Navigation */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <button
              type="button"
              onClick={handlePrevMonth}
              style={{
                background: "#f1f5f9",
                border: "1px solid #e2e8f0",
                borderRadius: "6px",
                color: "#334155",
                padding: "4px 8px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontWeight: 800, fontSize: "0.92rem", color: "#0f172a" }}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              style={{
                background: "#f1f5f9",
                border: "1px solid #e2e8f0",
                borderRadius: "6px",
                color: "#334155",
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
              <div key={d} style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700 }}>
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
                    fontWeight: active || today ? 700 : 500,
                    borderRadius: "6px",
                    border: active ? "1px solid #f95738" : today ? "1px solid #f95738" : "none",
                    background: active ? "#f95738" : today ? "#fff1ec" : "transparent",
                    color: disabled ? "#cbd5e1" : active ? "#ffffff" : today ? "#f95738" : "#1e293b",
                    cursor: disabled ? "not-allowed" : "pointer",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!active && !disabled) {
                      e.currentTarget.style.background = "#f1f5f9";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active && !disabled) {
                      e.currentTarget.style.background = today ? "#fff1ec" : "transparent";
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
