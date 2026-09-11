import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Job, NavKey } from "../../core/types";
import { getRuntime } from "../../core/runtime";
import type { EditorScene } from "./editor.types";
import { FILTER_PRESETS, MASK_PRESETS } from "./constants/presets";
import {
  computeActiveWordIndex,
  estimateSpokenDuration,
  fileUrl,
  formatSeconds,
  formatTimecodePrecise,
  stripSceneMetadata,
  toSeconds,
} from "./utils/editorTime";
import { EditorHeader } from "./components/EditorHeader";
import { EditorLeftDock } from "./components/EditorLeftDock";
import { EditorStagePlayer } from "./components/EditorStagePlayer";
import { EditorInspector } from "./components/EditorInspector";
import { EditorTimeline } from "./components/EditorTimeline";
import { EditorContextMenu, type ContextMenuState } from "./components/EditorContextMenu";
import { EditorConfigModal } from "./components/EditorConfigModal";
import { useEditorExport } from "./hooks/useEditorExport";
import { useEditorAudio } from "./hooks/useEditorAudio";
import { useTimelineInteractions } from "./hooks/useTimelineInteractions";
import { stopGlobalAudio } from "../../core/audio-player";

type Props = {
  jobs: Job[];
  onNavigate: (key: NavKey) => void;
  onAddJob?: (job: Job) => void;
  onUpdateJob?: (jobId: string, values: Partial<Job>) => void;
  sourceJobId?: string;
};

export function EditorWorkspace({
  jobs,
  onNavigate,
  onAddJob,
  onUpdateJob,
  sourceJobId: initialSourceJobId,
}: Props) {
  const [selectedSourceJobId, setSelectedSourceJobId] = useState(initialSourceJobId || "");

  useEffect(() => {
    if (initialSourceJobId) {
      setSelectedSourceJobId(initialSourceJobId);
    }
  }, [initialSourceJobId]);

  const [sceneId, setSceneId] = useState("");
  const [playing, setPlaying] = useState(false);
  const [playheadSeconds, setPlayheadSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "1:1" | "16:9" | "4:5">("9:16");
  const [fitMode, setFitMode] = useState<"fit" | "100" | "75" | "50">("fit");
  const [trackMutes, setTrackMutes] = useState<Record<string, boolean>>({
    originalAudio: false,
  });
  const [trackLocks, setTrackLocks] = useState<Record<string, boolean>>({});
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const [isJobDropdownOpen, setIsJobDropdownOpen] = useState(false);
  const [projectMessage, setProjectMessage] = useState("");

  // Timeline Studio Left Dock / Drawer Navigation
  const [dockTab, setDockTab] = useState<"captions" | "smart" | "audio" | "effects" | "stickers">("captions");
  const [librarySubTab, setLibrarySubTab] = useState<"upload" | "library" | "assets">("library");
  const [assetFilter, setAssetFilter] = useState<"all" | "images" | "videos" | "music" | "sfx">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ id: string; name: string; path: string }>>([]);

  // Timeline Studio Right Inspector
  const [inspectorTab, setInspectorTab] = useState<"basic" | "mask" | "filters" | "animation" | "script">("basic");
  const [scaleVal, setScaleVal] = useState(100);
  const [posX, setPosX] = useState(0);
  const [posY, setPosY] = useState(0);
  const [rotationVal, setRotationVal] = useState(0);
  const [opacityVal, setOpacityVal] = useState(100);
  const [speedVal, setSpeedVal] = useState(1.0);
  const [selectedFilter, setSelectedFilter] = useState("none");
  const [selectedMask, setSelectedMask] = useState("none");
  const [inAnimation, setInAnimation] = useState<"none" | "fade" | "zoom" | "slide" | "bounce">("none");
  const [outAnimation, setOutAnimation] = useState<"none" | "fade" | "zoom" | "slide">("none");

  // Captions & Stickers State
  const [activeStickers, setActiveStickers] = useState<Array<{ id: string; label: string; x: number; y: number }>>([]);
  const [subtitleStyle, setSubtitleStyle] = useState<"gold" | "white" | "neon" | "box">("gold");
  const [subtitleSize, setSubtitleSize] = useState<"sm" | "md" | "lg" | "xl">("md");
  const [subtitlePosition, setSubtitlePosition] = useState<"bottom" | "center" | "top">("bottom");
  const [subtitlesVisible, setSubtitlesVisible] = useState(true);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [copiedScene, setCopiedScene] = useState<EditorScene | null>(null);

  // Undo / Redo History
  const [editorScenes, setEditorScenes] = useState<EditorScene[]>([]);
  const [scenesHistory, setScenesHistory] = useState<EditorScene[][]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [mediaDuration, setMediaDuration] = useState<number>(0);
  const [originalAudioVolume, setOriginalAudioVolume] = useState(100);

  const timelineViewportRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const stemAudioRef = useRef<HTMLAudioElement>(null);
  const bgmAudioRef = useRef<HTMLAudioElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingPlayhead = useRef(false);

  const playheadLineElRef = useRef<HTMLDivElement>(null);
  const scrubProgressElRef = useRef<HTMLDivElement>(null);
  const scrubThumbElRef = useRef<HTMLDivElement>(null);
  const timecodeElRef = useRef<HTMLSpanElement>(null);
  const playheadSecondsRef = useRef(0);
  const lastUiUpdateRef = useRef(0);
  const lastSceneIdRef = useRef<string | null>(null);
  const lastSpokenSceneRef = useRef<string | null>(null);
  const loadedJobIdRef = useRef<string>("");

  const sourceCandidates = useMemo(
    () =>
      jobs.filter(
        (job) =>
          !job.id.startsWith("render-") &&
          !job.id.startsWith("export-") &&
          !Boolean(job.parentJobId) &&
          Boolean(job.analysis) &&
          (
            job.timelineReady === true ||
            (Array.isArray(job.timelineClips) && job.timelineClips.length > 0) ||
            (job.analysis?.storyPlan?.status === "approved") ||
            (job.requiresScriptApproval === false && Array.isArray(job.scenes) && job.scenes.length > 0) ||
            (Array.isArray(job.scenes) && job.scenes.length > 0) ||
            (Array.isArray(job.analysis?.scenes) && job.analysis.scenes.length > 0)
          )
      ),
    [jobs]
  );

  const sourceJob = useMemo(
    () =>
      (selectedSourceJobId ? jobs.find((j) => j.id === selectedSourceJobId) : undefined) ||
      sourceCandidates.find((job) => job.id === selectedSourceJobId) ||
      sourceCandidates[0],
    [jobs, sourceCandidates, selectedSourceJobId]
  );

  const defaultVoiceForLang = useCallback((lang?: string, gender?: string) => {
    const l = (lang || "vi").toLowerCase();
    const g = (gender || "male").toLowerCase();
    if (l.includes("en")) return g === "female" ? "en-jenny" : "en-guy";
    if (l.includes("zh") || l.includes("cn")) return g === "female" ? "zh-xiaoxiao" : "zh-yunxi";
    if (l.includes("ja")) return g === "female" ? "ja-nanami" : "ja-keita";
    if (l.includes("ko")) return g === "female" ? "ko-sunhi" : "ko-insoo";
    if (l.includes("fr")) return g === "female" ? "fr-denise" : "fr-henri";
    if (l.includes("de")) return g === "female" ? "de-katja" : "de-conrad";
    if (l.includes("es")) return g === "female" ? "es-elvira" : "es-alvaro";
    if (l.includes("th")) return g === "female" ? "th-premsuda" : "th-niwat";
    if (l.includes("id")) return g === "female" ? "id-gadis" : "id-ardhi";
    if (l.includes("ru")) return g === "female" ? "ru-svetlana" : "ru-dmitry";
    return g === "female" ? "vi-hoaimy" : "vi-namminh";
  }, []);

  // Use Audio & Stem Hook
  const {
    bgmVolume,
    setBgmVolume,
    voiceVolume,
    setVoiceVolume,
    voiceSpeed,
    setVoiceSpeed,
    selectedBgm,
    setSelectedBgm,
    customBgmPath,
    setCustomBgmPath,
    customBgmTitle,
    setCustomBgmTitle,
    bgmAudioPath,
    previewingSoundId,
    handlePickCustomBgm,
    selectedVoice,
    setSelectedVoice,
    speakingSceneId,
    sceneAudioDurations,
    removeOriginalBgm,
    setRemoveOriginalBgm,
    isolatedStemPath,
    isIsolatingStem,
    stemProgress,
    stemStage,
    triggerIsolateVocals,
    playSceneAudio,
    stopSceneAudio,
    playSfxPreview,
  } = useEditorAudio({
    sourceJob,
    editorScenes,
    muted,
    trackMutes,
    originalAudioVolume,
    speedVal,
    playing,
    playheadSeconds,
    videoRef,
    stemAudioRef,
    bgmAudioRef,
    defaultVoiceForLang,
  });

  // Sync initial configuration from sourceJob
  useEffect(() => {
    if (sourceJob) {
      if (sourceJob.aspectRatio) {
        setAspectRatio(sourceJob.aspectRatio as "9:16" | "1:1" | "16:9" | "4:5");
      }
      if (sourceJob.narratorVoice) {
        setSelectedVoice(sourceJob.narratorVoice);
      }
      if (sourceJob.subtitleStyle) {
        setSubtitleStyle(sourceJob.subtitleStyle as "gold" | "white" | "neon" | "box");
      }
      if (typeof sourceJob.subtitlesEnabled === "boolean") {
        setSubtitlesVisible(sourceJob.subtitlesEnabled);
      }
      if (sourceJob.keepOriginalAudio === false) {
        setTrackMutes((prev) => ({ ...prev, originalAudio: true, voice: false }));
        setOriginalAudioVolume(0);
      } else {
        const isNarratorOff = sourceJob.narratorEnabled === false;
        const defaultVol = isNarratorOff ? 100 : 20;
        const vol = typeof sourceJob.originalAudioVolume === "number" ? sourceJob.originalAudioVolume : defaultVol;
        setTrackMutes((prev) => ({ ...prev, originalAudio: false, voice: isNarratorOff }));
        setOriginalAudioVolume(vol);
      }
    }
  }, [sourceJob?.id, sourceJob?.keepOriginalAudio, sourceJob?.originalAudioVolume, sourceJob?.narratorEnabled, setSelectedVoice]);

  // Push history state on scene edits
  const setScenesWithHistory = useCallback(
    (newScenes: EditorScene[]) => {
      setEditorScenes(newScenes);
      setScenesHistory((prev) => [...prev.slice(0, historyIdx + 1), newScenes]);
      setHistoryIdx((prev) => prev + 1);
    },
    [historyIdx]
  );

  const undoTimeline = () => {
    if (historyIdx > 0) {
      const prevIdx = historyIdx - 1;
      setHistoryIdx(prevIdx);
      setEditorScenes(scenesHistory[prevIdx]);
      setProjectMessage("↺ Đã hoàn tác (Undo)");
      setTimeout(() => setProjectMessage(""), 1500);
    }
  };

  const redoTimeline = () => {
    if (historyIdx < scenesHistory.length - 1) {
      const nextIdx = historyIdx + 1;
      setHistoryIdx(nextIdx);
      setEditorScenes(scenesHistory[nextIdx]);
      setProjectMessage("↻ Đã làm lại (Redo)");
      setTimeout(() => setProjectMessage(""), 1500);
    }
  };

  // Populate scenes from sourceJob analysis or existing timeline scenes
  useEffect(() => {
    if (!sourceJob) {
      loadedJobIdRef.current = "";
      setEditorScenes([]);
      setScenesHistory([[]]);
      setHistoryIdx(0);
      return;
    }

    // If we already loaded this job and have scenes in memory, don't clobber active edits
    if (loadedJobIdRef.current === sourceJob.id && editorScenes.length > 0) {
      return;
    }
    loadedJobIdRef.current = sourceJob.id;

    const rawScenes = (Array.isArray(sourceJob.scenes) && sourceJob.scenes.length > 0)
      ? sourceJob.scenes
      : (sourceJob.analysis?.scenes || []);

    if (!rawScenes.length) {
      setEditorScenes([]);
      setScenesHistory([[]]);
      setHistoryIdx(0);
      return;
    }

    const isNarratorOff = sourceJob.narratorEnabled === false;
    let cursorTime = 0;
    const initial: EditorScene[] = rawScenes.map((s: any, idx: number) => {
      const sub =
        s.subtitle ||
        s.voiceover ||
        ((s as unknown as Record<string, string>).narration) ||
        s.translation ||
        s.detail ||
        "";

      let srcStartSec = s.sourceTimeStart ?? toSeconds(s.sourceStart || s.start);
      if (!Number.isFinite(srcStartSec) || srcStartSec < 0) {
        srcStartSec = Math.max(0, idx * 15);
      }

      let sceneDur = 5.0;
      if (s.duration && typeof s.duration === "number" && s.duration > 0) {
        sceneDur = s.duration;
      } else if (s.end && s.start) {
        const diff = toSeconds(s.end) - toSeconds(s.start);
        if (diff > 0.5) sceneDur = diff;
      } else if (isNarratorOff) {
        const rawSrcEnd = s.sourceTimeEnd ?? toSeconds(s.sourceEnd || s.end);
        if (Number.isFinite(rawSrcEnd) && rawSrcEnd > srcStartSec) {
          sceneDur = Math.max(1.0, Math.round((rawSrcEnd - srcStartSec) * 10) / 10);
        } else {
          sceneDur = 5.0;
        }
      } else {
        const estSec = estimateSpokenDuration(sub, voiceSpeed);
        sceneDur = Math.max(2.5, Math.round(estSec * 10) / 10);
      }

      const srcEndSec = s.sourceTimeEnd ?? (srcStartSec + sceneDur);
      const tStart = cursorTime;
      const tEnd = cursorTime + sceneDur;
      cursorTime = tEnd;

      return {
        id: s.id || `scene-${idx + 1}`,
        start: s.start || formatSeconds(tStart),
        end: s.end || formatSeconds(tEnd),
        sourceStart: s.sourceStart || formatSeconds(srcStartSec),
        sourceEnd: s.sourceEnd || formatSeconds(srcEndSec),
        sourceTimeStart: srcStartSec,
        sourceTimeEnd: srcEndSec,
        voiceStart: s.voiceStart || formatSeconds(tStart, true),
        voiceEnd: s.voiceEnd || formatSeconds(tEnd, true),
        captionStart: s.captionStart || formatSeconds(tStart, true),
        captionEnd: s.captionEnd || formatSeconds(tEnd, true),
        action_visual: s.action_visual || s.detail,
        title: s.title || `Cảnh ${idx + 1}`,
        detail: s.detail || "",
        subtitle: sub,
        accent: idx % 2 === 0 ? "cyan" : "purple",
      };
    });

    setEditorScenes(initial);
    setScenesHistory([initial]);
    setHistoryIdx(0);
  }, [sourceJob?.id, sourceJob?.analysis?.scenes, sourceJob?.scenes]);

  const activeSceneId = editorScenes.some((s) => s.id === sceneId)
    ? sceneId
    : editorScenes[0]?.id || "";

  const activeSceneIndex = editorScenes.findIndex((s) => s.id === activeSceneId);
  const activeScene = editorScenes[activeSceneIndex] || editorScenes[0] || {
    id: "empty",
    start: "00:00",
    end: "00:00",
    title: "Chưa có cảnh",
    detail: "",
    accent: "cyan",
  };

  // Sync active scene with playhead
  useEffect(() => {
    if (!editorScenes.length) return;
    const currentScene =
      editorScenes.find((item) => {
        const start = toSeconds(item.start);
        const end = toSeconds(item.end);
        return playheadSeconds >= start && playheadSeconds < end;
      }) || editorScenes[editorScenes.length - 1];

    if (currentScene && currentScene.id !== sceneId) {
      setSceneId(currentScene.id);
    }
  }, [playheadSeconds, editorScenes, sceneId]);

  // Use Timeline Interactions Hook
  const {
    activeTrimming,
    splitActiveScene,
    deleteActiveScene,
    addNewSceneSegment,
    handleAutoAlignVoiceAndVisuals,
    handleTrimStart,
    handleClipSlideStart,
  } = useTimelineInteractions({
    editorScenes,
    setScenesWithHistory,
    activeSceneId,
    activeScene,
    setSceneId,
    sequenceDuration: 0, // dynamic
    zoomLevel,
    playheadSeconds,
    seekToTimeline: (sec) => seekToTimeline(sec),
    trackLocks,
    timelineViewportRef,
    voiceSpeed,
    sceneAudioDurations,
    sourceJob,
    onUpdateJob,
    setProjectMessage,
  });

  const effectiveScenes = useMemo(() => {
    return activeTrimming?.tempScenes || editorScenes;
  }, [activeTrimming, editorScenes]);

  // Sequence Timeline Duration
  const sequenceDuration = useMemo(() => {
    const maxEnd = effectiveScenes.reduce((max, s) => {
      const vEnd = toSeconds(s.end);
      const aEnd = toSeconds(s.voiceEnd || s.end);
      const cEnd = toSeconds(s.captionEnd || s.end);
      return Math.max(max, vEnd, aEnd, cEnd);
    }, 0);
    if (maxEnd > 0) return Math.max(5, maxEnd);
    const videoDur =
      mediaDuration ||
      (videoRef.current?.duration && !isNaN(videoRef.current.duration) ? videoRef.current.duration : 0) ||
      sourceJob?.durationSeconds ||
      0;
    return Math.max(videoDur, 5);
  }, [effectiveScenes, mediaDuration, sourceJob?.durationSeconds]);

  // Compute layout for each clip on each track independently
  const clipLayouts = useMemo(() => {
    return effectiveScenes.map((item, idx) => {
      const visualStartSec = toSeconds(item.start);
      const visualEndSec = toSeconds(item.end);
      const visualDur = Math.max(0.2, visualEndSec - visualStartSec);
      const visualLeft = (visualStartSec / sequenceDuration) * 100;
      const visualWidth = Math.max(0.2, (visualDur / sequenceDuration) * 100);

      const voiceStartSec = toSeconds(item.voiceStart || item.start);
      const voiceEndSec = toSeconds(item.voiceEnd || item.end);
      const voiceDur = Math.max(0.2, voiceEndSec - voiceStartSec);
      const voiceLeft = (voiceStartSec / sequenceDuration) * 100;
      const voiceWidth = Math.max(0.2, (voiceDur / sequenceDuration) * 100);

      const captionStartSec = toSeconds(item.captionStart || item.start);
      const captionEndSec = toSeconds(item.captionEnd || item.end);
      const captionDur = Math.max(0.2, captionEndSec - captionStartSec);
      const captionLeft = (captionStartSec / sequenceDuration) * 100;
      const captionWidth = Math.max(0.2, (captionDur / sequenceDuration) * 100);

      return {
        scene: item,
        index: idx,
        visualStartSec,
        visualEndSec,
        visualLeft,
        visualWidth,
        visualDur,
        voiceStartSec,
        voiceEndSec,
        voiceLeft,
        voiceWidth,
        voiceDur,
        captionStartSec,
        captionEndSec,
        captionLeft,
        captionWidth,
        captionDur,
      };
    });
  }, [effectiveScenes, sequenceDuration]);

  // Unified Seek to Timeline Sequence Timestamp
  const seekToTimeline = useCallback(
    (targetSec: number) => {
      const clampedSec = Math.max(0, Math.min(sequenceDuration, targetSec));
      playheadSecondsRef.current = clampedSec;
      setPlayheadSeconds(clampedSec);

      const pct = sequenceDuration > 0 ? Math.min(100, Math.max(0, (clampedSec / sequenceDuration) * 100)) : 0;
      if (playheadLineElRef.current) playheadLineElRef.current.style.left = `${pct}%`;
      if (scrubProgressElRef.current) scrubProgressElRef.current.style.width = `${pct}%`;
      if (scrubThumbElRef.current) scrubThumbElRef.current.style.left = `${pct}%`;
      if (timecodeElRef.current)
        timecodeElRef.current.textContent = `${formatTimecodePrecise(clampedSec)} / ${formatTimecodePrecise(sequenceDuration)}`;

      if (!effectiveScenes.length) {
        if (videoRef.current) {
          videoRef.current.currentTime = clampedSec;
        }
        return;
      }

      const matched =
        effectiveScenes.find((item) => {
          const start = toSeconds(item.start);
          const end = toSeconds(item.end);
          return clampedSec >= start && clampedSec < end;
        }) || effectiveScenes[effectiveScenes.length - 1];

      if (matched) {
        setSceneId(matched.id);
        lastSceneIdRef.current = matched.id;
        const offset = Math.max(0, clampedSec - toSeconds(matched.start));
        const srcStartSec = toSeconds(matched.sourceStart || matched.start);
        const targetSrcTime = srcStartSec + offset;
        if (videoRef.current) {
          videoRef.current.currentTime = targetSrcTime;
        }
      } else if (videoRef.current) {
        videoRef.current.currentTime = clampedSec;
      }
    },
    [effectiveScenes, sequenceDuration]
  );

  // Sync state into refs for high-precision timeline loop without tearing down effects
  const effectiveScenesRef = useRef(effectiveScenes);
  effectiveScenesRef.current = effectiveScenes;
  const sequenceDurationRef = useRef(sequenceDuration);
  sequenceDurationRef.current = sequenceDuration;
  const speedValRef = useRef(speedVal);
  speedValRef.current = speedVal;
  const isLoopingRef = useRef(isLooping);
  isLoopingRef.current = isLooping;
  const trackMutesRef = useRef(trackMutes);
  trackMutesRef.current = trackMutes;
  const sceneAudioDurationsRef = useRef(sceneAudioDurations);
  sceneAudioDurationsRef.current = sceneAudioDurations;
  const voiceSpeedRef = useRef(voiceSpeed);
  voiceSpeedRef.current = voiceSpeed;
  const playSceneAudioRef = useRef(playSceneAudio);
  playSceneAudioRef.current = playSceneAudio;
  const stopSceneAudioRef = useRef(stopSceneAudio);
  stopSceneAudioRef.current = stopSceneAudio;
  const seekToTimelineRef = useRef(seekToTimeline);
  seekToTimelineRef.current = seekToTimeline;
  const lastPlayAttemptRef = useRef(0);

  // High-Precision 60FPS Virtual Timeline Playhead Engine
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const tick = () => {
      if (!playing) return;

      const now = performance.now();
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      const seqDur = sequenceDurationRef.current;
      const speed = speedValRef.current || 1.0;
      const scenes = effectiveScenesRef.current;

      if (!isDraggingPlayhead.current) {
        let currentPos = playheadSecondsRef.current + delta * speed;

        if (currentPos >= seqDur) {
          if (isLoopingRef.current) {
            seekToTimelineRef.current(0);
            return;
          }
          setPlaying(false);
          stopSceneAudioRef.current();
          if (videoRef.current && !videoRef.current.paused) {
            videoRef.current.pause();
          }
          currentPos = seqDur;
          playheadSecondsRef.current = seqDur;
          setPlayheadSeconds(seqDur);
          return;
        }

        playheadSecondsRef.current = currentPos;

        const pct = seqDur > 0 ? Math.min(100, Math.max(0, (currentPos / seqDur) * 100)) : 0;
        if (playheadLineElRef.current) playheadLineElRef.current.style.left = `${pct}%`;
        if (scrubProgressElRef.current) scrubProgressElRef.current.style.width = `${pct}%`;
        if (scrubThumbElRef.current) scrubThumbElRef.current.style.left = `${pct}%`;
        if (timecodeElRef.current)
          timecodeElRef.current.textContent = `${formatTimecodePrecise(currentPos)} / ${formatTimecodePrecise(seqDur)}`;

        let sceneChanged = false;
        if (scenes.length > 0) {
          const currentScene =
            scenes.find((s) => {
              const sStart = toSeconds(s.start);
              const sEnd = toSeconds(s.end);
              return currentPos >= sStart && currentPos < sEnd;
            }) || scenes[scenes.length - 1];

          if (currentScene && currentScene.id !== lastSceneIdRef.current) {
            lastSceneIdRef.current = currentScene.id;
            sceneChanged = true;
            setSceneId(currentScene.id);

            const srcStartSec = toSeconds(currentScene.sourceStart || currentScene.start);
            const offset = Math.max(0, currentPos - toSeconds(currentScene.start));
            const targetVideoTime = srcStartSec + offset;
            if (videoRef.current) {
              videoRef.current.currentTime = targetVideoTime;
            }

            const mutes = trackMutesRef.current;
            const isMutedLane = Boolean(mutes.voice) || Boolean(mutes.voice1);
            const sceneText = currentScene.subtitle || currentScene.voiceover || currentScene.translation || "";
            if (!isMutedLane && sceneText) {
              const voiceStart = toSeconds(currentScene.voiceStart || currentScene.start);
              const voiceOffset = Math.max(0, currentPos - voiceStart);
              const measuredDur = sceneAudioDurationsRef.current[currentScene.id];
              const estDur = estimateSpokenDuration(sceneText, voiceSpeedRef.current);
              const voiceDur = measuredDur && measuredDur > 0.2 ? measuredDur : estDur;

              if (voiceOffset < voiceDur) {
                lastSpokenSceneRef.current = currentScene.id;
                void playSceneAudioRef.current(sceneText, currentScene.id, voiceOffset);
              }
            }
          } else if (currentScene && videoRef.current) {
            // Keep video in sync without micro-stuttering if drift exceeds 0.35s
            const srcStartSec = toSeconds(currentScene.sourceStart || currentScene.start);
            const expectedVideoTime = srcStartSec + Math.max(0, currentPos - toSeconds(currentScene.start));
            if (Math.abs(videoRef.current.currentTime - expectedVideoTime) > 0.35) {
              videoRef.current.currentTime = expectedVideoTime;
            }
            if (videoRef.current.paused && now - lastPlayAttemptRef.current > 600) {
              lastPlayAttemptRef.current = now;
              void videoRef.current.play().catch(() => undefined);
            }
          }
        }

        if (sceneChanged || now - lastUiUpdateRef.current > 40) {
          lastUiUpdateRef.current = now;
          setPlayheadSeconds(currentPos);
        }
      }

      animId = requestAnimationFrame(tick);
    };

    if (playing) {
      lastTime = performance.now();
      playheadSecondsRef.current = playheadSeconds;
      lastUiUpdateRef.current = performance.now();
      lastPlayAttemptRef.current = performance.now();

      const scenes = effectiveScenesRef.current;
      if (scenes.length > 0) {
        const currentScene =
          scenes.find((s) => {
            const sStart = toSeconds(s.start);
            const sEnd = toSeconds(s.end);
            return playheadSeconds >= sStart && playheadSeconds < sEnd;
          }) || scenes[0];

        if (currentScene) {
          lastSceneIdRef.current = currentScene.id;
          const srcStartSec = toSeconds(currentScene.sourceStart || currentScene.start);
          const offset = Math.max(0, playheadSeconds - toSeconds(currentScene.start));
          const targetVideoTime = srcStartSec + offset;
          if (videoRef.current) {
            videoRef.current.currentTime = targetVideoTime;
            void videoRef.current.play().catch(() => undefined);
          }
          const mutes = trackMutesRef.current;
          const isMutedLane = Boolean(mutes.voice) || Boolean(mutes.voice1);
          const sceneText = currentScene.subtitle || currentScene.voiceover || currentScene.translation || "";
          if (!isMutedLane && sceneText) {
            const voiceStart = toSeconds(currentScene.voiceStart || currentScene.start);
            const voiceOffset = Math.max(0, playheadSeconds - voiceStart);
            const measuredDur = sceneAudioDurationsRef.current[currentScene.id];
            const estDur = estimateSpokenDuration(sceneText, voiceSpeedRef.current);
            const voiceDur = measuredDur && measuredDur > 0.2 ? measuredDur : estDur;

            if (voiceOffset < voiceDur) {
              lastSpokenSceneRef.current = currentScene.id;
              void playSceneAudioRef.current(sceneText, currentScene.id, voiceOffset);
            }
          }
        }
      } else if (videoRef.current) {
        videoRef.current.currentTime = playheadSeconds;
        void videoRef.current.play().catch(() => undefined);
      }

      animId = requestAnimationFrame(tick);
    } else {
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
      }
      stopSceneAudioRef.current();
      lastSpokenSceneRef.current = null;
    }

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [playing]);

  // Sync video playbackRate with speedVal
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speedVal || 1.0;
    }
  }, [speedVal]);

  // Mouse / Playhead scrub handlers
  const seekToClientX = useCallback(
    (clientX: number) => {
      const viewport = timelineViewportRef.current;
      if (!viewport) return;
      const rect = viewport.getBoundingClientRect();
      const contentEl = viewport.querySelector<HTMLElement>(".ts-lanes-content");
      const totalWidth = (contentEl ? contentEl.clientWidth : rect.width * zoomLevel) || rect.width;
      const clickX = clientX - rect.left + viewport.scrollLeft;
      const pct = Math.max(0, Math.min(1, clickX / totalWidth));
      const targetSec = pct * sequenceDuration;
      seekToTimeline(targetSec);
    },
    [zoomLevel, sequenceDuration, seekToTimeline]
  );

  const onTimelineMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isDraggingPlayhead.current = true;
    seekToClientX(e.clientX);

    const onMouseMove = (moveEvt: MouseEvent) => {
      if (isDraggingPlayhead.current) {
        seekToClientX(moveEvt.clientX);
      }
    };

    const onMouseUp = () => {
      isDraggingPlayhead.current = false;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  // Export hook
  const { handleExportFull, handleExportScenes } = useEditorExport({
    sourceJob,
    editorScenes,
    trackMutes,
    originalAudioVolume,
    selectedVoice,
    aspectRatio,
    removeOriginalBgm,
    subtitlesVisible,
    subtitleStyle,
    sequenceDuration,
    selectedBgm,
    bgmVolume,
    bgmAudioPath: customBgmPath || bgmAudioPath,
    setIsExportDropdownOpen,
    setProjectMessage,
    onNavigate,
    onAddJob,
    onUpdateJob,
    defaultVoiceForLang,
    sceneAudioDurations,
    voiceSpeed,
  });

  useEffect(() => {
    return () => {
      setPlaying(false);
      stopGlobalAudio();
    };
  }, []);

  const handleGoToBatch = () => {
    setPlaying(false);
    stopGlobalAudio();
    if (sourceJob && onUpdateJob) {
      let cursor = 0;
      const fullNarrationText = editorScenes
        .map((s) => stripSceneMetadata(s.subtitle || s.detail))
        .filter(Boolean)
        .join(" ");

      const cuts = editorScenes.map((sc, idx) => {
        const sceneDur = Math.max(0.5, toSeconds(sc.end) - toSeconds(sc.start));
        const srcStart = sc.sourceTimeStart ?? toSeconds(sc.sourceStart || sc.start);
        const srcEnd = srcStart + sceneDur;
        const tStart = cursor;
        const tEnd = cursor + sceneDur;
        cursor += sceneDur;
        const text = stripSceneMetadata(sc.subtitle || sc.detail || "").trim();
        return {
          sceneId: sc.id || `scene-${idx + 1}`,
          sourceStart: srcStart,
          sourceEnd: srcEnd,
          sourceTimeStart: srcStart,
          sourceTimeEnd: srcEnd,
          duration: sceneDur,
          start: tStart,
          end: tEnd,
          text,
          title: sc.title || `Cảnh ${idx + 1}`,
          subtitle: text,
          subtitleText: text,
        };
      });

      const subSegments = cuts.map((c) => ({
        start: c.start,
        end: c.end,
        text: c.text,
      })).filter((s) => s.text);

      onUpdateJob(sourceJob.id, {
        timelineReady: true,
        timelineClips: cuts as any,
        cutClips: cuts,
        subtitleSegments: subSegments,
        durationSeconds: cursor || sequenceDuration || sourceJob.durationSeconds,
        narrationText: fullNarrationText,
        subtitleText: fullNarrationText,
        scenes: editorScenes.map((sc) => ({
          id: sc.id,
          title: sc.title,
          start: sc.start,
          end: sc.end,
          subtitle: sc.subtitle,
          voiceover: sc.subtitle,
        })),
        audioLayers: {
          bgm: {
            track: selectedBgm,
            customPath: customBgmPath,
            volume: bgmVolume,
            enabled: !trackMutes.bgm,
          },
          voice: {
            voiceId: selectedVoice,
            volume: voiceVolume,
            enabled: !trackMutes.voice,
            speed: voiceSpeed,
          },
          original: {
            volume: originalAudioVolume,
            removeBgm: removeOriginalBgm,
            isolatedStemPath,
            enabled: !trackMutes.original,
          },
        },
        aspectRatio: (aspectRatio === "4:5" ? "9:16" : aspectRatio) as Job["aspectRatio"],
        subtitleStyle,
      });
    }
    onNavigate("batch");
  };

  // Fullscreen trigger on player container
  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void playerContainerRef.current.requestFullscreen();
    }
  };

  // Right-click context menu handler
  const handleClipContextMenu = (e: React.MouseEvent, scId?: string, trackType = "clip") => {
    e.preventDefault();
    e.stopPropagation();
    if (scId) {
      setSceneId(scId);
    }
    setContextMenu({
      visible: true,
      x: Math.min(window.innerWidth - 220, e.clientX),
      y: Math.min(window.innerHeight - 300, e.clientY),
      sceneId: scId || activeSceneId,
      trackType,
    });
  };

  // Native Upload
  const handleUploadNativeMedia = async () => {
    try {
      const path = await getRuntime().pickVideo();
      if (path && onAddJob) {
        const fileName = path.split(/[/\\]/).pop() || "Video đã tải";
        const newJob: Job = {
          id: `job-imported-${Date.now()}`,
          name: fileName,
          source: path,
          sourceType: "file",
          localPath: path,
          mode: "local-gpu",
          aspectRatio: aspectRatio === "4:5" ? "9:16" : aspectRatio,
          narratorEnabled: true,
          narratorGender: "male",
          narratorVoice: selectedVoice,
          subtitlesEnabled: true,
          status: "completed",
          stage: "completed",
          progress: 100,
          createdAt: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
          synced: true,
        };
        onAddJob(newJob);
        setSelectedSourceJobId(newJob.id);
        setUploadedFiles((prev) => [...prev, { id: newJob.id, name: fileName, path }]);
        setProjectMessage(`✓ Đã nạp thành công video: ${fileName}`);
        setTimeout(() => setProjectMessage(""), 3000);
      }
    } catch {
      setProjectMessage("Không thể mở file picker.");
    }
  };

  // Global click & keyboard shortcuts
  useEffect(() => {
    const handleClick = () => {
      setContextMenu(null);
      setIsExportDropdownOpen(false);
      setIsJobDropdownOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setContextMenu(null);
        setIsExportDropdownOpen(false);
        setIsJobDropdownOpen(false);
      }
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        undoTimeline();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        redoTimeline();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "d") {
        e.preventDefault();
        const copyId = `scene-dup-${Date.now()}`;
        const dup: EditorScene = { ...activeScene, id: copyId, title: `${activeScene.title} (Nhân bản)` };
        setScenesWithHistory([...editorScenes, dup]);
        setSceneId(copyId);
        setProjectMessage(`✓ Đã nhân bản: "${dup.title}"`);
        setTimeout(() => setProjectMessage(""), 2000);
      } else if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        setCopiedScene(activeScene);
        setProjectMessage(`📋 Đã sao chép: "${activeScene.title}"`);
        setTimeout(() => setProjectMessage(""), 2000);
      } else if ((e.ctrlKey || e.metaKey) && e.key === "v") {
        if (copiedScene) {
          const newId = `scene-copy-${Date.now()}`;
          const newScene: EditorScene = { ...copiedScene, id: newId, title: `${copiedScene.title} (Bản sao)` };
          setScenesWithHistory([...editorScenes, newScene]);
          setSceneId(newId);
          setProjectMessage(`✓ Đã dán: "${newScene.title}"`);
          setTimeout(() => setProjectMessage(""), 2000);
        }
      } else if (e.key === "Delete" || e.key === "Backspace") {
        deleteActiveScene();
      } else if (e.key === "s" || e.key === "S") {
        splitActiveScene();
      } else if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };

    window.addEventListener("click", handleClick);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("click", handleClick);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeScene, copiedScene, editorScenes, historyIdx, scenesHistory]);

  // Subtitles word highlighter
  const currentPlaybackScene = useMemo(() => {
    if (!effectiveScenes.length) return null;
    return (
      effectiveScenes.find((s) => {
        const cStart = toSeconds(s.captionStart || s.voiceStart || s.start);
        const cEnd = toSeconds(s.captionEnd || s.voiceEnd || s.end);
        return playheadSeconds >= cStart && playheadSeconds < cEnd;
      }) ||
      effectiveScenes.find((s) => {
        const sStart = toSeconds(s.start);
        const sEnd = toSeconds(s.end);
        return playheadSeconds >= sStart && playheadSeconds < sEnd;
      }) ||
      (playheadSeconds >= sequenceDuration ? effectiveScenes[effectiveScenes.length - 1] : effectiveScenes[0])
    );
  }, [effectiveScenes, playheadSeconds, sequenceDuration]);

  const activeDisplayScene = currentPlaybackScene || activeScene;
  const currentRawSub = activeDisplayScene?.subtitle || activeDisplayScene?.voiceover || activeDisplayScene?.translation || "";
  const currentCleanSub = stripSceneMetadata(currentRawSub);
  const subtitleWords = currentCleanSub.split(/\s+/).filter(Boolean);

  const subStartSec = toSeconds(
    activeDisplayScene?.captionStart || activeDisplayScene?.voiceStart || activeDisplayScene?.start
  );
  const subEndSec = toSeconds(
    activeDisplayScene?.captionEnd || activeDisplayScene?.voiceEnd || activeDisplayScene?.end
  );

  let activeWordIdx = -1;
  if (subtitleWords.length > 0) {
    const measuredDur = activeDisplayScene?.id ? sceneAudioDurations[activeDisplayScene.id] : undefined;
    const estDur = estimateSpokenDuration(currentCleanSub, voiceSpeed);
    const maxSceneWindow = Math.max(0.3, subEndSec - subStartSec);
    const actualVoiceDur = Math.min(maxSceneWindow, measuredDur && measuredDur > 0.2 ? measuredDur : estDur);

    const currentOffset = playheadSeconds - subStartSec;
    if (currentOffset < 0) {
      activeWordIdx = -1;
    } else if (currentOffset <= actualVoiceDur) {
      activeWordIdx = computeActiveWordIndex(subtitleWords, currentOffset, actualVoiceDur);
    } else {
      activeWordIdx = subtitleWords.length;
    }
  }

  const activeFilterObj = FILTER_PRESETS.find((f) => f.id === selectedFilter) || FILTER_PRESETS[0];
  const activeMaskObj = MASK_PRESETS.find((m) => m.id === selectedMask) || MASK_PRESETS[0];
  const mediaUrl = sourceJob?.localPath ? fileUrl(sourceJob.localPath) : undefined;

  if (!sourceCandidates.length || !sourceJob) {
    return (
      <div className="timeline-studio-app page-enter" style={{ display: "flex", flexDirection: "column", height: "100%", background: "#0a0d14" }}>
        <div style={{ padding: "12px 20px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", background: "rgba(10, 14, 22, 0.8)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "14px", fontWeight: 800, color: "#f8fafc" }}>Bàn Dựng Timeline</span>
            <span style={{ fontSize: "11.5px", color: "#64748b" }}>· 3. Dựng & Biên Tập</span>
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => onNavigate("story")}
            style={{ fontSize: "12px", padding: "6px 14px", display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer" }}
          >
            ➔ Sang 2. Kịch bản & Voice
          </button>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "40px 20px", textAlign: "center" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "16px", background: "rgba(56, 189, 248, 0.1)", border: "1px solid rgba(56, 189, 248, 0.25)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px", color: "#38bdf8", fontSize: "28px" }}>
            🎬
          </div>
          <h3 style={{ fontSize: "17px", fontWeight: 800, color: "#f8fafc", marginBottom: "8px" }}>
            Chưa có video nào hoàn thành bước Kịch bản
          </h3>
          <p style={{ fontSize: "13px", color: "#94a3b8", maxWidth: "500px", margin: "0 auto 22px", lineHeight: 1.6 }}>
            Bàn dựng Timeline chỉ nhận các video đã được duyệt kịch bản ở bước 2 (Kịch bản & Voice).
            Hệ thống không cho phép nạp trực tiếp video gốc thô chưa qua phân tích AI và duyệt kịch bản.
          </p>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              className="btn-primary"
              onClick={() => onNavigate("story")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 18px",
                borderRadius: "7px",
                fontSize: "12.5px",
                fontWeight: 800,
                background: "linear-gradient(135deg, #0284c7, #38bdf8)",
                border: "none",
                color: "#ffffff",
                cursor: "pointer",
                boxShadow: "0 0 16px rgba(56, 189, 248, 0.4)",
              }}
            >
              ➔ Duyệt Kịch Bản Ở Bước 2
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => onNavigate("analysis")}
              style={{ fontSize: "12.5px", padding: "8px 16px", cursor: "pointer" }}
            >
              Xem 1. Phân Tích AI
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="timeline-studio-app page-enter">
      {/* 1. TOP GLOBAL HEADER BAR WITH WORKFLOW NAVIGATION */}
      <EditorHeader
        sourceJob={sourceJob}
        sourceCandidates={sourceCandidates}
        selectedSourceJobId={selectedSourceJobId}
        setSelectedSourceJobId={setSelectedSourceJobId}
        isJobDropdownOpen={isJobDropdownOpen}
        setIsJobDropdownOpen={setIsJobDropdownOpen}
        editorScenesCount={editorScenes.length}
        sequenceDuration={sequenceDuration}
        projectMessage={projectMessage}
        setProjectMessage={setProjectMessage}
        handleUploadNativeMedia={handleUploadNativeMedia}
        undoTimeline={undoTimeline}
        redoTimeline={redoTimeline}
        handleAutoAlignVoiceAndVisuals={handleAutoAlignVoiceAndVisuals}
        aspectRatio={aspectRatio}
        setAspectRatio={setAspectRatio}
        playing={playing}
        setPlaying={setPlaying}
        isExportDropdownOpen={isExportDropdownOpen}
        setIsExportDropdownOpen={setIsExportDropdownOpen}
        handleExportFull={handleExportFull}
        handleExportScenes={handleExportScenes}
        setIsConfigModalOpen={setIsConfigModalOpen}
        onGoToBatch={handleGoToBatch}
      />

      {/* 2. MAIN 4-COLUMN RESIZABLE / RESPONSIVE WORKSPACE */}
      <div className="ts-workspace-body">
        <EditorLeftDock
          dockTab={dockTab}
          setDockTab={setDockTab}
          librarySubTab={librarySubTab}
          setLibrarySubTab={setLibrarySubTab}
          editorScenes={editorScenes}
          activeSceneId={activeSceneId}
          activeScene={activeScene}
          sourceJob={sourceJob}
          uploadedFiles={uploadedFiles}
          setSelectedSourceJobId={setSelectedSourceJobId}
          handleUploadNativeMedia={handleUploadNativeMedia}
          setProjectMessage={setProjectMessage}
          assetFilter={assetFilter}
          setAssetFilter={setAssetFilter}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          addNewSceneSegment={addNewSceneSegment}
          setSceneId={setSceneId}
          seekToTimeline={seekToTimeline}
          subtitlesVisible={subtitlesVisible}
          setSubtitlesVisible={setSubtitlesVisible}
          subtitleStyle={subtitleStyle}
          setSubtitleStyle={setSubtitleStyle}
          subtitleSize={subtitleSize}
          setSubtitleSize={setSubtitleSize}
          subtitlePosition={subtitlePosition}
          setSubtitlePosition={setSubtitlePosition}
          playSceneAudio={playSceneAudio}
          setScenesWithHistory={setScenesWithHistory}
          setAspectRatio={setAspectRatio}
          bgmVolume={bgmVolume}
          setBgmVolume={setBgmVolume}
          voiceVolume={voiceVolume}
          setVoiceVolume={setVoiceVolume}
          trackMutes={trackMutes}
          setTrackMutes={setTrackMutes}
          originalAudioVolume={originalAudioVolume}
          setOriginalAudioVolume={setOriginalAudioVolume}
          removeOriginalBgm={removeOriginalBgm}
          setRemoveOriginalBgm={setRemoveOriginalBgm}
          isIsolatingStem={isIsolatingStem}
          stemProgress={stemProgress}
          stemStage={stemStage}
          isolatedStemPath={isolatedStemPath}
          voiceSpeed={voiceSpeed}
          setVoiceSpeed={setVoiceSpeed}
          selectedVoice={selectedVoice}
          setSelectedVoice={setSelectedVoice}
          selectedBgm={selectedBgm}
          setSelectedBgm={setSelectedBgm}
          customBgmTitle={customBgmTitle}
          handlePickCustomBgm={handlePickCustomBgm}
          triggerIsolateVocals={triggerIsolateVocals}
          playSfxPreview={playSfxPreview}
          previewingSoundId={previewingSoundId}
          selectedFilter={selectedFilter}
          setSelectedFilter={setSelectedFilter}
          setActiveStickers={setActiveStickers}
        />

        <EditorStagePlayer
          playerContainerRef={playerContainerRef}
          videoRef={videoRef}
          stemAudioRef={stemAudioRef}
          scrubProgressElRef={scrubProgressElRef}
          scrubThumbElRef={scrubThumbElRef}
          timecodeElRef={timecodeElRef}
          isDraggingPlayhead={isDraggingPlayhead}
          aspectRatio={aspectRatio}
          fitMode={fitMode}
          setFitMode={setFitMode}
          mediaUrl={mediaUrl}
          scaleVal={scaleVal}
          posX={posX}
          posY={posY}
          rotationVal={rotationVal}
          opacityVal={opacityVal}
          activeFilterObj={activeFilterObj}
          activeMaskObj={activeMaskObj}
          muted={muted}
          setMuted={setMuted}
          trackMutes={trackMutes}
          setTrackMutes={setTrackMutes}
          originalAudioVolume={originalAudioVolume}
          setMediaDuration={setMediaDuration}
          playing={playing}
          setPlaying={setPlaying}
          isLooping={isLooping}
          setIsLooping={setIsLooping}
          seekToTimeline={seekToTimeline}
          isolatedStemPath={isolatedStemPath}
          activeStickers={activeStickers}
          setActiveStickers={setActiveStickers}
          subtitlesVisible={subtitlesVisible}
          subtitleWords={subtitleWords}
          subtitlePosition={subtitlePosition}
          subtitleSize={subtitleSize}
          subtitleStyle={subtitleStyle}
          activeWordIdx={activeWordIdx}
          activeDisplayScene={activeDisplayScene}
          sequenceDuration={sequenceDuration}
          playheadSeconds={playheadSeconds}
          setProjectMessage={setProjectMessage}
          toggleFullscreen={toggleFullscreen}
        />

        <EditorInspector
          activeScene={activeScene}
          activeSceneId={activeSceneId}
          editorScenes={editorScenes}
          setScenesWithHistory={setScenesWithHistory}
          inspectorTab={inspectorTab}
          setInspectorTab={setInspectorTab}
          playheadSeconds={playheadSeconds}
          scaleVal={scaleVal}
          setScaleVal={setScaleVal}
          posX={posX}
          setPosX={setPosX}
          posY={posY}
          setPosY={setPosY}
          rotationVal={rotationVal}
          setRotationVal={setRotationVal}
          opacityVal={opacityVal}
          setOpacityVal={setOpacityVal}
          speedVal={speedVal}
          setSpeedVal={setSpeedVal}
          selectedMask={selectedMask}
          setSelectedMask={setSelectedMask}
          selectedFilter={selectedFilter}
          setSelectedFilter={setSelectedFilter}
          inAnimation={inAnimation}
          setInAnimation={setInAnimation}
          outAnimation={outAnimation}
          setOutAnimation={setOutAnimation}
          speakingSceneId={speakingSceneId}
          playSceneAudio={playSceneAudio}
          stopSceneAudio={stopSceneAudio}
          voiceSpeed={voiceSpeed}
          sourceJob={sourceJob}
          onUpdateJob={onUpdateJob}
          setProjectMessage={setProjectMessage}
        />
      </div>

      {/* 3. BOTTOM MULTI-TRACK STAGGERED CAPCUT-STYLE TIMELINE */}
      <EditorTimeline
        undoTimeline={undoTimeline}
        redoTimeline={redoTimeline}
        deleteActiveScene={deleteActiveScene}
        splitActiveScene={splitActiveScene}
        addNewSceneSegment={addNewSceneSegment}
        activeScene={activeScene}
        activeSceneId={activeSceneId}
        editorScenes={editorScenes}
        effectiveScenes={effectiveScenes}
        setScenesWithHistory={setScenesWithHistory}
        setSceneId={setSceneId}
        setProjectMessage={setProjectMessage}
        playing={playing}
        setPlaying={setPlaying}
        zoomLevel={zoomLevel}
        setZoomLevel={setZoomLevel}
        trackMutes={trackMutes}
        setTrackMutes={setTrackMutes}
        trackLocks={trackLocks}
        setTrackLocks={setTrackLocks}
        timelineViewportRef={timelineViewportRef}
        onTimelineMouseDown={onTimelineMouseDown}
        handleClipContextMenu={handleClipContextMenu}
        sequenceDuration={sequenceDuration}
        playheadLineElRef={playheadLineElRef}
        playheadSeconds={playheadSeconds}
        clipLayouts={clipLayouts}
        dragOverSceneIdx={null}
        draggedSceneIdx={null}
        handleClipSlideStart={handleClipSlideStart}
        handleTrimStart={handleTrimStart}
        seekToTimeline={seekToTimeline}
        sourceJob={sourceJob}
        speakingSceneId={speakingSceneId}
        playSceneAudio={playSceneAudio}
        selectedBgm={selectedBgm}
        customBgmTitle={customBgmTitle}
        bgmVolume={bgmVolume}
      />

      {/* Background Music Audio element */}
      <audio
        ref={bgmAudioRef}
        loop
        preload="auto"
        style={{ display: "none" }}
      />

      {/* RIGHT-CLICK CONTEXT MENU (CAPCUT & TIMELINE STUDIO STYLE) VIA PORTAL */}
      <EditorContextMenu
        contextMenu={contextMenu}
        setContextMenu={setContextMenu}
        activeScene={activeScene}
        editorScenes={editorScenes}
        setScenesWithHistory={setScenesWithHistory}
        setSceneId={setSceneId}
        splitActiveScene={splitActiveScene}
        deleteActiveScene={deleteActiveScene}
        playSceneAudio={playSceneAudio}
        trackMutes={trackMutes}
        setTrackMutes={setTrackMutes}
        copiedScene={copiedScene}
        setCopiedScene={setCopiedScene}
        setProjectMessage={setProjectMessage}
      />

      {/* Modal Cài Đặt Tỷ Lệ & Render */}
      <EditorConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        aspectRatio={aspectRatio}
        setAspectRatio={setAspectRatio}
        setProjectMessage={setProjectMessage}
      />
    </div>
  );
}
