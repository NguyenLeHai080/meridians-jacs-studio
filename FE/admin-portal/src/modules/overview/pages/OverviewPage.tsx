import React, { useState, useEffect, useCallback } from "react";
import type { License, ClientSession, BillingTransaction, BillingSummary } from "../../../core/types";
import { useOverview } from "../hooks/useOverview";
import { OverviewKpiCards } from "../components/OverviewKpiCards";
import { QuickActionsBar } from "../components/QuickActionsBar";
import { RevenueChart } from "../components/RevenueChart";
import { DonutKeyStatus } from "../components/DonutKeyStatus";
import { RecentOnlineSessions } from "../components/RecentOnlineSessions";
import { RecentTransactionsTable } from "../components/RecentTransactionsTable";
import { SystemHealthWidget } from "../components/SystemHealthWidget";
import { licenseService } from "../../licenses/services/licenseService";
import { sessionService } from "../../sessions/services/sessionService";
import { billingService } from "../../billing/services/billingService";
import "../lang"; // Auto-registers overview translations

interface OverviewPageProps {
  licenses?: License[];
  sessions?: ClientSession[];
  transactions?: BillingTransaction[];
  billingSummary?: BillingSummary | null;
  onNavigate: (menu: any) => void;
  searchTerm?: string;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  licenses: propLicenses,
  sessions: propSessions,
  transactions: propTransactions,
  billingSummary: propBillingSummary,
  onNavigate,
  searchTerm: _searchTerm,
}) => {
  const [localLicenses, setLocalLicenses] = useState<License[]>(propLicenses || []);
  const [localSessions, setLocalSessions] = useState<ClientSession[]>(propSessions || []);
  const [localTransactions, setLocalTransactions] = useState<BillingTransaction[]>(propTransactions || []);
  const [localSummary, setLocalSummary] = useState<BillingSummary | null>(propBillingSummary || null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const activeLicenses = propLicenses || localLicenses;
  const activeSessions = propSessions || localSessions;
  const activeTransactions = propTransactions || localTransactions;
  const activeSummary = propBillingSummary !== undefined ? propBillingSummary : localSummary;

  const fetchOverviewData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [lics, sess, txs, sum] = await Promise.allSettled([
        licenseService.getLicenses(),
        sessionService.getSessions(),
        billingService.getTransactions(),
        billingService.getSummary(),
      ]);
      if (lics.status === "fulfilled") setLocalLicenses(lics.value);
      if (sess.status === "fulfilled") setLocalSessions(sess.value);
      if (txs.status === "fulfilled") setLocalTransactions(txs.value);
      if (sum.status === "fulfilled") setLocalSummary(sum.value);
    } catch {
      // Handled gracefully
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!propLicenses || !propSessions || !propTransactions) {
      fetchOverviewData();
    }
  }, [propLicenses, propSessions, propTransactions, fetchOverviewData]);

  const {
    activeLicensesCount,
    lifetimeKeysCount,
    inactiveKeysCount,
    onlineSessionsCount,
    totalSessionsCount,
    thisMonthRevenue,
    totalRevenue,
    totalTransactions,
    recentSessions,
    recentTransactions,
  } = useOverview({
    licenses: activeLicenses,
    sessions: activeSessions,
    transactions: activeTransactions,
    billingSummary: activeSummary,
  });

  return (
    <div className="flex flex-col gap-5 animate-fade-in pb-10">
      {/* 1. Quick Actions Bar */}
      <QuickActionsBar
        onNavigate={onNavigate}
        onRefresh={fetchOverviewData}
        loading={isRefreshing}
      />

      {/* 2. Top KPI Cards */}
      <OverviewKpiCards
        thisMonthRevenue={thisMonthRevenue}
        totalRevenue={totalRevenue}
        totalTransactions={totalTransactions}
        activeLicensesCount={activeLicensesCount}
        inactiveKeysCount={inactiveKeysCount}
        onlineSessionsCount={onlineSessionsCount}
        totalSessionsCount={totalSessionsCount}
        onNavigate={onNavigate}
      />

      {/* 3. Analytics Charts Grid */}
      <div className="charts-grid-mintforge">
        <RevenueChart
          transactions={activeTransactions}
          sessions={activeSessions}
        />
        <DonutKeyStatus
          totalLicenses={activeLicenses.length}
          activeLicensesCount={activeLicensesCount}
          inactiveKeysCount={inactiveKeysCount}
          lifetimeKeysCount={lifetimeKeysCount}
        />
      </div>

      {/* 4. Real-time Monitoring & Transactions (2 Columns) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-stretch">
        <RecentOnlineSessions
          sessions={recentSessions}
          onNavigate={onNavigate}
        />
        <RecentTransactionsTable
          transactions={recentTransactions}
          onNavigate={onNavigate}
        />
      </div>

      {/* 5. System Health & Security Shield Status */}
      <SystemHealthWidget />
    </div>
  );
};
