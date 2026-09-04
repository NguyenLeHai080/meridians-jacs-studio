import { useEffect, useMemo, useState } from "react";
import type { Job, NavKey } from "../../core/types";
import { getRuntime, isNativeRuntime } from "../../core/runtime";
import { Icon } from "../../shared/Icon";
import { Pagination } from "../../shared/Pagination";
import { WorkflowStepper } from "../../shared/WorkflowStepper";
import { Modal } from "../../shared/Modal";

type Props = {
  jobs: Job[];
  onNavigate: (key: NavKey) => void;
  onUpdateJob: (id: string, values: Partial<Job>) => void;
  onAddJob: (job: Job) => void;
};

const positions: Array<[NonNullable<Job["logoPosition"]>, string]> = [
  ["top-left", "Góc trên trái"],
  ["top-right", "Góc trên phải"],
  ["bottom-left", "Góc dưới trái (Shorts/Reels)"],
  ["bottom-right", "Góc dưới phải"],
];

function fileUrl(value?: string) {
  if (!value || !isNativeRuntime()) return undefined;
  return `jacs-media://local?path=${encodeURIComponent(value)}`;
}

export function BrandPage({ jobs, onNavigate, onUpdateJob, onAddJob }: Props) {
  const [selectedId, setSelectedId] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [message, setMessage] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);

  const candidates = useMemo(
    () =>
      jobs.filter(
        (job) => job.localPath || job.sourceType === "url" || job.analysis
      ),
    [jobs]
  );

  const pagedCandidates = useMemo(
    () => candidates.slice((page - 1) * pageSize, page * pageSize),
    [candidates, page, pageSize]
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

  async function chooseLogoForJob(job: Job) {
    const path = await getRuntime().pickImage?.();
    if (path) {
      onUpdateJob(job.id, { logoPath: path });
      setMessage("✓ Đã chọn logo thương hiệu cho video.");
      setTimeout(() => setMessage(""), 2500);
    }
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
    onNavigate("render");
  }

  return (
    <div className="page-stack page-enter">
      {/* Header */}
      <div className="page-title">
        <div>
          <p className="eyebrow">WORKFLOW / BƯỚC 5 · BRANDING & SUBTITLES</p>
          <h2>5. Phụ đề & Nhận diện thương hiệu</h2>
          <p>
            Tùy biến vị trí phụ đề đồng bộ lời kể và gắn logo watermark trực tiếp vào video bằng engine GPU.
          </p>
        </div>
        <div className="page-title-actions">
          <button
            type="button"
            className="button-quiet"
            onClick={() => onNavigate("timeline")}
          >
            <Icon name="timeline" size={14} /> 4. Dựng Timeline
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => onNavigate("render")}
          >
            <Icon name="play" size={14} /> 6. Sang Render Xuất Bản
          </button>
        </div>
      </div>

      <WorkflowStepper activeStep="brand" onNavigate={onNavigate} />

      {message && <p className="form-help">{message}</p>}

      {/* Brand & Subtitle Management Table */}
      <section className="panel-card" style={{ padding: "20px" }}>
        <div className="panel-head">
          <div>
            <p className="eyebrow">BRANDING PIPELINE</p>
            <h3>Danh sách video & kịch bản ({candidates.length})</h3>
          </div>
        </div>

        <div className="jacs-table-wrapper">
          <table className="jacs-table">
            <thead>
              <tr>
                <th>Tên Video / Phân cảnh</th>
                <th>Phụ Đề (Subtitle Text)</th>
                <th>Vị Trí Phụ Đề</th>
                <th>Logo Watermark</th>
                <th style={{ textAlign: "right", minWidth: "160px" }}>Cột Thao Tác (Actions)</th>
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

                  return (
                    <tr key={job.id}>
                      <td>
                        <strong style={{ color: "#ffffff", display: "block" }}>{job.name}</strong>
                        <small style={{ color: "#64748b" }}>{job.source}</small>
                      </td>
                      <td style={{ maxWidth: "260px" }}>
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
                            fontSize: "10.5px",
                          }}
                        >
                          {job.subtitleStyle || "Mặc định (Dưới)"}
                        </span>
                      </td>
                      <td>
                        {job.logoPath ? (
                          <span style={{ color: "#10b981", fontWeight: 700, fontSize: "11px" }}>
                            ✓ Đã gắn logo
                          </span>
                        ) : (
                          <span style={{ color: "#64748b", fontSize: "11px" }}>Chưa có logo</span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ padding: "4px 8px", fontSize: "11px" }}
                            onClick={() => openEditModal(job)}
                          >
                            <Icon name="sliders" size={11} /> Chỉnh Brand
                          </button>
                          <button
                            type="button"
                            className="btn-primary"
                            style={{ padding: "4px 8px", fontSize: "11px" }}
                            onClick={() => renderBrandedJob(job)}
                          >
                            <Icon name="play" size={11} /> Render
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                    Chưa có video nào. Hãy nạp nguồn video ở bước 1.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {candidates.length > pageSize && (
          <div style={{ marginTop: "14px" }}>
            <Pagination
              total={candidates.length}
              pageSize={pageSize}
              page={page}
              onPageChange={setPage}
            />
          </div>
        )}
      </section>

      {/* Modal Chỉnh Sửa Phụ Đề & Logo Watermark */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Cấu hình Brand & Phụ đề: ${editingJob?.name || ""}`}
        eyebrow="BRANDING & SUBTITLE STYLING"
        maxWidth="580px"
      >
        {editingJob && (
          <div>
            <label className="field-label">
              Nội dung Phụ đề (Subtitle text)
              <textarea
                rows={4}
                value={
                  editingJob.subtitleText ||
                  editingJob.analysis?.voiceScript ||
                  ""
                }
                onChange={(e) =>
                  setEditingJob({ ...editingJob, subtitleText: e.target.value })
                }
              />
            </label>

            <div className="field-pair" style={{ marginTop: "14px" }}>
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
                  {positions.map(([pos, label]) => (
                    <option key={pos} value={pos}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field-label">
                Độ mờ Logo (%)
                <input
                  type="number"
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
                />
              </label>
            </div>

            <div style={{ marginTop: "14px" }}>
              <label className="field-label">
                File Logo Watermark
                <div className="path-input-row">
                  <Icon name="spark" size={14} />
                  <span>{editingJob.logoPath || "Chưa chọn file logo"}</span>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ padding: "4px 10px", fontSize: "11px" }}
                    onClick={async () => {
                      const p = await getRuntime().pickImage?.();
                      if (p) setEditingJob({ ...editingJob, logoPath: p });
                    }}
                  >
                    Chọn file ảnh
                  </button>
                </div>
              </label>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
              <button
                type="button"
                className="button-quiet"
                onClick={() => setIsEditModalOpen(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  onUpdateJob(editingJob.id, {
                    subtitleText: editingJob.subtitleText,
                    logoPosition: editingJob.logoPosition,
                    logoOpacity: editingJob.logoOpacity,
                    logoPath: editingJob.logoPath,
                  });
                  setIsEditModalOpen(false);
                  setMessage("✓ Đã lưu cấu hình phụ đề & logo.");
                  setTimeout(() => setMessage(""), 2500);
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
