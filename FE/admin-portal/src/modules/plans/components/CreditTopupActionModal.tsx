import React from "react";
import { CheckCircle2, AlertTriangle, X, Coins, Wallet } from "lucide-react";
import { useI18n } from "../../../core/i18n";
import type { CreditTopupTransaction } from "../services/planService";

interface CreditTopupActionModalProps {
  isOpen: boolean;
  type: "approve" | "reject";
  transaction: CreditTopupTransaction | null;
  isLoading: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export const CreditTopupActionModal: React.FC<CreditTopupActionModalProps> = ({
  isOpen,
  type,
  transaction,
  isLoading,
  onClose,
  onConfirm,
}) => {
  const { t } = useI18n();

  if (!isOpen || !transaction) return null;

  const isApprove = type === "approve";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm transition-all duration-300">
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-900/10 transition-all transform animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`relative border-b px-6 py-5 ${
            isApprove
              ? "border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-orange-50/30"
              : "border-rose-100 bg-gradient-to-r from-rose-50 via-white to-orange-50/30"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-2xl ring-1 ${
                  isApprove
                    ? "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20"
                    : "bg-rose-500/10 text-rose-600 ring-rose-500/20"
                }`}
              >
                {isApprove ? <CheckCircle2 className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  {isApprove
                    ? t("approveTopupConfirmTitle", "Xác Nhận Duyệt Đơn Nạp Tiền?")
                    : t("rejectTopupConfirmTitle", "Xác Nhận Từ Chối Đơn Nạp?")}
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {isApprove
                    ? t("approveTopupConfirmDesc", "Hệ thống sẽ lập tức cộng credit vào tài khoản máy khách tương ứng.")
                    : t("rejectTopupConfirmDesc", "Đơn hàng sẽ chuyển sang trạng thái bị từ chối và không cộng credit.")}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content Details */}
        <div className="px-6 py-5 space-y-3 text-xs">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">{t("colOrderCode", "Mã đơn hàng")}:</span>
              <span className="font-mono font-bold text-slate-800">{transaction.order_code}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">{t("lblCustomer", "Khách hàng")}:</span>
              <span className="font-bold text-slate-900">
                {transaction.customer_name || t("lblWalkinCustomer", "Khách vãng lai")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">{t("lblPaymentAmount", "Số tiền thanh toán")}:</span>
              <span className="font-mono font-bold text-orange-600 text-sm">
                {transaction.amount.toLocaleString()} VNĐ
              </span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
              <span className="font-bold text-slate-700">{t("colCreditsGranted", "Credit cấp")}:</span>
              <span className="font-mono font-black text-emerald-600 text-sm">
                +{transaction.credits_granted.toLocaleString()} Credits
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/80 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-all cursor-pointer"
          >
            {t("btnCancel", "Hủy bỏ")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`inline-flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-bold text-white shadow-md transition-all cursor-pointer ${
              isApprove
                ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                : "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20"
            }`}
          >
            {isApprove ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            <span>
              {isLoading
                ? t("btnProcessing", "Đang xử lý...")
                : isApprove
                ? t("btnApproveTopup", "Duyệt Đơn Nạp")
                : t("btnRejectTopup", "Từ Chối Đơn")}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
