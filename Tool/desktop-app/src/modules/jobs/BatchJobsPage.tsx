import { useEffect, useMemo, useState } from "react";
import type { Job, ProviderProfile } from "../../core/types";
import { getRuntime, isNativeRuntime } from "../../core/runtime";
import { Icon } from "../../shared/Icon";
import { StatusPill } from "../../shared/StatusPill";

type Source = { id: string; name: string; source: string; sourceType: "file" | "url"; localPath?: string };

export function BatchJobsPage({ jobs, onAddJob, onCancelJob, onRetryJob }: { jobs: Job[]; onAddJob: (job: Job) => void; onCancelJob?: (jobId: string) => void; onRetryJob?: (jobId: string) => void }) {
  const [sources, setSources] = useState<Source[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [urlText, setUrlText] = useState("");
  const [mode, setMode] = useState<Job["mode"]>("local-cpu");
  const [providerId, setProviderId] = useState("");
  const [splitScenes, setSplitScenes] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<Job["aspectRatio"]>("9:16");
  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const [message, setMessage] = useState("");
  const activeJobs = useMemo(() => jobs.filter((job) => job.status === "queued" || job.status === "running").length, [jobs]);

  useEffect(() => {
    void getRuntime().getProviderProfiles().then(setProviders).catch(() => setProviders([]));
  }, []);

  async function chooseVideos() {
    const picked = await getRuntime().pickVideos?.();
    if (!picked?.length) return;
    setSources((current) => [...current, ...picked.map((localPath, index) => ({ id: `${localPath}-${Date.now()}-${index}`, name: localPath.split(/[\\/]/).pop() || localPath, source: localPath, sourceType: "file" as const, localPath }))]);
  }

  function addUrl() {
    const urls = urlText.split(/[\n,]+/).map((item) => item.trim()).filter(Boolean);
    const invalid = urls.find((url) => !/^https?:\/\//i.test(url));
    if (!urls.length || invalid) { setMessage("Mỗi URL phải bắt đầu bằng http:// hoặc https://"); return; }
    setSources((current) => [...current, ...urls.map((url, index) => ({ id: `${url}-${Date.now()}-${index}`, name: url.split("/").pop()?.split("?")[0] || "Video URL", source: url, sourceType: "url" as const }))]);
    setUrlText(""); setMessage("");
  }

  async function createBatch() {
    const chosen = sources.filter((source) => selected.includes(source.id));
    if (!chosen.length) { setMessage("Hãy chọn ít nhất một video hoặc URL để tạo job."); return; }
    // Local modes must not silently upload media to a configured cloud
    // provider. A provider is only selected for cloud/hybrid analysis.
    const resolvedProviderId = ["cloud", "hybrid"].includes(mode)
      ? providerId || providers.find((provider) => provider.enabled && provider.capabilities.includes("analysis"))?.id || ""
      : "";
    if (["cloud", "hybrid"].includes(mode) && !resolvedProviderId) {
      setMessage("Chế độ Cloud/Hybrid cần ít nhất một AI provider có capability analysis trong Cài đặt tool.");
      return;
    }
    let created = 0;
    for (const [index, source] of chosen.entries()) {
      // URL downloads run inside the persistent queue. This makes the job
      // visible immediately and lets the user see download/analyse/render
      // progress instead of waiting on a blocking form submission.
      onAddJob({ id: `job-${Date.now()}-${index}`, name: source.name.replace(/\.[^.]+$/, ""), source: source.sourceType === "url" ? source.source : source.name, sourceType: source.sourceType, localPath: source.localPath, mode, providerId: resolvedProviderId || undefined, splitScenes, aspectRatio, status: "queued", stage: source.sourceType === "url" ? "downloading" : "queued", progress: 0, createdAt: new Date().toLocaleString("vi-VN") });
      created += 1;
    }
    setSelected([]); setMessage(created ? `${created}/${chosen.length} job đã được thêm vào hàng đợi.` : "Không có job nào được thêm vào hàng đợi.");
  }

  return <div className="page-stack page-enter">
    <div className="page-title"><div><p className="eyebrow">MEDIA PIPELINE / BATCH</p><h2>Tạo job hàng loạt</h2><p>Chọn nhiều video từ máy hoặc dán URL, sau đó phân tích ngữ cảnh và render theo queue.</p></div><button onClick={() => void createBatch()} disabled={!selected.length}><Icon name="plus" size={16} /> Tạo {selected.length} job</button></div>
    {message && <p className={message.includes("đã được") ? "form-success" : "form-help"}>{message}</p>}
    <div className="batch-layout"><section className="panel-card media-picker"><div className="panel-head"><div><h3>Nguồn video</h3><span className="subtle">{selected.length}/{sources.length} nguồn được chọn</span></div><div className="panel-actions"><button className="text-button" type="button" onClick={() => setSelected(sources.map((source) => source.id))} disabled={!sources.length}>Chọn tất cả</button><button className="icon-button" title="Chọn nhiều video" onClick={() => void chooseVideos()} disabled={!isNativeRuntime()}><Icon name="upload" /></button></div></div><div className="url-row"><textarea value={urlText} onChange={(event) => setUrlText(event.target.value)} placeholder="Dán nhiều URL, mỗi dòng một video (https://...)" rows={2} /><button className="button-quiet" onClick={addUrl}>Thêm URL</button></div>{!isNativeRuntime() && <p className="form-help">Chọn file cần mở bản Electron đã cài đặt; trình duyệt không có quyền đọc đường dẫn video.</p>}{sources.map((source, index) => <button className={`media-row ${selected.includes(source.id) ? "is-selected" : ""}`} key={source.id} onClick={() => setSelected((current) => current.includes(source.id) ? current.filter((item) => item !== source.id) : [...current, source.id])}><span className="check-box">{selected.includes(source.id) && <Icon name="check" size={13} />}</span><span className={`media-art art-${(index % 4) + 1}`} /><span className="media-name"><strong>{source.name}</strong><small>{source.sourceType === "url" ? "URL online · sẽ tải về app-data" : "Local file"}</small></span><Icon name="arrow" size={15} /></button>)}{!sources.length && <div className="provider-empty"><Icon name="upload" size={20} /><div><strong>Chưa có nguồn video</strong><p>Chọn nhiều file hoặc thêm URL để bắt đầu.</p></div></div>}</section><section className="panel-card preset-panel"><p className="eyebrow">PIPELINE PRESET</p><h3>Thiết lập xử lý</h3><label className="field-label">Execution mode<select value={mode} onChange={(event) => setMode(event.target.value as Job["mode"])}><option value="local-gpu">Local GPU · riêng tư & nhanh</option><option value="local-cpu">Local CPU · tương thích cao</option><option value="hybrid">Hybrid · AI cloud + render local</option><option value="cloud">Cloud AI · render local</option></select></label><label className="field-label">AI provider (tuỳ chọn)<select value={providerId} onChange={(event) => setProviderId(event.target.value)}><option value="">Tự động chọn provider có capability analysis</option>{providers.filter((provider) => provider.enabled && provider.capabilities.includes("analysis")).map((provider) => <option value={provider.id} key={provider.id}>{provider.name} · {provider.model}</option>)}</select></label><label className="field-label">Tỷ lệ xuất<select value={aspectRatio} onChange={(event) => setAspectRatio(event.target.value as Job["aspectRatio"])}><option value="9:16">9:16 · Shorts/Reels/TikTok</option><option value="1:1">1:1 · Social square</option><option value="16:9">16:9 · YouTube</option><option value="original">Original · giữ kích thước</option></select></label><label className="preset-check"><input type="checkbox" checked={splitScenes} onChange={(event) => setSplitScenes(event.target.checked)} /><span><strong>Tách scene thành job riêng</strong><small>Phân tích trước, sau đó tạo clip theo từng mốc scene</small></span></label><div className="preset-options"><div className="preset-option active"><span><Icon name="scan" size={17} /></span><strong>Phân tích ngữ cảnh</strong><small>Scene, hook, subtitle, token usage</small></div><div className="preset-option active"><span><Icon name="spark" size={17} /></span><strong>Reframe {aspectRatio}</strong><small>Crop trung tâm bằng FFmpeg, không upload video render</small></div><div className="preset-option active"><span><Icon name="play" size={17} /></span><strong>Render H.264</strong><small>Output vào thư mục JACS Studio</small></div></div><div className="cost-note"><Icon name="clock" size={15} /><span>Ước tính {selected.length || 0} job{splitScenes ? " + scene jobs" : ""} · CPU/GPU được chọn tự động</span></div></section></div>
    <section className="panel-card queue-panel"><div className="panel-head"><div><p className="eyebrow">QUEUE</p><h3>Hàng đợi xử lý</h3></div><span className="queue-count">{activeJobs} active</span></div><div className="queue-table"><div className="queue-header"><span>JOB</span><span>ENGINE</span><span>STATUS</span><span>PROGRESS</span></div>{jobs.map((job) => <div className="queue-row" key={job.id}><strong>{job.name}<small>{job.source}</small></strong><span>{job.mode}</span><div className="queue-status"><StatusPill status={job.status} />{["queued", "running"].includes(job.status) && onCancelJob && <button type="button" className="queue-action" onClick={() => onCancelJob(job.id)}>Hủy</button>}{["failed", "cancelled"].includes(job.status) && onRetryJob && <button type="button" className="queue-action" onClick={() => onRetryJob(job.id)}>Chạy lại</button>}</div><div className="queue-progress"><div className="progress-track"><i style={{ width: `${job.progress}%` }} /></div><small>{job.progress}%{job.stage ? ` · ${job.stage}` : ""}</small></div></div>)}</div></section>
  </div>;
}
