import { useEffect, useMemo, useState } from "react";
import type { Job } from "../../core/types";
import { getRuntime } from "../../core/runtime";
import { Icon } from "../../shared/Icon";
import { StatusPill } from "../../shared/StatusPill";
import { Pagination } from "../../shared/Pagination";

export function RenderPage({ jobs }: { jobs: Job[] }) {
  const [selectedId, setSelectedId] = useState("");
  const [folder, setFolder] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const renderJobs = useMemo(() => jobs.filter((job) => !job.sourceOnly), [jobs]);
  const selected = useMemo(() => renderJobs.find((job) => job.id === selectedId) || renderJobs.find((job) => job.status === "running") || renderJobs[0], [renderJobs, selectedId]);
  const pageJobs = useMemo(() => renderJobs.slice((page - 1) * pageSize, page * pageSize), [renderJobs, page, pageSize]);
  useEffect(() => { setPage((current) => Math.min(current, Math.max(1, Math.ceil(renderJobs.length / pageSize)))); }, [renderJobs.length, pageSize]);
  useEffect(() => { void getRuntime().getPreferences().then((value) => setFolder(value.outputPath)); }, []);
  async function chooseFolder() {
    const value = await getRuntime().pickOutputFolder?.();
    if (!value) return;
    setFolder(value);
    const preferences = await getRuntime().getPreferences();
    await getRuntime().savePreferences({ ...preferences, outputPath: value });
  }
  return <div className="page-stack page-enter">
    <div className="page-title"><div><p className="eyebrow">MEDIA ENGINE / OUTPUT</p><h2>Render & xuất bản</h2><p>Theo dõi tiến trình thật của queue và mở file output sau khi hoàn tất.</p></div><button onClick={() => void chooseFolder()}><Icon name="folder" size={16} /> Chọn thư mục output</button></div>
    <section className="panel-card render-hero"><div className="render-art"><div className="render-frame"><span>JACS</span><strong>{selected ? selected.name.slice(0, 18).toUpperCase() : "NO JOB"}</strong><small>{selected?.status === "completed" ? "OUTPUT READY" : "RENDER QUEUE"}</small></div><div className="render-wave" /></div><div className="render-details"><p className="eyebrow">CURRENT OUTPUT</p><h3>{selected?.name || "Chưa có job"}</h3><p className="subtle">{selected?.source || "Tạo batch job để bắt đầu render"}</p>{selected?.clipEndSeconds !== undefined && <p className="form-help">Clip scene: {selected.clipStartSeconds?.toFixed(1) || "0.0"}s → {selected.clipEndSeconds.toFixed(1)}s · {selected.aspectRatio || "original"}</p>}<div className="render-progress"><div className="progress-label"><span>{selected?.stage || "queued"}</span><strong>{selected?.progress || 0}%</strong></div><div className="progress-track large"><i style={{ width: `${selected?.progress || 0}%` }} /></div></div><div className="render-specs"><span><small>Output folder</small><strong>{folder || "JACS Studio/Outputs"}</strong></span><span><small>Token</small><strong>{selected?.tokensUsed || 0}</strong></span><span><small>Credit</small><strong>{selected?.creditsUsed || 0}</strong></span><span><small>Ngôn ngữ</small><strong>{selected?.languages?.join(", ") || "vi"}</strong></span></div>{selected?.analysis?.summary && <p className="form-help">AI context: {selected.analysis.summary}</p>}{selected?.analysis?.previewFrames?.length ? <div className="job-detail-frames">{selected.analysis.previewFrames.map((frame) => <figure key={frame.timestampSeconds}><img src={frame.imageDataUrl} alt={`Frame ${frame.timestampSeconds}s`} /><figcaption>{Math.round(frame.timestampSeconds)}s</figcaption></figure>)}</div> : null}{selected?.analysis?.scenes?.length ? <div className="job-detail-scenes"><strong>Scene timeline</strong>{selected.analysis.scenes.map((scene) => <div key={`${scene.start}-${scene.title}`}><span>{scene.start}{scene.end ? ` → ${scene.end}` : ""}</span><b>{scene.title}</b><small>{scene.detail}</small></div>)}</div> : null}{selected?.passthrough && <p className="form-help">FFmpeg chưa được tìm thấy; output giữ nguyên container nguồn. Cài FFmpeg để encode H.264/GPU.</p>}{selected?.error && <p className="form-error">{selected.error}</p>}<div className="render-actions">{selected?.subtitlesPath && <button className="button-quiet" onClick={() => void getRuntime().revealPath(selected.subtitlesPath!)}><Icon name="captions" size={15} /> Mở SRT</button>}{selected?.outputPath && <button className="button-quiet" onClick={() => void getRuntime().revealPath(selected.outputPath!)}><Icon name="external" size={15} /> Mở output</button>}<StatusPill status={selected?.status || "queued"} /></div></div></section>
    <section className="panel-card queue-panel"><div className="panel-head"><div><p className="eyebrow">OUTPUT QUEUE</p><h3>Jobs đã tạo</h3><span className="subtle">{renderJobs.length} job trong lịch sử render</span></div><label className="queue-page-size">Hiển thị <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option></select> dòng</label></div><div className="queue-table"><div className="queue-header"><span>JOB</span><span>ENGINE</span><span>STATUS</span><span>PROGRESS</span></div>{pageJobs.map((job) => <button className={`queue-row render-queue-row ${selected?.id === job.id ? "is-selected" : ""}`} key={job.id} onClick={() => setSelectedId(job.id)}><strong>{job.name}<small>{job.source}</small></strong><span>{job.mode}</span><StatusPill status={job.status} /><div className="queue-progress"><div className="progress-track"><i style={{ width: `${job.progress}%` }} /></div><small>{job.progress}%</small></div></button>)}{!pageJobs.length && <p className="queue-empty">Chưa có job render. Hãy tạo job từ Nguồn video hoặc Phân tích AI.</p>}</div><div className="queue-pagination"><Pagination total={renderJobs.length} page={page} pageSize={pageSize} onPageChange={setPage} /></div></section>
  </div>;
}
