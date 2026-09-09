import { useState, useEffect, useCallback, useMemo } from "react";
import type { Provider } from "../../../core/types";
import {
  providerService,
  type CreateProviderPayload,
  type UpdateProviderPayload,
} from "../services/providerService";
import { showToast } from "../../../core/swal";
import { useI18n } from "../../../core/i18n";

export type ProviderFilterType =
  | "all"
  | "active"
  | "disabled"
  | "cinema"
  | "vision"
  | "reasoning"
  | "speed"
  | "tts"
  | "transcription"
  | "meridians"
  | "direct";

export interface ModelCategoryInfo {
  groupId: string;
  groupName: string;
  badge: string;
  badgeColor: string;
  badgeBg: string;
  badgeBorder: string;
}

export function getModelCategoryInfo(name: string, model: string, purpose?: string | null): ModelCategoryInfo {
  const lowerName = (name || "").toLowerCase();
  const lowerModel = (model || "").toLowerCase();
  const lowerPurpose = (purpose || "").toLowerCase();

  if (lowerName.includes("elevenlabs") || lowerModel.includes("eleven") || lowerPurpose.includes("voice ai") || lowerPurpose.includes("lồng tiếng")) {
    return {
      groupId: "tts",
      groupName: "Voice AI & Lồng Tiếng Diễn Xuất",
      badge: "Voice AI",
      badgeColor: "#e11d48",
      badgeBg: "#fff1f2",
      badgeBorder: "#fecdd3",
    };
  }
  if (lowerName.includes("vbee") || lowerModel.includes("vbee") || lowerModel.includes("vi-manhdung") || lowerPurpose.includes("review phim")) {
    return {
      groupId: "tts",
      groupName: "Voice AI & Lồng Tiếng Diễn Xuất",
      badge: "Review Phim",
      badgeColor: "#ea580c",
      badgeBg: "#fff7ed",
      badgeBorder: "#ffedd5",
    };
  }
  if (lowerName.includes("whisper") || lowerModel.includes("whisper") || lowerPurpose.includes("bóc tách phụ đề") || lowerPurpose.includes("transcription")) {
    return {
      groupId: "transcription",
      groupName: "Bóc Tách Phụ Đề & Âm Thanh (Whisper)",
      badge: "Whisper SRT",
      badgeColor: "#059669",
      badgeBg: "#ecfdf5",
      badgeBorder: "#a7f3d0",
    };
  }
  if (lowerName.includes("opus 4.8") || lowerModel.includes("opus-4.8") || lowerPurpose.includes("điện ảnh") || lowerName.includes("claude-opus")) {
    return {
      groupId: "cinema",
      groupName: "Kịch Bản Điện Ảnh & Review Phim Triệu View",
      badge: "Điện Ảnh",
      badgeColor: "#7c3aed",
      badgeBg: "#f5f3ff",
      badgeBorder: "#ddd6fe",
    };
  }
  if (lowerName.includes("thinking") || lowerModel.includes("thinking") || lowerName.includes("reasoner") || lowerModel.includes("reasoner") || lowerName.includes("o3-mini") || lowerModel.includes("o3-mini") || lowerPurpose.includes("suy luận") || lowerPurpose.includes("cot")) {
    return {
      groupId: "reasoning",
      groupName: "Suy Luận Logic & Khớp Timeline (Reasoning CoT)",
      badge: "Suy Luận CoT",
      badgeColor: "#0284c7",
      badgeBg: "#f0f9ff",
      badgeBorder: "#bae6fd",
    };
  }
  if (lowerName.includes("vision") || lowerModel.includes("gpt-4o") || lowerModel.includes("gemini") || lowerPurpose.includes("thị giác") || lowerPurpose.includes("khung hình")) {
    return {
      groupId: "vision",
      groupName: "Thị Giác Video & Đa Phương Thức (Vision)",
      badge: "Thị Giác 1M",
      badgeColor: "#2563eb",
      badgeBg: "#eff6ff",
      badgeBorder: "#bfdbfe",
    };
  }
  if (lowerName.includes("mini") || lowerModel.includes("mini") || lowerName.includes("groq") || lowerPurpose.includes("siêu tốc") || lowerPurpose.includes("tiết kiệm")) {
    return {
      groupId: "speed",
      groupName: "Siêu Tốc Độ & Tối Ưu Chi Phí",
      badge: "Siêu Tốc",
      badgeColor: "#d97706",
      badgeBg: "#fffbeb",
      badgeBorder: "#fde68a",
    };
  }
  if (lowerName.includes("sonnet") || lowerModel.includes("sonnet") || lowerPurpose.includes("lời bình") || lowerPurpose.includes("kịch bản")) {
    return {
      groupId: "cinema",
      groupName: "Kịch Bản Điện Ảnh & Review Phim Triệu View",
      badge: "Kịch Bản",
      badgeColor: "#7c3aed",
      badgeBg: "#f5f3ff",
      badgeBorder: "#ddd6fe",
    };
  }
  return {
    groupId: "analysis",
    groupName: "Phân Tích & Viết Lời Bình Kịch Bản",
    badge: "Đa Năng",
    badgeColor: "#475569",
    badgeBg: "#f8fafc",
    badgeBorder: "#e2e8f0",
  };
}

export interface UseProvidersManagementOptions {
  externalSearch?: string;
  onNotify?: (msg: string, type?: "success" | "error") => void;
}

export const useProvidersManagement = ({
  externalSearch = "",
  onNotify,
}: UseProvidersManagementOptions = {}) => {
  const { t } = useI18n();

  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState(externalSearch);
  const [filterTab, setFilterTab] = useState<ProviderFilterType>("all");

  // View Mode: flat table vs grouped
  const [viewMode, setViewMode] = useState<"flat" | "grouped">("flat");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [providerToDelete, setProviderToDelete] = useState<Provider | null>(null);

  // Latency Testing
  const [testingId, setTestingId] = useState<string | null>(null);
  const [isTestingAll, setIsTestingAll] = useState(false);
  const [latencies, setLatencies] = useState<
    Record<string, { latency_ms: number; status: string; detail?: string }>
  >({});

  const notify = useCallback(
    (msg: string, type: "success" | "error" = "success") => {
      if (onNotify) onNotify(msg, type);
      else showToast(msg, type);
    },
    [onNotify]
  );

  // Fetch Providers from Server DB
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await providerService.getProviders();
      setProviders(data);
    } catch {
      notify(t("toastSaveError", "Không thể tải danh sách AI Providers"), "error");
    } finally {
      setLoading(false);
    }
  }, [notify, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Sync external search
  useEffect(() => {
    if (externalSearch) {
      setSearchQuery(externalSearch);
    }
  }, [externalSearch]);

  // Reset page when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterTab, searchQuery, pageSize]);

  // Metrics
  const metrics = useMemo(() => {
    const total = providers.length;
    const active = providers.filter((p) => p.is_enabled ?? p.enabled ?? true).length;
    const disabled = total - active;
    const visionCount = providers.filter(
      (p) => (p.capabilities || []).includes("vision") || getModelCategoryInfo(p.name, p.model, p.purpose).groupId === "vision"
    ).length;
    const ttsCount = providers.filter(
      (p) => (p.capabilities || []).includes("tts") || (p.capabilities || []).includes("transcription") || getModelCategoryInfo(p.name, p.model, p.purpose).groupId === "tts"
    ).length;
    const cinemaCount = providers.filter(
      (p) => getModelCategoryInfo(p.name, p.model, p.purpose).groupId === "cinema"
    ).length;
    const reasoningCount = providers.filter(
      (p) => getModelCategoryInfo(p.name, p.model, p.purpose).groupId === "reasoning"
    ).length;

    return { total, active, disabled, visionCount, ttsCount, cinemaCount, reasoningCount };
  }, [providers]);

  // Filtered list
  const filteredList = useMemo(() => {
    let list = providers;

    if (filterTab === "active") {
      list = list.filter((p) => p.is_enabled ?? p.enabled ?? true);
    } else if (filterTab === "disabled") {
      list = list.filter((p) => !(p.is_enabled ?? p.enabled ?? true));
    } else if (filterTab === "cinema") {
      list = list.filter((p) => getModelCategoryInfo(p.name, p.model, p.purpose).groupId === "cinema");
    } else if (filterTab === "vision") {
      list = list.filter((p) => (p.capabilities || []).includes("vision") || getModelCategoryInfo(p.name, p.model, p.purpose).groupId === "vision");
    } else if (filterTab === "reasoning") {
      list = list.filter((p) => getModelCategoryInfo(p.name, p.model, p.purpose).groupId === "reasoning");
    } else if (filterTab === "speed") {
      list = list.filter((p) => getModelCategoryInfo(p.name, p.model, p.purpose).groupId === "speed");
    } else if (filterTab === "tts") {
      list = list.filter((p) => (p.capabilities || []).includes("tts") || getModelCategoryInfo(p.name, p.model, p.purpose).groupId === "tts");
    } else if (filterTab === "transcription") {
      list = list.filter((p) => (p.capabilities || []).includes("transcription") || getModelCategoryInfo(p.name, p.model, p.purpose).groupId === "transcription");
    } else if (filterTab === "meridians") {
      list = list.filter((p) => (p.base_url || "").includes("api-meridians"));
    } else if (filterTab === "direct") {
      list = list.filter((p) => !(p.base_url || "").includes("api-meridians"));
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.provider_type?.toLowerCase().includes(q) ||
          p.model?.toLowerCase().includes(q) ||
          p.tts_model?.toLowerCase().includes(q) ||
          p.base_url?.toLowerCase().includes(q) ||
          p.purpose?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [providers, filterTab, searchQuery]);

  // Paginated list
  const totalPages = Math.max(1, Math.ceil(filteredList.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedList = useMemo(() => {
    if (viewMode === "grouped") return filteredList;
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, safeCurrentPage, pageSize, viewMode]);

  // Grouped data mapping
  const groupedData = useMemo(() => {
    const groups: Record<string, { info: ModelCategoryInfo; items: Provider[] }> = {};
    for (const p of filteredList) {
      const cat = getModelCategoryInfo(p.name, p.model, p.purpose);
      if (!groups[cat.groupId]) {
        groups[cat.groupId] = { info: cat, items: [] };
      }
      groups[cat.groupId].items.push(p);
    }
    return Object.values(groups);
  }, [filteredList]);

  // Toggle Collapse
  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setSelectedProvider(null);
    setIsCreating(true);
    setShowEditorModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (p: Provider) => {
    setSelectedProvider(p);
    setIsCreating(false);
    setShowEditorModal(true);
  };

  // Open Delete Modal
  const handleOpenDelete = (p: Provider) => {
    setProviderToDelete(p);
    setShowDeleteModal(true);
  };

  // Toggle Status
  const handleToggleStatus = async (p: Provider) => {
    const isCurrentlyEnabled = p.is_enabled ?? p.enabled ?? true;
    try {
      await providerService.toggleProvider(p.id, !isCurrentlyEnabled);
      notify(t("toastToggleSuccess", `Đã ${!isCurrentlyEnabled ? "bật" : "tắt"} provider ${p.name}`), "success");
      await fetchData();
    } catch (err: any) {
      notify(err instanceof Error ? err.message : t("toastSaveError", "Lỗi đổi trạng thái"), "error");
    }
  };

  // Handle Delete Submit
  const handleDeleteSubmit = async () => {
    if (!providerToDelete) return;
    try {
      setLoading(true);
      await providerService.deleteProvider(providerToDelete.id);
      notify(t("toastDeleteSuccess", `Đã xóa provider ${providerToDelete.name}`), "success");
      setShowDeleteModal(false);
      setProviderToDelete(null);
      await fetchData();
    } catch (err: any) {
      notify(err instanceof Error ? err.message : t("toastSaveError", "Lỗi xóa provider"), "error");
    } finally {
      setLoading(false);
    }
  };

  // Test Latency for 1 Provider
  const handleTestLatency = async (p: Provider) => {
    setTestingId(p.id);
    try {
      const res = await providerService.testLatency(p.id);
      setLatencies((prev) => ({ ...prev, [p.id]: res }));
      if (res.status === "reachable" || res.status === "OK") {
        notify(`${t("toastTestSuccess", "Kết nối thành công:")} ${p.name} (${res.latency_ms}ms)`, "success");
      } else if (res.status === "missing_api_key") {
        notify(`⚠️ ${p.name}: ${res.detail || "Chưa có API Key"}`, "error");
      } else {
        notify(`⚠️ ${p.name}: ${res.detail || res.status}`, "error");
      }
      return res;
    } catch (err: any) {
      notify(`${t("toastTestError", "Kiểm tra kết nối thất bại:")} ${p.name}`, "error");
      return null;
    } finally {
      setTestingId(null);
    }
  };

  // Test All Latencies
  const handleTestAllLatencies = async () => {
    setIsTestingAll(true);
    try {
      const activeList = providers.filter((p) => p.is_enabled ?? p.enabled ?? true);
      for (const p of activeList) {
        await handleTestLatency(p);
      }
    } finally {
      setIsTestingAll(false);
    }
  };

  // Save Provider (Create or Update)
  const handleSaveSubmit = async (payload: CreateProviderPayload | UpdateProviderPayload) => {
    try {
      setIsSaving(true);
      if (isCreating || !selectedProvider) {
        await providerService.createProvider(payload as CreateProviderPayload);
        notify(t("toastCreateSuccess", "Đã thêm mới AI Provider thành công."), "success");
      } else {
        await providerService.updateProvider(selectedProvider.id, payload as UpdateProviderPayload);
        notify(t("toastUpdateSuccess", "Đã cập nhật AI Provider thành công."), "success");
      }
      setShowEditorModal(false);
      setSelectedProvider(null);
      await fetchData();
    } catch (err: any) {
      notify(err instanceof Error ? err.message : t("toastSaveError", "Không thể lưu AI Provider"), "error");
    } finally {
      setIsSaving(false);
    }
  };

  return {
    providers,
    loading,
    isSaving,
    searchQuery,
    setSearchQuery,
    filterTab,
    setFilterTab,
    viewMode,
    setViewMode,
    collapsedGroups,
    toggleGroupCollapse,
    currentPage: safeCurrentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    filteredList,
    paginatedList,
    groupedData,
    totalPages,
    metrics,
    // Modals
    showEditorModal,
    setShowEditorModal,
    isCreating,
    selectedProvider,
    showDeleteModal,
    setShowDeleteModal,
    providerToDelete,
    // Latencies
    testingId,
    isTestingAll,
    latencies,
    // Actions
    fetchData,
    handleOpenCreate,
    handleOpenEdit,
    handleOpenDelete,
    handleToggleStatus,
    handleDeleteSubmit,
    handleTestLatency,
    handleTestAllLatencies,
    handleSaveSubmit,
  };
};
