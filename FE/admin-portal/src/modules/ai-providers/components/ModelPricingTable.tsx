import React from "react";
import {
  Bot,
  Edit2,
  Trash2,
  CheckCircle2,
  Power,
  Sparkles,
  Zap,
  Layers,
  Coins,
  Cpu,
  Eye,
  Brain,
  Film,
  Volume2,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  Info,
} from "lucide-react";
import type { ModelPricing } from "../services/modelPricingService";
import { useI18n } from "../../../core/i18n";

interface ModelPricingTableProps {
  groupedModels: { [providerName: string]: ModelPricing[] };
  filteredCount: number;
  onToggleStatus: (id: string) => void;
  onQuickPriceChange: (
    id: string,
    field: "input_price" | "output_price" | "cache_discount_pct" | "price_per_request",
    value: number
  ) => void;
  onOpenEdit: (item: ModelPricing) => void;
  onOpenDelete: (item: ModelPricing) => void;
}

export const ModelPricingTable: React.FC<ModelPricingTableProps> = ({
  groupedModels,
  filteredCount,
  onToggleStatus,
  onQuickPriceChange,
  onOpenEdit,
  onOpenDelete,
}) => {
  const { t } = useI18n();

  // Helper for Category badge
  const renderCategoryBadge = (category?: string) => {
    switch (category) {
      case "cinema":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-purple-50 text-purple-700 border border-purple-200/70 whitespace-nowrap shadow-2xs">
            <Film size={10} />
            <span>Điện ảnh</span>
          </span>
        );
      case "vision":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-blue-50 text-blue-700 border border-blue-200/70 whitespace-nowrap shadow-2xs">
            <Eye size={10} />
            <span>Thị giác</span>
          </span>
        );
      case "reasoning":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-amber-50 text-amber-800 border border-amber-200/70 whitespace-nowrap shadow-2xs">
            <Brain size={10} />
            <span>Suy luận CoT</span>
          </span>
        );
      case "speed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70 whitespace-nowrap shadow-2xs">
            <Zap size={10} />
            <span>Siêu tốc</span>
          </span>
        );
      case "tts":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200/70 whitespace-nowrap shadow-2xs">
            <Volume2 size={10} />
            <span>Voice TTS</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-slate-100 text-slate-700 border border-slate-200/70 whitespace-nowrap shadow-2xs">
            <Bot size={10} />
            <span>Kịch bản</span>
          </span>
        );
    }
  };

  // Helper for Provider group icon
  const getProviderIcon = (providerName: string) => {
    const lower = providerName.toLowerCase();
    if (lower.includes("gemini") || lower.includes("google")) return "🔷";
    if (lower.includes("openai") || lower.includes("gpt")) return "🟢";
    if (lower.includes("claude") || lower.includes("anthropic")) return "🟧";
    if (lower.includes("deepseek")) return "🐋";
    if (lower.includes("voice") || lower.includes("tts") || lower.includes("eleven")) return "🎙️";
    return "⚡";
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1180px]">
          <thead>
            <tr className="border-b border-slate-200/90 bg-slate-50/90 text-[11px] font-bold text-slate-500 uppercase tracking-wider select-none whitespace-nowrap">
              <th className="py-3.5 pl-6 pr-3 w-[26%]">
                <div className="flex items-center gap-1.5">
                  <Bot size={13} className="text-slate-400" />
                  <span>{t("colModelName", "Model AI & Phân loại")}</span>
                </div>
              </th>
              <th className="py-3.5 px-3 w-[12%] text-rose-700">
                <div className="flex items-center gap-1">
                  <span>Giá Vốn (In / Out)</span>
                </div>
              </th>
              <th className="py-3.5 px-2.5 w-[10%] text-center text-slate-800">
                <div className="flex items-center justify-center gap-1">
                  <span>Bán Vào (đ/1M)</span>
                </div>
              </th>
              <th className="py-3.5 px-2.5 w-[10%] text-center text-slate-800">
                <div className="flex items-center justify-center gap-1">
                  <span>Bán Ra (đ/1M)</span>
                </div>
              </th>
              <th className="py-3.5 px-3 w-[13%] text-center text-amber-700">
                <div className="flex items-center justify-center gap-1.5">
                  <Coins size={13} className="text-amber-500" />
                  <span>Credit (In / Out)</span>
                </div>
              </th>
              <th className="py-3.5 px-2 w-[7%] text-center">
                <span>Cache %</span>
              </th>
              <th className="py-3.5 px-2 w-[7%] text-center">
                <span>đ/Request</span>
              </th>
              <th className="py-3.5 px-3 w-[8%] text-center">
                <span>{t("colLicenseStatus", "Cấp phép")}</span>
              </th>
              <th className="py-3.5 pr-6 pl-3 w-[7%] text-right">
                <span>{t("colActions", "Thao tác")}</span>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-xs">
            {filteredCount === 0 ? (
              <tr>
                <td colSpan={9} className="py-20 text-center">
                  <div className="w-16 h-16 rounded-3xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mx-auto mb-3 shadow-inner">
                    <Bot size={32} />
                  </div>
                  <div className="font-bold text-sm text-slate-700">
                    {t("noModelsFound", "Không tìm thấy model nào phù hợp")}
                  </div>
                  <div className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    {t("noModelsDesc", "Thử thay đổi từ khóa tìm kiếm hoặc chọn danh mục khác.")}
                  </div>
                </td>
              </tr>
            ) : (
              Object.entries(groupedModels).map(([providerGroup, groupItems]) => (
                <React.Fragment key={providerGroup}>
                  {/* Provider Group Header Row */}
                  <tr className="bg-gradient-to-r from-slate-100/90 via-slate-50/80 to-slate-100/40 border-y border-slate-200/90">
                    <td colSpan={9} className="py-2.5 px-6 font-black text-xs text-slate-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="text-base leading-none">{getProviderIcon(providerGroup)}</span>
                          <span className="tracking-tight text-slate-900 font-bold">{providerGroup}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10.5px] font-extrabold bg-white text-slate-700 border border-slate-200/90 shadow-2xs">
                            {groupItems.length} {t("statModelsUnit", "model")}
                          </span>
                        </div>
                        <div className="text-[11px] font-semibold text-slate-500 hidden sm:block">
                          {groupItems.filter((m) => m.is_selling).length} / {groupItems.length} đang mở cấp phép Desktop
                        </div>
                      </div>
                    </td>
                  </tr>

                  {/* Models in Provider Group */}
                  {groupItems.map((item) => {
                    const isSelling = item.is_selling ?? true;
                    const costIn = item.cost_input_price ?? 0;
                    const costOut = item.cost_output_price ?? 0;
                    const cachePct = item.cache_discount_pct ?? 20;
                    const reqPrice =
                      item.price_per_request ?? (item.input_price > 0 ? Math.round(item.input_price / 100) : 0);

                    // Credit rate: 1000đ = 1000 Cr, so 1đ = 1 Cr.
                    const creditIn = item.input_price ? item.input_price.toLocaleString() : "0";
                    const creditOut = item.output_price ? item.output_price.toLocaleString() : "0";

                    return (
                      <tr
                        key={item.id || item.model}
                        className={`group hover:bg-slate-50/80 transition-colors duration-150 ${
                          !isSelling ? "bg-slate-50/40 opacity-70" : ""
                        }`}
                      >
                        {/* 1. Model Checkbox + Name + Category (1 single line) */}
                        <td className="py-3 pl-6 pr-3 align-middle whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <label className="relative flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isSelling}
                                onChange={() => onToggleStatus(item.id || item.model)}
                                className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 focus:ring-offset-0 cursor-pointer accent-orange-600 transition-all"
                                title={isSelling ? "Bỏ tick để tắt cấp phép" : "Tick để cấp phép bán"}
                              />
                            </label>

                            <span
                              className={`font-mono font-bold text-xs tracking-tight ${
                                isSelling ? "text-slate-900 group-hover:text-orange-600 transition-colors" : "text-slate-500 line-through"
                              }`}
                            >
                              {item.model}
                            </span>

                            {renderCategoryBadge(item.category)}

                            {item.purpose && (
                              <span
                                className="text-slate-400 hover:text-slate-600 transition-colors cursor-help inline-flex items-center"
                                title={item.purpose}
                              >
                                <Info size={13} />
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 2. Giá Vốn (In / Out) (1 single line) */}
                        <td className="py-3 px-3 align-middle whitespace-nowrap">
                          {costIn > 0 || costOut > 0 ? (
                            <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-rose-700 bg-rose-50/80 border border-rose-200/70 px-2 py-1 rounded-lg shadow-2xs">
                              <span>{costIn.toLocaleString()}đ</span>
                              <span className="text-rose-400">/</span>
                              <span>{costOut.toLocaleString()}đ</span>
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-500 font-mono text-[11px] font-bold">
                              0đ / 0đ
                            </span>
                          )}
                        </td>

                        {/* 3. Bán Vào (đ/1M) (1 single line input) */}
                        <td className="py-3 px-2.5 align-middle text-center whitespace-nowrap">
                          <input
                            type="number"
                            min="0"
                            step="50"
                            value={item.input_price}
                            onChange={(e) =>
                              onQuickPriceChange(
                                item.id || item.model,
                                "input_price",
                                Number(e.target.value) || 0
                              )
                            }
                            className="w-20 px-2 py-1 rounded-lg border border-slate-200/90 bg-white font-mono text-xs font-bold text-slate-900 text-center hover:border-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/10 shadow-2xs transition-all"
                          />
                        </td>

                        {/* 4. Bán Ra (đ/1M) (1 single line input) */}
                        <td className="py-3 px-2.5 align-middle text-center whitespace-nowrap">
                          <input
                            type="number"
                            min="0"
                            step="50"
                            value={item.output_price}
                            onChange={(e) =>
                              onQuickPriceChange(
                                item.id || item.model,
                                "output_price",
                                Number(e.target.value) || 0
                              )
                            }
                            className="w-20 px-2 py-1 rounded-lg border border-slate-200/90 bg-white font-mono text-xs font-bold text-slate-900 text-center hover:border-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/10 shadow-2xs transition-all"
                          />
                        </td>

                        {/* 5. Quy đổi Credit (In / Out) (1 single line) */}
                        <td className="py-3 px-3 align-middle text-center whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 px-2.5 py-1 rounded-lg text-xs font-bold text-amber-900 font-mono shadow-2xs">
                            <Coins size={11} className="text-amber-600 shrink-0" />
                            <span>{creditIn}</span>
                            <span className="text-amber-400">/</span>
                            <span>{creditOut}</span>
                            <span className="text-[10px] text-amber-700 font-sans">Cr</span>
                          </span>
                        </td>

                        {/* 6. Cache Discount % (1 single line input) */}
                        <td className="py-3 px-2 align-middle text-center whitespace-nowrap">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={cachePct}
                            onChange={(e) =>
                              onQuickPriceChange(
                                item.id || item.model,
                                "cache_discount_pct",
                                Number(e.target.value) || 0
                              )
                            }
                            className="w-14 px-1.5 py-1 rounded-lg border border-slate-200/90 bg-white font-mono text-xs font-bold text-slate-700 text-center hover:border-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/10 shadow-2xs transition-all"
                          />
                        </td>

                        {/* 7. đ/Request (1 single line input) */}
                        <td className="py-3 px-2 align-middle text-center whitespace-nowrap">
                          <input
                            type="number"
                            min="0"
                            value={reqPrice}
                            onChange={(e) =>
                              onQuickPriceChange(
                                item.id || item.model,
                                "price_per_request",
                                Number(e.target.value) || 0
                              )
                            }
                            className="w-14 px-1.5 py-1 rounded-lg border border-slate-200/90 bg-white font-mono text-xs font-bold text-slate-700 text-center hover:border-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/10 shadow-2xs transition-all"
                          />
                        </td>

                        {/* 8. Cấp phép Status Pill (1 single line) */}
                        <td className="py-3 px-3 align-middle text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => onToggleStatus(item.id || item.model)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors cursor-pointer shadow-2xs active:scale-95 whitespace-nowrap ${
                              isSelling
                                ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                                : "bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200 hover:text-slate-600"
                            }`}
                            title="Click để bật/tắt cấp phép"
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isSelling ? "bg-emerald-500" : "bg-slate-400"
                              }`}
                            />
                            <span>{isSelling ? t("statusSelling", "Mở bán") : t("statusDisabled", "Đã tắt")}</span>
                          </button>
                        </td>

                        {/* 9. Action Buttons (Sửa & Xóa) (1 single line) */}
                        <td className="py-3 pr-6 pl-3 align-middle text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onOpenEdit(item)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 hover:text-slate-900 border border-slate-200/90 rounded-lg transition-colors cursor-pointer shadow-2xs active:scale-95"
                              title={t("btnEditModel", "Chỉnh sửa chi tiết")}
                            >
                              <Edit2 size={11} className="text-slate-500" />
                              <span>{t("btnEditPackage", "Sửa")}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onOpenDelete(item)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title={t("btnDeleteModel", "Xóa model")}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
