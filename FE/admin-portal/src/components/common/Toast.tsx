import { useEffect } from "react";
import { showToast } from "../../core/swal";

export interface ToastProps {
  type?: "success" | "error" | "info" | "warning";
  message: string;
  onClose?: () => void;
}

export function Toast({
  type = "info",
  message,
  onClose,
}: ToastProps) {
  useEffect(() => {
    if (message) {
      showToast(message, type);
      if (onClose) {
        onClose();
      }
    }
  }, [message, type, onClose]);

  return null;
}

export default Toast;
