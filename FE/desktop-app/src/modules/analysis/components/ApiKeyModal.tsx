import React from "react";
import { KeyFill, XLg } from "react-bootstrap-icons";
import type { ProviderProfile } from "../../../core/types";

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProvider: ProviderProfile | undefined;
  apiKeyInput: string;
  setApiKeyInput: (val: string) => void;
  onSave: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  selectedProvider,
  apiKeyInput,
  setApiKeyInput,
  onSave,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.8)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 999999,
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "#10131c",
          border: "1px solid rgba(245, 158, 11, 0.4)",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "520px",
          boxShadow: "0 25px 60px rgba(0,0,0,0.7)",
          padding: "20px",
        }}
      >
        {/* Modal header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            paddingBottom: "10px",
            marginBottom: "14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <KeyFill size={17} color="#fbbf24" />
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 800, color: "#f8fafc" }}>
              Cài Đặt API Key Cho {selectedProvider?.name || "AI Provider"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
          >
            <XLg size={14} />
          </button>
        </div>

        <p style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "14px", lineHeight: 1.4 }}>
          Dán mã API Key của bạn vào bên dưới để kích hoạt phân tích video trực tiếp. API Key được lưu và mã hóa an toàn trên máy tính của bạn.
        </p>

        {/* Input */}
        <div style={{ marginBottom: "14px" }}>
          <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, color: "#cbd5e1", marginBottom: "5px" }}>
            MÃ API KEY (Google AI Studio / OpenAI / DeepSeek / Claude / Groq)
          </label>
          <input
            type="password"
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            placeholder="Dán API Key (AIzaSy... hoặc sk-...)"
            style={{
              width: "100%",
              background: "rgba(0,0,0,0.4)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "6px",
              padding: "8px 10px",
              color: "#f8fafc",
              fontSize: "13px",
              outline: "none",
            }}
          />
        </div>

        {/* Helper Links */}
        {selectedProvider?.providerType === "gemini" && (
          <div
            style={{
              background: "rgba(245, 158, 11, 0.08)",
              border: "1px solid rgba(245, 158, 11, 0.2)",
              borderRadius: "6px",
              padding: "8px 12px",
              marginBottom: "14px",
              fontSize: "11.5px",
              color: "#94a3b8",
            }}
          >
            💡 Chưa có key Google Gemini? Lấy API Key miễn phí tại:{" "}
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              style={{ color: "#fbbf24", fontWeight: 700, textDecoration: "underline" }}
            >
              Google AI Studio ↗
            </a>
          </div>
        )}
        {selectedProvider?.providerType === "openai" && (
          <div
            style={{
              background: "rgba(245, 158, 11, 0.08)",
              border: "1px solid rgba(245, 158, 11, 0.2)",
              borderRadius: "6px",
              padding: "8px 12px",
              marginBottom: "14px",
              fontSize: "11.5px",
              color: "#94a3b8",
            }}
          >
            💡 Lấy API Key OpenAI tại:{" "}
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noreferrer"
              style={{ color: "#fbbf24", fontWeight: 700, textDecoration: "underline" }}
            >
              OpenAI Platform ↗
            </a>
          </div>
        )}
        {selectedProvider?.providerType === "deepseek" && (
          <div
            style={{
              background: "rgba(245, 158, 11, 0.08)",
              border: "1px solid rgba(245, 158, 11, 0.2)",
              borderRadius: "6px",
              padding: "8px 12px",
              marginBottom: "14px",
              fontSize: "11.5px",
              color: "#94a3b8",
            }}
          >
            💡 Lấy API Key DeepSeek tại:{" "}
            <a
              href="https://platform.deepseek.com/api_keys"
              target="_blank"
              rel="noreferrer"
              style={{ color: "#fbbf24", fontWeight: 700, textDecoration: "underline" }}
            >
              DeepSeek Platform ↗
            </a>
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#e2e8f0",
              padding: "6px 14px",
              borderRadius: "6px",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={!apiKeyInput.trim()}
            style={{
              background: "linear-gradient(135deg, #d97706, #f59e0b)",
              color: "#12151f",
              border: "none",
              padding: "6px 16px",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 800,
              cursor: apiKeyInput.trim() ? "pointer" : "not-allowed",
              opacity: apiKeyInput.trim() ? 1 : 0.6,
            }}
          >
            Lưu & Kích Hoạt
          </button>
        </div>
      </div>
    </div>
  );
};
