import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  RefreshCw,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  Save,
  Bot,
  X,
  TrendingUp,
  Coins,
  Calculator,
  Sparkles,
  ShieldCheck,
  Zap,
  Info,
  CheckCircle2,
  Layers,
} from "lucide-react";
import { apiRequest } from "../../../core/api";
import { getToken } from "../../../core/session";
import { showToast, confirmDialog } from "../../../core/swal";

export interface ModelPricing {
  id: string;
  model: string;
  provider_name: string;
  category?: string;
  cost_input_price?: number;
  cost_output_price?: number;
  input_price: number;
  output_price: number;
  cache_discount_pct?: number;
  price_per_request?: number;
  is_selling: boolean;
  status: "selling" | "need_pricing";
  purpose?: string;
}

interface ModelPricingPageProps {
  searchTerm?: string;
  onNotify?: (msg: string, type?: "success" | "error") => void;
}

export const ModelPricingPage: React.FC<ModelPricingPageProps> = ({
  searchTerm: propSearch = "",
  onNotify,
}) => {
  const token = getToken() ?? "";
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [models, setModels] = useState<ModelPricing[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState(propSearch);

  // Profit Simulation Calculator States
  const [simModel, setSimModel] = useState<string>("");
  const [simVideoMinutes, setSimVideoMinutes] = useState<number>(30);
  const [simVideosCount, setSimVideosCount] = useState<number>(10);

  // Add Model Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newModelForm, setNewModelForm] = useState({
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
  });

  // Edit Model Modal State
  const [editingModel, setEditingModel] = useState<ModelPricing | null>(null);
  const [editForm, setEditForm] = useState({
    model: "",
    provider_name: "",
    category: "analysis",
    cost_input_price: 500,
    cost_output_price: 800,
    input_price: 850,
    output_price: 1350,
    cache_discount_pct: 20,
    price_per_request: 5,
    is_selling: true,
    purpose: "",
  });

  const notify = (msg: string, type: "success" | "error" = "success") => {
    showToast(msg, type);
    if (onNotify) onNotify(msg, type);
  };

  const fetchPricing = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await apiRequest<any>(
        "/api/v1/ai-providers/models-pricing",
        {},
        token
      );
      const list = Array.isArray(res) ? res : ((res as any)?.data || []);
      if (Array.isArray(list)) {
        setModels(list);
        if (list.length > 0 && !simModel) {
          setSimModel(list[0].model);
        }
      }
    } catch {
      notify("Không thể nạp dữ liệu bảng giá model", "error");
    } finally {
      setLoading(false);
    }
  }, [token, simModel]);

  useEffect(() => {
    fetchPricing();
  }, [fetchPricing]);

  const handleToggleStatus = (targetId: string) => {
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
  };

  const handlePriceChange = (
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
  };

  const handleOpenEdit = (item: ModelPricing) => {
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
  };

  const handleSaveEditSubmit = (e: React.FormEvent) => {
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

    notify(`Đã cập nhật cấu hình model ${editForm.model}. Nhấn 'Lưu thay đổi' để áp dụng.`, "success");
    setEditingModel(null);
  };

  const handleDeleteModel = async (item: ModelPricing) => {
    const confirmed = await confirmDialog({
      title: "Xác nhận xóa model khỏi bảng giá?",
      html: `<div style="text-align: left; font-size: 13.5px; color: #475569; line-height: 1.6;">
        <p>Bạn có chắc muốn xóa model <b>${item.model}</b> (${item.provider_name}) khỏi danh sách cấp phép?</p>
      </div>`,
      icon: "warning",
      confirmButtonText: "Xóa model",
      cancelButtonText: "Hủy bỏ",
      isDestructive: true,
    });
    if (!confirmed) return;

    setModels((prev) => prev.filter((m) => m.id !== item.id && m.model !== item.model));
    notify(`Đã xóa ${item.model}. Nhấn 'Lưu thay đổi' để ghi nhận.`, "success");
  };

  const handleSyncProviders = async () => {
    try {
      setSyncing(true);
      const res = await apiRequest<any>(
        "/api/v1/ai-providers/models-sync",
        { method: "POST" },
        token
      );
      const list = Array.isArray(res) ? res : ((res as any)?.data || []);
      if (Array.isArray(list) && list.length > 0) {
        setModels(list);
      }
      notify((res as any)?.message || "Đã đồng bộ model từ AI Providers thành công", "success");
    } catch (err: any) {
      notify(err instanceof Error ? err.message : "Đồng bộ thất bại", "error");
    } finally {
      setSyncing(false);
    }
  };

  const handleSaveAll = async () => {
    try {
      setSaving(true);
      await apiRequest(
        "/api/v1/ai-providers/models-pricing",
        {
          method: "PUT",
          body: JSON.stringify({ items: models }),
        },
        token
      );
      notify("Đã lưu và áp dụng toàn bộ bảng giá cho Tool Desktop thành công!", "success");
      await fetchPricing();
    } catch (err: any) {
      notify(err instanceof Error ? err.message : "Không thể lưu bảng giá", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleAddModelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModelForm.model.trim()) {
      notify("Vui lòng nhập tên Model AI", "error");
      return;
    }

    const newItem: ModelPricing = {
      id: `mp-${Date.now()}`,
      model: newModelForm.model.trim(),
      provider_name: newModelForm.provider_name.trim(),
      category: newModelForm.category,
      cost_input_price: Number(newModelForm.cost_input_price) || 500,
      cost_output_price: Number(newModelForm.cost_output_price) || 800,
      input_price: Number(newModelForm.input_price) || 850,
      output_price: Number(newModelForm.output_price) || 1350,
      cache_discount_pct: Number(newModelForm.cache_discount_pct) || 20,
      price_per_request: Number(newModelForm.price_per_request) || 5,
      is_selling: Boolean(newModelForm.is_selling),
      status: newModelForm.is_selling ? "selling" : "need_pricing",
      purpose: newModelForm.purpose || "Cấu hình AI cho tool",
    };

    setModels((prev) => [...prev, newItem]);
    setShowAddModal(false);
    setNewModelForm({
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
    });
    notify(`Đã thêm model ${newItem.model}. Hãy bấm 'Lưu thay đổi' để áp dụng.`, "success");
  };

  // Filtered List
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

  // Group filtered models by Provider Name
  const groupedModels = useMemo(() => {
    const groups: { [key: string]: ModelPricing[] } = {};
    filteredModels.forEach((m) => {
      let pName = (m.provider_name || "Khác").trim();
      const lower = pName.toLowerCase() + " " + m.model.toLowerCase();
      if (lower.includes("gemini") || lower.includes("google")) {
        pName = "Gemini";
      } else if (lower.includes("gpt") || lower.includes("openai") || lower.includes("o1") || lower.includes("o3")) {
        pName = "GPT / OpenAI";
      } else if (lower.includes("claude") || lower.includes("anthropic")) {
        pName = "Claude";
      } else if (lower.includes("glm") || lower.includes("zhipu")) {
        pName = "GLM / Zhipu";
      } else if (lower.includes("deepseek")) {
        pName = "DeepSeek";
      } else if (lower.includes("eleven") || lower.includes("vbee") || lower.includes("whisper") || lower.includes("tts") || lower.includes("voice")) {
        pName = "Audio & Voice TTS / Whisper";
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
    return { total, selling, paused };
  }, [models]);

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

  return (
    <div
      className="view-container animate-fade-in"
      style={{ display: "flex", flexDirection: "column", gap: "1.5rem", padding: "1.25rem 1.5rem" }}
    >
      {/* 1. Header with Breadcrumb & Primary Actions */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "12px",
              color: "#64748b",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              marginBottom: "4px",
            }}
          >
            <span>Dịch Vụ & Mô Hình AI</span>
            <span>/</span>
            <span style={{ color: "#334155", fontWeight: 700 }}>Cấu hình gói model</span>
          </div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", margin: "4px 0" }}>
            Cấu Hình Gói Model & Định Giá Chi Tiết
          </h1>
          <p style={{ color: "#64748b", fontSize: "13px", margin: 0 }}>
            Quản lý cấp phép, định giá Token In/Out/Request và lợi nhuận cho từng model AI trên Tool Desktop.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={handleSyncProviders}
            disabled={syncing}
            style={{
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              padding: "8px 14px",
              fontSize: "13px",
              fontWeight: 650,
              color: "#334155",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            }}
          >
            <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
            Đồng bộ Providers
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            style={{
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              padding: "8px 14px",
              fontSize: "13px",
              fontWeight: 650,
              color: "#334155",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            }}
          >
            <Plus size={15} />
            + Thêm model
          </button>

          <button
            type="button"
            onClick={handleSaveAll}
            disabled={saving}
            style={{
              background: "linear-gradient(135deg, #ea580c 0%, #f97316 100%)",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              padding: "8px 18px",
              fontSize: "13px",
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              cursor: saving ? "not-allowed" : "pointer",
              boxShadow: "0 2px 8px rgba(234, 88, 12, 0.25)",
            }}
          >
            <Save size={15} />
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </div>

      {/* 2. Main Card: Model Table */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "14px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          overflow: "hidden",
        }}
      >
        {/* Table Top Header Note */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div>
            <h2 style={{ fontSize: "15px", fontWeight: 800, color: "#0f172a", margin: 0, textTransform: "uppercase", letterSpacing: "0.4px" }}>
              MODEL ĐƯỢC DÙNG & GIÁ RIÊNG CHO TOOL DESKTOP
            </h2>
            <p style={{ fontSize: "12px", color: "#64748b", margin: "4px 0 0" }}>
              Bỏ tick = key không gọi được model đó. Bấm <b>Sửa</b> để mở modal chỉnh sửa chi tiết giá vốn, giá bán và cấu hình.
            </p>
          </div>

          {/* Search Box on Right */}
          <div style={{ position: "relative", minWidth: "260px" }}>
            <input
              type="text"
              placeholder="Lọc Model AI..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "7px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "12.5px",
                outline: "none",
                boxSizing: "border-box",
                background: "#f8fafc",
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Filter Category Pills */}
        <div
          style={{
            padding: "8px 20px",
            background: "#fafafa",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            gap: "6px",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {[
            { key: "all", label: `Tất cả (${models.length})` },
            { key: "selling", label: `🟢 Đang cấp phép (${metrics.selling})` },
            { key: "paused", label: `⚪ Đang tắt (${metrics.paused})` },
            { key: "cinema", label: `🎬 Điện ảnh` },
            { key: "vision", label: `👁️ Thị giác` },
            { key: "reasoning", label: `🧠 Reasoning` },
            { key: "tts", label: `🗣️ Voice TTS` },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilterCategory(tab.key)}
              style={{
                background: filterCategory === tab.key ? "#0f172a" : "#ffffff",
                color: filterCategory === tab.key ? "#ffffff" : "#475569",
                border: filterCategory === tab.key ? "1px solid #0f172a" : "1px solid #e2e8f0",
                padding: "4px 10px",
                borderRadius: "6px",
                fontSize: "11.5px",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Table Content */}
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              minWidth: "1100px",
              borderCollapse: "collapse",
              fontSize: "13px",
              textAlign: "left",
            }}
          >
            <thead>
              <tr
                style={{
                  background: "#ffffff",
                  borderBottom: "1px solid #f1f5f9",
                  color: "#64748b",
                  fontSize: "11.5px",
                  fontWeight: 750,
                  letterSpacing: "0.3px",
                }}
              >
                <th style={{ padding: "12px 20px", width: "26%" }}>Model</th>
                <th style={{ padding: "12px 12px", width: "11%" }}>Vào đ/1M</th>
                <th style={{ padding: "12px 12px", width: "11%" }}>Ra đ/1M</th>
                <th style={{ padding: "12px 12px", width: "14%", color: "#d97706" }}>Quy đổi Credit (In/Out)</th>
                <th style={{ padding: "12px 10px", width: "9%" }}>Cache %</th>
                <th style={{ padding: "12px 10px", width: "9%" }}>đ/request</th>
                <th style={{ padding: "12px 12px", width: "9%", textAlign: "center" }}>Cấp phép</th>
                <th style={{ padding: "12px 16px", width: "11%", textAlign: "right" }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredModels.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: "40px 20px", textAlign: "center", color: "#94a3b8" }}>
                    <Bot size={32} style={{ margin: "0 auto 8px", opacity: 0.4 }} />
                    <div style={{ fontWeight: 700, fontSize: "13.5px", color: "#64748b" }}>
                      Không tìm thấy model nào phù hợp
                    </div>
                  </td>
                </tr>
              ) : (
                Object.entries(groupedModels).map(([providerGroup, groupItems]) => (
                  <React.Fragment key={providerGroup}>
                    {/* Provider Group Header Row */}
                    <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", borderTop: "1px solid #e2e8f0" }}>
                      <td
                        colSpan={8}
                        style={{
                          padding: "10px 20px",
                          fontWeight: 800,
                          fontSize: "12.5px",
                          color: "#334155",
                          letterSpacing: "0.2px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ color: "#f97316" }}>●</span>
                          <span>{providerGroup}</span>
                          <span style={{ fontSize: "11px", background: "#e2e8f0", color: "#475569", padding: "1px 6px", borderRadius: "10px", fontWeight: 700 }}>
                            {groupItems.length} model
                          </span>
                        </div>
                      </td>
                    </tr>

                    {/* Models within Group */}
                    {groupItems.map((item) => {
                      const costIn = item.cost_input_price ?? 0;
                      const costOut = item.cost_output_price ?? 0;
                      const cachePct = item.cache_discount_pct ?? 20;
                      const reqPrice = item.price_per_request ?? (item.input_price > 0 ? Math.round(item.input_price / 100) : 0);

                      return (
                        <tr
                          key={item.id || item.model}
                          style={{
                            borderBottom: "1px solid #f8fafc",
                            transition: "background 0.15s ease",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "#fafafa")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          {/* 1. Model Checkbox + Name + Hint */}
                          <td style={{ padding: "12px 20px" }}>
                            <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                              <input
                                type="checkbox"
                                checked={item.is_selling}
                                onChange={() => handleToggleStatus(item.id || item.model)}
                                style={{
                                  marginTop: "3px",
                                  width: "16px",
                                  height: "16px",
                                  cursor: "pointer",
                                  accentColor: "#2563eb",
                                }}
                              />
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 750, color: item.is_selling ? "#0f172a" : "#94a3b8", fontSize: "13.5px" }}>
                                  {item.model}
                                </div>
                                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                                  gốc: {costIn > 0 || costOut > 0 ? `In ${costIn.toLocaleString()}đ / Out ${costOut.toLocaleString()}đ` : "0đ/request (không tính token)"}
                                  {item.purpose && <span style={{ color: "#94a3b8" }}> • {item.purpose}</span>}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* 2. Vào đ/1M Input */}
                          <td style={{ padding: "12px 12px" }}>
                            <input
                              type="number"
                              min="0"
                              step="50"
                              value={item.input_price}
                              onChange={(e) => handlePriceChange(item.id || item.model, "input_price", Number(e.target.value) || 0)}
                              style={{
                                width: "90px",
                                padding: "6px 8px",
                                borderRadius: "8px",
                                border: "1px solid #cbd5e1",
                                background: "#ffffff",
                                fontSize: "13px",
                                fontWeight: 700,
                                color: "#0f172a",
                                textAlign: "center",
                                outline: "none",
                              }}
                            />
                          </td>

                          {/* 3. Ra đ/1M Input */}
                          <td style={{ padding: "12px 12px" }}>
                            <input
                              type="number"
                              min="0"
                              step="50"
                              value={item.output_price}
                              onChange={(e) => handlePriceChange(item.id || item.model, "output_price", Number(e.target.value) || 0)}
                              style={{
                                width: "90px",
                                padding: "6px 8px",
                                borderRadius: "8px",
                                border: "1px solid #cbd5e1",
                                background: "#ffffff",
                                fontSize: "13px",
                                fontWeight: 700,
                                color: "#0f172a",
                                textAlign: "center",
                                outline: "none",
                              }}
                            />
                          </td>

                          {/* 4. Quy đổi Credit (In / Out) */}
                          <td style={{ padding: "12px 12px" }}>
                            <div
                              style={{
                                display: "inline-flex",
                                flexDirection: "column",
                                gap: "2px",
                                background: "rgba(245, 158, 11, 0.08)",
                                border: "1px solid rgba(245, 158, 11, 0.25)",
                                padding: "4px 8px",
                                borderRadius: "6px",
                                fontSize: "11.5px",
                                fontWeight: 750,
                                color: "#b45309",
                                whiteSpace: "nowrap",
                              }}
                            >
                              <span>In: {((item.input_price || 0) / 1000).toFixed(2)} Cr/1M</span>
                              <span>Out: {((item.output_price || 0) / 1000).toFixed(2)} Cr/1M</span>
                            </div>
                          </td>

                          {/* 5. Cache % */}
                          <td style={{ padding: "12px 10px" }}>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={cachePct}
                              onChange={(e) => handlePriceChange(item.id || item.model, "cache_discount_pct", Number(e.target.value) || 0)}
                              style={{
                                width: "65px",
                                padding: "6px 6px",
                                borderRadius: "8px",
                                border: "1px solid #cbd5e1",
                                background: "#ffffff",
                                fontSize: "13px",
                                fontWeight: 700,
                                color: "#0f172a",
                                textAlign: "center",
                                outline: "none",
                              }}
                            />
                          </td>

                          {/* 6. đ/request */}
                          <td style={{ padding: "12px 10px" }}>
                            <input
                              type="number"
                              min="0"
                              value={reqPrice}
                              onChange={(e) => handlePriceChange(item.id || item.model, "price_per_request", Number(e.target.value) || 0)}
                              style={{
                                width: "65px",
                                padding: "6px 6px",
                                borderRadius: "8px",
                                border: "1px solid #cbd5e1",
                                background: "#ffffff",
                                fontSize: "13px",
                                fontWeight: 700,
                                color: "#0f172a",
                                textAlign: "center",
                                outline: "none",
                              }}
                            />
                          </td>

                          {/* 7. Cấp phép Status Badge */}
                          <td style={{ padding: "12px 12px", textAlign: "center" }}>
                            <span
                              onClick={() => handleToggleStatus(item.id || item.model)}
                              style={{
                                display: "inline-block",
                                padding: "4px 10px",
                                borderRadius: "6px",
                                fontSize: "11.5px",
                                fontWeight: 750,
                                cursor: "pointer",
                                border: item.is_selling ? "1px solid #a7f3d0" : "1px solid #e2e8f0",
                                background: item.is_selling ? "#ecfdf5" : "#f8fafc",
                                color: item.is_selling ? "#059669" : "#94a3b8",
                                whiteSpace: "nowrap",
                              }}
                              title="Click để bật/tắt cấp phép"
                            >
                              {item.is_selling ? "giá riêng" : "tắt"}
                            </span>
                          </td>

                          {/* 8. Action Buttons (Sửa & Xóa) */}
                          <td style={{ padding: "12px 18px", textAlign: "right" }}>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                              {/* Nút Sửa mở Modal */}
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(item)}
                                style={{
                                  background: "#eff6ff",
                                  border: "1px solid #bfdbfe",
                                  color: "#2563eb",
                                  padding: "5px 9px",
                                  borderRadius: "6px",
                                  fontSize: "11.5px",
                                  fontWeight: 650,
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "3px",
                                }}
                                title="Chỉnh sửa chi tiết model qua popup"
                              >
                                Sửa
                              </button>

                              {/* Nút Xóa */}
                              <button
                                type="button"
                                onClick={() => handleDeleteModel(item)}
                                style={{
                                  background: "#fff1f2",
                                  border: "1px solid #fecdd3",
                                  color: "#e11d48",
                                  padding: "5px 7px",
                                  borderRadius: "6px",
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                                title="Xóa model"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Save Bar */}
        <div
          style={{
            padding: "14px 20px",
            background: "#f8fafc",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <button
            type="button"
            onClick={fetchPricing}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              fontSize: "13px",
              fontWeight: 650,
              color: "#475569",
              cursor: "pointer",
            }}
          >
            Đóng
          </button>

          <button
            type="button"
            onClick={handleSaveAll}
            disabled={saving}
            style={{
              background: "#2563eb",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              padding: "8px 20px",
              fontSize: "13px",
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              cursor: saving ? "not-allowed" : "pointer",
              boxShadow: "0 2px 8px rgba(37, 99, 235, 0.25)",
            }}
          >
            <Save size={15} />
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </div>

      {/* 3. MODAL SỬA CHI TIẾT MODEL AI */}
      {editingModel && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
            padding: "1rem",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "14px",
              width: "100%",
              maxWidth: "540px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
              border: "1px solid #e2e8f0",
              overflow: "hidden",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #f1f5f9",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#f8fafc",
              }}
            >
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                  ✏️ Chỉnh Sửa Định Giá Model: {editingModel.model}
                </h3>
                <span style={{ fontSize: "11.5px", color: "#64748b" }}>
                  Hãng cung cấp: <b>{editingModel.provider_name}</b>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditingModel(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                  padding: "4px",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEditSubmit} style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px", maxHeight: "80vh", overflowY: "auto" }}>
              {/* Tên Model & Provider */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                    Tên Model AI
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.model}
                    onChange={(e) => setEditForm({ ...editForm, model: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                      fontWeight: 700,
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                    Nhà Cung Cấp
                  </label>
                  <input
                    type="text"
                    value={editForm.provider_name}
                    onChange={(e) => setEditForm({ ...editForm, provider_name: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              {/* Giá Vốn In / Out */}
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "12px" }}>
                <div style={{ fontSize: "11.5px", fontWeight: 750, color: "#991b1b", marginBottom: "8px" }}>
                  Giá Vốn Nhà Cung Cấp (Cost / 1M Tokens)
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", color: "#64748b", marginBottom: "3px" }}>
                      Giá Vốn Vào (đ/1M)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.cost_input_price}
                      onChange={(e) => setEditForm({ ...editForm, cost_input_price: Number(e.target.value) || 0 })}
                      style={{
                        width: "100%",
                        padding: "6px 10px",
                        borderRadius: "6px",
                        border: "1px solid #fca5a5",
                        fontSize: "13px",
                        fontWeight: 700,
                        color: "#991b1b",
                        background: "#ffffff",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", color: "#64748b", marginBottom: "3px" }}>
                      Giá Vốn Ra (đ/1M)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.cost_output_price}
                      onChange={(e) => setEditForm({ ...editForm, cost_output_price: Number(e.target.value) || 0 })}
                      style={{
                        width: "100%",
                        padding: "6px 10px",
                        borderRadius: "6px",
                        border: "1px solid #fca5a5",
                        fontSize: "13px",
                        fontWeight: 700,
                        color: "#991b1b",
                        background: "#ffffff",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Giá Bán In / Out */}
              <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "12px" }}>
                <div style={{ fontSize: "11.5px", fontWeight: 750, color: "#1e40af", marginBottom: "8px" }}>
                  Giá Bán Trừ Credit Khách (Sell / 1M Tokens)
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", color: "#64748b", marginBottom: "3px" }}>
                      Giá Bán Vào (đ/1M)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.input_price}
                      onChange={(e) => setEditForm({ ...editForm, input_price: Number(e.target.value) || 0 })}
                      style={{
                        width: "100%",
                        padding: "6px 10px",
                        borderRadius: "6px",
                        border: "1.5px solid #93c5fd",
                        fontSize: "13px",
                        fontWeight: 750,
                        color: "#1e40af",
                        background: "#ffffff",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", color: "#64748b", marginBottom: "3px" }}>
                      Giá Bán Ra (đ/1M)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.output_price}
                      onChange={(e) => setEditForm({ ...editForm, output_price: Number(e.target.value) || 0 })}
                      style={{
                        width: "100%",
                        padding: "6px 10px",
                        borderRadius: "6px",
                        border: "1.5px solid #93c5fd",
                        fontSize: "13px",
                        fontWeight: 750,
                        color: "#1e40af",
                        background: "#ffffff",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Cache % & Đơn giá / request */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                    Tỷ Lệ Cache Discount (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editForm.cache_discount_pct}
                    onChange={(e) => setEditForm({ ...editForm, cache_discount_pct: Number(e.target.value) || 0 })}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                    Đơn Giá Trên Mỗi Request (đ)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.price_per_request}
                    onChange={(e) => setEditForm({ ...editForm, price_per_request: Number(e.target.value) || 0 })}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              {/* Checkbox Cấp phép Bán cho Tool */}
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px 14px", display: "flex", alignItems: "center", gap: "10px" }}>
                <input
                  type="checkbox"
                  id="editIsSelling"
                  checked={editForm.is_selling}
                  onChange={(e) => setEditForm({ ...editForm, is_selling: e.target.checked })}
                  style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#2563eb" }}
                />
                <label htmlFor="editIsSelling" style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a", cursor: "pointer" }}>
                  🟢 Cấp phép cho Tool Desktop sử dụng model này
                </label>
              </div>

              {/* Mục đích sử dụng */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                  Mục Đích Sử Dụng / Ghi Chú
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Kịch bản điện ảnh, Phân cảnh Video 4K..."
                  value={editForm.purpose}
                  onChange={(e) => setEditForm({ ...editForm, purpose: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Action Buttons in Modal */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "6px" }}>
                <button
                  type="button"
                  onClick={() => setEditingModel(null)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    fontSize: "13px",
                    fontWeight: 650,
                    cursor: "pointer",
                  }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  style={{
                    padding: "8px 20px",
                    borderRadius: "6px",
                    border: "none",
                    background: "#2563eb",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 2px 6px rgba(37, 99, 235, 0.25)",
                  }}
                >
                  Lưu Cập Nhật
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. MODAL THÊM MODEL MỚI */}
      {showAddModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
            padding: "1rem",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "14px",
              width: "100%",
              maxWidth: "520px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
              border: "1px solid #e2e8f0",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #f1f5f9",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#f8fafc",
              }}
            >
              <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                ➕ Thêm Model AI Mới Vào Bảng Giá
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                  padding: "4px",
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddModelSubmit} style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                    Mã Model AI <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: gemini-3.6-flash..."
                    value={newModelForm.model}
                    onChange={(e) => setNewModelForm({ ...newModelForm, model: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                      fontWeight: 700,
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                    Nhà Cung Cấp
                  </label>
                  <input
                    type="text"
                    placeholder="Gemini, OpenAI, Claude..."
                    value={newModelForm.provider_name}
                    onChange={(e) => setNewModelForm({ ...newModelForm, provider_name: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#ea580c", marginBottom: "4px" }}>
                    Giá Bán Vào (đ/1M)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newModelForm.input_price}
                    onChange={(e) => setNewModelForm({ ...newModelForm, input_price: Number(e.target.value) || 0 })}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid #fecaca",
                      background: "#fff7ed",
                      fontSize: "13px",
                      fontWeight: 700,
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#ea580c", marginBottom: "4px" }}>
                    Giá Bán Ra (đ/1M)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newModelForm.output_price}
                    onChange={(e) => setNewModelForm({ ...newModelForm, output_price: Number(e.target.value) || 0 })}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid #fecaca",
                      background: "#fff7ed",
                      fontSize: "13px",
                      fontWeight: 700,
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#64748b", marginBottom: "4px" }}>
                    Cache Discount (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newModelForm.cache_discount_pct}
                    onChange={(e) => setNewModelForm({ ...newModelForm, cache_discount_pct: Number(e.target.value) || 0 })}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#64748b", marginBottom: "4px" }}>
                    Đơn Giá Request (đ)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newModelForm.price_per_request}
                    onChange={(e) => setNewModelForm({ ...newModelForm, price_per_request: Number(e.target.value) || 0 })}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                  Mục Đích Sử Dụng
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Phân cảnh video, kịch bản điện ảnh..."
                  value={newModelForm.purpose}
                  onChange={(e) => setNewModelForm({ ...newModelForm, purpose: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    fontSize: "13px",
                    fontWeight: 650,
                    cursor: "pointer",
                  }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  style={{
                    cursor: "pointer",
                  }}
                >
                  Thêm Model
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelPricingPage;
