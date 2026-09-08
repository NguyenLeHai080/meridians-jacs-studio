import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus,
  Bot,
  Zap,
  Trash2,
  Power,
  Edit2,
  RefreshCw,
  Search,
  Sparkles,
  Cpu,
  Layers,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ShieldCheck,
  Radio,
  Sliders,
  AudioLines,
  Eye,
  FileText,
} from "lucide-react";
import type { Provider } from "../../../core/types";
import { ProviderModal } from "./modal/ProviderModal";
import { providerService } from "../services/providerService";
import { confirmDialog } from "../../../core/swal";
import { useI18n } from "../../../core/i18n";

import "../lang"; // Auto-registers providers translation

interface ProvidersPageProps {
  providers?: Provider[];
  onRefresh?: () => Promise<void>;
  setMessage?: (msg: string) => void;
  setError?: (err: string) => void;
  searchTerm?: string;
  onNotify?: (msg: string, type?: "success" | "error") => void;
}

type ProviderFilterType =
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
  groupIcon?: string;
}

export function getModelCategoryInfo(name: string, model: string, purpose?: string | null): ModelCategoryInfo {
  const lowerName = (name || "").toLowerCase();
  const lowerModel = (model || "").toLowerCase();
  const lowerPurpose = (purpose || "").toLowerCase();

  if (lowerName.includes("elevenlabs") || lowerModel.includes("eleven") || lowerPurpose.includes("voice ai") || lowerPurpose.includes("lồng tiếng")) {
    return {
      groupId: "tts",
      groupName: "🗣️ Voice AI & Lồng Tiếng Diễn Xuất",
      badge: "🗣️ Voice AI",
      badgeColor: "#e11d48",
      badgeBg: "#fff1f2",
      badgeBorder: "#fecdd3",
    };
  }
  if (lowerName.includes("vbee") || lowerModel.includes("vbee") || lowerModel.includes("vi-manhdung") || lowerPurpose.includes("review phim")) {
    return {
      groupId: "tts",
      groupName: "🗣️ Voice AI & Lồng Tiếng Diễn Xuất",
      badge: "🎙️ Review Phim",
      badgeColor: "#ea580c",
      badgeBg: "#fff7ed",
      badgeBorder: "#ffedd5",
    };
  }
  if (lowerName.includes("whisper") || lowerModel.includes("whisper") || lowerPurpose.includes("bóc tách phụ đề") || lowerPurpose.includes("transcription")) {
    return {
      groupId: "transcription",
      groupName: "🎙️ Bóc Tách Phụ Đề & Âm Thanh (Whisper)",
      badge: "🎙️ Whisper SRT",
      badgeColor: "#059669",
      badgeBg: "#ecfdf5",
      badgeBorder: "#a7f3d0",
    };
  }
  if (lowerName.includes("opus 4.8") || lowerModel.includes("opus-4.8") || lowerPurpose.includes("điện ảnh") || lowerName.includes("claude-opus")) {
    return {
      groupId: "cinema",
      groupName: "🎬 Kịch Bản Điện Ảnh & Review Phim Triệu View",
      badge: "🎬 Điện Ảnh",
      badgeColor: "#7c3aed",
      badgeBg: "#f5f3ff",
      badgeBorder: "#ddd6fe",
    };
  }
  if (lowerName.includes("thinking") || lowerModel.includes("thinking") || lowerName.includes("reasoner") || lowerModel.includes("reasoner") || lowerName.includes("o3-mini") || lowerModel.includes("o3-mini") || lowerPurpose.includes("suy luận") || lowerPurpose.includes("cot")) {
    return {
      groupId: "reasoning",
      groupName: "🧠 Suy Luận Logic & Khớp Timeline (Reasoning CoT)",
      badge: "🧠 Suy Luận CoT",
      badgeColor: "#0284c7",
      badgeBg: "#f0f9ff",
      badgeBorder: "#bae6fd",
    };
  }
  if (lowerName.includes("vision") || lowerModel.includes("gpt-4o") || lowerModel.includes("gemini") || lowerPurpose.includes("thị giác") || lowerPurpose.includes("khung hình")) {
    return {
      groupId: "vision",
      groupName: "👁️ Thị Giác Video & Đa Phương Thức (Vision)",
      badge: "👁️ Thị Giác 1M",
      badgeColor: "#2563eb",
      badgeBg: "#eff6ff",
      badgeBorder: "#bfdbfe",
    };
  }
  if (lowerName.includes("mini") || lowerModel.includes("mini") || lowerName.includes("groq") || lowerPurpose.includes("siêu tốc") || lowerPurpose.includes("tiết kiệm")) {
    return {
      groupId: "speed",
      groupName: "⚡ Siêu Tốc Độ & Tối Ưu Chi Phí",
      badge: "⚡ Siêu Tốc",
      badgeColor: "#d97706",
      badgeBg: "#fffbeb",
      badgeBorder: "#fde68a",
    };
  }
  if (lowerName.includes("sonnet") || lowerModel.includes("sonnet") || lowerPurpose.includes("lời bình") || lowerPurpose.includes("kịch bản")) {
    return {
      groupId: "cinema",
      groupName: "🎬 Kịch Bản Điện Ảnh & Review Phim Triệu View",
      badge: "✍️ Kịch Bản",
      badgeColor: "#7c3aed",
      badgeBg: "#f5f3ff",
      badgeBorder: "#ddd6fe",
    };
  }
  return {
    groupId: "analysis",
    groupName: "✍️ Phân Tích & Viết Lời Bình Kịch Bản",
    badge: "⚙️ Đa Năng",
    badgeColor: "#475569",
    badgeBg: "#f8fafc",
    badgeBorder: "#e2e8f0",
  };
}

export const ProvidersPage: React.FC<ProvidersPageProps> = ({
  providers: propProviders,
  onRefresh: propOnRefresh,
  setMessage: propSetMessage,
  setError: propSetError,
  searchTerm: propSearchTerm = "",
  onNotify,
}) => {
  const { t } = useI18n();

  const [localProviders, setLocalProviders] = useState<Provider[]>(propProviders || []);
  const activeProviders = propProviders || localProviders;
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState(propSearchTerm);
  const [filterTab, setFilterTab] = useState<ProviderFilterType>("all");

  // View Mode: flat table vs grouped by category
  const [viewMode, setViewMode] = useState<"flat" | "grouped">("flat");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [latencies, setLatencies] = useState<Record<string, { latency_ms: number; status: string; detail?: string }>>({});

  const fetchProvidersData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await providerService.getProviders();
      setLocalProviders(data);
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!propProviders) {
      fetchProvidersData();
    }
  }, [propProviders, fetchProvidersData]);

  // Reset page when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterTab, searchQuery, pageSize]);

  const notify = (msg: string, type: "success" | "error" = "success") => {
    if (onNotify) onNotify(msg, type);
    else if (type === "error" && propSetError) propSetError(msg);
    else if (propSetMessage) propSetMessage(msg);
  };

  const handleRefresh = async () => {
    if (propOnRefresh) await propOnRefresh();
    else await fetchProvidersData();
  };

  const handleOpenCreate = () => {
    setSelectedProvider(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Provider) => {
    setSelectedProvider(p);
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (p: Provider) => {
    const isCurrentlyEnabled = p.is_enabled ?? p.enabled ?? true;
    try {
      await providerService.toggleProvider(p.id, !isCurrentlyEnabled);
      notify(`Đã ${!isCurrentlyEnabled ? "bật" : "tắt"} provider ${p.name}`, "success");
      await handleRefresh();
    } catch (err: any) {
      notify(err instanceof Error ? err.message : "Lỗi đổi trạng thái", "error");
    }
  };

  const handleDelete = async (p: Provider) => {
    const confirmed = await confirmDialog({
      title: "Xác nhận xóa AI Provider?",
      html: `<div style="text-align: left; font-size: 13.5px; color: #475569; line-height: 1.6;">
        <p>Bạn có chắc muốn xóa provider <b>${p.name}</b> (${p.provider_type})?</p>
        <p style="font-size: 12.5px; color: #64748b; margin-top: 6px;">
          Các tác vụ kịch bản, thị giác hoặc lồng tiếng sử dụng provider này sẽ chuyển sang cấu hình dự phòng.
        </p>
      </div>`,
      icon: "warning",
      confirmButtonText: "Xóa provider",
      cancelButtonText: "Hủy bỏ",
      isDestructive: true,
    });
    if (!confirmed) return;

    try {
      await providerService.deleteProvider(p.id);
      notify(`Đã xóa provider ${p.name}`, "success");
      await handleRefresh();
    } catch (err: any) {
      notify(err instanceof Error ? err.message : "Lỗi xóa provider", "error");
    }
  };

  const handleTestLatency = async (p: Provider) => {
    setTestingId(p.id);
    try {
      const res = await providerService.testLatency(p.id);
      setLatencies((prev) => ({ ...prev, [p.id]: res }));
      if (res.status === "reachable" || res.status === "OK") {
        notify(`✓ Kết nối thành công ${p.name}: Độ trễ ${res.latency_ms}ms (${res.detail || "OK"})`, "success");
      } else if (res.status === "missing_api_key") {
        notify(`⚠️ ${p.name}: ${res.detail || "Chưa có API Key. Bấm 'Sửa' để nhập API Key"}`, "error");
      } else {
        notify(`⚠️ ${p.name}: ${res.detail || `Phản hồi lỗi (${res.status})`}`, "error");
      }
    } catch (err: any) {
      notify(`✗ Kiểm tra kết nối ${p.name} thất bại: ${err instanceof Error ? err.message : "Lỗi mạng"}`, "error");
    } finally {
      setTestingId(null);
    }
  };

  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  // Metrics
  const metrics = useMemo(() => {
    const total = activeProviders.length;
    const active = activeProviders.filter((p) => p.is_enabled ?? p.enabled ?? true).length;
    const disabled = total - active;
    const visionCount = activeProviders.filter((p) => (p.capabilities || []).includes("vision")).length;
    const ttsCount = activeProviders.filter((p) => (p.capabilities || []).includes("tts")).length;
    const analysisCount = activeProviders.filter((p) => (p.capabilities || []).includes("analysis")).length;
    const cinemaCount = activeProviders.filter((p) => getModelCategoryInfo(p.name, p.model, p.purpose).groupId === "cinema").length;
    const reasoningCount = activeProviders.filter((p) => getModelCategoryInfo(p.name, p.model, p.purpose).groupId === "reasoning").length;
    const meridiansCount = activeProviders.filter((p) => (p.base_url || "").includes("api-meridians")).length;
    const directCount = total - meridiansCount;

    return { total, active, disabled, visionCount, ttsCount, analysisCount, cinemaCount, reasoningCount, meridiansCount, directCount };
  }, [activeProviders]);

  // Filtered list
  const filteredList = useMemo(() => {
    let list = activeProviders;

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
  }, [activeProviders, filterTab, searchQuery]);

  // Paginated list for flat view
  const totalPages = Math.max(1, Math.ceil(filteredList.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedList = useMemo(() => {
    if (viewMode === "grouped") return filteredList;
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, safeCurrentPage, pageSize, viewMode]);

  // Grouped list mapping
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

  // Provider icon & color helper
  const getProviderBrand = (type: string, name: string) => {
    const t = (type || "").toLowerCase();
    const n = (name || "").toLowerCase();

    if (t.includes("gemini") || n.includes("gemini")) {
      return { label: "Gemini", color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" };
    }
    if (t.includes("openai") || n.includes("chatgpt") || n.includes("openai")) {
      return { label: "OpenAI", color: "#059669", bg: "#ecfdf5", border: "#a7f3d0" };
    }
    if (t.includes("anthropic") || n.includes("claude")) {
      return { label: "Claude", color: "#d97706", bg: "#fffbeb", border: "#fde68a" };
    }
    if (n.includes("elevenlabs") || n.includes("eleven")) {
      return { label: "ElevenLabs", color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" };
    }
    if (n.includes("vbee")) {
      return { label: "Vbee", color: "#dc2626", bg: "#fef2f2", border: "#fecaca" };
    }
    if (n.includes("deepseek")) {
      return { label: "DeepSeek", color: "#0284c7", bg: "#f0f9ff", border: "#bae6fd" };
    }
    if (n.includes("groq")) {
      return { label: "Groq", color: "#ea580c", bg: "#fff7ed", border: "#fed7aa" };
    }
    if (n.includes("ollama")) {
      return { label: "Ollama", color: "#475569", bg: "#f8fafc", border: "#cbd5e1" };
    }
    if (n.includes("openrouter")) {
      return { label: "OpenRouter", color: "#6366f1", bg: "#eef2ff", border: "#c7d2fe" };
    }
    return { label: "Custom", color: "#64748b", bg: "#f1f5f9", border: "#e2e8f0" };
  };

  const renderProviderRow = (item: Provider) => {
    const brand = getProviderBrand(item.provider_type, item.name);
    const cat = getModelCategoryInfo(item.name, item.model, item.purpose);
    const isEnabled = item.is_enabled ?? item.enabled ?? true;
    const latency = latencies[item.id];

    return (
      <tr
        key={item.id}
        style={{
          borderBottom: "1px solid #f1f5f9",
          transition: "background 0.15s ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#fafafa")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        {/* 1. NỀN TẢNG & TÊN */}
        <td style={{ padding: "12px 18px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "10px",
                background: brand.bg,
                color: brand.color,
                border: `1.5px solid ${brand.border}`,
                fontWeight: 800,
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                marginTop: "2px",
              }}
            >
              <Bot size={18} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                <span style={{ fontWeight: 750, color: "#0f172a", fontSize: "13.5px" }}>
                  {item.name}
                </span>
                {/* Category Pill Tag */}
                <span
                  style={{
                    fontSize: "10.5px",
                    fontWeight: 700,
                    background: cat.badgeBg,
                    color: cat.badgeColor,
                    border: `1px solid ${cat.badgeBorder}`,
                    borderRadius: "4px",
                    padding: "1px 6px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {cat.badge}
                </span>
              </div>
              {item.purpose && (
                <div style={{ fontSize: "11.5px", color: "#475569", marginTop: "3px", lineHeight: "1.4" }}>
                  🎯 {item.purpose}
                </div>
              )}
              <div
                style={{
                  fontSize: "11px",
                  color: "#94a3b8",
                  fontFamily: "monospace",
                  marginTop: "3px",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: "380px",
                }}
                title={item.base_url}
              >
                {item.base_url}
              </div>
            </div>
          </div>
        </td>

        {/* 2. LOẠI PROVIDER */}
        <td style={{ padding: "12px 14px" }}>
          <span
            style={{
              background: brand.bg,
              color: brand.color,
              border: `1px solid ${brand.border}`,
              borderRadius: "6px",
              padding: "3px 8px",
              fontSize: "11px",
              fontWeight: 800,
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            {item.provider_type}
          </span>
        </td>

        {/* 3. MODEL PHÂN TÍCH */}
        <td style={{ padding: "12px 14px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <code
              style={{
                background: "#f1f5f9",
                color: "#0f172a",
                border: "1px solid #cbd5e1",
                padding: "3px 8px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 700,
                whiteSpace: "nowrap",
              }}
            >
              {item.model}
            </code>
          </div>
        </td>

        {/* 4. TTS MODEL */}
        <td style={{ padding: "12px 14px" }}>
          {item.tts_model ? (
            <code
              style={{
                background: "#fff1f2",
                color: "#e11d48",
                border: "1px solid #fecdd3",
                padding: "3px 8px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 700,
                whiteSpace: "nowrap",
              }}
            >
              {item.tts_model}
            </code>
          ) : (
            <span style={{ fontSize: "12px", color: "#94a3b8" }}>--</span>
          )}
        </td>

        {/* 5. CHỨC NĂNG */}
        <td style={{ padding: "12px 14px" }}>
          <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
            {(item.capabilities || []).map((cap: string) => {
              if (cap === "analysis" || cap === "scriptwriting") {
                return (
                  <span
                    key={cap}
                    style={{
                      background: "#f5f3ff",
                      color: "#7c3aed",
                      border: "1px solid #ddd6fe",
                      padding: "2px 7px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                    }}
                  >
                    🎬 Kịch bản
                  </span>
                );
              }
              if (cap === "vision") {
                return (
                  <span
                    key={cap}
                    style={{
                      background: "#eff6ff",
                      color: "#2563eb",
                      border: "1px solid #bfdbfe",
                      padding: "2px 7px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                    }}
                  >
                    👁️ Thị giác
                  </span>
                );
              }
              if (cap === "transcription") {
                return (
                  <span
                    key={cap}
                    style={{
                      background: "#ecfdf5",
                      color: "#059669",
                      border: "1px solid #a7f3d0",
                      padding: "2px 7px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                    }}
                  >
                    🎙️ Whisper
                  </span>
                );
              }
              if (cap === "tts") {
                return (
                  <span
                    key={cap}
                    style={{
                      background: "#fff1f2",
                      color: "#e11d48",
                      border: "1px solid #fecdd3",
                      padding: "2px 7px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                    }}
                  >
                    🗣️ Voice TTS
                  </span>
                );
              }
              return (
                <span
                  key={cap}
                  style={{
                    background: "#f1f5f9",
                    color: "#475569",
                    border: "1px solid #cbd5e1",
                    padding: "2px 7px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: 650,
                    whiteSpace: "nowrap",
                  }}
                >
                  {cap}
                </span>
              );
            })}
          </div>
        </td>

        {/* 6. TRẠNG THÁI */}
        <td style={{ padding: "12px 14px" }}>
          {isEnabled ? (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "11.5px",
                fontWeight: 750,
                color: "#059669",
                background: "#ecfdf5",
                border: "1px solid #6ee7b7",
                padding: "4px 9px",
                borderRadius: "8px",
                whiteSpace: "nowrap",
                height: "26px",
                boxSizing: "border-box",
                boxShadow: "0 1px 3px rgba(16, 185, 129, 0.15)",
              }}
            >
              <span style={{ width: "6.5px", height: "6.5px", borderRadius: "50%", background: "#10b981", boxShadow: "0 0 6px #10b981" }} />
              Sẵn sàng
            </span>
          ) : (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "11.5px",
                fontWeight: 750,
                color: "#64748b",
                background: "#f8fafc",
                border: "1px solid #cbd5e1",
                padding: "4px 9px",
                borderRadius: "8px",
                whiteSpace: "nowrap",
                height: "26px",
                boxSizing: "border-box",
              }}
            >
              <span style={{ width: "6.5px", height: "6.5px", borderRadius: "50%", background: "#94a3b8" }} />
              Đang tắt
            </span>
          )}
        </td>

        {/* 7. THAO TÁC */}
        <td style={{ padding: "12px 18px", textAlign: "right" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" }}>
            {/* Test Button */}
            <button
              type="button"
              onClick={() => void handleTestLatency(item)}
              disabled={testingId === item.id}
              title="Kiểm tra kết nối và đo độ trễ API"
              style={{
                background: latency ? (latency.status === "reachable" || latency.status === "OK" ? "#ecfdf5" : "#fff1f2") : "#ffffff",
                border: latency ? (latency.status === "reachable" || latency.status === "OK" ? "1px solid #86efac" : "1px solid #fecdd3") : "1px solid #cbd5e1",
                color: latency ? (latency.status === "reachable" || latency.status === "OK" ? "#059669" : "#e11d48") : "#334155",
                padding: "5px 9px",
                borderRadius: "6px",
                fontSize: "11.5px",
                fontWeight: 700,
                cursor: testingId === item.id ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                transition: "all 0.15s ease",
              }}
            >
              <Zap size={12} color={latency ? (latency.status === "reachable" || latency.status === "OK" ? "#059669" : "#f97316") : "#f97316"} />
              <span>
                {testingId === item.id
                  ? "Testing..."
                  : latency
                  ? `${latency.latency_ms}ms`
                  : "Test"}
              </span>
            </button>

            {/* Edit Button */}
            <button
              type="button"
              onClick={() => handleOpenEdit(item)}
              title="Chỉnh sửa thông số AI Provider"
              style={{
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                color: "#2563eb",
                padding: "5px 8px",
                borderRadius: "6px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Edit2 size={13} />
            </button>

            {/* Toggle Status Button */}
            <button
              type="button"
              onClick={() => void handleToggleStatus(item)}
              title={isEnabled ? "Tạm tắt Provider" : "Kích hoạt Provider"}
              style={{
                background: isEnabled ? "#ecfdf5" : "#f8fafc",
                border: isEnabled ? "1px solid #a7f3d0" : "1px solid #cbd5e1",
                color: isEnabled ? "#059669" : "#94a3b8",
                padding: "5px 8px",
                borderRadius: "6px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Power size={13} />
            </button>

            {/* Delete Button */}
            <button
              type="button"
              onClick={() => void handleDelete(item)}
              title="Xóa AI Provider"
              style={{
                background: "#fff1f2",
                border: "1px solid #fecdd3",
                color: "#e11d48",
                padding: "5px 8px",
                borderRadius: "6px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Trash2 size={13} />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="providers-page" style={{ padding: "1.25rem 1.5rem" }}>
      {/* 1. Header with Breadcrumb & Primary Action */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ fontSize: "12px", color: "#64748b", display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
            <span>JACS Studio</span>
            <span>/</span>
            <span>Quản trị AI</span>
            <span>/</span>
            <span style={{ color: "#ea580c", fontWeight: 600 }}>Cấu hình AI Providers</span>
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-0.02em" }}>
            Cấu hình AI Providers
          </h1>
          <p style={{ fontSize: "13px", color: "#64748b", margin: "4px 0 0" }}>
            Quản lý kết nối đa nền tảng BYOK (Google Gemini, OpenAI, Claude, DeepSeek, Groq, ElevenLabs, Vbee...)
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              padding: "9px 14px",
              color: "#475569",
              fontSize: "13px",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
            }}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Làm mới
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            style={{
              background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              padding: "9px 18px",
              fontSize: "13.5px",
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(234, 88, 12, 0.3)",
              transition: "all 0.15s ease",
            }}
          >
            <Plus size={16} />
            + Thêm AI Provider
          </button>
        </div>
      </div>

      {/* 2. Top 4 Metric Stat Cards */}
      <div className="stats-grid" style={{ marginBottom: "1.5rem" }}>
        
        {/* Card 1: Tổng Providers */}
        <div className="stats-card">
          <div className="stats-card-icon circle-orange">
            <Bot size={22} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "12.5px", color: "#64748b", fontWeight: 600 }}>Tổng AI Providers</div>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", lineHeight: 1.2, margin: "2px 0" }}>
              {metrics.total}
            </div>
            <div style={{ fontSize: "11px", color: "#94a3b8" }}>Đa nền tảng BYOK</div>
          </div>
        </div>

        {/* Card 2: Đang Hoạt Động */}
        <div className="stats-card">
          <div className="stats-card-icon circle-green">
            <Zap size={22} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "12.5px", color: "#64748b", fontWeight: 600 }}>Đang hoạt động</div>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#059669", lineHeight: 1.2, margin: "2px 0", display: "flex", alignItems: "baseline", gap: "8px" }}>
              {metrics.active}
              <span style={{ fontSize: "12px", color: "#10b981", fontWeight: 700, background: "#ecfdf5", padding: "1px 7px", borderRadius: "12px", border: "1px solid #a7f3d0" }}>
                🟢 {Math.round((metrics.active / (metrics.total || 1)) * 100)}%
              </span>
            </div>
            <div style={{ fontSize: "11px", color: "#94a3b8" }}>Sẵn sàng xử lý tác vụ</div>
          </div>
        </div>

        {/* Card 3: Phân tích & Thị giác AI */}
        <div className="stats-card">
          <div className="stats-card-icon circle-blue">
            <Eye size={22} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "12.5px", color: "#64748b", fontWeight: 600 }}>Phân tích & Thị giác</div>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#2563eb", lineHeight: 1.2, margin: "2px 0" }}>
              {metrics.analysisCount} <span style={{ fontSize: "14px", fontWeight: 600, color: "#64748b" }}>/ {metrics.visionCount} Vision</span>
            </div>
            <div style={{ fontSize: "11px", color: "#94a3b8" }}>Kịch bản & trích xuất cảnh</div>
          </div>
        </div>

        {/* Card 4: Giọng đọc TTS & Whisper */}
        <div className="stats-card">
          <div className="stats-card-icon circle-rose">
            <AudioLines size={22} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "12.5px", color: "#64748b", fontWeight: 600 }}>Voice AI & Lồng tiếng</div>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#e11d48", lineHeight: 1.2, margin: "2px 0" }}>
              {metrics.ttsCount} <span style={{ fontSize: "14px", fontWeight: 600, color: "#64748b" }}>Voice TTS</span>
            </div>
            <div style={{ fontSize: "11px", color: "#94a3b8" }}>ElevenLabs & Vbee Voice</div>
          </div>
        </div>

      </div>

      {/* 3. Main Data Container (Filter, Search, Table) */}
      <div style={{ background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", overflow: "hidden" }}>
        
        {/* Table Top Controls Header */}
        <div style={{ padding: "1.1rem 1.35rem", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h2 style={{ fontSize: "15px", fontWeight: 800, color: "#0f172a", margin: 0 }}>
              Danh sách AI Providers
            </h2>
            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
              {filteredList.length} nền tảng AI được cấu hình kết nối
            </div>
          </div>

          {/* Search Box */}
          <div style={{ position: "relative", width: "100%", maxWidth: "320px" }}>
            <Search size={15} style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
            <input
              type="text"
              placeholder="Tìm theo tên, model, URL, mục đích..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px 8px 34px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
                outline: "none",
                boxSizing: "border-box",
                background: "#f8fafc",
              }}
            />
          </div>
        </div>

        {/* Filter Tabs Bar & View Mode Toggle */}
        <div style={{ padding: "10px 1.35rem", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
          <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", alignItems: "center" }}>
            {[
              { key: "all", label: `Tất cả (${metrics.total})` },
              { key: "cinema", label: `🎬 Kịch bản điện ảnh (${metrics.cinemaCount})` },
              { key: "vision", label: `👁️ Thị giác Video (${metrics.visionCount})` },
              { key: "reasoning", label: `🧠 Suy luận CoT (${metrics.reasoningCount})` },
              { key: "tts", label: `🗣️ Voice TTS (${metrics.ttsCount})` },
              { key: "transcription", label: `🎙️ Whisper` },
              { key: "meridians", label: `🌐 Cổng Meridians (${metrics.meridiansCount})` },
              { key: "direct", label: `🏛️ Direct Official (${metrics.directCount})` },
              { key: "active", label: `🟢 Bật (${metrics.active})` },
              { key: "disabled", label: `⚪ Tắt (${metrics.disabled})` },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilterTab(tab.key as ProviderFilterType)}
                style={{
                  background: filterTab === tab.key ? "#ffffff" : "transparent",
                  color: filterTab === tab.key ? "#ea580c" : "#64748b",
                  border: filterTab === tab.key ? "1px solid #cbd5e1" : "1px solid transparent",
                  borderRadius: "6px",
                  padding: "4px 10px",
                  fontSize: "11.5px",
                  fontWeight: filterTab === tab.key ? 750 : 600,
                  cursor: "pointer",
                  boxShadow: filterTab === tab.key ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                  transition: "all 0.15s ease",
                  whiteSpace: "nowrap",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* View Mode Toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ display: "flex", background: "#f1f5f9", padding: "2px", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
              <button
                type="button"
                onClick={() => setViewMode("flat")}
                style={{
                  padding: "4px 10px",
                  fontSize: "11.5px",
                  fontWeight: viewMode === "flat" ? 750 : 600,
                  border: "none",
                  borderRadius: "6px",
                  background: viewMode === "flat" ? "#ffffff" : "transparent",
                  color: viewMode === "flat" ? "#0f172a" : "#64748b",
                  cursor: "pointer",
                  boxShadow: viewMode === "flat" ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                📋 Danh sách phẳng
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grouped")}
                style={{
                  padding: "4px 10px",
                  fontSize: "11.5px",
                  fontWeight: viewMode === "grouped" ? 750 : 600,
                  border: "none",
                  borderRadius: "6px",
                  background: viewMode === "grouped" ? "#ffffff" : "transparent",
                  color: viewMode === "grouped" ? "#ea580c" : "#64748b",
                  cursor: "pointer",
                  boxShadow: viewMode === "grouped" ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                📑 Gom nhóm Chuyên mục
              </button>
            </div>
          </div>
        </div>

        {/* Responsive Table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: "1280px", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#64748b", fontSize: "11.5px", fontWeight: 750, letterSpacing: "0.4px" }}>
                <th style={{ padding: "14px 18px", width: "32%", minWidth: "340px" }}>NHÀ CUNG CẤP & NỀN TẢNG</th>
                <th style={{ padding: "14px 14px", width: "10%", minWidth: "120px" }}>LOẠI PROVIDER</th>
                <th style={{ padding: "14px 14px", width: "15%", minWidth: "170px" }}>MODEL CHÍNH (ANALYSIS)</th>
                <th style={{ padding: "14px 14px", width: "13%", minWidth: "150px" }}>TTS MODEL (GIỌNG ĐỌC)</th>
                <th style={{ padding: "14px 14px", width: "14%", minWidth: "180px" }}>CHỨC NĂNG HỖ TRỢ</th>
                <th style={{ padding: "14px 14px", width: "8%", minWidth: "100px" }}>TRẠNG THÁI</th>
                <th style={{ padding: "14px 18px", width: "8%", minWidth: "120px", textAlign: "right" }}>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "40px 20px", textAlign: "center", color: "#94a3b8" }}>
                    <Bot size={36} style={{ margin: "0 auto 10px", opacity: 0.35 }} />
                    <div style={{ fontWeight: 700, fontSize: "14px", color: "#64748b" }}>Không tìm thấy AI Provider nào</div>
                    <p style={{ fontSize: "12px", margin: "4px 0 0" }}>Thử thay đổi từ khóa tìm kiếm hoặc chọn tab khác.</p>
                  </td>
                </tr>
              ) : viewMode === "grouped" ? (
                // --- GROUPED VIEW ---
                groupedData.map((group) => {
                  const isCollapsed = collapsedGroups[group.info.groupId];
                  return (
                    <React.Fragment key={group.info.groupId}>
                      {/* Group Header Row */}
                      <tr
                        style={{
                          background: "#f1f5f9",
                          borderTop: "2px solid #e2e8f0",
                          borderBottom: "1px solid #cbd5e1",
                          cursor: "pointer",
                        }}
                        onClick={() => toggleGroupCollapse(group.info.groupId)}
                      >
                        <td colSpan={7} style={{ padding: "10px 18px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <span
                                style={{
                                  fontSize: "13px",
                                  fontWeight: 800,
                                  color: "#0f172a",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                }}
                              >
                                {group.info.groupName}
                              </span>
                              <span
                                style={{
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  background: group.info.badgeBg,
                                  color: group.info.badgeColor,
                                  border: `1px solid ${group.info.badgeBorder}`,
                                  borderRadius: "12px",
                                  padding: "1px 8px",
                                }}
                              >
                                {group.items.length} models
                              </span>
                            </div>
                            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>
                              {isCollapsed ? "Mở rộng ▼" : "Thu gọn ▲"}
                            </div>
                          </div>
                        </td>
                      </tr>

                      {/* Group Items Rows */}
                      {!isCollapsed &&
                        group.items.map((item) => renderProviderRow(item))}
                    </React.Fragment>
                  );
                })
              ) : (
                // --- FLAT PAGINATED VIEW ---
                paginatedList.map((item) => renderProviderRow(item))
              )}
            </tbody>
          </table>
        </div>

        {/* 4. Complete Pagination Footer */}
        {viewMode === "flat" && filteredList.length > 0 && (
          <div
            style={{
              padding: "12px 1.35rem",
              background: "#f8fafc",
              borderTop: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            {/* Left: Summary text */}
            <div style={{ fontSize: "12.5px", color: "#64748b" }}>
              Hiển thị <strong>{(safeCurrentPage - 1) * pageSize + 1}</strong> -{" "}
              <strong>{Math.min(safeCurrentPage * pageSize, filteredList.length)}</strong> trong tổng số{" "}
              <strong>{filteredList.length}</strong> AI Providers
            </div>

            {/* Middle: Page Size Selector */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "12px", color: "#64748b" }}>Hiển thị:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                style={{
                  padding: "4px 8px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontSize: "12px",
                  background: "#ffffff",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value={5}>5 dòng / trang</option>
                <option value={10}>10 dòng / trang</option>
                <option value={20}>20 dòng / trang</option>
                <option value={50}>50 dòng / trang</option>
              </select>
            </div>

            {/* Right: Page Navigation Buttons */}
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={safeCurrentPage === 1}
                style={{
                  padding: "5px 9px",
                  fontSize: "11.5px",
                  fontWeight: 650,
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  color: safeCurrentPage === 1 ? "#cbd5e1" : "#475569",
                  cursor: safeCurrentPage === 1 ? "not-allowed" : "pointer",
                }}
              >
                « Đầu
              </button>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage === 1}
                style={{
                  padding: "5px 10px",
                  fontSize: "11.5px",
                  fontWeight: 650,
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  color: safeCurrentPage === 1 ? "#cbd5e1" : "#475569",
                  cursor: safeCurrentPage === 1 ? "not-allowed" : "pointer",
                }}
              >
                ‹ Trước
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setCurrentPage(pageNum)}
                  style={{
                    padding: "5px 10px",
                    fontSize: "12px",
                    fontWeight: safeCurrentPage === pageNum ? 800 : 600,
                    borderRadius: "6px",
                    border: safeCurrentPage === pageNum ? "1px solid #ea580c" : "1px solid #cbd5e1",
                    background: safeCurrentPage === pageNum ? "#ea580c" : "#ffffff",
                    color: safeCurrentPage === pageNum ? "#ffffff" : "#475569",
                    cursor: "pointer",
                    boxShadow: safeCurrentPage === pageNum ? "0 2px 4px rgba(234, 88, 12, 0.25)" : "none",
                  }}
                >
                  {pageNum}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage === totalPages}
                style={{
                  padding: "5px 10px",
                  fontSize: "11.5px",
                  fontWeight: 650,
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  color: safeCurrentPage === totalPages ? "#cbd5e1" : "#475569",
                  cursor: safeCurrentPage === totalPages ? "not-allowed" : "pointer",
                }}
              >
                Sau ›
              </button>

              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={safeCurrentPage === totalPages}
                style={{
                  padding: "5px 9px",
                  fontSize: "11.5px",
                  fontWeight: 650,
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  color: safeCurrentPage === totalPages ? "#cbd5e1" : "#475569",
                  cursor: safeCurrentPage === totalPages ? "not-allowed" : "pointer",
                }}
              >
                Cuối »
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Add / Edit Provider */}
      <ProviderModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedProvider(null);
        }}
        providerToEdit={selectedProvider}
        onSuccess={(msg) => {
          notify(msg, "success");
          void handleRefresh();
        }}
      />
    </div>
  );
};

export default ProvidersPage;
