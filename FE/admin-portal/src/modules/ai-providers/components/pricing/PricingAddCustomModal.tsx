import React, { useState } from "react";
import { X, PlusCircle, Loader2 } from "lucide-react";
import type { MyModelItem } from "../../pages/AiModelsPricingPage";

interface PricingAddCustomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (item: Partial<MyModelItem>) => Promise<boolean>;
}

export const PricingAddCustomModal: React.FC<PricingAddCustomModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState("");
  const [group, setGroup] = useState("Chat / LLM");
  const [upstreamPrice, setUpstreamPrice] = useState("$0.002 / 1k");
  const [upstreamCostVnd, setUpstreamCostVnd] = useState(50);
  const [clientCredits, setClientCredits] = useState(1.0);
  const [clientVnd, setClientVnd] = useState(100);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    const success = await onSubmit({
      name: name.trim(),
      group,
      upstream_price: upstreamPrice,
      upstream_cost_vnd: upstreamCostVnd,
      client_credits: clientCredits,
      client_vnd: clientVnd,
      enabled: true,
      is_custom: true,
      notes,
    });
    setSubmitting(false);

    if (success) {
      setName("");
      setNotes("");
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <PlusCircle className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Thêm Model AI Tùy Chỉnh</h3>
              <p className="text-[10.5px] text-slate-500">Đăng ký thêm model riêng hoặc fine-tuned vào Gateway</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-600 mb-1 font-semibold">Tên định danh Model (Model ID) *</label>
            <input
              type="text"
              required
              placeholder="VD: gpt-4o-custom-studio hoặc claude-3-7-sonnet"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono text-[11px] focus:outline-none focus:bg-white focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 mb-1 font-semibold">Phân nhóm (Group)</label>
              <select
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500 font-medium"
              >
                <option value="Chat / LLM">Chat / LLM</option>
                <option value="Image / Vision">Image / Vision</option>
                <option value="Video / Motion">Video / Motion</option>
                <option value="Audio / Voice">Audio / Voice</option>
                <option value="Custom">Custom / Specialized</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 mb-1 font-semibold">Credits Bán / 1k</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={clientCredits}
                onChange={(e) => setClientCredits(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono focus:outline-none focus:bg-white focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 mb-1 font-semibold">Giá Gốc Nhà Cung Cấp</label>
              <input
                type="text"
                value={upstreamPrice}
                onChange={(e) => setUpstreamPrice(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono text-[11px] focus:outline-none focus:bg-white focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-600 mb-1 font-semibold">Giá Bán Cho Client (VNĐ)</label>
              <input
                type="number"
                step="100"
                min="0"
                value={clientVnd}
                onChange={(e) => setClientVnd(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono focus:outline-none focus:bg-white focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-600 mb-1 font-semibold">Ghi chú</label>
            <input
              type="text"
              placeholder="VD: Model chuyên dịch kịch bản đa phương tiện"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Thêm Model</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
