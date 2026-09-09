import React from "react";
import {
  ChatQuoteFill,
  CollectionPlayFill,
  LightningChargeFill,
} from "react-bootstrap-icons";
import type { AnalysisScene, Job } from "../../../core/types";
import { AnalysisSceneItem } from "./AnalysisSceneItem";

interface AnalysisSceneListProps {
  job: Job;
  scenes: AnalysisScene[];
  currentScenePage: number;
  scenesPerPage: number;
  onSetScenePage: (jobId: string, page: number) => void;
  onExportToTimeline: (job: Job) => void;
  onExportToStory: (job: Job) => void;
  onOpenAnalysisConfigForJob: (job: Job) => void;
  onUpdateJob?: (jobId: string, values: Partial<Job>) => void;
  playingVoiceKey: string | null;
  loadingVoiceKey: string | null;
  onPlaySceneVoice: (text: string, voiceKey: string, voiceName?: string) => void;
  onEditScene: (scene: AnalysisScene, idx: number) => void;
  onExportSingleSceneToTimeline: (job: Job, scene: AnalysisScene, idx: number) => void;
  onDeleteScene: (jobId: string, idx: number) => void;
  showToast: (msg: string) => void;
}

export const AnalysisSceneList: React.FC<AnalysisSceneListProps> = ({
  job,
  scenes,
  currentScenePage,
  scenesPerPage,
  onSetScenePage,
  onExportToTimeline,
  onExportToStory,
  onOpenAnalysisConfigForJob,
  onUpdateJob,
  playingVoiceKey,
  loadingVoiceKey,
  onPlaySceneVoice,
  onEditScene,
  onExportSingleSceneToTimeline,
  onDeleteScene,
  showToast,
}) => {
  const totalScenePages = Math.max(1, Math.ceil(scenes.length / scenesPerPage));
  const paginatedScenes = scenes.slice(
    (currentScenePage - 1) * scenesPerPage,
    currentScenePage * scenesPerPage
  );

  return (
    <div
      style={{
        background: "#0e111a",
        borderTop: "1px solid rgba(245, 158, 11, 0.2)",
        padding: "12px 16px 16px 36px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "10px",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "13px" }}>🎬</span>
          <strong
            style={{
              fontSize: "12px",
              color: "#fbbf24",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Danh Sách {scenes.length} Phân Cảnh Trích Xuất · {job.name}
          </strong>
        </div>

        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => onExportToTimeline(job)}
            style={{
              background: "rgba(245, 158, 11, 0.15)",
              border: "1px solid rgba(245, 158, 11, 0.35)",
              color: "#fbbf24",
              padding: "3px 8px",
              borderRadius: "5px",
              fontSize: "11px",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <CollectionPlayFill size={11} /> Dựng Toàn Bộ Cảnh Vào Timeline
          </button>
          <button
            type="button"
            onClick={() => onExportToStory(job)}
            style={{
              background: "rgba(16, 185, 129, 0.15)",
              border: "1px solid rgba(16, 185, 129, 0.35)",
              color: "#34d399",
              padding: "3px 8px",
              borderRadius: "5px",
              fontSize: "11px",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <ChatQuoteFill size={11} /> Xem Kịch Bản & Thu Âm
          </button>
        </div>
      </div>

      {/* AI Video Title & Overview Story Banner */}
      {job.analysis && (
        <div
          style={{
            background: "linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(15, 23, 42, 0.6))",
            border: "1px solid rgba(245, 158, 11, 0.25)",
            borderRadius: "8px",
            padding: "10px 14px",
            marginBottom: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "10px",
              flexWrap: "wrap",
              marginBottom: "6px",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 800,
                  color: "#fbbf24",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  marginBottom: "2px",
                }}
              >
                <span>🎯</span> TIÊU ĐỀ VIDEO ĐỀ XUẤT (VIRAL VIDEO TITLE):
              </div>
              <div style={{ fontSize: "13.5px", fontWeight: 800, color: "#f8fafc", lineHeight: 1.35 }}>
                {job.analysis?.videoTitle || job.name}
              </div>
            </div>
          </div>

          {/* Suggested Alternative Viral Titles */}
          {Array.isArray(job.analysis?.suggestedTitles) && job.analysis.suggestedTitles.length > 0 && (
            <div
              style={{
                marginTop: "6px",
                display: "flex",
                flexWrap: "wrap",
                gap: "5px",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 700 }}>
                💡 Tiêu đề gợi ý:
              </span>
              {job.analysis.suggestedTitles.map((st, sIdx) => (
                <button
                  key={sIdx}
                  type="button"
                  onClick={() => {
                    if (onUpdateJob) {
                      onUpdateJob(job.id, {
                        name: st,
                        analysis: { ...job.analysis!, videoTitle: st },
                      });
                    }
                    showToast(`✓ Đã áp dụng tiêu đề: "${st}"`);
                  }}
                  style={{
                    background:
                      (job.analysis?.videoTitle || job.name) === st
                        ? "rgba(245, 158, 11, 0.25)"
                        : "rgba(255, 255, 255, 0.05)",
                    border:
                      (job.analysis?.videoTitle || job.name) === st
                        ? "1px solid #fbbf24"
                        : "1px solid rgba(255, 255, 255, 0.1)",
                    color:
                      (job.analysis?.videoTitle || job.name) === st ? "#fbbf24" : "#cbd5e1",
                    fontSize: "10.5px",
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: "12px",
                    cursor: "pointer",
                  }}
                  title="Bấm để chọn tiêu đề này làm tiêu đề chính của video"
                >
                  {st}
                </button>
              ))}
            </div>
          )}

          {/* Overall Story Summary */}
          {job.analysis?.summary && (
            <div
              style={{
                marginTop: "8px",
                paddingTop: "6px",
                borderTop: "1px dashed rgba(255, 255, 255, 0.08)",
              }}
            >
              <div
                style={{
                  fontSize: "9.5px",
                  fontWeight: 800,
                  color: "#38bdf8",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: "2px",
                }}
              >
                📖 CỐT TRUYỆN TỔNG QUAN & MẠCH NỘI DUNG CLIP:
              </div>
              <p style={{ fontSize: "11px", color: "#94a3b8", margin: 0, lineHeight: 1.45 }}>
                {job.analysis.summary}
              </p>
            </div>
          )}
        </div>
      )}

      {scenes.length === 0 ? (
        <div
          style={{
            padding: "20px",
            textAlign: "center",
            color: "#64748b",
            background: "rgba(0,0,0,0.2)",
            borderRadius: "6px",
            border: "1px dashed rgba(255,255,255,0.1)",
          }}
        >
          <p style={{ margin: "0 0 8px", fontSize: "12.5px" }}>
            Video này chưa có phân cảnh nào được trích xuất.
          </p>
          <button
            type="button"
            onClick={() => onOpenAnalysisConfigForJob(job)}
            style={{
              background: "linear-gradient(135deg, #d97706, #f59e0b)",
              color: "#12151f",
              border: "none",
              padding: "5px 12px",
              borderRadius: "5px",
              fontSize: "11.5px",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            <LightningChargeFill size={11} /> Cài Đặt & Chạy Phân Tích AI
          </button>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {paginatedScenes.map((scene, subIdx) => {
              const idx = (currentScenePage - 1) * scenesPerPage + subIdx;
              const voiceKey = `${job.id}-${idx}`;
              const isPlayingThis = playingVoiceKey === voiceKey;
              const isLoadingThis = loadingVoiceKey === voiceKey;

              return (
                <AnalysisSceneItem
                  key={scene.id || idx}
                  job={job}
                  scene={scene}
                  idx={idx}
                  isPlayingThis={isPlayingThis}
                  isLoadingThis={isLoadingThis}
                  onPlaySceneVoice={onPlaySceneVoice}
                  onEditScene={onEditScene}
                  onExportSingleSceneToTimeline={onExportSingleSceneToTimeline}
                  onDeleteScene={onDeleteScene}
                />
              );
            })}
          </div>

          {/* Child Scenes Pagination Controls */}
          {totalScenePages > 1 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: "10px",
                padding: "6px 12px",
                background: "rgba(0,0,0,0.3)",
                borderRadius: "6px",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                Hiển thị phân cảnh{" "}
                <strong>
                  {(currentScenePage - 1) * scenesPerPage + 1} -{" "}
                  {Math.min(currentScenePage * scenesPerPage, scenes.length)}
                </strong>{" "}
                / <strong>{scenes.length}</strong> cảnh
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <button
                  type="button"
                  onClick={() => onSetScenePage(job.id, Math.max(1, currentScenePage - 1))}
                  disabled={currentScenePage <= 1}
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: currentScenePage <= 1 ? "#64748b" : "#f8fafc",
                    padding: "3px 8px",
                    borderRadius: "4px",
                    fontSize: "11px",
                    cursor: currentScenePage <= 1 ? "not-allowed" : "pointer",
                  }}
                >
                  ‹ Trước
                </button>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#fbbf24", padding: "0 4px" }}>
                  {currentScenePage} / {totalScenePages}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onSetScenePage(job.id, Math.min(totalScenePages, currentScenePage + 1))
                  }
                  disabled={currentScenePage >= totalScenePages}
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: currentScenePage >= totalScenePages ? "#64748b" : "#f8fafc",
                    padding: "3px 8px",
                    borderRadius: "4px",
                    fontSize: "11px",
                    cursor: currentScenePage >= totalScenePages ? "not-allowed" : "pointer",
                  }}
                >
                  Sau ›
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
