import React, { useState, useEffect, useCallback } from "react";
import type { License } from "../../../core/types";
import { useLicenses } from "../hooks/useLicenses";
import { LicenseKpiCards } from "../components/LicenseKpiCards";
import { LicenseTable } from "../components/LicenseTable";
import { CreateLicenseModal } from "./modal/CreateLicenseModal";
import { EditLicenseModal } from "./modal/EditLicenseModal";
import { ResetHwidModal } from "./modal/ResetHwidModal";
import { RenewLicenseModal } from "./modal/RenewLicenseModal";
import { licenseService } from "../services/licenseService";
import "../lang"; // Auto-registers licenses translation

interface LicensesPageProps {
  licenses?: License[];
  onRefresh?: () => Promise<void>;
  setMessage?: (msg: string) => void;
  setError?: (err: string) => void;
  isCreateModalOpen?: boolean;
  setIsCreateModalOpen?: (open: boolean) => void;
  searchTerm?: string;
  onNotify?: (msg: string, type?: "success" | "error") => void;
}

export const LicensesPage: React.FC<LicensesPageProps> = ({
  licenses: propLicenses,
  onRefresh: propOnRefresh,
  setMessage: propSetMessage,
  setError: propSetError,
  isCreateModalOpen = false,
  setIsCreateModalOpen,
  searchTerm: propSearchTerm = "",
  onNotify,
}) => {
  const [localLicenses, setLocalLicenses] = useState<License[]>(propLicenses || []);
  const activeLicenses = propLicenses || localLicenses;

  const fetchLicensesData = useCallback(async () => {
    try {
      const data = await licenseService.getLicenses();
      setLocalLicenses(data);
    } catch {
      // Handled
    }
  }, []);

  useEffect(() => {
    if (!propLicenses) {
      fetchLicensesData();
    }
  }, [propLicenses, fetchLicensesData]);

  const notify = (msg: string, type: "success" | "error" = "success") => {
    if (onNotify) onNotify(msg, type);
    else if (type === "error" && propSetError) propSetError(msg);
    else if (propSetMessage) propSetMessage(msg);
  };

  const {
    searchTerm,
    setSearchTerm,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalPages,
    paginatedLicenses,
    totalCount,
    activeCount,
    blockedCount,
    rolesCount,
  } = useLicenses(activeLicenses);

  useEffect(() => {
    if (propSearchTerm) {
      setSearchTerm(propSearchTerm);
    }
  }, [propSearchTerm, setSearchTerm]);

  const [internalCreateModal, setInternalCreateModal] = useState(false);
  const [editingLicense, setEditingLicense] = useState<License | null>(null);
  const [resettingHwidLicense, setResettingHwidLicense] = useState<License | null>(null);
  const [renewingLicense, setRenewingLicense] = useState<License | null>(null);

  const showCreate = isCreateModalOpen || internalCreateModal;
  const closeCreate = () => {
    setInternalCreateModal(false);
    if (setIsCreateModalOpen) setIsCreateModalOpen(false);
  };

  const handleRefresh = async () => {
    if (propOnRefresh) await propOnRefresh();
    else await fetchLicensesData();
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    notify(`✓ Đã copy API key cho license ${id.slice(0, 8)}...`, "success");
  };

  const handleDelete = async (lic: License) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa license của ${lic.customer_name}? Hành động này không thể hoàn tác.`)) {
      return;
    }
    try {
      await licenseService.delete(lic.id);
      notify(`Đã xóa vĩnh viễn license của ${lic.customer_name}`, "success");
      await handleRefresh();
    } catch (err: any) {
      notify(err instanceof Error ? err.message : "Không xóa được license", "error");
    }
  };

  return (
    <>
      <LicenseKpiCards
        totalCount={totalCount}
        activeCount={activeCount}
        blockedCount={blockedCount}
        rolesCount={rolesCount}
      />

      <LicenseTable
        licenses={paginatedLicenses}
        totalCount={totalCount}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
        onEdit={(lic) => setEditingLicense(lic)}
        onDelete={handleDelete}
        onCopyHint={handleCopy}
      />

      {/* Modals */}
      <CreateLicenseModal
        isOpen={showCreate}
        onClose={closeCreate}
        onSuccess={(msg) => {
          notify(msg, "success");
          void handleRefresh();
        }}
      />

      <EditLicenseModal
        license={editingLicense}
        isOpen={Boolean(editingLicense)}
        onClose={() => setEditingLicense(null)}
        onSuccess={(msg) => {
          notify(msg, "success");
          void handleRefresh();
        }}
      />

      <ResetHwidModal
        license={resettingHwidLicense}
        isOpen={Boolean(resettingHwidLicense)}
        onClose={() => setResettingHwidLicense(null)}
        onSuccess={(msg) => {
          notify(msg, "success");
          void handleRefresh();
        }}
      />

      <RenewLicenseModal
        license={renewingLicense}
        isOpen={Boolean(renewingLicense)}
        onClose={() => setRenewingLicense(null)}
        onSuccess={(msg) => {
          notify(msg, "success");
          void handleRefresh();
        }}
      />
    </>
  );
};
