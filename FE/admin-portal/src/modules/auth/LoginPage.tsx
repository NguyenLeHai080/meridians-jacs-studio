import React, { useState } from "react";
import { Lock, Mail, ArrowRight, ShieldCheck, Globe, ChevronDown } from "lucide-react";
import { Toast } from "../../components/common/Toast";
import { useI18n, SupportedLanguage } from "../../core/i18n";
import { useAuth } from "./hooks/useAuth";
import "./lang";

export function LoginPage({ onAuthenticated }: { onAuthenticated: () => void }) {
  const { language, setLanguage, t } = useI18n();
  const [email, setEmail] = useState((import.meta.env.VITE_ADMIN_EMAIL as string) || (import.meta.env.DEV ? "admin@example.com" : ""));
  const [password, setPassword] = useState(import.meta.env.DEV ? "change-me" : "");
  const [showLangMenu, setShowLangMenu] = useState(false);

  const { loading, error, setError, login } = useAuth(onAuthenticated);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    login({ email, password });
  }

  const getLangLabel = (lang: SupportedLanguage) => {
    switch (lang) {
      case "vi":
        return "🇻🇳 Tiếng Việt";
      case "en":
        return "🇬🇧 English";
      case "jp":
        return "🇯🇵 日本語";
      default:
        return "🇻🇳 Tiếng Việt";
    }
  };

  return (
    <div className="auth-fullscreen-container">
      {/* Top right language switch */}
      <div style={{ position: "absolute", top: "20px", right: "24px", zIndex: 10 }}>
        <div style={{ position: "relative" }}>
          <button
            type="button"
            className="lang-selector-pill"
            style={{ background: "rgba(255, 255, 255, 0.08)", borderColor: "rgba(255, 255, 255, 0.15)", color: "#fff" }}
            onClick={() => setShowLangMenu(!showLangMenu)}
          >
            <Globe size={14} color="#f95738" />
            <span>{getLangLabel(language)}</span>
            <ChevronDown size={14} color="#fff" />
          </button>
          {showLangMenu && (
            <div style={{ position: "absolute", right: 0, top: "115%", background: "#1a1d2e", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", overflow: "hidden", minWidth: "140px", boxShadow: "0 10px 25px rgba(0,0,0,0.5)" }}>
              <button
                type="button"
                style={{ width: "100%", padding: "0.55rem 0.85rem", display: "flex", alignItems: "center", gap: "0.5rem", background: language === "vi" ? "#262a40" : "transparent", color: "#fff", border: "none", fontSize: "0.8rem", cursor: "pointer", textAlign: "left" }}
                onClick={() => { setLanguage("vi"); setShowLangMenu(false); }}
              >
                🇻🇳 Tiếng Việt
              </button>
              <button
                type="button"
                style={{ width: "100%", padding: "0.55rem 0.85rem", display: "flex", alignItems: "center", gap: "0.5rem", background: language === "en" ? "#262a40" : "transparent", color: "#fff", border: "none", fontSize: "0.8rem", cursor: "pointer", textAlign: "left" }}
                onClick={() => { setLanguage("en"); setShowLangMenu(false); }}
              >
                🇬🇧 English
              </button>
              <button
                type="button"
                style={{ width: "100%", padding: "0.55rem 0.85rem", display: "flex", alignItems: "center", gap: "0.5rem", background: language === "jp" ? "#262a40" : "transparent", color: "#fff", border: "none", fontSize: "0.8rem", cursor: "pointer", textAlign: "left" }}
                onClick={() => { setLanguage("jp"); setShowLangMenu(false); }}
              >
                🇯🇵 日本語
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="auth-card animate-scale-in">
        <div className="auth-card-header">
          <div className="auth-logo-badge">
            <span style={{ fontSize: "1.2rem", fontWeight: 900, color: "#fff", letterSpacing: "-0.5px" }}>MI</span>
          </div>
          <h1 className="auth-title">JACS Studio</h1>
          <p className="auth-subtitle">BUSINESS SUITE · {t("adminSuperuser")}</p>
        </div>

        {error && <Toast type="error" message={error} onClose={() => setError("")} />}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group-mf">
            <label className="form-label-mf" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <Mail size={14} color="var(--primary)" /> {t("loginEmailLabel")}
            </label>
            <input
              type="email"
              className="form-input-mf"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group-mf">
            <label className="form-label-mf" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <Lock size={14} color="var(--primary)" /> {t("loginPasswordLabel")}
            </label>
            <input
              type="password"
              className="form-input-mf"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn-primary-orange"
            style={{ width: "100%", justifyContent: "center", padding: "0.75rem", fontSize: "0.92rem", marginTop: "0.5rem" }}
            disabled={loading}
          >
            {loading ? "..." : (
              <>
                <span>{t("loginBtn")}</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="auth-card-footer">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", marginBottom: "0.5rem", color: "#34d399", fontSize: "0.75rem", fontWeight: 700 }}>
            <ShieldCheck size={14} /> {t("loginSecurityBadge")}
          </div>
          {import.meta.env.DEV && (
            <span className="auth-hint">
              {t("localHint")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
