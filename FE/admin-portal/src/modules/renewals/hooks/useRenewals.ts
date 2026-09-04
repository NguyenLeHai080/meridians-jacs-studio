import { useState, useMemo } from "react";
import type { BillingTransaction } from "../../../core/types";

export function useRenewals(transactions: BillingTransaction[] = []) {
  const renewalTransactions = useMemo(() => {
    return transactions.filter(
      (tx) => tx.transaction_type === "renewal" || (tx.notes || "").toLowerCase().includes("gia hạn")
    );
  }, [transactions]);

  const [selectedLicenseId, setSelectedLicenseId] = useState("");
  const [selectedPlanKey, setSelectedPlanKey] = useState("1_month");
  const [customDays, setCustomDays] = useState("30");
  const [customAmount, setCustomAmount] = useState("500000");

  return {
    renewalTransactions,
    selectedLicenseId,
    setSelectedLicenseId,
    selectedPlanKey,
    setSelectedPlanKey,
    customDays,
    setCustomDays,
    customAmount,
    setCustomAmount,
  };
}
