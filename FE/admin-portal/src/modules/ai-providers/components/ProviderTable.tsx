import React from "react";
import {
  Copy,
  Eye,
  EyeOff,
  Zap,
  RotateCw,
  Check,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { Provider } from "../../../core/types";

interface ProviderTableProps {
  viewMode: "table" | "grid";
  loading: boolean;
  paginatedProviders: Provider[];
  totalFilteredCount: number;
  latencies: Record<string, { latency_ms: number; status: string }>;
  revealedKeys: Record<string, boolean>;
  testingId: string | null;
  pageSize: number;
  currentPage: number;
  totalPages: number;
  onSetPageSize: (size: number) => void;
  onSetCurrentPage: (page: number | ((prev: number) => number)) => void;
  onCopy: (text: string, label: string) => void;
  onToggleKeyReveal: (id: string) => void;
  onTestLatency: (provider: Provider) => void;
  onSetPrimary: (provider: Provider) => void;
  onOpenEdit: (provider: Provider) => void;
  onOpenDelete: (provider: Provider) => void;
}

export const ProviderTable: React.FC<ProviderTableProps> = ({
  viewMode,
  loading,
  paginatedProviders,
  totalFilteredCount,
  latencies,
  revealedKeys,
  testingId,
  pageSize,
  currentPage,
  totalPages,
  onSetPageSize,
  onSetCurrentPage,
  onCopy,
  onToggleKeyReveal,
  onTestLatency,
  onSetPrimary,
  onOpenEdit,
  onOpenDelete,
}) => {
  return (
    <>
      {viewMode === "table" ? (
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-[11px] whitespace-nowrap">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-2.5 px-3.5 whitespace-nowrap">NHÀ CUNG CẤP</th>
                <th className="py-2.5 px-3.5 whitespace-nowrap">CỔNG BASE URL</th>
                <th className="py-2.5 px-3.5 whitespace-nowrap">API KEY (BEARER)</th>
                <th className="py-2.5 px-3.5 whitespace-nowrap">MODEL MẶC ĐỊNH & HỖ TRỢ</th>
                <th className="py-2.5 px-3.5 text-center whitespace-nowrap">GIÁ VỐN / ẢNH</th>
                <th className="py-2.5 px-3.5 text-center whitespace-nowrap">ĐỘ TRỄ (PING)</th>
                <th className="py-2.5 px-3.5 text-center whitespace-nowrap">TRẠNG THÁI</th>
                <th className="py-2.5 px-3.5 text-right whitespace-nowrap">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {paginatedProviders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400 text-xs whitespace-nowrap">
                    {loading ? "Đang tải danh sách nhà cung cấp..." : "Không tìm thấy nhà cung cấp nào"}
                  </td>
                </tr>
              ) : (
                paginatedProviders.map((prov) => {
                  const lat = latencies[prov.id]?.latency_ms;
                  const isPrimary = !!prov.is_primary;
                  const isKeyVisible = revealedKeys[prov.id];
                  const supModels = prov.supported_models || [prov.model];
                  const extraModelsCount = Math.max(0, supModels.length - 1);

                  return (
                    <tr
                      key={prov.id}
                      className={`hover:bg-slate-50/80 transition-colors whitespace-nowrap ${
                        isPrimary ? "bg-orange-50/30" : ""
                      }`}
                    >
                      {/* 1. Tên NCC */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <span className="font-bold text-slate-900 text-xs">{prov.name}</span>
                          {isPrimary && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-orange-100 text-orange-700 border border-orange-300">
                              Primary
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 font-mono">
                            ({prov.code || prov.name.toLowerCase().replace(/\s+/g, "_")})
                          </span>
                        </div>
                      </td>

                      {/* 2. Cổng Base URL */}
                      <td className="py-2.5 px-3.5 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <span>{prov.base_url}</span>
                          <button
                            type="button"
                            onClick={() => onCopy(prov.base_url, "Cổng Base URL")}
                            className="text-slate-400 hover:text-slate-700 p-0.5 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Sao chép URL"
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                      </td>

                      {/* 3. API Key */}
                      <td className="py-2.5 px-3.5 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        <div className="flex items-center gap-1 whitespace-nowrap">
                          <span>
                            {isKeyVisible ? "sk-live-production-key-9981" : prov.masked_key || "sk-9r-...lnzz"}
                          </span>
                          <button
                            type="button"
                            onClick={() => onToggleKeyReveal(prov.id)}
                            className="text-slate-400 hover:text-slate-700 p-0.5 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                            title={isKeyVisible ? "Ẩn Key" : "Xem Key"}
                          >
                            {isKeyVisible ? <EyeOff size={12} /> : <Eye size={12} />}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onCopy(
                                isKeyVisible ? "sk-live-production-key-9981" : prov.masked_key || "",
                                "API Key"
                              )
                            }
                            className="text-slate-400 hover:text-slate-700 p-0.5 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Sao chép Key"
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                      </td>

                      {/* 4. Model mặc định & hỗ trợ */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-300 shrink-0">
                            ⚡ {prov.model}
                          </span>
                          {supModels
                            .filter((m: string) => m !== prov.model)
                            .slice(0, 3)
                            .map((m: string, idx: number) => (
                              <span
                                key={idx}
                                className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200 shrink-0"
                              >
                                {m}
                              </span>
                            ))}
                          {extraModelsCount > 3 && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-500 border border-slate-200 shrink-0">
                              +{extraModelsCount - 3}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 5. Giá vốn / ảnh */}
                      <td className="py-2.5 px-3.5 text-center font-bold text-slate-800 whitespace-nowrap text-[11px]">
                        {prov.cost_per_image || 75} đ
                      </td>

                      {/* 6. Độ trễ (Ping) */}
                      <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
                          <Zap size={10} className="text-amber-500 fill-amber-500" />
                          <span>{lat ? `${lat} ms` : "49290 ms"}</span>
                          <button
                            type="button"
                            onClick={() => onTestLatency(prov)}
                            disabled={testingId === prov.id}
                            className="text-slate-400 hover:text-slate-800 p-0.5 rounded transition-transform active:rotate-180 cursor-pointer"
                            title="Đo ping ngay"
                          >
                            <RotateCw size={10} className={testingId === prov.id ? "animate-spin" : ""} />
                          </button>
                        </div>
                      </td>

                      {/* 7. Trạng thái */}
                      <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${
                            prov.enabled
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-500 border border-slate-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              prov.enabled ? "bg-emerald-500" : "bg-slate-400"
                            }`}
                          />
                          <span>{prov.enabled ? "Online" : "Tắt"}</span>
                        </span>
                      </td>

                      {/* 8. Thao tác */}
                      <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                          {isPrimary ? (
                            <button
                              type="button"
                              disabled
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 cursor-default whitespace-nowrap"
                            >
                              <Check size={11} />
                              <span>Cổng Chính</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onSetPrimary(prov)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-300 transition-colors active:scale-95 cursor-pointer whitespace-nowrap"
                            >
                              <span>⚡ Đặt Chính</span>
                            </button>
                          )}

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => onOpenEdit(prov)}
                            className="p-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Chỉnh sửa"
                          >
                            <Pencil size={13} />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => onOpenDelete(prov)}
                            className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Xóa nhà cung cấp"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Grid View Mode */
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {paginatedProviders.map((prov) => {
            const isPrimary = !!prov.is_primary;
            const lat = latencies[prov.id]?.latency_ms;
            return (
              <div
                key={prov.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  isPrimary ? "border-orange-300 bg-orange-50/20" : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 text-xs">{prov.name}</span>
                      {isPrimary && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-orange-100 text-orange-700 border border-orange-300">
                          Primary
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {prov.code || prov.name.toLowerCase().replace(/\s+/g, "_")}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    ● Online
                  </span>
                </div>

                <div className="mt-2.5 text-[11px] space-y-1 text-slate-600">
                  <div>
                    <span className="text-slate-400">URL: </span>
                    <span className="font-mono">{prov.base_url}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Model: </span>
                    <span className="font-bold text-amber-700">{prov.model}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Giá vốn: </span>
                    <span className="font-bold">{prov.cost_per_image || 75} đ/ảnh</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Ping: </span>
                    <span className="font-bold text-emerald-600">{lat ? `${lat} ms` : "49290 ms"}</span>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                  {!isPrimary ? (
                    <button
                      type="button"
                      onClick={() => onSetPrimary(prov)}
                      className="px-2 py-0.5 text-[10px] font-bold text-orange-700 bg-orange-50 border border-orange-300 rounded hover:bg-orange-100 cursor-pointer"
                    >
                      ⚡ Đặt làm cổng chính
                    </button>
                  ) : (
                    <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                      <Check size={12} /> Cổng chính
                    </span>
                  )}

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onOpenEdit(prov)}
                      className="p-1 rounded text-slate-500 hover:bg-slate-100"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenDelete(prov)}
                      className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Bar */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-[11px] text-slate-500">
        <div>
          Hiển thị <span className="font-bold text-slate-700">1 - {totalFilteredCount}</span> trên{" "}
          <span className="font-bold text-slate-700">{totalFilteredCount}</span> bản ghi
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <span>Số dòng:</span>
            <select
              value={pageSize}
              onChange={(e) => onSetPageSize(Number(e.target.value))}
              className="bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-[11px] font-medium focus:outline-none"
            >
              <option value={5}>5/trang</option>
              <option value={10}>10/trang</option>
              <option value={20}>20/trang</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onSetCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded-md border border-slate-200 hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronLeft size={13} />
            </button>
            <span className="w-5 h-5 flex items-center justify-center rounded-md bg-orange-500 text-white font-bold text-[10px]">
              {currentPage}
            </span>
            <button
              type="button"
              onClick={() => onSetCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded-md border border-slate-200 hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
