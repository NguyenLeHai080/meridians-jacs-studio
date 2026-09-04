import { ReactNode, useEffect } from "react";
import { Icon } from "./Icon";

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
};

export function Modal({
  isOpen,
  onClose,
  title,
  eyebrow,
  children,
  footer,
  maxWidth = "640px",
}: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="jacs-modal-overlay" onClick={onClose}>
      <div
        className="jacs-modal-card"
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="jacs-modal-header">
          <div>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            <h3>{title}</h3>
          </div>
          <button
            type="button"
            className="jacs-modal-close-btn"
            onClick={onClose}
            aria-label="Đóng"
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        <div className="jacs-modal-body">{children}</div>

        {footer && <div className="jacs-modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
