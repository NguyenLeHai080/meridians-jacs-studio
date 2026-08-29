import { useEffect, useState } from "react";
import { apiRequest } from "../../core/api";
import { clearToken, getToken } from "../../core/session";

type License = { id: string; key_hint: string; customer_name: string; hwid: string; status: string; expires_at?: string };
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

  async function createDemoLicense() {
    await apiRequest("/api/v1/licenses", {
      method: "POST",
      body: JSON.stringify({ customer_name: "Demo customer", customer_contact: "demo@example.com", hwid: "demo-hwid-0001", max_jobs_per_day: 100, premium_ai: true }),
    }, token);
    setMessage("Đã tạo license demo");
    await refresh();
  }

  function logout() { clearToken(); onLogout(); }

  return (
    <main className="dashboard-shell">
      <header className="topbar"><div><p className="eyebrow">JACS / ADMIN</p><h1>Control Room</h1></div><button className="ghost" onClick={logout}>Đăng xuất</button></header>
      <section className="metric-grid"><div className="metric card"><span>License hoạt động</span><strong>{licenses.filter((item) => item.status === "active").length}</strong></div><div className="metric card"><span>AI provider</span><strong>{providers.length}</strong></div><div className="metric card"><span>Telemetry gần đây</span><strong>{logs.length}</strong></div></section>
      <section className="content-grid">
        <div className="card panel"><div className="panel-heading"><h2>License gần đây</h2><button onClick={() => void createDemoLicense()} disabled={loading}>Tạo demo</button></div>{message && <p className="success">{message}</p>}{error && <p className="error">{error}</p>}<div className="table-wrap"><table><thead><tr><th>Key</th><th>Khách hàng</th><th>HWID</th><th>Trạng thái</th></tr></thead><tbody>{licenses.map((item) => <tr key={item.id}><td><code>{item.key_hint}</code></td><td>{item.customer_name}</td><td>{item.hwid}</td><td><span className="badge">{item.status}</span></td></tr>)}{!loading && licenses.length === 0 && <tr><td colSpan={4} className="muted">Chưa có license</td></tr>}</tbody></table></div></div>
        <div className="card panel"><div className="panel-heading"><h2>AI Providers</h2></div>{providers.map((provider) => <div className="provider-row" key={provider.id}><div><strong>{provider.name}</strong><p className="muted">{provider.provider_type} · {provider.model}</p></div><code>{provider.masked_key}</code></div>)}{!loading && providers.length === 0 && <p className="muted">Chưa cấu hình provider.</p>}<h2 className="subheading">Cảnh báo gần đây</h2>{logs.map((log) => <div className="log-row" key={log.id}><span className={`badge severity-${log.severity}`}>{log.severity}</span><div><strong>{log.event_name}</strong><p className="muted">{log.message} · {log.app_version}</p></div></div>)}</div>
      </section>
    </main>
  );
}
