import React from "react";

export type BadgeVariant =
  | "active"
  | "blocked"
  | "expired"
  | "revoked"
  | "online"
  | "offline"
  | "info"
  | "warning"
  | "fatal"
  | "neutral"
  | "success"
  | "danger"
  | "purple";

export function Badge({
  children,
  variant = "neutral",
  dot = true,
  className = "",
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span className={`badge-pill badge-${variant} ${className}`}>
      {dot && <span className="badge-dot" />}
      <span>{children}</span>
    </span>
  );
}

export function StatusBadge({
  status,
  label,
  dot = true,
  className = "",
}: {
  status: "active" | "online" | "warning" | "expired" | "danger" | "blocked" | "offline" | "pending" | "info" | string;
  label?: string;
  dot?: boolean;
  className?: string;
}) {
  const getPillClass = () => {
    switch (status.toLowerCase()) {
      case "active":
      case "published":
      case "online":
        return "pill-active pill-online";
      case "warning":
      case "expired":
      case "draft":
        return "pill-warning";
      case "danger":
      case "blocked":
      case "revoked":
      case "fatal":
      case "error":
        return "pill-danger";
      case "pending":
      case "info":
        return "status-pending";
      case "offline":
      default:
        return "status-offline";
    }
  };

  return (
    <span className={`pill-status ${getPillClass()} ${className}`}>
      {dot && <span>●</span>}
      <span>{label || status}</span>
    </span>
  );
}
