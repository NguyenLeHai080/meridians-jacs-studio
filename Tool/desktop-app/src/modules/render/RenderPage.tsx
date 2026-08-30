import { useEffect, useMemo, useState } from "react";
import type { Job } from "../../core/types";
import { getRuntime } from "../../core/runtime";
import { Icon } from "../../shared/Icon";
import { StatusPill } from "../../shared/StatusPill";

export function RenderPage({ jobs }: { jobs: Job[] }) {
  const [selectedId, setSelectedId] = useState("");
  const [folder, setFolder] = useState("");
  const selected = useMemo(() => jobs.find((job) => job.id === selectedId) || jobs.find((job) => job.status === "running") || jobs[0], [jobs, selectedId]);
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
    <section className="panel-card render-hero"><div className="render-art"><div className="render-frame"><span>JACS</span><strong>{selected ? selected.name.slice(0, 18).toUpperCase() : "NO JOB"}</strong><small>{selected?.status === "completed" ? "OUTPUT READY" : "RENDER QUEUE"}</small></div><div className="render-wave" /></div><div className="render-details"><p className="eyebrow">CURRENT OUTPUT</p><h3>{selected?.name || "Chưa có job"}</h3><p className="subtle">{selected?.source || "Tạo batch job để bắt đầu render"}</p>{selected?.clipEndSeconds !== undefined && <p className="form-help">Clip scene: {selected.clipStartSeconds?.toFixed(1) || "0.0"}s → {selected.clipEndSeconds.toFixed(1)}s · {selected.aspectRatio || "original"}</p>}<div className="render-progress"><div className="progress-label"><span>{selected?.stage || "queued"}</span><strong>{selected?.progress || 0}%</strong></div><div className="progress-track large"><i style={{ width: `${selected?.progress || 0}%` }} /></div></div><div className="render-specs"><span><small>Output folder</small><strong>{folder || "JACS Studio/Outputs"}</strong></span><span><small>Token</small><strong>{selected?.tokensUsed || 0}</strong></span><span><small>Credit</small><strong>{selected?.creditsUsed || 0}</strong></span></div>{selected?.analysis?.summary && <p className="form-help">AI context: {selected.analysis.summary}</p>}{selected?.passthrough && <p className="form-help">FFmpeg chưa được tìm thấy; output giữ nguyên container nguồn. Cài FFmpeg để encode H.264/GPU.</p>}{selected?.error && <p className="form-error">{selected.error}</p>}<div className="render-actions">{selected?.outputPath && <button className="button-quiet" onClick={() => void getRuntime().revealPath(selected.outputPath!)}><Icon name="external" size={15} /> Mở output</button>}<StatusPill status={selected?.status || "queued"} /></div></div></section>
    <section className="panel-card queue-panel"><div className="panel-head"><div><p className="eyebrow">OUTPUT QUEUE</p><h3>Jobs đã tạo</h3></div></div><div className="queue-table"><div className="queue-header"><span>JOB</span><span>ENGINE</span><span>STATUS</span><span>PROGRESS</span></div>{jobs.map((job) => <button className="queue-row render-queue-row" key={job.id} onClick={() => setSelectedId(job.id)}><strong>{job.name}<small>{job.source}</small></strong><span>{job.mode}</span><StatusPill status={job.status} /><div className="queue-progress"><div className="progress-track"><i style={{ width: `${job.progress}%` }} /></div><small>{job.progress}%</small></div></button>)}</div></section>
  </div>;
}
