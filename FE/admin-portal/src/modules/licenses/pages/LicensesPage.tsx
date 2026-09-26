import React, { useState, useEffect, useCallback, useMemo } from "react";
import type { License } from "../../../core/types";
import { LicenseKpiCards } from "../components/LicenseKpiCards";
import { LicenseTable } from "../components/LicenseTable";
import { CreateLicenseModal } from "./modal/CreateLicenseModal";
import { EditLicenseModal } from "./modal/EditLicenseModal";
import { PermissionLicenseModal } from "./modal/PermissionLicenseModal";
import { ResetHwidModal } from "./modal/ResetHwidModal";
import { RenewLicenseModal } from "./modal/RenewLicenseModal";
import { licenseService } from "../services/licenseService";
import { confirmDialog, showToast } from "../../../core/swal";
import "../lang";

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
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState(propSearchTerm);
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [internalCreateModal, setInternalCreateModal] = useState(false);
  const [editingLicense, setEditingLicense] = useState<License | null>(null);
  const [permissionLicense, setPermissionLicense] = useState<License | null>(null);
  const [resettingHwidLicense, setResettingHwidLicense] = useState<License | null>(null);
  const [renewingLicense, setRenewingLicense] = useState<License | null>(null);

  const fetchLicensesData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await licenseService.getLicenses();
      setLocalLicenses(data);
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!propLicenses) {
      fetchLicensesData();
    }
  }, [propLicenses, fetchLicensesData]);

  useEffect(() => {
    if (propSearchTerm) {
      setSearchTerm(propSearchTerm);
    }
  }, [propSearchTerm]);

  const notify = useCallback(
    (msg: string, type: "success" | "error" = "success") => {
      showToast(msg, type);
      if (onNotify) onNotify(msg, type);
      else if (type === "error" && propSetError) propSetError(msg);
      else if (propSetMessage) propSetMessage(msg);
    },
    [onNotify, propSetError, propSetMessage]
  );

  const activeLicenses = propLicenses || localLicenses;

  const handleRefresh = async () => {
    if (propOnRefresh) await propOnRefresh();
    else await fetchLicensesData();
  };

  const showCreate = isCreateModalOpen || internalCreateModal;
  const closeCreate = () => {
    setInternalCreateModal(false);
    if (setIsCreateModalOpen) setIsCreateModalOpen(false);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    notify(`✓ Đã sao chép API Key ${text || id.slice(0, 8)}`, "success");
  };

  // Toggle active / blocked status
  const handleToggleStatus = async (lic: License) => {
    const nextStatus = lic.status === "active" ? "blocked" : "active";
    try {
      await licenseService.toggleStatus(lic.id, nextStatus);
      notify(
        nextStatus === "active"
          ? `Đã kích hoạt lại key của ${lic.customer_name}`
          : `Đã tạm khóa key của ${lic.customer_name}`,
        "success"
      );
      await handleRefresh();
    } catch (err: any) {
      notify(err?.message || "Không thể cập nhật trạng thái", "error");
    }
  };

  // Regenerate new key
  const handleRegenerateKey = async (lic: License) => {
    const confirmed = await confirmDialog({
      title: "Cấp lại chuỗi Key mới?",
      text: `Key cũ của "${lic.customer_name}" sẽ bị vô hiệu hóa ngay lập tức và cấp một mã key ngẫu nhiên mới!`,
    });
    if (!confirmed) return;

    try {
      const res = await licenseService.regenerateKey(lic.id);
      if ((res as any).key) {
        navigator.clipboard.writeText((res as any).key).catch(() => {});
      }
      notify(`Đã cấp lại Key mới thành công! Mã: ${(res as any).key || res.key_hint}`, "success");
      await handleRefresh();
    } catch (err: any) {
      notify(err?.message || "Lỗi cấp lại key", "error");
    }
  };

  // Delete key
  const handleDelete = async (lic: License) => {
    const confirmed = await confirmDialog({
      title: "Xác nhận xóa API Key?",
      text: `Bạn có chắc chắn muốn xóa vĩnh viễn Key của "${lic.customer_name}" (${lic.key_hint})? Hành động này không thể hoàn tác!`,
      isDestructive: true,
    });
    if (!confirmed) return;

    try {
      await licenseService.delete(lic.id);
      notify(`Đã xóa vĩnh viễn license của ${lic.customer_name}`, "success");
      await handleRefresh();
    } catch (err: any) {
      notify(err instanceof Error ? err.message : "Không xóa được license", "error");
    }
  };

  // Filter licenses
  const filteredLicenses = useMemo(() => {
    return activeLicenses.filter((lic) => {
      const diff = lic.expires_at ? new Date(lic.expires_at).getTime() - Date.now() : null;
      const isExpired = diff !== null && diff <= 0;
      const isExpiringSoon = diff !== null && diff > 0 && diff <= 7 * 24 * 60 * 60 * 1000;
      const isLifetime = !lic.expires_at;

      if (statusFilter === "active" && (lic.status !== "active" || isExpired)) return false;
      if (statusFilter === "blocked" && lic.status !== "blocked") return false;
      if (statusFilter === "expired" && !isExpired) return false;
      if (statusFilter === "expiring_soon" && !isExpiringSoon) return false;
      if (statusFilter === "lifetime" && !isLifetime) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchName = lic.customer_name?.toLowerCase().includes(q);
        const matchContact = lic.customer_contact?.toLowerCase().includes(q);
        const matchKey = lic.key_hint?.toLowerCase().includes(q);
        const matchHwid = lic.hwid?.toLowerCase().includes(q);
        if (!matchName && !matchContact && !matchKey && !matchHwid) return false;
      }
      return true;
    });
  }, [activeLicenses, statusFilter, searchTerm]);

  // Pagination
  const totalCount = filteredLicenses.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const paginatedLicenses = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLicenses.slice(start, start + pageSize);
  }, [filteredLicenses, currentPage, pageSize]);

  // KPI counts
  const activeCount = activeLicenses.filter((l) => {
    const diff = l.expires_at ? new Date(l.expires_at).getTime() - Date.now() : null;
    return l.status === "active" && (diff === null || diff > 0);
  }).length;
  const blockedCount = activeLicenses.filter((l) => l.status === "blocked").length;
  const rolesCount = activeLicenses.length > 0 ? 3 : 1; // Standard, Pro, Enterprise

  return (
    <div className="space-y-4">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-1">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>🔑 Quản Lý Bản Quyền & API Key</span>
          </h2>
          <p className="text-xs text-slate-500">
            Cấp phát, gia hạn, thiết lập hạn mức render và quản lý khóa máy HWID cho người dùng
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <LicenseKpiCards
        totalCount={activeLicenses.length}
        activeCount={activeCount}
        blockedCount={blockedCount}
        rolesCount={rolesCount}
      />

      {/* High-density Table with Toolbar & Full CRUD */}
      <LicenseTable
        licenses={paginatedLicenses}
        totalCount={totalCount}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
        onOpenCreate={() => setInternalCreateModal(true)}
        onRefresh={handleRefresh}
        loading={loading}
        onEdit={(lic) => setEditingLicense(lic)}
        onManagePermissions={(lic) => setPermissionLicense(lic)}
        onDelete={handleDelete}
        onRenew={(lic) => setRenewingLicense(lic)}
        onResetHwid={(lic) => setResettingHwidLicense(lic)}
        onRegenerateKey={handleRegenerateKey}
        onToggleStatus={handleToggleStatus}
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

      <PermissionLicenseModal
        license={permissionLicense}
        isOpen={Boolean(permissionLicense)}
        onClose={() => setPermissionLicense(null)}
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
    </div>
  );
};
