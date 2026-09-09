import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { modelPricingService, type ModelPricing } from "../services/modelPricingService";
import { showToast } from "../../../core/swal";
import { useI18n } from "../../../core/i18n";

export interface ModelPricingFormState {
  model: string;
  provider_name: string;
  category: string;
  cost_input_price: number;
  cost_output_price: number;
  input_price: number;
  output_price: number;
  cache_discount_pct: number;
  price_per_request: number;
  is_selling: boolean;
  purpose: string;
}

const defaultFormState: ModelPricingFormState = {
  model: "",
  provider_name: "Google Gemini",
  category: "analysis",
  cost_input_price: 500,
  cost_output_price: 800,
  input_price: 850,
  output_price: 1350,
  cache_discount_pct: 20,
  price_per_request: 5,
  is_selling: true,
  purpose: "",
};

interface UseModelPricingManagementOptions {
  externalSearch?: string;
  onNotify?: (msg: string, type?: "success" | "error") => void;
}

export function useModelPricingManagement(options: UseModelPricingManagementOptions = {}) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [models, setModels] = useState<ModelPricing[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState(options.externalSearch || "");

  // Profit Simulation Calculator States
  const [simModel, setSimModel] = useState<string>("");
  const [simVideoMinutes, setSimVideoMinutes] = useState<number>(30);
  const [simVideosCount, setSimVideosCount] = useState<number>(10);

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState<ModelPricingFormState>({ ...defaultFormState });
  const [editingModel, setEditingModel] = useState<ModelPricing | null>(null);
  const [editForm, setEditForm] = useState<ModelPricingFormState>({ ...defaultFormState });
  const [deletingModel, setDeletingModel] = useState<ModelPricing | null>(null);

  // Stabilize onNotify to prevent infinite re-render loops
  const onNotifyRef = useRef(options.onNotify);
  useEffect(() => {
    onNotifyRef.current = options.onNotify;
  }, [options.onNotify]);

  const notify = useCallback((msg: string, type: "success" | "error" = "success") => {
    showToast(msg, type);
    if (onNotifyRef.current) onNotifyRef.current(msg, type);
  }, []);

  // Sync external search query safely
  const externalSearch = options.externalSearch;
  useEffect(() => {
    if (externalSearch !== undefined) {
      setSearchQuery(externalSearch);
    }
  }, [externalSearch]);

  const fetchPricing = useCallback(async () => {
    try {
      setLoading(true);
      const list = await modelPricingService.getModelPricing();
      setModels(list);
      setSimModel((curr) => {
        if (curr && list.some((m) => m.model === curr)) return curr;
        return list.length > 0 ? list[0].model : "";
      });
    } catch {
      notify(t("toastFetchPricingError", "Không thể nạp dữ liệu bảng giá model"), "error");
    } finally {
      setLoading(false);
    }
  }, [notify, t]);

  // Initial fetch on mount
  useEffect(() => {
    fetchPricing();
  }, [fetchPricing]);

  // Toggle Selling status for a single model
  const handleToggleStatus = useCallback((targetId: string) => {
    setModels((prev) =>
      prev.map((item) => {
        if (item.id === targetId || item.model === targetId) {
          const newSelling = !item.is_selling;
          return {
            ...item,
            is_selling: newSelling,
            status: newSelling ? "selling" : "need_pricing",
          };
        }
        return item;
      })
    );
  }, []);

  // Inline Quick Price Change
  const handleQuickPriceChange = useCallback(
    (
      targetId: string,
      field: "input_price" | "output_price" | "cache_discount_pct" | "price_per_request",
      value: number
    ) => {
      setModels((prev) =>
        prev.map((item) => {
          if (item.id === targetId || item.model === targetId) {
            return {
              ...item,
              [field]: value,
            };
          }
          return item;
        })
      );
    },
    []
  );

  // Open Edit Modal
  const handleOpenEdit = useCallback((item: ModelPricing) => {
    setEditingModel(item);
    setEditForm({
      model: item.model,
      provider_name: item.provider_name || "API",
      category: item.category || "analysis",
      cost_input_price: item.cost_input_price ?? 500,
      cost_output_price: item.cost_output_price ?? 800,
      input_price: item.input_price ?? 850,
      output_price: item.output_price ?? 1350,
      cache_discount_pct: item.cache_discount_pct ?? 20,
      price_per_request: item.price_per_request ?? 5,
      is_selling: item.is_selling,
      purpose: item.purpose || "",
    });
  }, []);

  // Submit Edit Modal
  const handleSaveEditSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingModel) return;

      setModels((prev) =>
        prev.map((item) => {
          if (item.id === editingModel.id || item.model === editingModel.model) {
            return {
              ...item,
              model: editForm.model.trim(),
              provider_name: editForm.provider_name.trim(),
              category: editForm.category,
              cost_input_price: Number(editForm.cost_input_price) || 0,
              cost_output_price: Number(editForm.cost_output_price) || 0,
              input_price: Number(editForm.input_price) || 0,
              output_price: Number(editForm.output_price) || 0,
              cache_discount_pct: Number(editForm.cache_discount_pct) || 0,
              price_per_request: Number(editForm.price_per_request) || 0,
              is_selling: editForm.is_selling,
              status: editForm.is_selling ? "selling" : "need_pricing",
              purpose: editForm.purpose.trim(),
            };
          }
          return item;
        })
      );

      notify(t("toastUpdateModelConfig", "Đã cập nhật cấu hình model. Bấm 'Lưu thay đổi' để áp dụng."), "success");
      setEditingModel(null);
    },
    [editingModel, editForm, notify, t]
  );

  // Open Add Modal
  const handleOpenAdd = useCallback(() => {
    setAddForm({ ...defaultFormState });
    setShowAddModal(true);
  }, []);

  // Submit Add Modal
  const handleAddModelSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!addForm.model.trim()) {
        notify(t("toastEnterModelId", "Vui lòng nhập tên Model AI"), "error");
        return;
      }

      const newItem: ModelPricing = {
        id: `mp-${Date.now()}`,
        model: addForm.model.trim(),
        provider_name: addForm.provider_name.trim(),
        category: addForm.category,
        cost_input_price: Number(addForm.cost_input_price) || 500,
        cost_output_price: Number(addForm.cost_output_price) || 800,
        input_price: Number(addForm.input_price) || 850,
        output_price: Number(addForm.output_price) || 1350,
        cache_discount_pct: Number(addForm.cache_discount_pct) || 20,
        price_per_request: Number(addForm.price_per_request) || 5,
        is_selling: Boolean(addForm.is_selling),
        status: addForm.is_selling ? "selling" : "need_pricing",
        purpose: addForm.purpose || "",
      };

      setModels((prev) => [...prev, newItem]);
      setShowAddModal(false);
      notify(t("toastAddModelSuccess", "Đã thêm model mới vào danh sách. Bấm 'Lưu thay đổi' để áp dụng."), "success");
    },
    [addForm, notify, t]
  );

  // Open Delete Modal
  const handleOpenDelete = useCallback((item: ModelPricing) => {
    setDeletingModel(item);
  }, []);

  // Submit Delete
  const handleDeleteModelSubmit = useCallback(async () => {
    if (!deletingModel) return;
    setModels((prev) => prev.filter((m) => m.id !== deletingModel.id && m.model !== deletingModel.model));
    notify(t("toastDeleteModelSuccess", "Đã xóa model khỏi danh sách. Bấm 'Lưu thay đổi' để áp dụng."), "success");
    setDeletingModel(null);
  }, [deletingModel, notify, t]);

  // Bulk Save All Changes to Backend
  const handleSaveAll = useCallback(async () => {
    try {
      setSaving(true);
      await modelPricingService.saveModelPricing(models);
      notify(t("toastSavePricingSuccess", "Đã lưu và áp dụng toàn bộ bảng giá cho Tool Desktop thành công!"), "success");
      await fetchPricing();
    } catch (err: any) {
      notify(err instanceof Error ? err.message : t("toastSavePricingError", "Không thể lưu bảng giá"), "error");
    } finally {
      setSaving(false);
    }
  }, [models, notify, fetchPricing, t]);

  // Sync Models from AI Providers Gateway
  const handleSyncProviders = useCallback(async () => {
    try {
      setSyncing(true);
      const list = await modelPricingService.syncModelsFromProviders();
      if (Array.isArray(list) && list.length > 0) {
        setModels(list);
      }
      notify(t("toastSyncProvidersSuccess", "Đã đồng bộ model từ AI Providers thành công!"), "success");
    } catch (err: any) {
      notify(err instanceof Error ? err.message : t("toastSyncProvidersError", "Đồng bộ thất bại"), "error");
    } finally {
      setSyncing(false);
    }
  }, [notify, t]);

  // Filtered Models
  const filteredModels = useMemo(() => {
    let list = models;
    if (filterCategory !== "all") {
      if (filterCategory === "selling") {
        list = list.filter((m) => m.is_selling);
      } else if (filterCategory === "paused") {
        list = list.filter((m) => !m.is_selling);
      } else {
        list = list.filter((m) => (m.category || "").toLowerCase() === filterCategory.toLowerCase());
      }
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (m) =>
          m.model.toLowerCase().includes(q) ||
          m.provider_name.toLowerCase().includes(q) ||
          (m.purpose || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [models, filterCategory, searchQuery]);

  // Grouped Models by Provider
  const groupedModels = useMemo(() => {
    const groups: { [key: string]: ModelPricing[] } = {};
    filteredModels.forEach((m) => {
      let pName = (m.provider_name || "Khác").trim();
      const lower = pName.toLowerCase() + " " + m.model.toLowerCase();
      if (lower.includes("gemini") || lower.includes("google")) {
        pName = "Google Gemini";
      } else if (lower.includes("gpt") || lower.includes("openai") || lower.includes("o1") || lower.includes("o3")) {
        pName = "OpenAI GPT";
      } else if (lower.includes("claude") || lower.includes("anthropic")) {
        pName = "Anthropic Claude";
      } else if (lower.includes("glm") || lower.includes("zhipu")) {
        pName = "GLM / Zhipu";
      } else if (lower.includes("deepseek")) {
        pName = "DeepSeek";
      } else if (
        lower.includes("eleven") ||
        lower.includes("vbee") ||
        lower.includes("whisper") ||
        lower.includes("tts") ||
        lower.includes("voice")
      ) {
        pName = "Voice TTS & Whisper SRT";
      }

      if (!groups[pName]) groups[pName] = [];
      groups[pName].push(m);
    });
    return groups;
  }, [filteredModels]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = models.length;
    const selling = models.filter((m) => m.is_selling).length;
    const paused = total - selling;

    // Calculate average gross profit margin across active models
    let totalMarginSum = 0;
    let validCount = 0;
    models.forEach((m) => {
      if (m.is_selling && m.input_price > 0 && m.cost_input_price !== undefined) {
        const margin = ((m.input_price - m.cost_input_price) / m.input_price) * 100;
        totalMarginSum += margin;
        validCount++;
      }
    });

    const avgMargin = validCount > 0 ? Math.round(totalMarginSum / validCount) : 40;
    const providerGroupsCount = Object.keys(groupedModels).length;

    return { total, selling, paused, avgMargin, providerGroupsCount };
  }, [models, groupedModels]);

  // Simulation Calculations
  const simulation = useMemo(() => {
    const selected = models.find((m) => m.model === simModel) || models[0];
    if (!selected) {
      return {
        estTokensIn: 0,
        estTokensOut: 0,
        revenueVnd: 0,
        costVnd: 0,
        profitVnd: 0,
        profitPct: 0,
        selected: null,
      };
    }

    const minutes = Number(simVideoMinutes) || 1;
    const numVideos = Number(simVideosCount) || 1;
    const totalMinutes = minutes * numVideos;

    const estTokensIn = totalMinutes * 1000;
    const estTokensOut = totalMinutes * 180;

    const sellIn = Number(selected.input_price) || 850;
    const sellOut = Number(selected.output_price) || 1350;
    const costIn = Number(selected.cost_input_price) || 500;
    const costOut = Number(selected.cost_output_price) || 800;

    const revenueVnd = Math.round(
      (estTokensIn / 1_000_000) * sellIn * 1000 + (estTokensOut / 1_000_000) * sellOut * 1000
    );

    const costVnd = Math.round(
      (estTokensIn / 1_000_000) * costIn * 1000 + (estTokensOut / 1_000_000) * costOut * 1000
    );

    const profitVnd = revenueVnd - costVnd;
    const profitPct = revenueVnd > 0 ? Math.round((profitVnd / revenueVnd) * 100) : 0;

    return {
      estTokensIn,
      estTokensOut,
      revenueVnd,
      costVnd,
      profitVnd,
      profitPct,
      selected,
    };
  }, [models, simModel, simVideoMinutes, simVideosCount]);

  return {
    models,
    loading,
    saving,
    syncing,
    filterCategory,
    setFilterCategory,
    searchQuery,
    setSearchQuery,
    filteredModels,
    groupedModels,
    metrics,
    // Simulator
    simModel,
    setSimModel,
    simVideoMinutes,
    setSimVideoMinutes,
    simVideosCount,
    setSimVideosCount,
    simulation,
    // Add Modal
    showAddModal,
    setShowAddModal,
    addForm,
    setAddForm,
    handleOpenAdd,
    handleAddModelSubmit,
    // Edit Modal
    editingModel,
    setEditingModel,
    editForm,
    setEditForm,
    handleOpenEdit,
    handleSaveEditSubmit,
    // Delete Modal
    deletingModel,
    setDeletingModel,
    handleOpenDelete,
    handleDeleteModelSubmit,
    // Actions
    fetchPricing,
    handleToggleStatus,
    handleQuickPriceChange,
    handleSaveAll,
    handleSyncProviders,
  };
}
