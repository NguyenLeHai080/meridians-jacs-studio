import React, { useState, useEffect } from "react";
import { Plus, Pencil, X, Sparkles, Loader2 } from "lucide-react";
import type { Provider } from "../../../core/types";
import {
  providerService,
  type CreateProviderPayload,
  type UpdateProviderPayload,
} from "../services/providerService";
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
    model: "",
    api_key: "",
    supported_models: "",
    is_primary: false,
    enabled: true,
  });

  const [loadingModels, setLoadingModels] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (!isCreating && provider) {
        const supModels = provider.supported_models || (provider.model ? [provider.model] : []);
        setFormData({
          name: provider.name,
          code: provider.code || provider.name.toLowerCase().replace(/\s+/g, "_"),
          provider_type: provider.provider_type || "openai",
          base_url: provider.base_url,
          model: provider.model || supModels[0] || "",
          api_key: "",
          supported_models: supModels.join(", "),
          is_primary: !!provider.is_primary,
          enabled: !!provider.enabled,
        });
      } else {
        setFormData({
          name: "",
          code: "",
          provider_type: "openai",
          base_url: "https://api.xompet.io.vn/v1",
          model: "",
          api_key: "",
          supported_models: "",
          is_primary: false,
          enabled: true,
        });
      }
    }
  }, [isOpen, isCreating, provider]);

  if (!isOpen) return null;

  const handleFetchModels = async () => {
    if (!formData.base_url.trim()) {
      showToast("Vui lòng nhập Cổng Base URL trước", "error");
      return;
    }
    if (!formData.api_key.trim() && !provider?.id) {
      showToast("Vui lòng nhập API Key để quét danh sách models", "error");
      return;
    }

    setLoadingModels(true);
    try {
      const models = await providerService.fetchModels({
        base_url: formData.base_url.trim(),
        api_key: formData.api_key.trim() || undefined,
        provider_id: provider?.id,
        provider_type: formData.provider_type,
      });

      if (models && models.length > 0) {
        setFormData((prev) => ({
          ...prev,
          supported_models: models.join(", "),
          model: models[0] || prev.model || "",
        }));
        showToast(`Đã tải thành công ${models.length} models từ API Key!`, "success");
      } else {
        showToast("Không tìm thấy model nào từ API Key này.", "error");
      }
    } catch (err: any) {
      showToast(err?.message || "Lỗi khi lấy danh sách models từ API Key", "error");
    } finally {
      setLoadingModels(false);
    }
  };

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

    const activeModel = supModels[0] || formData.model || "default";

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
        model: activeModel,
        api_key: formData.api_key.trim(),
        capabilities: ["vision", "image_generation"],
        supported_models: supModels,
        cost_per_image: 0,
        is_primary: formData.is_primary,
        enabled: formData.enabled,
      });
    } else {
      const payload: UpdateProviderPayload = {
        name: formData.name.trim(),
        code: formData.code.trim() || undefined,
        provider_type: formData.provider_type,
        base_url: formData.base_url.trim(),
        model: activeModel,
        cost_per_image: 0,
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

  const modelCount = formData.supported_models
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean).length;

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

          {/* Danh Sách Models Hỗ Trợ with Direct Load Button */}
          <div>
            <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
              <label className="font-bold text-slate-700 block">
                Danh Sách Models Hỗ Trợ {modelCount > 0 && <span className="text-orange-600 font-semibold">({modelCount} models)</span>}
              </label>
              <button
                type="button"
                onClick={handleFetchModels}
                disabled={loadingModels || !formData.base_url.trim() || (!formData.api_key.trim() && !provider?.id)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
                title="Quét tất cả model khả dụng từ API Key"
              >
                {loadingModels ? (
                  <>
                    <Loader2 size={12} className="animate-spin text-orange-600" />
                    <span>Đang tải models...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={12} className="text-orange-500" />
                    <span>Tải tất cả Models từ Key</span>
                  </>
                )}
              </button>
            </div>
            <textarea
              rows={3}
              value={formData.supported_models}
              onChange={(e) => setFormData({ ...formData, supported_models: e.target.value })}
              placeholder="Nhấn 'Tải tất cả Models từ Key' hoặc nhập phân cách bằng dấu phẩy: gpt-image-2.5-flare, gpt-image-2, gemini-3.1-flash-image-preview..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500 font-mono text-[11px] leading-relaxed resize-y"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              💡 Bấm nút "Tải tất cả Models từ Key" để hệ thống tự động kết nối và liệt kê toàn bộ model có quyền sử dụng.
            </span>
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
                className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500"
              />
              <span className="font-bold text-slate-800">Kích hoạt</span>
            </label>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-orange-500 text-white font-bold hover:bg-orange-600 transition-colors shadow-xs disabled:opacity-50"
            >
              {isSaving ? "Đang lưu..." : !isCreating ? "Cập Nhật" : "Thêm Mới"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
