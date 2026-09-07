import React, { useEffect, useMemo, useState } from "react";
import type { Job, NavKey } from "../../core/types";
import { getRuntime, isNativeRuntime } from "../../core/runtime";
import { Pagination } from "../../shared/Pagination";
import { Modal } from "../../shared/Modal";
import { popup } from "../../shared/popup";
import {
  BookmarkStarFill,
  ImageFill,
  ChatSquareQuoteFill,
  Sliders,
  PlayFill,
  EyeFill,
  Upload,
  CheckCircleFill,
  Check2,
  Film,
  LayersFill,
  Grid1x2Fill,
  ArrowRight,
  ShieldCheck,
  PaletteFill,
  FileEarmarkPlayFill,
} from "react-bootstrap-icons";

type Props = {
  jobs: Job[];
  onNavigate: (key: NavKey) => void;
  onUpdateJob: (id: string, values: Partial<Job>) => void;
  onAddJob: (job: Job) => void;
};

const POSITIONS: Array<[NonNullable<Job["logoPosition"]>, string]> = [
  ["top-left", "Góc Trên Trái (Top-Left)"],
  ["top-right", "Góc Trên Phải (Top-Right)"],
  ["bottom-left", "Góc Dưới Trái (Khuyên dùng Shorts/Reels)"],
  ["bottom-right", "Góc Dưới Phải (Bottom-Right)"],
];

const SUBTITLE_STYLES = [
  { id: "bottom", label: "Dưới Cùng (Mặc định)", desc: "Hiển thị ở cạnh dưới màn hình" },
  { id: "center", label: "Chính Giữa (Center Focus)", desc: "Nổi bật ở giữa khung hình" },
  { id: "top", label: "Trên Cùng (Top Banner)", desc: "Tránh che thanh điều hướng dưới" },
];

function fileUrl(value?: string) {
  if (!value || !isNativeRuntime()) return undefined;
  return `jacs-media://local?path=${encodeURIComponent(value)}`;
}

export function BrandPage({ jobs, onNavigate, onUpdateJob, onAddJob }: Props) {
  const [selectedJobId, setSelectedJobId] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);

  const candidates = useMemo(
    () =>
      jobs.filter(
        (job) => job.localPath || job.sourceType === "url" || job.analysis || job.source
      ),
    [jobs]
  );

  const pagedCandidates = useMemo(
    () => candidates.slice((page - 1) * pageSize, page * pageSize),
    [candidates, page, pageSize]
  );

  const activePreviewJob = useMemo(
    () => candidates.find((j) => j.id === selectedJobId) || candidates[0],
    [candidates, selectedJobId]
  );

  // Summary Metrics
  const withSubtitlesCount = useMemo(
    () =>
      candidates.filter(
        (j) => j.subtitleText || j.analysis?.voiceScript || j.analysis?.scenes?.some((s) => s.voiceover)
      ).length,
    [candidates]
  );

  const withLogoCount = useMemo(
    () => candidates.filter((j) => Boolean(j.logoPath)).length,
    [candidates]
  );

  useEffect(() => {
    setPage((value) =>
      Math.min(value, Math.max(1, Math.ceil(candidates.length / pageSize)))
    );
  }, [candidates.length, pageSize]);

  function openEditModal(job: Job) {
    setEditingJob(job);
    setIsEditModalOpen(true);
  }

  function renderBrandedJob(job: Job) {
    onAddJob({
      ...job,
      sourceOnly: false,
      id: `job-brand-${Date.now()}`,
      parentJobId: job.id,
      name: `${job.name} · có brand`,
      status: "queued",
      stage: job.sourceType === "url" && !job.localPath ? "downloading" : "queued",
      progress: 0,
      createdAt: new Date().toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });
    popup.success(`Đã tạo tác vụ render có nhận diện thương hiệu cho "${job.name}".`);
    onNavigate("render");
  }

  return (
    <div
      className="brand-workspace-root animate-fade-in"
      style={{
        padding: "10px 16px 80px 16px",
        width: "100%",
        margin: 0,
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        height: "100%",
        flex: "1 1 0%",
        overflowY: "auto",
      }}
    >
      {/* 1. Header Action Toolbar */}
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "8px", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center", flexShrink: 0 }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => onNavigate("timeline")}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#f8fafc", padding: "7px 14px", borderRadius: "7px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
          >
            <Grid1x2Fill size={13} color="#38bdf8" /> 3. Bàn Dựng Timeline
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => onNavigate("render")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 16px",
              borderRadius: "7px",
              fontSize: "12px",
              fontWeight: 800,
              background: "linear-gradient(135deg, #d97706, #f59e0b)",
              border: "none",
              color: "#12151f",
              boxShadow: "0 0 16px rgba(245, 158, 11, 0.4)",
              cursor: "pointer",
            }}
          >
            <PlayFill size={14} /> 5. Sang Render Xuất Bản <ArrowRight size={13} />
          </button>
        </div>
      </div>

      {/* 2. KPI Summary Bar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "8px",
          marginBottom: "12px",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            background: "rgba(18, 22, 32, 0.8)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "8px",
            padding: "8px 12px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            minWidth: 0,
          }}
        >
          <div
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "7px",
              background: "rgba(56, 189, 248, 0.12)",
              color: "#38bdf8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "15px",
              flexShrink: 0,
            }}
          >
            <Film />
          </div>
          <div style={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
            <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>
              TỔNG SỐ VIDEO / CLIPS
            </div>
            <div style={{ fontSize: "14px", fontWeight: 800, color: "#f8fafc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {candidates.length} <span style={{ fontSize: "10.5px", color: "#64748b", fontWeight: 500 }}>video</span>
            </div>
          </div>
        </div>

        <div
          style={{
            background: "rgba(18, 22, 32, 0.8)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "8px",
            padding: "8px 12px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            minWidth: 0,
          }}
        >
          <div
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "7px",
              background: "rgba(245, 158, 11, 0.12)",
              color: "#fbbf24",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "15px",
              flexShrink: 0,
            }}
          >
            <ChatSquareQuoteFill />
          </div>
          <div style={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
            <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>
              CÓ PHỤ ĐỀ ĐỒNG BỘ
            </div>
            <div style={{ fontSize: "14px", fontWeight: 800, color: "#fbbf24", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {withSubtitlesCount} <span style={{ fontSize: "10.5px", color: "#64748b", fontWeight: 500 }}>sẵn sàng</span>
            </div>
          </div>
        </div>

        <div
          style={{
            background: "rgba(18, 22, 32, 0.8)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "8px",
            padding: "8px 12px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            minWidth: 0,
          }}
        >
          <div
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "7px",
              background: "rgba(16, 185, 129, 0.12)",
              color: "#34d399",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "15px",
              flexShrink: 0,
            }}
          >
            <ImageFill />
          </div>
          <div style={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
            <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>
              ĐÃ GẮN LOGO WATERMARK
            </div>
            <div style={{ fontSize: "14px", fontWeight: 800, color: "#34d399", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {withLogoCount} <span style={{ fontSize: "10.5px", color: "#64748b", fontWeight: 500 }}>video</span>
            </div>
          </div>
        </div>

        <div
          style={{
            background: "rgba(18, 22, 32, 0.8)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "8px",
            padding: "8px 12px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            minWidth: 0,
          }}
        >
          <div
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "7px",
              background: "rgba(168, 85, 247, 0.12)",
              color: "#c084fc",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "15px",
              flexShrink: 0,
            }}
          >
            <ShieldCheck />
          </div>
          <div style={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
            <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>
              BẢO VỆ BẢN QUYỀN
            </div>
            <div style={{ fontSize: "14px", fontWeight: 800, color: "#c084fc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              100% <span style={{ fontSize: "10.5px", color: "#64748b", fontWeight: 500 }}>chuẩn hóa</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Split View: Left Branding Table + Right Interactive Canvas Simulator */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "12px", alignItems: "start" }}>
        
        {/* Left: Branding & Subtitle Table */}
        <section
          style={{
            background: "rgba(16, 20, 30, 0.9)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "10px",
            padding: "14px 16px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <div>
              <span style={{ fontSize: "10.5px", color: "#94a3b8", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                DANH SÁCH VIDEO & TRẠNG THÁI BRAND
              </span>
              <h3 style={{ fontSize: "14px", fontWeight: 800, color: "#f8fafc", margin: "2px 0 0" }}>
                Quản lý phụ đề & logo ({candidates.length})
              </h3>
            </div>
          </div>

          <div className="jacs-table-wrapper" style={{ border: "1px solid rgba(255, 255, 255, 0.06)", borderRadius: "8px", overflow: "hidden" }}>
            <table className="jacs-table">
              <thead>
                <tr style={{ background: "rgba(0, 0, 0, 0.35)" }}>
                  <th>Tên Video / Phân Cảnh</th>
                  <th>Nội Dung Phụ Đề</th>
                  <th>Vị Trí Phụ Đề</th>
                  <th>Logo Watermark</th>
                  <th style={{ textAlign: "right", minWidth: "150px" }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {pagedCandidates.length > 0 ? (
                  pagedCandidates.map((job) => {
                    const subText =
                      job.subtitleText ||
                      job.analysis?.voiceScript ||
                      job.analysis?.scenes?.[0]?.voiceover ||
                      "Chưa có phụ đề";
                    const isSelected = activePreviewJob?.id === job.id;

                    return (
                      <tr
                        key={job.id}
                        onClick={() => setSelectedJobId(job.id)}
                        style={{
                          cursor: "pointer",
                          background: isSelected ? "rgba(245, 158, 11, 0.08)" : undefined,
                          borderLeft: isSelected ? "3px solid #f59e0b" : "3px solid transparent",
                        }}
                      >
                        <td>
                          <strong style={{ color: "#ffffff", display: "flex", alignItems: "center", gap: "6px" }}>
                            <Film size={12} color="#f59e0b" />
                            {job.name}
                          </strong>
                          <small style={{ color: "#64748b", fontSize: "11px" }}>{job.source}</small>
                        </td>
                        <td style={{ maxWidth: "240px" }}>
                          <p
                            style={{
                              margin: 0,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              color: "#cbd5e1",
                              fontSize: "11.5px",
                            }}
                          >
                            {subText}
                          </p>
                        </td>
                        <td>
                          <span
                            style={{
                              padding: "2px 7px",
                              borderRadius: "4px",
                              background: "rgba(255,255,255,0.06)",
                              fontSize: "11px",
                              color: "#94a3b8",
                            }}
                          >
                            {job.subtitleStyle === "top"
                              ? "Trên cùng"
                              : job.subtitleStyle === "center"
                              ? "Chính giữa"
                              : "Dưới cùng"}
                          </span>
                        </td>
                        <td>
                          {job.logoPath ? (
                            <span style={{ color: "#34d399", fontWeight: 700, fontSize: "11.5px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                              <Check2 size={13} /> Đã gắn logo
                            </span>
                          ) : (
                            <span style={{ color: "#64748b", fontSize: "11px" }}>Chưa có logo</span>
                          )}
                        </td>
                        <td style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
                            <button
                              type="button"
                              className="btn-secondary"
                              style={{ padding: "4px 10px", fontSize: "11px" }}
                              onClick={() => openEditModal(job)}
                            >
                              <Sliders size={11} color="#f59e0b" /> Chỉnh Brand
                            </button>
                            <button
                              type="button"
                              className="btn-primary"
                              style={{ padding: "4px 10px", fontSize: "11px", background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
                              onClick={() => renderBrandedJob(job)}
                            >
                              <PlayFill size={13} /> Render
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: "36px", color: "#64748b" }}>
                      <BookmarkStarFill size={28} style={{ opacity: 0.3, margin: "0 auto 8px", display: "block" }} />
                      Chưa có video nào. Hãy nạp nguồn video ở bước 1.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {candidates.length > pageSize && (
            <div style={{ marginTop: "12px" }}>
              <Pagination
                total={candidates.length}
                pageSize={pageSize}
                page={page}
                onPageChange={setPage}
              />
            </div>
          )}
        </section>

        {/* Right: Live Interactive Canvas Preview Simulator */}
        <section
          style={{
            background: "rgba(16, 20, 30, 0.9)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "12px",
            padding: "18px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
            <EyeFill size={14} color="#f59e0b" />
            <h4 style={{ fontSize: "13.5px", fontWeight: 800, color: "#f8fafc", margin: 0 }}>
              Mô Phỏng Hiển Thị (9:16 Shorts)
            </h4>
          </div>

          {activePreviewJob ? (
            <div>
              {/* Phone Aspect Ratio Canvas Container */}
              <div
                style={{
                  width: "100%",
                  aspectRatio: "9/16",
                  maxHeight: "380px",
                  background: "#080c14",
                  border: "2px solid rgba(245, 158, 11, 0.35)",
                  borderRadius: "12px",
                  position: "relative",
                  overflow: "hidden",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  padding: "12px",
                  margin: "0 auto",
                }}
              >
                {/* Simulated Video Frame Background Grid */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    backgroundImage:
                      "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
                    backgroundSize: "20px 20px",
                    zIndex: 0,
                  }}
                />

                {/* Watermark Simulated Position */}
                {(() => {
                  const pos = activePreviewJob.logoPosition || "bottom-left";
                  const opacity = (activePreviewJob.logoOpacity ?? 85) / 100;
                  const isTop = pos.startsWith("top");
                  const isLeft = pos.endsWith("left");

                  return (
                    <div
                      style={{
                        position: "absolute",
                        top: isTop ? "16px" : undefined,
                        bottom: !isTop ? "48px" : undefined,
                        left: isLeft ? "14px" : undefined,
                        right: !isLeft ? "14px" : undefined,
                        zIndex: 2,
                        opacity,
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        background: "rgba(0, 0, 0, 0.4)",
                        border: "1px dashed rgba(245, 158, 11, 0.6)",
                        padding: "4px 8px",
                        borderRadius: "6px",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <ImageFill size={14} color="#f59e0b" />
                      <span style={{ fontSize: "10px", fontWeight: 800, color: "#ffffff", letterSpacing: "0.5px" }}>
                        LOGO WATERMARK
                      </span>
                    </div>
                  );
                })()}

                {/* Subtitle Simulated Position */}
                {(() => {
                  const subPos = activePreviewJob.subtitleStyle || "bottom";
                  const subText =
                    activePreviewJob.subtitleText ||
                    activePreviewJob.analysis?.voiceScript ||
                    "Phụ đề đồng bộ hiển thị tại đây...";

                  return (
                    <div
                      style={{
                        position: "absolute",
                        top: subPos === "top" ? "20px" : subPos === "center" ? "45%" : undefined,
                        bottom: subPos === "bottom" ? "14px" : undefined,
                        left: "12px",
                        right: "12px",
                        transform: subPos === "center" ? "translateY(-50%)" : undefined,
                        zIndex: 2,
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          background: "rgba(0, 0, 0, 0.75)",
                          border: "1px solid rgba(245, 158, 11, 0.5)",
                          padding: "6px 10px",
                          borderRadius: "6px",
                          color: "#fbbf24",
                          fontSize: "11px",
                          fontWeight: 800,
                          lineHeight: 1.4,
                          textShadow: "0 1px 4px rgba(0,0,0,0.8)",
                        }}
                      >
                        {subText.slice(0, 75)}...
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div style={{ marginTop: "12px", textAlign: "center" }}>
                <small style={{ color: "#94a3b8", fontSize: "11px" }}>
                  Đang xem: <strong style={{ color: "#f8fafc" }}>{activePreviewJob.name}</strong>
                </small>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ width: "100%", marginTop: "8px", padding: "6px 12px", fontSize: "11.5px" }}
                  onClick={() => openEditModal(activePreviewJob)}
                >
                  <Sliders size={12} color="#f59e0b" /> Chỉnh sửa vị trí & Logo
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "40px 10px", color: "#64748b" }}>
              Chưa có video nào để xem trước.
            </div>
          )}
        </section>

      </div>

      {/* 4. Modal Chỉnh Sửa Phụ Đề & Logo Watermark */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Cấu hình Brand & Phụ đề: ${editingJob?.name || ""}`}
        eyebrow="BRANDING & SUBTITLE STYLING"
        maxWidth="600px"
      >
        {editingJob && (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <label className="field-label">
              Nội dung Phụ đề (Subtitle text)
              <textarea
                rows={3}
                value={
                  editingJob.subtitleText ||
                  editingJob.analysis?.voiceScript ||
                  ""
                }
                onChange={(e) =>
                  setEditingJob({ ...editingJob, subtitleText: e.target.value })
                }
                placeholder="Nhập nội dung phụ đề muốn burn vào video..."
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "12.5px",
                  lineHeight: "1.5",
                  background: "rgba(0, 0, 0, 0.35)",
                }}
              />
            </label>

            <div className="field-pair">
              <label className="field-label">
                Vị trí Phụ Đề (Subtitles)
                <select
                  value={editingJob.subtitleStyle || "bottom"}
                  onChange={(e) =>
                    setEditingJob({
                      ...editingJob,
                      subtitleStyle: e.target.value as Job["subtitleStyle"],
                    })
                  }
                >
                  {SUBTITLE_STYLES.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field-label">
                Vị trí Logo Watermark
                <select
                  value={editingJob.logoPosition || "bottom-left"}
                  onChange={(e) =>
                    setEditingJob({
                      ...editingJob,
                      logoPosition: e.target.value as Job["logoPosition"],
                    })
                  }
                >
                  {POSITIONS.map(([pos, label]) => (
                    <option key={pos} value={pos}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="field-pair">
              <label className="field-label">
                Độ mờ Logo (% Opacity)
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    step={5}
                    value={editingJob.logoOpacity ?? 85}
                    onChange={(e) =>
                      setEditingJob({
                        ...editingJob,
                        logoOpacity: Number(e.target.value),
                      })
                    }
                    style={{ flex: 1, accentColor: "#f59e0b" }}
                  />
                  <span style={{ fontSize: "12px", fontWeight: 800, color: "#f59e0b", minWidth: "40px" }}>
                    {editingJob.logoOpacity ?? 85}%
                  </span>
                </div>
              </label>

              <label className="field-label">
                File Ảnh Logo Watermark
                <div className="path-input-row">
                  <ImageFill size={14} color="#f59e0b" />
                  <span style={{ fontSize: "11.5px" }}>{editingJob.logoPath ? editingJob.logoPath.split(/[\\/]/).pop() : "Chưa chọn file logo"}</span>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ padding: "4px 10px", fontSize: "11px" }}
                    onClick={async () => {
                      const p = await getRuntime().pickImage?.();
                      if (p) setEditingJob({ ...editingJob, logoPath: p });
                    }}
                  >
                    Chọn file
                  </button>
                </div>
              </label>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setIsEditModalOpen(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", boxShadow: "0 0 14px rgba(245, 158, 11, 0.4)" }}
                onClick={() => {
                  onUpdateJob(editingJob.id, {
                    subtitleText: editingJob.subtitleText,
                    subtitleStyle: editingJob.subtitleStyle,
                    logoPosition: editingJob.logoPosition,
                    logoOpacity: editingJob.logoOpacity,
                    logoPath: editingJob.logoPath,
                  });
                  setIsEditModalOpen(false);
                  popup.success("✓ Đã lưu cấu hình phụ đề & logo watermark thành công.");
                }}
              >
                Lưu cấu hình
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
