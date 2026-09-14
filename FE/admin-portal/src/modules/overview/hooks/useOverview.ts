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
  const activeLicensesCount = useMemo(
    () => licenses.filter((l) => l.status === "active").length,
    [licenses]
  );
  
  const lifetimeKeysCount = useMemo(
    () => licenses.filter((l) => !l.expires_at).length,
    [licenses]
  );
  
  const inactiveKeysCount = useMemo(
    () => Math.max(0, licenses.length - activeLicensesCount),
    [licenses, activeLicensesCount]
  );
  
  const onlineSessionsCount = useMemo(
    () => sessions.filter((s) => Boolean(s.is_online)).length,
    [sessions]
  );

  const thisMonthRevenue = billingSummary?.this_month_revenue ?? 0;
  const totalRevenue = billingSummary?.total_revenue ?? 0;

  // Extract top recent online / active sessions
  const recentSessions = useMemo(() => {
    return [...sessions]
      .sort((a, b) => {
        const timeA = a.last_seen_at ? new Date(a.last_seen_at).getTime() : 0;
        const timeB = b.last_seen_at ? new Date(b.last_seen_at).getTime() : 0;
        return timeB - timeA;
      })
      .slice(0, 6);
  }, [sessions]);

  // Extract top recent billing / credit topup transactions
  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeB - timeA;
      })
      .slice(0, 6);
  }, [transactions]);

  const activePercent = useMemo(() => {
    return licenses.length > 0 ? Math.round((activeLicensesCount / licenses.length) * 100) : 0;
  }, [licenses.length, activeLicensesCount]);

  return {
    activeLicensesCount,
    lifetimeKeysCount,
    inactiveKeysCount,
    onlineSessionsCount,
    totalSessionsCount: sessions.length,
    thisMonthRevenue,
    totalRevenue,
    totalTransactions: transactions.length,
    recentSessions,
    recentTransactions,
    activePercent,
  };
}
