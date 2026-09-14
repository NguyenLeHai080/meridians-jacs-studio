import React from "react";
import { CalendarPlus, X } from "lucide-react";
import type { License } from "../../../core/types";
import { useI18n } from "../../../core/i18n";
import { DateTimePickerField } from "./DateTimePickerField";

export interface RenewSubscriptionModalProps {
  show: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  selectedLicense: License | null;
  renewForm: {
    preset_days: number;
    new_expires_at: string;
    amount: number;
    payment_method: string;
    reason: string;
  };
  setRenewForm: React.Dispatch<React.SetStateAction<any>>;
  handleRenewQuickPreset: (days: number) => void;
  actionLoading: boolean;
}

export function RenewSubscriptionModal({
  show,
  onClose,
  onSubmit,
  selectedLicense,
  renewForm,
  setRenewForm,
  handleRenewQuickPreset,
  actionLoading,
}: RenewSubscriptionModalProps) {
  const { t } = useI18n();

  if (!show || !selectedLicense) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200/90 w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
              <CalendarPlus size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 m-0">
                {t("renewModalTitle")}
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
            
            {/* Target Expiration Date (Enhanced) */}
            <DateTimePickerField
              label={t("formExpiresAt")}
              value={renewForm.new_expires_at}
              onChange={(newVal) => setRenewForm({ ...renewForm, new_expires_at: newVal })}
              accentColor="emerald"
              required={true}
              allowLifetime={false}
              quickPresets={[
                { label: t("quickAdd1Month"), days: 30 },
                { label: t("quickAdd3Months"), days: 90 },
                { label: t("quickAdd6Months"), days: 180 },
                { label: t("quickAdd1Year"), days: 365 },
              ]}
              helperText={t("renewDateHelper")}
            />

            {/* Billing & Payment */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t("formAmount")}
                </label>
                <input
                  type="number"
                  value={renewForm.amount}
                  onChange={(e) => setRenewForm({ ...renewForm, amount: Number(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-xs font-bold text-emerald-600 rounded-xl border border-slate-200 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t("formPaymentMethod")}
                </label>
                <select
                  value={renewForm.payment_method}
                  onChange={(e) => setRenewForm({ ...renewForm, payment_method: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-medium bg-white rounded-xl border border-slate-200"
                >
                  <option value="bank_transfer">{t("methodBank")}</option>
                  <option value="cash">{t("methodCash")}</option>
                  <option value="free">{t("methodFree")}</option>
                </select>
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t("renewReasonLabel")}
              </label>
              <input
                type="text"
                value={renewForm.reason}
                onChange={(e) => setRenewForm({ ...renewForm, reason: e.target.value })}
                placeholder={t("renewReasonPlaceholder")}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
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
              className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 rounded-xl shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50"
            >
              {actionLoading ? t("modalSubmitting") : t("btnRenewSubmit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
