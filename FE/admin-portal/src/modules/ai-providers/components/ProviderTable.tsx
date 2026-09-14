import React from "react";
import {
  Bot,
  Zap,
  Edit2,
  Trash2,
  Power,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Cpu,
  Sparkles,
  AudioLines,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCw,
} from "lucide-react";
import type { Provider } from "../../../core/types";
import {
  getModelCategoryInfo,
  type ModelCategoryInfo,
} from "../hooks/useProvidersManagement";
import { useI18n } from "../../../core/i18n";

export interface ProviderTableProps {
  loading?: boolean;
  viewMode: "flat" | "grouped";
  paginatedList: Provider[];
  groupedData: Array<{ info: ModelCategoryInfo; items: Provider[] }>;
  filteredCount?: number;
  filteredList?: Provider[];
  currentPage: number;
  totalPages: number;
  pageSize: number;
  setCurrentPage: (page: number) => void;
  collapsedGroups: Record<string, boolean>;
  toggleGroupCollapse: (groupId: string) => void;
  onOpenCreate?: () => void;
  handleOpenCreate?: () => void;
  onOpenEdit?: (p: Provider) => void;
  handleOpenEdit?: (p: Provider) => void;
  onOpenDelete?: (p: Provider) => void;
  handleOpenDelete?: (p: Provider) => void;
  onToggleStatus?: (p: Provider) => void;
  handleToggleStatus?: (p: Provider) => void;
  onTestLatency?: (p: Provider) => void;
  handleTestLatency?: (p: Provider) => void;
  testingId: string | null;
  latencies: Record<string, { latency_ms: number; status: string; detail?: string }>;
}

export const ProviderTable: React.FC<ProviderTableProps> = ({
  loading = false,
  viewMode,
  paginatedList,
  groupedData,
  filteredCount,
  filteredList,
  currentPage,
  totalPages,
  pageSize,
  setCurrentPage,
  collapsedGroups,
  toggleGroupCollapse,
  onOpenCreate,
  handleOpenCreate,
  onOpenEdit,
  handleOpenEdit,
  onOpenDelete,
  handleOpenDelete,
  onToggleStatus,
  handleToggleStatus,
  onTestLatency,
  handleTestLatency,
  testingId,
  latencies,
}) => {
  const { t } = useI18n();

  const openCreate = onOpenCreate || handleOpenCreate || (() => {});
  const openEdit = onOpenEdit || handleOpenEdit || (() => {});
  const openDelete = onOpenDelete || handleOpenDelete || (() => {});
  const toggleStatus = onToggleStatus || handleToggleStatus || (() => {});
  const testLatency = onTestLatency || handleTestLatency || (() => {});
  const totalCount = filteredCount ?? filteredList?.length ?? paginatedList.length;

  // Helper: brand colors
  const getProviderBrand = (type: string, name: string) => {
    const tLower = (type || "").toLowerCase();
    const nLower = (name || "").toLowerCase();

    if (tLower.includes("gemini") || nLower.includes("gemini")) {
      return { label: "Gemini", color: "text-blue-600 bg-blue-50 border-blue-200" };
    }
    if (tLower.includes("openai") || nLower.includes("chatgpt") || nLower.includes("openai")) {
      return { label: "OpenAI", color: "text-emerald-600 bg-emerald-50 border-emerald-200" };
    }
    if (tLower.includes("anthropic") || nLower.includes("claude")) {
      return { label: "Claude", color: "text-amber-600 bg-amber-50 border-amber-200" };
    }
    if (nLower.includes("elevenlabs") || nLower.includes("eleven")) {
      return { label: "ElevenLabs", color: "text-rose-600 bg-rose-50 border-rose-200" };
    }
    if (nLower.includes("vbee")) {
      return { label: "Vbee", color: "text-orange-600 bg-orange-50 border-orange-200" };
    }
    if (nLower.includes("deepseek")) {
      return { label: "DeepSeek", color: "text-sky-600 bg-sky-50 border-sky-200" };
    }
    if (nLower.includes("groq")) {
      return { label: "Groq", color: "text-amber-700 bg-amber-50 border-amber-300" };
    }
    if (nLower.includes("ollama")) {
      return { label: "Ollama", color: "text-slate-700 bg-slate-100 border-slate-300" };
    }
    return { label: "Gateway", color: "text-purple-600 bg-purple-50 border-purple-200" };
  };

  // Helper: render capability pills
  const renderCapabilities = (capabilities: string[] = []) => {
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {capabilities.map((cap) => {
          if (cap === "analysis" || cap === "scriptwriting") {
            return (
              <span
                key={cap}
                className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-purple-50 text-purple-700 border border-purple-200"
              >
                {t("capAnalysis", "Kịch bản")}
              </span>
            );
          }
          if (cap === "vision") {
            return (
              <span
                key={cap}
                className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-blue-50 text-blue-700 border border-blue-200"
              >
                {t("capVision", "Thị giác")}
              </span>
            );
          }
          if (cap === "tts") {
            return (
              <span
                key={cap}
                className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200"
              >
                {t("capTts", "Lồng tiếng")}
              </span>
            );
          }
          if (cap === "transcription") {
            return (
              <span
                key={cap}
                className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"
              >
                {t("capTranscription", "Whisper")}
              </span>
            );
          }
          return (
            <span
              key={cap}
              className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-slate-100 text-slate-700 border border-slate-200"
            >
              {cap}
            </span>
          );
        })}
      </div>
    );
  };

  // Helper: render latency badge
  const renderLatencyBadge = (p: Provider) => {
    const isTesting = testingId === p.id;
    const latency = latencies[p.id];

    if (isTesting) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
          <RotateCw size={11} className="animate-spin" />
          <span>Ping...</span>
        </span>
      );
    }

    if (latency) {
      if (latency.status === "reachable" || latency.status === "OK") {
        return (
          <button
            type="button"
            onClick={() => testLatency(p)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
            title="Click để test lại"
          >
            <Zap size={12} className="text-emerald-600 fill-emerald-500" />
            <span>{latency.latency_ms}ms</span>
          </button>
        );
      }
      return (
        <button
          type="button"
          onClick={() => testLatency(p)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
          title={latency.detail || latency.status}
        >
          <XCircle size={12} className="text-amber-600" />
          <span>Lỗi</span>
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={() => testLatency(p)}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 border border-slate-200 transition-colors cursor-pointer"
        title="Kiểm tra độ trễ mạng"
      >
        <Zap size={11} className="text-slate-400" />
        <span>Test</span>
      </button>
    );
  };

  // Loading State
  if (loading) {
    return (
      <div className="py-20 px-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 mx-auto mb-3">
          <RotateCw size={24} className="animate-spin" />
        </div>
        <h3 className="text-sm font-bold text-slate-800 mb-1">
          {t("loading", "Đang tải dữ liệu...")}
        </h3>
        <p className="text-xs text-slate-500">Đang đồng bộ danh sách AI Providers từ máy chủ.</p>
      </div>
    );
  }

  // If no items
  if (totalCount === 0) {
    return (
      <div className="py-16 px-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
          <Bot size={24} />
        </div>
        <h3 className="text-sm font-bold text-slate-800 mb-1">
          {t("noProvidersFound", "Chưa cấu hình AI Provider nào")}
        </h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
          {t("noProvidersDesc", "Hệ thống chưa tìm thấy cổng AI nào phù hợp với bộ lọc hiện tại.")}
        </p>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 rounded-xl shadow-sm transition-all cursor-pointer"
        >
          <span>{t("btnCreateFirstProvider", "Thêm AI Provider đầu tiên")}</span>
        </button>
      </div>
    );
  }

  // Row Renderer
  const renderProviderRow = (p: Provider) => {
    const brand = getProviderBrand(p.provider_type, p.name);
    const cat = getModelCategoryInfo(p.name, p.model, p.purpose);
    const isEnabled = p.is_enabled ?? p.enabled ?? true;

    return (
      <tr
        key={p.id}
        className={`hover:bg-slate-50/70 transition-colors ${
          !isEnabled ? "opacity-60 bg-slate-50/30" : ""
        }`}
      >
        {/* Col 1: Platform & Name */}
        <td className="py-4 pl-6 pr-4 align-top">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${brand.color}`}
            >
              <Bot size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  onClick={() => openEdit(p)}
                  className="font-bold text-slate-900 text-xs hover:text-amber-600 cursor-pointer transition-colors"
                >
                  {p.name}
                </span>
                <span
                  style={{
                    backgroundColor: cat.badgeBg,
                    color: cat.badgeColor,
                    borderColor: cat.badgeBorder,
                  }}
                  className="px-1.5 py-0.5 rounded text-[10px] font-extrabold border"
                >
                  {cat.badge}
                </span>
              </div>
              {p.purpose && (
                <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                  {p.purpose}
                </p>
              )}
              <div className="font-mono text-[10.5px] text-slate-400 mt-1 truncate max-w-xs">
                {p.base_url}
              </div>
            </div>
          </div>
        </td>

        {/* Col 2: Type */}
        <td className="py-4 px-4 align-top whitespace-nowrap">
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-extrabold uppercase tracking-wide bg-slate-100 text-slate-700 border border-slate-200">
            {p.provider_type}
          </span>
        </td>

        {/* Col 3: Primary Model */}
        <td className="py-4 px-4 align-top whitespace-nowrap">
          <code className="px-2 py-1 rounded-lg text-xs font-mono font-bold bg-slate-100 text-slate-900 border border-slate-200">
            {p.model}
          </code>
        </td>

        {/* Col 4: TTS Model */}
        <td className="py-4 px-4 align-top whitespace-nowrap">
          {p.tts_model ? (
            <code className="px-2 py-1 rounded-lg text-xs font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200">
              {p.tts_model}
            </code>
          ) : (
            <span className="text-xs text-slate-300">--</span>
          )}
        </td>

        {/* Col 5: Capabilities */}
        <td className="py-4 px-4 align-top">
          {renderCapabilities(p.capabilities)}
        </td>

        {/* Col 6: Latency & Switch */}
        <td className="py-4 px-4 align-top whitespace-nowrap">
          <div className="flex items-center gap-2.5">
            {renderLatencyBadge(p)}
            <button
              type="button"
              onClick={() => toggleStatus(p)}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                isEnabled
                  ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200"
                  : "bg-slate-100 text-slate-400 hover:bg-slate-200 border border-slate-200"
              }`}
              title={isEnabled ? "Đang bật (Click để tắt)" : "Đang tắt (Click để bật)"}
            >
              <Power size={13} />
            </button>
          </div>
        </td>

        {/* Col 7: Actions */}
        <td className="py-4 pr-6 pl-4 align-top text-right whitespace-nowrap">
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => openEdit(p)}
              className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
              title="Chỉnh sửa cấu hình"
            >
              <Edit2 size={15} />
            </button>
            <button
              type="button"
              onClick={() => openDelete(p)}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              title="Xóa AI Provider"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div>
      {/* 1. Flat Desktop Table View */}
      {viewMode === "flat" && (
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/90 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 pl-6 pr-4">{t("colPlatformName", "Nền tảng & Tên Provider")}</th>
                <th className="py-3.5 px-4">{t("colProviderType", "Giao thức / Loại")}</th>
                <th className="py-3.5 px-4">{t("colPrimaryModel", "Mô hình chính")}</th>
                <th className="py-3.5 px-4">{t("colTtsModel", "Voice / TTS Model")}</th>
                <th className="py-3.5 px-4">{t("colCapabilities", "Tính năng hỗ trợ")}</th>
                <th className="py-3.5 px-4">{t("colLatencyStatus", "Trạng thái & Độ trễ")}</th>
                <th className="py-3.5 pr-6 pl-4 text-right">{t("colActions", "Thao tác")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedList.map((p) => renderProviderRow(p))}
            </tbody>
          </table>
        </div>
      )}

      {/* 2. Grouped Category View */}
      {viewMode === "grouped" && (
        <div className="p-4 sm:p-5 space-y-4">
          {groupedData.map(({ info, items }) => {
            const isCollapsed = collapsedGroups[info.groupId];
            return (
              <div
                key={info.groupId}
                className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs bg-white"
              >
                {/* Group Header */}
                <button
                  type="button"
                  onClick={() => toggleGroupCollapse(info.groupId)}
                  className="w-full px-5 py-3.5 bg-slate-50/90 hover:bg-slate-100 border-b border-slate-200/80 flex items-center justify-between text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      style={{
                        backgroundColor: info.badgeBg,
                        color: info.badgeColor,
                        borderColor: info.badgeBorder,
                      }}
                      className="px-2 py-0.5 rounded-md text-xs font-bold border"
                    >
                      {info.badge}
                    </span>
                    <span className="font-bold text-slate-900 text-xs">
                      {info.groupName}
                    </span>
                    <span className="text-[11px] text-slate-400 font-semibold">
                      ({items.length} providers)
                    </span>
                  </div>
                  <div className="text-slate-400">
                    {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                  </div>
                </button>

                {/* Group Table */}
                {!isCollapsed && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {items.map((p) => renderProviderRow(p))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 3. Mobile Responsive Cards View */}
      <div className="block lg:hidden divide-y divide-slate-100">
        {paginatedList.map((p) => {
          const brand = getProviderBrand(p.provider_type, p.name);
          const cat = getModelCategoryInfo(p.name, p.model, p.purpose);
          const isEnabled = p.is_enabled ?? p.enabled ?? true;

          return (
            <div
              key={p.id}
              className={`p-4 transition-colors ${
                !isEnabled ? "opacity-60 bg-slate-50/50" : "hover:bg-slate-50/50"
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${brand.color}`}
                  >
                    <Bot size={15} />
                  </div>
                  <div>
                    <span
                      onClick={() => openEdit(p)}
                      className="font-bold text-slate-900 text-xs hover:text-amber-600 cursor-pointer"
                    >
                      {p.name}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">
                        {p.provider_type}
                      </span>
                      <span className="text-[10px] text-slate-300">•</span>
                      <code className="text-[10px] font-mono font-bold text-slate-700">
                        {p.model}
                      </code>
                    </div>
                  </div>
                </div>

                <div>{renderLatencyBadge(p)}</div>
              </div>

              {p.purpose && (
                <p className="text-[11px] text-slate-500 mb-2 line-clamp-1">
                  {p.purpose}
                </p>
              )}

              <div className="mb-3">
                {renderCapabilities(p.capabilities)}
              </div>

              {/* Mobile Actions Toolbar */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => toggleStatus(p)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                    isEnabled
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-slate-100 text-slate-500 border border-slate-200"
                  }`}
                >
                  <Power size={11} />
                  <span>{isEnabled ? t("statusActive", "Đang bật") : t("statusDisabled", "Đã tắt")}</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(p)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer"
                  >
                    <Edit2 size={12} />
                    <span>Sửa</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openDelete(p)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Pagination Footer (Only for Flat View) */}
      {viewMode === "flat" && (
        <div className="p-4 sm:p-5 border-t border-slate-200/90 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {t("showingProviders", "Hiển thị")}{" "}
            <strong className="text-slate-900">
              {totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0} -{" "}
              {Math.min(currentPage * pageSize, totalCount)}
            </strong>{" "}
            / <strong className="text-slate-900">{totalCount}</strong> {t("providersUnit", "provider")}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              title="Trang trước"
            >
              <ChevronLeft size={15} />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
              const isCurrent = p === currentPage;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setCurrentPage(p)}
                  className={`min-w-[32px] h-8 px-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    isCurrent
                      ? "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-xs"
                      : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {p}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              title="Trang sau"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
