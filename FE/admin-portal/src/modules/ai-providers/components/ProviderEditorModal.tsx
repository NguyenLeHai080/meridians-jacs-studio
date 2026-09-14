import React, { useState, useEffect } from "react";
import {
  X,
  Bot,
  Zap,
  Eye,
  EyeOff,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Power,
  Layers,
  Sparkles,
  Info,
  Radio,
  AudioLines,
  FileText,
} from "lucide-react";
import { useI18n } from "../../../core/i18n";
import type { Provider } from "../../../core/types";
import type { CreateProviderPayload, UpdateProviderPayload, ProviderType } from "../services/providerService";

export interface ProviderPreset {
  id: string;
  name: string;
  provider_type: ProviderType;
  base_url: string;
  model: string;
  tts_model?: string;
  capabilities: string[];
  purpose: string;
  models: { id: string; name: string; desc: string; badge?: string }[];
  portalUrl?: string;
  portalLabel?: string;
  badge: string;
  badgeBg: string;
  badgeColor: string;
}

export const PRESET_PROVIDERS: ProviderPreset[] = [
  {
    id: "gemini",
    name: "Google Gemini",
    provider_type: "gemini",
    base_url: "https://generativelanguage.googleapis.com/v1beta",
    model: "gemini-2.5-pro",
    capabilities: ["analysis", "vision"],
    purpose: "Phân tích kịch bản sâu, ngữ cảnh 2M tokens và nhận diện thị giác video đa khung hình.",
    badge: "Gemini 2.5",
    badgeBg: "bg-blue-50 text-blue-700 border-blue-200",
    badgeColor: "#2563eb",
    portalUrl: "https://aistudio.google.com/app/apikey",
    portalLabel: "Google AI Studio",
    models: [
      { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", desc: "Cửa sổ ngữ cảnh 2 triệu tokens, xử lý trọn vẹn phim dài không cần cắt", badge: "2M Context" },
      { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", desc: "Siêu tốc độ dưới 1s, trích xuất hàng trăm cảnh quay cùng lúc", badge: "Fast" },
      { id: "gemini-flash-latest", name: "Gemini Flash Latest", desc: "Phiên bản Flash ổn định tối ưu cho tóm tắt kịch bản", badge: "Stable" },
    ],
  },
  {
    id: "openai",
    name: "OpenAI ChatGPT",
    provider_type: "openai",
    base_url: "https://api.openai.com/v1",
    model: "gpt-4o",
    tts_model: "tts-1-hd",
    capabilities: ["analysis", "vision", "tts", "transcription"],
    purpose: "GPT-4o nhận diện thị giác, o3-mini suy luận logic và hệ thống Whisper / TTS tích hợp.",
    badge: "GPT-4o",
    badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
    badgeColor: "#059669",
    portalUrl: "https://platform.openai.com/api-keys",
    portalLabel: "OpenAI Platform",
    models: [
      { id: "gpt-4o", name: "GPT-4o (Omni)", desc: "Đa phương thức hàng đầu thế giới, phân tích biểu cảm và bối cảnh video", badge: "Omni" },
      { id: "gpt-4o-mini", name: "GPT-4o Mini", desc: "Tối ưu chi phí và độ trễ thấp cho tác vụ phân đoạn kịch bản", badge: "Cost-Effective" },
      { id: "o3-mini", name: "o3-mini (Reasoning)", desc: "Tư duy logic từng bước, phản biện và khớp timeline kịch bản phức tạp", badge: "Reasoning" },
    ],
  },
  {
    id: "anthropic",
    name: "Anthropic Claude",
    provider_type: "anthropic",
    base_url: "https://api.anthropic.com/v1",
    model: "claude-3-5-sonnet-latest",
    capabilities: ["analysis", "vision"],
    purpose: "Chuyên sáng tạo kịch bản, lời bình điện ảnh tiếng Việt sắc bén, tự nhiên và giàu cảm xúc.",
    badge: "Claude 3.5",
    badgeBg: "bg-purple-50 text-purple-700 border-purple-200",
    badgeColor: "#7c3aed",
    portalUrl: "https://console.anthropic.com/settings/keys",
    portalLabel: "Anthropic Console",
    models: [
      { id: "claude-3-5-sonnet-latest", name: "Claude 3.5 Sonnet", desc: "Văn phong tiếng Việt chuẩn điện ảnh, hook mở đầu cuốn hút triệu view", badge: "Top Script" },
      { id: "claude-3-5-haiku-latest", name: "Claude 3.5 Haiku", desc: "Tốc độ phản hồi cực nhanh, tối ưu cho sinh tóm tắt phân cảnh", badge: "Ultra-Fast" },
      { id: "claude-3-opus-latest", name: "Claude 3 Opus", desc: "Phân tích tâm lý nhân vật và triết lý cốt truyện chuyên sâu", badge: "Deep Analysis" },
    ],
  },
  {
    id: "deepseek",
    name: "DeepSeek AI",
    provider_type: "openai-compatible",
    base_url: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
    capabilities: ["analysis"],
    purpose: "Mô hình ngôn ngữ thế hệ mới V3 và R1 Reasoning với chi phí tiết kiệm 95%.",
    badge: "DeepSeek R1",
    badgeBg: "bg-sky-50 text-sky-700 border-sky-200",
    badgeColor: "#0284c7",
    portalUrl: "https://platform.deepseek.com/api_keys",
    portalLabel: "DeepSeek Platform",
    models: [
      { id: "deepseek-chat", name: "DeepSeek-V3", desc: "Kịch bản mượt mà, tổng hợp đa chiều với giá siêu rẻ", badge: "V3" },
      { id: "deepseek-reasoner", name: "DeepSeek-R1", desc: "Suy luận logic CoT thông minh tương đương OpenAI o1", badge: "R1 CoT" },
    ],
  },
  {
    id: "elevenlabs",
    name: "ElevenLabs Voice AI",
    provider_type: "openai-compatible",
    base_url: "https://api.elevenlabs.io/v1",
    model: "eleven_multilingual_v2",
    tts_model: "eleven_multilingual_v2",
    capabilities: ["tts"],
    purpose: "Hạ tầng giọng đọc Voice AI Hollywood: Có tiếng thở, ngắt nghỉ cảm xúc và nhân bản giọng nói.",
    badge: "Voice AI #1",
    badgeBg: "bg-rose-50 text-rose-700 border-rose-200",
    badgeColor: "#e11d48",
    portalUrl: "https://elevenlabs.io/app/api-keys",
    portalLabel: "ElevenLabs Studio",
    models: [
      { id: "eleven_multilingual_v2", name: "Multilingual v2", desc: "Giọng lồng tiếng chân thực chuẩn Hollywood đầy cảm xúc", badge: "Studio" },
      { id: "eleven_turbo_v2_5", name: "Turbo v2.5", desc: "Sinh âm thanh siêu tốc, rút ngắn thời gian render", badge: "Turbo" },
    ],
  },
  {
    id: "vbee",
    name: "Vbee AIVoice Studio",
    provider_type: "openai-compatible",
    base_url: "https://api.vbee.vn/api/v1",
    model: "vi-manhdung",
    tts_model: "vi-manhdung",
    capabilities: ["tts"],
    purpose: "Giọng đọc Review Phim quốc dân Việt Nam (Mạnh Dũng, Minh Hoàng, Mai Phương).",
    badge: "Review Phim VN",
    badgeBg: "bg-amber-50 text-amber-700 border-amber-200",
    badgeColor: "#d97706",
    portalUrl: "https://vbee.vn",
    portalLabel: "Vbee Console",
    models: [
      { id: "vi-manhdung", name: "Mạnh Dũng (Nam Bắc)", desc: "Giọng Review Phim số 1 VN, ngữ điệu dồn dập kịch tính", badge: "Review #1" },
      { id: "vi-minhhoang", name: "Minh Hoàng (Nam Bắc)", desc: "Giọng truyền cảm, ấm áp phù hợp phóng sự và tóm tắt sách", badge: "Story" },
      { id: "vi-maiphuong", name: "Mai Phương (Nữ Bắc)", desc: "Giọng nữ thanh lịch, truyền cảm cho tin tức và kịch bản nhẹ", badge: "Female" },
    ],
  },
  {
    id: "groq",
    name: "Groq Fast LPU",
    provider_type: "openai-compatible",
    base_url: "https://api.groq.com/openai/v1",
    model: "llama-3.3-70b-versatile",
    capabilities: ["analysis", "transcription"],
    purpose: "Tốc độ xử lý hàng trăm token/giây trên chip LPU và bóc phụ đề Whisper siêu tốc miễn phí.",
    badge: "Ultra Fast LPU",
    badgeBg: "bg-orange-50 text-orange-700 border-orange-200",
    badgeColor: "#ea580c",
    portalUrl: "https://console.groq.com/keys",
    portalLabel: "Groq Console",
    models: [
      { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B", desc: "Tốc độ 300 token/s, phân tích kịch bản thông minh", badge: "Llama 3.3" },
      { id: "whisper-large-v3-turbo", name: "Whisper Large v3 Turbo", desc: "Bóc phụ đề video tiếng Việt chính xác 99% trong vài giây", badge: "Whisper SRT" },
    ],
  },
  {
    id: "meridians",
    name: "Meridians Gateway (NexoraTech)",
    provider_type: "openai-compatible",
    base_url: "https://api-meridians.nexoratech.com.vn/v1",
    model: "claude-opus-4.8",
    tts_model: "eleven_multilingual_v2",
    capabilities: ["analysis", "vision", "tts", "transcription"],
    purpose: "Cổng AI Gateway trung tâm tích hợp toàn diện Claude Opus, GPT-4o, Gemini 2M, DeepSeek và Voice TTS.",
    badge: "Central Gateway",
    badgeBg: "bg-indigo-50 text-indigo-700 border-indigo-200",
    badgeColor: "#4f46e5",
    portalUrl: "https://jacs-studio.nexoratech.com.vn",
    portalLabel: "JACS Hub",
    models: [
      { id: "claude-opus-4.8", name: "Claude Opus 4.8", desc: "Kịch bản điện ảnh đỉnh cao thế giới", badge: "Cinema" },
      { id: "gpt-4o", name: "GPT-4o Vision", desc: "Thị giác khung hình video", badge: "Vision" },
      { id: "eleven_multilingual_v2", name: "ElevenLabs Voice", desc: "Lồng tiếng Hollywood", badge: "TTS" },
    ],
  },
];

interface ProviderEditorModalProps {
  isOpen: boolean;
  isCreating: boolean;
  provider: Provider | null;
  isSaving: boolean;
  onClose: () => void;
  onSave: (payload: CreateProviderPayload | UpdateProviderPayload) => Promise<void>;
  onTestLatency?: (provider: Provider) => Promise<any>;
}

export const ProviderEditorModal: React.FC<ProviderEditorModalProps> = ({
  isOpen,
  isCreating,
  provider,
  isSaving,
  onClose,
  onSave,
  onTestLatency,
}) => {
  const { t } = useI18n();

  const [activeTab, setActiveTab] = useState<"presets" | "custom">("presets");
  const [selectedPresetId, setSelectedPresetId] = useState<string>("gemini");

  // Form Fields
  const [name, setName] = useState("");
  const [providerType, setProviderType] = useState<ProviderType>("openai-compatible");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [ttsModel, setTtsModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [purpose, setPurpose] = useState("");
  const [capabilities, setCapabilities] = useState<string[]>(["analysis"]);
  const [isEnabled, setIsEnabled] = useState(true);

  // UI helpers
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ status: string; latency_ms: number; detail?: string } | null>(null);

  // Initialize form
  useEffect(() => {
    if (!isOpen) {
      setTestResult(null);
      return;
    }

    if (isCreating || !provider) {
      // Default to first preset
      const preset = PRESET_PROVIDERS[0];
      setSelectedPresetId(preset.id);
      setName(preset.name);
      setProviderType(preset.provider_type);
      setBaseUrl(preset.base_url);
      setModel(preset.model);
      setTtsModel(preset.tts_model || "");
      setApiKey("");
      setPurpose(preset.purpose);
      setCapabilities(preset.capabilities);
      setIsEnabled(true);
      setActiveTab("presets");
    } else {
      // Editing existing provider
      setName(provider.name || "");
      setProviderType(provider.provider_type || "openai-compatible");
      setBaseUrl(provider.base_url || "");
      setModel(provider.model || "");
      setTtsModel(provider.tts_model || "");
      setApiKey(""); // Don't preload masked key
      setPurpose(provider.purpose || "");
      setCapabilities(provider.capabilities || ["analysis"]);
      setIsEnabled(provider.is_enabled ?? provider.enabled ?? true);
      setActiveTab("custom");
    }
  }, [isOpen, isCreating, provider]);

  if (!isOpen) return null;

  // Apply Preset
  const handleSelectPreset = (preset: ProviderPreset) => {
    setSelectedPresetId(preset.id);
    setName(preset.name);
    setProviderType(preset.provider_type);
    setBaseUrl(preset.base_url);
    setModel(preset.model);
    setTtsModel(preset.tts_model || "");
    setPurpose(preset.purpose);
    setCapabilities(preset.capabilities);
  };

  // Toggle Capability
  const handleToggleCapability = (cap: string) => {
    setCapabilities((prev) =>
      prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap]
    );
  };

  // Quick select model from preset list
  const currentPreset = PRESET_PROVIDERS.find((p) => p.id === selectedPresetId);

  // Test Connection
  const handleTest = async () => {
    if (provider && onTestLatency) {
      setIsTesting(true);
      setTestResult(null);
      try {
        const res = await onTestLatency(provider);
        if (res) setTestResult(res);
      } finally {
        setIsTesting(false);
      }
    }
  };

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !baseUrl.trim() || !model.trim()) return;

    const payload: any = {
      name: name.trim(),
      provider_type: providerType,
      base_url: baseUrl.trim(),
      model: model.trim(),
      tts_model: ttsModel.trim() || undefined,
      capabilities: capabilities,
      purpose: purpose.trim() || undefined,
      enabled: isEnabled,
    };

    if (apiKey.trim()) {
      payload.api_key = apiKey.trim();
    } else if (isCreating) {
      payload.api_key = "";
    }

    await onSave(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm transition-all duration-300">
      <div
        className="relative w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-900/10 transition-all transform animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="relative border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-amber-50/40 px-6 py-5 sm:px-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20">
                <Bot className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 sm:text-xl">
                  {isCreating
                    ? t("createProviderModalTitle", "Thêm Mới Cổng AI Provider")
                    : t("editProviderModalTitle", "Chỉnh Sửa Cấu Hình AI Provider")}
                </h3>
                <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                  {t(
                    "modalSubtitle",
                    "Cấu hình endpoint API, thông tin model và khóa mã hóa bảo mật DPAPI."
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              title={t("btnClose", "Đóng")}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Preset / Custom Switcher */}
          {isCreating && (
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("presets")}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "presets"
                    ? "bg-amber-500 text-white shadow-sm shadow-amber-500/20"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                {t("tabPresets", "Mẫu nhà cung cấp nhanh")}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("custom")}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "custom"
                    ? "bg-amber-500 text-white shadow-sm shadow-amber-500/20"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                {t("tabCustom", "Cấu hình chi tiết")}
              </button>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit}>
          <div className="max-h-[68vh] overflow-y-auto px-6 py-5 sm:px-8 space-y-5">
            {/* Quick Presets Grid (When in presets tab & creating) */}
            {isCreating && activeTab === "presets" && (
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {t("tabPresets", "Chọn nhà cung cấp AI mẫu")}
                </label>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {PRESET_PROVIDERS.map((p) => {
                    const isSelected = selectedPresetId === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectPreset(p)}
                        className={`flex flex-col items-start p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? "border-amber-500 bg-amber-50/50 shadow-sm ring-2 ring-amber-500/20"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70"
                        }`}
                      >
                        <span
                          className={`inline-block px-2 py-0.5 rounded-lg text-[10px] font-bold ${p.badgeBg} border mb-2`}
                        >
                          {p.badge}
                        </span>
                        <span className="text-xs font-bold text-slate-800 line-clamp-1">{p.name}</span>
                        <span className="text-[11px] text-slate-400 font-mono mt-0.5 line-clamp-1">
                          {p.model}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Preset Quick Info Box */}
                {currentPreset && (
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5 text-xs text-slate-600 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                        <Info className="h-3.5 w-3.5 text-amber-500" />
                        {currentPreset.name}
                      </span>
                      {currentPreset.portalUrl && (
                        <a
                          href={currentPreset.portalUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-[11px] font-medium text-amber-600 hover:text-amber-700 hover:underline"
                        >
                          {currentPreset.portalLabel || "Lấy API Key"}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{currentPreset.purpose}</p>

                    {/* Quick Model Selector within Preset */}
                    {currentPreset.models.length > 0 && (
                      <div className="pt-2 border-t border-slate-200/60 flex flex-wrap gap-1.5 items-center">
                        <span className="text-[10px] font-medium text-slate-400 mr-1">
                          {t("lblSuggestedModels", "Mô hình gợi ý:")}
                        </span>
                        {currentPreset.models.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setModel(m.id)}
                            className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                              model === m.id
                                ? "bg-amber-500 text-white shadow-xs"
                                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            {m.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Form Fields */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Provider Name */}
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                  {t("lblProviderName", "Tên cổng Provider")} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("placeholderProviderName", "Ví dụ: Google Gemini 2.5 Pro Vision")}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-3 focus:ring-amber-500/10"
                />
              </div>

              {/* Provider Type */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                  {t("lblProviderType", "Loại kết nối / Giao thức")} <span className="text-rose-500">*</span>
                </label>
                <select
                  value={providerType}
                  onChange={(e) => setProviderType(e.target.value as ProviderType)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-amber-500 focus:outline-none focus:ring-3 focus:ring-amber-500/10"
                >
                  <option value="openai-compatible">
                    {t("protocolOpenAICompatible", "OpenAI-Compatible (Khuyên dùng)")}
                  </option>
                  <option value="openai">
                    {t("protocolOpenAIOfficial", "OpenAI Official")}
                  </option>
                  <option value="gemini">
                    {t("protocolGemini", "Google Gemini (v1beta)")}
                  </option>
                  <option value="anthropic">
                    {t("protocolAnthropic", "Anthropic Claude")}
                  </option>
                  <option value="custom">
                    {t("protocolCustom", "Tùy chỉnh (Custom)")}
                  </option>
                </select>
              </div>

              {/* Status Segmented Buttons (Standard Shared Pattern) */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                  {t("lblStatus", "Trạng thái hoạt động")}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEnabled(true)}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      isEnabled
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <CheckCircle2
                      className={`h-4 w-4 ${isEnabled ? "text-emerald-600" : "text-slate-400"}`}
                    />
                    <span>{t("statusActive", "Đang bật")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEnabled(false)}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      !isEnabled
                        ? "bg-slate-100 text-slate-700 border-slate-300 ring-2 ring-slate-400/20 shadow-xs"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <Power
                      className={`h-4 w-4 ${!isEnabled ? "text-slate-600" : "text-slate-400"}`}
                    />
                    <span>{t("statusDisabled", "Đang tắt")}</span>
                  </button>
                </div>
              </div>

              {/* Base URL */}
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                  {t("lblBaseUrl", "Base URL API Endpoint")} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="url"
                  required
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder={t(
                    "placeholderBaseUrl",
                    "https://generativelanguage.googleapis.com/v1beta/openai"
                  )}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 font-mono text-xs text-slate-800 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-3 focus:ring-amber-500/10"
                />
              </div>

              {/* Model ID */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                  {t("lblModel", "Mã mô hình AI (Model ID)")} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder={t("placeholderModel", "gemini-2.5-pro")}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 font-mono text-xs text-slate-800 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-3 focus:ring-amber-500/10"
                />
              </div>

              {/* Voice / TTS Model */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                  {t("lblTtsModel", "Mã mô hình Voice TTS (Tùy chọn)")}
                </label>
                <input
                  type="text"
                  value={ttsModel}
                  onChange={(e) => setTtsModel(e.target.value)}
                  placeholder={t("placeholderTtsModel", "eleven_multilingual_v2")}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 font-mono text-xs text-slate-800 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-3 focus:ring-amber-500/10"
                />
              </div>

              {/* API Key */}
              <div className="sm:col-span-2">
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    {t("lblApiKey", "Khóa bí mật API Key")}
                  </label>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {t("dpapiSecureNote", "Bảo mật mã hóa DPAPI an toàn")}
                  </span>
                </div>
                <div className="relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={
                      isCreating
                        ? t("placeholderApiKeyNew", "Nhập API Key để kích hoạt kết nối...")
                        : t(
                            "placeholderApiKey",
                            "Nhập API Key hoặc để trống nếu giữ nguyên khóa hiện tại..."
                          )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white pl-3.5 pr-10 py-2.5 font-mono text-xs text-slate-800 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-3 focus:ring-amber-500/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    title={showApiKey ? "Ẩn khóa" : "Hiện khóa"}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Capabilities Multi-Select Cards (Polished & Fully Localized) */}
              <div className="sm:col-span-2">
                <label className="mb-2 block text-xs font-bold text-slate-700">
                  {t("lblCapabilities", "Khả năng xử lý tác vụ")}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {[
                    {
                      id: "analysis",
                      icon: FileText,
                      title: t("capAnalysisTitle", "Kịch bản & Phân tích"),
                      desc: t("capAnalysisDesc", "Viết lời bình, tóm tắt"),
                      activeRing: "border-purple-300 ring-2 ring-purple-500/20 bg-purple-50/70 text-purple-900",
                      iconColor: "text-purple-600",
                      checkBg: "bg-purple-600 border-purple-600",
                    },
                    {
                      id: "vision",
                      icon: Eye,
                      title: t("capVisionTitle", "Thị giác Video"),
                      desc: t("capVisionDesc", "Nhận diện khung hình 2M"),
                      activeRing: "border-blue-300 ring-2 ring-blue-500/20 bg-blue-50/70 text-blue-900",
                      iconColor: "text-blue-600",
                      checkBg: "bg-blue-600 border-blue-600",
                    },
                    {
                      id: "tts",
                      icon: AudioLines,
                      title: t("capTtsTitle", "Voice AI & TTS"),
                      desc: t("capTtsDesc", "Lồng tiếng diễn xuất"),
                      activeRing: "border-rose-300 ring-2 ring-rose-500/20 bg-rose-50/70 text-rose-900",
                      iconColor: "text-rose-600",
                      checkBg: "bg-rose-600 border-rose-600",
                    },
                    {
                      id: "transcription",
                      icon: Radio,
                      title: t("capTranscriptionTitle", "Whisper Bóc Phụ Đề"),
                      desc: t("capTranscriptionDesc", "Tách lời thoại SRT"),
                      activeRing: "border-emerald-300 ring-2 ring-emerald-500/20 bg-emerald-50/70 text-emerald-900",
                      iconColor: "text-emerald-600",
                      checkBg: "bg-emerald-600 border-emerald-600",
                    },
                  ].map((cap) => {
                    const isChecked = capabilities.includes(cap.id);
                    const IconComp = cap.icon;
                    return (
                      <button
                        key={cap.id}
                        type="button"
                        onClick={() => handleToggleCapability(cap.id)}
                        className={`flex flex-col items-start p-3 rounded-2xl border text-left transition-all cursor-pointer relative ${
                          isChecked
                            ? `${cap.activeRing} shadow-xs`
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1.5">
                          <div className="flex items-center gap-1.5 min-w-0 pr-1">
                            <IconComp
                              className={`h-4 w-4 shrink-0 ${
                                isChecked ? cap.iconColor : "text-slate-400"
                              }`}
                            />
                            <span className="text-xs font-bold truncate">
                              {cap.title}
                            </span>
                          </div>
                          <div
                            className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all shrink-0 ${
                              isChecked
                                ? `${cap.checkBg} text-white`
                                : "border-slate-300 bg-white"
                            }`}
                          >
                            {isChecked && (
                              <CheckCircle2 className="h-3.5 w-3.5 fill-white text-emerald-500" />
                            )}
                          </div>
                        </div>
                        <span className="text-[11px] text-slate-500 leading-snug line-clamp-1">
                          {cap.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Purpose */}
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                  {t("lblPurpose", "Mục đích sử dụng chính")}
                </label>
                <input
                  type="text"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder={t(
                    "placeholderPurpose",
                    "Ví dụ: Kịch bản điện ảnh triệu view, phân tích video 2M tokens"
                  )}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-3 focus:ring-amber-500/10"
                />
              </div>
            </div>

            {/* Latency Test Result (if any) */}
            {testResult && (
              <div
                className={`rounded-2xl p-3 text-xs flex items-center gap-2 border ${
                  testResult.status === "reachable" || testResult.status === "OK"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-rose-50 text-rose-800 border-rose-200"
                }`}
              >
                {testResult.status === "reachable" || testResult.status === "OK" ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                ) : (
                  <X className="h-4 w-4 text-rose-600 shrink-0" />
                )}
                <div>
                  <span className="font-bold">
                    {testResult.status === "reachable" || testResult.status === "OK"
                      ? t("connectionStatusStable", "Kết nối ổn định")
                      : t("connectionStatusError", "Kiểm tra thất bại")}
                    :{" "}
                  </span>
                  <span>
                    {testResult.latency_ms}ms ({testResult.detail || testResult.status})
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-6 py-4 sm:px-8">
            <div>
              {!isCreating && provider && (
                <button
                  type="button"
                  onClick={handleTest}
                  disabled={isTesting}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 transition-all cursor-pointer"
                >
                  <Zap
                    className={`h-3.5 w-3.5 text-amber-500 ${isTesting ? "animate-spin" : ""}`}
                  />
                  {isTesting
                    ? t("btnTestingLatency", "Đang kiểm tra...")
                    : t("btnTestConnection", "Kiểm tra kết nối")}
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-all cursor-pointer"
              >
                {t("btnCancel", "Hủy bỏ")}
              </button>
              <button
                type="submit"
                disabled={isSaving || !name.trim() || !baseUrl.trim() || !model.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-amber-500/20 hover:from-amber-600 hover:to-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500/30 disabled:opacity-50 transition-all cursor-pointer"
              >
                <CheckCircle2 className="h-4 w-4" />
                {isSaving ? t("btnSaving", "Đang lưu...") : t("btnSave", "Lưu cấu hình")}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
