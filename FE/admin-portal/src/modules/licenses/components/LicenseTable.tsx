import React from "react";
import { Building2, KeyRound, Shield, Pencil, Trash2, Search } from "lucide-react";
import type { License } from "../../../core/types";
import { useI18n } from "../../../core/i18n";
import { Pagination } from "../../../components/common/Pagination";

interface LicenseTableProps {
  licenses: License[];
  totalCount: number;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onEdit: (lic: License) => void;
  onDelete: (lic: License) => void;
  onCopyHint: (hint: string, id: string) => void;
}

export const LicenseTable: React.FC<LicenseTableProps> = ({
  licenses,
  totalCount,
  searchTerm,
  onSearchChange,
  currentPage,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onEdit,
  onDelete,
  onCopyHint,
}) => {
  const { t } = useI18n();

  return (
    <div className="mf-card-panel">
      {/* Table Panel Header */}
      <div className="table-panel-header">
        <div className="table-title-group">
          <h3>{t("tableTitle")}</h3>
          <span>{totalCount} {t("tableSubtitleSuffix")}</span>
        </div>

        <div className="table-search-box">
          <Search size={14} color="#94a3b8" />
          <input
            type="text"
            placeholder={t("searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      {/* Page Size Selector Bar */}
      <div className="table-controls-bar">
        <div className="page-size-selector">
          <span>{t("pageSizeShow")}</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <span>{t("pageSizeSuffix")}</span>
        </div>
      </div>

      <div className="table-responsive">
        <table className="mf-table">
          <thead>
            <tr>
              <th>{t("thUser")}</th>
              <th>{t("thRole")}</th>
              <th>{t("thAccount")}</th>
              <th>{t("thApiKey")}</th>
              <th>{t("thCreatedDate")}</th>
              <th>{t("thStatus")}</th>
              <th>{t("thSecurity")}</th>
              <th style={{ textAlign: "right" }}>{t("thActions")}</th>
            </tr>
          </thead>
          <tbody>
            {licenses.map((lic) => {
              const initials = lic.customer_name
                .split(" ")
                .filter(Boolean)
                .map((p: string) => p[0])
                .slice(0, 2)
                .join("")
                .toUpperCase() || "US";

              const createdDateFormatted = new Date(lic.created_at).toLocaleString("en-US", {
                month: "numeric",
                day: "numeric",
                year: "2-digit",
                hour: "numeric",
                minute: "numeric",
                hour12: true,
              });

              return (
                <tr key={lic.id}>
                  {/* 1. NGƯỜI DÙNG */}
                  <td>
                    <div className="user-cell-flex">
                      <div className="user-avatar-initials">
                        {initials}
                      </div>
                      <div className="user-names-group">
                        <span className="user-name-bold">{lic.customer_name}</span>
                        <span className="user-email-muted">
                          {lic.customer_contact || `${lic.customer_name.toLowerCase().replace(/\s+/g, "")}@gmail.com`}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* 2. VAI TRÒ */}
                  <td>
                    <span className="badge-role-user">USER</span>
                  </td>

                  {/* 3. TÀI KHOẢN / DOANH NGHIỆP */}
                  <td>
                    <div className="enterprise-cell-flex">
                      <div className="enterprise-icon-squircle">
                        <Building2 size={16} />
                      </div>
                      <div className="enterprise-details">
                        <span className="enterprise-name">{lic.customer_name}</span>
                        <span className="enterprise-subtext">ACCOUNT_FINANCE_USER · ACTIVE</span>
                      </div>
                    </div>
                  </td>

                  {/* 4. API KEY */}
                  <td>
                    {lic.key_hint ? (
                      <div
                        className="api-key-chip"
                        title={lic.hwid}
                        onClick={() => onCopyHint(lic.key_hint, lic.id)}
                        style={{ cursor: "pointer" }}
                      >
                        <KeyRound size={12} className="key-icon" />
                        <span>test</span>
                        <span style={{ color: "#94a3b8", fontSize: "0.68rem" }}>{lic.key_hint.slice(-8)}</span>
                      </div>
                    ) : (
                      <span className="api-key-none">{t("noApiKey")}</span>
                    )}
                  </td>

                  {/* 5. NGÀY TẠO */}
                  <td style={{ color: "#64748b", fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                    {createdDateFormatted}
                  </td>

                  {/* 6. TRẠNG THÁI */}
                  <td>
                    <span className={`pill-status-mf ${lic.status === "active" ? "status-active" : lic.status === "blocked" ? "status-locked" : "status-expired"}`}>
                      ● {lic.status === "active" ? t("statusActivePill") : lic.status === "blocked" ? t("statusLockedPill") : t("statusExpiredPill")}
                    </span>
                  </td>

                  {/* 7. BẢO MẬT */}
                  <td>
                    <span className="pill-security-mf">
                      <Shield size={12} /> {t("securityNormal")}
                    </span>
                  </td>

                  {/* 8. THAO TÁC */}
                  <td style={{ textAlign: "right" }}>
                    <div className="table-actions-row">
                      <button
                        type="button"
                        className="btn-icon-action action-edit"
                        onClick={() => onEdit(lic)}
                        title={t("edit")}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        className="btn-icon-action action-delete"
                        onClick={() => onDelete(lic)}
                        title={t("delete")}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {licenses.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                  {t("noLicensesFound")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
        totalItems={totalCount}
        pageSize={pageSize}
        pageSizeOptions={[5, 10, 20, 50, 100]}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
};
