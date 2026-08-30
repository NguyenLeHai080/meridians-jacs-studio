import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { apiRequest } from "../../core/api";
import { clearToken, getToken } from "../../core/session";

type License = { id: string; key_hint: string; customer_name: string; customer_contact: string; hwid: string; status: string; expires_at?: string };
type Provider = { id: string; name: string; provider_type: string; model: string; masked_key: string; capabilities: string[] };
type TelemetryLog = { id: string; severity: string; event_name: string; fingerprint: string; message: string; app_version: string };

export function Dashboard({ onLogout }: { onLogout: () => void }) {
  const token = getToken() ?? "";
  const [licenses, setLicenses] = useState<License[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [message, setMessage] = useState("");
  const [logs, setLogs] = useState<TelemetryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [licenseForm, setLicenseForm] = useState({ customer_name: "", customer_contact: "", hwid: "", expires_at: "", max_jobs_per_day: "100", premium_ai: false });
  const [providerForm, setProviderForm] = useState({ name: "", provider_type: "openai", base_url: "https://api.openai.com/v1", model: "gpt-4o-mini", api_key: "", capabilities: "text" });
  const [generatedKey, setGeneratedKey] = useState("");
  const [providerStatus, setProviderStatus] = useState<Record<string, string>>({});

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
      const payload = { ...licenseForm, expires_at: licenseForm.expires_at ? new Date(licenseForm.expires_at).toISOString() : null, max_jobs_per_day: Number(licenseForm.max_jobs_per_day) };
      const created = await apiRequest<License & { key: string }>("/api/v1/licenses", { method: "POST", body: JSON.stringify(payload) }, token);
      setGeneratedKey(created.key);
      setMessage("Đã tạo license thật trên hệ thống");
      setLicenseForm({ customer_name: "", customer_contact: "", hwid: "", expires_at: "", max_jobs_per_day: "100", premium_ai: false });
      await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Không tạo được license"); }
  }

  async function createProvider(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await apiRequest("/api/v1/ai-providers", { method: "POST", body: JSON.stringify({ ...providerForm, capabilities: providerForm.capabilities.split(",").map((item) => item.trim()).filter(Boolean) }) }, token);
      setProviderForm({ name: "", provider_type: "openai", base_url: "https://api.openai.com/v1", model: "gpt-4o-mini", api_key: "", capabilities: "text" });
      setMessage("Đã lưu provider thật; API key chỉ được lưu dạng secret reference");
      await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Không lưu được provider"); }
  }

  async function toggleLicense(item: License) {
    const status = item.status === "active" ? "blocked" : "active";
    try { await apiRequest(`/api/v1/licenses/${item.id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }, token); await refresh(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Không cập nhật được license"); }
  }

  async function testProvider(provider: Provider) {
    setProviderStatus((current) => ({ ...current, [provider.id]: "Đang kiểm tra..." }));
    try {
      const result = await apiRequest<{ status: string; detail: string; latency_ms: number }>(`/api/v1/ai-providers/${provider.id}/test`, { method: "POST" }, token);
      setProviderStatus((current) => ({ ...current, [provider.id]: `${result.status} · ${result.latency_ms}ms` }));
    } catch (reason) {
      setProviderStatus((current) => ({ ...current, [provider.id]: reason instanceof Error ? reason.message : "Kiểm tra thất bại" }));
    }
  }

  function logout() { clearToken(); onLogout(); }

  return (
    <main className="dashboard-shell">
      <header className="topbar"><div><p className="eyebrow">JACS / ADMIN</p><h1>Control Room</h1></div><button className="ghost" onClick={logout}>Đăng xuất</button></header>
      <section className="metric-grid"><div className="metric card"><span>License hoạt động</span><strong>{licenses.filter((item) => item.status === "active").length}</strong></div><div className="metric card"><span>AI provider</span><strong>{providers.length}</strong></div><div className="metric card"><span>Telemetry gần đây</span><strong>{logs.length}</strong></div></section>
      <section className="form-grid">
        <form className="card panel" onSubmit={(event) => void createLicense(event)}><div className="panel-heading"><h2>Tạo license</h2></div><label>Tên khách hàng<input required value={licenseForm.customer_name} onChange={(event) => setLicenseForm({ ...licenseForm, customer_name: event.target.value })} /></label><label>Email/Số điện thoại<input required value={licenseForm.customer_contact} onChange={(event) => setLicenseForm({ ...licenseForm, customer_contact: event.target.value })} /></label><label>HWID<input required minLength={8} value={licenseForm.hwid} onChange={(event) => setLicenseForm({ ...licenseForm, hwid: event.target.value })} /></label><label>Ngày hết hạn (tùy chọn)<input type="datetime-local" value={licenseForm.expires_at} onChange={(event) => setLicenseForm({ ...licenseForm, expires_at: event.target.value })} /></label><label>Job/ngày<input type="number" min="1" value={licenseForm.max_jobs_per_day} onChange={(event) => setLicenseForm({ ...licenseForm, max_jobs_per_day: event.target.value })} /></label><label className="checkbox"><input type="checkbox" checked={licenseForm.premium_ai} onChange={(event) => setLicenseForm({ ...licenseForm, premium_ai: event.target.checked })} /> Cho phép AI premium</label><button type="submit" disabled={loading}>Tạo license</button>{generatedKey && <p className="success">Key mới: <code>{generatedKey}</code> (hãy copy ngay)</p>}</form>
        <form className="card panel" onSubmit={(event) => void createProvider(event)}><div className="panel-heading"><h2>Kết nối AI provider</h2></div><label>Tên<input required value={providerForm.name} onChange={(event) => setProviderForm({ ...providerForm, name: event.target.value })} /></label><label>Loại<select value={providerForm.provider_type} onChange={(event) => setProviderForm({ ...providerForm, provider_type: event.target.value })}><option value="openai">OpenAI</option><option value="gemini">Gemini</option><option value="anthropic">Anthropic</option><option value="openai-compatible">OpenAI compatible</option><option value="custom">Custom</option></select></label><label>Base URL<input type="url" required value={providerForm.base_url} onChange={(event) => setProviderForm({ ...providerForm, base_url: event.target.value })} /></label><label>Model<input required value={providerForm.model} onChange={(event) => setProviderForm({ ...providerForm, model: event.target.value })} /></label><label>API key<input required minLength={8} type="password" value={providerForm.api_key} onChange={(event) => setProviderForm({ ...providerForm, api_key: event.target.value })} /></label><label>Capabilities<input value={providerForm.capabilities} onChange={(event) => setProviderForm({ ...providerForm, capabilities: event.target.value })} placeholder="text, image, video" /></label><button type="submit" disabled={loading}>Lưu provider</button></form>
      </section>
      {message && <p className="success">{message}</p>}{error && <p className="error">{error}</p>}
      <section className="content-grid">
        <div className="card panel"><div className="panel-heading"><h2>License</h2><button type="button" className="ghost" onClick={() => void refresh()} disabled={loading}>Làm mới</button></div><div className="table-wrap"><table><thead><tr><th>Key</th><th>Khách hàng</th><th>HWID</th><th>Hết hạn</th><th>Trạng thái</th><th /></tr></thead><tbody>{licenses.map((item) => <tr key={item.id}><td><code>{item.key_hint}</code></td><td>{item.customer_name}<br /><small>{item.customer_contact}</small></td><td><code>{item.hwid}</code></td><td>{item.expires_at ? new Date(item.expires_at).toLocaleString("vi-VN") : "Vĩnh viễn"}</td><td><span className="badge">{item.status}</span></td><td><button type="button" className="ghost" onClick={() => void toggleLicense(item)}>{item.status === "active" ? "Khóa" : "Mở khóa"}</button></td></tr>)}{!loading && licenses.length === 0 && <tr><td colSpan={6} className="muted">Chưa có license</td></tr>}</tbody></table></div></div>
        <div className="card panel"><div className="panel-heading"><h2>AI Providers</h2></div>{providers.map((provider) => <div className="provider-row" key={provider.id}><div><strong>{provider.name}</strong><p className="muted">{provider.provider_type} · {provider.model}</p><small className="muted">{providerStatus[provider.id] ?? "Chưa kiểm tra"}</small></div><div className="provider-actions"><code>{provider.masked_key}</code><button type="button" className="ghost" onClick={() => void testProvider(provider)}>Test API</button></div></div>)}{!loading && providers.length === 0 && <p className="muted">Chưa cấu hình provider.</p>}<h2 className="subheading">Cảnh báo gần đây</h2>{logs.map((log) => <div className="log-row" key={log.id}><span className={`badge severity-${log.severity}`}>{log.severity}</span><div><strong>{log.event_name}</strong><p className="muted">{log.message} · {log.app_version}</p></div></div>)}{!loading && logs.length === 0 && <p className="muted">Chưa có telemetry.</p>}</div>
      </section>
    </main>
  );
}
