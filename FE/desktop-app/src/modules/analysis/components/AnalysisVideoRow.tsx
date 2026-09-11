import React from "react";
import {
  ArrowRepeat,
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
  onQueueToRender?: (job: Job) => void;
}

const formatAnalysisStage = (stage?: string) => {
  if (!stage) return "Đang phân tích dữ liệu video...";
  const s = stage.toLowerCase();
  if (s.includes("downloading") || s.includes("tải video")) return "Đang tải video...";
  if (s.includes("probing")) return "Đang đọc cấu trúc & âm thanh...";
  if (s.includes("extracting-frames") || s.includes("frames")) return "Đang bóc tách khung hình AI...";
  if (s.includes("transcribed") || s.includes("transcript")) return "Đã có transcript, đang viết kịch bản...";
  if (s.includes("requesting-provider") || s.includes("provider")) return "Đang kết nối AI bóc tách ngữ cảnh...";
  if (s.includes("generating_voice") || s.includes("voice")) return "Đang tạo giọng đọc...";
  if (s.includes("matching_scenes") || s.includes("scenes")) return "Đang phân đoạn phân cảnh...";
  if (s.includes("completed")) return "Hoàn tất phân tích AI";
  return stage;
};

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
  onQueueToRender,
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
        <div style={{ paddingRight: "8px", minWidth: "155px" }}>
          {isRunning ? (
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: "11px",
                  fontWeight: 800,
                  color: "#fbbf24",
                  marginBottom: "4px",
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                  <ArrowRepeat size={12} className="spin-fast" color="#fbbf24" />
                  <span>⚡ Đang phân tích...</span>
                </span>
                <span style={{ fontFamily: "monospace", fontSize: "11px", color: "#fef08a", fontWeight: 800 }}>
                  {prog.progress}%
                </span>
              </div>
              <div
                style={{
                  width: "100%",
                  height: "5px",
                  background: "rgba(0,0,0,0.5)",
                  borderRadius: "10px",
                  overflow: "hidden",
                  border: "1px solid rgba(245, 158, 11, 0.25)",
                  position: "relative",
                }}
              >
                <div
                  className="progress-bar-animated-stripes"
                  style={{
                    width: `${Math.max(6, prog.progress)}%`,
                    height: "100%",
                    background: "linear-gradient(90deg, #d97706, #f59e0b, #fbbf24)",
                    borderRadius: "10px",
                    transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                    boxShadow: "0 0 10px rgba(245, 158, 11, 0.6)",
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: "9.5px",
                  color: "#cbd5e1",
                  marginTop: "3px",
                  display: "block",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                title={prog.stage}
              >
                {formatAnalysisStage(prog.stage)}
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

          {/* Bước 2: Kịch bản & Voice (Phân tích xong sang Kịch bản) */}
          {isCompleted && (
            <button
              type="button"
              onClick={() => onExportToStory(job)}
              style={{
                background: "linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(217, 119, 6, 0.25))",
                border: "1px solid rgba(245, 158, 11, 0.45)",
                color: "#fbbf24",
                padding: "4px 9px",
                borderRadius: "5px",
                fontSize: "11px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                boxShadow: "0 0 10px rgba(245, 158, 11, 0.15)",
              }}
              title="Chuyển sang Bước 2: Kịch bản & Voice để biên tập và duyệt kịch bản"
            >
              📝 Kịch bản ➔
            </button>
          )}

          {/* Timeline - Chỉ hiển thị khi kịch bản ĐÃ ĐƯỢC DUYỆT */}
          {isCompleted && (job.analysis?.storyPlan?.status === "approved" || (job.timelineClips && job.timelineClips.length > 0)) && (
            <button
              type="button"
              onClick={() => onExportToTimeline(job)}
              style={{
                background: "rgba(56, 189, 248, 0.12)",
                border: "1px solid rgba(56, 189, 248, 0.3)",
                color: "#38bdf8",
                padding: "4px 8px",
                borderRadius: "5px",
                fontSize: "11px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
              title="Kịch bản đã duyệt - Mở bàn dựng Timeline"
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
