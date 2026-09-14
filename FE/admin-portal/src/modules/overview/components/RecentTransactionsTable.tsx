import React from "react";
import { ArrowUpRight, Receipt, CreditCard, Banknote } from "lucide-react";
import type { BillingTransaction } from "../../../core/types";
import { useI18n } from "../../../core/i18n";
import { formatCurrencyVND, formatTimeAgo } from "../utils/overviewHelper";

interface RecentTransactionsTableProps {
  transactions: BillingTransaction[];
  onNavigate: (menu: string) => void;
}

export const RecentTransactionsTable: React.FC<RecentTransactionsTableProps> = ({
  transactions,
  onNavigate,
}) => {
  const { t } = useI18n();

  const getMethodBadge = (method?: string) => {
    const m = (method || "").toLowerCase();
    if (m.includes("sepay") || m.includes("qr")) {
      return { label: "SePay QR", icon: <CreditCard size={11} className="text-emerald-600" />, color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    }
    if (m.includes("bank") || m.includes("transfer")) {
      return { label: "Chuyển khoản", icon: <Banknote size={11} className="text-blue-600" />, color: "bg-blue-50 text-blue-700 border-blue-200" };
    }
    return { label: method || "Hệ thống", icon: <Receipt size={11} className="text-amber-600" />, color: "bg-amber-50 text-amber-700 border-amber-200" };
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col h-full">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Receipt size={16} className="text-orange-500" />
            {t("recentTxTitle")}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">{t("recentTxSubtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate("billing")}
          className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700 transition-colors"
        >
          <span>{t("viewAllTx")}</span>
          <ArrowUpRight size={14} />
        </button>
      </div>

      <div className="overflow-x-auto flex-1">
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400">
            <Receipt size={32} className="stroke-1 mb-2 opacity-40" />
            <p className="text-xs">{t("noTransactions")}</p>
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/50">
                <th className="py-2.5 px-2">{t("colCustomer")}</th>
                <th className="py-2.5 px-2">{t("colAmount")}</th>
                <th className="py-2.5 px-2">{t("colPaymentMethod")}</th>
                <th className="py-2.5 px-2 text-right">{t("colTime")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map((tx) => {
                const badge = getMethodBadge(tx.payment_method);
                const code = tx.reference_code || String(tx.id || "").slice(0, 8).toUpperCase();

                return (
                  <tr
                    key={tx.id || code}
                    onClick={() => onNavigate("billing")}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                  >
                    <td className="py-2.5 px-2 text-slate-800 font-medium">
                      <div className="group-hover:text-orange-600 transition-colors font-semibold text-slate-800">
                        {tx.customer_name || "Khách hàng"}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {code}
                      </div>
                    </td>

                    <td className="py-2.5 px-2">
                      <span className="font-bold text-emerald-600">
                        +{formatCurrencyVND(tx.amount || 0)}
                      </span>
                    </td>

                    <td className="py-2.5 px-2">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border ${badge.color}`}>
                        {badge.icon}
                        {badge.label}
                      </span>
                    </td>

                    <td className="py-2.5 px-2 text-right text-slate-500 text-[11px]">
                      {formatTimeAgo(tx.created_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
