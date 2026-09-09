import { useState, useEffect, useMemo } from "react";
import type { ProviderPoolItem, ProviderProfile } from "../../../core/types";
import { getRuntime } from "../../../core/runtime";
import { popup } from "../../../shared/popup";
import { PROVIDER_MODEL_PRESETS } from "../constants/modelPresets";
import { getProviderBrandType } from "../utils/analysisHelpers";

export function useProviderConfig(showToast?: (msg: string) => void) {
  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const [cloudModels, setCloudModels] = useState<any[]>([]);
  const [defaultProviderId, setDefaultProviderId] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [isCustomModel, setIsCustomModel] = useState(false);
  const [customModelInput, setCustomModelInput] = useState("");
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [defaultVoiceId, setDefaultVoiceId] = useState("vi-adam-review");
  const [defaultLanguage, setDefaultLanguage] = useState("vi");
  const [syncingQuick, setSyncingQuick] = useState(false);

  // Multi-Provider / Multi-Model pool & Parallel concurrency
  const [useProviderPool, setUseProviderPool] = useState<boolean>(() => {
    return localStorage.getItem("jacs_use_provider_pool") !== "false";
  });
  const [batchConcurrency, setBatchConcurrency] = useState<number>(() => {
    const val = Number(localStorage.getItem("jacs_batch_concurrency"));
    return val >= 1 && val <= 10 ? val : 3;
  });

  // Selected pool keys
  const [selectedPoolKeys, setSelectedPoolKeys] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("jacs_selected_pool_keys");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Fetch available cloud models on mount
  useEffect(() => {
    const apiBase = String((import.meta as any).env?.VITE_API_URL || "https://jacs-studio.nexoratech.com.vn").replace(/\/$/, "");
    fetch(`${apiBase}/api/v1/ai-providers/models-available`, { signal: AbortSignal.timeout(5000) })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        const available = payload?.data || [];
        if (Array.isArray(available) && available.length > 0) {
          setCloudModels(available);
        }
      })
      .catch(() => {});
  }, []);

  // Load AI Providers on startup
  useEffect(() => {
    void getRuntime()
      .getProviderProfiles()
      .then((raw) => {
        const p = Array.isArray(raw) ? raw : [];
        setProviders(p);

        const analysisList = p.filter(
          (item) =>
            item &&
            item.enabled &&
            item.providerType !== "elevenlabs" &&
            !String(item.name || "").toLowerCase().includes("elevenlabs")
        );

        const savedProviderId = localStorage.getItem("jacs_default_analysis_provider_id");
        const matchingSaved = analysisList.find((item) => item.id === savedProviderId);
        const userByok = analysisList.find((item) => item.hasApiKey && !item.isManaged);
        const active = matchingSaved || userByok || analysisList.find((item) => item.hasApiKey) || analysisList[0];

        if (active) {
          setDefaultProviderId(active.id);
          setSelectedModel(active.model || "");
        } else if (p.length > 0 && p[0]) {
          setDefaultProviderId(p[0].id);
          setSelectedModel(p[0].model || "");
        }
      })
      .catch(() => setProviders([]));
  }, []);

  async function handleQuickSync() {
    setSyncingQuick(true);
    try {
      const apiBase = String((import.meta as any).env?.VITE_API_URL || "https://jacs-studio.nexoratech.com.vn").replace(/\/$/, "");
      const res = await fetch(`${apiBase}/api/v1/ai-providers/models-available`, { signal: AbortSignal.timeout(6000) }).catch(() => null);
      if (res && res.ok) {
        const payload = await res.json();
        const available = payload?.data || [];
        if (Array.isArray(available) && available.length > 0) {
          await getRuntime().syncManagedProviders?.(available);
        }
      }
      const p = (await getRuntime().getProviderProfiles()) || [];
      setProviders(p);
      popup.success("Đồng bộ thành công", "Đã cập nhật danh sách AI Provider & Model mới nhất từ Cloud Admin.");
    } catch {
      popup.error("Lỗi đồng bộ", "Không thể kết nối Cloud Admin Gateway.");
    } finally {
      setSyncingQuick(false);
    }
  }

  // Filter active providers
  const configuredProviders = useMemo(() => {
    const analysisList = (providers || []).filter(
      (p) =>
        p &&
        p.enabled &&
        p.providerType !== "elevenlabs" &&
        !String(p.name || "").toLowerCase().includes("elevenlabs")
    );
    return [...analysisList].sort((a, b) => {
      const aScore = !a.isManaged && a.hasApiKey ? 3 : !a.isManaged ? 2 : a.hasApiKey ? 1 : 0;
      const bScore = !b.isManaged && b.hasApiKey ? 3 : !b.isManaged ? 2 : b.hasApiKey ? 1 : 0;
      return bScore - aScore;
    });
  }, [providers]);

  const togglePoolKey = (key: string) => {
    setSelectedPoolKeys((prev) => {
      let next: string[];
      if (prev.includes(key)) {
        next = prev.filter((k) => k !== key);
      } else {
        next = [...prev, key];
      }
      try { localStorage.setItem("jacs_selected_pool_keys", JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const selectAllPoolKeys = (allKeys: string[]) => {
    setSelectedPoolKeys(allKeys);
    try { localStorage.setItem("jacs_selected_pool_keys", JSON.stringify(allKeys)); } catch {}
  };

  const clearAllPoolKeys = () => {
    setSelectedPoolKeys(["__NONE__"]);
    try { localStorage.setItem("jacs_selected_pool_keys", JSON.stringify(["__NONE__"])); } catch {}
  };

  const updateUseProviderPool = (use: boolean) => {
    setUseProviderPool(use);
    try { localStorage.setItem("jacs_use_provider_pool", String(use)); } catch {}
  };

  const updateBatchConcurrency = (c: number) => {
    const safe = Math.max(1, Math.min(10, c));
    setBatchConcurrency(safe);
    try { localStorage.setItem("jacs_batch_concurrency", String(safe)); } catch {}
  };

  const allAvailablePoolItems = useMemo<ProviderPoolItem[]>(() => {
    const list: ProviderPoolItem[] = [];
    const seen = new Set<string>();

    for (const p of configuredProviders) {
      if (p && p.enabled && (p.hasApiKey || p.isManaged)) {
        const brand = getProviderBrandType(p);
        const brandName =
          brand === "gemini"
            ? "Google Gemini"
            : brand === "anthropic"
            ? "Anthropic Claude"
            : brand === "deepseek"
            ? "DeepSeek"
            : brand === "groq"
            ? "Groq Cloud"
            : "OpenAI";
        const cleanName = p.isManaged ? `👑 ${brandName} (Cloud)` : `${brandName} (BYOK)`;
        const pModel =
          p.model ||
          (brand === "gemini"
            ? "gemini-2.5-flash"
            : brand === "anthropic"
            ? "claude-3-7-sonnet"
            : brand === "deepseek"
            ? "deepseek-chat"
            : "gpt-5.6-sol");
        const key = `${p.id}:${pModel}`;
        if (!seen.has(key)) {
          seen.add(key);
          list.push({
            providerId: p.id,
            model: pModel,
            name: cleanName,
            providerType: brand,
          });
        }
      }
    }
    return list;
  }, [configuredProviders]);

  const activeProviderPool = useMemo<ProviderPoolItem[]>(() => {
    if (!selectedPoolKeys || selectedPoolKeys.length === 0) {
      return allAvailablePoolItems;
    }
    if (selectedPoolKeys.includes("__NONE__") && selectedPoolKeys.length === 1) {
      return allAvailablePoolItems.length > 0 ? [allAvailablePoolItems[0]] : [];
    }
    const filtered = allAvailablePoolItems.filter((item) => {
      const key = `${item.providerId}:${item.model}`;
      return selectedPoolKeys.includes(key) || selectedPoolKeys.includes(item.providerId);
    });
    return filtered.length > 0 ? filtered : allAvailablePoolItems;
  }, [allAvailablePoolItems, selectedPoolKeys]);

  const selectedProvider = useMemo(() => {
    return configuredProviders.find((p) => p.id === defaultProviderId) || configuredProviders[0] || (providers && providers[0]);
  }, [configuredProviders, providers, defaultProviderId]);

  const availableModels = useMemo(() => {
    const brand = getProviderBrandType(selectedProvider);
    const presets = PROVIDER_MODEL_PRESETS[brand] || PROVIDER_MODEL_PRESETS.gemini || [];
    const currentModel = selectedProvider?.model;

    const cloudList = (cloudModels || []).filter((m) => {
      const mStr = `${m.provider_name || ""} ${m.model || ""} ${m.provider_type || ""}`.toLowerCase();
      if (brand === "gemini") return mStr.includes("gemini") || mStr.includes("google");
      if (brand === "anthropic") return mStr.includes("claude") || mStr.includes("anthropic") || mStr.includes("opus") || mStr.includes("sonnet");
      if (brand === "deepseek") return mStr.includes("deepseek");
      if (brand === "groq") return mStr.includes("groq") || mStr.includes("llama");
      return !mStr.includes("gemini") && !mStr.includes("claude") && !mStr.includes("deepseek") && !mStr.includes("groq");
    });

    const merged = [...presets];
    for (const cm of cloudList) {
      if (cm.model && !merged.some((m) => m.label === cm.model)) {
        merged.push({
          label: cm.model,
          tag: cm.purpose || `⭐ [${cm.provider_name || "Cloud"}] Đã cấp phép`,
        });
      }
    }

    if (currentModel && !merged.some((m) => m.label === currentModel)) {
      return [{ label: currentModel, tag: "⭐ Mô hình đã chọn" }, ...merged];
    }
    return merged;
  }, [selectedProvider, cloudModels]);

  useEffect(() => {
    if (selectedProvider) {
      setSelectedModel(selectedProvider.model || "");
    }
  }, [selectedProvider?.id, selectedProvider?.model]);

  function handleSelectProvider(id: string) {
    setDefaultProviderId(id);
    try { localStorage.setItem("jacs_default_analysis_provider_id", id); } catch {}
    const p = providers.find((item) => item.id === id);
    if (p) {
      setSelectedModel(p.model || "");
      setIsCustomModel(false);
      showToast?.(`✓ Đã chọn AI Provider: ${p.name}`);
    }
  }

  async function handleSelectModel(newModel: string) {
    if (newModel === "__custom__") {
      setIsCustomModel(true);
      return;
    }
    setIsCustomModel(false);
    setSelectedModel(newModel);
    if (selectedProvider) {
      try {
        await getRuntime().saveProviderProfile({
          id: selectedProvider.id,
          name: selectedProvider.name,
          providerType: selectedProvider.providerType,
          baseUrl: selectedProvider.baseUrl,
          model: newModel,
          capabilities: Array.isArray(selectedProvider.capabilities) ? selectedProvider.capabilities : ["analysis", "vision"],
          enabled: selectedProvider.enabled,
          ttsModel: selectedProvider.ttsModel,
          transcriptionModel: selectedProvider.transcriptionModel,
        });
        const updated = await getRuntime().getProviderProfiles();
        setProviders(updated);
        showToast?.(`✓ Đã kích hoạt mô hình: ${newModel}`);
      } catch (err: any) {
        showToast?.(`⚠️ Không thể lưu mô hình: ${err?.message || err}`);
      }
    }
  }

  async function handleSaveApiKey() {
    const key = apiKeyInput.trim();
    if (!key) {
      showToast?.("⚠️ Vui lòng nhập mã API Key");
      return;
    }
    if (!selectedProvider) return;
    try {
      await getRuntime().saveProviderProfile({
        id: selectedProvider.id,
        name: selectedProvider.name,
        providerType: selectedProvider.providerType,
        baseUrl: selectedProvider.baseUrl,
        model: selectedModel || selectedProvider.model,
        apiKey: key,
        capabilities: Array.isArray(selectedProvider.capabilities) && selectedProvider.capabilities.length ? selectedProvider.capabilities : ["analysis", "vision"],
        enabled: true,
        ttsModel: selectedProvider.ttsModel,
        transcriptionModel: selectedProvider.transcriptionModel,
      });
      const updated = await getRuntime().getProviderProfiles();
      setProviders(updated);
      setShowApiKeyModal(false);
      setApiKeyInput("");
      showToast?.(`🎉 Đã kích hoạt thành công API Key cho ${selectedProvider.name}!`);
    } catch (err: any) {
      showToast?.(`❌ Lỗi lưu API Key: ${err?.message || err}`);
    }
  }

  return {
    providers,
    setProviders,
    configuredProviders,
    defaultProviderId,
    setDefaultProviderId,
    handleSelectProvider,
    selectedModel,
    setSelectedModel,
    handleSelectModel,
    isCustomModel,
    setIsCustomModel,
    customModelInput,
    setCustomModelInput,
    showApiKeyModal,
    setShowApiKeyModal,
    apiKeyInput,
    setApiKeyInput,
    handleSaveApiKey,
    defaultVoiceId,
    setDefaultVoiceId,
    defaultLanguage,
    setDefaultLanguage,
    useProviderPool,
    updateUseProviderPool,
    batchConcurrency,
    updateBatchConcurrency,
    selectedPoolKeys,
    togglePoolKey,
    selectAllPoolKeys,
    clearAllPoolKeys,
    allAvailablePoolItems,
    activeProviderPool,
    selectedProvider,
    availableModels,
    handleQuickSync,
    syncingQuick,
  };
}
