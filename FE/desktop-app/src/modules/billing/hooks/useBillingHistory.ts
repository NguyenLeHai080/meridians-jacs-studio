import { useState, useEffect } from "react";
import { billingService } from "../services/billingService";

export function useBillingHistory() {
  const [bankConfig, setBankConfig] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    billingService
      .getBankConfig()
      .then(setBankConfig)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { bankConfig, loading };
}
