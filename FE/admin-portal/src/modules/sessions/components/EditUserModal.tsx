import React from "react";
import { Edit2, X, Copy, Check, RefreshCw, Sparkles } from "lucide-react";
import type { License, LicenseStatus } from "../../../core/types";
import { useI18n } from "../../../core/i18n";
import { DateTimePickerField } from "./DateTimePickerField";

export interface EditUserModalProps {
  show: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  selectedLicense: License | null;
  editForm: {
    customer_name: string;
    customer_contact: string;
    expires_at: string;
    status: LicenseStatus;
    max_jobs_per_day: number;
    premium_ai: boolean;
    notes: string;
    license_key?: string;
  };
  setEditForm: React.Dispatch<React.SetStateAction<any>>;
  handleCopy: (text: string, keyId: string) => void;
  copiedKey: string | null;
  handleRegenerateKey: (lic: License) => void;
  actionLoading: boolean;
}

export function EditUserModal({
  show,
  onClose,
  onSubmit,
  selectedLicense,
  editForm,
  setEditForm,
  handleCopy,
  copiedKey,
  handleRegenerateKey,
  actionLoading,
}: EditUserModalProps) {
  const { t } = useI18n();

  if (!show || !selectedLicense) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200/90 w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 text-orange-600 flex items-center justify-center">
              <Edit2 size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 m-0">
                {t("editModalTitle")}
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
            
            {/* Customer Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t("formCustomerName")}
                </label>
                <input
                  type="text"
                  required
                  value={editForm.customer_name}
                  onChange={(e) => setEditForm({ ...editForm, customer_name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t("formCustomerContact")}
                </label>
                <input
                  type="text"
                  required
                  value={editForm.customer_contact}
                  onChange={(e) => setEditForm({ ...editForm, customer_contact: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500"
                />
              </div>
            </div>

            {/* License Key & Regenerate */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-700">{t("thKey")}</span>
                <button
                  type="button"
                  onClick={() => handleRegenerateKey(selectedLicense)}
                  className="text-xs font-semibold text-cyan-700 hover:text-cyan-800 flex items-center gap-1 hover:underline"
                >
                  <RefreshCw size={12} />
                  {t("btnRegenerateKey")}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-slate-800 bg-white px-3 py-1.5 rounded-lg border border-slate-200 flex-1">
                  {selectedLicense.key || selectedLicense.key_hint}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(selectedLicense.key || selectedLicense.key_hint, `edit-key-${selectedLicense.id}`)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 flex items-center gap-1"
                >
                  {copiedKey === `edit-key-${selectedLicense.id}` ? (
                    <>
                      <Check size={13} className="text-emerald-600" />
                      <span>{t("copied")}</span>
                    </>
                  ) : (
                    <>
                      <Copy size={13} />
                      <span>{t("copyKey")}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Status Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t("thSessionStatus")}
              </label>
              <select
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value as LicenseStatus })}
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white"
              >
                <option value="active">{t("statusActive")}</option>
                <option value="blocked">{t("statusBlocked")}</option>
                <option value="expired">{t("statusExpired")}</option>
              </select>
            </div>

            {/* Expiration Date Picker (Enhanced) */}
            <DateTimePickerField
              label={t("formExpiresAt")}
              value={editForm.expires_at}
              onChange={(newVal) => setEditForm({ ...editForm, expires_at: newVal })}
              accentColor="cyan"
              allowLifetime={true}
              quickPresets={[
                { label: t("quickAdd1Month"), days: 30 },
                { label: t("quickAdd3Months"), days: 90 },
                { label: t("quickAdd1Year"), days: 365 },
              ]}
              helperText={t("editDateHelper")}
            />

            {/* AI Pro Toggle */}
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                <input
                  type="checkbox"
                  checked={editForm.premium_ai}
                  onChange={(e) => setEditForm({ ...editForm, premium_ai: e.target.checked })}
                  className="w-4 h-4 accent-orange-600 rounded"
                />
                <Sparkles size={14} className="text-amber-500" />
                <span>{t("formAiPro")}</span>
              </label>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-500">Max jobs:</span>
                <input
                  type="number"
                  value={editForm.max_jobs_per_day}
                  onChange={(e) => setEditForm({ ...editForm, max_jobs_per_day: Number(e.target.value) || 100 })}
                  className="w-16 px-2 py-1 text-xs text-center rounded-lg border border-slate-300"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t("formNotes")}
              </label>
              <input
                type="text"
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
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
              className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 rounded-xl shadow-md shadow-orange-500/20 transition-all disabled:opacity-50"
            >
              {actionLoading ? t("modalSubmitting") : t("btnSaveUser")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
