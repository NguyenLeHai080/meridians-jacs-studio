import React, { useEffect } from "react";
import { Icon } from "../../shared/Icon";

export interface ToastProps {
  message: string;
  type?: "success" | "error" | "info" | "warning";
  duration?: number;
  onClose?: () => void;
  position?: "top-right" | "top-center" | "bottom-right";
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = "success",
  duration = 3500,
  onClose,
  position = "top-right",
}) => {
  useEffect(() => {
    if (duration > 0 && onClose) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const bgColors: Record<string, string> = {
    success: "rgba(16, 185, 129, 0.95)",
    error: "rgba(239, 68, 68, 0.95)",
    warning: "rgba(245, 158, 11, 0.95)",
    info: "rgba(14, 165, 233, 0.95)",
  };

  const icons: Record<string, string> = {
    success: "check",
    error: "x",
    warning: "alert-triangle",
    info: "info",
  };

  return (
    <div
      className={`app-toast toast-${type} toast-${position}`}
      style={{
        position: "fixed",
        top: position.startsWith("top") ? "20px" : "auto",
        bottom: position.startsWith("bottom") ? "20px" : "auto",
        right: position.endsWith("right") ? "20px" : "auto",
        left: position === "top-center" ? "50%" : "auto",
        transform: position === "top-center" ? "translateX(-50%)" : "none",
        background: bgColors[type] || bgColors.success,
        color: "#ffffff",
        padding: "10px 18px",
        borderRadius: "10px",
        fontSize: "13px",
        fontWeight: 700,
        boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
        zIndex: 99999,
        backdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        gap: "10px",
      }}
    >
      <Icon name={icons[type] as any || "check"} size={16} />
      <span>{message}</span>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            color: "rgba(255,255,255,0.8)",
            cursor: "pointer",
            padding: "2px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <Icon name="x" size={13} />
        </button>
      )}
    </div>
  );
};
