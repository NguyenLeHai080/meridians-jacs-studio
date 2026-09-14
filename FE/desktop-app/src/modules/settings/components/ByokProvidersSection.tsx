import React from "react";
import { KeyFill, PlusLg } from "react-bootstrap-icons";
import type { ProviderProfile } from "../../../core/types";
import { isNativeRuntime } from "../../../core/runtime";

export interface ByokProvidersSectionProps {
  providers: ProviderProfile[];
  testingId: string;
  testProvider: (id: string) => Promise<void>;
  editProvider: (p: ProviderProfile) => void;
  deleteProvider: (id: string) => Promise<void>;
  openAddProviderModal: (presetKey: string) => void;
}

export function ByokProvidersSection({
  providers,
  testingId,
  testProvider,
  editProvider,
  deleteProvider,
  openAddProviderModal,
}: ByokProvidersSectionProps) {
  const native = isNativeRuntime();
  const byokProviders = providers.filter((p) => !p.isManaged);

  return (
    <section
      className="panel-card"
      style={{
        borderRadius: "12px",
        padding: "16px 20px",
        marginBottom: "28px",
        width: "100%",
        boxSizing: "border-box",
        background: "linear-gradient(180deg, #111827 0%, #0b0f19 100%)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.25)",
      }}
    >
      <div
        className="panel-head"
        style={{
          marginBottom: "14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
            <span
              style={{
                fontSize: "10px",
                color: "#fbbf24",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                background: "rgba(245, 158, 11, 0.12)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                padding: "2px 7px",
                borderRadius: "4px",
              }}
            >
              🔑 AI PROVIDERS & API KEYS (BYOK CÁ NHÂN)
            </span>
            <span style={{ fontSize: "11px", color: "#94a3b8" }}>
              {byokProviders.length} kết nối riêng
            </span>
          </div>
          <h3 style={{ fontSize: "15px", fontWeight: 800, color: "#f8fafc", margin: "2px 0 0" }}>
            Nhà cung cấp AI (BYOK - Bring Your Own Key)
          </h3>
          <p className="subtle" style={{ fontSize: "12px", color: "#94a3b8", margin: "3px 0 0" }}>
            Dành riêng cho API Key do bạn tự thêm hoặc đăng nhập trên tool. Mã hóa an toàn AES-256 trên thiết bị của bạn.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            className="btn-primary"
            onClick={() => openAddProviderModal("meridians")}
            disabled={!native}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: 800,
              cursor: native ? "pointer" : "not-allowed",
              background: "linear-gradient(135deg, #d97706, #f59e0b)",
              border: "none",
              color: "#12151f",
              boxShadow: "0 0 16px rgba(245, 158, 11, 0.4)",
            }}
          >
            <PlusLg size={13} /> {native ? "+ Thêm AI Provider (BYOK)" : "Mở bản Desktop để thêm"}
          </button>
        </div>
      </div>

      {byokProviders.length > 0 ? (
        <div className="jacs-table-wrapper" style={{ overflowX: "auto" }}>
          <table className="jacs-table">
            <thead>
              <tr style={{ background: "rgba(0, 0, 0, 0.3)" }}>
                <th>TÊN PROVIDER</th>
                <th>LOẠI NỀN TẢNG</th>
                <th>MODEL MẶC ĐỊNH</th>
                <th>BASE URL / ENDPOINT</th>
                <th>TRẠNG THÁI</th>
                <th style={{ textAlign: "right" }}>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {byokProviders.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                      <KeyFill size={13} color="#fbbf24" />
                      <strong style={{ color: "#ffffff", fontSize: "12.5px" }}>{p.name}</strong>
                    </div>
                  </td>
                  <td>
                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: "5px",
                        background: "rgba(255, 255, 255, 0.08)",
                        color: "#cbd5e1",
                        fontSize: "11px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                      }}
                    >
                      {p.providerType}
                    </span>
                  </td>
                  <td>
                    <code style={{ color: "#38bdf8", fontWeight: 700, fontSize: "11.5px" }}>
                      {p.model}
                    </code>
                  </td>
                  <td>
                    <small style={{ color: "#94a3b8", fontFamily: "monospace", fontSize: "11px" }}>
                      {p.baseUrl}
                    </small>
                  </td>
                  <td>
                    <span
                      style={{
                        color: p.enabled ? "#10b981" : "#94a3b8",
                        fontWeight: 750,
                        fontSize: "11.5px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      {p.enabled ? "● Sẵn sàng" : "○ Đang tắt"}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => void testProvider(p.id)}
                      disabled={testingId === p.id}
                      style={{ color: "#38bdf8", marginRight: "8px" }}
                    >
                      {testingId === p.id ? "Đang test..." : "Test"}
                    </button>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => editProvider(p)}
                      style={{ color: "#fbbf24", marginRight: "8px" }}
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      className="text-button"
                      style={{ color: "#f87171" }}
                      onClick={() => void deleteProvider(p.id)}
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          style={{
            padding: "24px 20px",
            borderRadius: "10px",
            background: "rgba(15, 23, 42, 0.5)",
            border: "1px dashed rgba(245, 158, 11, 0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", maxWidth: "720px" }}>
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "8px",
                background: "rgba(245, 158, 11, 0.15)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <KeyFill size={18} color="#fbbf24" />
            </div>
            <div>
              <h4 style={{ margin: "0 0 4px", fontSize: "13.5px", fontWeight: 800, color: "#f8fafc" }}>
                Chưa có kết nối BYOK cá nhân nào
              </h4>
              <p style={{ margin: 0, fontSize: "12px", color: "#94a3b8", lineHeight: 1.5 }}>
                Mặc định tool đang kết nối sử dụng trực tiếp các Model AI được cấp phép chính thức từ{" "}
                <strong>Cloud Admin Gateway</strong> (ở bảng bên dưới). Nếu bạn muốn dùng API Key riêng
                của cá nhân (OpenAI, Gemini, Claude, DeepSeek, ElevenLabs...), hãy nhấn{" "}
                <strong>"+ Thêm AI Provider (BYOK)"</strong> hoặc bấm <strong>"🔑 Nhập Key"</strong> ở
                model tương ứng bên dưới.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => openAddProviderModal("meridians")}
            disabled={!native}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              borderRadius: "7px",
              fontSize: "12px",
              fontWeight: 750,
              background: "rgba(245, 158, 11, 0.12)",
              border: "1px solid rgba(245, 158, 11, 0.35)",
              color: "#fbbf24",
              cursor: native ? "pointer" : "not-allowed",
            }}
          >
            <PlusLg size={12} /> Thêm Key Riêng Của Bạn
          </button>
        </div>
      )}
    </section>
  );
}
