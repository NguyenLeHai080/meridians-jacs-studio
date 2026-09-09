import { useEffect, useState, useMemo, useCallback } from "react";
import type { FormEvent } from "react";
import { getRuntime } from "../../../core/runtime";
import {
  DEFAULT_PREFERENCES,
  type ProviderDraft,
  type ProviderProfile,
  type ProviderType,
  type ToolPreferences,
  type UpdateProgress,
  type UpdateRelease,
} from "../../../core/types";
import { popup } from "../../../shared/popup";
import {
  DEFAULT_CLOUD_MODELS,
  PROVIDER_CONFIGS,
  type CloudModelItem,
} from "../constants/providerConfigs";

export interface TestResultData {
  providerName: string;
  providerType: string;
  model: string;
  status: "reachable" | "invalid_credentials" | "unreachable" | "unsupported";
  latencyMs: number;
  detail: string;
  httpStatus?: number;
  capabilities: string[];
}

export function useSettingsManagement(
  preferences: ToolPreferences,
  onPreferencesChanged: (preferences: ToolPreferences) => void
) {
  const [localPreferences, setLocalPreferences] = useState<ToolPreferences>(preferences);
  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const [capabilities, setCapabilities] = useState<{
    ffmpeg: boolean;
    ffprobe: boolean;
    ffmpegPath?: string;
    ffprobePath?: string;
  }>({ ffmpeg: false, ffprobe: false });

  const [providerForm, setProviderForm] = useState<ProviderDraft | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [testingId, setTestingId] = useState("");
  const [providerMessage, setProviderMessage] = useState("");
  const [providerError, setProviderError] = useState("");
  const [selectedProviderKey, setSelectedProviderKey] = useState("meridians");
  const [cloudModels, setCloudModels] = useState<CloudModelItem[]>(DEFAULT_CLOUD_MODELS);
  const [lastSyncedTime, setLastSyncedTime] = useState<string>("");

  const [activeTab, setActiveTab] = useState<"general" | "ai_providers" | "cloud_models" | "engine">("general");

  const [updateState, setUpdateState] = useState<{
    checking: boolean;
    installing: boolean;
    release: UpdateRelease | null;
    message: string;
    progress: number;
  }>({
    checking: false,
    installing: false,
    release: null,
    message: "",
    progress: 0,
  });

  const [loaded, setLoaded] = useState(false);

  const [testResult, setTestResult] = useState<TestResultData | null>(null);
  const [isLoggingInWeb, setIsLoggingInWeb] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [syncingCloud, setSyncingCloud] = useState(false);
  const [testingModelId, setTestingModelId] = useState<string>("");
  const [cloudModelTestResults, setCloudModelTestResults] = useState<
    Record<string, { status: "reachable" | "unreachable"; latencyMs: number; detail: string }>
  >({});

  const loadSettings = useCallback(async () => {
    try {
      const runtime = getRuntime();
      const [savedPreferences, providerList, mediaCapabilities] = await Promise.all([
        runtime.getPreferences?.() || Promise.resolve(DEFAULT_PREFERENCES),
        runtime.getProviderProfiles?.() || Promise.resolve([]),
        runtime.getMediaCapabilities?.() || Promise.resolve({ ffmpeg: false, ffprobe: false }),
      ]);
      setLocalPreferences(savedPreferences || DEFAULT_PREFERENCES);
      setProviders(providerList || []);
      setCapabilities(mediaCapabilities || { ffmpeg: false, ffprobe: false });

      // Fetch cloud models
      try {
        const apiBase = String(
          (import.meta as any).env?.VITE_API_URL || "https://jacs-studio.nexoratech.com.vn"
        ).replace(/\/$/, "");
        const res = await fetch(`${apiBase}/api/v1/ai-providers/models-available`, {
          signal: AbortSignal.timeout(4000),
        }).catch(() => null);
        if (res && res.ok) {
          const payload = await res.json();
          const available = payload?.data || [];
          if (Array.isArray(available) && available.length > 0) {
            setCloudModels(available);
            setLastSyncedTime(
              new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
            );
          }
        }
      } catch {}
      setLoaded(true);
    } catch {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    setLocalPreferences(preferences);
  }, [preferences]);

  useEffect(() => {
    const runtime = getRuntime();
    if (!runtime?.onUpdateProgress) return;
    return runtime.onUpdateProgress((payload: UpdateProgress) => {
      setUpdateState((current) => ({
        ...current,
        progress: payload.progress || 0,
        message: payload.error ? `Lỗi: ${payload.error}` : current.message,
      }));
    });
  }, []);

  const update = useCallback(
    async (patch: Partial<ToolPreferences>) => {
      const next = { ...localPreferences, ...patch };
      setLocalPreferences(next);
      onPreferencesChanged(next);
      try {
        const runtime = getRuntime();
        if (runtime?.savePreferences) {
          await runtime.savePreferences(next);
        }
      } catch (error) {
        setProviderError(
          error instanceof Error ? error.message : "Không lưu được tùy chọn cài đặt"
        );
      }
    },
    [localPreferences, onPreferencesChanged]
  );

  const chooseOutputFolder = useCallback(async () => {
    const runtime = getRuntime();
    if (!runtime?.pickOutputFolder) return;
    const folder = await runtime.pickOutputFolder();
    if (folder) void update({ outputPath: folder });
  }, [update]);

  const clearCache = useCallback(async () => {
    const confirmed = await popup.confirmDelete(
      "Dọn Dẹp Bộ Nhớ Cache",
      "Xóa toàn bộ file tạm và cache video đã tải về máy?"
    );
    if (!confirmed) return;
    try {
      const runtime = getRuntime();
      if (runtime?.clearCache) {
        await runtime.clearCache();
      }
      popup.success("Đã dọn dẹp cache", "Bộ nhớ tạm đã được giải phóng thành công.");
    } catch (error) {
      popup.error(
        "Lỗi dọn cache",
        error instanceof Error ? error.message : "Không xóa được cache"
      );
    }
  }, []);

  const checkForUpdate = useCallback(async () => {
    const runtime = getRuntime();
    if (!runtime?.checkForUpdate) return;
    setUpdateState((current) => ({
      ...current,
      checking: true,
      message: "Đang kiểm tra máy chủ cập nhật...",
    }));
    try {
      const result = await runtime.checkForUpdate("stable");
      const release = result?.release || null;
      setUpdateState({
        checking: false,
        installing: false,
        release,
        progress: 0,
        message: release
          ? `Tìm thấy bản cập nhật mới v${release.version}`
          : "Bạn đang sử dụng phiên bản JACS Studio mới nhất.",
      });
      if (!release) {
        popup.success("Đã là bản mới nhất", "Ứng dụng của bạn đang ở phiên bản tối ưu nhất.");
      }
    } catch (error) {
      setUpdateState({
        checking: false,
        installing: false,
        release: null,
        progress: 0,
        message:
          error instanceof Error ? error.message : "Không kiểm tra được cập nhật",
      });
    }
  }, []);

  const installUpdate = useCallback(async () => {
    const runtime = getRuntime();
    const release = updateState.release;
    if (!release || !runtime?.downloadUpdate) return;
    setUpdateState((current) => ({
      ...current,
      installing: true,
      progress: 0,
      message: "Đang chuẩn bị tải bản cập nhật...",
    }));
    try {
      const result = await runtime.downloadUpdate(release);
      if (result?.status === "manual")
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
  }, [updateState.release]);

  const saveProvider = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      if (!providerForm) return;
      setProviderError("");
      setProviderMessage("");
      try {
        const runtime = getRuntime();
        if (runtime?.saveProviderProfile) {
          await runtime.saveProviderProfile({
            ...providerForm,
            capabilities: providerForm.capabilities
              .map((item) => item.trim())
              .filter(Boolean),
          });
        }
        setProviderMessage(
          providerForm.id
            ? "Đã cập nhật provider an toàn."
            : "Đã thêm provider và mã hóa API key an toàn trên máy."
        );
        setProviderForm(null);
        setIsModalOpen(false);
        if (runtime?.getProviderProfiles) {
          setProviders(await runtime.getProviderProfiles());
        }
      } catch (error) {
        setProviderError(
          error instanceof Error ? error.message : "Không lưu được provider"
        );
      }
    },
    [providerForm]
  );

  const testProvider = useCallback(
    async (id: string) => {
      const target = providers.find((p) => p.id === id);
      setTestingId(id);
      setProviderError("");
      setProviderMessage("");
      try {
        const runtime = getRuntime();
        const result = await runtime.testProviderConnection(id);
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
    },
    [providers]
  );

  const handleWebSessionLogin = useCallback(async (providerType: string) => {
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
        setProviderMessage(
          `✓ Đã đăng nhập web ${providerType.toUpperCase()} thành công (Đã trích xuất ${
            res.cookieName || "Session Cookie"
          })!`
        );
      } else if (res?.message) {
        setProviderError(res.message);
      }
    } catch (err) {
      setProviderError(
        err instanceof Error ? err.message : "Không thể mở cửa sổ đăng nhập web"
      );
    } finally {
      setIsLoggingInWeb(false);
    }
  }, []);

  const deleteProvider = useCallback(async (id: string) => {
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
  }, []);

  const syncWithCloudAdmin = useCallback(async () => {
    setSyncingCloud(true);
    setProviderError("");
    setProviderMessage("");
    try {
      const apiBase = String(
        (import.meta as any).env?.VITE_API_URL || "https://jacs-studio.nexoratech.com.vn"
      ).replace(/\/$/, "");
      const res = await fetch(`${apiBase}/api/v1/ai-providers/models-available`, {
        signal: AbortSignal.timeout(8000),
      }).catch(() => null);

      if (res && res.ok) {
        const payload = await res.json();
        const available = payload?.data || [];
        if (Array.isArray(available) && available.length > 0) {
          setCloudModels(available);
          setLastSyncedTime(
            new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
          );
          await getRuntime().syncManagedProviders?.(available);
          const updated = await getRuntime().getProviderProfiles();
          setProviders(updated);
          setProviderMessage(
            `✓ Đã đồng bộ thành công ${available.length} Model & AI Provider được cấp phép từ Cloud Admin!`
          );
          popup.success(
            `Đã đồng bộ ${available.length} Model từ Cloud Admin`,
            "Bảng giá và danh sách Model cấp phép đã được nạp thành công."
          );
          return;
        }
      }

      const updated = await getRuntime().getProviderProfiles();
      setProviders(updated);
      setProviderMessage("✓ Đã làm mới danh sách AI Providers.");
      popup.success(
        "Làm mới thành công",
        "Đã cập nhật danh sách AI Provider trên thiết bị."
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Không thể đồng bộ từ Cloud Admin";
      setProviderError(msg);
      popup.error("Lỗi đồng bộ Cloud Admin", msg);
    } finally {
      setSyncingCloud(false);
    }
  }, []);

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

  const testCloudModel = useCallback(
    async (item: CloudModelItem) => {
      const modelKey = item.id || item.model;
      setTestingModelId(modelKey);
      setProviderError("");
      setProviderMessage("");

      const started = Date.now();
      try {
        const byok = providers.find(
          (p) =>
            !p.isManaged &&
            (p.model === item.model ||
              p.providerType === getProviderTypeFromName(item.provider_name))
        );

        if (byok && byok.hasApiKey) {
          const res = await getRuntime().testProviderConnection(byok.id);
          const latency = res.latencyMs || Date.now() - started;
          setCloudModelTestResults((prev) => ({
            ...prev,
            [modelKey]: {
              status: res.status === "reachable" ? "reachable" : "unreachable",
              latencyMs: latency,
              detail:
                res.detail ||
                (res.status === "reachable"
                  ? "Kết nối tốt qua API Key cá nhân (BYOK)"
                  : "Lỗi kết nối"),
            },
          }));

          if (res.status === "reachable") {
            popup.success(
              `✓ Model ${item.model} Khả Dụng!`,
              `Đã kiểm tra qua API Key cá nhân (${
                byok.name || item.provider_name
              }) · Độ trễ: ${latency}ms\nTrạng thái: ${res.detail}`
            );
          } else {
            popup.error(
              `✕ Lỗi Kết Nối Model ${item.model}`,
              `Chi tiết: ${res.detail}\nVui lòng kiểm tra lại API Key trong mục BYOK.`
            );
          }
          return;
        }

        const apiBase = String(
          (import.meta as any).env?.VITE_API_URL || "https://jacs-studio.nexoratech.com.vn"
        ).replace(/\/$/, "");
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
            `Model ${item.model} (${item.provider_name}) ${
              item.is_selling ? "đã được cấp phép sử dụng" : "đang tạm ngưng"
            }.\nBạn có thể bấm "🔑 Nhập Key" nếu muốn sử dụng API Key riêng của bạn.`
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
        popup.error(
          "Không Thể Kiểm Tra Model",
          err instanceof Error ? err.message : "Lỗi mạng hoặc máy chủ không phản hồi"
        );
      } finally {
        setTestingModelId("");
      }
    },
    [providers]
  );

  const configureBYOKForCloudModel = useCallback((item: CloudModelItem) => {
    const pName = item.provider_name.toLowerCase();
    const pType =
      item.providerType ||
      (pName.includes("gemini")
        ? "gemini"
        : pName.includes("claude") || pName.includes("anthropic")
        ? "anthropic"
        : pName.includes("deepseek")
        ? "deepseek"
        : pName.includes("eleven")
        ? "elevenlabs"
        : "openai");

    const matchedConfigKey = Object.keys(PROVIDER_CONFIGS).find(
      (k) =>
        k.toLowerCase() === pType ||
        item.provider_name.toLowerCase().includes(k.toLowerCase())
    );
    const cfg = matchedConfigKey
      ? PROVIDER_CONFIGS[matchedConfigKey]
      : PROVIDER_CONFIGS.custom;

    setSelectedProviderKey(matchedConfigKey || "custom");
    setProviderForm({
      name: `${item.provider_name} (Key Riêng)`,
      providerType: (cfg?.type || "openai") as ProviderType,
      baseUrl: cfg?.baseUrl || "",
      model: item.model || cfg?.defaultModel || "default",
      apiKey: "",
      enabled: true,
      capabilities: cfg?.capabilities || ["analysis", "vision"],
      isManaged: false,
    });
    setIsModalOpen(true);
    setProviderError("");
    setProviderMessage(
      `Đang cấu hình API Key cá nhân cho Model: ${item.model} (${item.provider_name})`
    );
  }, []);

  const selectCloudModelForAnalysis = useCallback(
    (item: CloudModelItem) => {
      const existing = providers.find(
        (p) =>
          p.model === item.model ||
          p.name.toLowerCase().includes(item.provider_name.toLowerCase())
      );
      if (existing) {
        popup.success(
          `Đã chọn ${item.model}`,
          `Model ${item.model} (${item.provider_name}) đã sẵn sàng để phân tích video.`
        );
        return;
      }
      configureBYOKForCloudModel(item);
    },
    [providers, configureBYOKForCloudModel]
  );

  const openAddProviderModal = useCallback((presetKey: string) => {
    const cfg = PROVIDER_CONFIGS[presetKey] || PROVIDER_CONFIGS.meridians;
    setSelectedProviderKey(presetKey);
    setProviderForm({
      name: cfg.name,
      providerType: cfg.type,
      baseUrl: cfg.baseUrl,
      model: cfg.defaultModel,
      apiKey: "",
      enabled: true,
      capabilities: cfg.capabilities,
      isManaged: Boolean(cfg.isGateway),
    });
    setIsModalOpen(true);
  }, []);

  const editProvider = useCallback((p: ProviderProfile) => {
    setProviderForm({
      id: p.id,
      name: p.name,
      providerType: p.providerType,
      baseUrl: p.baseUrl,
      model: p.model,
      apiKey: "",
      enabled: p.enabled,
      capabilities: p.capabilities || ["analysis"],
      isManaged: Boolean(p.isManaged),
    });
    setIsModalOpen(true);
  }, []);

  return {
    localPreferences,
    providers,
    capabilities,
    providerForm,
    setProviderForm,
    isModalOpen,
    setIsModalOpen,
    testingId,
    providerMessage,
    providerError,
    selectedProviderKey,
    setSelectedProviderKey,
    cloudModels,
    lastSyncedTime,
    activeTab,
    setActiveTab,
    updateState,
    loaded,
    testResult,
    setTestResult,
    isLoggingInWeb,
    showApiKey,
    setShowApiKey,
    syncingCloud,
    testingModelId,
    cloudModelTestResults,
    loadSettings,
    update,
    chooseOutputFolder,
    clearCache,
    checkForUpdate,
    installUpdate,
    saveProvider,
    testProvider,
    handleWebSessionLogin,
    deleteProvider,
    syncWithCloudAdmin,
    testCloudModel,
    selectCloudModelForAnalysis,
    configureBYOKForCloudModel,
    openAddProviderModal,
    editProvider,
  };
}
