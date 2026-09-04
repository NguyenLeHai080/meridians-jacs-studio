import React from "react";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import type { BillingTransaction } from "../../../core/types";
import { formatCurrency } from "../utils/currencyHelper";
import { useI18n } from "../../../core/i18n";
import { Pagination } from "../../../components/common/Pagination";

interface CashflowTableProps {
  transactions: BillingTransaction[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onAddDeposit: () => void;
  onAddRefund: () => void;
  onDeleteTransaction: (tx: BillingTransaction) => void;
}

export const CashflowTable: React.FC<CashflowTableProps> = ({
  transactions,
  totalCount,
  currentPage,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onAddDeposit,
  onAddRefund,
  onDeleteTransaction,
}) => {
  const { t, language } = useI18n();

  return (
    <div className="mf-card-panel">
      <div className="mf-card-header">
        <div className="mf-card-title-group">
          <h3>{t("billingTitle")} ({totalCount})</h3>
          <p>{t("billingSubtitle")}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <button
            type="button"
            className="btn-white-outline"
            style={{ color: "var(--danger)", borderColor: "var(--danger)" }}
            onClick={onAddRefund}
          >
            <RotateCcw size={15} /> {t("btnRecordRefund")}
          </button>
          <button
            type="button"
            className="btn-primary-orange"
            onClick={onAddDeposit}
          >
            <Plus size={16} /> {t("btnRecordDeposit")}
          </button>
        </div>
      </div>

      <div className="table-responsive">
        <table className="mf-table">
          <thead>
            <tr>
              <th>{t("thTxId")}</th>
              <th>{t("thCustomer")}</th>
              <th>{t("thPlan")}</th>
              <th>{t("thTxType")}</th>
              <th>{t("thAmount")}</th>
              <th>{t("thMethod")}</th>
              <th>{t("thTime")}</th>
              <th style={{ textAlign: "right" }}>{t("thActions")}</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => {
              const isNegative = tx.amount < 0 || tx.transaction_type === "refund";
              return (
                <tr key={tx.id}>
                  <td><span className="code-chip">{tx.id.slice(0, 10)}...</span></td>
                  <td>
                    <strong>{tx.customer_name}</strong>
                    {tx.notes && <div style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>{tx.notes}</div>}
                  </td>
                  <td>{tx.plan_name || tx.plan_type || "--"}</td>
                  <td>
                    <span
                      className={`pill-status ${isNegative ? "pill-danger" : tx.transaction_type === "new_key" ? "pill-active" : "pill-online"}`}
                      style={{ fontSize: "0.72rem" }}
                    >
                      {isNegative ? "↩️ HOÀN TIỀN" : tx.transaction_type === "new_key" ? "+ CẤP KEY" : tx.transaction_type === "renewal" ? "+ GIA HẠN" : "+ NẠP TIỀN"}
                    </span>
                  </td>
                  <td>
                    <strong style={{ color: isNegative ? "var(--danger)" : "var(--success-text)", fontSize: "0.95rem" }}>
                      {isNegative ? `-${formatCurrency(Math.abs(tx.amount))}` : `+${formatCurrency(tx.amount)}`}
                    </strong>
                  </td>
                  <td>{(tx.payment_method || "bank_transfer").toUpperCase()}</td>
                  <td style={{ fontSize: "0.78rem" }}>
                    {new Date(tx.created_at).toLocaleString(language === "vi" ? "vi-VN" : language === "jp" ? "ja-JP" : "en-US")}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      type="button"
                      className="btn-white-outline"
                      style={{ padding: "0.25rem 0.5rem", color: "var(--danger)" }}
                      onClick={() => onDeleteTransaction(tx)}
                      title={t("delete")}
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                  {t("noTransactionsFound")}
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
        pageSizeOptions={[5, 10, 20, 50]}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
};
