import React from "react";
import type { Job } from "../../../core/types";
import { VOICE_PACKS } from "../../../core/voice-packs";
import { Icon } from "../../../shared/Icon";
import type { EditorScene } from "../editor.types";
import { toSeconds } from "../utils/editorTime";

export interface EditorLeftDockProps {
  dockTab: "captions" | "smart" | "audio" | "effects" | "stickers";
  setDockTab: (tab: "captions" | "smart" | "audio" | "effects" | "stickers") => void;
  librarySubTab?: "upload" | "library" | "assets";
  setLibrarySubTab?: (sub: "upload" | "library" | "assets") => void;
  editorScenes: EditorScene[];
  activeSceneId: string;
  activeScene: EditorScene;
  sourceJob?: Job;
  uploadedFiles?: Array<{ id: string; name: string; path: string }>;
  setSelectedSourceJobId?: (id: string) => void;
  handleUploadNativeMedia?: () => void;
  setProjectMessage: (msg: string) => void;
  assetFilter?: "all" | "images" | "videos" | "music" | "sfx";
  setAssetFilter?: (filter: "all" | "images" | "videos" | "music" | "sfx") => void;
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
  addNewSceneSegment?: () => void;
  setSceneId: (id: string) => void;
  seekToTimeline: (seconds: number) => void;
  subtitlesVisible: boolean;
  setSubtitlesVisible: React.Dispatch<React.SetStateAction<boolean>>;
  subtitleStyle: "gold" | "white" | "neon" | "box";
  setSubtitleStyle: (style: "gold" | "white" | "neon" | "box") => void;
  subtitleSize: "sm" | "md" | "lg" | "xl";
  setSubtitleSize: (size: "sm" | "md" | "lg" | "xl") => void;
  subtitlePosition: "bottom" | "center" | "top";
  setSubtitlePosition: (pos: "bottom" | "center" | "top") => void;
  playSceneAudio: (text?: string, scId?: string, offsetSeconds?: number, isExplicitPreview?: boolean) => void;
  setScenesWithHistory: (scenes: EditorScene[]) => void;
  setAspectRatio?: (ratio: "9:16" | "1:1" | "16:9" | "4:5") => void;
  bgmVolume: number;
  setBgmVolume: (vol: number) => void;
  voiceVolume: number;
  setVoiceVolume: (vol: number) => void;
  trackMutes?: Record<string, boolean>;
  setTrackMutes?: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  originalAudioVolume?: number;
  setOriginalAudioVolume?: (vol: number) => void;
  removeOriginalBgm?: boolean;
  setRemoveOriginalBgm?: (val: boolean) => void;
  isIsolatingStem?: boolean;
  stemProgress?: number;
  stemStage?: string;
  isolatedStemPath?: string | null;
  voiceSpeed: number;
  setVoiceSpeed: (speed: number) => void;
  selectedVoice: string;
  setSelectedVoice: (v: string) => void;
  selectedBgm?: string;
  setSelectedBgm?: (bgm: string) => void;
  customBgmTitle?: string | null;
  handlePickCustomBgm?: () => void;
  triggerIsolateVocals?: () => void;
  playSfxPreview?: (sfxId: string) => void;
  previewingSoundId?: string | null;
  selectedFilter?: string;
  setSelectedFilter?: (filter: string) => void;
  setActiveStickers?: React.Dispatch<React.SetStateAction<Array<{ id: string; label: string; x: number; y: number }>>>;
  handleAutoAlignVoiceAndVisuals?: () => void;
}

export function EditorLeftDock({
  editorScenes,
  activeSceneId,
  setSceneId,
  seekToTimeline,
  subtitlesVisible,
  setSubtitlesVisible,
  subtitleStyle,
  setSubtitleStyle,
  subtitleSize,
  setSubtitleSize,
  subtitlePosition,
  setSubtitlePosition,
  playSceneAudio,
  setScenesWithHistory,
  bgmVolume,
  setBgmVolume,
  voiceVolume,
  setVoiceVolume,
  voiceSpeed,
  setVoiceSpeed,
  selectedVoice,
  setSelectedVoice,
  setProjectMessage,
  handleAutoAlignVoiceAndVisuals,
}: EditorLeftDockProps) {
  // Normalize script to authentic 3rd-person movie review narration
  const handleNormalizeReviewScript = () => {
    const updated = editorScenes.map((s, idx) => {
      let text = s.subtitle || s.voiceover || s.detail || "";
      // Strip any "Mở đầu video...", raw title tags, etc.
      text = text.replace(/Mở đầu video\s*["'“][^"'”]+["'”],?\s*/gi, "");
      text = text.replace(/Mở đầu video\s*[^,]+,?\s*/gi, "");
      text = text.replace(/Khép lại toàn bộ diễn biến của\s*["'“][^"'”]+["'”],?\s*/gi, "Khép lại toàn bộ câu chuyện, ");
      text = text.replace(/bối cảnh khởi nguồn sự việc trong\s*["'“][^"'”]+["'”],?\s*/gi, "bối cảnh khởi nguồn của câu chuyện, ");

      if (idx === 0) {
        if (!text || text.length < 15 || /Mở đầu/i.test(text)) {
          text = "Phân cảnh mở màn nghẹt thở ngay lập tức cuốn người xem vào một nhiệm vụ sinh tử, khi người đàn ông bí ẩn bất ngờ đối mặt với hiểm nguy cận kề.";
        }
      }
      return {
        ...s,
        subtitle: text.trim(),
        voiceover: text.trim(),
        translation: text.trim(),
      };
    });
    setScenesWithHistory(updated);
    setProjectMessage("🎬 Đã chuẩn hóa toàn bộ kịch bản sang ngôi thứ 3 review phim kịch tính!");
    setTimeout(() => setProjectMessage(""), 3000);
  };

  return (
    <section className="ts-drawer-panel" style={{ width: "100%", maxWidth: "100%" }}>
      <div className="ts-drawer-body">
        <div className="ts-captions-tab-content">
          {/* 1. Header Row */}
          <div className="ts-captions-header-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <strong style={{ fontSize: "13px", color: "#f8fafc", display: "flex", alignItems: "center", gap: "6px" }}>
              <span>🎙️</span> Phụ Đề & Lời Thoại Review Phim
            </strong>
            <button
              type="button"
              className={`ts-chip-btn ${subtitlesVisible ? "is-active" : ""}`}
              onClick={() => setSubtitlesVisible((v) => !v)}
              style={{ fontSize: "11px", padding: "3px 8px" }}
            >
              {subtitlesVisible ? "👁 Đang hiện" : "Ẩn phụ đề"}
            </button>
          </div>

          {/* 2. Style Picker */}
          <div className="ts-caption-style-picker" style={{ marginBottom: "12px" }}>
            <span className="ts-drawer-section-title" style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8" }}>Kiểu Phụ Đề:</span>
            <div className="ts-caption-styles-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginTop: "4px" }}>
              <button
                type="button"
                className={`ts-style-card ${subtitleStyle === "gold" ? "is-active" : ""}`}
                onClick={() => setSubtitleStyle("gold")}
                style={{ padding: "6px", textAlign: "center", borderRadius: "6px", border: subtitleStyle === "gold" ? "1px solid #eab308" : "1px solid rgba(255,255,255,0.08)", background: subtitleStyle === "gold" ? "rgba(234, 179, 8, 0.15)" : "#0e1424" }}
              >
                <span style={{ color: "#fde047", fontWeight: 900, fontSize: "11.5px" }}>Vàng Review</span>
              </button>
              <button
                type="button"
                className={`ts-style-card ${subtitleStyle === "neon" ? "is-active" : ""}`}
                onClick={() => setSubtitleStyle("neon")}
                style={{ padding: "6px", textAlign: "center", borderRadius: "6px", border: subtitleStyle === "neon" ? "1px solid #38bdf8" : "1px solid rgba(255,255,255,0.08)", background: subtitleStyle === "neon" ? "rgba(56, 189, 248, 0.15)" : "#0e1424" }}
              >
                <span style={{ color: "#38bdf8", fontWeight: 900, fontSize: "11.5px" }}>Neon Cyber</span>
              </button>
              <button
                type="button"
                className={`ts-style-card ${subtitleStyle === "white" ? "is-active" : ""}`}
                onClick={() => setSubtitleStyle("white")}
                style={{ padding: "6px", textAlign: "center", borderRadius: "6px", border: subtitleStyle === "white" ? "1px solid #f8fafc" : "1px solid rgba(255,255,255,0.08)", background: subtitleStyle === "white" ? "rgba(255, 255, 255, 0.15)" : "#0e1424" }}
              >
                <span style={{ color: "#ffffff", fontWeight: 900, fontSize: "11.5px" }}>Trắng Tối Giản</span>
              </button>
              <button
                type="button"
                className={`ts-style-card ${subtitleStyle === "box" ? "is-active" : ""}`}
                onClick={() => setSubtitleStyle("box")}
                style={{ padding: "6px", textAlign: "center", borderRadius: "6px", border: subtitleStyle === "box" ? "1px solid #a855f7" : "1px solid rgba(255,255,255,0.08)", background: subtitleStyle === "box" ? "rgba(168, 85, 247, 0.15)" : "#0e1424" }}
              >
                <span style={{ background: "#000", color: "#fff", padding: "1px 6px", borderRadius: "3px", fontSize: "11px", fontWeight: 800 }}>Khung Đen</span>
              </button>
            </div>
          </div>

          {/* 3. Subtitle Size & Position */}
          <div className="ts-caption-options-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "12px" }}>
            <div>
              <span className="ts-drawer-section-title" style={{ fontSize: "10.5px", color: "#94a3b8" }}>Cỡ chữ:</span>
              <select
                className="ts-select-box"
                value={subtitleSize}
                onChange={(e) => setSubtitleSize(e.target.value as "sm" | "md" | "lg" | "xl")}
                style={{ width: "100%", marginTop: "3px" }}
              >
                <option value="sm">Nhỏ (12px)</option>
                <option value="md">Vừa (14px)</option>
                <option value="lg">Lớn (18px)</option>
                <option value="xl">Rất lớn (22px)</option>
              </select>
            </div>
            <div>
              <span className="ts-drawer-section-title" style={{ fontSize: "10.5px", color: "#94a3b8" }}>Vị trí:</span>
              <select
                className="ts-select-box"
                value={subtitlePosition}
                onChange={(e) => setSubtitlePosition(e.target.value as "bottom" | "center" | "top")}
                style={{ width: "100%", marginTop: "3px" }}
              >
                <option value="bottom">Dưới đáy</option>
                <option value="center">Chính giữa</option>
                <option value="top">Trên đỉnh</option>
              </select>
            </div>
          </div>

          {/* 4. Voice & Audio Settings */}
          <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.06)", marginBottom: "12px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#2dd4bf", marginBottom: "8px", display: "flex", alignItems: "center", gap: "5px" }}>
              <Icon name="music" size={13} />
              <span>Giọng Đọc & Âm Lượng</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "8px", marginBottom: "8px" }}>
              <div>
                <label style={{ fontSize: "10px", color: "#94a3b8", display: "block" }}>Giọng lồng tiếng:</label>
                <select
                  className="ts-select-box"
                  value={selectedVoice}
                  onChange={(e) => setSelectedVoice(e.target.value)}
                  style={{ width: "100%", marginTop: "2px" }}
                >
                  {VOICE_PACKS.filter((v) => v.language === "vi" || v.language === "en").map((vp) => (
                    <option key={vp.id} value={vp.id}>
                      {vp.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: "10px", color: "#94a3b8", display: "block" }}>Tốc độ đọc:</label>
                <select
                  className="ts-select-box"
                  value={voiceSpeed}
                  onChange={(e) => setVoiceSpeed(Number(e.target.value))}
                  style={{ width: "100%", marginTop: "2px" }}
                >
                  <option value={0.9}>0.9x (Chậm rãi)</option>
                  <option value={1.0}>1.0x (Tự nhiên)</option>
                  <option value={1.1}>1.1x (Hơi nhanh)</option>
                  <option value={1.2}>1.2x (Dồn dập)</option>
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#94a3b8" }}>
                  <span>Voice:</span>
                  <span style={{ color: "#2dd4bf" }}>{voiceVolume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="150"
                  value={voiceVolume}
                  onChange={(e) => setVoiceVolume(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "#2dd4bf", cursor: "pointer", height: "4px" }}
                />
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#94a3b8" }}>
                  <span>Nhạc nền BGM:</span>
                  <span style={{ color: "#fbbf24" }}>{bgmVolume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={bgmVolume}
                  onChange={(e) => setBgmVolume(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "#fbbf24", cursor: "pointer", height: "4px" }}
                />
              </div>
            </div>
          </div>

          {/* 5. Action Buttons (Khớp Voice & Chuẩn Hóa Kịch Bản) */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "14px" }}>
            {handleAutoAlignVoiceAndVisuals && (
              <button
                type="button"
                className="ts-auto-caption-btn"
                onClick={handleAutoAlignVoiceAndVisuals}
                style={{
                  background: "linear-gradient(135deg, rgba(20, 184, 166, 0.25) 0%, rgba(13, 148, 136, 0.35) 100%)",
                  border: "1px solid #14b8a6",
                  color: "#2dd4bf",
                  fontWeight: 800,
                  padding: "8px 12px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  fontSize: "12px",
                }}
              >
                <span>🎯</span> Khớp Voice & Khung Hình 1:1
              </button>
            )}

            <button
              type="button"
              onClick={handleNormalizeReviewScript}
              style={{
                background: "linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%)",
                border: "1px solid rgba(168, 85, 247, 0.4)",
                color: "#c084fc",
                fontWeight: 700,
                padding: "7px 12px",
                borderRadius: "8px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                fontSize: "11.5px",
              }}
            >
              <span>✨</span> Chuẩn hóa Kịch bản Ngôi thứ 3 (Review phim)
            </button>
          </div>

          {/* 6. Danh sách câu thoại / phân cảnh */}
          <div className="ts-captions-cues-list">
            <span className="ts-drawer-section-title" style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "6px", display: "block" }}>
              Danh sách câu thoại ({editorScenes.length} cảnh):
            </span>
            {editorScenes.map((sc, idx) => (
              <div
                key={sc.id}
                className={`ts-caption-cue-item ${sc.id === activeSceneId ? "is-active" : ""}`}
                onClick={() => {
                  setSceneId(sc.id);
                  seekToTimeline(toSeconds(sc.start));
                }}
              >
                <div className="ts-caption-cue-top">
                  <span className="ts-cue-label" style={{ fontWeight: 800 }}>Cảnh {idx + 1}</span>
                  <span className="ts-cue-time">{sc.start} - {sc.end}</span>
                  <button
                    type="button"
                    className="ts-cue-speak-btn"
                    title="Nghe thử câu thoại"
                    onClick={(e) => {
                      e.stopPropagation();
                      playSceneAudio(sc.subtitle, sc.id, 0, true);
                    }}
                  >
                    🔊
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={sc.subtitle || ""}
                  placeholder="Nhập lời thoại review phim cho phân cảnh này..."
                  onChange={(e) => {
                    const newText = e.target.value;
                    const updated = editorScenes.map((item) =>
                      item.id === sc.id
                        ? { ...item, subtitle: newText, voiceover: newText, translation: newText }
                        : item
                    );
                    setScenesWithHistory(updated);
                  }}
                  className="ts-cue-textarea"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
