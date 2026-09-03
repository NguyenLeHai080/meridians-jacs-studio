import { useEffect, useMemo, useState } from "react";
import type { Job, NavKey } from "../../core/types";
import { Icon } from "../../shared/Icon";
import { Pagination } from "../../shared/Pagination";
import { defaultVoice, voicesForLanguage } from "../../core/voice-packs";

type Props = {
  jobs: Job[];
  onNavigate: (key: NavKey) => void;
  onUpdateJob: (jobId: string, values: Partial<Job>) => void;
  onAddJob: (job: Job) => void;
};

function scriptFor(job?: Job) {
  if (!job?.analysis) return "";
  return job.analysis.voiceScript?.trim() || job.analysis.scenes.map((scene) => scene.voiceover || scene.translation || "").filter(Boolean).join(" ");
}

export function StoryPage({ jobs, onNavigate, onUpdateJob, onAddJob }: Props) {
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState(false);
  const [voiceLanguage, setVoiceLanguage] = useState("vi");
  const [voiceGender, setVoiceGender] = useState<"male" | "female">("female");
  const [voiceId, setVoiceId] = useState("vi-female");
  const [sceneDrafts, setSceneDrafts] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const storyJobs = useMemo(() => jobs.filter((job) => job.analysis?.voiceScript || job.analysis?.scenes?.length), [jobs]);
  const selected = useMemo(() => storyJobs.find((job) => job.id === selectedId) || storyJobs[0], [storyJobs, selectedId]);
  const pageJobs = useMemo(() => storyJobs.slice((page - 1) * pageSize, page * pageSize), [storyJobs, page, pageSize]);
  const words = draft.trim() ? draft.trim().split(/\s+/).length : 0;
  const estimatedSeconds = Math.max(0, Math.round(words / 2.8));

  useEffect(() => {
    if (!selected) { setSelectedId(""); setDraft(""); return; }
    setSelectedId((current) => current || selected.id);
    setDraft(scriptFor(selected));
    const language = selected.languages?.[0] || "vi";
    const gender = selected.narratorGender || "female";
    setVoiceLanguage(language);
    setVoiceGender(gender);
    setVoiceId(selected.narratorVoice || defaultVoice(language, gender).id);
    setSceneDrafts(Object.fromEntries((selected.analysis?.scenes || []).map((scene, index) => [scene.id || `scene-${index + 1}`, scene.voiceover || scene.translation || ""])));
  }, [selected?.id]);
  useEffect(() => { setPage((current) => Math.min(current, Math.max(1, Math.ceil(storyJobs.length / pageSize)))); }, [storyJobs.length, pageSize]);

  function chooseJob(job: Job) {
    setSelectedId(job.id);
    setDraft(scriptFor(job));
    setSaved(false);
  }

  function saveDraft() {
    if (!selected?.analysis) return;
    const scenes = selected.analysis.scenes.map((scene, index) => ({ ...scene, voiceover: sceneDrafts[scene.id || `scene-${index + 1}`]?.trim() || scene.voiceover }));
    onUpdateJob(selected.id, { analysis: { ...selected.analysis, scenes, voiceScript: draft.trim(), storyPlan: selected.analysis.storyPlan ? { ...selected.analysis.storyPlan, status: "draft", version: (selected.analysis.storyPlan.version || 0) + 1 } : undefined }, narratorEnabled: true, narratorGender: voiceGender, narratorVoice: voiceId, languages: [voiceLanguage], requiresScriptApproval: true });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  function createVoiceJob() {
    if (!selected || !draft.trim() || (!selected.localPath && selected.sourceType !== "url")) return;
    if (selected.analysis?.storyPlan && selected.analysis.storyPlan.status !== "approved") return;
    const analysis = { ...(selected.analysis as NonNullable<Job["analysis"]>), voiceScript: draft.trim() };
    onAddJob({
      ...selected,
      sourceOnly: false,
      id: `job-story-${Date.now()}`,
      parentJobId: selected.id,
      name: `${selected.name} · voice final`,
      analysis,
      narratorEnabled: true,
      narratorVoice: voiceId,
      narratorGender: voiceGender,
      languages: [voiceLanguage],
      status: "queued",
      stage: selected.sourceType === "url" && !selected.localPath ? "downloading" : "queued",
      progress: 0,
      outputPath: undefined,
      error: undefined,
      synced: false,
      createdAt: "Vừa tạo",
    });
  }

  function approveScript() {
    if (!selected?.analysis || !draft.trim()) return;
    const currentPlan = selected.analysis.storyPlan || { hook: "", setup: "", buildUp: "", climax: "", cta: "", status: "draft" as const };
    onUpdateJob(selected.id, {
      analysis: { ...selected.analysis, voiceScript: draft.trim(), storyPlan: { ...currentPlan, status: "approved", approvedAt: new Date().toISOString(), version: (currentPlan.version || 0) + 1 } },
      narratorEnabled: true,
      narratorGender: voiceGender,
      narratorVoice: voiceId,
      languages: [voiceLanguage],
      requiresScriptApproval: false,
      sourceOnly: false,
      status: "queued",
      stage: "queued",
      progress: 0,
      error: undefined,
      synced: false,
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  const availableVoices = voicesForLanguage(voiceLanguage);

  return <div className="page-stack page-enter story-page">
    <div className="page-title"><div><p className="eyebrow">WORKFLOW / 03 · STORY</p><h2>Kịch bản & Voice</h2><p>Chỉnh lời kể theo đúng ngữ cảnh đã phân tích, lưu bản thảo rồi đưa thẳng vào queue voice/render.</p></div><div className="page-title-actions"><button className="button-quiet" type="button" onClick={() => onNavigate("analysis")}><Icon name="scan" size={15} /> Phân tích video</button><button type="button" disabled={!selected || !draft.trim() || Boolean(selected.analysis?.storyPlan && selected.analysis.storyPlan.status !== "approved")} onClick={createVoiceJob}><Icon name="mic" size={15} /> Tạo voice job</button></div></div>
    {!storyJobs.length ? <section className="panel-card empty-module"><span className="empty-module-icon"><Icon name="mic" size={24} /></span><h3>Chưa có kịch bản đã phân tích</h3><p>Hãy chạy Phân tích AI trước. Khi có scene/voice script, bạn sẽ chỉnh và tạo voice trực tiếp ở đây.</p><button className="button-quiet" type="button" onClick={() => onNavigate("analysis")}><Icon name="arrow" size={14} /> Mở Phân tích AI</button></section> : <>
      <section className="story-layout"><aside className="panel-card story-library"><div className="panel-head"><div><p className="eyebrow">SCRIPT LIBRARY</p><h3>Job có kịch bản</h3></div><span className="queue-count">{storyJobs.length}</span></div><div className="story-job-list">{pageJobs.map((job) => <button type="button" className={`story-job ${job.id === selected?.id ? "is-selected" : ""}`} key={job.id} onClick={() => chooseJob(job)}><span className="story-job-icon"><Icon name="mic" size={15} /></span><span><strong>{job.name}</strong><small>{job.source}</small></span><Icon name="arrow" size={13} /></button>)}</div><div className="story-pagination"><Pagination total={storyJobs.length} page={page} pageSize={pageSize} onPageChange={setPage} /></div><label className="story-page-size">Hiển thị <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option></select> dòng</label></aside>
        <section className="panel-card story-editor"><div className="panel-head"><div><p className="eyebrow">VOICE SCRIPT EDITOR</p><h3>{selected?.name}</h3><span className="subtle">{selected?.source} · {voiceLanguage}</span></div><span className={saved ? "result-live" : "result-draft"}>{saved ? "Đã lưu" : selected?.analysis?.storyPlan?.status === "approved" ? "Đã duyệt" : "Bản nháp"}</span></div>{selected?.analysis?.storyPlan && <div className="story-plan"><p className="eyebrow">AIDA STORY PLAN</p><div><span><b>Hook</b>{selected.analysis.storyPlan.hook || "-"}</span><span><b>Build-up</b>{selected.analysis.storyPlan.buildUp || "-"}</span><span><b>Climax</b>{selected.analysis.storyPlan.climax || "-"}</span><span><b>CTA</b>{selected.analysis.storyPlan.cta || "-"}</span></div></div>}<textarea className="story-textarea" value={draft} onChange={(event) => { setDraft(event.target.value); setSaved(false); }} placeholder="Kịch bản voice sẽ xuất hiện sau khi phân tích..." /><div className="story-voice-controls"><label className="field-label">Ngôn ngữ<select value={voiceLanguage} onChange={(event) => { const next = event.target.value; setVoiceLanguage(next); setVoiceId(defaultVoice(next, voiceGender).id); }}><option value="vi">Tiếng Việt</option><option value="en">English</option><option value="ja">日本語</option><option value="ko">한국어</option><option value="zh-CN">中文</option><option value="fr">Français</option><option value="es">Español</option></select></label><label className="field-label">Giọng<select value={voiceGender} onChange={(event) => { const next = event.target.value as "male" | "female"; setVoiceGender(next); setVoiceId(defaultVoice(voiceLanguage, next).id); }}><option value="female">Nữ</option><option value="male">Nam</option></select></label><label className="field-label">Voice pack<select value={voiceId} onChange={(event) => setVoiceId(event.target.value)}>{availableVoices.map((voice) => <option value={voice.id} key={voice.id}>{voice.label}</option>)}</select></label></div><div className="story-editor-meta"><span><Icon name="clock" size={13} /> Ước tính {estimatedSeconds}s</span><span><Icon name="layers" size={13} /> {words.toLocaleString("vi-VN")} từ</span><button type="button" className="button-quiet" onClick={saveDraft} disabled={!draft.trim() || !selected}><Icon name="check" size={14} /> Lưu bản thảo</button><button type="button" className="button-quiet" onClick={approveScript} disabled={!draft.trim() || !selected || selected.analysis?.storyPlan?.status === "approved"}><Icon name="check" size={14} /> Duyệt kịch bản</button></div><div className="story-scenes"><div className="panel-head"><div><p className="eyebrow">SCENE LINKING</p><h3>Cảnh nguồn gắn với lời kể</h3></div><button className="button-quiet" type="button" onClick={() => onNavigate("timeline")}><Icon name="video" size={14} /> Mở timeline</button></div>{(selected?.analysis?.scenes || []).map((scene, index) => { const match = selected.analysis?.sceneMatches?.find((item) => item.sceneId === scene.id) || selected.analysis?.sceneMatches?.[index]; return <article className="story-scene" key={`${scene.start}-${scene.title}`}><span className="story-scene-index">{String(index + 1).padStart(2, "0")}</span><div><strong>{scene.title}</strong><small>{scene.start}{scene.end ? ` → ${scene.end}` : ""} · {scene.voiceover || scene.translation || scene.detail}</small>{match && <em className={match.needsReview ? "match-review" : "match-ok"}>{Math.round(match.matchScore * 100)}% match · {match.needsReview ? "cần duyệt" : "đã khớp"}</em>}</div><Icon name={match?.needsReview ? "alert" : "check"} size={14} /></article>; })}</div></section></section>
    </>}
  </div>;
}
