import type { Job } from "../../../core/types";
import type { EditorScene } from "../editor.types";
import { FILTER_PRESETS, MASK_PRESETS } from "../constants/presets";
import { formatSeconds, formatTimecodePrecise, toSeconds } from "../utils/editorTime";

export interface EditorInspectorProps {
  activeScene: EditorScene;
  activeSceneId: string;
  editorScenes: EditorScene[];
  setScenesWithHistory: (scenes: EditorScene[]) => void;
  inspectorTab: "basic" | "mask" | "filters" | "animation" | "script";
  setInspectorTab: (tab: "basic" | "mask" | "filters" | "animation" | "script") => void;
  playheadSeconds: number;
  scaleVal: number;
  setScaleVal: (v: number) => void;
  posX: number;
  setPosX: (v: number) => void;
  posY: number;
  setPosY: (v: number) => void;
  rotationVal: number;
  setRotationVal: (v: number) => void;
  opacityVal: number;
  setOpacityVal: (v: number) => void;
  speedVal: number;
  setSpeedVal: (v: number) => void;
  selectedMask: string;
  setSelectedMask: (m: string) => void;
  selectedFilter: string;
  setSelectedFilter: (f: string) => void;
  inAnimation: "none" | "fade" | "zoom" | "slide" | "bounce";
  setInAnimation: (a: "none" | "fade" | "zoom" | "slide" | "bounce") => void;
  outAnimation: "none" | "fade" | "zoom" | "slide";
  setOutAnimation: (a: "none" | "fade" | "zoom" | "slide") => void;
  speakingSceneId: string | null;
  playSceneAudio: (text?: string, scId?: string, offsetSeconds?: number) => void;
  stopSceneAudio: () => void;
  voiceSpeed: number;
  sourceJob?: Job;
  onUpdateJob?: (jobId: string, values: Partial<Job>) => void;
  setProjectMessage: (msg: string) => void;
}

export function EditorInspector({
  activeScene,
  activeSceneId,
  editorScenes,
  setScenesWithHistory,
  inspectorTab,
  setInspectorTab,
  playheadSeconds,
  scaleVal,
  setScaleVal,
  posX,
  setPosX,
  posY,
  setPosY,
  rotationVal,
  setRotationVal,
  opacityVal,
  setOpacityVal,
  speedVal,
  setSpeedVal,
  selectedMask,
  setSelectedMask,
  selectedFilter,
  setSelectedFilter,
  inAnimation,
  setInAnimation,
  outAnimation,
  setOutAnimation,
  speakingSceneId,
  playSceneAudio,
  stopSceneAudio,
  voiceSpeed,
  sourceJob,
  onUpdateJob,
  setProjectMessage,
}: EditorInspectorProps) {
  return (
    <aside className="ts-inspector-panel">
      <div className="ts-inspector-header">
        <strong>Thuộc tính & Khẩu hình</strong>
        <span className="ts-inspector-meta">{activeScene.start} - {activeScene.end}</span>
      </div>

      {/* Inspector Tabs */}
      <div className="ts-inspector-tabs">
        <button
          type="button"
          className={`ts-insp-tab ${inspectorTab === "basic" ? "is-active" : ""}`}
          onClick={() => setInspectorTab("basic")}
        >
          Basic
        </button>
        <button
          type="button"
          className={`ts-insp-tab ${inspectorTab === "mask" ? "is-active" : ""}`}
          onClick={() => setInspectorTab("mask")}
        >
          Mask
        </button>
        <button
          type="button"
          className={`ts-insp-tab ${inspectorTab === "filters" ? "is-active" : ""}`}
          onClick={() => setInspectorTab("filters")}
        >
          Filters
        </button>
        <button
          type="button"
          className={`ts-insp-tab ${inspectorTab === "animation" ? "is-active" : ""}`}
          onClick={() => setInspectorTab("animation")}
        >
          Animation
        </button>
        <button
          type="button"
          className={`ts-insp-tab ${inspectorTab === "script" ? "is-active" : ""}`}
          onClick={() => setInspectorTab("script")}
        >
          Lời thoại
        </button>
      </div>

      <div className="ts-inspector-body">
        {/* TAB: BASIC TRANSFORM & KEYFRAMES */}
        {inspectorTab === "basic" && (
          <>
            {/* Keyframes Section */}
            <div className="ts-keyframes-section">
              <div className="ts-keyframes-title-row">
                <span className="ts-keyframe-diamond-active">◆ Keyframes (Điểm neo)</span>
                <small>{formatTimecodePrecise(playheadSeconds)}</small>
              </div>
              <button
                type="button"
                className="ts-keyframe-add-btn"
                onClick={() => {
                  setProjectMessage("◆ Đã gán keyframe tại vị trí con trỏ hiện tại!");
                  setTimeout(() => setProjectMessage(""), 2000);
                }}
              >
                ◆ Add all keyframes
              </button>
            </div>

            {/* Sliders Grid */}
            <div className="ts-sliders-list">
              <div className="ts-slider-row">
                <span className="ts-slider-label">Scale</span>
                <div className="ts-slider-track-wrap">
                  <input
                    type="range"
                    min="50"
                    max="200"
                    value={scaleVal}
                    onChange={(e) => setScaleVal(Number(e.target.value))}
                  />
                </div>
                <span className="ts-slider-val">{scaleVal}%</span>
                <span className="ts-slider-diamond" onClick={() => setScaleVal(100)} title="Đặt lại về 100%">◇</span>
              </div>

              <div className="ts-slider-row">
                <span className="ts-slider-label">Position X</span>
                <div className="ts-slider-track-wrap">
                  <input
                    type="range"
                    min="-150"
                    max="150"
                    value={posX}
                    onChange={(e) => setPosX(Number(e.target.value))}
                  />
                </div>
                <span className="ts-slider-val">{posX}%</span>
                <span className="ts-slider-diamond" onClick={() => setPosX(0)} title="Đặt lại về 0">◇</span>
              </div>

              <div className="ts-slider-row">
                <span className="ts-slider-label">Position Y</span>
                <div className="ts-slider-track-wrap">
                  <input
                    type="range"
                    min="-150"
                    max="150"
                    value={posY}
                    onChange={(e) => setPosY(Number(e.target.value))}
                  />
                </div>
                <span className="ts-slider-val">{posY}%</span>
                <span className="ts-slider-diamond" onClick={() => setPosY(0)} title="Đặt lại về 0">◇</span>
              </div>

              <div className="ts-slider-row">
                <span className="ts-slider-label">Rotation</span>
                <div className="ts-slider-track-wrap">
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    value={rotationVal}
                    onChange={(e) => setRotationVal(Number(e.target.value))}
                  />
                </div>
                <span className="ts-slider-val">{rotationVal}°</span>
                <span className="ts-slider-diamond" onClick={() => setRotationVal(0)} title="Đặt lại về 0">◇</span>
              </div>

              <div className="ts-slider-row">
                <span className="ts-slider-label">Opacity</span>
                <div className="ts-slider-track-wrap">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={opacityVal}
                    onChange={(e) => setOpacityVal(Number(e.target.value))}
                  />
                </div>
                <span className="ts-slider-val">{opacityVal}%</span>
                <span className="ts-slider-diamond" onClick={() => setOpacityVal(100)} title="Đặt lại về 100%">◇</span>
              </div>

              <div className="ts-slider-row">
                <span className="ts-slider-label">Speed</span>
                <div className="ts-slider-track-wrap">
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={speedVal}
                    onChange={(e) => setSpeedVal(Number(e.target.value))}
                  />
                </div>
                <span className="ts-slider-val">{speedVal}x</span>
                <span className="ts-slider-diamond" onClick={() => setSpeedVal(1.0)} title="Đặt lại về 1.0x">◇</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "6px" }}>
                <button
                  type="button"
                  className="ts-chip-btn"
                  onClick={() => setInspectorTab("script")}
                  style={{ color: "#38bdf8", borderColor: "rgba(56, 189, 248, 0.3)" }}
                >
                  ✏️ Chỉnh Lời Thoại
                </button>
                <button
                  type="button"
                  className="ts-chip-btn"
                  onClick={() => {
                    setScaleVal(100);
                    setPosX(0);
                    setPosY(0);
                    setRotationVal(0);
                    setOpacityVal(100);
                    setSpeedVal(1.0);
                    setProjectMessage("✓ Đã đặt lại tất cả thông số về mặc định");
                    setTimeout(() => setProjectMessage(""), 1500);
                  }}
                >
                  🔄 Reset tất cả
                </button>
              </div>
            </div>

            {/* Active Scene Quick Summary Card */}
            <div className="ts-scene-quick-badge">
              <div className="ts-quick-badge-title">
                <span className="ts-quick-badge-icon">🎬</span>
                <strong className="ts-quick-name">{activeScene.title}</strong>
              </div>
              <p className="ts-quick-dialogue">
                {activeScene.subtitle ? `"${activeScene.subtitle}"` : "(Chưa có lời thoại lồng tiếng)"}
              </p>
            </div>
          </>
        )}

        {/* TAB: MASK */}
        {inspectorTab === "mask" && (
          <div className="ts-mask-tab-content">
            <span className="ts-drawer-section-title">Chọn Mask Khung Video:</span>
            <div className="ts-mask-options-grid">
              {MASK_PRESETS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`ts-pill-btn ${selectedMask === m.id ? "is-active" : ""}`}
                  onClick={() => setSelectedMask(m.id)}
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* TAB: FILTERS */}
        {inspectorTab === "filters" && (
          <div className="ts-filter-tab-content">
            <span className="ts-drawer-section-title">Chọn Filter Màu Sắc Video:</span>
            <div className="ts-filter-options-grid">
              {FILTER_PRESETS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`ts-pill-btn ${selectedFilter === f.id ? "is-active" : ""}`}
                  onClick={() => setSelectedFilter(f.id)}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* TAB: ANIMATION */}
        {inspectorTab === "animation" && (
          <div className="ts-animation-tab-content">
            <span className="ts-drawer-section-title">Hiệu ứng vào (In Animation):</span>
            <div className="ts-anim-buttons-row">
              <button
                type="button"
                className={`ts-pill-btn ${inAnimation === "none" ? "is-active" : ""}`}
                onClick={() => setInAnimation("none")}
              >
                None
              </button>
              <button
                type="button"
                className={`ts-pill-btn ${inAnimation === "fade" ? "is-active" : ""}`}
                onClick={() => setInAnimation("fade")}
              >
                Fade In
              </button>
              <button
                type="button"
                className={`ts-pill-btn ${inAnimation === "zoom" ? "is-active" : ""}`}
                onClick={() => setInAnimation("zoom")}
              >
                Zoom In
              </button>
              <button
                type="button"
                className={`ts-pill-btn ${inAnimation === "slide" ? "is-active" : ""}`}
                onClick={() => setInAnimation("slide")}
              >
                Slide In
              </button>
            </div>

            <span className="ts-drawer-section-title" style={{ marginTop: "12px", display: "block" }}>
              Hiệu ứng ra (Out Animation):
            </span>
            <div className="ts-anim-buttons-row">
              <button
                type="button"
                className={`ts-pill-btn ${outAnimation === "none" ? "is-active" : ""}`}
                onClick={() => setOutAnimation("none")}
              >
                None
              </button>
              <button
                type="button"
                className={`ts-pill-btn ${outAnimation === "fade" ? "is-active" : ""}`}
                onClick={() => setOutAnimation("fade")}
              >
                Fade Out
              </button>
              <button
                type="button"
                className={`ts-pill-btn ${outAnimation === "zoom" ? "is-active" : ""}`}
                onClick={() => setOutAnimation("zoom")}
              >
                Zoom Out
              </button>
            </div>
          </div>
        )}

        {/* TAB: SCRIPT & VOICE SYNTHESIZER */}
        {inspectorTab === "script" && (
          <div className="ts-scene-editor-box">
            <div className="ts-scene-editor-topline">
              <input
                type="text"
                value={activeScene.title}
                onChange={(e) => {
                  const updated = editorScenes.map((s) => (s.id === activeSceneId ? { ...s, title: e.target.value } : s));
                  setScenesWithHistory(updated);
                }}
                className="ts-scene-title-edit"
              />
              <button
                type="button"
                className="ts-voice-test-btn"
                onClick={() =>
                  speakingSceneId === activeScene.id
                    ? stopSceneAudio()
                    : playSceneAudio(activeScene.subtitle, activeScene.id)
                }
              >
                {speakingSceneId === activeScene.id ? "⏹️ Dừng" : "🔊 Nghe thử TTS"}
              </button>
            </div>

            <div className="ts-scene-time-row">
              <span>Bắt đầu:</span>
              <input
                type="text"
                value={activeScene.start}
                onChange={(e) => {
                  const updated = editorScenes.map((s) => (s.id === activeSceneId ? { ...s, start: e.target.value } : s));
                  setScenesWithHistory(updated);
                }}
                className="ts-scene-time-input"
              />
              <span>Kết thúc:</span>
              <input
                type="text"
                value={activeScene.end}
                onChange={(e) => {
                  const updated = editorScenes.map((s) => (s.id === activeSceneId ? { ...s, end: e.target.value } : s));
                  setScenesWithHistory(updated);
                }}
                className="ts-scene-time-input"
              />
            </div>

            <textarea
              rows={4}
              value={activeScene.subtitle || ""}
              onChange={(e) => {
                const newText = e.target.value;
                const wordCount = newText.split(/\s+/).filter(Boolean).length;
                const speed = voiceSpeed > 0 ? voiceSpeed : 1.0;
                const voiceEstSec = Math.max(3.0, Math.round((wordCount / (3.65 * speed)) * 10) / 10);
                const nextScenes = editorScenes.map((s) => {
                  if (s.id !== activeSceneId) return s;
                  const vStart = toSeconds(s.voiceStart || s.start);
                  const vEnd = vStart + voiceEstSec;
                  return {
                    ...s,
                    subtitle: newText,
                    voiceover: newText,
                    translation: newText,
                    voiceEnd: formatSeconds(vEnd, true),
                    captionEnd: formatSeconds(vEnd, true),
                  };
                });
                setScenesWithHistory(nextScenes);
                if (onUpdateJob && sourceJob?.id) {
                  onUpdateJob(sourceJob.id, {
                    analysis: {
                      ...(sourceJob.analysis || {}),
                      summary: sourceJob.analysis?.summary || `Kịch bản phân cảnh (${nextScenes.length} cảnh)`,
                      score: sourceJob.analysis?.score ?? 9.5,
                      tokensUsed: sourceJob.analysis?.tokensUsed ?? 0,
                      creditsUsed: sourceJob.analysis?.creditsUsed ?? 0,
                      scenes: nextScenes.map((sc) => ({
                        ...sc,
                        voiceover: sc.subtitle || sc.voiceover,
                        translation: sc.subtitle || sc.translation,
                      })) as any,
                    },
                  });
                }
              }}
              placeholder="Nhập lời thoại AI lồng tiếng cho phân cảnh này..."
              className="ts-scene-script-input"
            />

            <div className="ts-scene-script-footer">
              <small>{(activeScene.subtitle || "").length} ký tự</small>
              <button
                type="button"
                className="ts-refine-hook-btn"
                onClick={() => {
                  const polished = `Khám phá ngay: ${activeScene.subtitle || "Điểm nhấn không thể bỏ qua!"}`;
                  const wordCount = polished.split(/\s+/).filter(Boolean).length;
                  const speed = voiceSpeed > 0 ? voiceSpeed : 1.0;
                  const voiceEstSec = Math.max(3.0, Math.round((wordCount / (3.65 * speed)) * 10) / 10);
                  const updated = editorScenes.map((s) => {
                    if (s.id !== activeSceneId) return s;
                    const vStart = toSeconds(s.voiceStart || s.start);
                    const vEnd = vStart + voiceEstSec;
                    return {
                      ...s,
                      subtitle: polished,
                      voiceover: polished,
                      translation: polished,
                      voiceEnd: formatSeconds(vEnd, true),
                      captionEnd: formatSeconds(vEnd, true),
                    };
                  });
                  setScenesWithHistory(updated);
                  if (onUpdateJob && sourceJob?.id) {
                    onUpdateJob(sourceJob.id, {
                      analysis: {
                        ...(sourceJob.analysis || {}),
                        summary: sourceJob.analysis?.summary || `Kịch bản phân cảnh (${updated.length} cảnh)`,
                        score: sourceJob.analysis?.score ?? 9.5,
                        tokensUsed: sourceJob.analysis?.tokensUsed ?? 0,
                        creditsUsed: sourceJob.analysis?.creditsUsed ?? 0,
                        scenes: updated.map((sc) => ({
                          ...sc,
                          voiceover: sc.subtitle || sc.voiceover,
                          translation: sc.subtitle || sc.translation,
                        })) as any,
                      },
                    });
                  }
                  setProjectMessage("✨ AI đã tối ưu câu thoại của cảnh này!");
                  setTimeout(() => setProjectMessage(""), 2000);
                }}
              >
                ✨ AI Tối ưu câu này
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
