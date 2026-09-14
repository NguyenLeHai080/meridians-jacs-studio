import React from "react";
import type { FormEvent } from "react";
import { Check2 } from "react-bootstrap-icons";
import { Modal } from "../../../shared/Modal";
import type { ProviderDraft, ProviderType } from "../../../core/types";
import { PROVIDER_CONFIGS } from "../constants/providerConfigs";

export interface ProviderConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: FormEvent) => Promise<void>;
  providerForm: ProviderDraft | null;
  setProviderForm: React.Dispatch<React.SetStateAction<ProviderDraft | null>>;
  selectedPreset: string;
  setSelectedPreset: (preset: string) => void;
  showApiKey: boolean;
  setShowApiKey: (show: boolean) => void;
  isLoggingInWeb: boolean;
  handleWebSessionLogin: (providerType: string) => Promise<void>;
}

export function ProviderConfigModal({
  isOpen,
  onClose,
  onSubmit,
  providerForm,
  setProviderForm,
  selectedPreset,
  setSelectedPreset,
  showApiKey,
  setShowApiKey,
  isLoggingInWeb,
  handleWebSessionLogin,
}: ProviderConfigModalProps) {
  if (!providerForm) return null;

  const currentPresetCfg = PROVIDER_CONFIGS[selectedPreset] || PROVIDER_CONFIGS.meridians;

  const toggleAllCapabilities = () => {
    setProviderForm({
      ...providerForm,
      capabilities: ["analysis", "vision", "transcription", "tts"],
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={providerForm.id ? "Chỉnh sửa AI Provider (BYOK)" : "Thêm AI Provider (BYOK)"}
      eyebrow="AI ENGINE CONFIGURATION"
      maxWidth="680px"
    >
      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        {/* Preset Selector */}
        {!providerForm.id && (
          <div>
            <label className="field-label" style={{ marginBottom: "6px" }}>
              CHỌN MẪU NHÀ CUNG CẤP CÓ SẴN (PRESET)
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
              {Object.entries(PROVIDER_CONFIGS).map(([key, cfg]) => {
                const active = selectedPreset === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setSelectedPreset(key);
                      setProviderForm({
                        ...providerForm,
                        name: cfg.name,
                        providerType: cfg.type,
                        baseUrl: cfg.baseUrl,
                        model: cfg.defaultModel,
                        capabilities: cfg.capabilities,
                        isManaged: Boolean(cfg.isGateway),
                      });
                    }}
                    style={{
                      background: active ? "rgba(249, 87, 56, 0.2)" : "rgba(255, 255, 255, 0.04)",
                      border: active ? "1.5px solid #f95738" : "1px solid rgba(255, 255, 255, 0.08)",
                      color: active ? "#ffffff" : "#cbd5e1",
                      borderRadius: "8px",
                      padding: "8px 6px",
                      fontSize: "11px",
                      fontWeight: 700,
                      cursor: "pointer",
                      textAlign: "center",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {cfg.name.split(" ")[0]}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Web Session Login shortcut for Google/ChatGPT */}
        {currentPresetCfg?.loginUrl && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: "8px",
              background: "rgba(56, 189, 248, 0.08)",
              border: "1px solid rgba(56, 189, 248, 0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "10px",
            }}
          >
            <div style={{ fontSize: "11.5px", color: "#e0f2fe", lineHeight: 1.4 }}>
              <strong>Lấy API Key nhanh:</strong> {currentPresetCfg.hint}
            </div>
            <a
              href={currentPresetCfg.loginUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                background: "linear-gradient(135deg, #0284c7, #0369a1)",
                color: "#ffffff",
                padding: "5px 12px",
                borderRadius: "6px",
                fontSize: "11px",
                fontWeight: 700,
                textDecoration: "none",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {currentPresetCfg.loginLabel || "🌐 Mở trang lấy Key"}
            </a>
          </div>
        )}

        <div className="field-pair">
          <label className="field-label">
            Tên hiển thị Provider
            <input
              required
              maxLength={120}
              value={providerForm.name}
              onChange={(e) => setProviderForm({ ...providerForm, name: e.target.value })}
            />
          </label>

          <label className="field-label">
            Kiểu Adapter (Provider Type)
            <select
              value={providerForm.providerType}
              onChange={(e) =>
                setProviderForm({
                  ...providerForm,
                  providerType: e.target.value as ProviderType,
                })
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
            onChange={(e) => setProviderForm({ ...providerForm, baseUrl: e.target.value })}
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
                onChange={(e) => setProviderForm({ ...providerForm, model: e.target.value })}
              />
            </label>

            <label className="field-label">
              TTS Model Giọng Đọc (Tùy chọn)
              <input
                maxLength={160}
                value={providerForm.ttsModel ?? ""}
                onChange={(e) => setProviderForm({ ...providerForm, ttsModel: e.target.value })}
                placeholder="tts-1 / gemini-tts"
              />
            </label>
          </div>

          {currentPresetCfg?.models && (
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "6px" }}>
              <small style={{ color: "#64748b", fontSize: "11px", display: "flex", alignItems: "center" }}>
                Gợi ý:
              </small>
              {currentPresetCfg.models.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setProviderForm({ ...providerForm, model: m })}
                  style={{
                    background:
                      providerForm.model === m ? "rgba(249, 87, 56, 0.25)" : "rgba(255, 255, 255, 0.04)",
                    border:
                      providerForm.model === m ? "1px solid #f95738" : "1px solid rgba(255, 255, 255, 0.08)",
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
          <label
            className="field-label"
            style={{
              marginBottom: "6px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ color: "#ffffff", fontWeight: 700 }}>
              MÃ API KEY / OAUTH TOKEN (BẮT BUỘC)
            </span>
            <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 400 }}>
              Mã hóa an toàn trên máy
            </span>
          </label>

          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <input
              type={showApiKey ? "text" : "password"}
              minLength={providerForm.id ? undefined : 8}
              required={!providerForm.id}
              value={providerForm.apiKey ?? ""}
              onChange={(e) => setProviderForm({ ...providerForm, apiKey: e.target.value.trim() })}
              style={{
                background: "#1e293b",
                color: "#ffffff",
                border:
                  providerForm.apiKey &&
                  providerForm.providerType === "gemini" &&
                  (providerForm.apiKey.startsWith("AIzaSy") ||
                    providerForm.apiKey.startsWith("AQ.") ||
                    providerForm.apiKey.startsWith("ya29."))
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

            <div
              style={{
                position: "absolute",
                right: "8px",
                display: "flex",
                gap: "6px",
                alignItems: "center",
              }}
            >
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
                  } catch {}
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
        </div>

        {/* Capability Badges & Active Toggle */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            borderRadius: "10px",
            padding: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
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
              onChange={(e) => setProviderForm({ ...providerForm, enabled: e.target.checked })}
              style={{ width: "16px", height: "16px", accentColor: "#f95738" }}
            />
            Kích hoạt provider này để sẵn sàng dùng cho các tác vụ
          </label>

          <span style={{ fontSize: "11px", color: "#64748b" }}>Đa AI Provider (Multi-AI)</span>
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
          <button type="button" className="button-quiet" onClick={onClose}>
            Hủy
          </button>
          <button type="submit" className="btn-primary">
            <Check2 size={14} /> Lưu AI Provider
          </button>
        </div>
      </form>
    </Modal>
  );
}
