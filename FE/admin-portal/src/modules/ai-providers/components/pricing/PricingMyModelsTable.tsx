import React from "react";
import { Zap, Edit3, Trash2, CheckCircle2, XCircle, Loader2, Sliders } from "lucide-react";
import type { MyModelItem } from "../../pages/AiModelsPricingPage";

interface PricingMyModelsTableProps {
  models: MyModelItem[];
  loading: boolean;
  testingModel: string | null;
  onToggleEnable: (m: MyModelItem) => void;
  onOpenEdit: (m: MyModelItem) => void;
  onTestPing: (m: MyModelItem) => void;
  onDeleteCustom?: (m: MyModelItem) => void;
}

export const PricingMyModelsTable: React.FC<PricingMyModelsTableProps> = ({
  models,
  loading,
  testingModel,
  onToggleEnable,
  onOpenEdit,
  onTestPing,
  onDeleteCustom,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
              <th className="py-2.5 px-3.5 whitespace-nowrap">Model & Phân Nhóm</th>
              <th className="py-2.5 px-3 whitespace-nowrap text-center">Trạng Thái Client</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Giá Gốc Nhà Cung Cấp</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Định Giá Bán Cho Client</th>
              <th className="py-2.5 px-3 whitespace-nowrap text-center">Biên Độ Lợi Nhuận</th>
              <th className="py-2.5 px-3.5 text-right whitespace-nowrap">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {loading && models.length === 0 ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  <td colSpan={6} className="py-3 px-3">
                    <div className="h-4 bg-slate-100 rounded w-full"></div>
                  </td>
                </tr>
              ))
            ) : models.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  Không tìm thấy model nào phù hợp với bộ lọc.
                </td>
              </tr>
            ) : (
              models.map((m) => {
                const cost = m.upstream_cost_vnd || 0;
                const price = m.client_vnd || 0;
                const margin = cost > 0 ? Math.round(((price - cost) / cost) * 100) : 0;
                const isTesting = testingModel === m.name;

                return (
                  <tr
                    key={m.name}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    {/* Model Name & Group */}
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold text-slate-800 text-xs font-mono">
                          {m.name}
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                          {m.group}
                        </span>
                        {m.is_custom && (
                          <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-200 font-semibold">
                            Custom
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Enable / Disable switch */}
                    <td className="py-2.5 px-3 whitespace-nowrap text-center">
                      <button
                        onClick={() => onToggleEnable(m)}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold transition-all ${
                          m.enabled
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                            : "bg-slate-100 text-slate-500 border border-slate-200 hover:text-slate-700"
                        }`}
                      >
                        {m.enabled ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Đang mở
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 text-slate-400" />
                            Tạm khóa
                          </>
                        )}
                      </button>
                    </td>

                    {/* Upstream Cost */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="font-mono text-[11px] text-slate-800 font-medium">
                        {m.upstream_price}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        ≈ {m.upstream_cost_vnd?.toLocaleString("vi-VN")} ₫
                      </div>
                    </td>

                    {/* Client Price */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div
                        onClick={() => onOpenEdit(m)}
                        className="cursor-pointer group/price hover:bg-amber-50/60 p-1.5 -m-1.5 rounded-lg transition-colors"
                        title="Bấm để chỉnh sửa bảng giá bán"
                      >
                        {m.pricing_unit === "call" ? (
                          <>
                            <div className="font-mono text-xs font-bold text-amber-700 flex items-center gap-1">
                              <span>₫ {(m.cost_per_call || m.client_vnd || 0).toLocaleString("vi-VN")}</span>
                              <span className="text-[10px] text-slate-400 font-normal">/yêu cầu</span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              {m.client_credits} Credits
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 font-mono text-xs">
                              <span className="font-bold text-slate-800">
                                In: <span className="text-blue-700">₫{(m.input_price_1m ?? 0).toLocaleString("vi-VN")}</span>
                              </span>
                              <span className="text-slate-300">|</span>
                              <span className="font-bold text-slate-800">
                                Out: <span className="text-amber-700">₫{(m.output_price_1m ?? (m.client_vnd || 0)).toLocaleString("vi-VN")}</span>
                              </span>
                              <span className="text-[10px] text-slate-400 font-normal">/1M</span>
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5 font-mono">
                              {(m.cache_read_1m !== undefined && m.cache_read_1m > 0) ? (
                                <span className="text-emerald-700 font-medium">
                                  Cache đọc: ₫{m.cache_read_1m.toLocaleString("vi-VN")}
                                </span>
                              ) : null}
                              <span className="text-slate-400 font-medium">
                                {m.client_credits} Credits ({m.client_vnd?.toLocaleString("vi-VN")} ₫)
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Margin */}
                    <td className="py-2.5 px-3 whitespace-nowrap text-center font-mono text-[11px]">
                      <span
                        className={`font-bold ${
                          margin >= 50
                            ? "text-emerald-600"
                            : margin >= 0
                            ? "text-blue-600"
                            : "text-rose-600"
                        }`}
                      >
                        {margin > 0 ? `+${margin}%` : `${margin}%`}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Dedicated Client Pricing Modal Button */}
                        <button
                          type="button"
                          onClick={() => onOpenEdit(m)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11.5px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 hover:text-amber-900 border border-amber-200/90 rounded-lg transition-all shadow-2xs cursor-pointer group/btn"
                          title="Mở modal điều chỉnh bảng giá áp dụng Định Giá Bán Cho Client (In / Out / Cache / Per Call)"
                        >
                          <Sliders className="w-3.5 h-3.5 text-amber-600 group-hover/btn:rotate-45 transition-transform" />
                          <span>Bảng giá bán</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onTestPing(m)}
                          disabled={isTesting}
                          title="Ping test gateway"
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          {isTesting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                          ) : (
                            <Zap className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {m.is_custom && onDeleteCustom && (
                          <button
                            type="button"
                            onClick={() => onDeleteCustom(m)}
                            title="Xóa model tùy chỉnh"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
