import React from "react";
import { Trash2 } from "lucide-react";
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
  if (!isOpen || !provider) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm border border-slate-200 p-5 text-center animate-in fade-in zoom-in-95 duration-150">
        <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-3">
          <Trash2 size={22} />
        </div>
        <h3 className="text-sm font-bold text-slate-900">Xác nhận xóa nhà cung cấp?</h3>
        <p className="text-xs text-slate-500 mt-1 mb-5 leading-relaxed">
          Bạn có chắc chắn muốn xóa <span className="font-bold text-slate-800">{provider.name}</span>? Thao tác này không thể hoàn tác.
        </p>
        <div className="flex items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-500/20 active:scale-95 disabled:opacity-50"
          >
            {isLoading ? "Đang xóa..." : "Xóa ngay"}
          </button>
        </div>
      </div>
    </div>
  );
};
