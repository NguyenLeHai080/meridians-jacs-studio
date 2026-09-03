import React from "react";

export function Toast({
  type = "info",
  message,
  onClose,
}: {
  type?: "success" | "error" | "info" | "warning";
  message: string;
  onClose?: () => void;
}) {
  if (!message) return null;

  return (
    <div className={`toast-banner toast-${type} animate-fade-in`}>
      <span className="toast-icon">
        {type === "success" && "✓"}
        {type === "error" && "✕"}
        {type === "warning" && "⚠"}
        {type === "info" && "ℹ"}
      </span>
      <span className="toast-text">{message}</span>
      {onClose && (
        <button type="button" className="toast-close" onClick={onClose}>
          ✕
        </button>
      )}
    </div>
  );
}
