import React, { useMemo } from "react";
import {
  KeyFill,
  PlusLg,
  ArrowRepeat,
  CheckCircleFill,
  ExclamationTriangleFill,
  Stars,
  CpuFill,
  ShieldCheck,
} from "react-bootstrap-icons";
import type { ProviderProfile } from "../../../core/types";
import { isNativeRuntime } from "../../../core/runtime";
import type { CloudModelItem } from "../constants/providerConfigs";

export interface ByokProvidersSectionProps {
  providers: ProviderProfile[];
  testingId: string;
  testProvider: (id: string) => Promise<void>;
  editProvider: (p: ProviderProfile) => void;
  deleteProvider: (id: string) => Promise<void>;
  openAddProviderModal: (presetKey: string) => void;
  creditBalance?: number;
  allowedModels?: string[] | null;
  onSyncAdminGrant?: () => void;
  cloudModels?: CloudModelItem[];
  testCloudModel?: (item: CloudModelItem) => Promise<void>;
  selectCloudModelForAnalysis?: (item: CloudModelItem) => void;
  configureBYOKForCloudModel?: (item: CloudModelItem) => void;
  testingModelId?: string;
  cloudModelTestResults?: Record<
    string,
    { status: "reachable" | "unreachable"; latencyMs: number; detail: string }
  >;
}

export function ByokProvidersSection({
  providers,
  testingId,
  testProvider,
  editProvider,
  deleteProvider,
  openAddProviderModal,
  creditBalance = 0,
  allowedModels = null,
  onSyncAdminGrant,
  cloudModels = [],
  testCloudModel,
  selectCloudModelForAnalysis,
  configureBYOKForCloudModel,
  testingModelId = "",
  cloudModelTestResults = {},
}: ByokProvidersSectionProps) {
  const native = isNativeRuntime();
  const byokProviders = providers.filter((p) => !p.isManaged);

  // 1. Models granted by Admin from Cloud Gateway
  // STRICT RULE: Only show models when explicitly granted by Admin (allowedModels is non-empty).
  // If not granted (null, undefined, or empty array): DO NOT SHOW ANY ADMIN MODELS!
  const displayGrantedList: CloudModelItem[] = useMemo(() => {
    if (!allowedModels || !Array.isArray(allowedModels) || allowedModels.length === 0) {
      return [];
    }

    return allowedModels.map((allowedModel, idx) => {
      const target = (allowedModel || "").toLowerCase().trim();
      const matched = cloudModels.find((m) => {
        const clean = (m.model || "").toLowerCase().trim();
        return clean === target || clean.includes(target) || target.includes(clean);
      });

      if (matched) {
        return matched;
      }

      return {
        id: `granted-${idx}`,
        model: allowedModel,
        provider_name: target.includes("gemini")
          ? "Google Gemini"
          : target.includes("gpt")
          ? "OpenAI"
          : target.includes("claude")
          ? "Anthropic Claude"
          : target.includes("deepseek")
          ? "DeepSeek"
          : "Cloud AI Gateway",
        input_price: 0,
        output_price: 0,
        is_selling: true,
        purpose: "Mô hình cấp quyền từ Cloud Admin",
      };
    });
  }, [cloudModels, allowedModels]);

  const hasAnyProviders = displayGrantedList.length > 0 || byokProviders.length > 0;

  return (
    <section
      className="panel-card"
      style={{
        borderRadius: "12px",
        padding: "18px 22px",
        marginBottom: "28px",
        width: "100%",
        boxSizing: "border-box",
        background: "linear-gradient(180deg, #111827 0%, #0b0f19 100%)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.25)",
      }}
    >
      {/* 1. Header & Quick Summary */}
      <div
        className="panel-head"
        style={{
          marginBottom: "16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px", flexWrap: "wrap" }}>
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
              🔑 AI PROVIDERS & BYOK · NHÀ CUNG CẤP AI
            </span>
            <span
              style={{
                fontSize: "11px",
                color: creditBalance > 0 ? "#34d399" : "#f87171",
                fontWeight: 750,
                background: creditBalance > 0 ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)",
                border: creditBalance > 0 ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(239, 68, 68, 0.3)",
                padding: "1px 7px",
                borderRadius: "4px",
              }}
            >
              💎 Ví: {creditBalance.toLocaleString("vi-VN", { minimumFractionDigits: 0, maximumFractionDigits: 3 })} Credits
            </span>
            <span style={{ fontSize: "11px", color: "#94a3b8" }}>
              • {displayGrantedList.length > 0 ? `${displayGrantedList.length} model từ Admin` : "Chưa có model từ Admin"} • {byokProviders.length} key cá nhân
            </span>
          </div>
          <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#f8fafc", margin: "2px 0 0" }}>
            Nhà cung cấp AI (BYOK - Bring Your Own Key)
          </h3>
          <p className="subtle" style={{ fontSize: "12px", color: "#94a3b8", margin: "3px 0 0" }}>
            Quản lý các mô hình AI do Admin cấp phép theo Tool Key và các API Key cá nhân do bạn tự thêm.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          {onSyncAdminGrant && (
            <button
              type="button"
              className="btn-secondary"
              onClick={onSyncAdminGrant}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "8px 13px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: 750,
                background: "rgba(245, 158, 11, 0.1)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                color: "#fbbf24",
                cursor: "pointer",
              }}
              title="Đồng bộ danh sách model AI và hạn mức Credits mới nhất từ Admin"
            >
              <ArrowRepeat size={13} /> Đồng bộ từ Server
            </button>
          )}

          <button
            type="button"
            className="btn-primary"
            onClick={() => openAddProviderModal("meridians")}
            disabled={!native}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 15px",
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
            <PlusLg size={13} /> {native ? "+ Thêm Key Riêng (BYOK)" : "Mở bản Desktop để thêm"}
          </button>
        </div>
      </div>

      {/* 2. Unified Providers Table */}
      {hasAnyProviders ? (
        <div className="jacs-table-wrapper" style={{ overflowX: "auto" }}>
          <table className="jacs-table" style={{ width: "100%", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "rgba(0, 0, 0, 0.35)" }}>
                <th>TÊN PROVIDER</th>
                <th>NGUỒN CẤP / NỀN TẢNG</th>
                <th>MODEL AI MẶC ĐỊNH</th>
                <th>BASE URL / PHẠM VI</th>
                <th>TRẠNG THÁI</th>
                <th style={{ textAlign: "right", minWidth: "220px" }}>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {/* GROUP A: MODELS GRANTED BY ADMIN */}
              {displayGrantedList.length > 0 && (
                <>
                  <tr
                    style={{
                      background: "linear-gradient(90deg, rgba(245, 158, 11, 0.15) 0%, rgba(30, 41, 59, 0.5) 100%)",
                      borderLeft: "3px solid #f59e0b",
                    }}
                  >
                    <td colSpan={6} style={{ padding: "7px 12px", borderBottom: "1px solid rgba(245, 158, 11, 0.2)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Stars size={14} color="#fbbf24" />
                        <strong
                          style={{
                            color: "#f8fafc",
                            fontSize: "12px",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                          }}
                        >
                          💎 MÔ HÌNH NHẬN TỪ NHÀ CUNG CẤP (ADMIN CẤP PHÉP THEO KEY)
                        </strong>
                        <span
                          style={{
                            fontSize: "10.5px",
                            padding: "1px 6px",
                            borderRadius: "10px",
                            background: "rgba(245, 158, 11, 0.2)",
                            color: "#fbbf24",
                            fontWeight: 750,
                          }}
                        >
                          {displayGrantedList.length} model sẵn sàng
                        </span>
                      </div>
                    </td>
                  </tr>

                  {displayGrantedList.map((item) => (
                    <tr
                      key={`admin-${item.id || item.model}`}
                      style={{
                        borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                        transition: "background 0.2s ease",
                      }}
                    >
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <ShieldCheck size={14} color="#34d399" />
                          <div>
                            <strong style={{ color: "#ffffff", fontSize: "12.5px" }}>
                              {item.provider_name}
                            </strong>
                            <div style={{ display: "flex", gap: "4px", marginTop: "2px" }}>
                              <span
                                style={{
                                  fontSize: "9.5px",
                                  fontWeight: 800,
                                  color: "#34d399",
                                  background: "rgba(16, 185, 129, 0.15)",
                                  border: "1px solid rgba(16, 185, 129, 0.35)",
                                  padding: "1px 5px",
                                  borderRadius: "3px",
                                  textTransform: "uppercase",
                                }}
                              >
                                ✓ Cấp từ Admin
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: "5px",
                            background: "rgba(56, 189, 248, 0.12)",
                            border: "1px solid rgba(56, 189, 248, 0.3)",
                            color: "#38bdf8",
                            fontSize: "11px",
                            fontWeight: 750,
                            textTransform: "uppercase",
                          }}
                        >
                          Cloud Gateway
                        </span>
                      </td>

                      <td>
                        <div>
                          <code style={{ color: "#38bdf8", fontWeight: 750, fontSize: "12px", fontFamily: "monospace" }}>
                            {item.model}
                          </code>
                          <div style={{ fontSize: "10.5px", color: "#94a3b8", marginTop: "2px" }}>
                            In: {((item.input_price || 500) / 1000).toFixed(2)} Cr • Out: {((item.output_price || 900) / 1000).toFixed(2)} Cr /1M
                          </div>
                          {testingModelId === (item.id || item.model) ? (
                            <div style={{ fontSize: "10.5px", color: "#38bdf8", fontWeight: 700, marginTop: "2px" }}>
                              <ArrowRepeat size={10} className="animate-spin" /> Đang kiểm tra...
                            </div>
                          ) : cloudModelTestResults[item.id || item.model] ? (
                            <div style={{ fontSize: "10.5px", marginTop: "2px" }}>
                              {cloudModelTestResults[item.id || item.model].status === "reachable" ? (
                                <span style={{ color: "#34d399", fontWeight: 700 }}>
                                  ✓ Sẵn sàng ({cloudModelTestResults[item.id || item.model].latencyMs}ms)
                                </span>
                              ) : (
                                <span style={{ color: "#f87171", fontWeight: 700 }}>
                                  ✕ {cloudModelTestResults[item.id || item.model].detail || "Lỗi kết nối"}
                                </span>
                              )}
                            </div>
                          ) : null}
                        </div>
                      </td>

                      <td>
                        <div style={{ fontSize: "11px", color: "#cbd5e1" }}>
                          <span style={{ fontFamily: "monospace", color: "#94a3b8" }}>
                            Cloud Studio Gateway (Hạn mức ví)
                          </span>
                        </div>
                      </td>

                      <td>
                        <span
                          style={{
                            color: creditBalance > 0 ? "#10b981" : "#f87171",
                            fontWeight: 750,
                            fontSize: "11.5px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            background: creditBalance > 0 ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)",
                            border: creditBalance > 0 ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(239, 68, 68, 0.3)",
                            padding: "2px 7px",
                            borderRadius: "4px",
                          }}
                        >
                          {creditBalance > 0
                            ? `● Sẵn sàng (${creditBalance.toLocaleString("vi-VN", { maximumFractionDigits: 1 })} Cr)`
                            : "⚠️ Hết Credits"}
                        </span>
                      </td>

                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                          {selectCloudModelForAnalysis && (
                            <button
                              type="button"
                              onClick={() => selectCloudModelForAnalysis(item)}
                              style={{
                                background: "linear-gradient(135deg, #d97706, #f59e0b)",
                                border: "none",
                                color: "#12151f",
                                padding: "5px 11px",
                                borderRadius: "6px",
                                fontSize: "11px",
                                fontWeight: 800,
                                cursor: "pointer",
                                boxShadow: "0 0 8px rgba(245, 158, 11, 0.3)",
                              }}
                              title="Chọn model này để làm việc trên công cụ"
                            >
                              ⚡ Kích Hoạt
                            </button>
                          )}
                          {testCloudModel && (
                            <button
                              type="button"
                              className="text-button"
                              onClick={() => void testCloudModel(item)}
                              disabled={testingModelId === (item.id || item.model)}
                              style={{ color: "#38bdf8", fontSize: "11.5px" }}
                            >
                              {testingModelId === (item.id || item.model) ? "Testing..." : "Test"}
                            </button>
                          )}
                          {configureBYOKForCloudModel && (
                            <button
                              type="button"
                              className="text-button"
                              onClick={() => configureBYOKForCloudModel(item)}
                              style={{ color: "#fbbf24", fontSize: "11.5px" }}
                              title="Nhập API Key cá nhân nếu muốn dùng không tốn Credit"
                            >
                              🔑 Dùng Key Riêng
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </>
              )}

              {/* GROUP B: USER'S PERSONAL BYOK PROVIDERS */}
              {byokProviders.length > 0 && (
                <>
                  <tr
                    style={{
                      background: "linear-gradient(90deg, rgba(56, 189, 248, 0.12) 0%, rgba(30, 41, 59, 0.45) 100%)",
                      borderLeft: "3px solid #38bdf8",
                    }}
                  >
                    <td colSpan={6} style={{ padding: "7px 12px", borderBottom: "1px solid rgba(56, 189, 248, 0.2)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <KeyFill size={13} color="#38bdf8" />
                        <strong
                          style={{
                            color: "#f8fafc",
                            fontSize: "12px",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                          }}
                        >
                          🔑 KẾT NỐI BYOK CÁ NHÂN (API KEY TỰ THÊM)
                        </strong>
                        <span
                          style={{
                            fontSize: "10.5px",
                            padding: "1px 6px",
                            borderRadius: "10px",
                            background: "rgba(56, 189, 248, 0.2)",
                            color: "#38bdf8",
                            fontWeight: 750,
                          }}
                        >
                          {byokProviders.length} key riêng
                        </span>
                      </div>
                    </td>
                  </tr>

                  {byokProviders.map((p) => (
                    <tr key={p.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
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

                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
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
                </>
              )}
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
                Chưa có kết nối AI nào
              </h4>
              <p style={{ margin: 0, fontSize: "12px", color: "#94a3b8", lineHeight: 1.5 }}>
                Bạn có thể nhấn <strong>"Đồng bộ từ Server"</strong> để nhận các mô hình AI và Credits do Admin cấp cho Tool Key của bạn, hoặc nhấn <strong>"+ Thêm Key Riêng (BYOK)"</strong> để tự nạp API Key cá nhân.
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

