import React from "react";
import {
  Eye,
  Edit3,
  Trash2,
  Copy,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
} from "lucide-react";
import type { EulaDocument } from "../types";
import { useI18n } from "../../../core/i18n";

interface TermsTableProps {
  paginatedItems: EulaDocument[];
  filteredCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  setCurrentPage: (page: number) => void;
  handleOpenView: (doc: EulaDocument) => void;
  handleOpenEdit: (doc: EulaDocument) => void;
  handleOpenDelete: (doc: EulaDocument) => void;
  handleSetActive: (doc: EulaDocument) => void;
  handleDuplicate: (doc: EulaDocument) => void;
  handleCopyText: (text: string) => void;
  handleOpenCreate: () => void;
}

export const TermsTable: React.FC<TermsTableProps> = ({
  paginatedItems,
  filteredCount,
  currentPage,
  totalPages,
  pageSize,
  setCurrentPage,
  handleOpenView,
  handleOpenEdit,
  handleOpenDelete,
  handleSetActive,
  handleDuplicate,
  handleOpenCreate,
}) => {
  const { t } = useI18n();

  const getCategoryLabel = (category: EulaDocument["category"]) => {
    switch (category) {
      case "enterprise":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            {t("categoryEnterprise", "Doanh nghiệp (Enterprise)")}
          </span>
        );
      case "ai_policy":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200">
            {t("categoryAiPolicy", "Chính sách AI BYOK")}
          </span>
        );
      case "security":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
            {t("categorySecurity", "Bảo mật & Mã nguồn")}
          </span>
        );
      case "standard":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            {t("categoryStandard", "Cá nhân (Standard)")}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {t("categoryCustom", "Quy chế chung")}
          </span>
        );
    }
  };

  const getStatusBadge = (status: EulaDocument["status"]) => {
    switch (status) {
      case "active":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>{t("statusActive", "Có hiệu lực thi hành")}</span>
          </span>
        );
      case "draft":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>{t("statusDraft", "Dự thảo văn bản")}</span>
          </span>
        );
      case "archived":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <span>{t("statusArchived", "Hết hiệu lực (Lưu trữ)")}</span>
          </span>
        );
    }
  };

  // If no items
  if (paginatedItems.length === 0) {
    return (
      <div className="py-16 px-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
          <FileText size={24} />
        </div>
        <h3 className="text-sm font-bold text-slate-800 mb-1">
          {t("noTermsFound", "Chưa có văn bản quy chế nào")}
        </h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
          {t("noTermsDesc", "Hệ thống chưa tìm thấy văn bản phù hợp với bộ lọc hiện tại.")}
        </p>
        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 hover:from-orange-600 hover:to-amber-700 rounded-xl shadow-sm transition-all"
        >
          <span>{t("btnCreateFirstDoc", "Soạn thảo văn bản mới")}</span>
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* 1. Desktop Table Grid (lg and above) */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200/90 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-3.5 pl-6 pr-4">{t("colDocCode", "Số / Ký hiệu văn bản")}</th>
              <th className="py-3.5 px-4">{t("colDocTitle", "Tên văn bản / Trích yếu nội dung")}</th>
              <th className="py-3.5 px-4 text-center">{t("colDocStatus", "Hiệu lực")}</th>
              <th className="py-3.5 px-4">{t("colDocScope", "Căn cứ & Phạm vi áp dụng")}</th>
              <th className="py-3.5 px-4">{t("colDocDate", "Ngày ban hành")}</th>
              <th className="py-3.5 pr-6 pl-4 text-right">{t("colDocActions", "Thao tác")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {paginatedItems.map((doc) => {
              const isDocActive = doc.status === "active";
              return (
                <tr
                  key={doc.id}
                  className={`hover:bg-slate-50/70 transition-colors ${
                    isDocActive ? "bg-emerald-50/10" : ""
                  }`}
                >
                  {/* Col 1: Code & Version */}
                  <td className="py-4 pl-6 pr-4 align-top whitespace-nowrap">
                    <div className="font-mono font-bold text-slate-900 text-xs tracking-tight">
                      {doc.code}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                        {doc.version}
                      </span>
                    </div>
                  </td>

                  {/* Col 2: Title & Category */}
                  <td className="py-4 px-4 align-top max-w-md">
                    <div
                      onClick={() => handleOpenView(doc)}
                      className="font-bold text-slate-900 hover:text-orange-600 cursor-pointer transition-colors leading-snug"
                      title={doc.title}
                    >
                      {doc.title}
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      {getCategoryLabel(doc.category)}
                      {doc.legal_basis && doc.legal_basis.length > 0 && (
                        <span className="text-[11px] text-slate-400">
                          {doc.legal_basis.length} căn cứ pháp lý
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Col 3: Status */}
                  <td className="py-4 px-4 align-top text-center whitespace-nowrap">
                    {getStatusBadge(doc.status)}
                  </td>

                  {/* Col 4: Compliance & Requirements */}
                  <td className="py-4 px-4 align-top">
                    <div className="flex flex-col gap-1 text-[11px] text-slate-700">
                      {doc.requires_hwid_binding && (
                        <span>• {t("chkHwidBinding", "Khóa phần cứng thiết bị (HWID)")}</span>
                      )}
                      {doc.requires_content_disclaimer && (
                        <span>• {t("chkAiDisclaimer", "Miễn trừ trách nhiệm bản quyền nội dung")}</span>
                      )}
                      <span className="text-slate-400 text-[10.5px]">
                        {t("metaStandardBadge", "Chuẩn Nghị định 30/2020/NĐ-CP")}
                      </span>
                    </div>
                  </td>

                  {/* Col 5: Last Updated & Author */}
                  <td className="py-4 px-4 align-top whitespace-nowrap">
                    <div className="font-semibold text-slate-800 text-xs">
                      {new Date(doc.updated_at).toLocaleDateString("vi-VN")}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {doc.updated_by || "Ban Pháp chế JACS"}
                    </div>
                  </td>

                  {/* Col 6: Actions Toolbar */}
                  <td className="py-4 pr-6 pl-4 align-top text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      {/* View */}
                      <button
                        type="button"
                        onClick={() => handleOpenView(doc)}
                        className="p-2 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                        title={t("actionViewDoc", "Xem toàn văn & In")}
                      >
                        <Eye size={15} />
                      </button>

                      {/* Edit */}
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(doc)}
                        className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title={t("actionEditDoc", "Chỉnh sửa nội dung")}
                      >
                        <Edit3 size={15} />
                      </button>

                      {/* Set Active */}
                      {!isDocActive && (
                        <button
                          type="button"
                          onClick={() => handleSetActive(doc)}
                          className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title={t("actionActivateDoc", "Ban hành & Áp dụng chính thức")}
                        >
                          <CheckCircle2 size={15} />
                        </button>
                      )}

                      {/* Duplicate */}
                      <button
                        type="button"
                        onClick={() => handleDuplicate(doc)}
                        className="p-2 text-slate-500 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
                        title={t("actionDuplicateDoc", "Tạo bản sao dự thảo")}
                      >
                        <Copy size={15} />
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleOpenDelete(doc)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title={t("actionDeleteDoc", "Xóa văn bản")}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 2. Mobile Responsive Cards View (less than lg) */}
      <div className="block lg:hidden divide-y divide-slate-100">
        {paginatedItems.map((doc) => {
          const isDocActive = doc.status === "active";
          return (
            <div
              key={doc.id}
              className={`p-4 transition-colors ${
                isDocActive ? "bg-emerald-50/20" : "hover:bg-slate-50/60"
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div className="font-mono font-bold text-xs text-slate-900">
                    {doc.code}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {t("lblDocVersion", "Phiên bản")}: <span className="font-semibold text-slate-700">{doc.version}</span>
                  </div>
                </div>
                <div>{getStatusBadge(doc.status)}</div>
              </div>

              <div
                onClick={() => handleOpenView(doc)}
                className="font-bold text-slate-900 text-xs leading-snug mb-2 cursor-pointer hover:text-orange-600"
              >
                {doc.title}
              </div>

              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {getCategoryLabel(doc.category)}
                <span className="text-[11px] text-slate-400">
                  {new Date(doc.updated_at).toLocaleDateString("vi-VN")}
                </span>
              </div>

              {/* Mobile Actions Toolbar */}
              <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleOpenView(doc)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <Eye size={13} />
                  <span>{t("actionViewDoc", "Xem")}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenEdit(doc)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                >
                  <Edit3 size={13} />
                  <span>{t("actionEditDoc", "Sửa")}</span>
                </button>

                {!isDocActive && (
                  <button
                    type="button"
                    onClick={() => handleSetActive(doc)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                  >
                    <CheckCircle2 size={13} />
                    <span>{t("actionActivateDoc", "Ban hành")}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleOpenDelete(doc)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Responsive Pagination Footer */}
      <div className="p-4 sm:p-5 border-t border-slate-200/90 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs text-slate-500">
          {t("showingDocs", "Hiển thị")}{" "}
          <strong className="text-slate-900">
            {Math.min((currentPage - 1) * pageSize + 1, filteredCount)} -{" "}
            {Math.min(currentPage * pageSize, filteredCount)}
          </strong>{" "}
          / <strong className="text-slate-900">{filteredCount}</strong> {t("termsDocumentUnit", "văn bản")}
        </div>

        {/* Pagination Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
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
                className={`min-w-[32px] h-8 px-2 text-xs font-bold rounded-xl transition-all ${
                  isCurrent
                    ? "bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 text-white shadow-xs"
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
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            title="Trang sau"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};
