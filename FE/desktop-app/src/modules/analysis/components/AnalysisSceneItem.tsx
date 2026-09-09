import React from "react";
import {
  ArrowRepeat,
  ChatQuoteFill,
  PauseFill,
  PencilSquare,
  Scissors,
  Trash3Fill,
  VolumeUpFill,
} from "react-bootstrap-icons";
import type { AnalysisScene, Job } from "../../../core/types";

interface AnalysisSceneItemProps {
  job: Job;
  scene: AnalysisScene;
  idx: number;
  isPlayingThis: boolean;
  isLoadingThis: boolean;
  onPlaySceneVoice: (text: string, voiceKey: string, voiceName?: string) => void;
  onEditScene: (scene: AnalysisScene, idx: number) => void;
  onExportSingleSceneToTimeline: (job: Job, scene: AnalysisScene, idx: number) => void;
  onDeleteScene: (jobId: string, idx: number) => void;
}

export const AnalysisSceneItem: React.FC<AnalysisSceneItemProps> = ({
  job,
  scene,
  idx,
  isPlayingThis,
  isLoadingThis,
  onPlaySceneVoice,
  onEditScene,
  onExportSingleSceneToTimeline,
  onDeleteScene,
}) => {
  const voiceKey = `${job.id}-${idx}`;
  const voiceText = scene.voiceover || scene.translation || scene.detail || "";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "55px 120px 1fr 1.2fr 110px 120px",
        background: "rgba(26, 30, 43, 0.6)",
        border: "1px solid rgba(255, 255, 255, 0.06)",
        borderRadius: "6px",
        padding: "8px 12px",
        alignItems: "center",
        gap: "10px",
        transition: "all 0.15s ease",
      }}
    >
      {/* Scene ID */}
      <div>
        <span
          style={{
            fontSize: "10.5px",
            fontWeight: 800,
            background: "rgba(245, 158, 11, 0.15)",
            color: "#fbbf24",
            padding: "1px 5px",
            borderRadius: "3px",
            display: "inline-block",
          }}
        >
          #{String(idx + 1).padStart(2, "0")}
        </span>
      </div>

      {/* Timestamp & Duration */}
      <div>
        <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#f8fafc", fontFamily: "monospace" }}>
          {scene.start} ➔ {scene.end || "00:15"}
        </div>
        <span style={{ fontSize: "9.5px", color: "#64748b" }}>
          ⏱️ {scene.end ? "15.0s" : "Đoạn cắt"}
        </span>
      </div>

      {/* Visual Context Description */}
      <div style={{ minWidth: 0 }}>
        <strong
          style={{
            fontSize: "12px",
            color: "#f1f5f9",
            display: "block",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {scene.title || `Phân cảnh #${idx + 1}`}
        </strong>
        <p
          style={{
            fontSize: "11px",
            color: "#94a3b8",
            margin: "1px 0 0",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            lineHeight: 1.35,
          }}
        >
          {scene.detail || "Đang trích xuất hành động và bối cảnh nhân vật..."}
        </p>
      </div>

      {/* AI Voiceover Script */}
      <div
        style={{
          minWidth: 0,
          background: "rgba(0,0,0,0.25)",
          padding: "5px 8px",
          borderRadius: "5px",
          border: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div
          style={{
            fontSize: "9.5px",
            fontWeight: 700,
            color: "#fbbf24",
            marginBottom: "1px",
            display: "flex",
            alignItems: "center",
            gap: "3px",
          }}
        >
          <ChatQuoteFill size={9} /> LỜI THOẠI LỒNG TIẾNG AI:
        </div>
        <p
          style={{
            fontSize: "11px",
            color: "#e2e8f0",
            margin: 0,
            fontStyle: "italic",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          "{voiceText || "Chưa có lời thoại thuyết minh..."}"
        </p>
      </div>

      {/* Scene Tag */}
      <div>
        <span
          style={{
            fontSize: "10px",
            fontWeight: 700,
            background: idx === 0 ? "rgba(245, 158, 11, 0.15)" : "rgba(255, 255, 255, 0.05)",
            color: idx === 0 ? "#fbbf24" : "#cbd5e1",
            border: idx === 0 ? "1px solid rgba(245, 158, 11, 0.3)" : "1px solid rgba(255, 255, 255, 0.08)",
            padding: "2px 7px",
            borderRadius: "6px",
            display: "inline-block",
            whiteSpace: "nowrap",
          }}
        >
          {idx === 0 ? "🎯 Hook Mở Đầu" : idx % 3 === 0 ? "🔥 Cao Trào" : "📖 Kể Chuyện"}
        </span>
      </div>

      {/* Scene Actions */}
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "5px" }}>
        {/* TTS Preview Button */}
        <button
          type="button"
          onClick={() => onPlaySceneVoice(voiceText, voiceKey, job.narratorVoice)}
          disabled={!voiceText || isLoadingThis}
          style={{
            background: isPlayingThis ? "#ef4444" : "rgba(245, 158, 11, 0.12)",
            border: "1px solid rgba(245, 158, 11, 0.25)",
            color: isPlayingThis ? "#fff" : "#fbbf24",
            width: "25px",
            height: "25px",
            borderRadius: "5px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
          title={isPlayingThis ? "Dừng giọng đọc" : "Nghe thử giọng đọc AI"}
        >
          {isLoadingThis ? (
            <ArrowRepeat size={11} className="animate-spin" />
          ) : isPlayingThis ? (
            <PauseFill size={12} />
          ) : (
            <VolumeUpFill size={12} />
          )}
        </button>

        {/* Edit Scene Modal */}
        <button
          type="button"
          onClick={() => onEditScene(scene, idx)}
          style={{
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            color: "#e2e8f0",
            width: "25px",
            height: "25px",
            borderRadius: "5px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
          title="Chỉnh sửa chi tiết phân cảnh & lời thoại"
        >
          <PencilSquare size={11} />
        </button>

        {/* Send Scene to Timeline */}
        <button
          type="button"
          onClick={() => onExportSingleSceneToTimeline(job, scene, idx)}
          style={{
            background: "rgba(245, 158, 11, 0.12)",
            border: "1px solid rgba(245, 158, 11, 0.25)",
            color: "#fbbf24",
            width: "25px",
            height: "25px",
            borderRadius: "5px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
          title="Đưa riêng phân cảnh này vào Timeline"
        >
          <Scissors size={11} />
        </button>

        {/* Delete Scene */}
        <button
          type="button"
          onClick={() => onDeleteScene(job.id, idx)}
          style={{
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            color: "#f87171",
            width: "25px",
            height: "25px",
            borderRadius: "5px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
          title="Xóa phân cảnh này"
        >
          <Trash3Fill size={11} />
        </button>
      </div>
    </div>
  );
};
