import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { getToken } from "../../../core/session";
import { apiRequest } from "../../../core/api";
import { showToast, confirmDialog } from "../../../core/swal";
import { PricingKeyBanner } from "../components/pricing/PricingKeyBanner";
import { PricingKpiCards } from "../components/pricing/PricingKpiCards";
import { PricingToolbar } from "../components/pricing/PricingToolbar";
import { PricingMyModelsTable } from "../components/pricing/PricingMyModelsTable";
import { PricingMarketplaceTable } from "../components/pricing/PricingMarketplaceTable";
import { PricingEditModal } from "../components/pricing/PricingEditModal";
import { PricingAddCustomModal } from "../components/pricing/PricingAddCustomModal";

export interface KeyInfo {
  masked_key: string;
  provider_name: string;
  provider_id?: string;
  is_active: boolean;
  status_text: string;
  balance_display: string;
  balance_raw: number;
  used_display: string;
  limit_display: string;
  percent_display: string;
  period: string;
  date_range?: string;
}

export interface MyModelItem {
  name: string;
  group: string;
  upstream_price: string;
  upstream_cost_vnd: number;
  client_credits: number;
  client_vnd: number;
  enabled: boolean;
  is_legacy?: boolean;
  is_custom?: boolean;
  notes?: string;
}

export interface AvailableMarketModel {
  product_id: string;
  label: string;
  models: string[];
  price_label: string;
  group: string;
}

export interface AvailableKeyItem {
  provider_id: string;
  provider_name: string;
  masked_key: string;
  is_primary: boolean;
  base_url?: string;
}

interface AiModelsPricingPageProps {
  searchTerm?: string;
  onNotify?: (msg: string, type?: "success" | "error") => void;
}

export const AiModelsPricingPage: React.FC<AiModelsPricingPageProps> = ({
  searchTerm: globalSearch = "",
  onNotify,
}) => {
  const token = getToken() ?? "";
  const [loading, setLoading] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  const [currentKey, setCurrentKey] = useState<KeyInfo | null>(null);
  const [myModels, setMyModels] = useState<MyModelItem[]>([]);
  const [availableModels, setAvailableModels] = useState<AvailableMarketModel[]>([]);
  const [availableKeys, setAvailableKeys] = useState<AvailableKeyItem[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>("all");

  const [activeTab, setActiveTab] = useState<"my_models" | "marketplace">("my_models");
  const [localSearch, setLocalSearch] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string>("all");

  // Edit Modal State
  const [editingModel, setEditingModel] = useState<MyModelItem | null>(null);
  const [editCredits, setEditCredits] = useState<number>(1.0);
  const [editVnd, setEditVnd] = useState<number>(1000);
  const [editEnabled, setEditEnabled] = useState<boolean>(true);
  const [editNotes, setEditNotes] = useState<string>("");

  // Add Custom Modal State
  const [isAddCustomOpen, setIsAddCustomOpen] = useState(false);

  // Ping Test State
  const [testingModel, setTestingModel] = useState<string | null>(null);

  const isFetchingRef = useRef(false);
  const selectedKeyRef = useRef(selectedKey);
  useEffect(() => {
    selectedKeyRef.current = selectedKey;
  }, [selectedKey]);

  const notify = useCallback(
    (msg: string, type: "success" | "error" = "success") => {
      showToast(msg, type);
      if (onNotify) onNotify(msg, type);
    },
    [onNotify]
  );

  const fetchCatalog = useCallback(
    async (targetKeyOverride?: string) => {
      if (!token || isFetchingRef.current) return;
      try {
        isFetchingRef.current = true;
        setLoading(true);
        const activeKey = targetKeyOverride !== undefined ? targetKeyOverride : selectedKeyRef.current;
        const keyParam = activeKey && activeKey !== "all" ? `?key=${encodeURIComponent(activeKey)}` : "";
        const res = await apiRequest<{
          current_key: KeyInfo;
          my_models: MyModelItem[];
          available_models: AvailableMarketModel[];
          available_keys: AvailableKeyItem[];
        }>(`/api/v1/ai-providers/catalog${keyParam}`, {}, token);

        if (res) {
          if (res.current_key) setCurrentKey(res.current_key);
          if (res.my_models) setMyModels(res.my_models);
          if (res.available_models) setAvailableModels(res.available_models);
          if (res.available_keys) setAvailableKeys(res.available_keys);
        }
      } catch {
        // handled
      } finally {
        setLoading(false);
        isFetchingRef.current = false;
      }
    },
    [token]
  );

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  const handleOpenEdit = (m: MyModelItem) => {
    setEditingModel(m);
    setEditCredits(m.client_credits);
    setEditVnd(m.client_vnd);
    setEditEnabled(m.enabled);
    setEditNotes(m.notes || "");
  };

  const handleSaveConfig = async () => {
    if (!editingModel || !token) return;
    try {
      setSavingConfig(true);
      await apiRequest(
        "/api/v1/ai-providers/catalog/model-config",
        {
          method: "POST",
          body: JSON.stringify({
            model_name: editingModel.name,
            client_credits: editCredits,
            client_vnd: editVnd,
            enabled: editEnabled,
            notes: editNotes,
          }),
        },
        token
      );

      setMyModels((prev) =>
        prev.map((item) =>
          item.name === editingModel.name
            ? { ...item, client_credits: editCredits, client_vnd: editVnd, enabled: editEnabled, notes: editNotes }
            : item
        )
      );
      notify(`Đã cập nhật định giá cho model ${editingModel.name}`, "success");
      setEditingModel(null);
    } catch (e: any) {
      notify(e?.message || "Lỗi lưu cấu hình định giá", "error");
    } finally {
      setSavingConfig(false);
    }
  };

  const handleToggleEnable = async (m: MyModelItem) => {
    const newStatus = !m.enabled;
    try {
      await apiRequest(
        "/api/v1/ai-providers/catalog/model-config",
        {
          method: "POST",
          body: JSON.stringify({
            model_name: m.name,
            client_credits: m.client_credits,
            client_vnd: m.client_vnd,
            enabled: newStatus,
            notes: m.notes || "",
          }),
        },
        token
      );

      setMyModels((prev) =>
        prev.map((item) => (item.name === m.name ? { ...item, enabled: newStatus } : item))
      );
      notify(
        newStatus
          ? `Đã mở quyền dùng model ${m.name} cho Client`
          : `Đã tạm khóa model ${m.name} đối với Client`,
        "success"
      );
    } catch {
      notify("Không thể cập nhật trạng thái model", "error");
    }
  };

  const handleTestPing = async (m: MyModelItem) => {
    try {
      setTestingModel(m.name);
      const start = Date.now();
      await apiRequest<{ models?: any[] }>("/api/v1/gateway/models", {}, token);
      const lat = Date.now() - start;
      notify(`Ping ${m.name} thành công (${lat}ms)`, "success");
    } catch {
      notify(`Ping ${m.name} thất bại`, "error");
    } finally {
      setTestingModel(null);
    }
  };

  const handleAddCustomModel = async (item: Partial<MyModelItem>): Promise<boolean> => {
    try {
      await apiRequest(
        "/api/v1/ai-providers/catalog/model-config",
        {
          method: "POST",
          body: JSON.stringify({
            model_name: item.name,
            client_credits: item.client_credits ?? 1.0,
            client_vnd: item.client_vnd ?? 100,
            enabled: item.enabled ?? true,
            notes: item.notes ?? "",
          }),
        },
        token
      );

      const newModel: MyModelItem = {
        name: item.name!,
        group: item.group || "Custom",
        upstream_price: item.upstream_price || "$0.002 / 1k",
        upstream_cost_vnd: item.upstream_cost_vnd || 50,
        client_credits: item.client_credits ?? 1.0,
        client_vnd: item.client_vnd ?? 100,
        enabled: item.enabled ?? true,
        is_custom: true,
        notes: item.notes,
      };

      setMyModels((prev) => [newModel, ...prev]);
      notify(`Đã thêm model tùy chỉnh "${newModel.name}"!`, "success");
      return true;
    } catch (e: any) {
      notify(e?.message || "Lỗi thêm model tùy chỉnh", "error");
      return false;
    }
  };

  const handleDeleteCustomModel = async (m: MyModelItem) => {
    const ok = await confirmDialog({
      title: "Xác nhận xóa model?",
      text: `Xóa model tùy chỉnh "${m.name}" khỏi danh mục định giá?`,
      isDestructive: true,
    });
    if (!ok) return;

    setMyModels((prev) => prev.filter((item) => item.name !== m.name));
    notify(`Đã xóa model "${m.name}" thành công!`, "success");
  };

  const handleImportToPricing = (marketItem: AvailableMarketModel) => {
    const existing = myModels.find((m) => m.name === marketItem.product_id);
    if (existing) {
      handleOpenEdit(existing);
      return;
    }
    const newModel: MyModelItem = {
      name: marketItem.product_id,
      group: marketItem.group,
      upstream_price: marketItem.price_label,
      upstream_cost_vnd: 50,
      client_credits: 1.0,
      client_vnd: 100,
      enabled: true,
      notes: marketItem.label,
    };
    handleOpenEdit(newModel);
  };

  // Filter models
  const query = (globalSearch || localSearch).toLowerCase().trim();
  const filteredMyModels = useMemo(() => {
    return myModels.filter((m) => {
      if (selectedGroup !== "all" && m.group !== selectedGroup) return false;
      if (query && !m.name.toLowerCase().includes(query) && !m.group.toLowerCase().includes(query)) {
        return false;
      }
      return true;
    });
  }, [myModels, selectedGroup, query]);

  const filteredMarketModels = useMemo(() => {
    return availableModels.filter((m) => {
      if (selectedGroup !== "all" && m.group !== selectedGroup) return false;
      if (query && !m.label.toLowerCase().includes(query) && !m.product_id.toLowerCase().includes(query)) {
        return false;
      }
      return true;
    });
  }, [availableModels, selectedGroup, query]);

  const groups = useMemo(() => {
    const set = new Set<string>();
    myModels.forEach((m) => set.add(m.group));
    availableModels.forEach((m) => set.add(m.group));
    return Array.from(set).filter(Boolean);
  }, [myModels, availableModels]);

  const activeCount = myModels.filter((m) => m.enabled).length;
  const customCount = myModels.filter((m) => m.is_custom).length;
  const avgMargin = useMemo(() => {
    const list = myModels.filter((m) => (m.upstream_cost_vnd || 0) > 0);
    if (!list.length) return 50;
    const sum = list.reduce((acc, m) => acc + ((m.client_vnd - m.upstream_cost_vnd) / m.upstream_cost_vnd) * 100, 0);
    return Math.round(sum / list.length);
  }, [myModels]);

  return (
    <div className="space-y-4">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-1">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>💎 Định Giá & Cung Ứng Model AI</span>
          </h2>
          <p className="text-xs text-slate-500">
            Quản lý số dư, quota nhà cung cấp và thiết lập biểu giá credits / token phục vụ người dùng cuối
          </p>
        </div>
      </div>

      {/* Upstream Key Banner */}
      <PricingKeyBanner
        currentKey={currentKey}
        availableKeys={availableKeys}
        selectedKey={selectedKey}
        onKeyChange={(k) => {
          setSelectedKey(k);
          fetchCatalog(k);
        }}
        loading={loading}
        onRefresh={() => fetchCatalog()}
      />

      {/* KPI Cards */}
      <PricingKpiCards
        totalCount={myModels.length}
        activeCount={activeCount}
        customCount={customCount}
        avgMarginPercent={avgMargin}
      />

      {/* Toolbar & Filter */}
      <PricingToolbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        myCount={myModels.length}
        marketCount={availableModels.length}
        searchQuery={localSearch}
        onSearchChange={setLocalSearch}
        selectedGroup={selectedGroup}
        onGroupChange={setSelectedGroup}
        groups={groups}
        onOpenAddCustom={() => setIsAddCustomOpen(true)}
      />

      {/* Tab Tables */}
      {activeTab === "my_models" ? (
        <PricingMyModelsTable
          models={filteredMyModels}
          loading={loading}
          testingModel={testingModel}
          onToggleEnable={handleToggleEnable}
          onOpenEdit={handleOpenEdit}
          onTestPing={handleTestPing}
          onDeleteCustom={handleDeleteCustomModel}
        />
      ) : (
        <PricingMarketplaceTable
          models={filteredMarketModels}
          loading={loading}
          onImportToPricing={handleImportToPricing}
        />
      )}

      {/* Modals */}
      <PricingEditModal
        model={editingModel}
        credits={editCredits}
        onCreditsChange={setEditCredits}
        vnd={editVnd}
        onVndChange={setEditVnd}
        enabled={editEnabled}
        onEnabledChange={setEditEnabled}
        notes={editNotes}
        onNotesChange={setEditNotes}
        saving={savingConfig}
        onClose={() => setEditingModel(null)}
        onSave={handleSaveConfig}
      />

      <PricingAddCustomModal
        isOpen={isAddCustomOpen}
        onClose={() => setIsAddCustomOpen(false)}
        onSubmit={handleAddCustomModel}
      />
    </div>
  );
};
