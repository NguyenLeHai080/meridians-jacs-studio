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
  | "neutral";

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
