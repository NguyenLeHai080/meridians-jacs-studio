import React from "react";
import { AlertTriangle, Trash2, X, Bot } from "lucide-react";
import type { ModelPricing } from "../services/modelPricingService";
import { useI18n } from "../../../core/i18n";

interface ModelPricingDeleteModalProps {
  isOpen: boolean;
  item: ModelPricing | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export const ModelPricingDeleteModal: React.FC<ModelPricingDeleteModalProps> = ({
  isOpen,
  item,
  onClose,
  onConfirm,
}) => {
  const { t } = useI18n();

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-md transition-all duration-300">
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-900/10 transition-all transform animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative border-b border-rose-100 bg-gradient-to-r from-rose-50/80 via-white to-amber-50/30 px-6 py-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-600 ring-1 ring-rose-500/20 shadow-xs">
                <AlertTriangle className="h-6 w-6 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  {t("deleteModelTitle", "Xóa Model Khỏi Bảng Giá?")}
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {t("deleteCannotUndo", "Hành động này không thể hoàn tác.")}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            {t(
              "deleteModelWarning",
              "Bạn có chắc muốn xóa model này khỏi danh sách định giá? Tool Desktop sẽ không thể gọi model này."
            )}
          </p>

          {/* Model Preview Card */}
          <div className="rounded-2xl border border-slate-200/90 bg-slate-50/80 p-4 text-xs space-y-2.5">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-orange-500 shrink-0" />
              <span className="font-bold text-slate-900 font-mono truncate">{item.model}</span>
              <span className="text-[11px] text-slate-400 font-sans">({item.provider_name})</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-2 border-t border-slate-200/60">
              <span>Giá bán Vào: <strong className="text-slate-800">{item.input_price.toLocaleString()}đ</strong></span>
              <span>Ra: <strong className="text-orange-600 font-bold">{item.output_price.toLocaleString()}đ</strong></span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/90 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-all cursor-pointer"
          >
            {t("btnCancel", "Hủy bỏ")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-rose-600/20 hover:from-rose-700 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-rose-500/30 transition-all cursor-pointer active:scale-95"
          >
            <Trash2 className="h-4 w-4" />
            <span>{t("btnConfirmDelete", "Xác nhận xóa")}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
