import React from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";
import type { EulaDocument } from "../types";
import { useI18n } from "../../../core/i18n";

interface TermsDeleteModalProps {
  show: boolean;
  onClose: () => void;
  onSubmit: () => void;
  selectedDoc: EulaDocument | null;
}

export const TermsDeleteModal: React.FC<TermsDeleteModalProps> = ({
  show,
  onClose,
  onSubmit,
  selectedDoc,
}) => {
  const { t } = useI18n();

  if (!show || !selectedDoc) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
            <AlertTriangle size={24} />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <h3 className="text-lg font-black text-slate-900 tracking-tight mb-1.5">
          {t("deleteTermsTitle", "Xác Nhận Xóa Văn Bản Quy Chế?")}
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed mb-4">
          {t("deleteModalWarning", "Hành động này sẽ xóa văn bản bản quyền")} <strong className="text-slate-900 font-mono">[{selectedDoc.code}]</strong> ({selectedDoc.title}).
        </p>

        {selectedDoc.status === "active" && (
          <div className="p-3 mb-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
            {t("deleteActiveWarning", "Lưu ý: Đây là văn bản đang được áp dụng chính thức trên toàn hệ thống.")}
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors active:scale-95"
          >
            {t("btnCancel", "Hủy bỏ")}
          </button>
          <button
            type="button"
            onClick={onSubmit}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-600/20 transition-all active:scale-95"
          >
            <Trash2 size={14} />
            <span>{t("btnConfirmDelete", "Xác nhận xóa")}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
