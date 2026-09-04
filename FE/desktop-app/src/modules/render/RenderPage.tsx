import { useEffect, useMemo, useState } from "react";
import type { Job, NavKey } from "../../core/types";
import { getRuntime } from "../../core/runtime";
import { Icon } from "../../shared/Icon";
import { StatusPill } from "../../shared/StatusPill";
import { Pagination } from "../../shared/Pagination";
import { WorkflowStepper } from "../../shared/WorkflowStepper";
import { Modal } from "../../shared/Modal";

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

  const filteredJobs = useMemo(() => {
    if (activeFilter === "running")
      return renderJobs.filter((j) => j.status === "running" || j.status === "queued");
    if (activeFilter === "completed")
      return renderJobs.filter((j) => j.status === "completed");
    if (activeFilter === "failed")
      return renderJobs.filter((j) => j.status === "failed" || j.status === "cancelled");
    return renderJobs;
  }, [renderJobs, activeFilter]);

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

  function deleteSelected() {
    if (!onDeleteJobs || !selectedJobIds.length) return;
    if (!window.confirm(`Xóa ${selectedJobIds.length} job đã chọn khỏi hàng đợi?`)) return;
    onDeleteJobs(selectedJobIds);
    setSelectedJobIds([]);
  }

  return (
    <div className="page-stack page-enter">
      {/* Page Title & Top Actions */}
      <div className="page-title">
        <div>
          <p className="eyebrow">WORKFLOW / BƯỚC 6 · RENDER & EXPORT</p>
          <h2>6. Render & Xuất bản Video</h2>
          <p>
            Quản lý hàng đợi xuất bản video FFmpeg GPU/CPU, kiểm soát tiến trình thời gian thực và mở file output.
          </p>
        </div>
        <div className="page-title-actions">
          <button type="button" className="btn-secondary" onClick={() => void chooseFolder()}>
            <Icon name="folder" size={13} /> Thư mục Output
          </button>
          {onNavigate && (
            <button type="button" className="btn-primary" onClick={() => onNavigate("batch")}>
              <Icon name="plus" size={13} /> + Tạo Job Render Mới
            </button>
          )}
        </div>
      </div>

      {onNavigate && <WorkflowStepper activeStep="render" onNavigate={onNavigate} />}

      {/* Output Directory Banner */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          background: "rgba(255, 255, 255, 0.03)",
          border: "1px solid var(--line)",
          borderRadius: "10px",
          fontSize: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
          <Icon name="folder" size={14} />
          <span style={{ color: "#94a3b8" }}>Nơi lưu video hoàn tất:</span>
          <strong
            style={{
              color: "#38bdf8",
              fontFamily: "'DM Mono', monospace",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {outputFolder || "Chưa cấu hình"}
          </strong>
        </div>
        <button
          type="button"
          className="btn-secondary"
          style={{ padding: "4px 10px", fontSize: "11px" }}
          onClick={() => void chooseFolder()}
        >
          Đổi thư mục
        </button>
      </div>

      {/* Render Queue Table */}
      <section className="panel-card" style={{ padding: "20px" }}>
        <div className="panel-head">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div>
              <p className="eyebrow">RENDER QUEUE</p>
              <h3>Hàng đợi xuất bản ({filteredJobs.length})</h3>
            </div>
            {/* Filter Tabs */}
            <div style={{ display: "flex", gap: "4px", marginLeft: "16px" }}>
              <button
                type="button"
                className={`btn-secondary ${activeFilter === "all" ? "active" : ""}`}
                style={{
                  padding: "4px 9px",
                  fontSize: "11px",
                  background: activeFilter === "all" ? "rgba(249,87,56,0.2)" : undefined,
                  borderColor: activeFilter === "all" ? "var(--orange)" : undefined,
                }}
                onClick={() => setActiveFilter("all")}
              >
                Tất cả ({renderJobs.length})
              </button>
              <button
                type="button"
                className={`btn-secondary ${activeFilter === "running" ? "active" : ""}`}
                style={{
                  padding: "4px 9px",
                  fontSize: "11px",
                  background: activeFilter === "running" ? "rgba(249,87,56,0.2)" : undefined,
                  borderColor: activeFilter === "running" ? "var(--orange)" : undefined,
                }}
                onClick={() => setActiveFilter("running")}
              >
                Đang chạy ({renderJobs.filter((j) => j.status === "running" || j.status === "queued").length})
              </button>
              <button
                type="button"
                className={`btn-secondary ${activeFilter === "completed" ? "active" : ""}`}
                style={{
                  padding: "4px 9px",
                  fontSize: "11px",
                  background: activeFilter === "completed" ? "rgba(249,87,56,0.2)" : undefined,
                  borderColor: activeFilter === "completed" ? "var(--orange)" : undefined,
                }}
                onClick={() => setActiveFilter("completed")}
              >
                Hoàn tất ({renderJobs.filter((j) => j.status === "completed").length})
              </button>
              <button
                type="button"
                className={`btn-secondary ${activeFilter === "failed" ? "active" : ""}`}
                style={{
                  padding: "4px 9px",
                  fontSize: "11px",
                  background: activeFilter === "failed" ? "rgba(249,87,56,0.2)" : undefined,
                  borderColor: activeFilter === "failed" ? "var(--orange)" : undefined,
                }}
                onClick={() => setActiveFilter("failed")}
              >
                Lỗi ({renderJobs.filter((j) => j.status === "failed" || j.status === "cancelled").length})
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {selectedJobIds.length > 0 && (
              <>
                {onCancelJob && selectedJobIds.some((id) => {
                  const j = jobs.find((item) => item.id === id);
                  return j?.status === "running" || j?.status === "queued";
                }) && (
                  <button
                    type="button"
                    className="button-danger"
                    style={{ background: "rgba(239, 68, 68, 0.2)", borderColor: "#ef4444", color: "#fca5a5" }}
                    onClick={() => {
                      const activeSelected = selectedJobIds.filter((id) => {
                        const j = jobs.find((item) => item.id === id);
                        return j?.status === "running" || j?.status === "queued";
                      });
                      if (!activeSelected.length) return;
                      if (!window.confirm(`Hủy ${activeSelected.length} job đang chạy / chờ render đã chọn?`)) return;
                      activeSelected.forEach((id) => onCancelJob(id));
                    }}
                  >
                    <Icon name="x" size={12} /> Hủy ({selectedJobIds.filter((id) => {
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
                    className="btn-secondary"
                    style={{ borderColor: "#38bdf8", color: "#38bdf8" }}
                    onClick={() => {
                      const retrySelected = selectedJobIds.filter((id) => {
                        const j = jobs.find((item) => item.id === id);
                        return j?.status === "failed" || j?.status === "cancelled";
                      });
                      retrySelected.forEach((id) => onRetryJob(id));
                    }}
                  >
                    <Icon name="refresh" size={12} /> Chạy lại ({selectedJobIds.filter((id) => {
                      const j = jobs.find((item) => item.id === id);
                      return j?.status === "failed" || j?.status === "cancelled";
                    }).length}) job
                  </button>
                )}

                <button type="button" className="button-danger" onClick={deleteSelected}>
                  <Icon name="trash" size={12} /> Xóa {selectedJobIds.length} job đã chọn
                </button>
              </>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div className="jacs-table-wrapper">
          <table className="jacs-table">
            <thead>
              <tr>
                <th style={{ width: "40px" }}>
                  <input
                    type="checkbox"
                    checked={filteredJobs.length > 0 && selectedJobIds.length === filteredJobs.length}
                    onChange={toggleAll}
                  />
                </th>
                <th>Tên Video / Job</th>
                <th>Tỷ lệ & Định dạng</th>
                <th>Tiến trình Render</th>
                <th>Trạng thái</th>
                <th>Thời gian</th>
                <th style={{ textAlign: "right", minWidth: "160px" }}>Cột Thao Tác (Actions)</th>
              </tr>
            </thead>
            <tbody>
              {pagedJobs.length > 0 ? (
                pagedJobs.map((job) => {
                  const isSelected = selectedJobIds.includes(job.id);
                  return (
                    <tr key={job.id} className={isSelected ? "is-selected" : ""}>
                      <td>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectJob(job.id)}
                        />
                      </td>
                      <td>
                        <strong style={{ color: "#ffffff", display: "block" }}>{job.name}</strong>
                        <small style={{ color: "#64748b" }}>{job.source}</small>
                        {job.error && (
                          <div
                            style={{
                              color: "#f87171",
                              fontSize: "11px",
                              marginTop: "4px",
                              background: "rgba(239, 68, 68, 0.12)",
                              padding: "4px 8px",
                              borderRadius: "6px",
                              border: "1px solid rgba(239, 68, 68, 0.3)",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            <Icon name="alert" size={11} />
                            <span><strong>Lỗi:</strong> {job.error}</span>
                          </div>
                        )}
                      </td>
                      <td>
                        <span
                          style={{
                            padding: "2px 6px",
                            borderRadius: "4px",
                            background: "rgba(255, 255, 255, 0.06)",
                            fontSize: "10.5px",
                            fontFamily: "'DM Mono', monospace",
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
                              color: "#10b981",
                              fontSize: "10.5px",
                            }}
                          >
                            Voice AI
                          </span>
                        )}
                      </td>
                      <td style={{ minWidth: "120px" }}>
                        <div className="job-progress">
                          <div className="progress-track">
                            <i style={{ width: `${job.progress}%` }} />
                          </div>
                          <small>{job.progress}%</small>
                        </div>
                      </td>
                      <td>
                        <StatusPill status={job.status} />
                      </td>
                      <td>
                        <small style={{ color: "#94a3b8" }}>{job.createdAt}</small>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
                          {job.outputPath && (
                            <button
                              type="button"
                              className="btn-primary"
                              style={{ padding: "4px 8px", fontSize: "11px" }}
                              onClick={() => void getRuntime().revealPath(job.outputPath!)}
                            >
                              <Icon name="folder" size={11} /> Mở file MP4
                            </button>
                          )}

                          {onNavigate && (
                            <button
                              type="button"
                              className="text-button"
                              onClick={() => onNavigate("timeline")}
                            >
                              Dựng
                            </button>
                          )}

                          {(job.status === "failed" || job.status === "cancelled") && (
                            <>
                              {onRetryJob && (
                                <button
                                  type="button"
                                  className="text-button"
                                  style={{ color: "#38bdf8" }}
                                  onClick={() => onRetryJob(job.id)}
                                >
                                  Chạy lại
                                </button>
                              )}
                              {onNavigate && (
                                <button
                                  type="button"
                                  className="text-button"
                                  style={{ color: "#fbbf24" }}
                                  onClick={() => onNavigate("logs")}
                                >
                                  Xem Log
                                </button>
                              )}
                            </>
                          )}

                          {(job.status === "running" || job.status === "queued") && onCancelJob && (
                            <button
                              type="button"
                              className="text-button"
                              style={{ color: "#f87171" }}
                              onClick={() => onCancelJob(job.id)}
                            >
                              <Icon name="x" size={11} /> Hủy
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                    Không có job nào trong danh mục này.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredJobs.length > pageSize && (
          <div style={{ marginTop: "14px" }}>
            <Pagination
              total={filteredJobs.length}
              pageSize={pageSize}
              page={page}
              onPageChange={setPage}
            />
          </div>
        )}
      </section>
    </div>
  );
}
