import React from "react";
import { X, Sliders, Loader2 } from "lucide-react";
import type { MyModelItem } from "../../pages/AiModelsPricingPage";

interface PricingEditModalProps {
  model: MyModelItem | null;
  credits: number;
  onCreditsChange: (v: number) => void;
  vnd: number;
  onVndChange: (v: number) => void;
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  notes: string;
  onNotesChange: (v: string) => void;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
}

export const PricingEditModal: React.FC<PricingEditModalProps> = ({
  model,
  credits,
  onCreditsChange,
  vnd,
  onVndChange,
  enabled,
  onEnabledChange,
  notes,
  onNotesChange,
  saving,
  onClose,
  onSave,
}) => {
  if (!model) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Sliders className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Định Giá Model AI</h3>
              <p className="text-[10.5px] font-mono text-blue-600 font-semibold">{model.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <span className="text-[10px] text-slate-500 block font-medium">Giá gốc nhà cung cấp</span>
              <span className="font-mono text-slate-800 text-xs font-semibold">{model.upstream_price}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block font-medium">Quy đổi gốc VNĐ</span>
              <span className="font-mono text-slate-800 text-xs font-semibold">
                {model.upstream_cost_vnd?.toLocaleString("vi-VN")} ₫
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 mb-1 font-semibold">Credits Trừ / 1k tokens</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={credits}
                onChange={(e) => onCreditsChange(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono focus:outline-none focus:bg-white focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-600 mb-1 font-semibold">Giá Quy Đổi VNĐ (Bán)</label>
              <input
                type="number"
                step="100"
                min="0"
                value={vnd}
                onChange={(e) => onVndChange(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono focus:outline-none focus:bg-white focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-600 mb-1 font-semibold">Ghi chú nội bộ</label>
            <input
              type="text"
              placeholder="VD: Model ưu tiên render chất lượng cao"
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="model_enabled"
              checked={enabled}
              onChange={(e) => onEnabledChange(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
            />
            <label htmlFor="model_enabled" className="text-slate-700 font-medium cursor-pointer">
              Mở quyền cho Client Desktop sử dụng model này
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all disabled:opacity-50"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Lưu Cấu Hình</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
