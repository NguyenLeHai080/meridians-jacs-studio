import React from "react";
import {
  KeyRound,
  Copy,
  Pencil,
  Trash2,
  Search,
  Plus,
  RefreshCw,
  Clock,
  Laptop,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCw,
  Sparkles,
} from "lucide-react";
import type { License } from "../../../core/types";
import { Pagination } from "../../../components/common";

interface LicenseTableProps {
  licenses: License[];
  totalCount: number;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onOpenCreate: () => void;
  onRefresh: () => void;
  loading?: boolean;
  onEdit: (lic: License) => void;
  onDelete: (lic: License) => void;
  onRenew: (lic: License) => void;
  onResetHwid: (lic: License) => void;
  onRegenerateKey: (lic: License) => void;
  onToggleStatus: (lic: License) => void;
  onCopyHint: (hint: string, id: string) => void;
}

export const LicenseTable: React.FC<LicenseTableProps> = ({
  licenses,
  totalCount,
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  currentPage,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onOpenCreate,
  onRefresh,
  loading = false,
  onEdit,
  onDelete,
  onRenew,
  onResetHwid,
  onRegenerateKey,
  onToggleStatus,
  onCopyHint,
}) => {
  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase() || "US";
  };

  const calculateDaysRemaining = (expiresAt?: string | null) => {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <div className="space-y-3">
      {/* 1. Filter Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white border border-slate-200 p-3 rounded-xl shadow-xs">
        <div className="flex flex-1 items-center gap-2.5">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tên khách hàng, key, HWID, email..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 transition-colors"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:bg-white focus:border-blue-500 font-medium"
          >
            <option value="all">Tất cả thời hạn & trạng thái</option>
            <option value="active">Đang hoạt động (Active)</option>
            <option value="expiring_soon">⚠️ Sắp hết hạn (&le; 7 ngày)</option>
            <option value="expired">Đã hết hạn (Expired)</option>
            <option value="lifetime">♾️ Vĩnh viễn (Lifetime)</option>
            <option value="blocked">Đã tạm khóa (Blocked)</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-all disabled:opacity-50 shadow-xs"
            title="Tải lại dữ liệu"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? "animate-spin text-blue-500" : ""}`} />
            <span>Làm mới</span>
          </button>

          <button
            onClick={onOpenCreate}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Cấp / Thêm API Key Mới</span>
          </button>
        </div>
      </div>

      {/* 2. High-Density Single-Line Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                <th className="py-2.5 px-3.5 whitespace-nowrap">Khách Hàng / Đơn Vị</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Mã API Key</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Hạn Mức & Quyền Hạn</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Mã Máy (HWID)</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Thời Hạn & Ngày Tạo</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-center">Trạng Thái</th>
                <th className="py-2.5 px-3.5 text-right whitespace-nowrap">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading && licenses.length === 0 ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td colSpan={7} className="py-3 px-3">
                      <div className="h-4 bg-slate-100 rounded w-full"></div>
                    </td>
                  </tr>
                ))
              ) : licenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Không tìm thấy API Key nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                licenses.map((lic) => {
                  const daysLeft = calculateDaysRemaining(lic.expires_at);
                  const isExpired = daysLeft !== null && daysLeft <= 0;
                  const isActive = lic.status === "active" && !isExpired;
                  const isBlocked = lic.status === "blocked";

                  return (
                    <tr
                      key={lic.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Customer Info */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold text-[10px]">
                            {getInitials(lic.customer_name)}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-800 text-xs">
                              {lic.customer_name}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {lic.customer_contact || "Chưa có liên hệ"}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* API Key Chip */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-50 border border-slate-200 text-slate-700 font-mono text-[11px]">
                          <KeyRound className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span className="font-semibold">{lic.key_hint || "JACS-****-****"}</span>
                          <button
                            type="button"
                            onClick={() => onCopyHint(lic.key_hint, lic.id)}
                            className="p-0.5 text-slate-400 hover:text-blue-600 transition-colors ml-1"
                            title="Sao chép API Key"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      {/* Quota & Permissions */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-semibold text-slate-800">
                            {lic.max_jobs_per_day || 200} jobs/ngày
                          </span>
                          {lic.premium_ai && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-200 text-[9.5px] font-bold">
                              <Sparkles className="w-2.5 h-2.5" /> AI PRO
                            </span>
                          )}
                        </div>
                      </td>

                      {/* HWID Device */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div
                          className="flex items-center gap-1 font-mono text-[10.5px] text-slate-600 max-w-[150px] truncate"
                          title={lic.hwid}
                        >
                          <Laptop className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{lic.hwid ? lic.hwid.slice(0, 16) + "..." : "Chưa gắn máy"}</span>
                        </div>
                      </td>

                      {/* Expiry & Created */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        {lic.expires_at ? (
                          <div>
                            <div className="mb-0.5">
                              {isExpired ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  Đã hết hạn
                                </span>
                              ) : daysLeft !== null && daysLeft <= 7 ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                                  ⚠️ Còn {daysLeft} ngày
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Còn {daysLeft} ngày
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] font-mono text-slate-500">
                              Hết hạn: {new Date(lic.expires_at).toLocaleDateString("vi-VN")}
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            ♾️ Vĩnh viễn
                          </span>
                        )}
                      </td>

                      {/* Status Toggle */}
                      <td className="py-2.5 px-3 whitespace-nowrap text-center">
                        <button
                          type="button"
                          onClick={() => onToggleStatus(lic)}
                          title="Bấm để Khóa / Mở khóa API key này"
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold transition-all ${
                            isBlocked
                              ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                              : isExpired
                              ? "bg-slate-100 text-slate-500 border border-slate-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                          }`}
                        >
                          {isBlocked ? (
                            <>
                              <XCircle className="w-3 h-3 text-rose-600" />
                              Đã khóa
                            </>
                          ) : isExpired ? (
                            <>
                              <AlertTriangle className="w-3 h-3 text-slate-400" />
                              Hết hạn
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Hoạt động
                            </>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {/* Sửa (Edit) */}
                          <button
                            type="button"
                            onClick={() => onEdit(lic)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="Sửa thông tin & cấu hình Key"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          {/* Gia hạn (Renew) */}
                          <button
                            type="button"
                            onClick={() => onRenew(lic)}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                            title="Gia hạn thời gian sử dụng"
                          >
                            <Clock className="w-3.5 h-3.5" />
                          </button>

                          {/* Đổi mã máy (Reset HWID) */}
                          <button
                            type="button"
                            onClick={() => onResetHwid(lic)}
                            className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
                            title="Reset mã máy (HWID) để khách đổi máy mới"
                          >
                            <Laptop className="w-3.5 h-3.5" />
                          </button>

                          {/* Cấp lại Key mới (Regenerate Key) */}
                          <button
                            type="button"
                            onClick={() => onRegenerateKey(lic)}
                            className="p-1.5 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-md transition-colors"
                            title="Cấp lại chuỗi Key mới (nếu bị lộ)"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                          </button>

                          {/* Xóa (Delete) */}
                          <button
                            type="button"
                            onClick={() => onDelete(lic)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                            title="Xóa vĩnh viễn API Key"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-3 border-t border-slate-100 flex items-center justify-between">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
            totalItems={totalCount}
            pageSize={pageSize}
            pageSizeOptions={[10, 20, 50, 100]}
            onPageSizeChange={onPageSizeChange}
          />
        </div>
      </div>
    </div>
  );
};
