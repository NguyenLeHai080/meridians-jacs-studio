import React from "react";
import {
  X,
  Bot,
  CheckCircle2,
  Coins,
  Sparkles,
  Power,
  ShieldCheck,
  Zap,
  TrendingUp,
  Percent,
  Layers,
  ArrowRight,
  HelpCircle,
  Film,
  Eye,
  Brain,
  Volume2,
  FileText,
  DollarSign,
  Lock,
} from "lucide-react";
import type { ModelPricingFormState } from "../hooks/useModelPricingManagement";
import { useI18n } from "../../../core/i18n";

interface ModelPricingEditorModalProps {
  isOpen: boolean;
  isEditing: boolean;
  form: ModelPricingFormState;
  setForm: React.Dispatch<React.SetStateAction<ModelPricingFormState>>;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const ModelPricingEditorModal: React.FC<ModelPricingEditorModalProps> = ({
  isOpen,
  isEditing,
  form,
  setForm,
  onClose,
  onSubmit,
}) => {
  const { t } = useI18n();

  if (!isOpen) return null;

  // Calculate live margin preview
  const inputMargin =
    form.input_price > 0 && form.cost_input_price !== undefined
      ? Math.round(((form.input_price - form.cost_input_price) / form.input_price) * 100)
      : 0;

  const outputMargin =
    form.output_price > 0 && form.cost_output_price !== undefined
      ? Math.round(((form.output_price - form.cost_output_price) / form.output_price) * 100)
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-md transition-all duration-300">
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-900/10 transition-all transform animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Modal Header */}
        <div className="relative border-b border-slate-100 bg-gradient-to-r from-slate-50/80 via-white to-orange-50/30 px-6 py-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-orange-500 via-amber-500 to-yellow-500 text-white shadow-lg shadow-orange-500/20 ring-4 ring-orange-500/10 shrink-0">
                <Bot className="h-6 w-6 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">
                  {isEditing
                    ? `${t("editModelTitle", "Chỉnh Sửa Định Giá Model")}: ${form.model}`
                    : t("addModelTitle", "Thêm Model AI Mới Vào Bảng Giá")}
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {t(
                    "modalModelSubtitle",
                    "Cấu hình giá vốn nhà cung cấp, giá bán trừ Credit khách và cấp phép trên app Desktop."
                  )}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* 2. Form Body */}
        <form onSubmit={onSubmit}>
          <div className="max-h-[74vh] overflow-y-auto px-6 py-5 space-y-5 scrollbar-thin">
            {/* SECTION 1: IDENTIFIERS */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* AI Model ID */}
                <div>
                  <label className="mb-1.5 flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>
                      {t("lblModelCode", "Mã Model AI")} <span className="text-rose-500">*</span>
                    </span>
                    <span className="text-[10.5px] font-normal text-slate-400">ID gọi API</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={form.model}
                      onChange={(e) => setForm({ ...form, model: e.target.value })}
                      placeholder="gemini-2.5-flash, gpt-5.5, claude-3-7..."
                      className="w-full rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-white focus:bg-white px-3.5 py-2.5 font-mono text-xs font-bold text-slate-900 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-3 focus:ring-orange-500/10 shadow-2xs transition-all"
                    />
                  </div>
                </div>

                {/* Provider Gateway Name */}
                <div>
                  <label className="mb-1.5 flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>{t("lblProviderName", "Nhà cung cấp / Hãng")}</span>
                    <span className="text-[10.5px] font-normal text-slate-400">Hạ tầng Gateway</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={form.provider_name}
                      onChange={(e) => setForm({ ...form, provider_name: e.target.value })}
                      placeholder="Google Gemini, OpenAI, Anthropic..."
                      className="w-full rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-white focus:bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-3 focus:ring-orange-500/10 shadow-2xs transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Specialized Category */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                  {t("lblCategory", "Phân loại chuyên biệt")}
                </label>
                <div className="relative">
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-white focus:bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:border-orange-500 focus:outline-none focus:ring-3 focus:ring-orange-500/10 shadow-2xs cursor-pointer appearance-none"
                  >
                    <option value="analysis">📝 Kịch bản & Phân tích tổng quan (Analysis / General)</option>
                    <option value="cinema">🎬 Biên kịch điện ảnh chuyên sâu (Cinema / Storytelling)</option>
                    <option value="vision">👁️ Thị giác nhận diện khung hình (Vision / Multimodal)</option>
                    <option value="reasoning">🧠 Tư duy suy luận sâu (Reasoning CoT)</option>
                    <option value="speed">⚡ Siêu tốc độ & Tiết kiệm chi phí (Fast / Budget)</option>
                    <option value="tts">🗣️ Voice AI & Lồng tiếng TTS (Audio / Dubbing)</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400 text-xs">
                    ▼
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: PRICING MATRIX (COST VS SELL) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Upstream Cost Box */}
              <div className="rounded-2xl border border-rose-200/80 bg-rose-50/30 p-4 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between pb-2 border-b border-rose-100/80">
                  <div className="flex items-center gap-1.5 text-xs font-black text-rose-800 uppercase tracking-wider">
                    <span>{t("lblCostBoxTitle", "Giá Vốn Nhà Cung Cấp")}</span>
                  </div>
                  <span className="text-[10px] font-bold text-rose-700 bg-rose-100/90 px-2.5 py-0.5 rounded-full border border-rose-200/60 font-mono">
                    đ / 1M Tokens
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-slate-600">
                      {t("lblCostPriceIn", "Vốn Vào (In)")}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="50"
                        value={form.cost_input_price}
                        onChange={(e) => setForm({ ...form, cost_input_price: Number(e.target.value) || 0 })}
                        className="w-full rounded-xl border border-rose-200/90 bg-white px-3 py-2 font-mono text-xs font-bold text-rose-700 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/10 shadow-2xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-slate-600">
                      {t("lblCostPriceOut", "Vốn Ra (Out)")}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="50"
                        value={form.cost_output_price}
                        onChange={(e) => setForm({ ...form, cost_output_price: Number(e.target.value) || 0 })}
                        className="w-full rounded-xl border border-rose-200/90 bg-white px-3 py-2 font-mono text-xs font-bold text-rose-700 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/10 shadow-2xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Selling Price Box */}
              <div className="rounded-2xl border border-amber-200/80 bg-amber-50/30 p-4 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between pb-2 border-b border-amber-100/80">
                  <div className="flex items-center gap-1.5 text-xs font-black text-amber-900 uppercase tracking-wider">
                    <span>{t("lblSellBoxTitle", "Giá Bán Trừ Credit")}</span>
                  </div>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100/90 px-2.5 py-0.5 rounded-full border border-amber-200/60 font-mono">
                    1đ = 1 Credit
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-slate-600">
                      {t("lblSellPriceIn", "Bán Vào (In)")}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="50"
                        value={form.input_price}
                        onChange={(e) => setForm({ ...form, input_price: Number(e.target.value) || 0 })}
                        className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 font-mono text-xs font-bold text-amber-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/10 shadow-2xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-slate-600">
                      {t("lblSellPriceOut", "Bán Ra (Out)")}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="50"
                        value={form.output_price}
                        onChange={(e) => setForm({ ...form, output_price: Number(e.target.value) || 0 })}
                        className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 font-mono text-xs font-bold text-amber-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/10 shadow-2xs"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 3: REAL-TIME MARGIN ECONOMICS GAUGE */}
            <div className="rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 p-4 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md border border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
                  <TrendingUp size={16} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-100">Ước tính Biên Lợi Nhuận Gộp (Gross Margin)</div>
                  <div className="text-[10.5px] text-slate-400">Tự động tính theo tỷ lệ Giá bán / Giá vốn</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 font-mono text-xs self-end sm:self-auto">
                <div className="inline-flex items-center gap-1.5 bg-slate-800/90 border border-slate-700/80 px-3 py-1.5 rounded-xl shadow-2xs">
                  <span className="text-slate-400 text-[11px] font-sans">Token Vào:</span>
                  <span
                    className={`font-bold ${
                      inputMargin >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {inputMargin > 0 ? `+${inputMargin}%` : `${inputMargin}%`}
                  </span>
                </div>

                <div className="inline-flex items-center gap-1.5 bg-slate-800/90 border border-slate-700/80 px-3 py-1.5 rounded-xl shadow-2xs">
                  <span className="text-slate-400 text-[11px] font-sans">Token Ra:</span>
                  <span
                    className={`font-bold ${
                      outputMargin >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {outputMargin > 0 ? `+${outputMargin}%` : `${outputMargin}%`}
                  </span>
                </div>
              </div>
            </div>

            {/* SECTION 4: ADVANCED TUNING (CACHE & PER REQUEST) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                  {t("lblCacheDiscount", "Cache Discount (%)")}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={form.cache_discount_pct}
                    onChange={(e) => setForm({ ...form, cache_discount_pct: Number(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-white focus:bg-white px-3.5 py-2 font-mono text-xs font-bold text-slate-800 focus:border-orange-500 focus:outline-none shadow-2xs"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">%</span>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                  {t("lblPerRequestFee", "Đơn giá cố định / Request (đ)")}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={form.price_per_request}
                    onChange={(e) => setForm({ ...form, price_per_request: Number(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-white focus:bg-white px-3.5 py-2 font-mono text-xs font-bold text-slate-800 focus:border-orange-500 focus:outline-none shadow-2xs"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">VNĐ</span>
                </div>
              </div>
            </div>

            {/* SECTION 5: DESKTOP TOOL LICENSING PERMISSION */}
            <div>
              <label className="mb-2 block text-xs font-bold text-slate-700">
                {t("lblLicenseStatus", "Quyền cấp phép trên Tool Desktop")}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Active Choice */}
                <button
                  type="button"
                  onClick={() => setForm({ ...form, is_selling: true })}
                  className={`flex items-start gap-3 p-3.5 rounded-2xl text-left border transition-all cursor-pointer ${
                    form.is_selling
                      ? "bg-emerald-50/80 text-emerald-900 border-emerald-400 ring-2 ring-emerald-500/20 shadow-xs"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div
                    className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                      form.is_selling ? "bg-emerald-600 text-white" : "border-2 border-slate-300"
                    }`}
                  >
                    {form.is_selling && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      {t("statusSelling", "Cấp phép mở bán (Active)")}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Khách hàng trên Tool Desktop có thể gọi model này.
                    </div>
                  </div>
                </button>

                {/* Disabled Choice */}
                <button
                  type="button"
                  onClick={() => setForm({ ...form, is_selling: false })}
                  className={`flex items-start gap-3 p-3.5 rounded-2xl text-left border transition-all cursor-pointer ${
                    !form.is_selling
                      ? "bg-slate-100/90 text-slate-900 border-slate-400 ring-2 ring-slate-400/20 shadow-xs"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div
                    className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                      !form.is_selling ? "bg-slate-700 text-white" : "border-2 border-slate-300"
                    }`}
                  >
                    {!form.is_selling && <Power className="w-3.5 h-3.5" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      {t("statusDisabled", "Tạm khóa / Ẩn (Hidden)")}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Khóa quyền gọi API, ẩn khỏi danh sách model trên tool.
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* SECTION 6: PURPOSE / NOTES */}
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">
                {t("lblModelPurpose", "Mục đích sử dụng / Ghi chú")}
              </label>
              <input
                type="text"
                value={form.purpose}
                onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                placeholder={t("placeholderPurposeModel", "Ví dụ: Kịch bản điện ảnh triệu view, phân cảnh video 4K...")}
                className="w-full rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-white focus:bg-white px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-3 focus:ring-orange-500/10 shadow-2xs transition-all"
              />
            </div>
          </div>

          {/* 3. Modal Footer Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/90 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200/90 bg-white px-5 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-all cursor-pointer shadow-2xs"
            >
              {t("btnCancel", "Hủy bỏ")}
            </button>
            <button
              type="submit"
              disabled={!form.model.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-700 active:bg-orange-800 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-600/20 hover:shadow-lg hover:shadow-orange-600/30 focus:outline-none focus:ring-2 focus:ring-orange-500/30 disabled:opacity-50 transition-colors duration-150 cursor-pointer active:scale-95"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{isEditing ? t("btnSave", "Lưu Cập Nhật") : t("btnAddModel", "Thêm Model")}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
