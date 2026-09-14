import React from "react";
import { Trash2, X, AlertTriangle } from "lucide-react";
import type { License } from "../../../core/types";
import { useI18n } from "../../../core/i18n";

export interface DeleteUserModalProps {
  show: boolean;
  onClose: () => void;
  onSubmit: () => void;
  selectedLicense: License | null;
  actionLoading: boolean;
}

export function DeleteUserModal({
  show,
  onClose,
  onSubmit,
  selectedLicense,
  actionLoading,
}: DeleteUserModalProps) {
  const { t } = useI18n();

  if (!show || !selectedLicense) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200/90 w-full max-w-md flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-rose-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <Trash2 size={18} />
            </div>
            <h3 className="text-base font-bold text-slate-900 m-0">
              {t("deleteModalTitle")}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 flex flex-col gap-3">
          <div className="flex items-start gap-3 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
            <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
            <span>{t("deleteModalWarning")}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div className="font-bold text-slate-900 text-sm">{selectedLicense.customer_name}</div>
            <div className="text-slate-500 mt-0.5">{selectedLicense.customer_contact || t("noEmail")}</div>
            <div className="font-mono text-[11px] text-slate-600 mt-1 font-semibold">Key: {selectedLicense.key_hint}</div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2.5 bg-slate-50/70">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-all"
          >
            {t("modalCancel")}
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={actionLoading}
            className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 rounded-xl shadow-md shadow-rose-600/20 transition-all disabled:opacity-50"
          >
            {actionLoading ? t("modalSubmitting") : t("btnConfirmDelete")}
          </button>
        </div>
      </div>
    </div>
  );
}
