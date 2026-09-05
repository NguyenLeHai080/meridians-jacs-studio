import { useEffect, useState } from "react";
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
import { Icon } from "../../shared/Icon";
import { Modal } from "../../shared/Modal";

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
  }
> = {
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
    if (!window.confirm("Xóa provider và API key đã mã hóa khỏi thiết bị?")) return;
    try {
      await getRuntime().deleteProviderProfile(id);
      setProviders(await getRuntime().getProviderProfiles());
      setProviderMessage("Đã xóa provider khỏi thiết bị.");
    } catch (error) {
      setProviderError(
        error instanceof Error ? error.message : "Không xóa được provider"
      );
    }
  }

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
    <div className="page-stack page-enter">
      {/* Page Title */}
      <div className="page-title">
        <div>
          <p className="eyebrow">SYSTEM / PREFERENCES</p>
          <h2>Cài đặt tool</h2>
          <p>
            Quản lý workspace, thư mục output, quyền riêng tư, engine render và nhà cung cấp AI.
          </p>
        </div>
        <div className="page-title-actions">
          <button
            className="button-quiet"
            type="button"
            onClick={() => void loadSettings()}
          >
            <Icon name="check" size={14} /> {loaded ? "Đã đồng bộ" : "Đang tải..."}
          </button>
        </div>
      </div>

      {providerMessage && <p className="form-success">{providerMessage}</p>}
      {providerError && <p className="form-error">{providerError}</p>}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: "16px",
        }}
      >
        {/* Card 1: Workspace & Storage */}
        <section className="panel-card">
          <div className="panel-head">
            <div>
              <p className="eyebrow">WORKSPACE & STORAGE</p>
              <h3>Thư mục & Dữ liệu máy</h3>
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
                <Icon name="folder" size={14} />
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
                <Icon name="folder" size={14} />
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
                <Icon name="folder" size={14} />
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
              <Icon name="trash" size={13} /> Dọn cache
            </button>
          </div>
        </section>

        {/* Card 2: Privacy, Engine & Updates */}
        <section className="panel-card">
          <div className="panel-head">
            <div>
              <p className="eyebrow">SYSTEM & UPDATES</p>
              <h3>Hệ thống & Cập nhật</h3>
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

      {/* Section 3: AI Providers Table (BYOK) */}
      <section className="panel-card" style={{ marginTop: "14px" }}>
        <div className="panel-head">
          <div>
            <p className="eyebrow">AI PROVIDERS & API KEYS</p>
            <h3>Nhà cung cấp AI (BYOK)</h3>
            <p className="subtle">
              Tích hợp OpenAI, Google Gemini, Anthropic hoặc các endpoint API tương thích. API Key được mã hóa an toàn trên hệ thống.
            </p>
          </div>
          <button
            type="button"
            className="btn-primary"
            onClick={openNewProvider}
            disabled={!native}
          >
            <Icon name="plus" size={13} /> {native ? "Thêm AI Provider" : "Mở bản Desktop để thêm"}
          </button>
        </div>

        <div className="jacs-table-wrapper">
          <table className="jacs-table">
            <thead>
              <tr>
                <th>Tên Provider</th>
                <th>Loại</th>
                <th>Model</th>
                <th>Base URL</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: "right" }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {providers.length > 0 ? (
                providers.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <strong style={{ color: "#ffffff" }}>{p.name}</strong>
                    </td>
                    <td>
                      <span
                        style={{
                          padding: "2px 7px",
                          borderRadius: "4px",
                          background: "rgba(255,255,255,0.06)",
                          fontSize: "10.5px",
                        }}
                      >
                        {p.providerType}
                      </span>
                    </td>
                    <td>
                      <code>{p.model}</code>
                    </td>
                    <td>
                      <small style={{ color: "#94a3b8" }}>{p.baseUrl}</small>
                    </td>
                    <td>
                      <span
                        style={{
                          color: p.enabled ? "#10b981" : "#94a3b8",
                          fontWeight: 700,
                          fontSize: "11px",
                        }}
                      >
                        {p.enabled ? "● Sẵn sàng" : "○ Tắt"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => void testProvider(p.id)}
                        disabled={testingId === p.id}
                      >
                        {testingId === p.id ? "Đang test..." : "Test"}
                      </button>
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => editProvider(p)}
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
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    style={{ textAlign: "center", padding: "24px", color: "#64748b" }}
                  >
                    Chưa có AI Provider nào. Bấm nút <strong>"+ Thêm AI Provider"</strong> để kết nối API.
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
                          {cfg.name.split(" ")[0]} {cfg.name.split(" ")[1] || ""}
                        </strong>
                        <small style={{ fontSize: "10px", color: isSelected ? "#f95738" : "#64748b" }}>
                          {cfg.defaultModel.split("-")[0]}
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
                    <Icon name="link" size={12} />
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
                <Icon name="check" size={13} /> Lưu AI Provider
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
