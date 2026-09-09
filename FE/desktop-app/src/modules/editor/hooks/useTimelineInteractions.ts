import { useCallback, useState } from "react";
import type { Job } from "../../../core/types";
import type { EditorScene } from "../editor.types";
import { formatSeconds, stripSceneMetadata, toSeconds } from "../utils/editorTime";

export interface UseTimelineInteractionsParams {
  editorScenes: EditorScene[];
  setScenesWithHistory: (scenes: EditorScene[]) => void;
  activeSceneId: string;
  activeScene: EditorScene;
  setSceneId: (id: string) => void;
  sequenceDuration: number;
  zoomLevel: number;
  playheadSeconds: number;
  seekToTimeline: (seconds: number) => void;
  trackLocks: Record<string, boolean>;
  timelineViewportRef: React.RefObject<HTMLDivElement | null>;
  voiceSpeed: number;
  sourceJob?: Job;
  onUpdateJob?: (jobId: string, values: Partial<Job>) => void;
  setProjectMessage: (msg: string) => void;
}

export function useTimelineInteractions({
  editorScenes,
  setScenesWithHistory,
  activeSceneId,
  activeScene,
  setSceneId,
  sequenceDuration,
  zoomLevel,
  playheadSeconds,
  seekToTimeline,
  trackLocks,
  timelineViewportRef,
  voiceSpeed,
  sourceJob,
  onUpdateJob,
  setProjectMessage,
}: UseTimelineInteractionsParams) {
  const [draggedSceneIdx, setDraggedSceneIdx] = useState<number | null>(null);
  const [dragOverSceneIdx, setDragOverSceneIdx] = useState<number | null>(null);
  const [activeTrimming, setActiveTrimming] = useState<{
    sceneId: string;
    handle: "left" | "right" | "slide";
    trackType?: "voice" | "visuals" | "captions";
    initialDur: number;
    tempScenes: EditorScene[];
  } | null>(null);

  // Split active scene at playhead
  const splitActiveScene = useCallback(() => {
    if (trackLocks.video) {
      setProjectMessage("⚠️ Track Video đang bị khóa. Mở khóa để cắt.");
      setTimeout(() => setProjectMessage(""), 2500);
      return;
    }

    let targetIdx = -1;
    let localSplitSec = 0;

    for (let i = 0; i < editorScenes.length; i++) {
      const s = editorScenes[i];
      const startS = toSeconds(s.start);
      const endS = toSeconds(s.end);
      if (playheadSeconds > startS + 0.3 && playheadSeconds < endS - 0.3) {
        targetIdx = i;
        localSplitSec = playheadSeconds;
        break;
      }
    }

    if (targetIdx === -1) {
      setProjectMessage("Di chuyển con trỏ Playhead vào giữa một phân cảnh (cách 2 đầu > 0.3s) để tách.");
      setTimeout(() => setProjectMessage(""), 3000);
      return;
    }

    const orig = editorScenes[targetIdx];
    const splitTimeStr = formatSeconds(localSplitSec);

    const sceneA: EditorScene = {
      ...orig,
      id: `${orig.id}-part1`,
      end: splitTimeStr,
      title: `${orig.title} (Đoạn 1)`,
    };
    const sceneB: EditorScene = {
      ...orig,
      id: `${orig.id}-part2`,
      start: splitTimeStr,
      title: `${orig.title} (Đoạn 2)`,
    };

    const nextScenes = [...editorScenes];
    nextScenes.splice(targetIdx, 1, sceneA, sceneB);
    setScenesWithHistory(nextScenes);
    setSceneId(sceneB.id);
    setProjectMessage(`✓ Đã tách phân cảnh tại mốc ${splitTimeStr}`);
    setTimeout(() => setProjectMessage(""), 2500);
  }, [trackLocks.video, editorScenes, playheadSeconds, setScenesWithHistory, setSceneId, setProjectMessage]);

  // Delete active scene
  const deleteActiveScene = useCallback(() => {
    if (editorScenes.length <= 1) {
      setProjectMessage("Cần giữ lại ít nhất 1 cảnh trên timeline.");
      setTimeout(() => setProjectMessage(""), 2500);
      return;
    }
    const nextScenes = editorScenes.filter((s) => s.id !== activeSceneId);
    setScenesWithHistory(nextScenes);
    setSceneId(nextScenes[0].id);
    setProjectMessage("✓ Đã xóa cảnh khỏi timeline.");
    setTimeout(() => setProjectMessage(""), 2500);
  }, [editorScenes, activeSceneId, setScenesWithHistory, setSceneId, setProjectMessage]);

  // Add new scene segment
  const addNewSceneSegment = useCallback(() => {
    const lastScene = editorScenes[editorScenes.length - 1];
    const newStart = lastScene ? lastScene.end : "00:00";
    const startNum = toSeconds(newStart);
    const newEnd = formatSeconds(startNum + 5);
    const newScene: EditorScene = {
      id: `scene-custom-${Date.now()}`,
      start: newStart,
      end: newEnd,
      title: `Cảnh ${editorScenes.length + 1}: Bổ sung`,
      detail: "Phân cảnh mới thêm vào timeline",
      subtitle: "Nội dung lời thoại bổ sung cho phân cảnh mới.",
      accent: editorScenes.length % 2 === 0 ? "cyan" : "purple",
    };
    const nextScenes = [...editorScenes, newScene];
    setScenesWithHistory(nextScenes);
    setSceneId(newScene.id);
    seekToTimeline(startNum);
    setProjectMessage(`✓ Đã thêm phân cảnh mới: "${newScene.title}"`);
    setTimeout(() => setProjectMessage(""), 2500);
  }, [editorScenes, setScenesWithHistory, setSceneId, seekToTimeline, setProjectMessage]);

  // Auto-align 1:1 Voice, Visuals, and Subtitles
  const handleAutoAlignVoiceAndVisuals = useCallback(() => {
    if (!editorScenes.length) {
      setProjectMessage("⚠️ Không có phân cảnh nào trên timeline để căn chỉnh.");
      setTimeout(() => setProjectMessage(""), 2500);
      return;
    }
    let cursor = 0;
    const speed = voiceSpeed > 0 ? voiceSpeed : 1.0;
    const nextScenes = editorScenes.map((s) => {
      const rawText = stripSceneMetadata(s.subtitle || s.voiceover || s.translation || s.detail || "");
      const words = rawText.split(/\s+/).filter(Boolean).length;
      const sceneDur = Math.max(3.0, Math.round((words / (3.65 * speed)) * 10) / 10);
      const startSec = cursor;
      const endSec = cursor + sceneDur;
      cursor = endSec;

      const srcStartSec = toSeconds(s.sourceStart || s.start);
      const srcEndSec = srcStartSec + sceneDur;

      return {
        ...s,
        start: formatSeconds(startSec),
        end: formatSeconds(endSec),
        timeStart: startSec,
        timeEnd: endSec,
        voiceStart: formatSeconds(startSec, true),
        voiceEnd: formatSeconds(endSec, true),
        captionStart: formatSeconds(startSec, true),
        captionEnd: formatSeconds(endSec, true),
        sourceStart: formatSeconds(srcStartSec),
        sourceEnd: formatSeconds(srcEndSec),
        sourceTimeStart: srcStartSec,
        sourceTimeEnd: srcEndSec,
        subtitle: rawText,
        voiceover: rawText,
        translation: rawText,
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
    setProjectMessage(`🎯 Đã tự động căn khớp 100% thời lượng Voice, Hình ảnh và Phụ đề (${formatSeconds(cursor)})!`);
    setTimeout(() => setProjectMessage(""), 3500);
  }, [editorScenes, voiceSpeed, setScenesWithHistory, onUpdateJob, sourceJob, setProjectMessage]);

  // Trim start handler
  const handleTrimStart = useCallback(
    (
      e: React.MouseEvent,
      scene: EditorScene,
      handle: "left" | "right",
      trackType: "voice" | "visuals" | "captions" = "visuals"
    ) => {
      e.stopPropagation();
      e.preventDefault();
      const viewport = timelineViewportRef.current;
      if (!viewport) return;
      const rect = viewport.getBoundingClientRect();
      const startX = e.clientX;
      const initStart = toSeconds(
        trackType === "voice"
          ? scene.voiceStart || scene.start
          : trackType === "captions"
          ? scene.captionStart || scene.start
          : scene.start
      );
      const initEnd = toSeconds(
        trackType === "voice"
          ? scene.voiceEnd || scene.end
          : trackType === "captions"
          ? scene.captionEnd || scene.end
          : scene.end
      );
      const initDur = Math.max(0.2, initEnd - initStart);
      const contentEl = viewport.querySelector<HTMLElement>(
        ".ts-lanes-content"
      );
      const totalWidth =
        (contentEl ? contentEl.clientWidth : rect.width * zoomLevel) ||
        rect.width;
      const secPerPx = sequenceDuration / totalWidth;

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      let rafId: number | null = null;

      const onPointerMove = (moveEvt: MouseEvent) => {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          const deltaX = moveEvt.clientX - startX;
          const deltaSec = deltaX * secPerPx;
          let nextScenes = [...editorScenes];
          if (handle === "right") {
            const newDur = Math.max(0.2, initDur + deltaSec);
            const newEnd = formatSeconds(initStart + newDur, true);
            nextScenes = editorScenes.map((s) => {
              if (s.id !== scene.id) return s;
              if (trackType === "voice") {
                return { ...s, voiceEnd: newEnd, voiceStart: s.voiceStart || s.start };
              }
              if (trackType === "captions") {
                return { ...s, captionEnd: newEnd, captionStart: s.captionStart || s.start };
              }
              return { ...s, end: newEnd };
            });
          } else {
            const newStartNum = Math.max(0, Math.min(initEnd - 0.2, initStart + deltaSec));
            const newStart = formatSeconds(newStartNum, true);
            nextScenes = editorScenes.map((s) => {
              if (s.id !== scene.id) return s;
              if (trackType === "voice") {
                return { ...s, voiceStart: newStart, voiceEnd: s.voiceEnd || s.end };
              }
              if (trackType === "captions") {
                return { ...s, captionStart: newStart, captionEnd: s.captionEnd || s.end };
              }
              return { ...s, start: newStart };
            });
          }

          setActiveTrimming({
            sceneId: scene.id,
            handle,
            trackType,
            initialDur: initDur,
            tempScenes: nextScenes,
          });
        });
      };

      const onPointerUp = (upEvt: MouseEvent) => {
        if (rafId) cancelAnimationFrame(rafId);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        window.removeEventListener("mousemove", onPointerMove);
        window.removeEventListener("mouseup", onPointerUp);

        const deltaX = upEvt.clientX - startX;
        const deltaSec = deltaX * secPerPx;
        let finalScenes = [...editorScenes];
        if (handle === "right") {
          const newDur = Math.max(0.2, initDur + deltaSec);
          const newEnd = formatSeconds(initStart + newDur, true);
          finalScenes = editorScenes.map((s) => {
            if (s.id !== scene.id) return s;
            if (trackType === "voice") {
              return { ...s, voiceEnd: newEnd, voiceStart: s.voiceStart || s.start };
            }
            if (trackType === "captions") {
              return { ...s, captionEnd: newEnd, captionStart: s.captionStart || s.start };
            }
            return { ...s, end: newEnd };
          });
        } else {
          const newStartNum = Math.max(0, Math.min(initEnd - 0.2, initStart + deltaSec));
          const newStart = formatSeconds(newStartNum, true);
          finalScenes = editorScenes.map((s) => {
            if (s.id !== scene.id) return s;
            if (trackType === "voice") {
              return { ...s, voiceStart: newStart, voiceEnd: s.voiceEnd || s.end };
            }
            if (trackType === "captions") {
              return { ...s, captionStart: newStart, captionEnd: s.captionEnd || s.end };
            }
            return { ...s, start: newStart };
          });
        }

        setScenesWithHistory(finalScenes);
        setActiveTrimming(null);
        const trackName = trackType === "voice" ? "âm thanh" : trackType === "captions" ? "phụ đề" : "cảnh";
        setProjectMessage(`✓ Đã chỉnh thời lượng ${trackName} độc lập`);
        setTimeout(() => setProjectMessage(""), 2000);
      };

      window.addEventListener("mousemove", onPointerMove);
      window.addEventListener("mouseup", onPointerUp);
    },
    [editorScenes, sequenceDuration, zoomLevel, timelineViewportRef, setScenesWithHistory, setProjectMessage]
  );

  // Clip slide start handler
  const handleClipSlideStart = useCallback(
    (
      e: React.MouseEvent,
      scene: EditorScene,
      trackType: "voice" | "visuals" | "captions" = "visuals"
    ) => {
      if (e.button !== 0) return;
      if ((e.target as HTMLElement).classList.contains("ts-clip-handle")) return;

      e.stopPropagation();
      e.preventDefault();
      const viewport = timelineViewportRef.current;
      if (!viewport) return;
      const rect = viewport.getBoundingClientRect();
      const startX = e.clientX;
      const initStart = toSeconds(
        trackType === "voice"
          ? scene.voiceStart || scene.start
          : trackType === "captions"
          ? scene.captionStart || scene.start
          : scene.start
      );
      const initEnd = toSeconds(
        trackType === "voice"
          ? scene.voiceEnd || scene.end
          : trackType === "captions"
          ? scene.captionEnd || scene.end
          : scene.end
      );
      const dur = Math.max(0.2, initEnd - initStart);
      const contentEl = viewport.querySelector<HTMLElement>(".ts-lanes-content");
      const totalWidth = (contentEl ? contentEl.clientWidth : rect.width * zoomLevel) || rect.width;
      const secPerPx = sequenceDuration / totalWidth;

      document.body.style.cursor = "grab";
      document.body.style.userSelect = "none";

      let rafId: number | null = null;

      const onPointerMove = (moveEvt: MouseEvent) => {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          const deltaX = moveEvt.clientX - startX;
          const deltaSec = deltaX * secPerPx;
          const newStart = Math.max(0, initStart + deltaSec);
          const newEnd = newStart + dur;

          const nextScenes = editorScenes.map((s) => {
            if (s.id !== scene.id) return s;
            if (trackType === "voice") {
              return {
                ...s,
                voiceStart: formatSeconds(newStart, true),
                voiceEnd: formatSeconds(newEnd, true),
              };
            }
            if (trackType === "captions") {
              return {
                ...s,
                captionStart: formatSeconds(newStart, true),
                captionEnd: formatSeconds(newEnd, true),
              };
            }
            return {
              ...s,
              start: formatSeconds(newStart, true),
              end: formatSeconds(newEnd, true),
            };
          });

          setActiveTrimming({
            sceneId: scene.id,
            handle: "slide",
            trackType,
            initialDur: dur,
            tempScenes: nextScenes,
          });
        });
      };

      const onPointerUp = (upEvt: MouseEvent) => {
        if (rafId) cancelAnimationFrame(rafId);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        window.removeEventListener("mousemove", onPointerMove);
        window.removeEventListener("mouseup", onPointerUp);

        const deltaX = upEvt.clientX - startX;
        const deltaSec = deltaX * secPerPx;
        const newStart = Math.max(0, initStart + deltaSec);
        const newEnd = newStart + dur;

        const finalScenes = editorScenes.map((s) => {
          if (s.id !== scene.id) return s;
          if (trackType === "voice") {
            return {
              ...s,
              voiceStart: formatSeconds(newStart, true),
              voiceEnd: formatSeconds(newEnd, true),
            };
          }
          if (trackType === "captions") {
            return {
              ...s,
              captionStart: formatSeconds(newStart, true),
              captionEnd: formatSeconds(newEnd, true),
            };
          }
          return {
            ...s,
            start: formatSeconds(newStart, true),
            end: formatSeconds(newEnd, true),
          };
        });

        setScenesWithHistory(finalScenes);
        setActiveTrimming(null);
        setSceneId(scene.id);
        seekToTimeline(newStart);
        const trackName = trackType === "voice" ? "âm thanh" : trackType === "captions" ? "phụ đề" : "cảnh";
        setProjectMessage(`✓ Đã căn vị trí ${trackName}: ${formatSeconds(newStart)} - ${formatSeconds(newEnd)}`);
        setTimeout(() => setProjectMessage(""), 2000);
      };

      window.addEventListener("mousemove", onPointerMove);
      window.addEventListener("mouseup", onPointerUp);
    },
    [editorScenes, sequenceDuration, zoomLevel, timelineViewportRef, setScenesWithHistory, setSceneId, seekToTimeline, setProjectMessage]
  );

  return {
    draggedSceneIdx,
    setDraggedSceneIdx,
    dragOverSceneIdx,
    setDragOverSceneIdx,
    activeTrimming,
    setActiveTrimming,
    splitActiveScene,
    deleteActiveScene,
    addNewSceneSegment,
    handleAutoAlignVoiceAndVisuals,
    handleTrimStart,
    handleClipSlideStart,
  };
}
