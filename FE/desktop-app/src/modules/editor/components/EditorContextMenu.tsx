import React from "react";
import { createPortal } from "react-dom";
import type { EditorScene } from "../editor.types";
import { formatSeconds, toSeconds } from "../utils/editorTime";

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  sceneId: string;
  trackType: string;
}

export interface EditorContextMenuProps {
  contextMenu: ContextMenuState | null;
  setContextMenu: (menu: ContextMenuState | null) => void;
  activeScene: EditorScene;
  editorScenes: EditorScene[];
  setScenesWithHistory: (scenes: EditorScene[]) => void;
  setSceneId: (id: string) => void;
  splitActiveScene: () => void;
  deleteActiveScene: () => void;
  playSceneAudio: (text?: string, scId?: string, offsetSeconds?: number) => void;
  trackMutes: Record<string, boolean>;
  setTrackMutes: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  copiedScene: EditorScene | null;
  setCopiedScene: (scene: EditorScene | null) => void;
  setProjectMessage: (msg: string) => void;
}

export function EditorContextMenu({
  contextMenu,
  setContextMenu,
  activeScene,
  editorScenes,
  setScenesWithHistory,
  setSceneId,
  splitActiveScene,
  deleteActiveScene,
  playSceneAudio,
  trackMutes,
  setTrackMutes,
  copiedScene,
  setCopiedScene,
  setProjectMessage,
}: EditorContextMenuProps) {
  if (!contextMenu || !contextMenu.visible || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <>
      <div
        className="capcut-context-backdrop"
        onClick={() => setContextMenu(null)}
        onContextMenu={(e) => {
          e.preventDefault();
          setContextMenu(null);
        }}
      />
      <div
        className="capcut-context-menu"
        style={{
          top: `${contextMenu.y}px`,
          left: `${contextMenu.x}px`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="capcut-context-item"
          onClick={() => {
            setContextMenu(null);
            splitActiveScene();
          }}
        >
          <span>✂️ Tách cảnh tại Playhead</span>
          <span className="capcut-context-shortcut">S</span>
        </button>

        <button
          type="button"
          className="capcut-context-item"
          onClick={() => {
            setContextMenu(null);
            playSceneAudio(activeScene.subtitle, activeScene.id);
          }}
        >
          <span>🎙️ Nghe thử giọng đọc AI (TTS)</span>
        </button>

        <button
          type="button"
          className="capcut-context-item"
          onClick={() => {
            setContextMenu(null);
            const words = (activeScene.subtitle || "").trim().split(/\s+/).filter(Boolean).length;
            const estimatedSec = Math.max(2.5, Math.round((words / 3.2) * 10) / 10);
            let curTime = 0;
            const fittedScenes = editorScenes.map((s) => {
              let d = Math.max(0.5, toSeconds(s.end) - toSeconds(s.start));
              if (s.id === activeScene.id) {
                d = estimatedSec;
              }
              const sStr = formatSeconds(curTime);
              curTime += d;
              const eStr = formatSeconds(curTime);
              return { ...s, start: sStr, end: eStr };
            });
            setScenesWithHistory(fittedScenes);
            setProjectMessage(`⚡ Đã tự khớp thời lượng cảnh theo giọng đọc: ${estimatedSec}s`);
            setTimeout(() => setProjectMessage(""), 2500);
          }}
        >
          <span>⚡ Tự khớp thời lượng theo giọng AI</span>
        </button>

        <button
          type="button"
          className="capcut-context-item"
          onClick={() => {
            setContextMenu(null);
            setTrackMutes((c) => ({ ...c, bgm: !c.bgm }));
            setProjectMessage(trackMutes.bgm ? "✓ Đã bật lại nhạc nền" : "✓ Đã tắt nhạc nền");
            setTimeout(() => setProjectMessage(""), 2000);
          }}
        >
          <span>🎵 {trackMutes.bgm ? "Bật nhạc nền" : "Tắt nhạc nền"}</span>
        </button>

        <button
          type="button"
          className="capcut-context-item"
          onClick={() => {
            setContextMenu(null);
            setTrackMutes((c) => ({ ...c, voice1: !c.voice1, voice2: !c.voice2, voice3: !c.voice3 }));
            setProjectMessage(trackMutes.voice1 ? "✓ Đã bật lại vocal" : "✓ Đã tách vocal");
            setTimeout(() => setProjectMessage(""), 2000);
          }}
        >
          <span>🗣️ {trackMutes.voice1 ? "Bật vocal thoại" : "Tách vocal thoại"}</span>
        </button>

        <div className="capcut-context-divider" />

        <button
          type="button"
          className="capcut-context-item"
          onClick={() => {
            setContextMenu(null);
            const copyId = `scene-dup-${Date.now()}`;
            const dup: EditorScene = { ...activeScene, id: copyId, title: `${activeScene.title} (Nhân bản)` };
            setScenesWithHistory([...editorScenes, dup]);
            setSceneId(copyId);
            setProjectMessage(`✓ Đã nhân bản: "${dup.title}"`);
            setTimeout(() => setProjectMessage(""), 2000);
          }}
        >
          <span>📑 Nhân bản phân cảnh</span>
          <span className="capcut-context-shortcut">Ctrl+D</span>
        </button>

        <button
          type="button"
          className="capcut-context-item"
          onClick={() => {
            setContextMenu(null);
            setCopiedScene(activeScene);
            setProjectMessage(`📋 Đã sao chép: "${activeScene.title}"`);
            setTimeout(() => setProjectMessage(""), 2000);
          }}
        >
          <span>📋 Sao chép</span>
          <span className="capcut-context-shortcut">Ctrl+C</span>
        </button>

        <button
          type="button"
          className="capcut-context-item"
          onClick={() => {
            setContextMenu(null);
            if (copiedScene) {
              const newId = `scene-copy-${Date.now()}`;
              const newScene: EditorScene = { ...copiedScene, id: newId, title: `${copiedScene.title} (Bản sao)` };
              setScenesWithHistory([...editorScenes, newScene]);
              setSceneId(newId);
              setProjectMessage(`✓ Đã dán: "${newScene.title}"`);
              setTimeout(() => setProjectMessage(""), 2000);
            } else {
              setProjectMessage("Chưa có phân cảnh nào trong bộ nhớ tạm.");
              setTimeout(() => setProjectMessage(""), 2000);
            }
          }}
        >
          <span>📥 Dán</span>
          <span className="capcut-context-shortcut">Ctrl+V</span>
        </button>

        <div className="capcut-context-divider" />

        <button
          type="button"
          className="capcut-context-item is-danger"
          onClick={() => {
            setContextMenu(null);
            deleteActiveScene();
          }}
        >
          <span>🗑️ Xóa phân cảnh</span>
          <span className="capcut-context-shortcut">Del</span>
        </button>
      </div>
    </>,
    document.body
  );
}
