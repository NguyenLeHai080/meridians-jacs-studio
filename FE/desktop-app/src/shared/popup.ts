import Swal, { type SweetAlertOptions, type SweetAlertResult, type SweetAlertIcon } from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

/**
 * Base custom theme configuration for JACS Studio SweetAlert2 popups
 */
const BASE_MODAL_CONFIG: SweetAlertOptions = {
  background: "#10131c",
  color: "#f8fafc",
  backdrop: "rgba(0, 0, 0, 0.75)",
  confirmButtonColor: "#f59e0b",
  cancelButtonColor: "#334155",
  customClass: {
    popup: "jacs-swal-popup",
    title: "jacs-swal-title",
    htmlContainer: "jacs-swal-html",
    confirmButton: "jacs-swal-confirm-btn",
    cancelButton: "jacs-swal-cancel-btn",
    denyButton: "jacs-swal-deny-btn",
    input: "jacs-swal-input",
  },
  buttonsStyling: true,
};

/**
 * Toast Mixin configured for sleek studio notifications
 */
const Toast = Swal.mixin({
  toast: true,
  position: "bottom-end",
  showConfirmButton: false,
  timer: 3200,
  timerProgressBar: true,
  background: "rgba(16, 19, 28, 0.95)",
  color: "#f8fafc",
  customClass: {
    popup: "jacs-swal-toast",
    title: "jacs-swal-toast-title",
    timerProgressBar: "jacs-swal-toast-bar",
  },
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer;
    toast.onmouseleave = Swal.resumeTimer;
  },
});

/**
 * Global Popup Service for JACS Studio
 */
export const popup = {
  /**
   * Raw access to SweetAlert2 instance
   */
  swal: Swal,

  /**
   * Show a quick Toast notification in the corner
   */
  toast: (
    title: string,
    icon: SweetAlertIcon = "info",
    options?: SweetAlertOptions
  ): Promise<SweetAlertResult> => {
    return Toast.fire({
      icon,
      title,
      ...options,
    });
  },

  /**
   * Quick success toast or dialog
   */
  success: (
    title: string,
    message?: string,
    isToast = true
  ): Promise<SweetAlertResult> => {
    if (isToast) {
      return Toast.fire({
        icon: "success",
        title: title + (message ? ` — ${message}` : ""),
      });
    }
    return Swal.fire({
      ...BASE_MODAL_CONFIG,
      icon: "success",
      title,
      text: message,
      confirmButtonText: "Đã Hiểu",
    });
  },

  /**
   * Quick error toast or modal alert
   */
  error: (
    title: string,
    message?: string,
    isToast = false
  ): Promise<SweetAlertResult> => {
    if (isToast) {
      return Toast.fire({
        icon: "error",
        title: title + (message ? ` — ${message}` : ""),
      });
    }
    return Swal.fire({
      ...BASE_MODAL_CONFIG,
      icon: "error",
      title,
      text: message,
      confirmButtonText: "Đóng",
      confirmButtonColor: "#ef4444",
    });
  },

  /**
   * Quick warning alert
   */
  warning: (
    title: string,
    message?: string,
    isToast = false
  ): Promise<SweetAlertResult> => {
    if (isToast) {
      return Toast.fire({
        icon: "warning",
        title: title + (message ? ` — ${message}` : ""),
      });
    }
    return Swal.fire({
      ...BASE_MODAL_CONFIG,
      icon: "warning",
      title,
      text: message,
      confirmButtonText: "Đồng Ý",
    });
  },

  /**
   * Quick info alert
   */
  info: (
    title: string,
    message?: string,
    isToast = true
  ): Promise<SweetAlertResult> => {
    if (isToast) {
      return Toast.fire({
        icon: "info",
        title: title + (message ? ` — ${message}` : ""),
      });
    }
    return Swal.fire({
      ...BASE_MODAL_CONFIG,
      icon: "info",
      title,
      text: message,
      confirmButtonText: "Đã Hiểu",
    });
  },

  /**
   * Confirmation Dialog (Replaces native window.confirm)
   * Returns true if user clicked Confirm, false otherwise.
   */
  confirm: async (
    title: string,
    text?: string,
    confirmText = "Xác Nhận",
    cancelText = "Hủy Bỏ",
    options?: SweetAlertOptions
  ): Promise<boolean> => {
    const result = await Swal.fire({
      ...BASE_MODAL_CONFIG,
      icon: "warning",
      title,
      text,
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
      reverseButtons: true,
      focusCancel: true,
      ...(options as any),
    });
    return result.isConfirmed;
  },

  /**
   * Danger / Deletion Confirmation Dialog
   * Highlighted with crimson red buttons
   */
  confirmDelete: async (
    title: string,
    text?: string,
    confirmText = "Xóa Ngay",
    cancelText = "Hủy"
  ): Promise<boolean> => {
    const result = await Swal.fire({
      ...BASE_MODAL_CONFIG,
      icon: "warning",
      title,
      text,
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#334155",
      reverseButtons: true,
      focusCancel: true,
    });
    return result.isConfirmed;
  },

  /**
   * Prompt dialog to ask for user text input
   */
  prompt: async (
    title: string,
    placeholder = "",
    inputValue = "",
    confirmText = "Lưu",
    cancelText = "Hủy"
  ): Promise<string | null> => {
    const result = await Swal.fire({
      ...BASE_MODAL_CONFIG,
      title,
      input: "text",
      inputValue,
      inputPlaceholder: placeholder,
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
      reverseButtons: true,
      inputValidator: (value: string) => {
        if (!value || !value.trim()) {
          return "Vui lòng nhập nội dung!";
        }
        return null;
      },
    });
    if (result.isConfirmed && typeof result.value === "string") {
      return result.value.trim();
    }
    return null;
  },

  /**
   * Show a loading spinner modal (for long background tasks)
   */
  loading: (title = "Đang xử lý...", text = "Vui lòng đợi trong giây lát"): void => {
    Swal.fire({
      ...BASE_MODAL_CONFIG,
      title,
      text,
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });
  },

  /**
   * Close any currently open SweetAlert2 popup or loading spinner
   */
  close: (): void => {
    Swal.close();
  },
};

export default popup;
