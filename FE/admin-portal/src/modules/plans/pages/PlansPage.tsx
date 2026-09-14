import React from "react";
import {
  RotateCw,
  Plus,
  Coins,
  Sparkles,
  Save,
  Home,
  ChevronRight,
  Package,
  Layers,
  Sliders,
  Clock,
  Wallet,
} from "lucide-react";
import { usePlansManagement } from "../hooks/usePlansManagement";
import { CreditStatsCards } from "../components/CreditStatsCards";
import { CreditRateConfigCard } from "../components/CreditRateConfigCard";
import { CreditPackagesGrid } from "../components/CreditPackagesGrid";
import { CreditPackageModal } from "../components/CreditPackageModal";
import { CreditPackageDeleteModal } from "../components/CreditPackageDeleteModal";
import { CreditTopupTable } from "../components/CreditTopupTable";
import { CreditTopupActionModal } from "../components/CreditTopupActionModal";
import { useI18n } from "../../../core/i18n";
import "../lang"; // Auto-registers plans translations

export interface PlansPageProps {
  searchTerm?: string;
  onNotify?: (msg: string, type?: "success" | "error") => void;
}

export const PlansPage: React.FC<PlansPageProps> = ({
  searchTerm: externalSearch = "",
  onNotify,
}) => {
  const { t } = useI18n();

  const {
    activeTab,
    setActiveTab,
    loading,
    saveLoading,
    txActionLoading,
    creditConfig,
    setCreditConfig,
    packages,
    transactions,
    metrics,
    simulation,
    simAmount,
    setSimAmount,
    // Transactions Filtering & Pagination
    searchFilter,
    setSearchFilter,
    statusFilter,
    setStatusFilter,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    filteredTransactions,
    paginatedTransactions,
    totalPages,
    // Package Modal
    showPackageModal,
    setShowPackageModal,
    isEditingPackage,
    packageForm,
    setPackageForm,
    updatePackageFormPrice,
    updatePackageFormBonus,
    showDeletePkgModal,
    setShowDeletePkgModal,
    pkgToDelete,
    // Transaction Action Modals
    showApproveModal,
    setShowApproveModal,
    txToApprove,
    showRejectModal,
    setShowRejectModal,
    txToReject,
    // Actions
    fetchData,
    handleSaveCreditConfig,
    handleOpenCreatePackage,
    handleOpenEditPackage,
    handleSavePackageSubmit,
    handleTogglePackageStatus,
    handleOpenDeletePackage,
    handleDeletePackageSubmit,
    handleOpenApproveTopup,
    handleApproveTopupSubmit,
    handleOpenRejectTopup,
    handleRejectTopupSubmit,
  } = usePlansManagement({ externalSearch, onNotify });

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
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-orange-500/10 text-orange-700 border border-orange-500/20">
              {t("breadcrumbPlans", "Gói Credit & Đơn Nạp Desktop")}
            </span>
          </nav>

          {/* Title and Live Status Indicators */}
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-orange-500 via-orange-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20 shrink-0">
              <Coins size={22} className="stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight m-0">
                  {t("plansTitle", "Quản Lý Gói Credit & Đơn Nạp Desktop Realtime")}
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 shadow-2xs">
                  <Sparkles size={11} className="text-emerald-600" />
                  <span>{metrics.activePackages} {t("badgeActivePackages", "Gói Active")}</span>
                </span>
                {metrics.pendingTopups > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-700 border border-amber-500/20 shadow-2xs animate-pulse">
                    <Clock size={11} className="text-amber-600" />
                    <span>{metrics.pendingTopups} {t("badgePendingTopups", "Đơn chờ duyệt")}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {t(
                  "plansSubtitle",
                  "Thiết lập cấu hình tỷ giá quy đổi Token AI, quản lý danh sách gói nạp Credit và xét duyệt đơn thanh toán từ ứng dụng Desktop."
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
            className="inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-400 border border-slate-300/90 rounded-xl shadow-xs transition-all duration-150 active:scale-95 disabled:opacity-50 cursor-pointer"
            title={t("btnRefreshPlans", "Làm mới")}
          >
            <RotateCw
              size={14}
              className={loading ? "animate-spin text-orange-500" : "text-slate-500"}
            />
            <span>{t("btnRefreshPlans", "Làm mới")}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreatePackage}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 hover:from-orange-600 hover:to-amber-700 rounded-xl shadow-md shadow-orange-500/25 hover:shadow-lg hover:shadow-orange-500/30 transition-all duration-150 active:scale-95 cursor-pointer"
          >
            <Plus size={15} />
            <span>{t("btnAddPackage", "Tạo Gói Mới")}</span>
          </button>
        </div>
      </div>

      {/* 2. Top Metric Stat Cards */}
      <CreditStatsCards metrics={metrics} />

      {/* 3. Section Switcher Tabs */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100/90 border border-slate-200/90 text-xs font-bold self-start max-w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("packages")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === "packages"
              ? "bg-white text-orange-700 shadow-sm shadow-slate-200"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Package size={15} className={activeTab === "packages" ? "text-orange-600" : "text-slate-400"} />
          <span>{t("tabPackages", "Danh Sách Gói Credit")}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-600">
            {packages.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("transactions")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === "transactions"
              ? "bg-white text-orange-700 shadow-sm shadow-slate-200"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Clock size={15} className={activeTab === "transactions" ? "text-orange-600" : "text-slate-400"} />
          <span>{t("tabTransactions", "Đơn Nạp Desktop Realtime")}</span>
          {metrics.pendingTopups > 0 ? (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-amber-500 text-white animate-pulse">
              {metrics.pendingTopups}
            </span>
          ) : (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-600">
              {transactions.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("rates")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === "rates"
              ? "bg-white text-orange-700 shadow-sm shadow-slate-200"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Sliders size={15} className={activeTab === "rates" ? "text-orange-600" : "text-slate-400"} />
          <span>{t("tabRateConfig", "Tỷ Giá & Giả Lập")}</span>
        </button>
      </div>

      {/* 4. Active Tab Content View */}
      {activeTab === "packages" && (
        <CreditPackagesGrid
          packages={packages}
          loading={loading}
          onOpenCreate={handleOpenCreatePackage}
          onOpenEdit={handleOpenEditPackage}
          onOpenDelete={handleOpenDeletePackage}
          onToggleStatus={handleTogglePackageStatus}
        />
      )}

      {activeTab === "transactions" && (
        <CreditTopupTable
          transactions={transactions}
          paginatedTransactions={paginatedTransactions}
          loading={loading}
          searchFilter={searchFilter}
          setSearchFilter={setSearchFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          pageSize={pageSize}
          setPageSize={setPageSize}
          totalPages={totalPages}
          filteredCount={filteredTransactions.length}
          onOpenApprove={handleOpenApproveTopup}
          onOpenReject={handleOpenRejectTopup}
        />
      )}

      {activeTab === "rates" && (
        <CreditRateConfigCard
          creditConfig={creditConfig}
          setCreditConfig={setCreditConfig}
          saveLoading={saveLoading}
          onSaveConfig={handleSaveCreditConfig}
          simAmount={simAmount}
          setSimAmount={setSimAmount}
          simulation={simulation}
        />
      )}

      {/* 5. Credit Package Modal (Create / Edit) */}
      <CreditPackageModal
        isOpen={showPackageModal}
        isEditing={isEditingPackage}
        form={packageForm}
        setForm={setPackageForm}
        onPriceChange={updatePackageFormPrice}
        onBonusChange={updatePackageFormBonus}
        isSaving={saveLoading}
        onClose={() => setShowPackageModal(false)}
        onSubmit={handleSavePackageSubmit}
      />

      {/* 6. Credit Package Delete Modal */}
      <CreditPackageDeleteModal
        isOpen={showDeletePkgModal}
        pkg={pkgToDelete}
        isLoading={saveLoading}
        onClose={() => setShowDeletePkgModal(false)}
        onConfirm={handleDeletePackageSubmit}
      />

      {/* 7. Topup Action Modal (Approve / Reject) */}
      <CreditTopupActionModal
        isOpen={showApproveModal}
        type="approve"
        transaction={txToApprove}
        isLoading={txActionLoading}
        onClose={() => setShowApproveModal(false)}
        onConfirm={handleApproveTopupSubmit}
      />

      <CreditTopupActionModal
        isOpen={showRejectModal}
        type="reject"
        transaction={txToReject}
        isLoading={txActionLoading}
        onClose={() => setShowRejectModal(false)}
        onConfirm={handleRejectTopupSubmit}
      />
    </div>
  );
};

export default PlansPage;
