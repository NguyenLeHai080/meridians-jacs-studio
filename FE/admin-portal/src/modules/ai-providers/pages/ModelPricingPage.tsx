import React, { useState } from "react";
import {
  RotateCw,
  Plus,
  Save,
  Home,
  ChevronRight,
  Bot,
  Sparkles,
  Layers,
  Calculator,
  RefreshCw,
  Table,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { useModelPricingManagement } from "../hooks/useModelPricingManagement";
import { ModelPricingStatsCards } from "../components/ModelPricingStatsCards";
import { ModelPricingTableFilter } from "../components/ModelPricingTableFilter";
import { ModelPricingTable } from "../components/ModelPricingTable";
import { ModelPricingSimulatorCard } from "../components/ModelPricingSimulatorCard";
import { ModelPricingEditorModal } from "../components/ModelPricingEditorModal";
import { ModelPricingDeleteModal } from "../components/ModelPricingDeleteModal";
import { useI18n } from "../../../core/i18n";
import "../lang"; // Auto-registers ai-providers translations

export interface ModelPricingPageProps {
  searchTerm?: string;
  onNotify?: (msg: string, type?: "success" | "error") => void;
}

export const ModelPricingPage: React.FC<ModelPricingPageProps> = ({
  searchTerm: externalSearch = "",
  onNotify,
}) => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<"catalog" | "simulator">("catalog");

  const {
    models,
    loading,
    saving,
    syncing,
    filterCategory,
    setFilterCategory,
    searchQuery,
    setSearchQuery,
    filteredModels,
    groupedModels,
    metrics,
    // Simulator
    simModel,
    setSimModel,
    simVideoMinutes,
    setSimVideoMinutes,
    simVideosCount,
    setSimVideosCount,
    simulation,
    // Add Modal
    showAddModal,
    setShowAddModal,
    addForm,
    setAddForm,
    handleOpenAdd,
    handleAddModelSubmit,
    // Edit Modal
    editingModel,
    setEditingModel,
    editForm,
    setEditForm,
    handleOpenEdit,
    handleSaveEditSubmit,
    // Delete Modal
    deletingModel,
    setDeletingModel,
    handleOpenDelete,
    handleDeleteModelSubmit,
    // Actions
    fetchPricing,
    handleToggleStatus,
    handleQuickPriceChange,
    handleSaveAll,
    handleSyncProviders,
  } = useModelPricingManagement({ externalSearch, onNotify });

  return (
    <div className="w-full max-w-full space-y-6">
      {/* 1. Top Header with Breadcrumbs, Title, Badges & Action Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          {/* Breadcrumb Trail */}
          <nav className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-2.5">
            <span className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 transition-colors">
              <Home size={12} className="text-slate-400" />
              <span>{t("breadcrumbJacs", "JACS Studio")}</span>
            </span>
            <ChevronRight size={12} className="text-slate-300" />
            <span className="text-slate-500">{t("breadcrumbAdmin", "Quản trị hệ thống")}</span>
            <ChevronRight size={12} className="text-slate-300" />
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-orange-500/10 text-orange-700 border border-orange-500/20">
              {t("breadcrumbModelPricing", "Cấu hình Gói Model & Định Giá")}
            </span>
          </nav>

          {/* Title & Live Status Badges */}
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-500 via-amber-500 to-yellow-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/25 ring-4 ring-orange-500/10 shrink-0">
              <Bot size={24} className="stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight m-0">
                  {t("modelPricingTitle", "Cấu Hình Gói Model & Định Giá Chi Tiết")}
                </h1>
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>
                    {metrics.selling} {t("statActiveSellingModels", "Đang cấp phép Desktop")}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/10 text-indigo-700 border border-indigo-500/20 shadow-2xs">
                  <TrendingUp size={11} className="text-indigo-600" />
                  <span>+{metrics.avgMargin}% {t("statAvgMargin", "Biên lãi TB")}</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {t(
                  "modelPricingSubtitle",
                  "Quản lý cấp phép, định giá Token In/Out/Request và lợi nhuận cho từng model AI trên Tool Desktop."
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex items-center gap-2.5 shrink-0 self-start md:self-center flex-wrap sm:flex-nowrap">
          {/* Sync Providers */}
          <button
            type="button"
            onClick={handleSyncProviders}
            disabled={syncing || loading}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-400 border border-slate-200/90 rounded-xl shadow-xs transition-colors duration-150 active:scale-95 disabled:opacity-50 cursor-pointer"
            title={t("btnSyncProviders", "Đồng bộ Providers")}
          >
            <RefreshCw
              size={14}
              className={syncing ? "animate-spin text-orange-500" : "text-slate-500"}
            />
            <span>{syncing ? t("btnSyncingProviders", "Đang đồng bộ...") : t("btnSyncProviders", "Đồng bộ Providers")}</span>
          </button>

          {/* Add Model */}
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-800 bg-white hover:bg-slate-50 hover:border-slate-400 border border-slate-200/90 rounded-xl shadow-xs transition-colors duration-150 active:scale-95 cursor-pointer"
          >
            <Plus size={15} className="text-orange-600" />
            <span>{t("btnAddModel", "Thêm Model")}</span>
          </button>

          {/* Save Changes */}
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={saving || loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 active:bg-orange-800 rounded-xl shadow-md shadow-orange-600/25 hover:shadow-lg hover:shadow-orange-600/30 transition-all duration-150 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Save size={15} />
            <span>{saving ? t("btnSavingPricing", "Đang lưu...") : t("btnSavePricing", "Lưu thay đổi")}</span>
          </button>
        </div>
      </div>

      {/* 2. Top Metric Stat Cards */}
      <ModelPricingStatsCards metrics={metrics} />

      {/* 3. Section Switcher Tabs */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100/90 border border-slate-200/80 text-xs font-bold self-start max-w-fit shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveTab("catalog")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === "catalog"
              ? "bg-white text-orange-700 shadow-sm ring-1 ring-slate-900/5 font-bold"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Table size={15} className={activeTab === "catalog" ? "text-orange-600" : "text-slate-400"} />
          <span>{t("pricingTableTitle", "Bảng Giá Cấp Phép Models")}</span>
          <span className="px-2 py-0.2 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200/60 font-mono">
            {models.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("simulator")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === "simulator"
              ? "bg-white text-orange-700 shadow-sm ring-1 ring-slate-900/5 font-bold"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Calculator size={15} className={activeTab === "simulator" ? "text-orange-600" : "text-slate-400"} />
          <span>{t("simulatorModelTitle", "Giả Lập Doanh Thu & Lợi Nhuận")}</span>
        </button>
      </div>

      {/* 4. Active Tab Content */}
      {activeTab === "catalog" && (
        <div className="space-y-4">
          <ModelPricingTableFilter
            filterCategory={filterCategory}
            setFilterCategory={setFilterCategory}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            totalCount={metrics.total}
            sellingCount={metrics.selling}
            pausedCount={metrics.paused}
            filteredCount={filteredModels.length}
          />

          <ModelPricingTable
            groupedModels={groupedModels}
            filteredCount={filteredModels.length}
            onToggleStatus={handleToggleStatus}
            onQuickPriceChange={handleQuickPriceChange}
            onOpenEdit={handleOpenEdit}
            onOpenDelete={handleOpenDelete}
          />

          {/* Bottom Save Bar */}
          <div className="bg-white/95 backdrop-blur-sm border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Sparkles size={14} className="text-amber-500 shrink-0" />
              <span>{t("pricingTableSubtitle", "Nhớ bấm 'Lưu thay đổi' để đồng bộ bảng giá mới xuống phần mềm Desktop của khách.")}</span>
            </div>
            <div className="flex items-center gap-2.5 self-end sm:self-auto">
              <button
                type="button"
                onClick={fetchPricing}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl transition-colors cursor-pointer shadow-2xs"
              >
                {t("btnClose", "Tải lại")}
              </button>
              <button
                type="button"
                onClick={handleSaveAll}
                disabled={saving || loading}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 active:bg-orange-800 rounded-xl shadow-md shadow-orange-600/25 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
              >
                <Save size={14} />
                <span>{saving ? t("btnSavingPricing", "Đang lưu...") : t("btnSavePricing", "Lưu thay đổi")}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "simulator" && (
        <ModelPricingSimulatorCard
          models={models}
          simModel={simModel}
          setSimModel={setSimModel}
          simVideoMinutes={simVideoMinutes}
          setSimVideoMinutes={setSimVideoMinutes}
          simVideosCount={simVideosCount}
          setSimVideosCount={setSimVideosCount}
          simulation={simulation}
        />
      )}

      {/* 5. Add / Edit Model Modal */}
      <ModelPricingEditorModal
        isOpen={showAddModal}
        isEditing={false}
        form={addForm}
        setForm={setAddForm}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddModelSubmit}
      />

      <ModelPricingEditorModal
        isOpen={Boolean(editingModel)}
        isEditing={true}
        form={editForm}
        setForm={setEditForm}
        onClose={() => setEditingModel(null)}
        onSubmit={handleSaveEditSubmit}
      />

      {/* 6. Delete Model Modal */}
      <ModelPricingDeleteModal
        isOpen={Boolean(deletingModel)}
        item={deletingModel}
        onClose={() => setDeletingModel(null)}
        onConfirm={handleDeleteModelSubmit}
      />
    </div>
  );
};

export default ModelPricingPage;
