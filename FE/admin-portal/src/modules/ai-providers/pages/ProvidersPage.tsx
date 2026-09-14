import React from "react";
import {
  RotateCw,
  Plus,
  Zap,
  Home,
  ChevronRight,
  Bot,
  Sparkles,
} from "lucide-react";
import { useProvidersManagement, getModelCategoryInfo, type ModelCategoryInfo, type ProviderFilterType } from "../hooks/useProvidersManagement";
import { ProviderStatsCards } from "../components/ProviderStatsCards";
import { ProviderTableFilter } from "../components/ProviderTableFilter";
import { ProviderTable } from "../components/ProviderTable";
import { ProviderEditorModal } from "../components/ProviderEditorModal";
import { ProviderDeleteModal } from "../components/ProviderDeleteModal";
import { useI18n } from "../../../core/i18n";
import type { Provider } from "../../../core/types";

import "../lang"; // Auto-registers providers translations

export { getModelCategoryInfo };
export type { ModelCategoryInfo, ProviderFilterType };

export interface ProvidersPageProps {
  searchTerm?: string;
  onNotify?: (msg: string, type?: "success" | "error") => void;
}

export const ProvidersPage: React.FC<ProvidersPageProps> = ({
  searchTerm: externalSearch = "",
  onNotify,
}) => {
  const { t } = useI18n();

  const {
    loading,
    isSaving,
    searchQuery,
    setSearchQuery,
    filterTab,
    setFilterTab,
    viewMode,
    setViewMode,
    collapsedGroups,
    toggleGroupCollapse,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    filteredList,
    paginatedList,
    groupedData,
    totalPages,
    metrics,
    // Modals
    showEditorModal,
    setShowEditorModal,
    isCreating,
    selectedProvider,
    showDeleteModal,
    setShowDeleteModal,
    providerToDelete,
    // Latencies
    testingId,
    isTestingAll,
    latencies,
    // Actions
    fetchData,
    handleOpenCreate,
    handleOpenEdit,
    handleOpenDelete,
    handleToggleStatus,
    handleDeleteSubmit,
    handleTestLatency,
    handleTestAllLatencies,
    handleSaveSubmit,
  } = useProvidersManagement({ externalSearch, onNotify });

  return (
    <div className="w-full max-w-full space-y-6">
      {/* 1. Spacious Single-Tier Header with Breadcrumb & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          {/* Breadcrumb Navigation Trail */}
          <nav className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-2.5">
            <span className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 transition-colors">
              <Home size={12} className="text-slate-400" />
              <span>{t("breadcrumbJacs", "JACS Studio")}</span>
            </span>
            <ChevronRight size={12} className="text-slate-300" />
            <span className="text-slate-500">{t("breadcrumbAdmin", "Quản trị hệ thống")}</span>
            <ChevronRight size={12} className="text-slate-300" />
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/10 text-amber-700 border border-amber-500/20">
              {t("breadcrumbProviders", "AI Providers Gateway")}
            </span>
          </nav>

          {/* Title and Live Status Indicator */}
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-600 flex items-center justify-center text-white shadow-md shadow-amber-500/20 shrink-0">
              <Bot size={22} className="stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight m-0">
                  {t("providersTitle", "Cấu Hình AI Providers Gateway")}
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 shadow-2xs">
                  <Sparkles size={11} className="text-emerald-600 animate-pulse" />
                  <span>
                    {metrics.active}/{metrics.total} {t("statActiveUnit", "hoạt động")}
                  </span>
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {t(
                  "providersSubtitle",
                  "Quản trị cổng kết nối đa mô hình AI (OpenAI, Gemini, Claude, DeepSeek, ElevenLabs, Vbee) phục vụ kịch bản, thị giác và lồng tiếng."
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0 self-start md:self-center flex-wrap sm:flex-nowrap">
          {/* Refresh Button */}
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-400 border border-slate-300/90 rounded-xl shadow-xs transition-all duration-150 active:scale-95 disabled:opacity-50"
            title={t("btnRefreshProviders", "Làm mới")}
          >
            <RotateCw
              size={14}
              className={loading ? "animate-spin text-amber-500" : "text-slate-500"}
            />
            <span>{t("btnRefreshProviders", "Làm mới")}</span>
          </button>

          {/* Test All Latency */}
          <button
            type="button"
            onClick={handleTestAllLatencies}
            disabled={isTestingAll || loading || metrics.total === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 hover:border-amber-400 border border-amber-300/80 rounded-xl shadow-xs transition-all duration-150 active:scale-95 disabled:opacity-50"
            title={t("btnTestAllLatency", "Test toàn bộ độ trễ")}
          >
            <Zap
              size={14}
              className={`text-amber-600 ${isTestingAll ? "animate-bounce" : ""}`}
            />
            <span>
              {isTestingAll
                ? t("btnTestingLatency", "Đang kiểm tra...")
                : t("btnTestAllLatency", "Test toàn bộ độ trễ")}
            </span>
          </button>

          {/* Add Provider Button */}
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 rounded-xl shadow-md shadow-amber-500/25 hover:shadow-lg hover:shadow-amber-500/30 transition-all duration-150 active:scale-95 cursor-pointer"
          >
            <Plus size={15} />
            <span>{t("btnAddProvider", "Thêm Provider Mới")}</span>
          </button>
        </div>
      </div>

      {/* 2. Top Metric Stat Cards */}
      <ProviderStatsCards metrics={metrics} />

      {/* 3. Main Card: Table & Filter */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-10">
        <ProviderTableFilter
          filterTab={filterTab}
          setFilterTab={setFilterTab}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          viewMode={viewMode}
          setViewMode={setViewMode}
          pageSize={pageSize}
          setPageSize={setPageSize}
          metrics={metrics}
          filteredCount={filteredList.length}
        />

        <ProviderTable
          viewMode={viewMode}
          loading={loading}
          filteredList={filteredList}
          paginatedList={paginatedList}
          groupedData={groupedData}
          collapsedGroups={collapsedGroups}
          toggleGroupCollapse={toggleGroupCollapse}
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          setCurrentPage={setCurrentPage}
          testingId={testingId}
          latencies={latencies}
          onToggleStatus={handleToggleStatus}
          onTestLatency={handleTestLatency}
          onOpenEdit={handleOpenEdit}
          onOpenDelete={handleOpenDelete}
          onOpenCreate={handleOpenCreate}
        />
      </div>

      {/* 4. Provider Editor Modal (Create / Edit with Presets & DPAPI) */}
      <ProviderEditorModal
        isOpen={showEditorModal}
        isCreating={isCreating}
        provider={selectedProvider}
        isSaving={isSaving}
        onClose={() => setShowEditorModal(false)}
        onSave={handleSaveSubmit}
        onTestLatency={handleTestLatency}
      />

      {/* 5. Provider Delete Modal */}
      <ProviderDeleteModal
        isOpen={showDeleteModal}
        provider={providerToDelete}
        isLoading={loading}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteSubmit}
      />
    </div>
  );
};

export default ProvidersPage;
