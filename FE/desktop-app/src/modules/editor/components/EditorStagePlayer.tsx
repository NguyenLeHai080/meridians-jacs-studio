import React from "react";
import { Icon } from "../../../shared/Icon";
import type { EditorScene } from "../editor.types";
import { fileUrl, formatTimecodePrecise } from "../utils/editorTime";

export interface EditorStagePlayerProps {
  playerContainerRef: React.RefObject<HTMLDivElement>;
  videoRef: React.RefObject<HTMLVideoElement>;
  stemAudioRef: React.RefObject<HTMLAudioElement>;
  scrubProgressElRef: React.RefObject<HTMLDivElement>;
  scrubThumbElRef: React.RefObject<HTMLDivElement>;
  timecodeElRef: React.RefObject<HTMLSpanElement>;
  isDraggingPlayhead: React.MutableRefObject<boolean>;
  aspectRatio: "9:16" | "1:1" | "16:9" | "4:5";
  fitMode: "fit" | "100" | "75" | "50";
  setFitMode: (m: "fit" | "100" | "75" | "50") => void;
  mediaUrl?: string;
  scaleVal: number;
  posX: number;
  posY: number;
  rotationVal: number;
  opacityVal: number;
  activeFilterObj: { id: string; name: string; css: string };
  activeMaskObj: { id: string; name: string; clip: string };
  muted: boolean;
  setMuted: React.Dispatch<React.SetStateAction<boolean>>;
  trackMutes: Record<string, boolean>;
  setTrackMutes: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  originalAudioVolume: number;
  setMediaDuration: (d: number) => void;
  playing: boolean;
  setPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  isLooping: boolean;
  setIsLooping: React.Dispatch<React.SetStateAction<boolean>>;
  seekToTimeline: (seconds: number) => void;
  isolatedStemPath: string | null;
  activeStickers: Array<{ id: string; label: string; x: number; y: number }>;
  setActiveStickers: React.Dispatch<React.SetStateAction<Array<{ id: string; label: string; x: number; y: number }>>>;
  subtitlesVisible: boolean;
  subtitleWords: string[];
  subtitlePosition: "bottom" | "center" | "top";
  subtitleSize: "sm" | "md" | "lg" | "xl";
  subtitleStyle: "gold" | "white" | "neon" | "box";
  activeWordIdx: number;
  activeDisplayScene?: EditorScene;
  sequenceDuration: number;
  playheadSeconds: number;
  setProjectMessage: (msg: string) => void;
  toggleFullscreen: () => void;
}

export function EditorStagePlayer({
  playerContainerRef,
  videoRef,
  stemAudioRef,
  scrubProgressElRef,
  scrubThumbElRef,
  timecodeElRef,
  isDraggingPlayhead,
  aspectRatio,
  fitMode,
  setFitMode,
  mediaUrl,
  scaleVal,
  posX,
  posY,
  rotationVal,
  opacityVal,
  activeFilterObj,
  activeMaskObj,
  muted,
  setMuted,
  trackMutes,
  setTrackMutes,
  originalAudioVolume,
  setMediaDuration,
  playing,
  setPlaying,
  isLooping,
  setIsLooping,
  seekToTimeline,
  isolatedStemPath,
  activeStickers,
  setActiveStickers,
  subtitlesVisible,
  subtitleWords,
  subtitlePosition,
  subtitleSize,
  subtitleStyle,
  activeWordIdx,
  activeDisplayScene,
  sequenceDuration,
  playheadSeconds,
  setProjectMessage,
  toggleFullscreen,
}: EditorStagePlayerProps) {
  return (
    <main className="ts-stage-column">
      <div className="ts-video-viewport">
        <div
          ref={playerContainerRef}
          className={`ts-player-box ts-ratio-${aspectRatio.replace(":", "-")}`}
          style={{
            transform: fitMode === "100" ? "scale(1)" : fitMode === "75" ? "scale(0.75)" : fitMode === "50" ? "scale(0.5)" : "none",
            transition: "transform 0.15s ease",
          }}
        >
          {mediaUrl ? (
            <video
              ref={videoRef}
              src={mediaUrl}
              className="ts-video-element"
              style={{
                transform: `scale(${scaleVal / 100}) translate(${posX}px, ${posY}px) rotate(${rotationVal}deg)`,
                opacity: opacityVal / 100,
                filter: activeFilterObj.css,
                clipPath: activeMaskObj.clip,
                transition: "filter 0.15s ease, clip-path 0.15s ease, opacity 0.15s ease",
              }}
              muted={muted || Boolean(trackMutes.originalAudio) || originalAudioVolume === 0}
              onLoadedMetadata={(e) => {
                const d = e.currentTarget.duration;
                if (d && !isNaN(d) && d > 0) {
                  setMediaDuration(d);
                }
              }}
              onEnded={() => {
                if (isLooping) {
                  seekToTimeline(0);
                } else {
                  setPlaying(false);
                }
              }}
            />
          ) : (
            <div className="ts-video-placeholder">
              <Icon name="video" size={32} />
              <strong>Chưa có Video Nguồn</strong>
              <small>Chọn video từ danh sách hoặc tải file mới</small>
            </div>
          )}

          {/* Auxiliary AI Isolated Stem Audio element for realtime preview */}
          <audio
            ref={stemAudioRef}
            src={isolatedStemPath ? fileUrl(isolatedStemPath) : undefined}
            preload="auto"
            style={{ display: "none" }}
          />

          {/* Active Sticker Badges on Video */}
          {activeStickers.length > 0 && (
            <div className="ts-stickers-overlay">
              {activeStickers.map((stk) => (
                <div key={stk.id} className="ts-active-sticker-badge">
                  <span>{stk.label}</span>
                  <button
                    type="button"
                    className="ts-sticker-del-btn"
                    onClick={() => setActiveStickers((prev) => prev.filter((item) => item.id !== stk.id))}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Word-by-word Subtitle Overlay on Player */}
          {subtitlesVisible && subtitleWords.length > 0 && (
            <div className={`ts-subtitle-overlay-box pos-${subtitlePosition}`}>
              <div className={`ts-subtitle-overlay-text size-${subtitleSize} style-${subtitleStyle}`}>
                {subtitleWords.map((word, wIdx) => {
                  const isSpoken = activeWordIdx >= 0 && wIdx <= activeWordIdx;
                  const isCurrent = wIdx === activeWordIdx;

                  return (
                    <span
                      key={`${activeDisplayScene?.id || "sub"}-${wIdx}`}
                      className={`ts-sub-word ${isCurrent ? "is-current" : isSpoken ? "is-spoken" : "is-pending"}`}
                    >
                      {word}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hidden progress line ref to ensure external scrubProgressElRef & scrubThumbElRef don't throw */}
      <div style={{ display: "none" }}>
        <div ref={scrubProgressElRef} />
        <div ref={scrubThumbElRef} />
      </div>

      {/* Streamlined Clean Player Controls Bar */}
      <div className="ts-player-controls-bar">
        {/* Left: Precise Timecode Pill */}
        <span ref={timecodeElRef} className="ts-player-timecode" title="Vị trí hiện tại / Tổng thời lượng">
          {formatTimecodePrecise(playheadSeconds)} / {formatTimecodePrecise(sequenceDuration)}
        </span>

        {/* Center: Core Transport Controls */}
        <div className="ts-player-transport-actions">
          <button
            type="button"
            className="ts-transport-btn"
            title="Về đầu video (Home)"
            onClick={() => seekToTimeline(0)}
          >
            <span style={{ fontSize: "11px", fontWeight: 800 }}>|◀</span>
          </button>
          <button
            type="button"
            className="ts-transport-play-btn"
            title={playing ? "Tạm dừng (Space)" : "Phát (Space)"}
            onClick={() => setPlaying((p) => !p)}
          >
            <Icon name={playing ? "pause" : "play"} size={14} />
          </button>
          <button
            type="button"
            className="ts-transport-btn"
            title="Về cuối video (End)"
            onClick={() => seekToTimeline(sequenceDuration)}
          >
            <span style={{ fontSize: "11px", fontWeight: 800 }}>▶|</span>
          </button>
          <button
            type="button"
            className={`ts-transport-btn ${isLooping ? "is-active" : ""}`}
            title={isLooping ? "Đang bật phát lặp lại" : "Bật phát lặp lại (Loop)"}
            onClick={() => setIsLooping((l) => !l)}
          >
            <Icon name="refresh" size={12} />
          </button>
        </div>

        {/* Right: Mute, Ratio Badge, Fullscreen */}
        <div className="ts-player-fit-actions">
          <button
            type="button"
            className={`ts-transport-btn ${muted ? "is-active" : ""}`}
            title={muted ? "Bật âm lượng" : "Tắt tiếng (Mute)"}
            onClick={() => setMuted((m) => !m)}
          >
            <Icon name={muted ? "volume-mute" : "volume"} size={13} />
          </button>
          <span className="ts-ratio-pill" title="Tỷ lệ khung hình">
            {aspectRatio}
          </span>
          <button
            type="button"
            className="ts-transport-btn"
            title="Toàn màn hình"
            onClick={toggleFullscreen}
          >
            <Icon name="maximize" size={12} />
          </button>
        </div>
      </div>
    </main>
  );
}
