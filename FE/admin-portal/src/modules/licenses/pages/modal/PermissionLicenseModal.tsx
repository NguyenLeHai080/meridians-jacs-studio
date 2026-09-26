import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Sparkles,
  Search,
  Film,
  Eye,
  PenTool,
  Mic,
  Headphones,
  Check,
  Coins,
  Plus,
  RotateCcw,
  Loader2,
} from "lucide-react";
import type { License } from "../../../../core/types";
import { Modal } from "../../../../components/common/Modal";
import {
  useAvailableAiModels,
  type ModelCategoryKey,
  DEFAULT_REVIEW_PHIM_PACKAGE_IDS,
} from "../../hooks/useAvailableAiModels";
import { licenseService } from "../../services/licenseService";

interface PermissionLicenseModalProps {
  license: License | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export const PermissionLicenseModal: React.FC<PermissionLicenseModalProps> = ({
  license,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const {
    allModels,
    filteredModels,
    providersList,
    searchQuery,
    setSearchQuery,
    selectedProvider,
    setSelectedProvider,
    categoryFilter,
    setCategoryFilter,
    reviewPhimModelIds,
  } = useAvailableAiModels();

  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [creditBalance, setCreditBalance] = useState<string>("100");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (license) {
      setCreditBalance(String(license.credit_balance !== undefined ? license.credit_balance : 100));
      if (license.allowed_models && license.allowed_models.length > 0) {
        setSelectedModels(license.allowed_models);
      } else if (allModels.length > 0) {
        // Default to Review Phim package or all
        const defaultPackage = allModels
          .filter((m) => DEFAULT_REVIEW_PHIM_PACKAGE_IDS.includes(m.id) || m.isReviewPhim)
          .map((m) => m.id);
        setSelectedModels(defaultPackage.length > 0 ? defaultPackage : allModels.map((m) => m.id));
      }
    }
  }, [license, allModels]);

  const handleSelectReviewPhimPackage = () => {
    // Collect all models that match recommended Review Phim package
    const matched = allModels
      .filter((m) => DEFAULT_REVIEW_PHIM_PACKAGE_IDS.includes(m.id) || m.isReviewPhim)
      .map((m) => m.id);
    setSelectedModels(matched);
    setCategoryFilter("review_phim");
  };

  const handleToggleModel = (modelId: string) => {
    setSelectedModels((prev) =>
      prev.includes(modelId) ? prev.filter((id) => id !== modelId) : [...prev, modelId]
    );
  };

  const handleAddCredits = (amount: number) => {
    const current = parseFloat(creditBalance) || 0;
    setCreditBalance(String(Math.max(0, current + amount)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!license) return;
    setError("");
    setLoading(true);

    try {
      const parsedCredits = parseFloat(creditBalance) >= 0 ? parseFloat(creditBalance) : 100;
      await licenseService.update(license.id, {
        customer_name: license.customer_name,
        customer_contact: license.customer_contact || "",
        max_jobs_per_day: license.max_jobs_per_day || 200,
        premium_ai: license.premium_ai ?? true,
        notes: license.notes,
        logo_url: license.logo_url,
        expires_at: license.expires_at,
        credit_balance: parsedCredits,
        allowed_models: selectedModels,
      });

      onSuccess(
        `✓ Đã cập nhật phân quyền: Cấp ${selectedModels.length} models & ${parsedCredits} Credits cho ${license.customer_name}!`
      );
      onClose();
    } catch (err: any) {
      setError(err?.message || "Không thể cập nhật phân quyền cho License");
    } finally {
      setLoading(false);
    }
  };

  const filterTabs: { key: ModelCategoryKey; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: "all", label: "Tất cả", icon: <Sparkles className="w-3.5 h-3.5" />, count: allModels.length },
    {
      key: "review_phim",
      label: "🎬 Review Phim",
      icon: <Film className="w-3.5 h-3.5" />,
      count: reviewPhimModelIds.length,
    },
    { key: "vision", label: "👁️ Thị Giác Video", icon: <Eye className="w-3.5 h-3.5" /> },
    { key: "cinema", label: "✍️ Biên Kịch Kịch Bản", icon: <PenTool className="w-3.5 h-3.5" /> },
    { key: "voice", label: "🎙️ Giọng Đọc (TTS)", icon: <Mic className="w-3.5 h-3.5" /> },
    { key: "transcription", label: "🎧 Bóc Băng (Whisper)", icon: <Headphones className="w-3.5 h-3.5" /> },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Phân Quyền Mô Hình AI & Cấp Credit"
      subtitle={`Cấu hình danh mục model AI và số dư credit cấp cho Key: ${license?.key_hint || ""} (${license?.customer_name || ""})`}
      maxWidth="820px"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
            {error}
          </div>
        )}

        {/* Customer & Key Brief Banner */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">{license?.customer_name}</span>
            <span className="text-slate-400">·</span>
            <span className="font-mono text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 font-semibold">
              {license?.key_hint || "JACS-KEY"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Trạng thái:</span>
            <span
              className={`px-2 py-0.5 rounded-full font-bold text-[10.5px] ${
                license?.status === "active"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-rose-100 text-rose-800"
              }`}
            >
              {license?.status === "active" ? "Hoạt động" : "Đã khóa"}
            </span>
          </div>
        </div>

        {/* Credit Balance Management Section */}
        <div className="p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-xl">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <label className="text-slate-800 font-bold text-xs flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-amber-600" />
              <span>Số Dư Credits Khởi Tạo / Nạp Thêm (Ví riêng của Key này)</span>
            </label>
            <div className="flex items-center gap-1">
              {[
                { label: "+50 Cr", val: 50 },
                { label: "+100 Cr", val: 100 },
                { label: "+200 Cr", val: 200 },
                { label: "+500 Cr", val: 500 },
              ].map((btn) => (
                <button
                  key={btn.label}
                  type="button"
                  onClick={() => handleAddCredits(btn.val)}
                  className="px-2 py-0.5 text-[10.5px] font-bold text-amber-800 bg-white hover:bg-amber-100/80 border border-amber-300 rounded shadow-2xs transition-colors cursor-pointer flex items-center gap-0.5"
                >
                  <Plus className="w-2.5 h-2.5" />
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              step="0.1"
              required
              value={creditBalance}
              onChange={(e) => setCreditBalance(e.target.value)}
              placeholder="100"
              className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-slate-800 font-mono font-bold text-sm focus:outline-none focus:border-amber-500 shadow-2xs"
            />
            <span className="text-xs font-bold text-amber-800 whitespace-nowrap">Credits</span>
          </div>
          <p className="text-[10.5px] text-amber-700/90 mt-1.5">
            💡 Khi khách hàng thực hiện tác vụ (phân tích video, lồng tiếng voiceover...), hệ thống sẽ tự động trừ credits theo bảng giá và gửi thông báo khi sắp hết.
          </p>
        </div>

        {/* Quick Selection & Review Phim Action Bar */}
        <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>Quyền Sử Dụng Model AI:</span>
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-600 text-white shadow-2xs">
                Đã cấp: {selectedModels.length} / {allModels.length} models
              </span>
            </div>

            {/* Quick Package Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleSelectReviewPhimPackage}
                className="px-2.5 py-1 text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded-lg shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                title="Bấm 1 chạm để cấp quyền trọn bộ mô hình chuyên biệt cho Review Phim"
              >
                <Film className="w-3.5 h-3.5" />
                <span>🎬 Cấp Gói Review Phim Chuẩn (Khuyên Dùng)</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedModels(allModels.map((m) => m.id))}
                className="px-2 py-1 text-[11px] font-semibold text-blue-700 bg-white hover:bg-blue-100 border border-blue-300 rounded-md transition-colors cursor-pointer"
              >
                Chọn tất cả ({allModels.length})
              </button>

              <button
                type="button"
                onClick={() => setSelectedModels([])}
                className="px-2 py-1 text-[11px] font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-300 rounded-md transition-colors cursor-pointer"
              >
                Bỏ chọn
              </button>
            </div>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {filterTabs.map((tab) => {
              const isActive = categoryFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setCategoryFilter(tab.key)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ${
                    isActive
                      ? "bg-slate-800 text-white shadow-2xs"
                      : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isActive ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search & Provider Filter */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm model (gemini, claude, gpt, deepseek, whisper, elevenlabs, vbee...)"
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-2xs"
              />
            </div>
            {providersList.length > 0 && (
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer shadow-2xs"
              >
                <option value="all">Tất cả hãng</option>
                {providersList.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Model Selection Cards Grid */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>
              Hiển thị {filteredModels.length} mô hình AI ({selectedModels.length} đã được chọn)
            </span>
            {categoryFilter === "review_phim" && (
              <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                ✨ Đang hiển thị danh mục Review Phim tối ưu
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
            {filteredModels.length === 0 ? (
              <div className="col-span-full py-8 text-center text-slate-400 text-xs">
                Không tìm thấy model nào phù hợp với bộ lọc hiện tại.
              </div>
            ) : (
              filteredModels.map((m) => {
                const isChecked = selectedModels.includes(m.id);
                return (
                  <div
                    key={m.id}
                    onClick={() => handleToggleModel(m.id)}
                    className={`p-2.5 rounded-lg border transition-all cursor-pointer select-none flex flex-col justify-between gap-1.5 ${
                      isChecked
                        ? "bg-blue-50/80 border-blue-400 text-slate-900 shadow-2xs"
                        : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="flex-1 min-w-0">
                        <div className="font-mono font-bold text-xs truncate" title={m.label || m.id}>
                          {m.label || m.id}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate mt-0.5">
                          {m.provider}
                        </div>
                      </div>
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center shrink-0 transition-colors ${
                          isChecked
                            ? "bg-blue-600 text-white"
                            : "border border-slate-300 bg-white"
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>

                    {/* Tags & Badges */}
                    <div className="flex items-center gap-1 flex-wrap">
                      {m.isReviewPhim && (
                        <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200">
                          🎬 Review Phim
                        </span>
                      )}
                      {m.category === "vision" && (
                        <span className="text-[9.5px] font-semibold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                          👁️ Vision
                        </span>
                      )}
                      {m.category === "cinema" && (
                        <span className="text-[9.5px] font-semibold px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-200">
                          ✍️ Cinema
                        </span>
                      )}
                      {m.category === "voice" && (
                        <span className="text-[9.5px] font-semibold px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200">
                          🎙️ Voice TTS
                        </span>
                      )}
                      {m.category === "transcription" && (
                        <span className="text-[9.5px] font-semibold px-1.5 py-0.2 rounded bg-cyan-50 text-cyan-700 border border-cyan-200">
                          🎧 Whisper
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            Đóng
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (license?.allowed_models) setSelectedModels(license.allowed_models);
              }}
              disabled={loading}
              className="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Khôi phục ban đầu</span>
            </button>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5" />
              )}
              <span>{loading ? "Đang lưu..." : `Lưu Cấp Quyền (${selectedModels.length} Models)`}</span>
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
