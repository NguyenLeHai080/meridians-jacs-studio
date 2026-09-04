import { useState, useEffect } from "react";
import type { ToolPreferences, ProviderProfile } from "../../../core/types";
import { settingsService } from "../services/settingsService";

export function useSettings(initialPrefs?: ToolPreferences) {
  const [preferences, setPreferences] = useState<ToolPreferences | undefined>(initialPrefs);
  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      settingsService.getPreferences(),
      settingsService.getProviders(),
    ])
      .then(([prefs, provs]) => {
        if (prefs) setPreferences(prefs);
        if (provs) setProviders(provs);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { preferences, setPreferences, providers, setProviders, loading };
}
