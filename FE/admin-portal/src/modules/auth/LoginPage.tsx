import React, { useState } from "react";
import { Zap } from "lucide-react";
import { apiRequest } from "../../core/api";
import { setToken } from "../../core/session";
import { Button } from "../../components/common/Button";
import { Input } from "../../components/common/Input";
import { Toast } from "../../components/common/Toast";

export function LoginPage({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("change-me");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await apiRequest<{ access_token: string }>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
      });
      setToken(result.access_token);
      onAuthenticated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-fullscreen-container">
      <div className="auth-card animate-scale-in">
        <div className="auth-card-header">
          <div className="auth-logo-badge">
            <Zap size={24} color="#fff" />
          </div>
          <h1 className="auth-title">JACS STUDIO</h1>
          <p className="auth-subtitle">Cổng Quản Trị Hệ Thống & Cấp Phép Bản Quyền</p>
        </div>

        {error && <Toast type="error" message={error} onClose={() => setError("")} />}

        <form onSubmit={handleSubmit} className="auth-form">
          <Input
            label="Email Quản Trị"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@example.com"
            required
            autoComplete="email"
          />

          <Input
            label="Mật Khẩu"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            className="w-full mt-4"
          >
            Đăng Nhập Quản Trị
          </Button>
        </form>

        <div className="auth-card-footer">
          <span className="auth-hint">
            Tài khoản local mặc định: <code>admin@example.com</code> / <code>change-me</code>
          </span>
        </div>
      </div>
    </div>
  );
}
