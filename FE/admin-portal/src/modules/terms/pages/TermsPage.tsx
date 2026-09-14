import React from "react";
import {
  RotateCw,
  Plus,
  Home,
  ChevronRight,
  Scale,
  Users,
} from "lucide-react";
import type { LegalTerms } from "../../../core/types";
import { useTermsManagement } from "../hooks/useTermsManagement";
import { TermsStatsCards } from "../components/TermsStatsCards";
import { TermsTableFilter } from "../components/TermsTableFilter";
import { TermsTable } from "../components/TermsTable";
import { TermsEditorModal } from "../components/TermsEditorModal";
import { TermsViewModal } from "../components/TermsViewModal";
import { TermsDeleteModal } from "../components/TermsDeleteModal";
import { TermsRbacModal } from "../components/TermsRbacModal";
import { useI18n } from "../../../core/i18n";
import "../lang"; // Auto-registers terms translations

export interface TermsPageProps {
  terms?: LegalTerms;
  setTerms?: (terms: LegalTerms) => void;
  setMessage?: (msg: string) => void;
  setError?: (err: string) => void;
  onNotify?: (msg: string, type?: "success" | "error") => void;
  searchTerm?: string;
}

export const TermsPage: React.FC<TermsPageProps> = ({
  onNotify,
  searchTerm: externalSearch = "",
}) => {
  const { t } = useI18n();

  const {
    loading,
    isSaving,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    filteredDocuments,
    paginatedDocuments,
    totalPages,
    metrics,
    activeDocument,
    // Modals
    showEditorModal,
    setShowEditorModal,
    isCreating,
    showViewModal,
    setShowViewModal,
    showDeleteModal,
    setShowDeleteModal,
    showRbacModal,
    setShowRbacModal,
    selectedDoc,
    // Form Data
    formData,
    setFormData,
    // Actions
    fetchData,
    handleOpenCreate,
    handleOpenEdit,
    handleOpenView,
    handleOpenDelete,
    handleSaveSubmit,
    handleDeleteSubmit,
    handleSetActive,
    handleDuplicate,
    handleCopyText,
  } = useTermsManagement({ externalSearch, onNotify });

  return (
    <div className="w-full max-w-full space-y-6">
      {/* 1. Spacious Single-Tier Header with Breadcrumb & Actions (Aligned with UserManagementPage) */}
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
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-orange-500/10 text-orange-700 border border-orange-500/20">
              {t("breadcrumbTerms", "Thỏa thuận & Bản quyền")}
            </span>
          </nav>

          {/* Title and Live Status Indicator */}
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-orange-500 via-orange-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20 shrink-0">
              <Scale size={22} className="stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight m-0">
                  {t("termsTitle", "Thỏa Thuận Cấp Phép & Điều Khoản Sử Dụng (EULA)")}
                </h1>
                {activeDocument && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Áp dụng: {activeDocument.code}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {t(
                  "termsSubtitle",
                  "Quản lý danh mục các văn bản thỏa thuận cấp phép bản quyền, điều khoản dịch vụ và chính sách tuân thủ pháp luật."
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0 self-start md:self-center flex-wrap sm:flex-nowrap">
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-400 border border-slate-300/90 rounded-xl shadow-xs transition-all duration-150 active:scale-95 disabled:opacity-50"
            title={t("btnRefreshTerms", "Làm mới từ Server")}
          >
            <RotateCw size={14} className={loading ? "animate-spin text-orange-500" : "text-slate-500"} />
            <span>{t("btnRefreshTerms", "Làm mới")}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowRbacModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-400 border border-slate-300/90 rounded-xl shadow-xs transition-all duration-150 active:scale-95"
            title="Xem ma trận phân quyền RBAC & Tiêu chuẩn bảo mật"
          >
            <Users size={15} className="text-purple-600" />
            <span>Ma trận RBAC</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 hover:from-orange-600 hover:to-amber-700 rounded-xl shadow-md shadow-orange-500/25 hover:shadow-lg hover:shadow-orange-500/30 transition-all duration-150 active:scale-95"
          >
            <Plus size={15} />
            <span>{t("btnCreateEula", "Soạn thảo văn bản mới")}</span>
          </button>
        </div>
      </div>

      {/* 2. Top Metric Stat Cards */}
      <TermsStatsCards metrics={metrics} />

      {/* 3. Main Card: Table & Filter */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden mb-10">
        <TermsTableFilter
          filteredCount={filteredDocuments.length}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          pageSize={pageSize}
          setPageSize={setPageSize}
          metrics={metrics}
        />

        <TermsTable
          paginatedItems={paginatedDocuments}
          filteredCount={filteredDocuments.length}
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          setCurrentPage={setCurrentPage}
          handleOpenView={handleOpenView}
          handleOpenEdit={handleOpenEdit}
          handleOpenDelete={handleOpenDelete}
          handleSetActive={handleSetActive}
          handleDuplicate={handleDuplicate}
          handleCopyText={handleCopyText}
          handleOpenCreate={handleOpenCreate}
        />
      </div>

      {/* 4. Modals */}
      {/* Editor Modal (Create & Edit with unified full-text editor) */}
      <TermsEditorModal
        show={showEditorModal}
        onClose={() => setShowEditorModal(false)}
        onSubmit={handleSaveSubmit}
        isCreating={isCreating}
        selectedDoc={selectedDoc}
        formData={formData}
        setFormData={setFormData}
        isSaving={isSaving}
      />

      {/* Official Legal Document Viewer & Print Modal */}
      <TermsViewModal
        show={showViewModal}
        onClose={() => setShowViewModal(false)}
        document={selectedDoc}
        onCopyText={handleCopyText}
        onOpenEdit={handleOpenEdit}
      />

      {/* Delete Confirmation Modal */}
      <TermsDeleteModal
        show={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onSubmit={handleDeleteSubmit}
        selectedDoc={selectedDoc}
      />

      {/* RBAC Matrix & Security Specs Modal */}
      <TermsRbacModal
        show={showRbacModal}
        onClose={() => setShowRbacModal(false)}
      />
    </div>
  );
};
