import React from "react";
import {
  X,
  Package,
  CheckCircle2,
  Power,
  Sparkles,
  Zap,
} from "lucide-react";
import { useI18n } from "../../../core/i18n";
import type { PackageFormState } from "../hooks/usePlansManagement";

interface CreditPackageModalProps {
  isOpen: boolean;
  isEditing: boolean;
  form: PackageFormState;
  setForm: React.Dispatch<React.SetStateAction<PackageFormState>>;
  onPriceChange: (price: number) => void;
  onBonusChange: (bonus: number) => void;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
}

export const CreditPackageModal: React.FC<CreditPackageModalProps> = ({
  isOpen,
  isEditing,
  form,
  setForm,
  onPriceChange,
  onBonusChange,
  isSaving,
  onClose,
  onSubmit,
}) => {
  const { t } = useI18n();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm transition-all duration-300">
      <div
        className="relative w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-900/10 transition-all transform animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="relative border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-orange-50/40 px-6 py-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-600 ring-1 ring-orange-500/20">
                <Package className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  {isEditing
                    ? t("editPackageTitle", "Chỉnh Sửa Gói Credit")
                    : t("createPackageTitle", "Tạo Gói Credit Mới")}
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {t(
                    "modalPackageDesc",
                    "Cấu hình tên gói, giá tiền VNĐ, credit gốc và tỷ lệ tặng thưởng khuyến mãi."
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <form onSubmit={onSubmit}>
          <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-4">
            {/* Package Name */}
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">
                {t("lblPackageName", "Tên gói cước")} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t("placeholderPackageName", "Ví dụ: Gói Tiêu Chuẩn Pro 500K")}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-3 focus:ring-orange-500/10"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Price */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                  {t("lblPackagePrice", "Giá thanh toán (VNĐ)")} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    min="10000"
                    step="10000"
                    value={form.price}
                    onChange={(e) => onPriceChange(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-white pl-3.5 pr-12 py-2.5 font-mono text-sm font-bold text-slate-800 focus:border-orange-500 focus:outline-none focus:ring-3 focus:ring-orange-500/10"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    VNĐ
                  </span>
                </div>
              </div>

              {/* Bonus Percent */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                  {t("lblBonusPercent", "Tỷ lệ tặng thêm (%)")}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={form.bonus_percent}
                    onChange={(e) => onBonusChange(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-white pl-3.5 pr-10 py-2.5 font-mono text-sm font-bold text-slate-800 focus:border-orange-500 focus:outline-none focus:ring-3 focus:ring-orange-500/10"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    %
                  </span>
                </div>
              </div>
            </div>

            {/* Auto Calculated Credits Preview Box */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3.5 text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-600">
                <span>{t("lblBaseCredits", "Credit gốc (tự động tính):")}</span>
                <span className="font-mono font-bold text-slate-800">
                  {form.base_credits.toLocaleString()} Credits
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>{t("lblBonusPercent", "Tặng thêm khuyến mãi:")}</span>
                <span className="font-mono font-bold text-amber-600">
                  +{form.bonus_percent}% bonus
                </span>
              </div>
              <div className="pt-2 border-t border-amber-200/80 flex items-center justify-between text-orange-900">
                <span className="font-bold">{t("lblTotalCredits", "Tổng Credit thực nhận:")}</span>
                <span className="font-mono font-black text-sm text-orange-600">
                  {form.total_credits.toLocaleString()} Credits
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Highlight Badge */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                  {t("lblPackageBadge", "Huy hiệu nổi bật (Badge)")}
                </label>
                <input
                  type="text"
                  value={form.badge}
                  onChange={(e) => setForm({ ...form, badge: e.target.value })}
                  placeholder={t("placeholderPackageBadge", "Ví dụ: PHỔ BIẾN NHẤT")}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-3 focus:ring-orange-500/10"
                />
              </div>

              {/* Sort Order */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                  {t("lblSortOrder", "Thứ tự sắp xếp")}
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 font-mono text-xs font-bold text-slate-800 focus:border-orange-500 focus:outline-none focus:ring-3 focus:ring-orange-500/10"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">
                {t("lblPackageDesc", "Mô tả quyền lợi gói")}
              </label>
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={t(
                  "placeholderPackageDesc",
                  "Ví dụ: Tặng kèm 15% credit, hỗ trợ tạo kịch bản 2M tokens"
                )}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-3 focus:ring-orange-500/10"
              />
            </div>

            {/* Sale Status Segmented Buttons */}
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">
                {t("lblPackageStatus", "Trạng thái mở bán")}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, is_active: true })}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    form.is_active
                      ? "bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <CheckCircle2
                    className={`h-4 w-4 ${form.is_active ? "text-emerald-600" : "text-slate-400"}`}
                  />
                  <span>{t("statusActive", "Đang mở bán")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, is_active: false })}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    !form.is_active
                      ? "bg-slate-100 text-slate-700 border-slate-300 ring-2 ring-slate-400/20 shadow-xs"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <Power
                    className={`h-4 w-4 ${!form.is_active ? "text-slate-600" : "text-slate-400"}`}
                  />
                  <span>{t("statusDisabled", "Tạm ẩn")}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/80 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-all cursor-pointer"
            >
              {t("btnCancel", "Hủy bỏ")}
            </button>
            <button
              type="submit"
              disabled={isSaving || !form.name.trim() || form.price <= 0}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/20 hover:from-orange-600 hover:to-amber-700 focus:outline-none focus:ring-2 focus:ring-orange-500/30 disabled:opacity-50 transition-all cursor-pointer"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{isSaving ? t("btnSavingConfig", "Đang lưu...") : t("btnSave", "Lưu cấu hình")}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
