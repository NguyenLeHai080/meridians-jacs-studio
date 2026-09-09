import React from "react";
import { AlertTriangle, Trash2, X, Bot, ShieldAlert } from "lucide-react";
import { useI18n } from "../../../core/i18n";
import type { Provider } from "../../../core/types";

interface ProviderDeleteModalProps {
  isOpen: boolean;
  provider: Provider | null;
  isLoading: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export const ProviderDeleteModal: React.FC<ProviderDeleteModalProps> = ({
  isOpen,
  provider,
  isLoading,
  onClose,
  onConfirm,
}) => {
  const { t } = useI18n();

  if (!isOpen || !provider) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm transition-all duration-300">
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-900/10 transition-all transform animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Danger Accent */}
        <div className="relative border-b border-rose-100 bg-gradient-to-r from-rose-50/70 via-white to-amber-50/30 px-6 py-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 ring-1 ring-rose-500/20">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  {t("deleteProviderTitle", "Xác Nhận Xóa AI Provider?")}
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Hành động này không thể hoàn tác.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            {t(
              "deleteProviderWarning",
              "Hành động này sẽ xóa cổng kết nối khỏi cơ sở dữ liệu. Các tác vụ sử dụng provider này sẽ chuyển sang cấu hình dự phòng."
            )}
          </p>

          {/* Provider Card preview */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs space-y-1.5">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-amber-500 shrink-0" />
              <span className="font-bold text-slate-800 truncate">{provider.name}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span>Mô hình: <strong className="text-slate-700">{provider.model}</strong></span>
              <span className="capitalize">{provider.provider_type}</span>
            </div>
            {provider.base_url && (
              <div className="text-[10px] text-slate-400 font-mono truncate">
                {provider.base_url}
              </div>
            )}
          </div>

          <div className="rounded-xl bg-amber-50 p-3 text-[11px] text-amber-800 border border-amber-200/80 flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Lưu ý: Nếu đây là cổng AI chính, hệ thống sẽ tự động điều phối tác vụ sang các cổng dự phòng có sẵn trong danh sách.
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/80 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-all"
          >
            {t("btnCancel", "Hủy bỏ")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-rose-600/20 hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500/30 disabled:opacity-50 transition-all cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {isLoading ? "Đang xóa..." : t("btnConfirmDelete", "Xác nhận xóa")}
          </button>
        </div>
      </div>
    </div>
  );
};
