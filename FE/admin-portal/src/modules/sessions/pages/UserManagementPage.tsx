import React from "react";
import {
  RotateCw,
  UserPlus,
  Home,
  ChevronRight,
  Users,
  Wifi,
} from "lucide-react";
import {
  useUserManagement,
  type StatusFilter,
} from "../hooks/useUserManagement";
import { UserStatsCards } from "../components/UserStatsCards";
import { UserTableFilter } from "../components/UserTableFilter";
import { UserTable } from "../components/UserTable";
import { CreateUserModal } from "../components/CreateUserModal";
import { RenewSubscriptionModal } from "../components/RenewSubscriptionModal";
import { EditUserModal } from "../components/EditUserModal";
import { ResetHwidModal } from "../components/ResetHwidModal";
import { DeleteUserModal } from "../components/DeleteUserModal";
import { LegalCertificateModal } from "../components/LegalCertificateModal";
import { generatePlaceholderHwid } from "../hooks/useUserManagement";
import { showToast } from "../../../core/swal";
import { useI18n } from "../../../core/i18n";
import "../lang"; // Auto-registers sessions translations

export type { StatusFilter };

export interface UserManagementPageProps {
  searchTerm?: string;
  onNotify?: (msg: string, type?: "success" | "error") => void;
}

export const UserManagementPage: React.FC<UserManagementPageProps> = ({
  searchTerm: externalSearch = "",
  onNotify,
}) => {
  const { t } = useI18n();
  const {
    loading,
    copiedKey,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    showCreateModal,
    setShowCreateModal,
    showRenewModal,
    setShowRenewModal,
    showEditModal,
    setShowEditModal,
    showResetHwidModal,
    setShowResetHwidModal,
    showDeleteModal,
    setShowDeleteModal,
    showLegalModal,
    setShowLegalModal,
    legalCertLicense,
    selectedLicense,
    actionLoading,
    createForm,
    setCreateForm,
    renewForm,
    setRenewForm,
    editForm,
    setEditForm,
    resetHwidForm,
    setResetHwidForm,
    metrics,
    filteredItems,
    paginatedItems,
    totalPages,
    fetchData,
    handleCopy,
    handleOpenCreate,
    handlePlanPresetChange,
    handleCreateSubmit,
    handleOpenRenew,
    handleRenewQuickPreset,
    handleRenewSubmit,
    handleOpenEdit,
    handleRegenerateKey,
    handleEditSubmit,
    handleOpenResetHwid,
    handleResetHwidSubmit,
    handleToggleStatus,
    handleTerminateSession,
    handleOpenDelete,
    handleDeleteSubmit,
    handleOpenLegalCert,
  } = useUserManagement({ externalSearch, onNotify });

  return (
    <div className="w-full max-w-full space-y-6">
      {/* 1. Redesigned Premium Header with Breadcrumb & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          {/* Breadcrumb Navigation Trail */}
          <nav className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-2.5">
            <span className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 transition-colors">
              <Home size={12} className="text-slate-400" />
              <span>{t("breadcrumbJacs")}</span>
            </span>
            <ChevronRight size={12} className="text-slate-300" />
            <span className="text-slate-500">{t("breadcrumbAdmin")}</span>
            <ChevronRight size={12} className="text-slate-300" />
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-orange-500/10 text-orange-700 border border-orange-500/20">
              {t("breadcrumbSessions")}
            </span>
          </nav>

          {/* Title and Live Status Indicator */}
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-orange-500 via-orange-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20 shrink-0">
              <Users size={22} className="stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight m-0">
                  {t("sessionsPageTitle")}
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 shadow-2xs">
                  <Wifi size={11} className="text-emerald-600 animate-pulse" />
                  <span>{metrics.online} {t("badgeOnlineCount", "Online")}</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {t("sessionsPageSubtitle")}
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
            title={t("btnRefresh")}
          >
            <RotateCw size={14} className={loading ? "animate-spin text-orange-500" : "text-slate-500"} />
            <span>{t("btnRefresh")}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 hover:from-orange-600 hover:to-amber-700 rounded-xl shadow-md shadow-orange-500/25 hover:shadow-lg hover:shadow-orange-500/30 transition-all duration-150 active:scale-95"
          >
            <UserPlus size={15} />
            <span>{t("btnCreateUser")}</span>
          </button>
        </div>
      </div>

      {/* 2. Top Metric Stat Cards */}
      <UserStatsCards metrics={metrics} />

      {/* 3. Main Card: Table & Filter */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-10">
        <UserTableFilter
          filteredCount={filteredItems.length}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          pageSize={pageSize}
          setPageSize={setPageSize}
          metrics={metrics}
        />

        <UserTable
          paginatedItems={paginatedItems}
          filteredCount={filteredItems.length}
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          setCurrentPage={setCurrentPage}
          copiedKey={copiedKey}
          handleCopy={handleCopy}
          handleRegenerateKey={handleRegenerateKey}
          handleOpenLegalCert={handleOpenLegalCert}
          handleOpenRenew={handleOpenRenew}
          handleOpenEdit={handleOpenEdit}
          handleOpenResetHwid={handleOpenResetHwid}
          handleToggleStatus={handleToggleStatus}
          handleTerminateSession={handleTerminateSession}
          handleOpenDelete={handleOpenDelete}
        />
      </div>

      {/* Modals */}
      <CreateUserModal
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateSubmit}
        createForm={createForm}
        setCreateForm={setCreateForm}
        handlePlanPresetChange={handlePlanPresetChange}
        generatePlaceholderHwid={generatePlaceholderHwid}
        actionLoading={actionLoading}
      />

      <RenewSubscriptionModal
        show={showRenewModal}
        onClose={() => setShowRenewModal(false)}
        onSubmit={handleRenewSubmit}
        selectedLicense={selectedLicense}
        renewForm={renewForm}
        setRenewForm={setRenewForm}
        handleRenewQuickPreset={handleRenewQuickPreset}
        actionLoading={actionLoading}
      />

      <EditUserModal
        show={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSubmit={handleEditSubmit}
        selectedLicense={selectedLicense}
        editForm={editForm}
        setEditForm={setEditForm}
        handleCopy={handleCopy}
        copiedKey={copiedKey}
        handleRegenerateKey={handleRegenerateKey}
        actionLoading={actionLoading}
      />

      <ResetHwidModal
        show={showResetHwidModal}
        onClose={() => setShowResetHwidModal(false)}
        onSubmit={handleResetHwidSubmit}
        selectedLicense={selectedLicense}
        resetHwidForm={resetHwidForm}
        setResetHwidForm={setResetHwidForm}
        generatePlaceholderHwid={generatePlaceholderHwid}
        actionLoading={actionLoading}
      />

      <DeleteUserModal
        show={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onSubmit={handleDeleteSubmit}
        selectedLicense={selectedLicense}
        actionLoading={actionLoading}
      />

      <LegalCertificateModal
        show={showLegalModal}
        onClose={() => setShowLegalModal(false)}
        license={legalCertLicense}
        notify={(msg, type) => showToast(msg, type || "success")}
      />
    </div>
  );
};
