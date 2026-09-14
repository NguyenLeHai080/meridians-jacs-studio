import React from "react";
import { UserPlus, X, Sparkles } from "lucide-react";
import { useI18n } from "../../../core/i18n";
import { DateTimePickerField } from "./DateTimePickerField";

export interface CreateUserModalProps {
  show: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  createForm: {
    customer_name: string;
    customer_contact: string;
    hwid: string;
    plan_preset: string;
    expires_at: string;
    amount: number;
    payment_method: string;
    premium_ai: boolean;
    max_jobs_per_day: number;
    notes: string;
  };
  setCreateForm: React.Dispatch<React.SetStateAction<any>>;
  handlePlanPresetChange: (presetKey: string) => void;
  generatePlaceholderHwid: () => string;
  actionLoading: boolean;
}

export function CreateUserModal({
  show,
  onClose,
  onSubmit,
  createForm,
  setCreateForm,
  handlePlanPresetChange,
  generatePlaceholderHwid,
  actionLoading,
}: CreateUserModalProps) {
  const { t } = useI18n();

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200/90 w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 text-orange-600 flex items-center justify-center">
              <UserPlus size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 m-0">
                {t("createModalTitle")}
              </h3>
              <span className="text-xs text-slate-500">{t("createModalSubtitle")}</span>
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
            
            {/* Name & Contact */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t("formCustomerName")} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nguyễn Văn A"
                  value={createForm.customer_name}
                  onChange={(e) => setCreateForm({ ...createForm, customer_name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t("formCustomerContact")} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="user@example.com / 0912..."
                  value={createForm.customer_contact}
                  onChange={(e) => setCreateForm({ ...createForm, customer_contact: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15"
                />
              </div>
            </div>

            {/* HWID (Device ID) */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-slate-700 m-0">
                  {t("formHwid")}
                </label>
                <button
                  type="button"
                  onClick={() => setCreateForm({ ...createForm, hwid: generatePlaceholderHwid() })}
                  className="text-cyan-600 hover:text-cyan-700 text-xs font-semibold hover:underline"
                >
                  ↺ {t("btnRandomTestHwid")}
                </button>
              </div>
              <input
                type="text"
                value={createForm.hwid}
                onChange={(e) => setCreateForm({ ...createForm, hwid: e.target.value })}
                placeholder="JACS-WIN-..."
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15"
              />
            </div>

            {/* Plan Presets */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {t("formPlanPreset")}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: "30_days", label: t("planMonth1") },
                  { key: "90_days", label: t("planMonth3") },
                  { key: "180_days", label: t("planMonth6") },
                  { key: "365_days", label: t("planYear1") },
                  { key: "lifetime", label: t("planLifetime") },
                  { key: "custom", label: t("planCustom") },
                ].map((p) => {
                  const isSel = createForm.plan_preset === p.key;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => handlePlanPresetChange(p.key)}
                      className={`p-2 rounded-xl text-center text-xs font-bold transition-all ${
                        isSel
                          ? "bg-orange-50 border-1.5 border-orange-500 text-orange-600 shadow-2xs"
                          : "bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Expiration Date Picker (Enhanced) */}
            <DateTimePickerField
              label={t("formExpiresAt")}
              value={createForm.expires_at}
              onChange={(newVal) => setCreateForm({ ...createForm, expires_at: newVal })}
              accentColor="orange"
              allowLifetime={true}
              quickPresets={[
                { label: t("planMonth1"), days: 30 },
                { label: t("planMonth3"), days: 90 },
                { label: t("planMonth6"), days: 180 },
                { label: t("planYear1"), days: 365 },
              ]}
              helperText={t("datePickerHelper")}
            />

            {/* Billing & Payment */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t("formAmount")}
                </label>
                <input
                  type="number"
                  value={createForm.amount}
                  onChange={(e) => setCreateForm({ ...createForm, amount: Number(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-xs font-bold text-emerald-600 rounded-xl border border-slate-200 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t("formPaymentMethod")}
                </label>
                <select
                  value={createForm.payment_method}
                  onChange={(e) => setCreateForm({ ...createForm, payment_method: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-medium bg-white rounded-xl border border-slate-200 focus:outline-hidden"
                >
                  <option value="bank_transfer">{t("methodBank")}</option>
                  <option value="cash">{t("methodCash")}</option>
                  <option value="free">{t("methodFree")}</option>
                </select>
              </div>
            </div>

            {/* AI Pro Toggle */}
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                <input
                  type="checkbox"
                  checked={createForm.premium_ai}
                  onChange={(e) => setCreateForm({ ...createForm, premium_ai: e.target.checked })}
                  className="w-4 h-4 accent-orange-600 rounded"
                />
                <Sparkles size={14} className="text-amber-500" />
                <span>{t("formAiPro")}</span>
              </label>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-500">Max jobs:</span>
                <input
                  type="number"
                  value={createForm.max_jobs_per_day}
                  onChange={(e) => setCreateForm({ ...createForm, max_jobs_per_day: Number(e.target.value) || 100 })}
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
                placeholder={t("notesPlaceholder")}
                value={createForm.notes}
                onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
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
              {actionLoading ? t("modalSubmitting") : t("btnCreateSubmit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
