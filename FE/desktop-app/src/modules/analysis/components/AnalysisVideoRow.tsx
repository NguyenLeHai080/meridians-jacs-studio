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
  PlayFill,
  ChatQuoteFill,
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
    <div
      style={{
        borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
        background: isSelected
          ? "rgba(245, 158, 11, 0.08)"
          : isExpanded
          ? "rgba(255, 255, 255, 0.02)"
          : "transparent",
        transition: "all 0.15s ease",
      }}
    >
      {/* Level 1: Parent Video Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "40px 42px minmax(260px, 2fr) 175px 145px 95px 250px",
          padding: "11px 16px",
          alignItems: "center",
          background: isRunning ? "rgba(245, 158, 11, 0.05)" : "transparent",
        }}
      >
        {/* 1. Select Checkbox */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(job.id)}
            style={{
              cursor: "pointer",
              width: "15px",
              height: "15px",
              accentColor: "#f59e0b",
            }}
          />
        </div>

        {/* 2. Expand Chevron */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <button
            type="button"
            onClick={() => onToggleExpand(job.id)}
            style={{
              background: isExpanded ? "rgba(245, 158, 11, 0.2)" : "rgba(255, 255, 255, 0.05)",
              color: isExpanded ? "#fbbf24" : "#94a3b8",
              border: isExpanded
                ? "1px solid rgba(245, 158, 11, 0.45)"
                : "1px solid rgba(255, 255, 255, 0.1)",
              width: "26px",
              height: "26px",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: isExpanded ? "0 0 10px rgba(245, 158, 11, 0.2)" : "none",
              transition: "all 0.15s ease",
            }}
            title={isExpanded ? "Thu gọn phân cảnh" : "Mở rộng phân cảnh"}
          >
            {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
        </div>

        {/* 3. Video Info & Thumbnail */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            minWidth: 0,
            paddingRight: "12px",
          }}
        >
          {/* Thumbnail preview button */}
          <div
            onClick={() => onOpenPreviewPlayer(job)}
            style={{
              width: "52px",
              height: "36px",
              borderRadius: "7px",
              background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
              border: "1px solid rgba(245, 158, 11, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fbbf24",
              cursor: "pointer",
              flexShrink: 0,
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.4)",
              position: "relative",
              overflow: "hidden",
              transition: "all 0.15s ease",
            }}
            title="Bấm để mở trình phát video và xem kịch bản đồng bộ"
          >
            <Film size={15} />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(0,0,0,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: 0,
                transition: "opacity 0.15s ease",
              }}
              className="thumb-hover-overlay"
            >
              <PlayFill size={14} color="#f59e0b" />
            </div>
          </div>

          <div style={{ minWidth: 0, flex: 1 }}>
            <strong
              onClick={() => onOpenPreviewPlayer(job)}
              style={{
                fontSize: "13px",
                fontWeight: 700,
                color: "#f8fafc",
                display: "block",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                cursor: "pointer",
                letterSpacing: "-0.15px",
                lineHeight: "1.3",
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
                marginTop: "3px",
              }}
            >
              <span
                style={{
                  fontFamily: "monospace",
                  color: "#fbbf24",
                  background: "rgba(245, 158, 11, 0.12)",
                  border: "1px solid rgba(245, 158, 11, 0.25)",
                  padding: "1px 5px",
                  borderRadius: "4px",
                  fontWeight: 700,
                  fontSize: "10px",
                }}
              >
                ⏱️ {formatDuration(job.durationSeconds)}
              </span>
              <span style={{ color: "rgba(255, 255, 255, 0.2)" }}>•</span>
              <span
                style={{
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: "240px",
                  color: "#64748b",
                }}
                title={job.localPath || job.source}
              >
                {job.localPath || job.source}
              </span>
            </div>
          </div>
        </div>

        {/* 4. Status Badge & Live Progress */}
        <div style={{ paddingRight: "8px" }}>
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
                  <ArrowRepeat size={11} className="spin-fast" color="#fbbf24" />
                  <span>⚡ Phân tích AI...</span>
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
                  gap: "5px",
                  background: "linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(5, 150, 105, 0.2))",
                  border: "1px solid rgba(16, 185, 129, 0.35)",
                  color: "#34d399",
                  padding: "3px 9px",
                  borderRadius: "20px",
                  fontSize: "11px",
                  fontWeight: 700,
                  boxShadow: "0 0 12px rgba(16, 185, 129, 0.12)",
                }}
              >
                <CheckCircleFill size={10} /> Đã Phân Tích
              </span>
              <div
                style={{
                  fontSize: "10px",
                  color: "#94a3b8",
                  marginTop: "3px",
                  display: "flex",
                  alignItems: "center",
                  gap: "3px",
                }}
              >
                <span>🎬</span> {scenes.length} phân cảnh trích xuất
              </div>
            </div>
          ) : isFailed ? (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                background: "rgba(239, 68, 68, 0.12)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "#f87171",
                padding: "3px 8px",
                borderRadius: "20px",
                fontSize: "10.5px",
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
                padding: "3px 8px",
                borderRadius: "20px",
                fontSize: "10.5px",
                fontWeight: 700,
              }}
            >
              <ClockFill size={10} /> Chờ phân tích
            </span>
          )}
        </div>

        {/* 5. Token / Cost Column */}
        <div>
          <div
            style={{
              fontSize: "11.5px",
              fontWeight: 800,
              color: tokenInfo.isUsed ? "#fbbf24" : "#64748b",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <span>⚡</span> {tokenInfo.text.replace(/^[⚡\s]+/, "")}
          </div>
          <div
            style={{
              fontSize: "10.5px",
              color: tokenInfo.isUsed ? "#38bdf8" : "#475569",
              fontWeight: 600,
              fontFamily: "monospace",
              marginTop: "2px",
            }}
          >
            {tokenInfo.subText}
          </div>
        </div>

        {/* 6. AI Score */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div
            style={{
              background: isCompleted
                ? "linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.05))"
                : "rgba(255, 255, 255, 0.03)",
              border: isCompleted
                ? "1px solid rgba(245, 158, 11, 0.35)"
                : "1px solid rgba(255, 255, 255, 0.06)",
              padding: "3px 9px",
              borderRadius: "20px",
              display: "inline-flex",
              alignItems: "center",
              gap: "3px",
              fontSize: "11.5px",
              fontWeight: 800,
              color: isCompleted ? "#fbbf24" : "#64748b",
              boxShadow: isCompleted ? "0 0 10px rgba(245, 158, 11, 0.15)" : "none",
            }}
          >
            <span>★</span> {formatAiScore(job.analysis?.score)}
          </div>
        </div>

        {/* 7. Row Actions */}
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "6px" }}>
          {/* Action 1: Re-run AI Analysis */}
          <button
            type="button"
            onClick={() => onOpenAnalysisConfigForJob(job)}
            disabled={isRunning}
            style={{
              background: isCompleted
                ? "rgba(255, 255, 255, 0.05)"
                : "linear-gradient(135deg, #d97706, #f59e0b)",
              color: isCompleted ? "#cbd5e1" : "#12151f",
              border: isCompleted ? "1px solid rgba(255, 255, 255, 0.12)" : "none",
              padding: "5px 9px",
              borderRadius: "6px",
              fontSize: "11px",
              fontWeight: 700,
              cursor: isRunning ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              transition: "all 0.15s ease",
            }}
            title="Cài đặt mô hình AI & chạy phân tích"
          >
            {isCompleted ? <ArrowRepeat size={11} /> : <LightningChargeFill size={11} />}
            <span>{isRunning ? "Đang chạy..." : isCompleted ? "Chạy lại" : "Phân tích"}</span>
          </button>

          {/* Action 2: Sang Kịch Bản (Primary Highlight CTA) */}
          {isCompleted && (
            <button
              type="button"
              onClick={() => onExportToStory(job)}
              style={{
                background: "linear-gradient(135deg, #d97706, #f59e0b)",
                border: "none",
                color: "#0f172a",
                padding: "5px 11px",
                borderRadius: "6px",
                fontSize: "11px",
                fontWeight: 800,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                boxShadow: "0 2px 10px rgba(245, 158, 11, 0.35)",
                transition: "all 0.15s ease",
              }}
              title="Chuyển sang Bước 2: Kịch bản & Lời thoại AI"
            >
              <ChatQuoteFill size={11} />
              <span>Kịch bản ➔</span>
            </button>
          )}

          {/* Action 3: Timeline - Chỉ hiển thị khi kịch bản ĐÃ ĐƯỢC DUYỆT hoặc có timelineClips */}
          {isCompleted &&
            (job.analysis?.storyPlan?.status === "approved" ||
              (job.timelineClips && job.timelineClips.length > 0)) && (
              <button
                type="button"
                onClick={() => onExportToTimeline(job)}
                style={{
                  background: "linear-gradient(135deg, #0284c7, #0ea5e9)",
                  border: "none",
                  color: "#ffffff",
                  padding: "5px 9px",
                  borderRadius: "6px",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  boxShadow: "0 2px 10px rgba(14, 165, 233, 0.25)",
                }}
                title="Kịch bản đã duyệt - Mở bàn dựng Timeline"
              >
                <CollectionPlayFill size={11} />
                <span>Timeline</span>
              </button>
            )}

          {/* Action 4: View Player */}
          <button
            type="button"
            onClick={() => onOpenPreviewPlayer(job)}
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#94a3b8",
              width: "28px",
              height: "28px",
              borderRadius: "6px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            title="Xem trước Video Player"
          >
            <EyeFill size={12} />
          </button>

          {/* Action 5: Delete */}
          <button
            type="button"
            onClick={() => onDeleteJob(job.id, job.name)}
            style={{
              background: "rgba(239, 68, 68, 0.08)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              color: "#f87171",
              width: "28px",
              height: "28px",
              borderRadius: "6px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.15s ease",
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
