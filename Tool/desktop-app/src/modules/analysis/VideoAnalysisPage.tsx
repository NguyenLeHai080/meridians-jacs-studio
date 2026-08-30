import { useEffect, useRef, useState } from "react";
import { getRuntime, isNativeRuntime } from "../../core/runtime";
import type { AnalysisResult, Job, ProviderProfile, VideoProbe } from "../../core/types";
import { Icon } from "../../shared/Icon";

export function VideoAnalysisPage({ onAddJob }: { onAddJob?: (job: Job) => void }) {
  const [file, setFile] = useState("");
  const [probe, setProbe] = useState<VideoProbe | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [providerId, setProviderId] = useState("");
  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const [aspectRatio, setAspectRatio] = useState<Job["aspectRatio"]>("9:16");
  const [executionMode, setExecutionMode] = useState<Job["mode"]>("local-cpu");
  const [progress, setProgress] = useState<{ progress: number; stage: string } | null>(null);
  const operationId = useRef("");

  useEffect(() => { void getRuntime().getProviderProfiles().then(setProviders).catch(() => setProviders([])); }, []);
  useEffect(() => {
    const unsubscribe = getRuntime().onAnalysisProgress?.((value) => { if (value.operationId && value.operationId !== operationId.current) return; setProgress(value); });
    return () => unsubscribe?.();
  }, []);

  async function choose() {
    setError("");
    const picked = await getRuntime().pickVideo();
    if (!picked) return;
    setFile(picked); setResult(null);
    try { setProbe(await getRuntime().probeVideo?.(picked) || null); } catch (reason) { setError(reason instanceof Error ? reason.message : "Không đọc được video"); }
  }

  async function analyze() {
    const analyzeVideo = getRuntime().analyzeVideo;
    if (!file || !analyzeVideo) { setError("Hãy chọn video trong bản Electron đã cài đặt."); return; }
    setRunning(true); setError(""); setResult(null); setProgress({ progress: 1, stage: "starting" });
    operationId.current = `analysis-${Date.now()}`;
    // Empty selection is an explicit local-only run. The customer chooses a
    // provider when they want cloud vision/transcription and accepts upload.
    try { setResult(await analyzeVideo(file, providerId || "", operationId.current)); } catch (reason) { setError(reason instanceof Error ? reason.message : "Phân tích thất bại"); }
    finally { setRunning(false); operationId.current = ""; }
  }

  const fileName = file.split(/[\\/]/).pop() || "Chưa chọn video";
  function seconds(value: string | undefined, fallback: number) {
    const parts = String(value || "").split(":").map(Number);
    if (parts.some((part) => !Number.isFinite(part))) return fallback;
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return Number.isFinite(parts[0]) ? parts[0] : fallback;
  }

  function createSceneJob() {
    if (!result || !file || !onAddJob) return;
    const scenes = result.scenes.length ? result.scenes : [{ start: "00:00", end: undefined, title: "Full video", detail: "Toàn bộ video" }];
    scenes.forEach((scene, index) => {
      const start = seconds(scene.start, 0);
      const nextStart = index + 1 < scenes.length ? seconds(scenes[index + 1].start, probe?.durationSeconds || start) : (probe?.durationSeconds || start);
      const end = Math.max(start + 0.25, Math.min(probe?.durationSeconds || nextStart, seconds(scene.end, nextStart)));
      onAddJob({ id: `job-analysis-${Date.now()}-${index}`, name: `${fileName.replace(/\.[^.]+$/, "")} · ${scene.title}`, source: fileName, sourceType: "file", localPath: file, mode: executionMode, providerId: ["cloud", "hybrid"].includes(executionMode) ? providerId || undefined : undefined, clipStartSeconds: start, clipEndSeconds: end, aspectRatio, analysis: result, status: "queued", stage: "queued", progress: 0, tokensUsed: index === 0 ? result.tokensUsed : 0, creditsUsed: index === 0 ? result.creditsUsed : 0, createdAt: new Date().toLocaleString("vi-VN") });
    });
  }
 return <div className="page-stack page-enter"><div className="page-title"><div><p className="eyebrow">AI WORKSPACE / VIDEO CONTEXT</p><h2>Phân tích video</h2><p>Đọc metadata thực, gửi ngữ cảnh cho provider của khách hoặc chạy fallback cục bộ.</p></div><button onClick={() => void choose()}><Icon name="upload" size={16} /> Chọn video</button></div>{error && <p className="form-error">{error}</p>}<div className="analysis-layout"><section className="panel-card analysis-preview"><div className="video-placeholder"><div className="video-grid" /><span className="play-orb"><Icon name="play" size={21} /></span><span className="duration">{probe?.durationSeconds ? `${Math.floor(probe.durationSeconds / 60).toString().padStart(2, "0")}:${Math.floor(probe.durationSeconds % 60).toString().padStart(2, "0")}` : "--:--"}</span></div><div className="file-bar"><span className="file-icon"><Icon name="folder" size={16} /></span><div><strong>{fileName}</strong><small>{probe ? `${probe.width || "?"}x${probe.height || "?"} · ${Math.round((probe.sizeBytes || 0) / 1024 / 1024)} MB` : isNativeRuntime() ? "Chưa đọc metadata" : "Mở Electron để chọn file"}</small></div><button className="text-button" onClick={() => void choose()}>Thay file</button></div><label className="field-label">AI provider<select value={providerId} onChange={(event) => setProviderId(event.target.value)}><option value="">Phân tích cục bộ (không gửi video)</option>{providers.filter((provider) => provider.enabled && provider.capabilities.includes("analysis")).map((provider) => <option value={provider.id} key={provider.id}>{provider.name} · {provider.model}</option>)}</select></label><label className="field-label">Engine xử lý job<select value={executionMode} onChange={(event) => setExecutionMode(event.target.value as Job["mode"])}><option value="local-cpu">CPU local</option><option value="local-gpu">GPU local</option><option value="hybrid">Hybrid · AI cloud + render local</option><option value="cloud">Cloud AI · render local</option></select></label><label className="field-label">Tỷ lệ clip xuất<select value={aspectRatio} onChange={(event) => setAspectRatio(event.target.value as Job["aspectRatio"])}><option value="9:16">9:16 · Shorts/Reels/TikTok</option><option value="1:1">1:1 · Social square</option><option value="16:9">16:9 · YouTube</option><option value="original">Original</option></select></label>{["cloud", "hybrid"].includes(executionMode) && !providerId && <p className="form-help">Chọn provider AI để tạo job cloud/hybrid.</p>}{running && <div className="analysis-progress"><div className="progress-label"><span>{progress?.stage || "processing"}</span><strong>{progress?.progress || 0}%</strong></div><div className="progress-track"><i style={{ width: `${progress?.progress || 0}%` }} /></div></div>}<button className="analyze-button" disabled={running || !file} onClick={() => void analyze()}><Icon name="spark" size={17} /> {running ? "Đang phân tích video..." : "Bắt đầu phân tích AI"}</button></section><section className="panel-card analysis-results"><div className="panel-head"><div><p className="eyebrow">CONTEXT MAP</p><h3>Kết quả phân tích</h3></div><span className={result ? "result-live" : "result-draft"}>{result ? "Đã cập nhật" : "Chờ phân tích"}</span></div>{result?.previewFrames?.length ? <div className="analysis-frames">{result.previewFrames.map((frame) => <img key={frame.timestampSeconds} src={frame.imageDataUrl} alt={`Frame ${frame.timestampSeconds}s`} />)}</div> : null}<div className="context-score"><div className="score-ring"><strong>{result?.score ?? "--"}</strong><small>score</small></div><div><strong>Retention dự đoán</strong><p>{result?.summary || "Kết quả sẽ xuất hiện sau khi phân tích"}</p><small className="subtle">Token: {result?.tokensUsed ?? 0} · Credit: {result?.creditsUsed ?? 0}</small></div></div><div className="scene-list">{(result?.scenes || []).map((scene) => <div key={`${scene.start}-${scene.title}`}><span className="scene-time">{scene.start}{scene.end ? ` → ${scene.end}` : ""}</span><strong>{scene.title}</strong><small>{scene.detail}</small></div>)}{result?.transcript && <p className="form-help">Transcript: {result.transcript.slice(0, 320)}{result.transcript.length > 320 ? "…" : ""}</p>}{!result && <p className="subtle">Chưa có scene map.</p>}</div><button className="button-quiet full-button" disabled={!result || (["cloud", "hybrid"].includes(executionMode) && !providerId)} onClick={createSceneJob}><Icon name="layers" size={15} /> Tạo {result?.scenes.length || 0} job theo scene</button></section></div></div>;
}
