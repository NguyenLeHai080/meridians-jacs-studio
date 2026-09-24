import React, { useState, useEffect } from "react";
import { Plus, Pencil, X } from "lucide-react";
import type { Provider } from "../../../core/types";
import type { CreateProviderPayload, UpdateProviderPayload } from "../services/providerService";
import { showToast } from "../../../core/swal";

interface ProviderEditorModalProps {
  isOpen: boolean;
  isCreating: boolean;
  provider: Provider | null;
  isSaving: boolean;
  onClose: () => void;
  onSave: (payload: CreateProviderPayload | UpdateProviderPayload) => Promise<void>;
}

export const ProviderEditorModal: React.FC<ProviderEditorModalProps> = ({
  isOpen,
  isCreating,
  provider,
  isSaving,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    provider_type: "openai",
    base_url: "https://api.openai.com/v1",
    model: "gpt-image-2.5-flare",
    api_key: "",
    supported_models: "gpt-image-2.5-flare, gpt-image-2.5-sunburst, gpt-image-2",
    cost_per_image: 75,
    is_primary: false,
    enabled: true,
  });

  useEffect(() => {
    if (isOpen) {
      if (!isCreating && provider) {
        setFormData({
          name: provider.name,
          code: provider.code || provider.name.toLowerCase().replace(/\s+/g, "_"),
          provider_type: provider.provider_type || "openai",
          base_url: provider.base_url,
          model: provider.model,
          api_key: "",
          supported_models: (provider.supported_models || [provider.model]).join(", "),
          cost_per_image: provider.cost_per_image || 75,
          is_primary: !!provider.is_primary,
          enabled: !!provider.enabled,
        });
      } else {
        setFormData({
          name: "",
          code: "",
          provider_type: "openai",
          base_url: "https://api.xompet.io.vn/v1",
          model: "gpt-image-2.5-flare",
          api_key: "",
          supported_models: "gpt-image-2.5-flare, gpt-image-2.5-sunburst, gpt-image-2",
          cost_per_image: 75,
          is_primary: false,
          enabled: true,
        });
      }
    }
  }, [isOpen, isCreating, provider]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast("Vui lòng nhập tên nhà cung cấp", "error");
      return;
    }
    if (!formData.base_url.trim()) {
      showToast("Vui lòng nhập cổng Base URL", "error");
      return;
    }

    const supModels = formData.supported_models
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (isCreating) {
      if (!formData.api_key.trim()) {
        showToast("Vui lòng nhập API Key", "error");
        return;
      }
      await onSave({
        name: formData.name.trim(),
        code: formData.code.trim() || undefined,
        provider_type: formData.provider_type,
        base_url: formData.base_url.trim(),
        model: formData.model.trim(),
        api_key: formData.api_key.trim(),
        capabilities: ["vision", "image_generation"],
        supported_models: supModels,
        cost_per_image: Number(formData.cost_per_image) || 75,
        is_primary: formData.is_primary,
        enabled: formData.enabled,
      });
    } else {
      const payload: UpdateProviderPayload = {
        name: formData.name.trim(),
        code: formData.code.trim() || undefined,
        provider_type: formData.provider_type,
        base_url: formData.base_url.trim(),
        model: formData.model.trim(),
        cost_per_image: Number(formData.cost_per_image) || 75,
        supported_models: supModels,
        is_primary: formData.is_primary,
        enabled: formData.enabled,
      };
      if (formData.api_key.trim()) {
        payload.api_key = formData.api_key.trim();
      }
      await onSave(payload);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
              {!isCreating ? <Pencil size={15} /> : <Plus size={15} />}
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              {!isCreating ? "Chỉnh Sửa Nhà Cung Cấp" : "Thêm Nhà Cung Cấp Mới"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-md"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Tên Nhà Cung Cấp <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Vd: Nhà Cung Cấp 01"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Mã Định Danh (Code)</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="Vd: nha_cung_cap_01"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500 font-mono text-[11px]"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Cổng Base URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              required
              value={formData.base_url}
              onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
              placeholder="https://api.xompet.io.vn/v1"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500 font-mono text-[11px]"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              API Key (Bearer) {!isCreating ? "(để trống nếu không đổi)" : <span className="text-red-500">*</span>}
            </label>
            <input
              type="password"
              value={formData.api_key}
              onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
              placeholder={!isCreating ? "••••••••••••" : "sk-..."}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500 font-mono text-[11px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Model Mặc Định</label>
              <input
                type="text"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="gpt-image-2.5-flare"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500 font-mono text-[11px]"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Giá Vốn / Ảnh (VNĐ)</label>
              <input
                type="number"
                value={formData.cost_per_image}
                onChange={(e) =>
                  setFormData({ ...formData, cost_per_image: Number(e.target.value) || 0 })
                }
                placeholder="75"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500 font-bold"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Danh Sách Models Hỗ Trợ (phân cách bằng dấu phẩy)
            </label>
            <input
              type="text"
              value={formData.supported_models}
              onChange={(e) => setFormData({ ...formData, supported_models: e.target.value })}
              placeholder="gpt-image-2.5-flare, gpt-image-2, gemini-1-pro-image-preview"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500 font-mono text-[11px]"
            />
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_primary}
                onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })}
                className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500"
              />
              <span className="font-bold text-slate-800">Đặt làm Cổng Chính (Primary)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.enabled}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500"
              />
              <span className="font-bold text-slate-800">Hoạt Động (Online)</span>
            </label>
          </div>

          {/* Actions */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-md shadow-orange-500/20 active:scale-95 disabled:opacity-50"
            >
              {isSaving ? "Đang lưu..." : !isCreating ? "Cập Nhật" : "Thêm Mới"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
