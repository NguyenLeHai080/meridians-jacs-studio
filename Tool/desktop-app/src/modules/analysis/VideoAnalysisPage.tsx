import { useEffect, useRef, useState } from "react";
import { getRuntime, isNativeRuntime } from "../../core/runtime";
import { providerIsReady } from "../../core/job-utils";
import { defaultVoice, voicesForLanguage } from "../../core/voice-packs";
import type { AnalysisResult, Job, ProviderProfile, VideoProbe } from "../../core/types";
import { Icon } from "../../shared/Icon";

const ANALYSIS_LANGUAGES = [["vi", "Việt Nam"], ["en", "English"], ["ja", "日本語"], ["ko", "한국어"], ["zh-CN", "中文"], ["fr", "Français"], ["es", "Español"], ["ar", "العربية"]] as const;

type AnalysisPageProps = { onAddJob?: (job: Job) => void; onUpdateJob?: (jobId: string, values: Partial<Job>) => void; initialSource?: Job };

export function VideoAnalysisPage({ onAddJob, onUpdateJob, initialSource }: AnalysisPageProps) {
  const [file, setFile] = useState("");
  const [probe, setProbe] = useState<VideoProbe | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [providerId, setProviderId] = useState(""); const [transcriptionProviderId, setTranscriptionProviderId] = useState("");
  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const [language, setLanguage] = useState("vi");
  const [narratorEnabled, setNarratorEnabled] = useState(false);
  const [narratorGender, setNarratorGender] = useState<"male" | "female">("female");
  const [narratorVoice, setNarratorVoice] = useState("vi-female");
  const [aspectRatio, setAspectRatio] = useState<Job["aspectRatio"]>("9:16");
  const [executionMode, setExecutionMode] = useState<Job["mode"]>("local-cpu");
  const [progress, setProgress] = useState<{ progress: number; stage: string } | null>(null);
  const operationId = useRef("");
  const sourceJobId = useRef<string | undefined>(initialSource?.id);

  useEffect(() => { void getRuntime().getProviderProfiles().then(setProviders).catch(() => setProviders([])); }, []);
  useEffect(() => {
    // Sources opened from the library arrive with a resolved local path. Hydrate
    // the analysis form so the user can run the next step without re-picking.
    if (!initialSource) return;
    if (!initialSource.localPath) {
      setError("Source này chưa được tải về máy. Mở Tạo job hàng loạt để tải URL trước khi phân tích.");
      return;
    }
    setError("");
    setFile(initialSource.localPath);
    setResult(initialSource.analysis || null);
    setAspectRatio(initialSource.aspectRatio || "9:16");
    setExecutionMode(initialSource.mode || "local-cpu");
    setNarratorEnabled(Boolean(initialSource.narratorEnabled));
    setNarratorGender(initialSource.narratorGender || "female");
    setNarratorVoice(initialSource.narratorVoice || defaultVoice(initialSource.languages?.[0] || "vi", initialSource.narratorGender || "female").id);
    setLanguage(initialSource.languages?.[0] || "vi");
    setProviderId(initialSource.providerId || ""); setTranscriptionProviderId(initialSource.transcriptionProviderId || "");
    sourceJobId.current = initialSource.id;
    void getRuntime().probeVideo?.(initialSource.localPath).then(setProbe).catch((reason) => setError(reason instanceof Error ? reason.message : "Không đọc được video"));
  }, [initialSource?.id]);
  useEffect(() => {
    if (!initialSource) return;
    if (initialSource.analysis) setResult(initialSource.analysis);
    if (initialSource.stage === "analyzing" && initialSource.status === "running") {
      setProgress({ progress: initialSource.progress || 1, stage: "analyzing" });
    }
  }, [initialSource?.analysis, initialSource?.stage, initialSource?.status, initialSource?.progress]);
  useEffect(() => {
    const unsubscribe = getRuntime().onAnalysisProgress?.((value) => { if (value.operationId && value.operationId !== operationId.current) return; setProgress(value); });
    return () => unsubscribe?.();
  }, []);

  async function choose() {
    setError("");
    const picked = await getRuntime().pickVideo();
    if (!picked) return;
    if (initialSource?.localPath && initialSource.localPath !== picked) sourceJobId.current = undefined;
    setFile(picked); setResult(null);
    try { setProbe(await getRuntime().probeVideo?.(picked) || null); } catch (reason) { setError(reason instanceof Error ? reason.message : "Không đọc được video"); }
  }

  async function analyze() {
    const analyzeVideo = getRuntime().analyzeVideo;
    if (!file || !analyzeVideo) { setError("Hãy chọn video trong bản Electron đã cài đặt."); return; }
    const selectedProvider = providers.find((provider) => provider.id === providerId);
    if (providerId && (!selectedProvider || !selectedProvider.enabled || !selectedProvider.hasApiKey || !selectedProvider.capabilities.includes("analysis"))) {
      setError("Provider đã chọn chưa sẵn sàng hoặc chưa có API key. Mở Cài đặt tool để kiểm tra kết nối.");
      return;
    }
    if (narratorEnabled && !selectedProvider) {
      setError("Dịch theo ngữ cảnh cần chọn provider AI có API key. Hãy chọn provider trong danh sách hoặc tắt voice-over để chỉ phân tích cục bộ.");
      return;
    }
    if (["cloud", "hybrid"].includes(executionMode) && !selectedProvider) {
      setError("Chế độ Cloud/Hybrid cần chọn provider analysis đã cấu hình API key.");
      return;
    }
    setRunning(true); setError(""); setResult(null); setProgress({ progress: 1, stage: "starting" });
    operationId.current = `analysis-${Date.now()}`;
    if (!sourceJobId.current && onAddJob) {
      const id = `job-analysis-source-${Date.now()}`;
      sourceJobId.current = id;
      onAddJob({ id, name: fileName.replace(/\.[^.]+$/, ""), source: file, sourceType: "file", localPath: file, sourceOnly: true, mode: executionMode, providerId: providerId || undefined, transcriptionProviderId: transcriptionProviderId || undefined, narratorEnabled, narratorGender, narratorVoice, languages: [language], durationSeconds: probe?.durationSeconds, status: "running", stage: "analyzing", progress: 1, createdAt: new Date().toLocaleString("vi-VN"), synced: true });
    } else if (sourceJobId.current && onUpdateJob) {
      onUpdateJob(sourceJobId.current, { status: "running", stage: "analyzing", progress: 1, error: undefined, providerId: providerId || undefined, transcriptionProviderId: transcriptionProviderId || undefined, narratorEnabled, narratorGender, narratorVoice, languages: [language] });
    }
    const progressListener = getRuntime().onAnalysisProgress?.((event) => {
      if (event.operationId && event.operationId !== operationId.current) return;
      setProgress(event);
      if (sourceJobId.current && onUpdateJob) onUpdateJob(sourceJobId.current, { status: "running", stage: "analyzing", progress: Math.max(1, event.progress) });
    });
    // Empty selection is an explicit local-only run. The customer chooses a
    // provider when they want cloud vision/transcription and accepts upload.
    try {
      const analysis = await analyzeVideo(file, providerId || "", operationId.current, { languages: [language], narratorEnabled, narratorGender, narratorVoice, transcriptionProviderId: transcriptionProviderId || undefined });
      setResult(analysis);
      if (sourceJobId.current && onUpdateJob) onUpdateJob(sourceJobId.current, { status: "completed", stage: "completed", progress: 100, analysis, durationSeconds: probe?.durationSeconds, mode: executionMode, providerId: providerId || undefined, transcriptionProviderId: transcriptionProviderId || undefined, narratorEnabled, narratorGender, narratorVoice, languages: [language] });
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Phân tích thất bại";
      setError(message);
      if (sourceJobId.current && onUpdateJob) onUpdateJob(sourceJobId.current, { status: "failed", stage: "failed", error: message });
    } finally { progressListener?.(); setRunning(false); operationId.current = ""; }
  }

  const fileName = file.split(/[\\/]/).pop() || "Chưa chọn video";
  const availableProviders = providers.filter((provider) => providerIsReady(provider, "analysis"));
  const selectedProviderReady = availableProviders.some((provider) => provider.id === providerId);
  const availableVoices = voicesForLanguage(language);
  function seconds(value: string | undefined, fallback: number) {
    const parts = String(value || "").split(":").map(Number);
    if (parts.some((part) => !Number.isFinite(part))) return fallback;
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return Number.isFinite(parts[0]) ? parts[0] : fallback;
  }

  function createSceneJob() {
    if (!result || !file || !onAddJob) return;
    if (["cloud", "hybrid"].includes(executionMode) && !selectedProviderReady) {
      setError("Không thể tạo job: provider Cloud/Hybrid chưa có API key hoặc đã bị tắt.");
      return;
    }
    const scenes = result.scenes.length ? result.scenes : [{ start: "00:00", end: undefined, title: "Full video", detail: "Toàn bộ video" }];
    scenes.forEach((scene, index) => {
      const start = seconds(scene.start, 0);
      const nextStart = index + 1 < scenes.length ? seconds(scenes[index + 1].start, probe?.durationSeconds || start) : (probe?.durationSeconds || start);
      const end = Math.max(start + 0.25, Math.min(probe?.durationSeconds || nextStart, seconds(scene.end, nextStart)));
      const sceneId = scene.id || `scene-${index + 1}`;
      const baseName = fileName.replace(/\.[^.]+$/, "").replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "video";
      onAddJob({ id: `job-analysis-${Date.now()}-${index}`, name: `${fileName.replace(/\.[^.]+$/, "")} · ${scene.title}`, source: fileName, sourceType: "file", localPath: file, mode: executionMode, providerId: narratorEnabled || ["cloud", "hybrid"].includes(executionMode) ? providerId || undefined : undefined, parentJobId: sourceJobId.current, sceneId, splitScenes: false, analysisOnly: false, clipStartSeconds: start, clipEndSeconds: end, outputFileName: `${baseName}-${sceneId}`, subtitleText: narratorEnabled ? (scene.voiceover || scene.translation || undefined) : (scene.voiceover || scene.translation || scene.detail), aspectRatio, narratorEnabled, narratorGender, narratorVoice, languages: [language], analysis: result, status: "queued", stage: "queued", progress: 0, tokensUsed: index === 0 ? result.tokensUsed : 0, creditsUsed: index === 0 ? result.creditsUsed : 0, createdAt: new Date().toLocaleString("vi-VN") });
    });
  }
  return <div className="page-stack page-enter"><div className="page-title"><div><p className="eyebrow">AI WORKSPACE / VIDEO CONTEXT</p><h2>Phân tích video</h2><p>AI chỉ phân tích/kịch bản; giọng đọc được tạo cục bộ theo voice pack đã chọn.</p></div><button onClick={() => void choose()}><Icon name="upload" size={16} /> Chọn video</button></div>{error && <p className="form-error">{error}</p>}<div className="analysis-layout"><section className="panel-card analysis-preview"><div className="video-placeholder"><div className="video-grid" /><span className="play-orb"><Icon name="play" size={21} /></span><span className="duration">{probe?.durationSeconds ? `${Math.floor(probe.durationSeconds / 60).toString().padStart(2, "0")}:${Math.floor(probe.durationSeconds % 60).toString().padStart(2, "0")}` : "--:--"}</span></div><div className="file-bar"><span className="file-icon"><Icon name="folder" size={16} /></span><div><strong>{fileName}</strong><small>{probe ? `${probe.width || "?"}x${probe.height || "?"} · ${Math.round((probe.sizeBytes || 0) / 1024 / 1024)} MB` : isNativeRuntime() ? "Chưa đọc metadata" : "Mở Electron để chọn file"}</small></div><button className="text-button" onClick={() => void choose()}>Thay file</button></div><label className="field-label">AI provider<select value={providerId} onChange={(event) => setProviderId(event.target.value)}><option value="">Phân tích cục bộ (không gửi video)</option>{availableProviders.map((provider) => <option value={provider.id} key={provider.id}>{provider.name} · {provider.model}</option>)}</select></label><label className="field-label">Provider transcription (Groq Whisper)<select value={transcriptionProviderId} onChange={(event) => setTranscriptionProviderId(event.target.value)}><option value="">Dùng provider phân tích</option>{providers.filter((provider) => providerIsReady(provider, "transcription")).map((provider) => <option value={provider.id} key={provider.id}>{provider.name} · {provider.transcriptionModel || "whisper-large-v3"}</option>)}</select><small className="form-help">Groq dùng cho nhận diện giọng nói, không dùng TTS.</small></label><label className="field-label">Ngôn ngữ đầu ra<select value={language} onChange={(event) => { const next = event.target.value; setLanguage(next); setNarratorVoice(defaultVoice(next, narratorGender).id); }}>{ANALYSIS_LANGUAGES.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label className="preset-check"><input type="checkbox" checked={narratorEnabled} onChange={(event) => setNarratorEnabled(event.target.checked)} /><span><strong>Dịch và tạo voice-over theo ngữ cảnh</strong><small>Provider chỉ tạo kịch bản. Voice pack local đọc đúng kịch bản, không cần endpoint TTS/pricing.</small></span></label>{narratorEnabled && <div className="voice-grid"><label className="field-label">Giọng<select value={narratorGender} onChange={(event) => { const gender = event.target.value as "male" | "female"; setNarratorGender(gender); setNarratorVoice(defaultVoice(language, gender).id); }}><option value="female">Nữ · rõ và ấm</option><option value="male">Nam · trầm và chắc</option></select></label><label className="field-label">Voice pack local<select value={narratorVoice} onChange={(event) => setNarratorVoice(event.target.value)}>{availableVoices.map((voice) => <option value={voice.id} key={voice.id}>{voice.label}</option>)}</select></label></div>}{availableProviders.length === 0 && <p className="form-help">Chưa có provider analysis có API key. Bạn vẫn có thể chạy phân tích cục bộ; voice-over theo ngữ cảnh cần một provider để tạo kịch bản.</p>}<label className="field-label">Engine xử lý job<select value={executionMode} onChange={(event) => setExecutionMode(event.target.value as Job["mode"])}><option value="local-cpu">CPU local</option><option value="local-gpu">GPU local</option><option value="hybrid" disabled={!availableProviders.length}>Hybrid · AI cloud + render local</option><option value="cloud" disabled={!availableProviders.length}>Cloud AI · render local</option></select></label><label className="field-label">Tỷ lệ clip xuất<select value={aspectRatio} onChange={(event) => setAspectRatio(event.target.value as Job["aspectRatio"])}><option value="9:16">9:16 · Shorts/Reels/TikTok</option><option value="1:1">1:1 · Social square</option><option value="16:9">16:9 · YouTube</option><option value="original">Original</option></select></label>{["cloud", "hybrid"].includes(executionMode) && !selectedProviderReady && <p className="form-help">Chọn provider AI đã có API key để chạy Cloud/Hybrid.</p>}{running && <div className="analysis-progress"><div className="progress-label"><span>{progress?.stage || "processing"}</span><strong>{progress?.progress || 0}%</strong></div><div className="progress-track"><i style={{ width: `${progress?.progress || 0}%` }} /></div></div>}<button className="analyze-button" disabled={running || !file || (["cloud", "hybrid"].includes(executionMode) && !selectedProviderReady)} onClick={() => void analyze()}><Icon name="spark" size={17} /> {running ? "Đang phân tích video..." : "Bắt đầu phân tích AI"}</button></section><section className="panel-card analysis-results"><div className="panel-head"><div><p className="eyebrow">CONTEXT MAP</p><h3>Kết quả phân tích</h3></div><span className={result ? "result-live" : "result-draft"}>{result ? "Đã cập nhật" : "Chờ phân tích"}</span></div>{result?.previewFrames?.length ? <div className="analysis-frames">{result.previewFrames.map((frame) => <img key={frame.timestampSeconds} src={frame.imageDataUrl} alt={`Frame ${frame.timestampSeconds}s`} />)}</div> : null}<div className="context-score"><div className="score-ring"><strong>{result?.score ?? "--"}</strong><small>score</small></div><div><strong>Retention dự đoán</strong><p>{result?.summary || "Kết quả sẽ xuất hiện sau khi phân tích"}</p><small className="subtle">Token: {result?.tokensUsed ?? 0} · Credit: {result?.creditsUsed ?? 0}</small></div></div>{result?.storyPlan && <div className="job-summary"><p className="eyebrow">AIDA STORY PLAN · {result.storyPlan.status === "approved" ? "ĐÃ DUYỆT" : "BẢN NHÁP"}</p><p><b>Hook:</b> {result.storyPlan.hook || "-"}</p><p><b>Build-up:</b> {result.storyPlan.buildUp || "-"}</p><p><b>Climax:</b> {result.storyPlan.climax || "-"}</p><p><b>CTA:</b> {result.storyPlan.cta || "-"}</p></div>}{result?.topics?.length ? <p className="form-help"><b>Chủ đề:</b> {result.topics.join(" · ")}</p> : null}{result?.voiceScript && <div className="job-summary"><p className="eyebrow">VOICE-OVER THEO NGỮ CẢNH</p><p>{result.voiceScript}</p></div>}<div className="scene-list">{(result?.scenes || []).map((scene, index) => <div key={`${scene.start}-${scene.title}`}><span className="scene-time">{scene.start}{scene.end ? ` → ${scene.end}` : ""}</span><strong>{scene.title} {scene.confidence !== undefined ? <em>{Math.round(scene.confidence * 100)}%</em> : null}</strong><small>{scene.voiceover || scene.translation || scene.detail}</small>{result?.sceneMatches?.[index] && <small className={result.sceneMatches[index].needsReview ? "form-error" : "form-help"}>Match {Math.round(result.sceneMatches[index].matchScore * 100)}% · {result.sceneMatches[index].needsReview ? "cần duyệt" : "đã khớp"}</small>}</div>)}{result?.transcriptSegments?.length ? <p className="form-help"><b>Transcript có mốc:</b> {result.transcriptSegments.slice(0, 4).map((segment) => `[${Math.floor(segment.start / 60).toString().padStart(2, "0")}:${Math.floor(segment.start % 60).toString().padStart(2, "0")}] ${segment.text}`).join(" · ")}</p> : null}{result?.translatedTranscript && <p className="form-help">Bản dịch transcript: {result.translatedTranscript.slice(0, 320)}{result.translatedTranscript.length > 320 ? "…" : ""}</p>}{result?.transcript && <p className="form-help">Transcript gốc: {result.transcript.slice(0, 320)}{result.transcript.length > 320 ? "…" : ""}</p>}{!result && <p className="subtle">Chưa có scene map.</p>}</div><button className="button-quiet full-button" disabled={!result || (["cloud", "hybrid"].includes(executionMode) && !selectedProviderReady)} onClick={createSceneJob}><Icon name="layers" size={15} /> Tạo {result?.scenes.length || 0} job theo scene</button></section></div></div>;
}
