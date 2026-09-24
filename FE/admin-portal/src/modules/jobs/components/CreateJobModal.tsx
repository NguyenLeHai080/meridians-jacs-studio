import React, { useState } from "react";
import { X, PlayCircle, Loader2 } from "lucide-react";
import type { CreateJobInput } from "../types";

interface CreateJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreateJobInput) => Promise<boolean>;
}

export const CreateJobModal: React.FC<CreateJobModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [name, setName] = useState("");
  const [sourceName, setSourceName] = useState("admin_multimodal_pipeline");
  const [kind, setKind] = useState<"render" | "analysis" | "tts">("render");
  const [mode, setMode] = useState<"hybrid" | "cloud" | "local">("hybrid");
  const [customerName, setCustomerName] = useState("");
  const [licenseId, setLicenseId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    const success = await onSubmit({
      name: name.trim(),
      source_name: sourceName.trim(),
      kind,
      execution_mode: mode,
      customer_name: customerName.trim() || undefined,
      license_id: licenseId.trim() || undefined,
    });
    setSubmitting(false);

    if (success) {
      setName("");
      setCustomerName("");
      setLicenseId("");
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border border-slate-200 w-full max-w-lg rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <PlayCircle className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Khởi Tạo Tác Vụ Mới</h3>
              <p className="text-[10.5px] text-slate-500">Tạo Job render/xử lý AI và phân bổ cho khách hàng</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-600 mb-1 font-semibold">Tên tác vụ / Job Name *</label>
            <input
              type="text"
              required
              placeholder="VD: Render Video 4K Multimodal Batch #12"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 mb-1 font-semibold">Loại tác vụ (Kind)</label>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500 font-medium"
              >
                <option value="render">Render / Pipeline</option>
                <option value="analysis">Phân Tích AI (Analysis)</option>
                <option value="tts">Voice / TTS synthesis</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 mb-1 font-semibold">Chế độ phân bổ (Mode)</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500 font-medium"
              >
                <option value="hybrid">Hybrid (Tối ưu tải)</option>
                <option value="cloud">Cloud Only</option>
                <option value="local">Local Only</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 mb-1 font-semibold">Tên khách hàng</label>
              <input
                type="text"
                placeholder="VD: Cty Cổ Phần Media Plus"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-600 mb-1 font-semibold">License / Key ID</label>
              <input
                type="text"
                placeholder="VD: PRO-STUDIO-8899"
                value={licenseId}
                onChange={(e) => setLicenseId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-600 mb-1 font-semibold">Nguồn pipeline / Source</label>
            <input
              type="text"
              placeholder="admin_multimodal_pipeline"
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono text-[11px] focus:outline-none focus:bg-white focus:border-blue-500"
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
              <span>Khởi tạo tác vụ</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
