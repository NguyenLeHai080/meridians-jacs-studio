import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

// SweetAlert2 custom Toast Mixin
export const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3200,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer;
    toast.onmouseleave = Swal.resumeTimer;
  },
  customClass: {
    popup: "jacs-swal-toast",
    title: "jacs-swal-toast-title",
  },
});

/**
 * Hiển thị thông báo Toast góc trên bên phải
 */
export const showToast = (
  message: string,
  type: "success" | "error" | "warning" | "info" = "success"
) => {
  return Toast.fire({
    icon: type,
    title: message,
  });
};

export interface ConfirmDialogOptions {
  title?: string;
  text?: string;
  html?: string;
  icon?: "warning" | "error" | "info" | "question" | "success";
  confirmButtonText?: string;
  cancelButtonText?: string;
  isDestructive?: boolean;
  confirmButtonColor?: string;
}

/**
 * Hiển thị hộp thoại xác nhận SweetAlert2 chuyên nghiệp
 */
export const confirmDialog = async ({
  title = "Xác nhận hành động",
  text,
  html,
  icon = "warning",
  confirmButtonText = "Xác nhận",
  cancelButtonText = "Hủy bỏ",
  isDestructive = false,
  confirmButtonColor,
}: ConfirmDialogOptions): Promise<boolean> => {
  const result = await Swal.fire({
    title,
    text,
    html,
    icon,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    confirmButtonColor:
      confirmButtonColor || (isDestructive ? "#e11d48" : "#ea580c"),
    cancelButtonColor: "#64748b",
    reverseButtons: true,
    focusCancel: isDestructive,
    customClass: {
      popup: "jacs-swal-modal",
      title: "jacs-swal-modal-title",
      htmlContainer: "jacs-swal-modal-html",
      confirmButton: isDestructive ? "jacs-swal-btn-danger" : "jacs-swal-btn-primary",
      cancelButton: "jacs-swal-btn-cancel",
    },
    backdrop: `rgba(15, 23, 42, 0.65)`,
    showClass: {
      popup: "animate__animated animate__fadeInDown animate__faster",
    },
    hideClass: {
      popup: "animate__animated animate__fadeOutUp animate__faster",
    },
  });

  return result.isConfirmed;
};

/**
 * Hiển thị Popup cảnh báo thành công
 */
export const alertSuccess = (title: string, text?: string) => {
  return Swal.fire({
    icon: "success",
    title,
    text,
    confirmButtonText: "Đồng ý",
    confirmButtonColor: "#ea580c",
    customClass: {
      popup: "jacs-swal-modal",
      confirmButton: "jacs-swal-btn-primary",
    },
    backdrop: `rgba(15, 23, 42, 0.65)`,
  });
};

/**
 * Hiển thị Popup cảnh báo lỗi
 */
export const alertError = (title: string, text?: string) => {
  return Swal.fire({
    icon: "error",
    title,
    text,
    confirmButtonText: "Đóng",
    confirmButtonColor: "#e11d48",
    customClass: {
      popup: "jacs-swal-modal",
      confirmButton: "jacs-swal-btn-danger",
    },
    backdrop: `rgba(15, 23, 42, 0.65)`,
  });
};

export default Swal;
