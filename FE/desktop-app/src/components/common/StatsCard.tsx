import React from "react";
import { Icon, type IconName } from "../../shared/Icon";

export interface StatsCardProps {
  label: string;
  value: string | number;
  icon?: IconName | React.ReactNode;
  hint?: string;
  trend?: {
    value: string | number;
    isPositive?: boolean;
  };
  variant?: "primary" | "success" | "warning" | "danger" | "neutral";
  className?: string;
  onClick?: () => void;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  label,
  value,
  icon,
  hint,
  trend,
  variant = "neutral",
  className = "",
  onClick,
}) => {
  return (
    <div
      className={`stat-card stat-card-${variant} ${onClick ? "clickable" : ""} ${className}`}
      onClick={onClick}
    >
      <div className="stat-card-header">
        <span className="stat-card-label">{label}</span>
        {icon && (
          <div className="stat-card-icon">
            {typeof icon === "string" ? (
              <Icon name={icon as IconName} size={18} />
            ) : (
              icon
            )}
          </div>
        )}
      </div>
      <div className="stat-card-body">
        <div className="stat-card-value">{value}</div>
        {trend && (
          <div className={`stat-card-trend ${trend.isPositive ? "trend-up" : "trend-down"}`}>
            <span>{trend.isPositive ? "↑" : "↓"} {trend.value}</span>
          </div>
        )}
      </div>
      {hint && <div className="stat-card-hint">{hint}</div>}
    </div>
  );
};
