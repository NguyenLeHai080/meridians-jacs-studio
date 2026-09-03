import { useEffect, useMemo, useState } from "react";
import type { Job, NavKey } from "../../core/types";
import { getRuntime, isNativeRuntime } from "../../core/runtime";
import { Icon } from "../../shared/Icon";
import { Pagination } from "../../shared/Pagination";

type Props = { jobs: Job[]; onNavigate: (key: NavKey) => void; onUpdateJob: (id: string, values: Partial<Job>) => void; onAddJob: (job: Job) => void };
const positions: Array<[NonNullable<Job["logoPosition"]>, string]> = [["top-left", "Trên trái"], ["top-right", "Trên phải"], ["bottom-left", "Dưới trái"], ["bottom-right", "Dưới phải"]];

function fileUrl(value?: string) {
  if (!value || !isNativeRuntime()) return undefined;
  return `jacs-media://local?path=${encodeURIComponent(value)}`;
}

export function BrandPage({ jobs, onNavigate, onUpdateJob, onAddJob }: Props) {
  const [selectedId, setSelectedId] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [message, setMessage] = useState("");
  const candidates = useMemo(() => jobs.filter((job) => job.localPath || job.sourceType === "url" || job.analysis), [jobs]);
  const selected = useMemo(() => candidates.find((job) => job.id === selectedId) || candidates[0], [candidates, selectedId]);
  const mediaUrl = selected?.localPath ? fileUrl(selected.localPath) : selected?.sourceType === "url" && /^https?:\/\//i.test(selected.source) ? selected.source : undefined;
  const logoUrl = fileUrl(selected?.logoPath);
  const pageJobs = useMemo(() => candidates.slice((page - 1) * pageSize, page * pageSize), [candidates, page, pageSize]);
  useEffect(() => { setPage((value) => Math.min(value, Math.max(1, Math.ceil(candidates.length / pageSize)))); }, [candidates.length, pageSize]);
  useEffect(() => { if (selected && !selectedId) setSelectedId(selected.id); }, [selected, selectedId]);

  function update(values: Partial<Job>) { if (selected) onUpdateJob(selected.id, values); }
  async function chooseLogo() {
    const path = await getRuntime().pickImage?.();
    if (path) { update({ logoPath: path }); setMessage("Đã chọn logo. Bấm Lưu preset để ghi cấu hình vào job."); }
  }
  function savePreset() { if (!selected) return; update({}); setMessage("Preset phụ đề và logo đã được lưu vào job."); window.setTimeout(() => setMessage(""), 2200); }
  function createRenderJob() {
    if (!selected || (!selected.localPath && selected.sourceType !== "url")) { setMessage("Job này chưa có source local hoặc URL để render."); return; }
    onAddJob({ ...selected, sourceOnly: false, id: `job-brand-${Date.now()}`, parentJobId: selected.id, name: `${selected.name} · branded`, status: "queued", stage: selected.sourceType === "url" && !selected.localPath ? "downloading" : "queued", progress: 0, outputPath: undefined, error: undefined, synced: false, createdAt: "Vừa tạo" });
    setMessage("Đã tạo render job có phụ đề/logo và đưa vào queue.");
  }
  const subtitleText = selected?.subtitleText || selected?.analysis?.voiceScript || selected?.analysis?.scenes?.map((scene) => scene.voiceover || scene.translation || "").filter(Boolean).join(" ") || "";
  return <div className="page-stack page-enter brand-page">
    <div className="page-title"><div><p className="eyebrow">WORKFLOW / 07 · BRAND</p><h2>Phụ đề & Thương hiệu</h2><p>Gắn phụ đề đồng bộ lời kể và logo trực tiếp vào bản render bằng FFmpeg.</p></div><div className="page-title-actions"><button className="button-quiet" type="button" onClick={() => onNavigate("timeline")}><Icon name="video" size={15} /> Mở timeline</button><button type="button" disabled={!selected} onClick={createRenderJob}><Icon name="play" size={15} /> Tạo render branded</button></div></div>
    {message && <p className="form-success">{message}</p>}
    {!candidates.length ? <section className="panel-card empty-module"><span className="empty-module-icon"><Icon name="captions" size={24} /></span><h3>Chưa có job để hoàn thiện</h3><p>Hãy nạp video và chạy phân tích trước, sau đó quay lại để thêm phụ đề/logo.</p><button className="button-quiet" type="button" onClick={() => onNavigate("batch")}><Icon name="arrow" size={14} /> Mở tạo job</button></section> : <section className="brand-layout">
      <aside className="panel-card brand-library"><div className="panel-head"><div><p className="eyebrow">RENDER TARGETS</p><h3>Chọn job</h3></div><span className="queue-count">{candidates.length}</span></div><div className="story-job-list">{pageJobs.map((job) => <button type="button" className={`story-job ${job.id === selected?.id ? "is-selected" : ""}`} key={job.id} onClick={() => setSelectedId(job.id)}><span className="story-job-icon"><Icon name="captions" size={15} /></span><span><strong>{job.name}</strong><small>{job.source}</small></span><Icon name="arrow" size={13} /></button>)}</div><div className="story-pagination"><Pagination total={candidates.length} page={page} pageSize={pageSize} onPageChange={setPage} /></div><label className="story-page-size">Hiển thị <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option></select> dòng</label></aside>
      <section className="panel-card brand-editor"><div className="panel-head"><div><p className="eyebrow">BRAND PRESET</p><h3>{selected?.name}</h3><span className="subtle">{selected?.source}</span></div><span className={isNativeRuntime() ? "result-live" : "result-draft"}>{isNativeRuntime() ? "Native render" : "Preview only"}</span></div>
        <label className="preset-check"><input type="checkbox" checked={selected?.subtitlesEnabled ?? true} onChange={(event) => update({ subtitlesEnabled: event.target.checked })} /><span><strong>Bật phụ đề</strong><small>FFmpeg sẽ render phụ đề từ voice script/scene translation.</small></span></label>
        <label className="field-label">Vị trí phụ đề<select value={selected?.subtitleStyle || "bottom"} onChange={(event) => update({ subtitleStyle: event.target.value as Job["subtitleStyle"] })}><option value="bottom">Dưới · an toàn cho Shorts</option><option value="center">Giữa khung hình</option><option value="top">Trên cùng</option></select></label>
        <label className="field-label">Nội dung phụ đề<textarea rows={5} value={subtitleText} onChange={(event) => update({ subtitleText: event.target.value })} placeholder="Voice script hoặc nội dung phụ đề" /></label>
        <div className="brand-logo-block"><div><p className="eyebrow">LOGO / WATERMARK</p><h3>Logo thương hiệu</h3></div>{selected?.logoPath ? <div className="logo-file"><Icon name="check" size={14} /><span>{selected.logoPath.split(/[\\/]/).pop()}</span><button type="button" className="text-button" onClick={chooseLogo}>Đổi</button></div> : <button type="button" className="button-quiet" onClick={chooseLogo} disabled={!isNativeRuntime()}><Icon name="upload" size={14} /> Chọn file logo</button>}</div>
        <div className="brand-controls"><label className="field-label">Vị trí logo<select value={selected?.logoPosition || "bottom-right"} onChange={(event) => update({ logoPosition: event.target.value as Job["logoPosition"] })}>{positions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label className="field-label">Độ mờ <span className="range-value">{Math.round((selected?.logoOpacity ?? 0.82) * 100)}%</span><input type="range" min="0.1" max="1" step="0.05" value={selected?.logoOpacity ?? 0.82} onChange={(event) => update({ logoOpacity: Number(event.target.value) })} /></label></div>
        <div className="brand-preview"><div className="brand-preview-art">{mediaUrl ? <video className="brand-preview-video" src={mediaUrl} controls muted preload="metadata" /> : <span className="brand-preview-empty"><Icon name="video" size={20} /> Chưa có video preview</span>}<span className={`brand-preview-caption ${(selected?.subtitleStyle || "bottom")}`}>{(selected?.subtitlesEnabled ?? true) ? (subtitleText.slice(0, 80) || "Phụ đề sẽ hiển thị ở đây") : ""}</span>{logoUrl && <img className={`brand-preview-logo ${selected?.logoPosition || "bottom-right"}`} src={logoUrl} alt="Logo preview" style={{ opacity: selected?.logoOpacity ?? 0.82 }} />}</div><small>Preview bố cục · phụ đề và logo dùng chính source video để render.</small></div>
        <div className="brand-actions"><button className="button-quiet" type="button" onClick={savePreset}><Icon name="check" size={14} /> Lưu preset</button><button type="button" onClick={createRenderJob} disabled={!selected}><Icon name="play" size={14} /> Render bản này</button></div>
      </section>
    </section>}
  </div>;
}
