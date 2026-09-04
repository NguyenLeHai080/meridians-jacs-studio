import { useMemo } from "react";
import type { License, ClientSession, BillingTransaction, BillingSummary } from "../../../core/types";

interface UseOverviewProps {
  licenses?: License[];
  sessions?: ClientSession[];
  transactions?: BillingTransaction[];
  billingSummary?: BillingSummary | null;
}

export function useOverview({
  licenses = [],
  sessions = [],
  transactions = [],
  billingSummary = null,
}: UseOverviewProps = {}) {
  const activeLicensesCount = useMemo(() => licenses.filter((l) => l.status === "active").length, [licenses]);
  const lifetimeKeysCount = useMemo(() => licenses.filter((l) => !l.expires_at).length, [licenses]);
  const inactiveKeysCount = useMemo(() => licenses.length - activeLicensesCount, [licenses, activeLicensesCount]);
  const onlineSessionsCount = useMemo(() => sessions.filter((s) => s.is_online).length, [sessions]);

  const thisMonthRevenue = billingSummary?.this_month_revenue || 0;
  const totalRevenue = billingSummary?.total_revenue || 0;

  return {
    activeLicensesCount,
    lifetimeKeysCount,
    inactiveKeysCount,
    onlineSessionsCount,
    totalSessionsCount: sessions.length,
    thisMonthRevenue,
    totalRevenue,
    totalTransactions: transactions.length,
  };
}
