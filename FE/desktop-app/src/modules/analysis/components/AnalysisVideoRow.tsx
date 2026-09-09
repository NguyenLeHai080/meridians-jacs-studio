import React from "react";
import {
  CheckCircleFill,
  ChevronDown,
  ChevronRight,
  ClockFill,
  CollectionPlayFill,
  EyeFill,
  Film,
  LightningChargeFill,
  Trash3Fill,
  XCircleFill,
} from "react-bootstrap-icons";
import type { AnalysisScene, Job } from "../../../core/types";
import { formatAiScore, formatDuration, formatTokenUsage } from "../utils/analysisHelpers";
import { AnalysisSceneList } from "./AnalysisSceneList";

interface AnalysisVideoRowProps {
  job: Job;
  isExpanded: boolean;
  isSelected: boolean;
  isRunning: boolean;
  prog: { progress: number; stage: string };
  currentScenePage: number;
  scenesPerPage: number;
  onToggleSelect: (jobId: string) => void;
  onToggleExpand: (jobId: string) => void;
  onOpenPreviewPlayer: (job: Job) => void;
  onOpenAnalysisConfigForJob: (job: Job) => void;
  onExportToTimeline: (job: Job) => void;
  onExportToStory: (job: Job) => void;
  onDeleteJob: (jobId: string, name: string) => void;
  onSetScenePage: (jobId: string, page: number) => void;
  onUpdateJob?: (jobId: string, values: Partial<Job>) => void;
  playingVoiceKey: string | null;
  loadingVoiceKey: string | null;
  onPlaySceneVoice: (text: string, voiceKey: string, voiceName?: string) => void;
  onEditScene: (scene: AnalysisScene, idx: number) => void;
  onExportSingleSceneToTimeline: (job: Job, scene: AnalysisScene, idx: number) => void;
  onDeleteScene: (jobId: string, idx: number) => void;
  showToast: (msg: string) => void;
}

export const AnalysisVideoRow: React.FC<AnalysisVideoRowProps> = ({
  job,
  isExpanded,
  isSelected,
  isRunning,
  prog,
  currentScenePage,
  scenesPerPage,
  onToggleSelect,
  onToggleExpand,
  onOpenPreviewPlayer,
  onOpenAnalysisConfigForJob,
  onExportToTimeline,
  onExportToStory,
  onDeleteJob,
  onSetScenePage,
  onUpdateJob,
  playingVoiceKey,
  loadingVoiceKey,
  onPlaySceneVoice,
  onEditScene,
  onExportSingleSceneToTimeline,
  onDeleteScene,
  showToast,
}) => {
  const isCompleted = job.status === "completed" || Boolean(job.analysis?.scenes?.length);
  const isFailed = job.status === "failed";
  const scenes = job.analysis?.scenes || [];
  const tokenInfo = formatTokenUsage(job);

  return (
    <div style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}>
      {/* Level 1: Parent Video Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "36px 36px minmax(240px, 1.8fr) 150px 140px 90px 220px",
          padding: "10px 14px",
          alignItems: "center",
          background: isRunning
            ? "rgba(245, 158, 11, 0.05)"
            : isSelected
            ? "rgba(217, 119, 6, 0.08)"
            : isExpanded
            ? "rgba(255, 255, 255, 0.02)"
            : "transparent",
          transition: "background 0.2s ease",
        }}
      >
        {/* Select Checkbox */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(job.id)}
            style={{ cursor: "pointer" }}
          />
        </div>

        {/* Expand Chevron */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <button
            type="button"
            onClick={() => onToggleExpand(job.id)}
            style={{
              background: isExpanded ? "rgba(245, 158, 11, 0.15)" : "rgba(255,255,255,0.06)",
              color: isExpanded ? "#fbbf24" : "#94a3b8",
              border: "1px solid rgba(255,255,255,0.1)",
              width: "26px",
              height: "26px",
              borderRadius: "5px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
            title={isExpanded ? "Thu gọn phân cảnh" : "Mở rộng phân cảnh"}
          >
            {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>
        </div>

        {/* Video Info & Thumbnail */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            minWidth: 0,
            paddingRight: "10px",
          }}
        >
          <div
            onClick={() => onOpenPreviewPlayer(job)}
            style={{
              width: "48px",
              height: "32px",
              borderRadius: "5px",
              background: "#10131c",
              border: "1px solid rgba(255,255,255,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fbbf24",
              cursor: "pointer",
              flexShrink: 0,
              transition: "transform 0.15s ease",
            }}
            title="Bấm để mở trình phát video và xem kịch bản đồng bộ"
          >
            <Film size={15} />
          </div>

          <div style={{ minWidth: 0 }}>
            <strong
              onClick={() => onOpenPreviewPlayer(job)}
              style={{
                fontSize: "12.5px",
                color: "#f8fafc",
                display: "block",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                cursor: "pointer",
              }}
              title={job.name}
            >
              {job.name}
            </strong>
            <div
              style={{
                fontSize: "10.5px",
                color: "#94a3b8",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginTop: "2px",
              }}
            >
              <span style={{ fontFamily: "monospace", color: "#fbbf24" }}>
                ⏱️ {formatDuration(job.durationSeconds)}
              </span>
              <span>•</span>
              <span
                style={{
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: "260px",
                }}
                title={job.localPath || job.source}
              >
                {job.localPath || job.source}
              </span>
            </div>
          </div>
        </div>

        {/* Status Badge & Live Progress */}
        <div style={{ paddingRight: "8px" }}>
          {isRunning ? (
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "10.5px",
                  fontWeight: 700,
                  color: "#fbbf24",
                  marginBottom: "3px",
                }}
              >
                <span>⚡ Đang phân tích...</span>
                <span>{prog.progress}%</span>
              </div>
              <div
                style={{
                  width: "100%",
                  height: "4px",
                  background: "rgba(0,0,0,0.4)",
                  borderRadius: "10px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${prog.progress}%`,
                    height: "100%",
                    background: "linear-gradient(90deg, #d97706, #f59e0b)",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: "9.5px",
                  color: "#64748b",
                  marginTop: "2px",
                  display: "block",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {prog.stage || "Đang xử lý khung hình..."}
              </span>
            </div>
          ) : isCompleted ? (
            <div>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  background: "rgba(245, 158, 11, 0.12)",
                  border: "1px solid rgba(245, 158, 11, 0.25)",
                  color: "#fbbf24",
                  padding: "2px 7px",
                  borderRadius: "5px",
                  fontSize: "11px",
                  fontWeight: 700,
                }}
              >
                <CheckCircleFill size={10} /> Đã Phân Tích
              </span>
              <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>
                {scenes.length} phân cảnh trích xuất
              </div>
            </div>
          ) : isFailed ? (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.35)",
                color: "#f87171",
                padding: "2px 7px",
                borderRadius: "5px",
                fontSize: "11px",
                fontWeight: 700,
              }}
            >
              <XCircleFill size={10} /> Lỗi phân tích
            </span>
          ) : (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                color: "#94a3b8",
                padding: "2px 7px",
                borderRadius: "5px",
                fontSize: "11px",
                fontWeight: 700,
              }}
            >
              <ClockFill size={10} /> Chờ phân tích
            </span>
          )}
        </div>

        {/* Token / Credit Consumption Column */}
        <div>
          <div
            style={{
              fontSize: "11.5px",
              fontWeight: 800,
              color: tokenInfo.isUsed ? "#fbbf24" : "#64748b",
            }}
          >
            {tokenInfo.text}
          </div>
          <div
            style={{
              fontSize: "10px",
              color: tokenInfo.isUsed ? "#94a3b8" : "#475569",
              fontWeight: 600,
            }}
          >
            {tokenInfo.subText}
          </div>
        </div>

        {/* AI Score */}
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: "12.5px",
              fontWeight: 800,
              color: isCompleted ? "#fbbf24" : "#64748b",
            }}
          >
            ⭐ {formatAiScore(job.analysis?.score)}
          </div>
        </div>

        {/* Row Actions */}
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "5px" }}>
          {/* Run Single Analysis Button */}
          <button
            type="button"
            onClick={() => onOpenAnalysisConfigForJob(job)}
            disabled={isRunning}
            style={{
              background: isCompleted
                ? "rgba(245, 158, 11, 0.12)"
                : "linear-gradient(135deg, #d97706, #f59e0b)",
              color: isCompleted ? "#fbbf24" : "#12151f",
              border: isCompleted ? "1px solid rgba(245, 158, 11, 0.3)" : "none",
              padding: "4px 8px",
              borderRadius: "5px",
              fontSize: "11px",
              fontWeight: 700,
              cursor: isRunning ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
            title="Cài đặt mô hình AI & phong cách để phân tích video này"
          >
            <LightningChargeFill size={11} />{" "}
            {isRunning ? "Đang chạy..." : isCompleted ? "Chạy lại" : "Phân tích"}
          </button>

          {/* Export to Timeline */}
          {isCompleted && (
            <button
              type="button"
              onClick={() => onExportToTimeline(job)}
              style={{
                background: "rgba(245, 158, 11, 0.12)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                color: "#fbbf24",
                padding: "4px 8px",
                borderRadius: "5px",
                fontSize: "11px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
              title="Chuyển sang bàn dựng Timeline"
            >
              <CollectionPlayFill size={11} /> Timeline
            </button>
          )}

          {/* View Player */}
          <button
            type="button"
            onClick={() => onOpenPreviewPlayer(job)}
            style={{
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: "#e2e8f0",
              padding: "4px 7px",
              borderRadius: "5px",
              fontSize: "11px",
              cursor: "pointer",
            }}
            title="Xem trước Video Player"
          >
            <EyeFill size={12} />
          </button>

          {/* Delete */}
          <button
            type="button"
            onClick={() => onDeleteJob(job.id, job.name)}
            style={{
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.25)",
              color: "#f87171",
              padding: "4px 7px",
              borderRadius: "5px",
              fontSize: "11px",
              cursor: "pointer",
            }}
            title="Xóa video khỏi danh sách"
          >
            <Trash3Fill size={11} />
          </button>
        </div>
      </div>

      {/* Level 2: Nested Child Scenes Table */}
      {isExpanded && (
        <AnalysisSceneList
          job={job}
          scenes={scenes}
          currentScenePage={currentScenePage}
          scenesPerPage={scenesPerPage}
          onSetScenePage={onSetScenePage}
          onExportToTimeline={onExportToTimeline}
          onExportToStory={onExportToStory}
          onOpenAnalysisConfigForJob={onOpenAnalysisConfigForJob}
          onUpdateJob={onUpdateJob}
          playingVoiceKey={playingVoiceKey}
          loadingVoiceKey={loadingVoiceKey}
          onPlaySceneVoice={onPlaySceneVoice}
          onEditScene={onEditScene}
          onExportSingleSceneToTimeline={onExportSingleSceneToTimeline}
          onDeleteScene={onDeleteScene}
          showToast={showToast}
        />
      )}
    </div>
  );
};
