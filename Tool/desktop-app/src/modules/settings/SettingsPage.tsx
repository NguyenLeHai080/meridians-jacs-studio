import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { getRuntime, isNativeRuntime } from "../../core/runtime";
import { DEFAULT_PREFERENCES, type ProviderDraft, type ProviderProfile, type ProviderType, type ToolPreferences, type UpdateProgress, type UpdateRelease } from "../../core/types";
import { Icon } from "../../shared/Icon";

const PROVIDER_DEFAULTS: Record<ProviderType, { name: string; baseUrl: string; model: string }> = {
  openai: { name: "OpenAI", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" },
  gemini: { name: "Google Gemini", baseUrl: "https://generativelanguage.googleapis.com/v1beta", model: "gemini-2.0-flash" },
  anthropic: { name: "Anthropic", baseUrl: "https://api.anthropic.com/v1", model: "claude-3-5-sonnet-latest" },
  "openai-compatible": { name: "OpenAI Compatible", baseUrl: "https://api.example.com/v1", model: "model-name" },
  custom: { name: "Custom Provider", baseUrl: "https://api.example.com", model: "model-name" },
};

function emptyProvider(type: ProviderType = "openai"): ProviderDraft {
  const capabilities = type === "custom" ? ["analysis"] : type === "openai" ? ["analysis", "vision", "transcription", "tts"] : ["analysis", "vision"];
  return { providerType: type, ...PROVIDER_DEFAULTS[type], apiKey: "", capabilities, enabled: true };
}

export function SettingsPage({ preferences, onPreferencesChanged }: { preferences?: ToolPreferences; onPreferencesChanged?: (value: ToolPreferences) => void }) {
  const [localPreferences, setLocalPreferences] = useState<ToolPreferences>(preferences || DEFAULT_PREFERENCES);
  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const [providerForm, setProviderForm] = useState<ProviderDraft | null>(null);
  const [providerMessage, setProviderMessage] = useState("");
  const [providerError, setProviderError] = useState("");
  const [testingId, setTestingId] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [media, setMedia] = useState<{ ffmpeg: boolean; ffprobe: boolean } | null>(null);
  const [updateState, setUpdateState] = useState<{ checking: boolean; installing: boolean; progress: number; message: string; release?: UpdateRelease | null }>({ checking: false, installing: false, progress: 0, message: "" });
  const native = isNativeRuntime();

  async function loadSettings() {
    try {
      const [preferenceResult, providerResult] = await Promise.all([getRuntime().getPreferences(), getRuntime().getProviderProfiles()]);
      setLocalPreferences(preferenceResult);
      onPreferencesChanged?.(preferenceResult);
      setProviders(providerResult);
    } catch (error) {
      setProviderError(error instanceof Error ? error.message : "Không tải được cấu hình tool");
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => { void loadSettings(); void getRuntime().getMediaCapabilities?.().then(setMedia); }, []);
  useEffect(() => getRuntime().onUpdateProgress?.((progress: UpdateProgress) => {
    if (progress.stage === "downloading") setUpdateState((current) => ({ ...current, installing: true, progress: progress.progress, message: `Đang tải bản cập nhật... ${progress.progress}%` }));
    if (progress.stage === "verifying") setUpdateState((current) => ({ ...current, installing: true, progress: 100, message: "Đang kiểm tra SHA-512..." }));
    if (progress.stage === "installing") setUpdateState((current) => ({ ...current, installing: true, progress: 100, message: "Đang cài đặt và khởi động lại JACS Studio..." }));
    if (progress.stage === "failed") setUpdateState((current) => ({ ...current, installing: false, message: progress.error || "Cập nhật thất bại" }));
  }) || undefined, []);
  useEffect(() => {
    if (native && localPreferences.autoUpdateEnabled) void checkForUpdate();
  }, [native, localPreferences.autoUpdateEnabled]);
  function update(values: Partial<ToolPreferences>) {
    const next = { ...localPreferences, ...values };
    setLocalPreferences(next);
    onPreferencesChanged?.(next);
    void getRuntime().savePreferences(next);
  }

  async function clearCache() {
    try {
      await getRuntime().clearCache?.();
      setProviderMessage("Đã dọn file cache tạm trên thiết bị.");
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
    if (!check) { setUpdateState({ checking: false, installing: false, progress: 0, message: "Kiểm tra cập nhật cần chạy bản Electron." }); return; }
    setUpdateState({ checking: true, installing: false, progress: 0, message: "Đang kiểm tra bản cập nhật..." });
    try {
      const result = await check("stable");
      if (!result.update_available || !result.release) {
        setUpdateState({ checking: false, installing: false, progress: 0, message: "Bạn đang dùng phiên bản mới nhất." });
        return;
      }
      setUpdateState({ checking: false, installing: false, progress: 0, message: `Có bản ${result.release.version} mới.`, release: result.release });
    } catch (error) {
      setUpdateState({ checking: false, installing: false, progress: 0, message: error instanceof Error ? error.message : "Không kiểm tra được cập nhật" });
    }
  }

  async function installUpdate() {
    const runtime = getRuntime();
    const release = updateState.release;
    if (!release || !runtime.downloadUpdate) return;
    setUpdateState((current) => ({ ...current, installing: true, progress: 0, message: "Đang chuẩn bị tải bản cập nhật..." }));
    try {
      const result = await runtime.downloadUpdate(release);
      if (result.status === "manual") setUpdateState((current) => ({ ...current, installing: false, message: "Đã mở file DMG đã xác minh. Kéo JACS Studio vào Applications để hoàn tất." }));
    } catch (error) {
      setUpdateState((current) => ({ ...current, installing: false, message: error instanceof Error ? error.message : "Cập nhật thất bại" }));
    }
  }

  async function saveProvider(event: FormEvent) {
    event.preventDefault();
    if (!providerForm) return;
    setProviderError("");
    setProviderMessage("");
    try {
      await getRuntime().saveProviderProfile({ ...providerForm, capabilities: providerForm.capabilities.map((item) => item.trim()).filter(Boolean) });
      setProviderMessage(providerForm.id ? "Đã cập nhật provider an toàn." : "Đã thêm provider và mã hóa API key trên thiết bị.");
      setProviderForm(null);
      setProviders(await getRuntime().getProviderProfiles());
    } catch (error) {
      setProviderError(error instanceof Error ? error.message : "Không lưu được provider");
    }
  }

  async function testProvider(id: string) {
    setTestingId(id);
    setProviderError("");
    setProviderMessage("");
    try {
      const result = await getRuntime().testProviderConnection(id);
      const suffix = result.latencyMs ? ` · ${result.latencyMs}ms` : "";
      if (result.status === "reachable") setProviderMessage(`${result.detail}${suffix}`);
      else setProviderError(`${result.detail}${suffix}`);
    } catch (error) {
      setProviderError(error instanceof Error ? error.message : "Không kiểm tra được provider");
    } finally {
      setTestingId("");
    }
  }

  async function deleteProvider(id: string) {
    if (!window.confirm("Xóa provider và API key đã mã hóa khỏi thiết bị?")) return;
    try {
      await getRuntime().deleteProviderProfile(id);
      setProviders(await getRuntime().getProviderProfiles());
      setProviderMessage("Đã xóa provider khỏi thiết bị.");
    } catch (error) {
      setProviderError(error instanceof Error ? error.message : "Không xóa được provider");
    }
  }

  function editProvider(profile: ProviderProfile) {
    setProviderError("");
    setProviderForm({ id: profile.id, name: profile.name, providerType: profile.providerType, baseUrl: profile.baseUrl, model: profile.model, transcriptionModel: profile.transcriptionModel, apiKey: "", capabilities: profile.capabilities, enabled: profile.enabled });
  }

  function changeProviderType(type: ProviderType) {
    if (!providerForm) return;
    const capabilities = type === "custom" ? ["analysis"] : type === "openai" ? ["analysis", "vision", "transcription", "tts"] : ["analysis", "vision"];
    setProviderForm({ ...providerForm, providerType: type, ...PROVIDER_DEFAULTS[type], capabilities });
  }

  return <div className="page-stack page-enter">
    <div className="page-title"><div><p className="eyebrow">SYSTEM / PREFERENCES</p><h2>Cài đặt tool</h2><p>Kiểm soát dữ liệu, engine render và nơi lưu project trên máy.</p></div><button className="button-quiet" type="button"><Icon name="check" size={15} /> {loaded ? "Đã tải cấu hình" : "Đang tải..."}</button></div>
    <div className="settings-layout">
      <section className="panel-card settings-section"><div className="panel-head"><div><p className="eyebrow">PROFILE</p><h3>Workspace & người dùng</h3></div></div><div className="provider-form-grid"><label className="field-label">Tên workspace<input maxLength={120} value={localPreferences.workspaceName} onChange={(event) => update({ workspaceName: event.target.value })} /></label><label className="field-label">Tên người dùng<input maxLength={120} value={localPreferences.operatorName} onChange={(event) => update({ operatorName: event.target.value })} /></label></div><p className="form-help">Thông tin này chỉ lưu trên máy khách và được dùng để hiển thị trong giao diện.</p><div className="setting-divider" /><div className="panel-head"><div><p className="eyebrow">WORKSPACE</p><h3>Thư mục & bộ nhớ</h3></div></div><label className="field-label">Project workspace<div className="path-input"><Icon name="folder" size={16} /><span>{localPreferences.workspacePath}</span><button type="button" onClick={() => void getRuntime().revealPath(localPreferences.workspacePath)}>Mở</button></div></label><label className="field-label">Thư mục output<div className="path-input"><Icon name="folder" size={16} /><span>{localPreferences.outputPath}</span><button type="button" onClick={() => void chooseOutputFolder()}>Đổi</button></div></label><label className="field-label">Cache & file tạm<div className="path-input"><Icon name="folder" size={16} /><span>{localPreferences.cachePath}</span><button type="button" onClick={() => void getRuntime().revealPath(localPreferences.cachePath)}>Mở</button></div></label><div className="storage-meter"><div><span>Media engine</span><strong>{media ? `${media.ffmpeg ? "FFmpeg" : "Passthrough"} · ${media.ffprobe ? "FFprobe" : "metadata hạn chế"}` : "Đang kiểm tra..."}</strong></div><div className="progress-track"><i style={{ width: media?.ffmpeg ? "100%" : "35%" }} /></div><button className="text-button" type="button" onClick={() => void clearCache()}>Dọn cache <Icon name="arrow" size={13} /></button></div></section>
      <section className="panel-card settings-section"><div className="panel-head"><div><p className="eyebrow">PRIVACY & UPDATES</p><h3>Quyền riêng tư</h3></div></div><SettingToggle title="Gửi log lỗi đã ẩn dữ liệu" description="Giúp đội ngũ xử lý crash nhanh hơn. Không gửi video hoặc API key." checked={localPreferences.telemetryEnabled} onChange={() => update({ telemetryEnabled: !localPreferences.telemetryEnabled })} /><SettingToggle title="Tự động kiểm tra bản cập nhật" description="Thông báo khi có bản build mới từ staging/prod." checked={localPreferences.autoUpdateEnabled} onChange={() => update({ autoUpdateEnabled: !localPreferences.autoUpdateEnabled })} /><div className="setting-divider" /><label className="field-label">Engine ưu tiên<select value={localPreferences.preferredEngine} onChange={(event) => update({ preferredEngine: event.target.value as ToolPreferences["preferredEngine"] })}><option value="auto">Tự động chọn GPU tốt nhất</option><option value="apple">Apple VideoToolbox</option><option value="nvidia">NVIDIA NVENC</option><option value="cpu">CPU software fallback</option></select></label><div className="update-check"><div><strong>Cập nhật JACS Studio</strong><small>{updateState.message || "Kiểm tra manifest phát hành từ server."}</small>{updateState.installing && <div className="update-progress"><i style={{ width: `${updateState.progress}%` }} /></div>}</div><button type="button" className="button-quiet" onClick={() => void checkForUpdate()} disabled={updateState.checking || updateState.installing}>{updateState.checking ? "Đang kiểm tra..." : "Kiểm tra ngay"}</button>{updateState.release && <button type="button" onClick={() => void installUpdate()} disabled={updateState.installing}>{updateState.installing ? `Đang cập nhật ${updateState.progress}%` : `Cập nhật lên ${updateState.release.version}`}</button>}</div></section>
      <section className="panel-card settings-section provider-registry"><div className="panel-head"><div><p className="eyebrow">AI PROVIDERS / BYOK</p><h3>Nhà cung cấp AI</h3></div><button type="button" className="button-quiet" disabled={!native} onClick={() => setProviderForm(emptyProvider())}><Icon name="plus" size={14} /> {native ? "Thêm provider" : "Mở bản Desktop để cấu hình"}</button></div>{!native && <p className="form-help">Vì lý do bảo mật, trình duyệt không nhận API key. Hãy mở bản Electron đã cài đặt để lưu key bằng Keychain/Credential Manager.</p>}{providerMessage && <p className="form-success provider-feedback">{providerMessage}</p>}{providerError && <p className="form-error provider-feedback">{providerError}</p>}<div className="provider-list">{providers.map((provider) => <div className="provider-setting" key={provider.id}><span className={`provider-logo ${provider.providerType === "gemini" ? "gemini" : "openai"}`}>{provider.providerType === "gemini" ? "✦" : provider.name.slice(0, 1).toUpperCase()}</span><div><strong>{provider.name}</strong><small>{provider.providerType} · {provider.model} · {provider.maskedKey}</small><small>{provider.baseUrl}</small></div><span className={provider.enabled ? "provider-ok" : "provider-off"}>{provider.enabled ? "Sẵn sàng" : "Tắt"}</span><div className="provider-row-actions"><button type="button" className="text-button" onClick={() => void testProvider(provider.id)} disabled={testingId === provider.id}>{testingId === provider.id ? "Đang test..." : "Test"}</button><button type="button" className="text-button" onClick={() => editProvider(provider)}>Sửa</button><button type="button" className="text-button danger-link" onClick={() => void deleteProvider(provider.id)}>Xóa</button></div></div>)}{loaded && providers.length === 0 && <div className="provider-empty"><Icon name="key" size={20} /><div><strong>Chưa có AI provider</strong><p>Thêm URL, model và API key của khách để dùng OpenAI, Gemini hoặc API tương thích.</p></div></div>}</div>{providerForm && <form className="provider-form" onSubmit={(event) => void saveProvider(event)}><div className="provider-form-heading"><div><p className="eyebrow">SECURE PROFILE</p><h4>{providerForm.id ? "Chỉnh sửa provider" : "Kết nối provider mới"}</h4></div><button type="button" className="text-button" onClick={() => setProviderForm(null)}>Đóng</button></div><div className="provider-form-grid"><label className="field-label">Loại provider<select value={providerForm.providerType} onChange={(event) => changeProviderType(event.target.value as ProviderType)}><option value="openai">OpenAI</option><option value="gemini">Google Gemini</option><option value="anthropic">Anthropic</option><option value="openai-compatible">OpenAI compatible</option><option value="custom">Custom adapter</option></select></label><label className="field-label">Tên hiển thị<input required maxLength={120} value={providerForm.name} onChange={(event) => setProviderForm({ ...providerForm, name: event.target.value })} /></label><label className="field-label provider-wide">Base URL<input type="url" required value={providerForm.baseUrl} onChange={(event) => setProviderForm({ ...providerForm, baseUrl: event.target.value })} /></label><label className="field-label">Model<input required maxLength={160} value={providerForm.model} onChange={(event) => setProviderForm({ ...providerForm, model: event.target.value })} /></label><label className="field-label">Transcription model<input maxLength={160} value={providerForm.transcriptionModel ?? ""} onChange={(event) => setProviderForm({ ...providerForm, transcriptionModel: event.target.value })} placeholder="whisper-1 (tuỳ chọn)" /></label><label className="field-label">API key<input type="password" minLength={providerForm.id ? undefined : 8} required={!providerForm.id} value={providerForm.apiKey ?? ""} onChange={(event) => setProviderForm({ ...providerForm, apiKey: event.target.value })} placeholder={providerForm.id ? "Để trống để giữ key hiện tại" : "Nhập API key của khách"} autoComplete="off" /></label><label className="field-label provider-wide">Capabilities<input value={providerForm.capabilities.join(", ")} onChange={(event) => setProviderForm({ ...providerForm, capabilities: event.target.value.split(",") })} placeholder="analysis, vision, transcription, tts" /></label></div><label className="provider-enabled"><input type="checkbox" checked={providerForm.enabled} onChange={(event) => setProviderForm({ ...providerForm, enabled: event.target.checked })} /> Bật provider này để chọn cho job</label><div className="provider-form-actions"><button type="button" className="button-quiet" onClick={() => setProviderForm(null)}>Hủy</button><button type="submit"><Icon name="check" size={14} /> Lưu an toàn</button></div></form>}<p className="settings-note"><Icon name="key" size={14} /> API key được mã hóa bằng secure storage của hệ điều hành; renderer không đọc lại key thô và không lưu vào localStorage.</p></section>
    </div>
  </div>;
}

function SettingToggle({ title, description, checked, onChange }: { title: string; description: string; checked: boolean; onChange: () => void }) { return <button type="button" className="setting-toggle" onClick={onChange}><span><strong>{title}</strong><small>{description}</small></span><span className={`toggle ${checked ? "on" : ""}`}><i /></span></button>; }
