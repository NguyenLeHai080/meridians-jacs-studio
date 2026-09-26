import { useState, useEffect, useMemo } from "react";
import { apiRequest } from "../../../core/api";
import { getToken } from "../../../core/session";
import { ALL_SQUARE_MODELS } from "../../ai-providers/pages/ModelSquarePage";

export interface AvailableAiModelOption {
  id: string;
  label: string;
  provider: string;
  category: "vision" | "cinema" | "voice" | "transcription" | "other";
  isReviewPhim: boolean;
}

export type ModelCategoryKey = "all" | "review_phim" | "vision" | "cinema" | "voice" | "transcription";

export function detectModelCategory(modelId: string, provider: string): "vision" | "cinema" | "voice" | "transcription" | "other" {
  const m = modelId.toLowerCase();
  const p = provider.toLowerCase();
  if (m.includes("whisper") || p.includes("whisper")) return "transcription";
  if (m.includes("eleven") || m.includes("vbee") || m.includes("manhdung") || m.includes("minhhoang") || m.includes("tts") || m.includes("voice") || p.includes("eleven") || p.includes("vbee")) return "voice";
  if (m.includes("gemini") || m.includes("gpt-4o") || m.includes("vision") || m.includes("llava") || p.includes("gemini")) return "vision";
  if (m.includes("claude") || m.includes("gpt-5") || m.includes("deepseek") || m.includes("o3") || m.includes("sonnet") || m.includes("opus") || p.includes("anthropic")) return "cinema";
  return "other";
}

export function isModelReviewPhimSuitable(modelId: string, provider: string): boolean {
  const m = modelId.toLowerCase();
  const cat = detectModelCategory(modelId, provider);
  if (["vision", "cinema", "voice", "transcription"].includes(cat)) return true;
  return (
    m.includes("gemini") ||
    m.includes("claude") ||
    m.includes("gpt-4") ||
    m.includes("gpt-5") ||
    m.includes("deepseek") ||
    m.includes("whisper") ||
    m.includes("eleven") ||
    m.includes("vbee")
  );
}

export const DEFAULT_REVIEW_PHIM_PACKAGE_IDS = [
  "gemini-2.5-flash",
  "gemini-flash-latest",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
  "claude-3-7-sonnet",
  "claude-opus-4.8",
  "claude-3-5-sonnet-latest",
  "gpt-4o",
  "gpt-4o-mini",
  "deepseek-reasoner",
  "deepseek-chat",
  "eleven_multilingual_v2",
  "vi-manhdung",
  "whisper-large-v3",
  "tts-1",
];

export function useAvailableAiModels() {
  const [extraModels, setExtraModels] = useState<{ id: string; label: string; provider: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<ModelCategoryKey>("all");

  useEffect(() => {
    let isMounted = true;
    const loadCatalogModels = async () => {
      try {
        setLoading(true);
        const token = getToken();
        const res = await apiRequest<any>("/api/v1/ai-providers/catalog", {}, token || undefined);
        const data = res?.data || res;
        if (!data || !isMounted) return;

        const fetched: { id: string; label: string; provider: string }[] = [];
        if (Array.isArray(data.my_models)) {
          for (const m of data.my_models) {
            const mName = m.name || m.model || "";
            if (mName) {
              fetched.push({
                id: mName,
                label: m.label || mName,
                provider: m.group || "Custom Provider",
              });
            }
          }
        }
        if (Array.isArray(data.available_models)) {
          for (const am of data.available_models) {
            const grp = am.group || "Market Provider";
            if (Array.isArray(am.models)) {
              for (const sub of am.models) {
                if (sub) {
                  fetched.push({
                    id: String(sub),
                    label: String(sub),
                    provider: grp,
                  });
                }
              }
            }
          }
        }

        if (isMounted && fetched.length > 0) {
          setExtraModels(fetched);
        }
      } catch (err) {
        // Fallback to ALL_SQUARE_MODELS gracefully if offline or catalog fails
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void loadCatalogModels();
    return () => {
      isMounted = false;
    };
  }, []);

  const allModels = useMemo<AvailableAiModelOption[]>(() => {
    const list: AvailableAiModelOption[] = [];
    const seen = new Set<string>();

    // 1. From comprehensive Square Models (47+ models)
    for (const sm of ALL_SQUARE_MODELS) {
      const key = sm.id.toLowerCase().trim();
      if (!seen.has(key)) {
        seen.add(key);
        const cat = detectModelCategory(sm.id, sm.provider);
        list.push({
          id: sm.id,
          label: sm.name || sm.id,
          provider: sm.provider,
          category: cat,
          isReviewPhim: isModelReviewPhimSuitable(sm.id, sm.provider),
        });
      }
    }

    // 2. Extra models from database / active upstream catalog
    for (const em of extraModels) {
      const key = em.id.toLowerCase().trim();
      if (!seen.has(key)) {
        seen.add(key);
        const cat = detectModelCategory(em.id, em.provider);
        list.push({
          id: em.id,
          label: em.label || em.id,
          provider: em.provider,
          category: cat,
          isReviewPhim: isModelReviewPhimSuitable(em.id, em.provider),
        });
      }
    }

    return list;
  }, [extraModels]);

  const providersList = useMemo(() => {
    const set = new Set<string>();
    for (const m of allModels) {
      if (m.provider) set.add(m.provider);
    }
    return Array.from(set);
  }, [allModels]);

  const reviewPhimModelIds = useMemo(() => {
    return allModels.filter((m) => m.isReviewPhim).map((m) => m.id);
  }, [allModels]);

  const filteredModels = useMemo(() => {
    return allModels.filter((m) => {
      const matchesSearch =
        !searchQuery.trim() ||
        m.id.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        m.label.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        m.provider.toLowerCase().includes(searchQuery.toLowerCase().trim());

      const matchesProvider =
        selectedProvider === "all" ||
        m.provider.toLowerCase() === selectedProvider.toLowerCase();

      let matchesCategory = true;
      if (categoryFilter === "review_phim") {
        matchesCategory = m.isReviewPhim;
      } else if (categoryFilter === "vision") {
        matchesCategory = m.category === "vision";
      } else if (categoryFilter === "cinema") {
        matchesCategory = m.category === "cinema";
      } else if (categoryFilter === "voice") {
        matchesCategory = m.category === "voice";
      } else if (categoryFilter === "transcription") {
        matchesCategory = m.category === "transcription";
      }

      return matchesSearch && matchesProvider && matchesCategory;
    });
  }, [allModels, searchQuery, selectedProvider, categoryFilter]);

  return {
    allModels,
    filteredModels,
    providersList,
    loading,
    searchQuery,
    setSearchQuery,
    selectedProvider,
    setSelectedProvider,
    categoryFilter,
    setCategoryFilter,
    reviewPhimModelIds,
  };
}
