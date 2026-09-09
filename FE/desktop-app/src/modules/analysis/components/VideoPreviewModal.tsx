import React from "react";
import {
  ArrowRepeat,
  ChatQuoteFill,
  CheckCircleFill,
  CollectionPlayFill,
  CpuFill,
  Film,
  LightningChargeFill,
  PauseFill,
  Sliders,
  Stars,
  VolumeUpFill,
  XLg,
} from "react-bootstrap-icons";
import type { Job, NavKey, ProviderProfile } from "../../../core/types";
import { formatDuration, resolveMediaSrc } from "../utils/analysisHelpers";

interface VideoPreviewModalProps {
  previewPlayerInfo: {
    job: Job;
    initialTimeSeconds?: number;
  } | null;
  onClose: () => void;
  jobs: Job[];
  runningJobIds: Set<string>;
  batchProgress: Record<string, { progress: number; stage: string }>;
  providers: ProviderProfile[];
  defaultProviderId: string;
  selectedProvider: ProviderProfile | undefined;
  activePlayingSceneIdx: number;
  setActivePlayingSceneIdx: (idx: number) => void;
  playingVoiceKey: string | null;
  loadingVoiceKey: string | null;
  onPlaySceneVoice: (text: string, voiceKey: string) => void;
  onExportToTimeline: (job: Job) => void;
  onExportToStory: (job: Job) => void;
  onOpenAnalysisConfigForJob: (job: Job) => void;
  onNavigate?: (key: NavKey) => void;
}

export const VideoPreviewModal: React.FC<VideoPreviewModalProps> = ({
  previewPlayerInfo,
  onClose,
  jobs,
  runningJobIds,
  batchProgress,
  providers,
  defaultProviderId,
  selectedProvider,
  activePlayingSceneIdx,
  setActivePlayingSceneIdx,
  playingVoiceKey,
  loadingVoiceKey,
  onPlaySceneVoice,
  onExportToTimeline,
  onExportToStory,
  onOpenAnalysisConfigForJob,
  onNavigate,
}) => {
  if (!previewPlayerInfo) return null;

  const activeJob = jobs.find((j) => j.id === previewPlayerInfo.job.id) || previewPlayerInfo.job;
  const scenes = activeJob.analysis?.scenes || [];
  const hasScenes = scenes.length > 0;
  const isJobRunning = activeJob.status === "running" || runningJobIds.has(activeJob.id);
  const prog = batchProgress[activeJob.id] || { progress: activeJob.progress || 0, stage: activeJob.stage || "" };
  const mediaSrc = resolveMediaSrc(activeJob.localPath || activeJob.source);
  const assignedProvider =
    providers.find((p) => p.id === (activeJob.providerId || defaultProviderId)) || selectedProvider;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.88)",
        backdropFilter: "blur(14px)",
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
          borderRadius: "14px",
          width: "100%",
          maxWidth: "1320px",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 30px 80px rgba(0,0,0,0.9)",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(26, 30, 43, 0.95)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, rgba(217, 119, 6, 0.25), rgba(245, 158, 11, 0.15))",
                color: "#fbbf24",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Film size={17} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <strong
                  style={{
                    fontSize: "14px",
                    color: "#f8fafc",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: "480px",
                  }}
                  title={activeJob.name}
                >
                  {activeJob.name}
                </strong>
                <span
                  style={{
                    fontSize: "10.5px",
                    background: hasScenes ? "rgba(245, 158, 11, 0.15)" : "rgba(255, 255, 255, 0.06)",
                    color: hasScenes ? "#fbbf24" : "#94a3b8",
                    border: hasScenes ? "1px solid rgba(245, 158, 11, 0.3)" : "1px solid rgba(255, 255, 255, 0.1)",
                    padding: "1px 7px",
                    borderRadius: "4px",
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  {hasScenes ? `${scenes.length} PHÂN CẢNH` : "CHƯA PHÂN CẢNH"}
                </span>
                <span
                  style={{
                    fontSize: "10.5px",
                    background: "rgba(255, 255, 255, 0.06)",
                    color: "#94a3b8",
                    padding: "1px 7px",
                    borderRadius: "4px",
                    fontFamily: "monospace",
                    flexShrink: 0,
                  }}
                >
                  ⏱️ {formatDuration(activeJob.durationSeconds)}
                </span>
                {isJobRunning ? (
                  <span
                    style={{
                      fontSize: "10px",
                      background: "rgba(245, 158, 11, 0.2)",
                      color: "#fbbf24",
                      border: "1px solid rgba(245, 158, 11, 0.4)",
                      padding: "1px 7px",
                      borderRadius: "4px",
                      fontWeight: 800,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    ⚡ ĐANG PHÂN TÍCH ({prog.progress}%)
                  </span>
                ) : hasScenes ? (
                  <span
                    style={{
                      fontSize: "10px",
                      background: "rgba(52, 211, 153, 0.15)",
                      color: "#34d399",
                      border: "1px solid rgba(52, 211, 153, 0.3)",
                      padding: "1px 7px",
                      borderRadius: "4px",
                      fontWeight: 800,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <CheckCircleFill size={10} /> ĐÃ KHỚP TIMELINE
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {!hasScenes && !isJobRunning && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAnalysisConfigForJob(activeJob);
                }}
                style={{
                  background: "linear-gradient(135deg, #d97706, #f59e0b)",
                  color: "#12151f",
                  border: "none",
                  padding: "5px 14px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  boxShadow: "0 0 12px rgba(245, 158, 11, 0.3)",
                }}
              >
                <LightningChargeFill size={12} /> Bắt Đầu Phân Tích AI
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "6px",
                width: "32px",
                height: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#94a3b8",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#f87171";
                e.currentTarget.style.background = "rgba(239, 68, 68, 0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#94a3b8";
                e.currentTarget.style.background = "rgba(255,255,255,0.06)";
              }}
            >
              <XLg size={14} />
            </button>
          </div>
        </div>

        {/* Modal Body: Video Left + Synced Scenes Right */}
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", height: "600px" }}>
          {/* Left: Video Player */}
          <div
            style={{
              background: "#05070a",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              position: "relative",
              borderRight: "1px solid rgba(255,255,255,0.08)",
              overflow: "hidden",
            }}
          >
            {mediaSrc ? (
              <video
                id="analysis-preview-video"
                key={mediaSrc}
                src={mediaSrc}
                controls
                autoPlay
                onTimeUpdate={(e) => {
                  const cur = e.currentTarget.currentTime;
                  if (!scenes.length) return;
                  const idx = scenes.findIndex((s) => {
                    const partsStart = (s?.start ? String(s.start) : "0:0").split(":").map(Number);
                    const startSec =
                      partsStart.length === 3
                        ? partsStart[0] * 3600 + partsStart[1] * 60 + partsStart[2]
                        : partsStart.length === 2
                        ? partsStart[0] * 60 + partsStart[1]
                        : 0;
                    const partsEnd = (s?.end ? String(s.end) : "").split(":").map(Number);
                    const endSec =
                      partsEnd.length === 3
                        ? partsEnd[0] * 3600 + partsEnd[1] * 60 + partsEnd[2]
                        : partsEnd.length === 2
                        ? partsEnd[0] * 60 + partsEnd[1]
                        : startSec + 15;
                    return cur >= startSec && cur <= endSec;
                  });
                  if (idx >= 0 && idx !== activePlayingSceneIdx) {
                    setActivePlayingSceneIdx(idx);
                    const card = document.getElementById(`preview-scene-card-${idx}`);
                    if (card) {
                      card.scrollIntoView({ behavior: "smooth", block: "nearest" });
                    }
                  }
                }}
                style={{ width: "100%", maxHeight: "100%", objectFit: "contain" }}
              />
            ) : (
              <div style={{ color: "#64748b", textAlign: "center", padding: "40px 20px" }}>
                <Film size={48} style={{ margin: "0 auto 14px", opacity: 0.4, color: "#fbbf24" }} />
                <h4 style={{ fontSize: "14px", color: "#f8fafc", marginBottom: "6px", fontWeight: 700 }}>
                  Chưa Tìm Thấy Tệp Video Nguồn
                </h4>
                <p style={{ fontSize: "12px", color: "#94a3b8", maxWidth: "340px", margin: "0 auto" }}>
                  Video từ link URL đang tải về hoặc đường dẫn tệp chưa sẵn sàng trên máy.
                </p>
              </div>
            )}
          </div>

          {/* Right: Synchronized Scenes Timeline & Empty Hub */}
          <div
            style={{
              background: "rgba(16, 19, 28, 0.98)",
              display: "flex",
              flexDirection: "column",
              height: "100%",
              overflow: "hidden",
            }}
          >
            {/* Scenes Top Bar */}
            <div
              style={{
                padding: "10px 16px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "rgba(26, 30, 43, 0.6)",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  color: "#fbbf24",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <CollectionPlayFill size={13} /> KỊCH BẢN PHÂN CẢNH ĐỒNG BỘ
              </span>
              {hasScenes ? (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span
                    style={{
                      fontSize: "10.5px",
                      color: "#34d399",
                      fontWeight: 700,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <span
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: "#34d399",
                        display: "inline-block",
                      }}
                    />{" "}
                    Auto-Sync Timeline
                  </span>
                  <button
                    type="button"
                    onClick={() => onExportToTimeline(activeJob)}
                    style={{
                      background: "rgba(245, 158, 11, 0.15)",
                      border: "1px solid rgba(245, 158, 11, 0.3)",
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
                    title="Đưa sang bàn dựng Timeline"
                  >
                    <CollectionPlayFill size={10} /> Timeline
                  </button>
                </div>
              ) : (
                <span
                  style={{
                    fontSize: "10.5px",
                    color: "#fbbf24",
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: "#fbbf24",
                      display: "inline-block",
                    }}
                  />{" "}
                  Chờ phân tích AI
                </span>
              )}
            </div>

            {/* Body Content */}
            {hasScenes ? (
              /* Scrollable Scenes Cards */
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                {scenes.map((sc, idx) => {
                  const isActive = activePlayingSceneIdx === idx;
                  const isPlayingThis = playingVoiceKey === (sc.id || `scene-${idx + 1}`);
                  const isLoadingThis = loadingVoiceKey === (sc.id || `scene-${idx + 1}`);

                  return (
                    <div
                      id={`preview-scene-card-${idx}`}
                      key={sc.id || idx}
                      onClick={() => {
                        setActivePlayingSceneIdx(idx);
                        const vid = document.getElementById("analysis-preview-video") as HTMLVideoElement;
                        if (vid) {
                          const parts = (sc?.start ? String(sc.start) : "0:0").split(":").map(Number);
                          const secs =
                            parts.length === 3
                              ? parts[0] * 3600 + parts[1] * 60 + parts[2]
                              : parts.length === 2
                              ? parts[0] * 60 + parts[1]
                              : 0;
                          vid.currentTime = secs;
                          vid.play();
                        }
                      }}
                      style={{
                        background: isActive
                          ? "linear-gradient(135deg, rgba(217, 119, 6, 0.22), rgba(245, 158, 11, 0.12))"
                          : "rgba(26, 30, 43, 0.6)",
                        border: isActive ? "1px solid #f59e0b" : "1px solid rgba(255, 255, 255, 0.06)",
                        borderRadius: "8px",
                        padding: "10px 12px",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        boxShadow: isActive ? "0 0 16px rgba(245, 158, 11, 0.2)" : "none",
                      }}
                    >
                      {/* Scene Header */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "4px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 800,
                              color: isActive ? "#fbbf24" : "#94a3b8",
                            }}
                          >
                            Cảnh #{idx + 1}
                          </span>
                          {isActive && (
                            <span
                              style={{
                                fontSize: "9px",
                                background: "rgba(245, 158, 11, 0.25)",
                                color: "#fbbf24",
                                border: "1px solid rgba(245, 158, 11, 0.4)",
                                padding: "1px 5px",
                                borderRadius: "3px",
                                fontWeight: 800,
                              }}
                            >
                              ⚡ ĐANG PHÁT
                            </span>
                          )}
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span
                            style={{
                              fontSize: "10.5px",
                              color: "#fbbf24",
                              fontFamily: "monospace",
                              fontWeight: 700,
                            }}
                          >
                            ⏱️ {sc.start} ➔ {sc.end || "00:15"}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onPlaySceneVoice(
                                sc.voiceover || sc.translation || sc.detail,
                                sc.id || `scene-${idx + 1}`
                              );
                            }}
                            style={{
                              background: isPlayingThis
                                ? "rgba(245, 158, 11, 0.25)"
                                : "rgba(255,255,255,0.06)",
                              border: isPlayingThis
                                ? "1px solid rgba(245, 158, 11, 0.5)"
                                : "1px solid rgba(255,255,255,0.1)",
                              borderRadius: "4px",
                              padding: "3px 7px",
                              color: "#e2e8f0",
                              fontSize: "10.5px",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "3px",
                            }}
                            title="Nghe thử giọng đọc TTS"
                          >
                            {isLoadingThis ? (
                              <ArrowRepeat size={11} color="#fbbf24" />
                            ) : isPlayingThis ? (
                              <PauseFill size={11} color="#fbbf24" />
                            ) : (
                              <VolumeUpFill size={11} color="#fbbf24" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Scene Title */}
                      <strong style={{ fontSize: "12.5px", color: "#f8fafc", display: "block", marginBottom: "4px" }}>
                        {sc.title}
                      </strong>

                      {/* Scene Visual Detail */}
                      {sc.detail && (
                        <div
                          style={{
                            fontSize: "10.5px",
                            color: "#94a3b8",
                            marginBottom: "5px",
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "4px",
                          }}
                        >
                          <span>👁️</span> <span>{sc.detail}</span>
                        </div>
                      )}

                      {/* AI Voiceover Script */}
                      <div
                        style={{
                          background: "rgba(0, 0, 0, 0.35)",
                          borderLeft: "2px solid #f59e0b",
                          borderRadius: "0 4px 4px 0",
                          padding: "6px 8px",
                          fontSize: "11px",
                          color: "#e2e8f0",
                          fontStyle: "italic",
                          lineHeight: 1.4,
                        }}
                      >
                        🎙️ "{sc.voiceover || sc.translation || sc.detail}"
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : isJobRunning ? (
              /* Live Analysis Running Progress View */
              <div
                style={{
                  flex: 1,
                  padding: "24px 20px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "14px",
                    background:
                      "linear-gradient(135deg, rgba(217, 119, 6, 0.25), rgba(245, 158, 11, 0.15))",
                    border: "1px solid rgba(245, 158, 11, 0.4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fbbf24",
                    marginBottom: "16px",
                    boxShadow: "0 0 24px rgba(245, 158, 11, 0.25)",
                  }}
                >
                  <LightningChargeFill size={28} />
                </div>
                <h4 style={{ fontSize: "15px", fontWeight: 800, color: "#f8fafc", marginBottom: "6px" }}>
                  AI Đang Phân Tích & Bóc Tách Phân Cảnh
                </h4>
                <p
                  style={{
                    fontSize: "12px",
                    color: "#94a3b8",
                    maxWidth: "340px",
                    marginBottom: "16px",
                    lineHeight: 1.5,
                  }}
                >
                  {prog.stage ||
                    "Hệ thống đang quét từng khung hình, nhận diện mốc thời gian và biên tập kịch bản đồng bộ..."}
                </p>

                <div style={{ width: "85%", maxWidth: "320px", marginBottom: "10px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "11px",
                      fontWeight: 800,
                      color: "#fbbf24",
                      marginBottom: "4px",
                    }}
                  >
                    <span>Tiến độ xử lý</span>
                    <span>{prog.progress}%</span>
                  </div>
                  <div
                    style={{
                      width: "100%",
                      height: "6px",
                      background: "rgba(0,0,0,0.5)",
                      borderRadius: "10px",
                      overflow: "hidden",
                      border: "1px solid rgba(255,255,255,0.08)",
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
                </div>
                <span style={{ fontSize: "11px", color: "#64748b" }}>
                  ⏱️ Các phân cảnh sẽ tự động nạp vào đây ngay sau khi hoàn tất.
                </span>
              </div>
            ) : (
              /* Interactive Video Intelligence Hub & 1-Click Trigger (Empty State) */
              <div
                style={{
                  flex: 1,
                  padding: "20px",
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
                {/* Hero Info Card */}
                <div
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(217, 119, 6, 0.12), rgba(245, 158, 11, 0.05))",
                    border: "1px solid rgba(245, 158, 11, 0.25)",
                    borderRadius: "10px",
                    padding: "14px 16px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                    <Stars size={16} color="#fbbf24" />
                    <strong style={{ fontSize: "13px", color: "#fbbf24" }}>
                      Video Nguồn Đã Sẵn Sàng Phân Tích
                    </strong>
                  </div>
                  <p style={{ fontSize: "11.5px", color: "#cbd5e1", lineHeight: 1.5, margin: 0 }}>
                    Tệp video đã được nạp thành công vào hệ thống. Hãy bắt đầu phân tích AI để tự động bóc
                    tách từng phân cảnh, nhận diện sự kiện khung hình và viết kịch bản thuyết minh đồng bộ.
                  </p>
                </div>

                {/* Video Specs Summary */}
                <div
                  style={{
                    background: "rgba(26, 30, 43, 0.7)",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                    borderRadius: "8px",
                    padding: "12px 14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 800,
                      color: "#94a3b8",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    📊 Thông Số Kỹ Thuật Video
                  </div>

                  <div
                    style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "11.5px" }}
                  >
                    <div
                      style={{
                        background: "rgba(0,0,0,0.3)",
                        padding: "6px 10px",
                        borderRadius: "6px",
                        border: "1px solid rgba(255,255,255,0.04)",
                      }}
                    >
                      <span style={{ color: "#64748b", display: "block", fontSize: "10px" }}>
                        Thời Lượng
                      </span>
                      <strong style={{ color: "#f8fafc", fontFamily: "monospace" }}>
                        ⏱️ {formatDuration(activeJob.durationSeconds)}
                      </strong>
                    </div>

                    <div
                      style={{
                        background: "rgba(0,0,0,0.3)",
                        padding: "6px 10px",
                        borderRadius: "6px",
                        border: "1px solid rgba(255,255,255,0.04)",
                      }}
                    >
                      <span style={{ color: "#64748b", display: "block", fontSize: "10px" }}>
                        Loại Nguồn
                      </span>
                      <strong style={{ color: "#f8fafc" }}>
                        {activeJob.sourceType === "url"
                          ? "🌐 Trực Tuyến (URL)"
                          : "💾 Tệp Máy Tính (Local)"}
                      </strong>
                    </div>
                  </div>

                  <div
                    style={{
                      background: "rgba(0,0,0,0.3)",
                      padding: "6px 10px",
                      borderRadius: "6px",
                      border: "1px solid rgba(255,255,255,0.04)",
                      fontSize: "11px",
                    }}
                  >
                    <span style={{ color: "#64748b", display: "block", fontSize: "10px" }}>
                      Mô Hình AI Xử Lý
                    </span>
                    <span
                      style={{
                        color: "#fbbf24",
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        marginTop: "2px",
                      }}
                    >
                      <CpuFill size={11} />{" "}
                      {assignedProvider
                        ? `${assignedProvider.name} · ${assignedProvider.model}`
                        : "Mô hình AI Khuyên Dùng (Gemini / Claude / GPT-4o)"}
                    </span>
                  </div>

                  <div
                    style={{
                      background: "rgba(0,0,0,0.3)",
                      padding: "6px 10px",
                      borderRadius: "6px",
                      border: "1px solid rgba(255,255,255,0.04)",
                      fontSize: "10.5px",
                      color: "#94a3b8",
                      wordBreak: "break-all",
                    }}
                  >
                    <span style={{ color: "#64748b", display: "block", fontSize: "10px" }}>
                      Đường Dẫn Tệp Nguồn
                    </span>
                    {activeJob.localPath || activeJob.source || "Chưa có đường dẫn"}
                  </div>
                </div>

                {/* Primary Actions */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "auto" }}>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAnalysisConfigForJob(activeJob);
                    }}
                    style={{
                      background: "linear-gradient(135deg, #d97706, #f59e0b)",
                      color: "#12151f",
                      border: "none",
                      padding: "10px 18px",
                      borderRadius: "8px",
                      fontSize: "13px",
                      fontWeight: 800,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      boxShadow: "0 0 20px rgba(245, 158, 11, 0.35)",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <LightningChargeFill size={15} /> ⚡ Bắt Đầu Phân Tích AI Ngay
                  </button>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenAnalysisConfigForJob(activeJob);
                      }}
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        color: "#e2e8f0",
                        padding: "7px 12px",
                        borderRadius: "6px",
                        fontSize: "11.5px",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "5px",
                      }}
                    >
                      <Sliders size={12} color="#fbbf24" /> Chọn Phong Cách
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onNavigate?.("story");
                      }}
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        color: "#e2e8f0",
                        padding: "7px 12px",
                        borderRadius: "6px",
                        fontSize: "11.5px",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "5px",
                      }}
                    >
                      <ChatQuoteFill size={12} color="#fbbf24" /> Studio Kịch Bản
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Scenes Footer (if has scenes) */}
            {hasScenes && (
              <div
                style={{
                  padding: "10px 14px",
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                  background: "rgba(26, 30, 43, 0.6)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                  ✨ Đã trích xuất {scenes.length} phân cảnh
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAnalysisConfigForJob(activeJob);
                    }}
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "#e2e8f0",
                      padding: "4px 8px",
                      borderRadius: "5px",
                      fontSize: "11px",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <ArrowRepeat size={11} color="#fbbf24" /> Phân tích lại
                  </button>
                  <button
                    type="button"
                    onClick={() => onExportToStory(activeJob)}
                    style={{
                      background: "rgba(245, 158, 11, 0.15)",
                      border: "1px solid rgba(245, 158, 11, 0.3)",
                      color: "#fbbf24",
                      padding: "4px 10px",
                      borderRadius: "5px",
                      fontSize: "11px",
                      fontWeight: 800,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <ChatQuoteFill size={11} /> Kịch Bản Voice Studio
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
