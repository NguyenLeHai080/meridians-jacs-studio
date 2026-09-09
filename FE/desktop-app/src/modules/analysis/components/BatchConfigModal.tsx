import React from "react";
import {
  ArrowRepeat,
  ClockFill,
  CpuFill,
  LightningChargeFill,
  PencilSquare,
  PlusLg,
  Sliders,
  Trash3Fill,
  VolumeUpFill,
  XLg,
} from "react-bootstrap-icons";
import type { DurationMappingRule, Job, ProviderPoolItem, ProviderProfile } from "../../../core/types";
import { ANALYSIS_LANGUAGES, PRESET_PROMPTS, type PresetPrompt } from "../constants/prompts";
import { formatProviderLabel } from "../utils/analysisHelpers";

interface BatchConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysisTargetJob: Job | null;
  selectedJobIds: Set<string>;
  sourceCandidates: Job[];
  useProviderPool: boolean;
  updateUseProviderPool: (val: boolean) => void;
  batchConcurrency: number;
  updateBatchConcurrency: (val: number) => void;
  activeProviderPool: ProviderPoolItem[];
  allAvailablePoolItems: ProviderPoolItem[];
  selectedPoolKeys: string[];
  togglePoolKey: (key: string) => void;
  selectAllPoolKeys: (keys: string[]) => void;
  clearAllPoolKeys: () => void;
  handleQuickSync: () => void;
  syncingQuick: boolean;
  configuredProviders: ProviderProfile[];
  defaultProviderId: string;
  handleSelectProvider: (id: string) => void;
  isCustomModel: boolean;
  selectedModel: string;
  selectedProvider: ProviderProfile | undefined;
  handleSelectModel: (model: string) => void;
  availableModels: { label: string; tag?: string }[];
  durationMode: "rules" | "fixed";
  updateDurationMode: (mode: "rules" | "fixed") => void;
  durationRules: DurationMappingRule[];
  handleUpdateDurationRule: (id: string, updates: Partial<DurationMappingRule>) => void;
  handleDeleteDurationRule: (id: string) => void;
  handleAddDurationRule: () => void;
  handleResetDurationRules: () => void;
  targetDuration: "full" | "60s" | "3m" | "5m" | "10m" | "15m" | "custom";
  setTargetDuration: (dur: "full" | "60s" | "3m" | "5m" | "10m" | "15m" | "custom") => void;
  customDurationMinutes: number;
  setCustomDurationMinutes: (mins: number) => void;
  selectedPresetId: string;
  defaultPrompt: string;
  handleSelectPreset: (preset: PresetPrompt) => void;
  onOpenPromptModal: () => void;
  narratorEnabled: boolean;
  updateNarratorEnabled: (val: boolean) => void;
  removeOriginalBgm: boolean;
  updateRemoveOriginalBgm: (val: boolean) => void;
  interweaveAudio: boolean;
  updateInterweaveAudio: (val: boolean) => void;
  emphasizeHook: boolean;
  updateEmphasizeHook: (val: boolean) => void;
  autoDucking: boolean;
  updateAutoDucking: (val: boolean) => void;
  defaultLanguage: string;
  setDefaultLanguage: (lang: string) => void;
  onSubmitBatch: (pId: string, prompt: string, lang: string) => void;
}

export const BatchConfigModal: React.FC<BatchConfigModalProps> = ({
  isOpen,
  onClose,
  analysisTargetJob,
  selectedJobIds,
  sourceCandidates,
  useProviderPool,
  updateUseProviderPool,
  batchConcurrency,
  updateBatchConcurrency,
  activeProviderPool,
  allAvailablePoolItems,
  selectedPoolKeys,
  togglePoolKey,
  selectAllPoolKeys,
  clearAllPoolKeys,
  handleQuickSync,
  syncingQuick,
  configuredProviders,
  defaultProviderId,
  handleSelectProvider,
  isCustomModel,
  selectedModel,
  selectedProvider,
  handleSelectModel,
  availableModels,
  durationMode,
  updateDurationMode,
  durationRules,
  handleUpdateDurationRule,
  handleDeleteDurationRule,
  handleAddDurationRule,
  handleResetDurationRules,
  targetDuration,
  setTargetDuration,
  customDurationMinutes,
  setCustomDurationMinutes,
  selectedPresetId,
  defaultPrompt,
  handleSelectPreset,
  onOpenPromptModal,
  narratorEnabled,
  updateNarratorEnabled,
  removeOriginalBgm,
  updateRemoveOriginalBgm,
  interweaveAudio,
  updateInterweaveAudio,
  emphasizeHook,
  updateEmphasizeHook,
  autoDucking,
  updateAutoDucking,
  defaultLanguage,
  setDefaultLanguage,
  onSubmitBatch,
}) => {
  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitBatch(defaultProviderId, defaultPrompt, defaultLanguage);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99999,
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "#10131c",
          border: "1px solid rgba(245, 158, 11, 0.45)",
          borderRadius: "14px",
          width: "100%",
          maxWidth: "880px",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 60px rgba(0,0,0,0.8)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 24px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(18, 22, 34, 0.85)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, rgba(217, 119, 6, 0.25), rgba(245, 158, 11, 0.15))",
                color: "#fbbf24",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid rgba(245, 158, 11, 0.3)",
              }}
            >
              <LightningChargeFill size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#f8fafc", margin: 0 }}>
                {analysisTargetJob
                  ? `Cấu Hình Phân Tích Video: ${analysisTargetJob.name}`
                  : `Phân Tích AI Hàng Loạt (${selectedJobIds.size > 0 ? selectedJobIds.size : sourceCandidates.length} Video)`}
              </h3>
              <span style={{ fontSize: "11.5px", color: "#94a3b8" }}>
                Tự động bóc tách từng phân cảnh, nhận diện visual, mốc thời gian và biên kịch đồng bộ
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
          >
            <XLg size={16} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form
          onSubmit={handleSubmit}
          style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", minHeight: 0 }}
        >
          <div
            style={{
              padding: "20px 24px",
              display: "flex",
              flexDirection: "column",
              gap: "18px",
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            {/* SECTION 1: AI Provider & Pool Rotation */}
            <div
              style={{
                background: "rgba(18, 23, 35, 0.75)",
                border: "1px solid rgba(255, 255, 255, 0.09)",
                borderRadius: "12px",
                padding: "14px 16px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                width: "100%",
                boxSizing: "border-box",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                <span style={{ fontSize: "13px", fontWeight: 800, color: "#f8fafc", display: "flex", alignItems: "center", gap: "8px" }}>
                  <CpuFill size={15} color="#fbbf24" /> 1. Cơ Chế Điều Phối AI & Tốc Độ Xử Lý
                </span>

                <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={useProviderPool}
                    onChange={(e) => updateUseProviderPool(e.target.checked)}
                    style={{ accentColor: "#f59e0b", width: "15px", height: "15px", cursor: "pointer" }}
                  />
                  <span style={{ fontSize: "11.5px", fontWeight: 700, color: useProviderPool ? "#fbbf24" : "#94a3b8" }}>
                    ⭐ Bật Multi-Model Pool (Cắm đêm siêu tốc)
                  </span>
                </label>
              </div>

              {useProviderPool ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", paddingTop: "8px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  {/* Concurrency Selector */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", background: "rgba(0,0,0,0.3)", padding: "8px 12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <span style={{ fontSize: "11.5px", color: "#e2e8f0", fontWeight: 700 }}>
                      🚀 Tốc độ phân tích song song:
                    </span>
                    <div style={{ display: "flex", gap: "5px" }}>
                      {[1, 2, 3, 4, 5].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => updateBatchConcurrency(c)}
                          style={{
                            background: batchConcurrency === c ? "linear-gradient(135deg, #d97706, #f59e0b)" : "rgba(255,255,255,0.06)",
                            color: batchConcurrency === c ? "#12151f" : "#cbd5e1",
                            border: batchConcurrency === c ? "none" : "1px solid rgba(255,255,255,0.1)",
                            padding: "4px 11px",
                            borderRadius: "6px",
                            fontSize: "11px",
                            fontWeight: batchConcurrency === c ? 800 : 600,
                            cursor: "pointer",
                            boxShadow: batchConcurrency === c ? "0 0 10px rgba(245, 158, 11, 0.3)" : "none",
                          }}
                        >
                          {c} {c === 1 ? "luồng" : c === 3 ? "luồng (khuyên dùng) ⭐" : "luồng"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Multi-Model Rotation Pool List */}
                  <div style={{ background: "rgba(0,0,0,0.22)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", padding: "10px 12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "11.5px", fontWeight: 800, color: "#fbbf24", textTransform: "uppercase", letterSpacing: "0.3px" }}>
                          Vòng Luân Chuyển Model AI ({activeProviderPool.length}/{allAvailablePoolItems.length} đang bật)
                        </span>
                        <span style={{ fontSize: "10.5px", color: "#94a3b8" }}>
                          • Tự động đảo model khi lỗi 429 / Timeout
                        </span>
                      </div>

                      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        <button
                          type="button"
                          onClick={() => selectAllPoolKeys(allAvailablePoolItems.map((i) => `${i.providerId}:${i.model}`))}
                          style={{
                            background: "rgba(255,255,255,0.06)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            color: "#cbd5e1",
                            padding: "3px 8px",
                            borderRadius: "4px",
                            fontSize: "10.5px",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          Chọn tất cả
                        </button>

                        <button
                          type="button"
                          onClick={() => clearAllPoolKeys()}
                          style={{
                            background: "rgba(255,255,255,0.06)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            color: "#94a3b8",
                            padding: "3px 8px",
                            borderRadius: "4px",
                            fontSize: "10.5px",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          Bỏ chọn hết
                        </button>

                        <button
                          type="button"
                          onClick={handleQuickSync}
                          disabled={syncingQuick}
                          style={{
                            background: "rgba(245, 158, 11, 0.15)",
                            border: "1px solid rgba(245, 158, 11, 0.35)",
                            color: "#fbbf24",
                            padding: "3px 8px",
                            borderRadius: "4px",
                            fontSize: "10.5px",
                            fontWeight: 750,
                            cursor: syncingQuick ? "not-allowed" : "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <ArrowRepeat size={10} className={syncingQuick ? "animate-spin" : ""} />
                          {syncingQuick ? "Đang đồng bộ..." : "🔄 Đồng bộ Model"}
                        </button>
                      </div>
                    </div>

                    {/* Model Items Grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "6px", maxHeight: "180px", overflowY: "auto", paddingRight: "4px" }}>
                      {allAvailablePoolItems.length === 0 ? (
                        <div style={{ padding: "12px", textAlign: "center", color: "#94a3b8", fontSize: "11.5px", gridColumn: "1 / -1" }}>
                          Chưa có Provider/Model nào được kích hoạt. Hãy cấu hình API Key trong mục Cài Đặt hoặc bấm <strong>"Đồng bộ Model"</strong>.
                        </div>
                      ) : (
                        allAvailablePoolItems.map((item, idx) => {
                          const key = `${item.providerId}:${item.model}`;
                          const isChecked = selectedPoolKeys.length === 0
                            ? true
                            : selectedPoolKeys.includes(key) || selectedPoolKeys.includes(item.providerId);

                          return (
                            <div
                              key={key}
                              onClick={() => togglePoolKey(key)}
                              style={{
                                background: isChecked ? "rgba(245, 158, 11, 0.09)" : "rgba(255, 255, 255, 0.03)",
                                border: isChecked ? "1px solid rgba(245, 158, 11, 0.35)" : "1px solid rgba(255, 255, 255, 0.08)",
                                borderRadius: "6px",
                                padding: "6px 10px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {}}
                                  style={{ cursor: "pointer", accentColor: "#f59e0b", width: "14px", height: "14px", margin: 0 }}
                                />
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontSize: "12px", fontWeight: 750, color: isChecked ? "#f8fafc" : "#94a3b8", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {item.model || item.name}
                                  </div>
                                  <div style={{ fontSize: "10.5px", color: "#64748b", display: "flex", alignItems: "center", gap: "4px" }}>
                                    <span>Ưu tiên #{idx + 1}</span>
                                    <span>•</span>
                                    <span>{item.name}</span>
                                  </div>
                                </div>
                              </div>

                              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px", flexShrink: 0 }}>
                                <span
                                  style={{
                                    fontSize: "9.5px",
                                    fontWeight: 800,
                                    padding: "1px 5px",
                                    borderRadius: "3px",
                                    background: (item.name || "").includes("Cloud") || (item.name || "").includes("Gateway") ? "rgba(245, 158, 11, 0.2)" : "rgba(59, 130, 246, 0.2)",
                                    color: (item.name || "").includes("Cloud") || (item.name || "").includes("Gateway") ? "#fbbf24" : "#60a5fa",
                                  }}
                                >
                                  {(item.name || "").includes("Cloud") || (item.name || "").includes("Gateway") ? "⚡ Cloud Gateway" : "🔑 BYOK Key"}
                                </span>
                                <span style={{ fontSize: "9.5px", color: isChecked ? "#34d399" : "#64748b", fontWeight: 700 }}>
                                  {isChecked ? "● Sẵn sàng" : "○ Đã tắt"}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* Single Provider Selector */
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", width: "100%", boxSizing: "border-box", paddingTop: "4px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#cbd5e1", marginBottom: "4px" }}>
                      NHÀ CUNG CẤP AI ƯU TIÊN
                    </label>
                    <select
                      value={defaultProviderId}
                      onChange={(e) => handleSelectProvider(e.target.value)}
                      style={{ width: "100%", background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255, 255, 255, 0.14)", borderRadius: "6px", padding: "7px 10px", color: "#f8fafc", fontSize: "12px", outline: "none", cursor: "pointer" }}
                    >
                      {configuredProviders.some((p) => !p.isManaged) && (
                        <optgroup label="🔑 NHÀ CUNG CẤP BYOK (API KEY RIÊNG)">
                          {configuredProviders.filter((p) => !p.isManaged).map((p) => (
                            <option key={p.id} value={p.id}>
                              {formatProviderLabel(p)}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {configuredProviders.some((p) => p.isManaged) && (
                        <optgroup label="⚡ CLOUD AI GATEWAY (ADMIN CẤP PHÉP)">
                          {configuredProviders.filter((p) => p.isManaged).map((p) => (
                            <option key={p.id} value={p.id}>
                              {formatProviderLabel(p)}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#cbd5e1", marginBottom: "4px" }}>
                      MÔ HÌNH AI (MODEL)
                    </label>
                    <select
                      value={isCustomModel ? "__custom__" : (selectedModel || selectedProvider?.model || "")}
                      onChange={(e) => handleSelectModel(e.target.value)}
                      style={{ width: "100%", background: "rgba(0,0,0,0.45)", border: "1px solid rgba(245, 158, 11, 0.35)", borderRadius: "6px", padding: "7px 10px", color: "#fbbf24", fontWeight: 700, fontSize: "12px", outline: "none", cursor: "pointer" }}
                    >
                      {availableModels.map((m) => (
                        <option key={m.label} value={m.label}>
                          {m.label} {m.tag ? `— ${m.tag}` : ""}
                        </option>
                      ))}
                      <option value="__custom__">✍️ [Nhập model tùy chỉnh khác...]</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 2: Duration Mode & Mapping Rules */}
            <div style={{ background: "rgba(18, 23, 35, 0.75)", border: "1px solid rgba(255, 255, 255, 0.09)", borderRadius: "12px", padding: "14px 16px", display: "flex", flexDirection: "column", gap: "11px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <ClockFill size={16} color="#fbbf24" />
                  <span style={{ fontSize: "13px", fontWeight: 800, color: "#f8fafc" }}>
                    2. Thời Lượng Kịch Bản Đầu Ra Mong Muốn
                  </span>
                </div>

                <div style={{ display: "flex", background: "rgba(0,0,0,0.45)", borderRadius: "8px", padding: "3px", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <button
                    type="button"
                    onClick={() => updateDurationMode("rules")}
                    style={{
                      background: durationMode === "rules" ? "linear-gradient(135deg, #d97706, #f59e0b)" : "transparent",
                      color: durationMode === "rules" ? "#12151f" : "#94a3b8",
                      border: "none",
                      padding: "5px 12px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: durationMode === "rules" ? 800 : 600,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    🎯 Bảng Ánh Xạ Theo Dải Phút
                  </button>
                  <button
                    type="button"
                    onClick={() => updateDurationMode("fixed")}
                    style={{
                      background: durationMode === "fixed" ? "linear-gradient(135deg, #d97706, #f59e0b)" : "transparent",
                      color: durationMode === "fixed" ? "#12151f" : "#94a3b8",
                      border: "none",
                      padding: "5px 12px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: durationMode === "fixed" ? 800 : 600,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    ⏱️ Cố Định 1 Mốc
                  </button>
                </div>
              </div>

              {durationMode === "rules" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <p style={{ fontSize: "11px", color: "#94a3b8", margin: "0 0 2px" }}>
                    💡 Hệ thống tự đo độ dài từng video trong danh sách nạp và chọn đúng số phút kịch bản theo bảng:
                  </p>

                  <div style={{ background: "rgba(9, 12, 18, 0.85)", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "2.4fr 1.8fr 1.4fr 38px", padding: "8px 14px", background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: "10.5px", fontWeight: 800, color: "#94a3b8", letterSpacing: "0.4px" }}>
                      <span>📹 ĐỘ DÀI VIDEO GỐC</span>
                      <span>🎙️ KỊCH BẢN XUẤT RA</span>
                      <span>ƯỚC TÍNH SỐ TỪ</span>
                      <span style={{ textAlign: "center" }}>XÓA</span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column" }}>
                      {durationRules.map((rule, idx) => (
                        <div
                          key={rule.id || idx}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "2.4fr 1.8fr 1.4fr 38px",
                            padding: "8px 14px",
                            alignItems: "center",
                            background: idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)",
                            borderBottom: idx < durationRules.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                            gap: "8px",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                            <span style={{ fontSize: "11px", color: "#94a3b8" }}>Từ</span>
                            <input
                              type="number"
                              min={0}
                              max={9999}
                              value={rule.minInputMinutes}
                              onChange={(e) => handleUpdateDurationRule(rule.id, { minInputMinutes: Math.max(0, Number(e.target.value) || 0) })}
                              style={{ width: "46px", background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: "5px", padding: "4px 6px", color: "#f8fafc", fontSize: "12px", fontWeight: 700, textAlign: "center", outline: "none" }}
                            />
                            <span style={{ fontSize: "11px", color: "#94a3b8" }}>đến</span>
                            <input
                              type="number"
                              min={1}
                              max={9999}
                              value={rule.maxInputMinutes}
                              onChange={(e) => handleUpdateDurationRule(rule.id, { maxInputMinutes: Math.max(1, Number(e.target.value) || 1) })}
                              style={{ width: "50px", background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: "5px", padding: "4px 6px", color: "#f8fafc", fontSize: "12px", fontWeight: 700, textAlign: "center", outline: "none" }}
                            />
                            <span style={{ fontSize: "11px", color: "#94a3b8" }}>phút</span>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ fontSize: "11px", color: "#fbbf24", fontWeight: 700 }}>➔ Ra:</span>
                            <input
                              type="number"
                              min={1}
                              max={60}
                              value={rule.targetOutputMinutes}
                              onChange={(e) => handleUpdateDurationRule(rule.id, { targetOutputMinutes: Math.max(1, Math.min(60, Number(e.target.value) || 1)) })}
                              style={{ width: "46px", background: "rgba(245, 158, 11, 0.15)", border: "1px solid rgba(245, 158, 11, 0.5)", borderRadius: "5px", padding: "4px 6px", color: "#fbbf24", fontWeight: 800, fontSize: "12.5px", textAlign: "center", outline: "none" }}
                            />
                            <span style={{ fontSize: "11px", color: "#fbbf24", fontWeight: 700 }}>phút</span>
                          </div>

                          <span style={{ fontSize: "11px", color: "#cbd5e1" }}>
                            ~{rule.targetOutputMinutes * 280} từ thoại
                          </span>

                          <div style={{ textAlign: "center" }}>
                            <button
                              type="button"
                              onClick={() => handleDeleteDurationRule(rule.id)}
                              title="Xóa quy tắc này"
                              style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.25)", color: "#f87171", borderRadius: "5px", width: "26px", height: "26px", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.15s ease" }}
                            >
                              <Trash3Fill size={11} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "2px" }}>
                    <button
                      type="button"
                      onClick={handleAddDurationRule}
                      style={{ background: "rgba(245, 158, 11, 0.12)", border: "1px solid rgba(245, 158, 11, 0.3)", color: "#fbbf24", padding: "5px 12px", borderRadius: "6px", fontSize: "11.5px", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "5px" }}
                    >
                      <PlusLg size={11} /> Thêm dải thời lượng mới
                    </button>

                    <button
                      type="button"
                      onClick={handleResetDurationRules}
                      style={{ background: "none", border: "none", color: "#64748b", fontSize: "11px", cursor: "pointer", textDecoration: "underline" }}
                    >
                      ↺ Khôi phục 4 bậc mặc định
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(135px, 1fr))", gap: "8px", width: "100%", boxSizing: "border-box" }}>
                    {[
                      { key: "full", label: "🎬 Toàn Bộ", sub: "Theo video gốc" },
                      { key: "60s", label: "⚡ 60 Giây", sub: "Shorts / TikTok / Reels" },
                      { key: "3m", label: "⏱️ 3 Phút", sub: "Review ngắn gọn" },
                      { key: "5m", label: "⏱️ 5 Phút", sub: "Chuẩn Recap / Review" },
                      { key: "10m", label: "⏱️ 10 Phút", sub: "Phóng sự chuyên sâu" },
                      { key: "15m", label: "⏱️ 15 Phút", sub: "Review chi tiết toàn cảnh" },
                      { key: "custom", label: "✍️ Tùy Chỉnh", sub: "Nhập số phút mong muốn" },
                    ].map((dur) => {
                      const isSelected = targetDuration === dur.key;
                      return (
                        <button
                          key={dur.key}
                          type="button"
                          onClick={() => {
                            setTargetDuration(dur.key as any);
                            updateDurationMode("fixed");
                          }}
                          style={{
                            background: isSelected ? "rgba(217, 119, 6, 0.25)" : "rgba(10, 13, 20, 0.6)",
                            border: isSelected ? "1.5px solid #f59e0b" : "1px solid rgba(255,255,255,0.08)",
                            borderRadius: "8px",
                            padding: "8px 10px",
                            cursor: "pointer",
                            textAlign: "center",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <div style={{ fontSize: "11.5px", fontWeight: 700, color: isSelected ? "#fbbf24" : "#f8fafc" }}>
                            {dur.label}
                          </div>
                          <div style={{ fontSize: "10px", color: isSelected ? "#fde68a" : "#94a3b8", marginTop: "2px" }}>
                            {dur.sub}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {targetDuration === "custom" && (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(0,0,0,0.3)", padding: "8px 14px", borderRadius: "8px", border: "1px solid rgba(245, 158, 11, 0.3)" }}>
                      <span style={{ fontSize: "11.5px", color: "#cbd5e1" }}>Số phút mong muốn:</span>
                      <input
                        type="number"
                        min={1}
                        max={60}
                        value={customDurationMinutes}
                        onChange={(e) => setCustomDurationMinutes(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
                        style={{ width: "65px", background: "rgba(0,0,0,0.6)", border: "1px solid rgba(245, 158, 11, 0.5)", borderRadius: "5px", padding: "4px 8px", color: "#fbbf24", fontWeight: 800, fontSize: "12.5px", textAlign: "center", outline: "none" }}
                      />
                      <span style={{ fontSize: "11.5px", color: "#fbbf24", fontWeight: 700 }}>phút (~{customDurationMinutes * 280} từ thuyết minh)</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* SECTION 3: Preset Prompts Grid */}
            <div style={{ background: "rgba(18, 23, 35, 0.75)", border: "1px solid rgba(255, 255, 255, 0.09)", borderRadius: "12px", padding: "14px 16px", display: "flex", flexDirection: "column", gap: "10px", boxSizing: "border-box", width: "100%" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", minWidth: 0 }}>
                <span style={{ fontSize: "13px", fontWeight: 800, color: "#f8fafc", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Sliders size={15} color="#fbbf24" /> 3. Phong Cách Kịch Bản & Giọng Điệu
                </span>
                <button
                  type="button"
                  onClick={onOpenPromptModal}
                  style={{ background: "none", border: "none", color: "#fbbf24", fontSize: "11px", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}
                >
                  <PencilSquare size={11} /> Tùy chỉnh prompt kịch bản ↗
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "8px", width: "100%", boxSizing: "border-box" }}>
                {PRESET_PROMPTS.map((pr) => {
                  const isSelected = selectedPresetId === pr.id || defaultPrompt === pr.prompt;
                  return (
                    <div
                      key={pr.id}
                      onClick={() => handleSelectPreset(pr)}
                      style={{
                        background: isSelected ? "rgba(217, 119, 6, 0.22)" : "rgba(10, 13, 20, 0.6)",
                        border: isSelected ? "1.5px solid #f59e0b" : "1px solid rgba(255,255,255,0.07)",
                        borderRadius: "8px",
                        padding: "10px 12px",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                        boxShadow: isSelected ? "0 0 14px rgba(245, 158, 11, 0.25)" : "none",
                        minWidth: 0,
                        width: "100%",
                        boxSizing: "border-box",
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                        gap: "3px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "6px", minWidth: 0 }}>
                        <strong
                          title={pr.title}
                          style={{
                            fontSize: "12px",
                            color: isSelected ? "#fbbf24" : "#f1f5f9",
                            display: "block",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            flex: "1 1 0%",
                            minWidth: 0,
                          }}
                        >
                          {pr.title}
                        </strong>
                        {isSelected && (
                          <span
                            style={{
                              fontSize: "10.5px",
                              color: "#fbbf24",
                              fontWeight: 800,
                              background: "rgba(245, 158, 11, 0.18)",
                              border: "1px solid rgba(245, 158, 11, 0.4)",
                              borderRadius: "4px",
                              padding: "1px 5px",
                              flexShrink: 0,
                              lineHeight: 1.2,
                            }}
                          >
                            ✓
                          </span>
                        )}
                      </div>
                      <span
                        title={pr.desc}
                        style={{
                          fontSize: "10.5px",
                          color: isSelected ? "#fde68a" : "#94a3b8",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          lineHeight: 1.35,
                          wordBreak: "break-word",
                        }}
                      >
                        {pr.desc}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SECTION 4: Audio & Voice Controls */}
            <div style={{ background: "rgba(18, 23, 35, 0.75)", border: "1px solid rgba(255, 255, 255, 0.09)", borderRadius: "12px", padding: "13px 16px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "13px", fontWeight: 800, color: "#f8fafc", display: "flex", alignItems: "center", gap: "8px" }}>
                  <VolumeUpFill size={15} color="#fbbf24" /> 4. Tùy Chọn Giọng Đọc & Tách Âm Thanh Gốc
                </span>
                <span style={{ fontSize: "10.5px", color: narratorEnabled ? "#34d399" : "#60a5fa", fontWeight: 700 }}>
                  {narratorEnabled ? "🎙️ Có Lồng Tiếng Voice AI" : "🎬 Cắt Ghép Thuần Tiếng Gốc (Không Voice AI)"}
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "8px" }}>
                <label
                  style={{
                    background: narratorEnabled ? "rgba(59, 130, 246, 0.12)" : "rgba(255,255,255,0.03)",
                    border: narratorEnabled ? "1px solid rgba(59, 130, 246, 0.4)" : "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={narratorEnabled}
                    onChange={(e) => updateNarratorEnabled(e.target.checked)}
                    style={{ accentColor: "#3b82f6", width: "16px", height: "16px", marginTop: "2px", cursor: "pointer" }}
                  />
                  <div>
                    <strong style={{ fontSize: "12px", color: narratorEnabled ? "#60a5fa" : "#f8fafc", display: "block" }}>
                      🎙️ Bật giọng đọc Voice AI review
                    </strong>
                    <span style={{ fontSize: "10.5px", color: "#94a3b8", display: "block", marginTop: "2px" }}>
                      {narratorEnabled ? "Tạo voice AI đọc review theo kịch bản." : "TẮT: Chỉ cắt ghép các cảnh hay nhất & giữ 100% tiếng gốc."}
                    </span>
                  </div>
                </label>

                <label
                  style={{
                    background: removeOriginalBgm ? "rgba(168, 85, 247, 0.15)" : "rgba(255,255,255,0.03)",
                    border: removeOriginalBgm ? "1px solid rgba(168, 85, 247, 0.45)" : "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={removeOriginalBgm}
                    onChange={(e) => updateRemoveOriginalBgm(e.target.checked)}
                    style={{ accentColor: "#a855f7", width: "16px", height: "16px", marginTop: "2px", cursor: "pointer" }}
                  />
                  <div>
                    <strong style={{ fontSize: "12px", color: removeOriginalBgm ? "#c084fc" : "#f8fafc", display: "block" }}>
                      🎼 AI Vocal & SFX Remover (Tách sạch Nhạc nền gốc)
                    </strong>
                    <span style={{ fontSize: "10.5px", color: "#94a3b8", display: "block", marginTop: "2px" }}>
                      Bóc tách triệt để bài nhạc nền cũ bằng thuật toán triệt pha AI, giữ trọn vẹn 100% tiếng nói nhân vật, tiếng còi hú, tiếng súng & hiện trường.
                    </span>
                  </div>
                </label>

                {narratorEnabled && (
                  <label
                    style={{
                      background: interweaveAudio ? "rgba(245, 158, 11, 0.12)" : "rgba(255,255,255,0.03)",
                      border: interweaveAudio ? "1px solid rgba(245, 158, 11, 0.4)" : "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "8px",
                      padding: "8px 12px",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "10px",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={interweaveAudio}
                      onChange={(e) => updateInterweaveAudio(e.target.checked)}
                      style={{ accentColor: "#f59e0b", width: "16px", height: "16px", marginTop: "2px", cursor: "pointer" }}
                    />
                    <div>
                      <strong style={{ fontSize: "12px", color: interweaveAudio ? "#fbbf24" : "#f8fafc", display: "block" }}>
                        🎧 Đan tiếng gốc (~20% nền)
                      </strong>
                      <span style={{ fontSize: "10.5px", color: "#94a3b8", display: "block", marginTop: "2px" }}>
                        Giữ âm thanh hiện trường làm nền chạy bên dưới giọng đọc Voice AI.
                      </span>
                    </div>
                  </label>
                )}

                <label
                  style={{
                    background: emphasizeHook ? "rgba(239, 68, 68, 0.12)" : "rgba(255,255,255,0.03)",
                    border: emphasizeHook ? "1px solid rgba(239, 68, 68, 0.4)" : "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={emphasizeHook}
                    onChange={(e) => updateEmphasizeHook(e.target.checked)}
                    style={{ accentColor: "#ef4444", width: "16px", height: "16px", marginTop: "2px", cursor: "pointer" }}
                  />
                  <div>
                    <strong style={{ fontSize: "12px", color: emphasizeHook ? "#fca5a5" : "#f8fafc", display: "block" }}>
                      🚨 Hook: Cao trào mở màn
                    </strong>
                    <span style={{ fontSize: "10.5px", color: "#94a3b8", display: "block", marginTop: "2px" }}>
                      Cảnh 1 giữ 100% tiếng gốc & kịch tính để hút người xem ngay 5-10s đầu.
                    </span>
                  </div>
                </label>

                <label
                  style={{
                    background: autoDucking ? "rgba(16, 185, 129, 0.12)" : "rgba(255,255,255,0.03)",
                    border: autoDucking ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={autoDucking}
                    onChange={(e) => updateAutoDucking(e.target.checked)}
                    style={{ accentColor: "#10b981", width: "16px", height: "16px", marginTop: "2px", cursor: "pointer" }}
                  />
                  <div>
                    <strong style={{ fontSize: "12px", color: autoDucking ? "#6ee7b7" : "#f8fafc", display: "block" }}>
                      🎵 Nhạc nền tự né (Ducking)
                    </strong>
                    <span style={{ fontSize: "10.5px", color: "#94a3b8", display: "block", marginTop: "2px" }}>
                      Tự hạ âm lượng nhạc nền/tiếng video khi có Voice AI và nâng lên khi ngắt câu.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* SECTION 5: Language Selection */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(18, 23, 35, 0.75)", border: "1px solid rgba(255, 255, 255, 0.09)", borderRadius: "12px", padding: "11px 16px", gap: "12px" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#cbd5e1", whiteSpace: "nowrap" }}>
                🌐 5. Ngôn ngữ kịch bản đầu ra:
              </span>
              <select
                value={defaultLanguage}
                onChange={(e) => setDefaultLanguage(e.target.value)}
                style={{ flex: 1, maxWidth: "280px", background: "rgba(0,0,0,0.55)", border: "1px solid rgba(255, 255, 255, 0.15)", borderRadius: "6px", padding: "6px 10px", color: "#f8fafc", fontSize: "12px", outline: "none", cursor: "pointer" }}
              >
                {ANALYSIS_LANGUAGES.map(([code, name]) => (
                  <option key={code} value={code}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Modal Footer */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.08)", padding: "14px 24px", background: "rgba(18, 22, 34, 0.85)", flexShrink: 0 }}>
            <span style={{ fontSize: "11.5px", color: "#94a3b8" }}>
              {useProviderPool ? `⚡ Tự động luân chuyển ${activeProviderPool.length} Model (${batchConcurrency} luồng song song)` : `⚡ Chạy theo Model đã chọn`}
            </span>
            <div style={{ display: "flex", gap: "10px", flexShrink: 0 }}>
              <button
                type="button"
                onClick={onClose}
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#e2e8f0", padding: "8px 18px", borderRadius: "8px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
              >
                Hủy Bỏ
              </button>
              <button
                type="submit"
                style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)", color: "#12151f", border: "none", padding: "8px 24px", borderRadius: "8px", fontSize: "12.5px", fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", boxShadow: "0 0 18px rgba(245, 158, 11, 0.45)" }}
              >
                <LightningChargeFill size={13} /> {analysisTargetJob ? "Bắt Đầu Phân Tích Video Này" : `Bắt Đầu Phân Tích (${selectedJobIds.size > 0 ? selectedJobIds.size : sourceCandidates.length} Video)`}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
