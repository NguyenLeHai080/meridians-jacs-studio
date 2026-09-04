import React from "react";

export type BadgeVariant =
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral"
  | "secondary";

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
  className?: string;
  dot?: boolean;
  style?: React.CSSProperties;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "neutral",
  size = "md",
  icon,
  className = "",
  dot = false,
  style,
}) => {
  return (
    <span
      className={`status-pill status-pill-${variant} badge-${size} ${className}`}
      style={style}
    >
      {dot && <span className="status-pill-dot" />}
      {icon && <span className="status-pill-icon">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};

export interface StatusBadgeProps {
  status: string;
  label?: string;
  className?: string;
  size?: "sm" | "md";
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  className = "",
  size = "md",
}) => {
  const norm = (status || "").toLowerCase();

  let variant: BadgeVariant = "neutral";
  let defaultLabel = label || status;

  if (["active", "success", "completed", "done", "online", "ready"].includes(norm)) {
    variant = "success";
    defaultLabel = label || "Hoạt động";
  } else if (["running", "processing", "rendering", "analyzing"].includes(norm)) {
    variant = "primary";
    defaultLabel = label || "Đang xử lý";
  } else if (["warning", "pending", "queued", "paused", "expiring"].includes(norm)) {
    variant = "warning";
    defaultLabel = label || "Chờ xử lý";
  } else if (["danger", "failed", "error", "expired", "revoked", "suspended"].includes(norm)) {
    variant = "danger";
    defaultLabel = label || "Lỗi / Hết hạn";
  } else if (["info", "draft", "new"].includes(norm)) {
    variant = "info";
    defaultLabel = label || "Thông tin";
  }

  return (
    <Badge variant={variant} size={size} dot className={className}>
      {defaultLabel}
    </Badge>
  );
};

export const StatusPill = StatusBadge;
