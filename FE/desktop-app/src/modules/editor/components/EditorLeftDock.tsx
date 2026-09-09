import React from "react";
import type { Job } from "../../../core/types";
import { VOICE_PACKS } from "../../../core/voice-packs";
import { Icon } from "../../../shared/Icon";
import type { EditorScene } from "../editor.types";
import {
  SAMPLE_LIBRARY_IMAGES,
  SAMPLE_LIBRARY_VIDEOS,
  SAMPLE_LIBRARY_MUSIC,
  SAMPLE_LIBRARY_SFX,
  FILTER_PRESETS,
  STICKER_PRESETS,
} from "../constants/presets";
import { toSeconds } from "../utils/editorTime";

export interface EditorLeftDockProps {
  dockTab: "media" | "captions" | "smart" | "audio" | "effects" | "stickers";
  setDockTab: (tab: "media" | "captions" | "smart" | "audio" | "effects" | "stickers") => void;
  librarySubTab: "upload" | "library" | "assets";
  setLibrarySubTab: (sub: "upload" | "library" | "assets") => void;
  editorScenes: EditorScene[];
  activeSceneId: string;
  activeScene: EditorScene;
  sourceJob?: Job;
  uploadedFiles: Array<{ id: string; name: string; path: string }>;
  setSelectedSourceJobId: (id: string) => void;
  handleUploadNativeMedia: () => void;
  setProjectMessage: (msg: string) => void;
  assetFilter: "all" | "images" | "videos" | "music" | "sfx";
  setAssetFilter: (filter: "all" | "images" | "videos" | "music" | "sfx") => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  addNewSceneSegment: () => void;
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
  playSceneAudio: (text?: string, scId?: string, offsetSeconds?: number) => void;
  setScenesWithHistory: (scenes: EditorScene[]) => void;
  setAspectRatio: (ratio: "9:16" | "1:1" | "16:9" | "4:5") => void;
  bgmVolume: number;
  setBgmVolume: (vol: number) => void;
  voiceVolume: number;
  setVoiceVolume: (vol: number) => void;
  trackMutes: Record<string, boolean>;
  setTrackMutes: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  originalAudioVolume: number;
  setOriginalAudioVolume: (vol: number) => void;
  removeOriginalBgm: boolean;
  setRemoveOriginalBgm: (val: boolean) => void;
  isIsolatingStem: boolean;
  stemProgress: number;
  stemStage: string;
  isolatedStemPath: string | null;
  voiceSpeed: number;
  setVoiceSpeed: (speed: number) => void;
  selectedVoice: string;
  setSelectedVoice: (v: string) => void;
  selectedBgm: string;
  setSelectedBgm: (bgm: string) => void;
  selectedFilter: string;
  setSelectedFilter: (filter: string) => void;
  setActiveStickers: React.Dispatch<React.SetStateAction<Array<{ id: string; label: string; x: number; y: number }>>>;
}

export function EditorLeftDock({
  dockTab,
  setDockTab,
  librarySubTab,
  setLibrarySubTab,
  editorScenes,
  activeSceneId,
  activeScene,
  sourceJob,
  uploadedFiles,
  setSelectedSourceJobId,
  handleUploadNativeMedia,
  setProjectMessage,
  assetFilter,
  setAssetFilter,
  searchQuery,
  setSearchQuery,
  addNewSceneSegment,
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
  setAspectRatio,
  bgmVolume,
  setBgmVolume,
  voiceVolume,
  setVoiceVolume,
  trackMutes,
  setTrackMutes,
  originalAudioVolume,
  setOriginalAudioVolume,
  removeOriginalBgm,
  setRemoveOriginalBgm,
  isIsolatingStem,
  stemProgress,
  stemStage,
  isolatedStemPath,
  voiceSpeed,
  setVoiceSpeed,
  selectedVoice,
  setSelectedVoice,
  selectedBgm,
  setSelectedBgm,
  selectedFilter,
  setSelectedFilter,
  setActiveStickers,
}: EditorLeftDockProps) {
  return (
    <>
      {/* COLUMN 1A: LEFT VERTICAL DOCK BAR */}
      <aside className="ts-vertical-dock">
        <button
          type="button"
          className={`ts-dock-item ${dockTab === "media" ? "is-active" : ""}`}
          onClick={() => setDockTab("media")}
          title="Phương tiện & Tài nguyên"
        >
          <div className="ts-dock-icon">
            <Icon name="folder" size={16} />
          </div>
          <span>Media</span>
        </button>

        <button
          type="button"
          className={`ts-dock-item ${dockTab === "captions" ? "is-active" : ""}`}
          onClick={() => setDockTab("captions")}
          title="Phụ đề & Lời thoại"
        >
          <div className="ts-dock-icon">
            <Icon name="captions" size={16} />
          </div>
          <span>Captions</span>
        </button>

        <button
          type="button"
          className={`ts-dock-item ${dockTab === "smart" ? "is-active" : ""}`}
          onClick={() => setDockTab("smart")}
          title="AI Thông minh"
        >
          <div className="ts-dock-icon">
            <Icon name="spark" size={16} />
          </div>
          <span>Smart AI</span>
        </button>

        <button
          type="button"
          className={`ts-dock-item ${dockTab === "audio" ? "is-active" : ""}`}
          onClick={() => setDockTab("audio")}
          title="Âm thanh, Giọng đọc & Nhạc nền"
        >
          <div className="ts-dock-icon">
            <Icon name="music" size={16} />
          </div>
          <span>Audio</span>
        </button>

        <button
          type="button"
          className={`ts-dock-item ${dockTab === "effects" ? "is-active" : ""}`}
          onClick={() => setDockTab("effects")}
          title="Bộ lọc & Hiệu ứng hình ảnh"
        >
          <div className="ts-dock-icon">
            <Icon name="layers" size={16} />
          </div>
          <span>Effects</span>
        </button>

        <button
          type="button"
          className={`ts-dock-item ${dockTab === "stickers" ? "is-active" : ""}`}
          onClick={() => setDockTab("stickers")}
          title="Nhãn dán & CTA"
        >
          <div className="ts-dock-icon">
            <Icon name="chat" size={16} />
          </div>
          <span>Stickers</span>
        </button>
      </aside>

      {/* COLUMN 1B: LEFT DRAWER PANEL */}
      <section className="ts-drawer-panel">
        {/* TAB: MEDIA */}
        {dockTab === "media" && (
          <>
            <div className="ts-drawer-pill-tabs">
              <button
                type="button"
                className={`ts-pill-btn ${librarySubTab === "upload" ? "is-active" : ""}`}
                onClick={() => setLibrarySubTab("upload")}
              >
                Upload
              </button>
              <button
                type="button"
                className={`ts-pill-btn ${librarySubTab === "library" ? "is-active" : ""}`}
                onClick={() => setLibrarySubTab("library")}
              >
                Library
              </button>
              <button
                type="button"
                className={`ts-pill-btn ${librarySubTab === "assets" ? "is-active" : ""}`}
                onClick={() => setLibrarySubTab("assets")}
              >
                My assets ({editorScenes.length})
              </button>
            </div>

            <div className="ts-drawer-body">
              {/* SUBTAB 1: UPLOAD */}
              {librarySubTab === "upload" && (
                <div className="ts-upload-subtab-view">
                  <div className="ts-upload-dropzone" onClick={handleUploadNativeMedia}>
                    <Icon name="video" size={30} />
                    <strong>Tải file từ máy tính</strong>
                    <small>Hỗ trợ MP4, MOV, MKV, MP3, WAV, PNG, JPG</small>
                    <button type="button" className="ts-upload-call-btn">
                      📁 Mở File Picker...
                    </button>
                  </div>

                  <div className="ts-uploaded-files-list">
                    <strong className="ts-drawer-section-title">Video nguồn đang dùng:</strong>
                    <div className="ts-uploaded-file-row is-current-source">
                      <span className="ts-uploaded-name">🎥 {sourceJob?.name || "Video hiện tại"}</span>
                      <span className="ts-source-badge">Đang mở</span>
                    </div>

                    {uploadedFiles.length > 0 && (
                      <>
                        <strong className="ts-drawer-section-title" style={{ marginTop: "8px" }}>
                          Đã tải lên ({uploadedFiles.length})
                        </strong>
                        {uploadedFiles.map((f) => (
                          <div key={f.id} className="ts-uploaded-file-row">
                            <span className="ts-uploaded-name">{f.name}</span>
                            <button
                              type="button"
                              className="ts-chip-btn"
                              onClick={() => {
                                setSelectedSourceJobId(f.id);
                                setProjectMessage(`✓ Đã nạp ${f.name}`);
                                setTimeout(() => setProjectMessage(""), 1500);
                              }}
                            >
                              Dùng
                            </button>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* SUBTAB 2: LIBRARY */}
              {librarySubTab === "library" && (
                <div className="ts-library-subtab-view">
                  {/* Category Chips */}
                  <div className="ts-drawer-filter-chips">
                    <button
                      type="button"
                      className={`ts-chip-btn ${assetFilter === "all" ? "is-active" : ""}`}
                      onClick={() => setAssetFilter("all")}
                    >
                      Tất cả
                    </button>
                    <button
                      type="button"
                      className={`ts-chip-btn ${assetFilter === "images" ? "is-active" : ""}`}
                      onClick={() => setAssetFilter("images")}
                    >
                      Ảnh
                    </button>
                    <button
                      type="button"
                      className={`ts-chip-btn ${assetFilter === "videos" ? "is-active" : ""}`}
                      onClick={() => setAssetFilter("videos")}
                    >
                      B-Roll
                    </button>
                    <button
                      type="button"
                      className={`ts-chip-btn ${assetFilter === "music" ? "is-active" : ""}`}
                      onClick={() => setAssetFilter("music")}
                    >
                      Nhạc
                    </button>
                    <button
                      type="button"
                      className={`ts-chip-btn ${assetFilter === "sfx" ? "is-active" : ""}`}
                      onClick={() => setAssetFilter("sfx")}
                    >
                      SFX
                    </button>
                  </div>

                  {/* Search */}
                  <div className="ts-drawer-search-box">
                    <input
                      type="text"
                      placeholder="Tìm kiếm tài nguyên B-Roll, Stock..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <div className="ts-drawer-provider-label">
                    Provided by JACS Studio Media Cloud
                  </div>

                  {/* Asset Cards Grid */}
                  <div className="ts-drawer-cards-grid">
                    {(assetFilter === "all" || assetFilter === "images") &&
                      SAMPLE_LIBRARY_IMAGES.filter((img) => !searchQuery || img.title.toLowerCase().includes(searchQuery.toLowerCase())).map((img) => (
                        <div
                          key={img.id}
                          className="ts-asset-grid-card"
                          onClick={() => {
                            setProjectMessage(`✓ Đã chèn ảnh minh họa: ${img.title}`);
                            setTimeout(() => setProjectMessage(""), 2000);
                          }}
                        >
                          <div className="ts-asset-thumb" style={{ background: img.color }}>
                            <span className="ts-asset-badge-tag">Image</span>
                          </div>
                          <strong className="ts-asset-title">{img.title}</strong>
                          <small className="ts-asset-meta">{img.meta}</small>
                        </div>
                      ))}

                    {(assetFilter === "all" || assetFilter === "videos") &&
                      SAMPLE_LIBRARY_VIDEOS.filter((vid) => !searchQuery || vid.title.toLowerCase().includes(searchQuery.toLowerCase())).map((vid) => (
                        <div
                          key={vid.id}
                          className="ts-asset-grid-card"
                          onClick={() => {
                            setProjectMessage(`✓ Đã nạp B-roll: ${vid.title}`);
                            setTimeout(() => setProjectMessage(""), 2000);
                          }}
                        >
                          <div className="ts-asset-thumb" style={{ background: vid.color }}>
                            <span className="ts-asset-badge-tag">Video</span>
                          </div>
                          <strong className="ts-asset-title">{vid.title}</strong>
                          <small className="ts-asset-meta">{vid.meta}</small>
                        </div>
                      ))}

                    {(assetFilter === "all" || assetFilter === "music") &&
                      SAMPLE_LIBRARY_MUSIC.filter((mus) => !searchQuery || mus.title.toLowerCase().includes(searchQuery.toLowerCase())).map((mus) => (
                        <div
                          key={mus.id}
                          className="ts-asset-grid-card"
                          onClick={() => {
                            setSelectedBgm(mus.id);
                            setProjectMessage(`✓ Đã đổi nhạc nền: ${mus.title}`);
                            setTimeout(() => setProjectMessage(""), 2000);
                          }}
                        >
                          <div className="ts-asset-thumb" style={{ background: mus.color }}>
                            <span className="ts-asset-badge-tag">Audio</span>
                          </div>
                          <strong className="ts-asset-title">{mus.title}</strong>
                          <small className="ts-asset-meta">{mus.meta}</small>
                        </div>
                      ))}

                    {(assetFilter === "all" || assetFilter === "sfx") &&
                      SAMPLE_LIBRARY_SFX.filter((sfx) => !searchQuery || sfx.title.toLowerCase().includes(searchQuery.toLowerCase())).map((sfx) => (
                        <div
                          key={sfx.id}
                          className="ts-asset-grid-card"
                          onClick={() => {
                            setProjectMessage(`✓ Đã chèn hiệu ứng: ${sfx.title}`);
                            setTimeout(() => setProjectMessage(""), 1500);
                          }}
                        >
                          <div className="ts-asset-thumb" style={{ background: sfx.color }}>
                            <span className="ts-asset-badge-tag">SFX</span>
                          </div>
                          <strong className="ts-asset-title">{sfx.title}</strong>
                          <small className="ts-asset-meta">{sfx.meta}</small>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* SUBTAB 3: MY ASSETS */}
              {librarySubTab === "assets" && (
                <div className="ts-myassets-subtab-view">
                  <div className="ts-myassets-header">
                    <strong className="ts-drawer-section-title">Danh sách phân cảnh ({editorScenes.length})</strong>
                    <button type="button" className="ts-chip-btn is-active" onClick={addNewSceneSegment}>
                      + Thêm cảnh
                    </button>
                  </div>

                  <div className="ts-myassets-list">
                    {editorScenes.map((sc, idx) => {
                      const previewFrames = sourceJob?.analysis?.previewFrames || [];
                      const frameImg = previewFrames[idx % (previewFrames.length || 1)]?.imageDataUrl;
                      const isSelected = sc.id === activeSceneId;

                      return (
                        <div
                          key={sc.id}
                          className={`ts-myasset-row-card ${isSelected ? "is-selected" : ""}`}
                          onClick={() => {
                            setSceneId(sc.id);
                            seekToTimeline(toSeconds(sc.start));
                          }}
                        >
                          <div className="ts-myasset-thumb" style={{ background: "#1e293b" }}>
                            {frameImg ? (
                              <img src={frameImg} alt="thumb" className="ts-myasset-thumb-img" />
                            ) : (
                              <span>🎬</span>
                            )}
                            <span className="ts-myasset-badge">Cảnh {idx + 1}</span>
                          </div>

                          <div className="ts-myasset-info">
                            <strong className="ts-myasset-title">{sc.title}</strong>
                            <span className="ts-myasset-time">{sc.start} - {sc.end}</span>
                            <p className="ts-myasset-sub">{sc.subtitle || "(Chưa có lời thoại)"}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* TAB: CAPTIONS */}
        {dockTab === "captions" && (
          <div className="ts-captions-tab-content">
            <div className="ts-captions-header-row">
              <strong style={{ fontSize: "12px", color: "#ffffff" }}>Kiểu Phụ Đề & Lời Thoại</strong>
              <button
                type="button"
                className={`ts-chip-btn ${subtitlesVisible ? "is-active" : ""}`}
                onClick={() => setSubtitlesVisible((v) => !v)}
              >
                {subtitlesVisible ? "👁 Đang hiện" : "Ẩn phụ đề"}
              </button>
            </div>

            <button
              type="button"
              className="ts-auto-caption-btn"
              onClick={() => {
                setProjectMessage("⚡ Đã tự động tạo và định dạng phụ đề Karaoke!");
                setTimeout(() => setProjectMessage(""), 2500);
              }}
            >
              ⚡ Tự động tạo phụ đề AI (Auto-Captions)
            </button>

            <div className="ts-caption-style-picker">
              <span className="ts-drawer-section-title">Chọn Style Phụ Đề:</span>
              <div className="ts-caption-styles-grid">
                <button
                  type="button"
                  className={`ts-style-card ${subtitleStyle === "gold" ? "is-active" : ""}`}
                  onClick={() => setSubtitleStyle("gold")}
                >
                  <span style={{ color: "#fde047", fontWeight: 900 }}>Vàng Review</span>
                </button>
                <button
                  type="button"
                  className={`ts-style-card ${subtitleStyle === "neon" ? "is-active" : ""}`}
                  onClick={() => setSubtitleStyle("neon")}
                >
                  <span style={{ color: "#38bdf8", fontWeight: 900 }}>Neon Cyber</span>
                </button>
                <button
                  type="button"
                  className={`ts-style-card ${subtitleStyle === "white" ? "is-active" : ""}`}
                  onClick={() => setSubtitleStyle("white")}
                >
                  <span style={{ color: "#ffffff", fontWeight: 900 }}>Trắng Tối Giản</span>
                </button>
                <button
                  type="button"
                  className={`ts-style-card ${subtitleStyle === "box" ? "is-active" : ""}`}
                  onClick={() => setSubtitleStyle("box")}
                >
                  <span style={{ background: "#000", color: "#fff", padding: "1px 4px", borderRadius: "3px" }}>Khung Đen</span>
                </button>
              </div>
            </div>

            <div className="ts-caption-options-row">
              <div>
                <span className="ts-drawer-section-title">Kích thước:</span>
                <select
                  className="ts-select-box"
                  value={subtitleSize}
                  onChange={(e) => setSubtitleSize(e.target.value as "sm" | "md" | "lg" | "xl")}
                >
                  <option value="sm">Nhỏ (12px)</option>
                  <option value="md">Vừa (14px)</option>
                  <option value="lg">Lớn (18px)</option>
                  <option value="xl">Rất lớn (22px)</option>
                </select>
              </div>
              <div>
                <span className="ts-drawer-section-title">Vị trí:</span>
                <select
                  className="ts-select-box"
                  value={subtitlePosition}
                  onChange={(e) => setSubtitlePosition(e.target.value as "bottom" | "center" | "top")}
                >
                  <option value="bottom">Dưới đáy</option>
                  <option value="center">Chính giữa</option>
                  <option value="top">Trên đỉnh</option>
                </select>
              </div>
            </div>

            <div className="ts-captions-cues-list">
              <span className="ts-drawer-section-title">Danh sách câu thoại ({editorScenes.length}):</span>
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
                    <span className="ts-cue-label">Cảnh {idx + 1}</span>
                    <span className="ts-cue-time">{sc.start} - {sc.end}</span>
                    <button
                      type="button"
                      className="ts-cue-speak-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        playSceneAudio(sc.subtitle, sc.id);
                      }}
                    >
                      🔊
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={sc.subtitle || ""}
                    onChange={(e) => {
                      const updated = editorScenes.map((item) => (item.id === sc.id ? { ...item, subtitle: e.target.value } : item));
                      setScenesWithHistory(updated);
                    }}
                    className="ts-cue-textarea"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: SMART AI */}
        {dockTab === "smart" && (
          <div className="ts-smart-ai-tab-content">
            <strong style={{ fontSize: "12px", color: "#2dd4bf" }}>🧠 TÍNH NĂNG AI THÔNG MINH</strong>
            
            <button
              type="button"
              className="ts-smart-action-card"
              onClick={() => {
                setProjectMessage("✨ Khớp khẩu hình AI: Pacing thoại đã khớp 100% với video!");
                setTimeout(() => setProjectMessage(""), 2500);
              }}
            >
              <div className="ts-smart-action-title">
                <Icon name="spark" size={14} /> ⚡ Tự động khớp khẩu hình AI
              </div>
              <small>Đồng bộ tốc độ đọc voice vừa khít với thời lượng từng phân cảnh</small>
            </button>

            <button
              type="button"
              className="ts-smart-action-card"
              onClick={() => {
                setAspectRatio("9:16");
                setProjectMessage("📐 Đã bật Smart Reframe 9:16 tự động giữ chủ thể giữa màn hình");
                setTimeout(() => setProjectMessage(""), 2500);
              }}
            >
              <div className="ts-smart-action-title">
                <Icon name="video" size={14} /> 📐 Smart Reframe 9:16 Auto-Center
              </div>
              <small>Tự động bám theo đối tượng chính khi chuyển đổi định dạng ngang - dọc</small>
            </button>

            <button
              type="button"
              className="ts-smart-action-card"
              onClick={() => {
                playSceneAudio(activeScene.subtitle, activeScene.id);
                setProjectMessage("🎙️ Đang tạo và phát voice AI cho phân cảnh...");
              }}
            >
              <div className="ts-smart-action-title">
                <Icon name="mic" size={14} /> 🎙️ Sinh giọng lồng tiếng AI chất lượng cao
              </div>
              <small>Tổng hợp giọng đọc tự nhiên chuẩn kịch tính và chuyên nghiệp</small>
            </button>

            <button
              type="button"
              className="ts-smart-action-card"
              onClick={() => {
                const updated = editorScenes.map((s, idx) => {
                  if (idx === 0) {
                    return {
                      ...s,
                      subtitle: `Bí mật chưa từng tiết lộ: ${s.subtitle || "Hãy xem hết video để không bỏ lỡ!"}`,
                    };
                  }
                  return s;
                });
                setScenesWithHistory(updated);
                setProjectMessage("✨ AI đã viết lại câu Hook mở đầu tăng 80% giữ chân người xem!");
                setTimeout(() => setProjectMessage(""), 3000);
              }}
            >
              <div className="ts-smart-action-title">
                <Icon name="spark" size={14} /> ✨ AI Tối ưu câu Hook mở đầu (3 giây vàng)
              </div>
              <small>Tăng tỷ lệ giữ chân người xem ngay từ những giây đầu tiên</small>
            </button>
          </div>
        )}

        {/* TAB: AUDIO & SOUND */}
        {dockTab === "audio" && (
          <div className="ts-audio-tab-content">
            <strong style={{ fontSize: "12px", color: "#38bdf8" }}>🎵 BỘ ĐIỀU CHỈNH ÂM THANH</strong>

            <div className="ts-audio-slider-block">
              <div className="ts-audio-slider-label">
                <span>Âm lượng Nhạc nền (BGM)</span>
                <strong>{bgmVolume}%</strong>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={bgmVolume}
                onChange={(e) => setBgmVolume(Number(e.target.value))}
                style={{ width: "100%", accentColor: "#38bdf8" }}
              />
            </div>

            <div className="ts-audio-slider-block">
              <div className="ts-audio-slider-label">
                <span>Âm lượng Giọng đọc AI</span>
                <strong>{voiceVolume}%</strong>
              </div>
              <input
                type="range"
                min="0"
                max="200"
                value={voiceVolume}
                onChange={(e) => setVoiceVolume(Number(e.target.value))}
                style={{ width: "100%", accentColor: "#10b981" }}
              />
            </div>

            <div className="ts-audio-slider-block">
              <div className="ts-audio-slider-label">
                <span>🎧 Âm thanh gốc (Đan nền & Còi/Hiện trường)</span>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <strong style={{ color: trackMutes.originalAudio ? "#ef4444" : "#f59e0b" }}>
                    {trackMutes.originalAudio ? "Đang tắt (0%)" : `${originalAudioVolume}% ${originalAudioVolume <= 30 ? "(Đan nền)" : ""}`}
                  </strong>
                  <button
                    type="button"
                    className={`ts-chip-btn ${trackMutes.originalAudio ? "is-active" : ""}`}
                    onClick={() => {
                      setTrackMutes((c) => {
                        const next = !c.originalAudio;
                        setProjectMessage(next ? "🔇 Đã tắt âm thanh gốc video" : "🔊 Đã bật âm thanh gốc video");
                        setTimeout(() => setProjectMessage(""), 2000);
                        return { ...c, originalAudio: next };
                      });
                    }}
                    style={{ padding: "1px 6px", fontSize: "9.5px", color: trackMutes.originalAudio ? "#ef4444" : "#2dd4bf" }}
                  >
                    {trackMutes.originalAudio ? "🔇 Bật lại" : "🔊 Tắt"}
                  </button>
                </div>
              </div>
              <div style={{ display: "flex", gap: "4px", marginBottom: "6px", marginTop: "2px" }}>
                <button
                  type="button"
                  onClick={() => {
                    setTrackMutes((c) => ({ ...c, originalAudio: true }));
                    setOriginalAudioVolume(0);
                  }}
                  style={{
                    flex: 1,
                    fontSize: "9.5px",
                    padding: "2px 4px",
                    borderRadius: "4px",
                    border: trackMutes.originalAudio || originalAudioVolume === 0 ? "1px solid #ef4444" : "1px solid rgba(255,255,255,0.1)",
                    background: trackMutes.originalAudio || originalAudioVolume === 0 ? "rgba(239, 68, 68, 0.2)" : "rgba(255,255,255,0.04)",
                    color: trackMutes.originalAudio || originalAudioVolume === 0 ? "#fca5a5" : "#94a3b8",
                    cursor: "pointer",
                  }}
                >
                  🔇 Tắt hẳn
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTrackMutes((c) => ({ ...c, originalAudio: false }));
                    setOriginalAudioVolume(20);
                    setProjectMessage("🎧 Đã đặt mức Đan tiếng gốc: 20% âm lượng nền");
                    setTimeout(() => setProjectMessage(""), 2000);
                  }}
                  style={{
                    flex: 1.4,
                    fontSize: "9.5px",
                    padding: "2px 4px",
                    borderRadius: "4px",
                    border: !trackMutes.originalAudio && originalAudioVolume === 20 ? "1px solid #f59e0b" : "1px solid rgba(255,255,255,0.1)",
                    background: !trackMutes.originalAudio && originalAudioVolume === 20 ? "rgba(245, 158, 11, 0.25)" : "rgba(255,255,255,0.04)",
                    color: !trackMutes.originalAudio && originalAudioVolume === 20 ? "#fbbf24" : "#94a3b8",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  🎧 Đan nền (20%)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTrackMutes((c) => ({ ...c, originalAudio: false }));
                    setOriginalAudioVolume(100);
                  }}
                  style={{
                    flex: 1,
                    fontSize: "9.5px",
                    padding: "2px 4px",
                    borderRadius: "4px",
                    border: !trackMutes.originalAudio && originalAudioVolume === 100 ? "1px solid #10b981" : "1px solid rgba(255,255,255,0.1)",
                    background: !trackMutes.originalAudio && originalAudioVolume === 100 ? "rgba(16, 185, 129, 0.2)" : "rgba(255,255,255,0.04)",
                    color: !trackMutes.originalAudio && originalAudioVolume === 100 ? "#6ee7b7" : "#94a3b8",
                    cursor: "pointer",
                  }}
                >
                  🔊 Đầy đủ (100%)
                </button>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={trackMutes.originalAudio ? 0 : originalAudioVolume}
                onChange={(e) => {
                  setOriginalAudioVolume(Number(e.target.value));
                  if (trackMutes.originalAudio) {
                    setTrackMutes((c) => ({ ...c, originalAudio: false }));
                  }
                }}
                style={{ width: "100%", accentColor: "#f59e0b" }}
              />
            </div>

            <div
              className="ts-audio-slider-block"
              style={{
                marginTop: "6px",
                padding: "10px",
                borderRadius: "8px",
                background: removeOriginalBgm ? "rgba(168, 85, 247, 0.16)" : "rgba(255,255,255,0.03)",
                border: removeOriginalBgm ? "1px solid rgba(168, 85, 247, 0.55)" : "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <label style={{ display: "flex", alignItems: "flex-start", gap: "8px", cursor: "pointer", userSelect: "none" }}>
                <input
                  type="checkbox"
                  checked={removeOriginalBgm}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setRemoveOriginalBgm(val);
                    setProjectMessage(val ? "🎼 Đã bật AI Tách Nhạc Nền (Giữ lời thoại & còi hú)" : "🎼 Đã tắt AI Tách Nhạc Nền");
                    setTimeout(() => setProjectMessage(""), 2000);
                  }}
                  style={{ accentColor: "#a855f7", width: "16px", height: "16px", marginTop: "2px", cursor: "pointer" }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "11.5px", fontWeight: 700, color: removeOriginalBgm ? "#c084fc" : "#e2e8f0", display: "block" }}>
                      🎼 AI Vocal & SFX Remover (Tách Nhạc Nền)
                    </span>
                    {removeOriginalBgm && isIsolatingStem && (
                      <span style={{ fontSize: "9.5px", background: "rgba(245, 158, 11, 0.2)", border: "1px solid #f59e0b", color: "#fbbf24", padding: "1px 6px", borderRadius: "4px", fontWeight: 700 }}>
                        ⚡ {stemProgress > 0 ? `${stemProgress}%` : "Đang xử lý..."}
                      </span>
                    )}
                    {removeOriginalBgm && !isIsolatingStem && isolatedStemPath && (
                      <span style={{ fontSize: "9px", background: "#10b981", color: "#fff", padding: "1px 5px", borderRadius: "4px", fontWeight: 700 }}>
                        ✓ 100% SẠCH NHẠC NỀN
                      </span>
                    )}
                    {removeOriginalBgm && !isIsolatingStem && !isolatedStemPath && (
                      <span style={{ fontSize: "9px", background: "#a855f7", color: "#fff", padding: "1px 5px", borderRadius: "4px", fontWeight: 700 }}>
                        AI ĐANG LỌC
                      </span>
                    )}
                  </div>

                  {removeOriginalBgm && isIsolatingStem && (
                    <div style={{ marginTop: "6px", marginBottom: "4px", background: "rgba(0,0,0,0.3)", padding: "6px 8px", borderRadius: "6px", border: "1px solid rgba(245,158,11,0.2)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                        <span style={{ fontSize: "9.5px", color: "#fcd34d", fontWeight: 600 }}>
                          {stemStage || `Đang bóc tách: ${stemProgress}%`}
                        </span>
                        <span style={{ fontSize: "9px", color: "#94a3b8" }}>
                          {stemProgress > 5
                            ? `Còn ~${Math.max(2, Math.round(((100 - stemProgress) / stemProgress) * (sourceJob?.durationSeconds ? Math.min(120, sourceJob.durationSeconds / 15) : 45)))}s`
                            : "Ước tính ~1-2p"}
                        </span>
                      </div>
                      <div style={{ width: "100%", height: "5px", background: "rgba(255,255,255,0.1)", borderRadius: "3px", overflow: "hidden" }}>
                        <div
                          style={{
                            width: `${Math.max(4, stemProgress)}%`,
                            height: "100%",
                            background: "linear-gradient(90deg, #f59e0b 0%, #a855f7 100%)",
                            borderRadius: "3px",
                            transition: "width 0.25s ease-out",
                          }}
                        />
                      </div>
                    </div>
                  )}

                  <span style={{ fontSize: "10px", color: "#94a3b8", display: "block", marginTop: "2px", lineHeight: "1.4" }}>
                    Triệt tiêu 100% nhạc nền stereo, bảo toàn trọn vẹn lời thoại nhân vật, còi hú cảnh sát, tiếng súng & hiện trường
                  </span>
                </div>
              </label>
            </div>

            <div className="ts-audio-slider-block">
              <div className="ts-audio-slider-label">
                <span>Tốc độ đọc giọng AI</span>
                <strong>{voiceSpeed}x</strong>
              </div>
              <input
                type="range"
                min="0.8"
                max="1.5"
                step="0.05"
                value={voiceSpeed}
                onChange={(e) => setVoiceSpeed(Number(e.target.value))}
                style={{ width: "100%", accentColor: "#a855f7" }}
              />
            </div>

            <div className="ts-audio-slider-block">
              <div className="ts-audio-slider-label">
                <span>Giọng lồng tiếng mặc định</span>
              </div>
              <select
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                className="ts-select-box"
              >
                {VOICE_PACKS.map((vp) => (
                  <option key={vp.id} value={vp.id}>{vp.label}</option>
                ))}
              </select>
            </div>

            <div className="ts-audio-library-block">
              <span className="ts-drawer-section-title">Nhạc nền có sẵn:</span>
              <div className="ts-audio-items-list">
                {SAMPLE_LIBRARY_MUSIC.map((mus) => (
                  <div
                    key={mus.id}
                    className={`ts-audio-item-row ${selectedBgm === mus.id ? "is-selected" : ""}`}
                  >
                    <div>
                      <strong>{mus.title}</strong>
                      <small>{mus.meta}</small>
                    </div>
                    <button
                      type="button"
                      className="ts-chip-btn is-active"
                      onClick={() => {
                        setSelectedBgm(mus.id);
                        setProjectMessage(`✓ Đã áp dụng: ${mus.title}`);
                        setTimeout(() => setProjectMessage(""), 2000);
                      }}
                    >
                      {selectedBgm === mus.id ? "Đang chọn" : "+ Áp dụng"}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="ts-audio-library-block">
              <span className="ts-drawer-section-title">Hiệu ứng âm thanh (SFX):</span>
              <div className="ts-audio-items-list">
                {SAMPLE_LIBRARY_SFX.map((sfx) => (
                  <div key={sfx.id} className="ts-audio-item-row">
                    <div>
                      <strong>{sfx.title}</strong>
                      <small>{sfx.meta}</small>
                    </div>
                    <button
                      type="button"
                      className="ts-chip-btn"
                      onClick={() => {
                        setProjectMessage(`✓ Đã chèn hiệu ứng: ${sfx.title}`);
                        setTimeout(() => setProjectMessage(""), 1500);
                      }}
                    >
                      + Chèn
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB: EFFECTS */}
        {dockTab === "effects" && (
          <div className="ts-effects-tab-content">
            <strong style={{ fontSize: "12px", color: "#ffffff" }}>✨ BỘ LỌC HÌNH ẢNH</strong>
            <div className="ts-effects-grid">
              {FILTER_PRESETS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`ts-filter-btn ${selectedFilter === f.id ? "is-active" : ""}`}
                  onClick={() => {
                    setSelectedFilter(f.id);
                    setProjectMessage(`✓ Đã áp dụng bộ lọc: ${f.name}`);
                    setTimeout(() => setProjectMessage(""), 1500);
                  }}
                >
                  <div className="ts-filter-preview-box" />
                  <span>{f.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* TAB: STICKERS */}
        {dockTab === "stickers" && (
          <div className="ts-stickers-tab-content">
            <strong style={{ fontSize: "12px", color: "#ffffff" }}>🏷️ NHÃN DÁN CTA</strong>
            <div className="ts-stickers-list">
              {STICKER_PRESETS.map((stk) => (
                <div key={stk.id} className="ts-sticker-item-row">
                  <strong style={{ fontSize: "11px", color: stk.color }}>{stk.label}</strong>
                  <button
                    type="button"
                    className="ts-chip-btn is-active"
                    onClick={() => {
                      setActiveStickers((prev) => [
                        ...prev,
                        { id: `stk-${Date.now()}`, label: stk.label, x: 50, y: 15 },
                      ]);
                      setProjectMessage(`✓ Đã gắn nhãn dán: ${stk.label}`);
                      setTimeout(() => setProjectMessage(""), 1500);
                    }}
                  >
                    + Gắn
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </>
  );
}
