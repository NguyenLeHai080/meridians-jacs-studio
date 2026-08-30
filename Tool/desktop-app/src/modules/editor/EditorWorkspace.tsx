import { useMemo, useState } from "react";
import type { Job, NavKey } from "../../core/types";
import { Icon, type IconName } from "../../shared/Icon";
import { EDITOR_SCENES, EDITOR_TRACKS, type EditorScene } from "./editor.types";

type Props = {
  jobs: Job[];
  onNavigate: (key: NavKey) => void;
  onAddJob: (job: Job) => void;
};

const selectOptions = {
  narrator: ["Linh · Nữ miền Nam", "Minh · Nam miền Bắc", "An · Nữ miền Bắc"],
  language: ["Tiếng Việt", "English", "Song ngữ Việt · Anh"],
  gender: ["Nữ", "Nam", "Trung tính"],
  tone: ["Tự nhiên", "Năng lượng", "Điềm tĩnh", "Kịch tính"],
  duration: ["Theo video gốc", "30 giây", "60 giây", "90 giây"],
};

function Toggle({ active, onClick }: { active: boolean; onClick: () => void }) {
  return <button type="button" className={`editor-toggle ${active ? "on" : ""}`} onClick={onClick} aria-pressed={active}><span /></button>;
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <label className="editor-field"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select><Icon name="chevron" size={13} /></label>;
}

function Preview({ label, reframed, scene }: { label: string; reframed?: boolean; scene: EditorScene }) {
  return <div className={`editor-preview ${reframed ? "reframed" : ""}`}><div className="preview-topline"><span>{label}</span><span className="preview-resolution">{reframed ? "9:16 · AUTO" : "4K · SOURCE"}</span></div><div className="preview-art"><div className="preview-grain" /><div className="preview-subject"><span>{reframed ? "JACS / REFRAME" : "ORIGINAL FOOTAGE"}</span><strong>{scene.id === "hook" ? "MAKE IT\nMATTER" : scene.title.toUpperCase()}</strong><small>{scene.start} — {scene.end}</small></div><div className="tracking-box" /></div><div className="preview-meta"><span><i className="preview-live" /> {reframed ? "AI tracking active" : "Camera 01"}</span><span>00:18 / 02:18</span></div></div>;
}

function Waveform({ color }: { color: string }) {
  const bars = useMemo(() => Array.from({ length: 42 }, (_, index) => 18 + ((index * 17) % 29)), []);
  return <span className="waveform" aria-hidden>{bars.map((height, index) => <i key={index} style={{ height: `${height}%`, background: color }} />)}</span>;
}

export function EditorWorkspace({ jobs, onNavigate, onAddJob }: Props) {
  const [sceneId, setSceneId] = useState("hook");
  const [playing, setPlaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [settings, setSettings] = useState({ bilingual: true, hook: true, music: false });
  const [fields, setFields] = useState({ narrator: selectOptions.narrator[0], language: selectOptions.language[0], gender: selectOptions.gender[0], tone: selectOptions.tone[0], duration: selectOptions.duration[0] });
  const scene = EDITOR_SCENES.find((item) => item.id === sceneId) ?? EDITOR_SCENES[0];
  const activeJobs = jobs.filter((job) => job.status === "queued" || job.status === "running").length;
  const setField = (key: keyof typeof fields) => (value: string) => setFields((current) => ({ ...current, [key]: value }));
  const toggleSetting = (key: keyof typeof settings) => setSettings((current) => ({ ...current, [key]: !current[key] }));
  const createSceneJob = () => onAddJob({ id: `job-editor-${Date.now()}`, name: `${scene.title} · narrator cut`, source: "podcast-ep24.mov", mode: "hybrid", status: "queued", progress: 0, createdAt: "Vừa tạo" });
  const copyLink = () => { void navigator.clipboard?.writeText("https://studio.jacs.local/projects/narrator-studio"); setCopied(true); window.setTimeout(() => setCopied(false), 1600); };
  return <div className="editor-page page-enter">
    <header className="editor-projectbar"><div className="editor-project-title"><button className="editor-icon-button" title="Quay lại workspace" onClick={() => onNavigate("batch")}><Icon name="arrow" size={16} /></button><div><span className="editor-kicker">DỰ ÁN / NARRATOR STUDIO</span><h1>Narrator Studio <span className="editor-status"><i /> Đã lưu</span></h1></div></div><div className="editor-project-actions"><span className="editor-sync"><i /> Đồng bộ cloud</span><button className="editor-icon-button" title="Hoàn tác"><Icon name="undo" size={16} /></button><button className="editor-icon-button" title="Làm lại"><Icon name="redo" size={16} /></button><button className="editor-outline-action" onClick={() => onNavigate("render")}><Icon name="download" size={15} /> Xuất bản</button><button className="editor-primary-action" onClick={createSceneJob}><Icon name="spark" size={15} /> Render scene</button></div></header>
    <div className="editor-layout">
      <aside className="editor-inspector">
        <div className="inspector-heading"><div><span className="editor-kicker">PROJECT</span><h2>Dự án</h2></div><button className="editor-more" title="Tuỳ chọn"><Icon name="more" size={17} /></button></div>
        <div className="project-card"><div className="project-thumb"><span>NS</span><i /></div><div><strong>Narrator Studio</strong><small>podcast-ep24.mov</small></div><button className="editor-more" title="Đổi tên"><Icon name="more" size={15} /></button></div>
        <button className="share-link" onClick={copyLink}><Icon name="link" size={14} /><span>{copied ? "Đã sao chép liên kết" : "Chia sẻ liên kết dự án"}</span><Icon name="arrow" size={13} /></button>
        <div className="inspector-divider" /><div className="inspector-heading compact"><div><span className="editor-kicker">SETTINGS</span><h2>Cài đặt</h2></div><Icon name="sliders" size={16} /></div>
        <div className="inspector-fields"><SelectField label="NARRATOR" value={fields.narrator} options={selectOptions.narrator} onChange={setField("narrator")} /><SelectField label="NGÔN NGỮ" value={fields.language} options={selectOptions.language} onChange={setField("language")} /><div className="field-pair"><SelectField label="GIỌNG" value={fields.gender} options={selectOptions.gender} onChange={setField("gender")} /><SelectField label="TONE" value={fields.tone} options={selectOptions.tone} onChange={setField("tone")} /></div><SelectField label="THỜI LƯỢNG" value={fields.duration} options={selectOptions.duration} onChange={setField("duration")} /></div>
        <div className="inspector-toggles"><div><span><Icon name="captions" size={14} /> Bản gốc song ngữ</span><Toggle active={settings.bilingual} onClick={() => toggleSetting("bilingual")} /></div><div><span><Icon name="spark" size={14} /> Tự động tạo hook</span><Toggle active={settings.hook} onClick={() => toggleSetting("hook")} /></div><div><span><Icon name="music" size={14} /> Nhạc nền phù hợp</span><Toggle active={settings.music} onClick={() => toggleSetting("music")} /></div></div>
        <div className="inspector-divider" /><div className="inspector-heading compact"><div><span className="editor-kicker">OUTPUT</span><h2>Tỷ lệ khung hình</h2></div></div><div className="ratio-picker"><button className="ratio-option active"><span className="ratio-nine" />9:16</button><button className="ratio-option"><span className="ratio-one" />1:1</button><button className="ratio-option"><span className="ratio-sixteen" />16:9</button></div>
        <div className="inspector-footer"><div><span>GPU ENGINE</span><strong><i /> Apple VideoToolbox</strong></div><div><span>ACTIVE JOBS</span><strong>{activeJobs.toString().padStart(2, "0")} trong queue</strong></div></div>
      </aside>
      <section className="editor-main"><div className="editor-toolbar"><div className="toolbar-tabs"><button className="active">Biên tập</button><button onClick={() => onNavigate("analysis")}>Phân tích AI</button><button onClick={() => onNavigate("batch")}>Batch queue</button></div><div className="toolbar-actions"><span className="editor-timecode">00:18:04</span><button className="editor-icon-button" title="Âm lượng"><Icon name="volume" size={16} /></button><button className="editor-icon-button" title="Toàn màn hình"><Icon name="maximize" size={16} /></button></div></div><div className="preview-grid"><Preview label="ORIGINAL VIDEO" scene={scene} /><Preview label="AUTO-REFRAME PREVIEW" scene={scene} reframed /></div><div className="transport"><button className="transport-button" title="Về đầu"><Icon name="undo" size={15} /></button><button className="transport-play" onClick={() => setPlaying((value) => !value)}><Icon name={playing ? "pause" : "play"} size={16} /></button><button className="transport-button" title="Tiếp"><Icon name="redo" size={15} /></button><span className="transport-time">00:18 <i>/</i> 02:18</span><div className="transport-progress"><i style={{ width: "14%" }} /></div><span className="transport-percent">14%</span></div><div className="timeline-panel"><div className="timeline-heading"><div><span className="editor-kicker">TIMELINE</span><strong>Scene map · {EDITOR_SCENES.length} scenes</strong></div><div className="timeline-actions"><button className="editor-icon-button" title="Thêm track"><Icon name="plus" size={15} /></button><button className="editor-icon-button" title="Refresh"><Icon name="refresh" size={15} /></button></div></div><div className="timeline-ruler"><span className="track-label" />{["00:00", "00:15", "00:30", "00:45", "01:00", "01:15", "01:30", "01:45", "02:00"].map((mark) => <span key={mark}>{mark}</span>)}</div><div className="timeline-body">{EDITOR_TRACKS.map((track) => <div className="track-row" key={track.id}><div className="track-label"><Icon name={track.icon as IconName} size={14} /><span>{track.label}</span><button title="Tuỳ chọn"><Icon name="more" size={13} /></button></div><div className="track-lane">{track.clips.map((clip, index) => <button key={`${track.id}-${clip.sceneId}-${index}`} className={`timeline-clip clip-${track.id} ${clip.sceneId === sceneId ? "selected" : ""}`} style={{ width: `${clip.width}%`, borderColor: track.color }} onClick={() => setSceneId(clip.sceneId)}><span>{clip.label}</span>{track.id !== "subtitle" && <Waveform color={track.color} />}</button>)}</div></div>)}<div className="playhead" style={{ left: "14%" }}><span /></div></div></div><footer className="editor-footerbar"><div className="scene-summary"><span className={`scene-dot ${scene.accent}`} /><div><strong>{scene.title}</strong><small>{scene.start} — {scene.end} · {scene.detail}</small></div></div><div className="editor-footer-actions"><button className="editor-outline-action" onClick={() => onNavigate("analysis")}><Icon name="scan" size={15} /> Phân tích lại</button><button className="editor-primary-action" onClick={createSceneJob}><Icon name="layers" size={15} /> Tạo job từ scene</button></div></footer></section>
    </div>
  </div>;
}
