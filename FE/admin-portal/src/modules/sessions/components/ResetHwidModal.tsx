import React from "react";
import { Laptop, X, AlertTriangle } from "lucide-react";
import type { License } from "../../../core/types";
import { useI18n } from "../../../core/i18n";

export interface ResetHwidModalProps {
  show: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  selectedLicense: License | null;
  resetHwidForm: {
    hwid: string;
    reason: string;
  };
  setResetHwidForm: React.Dispatch<React.SetStateAction<any>>;
  generatePlaceholderHwid: () => string;
  actionLoading: boolean;
}

export function ResetHwidModal({
  show,
  onClose,
  onSubmit,
  selectedLicense,
  resetHwidForm,
  setResetHwidForm,
  generatePlaceholderHwid,
  actionLoading,
}: ResetHwidModalProps) {
  const { t } = useI18n();

  if (!show || !selectedLicense) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200/90 w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-50 border border-cyan-100 text-cyan-600 flex items-center justify-center">
              <Laptop size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 m-0">
                {t("resetHwidModalTitle")}
              </h3>
              <span className="text-xs text-slate-500">
                {selectedLicense.customer_name} • Key: {selectedLicense.key_hint}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0 m-0">
          <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
            
            {/* Warning Box */}
            <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
              <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <span>{t("resetHwidWarning")}</span>
            </div>

            {/* Current HWID */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                {t("resetHwidCurrent")}
              </label>
              <div className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-3 py-2 rounded-xl border border-slate-200">
                {selectedLicense.hwid || t("noMachineBound")}
              </div>
            </div>

            {/* New HWID Input */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-slate-800 m-0">
                  {t("resetHwidNew")}
                </label>
                <button
                  type="button"
                  onClick={() => setResetHwidForm({ ...resetHwidForm, hwid: generatePlaceholderHwid() })}
                  className="text-xs font-semibold text-cyan-700 hover:text-cyan-800 hover:underline"
                >
                  ↺ {t("btnRandomTestHwid")}
                </button>
              </div>
              <input
                type="text"
                required
                value={resetHwidForm.hwid}
                onChange={(e) => setResetHwidForm({ ...resetHwidForm, hwid: e.target.value })}
                placeholder="JACS-WIN-..."
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 rounded-xl border border-slate-200 focus:outline-hidden focus:border-cyan-500"
              />
            </div>

            {/* Reason */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t("resetHwidReason")}
              </label>
              <input
                type="text"
                value={resetHwidForm.reason}
                onChange={(e) => setResetHwidForm({ ...resetHwidForm, reason: e.target.value })}
                placeholder={t("resetHwidReasonPlaceholder")}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2.5 bg-slate-50/70">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-all"
            >
              {t("modalCancel")}
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 rounded-xl shadow-md shadow-cyan-600/20 transition-all disabled:opacity-50"
            >
              {actionLoading ? t("modalSubmitting") : t("btnConfirmResetHwid")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
