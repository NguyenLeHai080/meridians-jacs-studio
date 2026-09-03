import { useEffect, useMemo, useState } from "react";
import type { Job, NavKey } from "../../core/types";
import { getRuntime, isNativeRuntime } from "../../core/runtime";
import { Icon } from "../../shared/Icon";
import { Pagination } from "../../shared/Pagination";
import { StatusPill } from "../../shared/StatusPill";

export function SourcesPage({ jobs, onNavigate, onAddJob, onAnalyze, onUpdateJob, onDeleteSources }: { jobs: Job[]; onNavigate: (key: NavKey) => void; onAddJob: (job: Job) => void; onAnalyze: (job: Job) => void; onUpdateJob?: (jobId: string, values: Partial<Job>) => void; onDeleteSources?: (sourceIds: string[]) => void }) {
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ done: 0, total: 0, name: "" });
  const sources = useMemo(() => {
    const records: Job[] = [];
    for (const job of jobs) {
      if (!job.localPath && job.sourceType !== "url") continue;
      const index = records.findIndex((item) => Boolean((job.source && item.source === job.source) || (job.localPath && item.localPath === job.localPath)));
      if (index < 0) {
        records.push(job);
        continue;
      }
      const previous = records[index];
      // Keep the richest record: a processed job may add the resolved local
      // path and analysis metadata to an earlier source-only library entry.
      const preferred = job.sourceOnly && !previous.sourceOnly ? previous : job;
      records[index] = {
        ...preferred,
        localPath: preferred.localPath || previous.localPath || job.localPath,
        analysis: preferred.analysis || previous.analysis || job.analysis,
        status: preferred.sourceOnly ? (previous.status || preferred.status) : preferred.status,
        progress: preferred.sourceOnly ? (previous.progress ?? preferred.progress) : preferred.progress,
      };
    }
    return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [jobs]);
  const pageSources = sources.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => { setPage((value) => Math.min(value, Math.max(1, Math.ceil(sources.length / pageSize)))); }, [sources.length, pageSize]);
  useEffect(() => { setSelectedIds((current) => current.filter((id) => sources.some((source) => source.id === id))); }, [sources]);
  function addSource(source: { source: string; sourceType: "file" | "url"; localPath?: string }) {
    const name = source.source.split(/[\\/]/).pop() || source.source;
    onAddJob({ id: `job-source-${Date.now()}`, name: name.replace(/\.[^.]+$/, ""), source: source.sourceType === "file" ? name : source.source, sourceType: source.sourceType, localPath: source.localPath, sourceOnly: true, mode: "local-cpu", status: "queued", stage: source.sourceType === "url" ? "downloading" : "queued", progress: 0, createdAt: "Vừa thêm", synced: true });
    setMessage("Đã thêm source vào queue. Mở Tạo job hàng loạt để chọn preset và xử lý.");
  }
  async function pick() { const value = await getRuntime().pickVideo(); if (value) addSource({ source: value, sourceType: "file", localPath: value }); }
  function addUrl() { const value = url.trim(); if (!/^https?:\/\//i.test(value)) { setMessage("URL phải bắt đầu bằng http:// hoặc https://"); return; } addSource({ source: value, sourceType: "url" }); setUrl(""); }
  async function analyzeSelected() {
    const chosen = sources.filter((source) => selectedIds.includes(source.id));
    if (!chosen.length) { setMessage("Chọn ít nhất một source để phân tích."); return; }
    const runtime = getRuntime();
    if (!isNativeRuntime() || !runtime.analyzeVideo) { setMessage("Phân tích hàng loạt cần mở JACS Studio Desktop (Electron)."); return; }
    setBatchRunning(true); setBatchProgress({ done: 0, total: chosen.length, name: "" }); setMessage("");
    try {
      for (let index = 0; index < chosen.length; index += 1) {
        const source = chosen[index];
        setBatchProgress({ done: index, total: chosen.length, name: source.name });
        const operationId = `source-analysis-${source.id}-${Date.now()}`;
        let localPath = source.localPath;
        const downloadOff = runtime.onDownloadProgress?.((event) => {
          if (event.operationId !== operationId || !onUpdateJob) return;
          onUpdateJob(source.id, { status: "running", stage: "downloading", progress: Math.max(1, event.progress) });
        });
        const progressOff = runtime.onAnalysisProgress?.((event) => {
          if (event.operationId !== operationId || !onUpdateJob) return;
          onUpdateJob(source.id, { status: "running", stage: "analyzing", progress: Math.max(1, event.progress) });
        });
        try {
          onUpdateJob?.(source.id, { status: "running", stage: localPath ? "analyzing" : "downloading", progress: 1, error: undefined });
          if (!localPath && source.sourceType === "url") {
            if (!runtime.downloadVideo) throw new Error("Bản Electron chưa có bộ tải URL video.");
            localPath = await runtime.downloadVideo(source.source, operationId);
            onUpdateJob?.(source.id, { localPath, stage: "analyzing", progress: 5 });
          }
          if (!localPath) throw new Error("Source chưa có file local để phân tích.");
          // Omit providerId so Electron resolves the customer's configured
          // analysis provider; when none is configured it safely falls back
          // to local scene/frame analysis.
          const analysis = await runtime.analyzeVideo(localPath, undefined, operationId, { languages: ["vi"] });
          onUpdateJob?.(source.id, { localPath, status: "completed", stage: "completed", progress: 100, analysis });
        } catch (reason) {
          onUpdateJob?.(source.id, { status: "failed", stage: "failed", error: reason instanceof Error ? reason.message : "Phân tích thất bại" });
        } finally { downloadOff?.(); progressOff?.(); }
        setBatchProgress({ done: index + 1, total: chosen.length, name: source.name });
      }
      setMessage(`Đã phân tích ${chosen.length} source. Mở Kịch bản & Voice hoặc Chọn cảnh & Timeline để tiếp tục.`);
    } finally { setBatchRunning(false); }
  }
  function deleteSources(sourceIds: string[]) {
    if (!onDeleteSources || !sourceIds.length || batchRunning) return;
    const count = sourceIds.length;
    if (!window.confirm(`Xoá ${count} source đã chọn? Các job render/phân cảnh liên quan cũng sẽ bị xoá.`)) return;
    onDeleteSources(sourceIds);
    setSelectedIds((current) => current.filter((id) => !sourceIds.includes(id)));
    setMessage(`Đã xoá ${count} source khỏi thư viện.`);
  }
  const allSelected = sources.length > 0 && selectedIds.length === sources.length;
  const someSelected = selectedIds.length > 0 && !allSelected;
  return <div className="page-stack page-enter sources-page">
    <div className="page-title"><div><p className="eyebrow">WORKFLOW / 01 · SOURCES</p><h2>Nguồn video</h2><p>Đây là thư viện footage đầu vào: nạp file/URL một lần, phân tích thành scene map rồi dùng lại cho kịch bản, timeline và render.</p></div><div className="page-title-actions"><button className="button-quiet" type="button" onClick={() => onNavigate("batch")}><Icon name="layers" size={15} /> Mở tạo job</button><button type="button" onClick={() => void pick()} disabled={!isNativeRuntime()}><Icon name="upload" size={15} /> Nạp video</button></div></div>
    <section className="source-workflow-hint"><span><Icon name="folder" size={15} /><strong>1. Nguồn</strong><small>File local / URL</small></span><Icon name="arrow" size={14} /><span><Icon name="scan" size={15} /><strong>2. Phân tích</strong><small>Transcript & scene</small></span><Icon name="arrow" size={14} /><span><Icon name="mic" size={15} /><strong>3. Kịch bản</strong><small>Voice theo ngữ cảnh</small></span><Icon name="arrow" size={14} /><span><Icon name="play" size={15} /><strong>4. Render</strong><small>Queue output</small></span></section>
    {message && <p className="form-help">{message}</p>}
    <section className="panel-card source-ingest"><div><p className="eyebrow">ADD SOURCE</p><h3>Thêm URL video</h3><p className="subtle">URL sẽ được tải một lần vào app-data khi queue bắt đầu chạy.</p></div><div className="url-row"><input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://..." onKeyDown={(event) => { if (event.key === "Enter") addUrl(); }} /><button className="button-quiet" type="button" onClick={addUrl}>Thêm URL</button></div>{!isNativeRuntime() && <p className="form-help">Mở bản Electron để chọn file, tải URL và chạy FFmpeg.</p>}</section>
    <section className="panel-card source-table"><div className="panel-head"><div><p className="eyebrow">SOURCE LIBRARY</p><h3>Source đã nạp <span className="source-total-count">{sources.length}</span></h3><span className="subtle">Chọn nhiều source để phân tích tuần tự, kết quả được lưu ngay vào thư viện.</span></div><div className="source-table-actions"><span className={`source-selection-count ${selectedIds.length ? "is-visible" : ""}`}>{selectedIds.length ? `${selectedIds.length} đã chọn` : ""}</span><button className="text-button" type="button" disabled={!selectedIds.length || batchRunning} onClick={() => setSelectedIds([])}>Bỏ chọn</button><label className="queue-page-size">Hiển thị <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option></select> dòng</label><button className="button-quiet" type="button" disabled={!selectedIds.length || batchRunning} onClick={() => void analyzeSelected()}><Icon name="scan" size={14} /> {batchRunning ? `Đang phân tích ${batchProgress.done}/${batchProgress.total}` : `Phân tích${selectedIds.length ? ` (${selectedIds.length})` : ""}`}</button><button className="button-quiet button-danger" type="button" disabled={!selectedIds.length || batchRunning || !onDeleteSources} onClick={() => deleteSources(selectedIds)}><Icon name="trash" size={14} /> Xoá{selectedIds.length ? ` (${selectedIds.length})` : ""}</button></div></div>{batchRunning && <div className="source-batch-progress"><div className="progress-label"><span>{batchProgress.name || "Đang chuẩn bị"}</span><strong>{batchProgress.done}/{batchProgress.total}</strong></div><div className="progress-track"><i style={{ width: `${batchProgress.total ? batchProgress.done / batchProgress.total * 100 : 0}%` }} /></div></div>}<div className="tw-mt-4 tw-overflow-x-auto"><table className="source-data-table tw-w-full tw-min-w-[900px] tw-text-left tw-text-xs"><thead className="tw-border-b tw-border-white/10 tw-text-[10px] tw-uppercase tw-tracking-[.16em] tw-text-slate-500"><tr><th className="tw-p-3 source-check-column"><button type="button" className={`source-select-all ${someSelected ? "is-partial" : ""}`} onClick={() => setSelectedIds(allSelected ? [] : sources.map((source) => source.id))} aria-label={allSelected ? "Bỏ chọn tất cả source" : "Chọn tất cả source"}>{allSelected ? <Icon name="check" size={12} /> : someSelected ? <span className="source-partial-mark" /> : null}</button></th><th className="tw-p-3">Nguồn</th><th className="tw-p-3">Loại</th><th className="tw-p-3">Scene</th><th className="tw-p-3">Trạng thái</th><th className="tw-p-3">Cập nhật</th><th className="tw-p-3">Thao tác</th></tr></thead><tbody>{pageSources.map((job) => { const selected = selectedIds.includes(job.id); const scenes = job.analysis?.scenes?.length || 0; const statusDetail = job.status === "running" ? `${job.progress}% · ${job.stage === "downloading" ? "đang tải" : "đang phân tích"}` : job.error ? job.error : job.analysis ? "Scene map sẵn sàng" : job.sourceOnly ? (job.sourceType === "url" ? "Chờ tải khi phân tích" : "Sẵn sàng phân tích") : `${job.progress}%`; return <tr className={`tw-border-b tw-border-white/5 ${selected ? "source-row-selected" : ""}`} key={job.id}><td className="tw-p-3 source-check-column"><button type="button" className={`source-select-all ${selected ? "is-selected" : ""}`} onClick={() => setSelectedIds((current) => current.includes(job.id) ? current.filter((id) => id !== job.id) : [...current, job.id])} aria-label={`${selected ? "Bỏ chọn" : "Chọn"} ${job.name}`}>{selected ? <Icon name="check" size={12} /> : null}</button></td><td className="tw-p-3 source-name-cell"><span className={`source-type-icon ${job.sourceType === "url" ? "is-url" : "is-file"}`}><Icon name={job.sourceType === "url" ? "link" : "video"} size={15} /></span><span className="source-name-copy"><strong title={job.name}>{job.name}</strong><small title={job.source}>{job.source}</small></span></td><td className="tw-p-3"><span className="source-type-label">{job.sourceType === "url" ? "URL online" : "Local file"}</span><small className="source-type-hint">{job.sourceType === "url" ? "Tải khi chạy" : "Trên máy"}</small></td><td className="tw-p-3"><span className="source-scene-count">{scenes || "—"}</span>{scenes ? <small className="source-type-hint">scene map</small> : <small className="source-type-hint">chưa phân tích</small>}</td><td className="tw-p-3 source-status-cell"><StatusPill status={job.status} /><small className="source-status-detail" title={statusDetail}>{statusDetail}</small></td><td className="tw-p-3 source-updated-cell">{job.createdAt || "—"}</td><td className="tw-p-3"><div className="source-actions"><button type="button" className="button-quiet" onClick={() => job.localPath ? onAnalyze(job) : onNavigate("batch")}><Icon name={job.analysis ? "arrow" : "scan"} size={13} /> {job.analysis ? "Xem" : job.localPath ? "Phân tích" : "Mở batch"}</button>{job.analysis && <button type="button" className="icon-button" title="Mở kịch bản" onClick={() => onNavigate("story")}><Icon name="mic" size={14} /></button>}<button type="button" className="icon-button button-danger source-delete-row" title="Xoá source" aria-label={`Xoá ${job.name}`} disabled={batchRunning || !onDeleteSources} onClick={() => deleteSources([job.id])}><Icon name="trash" size={14} /></button></div></td></tr>; })}</tbody></table>{!pageSources.length && <p className="tw-py-10 tw-text-center tw-text-xs tw-text-slate-500">Chưa có source. Nạp file hoặc thêm URL để bắt đầu.</p>}</div><div className="tw-mt-4"><Pagination total={sources.length} page={page} pageSize={pageSize} onPageChange={setPage} /></div></section>
  </div>;
}
