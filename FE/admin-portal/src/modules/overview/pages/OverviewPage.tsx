import React, { useState, useEffect, useCallback } from "react";
import type { License, ClientSession, BillingTransaction, BillingSummary } from "../../../core/types";
import { useOverview } from "../hooks/useOverview";
import { OverviewKpiCards } from "../components/OverviewKpiCards";
import { RevenueChart } from "../components/RevenueChart";
import { DonutKeyStatus } from "../components/DonutKeyStatus";
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

  const activeLicenses = propLicenses || localLicenses;
  const activeSessions = propSessions || localSessions;
  const activeTransactions = propTransactions || localTransactions;
  const activeSummary = propBillingSummary !== undefined ? propBillingSummary : localSummary;

  const fetchOverviewData = useCallback(async () => {
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
      // Handled
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
  } = useOverview({
    licenses: activeLicenses,
    sessions: activeSessions,
    transactions: activeTransactions,
    billingSummary: activeSummary,
  });

  return (
    <>
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

      <div className="charts-grid-mintforge">
        <RevenueChart />
        <DonutKeyStatus
          totalLicenses={activeLicenses.length}
          activeLicensesCount={activeLicensesCount}
          inactiveKeysCount={inactiveKeysCount}
          lifetimeKeysCount={lifetimeKeysCount}
        />
      </div>
    </>
  );
};
