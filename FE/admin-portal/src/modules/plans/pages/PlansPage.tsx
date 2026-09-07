import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  RotateCw,
  Save,
  Calculator,
  Sparkles,
  Info,
  CheckCircle2,
  TrendingUp,
  Coins,
  ArrowRight,
  ShieldCheck,
  Zap,
  Package,
  Wallet,
  Bot,
  Layers,
  Search,
  CheckSquare,
  Square,
  RefreshCw,
  Sliders,
  DollarSign,
  Cpu,
  Mic,
  Film,
  Eye,
  X,
  ExternalLink,
  Plus,
  Trash2,
} from "lucide-react";
import type { CreditConfig } from "../../../core/types";
import { planService } from "../services/planService";
import { apiRequest } from "../../../core/api";
import { getToken } from "../../../core/session";
import { showToast, confirmDialog } from "../../../core/swal";
import { useI18n } from "../../../core/i18n";
import "../lang";

export interface ModelPricingItem {
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

interface PlansPageProps {
  searchTerm?: string;
  onNotify?: (msg: string, type?: "success" | "error") => void;
}

export const PlansPage: React.FC<PlansPageProps> = ({ searchTerm: propSearch = "", onNotify }) => {
  const { t } = useI18n();
  const token = getToken() ?? "";

  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [savingModels, setSavingModels] = useState(false);
  const [syncingModels, setSyncingModels] = useState(false);
  const [showModelPricingModal, setShowModelPricingModal] = useState(false);

  // Form State for Global Credit Config
  const [form, setForm] = useState<CreditConfig>({
    price_per_1m_token: 1000,
    cost_per_1m_token: 650,
    token_in_price: 500,
    token_out_price: 900,
    min_deposit_amount: 100000,
    is_active: true,
  });

  // Per-Model Pricing State
  const [models, setModels] = useState<ModelPricingItem[]>([]);
  const [modelSearch, setModelSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Simulator Test Amount & Selected Model
  const [testAmount, setTestAmount] = useState<number>(500000);
  const [selectedSimModelId, setSelectedSimModelId] = useState<string>("global");

  const notify = (msg: string, type: "success" | "error" = "success") => {
    showToast(msg, type);
    if (onNotify) onNotify(msg, type);
  };

  // Fetch Global Credit Config
  const fetchConfig = async () => {
    try {
      setLoading(true);
      const data = await planService.getCreditConfig();
      if (data) {
        setForm({
          price_per_1m_token: data.price_per_1m_token ?? 1000,
          cost_per_1m_token: data.cost_per_1m_token ?? 650,
          token_in_price: data.token_in_price ?? 500,
          token_out_price: data.token_out_price ?? 900,
          min_deposit_amount: data.min_deposit_amount ?? 100000,
          is_active: data.is_active ?? true,
        });
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  // Fetch Per-Model Pricing List
  const fetchModelPricing = useCallback(async () => {
    if (!token) return;
    try {
      setModelsLoading(true);
      const res = await apiRequest<any>("/api/v1/ai-providers/models-pricing", {}, token);
      const list = Array.isArray(res) ? res : ((res as any)?.data || []);
      if (Array.isArray(list)) {
        setModels(list);
      }
    } catch {
      notify("Không thể nạp bảng giá chi tiết từng model", "error");
    } finally {
      setModelsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchConfig();
    fetchModelPricing();
  }, [fetchModelPricing]);

  // Save Global Config
  const handleSaveGlobal = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setSaveLoading(true);
      await planService.saveCreditConfig(form);
      notify("Đã lưu cấu hình nạp tiền & tỷ lệ Credit thành công!", "success");
    } catch (err: any) {
      notify(err instanceof Error ? err.message : "Lỗi lưu cấu hình Credit", "error");
    } finally {
      setSaveLoading(false);
    }
  };

  // Save All (Both Global & Per-Model Pricing)
  const handleSaveAll = async () => {
    try {
      setSaveLoading(true);
      setSavingModels(true);
      
      // Save global credit config
      await planService.saveCreditConfig(form);
      
      // Save per-model pricing
      if (models.length > 0) {
        await apiRequest(
          "/api/v1/ai-providers/models-pricing",
          {
            method: "PUT",
            body: JSON.stringify({ items: models }),
          },
          token
        );
      }

      notify("Đã lưu toàn bộ cấu hình gói & định giá từng Model AI thành công!", "success");
      await fetchModelPricing();
    } catch (err: any) {
      notify(err instanceof Error ? err.message : "Lỗi lưu toàn bộ cấu hình", "error");
    } finally {
      setSaveLoading(false);
      setSavingModels(false);
    }
  };

  // Sync Models from AI Providers
  const handleSyncProviders = async () => {
    try {
      setSyncingModels(true);
      const res = await apiRequest<any>(
        "/api/v1/ai-providers/models-sync",
        { method: "POST" },
        token
      );
      const list = Array.isArray(res) ? res : ((res as any)?.data || []);
      if (Array.isArray(list) && list.length > 0) {
        setModels(list);
      }
      notify((res as any)?.message || "Đã đồng bộ danh sách model từ AI Providers thành công", "success");
    } catch (err: any) {
      notify(err instanceof Error ? err.message : "Đồng bộ thất bại", "error");
    } finally {
      setSyncingModels(false);
    }
  };

  // Edit Model Modal State in PlansPage
  const [editingModel, setEditingModel] = useState<ModelPricingItem | null>(null);
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

  // Add Model Modal State in PlansPage
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

  const handleOpenEdit = (item: ModelPricingItem) => {
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

  const handleDeleteModel = async (item: ModelPricingItem) => {
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

  const handleAddModelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModelForm.model.trim()) {
      notify("Vui lòng nhập tên Model AI", "error");
      return;
    }

    const newItem: ModelPricingItem = {
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

  // Per-Model handlers
  const handleToggleModelStatus = (targetId: string) => {
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

  const handleModelPriceChange = (
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

  // Filtered Models
  const filteredModels = useMemo(() => {
    const q = (modelSearch || propSearch).toLowerCase().trim();
    return models.filter((m) => {
      const matchSearch =
        !q ||
        m.model.toLowerCase().includes(q) ||
        m.provider_name.toLowerCase().includes(q) ||
        (m.purpose && m.purpose.toLowerCase().includes(q));
      
      const matchCat =
        categoryFilter === "all" ||
        (categoryFilter === "selling" && m.is_selling) ||
        (categoryFilter === "stopped" && !m.is_selling) ||
        m.category === categoryFilter;

      return matchSearch && matchCat;
    });
  }, [models, modelSearch, propSearch, categoryFilter]);

  // Group filtered models by Provider Name
  const groupedModels = useMemo(() => {
    const groups: { [key: string]: ModelPricingItem[] } = {};
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

  // Selected Model for Simulation
  const currentSimModel = useMemo(() => {
    if (selectedSimModelId === "global") return null;
    return models.find((m) => m.id === selectedSimModelId || m.model === selectedSimModelId) || null;
  }, [selectedSimModelId, models]);

  // Realtime Formula Calculations for Simulator
  const { calcTokens, calcCredit, calcCost, calcProfit, profitMargin, activeSellPrice, activeCostPrice } = useMemo(() => {
    const amt = Number(testAmount) || 0;
    
    let pSell = Number(form.price_per_1m_token) || 1000;
    let pCost = Number(form.cost_per_1m_token) || 650;

    if (currentSimModel) {
      // Average selling and cost for this specific model (assuming 70% In, 30% Out)
      const inSell = Number(currentSimModel.input_price) || 0;
      const outSell = Number(currentSimModel.output_price) || 0;
      pSell = inSell * 0.7 + outSell * 0.3;
      if (pSell <= 0) pSell = 1000;

      const inCost = Number(currentSimModel.cost_input_price) || 0;
      const outCost = Number(currentSimModel.cost_output_price) || 0;
      pCost = inCost * 0.7 + outCost * 0.3;
    }

    // Tokens volume (in Millions) = Khách chuyển / Giá bán
    const tokensInMillion = pSell > 0 ? amt / pSell : 0;

    // Credit added to key (1 Credit = 1.000 VND)
    const creditAdded = Math.round(amt / 1000);

    // Cost paid to AI Providers = Khối lượng (M) * Giá vốn (đ)
    const costPaid = Math.round(tokensInMillion * pCost);

    // Net Profit = Khách nạp - Chi phí vốn
    const profit = amt - costPaid;

    const margin = amt > 0 ? (profit / amt) * 100 : 0;

    return {
      calcTokens: tokensInMillion,
      calcCredit: creditAdded,
      calcCost: costPaid,
      calcProfit: profit,
      profitMargin: margin,
      activeSellPrice: pSell,
      activeCostPrice: pCost,
    };
  }, [testAmount, form.price_per_1m_token, form.cost_per_1m_token, currentSimModel]);

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: "22px", padding: "1.25rem 1.5rem", paddingBottom: "50px" }}
      className="animate-fade-in"
    >
      {/* 1. Header with Breadcrumbs & Action */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div style={{ fontSize: "12px", color: "#64748b", display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
            <span>JACS Studio</span>
            <span>/</span>
            <span>Dịch vụ & Mô hình AI</span>
            <span>/</span>
            <span style={{ color: "#ea580c", fontWeight: 600 }}>Cấu hình gói & Định giá từng Model</span>
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-0.02em" }}>
            Cấu Hình Gói & Định Giá Từng Loại Model AI
          </h1>
          <p style={{ fontSize: "13px", color: "#64748b", margin: "4px 0 0" }}>
            Cấu hình giá bán & giá vốn riêng biệt cho từng Model AI (Gemini, Claude, GPT, DeepSeek, Whisper, ElevenLabs) kèm tỷ lệ quy đổi nạp SePay.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            onClick={() => {
              fetchConfig();
              fetchModelPricing();
            }}
            disabled={loading || modelsLoading}
            style={{
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              color: "#475569",
              padding: "8px 14px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 650,
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              cursor: loading || modelsLoading ? "not-allowed" : "pointer",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            }}
          >
            <RotateCw size={14} className={loading || modelsLoading ? "animate-spin" : ""} />
            Làm mới
          </button>

          <button
            type="button"
            onClick={handleSaveAll}
            disabled={saveLoading || savingModels}
            style={{
              background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              padding: "8px 20px",
              fontSize: "13.5px",
              fontWeight: 750,
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              cursor: saveLoading || savingModels ? "not-allowed" : "pointer",
              boxShadow: "0 4px 14px rgba(234, 88, 12, 0.35)",
            }}
          >
            <Save size={15} />
            {saveLoading || savingModels ? "Đang lưu cấu hình..." : "Lưu Toàn Bộ Cấu Hình"}
          </button>
        </div>
      </div>

      {/* 2. Top 3 Pre-configured Deposit Plans Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
        
        {/* Plan 1 */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            padding: "18px 20px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "11.5px", fontWeight: 750, color: "#0284c7", background: "#f0f9ff", border: "1px solid #bae6fd", padding: "2px 8px", borderRadius: "6px" }}>
              GÓI KHỞI NGHIỆP
            </span>
            <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>Tự động SePay QR</span>
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "#0f172a" }}>
            100.000 <span style={{ fontSize: "14px", fontWeight: 600, color: "#64748b" }}>VNĐ</span>
          </div>
          <div style={{ fontSize: "13px", color: "#059669", fontWeight: 750, marginTop: "4px" }}>
            Nhận 100 Credits <span style={{ fontSize: "11.5px", color: "#64748b", fontWeight: 500 }}>(≈ 100M Tokens)</span>
          </div>
          <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "8px", borderTop: "1px dashed #f1f5f9", paddingTop: "8px" }}>
            🎯 Phù hợp khách trải nghiệm phân tích 10-15 video ngắn.
          </div>
        </div>

        {/* Plan 2: Best Value */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "12px",
            border: "2px solid #ea580c",
            padding: "18px 20px",
            boxShadow: "0 4px 14px rgba(234, 88, 12, 0.08)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", top: "0", right: "0", background: "#ea580c", color: "#ffffff", fontSize: "9.5px", fontWeight: 800, padding: "2px 10px", borderBottomLeftRadius: "8px" }}>
            KHUYÊN DÙNG ⭐
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "11.5px", fontWeight: 750, color: "#ea580c", background: "#fff7ed", border: "1px solid #fed7aa", padding: "2px 8px", borderRadius: "6px" }}>
              GÓI CHUYÊN NGHIỆP
            </span>
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "#0f172a" }}>
            500.000 <span style={{ fontSize: "14px", fontWeight: 600, color: "#64748b" }}>VNĐ</span>
          </div>
          <div style={{ fontSize: "13px", color: "#ea580c", fontWeight: 800, marginTop: "4px" }}>
            Nhận 550 Credits <span style={{ fontSize: "11px", background: "#ecfdf5", color: "#059669", padding: "1px 6px", borderRadius: "4px", fontWeight: 700 }}>+Tặng 10%</span>
          </div>
          <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "8px", borderTop: "1px dashed #f1f5f9", paddingTop: "8px" }}>
            🎯 Dành cho Kênh YouTube / TikToker xuất 50-80 video / tháng.
          </div>
        </div>

        {/* Plan 3 */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            padding: "18px 20px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "11.5px", fontWeight: 750, color: "#7c3aed", background: "#f5f3ff", border: "1px solid #ddd6fe", padding: "2px 8px", borderRadius: "6px" }}>
              GÓI DOANH NGHIỆP / STUDIO
            </span>
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "#0f172a" }}>
            1.000.000 <span style={{ fontSize: "14px", fontWeight: 600, color: "#64748b" }}>VNĐ</span>
          </div>
          <div style={{ fontSize: "13px", color: "#7c3aed", fontWeight: 800, marginTop: "4px" }}>
            Nhận 1.200 Credits <span style={{ fontSize: "11px", background: "#ecfdf5", color: "#059669", padding: "1px 6px", borderRadius: "4px", fontWeight: 700 }}>+Tặng 20%</span>
          </div>
          <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "8px", borderTop: "1px dashed #f1f5f9", paddingTop: "8px" }}>
            🎯 Phân tích video số lượng lớn, không giới hạn model cao cấp.
          </div>
        </div>

      </div>

      {/* 3. Main 2-Column Grid: Cấu hình quy đổi SePay vs Mô phỏng lợi nhuận */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: "22px" }}>
        
        {/* Left Column: Cấu hình nạp tiền SePay */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            border: "1px solid #e2e8f0",
            borderTop: "3.5px solid #ea580c",
            padding: "24px 28px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
            <h2 style={{ fontSize: "17px", fontWeight: 800, color: "#0f172a", margin: 0 }}>
              Cấu hình Tỷ Lệ Nạp Tiền & Credit Chung
            </h2>
            <span style={{ fontSize: "11px", color: "#059669", background: "#ecfdf5", border: "1px solid #a7f3d0", padding: "2px 8px", borderRadius: "10px", fontWeight: 700 }}>
              🟢 Đang hoạt động
            </span>
          </div>

          <form onSubmit={handleSaveGlobal} style={{ display: "flex", flexDirection: "column", gap: "16px", flex: 1 }}>
            
            {/* Field 1: Giá bán / 1M Token mặc định */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <label style={{ fontSize: "13px", fontWeight: 700, color: "#334155" }}>
                  Giá bán Token mặc định (VNĐ / 1M Token)
                </label>
                <span style={{ fontSize: "11px", color: "#ea580c", fontWeight: 650 }}>Áp dụng khi model chưa cấu hình riêng</span>
              </div>
              <input
                type="number"
                min="0"
                step="any"
                required
                value={form.price_per_1m_token}
                onChange={(e) => setForm({ ...form, price_per_1m_token: Number(e.target.value) || 0 })}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1.5px solid #fed7aa",
                  fontSize: "14px",
                  fontWeight: 750,
                  color: "#c2410c",
                  outline: "none",
                  boxSizing: "border-box",
                  background: "#fff7ed",
                }}
              />
            </div>

            {/* Field 2: Giá vốn trung bình */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <label style={{ fontSize: "13px", fontWeight: 700, color: "#334155" }}>
                  Giá vốn API trung bình (VNĐ / 1M Token)
                </label>
                <span style={{ fontSize: "11px", color: "#64748b" }}>Chi phí ước lượng trả hãng</span>
              </div>
              <input
                type="number"
                min="0"
                step="any"
                required
                value={form.cost_per_1m_token}
                onChange={(e) => setForm({ ...form, cost_per_1m_token: Number(e.target.value) || 0 })}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "14px",
                  fontWeight: 650,
                  color: "#0f172a",
                  outline: "none",
                  boxSizing: "border-box",
                  background: "#ffffff",
                }}
              />
            </div>

            {/* Field 3 & 4: Giá Token IN vs OUT mặc định */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                  Đơn giá Token IN mặc định (đ/1M)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={form.token_in_price}
                  onChange={(e) => setForm({ ...form, token_in_price: Number(e.target.value) || 0 })}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13.5px",
                    fontWeight: 650,
                    color: "#0f172a",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                  Đơn giá Token OUT mặc định (đ/1M)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={form.token_out_price}
                  onChange={(e) => setForm({ ...form, token_out_price: Number(e.target.value) || 0 })}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13.5px",
                    fontWeight: 650,
                    color: "#0f172a",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            {/* Field 5: Số tiền nạp tối thiểu */}
            <div>
              <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                Hạn mức nạp SePay tối thiểu (VNĐ)
              </label>
              <input
                type="number"
                min="0"
                step="10000"
                value={form.min_deposit_amount}
                onChange={(e) => setForm({ ...form, min_deposit_amount: Number(e.target.value) || 0 })}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13.5px",
                  fontWeight: 650,
                  color: "#0f172a",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Submit Button */}
            <div style={{ marginTop: "8px" }}>
              <button
                type="submit"
                disabled={saveLoading}
                style={{
                  background: "linear-gradient(135deg, #ea580c 0%, #f97316 100%)",
                  color: "#ffffff",
                  border: "none",
                  padding: "10px 22px",
                  borderRadius: "8px",
                  fontSize: "13.5px",
                  fontWeight: 750,
                  cursor: saveLoading ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "7px",
                  boxShadow: "0 2px 8px rgba(234, 88, 12, 0.25)",
                }}
              >
                <Save size={15} />
                {saveLoading ? "Đang lưu..." : "Lưu Cấu Hình Nạp Tiền"}
              </button>
            </div>

          </form>
        </div>

        {/* Right Column: 🧮 Kiểm tra công thức & Giả lập lợi nhuận */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            border: "1px solid #e2e8f0",
            padding: "24px 28px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "0 0 16px" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#fff7ed", border: "1px solid #fed7aa", display: "flex", alignItems: "center", justifyContent: "center", color: "#ea580c" }}>
              <Calculator size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: "17px", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                Giả lập & Dự toán Lợi Nhuận
              </h2>
              <div style={{ fontSize: "11.5px", color: "#64748b" }}>Chọn Model cụ thể hoặc Toàn hệ thống để tính ROI tức thời</div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px", flex: 1 }}>
            
            {/* Chọn Model để mô phỏng */}
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "5px" }}>
                Chọn Model AI cần tính toán lợi nhuận:
              </label>
              <select
                value={selectedSimModelId}
                onChange={(e) => setSelectedSimModelId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1.5px solid #fed7aa",
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#c2410c",
                  background: "#fff7ed",
                  outline: "none",
                }}
              >
                <option value="global">🌐 Tỷ lệ chung toàn hệ thống ({form.price_per_1m_token}đ / 1M)</option>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    🤖 {m.model} ({m.provider_name}) — Bán {m.input_price}đ/{m.output_price}đ (Vốn {m.cost_input_price ?? 0}đ/{m.cost_output_price ?? 0}đ)
                  </option>
                ))}
              </select>
            </div>

            {/* Khách chuyển test input */}
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "12px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <span style={{ fontSize: "12.5px", color: "#475569", fontWeight: 650 }}>
                  Số tiền khách nạp SePay:
                </span>
                <strong style={{ fontSize: "15px", color: "#ea580c", fontWeight: 800 }}>
                  {Number(testAmount || 0).toLocaleString("vi-VN")} đ
                </strong>
              </div>

              {/* Number Input & Preset Buttons */}
              <input
                type="number"
                min={0}
                step={50000}
                value={testAmount}
                onChange={(e) => setTestAmount(Number(e.target.value) || 0)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1.5px solid #cbd5e1",
                  fontSize: "13.5px",
                  fontWeight: 700,
                  outline: "none",
                  boxSizing: "border-box",
                  background: "#ffffff",
                }}
              />

              <div style={{ display: "flex", gap: "6px", marginTop: "8px", flexWrap: "wrap" }}>
                {[100000, 200000, 500000, 1000000, 2000000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setTestAmount(val)}
                    style={{
                      background: testAmount === val ? "#fff7ed" : "#ffffff",
                      border: testAmount === val ? "1.5px solid #ea580c" : "1px solid #cbd5e1",
                      color: testAmount === val ? "#ea580c" : "#475569",
                      fontSize: "11px",
                      fontWeight: 700,
                      padding: "3px 8px",
                      borderRadius: "6px",
                      cursor: "pointer",
                    }}
                  >
                    {val >= 1000000 ? `${val / 1000000} Triệu` : `${val / 1000}k`}
                  </button>
                ))}
              </div>
            </div>

            {/* Results Grid */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              
              {/* Khối lượng Token */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "8px", borderBottom: "1px dashed #e2e8f0" }}>
                <span style={{ fontSize: "12.5px", color: "#475569", fontWeight: 650 }}>
                  Khối lượng Token xử lý:
                </span>
                <span style={{ fontSize: "14px", fontWeight: 800, color: "#0f172a" }}>
                  {calcTokens.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}M Tokens
                </span>
              </div>

              {/* Credit cộng key */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "8px", borderBottom: "1px dashed #e2e8f0" }}>
                <span style={{ fontSize: "12.5px", color: "#475569", fontWeight: 650 }}>
                  Credit nạp tài khoản (1k = 1đ):
                </span>
                <span style={{ fontSize: "14px", fontWeight: 800, color: "#0284c7" }}>
                  {calcCredit.toLocaleString("vi-VN")} Credits
                </span>
              </div>

              {/* Chi phí vốn */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "8px", borderBottom: "1px dashed #e2e8f0" }}>
                <span style={{ fontSize: "12.5px", color: "#475569", fontWeight: 650 }}>
                  Chi phí vốn trả Provider:
                </span>
                <span style={{ fontSize: "14px", fontWeight: 800, color: "#dc2626" }}>
                  {calcCost.toLocaleString("vi-VN")} đ
                </span>
              </div>

              {/* Lợi nhuận gộp */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f0fdf4", border: "1.5px solid #86efac", padding: "10px 14px", borderRadius: "10px" }}>
                <span style={{ fontSize: "13px", color: "#166534", fontWeight: 800 }}>
                  💰 Lợi nhuận Admin thu về:
                </span>
                <span style={{ fontSize: "16px", fontWeight: 900, color: "#15803d" }}>
                  +{calcProfit.toLocaleString("vi-VN")} đ
                  <span style={{ fontSize: "11.5px", fontWeight: 800, color: "#16a34a", marginLeft: "6px" }}>
                    (+{profitMargin.toFixed(1)}%)
                  </span>
                </span>
              </div>

            </div>

          </div>
        </div>

      </div>

      {/* 4. CẤU HÌNH ĐỊNH GIÁ CHI TIẾT TỪNG LOẠI MODEL AI - OVERVIEW CARD & MODAL TRIGGER */}
      <div
        style={{
          background: "linear-gradient(135deg, #ffffff 0%, #fff7ed 100%)",
          borderRadius: "14px",
          border: "1.5px solid #fed7aa",
          boxShadow: "0 2px 12px rgba(234, 88, 12, 0.06)",
          padding: "24px 28px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "20px",
        }}
      >
        <div style={{ flex: 1, minWidth: "300px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "#ea580c",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 10px rgba(234, 88, 12, 0.3)",
              }}
            >
              <Bot size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: "17px", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                Cấu Hình Định Giá Chi Tiết Từng Loại Model AI
              </h3>
              <div style={{ fontSize: "12.5px", color: "#64748b", marginTop: "2px" }}>
                Thiết lập giá vốn & giá bán In/Out riêng cho từng Model. Model nào bật "Đang bán" thì Desktop Tool mới thấy và sử dụng được.
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", marginTop: "12px" }}>
            <span
              style={{
                background: "#dcfce7",
                color: "#15803d",
                border: "1px solid #bbf7d0",
                padding: "3px 10px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <CheckCircle2 size={13} />
              Đang bán: {models.filter((m) => m.is_selling).length} / {models.length} Models
            </span>

            <span
              style={{
                background: "#eff6ff",
                color: "#1d4ed8",
                border: "1px solid #bfdbfe",
                padding: "3px 10px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <TrendingUp size={13} />
              Biên lợi nhuận: ~60% - 87%
            </span>

            <span style={{ fontSize: "12px", color: "#64748b" }}>
              (Gemini, Claude, GPT-4o, DeepSeek, ElevenLabs, Whisper)
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            onClick={() => setShowModelPricingModal(true)}
            style={{
              background: "linear-gradient(135deg, #ea580c 0%, #f97316 100%)",
              color: "#ffffff",
              border: "none",
              borderRadius: "10px",
              padding: "12px 24px",
              fontSize: "14px",
              fontWeight: 800,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 4px 14px rgba(234, 88, 12, 0.35)",
              transition: "transform 0.15s ease",
            }}
            onMouseOver={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
            onMouseOut={(e) => (e.currentTarget.style.transform = "none")}
          >
            <Sliders size={16} />
            ⚙️ Cấu Hình Định Giá Chi Tiết Từng Loại Model AI
          </button>
        </div>
      </div>

      {/* 5. MODAL POPUP: CẤU HÌNH ĐỊNH GIÁ CHI TIẾT TỪNG LOẠI MODEL AI */}
      {showModelPricingModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.7)",
            backdropFilter: "blur(5px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              border: "1px solid #e2e8f0",
              width: "100%",
              maxWidth: "1350px",
              maxHeight: "92vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 60px rgba(0,0,0,0.3)",
              overflow: "hidden",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "16px 24px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#f8fafc",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Bot size={20} style={{ color: "#ea580c" }} />
                  <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                    MODEL ĐƯỢC DÙNG & GIÁ RIÊNG CHO TOOL DESKTOP
                  </h3>
                </div>
                <p style={{ fontSize: "12px", color: "#64748b", margin: "3px 0 0" }}>
                  Bỏ tick = key không gọi được model đó. Bấm <b>Sửa</b> để mở modal chỉnh sửa chi tiết giá vốn, giá bán và cấu hình.
                </p>
              </div>

              {/* Controls on Header */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                {/* Search Box */}
                <div style={{ position: "relative" }}>
                  <Search
                    size={14}
                    style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}
                  />
                  <input
                    type="text"
                    placeholder="Tìm model hoặc hãng..."
                    value={modelSearch}
                    onChange={(e) => setModelSearch(e.target.value)}
                    style={{
                      padding: "6px 12px 6px 30px",
                      borderRadius: "7px",
                      border: "1px solid #cbd5e1",
                      fontSize: "12px",
                      width: "180px",
                      outline: "none",
                      background: "#ffffff",
                    }}
                  />
                </div>

                {/* Add model button */}
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    color: "#334155",
                    padding: "6px 12px",
                    borderRadius: "7px",
                    fontSize: "12px",
                    fontWeight: 650,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    cursor: "pointer",
                  }}
                >
                  <Plus size={13} />
                  + Thêm model
                </button>

                {/* Sync button */}
                <button
                  type="button"
                  onClick={handleSyncProviders}
                  disabled={syncingModels}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    color: "#475569",
                    padding: "6px 12px",
                    borderRadius: "7px",
                    fontSize: "12px",
                    fontWeight: 650,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    cursor: syncingModels ? "not-allowed" : "pointer",
                  }}
                >
                  <RefreshCw size={13} className={syncingModels ? "animate-spin" : ""} />
                  {syncingModels ? "Đang đồng bộ..." : "Đồng bộ từ Providers"}
                </button>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setShowModelPricingModal(false)}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    borderRadius: "7px",
                    padding: "6px 8px",
                    color: "#64748b",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Modal Body: Table Content Grouped by Provider */}
            <div style={{ flex: 1, overflowY: "auto", overflowX: "auto" }}>
              <table style={{ width: "100%", minWidth: "1100px", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "#ffffff", borderBottom: "1px solid #f1f5f9", color: "#64748b", fontSize: "11.5px", fontWeight: 750, letterSpacing: "0.3px", position: "sticky", top: 0, zIndex: 10 }}>
                    <th style={{ padding: "12px 20px", width: "32%" }}>Model</th>
                    <th style={{ padding: "12px 14px", width: "13%" }}>Vào đ/1M</th>
                    <th style={{ padding: "12px 14px", width: "13%" }}>Ra đ/1M</th>
                    <th style={{ padding: "12px 12px", width: "10%" }}>Cache %</th>
                    <th style={{ padding: "12px 12px", width: "10%" }}>đ/request</th>
                    <th style={{ padding: "12px 14px", width: "11%", textAlign: "center" }}>Cấp phép</th>
                    <th style={{ padding: "12px 18px", width: "11%", textAlign: "right" }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {modelsLoading ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "40px 0", color: "#64748b" }}>
                        <RotateCw size={24} className="animate-spin" style={{ margin: "0 auto 8px" }} />
                        <div>Đang nạp bảng giá từng Model AI...</div>
                      </td>
                    </tr>
                  ) : filteredModels.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "40px 0", color: "#64748b" }}>
                        <Bot size={28} style={{ margin: "0 auto 8px", color: "#94a3b8" }} />
                        <div style={{ fontWeight: 650 }}>Không tìm thấy model nào phù hợp</div>
                        <div style={{ fontSize: "12px", marginTop: "4px" }}>Bấm "Đồng bộ từ Providers" để nạp các model AI mới nhất</div>
                      </td>
                    </tr>
                  ) : (
                    Object.entries(groupedModels).map(([providerGroup, groupItems]) => (
                      <React.Fragment key={providerGroup}>
                        {/* Provider Group Header */}
                        <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", borderTop: "1px solid #e2e8f0" }}>
                          <td
                            colSpan={7}
                            style={{
                              padding: "10px 20px",
                              fontWeight: 800,
                              fontSize: "12.5px",
                              color: "#334155",
                              letterSpacing: "0.2px",
                            }}
                          >
                            {providerGroup}
                          </td>
                        </tr>

                        {/* Models in Group */}
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
                                    onChange={() => handleToggleModelStatus(item.id || item.model)}
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
                              <td style={{ padding: "12px 14px" }}>
                                <input
                                  type="number"
                                  min="0"
                                  step="50"
                                  value={item.input_price}
                                  onChange={(e) => handleModelPriceChange(item.id || item.model, "input_price", Number(e.target.value) || 0)}
                                  style={{
                                    width: "95px",
                                    padding: "6px 10px",
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
                              <td style={{ padding: "12px 14px" }}>
                                <input
                                  type="number"
                                  min="0"
                                  step="50"
                                  value={item.output_price}
                                  onChange={(e) => handleModelPriceChange(item.id || item.model, "output_price", Number(e.target.value) || 0)}
                                  style={{
                                    width: "95px",
                                    padding: "6px 10px",
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

                              {/* 4. Cache % */}
                              <td style={{ padding: "12px 12px" }}>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={cachePct}
                                  onChange={(e) => handleModelPriceChange(item.id || item.model, "cache_discount_pct", Number(e.target.value) || 0)}
                                  style={{
                                    width: "70px",
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

                              {/* 5. đ/request */}
                              <td style={{ padding: "12px 12px" }}>
                                <input
                                  type="number"
                                  min="0"
                                  value={reqPrice}
                                  onChange={(e) => handleModelPriceChange(item.id || item.model, "price_per_request", Number(e.target.value) || 0)}
                                  style={{
                                    width: "70px",
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

                              {/* 6. Cấp phép Status Badge */}
                              <td style={{ padding: "12px 14px", textAlign: "center" }}>
                                <span
                                  onClick={() => handleToggleModelStatus(item.id || item.model)}
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

                              {/* 7. Action Buttons (Sửa & Xóa) */}
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

            {/* Modal Footer Summary & Actions */}
            <div
              style={{
                padding: "14px 24px",
                borderTop: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "12.5px",
                color: "#64748b",
                background: "#f8fafc",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <span>Đang hiển thị <b>{filteredModels.length}</b> / <b>{models.length}</b> Model AI.</span>
                <span>🟢 Đang cấp phép: <b style={{ color: "#15803d" }}>{models.filter((m) => m.is_selling).length}</b></span>
                <span>⚪ Đang tắt: <b style={{ color: "#64748b" }}>{models.filter((m) => !m.is_selling).length}</b></span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setShowModelPricingModal(false)}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    padding: "8px 16px",
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
                  disabled={savingModels}
                  style={{
                    background: "linear-gradient(135deg, #ea580c 0%, #f97316 100%)",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "7px 20px",
                    fontSize: "13px",
                    fontWeight: 750,
                    cursor: savingModels ? "not-allowed" : "pointer",
                    boxShadow: "0 2px 8px rgba(234, 88, 12, 0.3)",
                  }}
                >
                  {savingModels ? "Đang lưu..." : "Lưu Bảng Giá"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PlansPage;

