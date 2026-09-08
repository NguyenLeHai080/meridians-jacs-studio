import { useEffect, useState, useMemo, Fragment } from "react";
import type { FormEvent } from "react";
import { getRuntime, isNativeRuntime } from "../../core/runtime";
import {
  DEFAULT_PREFERENCES,
  type ProviderDraft,
  type ProviderProfile,
  type ProviderType,
  type ToolPreferences,
  type UpdateProgress,
  type UpdateRelease,
} from "../../core/types";
import { Modal } from "../../shared/Modal";
import { popup } from "../../shared/popup";
import {
  Check2,
  FolderFill,
  Trash3Fill,
  PlusLg,
  Link45deg,
  GearFill,
  Sliders,
  CpuFill,
  CheckCircleFill,
  XCircleFill,
  ArrowRepeat,
  ShieldLockFill,
  Stars,
  EyeFill,
  KeyFill,
  LightningChargeFill,
  BoxArrowUpRight,
} from "react-bootstrap-icons";

export interface CloudModelItem {
  id: string;
  model: string;
  provider_name: string;
  category?: string;
  input_price: number;
  output_price: number;
  cost_input_price?: number;
  cost_output_price?: number;
  cache_discount_pct?: number;
  price_per_request?: number;
  is_selling: boolean;
  purpose?: string;
  providerType?: ProviderType;
}

export const DEFAULT_CLOUD_MODELS: CloudModelItem[] = [
  { id: "cm-1", model: "gemini-2.5-flash", provider_name: "Google Gemini", category: "vision", input_price: 500, output_price: 900, cache_discount_pct: 20, price_per_request: 0, is_selling: true, purpose: "Thị giác video 1M tokens, trích xuất cảnh & multimodal siêu tốc", providerType: "gemini" },
  { id: "cm-2", model: "gemini-flash-latest", provider_name: "Google Gemini", category: "vision", input_price: 500, output_price: 900, cache_discount_pct: 20, price_per_request: 0, is_selling: true, purpose: "Bản Flash mới nhất luôn cập nhật từ Google AI Studio", providerType: "gemini" },
  { id: "cm-3", model: "claude-3-7-sonnet", provider_name: "Anthropic Claude", category: "cinema", input_price: 1100, output_price: 1800, cache_discount_pct: 15, price_per_request: 10, is_selling: true, purpose: "Biên kịch điện ảnh chuyên sâu, văn phong tự nhiên sâu sắc", providerType: "anthropic" },
  { id: "cm-4", model: "claude-opus-4.8", provider_name: "Anthropic Claude", category: "cinema", input_price: 1250, output_price: 2100, cache_discount_pct: 15, price_per_request: 15, is_selling: true, purpose: "Kịch bản điện ảnh & review phim triệu view, xây dựng cao trào", providerType: "anthropic" },
  { id: "cm-5", model: "gpt-5.5", provider_name: "OpenAI", category: "cinema", input_price: 1050, output_price: 1650, cache_discount_pct: 20, price_per_request: 10, is_selling: true, purpose: "Kịch bản điện ảnh thế hệ mới, văn phong đa tầng nghĩa", providerType: "openai" },
  { id: "cm-6", model: "gpt-4o", provider_name: "OpenAI", category: "vision", input_price: 950, output_price: 1500, cache_discount_pct: 20, price_per_request: 8, is_selling: true, purpose: "Phân tích hình ảnh & bối cảnh video chuẩn xác", providerType: "openai" },
  { id: "cm-7", model: "deepseek-reasoner", provider_name: "DeepSeek", category: "reasoning", input_price: 400, output_price: 700, cache_discount_pct: 25, price_per_request: 0, is_selling: true, purpose: "Mô hình lý luận R1, phân tích logic tình tiết và cấu trúc phim", providerType: "deepseek" },
  { id: "cm-8", model: "eleven_multilingual_v2", provider_name: "ElevenLabs", category: "voice", input_price: 1500, output_price: 2500, cache_discount_pct: 0, price_per_request: 20, is_selling: true, purpose: "Voice AI số 1 thế giới, ngắt nghỉ như người thật và truyền cảm", providerType: "elevenlabs" },
  { id: "cm-9", model: "vi-manhdung", provider_name: "Vbee AIVoice", category: "voice", input_price: 600, output_price: 1000, cache_discount_pct: 0, price_per_request: 5, is_selling: true, purpose: "Giọng đọc Review Phim quốc dân Việt Nam (Mạnh Dũng)", providerType: "openai-compatible" },
  { id: "cm-10", model: "whisper-large-v3", provider_name: "Whisper Audio", category: "transcription", input_price: 350, output_price: 600, cache_discount_pct: 0, price_per_request: 0, is_selling: true, purpose: "Bóc băng hội thoại đa ngôn ngữ, nhận diện tiếng Việt cực chuẩn", providerType: "openai-compatible" },
];

export const PROVIDER_CONFIGS: Record<
  string,
  {
    name: string;
    type: ProviderType;
    baseUrl: string;
    defaultModel: string;
    models: string[];
    loginUrl?: string;
    loginLabel?: string;
    ttsModel?: string;
    capabilities: string[];
    hint: string;
    isGateway?: boolean;
  }
> = {
  meridians: {
    name: "Meridians Gateway (NexoraTech)",
    type: "openai-compatible",
    baseUrl: "https://api-meridians.nexoratech.com.vn/v1",
    defaultModel: "claude-opus-4.8",
    models: [
      "claude-opus-4.8",
      "claude-opus-4.8-thinking",
      "claude-3-5-sonnet-latest",
      "gpt-4o",
      "gpt-4o-mini",
      "o3-mini",
      "gemini-2.5-pro",
      "gemini-2.5-flash",
      "deepseek-reasoner",
      "deepseek-chat",
      "cc/claude-opus-5",
      "whisper-large-v3",
    ],
    loginUrl: "https://jacs-studio.nexoratech.com.vn",
    loginLabel: "🌐 Cổng AI Gateway Trung Tâm",
    ttsModel: "eleven_multilingual_v2",
    capabilities: ["analysis", "vision", "transcription", "tts"],
    hint: "AI Gateway trung tâm JACS Studio (NexoraTech): Tích hợp toàn diện Claude Opus 4.8, GPT-4o, Gemini Pro 2M, DeepSeek R1, Voice TTS và Whisper.",
    isGateway: true,
  },
  elevenlabs: {
    name: "ElevenLabs (Voice AI Số 1 Thế Giới - Đỉnh Cao Cảm Xúc)",
    type: "openai-compatible",
    baseUrl: "https://api.elevenlabs.io/v1",
    defaultModel: "eleven_multilingual_v2",
    models: ["eleven_multilingual_v2", "eleven_turbo_v2_5", "eleven_flash_v2_5"],
    loginUrl: "https://elevenlabs.io/app/api-keys",
    loginLabel: "🌐 Đăng Ký & Lấy API Key ElevenLabs",
    ttsModel: "eleven_multilingual_v2",
    capabilities: ["tts"],
    hint: "Bộ Voice AI số 1 thế giới: Có tiếng thở, ngắt nghỉ như người thật, thăng trầm kịch tính và nhân bản giọng nói theo yêu cầu.",
  },
  vbee: {
    name: "Vbee AIVoice (Chuyên Review Phim Triệu View Việt Nam)",
    type: "openai-compatible",
    baseUrl: "https://api.vbee.vn/api/v1",
    defaultModel: "vi-manhdung",
    models: ["vi-manhdung", "vi-minhhoang", "vi-maiphuong", "vi-ngochoang"],
    loginUrl: "https://vbee.vn",
    loginLabel: "🌐 Đăng Nhập Vbee AIVoice Studio",
    ttsModel: "vbee-tts",
    capabilities: ["tts"],
    hint: "Giọng đọc Review Phim quốc dân Việt Nam (Mạnh Dũng, Minh Hoàng, Mai Phương) với ngữ điệu ngắt nghỉ tự nhiên.",
  },
  gemini: {
    name: "Google Gemini (Chính Thống)",
    type: "gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    defaultModel: "gemini-flash-latest",
    models: ["gemini-flash-latest", "gemini-2.5-flash", "gemini-2.5-pro", "gemini-flash-lite-latest", "gemini-3.7-flash", "gemini-pro-latest"],
    loginUrl: "https://aistudio.google.com/app/apikey",
    loginLabel: "🌐 Đăng Nhập Google AI Studio & Lấy API Key Miễn Phí",
    capabilities: ["analysis", "vision"],
    hint: "AI tốc độ cao của Google, phân tích ngữ cảnh video cực sâu và miễn phí hạn mức lớn.",
  },
  openai: {
    name: "OpenAI ChatGPT (Chính Thống)",
    type: "openai",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "o1-mini", "o3-mini", "gpt-3.5-turbo"],
    loginUrl: "https://platform.openai.com/api-keys",
    loginLabel: "🌐 Đăng Nhập OpenAI Platform & Lấy Key ChatGPT",
    ttsModel: "tts-1",
    capabilities: ["analysis", "vision", "transcription", "tts"],
    hint: "Mô hình GPT-4o hàng đầu thế giới, hỗ trợ cả nhận diện thị giác và giọng đọc TTS chất lượng cao.",
  },
  anthropic: {
    name: "Anthropic Claude (Chính Thống)",
    type: "anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    defaultModel: "claude-3-5-sonnet-latest",
    models: ["claude-3-5-sonnet-latest", "claude-3-5-haiku-latest", "claude-3-opus-latest"],
    loginUrl: "https://console.anthropic.com/settings/keys",
    loginLabel: "🌐 Đăng Nhập Anthropic Console & Lấy Key Claude",
    capabilities: ["analysis", "vision"],
    hint: "Claude 3.5 Sonnet chuyên viết kịch bản, lời bình sâu sắc, văn phong tự nhiên nhất.",
  },
  deepseek: {
    name: "DeepSeek AI (Giá Rẻ & Thông Minh)",
    type: "openai-compatible",
    baseUrl: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat",
    models: ["deepseek-chat", "deepseek-reasoner"],
    loginUrl: "https://platform.deepseek.com/api_keys",
    loginLabel: "🌐 Đăng Nhập DeepSeek Platform & Lấy Key",
    capabilities: ["analysis"],
    hint: "DeepSeek-V3 & DeepSeek-R1 phân tích logic cực kỳ thông minh với chi phí siêu tiết kiệm.",
  },
  groq: {
    name: "Groq (Siêu Tốc & Bóc Giọng Nói Free)",
    type: "openai-compatible",
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
    models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "whisper-large-v3", "whisper-large-v3-turbo"],
    loginUrl: "https://console.groq.com/keys",
    loginLabel: "🌐 Đăng Nhập Groq Cloud & Lấy Key Miễn Phí",
    capabilities: ["analysis", "transcription"],
    hint: "Tốc độ xử lý hàng ngàn token/s. Hỗ trợ Whisper bóc phụ đề siêu nhanh và hoàn toàn miễn phí.",
  },
  ollama: {
    name: "Ollama (Local AI Offline Trên Máy)",
    type: "openai-compatible",
    baseUrl: "http://localhost:11434/v1",
    defaultModel: "llama3.2",
    models: ["llama3.2", "qwen2.5", "mistral", "gemma2", "llava"],
    capabilities: ["analysis", "vision"],
    hint: "Chạy mô hình AI trực tiếp trên card đồ họa máy tính của bạn, không cần Internet.",
  },
  "openai-compatible": {
    name: "OpenRouter / OpenAI-Compatible",
    type: "openai-compatible",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "openai/gpt-4o-mini",
    models: ["openai/gpt-4o-mini", "anthropic/claude-3.5-sonnet", "google/gemini-2.0-flash-exp:free", "deepseek/deepseek-r1"],
    loginUrl: "https://openrouter.ai/keys",
    loginLabel: "🌐 Đăng Nhập OpenRouter & Lấy Key",
    capabilities: ["analysis", "vision", "transcription", "tts"],
    hint: "Cổng kết nối hàng trăm mô hình AI trên toàn cầu qua 1 API key duy nhất.",
  },
  custom: {
    name: "Custom AI Adapter",
    type: "custom",
    baseUrl: "https://api.example.com",
    defaultModel: "custom-model",
    models: ["custom-model"],
    capabilities: ["analysis"],
    hint: "Dành cho máy chủ AI nội bộ hoặc proxy riêng của bạn.",
  },
};

const PROVIDER_DEFAULTS: Record<
  ProviderType,
  { name: string; baseUrl: string; model: string; ttsModel?: string }
> = {
  openai: {
    name: "OpenAI ChatGPT",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    ttsModel: "tts-1",
  },
  gemini: {
    name: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    model: "gemini-flash-latest",
  },
  anthropic: {
    name: "Anthropic Claude",
    baseUrl: "https://api.anthropic.com/v1",
    model: "claude-3-5-sonnet-latest",
  },
  deepseek: {
    name: "DeepSeek AI",
    baseUrl: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
  },
  groq: {
    name: "Groq Cloud",
    baseUrl: "https://api.groq.com/openai/v1",
    model: "llama-3.3-70b-versatile",
  },
  elevenlabs: {
    name: "ElevenLabs Voice AI",
    baseUrl: "https://api.elevenlabs.io/v1",
    model: "eleven_multilingual_v2",
    ttsModel: "eleven_multilingual_v2",
  },
  "openai-compatible": {
    name: "OpenAI Compatible",
    baseUrl: "https://api.example.com/v1",
    model: "gpt-4o",
    ttsModel: "tts-1",
  },
  custom: {
    name: "Custom Provider",
    baseUrl: "https://api.example.com",
    model: "model-name",
  },
};

function emptyProvider(presetKey: string = "gemini"): ProviderDraft {
  const cfg = PROVIDER_CONFIGS[presetKey] || PROVIDER_CONFIGS.gemini;
  return {
    providerType: cfg.type,
    name: cfg.name,
    baseUrl: cfg.baseUrl,
    model: cfg.defaultModel,
    ttsModel: cfg.ttsModel,
    apiKey: "",
    capabilities: cfg.capabilities,
    enabled: true,
  };
}

export function SettingsPage({
  preferences,
  onPreferencesChanged,
}: {
  preferences?: ToolPreferences;
  onPreferencesChanged?: (value: ToolPreferences) => void;
}) {
  const [localPreferences, setLocalPreferences] = useState<ToolPreferences>(
    preferences || DEFAULT_PREFERENCES
  );
  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const [providerForm, setProviderForm] = useState<ProviderDraft | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [providerMessage, setProviderMessage] = useState("");
  const [providerError, setProviderError] = useState("");
  const [testingId, setTestingId] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [media, setMedia] = useState<{ ffmpeg: boolean; ffprobe: boolean } | null>(null);
  const [cloudModels, setCloudModels] = useState<CloudModelItem[]>(DEFAULT_CLOUD_MODELS);
  const [cloudCategory, setCloudCategory] = useState<string>("all");
  const [cloudSearchQuery, setCloudSearchQuery] = useState<string>("");
  const [lastSyncedTime, setLastSyncedTime] = useState<string>("Vừa cập nhật");
  const [updateState, setUpdateState] = useState<{
    checking: boolean;
    installing: boolean;
    progress: number;
    message: string;
    release?: UpdateRelease | null;
  }>({ checking: false, installing: false, progress: 0, message: "" });

  const native = isNativeRuntime();

  async function loadSettings() {
    try {
      const [preferenceResult, providerResult] = await Promise.all([
        getRuntime().getPreferences(),
        getRuntime().getProviderProfiles(),
      ]);
      setLocalPreferences(preferenceResult);
      onPreferencesChanged?.(preferenceResult);
      setProviders(providerResult);

      // Fetch cloud models
      try {
        const apiBase = String((import.meta as any).env?.VITE_API_URL || "https://jacs-studio.nexoratech.com.vn").replace(/\/$/, "");
        const res = await fetch(`${apiBase}/api/v1/ai-providers/models-available`, {
          signal: AbortSignal.timeout(5000),
        }).catch(() => null);
        if (res && res.ok) {
          const payload = await res.json();
          const available = payload?.data || [];
          if (Array.isArray(available) && available.length > 0) {
            setCloudModels(available);
            setLastSyncedTime(new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }));
          }
        }
      } catch {
        // Keep defaults
      }
    } catch (error) {
      setProviderError(
        error instanceof Error ? error.message : "Không tải được cấu hình tool"
      );
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => {
    void loadSettings();
    void getRuntime().getMediaCapabilities?.().then(setMedia);
  }, []);

  useEffect(
    () =>
      getRuntime().onUpdateProgress?.((progress: UpdateProgress) => {
        if (progress.stage === "downloading")
          setUpdateState((current) => ({
            ...current,
            installing: true,
            progress: progress.progress,
            message: `Đang tải bản cập nhật... ${progress.progress}%`,
          }));
        if (progress.stage === "verifying")
          setUpdateState((current) => ({
            ...current,
            installing: true,
            progress: 100,
            message: "Đang kiểm tra SHA-512...",
          }));
        if (progress.stage === "installing")
          setUpdateState((current) => ({
            ...current,
            installing: true,
            progress: 100,
            message: "Đang cài đặt và khởi động lại JACS Studio...",
          }));
        if (progress.stage === "failed")
          setUpdateState((current) => ({
            ...current,
            installing: false,
            message: progress.error || "Cập nhật thất bại",
          }));
      }) || undefined,
    []
  );

  function update(values: Partial<ToolPreferences>) {
    const next = { ...localPreferences, ...values };
    setLocalPreferences(next);
    onPreferencesChanged?.(next);
    void getRuntime().savePreferences(next);
  }

  async function clearCache() {
    try {
      await getRuntime().clearCache?.();
      setProviderMessage("Đã dọn sạch file cache tạm trên thiết bị.");
    } catch (error) {
      setProviderError(error instanceof Error ? error.message : "Không dọn được cache");
    }
  }

  async function chooseOutputFolder() {
    const value = await getRuntime().pickOutputFolder?.();
    if (!value) return;
    update({ outputPath: value });
  }

  async function checkForUpdate() {
    const check = getRuntime().checkForUpdate;
    if (!check) {
      setUpdateState({
        checking: false,
        installing: false,
        progress: 0,
        message: "Kiểm tra cập nhật cần chạy bản Electron.",
      });
      return;
    }
    setUpdateState({
      checking: true,
      installing: false,
      progress: 0,
      message: "Đang kiểm tra bản cập nhật...",
    });
    try {
      const result = await check("stable");
      if (!result.update_available || !result.release) {
        setUpdateState({
          checking: false,
          installing: false,
          progress: 0,
          message: "Bạn đang dùng phiên bản mới nhất.",
        });
        return;
      }
      setUpdateState({
        checking: false,
        installing: false,
        progress: 0,
        message: `Có bản ${result.release.version} mới.`,
        release: result.release,
      });
    } catch (error) {
      setUpdateState({
        checking: false,
        installing: false,
        progress: 0,
        message:
          error instanceof Error ? error.message : "Không kiểm tra được cập nhật",
      });
    }
  }

  async function installUpdate() {
    const runtime = getRuntime();
    const release = updateState.release;
    if (!release || !runtime.downloadUpdate) return;
    setUpdateState((current) => ({
      ...current,
      installing: true,
      progress: 0,
      message: "Đang chuẩn bị tải bản cập nhật...",
    }));
    try {
      const result = await runtime.downloadUpdate(release);
      if (result.status === "manual")
        setUpdateState((current) => ({
          ...current,
          installing: false,
          message: "Đã mở installer tải về. Hãy tiến hành cài đặt.",
        }));
    } catch (error) {
      setUpdateState((current) => ({
        ...current,
        installing: false,
        message: error instanceof Error ? error.message : "Cập nhật thất bại",
      }));
    }
  }

  async function saveProvider(event: FormEvent) {
    event.preventDefault();
    if (!providerForm) return;
    setProviderError("");
    setProviderMessage("");
    try {
      await getRuntime().saveProviderProfile({
        ...providerForm,
        capabilities: providerForm.capabilities
          .map((item) => item.trim())
          .filter(Boolean),
      });
      setProviderMessage(
        providerForm.id
          ? "Đã cập nhật provider an toàn."
          : "Đã thêm provider và mã hóa API key an toàn trên máy."
      );
      setProviderForm(null);
      setIsModalOpen(false);
      setProviders(await getRuntime().getProviderProfiles());
    } catch (error) {
      setProviderError(
        error instanceof Error ? error.message : "Không lưu được provider"
      );
    }
  }

  const [testResult, setTestResult] = useState<{
    providerName: string;
    providerType: string;
    model: string;
    status: "reachable" | "invalid_credentials" | "unreachable" | "unsupported";
    latencyMs: number;
    detail: string;
    httpStatus?: number;
    capabilities: string[];
  } | null>(null);
  const [isLoggingInWeb, setIsLoggingInWeb] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  async function testProvider(id: string) {
    const target = providers.find((p) => p.id === id);
    setTestingId(id);
    setProviderError("");
    setProviderMessage("");
    try {
      const result = await getRuntime().testProviderConnection(id);
      const suffix = result.latencyMs ? ` · ${result.latencyMs}ms` : "";
      setTestResult({
        providerName: target?.name || "AI Provider",
        providerType: target?.providerType || "openai",
        model: target?.model || "default",
        status: result.status,
        latencyMs: result.latencyMs || 0,
        detail: result.detail,
        httpStatus: result.httpStatus,
        capabilities: target?.capabilities || ["analysis"],
      });
      if (result.status === "reachable")
        setProviderMessage(`✓ Kết nối tốt: ${result.detail}${suffix}`);
      else setProviderError(`✕ Lỗi kết nối: ${result.detail}${suffix}`);
    } catch (error) {
      setProviderError(
        error instanceof Error ? error.message : "Không kiểm tra được provider"
      );
    } finally {
      setTestingId("");
    }
  }

  async function handleWebSessionLogin(providerType: string) {
    setIsLoggingInWeb(true);
    setProviderError("");
    setProviderMessage("");
    try {
      const res = await getRuntime().webSessionLogin?.(providerType);
      if (res?.success && res.token) {
        setProviderForm((prev) =>
          prev
            ? {
                ...prev,
                apiKey: res.token!,
              }
            : null
        );
        setProviderMessage(`✓ Đã đăng nhập web ${providerType.toUpperCase()} thành công (Đã trích xuất ${res.cookieName || "Session Cookie"})!`);
      } else if (res?.message) {
        setProviderError(res.message);
      }
    } catch (err) {
      setProviderError(err instanceof Error ? err.message : "Không thể mở cửa sổ đăng nhập web");
    } finally {
      setIsLoggingInWeb(false);
    }
  }

  async function deleteProvider(id: string) {
    const confirmed = await popup.confirmDelete(
      "Xóa Nhà Cung Cấp AI",
      "Xóa provider và API key đã mã hóa khỏi thiết bị này?"
    );
    if (!confirmed) return;
    try {
      await getRuntime().deleteProviderProfile(id);
      setProviders(await getRuntime().getProviderProfiles());
      setProviderMessage("Đã xóa provider khỏi thiết bị.");
      popup.success("Đã xóa provider khỏi thiết bị.");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Không xóa được provider";
      setProviderError(msg);
      popup.error("Lỗi xóa provider", msg);
    }
  }

  const [syncingCloud, setSyncingCloud] = useState(false);

  async function syncWithCloudAdmin() {
    setSyncingCloud(true);
    setProviderError("");
    setProviderMessage("");
    try {
      const apiBase = String((import.meta as any).env?.VITE_API_URL || "https://jacs-studio.nexoratech.com.vn").replace(/\/$/, "");
      const res = await fetch(`${apiBase}/api/v1/ai-providers/models-available`, {
        signal: AbortSignal.timeout(8000),
      }).catch(() => null);

      if (res && res.ok) {
        const payload = await res.json();
        const available = payload?.data || [];
        if (Array.isArray(available) && available.length > 0) {
          setCloudModels(available);
          setLastSyncedTime(new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }));
          await getRuntime().syncManagedProviders?.(available);
          const updated = await getRuntime().getProviderProfiles();
          setProviders(updated);
          setProviderMessage(`✓ Đã đồng bộ thành công ${available.length} Model & AI Provider được cấp phép từ Cloud Admin!`);
          popup.success(`Đã đồng bộ ${available.length} Model từ Cloud Admin`, "Bảng giá và danh sách Model cấp phép đã được nạp thành công.");
          return;
        }
      }

      const updated = await getRuntime().getProviderProfiles();
      setProviders(updated);
      setProviderMessage("✓ Đã làm mới danh sách AI Providers.");
      popup.success("Làm mới thành công", "Đã cập nhật danh sách AI Provider trên thiết bị.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Không thể đồng bộ từ Cloud Admin";
      setProviderError(msg);
      popup.error("Lỗi đồng bộ Cloud Admin", msg);
    } finally {
      setSyncingCloud(false);
    }
  }

  const [testingModelId, setTestingModelId] = useState<string>("");
  const [cloudModelTestResults, setCloudModelTestResults] = useState<Record<string, { status: "reachable" | "unreachable"; latencyMs: number; detail: string }>>({});

  function getProviderTypeFromName(pName: string): string {
    const low = (pName || "").toLowerCase();
    if (low.includes("gemini") || low.includes("google")) return "gemini";
    if (low.includes("claude") || low.includes("anthropic")) return "anthropic";
    if (low.includes("deepseek")) return "openai-compatible";
    if (low.includes("eleven")) return "elevenlabs";
    if (low.includes("whisper")) return "whisper";
    if (low.includes("glm") || low.includes("zhipu")) return "openai-compatible";
    return "openai";
  }

  async function testCloudModel(item: CloudModelItem) {
    const modelKey = item.id || item.model;
    setTestingModelId(modelKey);
    setProviderError("");
    setProviderMessage("");

    const started = Date.now();
    try {
      // 1. Kiểm tra xem đã có BYOK Provider cho model này chưa
      const byok = providers.find(
        (p) => !p.isManaged && (p.model === item.model || p.providerType === getProviderTypeFromName(item.provider_name))
      );

      if (byok && byok.hasApiKey) {
        const res = await getRuntime().testProviderConnection(byok.id);
        const latency = res.latencyMs || (Date.now() - started);
        setCloudModelTestResults((prev) => ({
          ...prev,
          [modelKey]: {
            status: res.status === "reachable" ? "reachable" : "unreachable",
            latencyMs: latency,
            detail: res.detail || (res.status === "reachable" ? "Kết nối tốt qua API Key cá nhân (BYOK)" : "Lỗi kết nối"),
          },
        }));

        if (res.status === "reachable") {
          popup.success(
            `✓ Model ${item.model} Khả Dụng!`,
            `Đã kiểm tra qua API Key cá nhân (${byok.name || item.provider_name}) · Độ trễ: ${latency}ms\nTrạng thái: ${res.detail}`
          );
        } else {
          popup.error(
            `✕ Lỗi Kết Nối Model ${item.model}`,
            `Chi tiết: ${res.detail}\nVui lòng kiểm tra lại API Key trong mục BYOK.`
          );
        }
        return;
      }

      // 2. Kiểm tra qua Cloud Gateway Admin của máy chủ
      const apiBase = String((import.meta as any).env?.VITE_API_URL || "https://jacs-studio.nexoratech.com.vn").replace(/\/$/, "");
      const testRes = await fetch(`${apiBase}/api/v1/ai-providers/models-available`, {
        signal: AbortSignal.timeout(6000),
      }).catch(() => null);

      const latency = Date.now() - started;
      if (testRes && testRes.ok && item.is_selling) {
        setCloudModelTestResults((prev) => ({
          ...prev,
          [modelKey]: {
            status: "reachable",
            latencyMs: latency,
            detail: "Đã cấp phép & Sẵn sàng hoạt động qua Cloud Admin Gateway",
          },
        }));
        popup.success(
          `✓ Model ${item.model} Sẵn Sàng!`,
          `Nhà cung cấp: ${item.provider_name}\nĐịnh giá: In ${item.input_price}đ / Out ${item.output_price}đ\nTrạng thái: Đã cấp phép chính thức từ Cloud Admin (Độ trễ gateway: ${latency}ms)`
        );
      } else {
        setCloudModelTestResults((prev) => ({
          ...prev,
          [modelKey]: {
            status: item.is_selling ? "reachable" : "unreachable",
            latencyMs: latency,
            detail: item.is_selling ? "Sẵn sàng" : "Model đang tạm ngưng",
          },
        }));
        popup.info(
          `Thông Tin Model ${item.model}`,
          `Model ${item.model} (${item.provider_name}) ${item.is_selling ? "đã được cấp phép sử dụng" : "đang tạm ngưng"}.\nBạn có thể bấm "🔑 Nhập Key" nếu muốn sử dụng API Key riêng của bạn.`
        );
      }
    } catch (err) {
      const latency = Date.now() - started;
      setCloudModelTestResults((prev) => ({
        ...prev,
        [modelKey]: {
          status: "unreachable",
          latencyMs: latency,
          detail: err instanceof Error ? err.message : "Lỗi kiểm tra model",
        },
      }));
      popup.error("Không Thể Kiểm Tra Model", err instanceof Error ? err.message : "Lỗi mạng hoặc máy chủ không phản hồi");
    } finally {
      setTestingModelId("");
    }
  }

  function selectCloudModelForAnalysis(item: CloudModelItem) {
    const existing = providers.find((p) => p.model === item.model || p.name.toLowerCase().includes(item.provider_name.toLowerCase()));
    if (existing) {
      popup.success(`Đã chọn ${item.model}`, `Model ${item.model} (${item.provider_name}) đã sẵn sàng để phân tích video.`);
      return;
    }
    configureBYOKForCloudModel(item);
  }

  function configureBYOKForCloudModel(item: CloudModelItem) {
    const pName = item.provider_name.toLowerCase();
    const pType = item.providerType || (pName.includes("gemini") ? "gemini" : pName.includes("claude") || pName.includes("anthropic") ? "anthropic" : pName.includes("deepseek") ? "deepseek" : pName.includes("eleven") ? "elevenlabs" : "openai");
    const matchedKey = Object.keys(PROVIDER_CONFIGS).find(k => PROVIDER_CONFIGS[k].type === pType) || "gemini";
    handleSelectPreset(matchedKey);
    setProviderForm(prev => prev ? { ...prev, model: item.model, name: `${item.provider_name} (${item.model})` } : null);
    setIsModalOpen(true);
  }

  const filteredCloudModels = cloudModels.filter((m) => {
    const q = cloudSearchQuery.trim().toLowerCase();
    const matchSearch = !q || m.model.toLowerCase().includes(q) || m.provider_name.toLowerCase().includes(q) || (m.purpose && m.purpose.toLowerCase().includes(q));
    const matchCategory = cloudCategory === "all" || m.category === cloudCategory;
    return matchSearch && matchCategory;
  });

  const byokProviders = useMemo(() => providers.filter((p) => !p.isManaged), [providers]);

  const groupedCloudModels = useMemo(() => {
    const groups: Record<string, CloudModelItem[]> = {};
    for (const item of filteredCloudModels) {
      const provider = item.provider_name || "Khác";
      if (!groups[provider]) {
        groups[provider] = [];
      }
      groups[provider].push(item);
    }
    return groups;
  }, [filteredCloudModels]);

  const [selectedPreset, setSelectedPreset] = useState("gemini");

  function openNewProvider() {
    setProviderError("");
    setSelectedPreset("gemini");
    setProviderForm(emptyProvider("gemini"));
    setIsModalOpen(true);
  }

  function handleSelectPreset(presetKey: string) {
    setSelectedPreset(presetKey);
    const cfg = PROVIDER_CONFIGS[presetKey] || PROVIDER_CONFIGS.gemini;
    setProviderForm((prev) => ({
      ...(prev || emptyProvider(presetKey)),
      providerType: cfg.type,
      name: cfg.name,
      baseUrl: cfg.baseUrl,
      model: cfg.defaultModel,
      ttsModel: cfg.ttsModel,
      capabilities: cfg.capabilities,
    }));
  }

  function toggleAllCapabilities() {
    if (!providerForm) return;
    const allCaps = ["analysis", "vision", "transcription", "tts"];
    const hasAll = allCaps.every((c) => providerForm.capabilities.includes(c));
    setProviderForm({
      ...providerForm,
      capabilities: hasAll ? ["analysis"] : allCaps,
    });
  }

  function editProvider(profile: ProviderProfile) {
    setProviderError("");
    // Find matching preset key if possible
    const matchedKey = Object.keys(PROVIDER_CONFIGS).find(
      (k) =>
        PROVIDER_CONFIGS[k].type === profile.providerType &&
        (profile.baseUrl.includes(PROVIDER_CONFIGS[k].baseUrl) || profile.name.toLowerCase().includes(k))
    ) || "custom";
    setSelectedPreset(matchedKey);
    setProviderForm({
      id: profile.id,
      name: profile.name,
      providerType: profile.providerType,
      baseUrl: profile.baseUrl,
      model: profile.model,
      transcriptionModel: profile.transcriptionModel,
      ttsModel: profile.ttsModel,
      apiKey: "",
      capabilities: profile.capabilities,
      enabled: profile.enabled,
    });
    setIsModalOpen(true);
  }

  function changeProviderType(type: ProviderType) {
    if (!providerForm) return;
    const capabilities =
      type === "custom"
        ? ["analysis"]
        : ["openai", "openai-compatible"].includes(type)
        ? ["analysis", "vision", "transcription", "tts"]
        : ["analysis", "vision"];
    setProviderForm({
      ...providerForm,
      providerType: type,
      ...PROVIDER_DEFAULTS[type],
      capabilities,
    });
  }

  return (
    <div
      className="settings-workspace-root animate-fade-in"
      style={{
        padding: "10px 16px 96px 16px",
        width: "100%",
        margin: 0,
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        height: "100%",
        flex: "1 1 0%",
        overflowY: "auto",
      }}
    >
      {/* 1. Header & Synchronized Actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "10px", flexShrink: 0, width: "100%", boxSizing: "border-box" }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              background: "rgba(245, 158, 11, 0.12)",
              border: "1px solid rgba(245, 158, 11, 0.35)",
              padding: "2px 8px",
              borderRadius: "5px",
              fontSize: "10.5px",
              fontWeight: 800,
              color: "#fbbf24",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: "3px",
            }}
          >
            <Sliders size={10} /> SYSTEM & PREFERENCES · CÀI ĐẶT TOOL
          </div>
          <h1 style={{ fontSize: "18px", fontWeight: 800, color: "#f8fafc", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
            <GearFill size={18} color="#fbbf24" />
            Cài Đặt Hệ Thống & Nhà Cung Cấp AI (BYOK)
          </h1>
          <p style={{ fontSize: "11.5px", color: "#94a3b8", margin: "2px 0 0" }}>
            Quản lý workspace, thư mục output video, quyền riêng tư, engine render FFmpeg và các API Key nhà cung cấp AI.
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center", flexShrink: 0 }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => void loadSettings()}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#f8fafc",
              padding: "7px 14px",
              borderRadius: "7px",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <Check2 size={13} color="#34d399" /> {loaded ? "Đã đồng bộ" : "Đang tải..."}
          </button>
        </div>
      </div>

      {providerMessage && <p className="form-success">{providerMessage}</p>}
      {providerError && <p className="form-error">{providerError}</p>}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: "12px",
          marginBottom: "12px",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* Card 1: Workspace & Storage */}
        <section className="panel-card" style={{ borderRadius: "10px", padding: "14px 16px" }}>
          <div className="panel-head">
            <div>
              <span style={{ fontSize: "10px", color: "#fbbf24", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                WORKSPACE & STORAGE
              </span>
              <h3 style={{ fontSize: "14px", fontWeight: 800, color: "#f8fafc", margin: "2px 0 0" }}>
                Thư mục & Dữ liệu máy
              </h3>
            </div>
          </div>

          <div className="field-pair">
            <label className="field-label">
              Tên workspace
              <input
                maxLength={120}
                value={localPreferences.workspaceName}
                onChange={(event) =>
                  update({ workspaceName: event.target.value })
                }
              />
            </label>
            <label className="field-label">
              Tên người dùng
              <input
                maxLength={120}
                value={localPreferences.operatorName}
                onChange={(event) => update({ operatorName: event.target.value })}
              />
            </label>
          </div>

          <div style={{ marginTop: "14px" }}>
            <label className="field-label">
              Thư mục Workspace
              <div className="path-input-row">
                <FolderFill size={14} color="#38bdf8" />
                <span>{localPreferences.workspacePath}</span>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: "4px 10px", fontSize: "11px" }}
                  onClick={() =>
                    void getRuntime().revealPath(localPreferences.workspacePath)
                  }
                >
                  Mở
                </button>
              </div>
            </label>

            <label className="field-label">
              Thư mục Output Video
              <div className="path-input-row">
                <FolderFill size={14} color="#38bdf8" />
                <span>{localPreferences.outputPath}</span>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: "4px 10px", fontSize: "11px" }}
                  onClick={() => void chooseOutputFolder()}
                >
                  Đổi
                </button>
              </div>
            </label>

            <label className="field-label">
              Cache & File Tạm
              <div className="path-input-row">
                <FolderFill size={14} color="#38bdf8" />
                <span>{localPreferences.cachePath}</span>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: "4px 10px", fontSize: "11px" }}
                  onClick={() =>
                    void getRuntime().revealPath(localPreferences.cachePath)
                  }
                >
                  Mở
                </button>
              </div>
            </label>
          </div>

          <div
            style={{
              marginTop: "16px",
              paddingTop: "12px",
              borderTop: "1px solid var(--line)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <small style={{ color: "#94a3b8", display: "block" }}>
                Media Engine Status
              </small>
              <strong style={{ fontSize: "12px", color: "#f1f5f9" }}>
                {media
                  ? `${media.ffmpeg ? "✓ FFmpeg Sẵn sàng" : "✕ Thiếu FFmpeg"} · ${
                      media.ffprobe ? "✓ FFprobe" : "✕ Thiếu FFprobe"
                    }`
                  : "Đang kiểm tra..."}
              </strong>
            </div>
            <button
              className="text-button"
              type="button"
              onClick={() => void clearCache()}
            >
              <Trash3Fill size={13} /> Dọn cache
            </button>
          </div>
        </section>

        {/* Card 2: Privacy, Engine & Updates */}
        <section className="panel-card" style={{ borderRadius: "10px", padding: "14px 16px" }}>
          <div className="panel-head">
            <div>
              <span style={{ fontSize: "10px", color: "#38bdf8", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                SYSTEM & UPDATES
              </span>
              <h3 style={{ fontSize: "14px", fontWeight: 800, color: "#f8fafc", margin: "2px 0 0" }}>
                Hệ thống & Cập nhật
              </h3>
            </div>
          </div>

          {/* Setting Toggles */}
          <div className="setting-toggle-item">
            <div className="setting-toggle-text">
              <strong>Gửi log lỗi ẩn danh</strong>
              <small>Giúp đội ngũ xử lý sự cố. Không gửi video hay API key.</small>
            </div>
            <button
              type="button"
              className={`toggle-switch ${
                localPreferences.telemetryEnabled ? "is-on" : ""
              }`}
              onClick={() =>
                update({ telemetryEnabled: !localPreferences.telemetryEnabled })
              }
              aria-label="Toggle telemetry"
            >
              <i />
            </button>
          </div>

          <div className="setting-toggle-item">
            <div className="setting-toggle-text">
              <strong>Tự động kiểm tra bản cập nhật</strong>
              <small>Thông báo khi có bản phát hành mới từ server.</small>
            </div>
            <button
              type="button"
              className={`toggle-switch ${
                localPreferences.autoUpdateEnabled ? "is-on" : ""
              }`}
              onClick={() =>
                update({
                  autoUpdateEnabled: !localPreferences.autoUpdateEnabled,
                })
              }
              aria-label="Toggle auto update"
            >
              <i />
            </button>
          </div>

          <label className="field-label" style={{ marginTop: "14px" }}>
            Engine Render Ưu Tiên
            <select
              value={localPreferences.preferredEngine}
              onChange={(event) =>
                update({
                  preferredEngine: event.target
                    .value as ToolPreferences["preferredEngine"],
                })
              }
            >
              <option value="auto">Tự động chọn GPU tối ưu nhất</option>
              <option value="nvidia">NVIDIA NVENC (GPU)</option>
              <option value="apple">Apple VideoToolbox</option>
              <option value="cpu">CPU Software Fallback</option>
            </select>
          </label>

          {/* Update Section */}
          <div
            style={{
              marginTop: "16px",
              padding: "12px 14px",
              borderRadius: "10px",
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid var(--line)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            <div>
              <strong style={{ display: "block", fontSize: "12.5px" }}>
                Cập nhật JACS Studio
              </strong>
              <small style={{ color: "#94a3b8", fontSize: "11px" }}>
                {updateState.message || "Kiểm tra phiên bản mới nhất từ server."}
              </small>
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: "6px 12px", fontSize: "11.5px" }}
                onClick={() => void checkForUpdate()}
                disabled={updateState.checking || updateState.installing}
              >
                {updateState.checking ? "Đang kiểm tra..." : "Kiểm tra ngay"}
              </button>
              {updateState.release && (
                <button
                  type="button"
                  className="btn-primary"
                  style={{ padding: "6px 12px", fontSize: "11.5px" }}
                  onClick={() => void installUpdate()}
                  disabled={updateState.installing}
                >
                  {updateState.installing
                    ? `Đang tải ${updateState.progress}%`
                    : `Cập nhật lên ${updateState.release.version}`}
                </button>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Section 3: AI Providers Table (BYOK - Dành cho khách tự đăng nhập / thêm key cá nhân) */}
      <section
        className="panel-card"
        style={{
          borderRadius: "12px",
          padding: "16px 20px",
          marginBottom: "28px",
          width: "100%",
          boxSizing: "border-box",
          background: "linear-gradient(180deg, #111827 0%, #0b0f19 100%)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.25)",
        }}
      >
        <div className="panel-head" style={{ marginBottom: "14px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
              <span style={{ fontSize: "10px", color: "#fbbf24", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", background: "rgba(245, 158, 11, 0.12)", border: "1px solid rgba(245, 158, 11, 0.3)", padding: "2px 7px", borderRadius: "4px" }}>
                🔑 AI PROVIDERS & API KEYS (BYOK CÁ NHÂN)
              </span>
              <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                {byokProviders.length} kết nối riêng
              </span>
            </div>
            <h3 style={{ fontSize: "15px", fontWeight: 800, color: "#f8fafc", margin: "2px 0 0" }}>
              Nhà cung cấp AI (BYOK - Bring Your Own Key)
            </h3>
            <p className="subtle" style={{ fontSize: "12px", color: "#94a3b8", margin: "3px 0 0" }}>
              Dành riêng cho API Key do bạn tự thêm hoặc đăng nhập trên tool. Mã hóa an toàn AES-256 trên thiết bị của bạn.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              className="btn-primary"
              onClick={openNewProvider}
              disabled={!native}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: 800,
                cursor: native ? "pointer" : "not-allowed",
                background: "linear-gradient(135deg, #d97706, #f59e0b)",
                border: "none",
                color: "#12151f",
                boxShadow: "0 0 16px rgba(245, 158, 11, 0.4)",
              }}
            >
              <PlusLg size={13} /> {native ? "+ Thêm AI Provider (BYOK)" : "Mở bản Desktop để thêm"}
            </button>
          </div>
        </div>

        {byokProviders.length > 0 ? (
          <div className="jacs-table-wrapper" style={{ overflowX: "auto" }}>
            <table className="jacs-table">
              <thead>
                <tr style={{ background: "rgba(0, 0, 0, 0.3)" }}>
                  <th>TÊN PROVIDER</th>
                  <th>LOẠI NỀN TẢNG</th>
                  <th>MODEL MẶC ĐỊNH</th>
                  <th>BASE URL / ENDPOINT</th>
                  <th>TRẠNG THÁI</th>
                  <th style={{ textAlign: "right" }}>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {byokProviders.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                        <KeyFill size={13} color="#fbbf24" />
                        <strong style={{ color: "#ffffff", fontSize: "12.5px" }}>{p.name}</strong>
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          padding: "3px 8px",
                          borderRadius: "5px",
                          background: "rgba(255, 255, 255, 0.08)",
                          color: "#cbd5e1",
                          fontSize: "11px",
                          fontWeight: 700,
                          textTransform: "uppercase",
                        }}
                      >
                        {p.providerType}
                      </span>
                    </td>
                    <td>
                      <code style={{ color: "#38bdf8", fontWeight: 700, fontSize: "11.5px" }}>{p.model}</code>
                    </td>
                    <td>
                      <small style={{ color: "#94a3b8", fontFamily: "monospace", fontSize: "11px" }}>{p.baseUrl}</small>
                    </td>
                    <td>
                      <span
                        style={{
                          color: p.enabled ? "#10b981" : "#94a3b8",
                          fontWeight: 750,
                          fontSize: "11.5px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        {p.enabled ? "● Sẵn sàng" : "○ Đang tắt"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => void testProvider(p.id)}
                        disabled={testingId === p.id}
                        style={{ color: "#38bdf8", marginRight: "8px" }}
                      >
                        {testingId === p.id ? "Đang test..." : "Test"}
                      </button>
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => editProvider(p)}
                        style={{ color: "#fbbf24", marginRight: "8px" }}
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        className="text-button"
                        style={{ color: "#f87171" }}
                        onClick={() => void deleteProvider(p.id)}
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div
            style={{
              padding: "24px 20px",
              borderRadius: "10px",
              background: "rgba(15, 23, 42, 0.5)",
              border: "1px dashed rgba(245, 158, 11, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", maxWidth: "720px" }}>
              <div
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "8px",
                  background: "rgba(245, 158, 11, 0.15)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <KeyFill size={18} color="#fbbf24" />
              </div>
              <div>
                <h4 style={{ margin: "0 0 4px", fontSize: "13.5px", fontWeight: 800, color: "#f8fafc" }}>
                  Chưa có kết nối BYOK cá nhân nào
                </h4>
                <p style={{ margin: 0, fontSize: "12px", color: "#94a3b8", lineHeight: 1.5 }}>
                  Mặc định tool đang kết nối sử dụng trực tiếp các Model AI được cấp phép chính thức từ <strong>Cloud Admin Gateway</strong> (ở bảng bên dưới).
                  Nếu bạn muốn dùng API Key riêng của cá nhân (OpenAI, Gemini, Claude, DeepSeek, ElevenLabs...), hãy nhấn <strong>"+ Thêm AI Provider (BYOK)"</strong> hoặc bấm <strong>"🔑 Nhập Key"</strong> ở model tương ứng bên dưới.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="btn-secondary"
              onClick={openNewProvider}
              disabled={!native}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "7px",
                fontSize: "12px",
                fontWeight: 750,
                background: "rgba(245, 158, 11, 0.12)",
                border: "1px solid rgba(245, 158, 11, 0.35)",
                color: "#fbbf24",
                cursor: native ? "pointer" : "not-allowed",
              }}
            >
              <PlusLg size={12} /> Thêm Key Riêng Của Bạn
            </button>
          </div>
        )}
      </section>

      {/* Section 4: BẢNG CẬP NHẬT MODEL & ĐỊNH GIÁ ĐỒNG BỘ TỪ CLOUD ADMIN */}
      <section
        className="panel-card"
        style={{
          borderRadius: "12px",
          padding: "18px 20px",
          marginBottom: "32px",
          width: "100%",
          boxSizing: "border-box",
          background: "linear-gradient(180deg, #101626 0%, #0a0e1a 100%)",
          border: "1px solid rgba(245, 158, 11, 0.3)",
          boxShadow: "0 6px 24px rgba(0, 0, 0, 0.4)",
        }}
      >
        <div className="panel-head" style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span style={{ fontSize: "10px", color: "#10b981", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.35)", padding: "2px 8px", borderRadius: "4px" }}>
                🟢 CLOUD AI LICENSED GATEWAY (ADMIN CẤP PHÉP)
              </span>
              <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                Đồng bộ lúc: <b style={{ color: "#f8fafc" }}>{lastSyncedTime}</b>
              </span>
            </div>
            <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#f8fafc", margin: "3px 0 0", display: "flex", alignItems: "center", gap: "7px" }}>
              <CpuFill size={17} color="#fbbf24" /> Danh Sách Model AI & Định Giá Được Cấp Phép
            </h3>
            <p className="subtle" style={{ fontSize: "12px", color: "#94a3b8", margin: "4px 0 0" }}>
              Các Model AI cao cấp (Gemini 2.5 Flash, Claude 3.7 Sonnet, GPT-4o, DeepSeek Reasoner, Whisper, ElevenLabs) do Admin cấp phép và định giá chính thức.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            {/* Search Input */}
            <input
              type="text"
              placeholder="Tìm model hoặc hãng..."
              value={cloudSearchQuery}
              onChange={(e) => setCloudSearchQuery(e.target.value)}
              style={{
                padding: "7px 12px",
                borderRadius: "7px",
                background: "#080b12",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: "#f8fafc",
                fontSize: "12px",
                outline: "none",
                width: "180px",
              }}
            />

            {/* Category Filter */}
            <select
              value={cloudCategory}
              onChange={(e) => setCloudCategory(e.target.value)}
              style={{
                padding: "7px 12px",
                borderRadius: "7px",
                background: "#080b12",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: "#fbbf24",
                fontSize: "12px",
                fontWeight: 750,
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="all">Tất cả danh mục ({cloudModels.length})</option>
              <option value="cinema">🎬 Điện ảnh & Kịch bản</option>
              <option value="vision">👁️ Thị giác 1M Tokens</option>
              <option value="reasoning">🧠 Reasoner / Logic R1</option>
              <option value="voice">🎙️ Voice TTS Review</option>
              <option value="transcription">📝 Bóc băng Whisper</option>
            </select>

            {/* Sync Now Button */}
            <button
              type="button"
              onClick={syncWithCloudAdmin}
              disabled={syncingCloud}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "7px 14px",
                borderRadius: "7px",
                fontSize: "12px",
                fontWeight: 800,
                background: "linear-gradient(135deg, #d97706, #f59e0b)",
                color: "#12151f",
                border: "none",
                cursor: syncingCloud ? "not-allowed" : "pointer",
                boxShadow: "0 0 14px rgba(245, 158, 11, 0.35)",
              }}
            >
              <ArrowRepeat size={13} className={syncingCloud ? "animate-spin" : ""} />
              {syncingCloud ? "Đang đồng bộ..." : "🔄 Cập Nhật Bảng Giá"}
            </button>
          </div>
        </div>

        {/* Table of Grouped Cloud Models */}
        <div className="jacs-table-wrapper" style={{ maxHeight: "540px", overflowY: "auto", overflowX: "auto" }}>
          <table className="jacs-table" style={{ width: "100%", minWidth: "1560px", borderCollapse: "separate", borderSpacing: 0 }}>
            <thead>
              <tr style={{ background: "rgba(0, 0, 0, 0.35)", position: "sticky", top: 0, zIndex: 10 }}>
                <th style={{ width: "35px" }}>STT</th>
                <th style={{ minWidth: "220px" }}>TÊN MODEL AI</th>
                <th style={{ minWidth: "140px" }}>NHÀ CUNG CẤP</th>
                <th style={{ minWidth: "220px" }}>CHUYÊN DỤNG / TÍNH NĂNG</th>
                <th style={{ minWidth: "160px" }}>ĐỊNH GIÁ TOKEN (IN / OUT)</th>
                <th style={{ minWidth: "160px", color: "#fbbf24" }}>QUY ĐỔI CREDIT (IN / OUT)</th>
                <th style={{ minWidth: "130px" }}>CACHE / REQUEST</th>
                <th style={{ minWidth: "120px" }}>TRẠNG THÁI</th>
                <th style={{ minWidth: "290px", width: "290px", textAlign: "right", whiteSpace: "nowrap" }}>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(groupedCloudModels).length > 0 ? (
                Object.entries(groupedCloudModels).map(([providerGroup, items], gIdx) => (
                  <Fragment key={`grp-body-${providerGroup}-${gIdx}`}>
                    <tr
                      key={`grp-head-${providerGroup}-${gIdx}`}
                      style={{
                        background: "linear-gradient(90deg, rgba(245, 158, 11, 0.14) 0%, rgba(30, 41, 59, 0.45) 100%)",
                        borderLeft: "3px solid #f59e0b",
                      }}
                    >
                      <td colSpan={9} style={{ padding: "8px 12px", borderBottom: "1px solid rgba(245, 158, 11, 0.2)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <Stars size={14} color="#fbbf24" />
                          <strong style={{ color: "#f8fafc", fontSize: "12.5px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                            {providerGroup}
                          </strong>
                          <span
                            style={{
                              fontSize: "10.5px",
                              padding: "1px 6px",
                              borderRadius: "10px",
                              background: "rgba(245, 158, 11, 0.2)",
                              color: "#fbbf24",
                              fontWeight: 700,
                            }}
                          >
                            {items.length} model
                          </span>
                        </div>
                      </td>
                    </tr>
                    {items.map((item, idx) => (
                      <tr
                        key={item.id || `${providerGroup}-${idx}`}
                        style={{
                          transition: "background 0.2s ease",
                          borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                        }}
                      >
                        <td style={{ color: "#64748b", fontWeight: 600, fontSize: "11px" }}>{idx + 1}</td>
                        <td>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <CpuFill size={13} color="#fbbf24" />
                              <strong style={{ color: "#ffffff", fontFamily: "monospace", fontSize: "12.5px" }}>
                                {item.model}
                              </strong>
                            </div>
                            <small style={{ color: "#94a3b8", fontSize: "10.5px", display: "block", marginTop: "2px" }}>
                              {item.price_per_request ? `Phí cố định: ${item.price_per_request}đ/request` : "gốc: 0đ/request (không tính phí thêm)"}
                            </small>
                            {testingModelId === (item.id || item.model) ? (
                              <div style={{ marginTop: "4px", fontSize: "10.5px", color: "#38bdf8", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                <ArrowRepeat size={10} className="animate-spin" /> Đang kiểm tra kết nối AI...
                              </div>
                            ) : cloudModelTestResults[item.id || item.model] ? (
                              <div style={{ marginTop: "4px" }}>
                                {cloudModelTestResults[item.id || item.model].status === "reachable" ? (
                                  <span style={{ fontSize: "10.5px", color: "#34d399", fontWeight: 750, background: "rgba(16, 185, 129, 0.12)", border: "1px solid rgba(16, 185, 129, 0.3)", padding: "1px 6px", borderRadius: "4px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                    ✓ Sẵn sàng ({cloudModelTestResults[item.id || item.model].latencyMs}ms)
                                  </span>
                                ) : (
                                  <span style={{ fontSize: "10.5px", color: "#f87171", fontWeight: 750, background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.3)", padding: "1px 6px", borderRadius: "4px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                    ✕ {cloudModelTestResults[item.id || item.model].detail || "Lỗi"}
                                  </span>
                                )}
                              </div>
                            ) : null}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: "#cbd5e1", fontSize: "11.5px" }}>
                            {item.provider_name}
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: "11px",
                              padding: "3px 8px",
                              borderRadius: "4px",
                              background:
                                item.category === "cinema"
                                  ? "rgba(236, 72, 153, 0.15)"
                                  : item.category === "vision"
                                  ? "rgba(16, 185, 129, 0.15)"
                                  : item.category === "voice"
                                  ? "rgba(245, 158, 11, 0.15)"
                                  : item.category === "transcription"
                                  ? "rgba(168, 85, 247, 0.15)"
                                  : "rgba(255, 255, 255, 0.06)",
                              color:
                                item.category === "cinema"
                                  ? "#f472b6"
                                  : item.category === "vision"
                                  ? "#34d399"
                                  : item.category === "voice"
                                  ? "#fbbf24"
                                  : item.category === "transcription"
                                  ? "#c084fc"
                                  : "#94a3b8",
                              fontWeight: 700,
                              display: "inline-block",
                              lineHeight: 1.4,
                            }}
                          >
                            {item.purpose || item.category || "Phân tích AI"}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontSize: "11.5px", color: "#e2e8f0" }}>
                            <div style={{ color: "#38bdf8", fontWeight: 700 }}>In: {item.input_price}đ/1M</div>
                            <div style={{ color: "#a78bfa", fontWeight: 700 }}>Out: {item.output_price}đ/1M</div>
                          </div>
                        </td>
                        <td>
                          <div
                            style={{
                              display: "inline-flex",
                              flexDirection: "column",
                              gap: "2px",
                              background: "rgba(245, 158, 11, 0.1)",
                              border: "1px solid rgba(245, 158, 11, 0.28)",
                              padding: "3px 8px",
                              borderRadius: "5px",
                              fontSize: "11px",
                              fontWeight: 800,
                              color: "#fbbf24",
                              whiteSpace: "nowrap",
                            }}
                          >
                            <span>In: {((item.input_price || 0) / 1000).toFixed(2)} Cr/1M</span>
                            <span>Out: {((item.output_price || 0) / 1000).toFixed(2)} Cr/1M</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: "11px", color: "#cbd5e1" }}>
                            <span style={{ color: "#34d399", fontWeight: 700 }}>
                              Cache: -{item.cache_discount_pct ?? 20}%
                            </span>
                            <br />
                            <span style={{ color: item.price_per_request ? "#fbbf24" : "#94a3b8" }}>
                              {item.price_per_request ? `${item.price_per_request}đ/req` : "0đ/req"}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 750,
                              color: item.is_selling ? "#10b981" : "#94a3b8",
                              background: item.is_selling ? "rgba(16, 185, 129, 0.12)" : "rgba(148, 163, 184, 0.12)",
                              border: item.is_selling ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(148, 163, 184, 0.2)",
                              padding: "3px 7px",
                              borderRadius: "4px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            {item.is_selling ? "● Đã Cấp Phép" : "○ Tạm Ngưng"}
                          </span>
                        </td>
                        <td style={{ textAlign: "right", whiteSpace: "nowrap", width: "290px", minWidth: "290px" }}>
                          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "flex-end", gap: "6px", flexWrap: "nowrap", whiteSpace: "nowrap" }}>
                            <button
                              type="button"
                              onClick={() => selectCloudModelForAnalysis(item)}
                              style={{
                                background: "linear-gradient(135deg, #d97706, #f59e0b)",
                                border: "none",
                                color: "#12151f",
                                padding: "5px 11px",
                                borderRadius: "6px",
                                fontSize: "11px",
                                fontWeight: 800,
                                cursor: "pointer",
                                boxShadow: "0 0 8px rgba(245, 158, 11, 0.3)",
                                whiteSpace: "nowrap",
                                flexShrink: 0,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "3px",
                              }}
                              title="Chọn model này để làm việc trên công cụ"
                            >
                              ⚡ Kích Hoạt
                            </button>
                            <button
                              type="button"
                              onClick={() => void testCloudModel(item)}
                              disabled={testingModelId === (item.id || item.model)}
                              style={{
                                background: "rgba(56, 189, 248, 0.14)",
                                border: "1px solid rgba(56, 189, 248, 0.35)",
                                color: "#38bdf8",
                                padding: "5px 11px",
                                borderRadius: "6px",
                                fontSize: "11px",
                                fontWeight: 800,
                                cursor: testingModelId === (item.id || item.model) ? "not-allowed" : "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                whiteSpace: "nowrap",
                                flexShrink: 0,
                              }}
                              title="Kiểm tra kết nối và độ trễ của Model này"
                            >
                              {testingModelId === (item.id || item.model) ? (
                                <>
                                  <ArrowRepeat size={11} className="animate-spin" /> Đang test...
                                </>
                              ) : (
                                <>
                                  🧪 Test
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => configureBYOKForCloudModel(item)}
                              style={{
                                background: "rgba(255, 255, 255, 0.08)",
                                border: "1px solid rgba(255, 255, 255, 0.18)",
                                color: "#f8fafc",
                                padding: "5px 11px",
                                borderRadius: "6px",
                                fontSize: "11px",
                                fontWeight: 700,
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                                flexShrink: 0,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "3px",
                              }}
                              title="Cấu hình API Key riêng cho hãng này (BYOK)"
                            >
                              🔑 Nhập Key
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))
              ) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "28px", color: "#64748b" }}>
                    Không tìm thấy model nào phù hợp với bộ lọc tìm kiếm.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal Configure AI Provider */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={providerForm?.id ? "Chỉnh sửa AI Provider" : "Thêm AI Provider Mới"}
        eyebrow="MULTI-PROVIDER BYOK & OAUTH ASSISTANT"
        maxWidth="620px"
      >
        {providerForm && (
          <form onSubmit={(e) => void saveProvider(e)} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* 1. Quick Presets Selection */}
            {!providerForm.id && (
              <div>
                <label className="field-label" style={{ marginBottom: "6px" }}>
                  CHỌN NỀN TẢNG AI BẠN MUỐN KẾT NỐI
                </label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: "8px",
                  }}
                >
                  {Object.entries(PROVIDER_CONFIGS).map(([key, cfg]) => {
                    const isSelected = selectedPreset === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleSelectPreset(key)}
                        style={{
                          background: isSelected
                            ? "linear-gradient(135deg, rgba(249, 87, 56, 0.25), rgba(17, 22, 37, 0.9))"
                            : "rgba(255, 255, 255, 0.03)",
                          border: isSelected
                            ? "1.5px solid #f95738"
                            : "1px solid rgba(255, 255, 255, 0.08)",
                          borderRadius: "10px",
                          padding: "10px 8px",
                          textAlign: "center",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          boxShadow: isSelected ? "0 0 12px rgba(249, 87, 56, 0.3)" : "none",
                        }}
                      >
                        <strong style={{ fontSize: "11.5px", color: isSelected ? "#ffffff" : "#cbd5e1", display: "block" }}>
                          {cfg.name ? `${cfg.name.split(" ")[0]} ${cfg.name.split(" ")[1] || ""}` : "AI"}
                        </strong>
                        <small style={{ fontSize: "10px", color: isSelected ? "#f95738" : "#64748b" }}>
                          {cfg.defaultModel ? cfg.defaultModel.split("-")[0] : ""}
                        </small>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. Official Login / Key Helper Banner */}
            {(() => {
              const cfg = PROVIDER_CONFIGS[selectedPreset];
              if (!cfg?.loginUrl) return null;
              return (
                <div
                  style={{
                    background: "rgba(59, 130, 246, 0.09)",
                    border: "1px solid rgba(59, 130, 246, 0.28)",
                    borderRadius: "12px",
                    padding: "12px 16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <div>
                    <strong style={{ fontSize: "12.5px", color: "#ffffff", display: "block" }}>
                      {cfg.name}
                    </strong>
                    <small style={{ color: "#94a3b8", fontSize: "11px", lineHeight: 1.4 }}>
                      {cfg.hint}
                    </small>
                  </div>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{
                      padding: "8px 14px",
                      fontSize: "11.5px",
                      whiteSpace: "nowrap",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      background: "rgba(59, 130, 246, 0.2)",
                      color: "#93c5fd",
                      borderColor: "rgba(59, 130, 246, 0.4)",
                      flexShrink: 0,
                    }}
                    onClick={() => {
                      if (getRuntime().openExternal) {
                        void getRuntime().openExternal?.(cfg.loginUrl!);
                      } else {
                        window.open(cfg.loginUrl, "_blank");
                      }
                    }}
                  >
                    <Link45deg size={14} />
                    <span>Đăng Nhập Lấy Key</span>
                  </button>
                </div>
              );
            })()}

            {/* 3. Provider Details Form */}
            <div className="field-pair">
              <label className="field-label">
                Tên hiển thị
                <input
                  required
                  maxLength={120}
                  value={providerForm.name}
                  onChange={(e) =>
                    setProviderForm({ ...providerForm, name: e.target.value })
                  }
                />
              </label>

              <label className="field-label">
                Loại Provider
                <select
                  value={providerForm.providerType}
                  onChange={(e) =>
                    changeProviderType(e.target.value as ProviderType)
                  }
                >
                  <option value="openai">OpenAI</option>
                  <option value="gemini">Google Gemini</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="openai-compatible">OpenAI Compatible</option>
                  <option value="custom">Custom Adapter</option>
                </select>
              </label>
            </div>

            <label className="field-label">
              Base URL Endpoint
              <input
                type="url"
                required
                value={providerForm.baseUrl}
                onChange={(e) =>
                  setProviderForm({ ...providerForm, baseUrl: e.target.value })
                }
              />
            </label>

            {/* Model Selection & Quick Suggestions */}
            <div>
              <div className="field-pair">
                <label className="field-label">
                  Model Phân Tích (Analysis Model)
                  <input
                    required
                    maxLength={160}
                    value={providerForm.model}
                    onChange={(e) =>
                      setProviderForm({ ...providerForm, model: e.target.value })
                    }
                  />
                </label>

                <label className="field-label">
                  TTS Model Giọng Đọc (Tùy chọn)
                  <input
                    maxLength={160}
                    value={providerForm.ttsModel ?? ""}
                    onChange={(e) =>
                      setProviderForm({ ...providerForm, ttsModel: e.target.value })
                    }
                    placeholder="tts-1 / gemini-tts"
                  />
                </label>
              </div>

              {/* Model suggestion tags */}
              {PROVIDER_CONFIGS[selectedPreset]?.models && (
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "6px" }}>
                  <small style={{ color: "#64748b", fontSize: "11px", display: "flex", alignItems: "center" }}>Gợi ý:</small>
                  {PROVIDER_CONFIGS[selectedPreset].models.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setProviderForm({ ...providerForm, model: m })}
                      style={{
                        background: providerForm.model === m ? "rgba(249, 87, 56, 0.25)" : "rgba(255, 255, 255, 0.04)",
                        border: providerForm.model === m ? "1px solid #f95738" : "1px solid rgba(255, 255, 255, 0.08)",
                        color: providerForm.model === m ? "#f95738" : "#94a3b8",
                        borderRadius: "6px",
                        padding: "2px 8px",
                        fontSize: "10.5px",
                        cursor: "pointer",
                      }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* API Key Box */}
            <div>
              <label className="field-label" style={{ marginBottom: "6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#ffffff", fontWeight: 700 }}>MÃ API KEY / OAUTH TOKEN (BẮT BUỘC)</span>
                <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 400 }}>Mã hóa an toàn trên máy</span>
              </label>

              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <input
                  type={showApiKey ? "text" : "password"}
                  minLength={providerForm.id ? undefined : 8}
                  required={!providerForm.id}
                  value={providerForm.apiKey ?? ""}
                  onChange={(e) =>
                    setProviderForm({ ...providerForm, apiKey: e.target.value.trim() })
                  }
                  style={{
                    background: "#1e293b",
                    color: "#ffffff",
                    border: providerForm.apiKey && providerForm.providerType === "gemini" && (providerForm.apiKey.startsWith("AIzaSy") || providerForm.apiKey.startsWith("AQ.") || providerForm.apiKey.startsWith("ya29."))
                      ? "1.5px solid #10b981"
                      : "1.5px solid rgba(255, 255, 255, 0.22)",
                    borderRadius: "10px",
                    padding: "12px 85px 12px 14px",
                    fontSize: "13px",
                    fontFamily: "'DM Mono', monospace",
                    width: "100%",
                    boxShadow: "inset 0 2px 4px rgba(0, 0, 0, 0.3)",
                  }}
                  placeholder={
                    providerForm.id
                      ? "Để trống nếu không thay đổi API key"
                      : providerForm.providerType === "gemini"
                      ? "Dán mã khóa Google (AIzaSy... hoặc AQ...)"
                      : providerForm.providerType === "openai"
                      ? "Dán mã API Key OpenAI (sk-...)"
                      : providerForm.providerType === "anthropic"
                      ? "Dán mã API Key Claude (sk-ant-...)"
                      : "Dán mã API Key của bạn vào đây"
                  }
                  autoComplete="off"
                />

                <div style={{ position: "absolute", right: "8px", display: "flex", gap: "6px", alignItems: "center" }}>
                  <button
                    type="button"
                    title={showApiKey ? "Ẩn mã khóa" : "Hiện mã khóa"}
                    onClick={() => setShowApiKey(!showApiKey)}
                    style={{
                      background: "rgba(255, 255, 255, 0.1)",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      color: "#ffffff",
                      borderRadius: "6px",
                      padding: "4px 8px",
                      cursor: "pointer",
                      fontSize: "12px",
                    }}
                  >
                    {showApiKey ? "🙈" : "👁️"}
                  </button>

                  <button
                    type="button"
                    title="Dán từ Clipboard"
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        if (text) setProviderForm({ ...providerForm, apiKey: text.trim() });
                      } catch {
                        // fallback
                      }
                    }}
                    style={{
                      background: "rgba(249, 87, 56, 0.2)",
                      border: "1px solid #f95738",
                      color: "#f95738",
                      borderRadius: "6px",
                      padding: "4px 10px",
                      cursor: "pointer",
                      fontSize: "11.5px",
                      fontWeight: 700,
                    }}
                  >
                    Dán
                  </button>
                </div>
              </div>

              {/* Live format indicator */}
              {providerForm.apiKey && (
                <div style={{ marginTop: "6px" }}>
                  {providerForm.providerType === "gemini" ? (
                    providerForm.apiKey.startsWith("AIzaSy") || providerForm.apiKey.startsWith("AQ.") || providerForm.apiKey.startsWith("ya29.") ? (
                      <span style={{ color: "#10b981", fontSize: "11.5px", display: "flex", alignItems: "center", gap: "4px" }}>
                        ✓ Định dạng khóa Google Gemini hợp lệ ({providerForm.apiKey.startsWith("AIzaSy") ? "API Key Google AI Studio" : "Google Cloud / OAuth Token"}).
                      </span>
                    ) : (
                      <span style={{ color: "#38bdf8", fontSize: "11.5px", display: "flex", alignItems: "center", gap: "4px" }}>
                        ℹ️ Đã nhận mã khóa. Bấm nút <strong>"Lưu AI Provider"</strong> $\rightarrow$ <strong>"Test"</strong> để kiểm tra kết nối với máy chủ Google.
                      </span>
                    )
                  ) : (
                    <span style={{ color: "#10b981", fontSize: "11.5px", display: "flex", alignItems: "center", gap: "4px" }}>
                      ✓ Đã nhập mã API Key.
                    </span>
                  )}
                </div>
              )}

              <small style={{ color: "#94a3b8", fontSize: "11px", marginTop: "6px", display: "block" }}>
                💡 <strong>Gợi ý:</strong> Với Google Gemini, bạn có thể lấy API Key miễn phí 100% bằng cách bấm nút xanh <em>"Đăng Nhập Google AI Studio & Lấy API Key Miễn Phí"</em> ở phía trên.
              </small>
            </div>

            {/* Capability Badges & Active Toggle */}
            <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.06)", borderRadius: "10px", padding: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <strong style={{ fontSize: "12px", color: "#f8fafc" }}>
                  PHÂN BỔ CHỨC NĂNG CỦA AI NÀY
                </strong>
                <button
                  type="button"
                  onClick={toggleAllCapabilities}
                  style={{
                    background: "rgba(249, 87, 56, 0.15)",
                    border: "1px solid rgba(249, 87, 56, 0.3)",
                    color: "#f95738",
                    padding: "3px 8px",
                    fontSize: "11px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  ✨ Kích Hoạt Toàn Bộ Chức Năng
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" }}>
                {[
                  { key: "analysis", label: "🎬 Phân tích kịch bản & Hook" },
                  { key: "vision", label: "👁️ Nhận diện thị giác khung hình" },
                  { key: "transcription", label: "🎙️ Bóc tách phụ đề (STT / Whisper)" },
                  { key: "tts", label: "🗣️ Lồng tiếng AI (TTS Voice)" },
                ].map((cap) => {
                  const checked = providerForm.capabilities.includes(cap.key);
                  return (
                    <label
                      key={cap.key}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "11.5px",
                        color: checked ? "#ffffff" : "#94a3b8",
                        cursor: "pointer",
                        background: checked ? "rgba(255, 255, 255, 0.05)" : "transparent",
                        padding: "4px 8px",
                        borderRadius: "6px",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...providerForm.capabilities, cap.key]
                            : providerForm.capabilities.filter((c) => c !== cap.key);
                          setProviderForm({ ...providerForm, capabilities: next });
                        }}
                        style={{ width: "14px", height: "14px", accentColor: "#f95738" }}
                      />
                      {cap.label}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Active Toggle */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "12px",
                  color: "#cbd5e1",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={providerForm.enabled}
                  onChange={(e) =>
                    setProviderForm({
                      ...providerForm,
                      enabled: e.target.checked,
                    })
                  }
                  style={{ width: "16px", height: "16px", accentColor: "#f95738" }}
                />
                Kích hoạt provider này để sẵn sàng dùng cho các tác vụ
              </label>

              <span style={{ fontSize: "11px", color: "#64748b" }}>
                Đa AI Provider (Multi-AI)
              </span>
            </div>

            {/* Footer Buttons */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                marginTop: "14px",
              }}
            >
              <button
                type="button"
                className="button-quiet"
                onClick={() => setIsModalOpen(false)}
              >
                Hủy
              </button>
              <button type="submit" className="btn-primary">
                <Check2 size={14} /> Lưu AI Provider
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Diagnostic Test Result Modal */}
      <Modal
        isOpen={Boolean(testResult)}
        onClose={() => setTestResult(null)}
        title="Kết Quả Kiểm Tra AI Provider"
        eyebrow="LIVE DIAGNOSTIC REPORT"
        maxWidth="500px"
      >
        {testResult && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Status Hero Card */}
            <div
              style={{
                background:
                  testResult.status === "reachable"
                    ? "linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(6, 78, 59, 0.3))"
                    : testResult.status === "invalid_credentials"
                    ? "linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(127, 29, 29, 0.3))"
                    : "linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(120, 53, 15, 0.3))",
                border:
                  testResult.status === "reachable"
                    ? "1px solid rgba(16, 185, 129, 0.4)"
                    : testResult.status === "invalid_credentials"
                    ? "1px solid rgba(239, 68, 68, 0.4)"
                    : "1px solid rgba(245, 158, 11, 0.4)",
                borderRadius: "14px",
                padding: "16px",
                textAlign: "center",
              }}
            >
              <span style={{ fontSize: "32px", display: "block", marginBottom: "6px" }}>
                {testResult.status === "reachable" ? "🟢" : testResult.status === "invalid_credentials" ? "🔴" : "⚠️"}
              </span>
              <strong style={{ fontSize: "16px", color: "#ffffff", display: "block" }}>
                {testResult.status === "reachable"
                  ? "HOẠT ĐỘNG HOÀN HẢO · SẴN SÀNG SỬ DỤNG"
                  : testResult.status === "invalid_credentials"
                  ? "LỖI XÁC THỰC API KEY / TÀI KHOẢN"
                  : "KHÔNG THỂ KẾT NỐI MÁY CHỦ AI"}
              </strong>
              <p style={{ margin: "6px 0 0 0", color: "#cbd5e1", fontSize: "12.5px" }}>
                {testResult.detail}
              </p>
            </div>

            {/* Diagnostic Details Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                borderRadius: "12px",
                padding: "12px",
              }}
            >
              <div>
                <small style={{ color: "#64748b", fontSize: "10.5px", textTransform: "uppercase" }}>Provider & Model</small>
                <div style={{ color: "#f8fafc", fontSize: "12.5px", fontWeight: 600 }}>
                  {testResult.providerName}
                </div>
                <small style={{ color: "#f95738", fontSize: "11px" }}>{testResult.model}</small>
              </div>

              <div>
                <small style={{ color: "#64748b", fontSize: "10.5px", textTransform: "uppercase" }}>Tốc Độ Phản Hồi</small>
                <div style={{ color: "#10b981", fontSize: "14px", fontWeight: 700 }}>
                  ⚡ {testResult.latencyMs} ms
                </div>
                <small style={{ color: "#94a3b8", fontSize: "10.5px" }}>
                  {testResult.latencyMs < 300 ? "Tốc độ phản xạ cực nhanh" : "Đạt chuẩn xử lý video"}
                </small>
              </div>
            </div>

            {/* Capabilities Summary */}
            <div>
              <strong style={{ fontSize: "11.5px", color: "#94a3b8", display: "block", marginBottom: "6px", textTransform: "uppercase" }}>
                Chức Năng Sẵn Sàng Vận Hành
              </strong>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {testResult.capabilities.map((c) => (
                  <span
                    key={c}
                    style={{
                      background: "rgba(16, 185, 129, 0.12)",
                      border: "1px solid rgba(16, 185, 129, 0.3)",
                      color: "#6ee7b7",
                      borderRadius: "6px",
                      padding: "3px 8px",
                      fontSize: "11px",
                      fontWeight: 600,
                    }}
                  >
                    ✓ {c.toUpperCase()}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "6px" }}>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setTestResult(null)}
                style={{ width: "100%" }}
              >
                Đã Hiểu & Đóng
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
