import { useEffect, useMemo, useRef, useState } from "react";
import type { Job, NavKey, TimelineClip } from "../../core/types";
import { getRuntime, isNativeRuntime } from "../../core/runtime";
import { defaultVoice, voicesForLanguage } from "../../core/voice-packs";
import { Icon, type IconName } from "../../shared/Icon";
import { type EditorScene, type EditorTrack } from "./editor.types";
import { createTimelineHistory, normalizeTimeline, splitTimelineClip, trimTimelineClip } from "../../core/timeline";
import { approveSceneMatches, hasUnreviewedSceneMatches, replaceSceneMatch, timestampSeconds } from "../../core/job-utils";

type Props = {
  jobs: Job[];
  onNavigate: (key: NavKey) => void;
  onAddJob: (job: Job) => void;
  onUpdateJob?: (jobId: string, values: Partial<Job>) => void;
  sourceJobId?: string;
};

const selectOptions = {
  language: ["Tiếng Việt", "English", "日本語", "한국어", "中文 · Trung Quốc", "繁體中文 · Đài Loan", "ไทย", "Bahasa Indonesia", "Bahasa Melayu", "Filipino", "Français", "Español", "Português · Brazil", "Deutsch", "Italiano", "Русский", "Türkçe", "العربية", "हिन्दी", "Nederlands"],
  gender: ["Nữ", "Nam", "Trung tính"],
  tone: ["Tự nhiên", "Năng lượng", "Điềm tĩnh", "Kịch tính"],
  duration: ["Theo video gốc", "30 giây", "60 giây", "90 giây"],
};
const languageCodes: Record<string, string> = {
  "Tiếng Việt": "vi",
  English: "en",
  日本語: "ja",
  한국어: "ko",
  "中文 · Trung Quốc": "zh-CN",
  "繁體中文 · Đài Loan": "zh-TW",
  Français: "fr",
  Español: "es",
  "Português · Brazil": "pt-BR",
  Deutsch: "de",
  Italiano: "it",
  Русский: "ru",
  Türkçe: "tr",
  العربية: "ar",
  हिन्दी: "hi",
  Nederlands: "nl",
  ไทย: "th",
  "Bahasa Indonesia": "id",
  "Bahasa Melayu": "ms",
  Filipino: "fil",
};
const languageLabel = (language?: string) => Object.entries(languageCodes).find(([, code]) => code === language)?.[0] || selectOptions.language[0];

function Toggle({ active, onClick }: { active: boolean; onClick: () => void }) {
  return <button type="button" className={`editor-toggle ${active ? "on" : ""}`} onClick={onClick} aria-pressed={active}><span /></button>;
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <label className="editor-field"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select><Icon name="chevron" size={13} /></label>;
}

function fileUrl(value?: string) {
  if (!value || !isNativeRuntime()) return undefined;
  // Keep the absolute path in a query parameter. Encoding it as the protocol
  // pathname strips the leading slash on macOS and breaks Windows drive paths.
  return `jacs-media://local?path=${encodeURIComponent(value)}`;
}

function Preview({ label, reframed, scene, mediaUrl, muted, playing, syncSeconds, aspectRatio, subtitleEnabled, onTimeUpdate, onPlayingChange }: { label: string; reframed?: boolean; scene: EditorScene; mediaUrl?: string; muted: boolean; playing: boolean; syncSeconds?: number; aspectRatio: "9:16" | "1:1" | "16:9"; subtitleEnabled: boolean; onTimeUpdate?: (seconds: number) => void; onPlayingChange?: (playing: boolean) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mediaError, setMediaError] = useState("");
  useEffect(() => { setMediaError(""); }, [mediaUrl]);
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !mediaUrl) return;
    const target = syncSeconds === undefined ? toSeconds(scene.start) : Math.max(toSeconds(scene.start), syncSeconds);
    if (video.readyState >= 1 && Math.abs(video.currentTime - target) > 0.35) video.currentTime = target;
    if (playing) void video.play().catch(() => undefined); else video.pause();
  }, [mediaUrl, scene.start, playing, syncSeconds]);
  const endSeconds = toSeconds(scene.end);
  const sceneStart = toSeconds(scene.start);
  const localTime = Math.max(0, Math.min(endSeconds - sceneStart, (syncSeconds ?? sceneStart) - sceneStart));
  const activeCue = scene.subtitleCues?.find((cue) => localTime >= cue.start && localTime < cue.end)
    || scene.subtitleCues?.find((cue) => localTime < cue.end)
    || scene.subtitleCues?.at(-1);
  return <div className={`editor-preview ${reframed ? "reframed" : "original-preview"}`}><div className="preview-topline"><span>{label}</span><span className="preview-resolution">{reframed ? `${aspectRatio} · AUTO` : "SOURCE"}</span></div><div className={`preview-art preview-ratio-${aspectRatio.replace(":", "-")}`}>{mediaUrl && !mediaError ? <video ref={videoRef} className="preview-video" controls={!reframed} muted={muted} preload="metadata" src={mediaUrl} onPlay={() => onPlayingChange?.(true)} onPause={() => onPlayingChange?.(false)} onLoadedMetadata={(event) => { const video = event.currentTarget; video.currentTime = toSeconds(scene.start); if (playing) void video.play().catch(() => undefined); }} onLoadedData={() => setMediaError("")} onError={() => { setMediaError("Không mở được video trên thiết bị. Hãy kiểm tra file vẫn còn ở đúng vị trí hoặc thử nạp lại source."); onPlayingChange?.(false); }} onTimeUpdate={(event) => { const current = event.currentTarget.currentTime; onTimeUpdate?.(current); if (endSeconds > 0 && current >= endSeconds) { event.currentTarget.pause(); onPlayingChange?.(false); } }} /> : <div className="preview-unavailable"><Icon name="video" size={24} /><strong>{mediaError ? "Không mở được preview" : "Chưa có preview source"}</strong><small>{mediaError || "Mở bản Electron hoặc nạp file local để xem video thật."}</small></div>}{subtitleEnabled && activeCue?.text && <span className="editor-preview-caption">{activeCue.text}</span>}</div><div className="preview-meta"><span><i className="preview-live" /> {mediaUrl && !mediaError ? "Source video sẵn sàng" : "Preview chưa khả dụng"}</span><span>{scene.start} / {scene.end}</span></div></div>;
}

function buildPreviewCues(text: string | undefined, duration: number) {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  const phrases = normalized.match(/[^.!?…。！？]+[.!?…。！？]?/gu)?.map((item) => item.trim()).filter(Boolean) || [normalized];
  const chunks = phrases.flatMap((phrase) => {
    const hasCjk = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/u.test(phrase);
    const maxChars = hasCjk ? 24 : 54;
    if ([...phrase].length <= maxChars) return [phrase];
    const words = phrase.split(" ");
    if (words.length === 1) {
      const characters = [...phrase];
      return Array.from({ length: Math.ceil(characters.length / maxChars) }, (_, index) => characters.slice(index * maxChars, (index + 1) * maxChars).join(""));
    }
    const result: string[] = [];
    let current = "";
    words.forEach((word) => {
      const next = current ? `${current} ${word}` : word;
      if (current && [...next].length > maxChars) { result.push(current); current = word; } else current = next;
    });
    if (current) result.push(current);
    return result;
  });
  const total = chunks.reduce((sum, chunk) => sum + Math.max(1, [...chunk].length), 0);
  let cursor = 0;
  return chunks.map((chunk, index) => {
    const end = index === chunks.length - 1 ? Math.max(0.25, duration) : cursor + Math.max(0.12, duration * [...chunk].length / total);
    const cue = { start: cursor, end, text: chunk };
    cursor = end;
    return cue;
  });
}

function Waveform({ color }: { color: string }) {
  const bars = useMemo(() => Array.from({ length: 42 }, (_, index) => 18 + ((index * 17) % 29)), []);
  return <span className="waveform" aria-hidden>{bars.map((height, index) => <i key={index} style={{ height: `${height}%`, background: color }} />)}</span>;
}

function toSeconds(value?: string) {
  const parts = String(value || "0").split(":").map(Number);
  if (parts.some((part) => !Number.isFinite(part))) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

function formatSeconds(value: number) {
  const safe = Math.max(0, Math.round(value));
  return `${Math.floor(safe / 60).toString().padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

function narrationForClip(text: string | undefined, sourceStart: number, sourceEnd: number, clipStart: number, clipEnd: number) {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  if (!normalized) return undefined;
  const sourceDuration = Math.max(0.25, sourceEnd - sourceStart);
  const isFullClip = clipStart <= sourceStart + 0.05 && clipEnd >= sourceEnd - 0.05;
  if (isFullClip) return normalized;
  const words = normalized.split(" ");
  const from = Math.max(0, Math.min(words.length - 1, Math.floor((clipStart - sourceStart) / sourceDuration * words.length)));
  const to = Math.max(from + 1, Math.min(words.length, Math.ceil((clipEnd - sourceStart) / sourceDuration * words.length)));
  return words.slice(from, to).join(" ").trim() || normalized;
}

/** Return a stable identity shared by a library source and its queue job. */
function projectIdentity(job: Job) {
  if (job.sourcePaths?.length) return `project:${job.id}`;
  if (job.sourceType === "url") return `url:${String(job.source || "").trim()}`;
  return `file:${String(job.localPath || job.source || "").trim()}`;
}

export function EditorWorkspace({ jobs, onNavigate, onAddJob, onUpdateJob, sourceJobId }: Props) {
  const [sceneId, setSceneId] = useState("hook");
  const [selectedSceneIds, setSelectedSceneIds] = useState<string[]>([]);
  const [playing, setPlaying] = useState(false);
  // Start muted so the central transport can start playback from a click even
  // when Chromium applies its autoplay policy. The volume button can unmute
  // after playback has started.
  const [muted, setMuted] = useState(true);
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "1:1" | "16:9">("9:16");
  const [playheadSeconds, setPlayheadSeconds] = useState(0);
  const [selectedSourceId, setSelectedSourceId] = useState(sourceJobId || "");
  const [projectSourceIds, setProjectSourceIds] = useState<string[]>([]);
  const [projectMessage, setProjectMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [timelineEdits, setTimelineEdits] = useState<TimelineClip[]>([]);
  const [draggedSceneId, setDraggedSceneId] = useState<string | null>(null);
  const timelineHistory = useRef<ReturnType<typeof createTimelineHistory> | null>(null);
  const [trimDraft, setTrimDraft] = useState({ in: 0, out: 0 });
  const [settings, setSettings] = useState({ bilingual: true, hook: true, music: false, voiceover: false, subtitles: true });
  const [fields, setFields] = useState({ narrator: "Linh · Nữ miền Nam", language: selectOptions.language[0], gender: selectOptions.gender[0], tone: selectOptions.tone[0], duration: selectOptions.duration[0] });
  const activeJobs = jobs.filter((job) => !job.sourceOnly && (job.status === "queued" || job.status === "running")).length;
  // Only expose a render action when the queue has a resolvable media source.
  // Metadata-only jobs (for example browser demo records) cannot be rendered
  // by Electron until a local path or downloadable URL is attached.
  // A project is represented by its root source record. Derived scene/render
  // jobs are intentionally excluded so the project selector never looks like
  // a static demo or duplicates one uploaded video several times.
  const sourceCandidates = useMemo(() => jobs
    .filter((job) => !job.parentJobId && (job.analysis?.scenes?.length || job.localPath || job.sourceType === "url" || job.sourcePaths?.length))
    // A source-only library row is only an input record. Once a real queue
    // job exists for that input, use the queue job as the project root so the
    // inspector can expose its status, analysis and child scene jobs.
    .sort((a, b) => {
      const rank = (job: Job) => (job.sourceOnly ? 0 : 2) + (job.analysis?.scenes?.length ? 1 : 0);
      return rank(b) - rank(a) || b.createdAt.localeCompare(a.createdAt);
    }), [jobs]);
  const sourceOptions = useMemo(() => {
    const grouped = new Map<string, Job>();
    sourceCandidates.forEach((job) => {
      const key = projectIdentity(job);
      const existing = grouped.get(key);
      if (!existing) grouped.set(key, job);
    });
    return [...grouped.values()];
  }, [sourceCandidates, sourceJobId]);
  const requestedSource = sourceJobId ? jobs.find((job) => job.id === sourceJobId) : undefined;
  const requestedRootId = requestedSource?.parentJobId || requestedSource?.id;
  const lastRequestedRootId = useRef<string | undefined>(undefined);
  useEffect(() => {
    const requestedChanged = requestedRootId !== lastRequestedRootId.current;
    lastRequestedRootId.current = requestedRootId;
    setSelectedSourceId((current) => {
      // Apply an incoming navigation target once. Subsequent queue updates
      // must preserve a project explicitly chosen in the selector/list.
      if (requestedChanged && requestedRootId && sourceOptions.some((job) => job.id === requestedRootId)) return requestedRootId;
      if (requestedChanged && requestedSource && sourceOptions.every((job) => job.id !== requestedSource.id)) return requestedSource.id;
      // Keep a freshly-created project selected while the parent App commits
      // the new job to state. Falling back to the first project here made the
      // Timeline appear stuck on one fixed video after clicking "Ghép".
      if (current && jobs.some((job) => job.id === current) && !sourceOptions.some((job) => job.id === current)) {
        const currentJob = jobs.find((job) => job.id === current);
        const matchingProject = currentJob && sourceOptions.find((job) => projectIdentity(job) === projectIdentity(currentJob));
        if (matchingProject) return matchingProject.id;
      }
      return sourceOptions.some((job) => job.id === current) ? current : sourceOptions[0]?.id || "";
    });
  }, [jobs, requestedRootId, requestedSource?.id, sourceOptions]);
  // A remote queue can contain a child job without its parent source record.
  // Keep that job usable as a project instead of silently falling back to the
  // first (and often unrelated) project in the list.
  const sourceJob = sourceOptions.find((job) => job.id === selectedSourceId)
    || requestedSource
    || sourceOptions[0];
  const projectOptions = requestedSource && !sourceOptions.some((job) => job.id === requestedSource.id)
    ? [requestedSource, ...sourceOptions]
    : sourceOptions;
  const projectJobs = useMemo(() => {
    if (!sourceJob) return [];
    const key = projectIdentity(sourceJob);
    return jobs.filter((job) => {
      if (job.id === sourceJob.id || job.sourceOnly) return false;
      return job.parentJobId === sourceJob.id || (!job.parentJobId && projectIdentity(job) === key);
    });
  }, [jobs, sourceJob?.id]);
  const projectSourceOptions = sourceOptions.filter((job) => Boolean(job.localPath) && !job.sourcePaths?.length);
  const selectedProjectSources = projectSourceOptions.filter((job) => projectSourceIds.includes(job.id));
  useEffect(() => {
    setProjectSourceIds((current) => {
      const available = new Set(projectSourceOptions.map((job) => job.id));
      const retained = current.filter((id) => available.has(id));
      if (!retained.length && sourceJob?.localPath && !sourceJob.sourcePaths?.length) {
        return current.length === 1 && current[0] === sourceJob.id ? current : [sourceJob.id];
      }
      return retained.length === current.length && retained.every((id, index) => id === current[index]) ? current : retained;
    });
  }, [projectSourceOptions, sourceJob?.id, sourceJob?.localPath, sourceJob?.sourcePaths]);
  const mediaUrl = sourceJob?.localPath ? fileUrl(sourceJob.localPath) : sourceJob?.sourceType === "url" && /^https?:\/\//i.test(sourceJob.source) ? sourceJob.source : undefined;
  const editorScenes = useMemo<EditorScene[]>(() => {
    const scenes = sourceJob?.analysis?.scenes || [];
    const duration = sourceJob?.durationSeconds || 0;
    const sourceById = new Map(scenes.map((item, index) => [item.id || `scene-${index + 1}`, { item, index }]));
    const clips: TimelineClip[] = timelineEdits.length ? [...timelineEdits].sort((a, b) => a.order - b.order) : scenes.map((item, index) => ({ sceneId: item.id || `scene-${index + 1}`, order: index }));
    return clips.map((clip, index): EditorScene | null => {
      const sourceId = clip.sourceSceneId || clip.sceneId.replace(/-part-\d+$/, "");
      const source = sourceById.get(sourceId);
      if (!source) return null;
      const start = source.item.start || "00:00";
      const nextStart = scenes[source.index + 1]?.start;
      const end = source.item.end || nextStart || (duration ? `${Math.floor(duration / 60).toString().padStart(2, "0")}:${Math.floor(duration % 60).toString().padStart(2, "0")}` : start);
      const startSeconds = clip.trimIn ?? toSeconds(start);
      const endSeconds = clip.trimOut ?? toSeconds(end);
      const subtitle = narrationForClip(source.item.voiceover || source.item.translation || source.item.detail, toSeconds(start), toSeconds(end), startSeconds, endSeconds);
      const safeEnd = Math.max(startSeconds + 0.25, endSeconds);
      return { id: clip.sceneId, start: formatSeconds(startSeconds), end: formatSeconds(safeEnd), title: source.item.title || `Scene ${source.index + 1}${clip.sceneId === sourceId ? "" : " · đoạn tách"}`, detail: subtitle || source.item.detail, subtitle: subtitle || undefined, subtitleCues: buildPreviewCues(subtitle, safeEnd - startSeconds), accent: ["cyan", "lime", "orange", "blue"][index % 4] };
    }).filter((item): item is EditorScene => item !== null);
  }, [sourceJob?.analysis?.scenes, sourceJob?.durationSeconds, timelineEdits]);
  useEffect(() => {
    setSelectedSceneIds((current) => {
      const valid = new Set(editorScenes.map((item) => item.id));
      const retained = current.filter((id) => valid.has(id));
      if (retained.length) return retained;
      return editorScenes[0] ? [editorScenes[0].id] : [];
    });
  }, [editorScenes]);
  useEffect(() => {
    setSceneId(editorScenes[0]?.id || "");
    setSelectedSceneIds(editorScenes[0] ? [editorScenes[0].id] : []);
  }, [sourceJob?.id, sourceJob?.analysis?.scenes?.length]);
  useEffect(() => {
    const sourceScenes = sourceJob?.analysis?.scenes || [];
    const validIds = new Set(sourceScenes.map((scene, index) => scene.id || `scene-${index + 1}`));
    const stored = sourceJob?.timelineClips?.filter((clip) => validIds.has(clip.sceneId) || Boolean(clip.sourceSceneId && validIds.has(clip.sourceSceneId)) || validIds.has(clip.sceneId.replace(/-part-\d+$/, ""))).sort((a, b) => a.order - b.order);
    const initial = normalizeTimeline(stored?.length ? stored : sourceScenes.map((scene, order) => ({ sceneId: scene.id || `scene-${order + 1}`, order })));
    timelineHistory.current = createTimelineHistory(initial);
    setTimelineEdits(initial);
  }, [sourceJob?.id, sourceJob?.analysis?.scenes?.length]);
  const activeSceneId = editorScenes.some((item) => item.id === sceneId) ? sceneId : editorScenes[0]?.id || "";
  useEffect(() => {
    const current = timelineEdits.find((clip) => clip.sceneId === activeSceneId);
    setTrimDraft({ in: current?.trimIn ?? toSeconds(editorScenes.find((item) => item.id === activeSceneId)?.start), out: current?.trimOut ?? toSeconds(editorScenes.find((item) => item.id === activeSceneId)?.end) });
  }, [activeSceneId, timelineEdits, editorScenes]);
  const canCreateJob = Boolean(sourceJob?.localPath || sourceJob?.sourceType === "url") && selectedSceneIds.length > 0;
  const orderedScenes = useMemo(() => {
    if (!timelineEdits.length) return editorScenes;
    const byId = new Map(editorScenes.map((scene) => [scene.id, scene]));
    return [...timelineEdits].sort((a, b) => a.order - b.order).map((clip) => byId.get(clip.sceneId)).filter((scene): scene is EditorScene => Boolean(scene));
  }, [editorScenes, timelineEdits]);
  const timelineTracks = useMemo<EditorTrack[]>(() => {
    if (!sourceJob?.analysis?.scenes?.length) return [];
    const total = Math.max(sourceJob?.durationSeconds || 0, ...editorScenes.map((item) => toSeconds(item.end)), 1);
    // Keep the complete scene map visible on every track. Selection controls
    // which clips enter the render queue, while the timeline remains useful
    // for inspecting and choosing any scene (including after "Bỏ chọn").
    let cursor = 0;
    const clips = orderedScenes.map((item) => {
      const widthSeconds = Math.max(0.25, toSeconds(item.end) - toSeconds(item.start));
      const clip = { sceneId: item.id, label: item.title, left: cursor / total * 100, width: Math.max(2, widthSeconds / total * 100) };
      cursor += widthSeconds;
      return clip;
    });
    const tracks: EditorTrack[] = [
      { id: "video", label: "Video nguồn", icon: "video", color: "#31d8d0", clips: [] },
      { id: "voice", label: "AI voice", icon: "mic", color: "#b9ea6c", clips: [] },
      { id: "audio", label: "Âm thanh gốc", icon: "volume", color: "#e9a76f", clips: [] },
      { id: "subtitle", label: "Phụ đề", icon: "captions", color: "#8fa8ff", clips: [] },
    ];
    return tracks.map((track) => ({ ...track, clips: clips.map((clip) => {
      const item = orderedScenes.find((scene) => scene.id === clip.sceneId);
      return { ...clip, label: track.id === "video" ? clip.label : track.id === "subtitle" ? (item?.subtitle || "Chưa có phụ đề") : track.label };
    }) }));
  }, [editorScenes, orderedScenes, selectedSceneIds, sourceJob?.analysis?.scenes, sourceJob?.durationSeconds]);
  const scene = editorScenes.find((item) => item.id === activeSceneId) ?? { id: "empty", start: "00:00", end: "00:00", title: "Chưa có scene", detail: "Chạy phân tích AI để tạo scene map từ video gốc.", accent: "cyan" };
  const timelineDuration = Math.max(sourceJob?.durationSeconds || 0, ...editorScenes.map((item) => toSeconds(item.end)), 1);
  const sceneStart = toSeconds(scene.start);
  const sceneEnd = Math.max(sceneStart + 0.25, toSeconds(scene.end));
  const sceneProgress = Math.min(100, Math.max(0, (playheadSeconds - sceneStart) / (sceneEnd - sceneStart) * 100));
  const setField = (key: keyof typeof fields) => (value: string) => setFields((current) => ({ ...current, [key]: value }));
  const selectedLanguage = languageCodes[fields.language] || "vi";
  const availableNarrators = voicesForLanguage(selectedLanguage);
  useEffect(() => {
    const hasContextualVoice = Boolean(sourceJob?.analysis?.voiceScript || sourceJob?.analysis?.scenes?.some((item) => item.voiceover || item.translation));
    const language = sourceJob?.languages?.[0] || "vi";
    const gender = sourceJob?.narratorGender === "male" ? "Nam" : sourceJob?.narratorGender === "female" ? "Nữ" : fields.gender;
    const voice = sourceJob?.narratorVoice ? voicesForLanguage(language).find((item) => item.id === sourceJob.narratorVoice)?.label : undefined;
    setFields((current) => ({ ...current, language: languageLabel(language), gender, narrator: voice || defaultVoice(language, gender === "Nam" ? "male" : "female").label }));
    setSettings((current) => ({ ...current, bilingual: sourceJob?.keepOriginalAudio ?? current.bilingual, hook: sourceJob?.emphasizeHook ?? current.hook, music: sourceJob?.backgroundMusic ?? current.music, voiceover: Boolean(sourceJob?.narratorEnabled || hasContextualVoice), subtitles: sourceJob?.subtitlesEnabled ?? current.subtitles }));
    setAspectRatio(sourceJob?.aspectRatio === "1:1" || sourceJob?.aspectRatio === "16:9" || sourceJob?.aspectRatio === "9:16" ? sourceJob.aspectRatio : "9:16");
  }, [sourceJob?.id]);
  const setLanguage = (value: string) => {
    const language = languageCodes[value] || "vi";
    const voice = defaultVoice(language, fields.gender === "Nam" ? "male" : "female");
    setFields((current) => ({ ...current, language: value, narrator: voice.label }));
  };
  const setGender = (value: string) => {
    const gender = value === "Nam" ? "male" : "female";
    const voice = defaultVoice(selectedLanguage, gender);
    setFields((current) => ({ ...current, gender: value, narrator: voice.label }));
  };
  const toggleSetting = (key: keyof typeof settings) => setSettings((current) => ({ ...current, [key]: !current[key] }));
  const applyProjectSettings = () => {
    if (!sourceJob || !onUpdateJob) return;
    const narrator = availableNarrators.find((voice) => voice.label === fields.narrator) || defaultVoice(selectedLanguage, fields.gender === "Nam" ? "male" : "female");
    const values: Partial<Job> = {
      languages: [selectedLanguage],
      narratorEnabled: settings.voiceover,
      narratorVoice: narrator.id,
      narratorGender: narrator.gender,
      keepOriginalAudio: settings.bilingual,
      emphasizeHook: settings.hook,
      backgroundMusic: settings.music,
      subtitlesEnabled: settings.subtitles,
      aspectRatio,
    };
    // Apply the editor preset to the project root and any already-created
    // scene jobs so changing Timeline settings is immediately reflected in
    // the queue, not only in the next render.
    onUpdateJob(sourceJob.id, values);
    projectJobs.forEach((job) => onUpdateJob(job.id, values));
    setProjectMessage("Đã lưu cài đặt cho dự án. Các job tạo từ timeline sẽ dùng đúng ngôn ngữ, giọng và lớp âm thanh này.");
  };
  const approveTimelineReview = () => {
    if (!sourceJob || !onUpdateJob || !sourceJob.analysis?.sceneMatches) return;
    onUpdateJob(sourceJob.id, {
      analysis: { ...sourceJob.analysis, sceneMatches: approveSceneMatches(sourceJob.analysis.sceneMatches) },
      status: "queued",
      stage: "queued",
      progress: 0,
      error: undefined,
      childJobIds: undefined,
    });
    setProjectMessage("Đã duyệt scene match. Job được đưa lại vào queue để tạo các clip theo timeline đã xác nhận.");
  };
  const selectMatchCandidate = (matchIndex: number, sceneId: string) => {
    if (!sourceJob || !onUpdateJob || !sourceJob.analysis?.sceneMatches) return;
    const selected = sourceJob.analysis.scenes.find((item, index) => (item.id || `scene-${index + 1}`) === sceneId);
    if (!selected) return;
    const selectedIndex = sourceJob.analysis.scenes.indexOf(selected);
    const nextScene = sourceJob.analysis.scenes[selectedIndex + 1];
    const start = timestampSeconds(selected.start);
    const end = Math.max(start + 0.25, timestampSeconds(selected.end, timestampSeconds(nextScene?.start, sourceJob.durationSeconds || start + 1)));
    onUpdateJob(sourceJob.id, {
      analysis: {
        ...sourceJob.analysis,
        sceneMatches: replaceSceneMatch(sourceJob.analysis.sceneMatches, matchIndex, { sceneId, sourceStart: start, sourceEnd: end }),
      },
    });
    setProjectMessage("Đã thay cảnh cho lời đọc. Duyệt timeline khi mọi cảnh đã đúng.");
  };
  const toggleScene = (id: string) => setSelectedSceneIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const selectScene = (id: string) => { setSceneId(id); setSelectedSceneIds((current) => current.includes(id) ? current : [...current, id]); };
  const inspectAndToggleScene = (id: string) => { setSceneId(id); toggleScene(id); };
  const selectAllScenes = () => setSelectedSceneIds(editorScenes.map((item) => item.id));
  const clearSceneSelection = () => setSelectedSceneIds([]);
  const moveScene = (id: string, direction: -1 | 1) => {
    if (!sourceJob || !onUpdateJob) return;
    const current = [...(timelineEdits.length ? timelineEdits : editorScenes.map((scene, order) => ({ sceneId: scene.id, order })))].sort((a, b) => a.order - b.order);
    const index = current.findIndex((clip) => clip.sceneId === id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return;
    [current[index], current[nextIndex]] = [current[nextIndex], current[index]];
    const next = current.map((clip, order) => ({ ...clip, order }));
    timelineHistory.current?.commit(next);
    setTimelineEdits(next);
    onUpdateJob(sourceJob.id, { timelineClips: next });
  };
  const reorderScene = (fromId: string, toId: string) => {
    if (!sourceJob || !onUpdateJob || fromId === toId) return;
    const current = [...(timelineEdits.length ? timelineEdits : editorScenes.map((item, order) => ({ sceneId: item.id, order })))].sort((a, b) => a.order - b.order);
    const fromIndex = current.findIndex((clip) => clip.sceneId === fromId);
    const toIndex = current.findIndex((clip) => clip.sceneId === toId);
    if (fromIndex < 0 || toIndex < 0) return;
    const [moved] = current.splice(fromIndex, 1);
    current.splice(toIndex, 0, moved);
    const next = current.map((clip, order) => ({ ...clip, order }));
    timelineHistory.current?.commit(next);
    setTimelineEdits(next);
    onUpdateJob(sourceJob.id, { timelineClips: next });
    setSceneId(fromId);
    setProjectMessage("Đã cập nhật thứ tự cảnh trên timeline.");
  };
  const commitTimeline = (next: TimelineClip[], message?: string) => {
    if (!sourceJob || !onUpdateJob) return;
    const normalized = timelineHistory.current?.commit(next) || normalizeTimeline(next);
    persistTimeline(normalized, message);
  };
  const persistTimeline = (next: TimelineClip[], message?: string) => {
    if (!sourceJob || !onUpdateJob) return;
    setTimelineEdits(next);
    onUpdateJob(sourceJob.id, { timelineClips: next });
    if (message) setProjectMessage(message);
  };
  const applyTrim = () => {
    if (!activeSceneId) return;
    const next = trimTimelineClip(timelineEdits, activeSceneId, trimDraft.in, trimDraft.out);
    commitTimeline(next, `Đã cắt ${scene.title} từ ${formatSeconds(trimDraft.in)} đến ${formatSeconds(trimDraft.out)}.`);
  };
  const splitActiveScene = () => {
    if (!activeSceneId) return;
    const source = timelineEdits.find((clip) => clip.sceneId === activeSceneId);
    const start = source?.trimIn ?? sceneStart;
    const end = source?.trimOut ?? sceneEnd;
    const next = splitTimelineClip(timelineEdits.map((clip) => clip.sceneId === activeSceneId ? { ...clip, trimIn: start, trimOut: end } : clip), activeSceneId, (start + end) / 2);
    commitTimeline(next, "Đã tách cảnh thành hai đoạn trên timeline.");
  };
  const undoTimeline = () => {
    const next = timelineHistory.current?.undo();
    if (next) persistTimeline(next, "Đã hoàn tác thay đổi timeline.");
  };
  const redoTimeline = () => {
    const next = timelineHistory.current?.redo();
    if (next) persistTimeline(next, "Đã làm lại thay đổi timeline.");
  };
  const createSceneJob = () => {
    if (!sourceJob || !editorScenes.length || !selectedSceneIds.length) return;
    if (!sourceJob.localPath) {
      setProjectMessage("Video chưa có file local để cắt. Hãy tải URL trong Tạo job hàng loạt rồi thử lại.");
      return;
    }
    const language = selectedLanguage;
    const selectedNarrator = availableNarrators.find((voice) => voice.label === fields.narrator) || defaultVoice(language, fields.gender === "Nam" ? "male" : "female");
    const narratorGender = selectedNarrator.gender;
    const narratorVoice = selectedNarrator.id;
    const selectedScenes = orderedScenes.filter((item) => selectedSceneIds.includes(item.id));
    if (settings.voiceover && selectedScenes.some((selected) => {
      const source = sourceJob.analysis?.scenes?.find((item) => item.id === selected.id)
        || sourceJob.analysis?.scenes?.find((item) => item.id === selected.id.replace(/-part-\d+$/, ""));
      return !String(source?.voiceover || source?.translation || "").trim();
    })) {
      setProjectMessage("Một hoặc nhiều scene chưa có lời đọc theo ngữ cảnh. Hãy bấm Phân tích lại với provider AI trước khi render.");
      return;
    }
    selectedScenes.forEach((selected, index) => {
      const timelineClip = timelineEdits.find((clip) => clip.sceneId === selected.id);
      const sourceScene = sourceJob.analysis?.scenes?.find((item) => item.id === selected.id)
        || sourceJob.analysis?.scenes?.find((item) => item.id === selected.id.replace(/-part-\d+$/, ""))
        || sourceJob.analysis?.scenes?.[editorScenes.findIndex((item) => item.id === selected.id)];
      const clipStart = timelineClip?.trimIn ?? toSeconds(selected.start);
      const clipEnd = timelineClip?.trimOut ?? toSeconds(selected.end);
      const sourceStart = sourceScene ? toSeconds(sourceScene.start) : clipStart;
      const sourceEnd = sourceScene ? toSeconds(sourceScene.end || selected.end) : clipEnd;
      const sourceScript = sourceScene?.voiceover || sourceScene?.translation;
      if (settings.voiceover && !sourceScript?.trim()) {
        setProjectMessage(`Scene "${selected.title}" chưa có lời đọc theo ngữ cảnh. Hãy bấm Phân tích lại với provider AI trước khi render.`);
        return;
      }
      const clipScript = narrationForClip(sourceScript, sourceStart, sourceEnd, clipStart, clipEnd);
      onAddJob({
        ...sourceJob,
        sourceOnly: false,
        // A scene selected from an existing scene map is already bounded. Do
        // not fan it out again in the queue worker (which would create nested
        // scene jobs instead of rendering this exact clip).
        splitScenes: false,
        analysisOnly: false,
        id: `job-editor-${Date.now()}-${index}`,
        parentJobId: sourceJob.id,
        sceneId: selected.id,
        name: `${sourceJob.name} · ${selected.title}`,
        source: sourceJob.source,
        localPath: sourceJob.localPath,
        sourcePaths: undefined,
        mode: sourceJob.mode,
        clipStartSeconds: clipStart,
        clipEndSeconds: clipEnd,
        aspectRatio,
        narratorEnabled: settings.voiceover,
        narratorVoice,
        narratorGender,
        languages: [language],
        keepOriginalAudio: settings.bilingual,
        emphasizeHook: settings.hook,
        backgroundMusic: settings.music,
        subtitlesEnabled: settings.subtitles,
        // Narration must never fall back to a visual label/detail in the
        // source language. Subtitle-only jobs may still show that detail.
        subtitleText: clipScript || (settings.voiceover ? undefined : selected.detail),
        analysis: sourceJob.analysis,
        status: "queued",
        stage: "queued",
        progress: 0,
        error: undefined,
        outputPath: undefined,
        outputFileName: `${String(sourceJob.name || "video").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "video"}-scene-${String(index + 1).padStart(2, "0")}`,
        createdAt: "Vừa tạo",
        synced: false,
      });
    });
    setProjectMessage(`Đã cắt và đưa ${selectedSceneIds.length} cảnh vào queue (${fields.language}, ${settings.voiceover ? "voice-over theo từng cảnh" : "không voice-over"}). Mở Render & xuất bản để theo dõi từng file.`);
  };
  const createProjectJob = () => {
    if (selectedProjectSources.length < 2) {
      setProjectMessage("Chọn tối thiểu 2 video local để ghép thành một dự án.");
      return;
    }
    const sourcePaths = selectedProjectSources.map((item) => item.localPath).filter((value): value is string => Boolean(value));
    if (sourcePaths.length < 2) {
      setProjectMessage("Một hoặc nhiều video chưa sẵn sàng trên máy. Hãy tải/phân tích source trước.");
      return;
    }
    const first = selectedProjectSources[0];
    const id = `job-project-${Date.now()}`;
    const language = selectedLanguage;
    const narrator = availableNarrators.find((voice) => voice.label === fields.narrator) || defaultVoice(language, fields.gender === "Nam" ? "male" : "female");
    onAddJob({
      id,
      name: `Dự án ghép · ${selectedProjectSources.length} video`,
      source: selectedProjectSources.map((item) => item.name).join(" + "),
      sourceType: "file",
      sourcePaths,
      mode: first.mode,
      providerId: first.providerId,
      aspectRatio,
      splitScenes: true,
      narratorEnabled: settings.voiceover,
      narratorVoice: narrator.id,
      narratorGender: narrator.gender,
      languages: [language],
      keepOriginalAudio: settings.bilingual,
      emphasizeHook: settings.hook,
      backgroundMusic: settings.music,
      subtitlesEnabled: settings.subtitles,
      status: "queued",
      stage: "queued",
      progress: 0,
      createdAt: "Vừa tạo",
      synced: false,
    });
    setSelectedSourceId(id);
    setProjectMessage(`Đã đưa ${sourcePaths.length} video vào queue để ghép, phân tích và mở trên timeline.`);
  };
  useEffect(() => { setPlayheadSeconds(sceneStart); setPlaying(false); }, [sceneStart]);
  const togglePlayback = () => {
    if (playheadSeconds >= sceneEnd - 0.05) setPlayheadSeconds(sceneStart);
    setPlaying((value) => !value);
  };
  const copyLink = () => {
    const value = sourceJob?.localPath || sourceJob?.source;
    if (!value) return;
    void getRuntime().copyText(value).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    }).catch(() => undefined);
  };
  const projectInitials = (sourceJob?.name || "--").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return <div className="editor-page page-enter">
    <header className="editor-projectbar"><div className="editor-project-title"><button className="editor-icon-button" title="Quay lại workspace" onClick={() => onNavigate("batch")}><Icon name="arrow" size={16} /></button><div><span className="editor-kicker">DỰ ÁN / NARRATOR STUDIO</span><h1>{sourceJob?.name || "Chọn video để dựng"} <span className="editor-status"><i /> {sourceJob?.analysis ? "Scene map sẵn sàng" : "Chờ phân tích"}</span></h1></div></div><div className="editor-project-actions"><span className="editor-sync"><i /> Dữ liệu trên thiết bị</span><button className="editor-outline-action" onClick={() => onNavigate("render")}><Icon name="download" size={15} /> Mở output</button><button className="editor-primary-action" onClick={createSceneJob} disabled={!canCreateJob} title={canCreateJob ? "Cắt và xuất các cảnh đang chọn thành từng file" : "Chọn ít nhất một scene thật để render"}><Icon name="scissors" size={15} /> Cắt & xuất {selectedSceneIds.length || ""} cảnh</button></div></header>
    <div className="editor-layout">
      <aside className="editor-inspector">
        <div className="inspector-heading"><div><span className="editor-kicker">PROJECT</span><h2>Dự án</h2></div></div>
        <div className="project-card"><div className="project-thumb"><span>{projectInitials || "--"}</span><i /></div><div><strong title={sourceJob?.name}>{sourceJob?.name || "Chưa chọn source"}</strong><small title={sourceJob?.source}>{sourceJob?.source || "Mở Nguồn video để nạp file"}</small></div></div>
        {projectOptions.length > 0 && <label className="editor-source-picker"><span>PROJECT SOURCE</span><select aria-label="Chọn project source" value={sourceJob?.id || ""} onChange={(event) => setSelectedSourceId(event.target.value)}>{projectOptions.map((job) => <option value={job.id} key={job.id}>{job.name}{job.analysis?.scenes?.length ? ` · ${job.analysis.scenes.length} scenes` : ""}</option>)}</select><Icon name="chevron" size={13} /></label>}
        <div className="project-facts"><span><Icon name="timeline" size={13} /> {editorScenes.length} scene</span><span><Icon name="layers" size={13} /> {projectJobs.length} job</span></div>
        {sourceOptions.length > 1 && <div className="project-list" aria-label="Danh sách dự án">{sourceOptions.map((job) => <button type="button" key={job.id} className={`project-list-item ${sourceJob?.id === job.id ? "active" : ""}`} onClick={() => setSelectedSourceId(job.id)}><span className="project-list-icon"><Icon name={job.sourcePaths?.length ? "layers" : "video"} size={13} /></span><span><strong>{job.name}</strong><small>{job.analysis?.scenes?.length ? `${job.analysis.scenes.length} scene · ${job.durationSeconds ? `${Math.ceil(job.durationSeconds)}s` : "đã phân tích"}` : job.status === "running" ? "Đang xử lý" : "Chưa phân tích"}</small></span></button>)}</div>}
        <button className="share-link" type="button" onClick={copyLink} disabled={!sourceJob}><Icon name="link" size={14} /><span>{copied ? "Đã sao chép đường dẫn source" : "Sao chép đường dẫn source"}</span><Icon name="arrow" size={13} /></button>
        <div className="inspector-divider" /><div className="inspector-heading compact"><div><span className="editor-kicker">SETTINGS</span><h2>Cài đặt</h2></div><Icon name="sliders" size={16} /></div>
        <div className="inspector-fields"><SelectField label="NARRATOR" value={fields.narrator} options={availableNarrators.map((voice) => voice.label)} onChange={setField("narrator")} /><SelectField label="NGÔN NGỮ" value={fields.language} options={selectOptions.language} onChange={setLanguage} /><div className="field-pair"><SelectField label="GIỌNG" value={fields.gender} options={selectOptions.gender} onChange={setGender} /><SelectField label="TONE" value={fields.tone} options={selectOptions.tone} onChange={setField("tone")} /></div><SelectField label="THỜI LƯỢNG" value={fields.duration} options={selectOptions.duration} onChange={setField("duration")} /></div>
        <div className="inspector-toggles"><div><span><Icon name="mic" size={14} /> Giọng đọc theo cảnh</span><Toggle active={settings.voiceover} onClick={() => toggleSetting("voiceover")} /></div><div><span><Icon name="captions" size={14} /> Phụ đề theo lời đọc</span><Toggle active={settings.subtitles} onClick={() => toggleSetting("subtitles")} /></div><div><span><Icon name="volume" size={14} /> Giữ tiếng gốc</span><Toggle active={settings.bilingual} onClick={() => toggleSetting("bilingual")} /></div><div><span><Icon name="spark" size={14} /> Nhấn hook / cao trào</span><Toggle active={settings.hook} onClick={() => toggleSetting("hook")} /></div><div><span><Icon name="music" size={14} /> Nhạc nền phù hợp</span><Toggle active={settings.music} onClick={() => toggleSetting("music")} /></div></div>
        <div className="inspector-divider" /><div className="inspector-heading compact"><div><span className="editor-kicker">OUTPUT</span><h2>Tỷ lệ khung hình</h2></div></div><div className="ratio-picker"><button type="button" className={`ratio-option ${aspectRatio === "9:16" ? "active" : ""}`} onClick={() => setAspectRatio("9:16")}><span className="ratio-nine" />9:16</button><button type="button" className={`ratio-option ${aspectRatio === "1:1" ? "active" : ""}`} onClick={() => setAspectRatio("1:1")}><span className="ratio-one" />1:1</button><button type="button" className={`ratio-option ${aspectRatio === "16:9" ? "active" : ""}`} onClick={() => setAspectRatio("16:9")}><span className="ratio-sixteen" />16:9</button></div>
        <button type="button" className="editor-save-settings" onClick={applyProjectSettings} disabled={!sourceJob}><Icon name="check" size={14} /> Áp dụng cho timeline</button>
        <div className="inspector-footer"><div><span>RENDER ENGINE</span><strong><i /> {sourceJob?.mode || "Local engine"}</strong></div><div><span>ACTIVE JOBS</span><strong>{activeJobs.toString().padStart(2, "0")} trong queue</strong></div></div>
      </aside>
      <section className="editor-main">
        <div className="editor-toolbar">
          <div className="toolbar-tabs">
            <button type="button" className="editor-tab active"><Icon name="video" size={13} /> Biên tập</button>
            <button type="button" className="editor-tab" onClick={() => onNavigate("analysis")}><Icon name="scan" size={13} /> Phân tích AI</button>
            <button type="button" className="editor-tab" onClick={() => onNavigate("batch")}><Icon name="layers" size={13} /> Batch queue</button>
          </div>
          <div className="toolbar-actions">
            <span className="editor-timecode">{scene.start} / {scene.end}</span>
            <button type="button" className="editor-icon-button" title={muted ? "Bật âm lượng" : "Tắt âm lượng"} onClick={() => setMuted((value) => !value)}><Icon name="volume" size={16} /></button>
            <button type="button" className="editor-icon-button" title="Toàn màn hình" onClick={() => void document.querySelector(".editor-page")?.requestFullscreen?.()}><Icon name="maximize" size={16} /></button>
          </div>
        </div>
        {projectSourceOptions.length > 1 && (
          <section className="editor-multi-source" aria-label="Chọn nhiều video cho dự án">
            <div className="editor-multi-source-head"><div><span className="editor-kicker">PROJECT SOURCES</span><strong>Ghép nhiều video</strong></div><span>{selectedProjectSources.length}/{projectSourceOptions.length}</span></div>
            <div className="editor-multi-source-list">{projectSourceOptions.map((job) => <label key={job.id} className="editor-multi-source-item"><input type="checkbox" checked={projectSourceIds.includes(job.id)} onChange={() => setProjectSourceIds((current) => current.includes(job.id) ? current.filter((id) => id !== job.id) : [...current, job.id])} /><span><strong>{job.name}</strong><small>{job.analysis?.scenes?.length ? `${job.analysis.scenes.length} scenes` : "Chưa phân tích"}</small></span></label>)}</div>
            <button type="button" className="editor-outline-action editor-merge-action" onClick={createProjectJob} disabled={selectedProjectSources.length < 2}><Icon name="layers" size={14} /> Ghép & phân tích {selectedProjectSources.length || "nhiều"} video</button>
          </section>
        )}
        {projectMessage && <p className="editor-inline-message">{projectMessage}</p>}
        {sourceJob?.stage === "timeline_review" && sourceJob.analysis?.sceneMatches?.length && <section className="editor-multi-source" aria-label="Duyệt scene match">
          <div className="editor-multi-source-head"><div><span className="editor-kicker">TIMELINE REVIEW</span><strong>Duyệt cảnh theo lời đọc</strong></div><span>{sourceJob.analysis?.sceneMatches?.filter((match) => match.needsReview).length || 0} cần duyệt</span></div>
          <p className="form-help">Chọn cảnh thay thế nếu cần. Các cảnh đã xác nhận sẽ giữ mốc thời gian trong timeline.</p>
          <div className="editor-multi-source-list">{sourceJob.analysis?.sceneMatches?.map((match, index) => match.needsReview && <label key={`${match.voiceSegmentId}-${index}`} className="editor-multi-source-item"><span><strong>Lời đọc {index + 1} · {Math.round(match.matchScore * 100)}%</strong><small>{match.reason || "Khớp cảnh cần xác nhận"}</small></span><select aria-label={`Chọn cảnh cho lời đọc ${index + 1}`} value={match.sceneId} onChange={(event) => selectMatchCandidate(index, event.target.value)}>{sourceJob.analysis?.scenes.map((item, sceneIndex) => { const id = item.id || `scene-${sceneIndex + 1}`; return <option key={id} value={id}>{item.start} · {item.title}</option>; })}</select></label>)}</div>
          <button type="button" className="editor-primary-action" onClick={approveTimelineReview} disabled={hasUnreviewedSceneMatches(sourceJob.analysis?.sceneMatches)}><Icon name="check" size={14} /> Xác nhận timeline & tiếp tục render</button>
        </section>}
        {!editorScenes.length ? (
          <div className="editor-empty">
            <span className="empty-module-icon"><Icon name="scan" size={22} /></span>
            <h3>{sourceJob?.sourcePaths?.length && !sourceJob.localPath ? "Đang chuẩn bị dự án ghép" : "Chưa có scene map"}</h3>
            <p>{sourceJob?.sourcePaths?.length && !sourceJob.localPath ? "Video đang được ghép bằng FFmpeg trong queue. Khi hoàn tất, scene map và timeline sẽ được tạo tự động." : "Chạy phân tích AI trên video gốc để tạo cảnh thật, transcript và lời kể trước khi dựng timeline."}</p>
            <button className="editor-outline-action" onClick={() => onNavigate("analysis")}><Icon name="scan" size={14} /> Mở phân tích AI</button>
          </div>
        ) : <>
          <div className="preview-grid">
            <Preview label="ORIGINAL VIDEO" scene={scene} mediaUrl={mediaUrl} muted={muted} playing={playing} syncSeconds={playheadSeconds} aspectRatio="16:9" subtitleEnabled={settings.subtitles} onTimeUpdate={setPlayheadSeconds} onPlayingChange={setPlaying} />
            <Preview label="AUTO-REFRAME PREVIEW" scene={scene} reframed mediaUrl={mediaUrl} muted={muted} playing={playing} syncSeconds={playheadSeconds} aspectRatio={aspectRatio} subtitleEnabled={settings.subtitles} onPlayingChange={setPlaying} />
          </div>
          <div className="transport">
            <button type="button" className="transport-button" title="Cảnh trước" onClick={() => selectScene(editorScenes[Math.max(0, editorScenes.findIndex((item) => item.id === activeSceneId) - 1)]?.id || activeSceneId)}><Icon name="undo" size={15} /></button>
            <button type="button" className="transport-play" onClick={togglePlayback}><Icon name={playing ? "pause" : "play"} size={16} /></button>
            <button type="button" className="transport-button" title="Cảnh tiếp theo" onClick={() => selectScene(editorScenes[Math.min(editorScenes.length - 1, editorScenes.findIndex((item) => item.id === activeSceneId) + 1)]?.id || activeSceneId)}><Icon name="redo" size={15} /></button>
            <span className="transport-time">{scene.start} <i>/</i> {scene.end}</span>
            <div className="transport-progress"><i style={{ width: `${Math.max(1, sceneProgress)}%` }} /></div>
            <span className="transport-percent">{Math.round(sceneProgress)}%</span>
          </div>
          <div className="timeline-panel">
            <div className="timeline-heading">
              <div><span className="editor-kicker">TIMELINE</span><strong>Scene map · {editorScenes.length} scenes · {Math.ceil(timelineDuration)}s</strong></div>
              <div className="timeline-actions"><button type="button" className="editor-icon-button" title="Hoàn tác" onClick={undoTimeline} disabled={!timelineHistory.current?.canUndo}><Icon name="undo" size={15} /></button><button type="button" className="editor-icon-button" title="Làm lại" onClick={redoTimeline} disabled={!timelineHistory.current?.canRedo}><Icon name="redo" size={15} /></button><button type="button" className="editor-icon-button" title="Cảnh trước" onClick={() => moveScene(activeSceneId, -1)}><Icon name="chevron-left" size={15} /></button><button type="button" className="editor-icon-button" title="Cảnh sau" onClick={() => moveScene(activeSceneId, 1)}><Icon name="chevron-right" size={15} /></button><button type="button" className="editor-icon-button" title="Đặt lại cảnh đầu" onClick={() => selectScene(editorScenes[0]?.id || activeSceneId)}><Icon name="refresh" size={15} /></button></div>
            </div>
            <div className="timeline-edit-tools"><span className="editor-kicker">EDIT CLIP · {scene.title}</span><label>Từ <input type="number" min="0" step="0.1" value={trimDraft.in} onChange={(event) => setTrimDraft((current) => ({ ...current, in: Number(event.target.value) }))} /></label><label>Đến <input type="number" min="0.1" step="0.1" value={trimDraft.out} onChange={(event) => setTrimDraft((current) => ({ ...current, out: Number(event.target.value) }))} /></label><button type="button" className="editor-text-action" onClick={applyTrim}>Cắt</button><button type="button" className="editor-text-action" onClick={splitActiveScene}>Tách đôi</button></div>
            <div className="timeline-selection"><div><span className="editor-kicker">CHỌN CẢNH</span><strong>{selectedSceneIds.length}/{editorScenes.length} cảnh vào queue</strong></div><div className="timeline-selection-actions"><button type="button" className="editor-text-action" onClick={selectAllScenes}>Chọn tất cả</button><button type="button" className="editor-text-action" onClick={clearSceneSelection} disabled={!selectedSceneIds.length}>Bỏ chọn</button><button type="button" className="editor-primary-action" onClick={createSceneJob} disabled={!canCreateJob}><Icon name="scissors" size={14} /> Cắt & xuất {selectedSceneIds.length} cảnh</button></div></div>
            <div className="scene-selection-grid">{editorScenes.map((item, index) => <button type="button" key={item.id} className={`scene-selection-chip ${selectedSceneIds.includes(item.id) ? "selected" : ""} ${activeSceneId === item.id ? "active" : ""}`} onClick={() => inspectAndToggleScene(item.id)}><span className="scene-selection-check">{selectedSceneIds.includes(item.id) && <Icon name="check" size={11} />}</span><span><small>SCENE {index + 1} · {item.start}</small><strong>{item.title}</strong></span></button>)}</div>
            <div className="timeline-ruler">
              <span className="track-label" />
              {Array.from({ length: 7 }, (_, index) => Math.round(timelineDuration * index / 6)).map((seconds, index) => <span key={`${seconds}-${index}`}>{`${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`}</span>)}
            </div>
            <div className="timeline-body">
              {timelineTracks.map((track) => <div className="track-row" key={track.id}>
                <div className="track-label"><Icon name={track.icon as IconName} size={14} /><span>{track.label}</span></div>
                <div className="track-lane" onDragOver={(event) => { if (track.id === "video") event.preventDefault(); }}>
                  {track.clips.map((clip, index) => <button type="button" draggable={track.id === "video"} key={`${track.id}-${clip.sceneId}-${index}`} className={`timeline-clip clip-${track.id} ${clip.sceneId === activeSceneId ? "selected" : ""} ${selectedSceneIds.includes(clip.sceneId) ? "queued" : ""}`} style={{ left: `${clip.left}%`, width: `${clip.width}%`, borderColor: track.color }} onDragStart={(event) => { if (track.id !== "video") return; event.dataTransfer.setData("text/scene-id", clip.sceneId); setDraggedSceneId(clip.sceneId); }} onDragOver={(event) => { if (track.id === "video") event.preventDefault(); }} onDrop={(event) => { if (track.id !== "video") return; event.preventDefault(); const fromId = event.dataTransfer.getData("text/scene-id") || draggedSceneId; if (fromId) reorderScene(fromId, clip.sceneId); setDraggedSceneId(null); }} onDragEnd={() => setDraggedSceneId(null)} onClick={() => track.id === "video" ? inspectAndToggleScene(clip.sceneId) : selectScene(clip.sceneId)} title={`Mở ${clip.label}; ${track.id === "video" ? "bấm để chọn/bỏ chọn cảnh, kéo để đổi thứ tự" : "mở cảnh"}`}>
                    <span>{clip.label}</span>{track.id !== "subtitle" && <Waveform color={track.color} />}
                  </button>)}
                </div>
              </div>)}
              <div className="playhead" style={{ left: `${Math.min(100, Math.max(0, playheadSeconds / timelineDuration * 100))}%` }}><span /></div>
            </div>
          </div>
          <footer className="editor-footerbar">
            <div className="scene-summary"><span className={`scene-dot ${scene.accent}`} /><div><strong>{scene.title}</strong><small>{scene.start} — {scene.end} · {scene.detail}</small></div></div>
            <div className="editor-footer-actions"><button className="editor-outline-action" onClick={() => onNavigate("analysis")}><Icon name="scan" size={15} /> Phân tích lại</button><button className="editor-primary-action" onClick={createSceneJob} disabled={!canCreateJob} title={canCreateJob ? "Cắt và xuất các scene đã chọn thành từng file" : "Chọn ít nhất một scene thật"}><Icon name="scissors" size={15} /> Cắt & xuất {selectedSceneIds.length} cảnh</button></div>
          </footer>
        </>}
      </section>
    </div>
  </div>;
}
