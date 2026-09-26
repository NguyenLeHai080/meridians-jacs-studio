import React, { useState, useEffect, useMemo } from "react";
import { Modal } from "../../../../components/common/Modal";
import { useI18n } from "../../../../core/i18n";
import type { License } from "../../../../core/types";
import { licenseService, type UpdateLicensePayload } from "../../services/licenseService";
import { Clock, Infinity as InfinityIcon, Loader2, Save, Sparkles, Search, Film } from "lucide-react";
import { useAvailableAiModels, DEFAULT_REVIEW_PHIM_PACKAGE_IDS } from "../../hooks/useAvailableAiModels";

interface EditLicenseModalProps {
  license: License | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const EditLicenseModal: React.FC<EditLicenseModalProps> = ({
  license,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { t } = useI18n();
  const [customerName, setCustomerName] = useState("");
  const [customerContact, setCustomerContact] = useState("");
  const [maxJobs, setMaxJobs] = useState("200");
  const [premiumAi, setPremiumAi] = useState(true);
  const [creditBalance, setCreditBalance] = useState("100");

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
  
  // Expiration State: DateTime Picker + Lifetime toggle
  const [isLifetime, setIsLifetime] = useState(false);
  const [expiryDateTime, setExpiryDateTime] = useState<string>("");
  
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (license) {
      setCustomerName(license.customer_name);
      setCustomerContact(license.customer_contact || "");
      setMaxJobs(String(license.max_jobs_per_day || 200));
      setPremiumAi(license.premium_ai ?? true);
      setNotes(license.notes || "");
      setCreditBalance(String(license.credit_balance !== undefined ? license.credit_balance : 100));
      if (license.allowed_models && license.allowed_models.length > 0) {
        setSelectedModels(license.allowed_models);
      } else if (allModels.length > 0) {
        setSelectedModels(allModels.map((m) => m.id));
      }

      if (license.expires_at) {
        setIsLifetime(false);
        const d = new Date(license.expires_at);
        const offset = d.getTimezoneOffset() * 60000;
        const localISOTime = new Date(d.getTime() - offset).toISOString().slice(0, 16);
        setExpiryDateTime(localISOTime);
      } else {
        setIsLifetime(true);
        const d = new Date();
        d.setDate(d.getDate() + 30);
        d.setHours(23, 59, 0, 0);
        const offset = d.getTimezoneOffset() * 60000;
        const localISOTime = new Date(d.getTime() - offset).toISOString().slice(0, 16);
        setExpiryDateTime(localISOTime);
      }
    }
  }, [license, allModels]);

  // Compute remaining days
  const remainingInfo = useMemo(() => {
    if (isLifetime) return "♾️ Bản quyền Vĩnh Viễn: API Key không bao giờ hết hạn.";
    if (!expiryDateTime) return "Vui lòng chọn thời gian hết hạn";
    const target = new Date(expiryDateTime);
    const diff = target.getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days < 0) {
      return `⚠️ Đã hết hạn cách đây ${Math.abs(days)} ngày (${target.toLocaleDateString("vi-VN")})`;
    }
    return `📅 Hết hạn vào: ${target.toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })} (còn khoảng ${days} ngày)`;
  }, [isLifetime, expiryDateTime]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!license) return;
    setError("");
    setLoading(true);

    try {
      let finalExpiresAt: string | null = null;
      if (!isLifetime && expiryDateTime) {
        const target = new Date(expiryDateTime);
        finalExpiresAt = target.toISOString();
      }

      const payload: UpdateLicensePayload = {
        customer_name: customerName.trim(),
        customer_contact: customerContact.trim(),
        max_jobs_per_day: parseInt(maxJobs) || 200,
        premium_ai: premiumAi,
        credit_balance: parseFloat(creditBalance) || 0,
        allowed_models: selectedModels,
        notes: notes.trim() || null,
        expires_at: finalExpiresAt,
      };

      await licenseService.update(license.id, payload);
      onSuccess(`Đã cập nhật thông tin và thời hạn cho key của ${customerName}`);
      onClose();
    } catch (err: any) {
      setError(err instanceof Error ? err.message : "Lỗi khi cập nhật license");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("editTitle", "Cập Nhật API Key & Thời Hạn")}>
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {error}
          </div>
        )}

        {/* License Key Hint Readonly */}
        {license && (
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-slate-700">
            <span className="font-semibold text-slate-600 text-[11px]">Mã API Key:</span>
            <span className="font-mono font-bold text-blue-600 text-xs">{license.key_hint}</span>
          </div>
        )}

        {/* Customer Name */}
        <div>
          <label className="block text-slate-700 mb-1 font-semibold">Tên khách hàng / Đơn vị *</label>
          <input
            type="text"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500"
            required
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
        </div>

        {/* Customer Contact */}
        <div>
          <label className="block text-slate-700 mb-1 font-semibold">Thông tin liên hệ (Email / SĐT / Zalo)</label>
          <input
            type="text"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500"
            value={customerContact}
            onChange={(e) => setCustomerContact(e.target.value)}
          />
        </div>

        {/* EXPIRATION DATE & TIME (THỜI HẠN & HẾT HẠN: DateTime Picker + Vĩnh Viễn) */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-slate-800 font-bold flex items-center gap-1.5 text-xs">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>Thời Hạn & Ngày Giờ Hết Hạn Key</span>
            </label>

            {/* Lifetime Checkbox Toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isLifetime}
                onChange={(e) => setIsLifetime(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
              />
              <span className="text-slate-700 font-semibold text-xs flex items-center gap-1">
                <InfinityIcon className="w-3.5 h-3.5 text-blue-600" />
                <span>Vĩnh viễn</span>
              </span>
            </label>
          </div>

          {!isLifetime ? (
            <div>
              <label className="block text-slate-600 text-[11px] font-medium mb-1">
                Chọn ngày và giờ hết hạn:
              </label>
              <input
                type="datetime-local"
                required={!isLifetime}
                value={expiryDateTime}
                onChange={(e) => setExpiryDateTime(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 font-mono text-xs focus:outline-none focus:border-blue-500 shadow-2xs"
              />
            </div>
          ) : (
            <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg text-blue-700 text-xs flex items-center gap-2 font-medium">
              <InfinityIcon className="w-4 h-4 shrink-0 text-blue-600" />
              <span>Bản quyền Vĩnh Viễn: API Key này sẽ không bao giờ bị hết hạn.</span>
            </div>
          )}

          {/* Remaining info banner */}
          {!isLifetime && (
            <div className="text-[11px] text-slate-700 bg-white p-2 rounded-lg border border-slate-200/80 font-medium">
              {remainingInfo}
            </div>
          )}
        </div>

        {/* Quota & AI Feature */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-700 mb-1 font-semibold">Giới hạn Render / Ngày</label>
            <input
              type="number"
              min="10"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono focus:outline-none focus:bg-white focus:border-blue-500"
              value={maxJobs}
              onChange={(e) => setMaxJobs(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-slate-700 mb-1 font-semibold">Ghi chú</label>
            <input
              type="text"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* AI Credits & Allowed Models Section */}
        <div className="p-3.5 bg-amber-50/50 rounded-xl border border-amber-200/70 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-slate-800 font-bold flex items-center gap-1.5 text-xs">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>Số Dư Credits Khởi Tạo & Mô Hình Cấp Quyền</span>
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedModels(allModels.map((m) => m.id))}
                className="text-[10.5px] text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
              >
                Chọn tất cả
              </button>
              <span className="text-slate-300">·</span>
              <button
                type="button"
                onClick={() => setSelectedModels([])}
                className="text-[10.5px] text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                Bỏ chọn
              </button>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 mb-1 font-semibold text-[11px]">
              Số Dư Credits Hiện Tại (Ví riêng của Key này)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                step="0.1"
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-mono font-bold text-xs focus:outline-none focus:border-amber-500"
                value={creditBalance}
                onChange={(e) => setCreditBalance(e.target.value)}
                placeholder="100"
              />
              <span className="text-xs font-bold text-amber-700 whitespace-nowrap">Credits</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
              <label className="text-slate-700 font-semibold text-[11px]">
                Danh sách mô hình được phép sử dụng ({selectedModels.length}/{allModels.length})
              </label>
              <div className="flex items-center gap-1.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => {
                    const matched = allModels
                      .filter((m) => DEFAULT_REVIEW_PHIM_PACKAGE_IDS.includes(m.id) || m.isReviewPhim)
                      .map((m) => m.id);
                    setSelectedModels(matched);
                    setCategoryFilter("review_phim");
                  }}
                  className="px-2 py-0.5 text-[10px] font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                  title="Cấp trọn bộ mô hình Review Phim chuẩn"
                >
                  <Film className="w-2.5 h-2.5" />
                  <span>🎬 Gói Review Phim Chuẩn</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedModels(allModels.map((m) => m.id))}
                  className="text-blue-600 hover:text-blue-800 font-semibold underline"
                >
                  Chọn tất cả
                </button>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={() => setSelectedModels([])}
                  className="text-slate-500 hover:text-slate-700 underline"
                >
                  Bỏ chọn
                </button>
              </div>
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 mb-1.5">
              {[
                { key: "all", label: `Tất cả (${allModels.length})` },
                { key: "review_phim", label: `🎬 Review Phim (${reviewPhimModelIds.length})` },
                { key: "vision", label: "👁️ Vision" },
                { key: "cinema", label: "✍️ Cinema" },
                { key: "voice", label: "🎙️ Voice TTS" },
                { key: "transcription", label: "🎧 Whisper" },
              ].map((tab) => {
                const isActive = categoryFilter === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setCategoryFilter(tab.key as any)}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      isActive
                        ? "bg-slate-800 text-white"
                        : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Search & Provider Filter Bar */}
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="relative flex-1">
                <Search className="w-3 h-3 absolute left-2 top-2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm model (gpt, claude, gemini, qwen, image...)"
                  className="w-full pl-6 pr-2 py-1 bg-white border border-slate-200 rounded-md text-[10.5px] text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>
              {providersList.length > 0 && (
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  className="px-2 py-1 bg-white border border-slate-200 rounded-md text-[10.5px] text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer"
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

            {/* Model Items Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-40 overflow-y-auto p-1.5 bg-slate-50/50 rounded-lg border border-slate-200">
              {filteredModels.length === 0 ? (
                <div className="col-span-full py-3 text-center text-[10.5px] text-slate-400">
                  Không tìm thấy model nào phù hợp
                </div>
              ) : (
                filteredModels.map((m) => {
                  const isChecked = selectedModels.includes(m.id);
                  return (
                    <label
                      key={m.id}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10.5px] cursor-pointer transition-colors border ${
                        isChecked
                          ? "bg-blue-50/90 border-blue-200 text-blue-900 font-medium"
                          : "bg-white border-slate-200/70 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedModels((prev) => [...prev, m.id]);
                          } else {
                            setSelectedModels((prev) => prev.filter((id) => id !== m.id));
                          }
                        }}
                        className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                      />
                      <div className="truncate flex-1">
                        <span className="truncate block font-mono text-[10px] leading-tight">{m.label}</span>
                        <span className="text-[9px] text-slate-400 block leading-tight">{m.provider}</span>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="edit-premium-ai"
            checked={premiumAi}
            onChange={(e) => setPremiumAi(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
          />
          <label htmlFor="edit-premium-ai" className="text-slate-700 font-medium cursor-pointer">
            Mở khóa đầy đủ quyền AI (OpenAI, Claude, Gemini qua Gateway)
          </label>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
          >
            {t("cancel", "Hủy")}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all disabled:opacity-50"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <Save className="w-3.5 h-3.5" />
            <span>{loading ? "Đang lưu..." : t("saveChanges", "Lưu Thay Đổi")}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
