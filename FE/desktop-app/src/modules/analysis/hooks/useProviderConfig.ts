import { useState, useEffect, useMemo } from "react";
import type { ProviderPoolItem, ProviderProfile } from "../../../core/types";
import { getRuntime } from "../../../core/runtime";
import { popup } from "../../../shared/popup";
import { getApiBaseUrl } from "../../../core/api";
import { PROVIDER_MODEL_PRESETS } from "../constants/modelPresets";
import { getProviderBrandType } from "../utils/analysisHelpers";

export function useProviderConfig(showToast?: (msg: string) => void, allowedModelsProp?: string[] | null) {
  const [providers, setProviders] = useState<ProviderProfile[]>([]);
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

  // Extract allowedModels from prop or from localStorage
  const allowedModels = useMemo<string[]>(() => {
    if (allowedModelsProp && Array.isArray(allowedModelsProp)) {
      return allowedModelsProp;
    }
    try {
      const saved = localStorage.getItem("jacs_allowed_models");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  }, [allowedModelsProp]);

  // Load AI Providers on startup
  useEffect(() => {
    void getRuntime()
      .getProviderProfiles()
      .then((raw) => {
        const p = Array.isArray(raw) ? raw : [];
        setProviders(p);
      })
      .catch(() => setProviders([]));
  }, []);

  // Quick sync directly from server
  async function handleQuickSync() {
    setSyncingQuick(true);
    try {
      const p = (await getRuntime().getProviderProfiles()) || [];
      setProviders(p);
      popup.success("Đồng bộ thành công", "Đã cập nhật danh sách AI Provider & Model mới nhất.");
    } catch {
      popup.error("Lỗi đồng bộ", "Không thể đồng bộ danh sách AI Provider.");
    } finally {
      setSyncingQuick(false);
    }
  }

  // 1. Separate Providers: Group A (Cloud Admin) & Group B (Client BYOK)
  const configuredProviders = useMemo<ProviderProfile[]>(() => {
    const list: ProviderProfile[] = [];

    // Group A: Cloud AI Gateway granted by Admin
    if (allowedModels.length > 0) {
      list.push({
        id: "admin-cloud-gateway",
        name: `⚡ Cloud AI Gateway (${allowedModels.length} models từ Admin)`,
        providerType: "openai-compatible",
        baseUrl: `${getApiBaseUrl()}/api/v1/client`,
        model: allowedModels[0] || "gpt-5.6-sol",
        enabled: true,
        isManaged: true,
        hasApiKey: true,
        maskedKey: "********",
        capabilities: ["analysis", "vision"],
      });
    }

    // Group B: Client's BYOK Providers
    const userByoks = (providers || []).filter(
      (p) =>
        p &&
        !p.isManaged &&
        p.enabled &&
        p.providerType !== "elevenlabs" &&
        !String(p.name || "").toLowerCase().includes("elevenlabs")
    );
    for (const p of userByoks) {
      list.push(p);
    }

    return list;
  }, [allowedModels, providers]);

  // Select default provider on load or change
  useEffect(() => {
    if (configuredProviders.length > 0) {
      const savedId = localStorage.getItem("jacs_default_analysis_provider_id");
      const matched = configuredProviders.find((p) => p.id === savedId);
      const active = matched || configuredProviders[0];
      if (active) {
        setDefaultProviderId(active.id);
        if (active.isManaged && allowedModels.length > 0) {
          setSelectedModel((prev) => (prev && allowedModels.includes(prev) ? prev : allowedModels[0]));
        } else if (active.model) {
          setSelectedModel((prev) => prev || active.model || "");
        }
      }
    }
  }, [configuredProviders, allowedModels]);

  const selectedProvider = useMemo(() => {
    return configuredProviders.find((p) => p.id === defaultProviderId) || configuredProviders[0];
  }, [configuredProviders, defaultProviderId]);

  // 2. Dynamic Models based on selected provider
  const availableModels = useMemo(() => {
    // Case 1: Admin Cloud Gateway selected -> Load ALL models granted by Admin
    if (selectedProvider?.isManaged || selectedProvider?.id === "admin-cloud-gateway") {
      if (allowedModels.length > 0) {
        return allowedModels.map((m) => {
          const ml = m.toLowerCase();
          const brand = ml.includes("gemini")
            ? "Google Gemini"
            : ml.includes("claude")
            ? "Anthropic Claude"
            : ml.includes("gpt")
            ? "OpenAI"
            : ml.includes("deepseek")
            ? "DeepSeek"
            : ml.includes("qwen")
            ? "Alibaba Qwen"
            : ml.includes("grok")
            ? "xAI Grok"
            : "Admin AI";
          return {
            label: m,
            tag: `⚡ [${brand}] Cấp từ Admin`,
          };
        });
      }
      return [{ label: "Chưa có model nào", tag: "Chưa được Admin cấp phép" }];
    }

    // Case 2: BYOK Provider selected -> Load models for that specific AI brand
    const brand = getProviderBrandType(selectedProvider);
    const presets = PROVIDER_MODEL_PRESETS[brand] || PROVIDER_MODEL_PRESETS.gemini || [];
    const currentModel = selectedProvider?.model;

    const merged = [...presets];
    if (currentModel && !merged.some((m) => m.label === currentModel)) {
      return [{ label: currentModel, tag: "⭐ Mô hình đã chọn" }, ...merged];
    }
    return merged;
  }, [selectedProvider, allowedModels]);

  // Sync selectedModel with available models
  useEffect(() => {
    if (selectedProvider) {
      if (selectedProvider.isManaged && allowedModels.length > 0) {
        if (!selectedModel || !allowedModels.includes(selectedModel)) {
          setSelectedModel(allowedModels[0]);
        }
      } else if (selectedProvider.model && !selectedModel) {
        setSelectedModel(selectedProvider.model);
      }
    }
  }, [selectedProvider?.id, allowedModels]);

  // 3. Multi-Model Pool items
  const allAvailablePoolItems = useMemo<ProviderPoolItem[]>(() => {
    const list: ProviderPoolItem[] = [];
    const seen = new Set<string>();

    // 1. Admin-granted models
    if (allowedModels.length > 0) {
      for (const m of allowedModels) {
        const key = `admin-cloud-gateway:${m}`;
        if (!seen.has(key)) {
          seen.add(key);
          list.push({
            providerId: "admin-cloud-gateway",
            model: m,
            name: `⚡ Cloud Gateway: ${m}`,
            providerType: "cloud",
          });
        }
      }
    }

    // 2. Personal BYOK models with API key
    const userByoks = (providers || []).filter(
      (p) => p && !p.isManaged && p.enabled && (p.hasApiKey || Boolean((p as any).apiKey))
    );
    for (const p of userByoks) {
      const brand = getProviderBrandType(p);
      const pModel = p.model || "mặc định";
      const key = `${p.id}:${pModel}`;
      if (!seen.has(key)) {
        seen.add(key);
        list.push({
          providerId: p.id,
          model: pModel,
          name: `${p.name} (BYOK)`,
          providerType: brand,
        });
      }
    }

    return list;
  }, [allowedModels, providers]);

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

  function handleSelectProvider(id: string) {
    setDefaultProviderId(id);
    try { localStorage.setItem("jacs_default_analysis_provider_id", id); } catch {}
    const p = configuredProviders.find((item) => item.id === id);
    if (p) {
      if (p.isManaged && allowedModels.length > 0) {
        setSelectedModel(allowedModels[0]);
      } else {
        setSelectedModel(p.model || "");
      }
      setIsCustomModel(false);
      showToast?.(`✓ Đã chọn AI: ${p.name}`);
    }
  }

  async function handleSelectModel(newModel: string) {
    if (newModel === "__custom__") {
      setIsCustomModel(true);
      return;
    }
    setIsCustomModel(false);
    setSelectedModel(newModel);

    if (selectedProvider && !selectedProvider.isManaged) {
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
    } else {
      showToast?.(`✓ Đã chọn mô hình: ${newModel}`);
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
    allowedModels,
  };
}
