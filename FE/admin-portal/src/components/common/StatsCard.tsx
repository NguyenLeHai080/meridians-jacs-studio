import React from "react";

export function StatsCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = "emerald",
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: { label: string; positive?: boolean };
  color?: "emerald" | "cyan" | "amber" | "rose" | "purple";
}) {
  return (
    <div className={`stats-card stats-${color}`}>
      <div className="stats-card-header">
        <span className="stats-card-title">{title}</span>
        {icon && <div className="stats-card-icon">{icon}</div>}
      </div>
      <div className="stats-card-value">{value}</div>
      {(subtitle || trend) && (
        <div className="stats-card-footer">
          {trend && (
            <span className={`stats-trend ${trend.positive ? "trend-up" : "trend-down"}`}>
              {trend.label}
            </span>
          )}
          {subtitle && <span className="stats-card-sub">{subtitle}</span>}
        </div>
      )}
    </div>
  );
}
