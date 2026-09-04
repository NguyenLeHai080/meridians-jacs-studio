import { useState, useEffect } from "react";
import type { ProviderProfile } from "../../../core/types";
import { analysisService } from "../services/analysisService";

export function useVideoAnalysis() {
  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);

  useEffect(() => {
    setLoadingProviders(true);
    analysisService
      .getProviders()
      .then((res) => setProviders(res))
      .catch(() => {})
      .finally(() => setLoadingProviders(false));
  }, []);

  const activeProviders = providers.filter((p) => p.enabled && p.hasApiKey);

  return {
    providers,
    activeProviders,
    loadingProviders,
    refreshProviders: () => {
      setLoadingProviders(true);
      analysisService.getProviders().then(setProviders).finally(() => setLoadingProviders(false));
    },
  };
}
