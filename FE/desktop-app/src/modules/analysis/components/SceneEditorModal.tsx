import React from "react";
import { Check2, PencilSquare, VolumeUpFill, XLg } from "react-bootstrap-icons";
import type { AnalysisScene } from "../../../core/types";

interface SceneEditorModalProps {
  editingSceneInfo: {
    jobId: string;
    sceneIdx: number;
    scene: AnalysisScene;
  } | null;
  onClose: () => void;
  setEditingSceneInfo: React.Dispatch<
    React.SetStateAction<{
      jobId: string;
      sceneIdx: number;
      scene: AnalysisScene;
    } | null>
  >;
  onSave: (scene: AnalysisScene) => void;
  onPlaySceneVoice: (text: string, voiceKey: string) => void;
}

export const SceneEditorModal: React.FC<SceneEditorModalProps> = ({
  editingSceneInfo,
  onClose,
  setEditingSceneInfo,
  onSave,
  onPlaySceneVoice,
}) => {
  if (!editingSceneInfo) return null;

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
        zIndex: 99999,
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "#10131c",
          border: "1px solid rgba(245, 158, 11, 0.35)",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "560px",
          padding: "20px",
          boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
        }}
      >
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
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <PencilSquare size={16} color="#fbbf24" />
            <h3 style={{ fontSize: "15px", fontWeight: 800, color: "#f8fafc", margin: 0 }}>
              Chỉnh Sửa Phân Cảnh #{editingSceneInfo.sceneIdx + 1}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
          >
            <XLg size={15} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Timestamps */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "11.5px",
                  fontWeight: 700,
                  color: "#cbd5e1",
                  marginBottom: "3px",
                }}
              >
                BẮT ĐẦU (START)
              </label>
              <input
                type="text"
                value={editingSceneInfo.scene.start}
                onChange={(e) =>
                  setEditingSceneInfo({
                    ...editingSceneInfo,
                    scene: { ...editingSceneInfo.scene, start: e.target.value },
                  })
                }
                style={{
                  width: "100%",
                  background: "rgba(0,0,0,0.35)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "6px",
                  padding: "6px 10px",
                  color: "#f8fafc",
                  fontSize: "12px",
                  fontFamily: "monospace",
                  outline: "none",
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "11.5px",
                  fontWeight: 700,
                  color: "#cbd5e1",
                  marginBottom: "3px",
                }}
              >
                KẾT THÚC (END)
              </label>
              <input
                type="text"
                value={editingSceneInfo.scene.end || ""}
                onChange={(e) =>
                  setEditingSceneInfo({
                    ...editingSceneInfo,
                    scene: { ...editingSceneInfo.scene, end: e.target.value },
                  })
                }
                placeholder="00:15"
                style={{
                  width: "100%",
                  background: "rgba(0,0,0,0.35)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "6px",
                  padding: "6px 10px",
                  color: "#f8fafc",
                  fontSize: "12px",
                  fontFamily: "monospace",
                  outline: "none",
                }}
              />
            </div>
          </div>

          {/* Title & Visual Details */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "11.5px",
                fontWeight: 700,
                color: "#cbd5e1",
                marginBottom: "3px",
              }}
            >
              TIÊU ĐỀ & NGỮ CẢNH HÌNH ẢNH (VISUAL CONTEXT)
            </label>
            <input
              type="text"
              value={editingSceneInfo.scene.title}
              onChange={(e) =>
                setEditingSceneInfo({
                  ...editingSceneInfo,
                  scene: { ...editingSceneInfo.scene, title: e.target.value },
                })
              }
              placeholder="Tiêu đề phân cảnh..."
              style={{
                width: "100%",
                background: "rgba(0,0,0,0.35)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "6px",
                padding: "6px 10px",
                color: "#f8fafc",
                fontSize: "12px",
                outline: "none",
                marginBottom: "5px",
              }}
            />
            <textarea
              rows={2}
              value={editingSceneInfo.scene.detail}
              onChange={(e) =>
                setEditingSceneInfo({
                  ...editingSceneInfo,
                  scene: { ...editingSceneInfo.scene, detail: e.target.value },
                })
              }
              placeholder="Mô tả hành động, diễn biến nhân vật trong cảnh này..."
              style={{
                width: "100%",
                background: "rgba(0,0,0,0.35)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "6px",
                padding: "6px 10px",
                color: "#f8fafc",
                fontSize: "12px",
                outline: "none",
                resize: "vertical",
              }}
            />
          </div>

          {/* AI Voiceover Script */}
          <div>
            <label
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "11.5px",
                fontWeight: 700,
                color: "#fbbf24",
                marginBottom: "3px",
              }}
            >
              <span>🎙️ LỜI THOẠI LỒNG TIẾNG AI CHO PHÂN CẢNH NÀY</span>
              <button
                type="button"
                onClick={() =>
                  onPlaySceneVoice(
                    editingSceneInfo.scene.voiceover || editingSceneInfo.scene.detail || "",
                    "modal-preview"
                  )
                }
                style={{
                  background: "none",
                  border: "none",
                  color: "#fbbf24",
                  cursor: "pointer",
                  fontSize: "11px",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: "3px",
                }}
              >
                <VolumeUpFill size={11} /> Nghe thử giọng đọc
              </button>
            </label>
            <textarea
              rows={3}
              value={editingSceneInfo.scene.voiceover || ""}
              onChange={(e) =>
                setEditingSceneInfo({
                  ...editingSceneInfo,
                  scene: { ...editingSceneInfo.scene, voiceover: e.target.value },
                })
              }
              placeholder="Nhập câu thoại thuyết minh cho phân cảnh này..."
              style={{
                width: "100%",
                background: "rgba(0,0,0,0.35)",
                border: "1px solid rgba(245, 158, 11, 0.4)",
                borderRadius: "6px",
                padding: "8px 10px",
                color: "#f8fafc",
                fontSize: "12px",
                outline: "none",
                resize: "vertical",
              }}
            />
          </div>

          {/* Modal Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "6px" }}>
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
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={() => onSave(editingSceneInfo.scene)}
              style={{
                background: "linear-gradient(135deg, #d97706, #f59e0b)",
                color: "#12151f",
                border: "none",
                padding: "6px 18px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 800,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <Check2 size={14} /> Lưu Thay Đổi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
