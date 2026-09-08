import { useEffect, useMemo, useState } from "react";
import type { Job, NavKey } from "../../core/types";
import { getRuntime, isNativeRuntime } from "../../core/runtime";
import { StatusPill } from "../../shared/StatusPill";
import { Pagination } from "../../shared/Pagination";
import { Modal } from "../../shared/Modal";
import { popup } from "../../shared/popup";
import {
  CameraReelsFill,
  FolderFill,
  PlusLg,
  CheckCircleFill,
  ClockFill,
  LightningChargeFill,
  PlayFill,
  ArrowRepeat,
  Trash3Fill,
  XLg,
  Film,
  CpuFill,
  ExclamationTriangleFill,
  CollectionPlayFill,
  Sliders,
  BoxArrowUpRight,
  EyeFill,
} from "react-bootstrap-icons";

function resolveMediaSrc(pathOrUrl?: string): string {
  if (!pathOrUrl) return "";
  if (
    pathOrUrl.startsWith("http://") ||
    pathOrUrl.startsWith("https://") ||
    pathOrUrl.startsWith("blob:") ||
    pathOrUrl.startsWith("data:") ||
    pathOrUrl.startsWith("jacs-media:")
  ) {
    return pathOrUrl;
  }
  if (isNativeRuntime()) {
    return `jacs-media://local?path=${encodeURIComponent(pathOrUrl)}`;
  }
  return pathOrUrl;
}

export function RenderPage({
  jobs,
  onNavigate,
  onUpdateJob,
  onRetryJob,
  onCancelJob,
  onDeleteJobs,
}: {
  jobs: Job[];
  onNavigate?: (key: NavKey) => void;
  onUpdateJob?: (jobId: string, values: Partial<Job>) => void;
  onRetryJob?: (jobId: string) => void;
  onCancelJob?: (jobId: string) => void;
  onDeleteJobs?: (jobIds: string[]) => void;
}) {
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [outputFolder, setOutputFolder] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [activeFilter, setActiveFilter] = useState<"all" | "running" | "completed" | "failed">("all");
  const [previewJob, setPreviewJob] = useState<Job | null>(null);

  const renderJobs = useMemo(
    () => jobs.filter((job) => !job.sourceOnly),
    [jobs]
  );

  const runningJobs = useMemo(
    () => renderJobs.filter((j) => j.status === "running" || j.status === "queued"),
    [renderJobs]
  );

  const completedJobs = useMemo(
    () => renderJobs.filter((j) => j.status === "completed"),
    [renderJobs]
  );

  const failedJobs = useMemo(
    () => renderJobs.filter((j) => j.status === "failed" || j.status === "cancelled"),
    [renderJobs]
  );

  const filteredJobs = useMemo(() => {
    if (activeFilter === "running") return runningJobs;
    if (activeFilter === "completed") return completedJobs;
    if (activeFilter === "failed") return failedJobs;
    return renderJobs;
  }, [renderJobs, activeFilter, runningJobs, completedJobs, failedJobs]);

  const pagedJobs = useMemo(
    () => filteredJobs.slice((page - 1) * pageSize, page * pageSize),
    [filteredJobs, page, pageSize]
  );

  useEffect(() => {
    setPage((current) =>
      Math.min(current, Math.max(1, Math.ceil(filteredJobs.length / pageSize)))
    );
  }, [filteredJobs.length, pageSize]);

  useEffect(() => {
    void getRuntime()
      .getPreferences()
      .then((pref) => setOutputFolder(pref.outputPath));
  }, []);

  async function chooseFolder() {
    const value = await getRuntime().pickOutputFolder?.();
    if (!value) return;
    setOutputFolder(value);
    const pref = await getRuntime().getPreferences();
    await getRuntime().savePreferences({ ...pref, outputPath: value });
    popup.success("✓ Đã cập nhật thư mục lưu video hoàn tất.");
  }

  function toggleSelectJob(id: string) {
    setSelectedJobIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  function toggleAll() {
    setSelectedJobIds((current) =>
      current.length === filteredJobs.length ? [] : filteredJobs.map((j) => j.id)
    );
  }

  async function deleteSelected() {
    if (!onDeleteJobs || !selectedJobIds.length) return;
    const confirmed = await popup.confirmDelete(
      "Xác Nhận Xóa Job",
      `Xóa ${selectedJobIds.length} job đã chọn khỏi hàng đợi render?`
    );
    if (!confirmed) return;
    onDeleteJobs(selectedJobIds);
    setSelectedJobIds([]);
    popup.success(`Đã xóa ${selectedJobIds.length} job khỏi hàng đợi render.`);
  }

  return (
    <div
      className="render-workspace-root animate-fade-in"
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
            onClick={() => void chooseFolder()}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#f8fafc",
              padding: "7px 14px",
              borderRadius: "7px",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <FolderFill size={13} color="#fbbf24" /> Thư Mục Output
          </button>

          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate("batch")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "linear-gradient(135deg, #d97706, #f59e0b)",
                border: "none",
                color: "#12151f",
                padding: "7px 16px",
                borderRadius: "7px",
                fontSize: "12px",
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 0 16px rgba(245, 158, 11, 0.4)",
              }}
            >
              <PlusLg size={13} /> + Tạo Job Render Mới
            </button>
          )}
        </div>
      </div>

      {/* 2. KPI Summary Bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "8px", marginBottom: "12px", flexShrink: 0 }}>
        
        <div style={{ background: "rgba(18, 22, 32, 0.8)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "8px", padding: "8px 12px", display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
          <div style={{ width: "34px", height: "34px", borderRadius: "7px", background: "rgba(245, 158, 11, 0.12)", color: "#fbbf24", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", flexShrink: 0 }}>
            <CameraReelsFill />
          </div>
          <div style={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
            <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>TỔNG JOB RENDER</div>
            <div style={{ fontSize: "14px", fontWeight: 800, color: "#f8fafc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {renderJobs.length} <span style={{ fontSize: "10.5px", color: "#64748b", fontWeight: 500 }}>video</span>
            </div>
          </div>
        </div>

        <div style={{ background: "rgba(18, 22, 32, 0.8)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "8px", padding: "8px 12px", display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
          <div style={{ width: "34px", height: "34px", borderRadius: "7px", background: "rgba(245, 158, 11, 0.15)", color: "#fbbf24", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", flexShrink: 0 }}>
            <LightningChargeFill />
          </div>
          <div style={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
            <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>ĐANG XUẤT BẢN</div>
            <div style={{ fontSize: "14px", fontWeight: 800, color: "#fbbf24", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {runningJobs.length} <span style={{ fontSize: "10.5px", color: "#64748b", fontWeight: 500 }}>tiến trình</span>
            </div>
          </div>
        </div>

        <div style={{ background: "rgba(18, 22, 32, 0.8)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "8px", padding: "8px 12px", display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
          <div style={{ width: "34px", height: "34px", borderRadius: "7px", background: "rgba(16, 185, 129, 0.12)", color: "#34d399", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", flexShrink: 0 }}>
            <CheckCircleFill />
          </div>
          <div style={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
            <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>HOÀN TẤT XUẤT FILE</div>
            <div style={{ fontSize: "14px", fontWeight: 800, color: "#34d399", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {completedJobs.length} <span style={{ fontSize: "10.5px", color: "#64748b", fontWeight: 500 }}>tệp MP4</span>
            </div>
          </div>
        </div>

        <div style={{ background: "rgba(18, 22, 32, 0.8)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "8px", padding: "8px 12px", display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
          <div style={{ width: "34px", height: "34px", borderRadius: "7px", background: "rgba(56, 189, 248, 0.12)", color: "#38bdf8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", flexShrink: 0 }}>
            <FolderFill />
          </div>
          <div style={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
            <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>THƯ MỤC OUTPUT</div>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#38bdf8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontFamily: "monospace" }} title={outputFolder}>
              {outputFolder || "Chưa cấu hình"}
            </div>
          </div>
        </div>

      </div>

      {/* 3. Render Queue Panel */}
      <div style={{ background: "rgba(16, 20, 30, 0.9)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "10px", padding: "14px", display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
        
        {/* Panel Header & Filters */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "10px" }}>
          
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <div>
              <span style={{ fontSize: "10.5px", fontWeight: 800, color: "#fbbf24", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                RENDER QUEUE
              </span>
              <h3 style={{ fontSize: "14px", fontWeight: 800, color: "#f8fafc", margin: "1px 0 0" }}>
                Hàng Đợi Xuất Bản ({filteredJobs.length})
              </h3>
            </div>

            {/* Filter Pills */}
            <div style={{ display: "flex", gap: "4px" }}>
              {[
                { key: "all", label: `Tất cả (${renderJobs.length})` },
                { key: "running", label: `⚡ Đang chạy (${runningJobs.length})` },
                { key: "completed", label: `✓ Hoàn tất (${completedJobs.length})` },
                { key: "failed", label: `⚠️ Lỗi (${failedJobs.length})` },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveFilter(tab.key as any)}
                  style={{
                    background: activeFilter === tab.key ? "rgba(245, 158, 11, 0.25)" : "rgba(255,255,255,0.05)",
                    border: activeFilter === tab.key ? "1px solid #f59e0b" : "1px solid rgba(255,255,255,0.08)",
                    color: activeFilter === tab.key ? "#fbbf24" : "#94a3b8",
                    padding: "3px 10px",
                    borderRadius: "5px",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bulk Actions */}
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            {selectedJobIds.length > 0 && (
              <>
                {onCancelJob && selectedJobIds.some((id) => {
                  const j = jobs.find((item) => item.id === id);
                  return j?.status === "running" || j?.status === "queued";
                }) && (
                  <button
                    type="button"
                    onClick={async () => {
                      const activeSelected = selectedJobIds.filter((id) => {
                        const j = jobs.find((item) => item.id === id);
                        return j?.status === "running" || j?.status === "queued";
                      });
                      if (!activeSelected.length) return;
                      const confirmed = await popup.confirm(
                        "Hủy Tiến Trình Render",
                        `Hủy ${activeSelected.length} job đang chạy / chờ render đã chọn?`
                      );
                      if (!confirmed) return;
                      activeSelected.forEach((id) => onCancelJob(id));
                      popup.info(`Đã gửi lệnh hủy ${activeSelected.length} job.`);
                    }}
                    style={{ background: "rgba(239, 68, 68, 0.2)", border: "1px solid #ef4444", color: "#fca5a5", padding: "4px 10px", borderRadius: "5px", fontSize: "11px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                  >
                    <XLg size={10} /> Hủy ({selectedJobIds.filter((id) => {
                      const j = jobs.find((item) => item.id === id);
                      return j?.status === "running" || j?.status === "queued";
                    }).length}) job
                  </button>
                )}

                {onRetryJob && selectedJobIds.some((id) => {
                  const j = jobs.find((item) => item.id === id);
                  return j?.status === "failed" || j?.status === "cancelled";
                }) && (
                  <button
                    type="button"
                    onClick={() => {
                      const retrySelected = selectedJobIds.filter((id) => {
                        const j = jobs.find((item) => item.id === id);
                        return j?.status === "failed" || j?.status === "cancelled";
                      });
                      retrySelected.forEach((id) => onRetryJob(id));
                    }}
                    style={{ background: "rgba(56, 189, 248, 0.15)", border: "1px solid #38bdf8", color: "#38bdf8", padding: "4px 10px", borderRadius: "5px", fontSize: "11px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                  >
                    <ArrowRepeat size={10} /> Chạy lại ({selectedJobIds.filter((id) => {
                      const j = jobs.find((item) => item.id === id);
                      return j?.status === "failed" || j?.status === "cancelled";
                    }).length}) job
                  </button>
                )}

                <button
                  type="button"
                  onClick={deleteSelected}
                  style={{ background: "rgba(239, 68, 68, 0.2)", border: "1px solid rgba(239, 68, 68, 0.4)", color: "#f87171", padding: "4px 10px", borderRadius: "5px", fontSize: "11px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                >
                  <Trash3Fill size={10} /> Xóa {selectedJobIds.length} job
                </button>
              </>
            )}
          </div>

        </div>

        {/* Queue Table */}
        <div style={{ overflowX: "auto", flex: 1, minHeight: 0 }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 4px", fontSize: "12px", textAlign: "left" }}>
            <thead>
              <tr style={{ color: "#94a3b8", fontSize: "10.5px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                <th style={{ width: "36px", padding: "6px 8px" }}>
                  <input
                    type="checkbox"
                    checked={filteredJobs.length > 0 && selectedJobIds.length === filteredJobs.length}
                    onChange={toggleAll}
                    style={{ cursor: "pointer" }}
                  />
                </th>
                <th style={{ padding: "6px 8px" }}>Tên Video / Job</th>
                <th style={{ padding: "6px 8px" }}>Tỷ Lệ & Voice</th>
                <th style={{ padding: "6px 8px", minWidth: "140px" }}>Tiến Trình Render</th>
                <th style={{ padding: "6px 8px" }}>Trạng Thái</th>
                <th style={{ padding: "6px 8px" }}>Thời Gian</th>
                <th style={{ padding: "6px 8px", textAlign: "right", minWidth: "160px" }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {pagedJobs.length > 0 ? (
                pagedJobs.map((job) => {
                  const isSelected = selectedJobIds.includes(job.id);
                  return (
                    <tr
                      key={job.id}
                      style={{
                        background: isSelected ? "rgba(217, 119, 6, 0.15)" : "rgba(26, 30, 43, 0.55)",
                        border: isSelected ? "1px solid #f59e0b" : "1px solid rgba(255, 255, 255, 0.05)",
                        borderRadius: "6px",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <td style={{ padding: "8px", borderTopLeftRadius: "6px", borderBottomLeftRadius: "6px" }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectJob(job.id)}
                          style={{ cursor: "pointer" }}
                        />
                      </td>

                      <td style={{ padding: "8px" }}>
                        <strong style={{ color: "#f8fafc", display: "block", fontSize: "12px" }}>
                          {job.name}
                        </strong>
                        <small style={{ color: "#64748b", fontSize: "10.5px", display: "block", marginTop: "1px" }}>
                          {job.source || job.localPath}
                        </small>
                        {job.error && (
                          <div
                            style={{
                              color: "#f87171",
                              fontSize: "10.5px",
                              marginTop: "4px",
                              background: "rgba(239, 68, 68, 0.12)",
                              padding: "3px 8px",
                              borderRadius: "4px",
                              border: "1px solid rgba(239, 68, 68, 0.3)",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <ExclamationTriangleFill size={10} />
                            <span><strong>Lỗi:</strong> {job.error}</span>
                          </div>
                        )}
                      </td>

                      <td style={{ padding: "8px" }}>
                        <span
                          style={{
                            padding: "2px 6px",
                            borderRadius: "4px",
                            background: "rgba(255, 255, 255, 0.06)",
                            color: "#fbbf24",
                            fontSize: "10.5px",
                            fontWeight: 700,
                            fontFamily: "monospace",
                          }}
                        >
                          {job.aspectRatio || "9:16"}
                        </span>
                        {job.narratorEnabled && (
                          <span
                            style={{
                              marginLeft: "4px",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              background: "rgba(16, 185, 129, 0.15)",
                              color: "#34d399",
                              fontSize: "10px",
                              fontWeight: 700,
                            }}
                          >
                            🎙️ Voice AI
                          </span>
                        )}
                      </td>

                      <td style={{ padding: "8px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10.5px", fontWeight: 700, color: "#fbbf24" }}>
                            <span>{job.stage || "Đang xử lý"}</span>
                            <span>{job.progress || 0}%</span>
                          </div>
                          <div style={{ width: "100%", height: "5px", background: "rgba(0,0,0,0.4)", borderRadius: "4px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)" }}>
                            <div
                              style={{
                                width: `${job.progress || 0}%`,
                                height: "100%",
                                background: job.status === "failed" ? "#ef4444" : "linear-gradient(90deg, #d97706, #f59e0b)",
                                transition: "width 0.3s ease",
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: "8px" }}>
                        <StatusPill status={job.status} />
                      </td>

                      <td style={{ padding: "8px", color: "#94a3b8", fontSize: "11px" }}>
                        {job.createdAt || "Vừa xong"}
                      </td>

                      <td style={{ padding: "8px", textAlign: "right", borderTopRightRadius: "6px", borderBottomRightRadius: "6px" }}>
                        <div style={{ display: "inline-flex", gap: "5px", alignItems: "center" }}>
                          {job.outputPath && (
                            <>
                              <button
                                type="button"
                                onClick={() => setPreviewJob(job)}
                                style={{ background: "rgba(245, 158, 11, 0.15)", border: "1px solid rgba(245, 158, 11, 0.35)", color: "#fbbf24", padding: "3px 8px", borderRadius: "5px", fontSize: "11px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "3px" }}
                                title="Xem video đã xuất"
                              >
                                <PlayFill size={12} /> Xem
                              </button>
                              <button
                                type="button"
                                onClick={() => void getRuntime().revealPath(job.outputPath!)}
                                style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)", border: "none", color: "#12151f", padding: "3px 9px", borderRadius: "5px", fontSize: "11px", fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: "3px", boxShadow: "0 0 10px rgba(245, 158, 11, 0.3)" }}
                              >
                                <FolderFill size={10} /> Mở file MP4
                              </button>
                            </>
                          )}

                          {onNavigate && (
                            <button
                              type="button"
                              onClick={() => onNavigate("timeline")}
                              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#cbd5e1", padding: "3px 8px", borderRadius: "5px", fontSize: "11px", cursor: "pointer" }}
                            >
                              Dựng
                            </button>
                          )}

                          {(job.status === "failed" || job.status === "cancelled") && (
                            <>
                              {onRetryJob && (
                                <button
                                  type="button"
                                  onClick={() => onRetryJob(job.id)}
                                  style={{ background: "rgba(56, 189, 248, 0.12)", border: "1px solid rgba(56, 189, 248, 0.3)", color: "#38bdf8", padding: "3px 8px", borderRadius: "5px", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}
                                >
                                  Chạy lại
                                </button>
                              )}
                              {onNavigate && (
                                <button
                                  type="button"
                                  onClick={() => onNavigate("logs")}
                                  style={{ background: "rgba(245, 158, 11, 0.12)", border: "1px solid rgba(245, 158, 11, 0.3)", color: "#fbbf24", padding: "3px 8px", borderRadius: "5px", fontSize: "11px", cursor: "pointer" }}
                                >
                                  Xem Log
                                </button>
                              )}
                            </>
                          )}

                          {(job.status === "running" || job.status === "queued") && onCancelJob && (
                            <button
                              type="button"
                              onClick={() => onCancelJob(job.id)}
                              style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.35)", color: "#f87171", padding: "3px 8px", borderRadius: "5px", fontSize: "11px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "3px" }}
                            >
                              <XLg size={10} /> Hủy
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "40px 20px", color: "#64748b" }}>
                    <Film size={36} style={{ margin: "0 auto 8px", opacity: 0.3, color: "#fbbf24" }} />
                    <div style={{ fontSize: "13px", color: "#f8fafc", fontWeight: 700, marginBottom: "4px" }}>
                      Chưa có job render nào trong danh mục này
                    </div>
                    <span style={{ fontSize: "11.5px" }}>Hãy tạo job render mới từ Bước 1: Nguồn Video hoặc Bước 4: Timeline</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredJobs.length > pageSize && (
          <div style={{ marginTop: "12px", borderTop: "1px solid rgba(255, 255, 255, 0.06)", paddingTop: "8px" }}>
            <Pagination
              total={filteredJobs.length}
              pageSize={pageSize}
              page={page}
              onPageChange={setPage}
            />
          </div>
        )}

      </div>

      {/* Video Preview Modal */}
      {previewJob && (
        <Modal
          isOpen={Boolean(previewJob)}
          onClose={() => setPreviewJob(null)}
          title={`Xem Video Hoàn Tất: ${previewJob.name}`}
          eyebrow="VIDEO RENDER PREVIEW"
          maxWidth="840px"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ background: "#000", borderRadius: "8px", overflow: "hidden", maxHeight: "480px", display: "flex", justifyContent: "center" }}>
              <video
                src={resolveMediaSrc(previewJob.outputPath || previewJob.localPath)}
                controls
                autoPlay
                style={{ width: "100%", maxHeight: "480px", objectFit: "contain" }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11.5px", color: "#94a3b8" }}>
              <span>📁 Đường dẫn: <strong style={{ color: "#38bdf8", fontFamily: "monospace" }}>{previewJob.outputPath}</strong></span>
              <button
                type="button"
                onClick={() => void getRuntime().revealPath(previewJob.outputPath!)}
                style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)", border: "none", color: "#12151f", padding: "5px 12px", borderRadius: "5px", fontSize: "11.5px", fontWeight: 800, cursor: "pointer" }}
              >
                Mở trong File Explorer
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}
