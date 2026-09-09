import React from "react";
import type { Job } from "../../../core/types";
import { Icon } from "../../../shared/Icon";
import type { EditorScene } from "../editor.types";
import { formatSeconds, toSeconds } from "../utils/editorTime";

export interface ClipLayoutItem {
  scene: EditorScene;
  index: number;
  visualStartSec: number;
  visualDur: number;
  visualLeft: number;
  visualWidth: number;
  voiceStartSec: number;
  voiceDur: number;
  voiceLeft: number;
  voiceWidth: number;
  captionStartSec: number;
  captionDur: number;
  captionLeft: number;
  captionWidth: number;
}

export interface EditorTimelineProps {
  undoTimeline: () => void;
  redoTimeline: () => void;
  deleteActiveScene: () => void;
  splitActiveScene: () => void;
  addNewSceneSegment: () => void;
  activeScene: EditorScene;
  activeSceneId: string;
  editorScenes: EditorScene[];
  effectiveScenes: EditorScene[];
  setScenesWithHistory: (scenes: EditorScene[]) => void;
  setSceneId: (id: string) => void;
  setProjectMessage: (msg: string) => void;
  playing: boolean;
  setPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  zoomLevel: number;
  setZoomLevel: React.Dispatch<React.SetStateAction<number>>;
  trackMutes: Record<string, boolean>;
  setTrackMutes: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  trackLocks: Record<string, boolean>;
  setTrackLocks: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  timelineViewportRef: React.RefObject<HTMLDivElement>;
  onTimelineMouseDown: (e: React.MouseEvent) => void;
  handleClipContextMenu: (e: React.MouseEvent, sceneId?: string, trackType?: string) => void;
  sequenceDuration: number;
  playheadLineElRef: React.RefObject<HTMLDivElement>;
  playheadSeconds: number;
  clipLayouts: ClipLayoutItem[];
  dragOverSceneIdx: number | null;
  draggedSceneIdx: number | null;
  handleClipSlideStart: (e: React.MouseEvent, sc: EditorScene, trackType: "voice" | "visuals" | "captions") => void;
  handleTrimStart: (e: React.MouseEvent, sc: EditorScene, handle: "left" | "right", trackType: "voice" | "visuals" | "captions") => void;
  seekToTimeline: (seconds: number) => void;
  sourceJob?: Job;
  speakingSceneId: string | null;
  playSceneAudio: (text?: string, scId?: string, offsetSeconds?: number) => void;
}

export function EditorTimeline({
  undoTimeline,
  redoTimeline,
  deleteActiveScene,
  splitActiveScene,
  addNewSceneSegment,
  activeScene,
  activeSceneId,
  editorScenes,
  effectiveScenes,
  setScenesWithHistory,
  setSceneId,
  setProjectMessage,
  playing,
  setPlaying,
  zoomLevel,
  setZoomLevel,
  trackMutes,
  setTrackMutes,
  trackLocks,
  setTrackLocks,
  timelineViewportRef,
  onTimelineMouseDown,
  handleClipContextMenu,
  sequenceDuration,
  playheadLineElRef,
  playheadSeconds,
  clipLayouts,
  dragOverSceneIdx,
  draggedSceneIdx,
  handleClipSlideStart,
  handleTrimStart,
  seekToTimeline,
  sourceJob,
  speakingSceneId,
  playSceneAudio,
}: EditorTimelineProps) {
  return (
    <footer className="ts-timeline-footer">
      {/* Timeline Action Bar */}
      <div className="ts-timeline-toolbar">
        <div className="ts-tl-toolbar-left">
          <button type="button" className="ts-tool-icon-btn" title="Hoàn tác (Ctrl+Z)" onClick={undoTimeline}>
            <Icon name="undo" size={13} />
          </button>
          <button type="button" className="ts-tool-icon-btn" title="Làm lại (Ctrl+Y)" onClick={redoTimeline}>
            <Icon name="redo" size={13} />
          </button>
          <button type="button" className="ts-tool-icon-btn" title="Xóa cảnh (Del)" onClick={deleteActiveScene}>
            <Icon name="trash" size={13} />
          </button>
          <button
            type="button"
            className="ts-tool-icon-btn"
            title="Cắt đầu In ([)"
            onClick={() => {
              const cur = toSeconds(activeScene.start);
              const nextStart = Math.max(0, cur - 0.5);
              const updated = editorScenes.map((s) => (s.id === activeSceneId ? { ...s, start: formatSeconds(nextStart) } : s));
              setScenesWithHistory(updated);
            }}
          >
            <span style={{ fontWeight: 800 }}>[</span>
          </button>
          <button type="button" className="ts-tool-icon-btn" title="Tách cảnh tại Playhead (S)" onClick={splitActiveScene}>
            <Icon name="scissors" size={13} />
          </button>
          <button
            type="button"
            className="ts-tool-icon-btn"
            title="Nhân bản cảnh (Ctrl+D)"
            onClick={() => {
              const copyId = `scene-dup-${Date.now()}`;
              const dup: EditorScene = { ...activeScene, id: copyId, title: `${activeScene.title} (Nhân bản)` };
              setScenesWithHistory([...editorScenes, dup]);
              setSceneId(copyId);
              setProjectMessage(`✓ Đã nhân bản: "${dup.title}"`);
              setTimeout(() => setProjectMessage(""), 2000);
            }}
          >
            <Icon name="copy" size={13} />
          </button>
          <button
            type="button"
            className="ts-tool-icon-btn"
            title="Khớp khẩu hình AI"
            onClick={() => {
              setProjectMessage("✨ Khớp khẩu hình AI thành công!");
              setTimeout(() => setProjectMessage(""), 2000);
            }}
          >
            <Icon name="spark" size={13} />
          </button>
        </div>

        <div className="ts-tl-toolbar-center">
          <button
            type="button"
            className="ts-play-space-btn"
            onClick={() => setPlaying((p) => !p)}
          >
            <Icon name={playing ? "pause" : "play"} size={13} /> {playing ? "Pause Space" : "Play Space"}
          </button>
          <button type="button" className="ts-segment-btn" onClick={addNewSceneSegment}>
            ⊕ Thêm cảnh
          </button>
          <button type="button" className="ts-segment-btn" onClick={splitActiveScene}>
            ✂ Tách cảnh
          </button>
          <button type="button" className="ts-segment-btn" onClick={deleteActiveScene}>
            🗑️ Xóa cảnh
          </button>
        </div>

        <div className="ts-tl-toolbar-right">
          <button
            type="button"
            className="ts-tool-icon-btn"
            title="Phóng to timeline (+)"
            onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
          >
            <Icon name="zoom-in" size={13} />
          </button>
          <span className="ts-tl-tick-label">{Math.round(zoomLevel * 100)}%</span>
          <button
            type="button"
            className="ts-tool-icon-btn"
            title="Thu nhỏ timeline (-)"
            onClick={() => setZoomLevel((z) => Math.max(1, z - 0.25))}
          >
            <Icon name="zoom-out" size={13} />
          </button>
          <div className="ts-tl-zoom-wrap">
            <input
              type="range"
              min="1"
              max="3"
              step="0.2"
              value={zoomLevel}
              onChange={(e) => setZoomLevel(Number(e.target.value))}
            />
          </div>
          <button
            type="button"
            className="ts-tool-icon-btn"
            title="Vừa màn hình (Fit)"
            onClick={() => setZoomLevel(1)}
          >
            ↔
          </button>
        </div>
      </div>

      {/* Tracks Multi-Lane Layout with Staggered Audio Lanes */}
      <div className="ts-timeline-lanes-container">
        {/* Left Track Headers */}
        <div className="ts-lanes-headers-col">
          <div className="ts-lane-header-ruler-space">
            <span>TRACKS</span>
          </div>

          {/* Track 1: Captions (Red / Coral) */}
          <div className="ts-lane-header-row header-captions">
            <button
              type="button"
              className="ts-lane-btn"
              title={trackMutes.captions ? "Hiện Phụ đề" : "Ẩn Phụ đề"}
              onClick={() => setTrackMutes((c) => ({ ...c, captions: !c.captions }))}
            >
              <Icon name="captions" size={11} />
            </button>
            <button
              type="button"
              className="ts-lane-btn"
              title={trackLocks.captions ? "Mở khóa" : "Khóa track"}
              onClick={() => setTrackLocks((c) => ({ ...c, captions: !c.captions }))}
            >
              <Icon name={trackLocks.captions ? "lock" : "unlock"} size={11} />
            </button>
            <span className="ts-lane-title">T Phụ đề</span>
          </div>

          {/* Track 2: Visuals (Teal / Cyan) */}
          <div className="ts-lane-header-row header-visuals">
            <button
              type="button"
              className="ts-lane-btn"
              title={trackMutes.video ? "Hiện Video" : "Ẩn Video"}
              onClick={() => setTrackMutes((c) => ({ ...c, video: !c.video }))}
            >
              <Icon name="video" size={11} />
            </button>
            <button
              type="button"
              className={`ts-lane-btn ${trackMutes.originalAudio ? "is-muted-orig-lane" : ""}`}
              title={trackMutes.originalAudio ? "Bật âm thanh gốc Video" : "Tắt âm thanh gốc Video (Mute Original Audio)"}
              onClick={() => {
                setTrackMutes((c) => {
                  const next = !c.originalAudio;
                  setProjectMessage(next ? "🔇 Đã tắt âm thanh gốc video" : "🔊 Đã bật âm thanh gốc video");
                  setTimeout(() => setProjectMessage(""), 2000);
                  return { ...c, originalAudio: next };
                });
              }}
              style={{ color: trackMutes.originalAudio ? "#ef4444" : "#2dd4bf" }}
            >
              <Icon name={trackMutes.originalAudio ? "volume-mute" : "volume"} size={11} />
            </button>
            <button
              type="button"
              className="ts-lane-btn"
              title={trackLocks.video ? "Mở khóa" : "Khóa track"}
              onClick={() => setTrackLocks((c) => ({ ...c, video: !c.video }))}
            >
              <Icon name={trackLocks.video ? "lock" : "unlock"} size={11} />
            </button>
            <span className="ts-lane-title">🎬 Visuals</span>
          </div>

          {/* Track 3: Unified Voice Narration Track */}
          <div className="ts-lane-header-row header-audio">
            <button
              type="button"
              className={`ts-lane-btn ${trackMutes.voice ? "is-muted" : ""}`}
              title={trackMutes.voice ? "Bật tiếng Thuyết minh" : "Tắt tiếng Thuyết minh (Mute Voice)"}
              onClick={() => {
                setTrackMutes((c) => {
                  const next = !c.voice;
                  setProjectMessage(next ? "🔇 Đã tắt Voice thuyết minh khi xuất" : "🎙️ Đã bật Voice thuyết minh khi xuất");
                  setTimeout(() => setProjectMessage(""), 2000);
                  return { ...c, voice: next, voice1: next, voice2: next, voice3: next };
                });
              }}
              style={{ color: trackMutes.voice ? "#ef4444" : "#a855f7" }}
            >
              <Icon name={trackMutes.voice ? "volume-mute" : "mic"} size={11} />
            </button>
            <button
              type="button"
              className="ts-lane-btn"
              title={trackLocks.voice ? "Mở khóa" : "Khóa track"}
              onClick={() => setTrackLocks((c) => ({ ...c, voice: !c.voice }))}
            >
              <Icon name={trackLocks.voice ? "lock" : "unlock"} size={11} />
            </button>
            <span className="ts-lane-title">🎵 Voice (Thuyết minh)</span>
          </div>

          {/* Track 6: BGM & Music */}
          <div className="ts-lane-header-row header-bgm">
            <button
              type="button"
              className="ts-lane-btn"
              title={trackMutes.bgm ? "Bật nhạc nền" : "Tắt nhạc nền"}
              onClick={() => setTrackMutes((c) => ({ ...c, bgm: !c.bgm }))}
            >
              <Icon name={trackMutes.bgm ? "volume-mute" : "volume"} size={11} />
            </button>
            <button
              type="button"
              className="ts-lane-btn"
              title={trackLocks.bgm ? "Mở khóa" : "Khóa track"}
              onClick={() => setTrackLocks((c) => ({ ...c, bgm: !c.bgm }))}
            >
              <Icon name={trackLocks.bgm ? "lock" : "unlock"} size={11} />
            </button>
            <span className="ts-lane-title">🎵 BGM & SFX</span>
          </div>
        </div>

        {/* Right Scrollable Viewport */}
        <div
          className="ts-lanes-viewport"
          ref={timelineViewportRef}
          onMouseDown={onTimelineMouseDown}
          onContextMenu={(e) => handleClipContextMenu(e, undefined, "timeline")}
        >
          <div
            className="ts-lanes-content"
            style={{ width: `${zoomLevel * 100}%` }}
          >
            {/* Precision Time Ruler with .50 ticks */}
            <div
              className="ts-time-ruler"
              onMouseDown={onTimelineMouseDown}
              title="Nhấn hoặc kéo chuột để di chuyển Playhead"
            >
              {Array.from({ length: 25 }, (_, index) => (sequenceDuration * index) / 24).map(
                (secs, idx) => {
                  const isMajor = idx % 2 === 0;
                  return (
                    <span
                      key={idx}
                      className={`ts-ruler-tick ${isMajor ? "major" : ""}`}
                      style={{ left: `${(secs / (sequenceDuration || 1)) * 100}%` }}
                    >
                      {isMajor ? formatSeconds(secs) : `${formatSeconds(secs)}.50`}
                    </span>
                  );
                }
              )}
            </div>

            {/* Playhead Marker & Line */}
            {effectiveScenes.length > 0 && (
              <div
                ref={playheadLineElRef}
                className="ts-timeline-playhead"
                style={{
                  left: `${Math.min(100, Math.max(0, (playheadSeconds / (sequenceDuration || 1)) * 100))}%`,
                }}
                onMouseDown={onTimelineMouseDown}
                title="Kéo con trỏ Playhead"
              >
                <div className="ts-playhead-pointer">▽</div>
              </div>
            )}

            {/* Empty Timeline Guidance */}
            {effectiveScenes.length === 0 && (
              <div className="ts-empty-timeline-hint">
                <span style={{ fontSize: "28px" }}>🎬</span>
                <strong>Chưa có video nguồn hoặc phân cảnh</strong>
                <small>Chọn video ở menu góc trên bên trái hoặc chuyển sang bước <strong>1. Phân tích</strong> để tạo timeline tự động</small>
              </div>
            )}

            {/* TRACK 1: CAPTIONS TRACK (Coral Red Segment Pill Blocks) */}
            <div className="ts-track-lane lane-captions-coral">
              {clipLayouts.map((item) => {
                const isSelected = item.scene.id === activeSceneId;
                const isDragOver = dragOverSceneIdx === item.index;
                const isDragging = draggedSceneIdx === item.index;
                const subText = item.scene.subtitle || `[Caption] Phân cảnh ${item.index + 1}`;

                return (
                  <div
                    key={`cap-${item.scene.id}-${item.index}`}
                    className={`ts-clip-card clip-captions-coral ${isSelected ? "is-selected" : ""} ${isDragOver ? "is-drag-over" : ""} ${isDragging ? "is-dragging" : ""}`}
                    style={{ left: `${item.captionLeft}%`, width: `${item.captionWidth}%` }}
                    draggable={false}
                    onMouseDown={(e) => handleClipSlideStart(e, item.scene, "captions")}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSceneId(item.scene.id);
                      seekToTimeline(item.captionStartSec);
                    }}
                    onContextMenu={(e) => handleClipContextMenu(e, item.scene.id, "captions")}
                  >
                    <div
                      className="ts-clip-handle ts-handle-left"
                      draggable={false}
                      title="Kéo co giãn đầu phụ đề (Độc lập)"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleTrimStart(e, item.scene, "left", "captions");
                      }}
                    />
                    <span className="ts-caption-coral-tag">T</span>
                    <span className="ts-caption-coral-text" title={subText}>
                      {subText}
                    </span>
                    <div
                      className="ts-clip-handle ts-handle-right"
                      draggable={false}
                      title="Kéo co giãn đuôi phụ đề (Độc lập)"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleTrimStart(e, item.scene, "right", "captions");
                      }}
                    />
                  </div>
                );
              })}
            </div>

            {/* TRACK 2: VISUALS TRACK (Teal Filmstrip Thumbnails Sequence) */}
            <div className="ts-track-lane lane-visuals-teal">
              {clipLayouts.map((item) => {
                const isSelected = item.scene.id === activeSceneId;
                const isDragOver = dragOverSceneIdx === item.index;
                const isDragging = draggedSceneIdx === item.index;
                const previewFrames = sourceJob?.analysis?.previewFrames || [];
                const srcTargetSec = toSeconds(item.scene.sourceStart || item.scene.start);
                const matchedFrame = previewFrames.find(
                  (f) => Math.abs((f.timestampSeconds || 0) - srcTargetSec) < 15
                ) || previewFrames[item.index % (previewFrames.length || 1)];
                const frameImg = matchedFrame?.imageDataUrl;

                return (
                  <div
                    key={`visual-${item.scene.id}-${item.index}`}
                    className={`ts-clip-card clip-visuals-teal ${isSelected ? "is-selected" : ""} ${isDragOver ? "is-drag-over" : ""} ${isDragging ? "is-dragging" : ""}`}
                    style={{ left: `${item.visualLeft}%`, width: `${item.visualWidth}%` }}
                    draggable={false}
                    onMouseDown={(e) => handleClipSlideStart(e, item.scene, "visuals")}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSceneId(item.scene.id);
                      seekToTimeline(item.visualStartSec);
                    }}
                    onContextMenu={(e) => handleClipContextMenu(e, item.scene.id, "visuals")}
                  >
                    <div
                      className="ts-clip-handle ts-handle-left"
                      draggable={false}
                      title="Kéo co giãn đầu cảnh (Độc lập)"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleTrimStart(e, item.scene, "left", "visuals");
                      }}
                    />
                    <div className="ts-visual-topline">
                      <span className="ts-visual-title-tag" title={item.scene.title}>
                        {item.scene.title} · {item.scene.start} {item.scene.sourceStart ? `(Gốc: ${item.scene.sourceStart}-${item.scene.sourceEnd})` : ""}
                      </span>
                    </div>
                    <div className="ts-clip-filmstrip-row">
                      {frameImg ? (
                        Array.from({ length: Math.max(1, Math.floor(item.visualDur / 2.5)) }).map((_, fIdx) => (
                          <img
                            key={fIdx}
                            src={frameImg}
                            alt="frame"
                            className="ts-filmstrip-img"
                          />
                        ))
                      ) : (
                        <div className="ts-clip-label-placeholder">
                          <span>🎬 {item.scene.title}</span>
                        </div>
                      )}
                    </div>
                    <div
                      className="ts-clip-handle ts-handle-right"
                      draggable={false}
                      title="Kéo co giãn đuôi cảnh (Độc lập)"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleTrimStart(e, item.scene, "right", "visuals");
                      }}
                    />
                  </div>
                );
              })}
            </div>

            {/* TRACK 3: UNIFIED CONTINUOUS VOICE NARRATION TRACK */}
            <div className="ts-track-lane lane-audio-staggered">
              {clipLayouts.map((item) => {
                const isSelected = item.scene.id === activeSceneId;
                const isSpeaking = speakingSceneId === item.scene.id;
                const isDragOver = dragOverSceneIdx === item.index;
                return (
                  <div
                    key={`aud-${item.scene.id}-${item.index}`}
                    className={`ts-clip-card clip-audio-staggered ${isSelected ? "is-selected" : ""} ${isSpeaking ? "is-speaking" : ""} ${isDragOver ? "is-drag-over" : ""}`}
                    style={{ left: `${item.voiceLeft}%`, width: `${item.voiceWidth}%` }}
                    draggable={false}
                    onMouseDown={(e) => handleClipSlideStart(e, item.scene, "voice")}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSceneId(item.scene.id);
                      seekToTimeline(item.voiceStartSec);
                      if (item.scene.subtitle) {
                        playSceneAudio(item.scene.subtitle, item.scene.id);
                      }
                    }}
                    onContextMenu={(e) => handleClipContextMenu(e, item.scene.id, "voice")}
                  >
                    <div
                      className="ts-clip-handle ts-handle-left"
                      draggable={false}
                      title="Kéo co giãn đầu âm thanh (Độc lập)"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleTrimStart(e, item.scene, "left", "voice");
                      }}
                    />
                    <div className="ts-audio-clip-header">
                      <span className="ts-audio-file-name">Voice {item.index + 1}: {item.scene.title.slice(0, 22)}</span>
                      <span className="ts-audio-duration-tag">{item.voiceDur.toFixed(1)}s</span>
                    </div>
                    <div className="ts-audio-waveform-row">
                      {Array.from({ length: Math.min(36, Math.max(8, Math.floor(item.voiceDur * 4))) }).map((_, wIdx) => (
                        <span
                          key={wIdx}
                          className="ts-waveform-bar"
                          style={{
                            height: `${[45, 85, 100, 60, 95, 70, 90, 45, 80, 60, 95, 75][wIdx % 12]}%`,
                            background: isSpeaking ? "#f59e0b" : "#38bdf8",
                          }}
                        />
                      ))}
                    </div>
                    <div
                      className="ts-clip-handle ts-handle-right"
                      draggable={false}
                      title="Kéo co giãn đuôi âm thanh (Độc lập)"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleTrimStart(e, item.scene, "right", "voice");
                      }}
                    />
                  </div>
                );
              })}
            </div>

            {/* TRACK 6: BGM & MUSIC (Ambient Bed) */}
            <div className="ts-track-lane lane-bgm-amber">
              <div
                className="ts-clip-card clip-bgm-amber"
                style={{ left: "0%", width: "100%" }}
                onContextMenu={(e) => handleClipContextMenu(e, "bgm-global", "bgm")}
              >
                <div className="ts-audio-waveform-row">
                  <span style={{ fontSize: "10px", color: "#f59e0b", marginRight: "6px", fontWeight: 700 }}>
                    🎵 BGM: Hoà Cùng Yêu Dấu Nỗi Buồn (Lo-Fi)
                  </span>
                  {Array.from({ length: 24 }).map((_, wIdx) => (
                    <span
                      key={wIdx}
                      className="ts-waveform-bar"
                      style={{
                        height: `${[25, 45, 60, 35, 55, 40, 65, 30, 50, 35, 60, 45][wIdx % 12]}%`,
                        background: "#f59e0b",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
