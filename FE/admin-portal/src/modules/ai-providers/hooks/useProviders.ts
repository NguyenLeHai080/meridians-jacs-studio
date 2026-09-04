import { useState, useMemo } from "react";
import type { Provider } from "../../../core/types";

export function useProviders(providers: Provider[] = []) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredProviders = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return providers;
    return providers.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.model.toLowerCase().includes(term) ||
        p.provider_type.toLowerCase().includes(term)
    );
  }, [providers, searchTerm]);

  return {
    searchTerm,
    setSearchTerm,
    filteredProviders,
    totalCount: providers.length,
    enabledCount: providers.filter((p) => p.is_enabled || p.enabled).length,
  };
}
