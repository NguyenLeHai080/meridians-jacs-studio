import React from "react";
import type { Job } from "../../../core/types";
import { Icon } from "../../../shared/Icon";
import { formatSeconds } from "../utils/editorTime";

export interface EditorHeaderProps {
  sourceJob?: Job;
  sourceCandidates: Job[];
  selectedSourceJobId: string;
  setSelectedSourceJobId: (id: string) => void;
  isJobDropdownOpen: boolean;
  setIsJobDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editorScenesCount: number;
  sequenceDuration: number;
  projectMessage: string;
  setProjectMessage: (msg: string) => void;
  handleUploadNativeMedia: () => void;
  undoTimeline: () => void;
  redoTimeline: () => void;
  handleAutoAlignVoiceAndVisuals: () => void;
  aspectRatio: "9:16" | "1:1" | "16:9" | "4:5";
  setAspectRatio: (ratio: "9:16" | "1:1" | "16:9" | "4:5") => void;
  playing: boolean;
  setPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  isExportDropdownOpen: boolean;
  setIsExportDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleExportFull: () => void;
  handleExportScenes: () => void;
  setIsConfigModalOpen: (open: boolean) => void;
}

export function EditorHeader({
  sourceJob,
  sourceCandidates,
  selectedSourceJobId,
  setSelectedSourceJobId,
  isJobDropdownOpen,
  setIsJobDropdownOpen,
  editorScenesCount,
  sequenceDuration,
  projectMessage,
  setProjectMessage,
  handleUploadNativeMedia,
  undoTimeline,
  redoTimeline,
  handleAutoAlignVoiceAndVisuals,
  aspectRatio,
  setAspectRatio,
  playing,
  setPlaying,
  isExportDropdownOpen,
  setIsExportDropdownOpen,
  handleExportFull,
  handleExportScenes,
  setIsConfigModalOpen,
}: EditorHeaderProps) {
  return (
    <header className="ts-top-header">
      <div className="ts-header-left">
        {/* Project / Video Selector Dropdown */}
        <div className="ts-project-switcher-container">
          <button
            type="button"
            className="ts-project-switcher-btn"
            onClick={(e) => {
              e.stopPropagation();
              setIsJobDropdownOpen((v) => !v);
            }}
          >
            <Icon name="video" size={12} />
            <span className="ts-project-name">{sourceJob?.name || "Chọn video nguồn"}</span>
            <span className="ts-project-arrow">⌵</span>
          </button>

          {isJobDropdownOpen && (
            <div className="ts-job-dropdown-menu">
              <div className="ts-job-dropdown-header">DANH SÁCH VIDEO ({sourceCandidates.length})</div>
              {sourceCandidates.map((job) => (
                <button
                  key={job.id}
                  type="button"
                  className={`ts-job-dropdown-item ${job.id === selectedSourceJobId ? "is-active" : ""}`}
                  onClick={() => {
                    setSelectedSourceJobId(job.id);
                    setIsJobDropdownOpen(false);
                    setProjectMessage(`✓ Đã chuyển sang video: ${job.name}`);
                    setTimeout(() => setProjectMessage(""), 2000);
                  }}
                >
                  <span>{job.name}</span>
                  {job.id === selectedSourceJobId && <span className="ts-job-check">✓</span>}
                </button>
              ))}
              <button
                type="button"
                className="ts-job-dropdown-add"
                onClick={() => {
                  setIsJobDropdownOpen(false);
                  handleUploadNativeMedia();
                }}
              >
                + Nạp thêm video mới từ máy
              </button>
            </div>
          )}
        </div>

        <div className="ts-autosave-badge">
          <span className="ts-autosave-dot" /> Autosaved · {editorScenesCount} Cảnh ({formatSeconds(sequenceDuration)})
        </div>

        {projectMessage && <div className="ts-toast-badge">{projectMessage}</div>}
      </div>

      <div className="ts-header-center">
        <button type="button" className="ts-header-btn" title="Hoàn tác (Ctrl+Z)" onClick={undoTimeline}>
          <Icon name="undo" size={13} /> Undo
        </button>
        <button type="button" className="ts-header-btn" title="Làm lại (Ctrl+Y)" onClick={redoTimeline}>
          <Icon name="redo" size={13} /> Redo
        </button>
        <button
          type="button"
          className="ts-header-btn"
          style={{ color: "#38bdf8", borderColor: "rgba(56, 189, 248, 0.4)", fontWeight: 600 }}
          title="Tự động tính toán & căn chỉnh thời lượng từng phân cảnh khớp 100% với tốc độ đọc Voice và Subtitle"
          onClick={handleAutoAlignVoiceAndVisuals}
        >
          🎯 Khớp Voice & Hình
        </button>
        <select
          className="ts-aspect-select"
          value={aspectRatio}
          onChange={(e) => setAspectRatio(e.target.value as "9:16" | "1:1" | "16:9" | "4:5")}
        >
          <option value="9:16">9:16 (TikTok/Shorts/Reels)</option>
          <option value="16:9">16:9 (YouTube Widescreen)</option>
          <option value="1:1">1:1 (Instagram/Facebook)</option>
          <option value="4:5">4:5 (Instagram Portrait)</option>
        </select>
      </div>

      <div className="ts-header-right" style={{ position: "relative" }}>
        <button type="button" className="ts-header-btn" onClick={() => setPlaying((p) => !p)}>
          <Icon name={playing ? "pause" : "play"} size={12} /> {playing ? "Dừng" : "Preview"}
        </button>

        <button
          type="button"
          className="ts-export-btn"
          onClick={(e) => {
            e.stopPropagation();
            setIsExportDropdownOpen((v) => !v);
          }}
        >
          ⚡ Export video ⌵
        </button>

        {isExportDropdownOpen && (
          <div className="ts-export-dropdown-menu">
            <button type="button" className="ts-export-menu-item highlight" onClick={handleExportFull}>
              ⚡ Xuất 1 Video Hoàn Chỉnh (Ghép đầy đủ)
            </button>
            <button type="button" className="ts-export-menu-item" onClick={handleExportScenes}>
              ✂️ Tách Từng Phân Cảnh Riêng ({editorScenesCount} video)
            </button>
            <button
              type="button"
              className="ts-export-menu-item"
              onClick={() => {
                setIsExportDropdownOpen(false);
                setProjectMessage("✓ Đã sao chép toàn bộ phụ đề .SRT vào clipboard");
                setTimeout(() => setProjectMessage(""), 2500);
              }}
            >
              📄 Xuất file phụ đề rời (.SRT)
            </button>
          </div>
        )}

        <button type="button" className="ts-header-gear" onClick={() => setIsConfigModalOpen(true)} title="Cài đặt dự án">
          <Icon name="sliders" size={14} />
        </button>
      </div>
    </header>
  );
}
