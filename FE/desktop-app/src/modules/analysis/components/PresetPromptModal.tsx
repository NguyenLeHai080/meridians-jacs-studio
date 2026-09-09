import React from "react";
import { PencilSquare, XLg } from "react-bootstrap-icons";
import { PRESET_PROMPTS, type PresetPrompt } from "../constants/prompts";

interface PresetPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPresetId: string;
  defaultPrompt: string;
  setDefaultPrompt: (val: string) => void;
  setSelectedPresetId: (val: string) => void;
  handleSelectPreset: (preset: PresetPrompt) => void;
  onSaveToast: (msg: string) => void;
}

export const PresetPromptModal: React.FC<PresetPromptModalProps> = ({
  isOpen,
  onClose,
  selectedPresetId,
  defaultPrompt,
  setDefaultPrompt,
  setSelectedPresetId,
  handleSelectPreset,
  onSaveToast,
}) => {
  if (!isOpen) return null;

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
        zIndex: 999999,
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
          padding: "20px 24px",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingBottom: "14px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            marginBottom: "14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: "rgba(245, 158, 11, 0.15)",
                color: "#fbbf24",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid rgba(245, 158, 11, 0.3)",
              }}
            >
              <PencilSquare size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#f8fafc", margin: 0 }}>
                Tùy Chỉnh Prompt & Cấu Trúc Kịch Bản AI
              </h3>
              <span style={{ fontSize: "11.5px", color: "#94a3b8" }}>
                Cấu hình prompt mẫu hướng dẫn AI bóc tách ngữ cảnh, thời gian, hành động và lời kể chuyện
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

        {/* Body */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            paddingRight: "4px",
          }}
        >
          {/* Style selection chips */}
          <div style={{ width: "100%", boxSizing: "border-box" }}>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: 700,
                color: "#cbd5e1",
                marginBottom: "6px",
              }}
            >
              🎯 CHỌN PHONG CÁCH KỊCH BẢN MẪU (PRESET)
            </label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: "8px",
                width: "100%",
                boxSizing: "border-box",
              }}
            >
              {PRESET_PROMPTS.map((pr) => {
                const isSelected = selectedPresetId === pr.id || defaultPrompt === pr.prompt;
                return (
                  <div
                    key={pr.id}
                    onClick={() => handleSelectPreset(pr)}
                    style={{
                      background: isSelected ? "rgba(217, 119, 6, 0.22)" : "rgba(26, 30, 43, 0.5)",
                      border: isSelected ? "1.5px solid #f59e0b" : "1px solid rgba(255,255,255,0.06)",
                      borderRadius: "8px",
                      padding: "9px 11px",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      boxShadow: isSelected ? "0 0 12px rgba(245, 158, 11, 0.2)" : "none",
                      minWidth: 0,
                      width: "100%",
                      boxSizing: "border-box",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "3px",
                        minWidth: 0,
                      }}
                    >
                      <strong
                        style={{
                          fontSize: "11.5px",
                          color: isSelected ? "#fbbf24" : "#f1f5f9",
                          display: "block",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          flex: "1 1 0%",
                          minWidth: 0,
                          paddingRight: "4px",
                        }}
                      >
                        {pr.title}
                      </strong>
                      {isSelected && (
                        <span style={{ fontSize: "11px", color: "#fbbf24", fontWeight: 800, flexShrink: 0 }}>✓</span>
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: "10px",
                        color: "#94a3b8",
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

          {/* Master Prompt Textarea */}
          <div
            style={{
              background: "rgba(18, 22, 32, 0.95)",
              border: "1.5px solid rgba(245, 158, 11, 0.5)",
              borderRadius: "10px",
              padding: "14px 16px",
              boxShadow: "0 0 20px rgba(245, 158, 11, 0.12)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "8px",
                flexWrap: "wrap",
                gap: "6px",
              }}
            >
              <label
                style={{
                  fontSize: "13px",
                  fontWeight: 800,
                  color: "#fbbf24",
                  textTransform: "uppercase",
                  letterSpacing: "0.3px",
                  margin: 0,
                }}
              >
                ✍️ PROMPT ĐIỀU KHIỂN AI CHI TIẾT (SYSTEM PROMPT)
              </label>
              <button
                type="button"
                onClick={() => {
                  handleSelectPreset(PRESET_PROMPTS[0]);
                  onSaveToast("✓ Đã khôi phục prompt chuẩn Cops & Biên Kịch 3 Hồi");
                }}
                style={{
                  background: "rgba(245, 158, 11, 0.12)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  color: "#fbbf24",
                  padding: "3px 8px",
                  borderRadius: "4px",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Khôi phục prompt mặc định
              </button>
            </div>
            <textarea
              rows={13}
              value={defaultPrompt}
              onChange={(e) => {
                const val = e.target.value;
                setDefaultPrompt(val);
                setSelectedPresetId("__custom__");
                try {
                  localStorage.setItem("jacs_default_prompt", val);
                  localStorage.setItem("jacs_selected_preset_id", "__custom__");
                } catch {}
              }}
              placeholder="Nội dung prompt phân tích chi tiết..."
              style={{
                width: "100%",
                minHeight: "220px",
                background: "rgba(0, 0, 0, 0.55)",
                border: "1px solid rgba(245, 158, 11, 0.35)",
                borderRadius: "8px",
                padding: "10px 12px",
                color: "#f8fafc",
                fontSize: "12.5px",
                lineHeight: 1.5,
                fontFamily: "monospace",
                outline: "none",
                resize: "vertical",
                boxShadow: "inset 0 2px 6px rgba(0,0,0,0.5)",
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 20px",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(26, 30, 43, 0.7)",
            marginTop: "10px",
          }}
        >
          <span style={{ fontSize: "11px", color: "#64748b" }}>
            Prompt sẽ được áp dụng cho các lần phân tích video tiếp theo
          </span>
          <div style={{ display: "flex", gap: "8px" }}>
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
              Đóng
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onSaveToast("✓ Đã lưu prompt kịch bản thành công!");
              }}
              style={{
                background: "linear-gradient(135deg, #d97706, #f59e0b)",
                color: "#12151f",
                border: "none",
                padding: "6px 18px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Lưu Cấu Hình
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
