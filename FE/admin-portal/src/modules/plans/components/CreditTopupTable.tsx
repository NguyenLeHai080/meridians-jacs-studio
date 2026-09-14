import React from "react";
import {
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Copy,
  Laptop,
  Coins,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  ArrowRight,
  CheckSquare,
} from "lucide-react";
import type { CreditTopupTransaction } from "../services/planService";
import { useI18n } from "../../../core/i18n";

interface CreditTopupTableProps {
  transactions: CreditTopupTransaction[];
  paginatedTransactions: CreditTopupTransaction[];
  loading: boolean;
  searchFilter: string;
  setSearchFilter: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  currentPage: number;
  setCurrentPage: (p: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  totalPages: number;
  filteredCount: number;
  onOpenApprove: (tx: CreditTopupTransaction) => void;
  onOpenReject: (tx: CreditTopupTransaction) => void;
}

export const CreditTopupTable: React.FC<CreditTopupTableProps> = ({
  paginatedTransactions,
  loading,
  searchFilter,
  setSearchFilter,
  statusFilter,
  setStatusFilter,
  currentPage,
  setCurrentPage,
  pageSize,
  setPageSize,
  totalPages,
  filteredCount,
  onOpenApprove,
  onOpenReject,
}) => {
  const { t } = useI18n();
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const renderStatusBadge = (status: string) => {
    const s = (status || "").toUpperCase();
    if (s === "COMPLETED" || s === "APPROVED") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 size={12} className="text-emerald-600" />
          <span>{t("filterStatusCompleted", "Đã hoàn tất")}</span>
        </span>
      );
    }
    if (s === "PENDING") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
          <Clock size={12} className="text-amber-600" />
          <span>{t("filterStatusPending", "Chờ duyệt")}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
        <XCircle size={12} className="text-rose-600" />
        <span>{t("filterStatusRejected", "Đã từ chối")}</span>
      </span>
    );
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
      {/* Header & Filter Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-orange-50/30 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800">
            {t("topupTableTitle", "Lịch Sử Đơn Nạp & Khớp Lệnh Realtime")}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {t(
              "topupTableSubtitle",
              "Danh sách giao dịch nạp credit từ Desktop qua SePay hoặc chuyển khoản ngân hàng."
            )}
          </p>
        </div>

        {/* Filter Toolbar */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder={t(
                "searchPlaceholderTopup",
                "Tìm mã đơn, tên, key, HWID..."
              )}
              className="w-full pl-8.5 pr-3 py-1.5 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/10"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center p-0.5 rounded-xl border border-slate-200 bg-slate-100/80 text-xs font-semibold shrink-0">
            {[
              { id: "all", label: t("filterStatusAll", "Tất cả") },
              { id: "PENDING", label: t("filterStatusPending", "Chờ duyệt") },
              { id: "APPROVED", label: t("filterStatusCompleted", "Đã duyệt") },
              { id: "REJECTED", label: t("filterStatusRejected", "Từ chối") },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  statusFilter === tab.id
                    ? "bg-white text-orange-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Page Size */}
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-orange-500 focus:outline-none shrink-0"
          >
            <option value={5}>5 / trang</option>
            <option value={10}>10 / trang</option>
            <option value={25}>25 / trang</option>
            <option value={50}>50 / trang</option>
          </select>
        </div>
      </div>

      {/* Table Content */}
      {filteredCount === 0 ? (
        <div className="py-16 px-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Coins size={24} />
          </div>
          <h4 className="text-sm font-bold text-slate-800 mb-1">
            {t("noTopupsFound", "Không tìm thấy giao dịch nạp tiền nào")}
          </h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {t(
              "noTopupsDesc",
              "Chưa có yêu cầu nạp credit nào khớp với điều kiện tìm kiếm hiện tại."
            )}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/90 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 pl-6 pr-3">{t("colOrderCode", "Mã đơn hàng")}</th>
                  <th className="py-3.5 px-3">{t("colCustomerKey", "Khách hàng & Key")}</th>
                  <th className="py-3.5 px-3">{t("colDeviceHwid", "Thiết bị (HWID)")}</th>
                  <th className="py-3.5 px-3">{t("colPackageAmount", "Gói & Số tiền")}</th>
                  <th className="py-3.5 px-3">{t("colCreditsGranted", "Credit cấp")}</th>
                  <th className="py-3.5 px-3">{t("colTransferContent", "Nội dung & TT")}</th>
                  <th className="py-3.5 px-3">{t("colTopupStatus", "Trạng thái")}</th>
                  <th className="py-3.5 pr-6 pl-3 text-right">{t("colTopupActions", "Thao tác")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedTransactions.map((tx) => {
                  const isPending = (tx.status || "").toUpperCase() === "PENDING";
                  return (
                    <tr
                      key={tx.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isPending ? "bg-amber-50/20" : ""
                      }`}
                    >
                      {/* Col 1: Order Code */}
                      <td className="py-3.5 pl-6 pr-3 align-middle font-mono font-bold text-slate-800 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{tx.order_code}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(tx.order_code, tx.id + "_order")}
                            className="text-slate-400 hover:text-slate-600 p-1 rounded"
                            title={t("btnCopyCode", "Sao chép")}
                          >
                            {copiedKey === tx.id + "_order" ? (
                              <Check size={12} className="text-emerald-600" />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>
                        </div>
                        {tx.created_at && (
                          <div className="text-[10.5px] font-normal text-slate-400 font-sans mt-0.5">
                            {new Date(tx.created_at).toLocaleString("vi-VN")}
                          </div>
                        )}
                      </td>

                      {/* Col 2: Customer Name & License Key */}
                      <td className="py-3.5 px-3 align-middle">
                        <div className="font-bold text-slate-900">
                          {tx.customer_name || t("lblWalkinCustomer", "Khách vãng lai")}
                        </div>
                        {tx.license_key && (
                          <div className="font-mono text-[10.5px] text-slate-400 mt-0.5 truncate max-w-[150px]">
                            {tx.license_key}
                          </div>
                        )}
                      </td>

                      {/* Col 3: HWID */}
                      <td className="py-3.5 px-3 align-middle font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        {tx.hwid ? (
                          <div className="flex items-center gap-1.5">
                            <Laptop size={13} className="text-slate-400 shrink-0" />
                            <span className="truncate max-w-[120px]">{tx.hwid}</span>
                          </div>
                        ) : (
                          <span className="text-slate-300">--</span>
                        )}
                      </td>

                      {/* Col 4: Package & Amount */}
                      <td className="py-3.5 px-3 align-middle whitespace-nowrap">
                        <div className="font-semibold text-slate-800 text-[11.5px]">{tx.package_name}</div>
                        <div className="font-bold font-mono text-orange-600 text-xs mt-0.5">
                          {tx.amount.toLocaleString()} VNĐ
                        </div>
                      </td>

                      {/* Col 5: Credits Granted */}
                      <td className="py-3.5 px-3 align-middle font-mono font-black text-emerald-600 whitespace-nowrap">
                        +{tx.credits_granted.toLocaleString()}
                        {tx.bonus_percent > 0 && (
                          <span className="ml-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-1 py-0.2 rounded">
                            +{tx.bonus_percent}%
                          </span>
                        )}
                      </td>

                      {/* Col 6: Transfer Content & Payment Method */}
                      <td className="py-3.5 px-3 align-middle text-[11px]">
                        <div className="font-mono text-slate-700 font-semibold truncate max-w-[160px]">
                          {tx.transfer_content || "--"}
                        </div>
                        <div className="text-slate-400 uppercase text-[10px] mt-0.5">
                          {tx.payment_method || "SEPAY"}
                        </div>
                      </td>

                      {/* Col 7: Status */}
                      <td className="py-3.5 px-3 align-middle whitespace-nowrap">
                        {renderStatusBadge(tx.status)}
                      </td>

                      {/* Col 8: Actions */}
                      <td className="py-3.5 pr-6 pl-3 align-middle text-right whitespace-nowrap">
                        {isPending ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => onOpenApprove(tx)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                              title={t("btnApproveTopup", "Duyệt đơn")}
                            >
                              <CheckCircle2 size={13} />
                              <span>{t("btnApproveTopup", "Duyệt")}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onOpenReject(tx)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                              title={t("btnRejectTopup", "Từ chối")}
                            >
                              <XCircle size={13} />
                              <span>{t("btnRejectTopup", "Hủy")}</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            {tx.approved_by ? `${t("lblApprovedBy", "Duyệt")}: ${tx.approved_by}` : "--"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Responsive Cards */}
          <div className="block lg:hidden divide-y divide-slate-100">
            {paginatedTransactions.map((tx) => {
              const isPending = (tx.status || "").toUpperCase() === "PENDING";
              return (
                <div key={tx.id} className="p-4 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-mono font-bold text-slate-800">
                      <span>{tx.order_code}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(tx.order_code, tx.id + "_m_order")}
                        className="text-slate-400 hover:text-slate-600 p-0.5"
                      >
                        {copiedKey === tx.id + "_m_order" ? (
                          <Check size={11} className="text-emerald-600" />
                        ) : (
                          <Copy size={11} />
                        )}
                      </button>
                    </div>
                    {renderStatusBadge(tx.status)}
                  </div>

                  <div className="flex items-center justify-between text-slate-600">
                    <span className="font-bold text-slate-900">
                      {tx.customer_name || t("lblWalkinCustomer", "Khách vãng lai")}
                    </span>
                    <span className="font-mono font-bold text-orange-600">{tx.amount.toLocaleString()} VNĐ</span>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100 space-y-1 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">{t("lblPackageAndCredit", "Gói & Credit:")}</span>
                      <span className="font-bold text-emerald-600 font-mono">
                        {tx.package_name} (+{tx.credits_granted.toLocaleString()} Cr)
                      </span>
                    </div>
                    {tx.transfer_content && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">{t("lblTransferNote", "Nội dung CK:")}</span>
                        <span className="font-mono text-slate-700 truncate max-w-[180px]">{tx.transfer_content}</span>
                      </div>
                    )}
                  </div>

                  {isPending && (
                    <div className="pt-2 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenReject(tx)}
                        className="px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl"
                      >
                        {t("btnRejectTopup", "Từ chối")}
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenApprove(tx)}
                        className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs"
                      >
                        {t("btnApproveTopup", "Duyệt đơn nạp")}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination Footer */}
          <div className="p-4 sm:p-5 border-t border-slate-200/90 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              {t("showingTopups", "Hiển thị")}{" "}
              <strong className="text-slate-900">
                {filteredCount > 0 ? (currentPage - 1) * pageSize + 1 : 0} -{" "}
                {Math.min(currentPage * pageSize, filteredCount)}
              </strong>{" "}
              / <strong className="text-slate-900">{filteredCount}</strong> {t("topupsUnit", "đơn nạp")}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
                className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
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
                    className={`min-w-[32px] h-8 px-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
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
                className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
