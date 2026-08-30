import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ApiRequestError, apiRequest, getApiBaseUrl } from "../../core/api";
import { clearToken, getToken } from "../../core/session";

type License = { id: string; key_hint: string; customer_name: string; customer_contact: string; hwid: string; status: string; expires_at?: string; last_seen_at?: string; last_app_version?: string; last_platform?: string; max_jobs_per_day?: number; premium_ai?: boolean };
type Provider = { id: string; name: string; provider_type: string; model: string; masked_key: string; capabilities: string[] };
type TelemetryLog = { id: string; severity: string; event_name: string; fingerprint: string; message: string; app_version: string };
const adminEnvironment = getApiBaseUrl();
const HWID_PATTERN = /JACS-(?:MAC|WIN|LNX)-[A-F0-9]{32}/;

function normalizeHwid(value: string) {
  const normalized = value.replace(/[\s\u200b-\u200d\ufeff]+/g, "").toUpperCase();
  if (/^JACS-(MAC|WIN|LNX)-[A-F0-9]{32}$/.test(normalized)) return normalized;
  const matches = normalized.match(new RegExp(HWID_PATTERN.source, "g")) || [];
  return matches.length === 1 ? matches[0] : normalized;
}

function licenseHwidError(value: string) {
  if (value === "WEB-DEMO-MACHINE") return "Không thể cấp license cho mã demo. Hãy mở bản Desktop Electron để lấy mã máy thật.";
  if (!/^JACS-(MAC|WIN|LNX)-[A-F0-9]{32}$/.test(value)) return "Mã máy phải có dạng JACS-MAC/WIN/LNX-32 ký tự hex. Hãy copy nguyên Device ID từ tool.";
  return "";
}

export function Dashboard({ onLogout }: { onLogout: () => void }) {
  const token = getToken() ?? "";
  const [licenses, setLicenses] = useState<License[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [message, setMessage] = useState("");
  const [logs, setLogs] = useState<TelemetryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [licenseForm, setLicenseForm] = useState({ customer_name: "", customer_contact: "", hwid: "", expires_at: "", max_jobs_per_day: "100", premium_ai: false });
  const [providerForm, setProviderForm] = useState({ name: "", provider_type: "openai", base_url: "https://api.openai.com/v1", model: "gpt-4o-mini", api_key: "", capabilities: "analysis, vision, transcription" });
  const [generatedKey, setGeneratedKey] = useState("");
  const [keyCopied, setKeyCopied] = useState(false);
  const [providerStatus, setProviderStatus] = useState<Record<string, string>>({});

  function handleRequestError(reason: unknown): boolean {
    if (reason instanceof ApiRequestError && reason.status === 401) {
      clearToken();
      onLogout();
      return true;
    }
    return false;
  }

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const [licenseResult, providerResult, telemetryResult] = await Promise.all([
        apiRequest<License[]>("/api/v1/licenses", {}, token),
        apiRequest<Provider[]>("/api/v1/ai-providers", {}, token),
        apiRequest<TelemetryLog[]>("/api/v1/telemetry/logs?limit=5", {}, token),
      ]);
      setLicenses(licenseResult);
      setProviders(providerResult);
      setLogs(telemetryResult);
    } catch (reason) {
      if (handleRequestError(reason)) return;
      setError(reason instanceof Error ? reason.message : "Không tải được dữ liệu");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  async function createLicense(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      if (!licenseForm.customer_name.trim()) { setError("Vui lòng nhập tên khách hàng"); return; }
      if (!licenseForm.customer_contact.trim()) { setError("Vui lòng nhập email hoặc số điện thoại khách hàng"); return; }
      const normalizedHwid = normalizeHwid(licenseForm.hwid);
      const hwidError = licenseHwidError(normalizedHwid);
      if (hwidError) { setError(hwidError); return; }
      const maxJobs = Number(licenseForm.max_jobs_per_day);
      if (!Number.isInteger(maxJobs) || maxJobs < 1) { setError("Giới hạn job/ngày phải là số nguyên lớn hơn 0"); return; }
      const expiresAt = licenseForm.expires_at ? new Date(licenseForm.expires_at) : null;
      if (expiresAt && Number.isNaN(expiresAt.getTime())) { setError("Ngày hết hạn không hợp lệ"); return; }
      if (expiresAt && expiresAt <= new Date()) { setError("Ngày hết hạn phải ở tương lai"); return; }
      const payload = { ...licenseForm, hwid: normalizedHwid, expires_at: expiresAt?.toISOString() ?? null, max_jobs_per_day: maxJobs };
      const created = await apiRequest<License & { key: string }>("/api/v1/licenses", { method: "POST", body: JSON.stringify(payload) }, token);
      setGeneratedKey(created.key.trim().toUpperCase());
      setKeyCopied(false);
      setMessage("Đã tạo license thật trên hệ thống");
      setLicenseForm({ customer_name: "", customer_contact: "", hwid: "", expires_at: "", max_jobs_per_day: "100", premium_ai: false });
      await refresh();
    } catch (reason) {
      if (handleRequestError(reason)) return;
      if (reason instanceof ApiRequestError) {
        const requestHint = reason.requestId ? ` · request ${reason.requestId}` : "";
        setError(`${reason.message}${reason.code ? ` (${reason.code})` : ""}${requestHint}`);
      } else setError(reason instanceof Error ? reason.message : "Không tạo được license");
    }
  }

  async function copyLicenseKey() {
    if (!generatedKey) return;
    try {
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(generatedKey);
        } catch {
          // Some browsers expose Clipboard API but deny it outside a secure
          // user gesture; fall through to the legacy textarea path.
          copyWithTextarea(generatedKey);
        }
      } else {
        copyWithTextarea(generatedKey);
      }
      setKeyCopied(true);
      window.setTimeout(() => setKeyCopied(false), 2200);
    } catch {
      setError("Không thể sao chép key. Hãy bôi đen và copy thủ công.");
    }
  }

  function copyWithTextarea(value: string) {
    const input = document.createElement("textarea");
    input.value = value;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.appendChild(input);
    try {
      input.select();
      if (!document.execCommand("copy")) throw new Error("Clipboard unavailable");
    } finally {
      input.remove();
    }
  }

  async function createProvider(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await apiRequest("/api/v1/ai-providers", { method: "POST", body: JSON.stringify({ ...providerForm, capabilities: providerForm.capabilities.split(",").map((item) => item.trim()).filter(Boolean) }) }, token);
      setProviderForm({ name: "", provider_type: "openai", base_url: "https://api.openai.com/v1", model: "gpt-4o-mini", api_key: "", capabilities: "analysis, vision, transcription" });
      setMessage("Đã lưu provider thật; API key chỉ được lưu dạng secret reference");
      await refresh();
    } catch (reason) {
      if (handleRequestError(reason)) return;
      setError(reason instanceof Error ? reason.message : "Không lưu được provider");
    }
  }

  async function toggleLicense(item: License) {
    const status = item.status === "active" ? "blocked" : "active";
    try { await apiRequest(`/api/v1/licenses/${item.id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }, token); await refresh(); } catch (reason) {
      if (handleRequestError(reason)) return;
      setError(reason instanceof Error ? reason.message : "Không cập nhật được license");
    }
  }

  async function renewLicense(item: License) {
    const value = window.prompt("Ngày hết hạn mới (YYYY-MM-DD hoặc ISO):", item.expires_at?.slice(0, 10) ?? "");
    if (!value) return;
    const parsed = new Date(`${value.length === 10 ? `${value}T23:59:59` : value}`);
    if (Number.isNaN(parsed.getTime())) { setError("Ngày hết hạn không hợp lệ"); return; }
    const expiresAt = parsed.toISOString();
    const reason = window.prompt("Lý do gia hạn:", "Gia hạn theo hợp đồng") ?? "";
    if (reason.trim().length < 3) return;
    try { await apiRequest(`/api/v1/licenses/${item.id}/renew`, { method: "POST", body: JSON.stringify({ expires_at: expiresAt, reason }) }, token); setMessage(`Đã gia hạn license ${item.key_hint}`); await refresh(); } catch (reason) {
      if (handleRequestError(reason)) return;
      setError(reason instanceof Error ? reason.message : "Không gia hạn được license");
    }
  }

  async function resetHwid(item: License) {
    const hwid = window.prompt("Mã máy mới (JACS-MAC/WIN/LNX-...):", "");
    if (!hwid) return;
    const normalizedHwid = normalizeHwid(hwid);
    if (!/^JACS-(MAC|WIN|LNX)-[A-F0-9]{32}$/.test(normalizedHwid)) { setError("Mã máy phải có dạng JACS-MAC/WIN/LNX-32 ký tự hex"); return; }
    const reason = window.prompt("Lý do đổi máy:", "Khách đổi thiết bị") ?? "";
    if (reason.trim().length < 3) return;
    try { await apiRequest(`/api/v1/licenses/${item.id}/reset-hwid`, { method: "POST", body: JSON.stringify({ hwid: normalizedHwid, reason }) }, token); setMessage(`Đã bind license ${item.key_hint} vào mã máy mới`); await refresh(); } catch (reason) {
      if (handleRequestError(reason)) return;
      setError(reason instanceof Error ? reason.message : "Không đổi được mã máy");
    }
  }

  async function testProvider(provider: Provider) {
    setProviderStatus((current) => ({ ...current, [provider.id]: "Đang kiểm tra..." }));
    try {
      const result = await apiRequest<{ status: string; detail: string; latency_ms: number }>(`/api/v1/ai-providers/${provider.id}/test`, { method: "POST" }, token);
      setProviderStatus((current) => ({ ...current, [provider.id]: `${result.status} · ${result.latency_ms}ms` }));
    } catch (reason) {
      if (handleRequestError(reason)) return;
      setProviderStatus((current) => ({ ...current, [provider.id]: reason instanceof Error ? reason.message : "Kiểm tra thất bại" }));
    }
  }

  function logout() { clearToken(); onLogout(); }

  return (
    <main className="dashboard-shell">
      <header className="topbar"><div><p className="eyebrow">JACS / ADMIN</p><h1>Control Room</h1></div><div className="topbar-actions"><span className="environment-chip">API: {adminEnvironment}</span><button className="ghost" onClick={logout}>Đăng xuất</button></div></header>
      <section className="metric-grid"><div className="metric card"><span>License hoạt động</span><strong>{licenses.filter((item) => item.status === "active").length}</strong></div><div className="metric card"><span>AI provider</span><strong>{providers.length}</strong></div><div className="metric card"><span>Telemetry gần đây</span><strong>{logs.length}</strong></div></section>
      <section className="form-grid">
        <form className="card panel" noValidate onSubmit={(event) => void createLicense(event)}><div className="panel-heading"><h2>Tạo license</h2></div><label>Tên khách hàng<input required value={licenseForm.customer_name} onChange={(event) => setLicenseForm({ ...licenseForm, customer_name: event.target.value })} /></label><label>Email/Số điện thoại<input required value={licenseForm.customer_contact} onChange={(event) => setLicenseForm({ ...licenseForm, customer_contact: event.target.value })} /></label><label>Mã máy thật (HWID)<input required value={licenseForm.hwid} onChange={(event) => setLicenseForm({ ...licenseForm, hwid: normalizeHwid(event.target.value) })} placeholder="JACS-MAC-0123..." /><small className="muted">Có thể dán cả dòng “Device ID: ...”; hệ thống sẽ tự lấy đúng mã máy. Không dùng WEB-DEMO-MACHINE.</small></label><label>Ngày hết hạn (tùy chọn)<input type="datetime-local" value={licenseForm.expires_at} onChange={(event) => setLicenseForm({ ...licenseForm, expires_at: event.target.value })} /></label><label>Job/ngày<input type="number" min="1" value={licenseForm.max_jobs_per_day} onChange={(event) => setLicenseForm({ ...licenseForm, max_jobs_per_day: event.target.value })} /></label><label className="checkbox"><input type="checkbox" checked={licenseForm.premium_ai} onChange={(event) => setLicenseForm({ ...licenseForm, premium_ai: event.target.checked })} /> Cho phép AI premium</label><button type="submit" disabled={loading}>Tạo license</button>{generatedKey && <div className="license-key-result"><div><span className="muted">License key mới · {adminEnvironment}</span><code>{generatedKey}</code></div><button type="button" className="copy-key-button" onClick={() => void copyLicenseKey()}>{keyCopied ? "Đã copy" : "Copy License Key"}</button><small>Key chỉ hiển thị một lần và chỉ dùng được với Desktop cùng môi trường API này.</small></div>}</form>
        <form className="card panel" onSubmit={(event) => void createProvider(event)}><div className="panel-heading"><h2>Kết nối AI provider</h2></div><label>Tên<input required value={providerForm.name} onChange={(event) => setProviderForm({ ...providerForm, name: event.target.value })} /></label><label>Loại<select value={providerForm.provider_type} onChange={(event) => { const provider_type = event.target.value; const capabilities = provider_type === "openai" ? "analysis, vision, transcription" : provider_type === "custom" ? "analysis" : "analysis, vision"; setProviderForm({ ...providerForm, provider_type, capabilities }); }}><option value="openai">OpenAI</option><option value="gemini">Gemini</option><option value="anthropic">Anthropic</option><option value="openai-compatible">OpenAI compatible</option><option value="custom">Custom</option></select></label><label>Base URL<input type="url" required value={providerForm.base_url} onChange={(event) => setProviderForm({ ...providerForm, base_url: event.target.value })} /></label><label>Model<input required value={providerForm.model} onChange={(event) => setProviderForm({ ...providerForm, model: event.target.value })} /></label><label>API key<input required minLength={8} type="password" value={providerForm.api_key} onChange={(event) => setProviderForm({ ...providerForm, api_key: event.target.value })} /></label><label>Capabilities<input value={providerForm.capabilities} onChange={(event) => setProviderForm({ ...providerForm, capabilities: event.target.value })} placeholder="analysis, vision, transcription" /></label><button type="submit" disabled={loading}>Lưu provider</button></form>
      </section>
      {message && <p className="success">{message}</p>}{error && <p className="error">{error}</p>}
      <section className="content-grid">
        <div className="card panel"><div className="panel-heading"><h2>License</h2><button type="button" className="ghost" onClick={() => void refresh()} disabled={loading}>Làm mới</button></div><div className="table-wrap"><table><thead><tr><th>Key</th><th>Khách hàng</th><th>HWID</th><th>Thiết bị / online</th><th>Hết hạn</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{licenses.map((item) => <tr key={item.id}><td><code>{item.key_hint}</code></td><td>{item.customer_name}<br /><small>{item.customer_contact}</small></td><td><code>{item.hwid}</code></td><td><small>{item.last_platform ?? "--"} {item.last_app_version ? `· ${item.last_app_version}` : ""}</small><br />{item.last_seen_at ? <small>Online {new Date(item.last_seen_at).toLocaleString("vi-VN")}</small> : <small>Chưa online</small>}</td><td>{item.expires_at ? new Date(item.expires_at).toLocaleString("vi-VN") : "Vĩnh viễn"}</td><td><span className="badge">{item.status}</span></td><td><button type="button" className="ghost" onClick={() => void toggleLicense(item)}>{item.status === "active" ? "Khóa" : "Mở khóa"}</button> <button type="button" className="ghost" onClick={() => void renewLicense(item)}>Gia hạn</button> <button type="button" className="ghost" onClick={() => void resetHwid(item)}>Đổi máy</button></td></tr>)}{!loading && licenses.length === 0 && <tr><td colSpan={7} className="muted">Chưa có license</td></tr>}</tbody></table></div></div>
        <div className="card panel"><div className="panel-heading"><h2>AI Providers</h2></div>{providers.map((provider) => <div className="provider-row" key={provider.id}><div><strong>{provider.name}</strong><p className="muted">{provider.provider_type} · {provider.model}</p><small className="muted">{providerStatus[provider.id] ?? "Chưa kiểm tra"}</small></div><div className="provider-actions"><code>{provider.masked_key}</code><button type="button" className="ghost" onClick={() => void testProvider(provider)}>Test API</button></div></div>)}{!loading && providers.length === 0 && <p className="muted">Chưa cấu hình provider.</p>}<h2 className="subheading">Cảnh báo gần đây</h2>{logs.map((log) => <div className="log-row" key={log.id}><span className={`badge severity-${log.severity}`}>{log.severity}</span><div><strong>{log.event_name}</strong><p className="muted">{log.message} · {log.app_version}</p></div></div>)}{!loading && logs.length === 0 && <p className="muted">Chưa có telemetry.</p>}</div>
      </section>
    </main>
  );
}
