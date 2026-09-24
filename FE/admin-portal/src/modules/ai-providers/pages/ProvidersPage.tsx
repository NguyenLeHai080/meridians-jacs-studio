import React from "react";
import { useProvidersManagement } from "../hooks/useProvidersManagement";
import { ProviderHeader } from "../components/ProviderHeader";
import { ProviderActiveBanner } from "../components/ProviderActiveBanner";
import { ProviderStatsCards } from "../components/ProviderStatsCards";
import { ProviderTableFilter } from "../components/ProviderTableFilter";
import { ProviderTable } from "../components/ProviderTable";
import { ProviderFailoverCard } from "../components/ProviderFailoverCard";
import { ProviderEditorModal } from "../components/ProviderEditorModal";
import { ProviderDeleteModal } from "../components/ProviderDeleteModal";

export interface ProvidersPageProps {
  searchTerm?: string;
  onNotify?: (msg: string, type?: "success" | "error") => void;
}

export const ProvidersPage: React.FC<ProvidersPageProps> = ({
  searchTerm: externalSearch = "",
  onNotify,
}) => {
  const {
    providers,
    primaryProvider,
    totalModelsCount,
    loading,
    isSaving,
    searchQuery,
    setSearchQuery,
    filterTab,
    setFilterTab,
    viewMode,
    setViewMode,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    filteredList,
    paginatedList,
    totalPages,
    // Modals
    showEditorModal,
    setShowEditorModal,
    isCreating,
    selectedProvider,
    showDeleteModal,
    setShowDeleteModal,
    providerToDelete,
    // Latency
    testingId,
    isTestingAll,
    latencies,
    // Key & copy
    revealedKeys,
    toggleKeyReveal,
    handleCopy,
    // Failover
    failoverConfig,
    setFailoverConfig,
    isSavingFailover,
    handleSaveFailover,
    // Actions
    fetchData,
    handleOpenCreate,
    handleOpenEdit,
    handleOpenDelete,
    handleDeleteSubmit,
    handleTestLatency,
    handleTestAllLatencies,
    handleSetPrimary,
    handleSaveSubmit,
  } = useProvidersManagement({ externalSearch, onNotify });

  return (
    <div className="w-full max-w-full space-y-6 pb-12">
      {/* 1. Header with Title, Badges & Action Buttons */}
      <ProviderHeader
        loading={loading}
        onRefresh={fetchData}
        onOpenCreate={handleOpenCreate}
      />

      {/* 2. Dark Banner: Active Primary Gateway */}
      <ProviderActiveBanner
        primaryProvider={primaryProvider}
        isTestingAll={isTestingAll}
        hasProviders={providers.length > 0}
        onTestAllLatencies={handleTestAllLatencies}
      />

      {/* 3. Top 4 Metric Stat Cards */}
      <ProviderStatsCards
        primaryProvider={primaryProvider}
        latencies={latencies}
        activeCount={providers.filter((p) => p.enabled).length}
        totalModelsCount={totalModelsCount}
      />

      {/* 4. Main Card: Filter Toolbar & Data Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <ProviderTableFilter
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filterTab={filterTab}
          setFilterTab={setFilterTab}
          viewMode={viewMode}
          setViewMode={setViewMode}
          totalCount={providers.length}
          activeCount={providers.filter((p) => p.enabled).length}
        />

        <ProviderTable
          viewMode={viewMode}
          loading={loading}
          paginatedProviders={paginatedList}
          totalFilteredCount={filteredList.length}
          latencies={latencies}
          revealedKeys={revealedKeys}
          testingId={testingId}
          pageSize={pageSize}
          currentPage={currentPage}
          totalPages={totalPages}
          onSetPageSize={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
          onSetCurrentPage={setCurrentPage}
          onCopy={handleCopy}
          onToggleKeyReveal={toggleKeyReveal}
          onTestLatency={handleTestLatency}
          onSetPrimary={handleSetPrimary}
          onOpenEdit={handleOpenEdit}
          onOpenDelete={handleOpenDelete}
        />
      </div>

      {/* 5. Failover Engine Configuration Card */}
      <ProviderFailoverCard
        failoverConfig={failoverConfig}
        setFailoverConfig={setFailoverConfig}
        isSavingFailover={isSavingFailover}
        onSaveFailover={handleSaveFailover}
      />

      {/* 6. Modal: Create / Edit Provider */}
      <ProviderEditorModal
        isOpen={showEditorModal}
        isCreating={isCreating}
        provider={selectedProvider}
        isSaving={isSaving}
        onClose={() => setShowEditorModal(false)}
        onSave={handleSaveSubmit}
      />

      {/* 7. Modal: Delete Provider Confirmation */}
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
