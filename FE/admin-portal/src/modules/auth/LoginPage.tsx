import { FormEvent, useState } from "react";
import { login } from "../../core/api";
import { setToken } from "../../core/session";

type Props = { onAuthenticated: () => void };

export function LoginPage({ onAuthenticated }: Props) {
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("change-me");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await login(email, password);
      setToken(result.access_token);
      onAuthenticated();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <form className="card auth-card" onSubmit={submit}>
        <p className="eyebrow">JACS STUDIO</p>
        <h1>Admin Control Room</h1>
        <p className="muted">Quản lý license, provider AI, job và telemetry.</p>
        <label>Email<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required /></label>
        <label>Mật khẩu<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required /></label>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={loading}>{loading ? "Đang xác thực..." : "Đăng nhập"}</button>
      </form>
    </main>
  );
}
