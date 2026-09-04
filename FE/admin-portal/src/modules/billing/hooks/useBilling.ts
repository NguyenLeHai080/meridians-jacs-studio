import { useState, useMemo } from "react";
import type { BillingTransaction, BillingSummary } from "../../../core/types";

export function useBilling(transactions: BillingTransaction[] = [], summary: BillingSummary | null = null) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalPages = Math.ceil(transactions.length / pageSize) || 1;
  const paginatedTransactions = useMemo(() => {
    return transactions.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [transactions, currentPage, pageSize]);

  const netRevenue = summary?.net_revenue ?? summary?.total_revenue ?? 0;
  const totalDeposits = summary?.total_deposits ?? summary?.total_revenue ?? 0;
  const totalRefunds = summary?.total_refunds ?? 0;
  const thisMonthRevenue = summary?.this_month_revenue ?? 0;

  const depositCount = useMemo(() => transactions.filter((t) => t.amount > 0).length, [transactions]);
  const refundCount = useMemo(
    () => transactions.filter((t) => t.amount < 0 || t.transaction_type === "refund").length,
    [transactions]
  );

  return {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize: (size: number) => {
      setPageSize(size);
      setCurrentPage(1);
    },
    totalPages,
    paginatedTransactions,
    netRevenue,
    totalDeposits,
    totalRefunds,
    thisMonthRevenue,
    depositCount,
    refundCount,
    totalTransactions: transactions.length,
  };
}
