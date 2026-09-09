import React from "react";
import {
  ArrowRepeat,
  CpuFill,
  GearFill,
  KeyFill,
  LightningChargeFill,
  PencilSquare,
  PlusLg,
  Search,
  Stars,
  Trash3Fill,
  XLg,
} from "react-bootstrap-icons";
import type { Job, NavKey, ProviderProfile } from "../../../core/types";
import { PRESET_PROMPTS, SCENE_CATEGORIES, type PresetPrompt } from "../constants/prompts";

interface AnalysisToolbarProps {
  defaultProviderId: string;
  handleSelectProvider: (id: string) => void;
  configuredProviders: ProviderProfile[];
  selectedModel: string;
  selectedProvider: ProviderProfile | undefined;
  handleSelectModel: (m: string) => void;
  availableModels: { label: string; tag?: string }[];
  onOpenApiKeyModal: () => void;
  handleQuickSync: () => void;
  syncingQuick: boolean;
  onNavigate?: (key: NavKey) => void;
  defaultPrompt: string;
  setDefaultPrompt: (p: string) => void;
  onOpenPromptModal: () => void;
  onOpenAddModal: () => void;
  onOpenBatchAnalysisModal: () => void;
  selectedJobIds: Set<string>;
  setSelectedJobIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  sourceCandidates: Job[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filterStatus: "all" | "completed" | "running" | "queued" | "failed";
  setFilterStatus: (st: "all" | "completed" | "running" | "queued" | "failed") => void;
  filterCategory: string;
  setFilterCategory: (c: string) => void;
  sortBy: "latest" | "name" | "duration" | "scenes" | "score";
  setSortBy: (s: "latest" | "name" | "duration" | "scenes" | "score") => void;
  completedCount: number;
  runningCount: number;
  onDeleteSelected: () => void;
  showToast: (msg: string) => void;
}

export const AnalysisToolbar: React.FC<AnalysisToolbarProps> = ({
  defaultProviderId,
  handleSelectProvider,
  configuredProviders,
  selectedModel,
  selectedProvider,
  handleSelectModel,
  availableModels,
  onOpenApiKeyModal,
  handleQuickSync,
  syncingQuick,
  onNavigate,
  defaultPrompt,
  setDefaultPrompt,
  onOpenPromptModal,
  onOpenAddModal,
  onOpenBatchAnalysisModal,
  selectedJobIds,
  setSelectedJobIds,
  sourceCandidates,
  searchQuery,
  setSearchQuery,
  filterStatus,
  setFilterStatus,
  filterCategory,
  setFilterCategory,
  sortBy,
  setSortBy,
  completedCount,
  runningCount,
  onDeleteSelected,
  showToast,
}) => {
  return (
    <div
      style={{
        background: "rgba(18, 22, 32, 0.8)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: "8px",
        padding: "6px 12px",
        marginBottom: "6px",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        flexShrink: 0,
      }}
    >
      {/* Row 1: AI Model & Script Style & Action Buttons */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        {/* AI Model & Key Status */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0, flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 800,
              color: "#cbd5e1",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              textTransform: "uppercase",
              letterSpacing: "0.4px",
            }}
          >
            <CpuFill size={11} color="#fbbf24" /> AI MODEL:
          </span>

          <select
            value={defaultProviderId}
            onChange={(e) => handleSelectProvider(e.target.value)}
            style={{
              background: "#10131c",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "5px",
              padding: "4px 8px",
              color: "#f8fafc",
              fontSize: "11.5px",
              outline: "none",
              cursor: "pointer",
              maxWidth: "220px",
            }}
            title="Chọn Nhà cung cấp AI"
          >
            {configuredProviders.map((p) => {
              const name = p.name || p.providerType.toUpperCase();
              return (
                <option key={p.id} value={p.id}>
                  {name} {p.hasApiKey ? "🟢" : "🟡"} ({selectedModel || p.model})
                </option>
              );
            })}
          </select>

          {/* Quick Model Selector */}
          <select
            value={selectedModel || selectedProvider?.model || ""}
            onChange={(e) => handleSelectModel(e.target.value)}
            style={{
              background: "#10131c",
              border: "1px solid rgba(245, 158, 11, 0.25)",
              borderRadius: "5px",
              padding: "4px 8px",
              color: "#fbbf24",
              fontSize: "11.5px",
              fontWeight: 700,
              outline: "none",
              cursor: "pointer",
              maxWidth: "260px",
            }}
            title="Chọn Model chuyên phân tích video"
          >
            {availableModels.map((m) => (
              <option key={m.label} value={m.label}>
                {m.label} {m.tag ? `— ${m.tag}` : ""}
              </option>
            ))}
          </select>

          {/* Quick API Key Action */}
          {selectedProvider?.hasApiKey ? (
            <span
              style={{
                fontSize: "10px",
                color: "#fbbf24",
                background: "rgba(245, 158, 11, 0.1)",
                border: "1px solid rgba(245, 158, 11, 0.25)",
                padding: "2px 6px",
                borderRadius: "4px",
                fontWeight: 700,
              }}
              title={`API Key: ${selectedProvider.maskedKey}`}
            >
              ✓ Key Sẵn Sàng
            </span>
          ) : (
            <button
              type="button"
              onClick={onOpenApiKeyModal}
              style={{
                background: "rgba(245, 158, 11, 0.15)",
                border: "1px solid rgba(245, 158, 11, 0.4)",
                color: "#fbbf24",
                padding: "2px 8px",
                borderRadius: "4px",
                fontSize: "10.5px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "3px",
              }}
            >
              <KeyFill size={10} /> Nhập Key
            </button>
          )}

          <button
            type="button"
            onClick={handleQuickSync}
            disabled={syncingQuick}
            style={{
              background: "transparent",
              border: "none",
              color: syncingQuick ? "#fbbf24" : "#94a3b8",
              padding: "2px",
              cursor: syncingQuick ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
            }}
            title="Đồng bộ Model từ Cloud Admin"
          >
            <ArrowRepeat size={12} className={syncingQuick ? "animate-spin" : ""} />
          </button>

          <button
            type="button"
            onClick={() => onNavigate?.("settings")}
            style={{
              background: "transparent",
              border: "none",
              color: "#64748b",
              padding: "2px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
            title="Cài đặt Provider"
          >
            <GearFill size={11} />
          </button>
        </div>

        {/* Clean Script Style Dropdown */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0, flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: "10.5px",
              fontWeight: 800,
              color: "#94a3b8",
              display: "flex",
              alignItems: "center",
              gap: "3px",
              textTransform: "uppercase",
            }}
          >
            <Stars size={11} color="#fbbf24" /> KỊCH BẢN:
          </span>

          <select
            value={PRESET_PROMPTS.find((p) => p.prompt === defaultPrompt)?.id || PRESET_PROMPTS[0].id}
            onChange={(e) => {
              const found = PRESET_PROMPTS.find((p) => p.id === e.target.value);
              if (found) {
                setDefaultPrompt(found.prompt);
                showToast(`✓ Đã chọn phong cách: ${found.title}`);
              }
            }}
            style={{
              background: "#10131c",
              border: "1px solid rgba(245, 158, 11, 0.3)",
              borderRadius: "5px",
              padding: "4px 8px",
              color: "#fbbf24",
              fontSize: "11.5px",
              fontWeight: 700,
              outline: "none",
              cursor: "pointer",
              maxWidth: "320px",
            }}
            title="Chọn phong cách biên kịch phân cảnh"
          >
            {PRESET_PROMPTS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={onOpenPromptModal}
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: "#cbd5e1",
              padding: "4px 8px",
              borderRadius: "5px",
              fontSize: "11px",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              transition: "all 0.15s ease",
            }}
            title="Xem và chỉnh sửa prompt kịch bản chi tiết"
          >
            <PencilSquare size={11} color="#fbbf24" /> Tùy Chỉnh Prompt
          </button>
        </div>

        {/* Primary Action Buttons */}
        <div style={{ display: "flex", gap: "6px", alignItems: "center", flexShrink: 0 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onOpenAddModal}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#f8fafc",
              padding: "5px 11px",
              borderRadius: "6px",
              fontSize: "11.5px",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <PlusLg size={12} /> Thêm Video Nguồn
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={onOpenBatchAnalysisModal}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              background: "linear-gradient(135deg, #d97706, #f59e0b)",
              border: "none",
              color: "#12151f",
              padding: "5px 13px",
              borderRadius: "6px",
              fontSize: "11.5px",
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: "0 0 14px rgba(245, 158, 11, 0.35)",
              transition: "all 0.15s ease",
            }}
          >
            <LightningChargeFill size={12} /> Phân Tích Hàng Loạt (
            {selectedJobIds.size > 0 ? selectedJobIds.size : sourceCandidates.length})
          </button>
        </div>
      </div>

      {/* Row 2: Search, Status Pills & Sorting */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "8px",
          flexWrap: "wrap",
          borderTop: "1px solid rgba(255,255,255,0.05)",
          paddingTop: "7px",
        }}
      >
        {/* Search Box */}
        <div style={{ position: "relative", flex: "1 1 200px", maxWidth: "340px" }}>
          <Search
            size={12}
            style={{
              position: "absolute",
              left: "9px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#64748b",
            }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm tên video, kịch bản, cảnh..."
            style={{
              width: "100%",
              background: "rgba(0, 0, 0, 0.35)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "5px",
              padding: "4px 8px 4px 28px",
              color: "#f8fafc",
              fontSize: "11.5px",
              outline: "none",
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              style={{
                position: "absolute",
                right: "7px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: "#64748b",
                cursor: "pointer",
              }}
            >
              <XLg size={10} />
            </button>
          )}
        </div>

        {/* Filter Status Pills & Selects */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          <div
            style={{
              display: "flex",
              background: "rgba(0,0,0,0.3)",
              padding: "2px",
              borderRadius: "5px",
              border: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            {[
              { key: "all", label: `Tất Cả (${sourceCandidates.length})` },
              { key: "completed", label: `Đã Xong (${completedCount})` },
              { key: "running", label: `Đang Chạy (${runningCount})` },
              { key: "queued", label: "Chờ" },
            ].map((st) => (
              <button
                key={st.key}
                type="button"
                onClick={() => setFilterStatus(st.key as any)}
                style={{
                  background: filterStatus === st.key ? "rgba(245, 158, 11, 0.2)" : "transparent",
                  color: filterStatus === st.key ? "#fbbf24" : "#94a3b8",
                  border: filterStatus === st.key ? "1px solid rgba(245, 158, 11, 0.35)" : "1px solid transparent",
                  padding: "2px 7px",
                  borderRadius: "4px",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {st.label}
              </button>
            ))}
          </div>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            style={{
              background: "rgba(0,0,0,0.35)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "5px",
              padding: "3px 8px",
              color: "#f8fafc",
              fontSize: "11.5px",
              outline: "none",
              cursor: "pointer",
            }}
          >
            {SCENE_CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            style={{
              background: "rgba(0,0,0,0.35)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "5px",
              padding: "3px 8px",
              color: "#f8fafc",
              fontSize: "11.5px",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="latest">Mới nhất</option>
            <option value="name">Tên video (A-Z)</option>
            <option value="duration">Thời lượng</option>
            <option value="scenes">Số phân cảnh</option>
            <option value="score">Điểm AI cao nhất</option>
          </select>
        </div>
      </div>

      {/* Dynamic Batch Action Banner */}
      {selectedJobIds.size > 0 && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "linear-gradient(90deg, rgba(217, 119, 6, 0.15), rgba(245, 158, 11, 0.15))",
            border: "1px solid rgba(245, 158, 11, 0.4)",
            borderRadius: "6px",
            padding: "5px 10px",
            flexWrap: "wrap",
            gap: "6px",
            marginTop: "2px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", fontWeight: 800, color: "#fbbf24" }}>
              ✓ Đã chọn {selectedJobIds.size} video
            </span>
            <button
              type="button"
              onClick={() => setSelectedJobIds(new Set())}
              style={{
                background: "none",
                border: "none",
                color: "#94a3b8",
                fontSize: "11px",
                textDecoration: "underline",
                cursor: "pointer",
              }}
            >
              Bỏ chọn
            </button>
          </div>

          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={onOpenBatchAnalysisModal}
              style={{
                background: "linear-gradient(135deg, #d97706, #f59e0b)",
                color: "#12151f",
                border: "none",
                padding: "3px 10px",
                borderRadius: "5px",
                fontSize: "11px",
                fontWeight: 800,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <LightningChargeFill size={11} /> Phân Tích AI ({selectedJobIds.size})
            </button>
            <button
              type="button"
              onClick={onDeleteSelected}
              style={{
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.4)",
                color: "#f87171",
                padding: "3px 10px",
                borderRadius: "5px",
                fontSize: "11px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <Trash3Fill size={11} /> Xóa ({selectedJobIds.size})
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
