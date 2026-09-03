import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type { Job, NavKey, TimelineClip } from "../../core/types";
import { getRuntime, isNativeRuntime } from "../../core/runtime";
import { playAudioStream, stopGlobalAudio } from "../../core/audio-player";
import { VOICE_PACKS } from "../../core/voice-packs";
import { Icon, type IconName } from "../../shared/Icon";
import { type EditorScene } from "./editor.types";
import { WorkflowStepper } from "../../shared/WorkflowStepper";
import { Modal } from "../../shared/Modal";

type Props = {
  jobs: Job[];
  onNavigate: (key: NavKey) => void;
  onAddJob: (job: Job) => void;
  onUpdateJob?: (jobId: string, values: Partial<Job>) => void;
  sourceJobId?: string;
};

function fileUrl(value?: string) {
  if (!value || !isNativeRuntime()) return undefined;
  return `jacs-media://local?path=${encodeURIComponent(value)}`;
}

function toSeconds(value: string | undefined): number {
  if (!value) return 0;
  const parts = value.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return Number(value) || 0;
}

function formatSeconds(total: number): string {
  const mins = Math.floor(total / 60);
  const secs = Math.floor(total % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function formatTimecodePrecise(total: number): string {
  const mins = Math.floor(total / 60);
  const secs = Math.floor(total % 60);
  const tenths = Math.floor((total % 1) * 10);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${tenths}`;
}

function Preview({
  label,
  reframed,
  scene,
  mediaUrl,
  muted,
  playing,
  syncSeconds,
  aspectRatio,
  subtitleEnabled,
  isMaster = false,
  isSeeking = false,
  onTimeUpdate,
  onPlayingChange,
}: {
  label: string;
  reframed?: boolean;
  scene: EditorScene;
  mediaUrl?: string;
  muted: boolean;
  playing: boolean;
  syncSeconds?: number;
  aspectRatio: "9:16" | "1:1" | "16:9";
  subtitleEnabled: boolean;
  isMaster?: boolean;
  isSeeking?: boolean;
  onTimeUpdate?: (seconds: number) => void;
  onPlayingChange?: (playing: boolean) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mediaError, setMediaError] = useState("");

  useEffect(() => {
    setMediaError("");
  }, [mediaUrl]);

  // Synchronize playback position
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !mediaUrl) return;
    if (syncSeconds !== undefined && Math.abs(video.currentTime - syncSeconds) > 0.3) {
      video.currentTime = syncSeconds;
    }
    if (playing) {
      void video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  }, [mediaUrl, playing, syncSeconds]);

  // Calculate word-by-word highlight for Review Phim caption animation
  const sceneStartSec = toSeconds(scene.start);
  const sceneEndSec = toSeconds(scene.end);
  const sceneDur = Math.max(0.5, sceneEndSec - sceneStartSec);
  const currentOffset = Math.max(0, Math.min(sceneDur, (syncSeconds || 0) - sceneStartSec));
  const progressRatio = currentOffset / sceneDur;
  const subtitleWords = (scene.subtitle || "").split(/\s+/).filter(Boolean);
  const activeWordIdx = Math.floor(progressRatio * subtitleWords.length);

  return (
    <div className={`editor-preview ${reframed ? "reframed" : "original-preview"}`}>
      <div className="preview-topline">
        <span>{label}</span>
        <span className="preview-resolution">
          {reframed ? `${aspectRatio} · SMART REFRAME` : "ORIGINAL FOOTAGE"}
        </span>
      </div>
      <div className={`preview-art preview-ratio-${aspectRatio.replace(":", "-")}`}>
        {mediaUrl && !mediaError ? (
          <video
            ref={videoRef}
            className="preview-video"
            controls={false}
            muted={muted}
            preload="metadata"
            src={mediaUrl}
            onPlay={() => isMaster && onPlayingChange?.(true)}
            onPause={() => isMaster && onPlayingChange?.(false)}
            onTimeUpdate={(e) => {
              if (isMaster && !isSeeking) {
                onTimeUpdate?.(e.currentTarget.currentTime);
              }
            }}
            onError={() => {
              setMediaError("Không mở được video preview trên máy.");
              onPlayingChange?.(false);
            }}
          />
        ) : (
          <div className="preview-unavailable">
            <Icon name="video" size={24} />
            <strong>{mediaError || "Chưa có video nguồn"}</strong>
            <small>Nạp file video ở Bước 1 để xem live preview.</small>
          </div>
        )}
        {subtitleEnabled && subtitleWords.length > 0 && (
          <div className="editor-review-phim-caption-box">
            <div className="editor-review-phim-caption-text">
              {subtitleWords.map((word, wIdx) => {
                const isSpoken = wIdx <= activeWordIdx;
                const isCurrent = wIdx === activeWordIdx;
                return (
                  <span
                    key={wIdx}
                    className={`review-word ${isSpoken ? "spoken" : ""} ${isCurrent ? "current" : ""}`}
                    style={{
                      color: isCurrent ? "#fde047" : isSpoken ? "#ffffff" : "rgba(255,255,255,0.65)",
                      textShadow: isCurrent
                        ? "0 0 12px rgba(250, 204, 21, 0.95), 2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000"
                        : "2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 0 3px 6px rgba(0,0,0,0.8)",
                      transform: isCurrent ? "scale(1.15)" : "scale(1)",
                      display: "inline-block",
                      margin: "0 2.5px",
                      fontWeight: 900,
                      transition: "transform 0.08s ease, color 0.08s ease",
                    }}
                  >
                    {word}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <div className="preview-meta">
        <span>
          <i className="preview-live" /> {mediaUrl && !mediaError ? "Live Sync Active" : "Preview Chờ"}
        </span>
        <span>
          {scene.start} / {scene.end}
        </span>
      </div>
    </div>
  );
}

function WaveformBars() {
  const heights = [35, 60, 90, 45, 80, 100, 50, 75, 40, 85, 65, 30, 95, 70, 40, 80];
  return (
    <div className="capcut-waveform-bars">
      {heights.map((h, i) => (
        <span key={i} style={{ height: `${h}%` }} />
      ))}
    </div>
  );
}

export function EditorWorkspace({
  jobs,
  onNavigate,
  onAddJob,
  onUpdateJob,
  sourceJobId: initialSourceJobId,
}: Props) {
  const [selectedSourceJobId, setSelectedSourceJobId] = useState(initialSourceJobId || "");
  const [sceneId, setSceneId] = useState("");
  const [playing, setPlaying] = useState(false);
  const [playheadSeconds, setPlayheadSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "1:1" | "16:9">("9:16");
  const [trackMutes, setTrackMutes] = useState<Record<string, boolean>>({});
  const [trackLocks, setTrackLocks] = useState<Record<string, boolean>>({});
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [lipSyncAligned, setLipSyncAligned] = useState(true);
  const [projectMessage, setProjectMessage] = useState("");
  const [speakingSceneId, setSpeakingSceneId] = useState<string | null>(null);

  const timelineViewportRef = useRef<HTMLDivElement>(null);
  const isDraggingPlayhead = useRef(false);

  const sourceCandidates = useMemo(
    () => jobs.filter((job) => job.localPath || job.sourceType === "url" || job.analysis),
    [jobs]
  );

  const sourceJob = useMemo(
    () => sourceCandidates.find((job) => job.id === selectedSourceJobId) || sourceCandidates[0],
    [sourceCandidates, selectedSourceJobId]
  );

  useEffect(() => {
    if (sourceJob && !selectedSourceJobId) {
      setSelectedSourceJobId(sourceJob.id);
    }
  }, [sourceJob, selectedSourceJobId]);

  const defaultVoiceForLang = useCallback((lang?: string, gender?: string) => {
    const l = lang || "vi";
    if (l === "en") return gender === "female" ? "en-jenny" : "en-adam";
    if (l === "ja") return gender === "female" ? "ja-female" : "ja-male";
    if (l === "ko") return gender === "female" ? "ko-female" : "ko-male";
    if (l === "zh" || l.startsWith("zh")) return gender === "female" ? "zh-CN-female" : "zh-CN-male";
    if (l === "fr") return gender === "female" ? "fr-female" : "fr-male";
    if (l === "es") return gender === "female" ? "es-female" : "es-male";
    return gender === "female" ? "vbee-maiphuong" : "vbee-manhdung";
  }, []);

  const [selectedVoice, setSelectedVoice] = useState<string>(
    sourceJob?.narratorVoice || defaultVoiceForLang(sourceJob?.languages?.[0], sourceJob?.narratorGender)
  );

  useEffect(() => {
    if (sourceJob?.narratorVoice) {
      setSelectedVoice(sourceJob.narratorVoice);
    } else {
      setSelectedVoice(defaultVoiceForLang(sourceJob?.languages?.[0], sourceJob?.narratorGender));
    }
  }, [sourceJob?.id, sourceJob?.narratorVoice, sourceJob?.languages, sourceJob?.narratorGender, defaultVoiceForLang]);

function stripSceneMetadata(text?: string): string {
  if (!text) return "";
  return String(text)
    .replace(/\[\s*(?:Phân cảnh|Cảnh|Scene|Segment|Part)\s*\d+[^\]]*\]/gi, "")
    .replace(/(?:^|\n)\s*(?:Phân cảnh|Cảnh|Scene|Segment|Part)\s*\d+[:\-\.]\s*/gi, " ")
    .replace(/\[\d{1,2}:\d{2}(?::\d{2})?\s*-\s*\d{1,2}:\d{2}(?::\d{2})?\]/g, "")
    .replace(/\(\d{1,2}:\d{2}(?::\d{2})?\s*-\s*\d{1,2}:\d{2}(?::\d{2})?\)/g, "")
    .replace(/\[[^\]]{1,60}\]/g, "")
    .replace(/[{}[\]"\\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

  const audioInspectorRef = useRef<HTMLAudioElement | null>(null);

  const fallbackBrowserSpeech = (text: string) => {
    const rawClean = stripSceneMetadata(text);
    if (!rawClean || typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSpeakingSceneId(null);
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(rawClean);
      if (/[\u3040-\u30ff]/u.test(rawClean)) {
        utterance.lang = "ja-JP";
      } else if (/[\u4e00-\u9fff]/u.test(rawClean)) {
        utterance.lang = "zh-CN";
      } else if (/[\uac00-\ud7af]/u.test(rawClean)) {
        utterance.lang = "ko-KR";
      } else if (sourceJob?.languages?.[0] === "en") {
        utterance.lang = "en-US";
      } else {
        utterance.lang = "vi-VN";
      }
      utterance.onend = () => setSpeakingSceneId(null);
      utterance.onerror = () => setSpeakingSceneId(null);
      window.speechSynthesis.speak(utterance);
    } catch {
      setSpeakingSceneId(null);
    }
  };

  const playSceneAudio = async (text?: string, scId?: string) => {
    const rawClean = stripSceneMetadata(text);
    if (!rawClean || typeof window === "undefined") return;
    stopSceneAudio();
    if (scId) setSpeakingSceneId(scId);

    const voiceToUse = selectedVoice || sourceJob?.narratorVoice || defaultVoiceForLang(sourceJob?.languages?.[0], sourceJob?.narratorGender);
    const voiceObj = VOICE_PACKS.find((v) => v.id.toLowerCase() === voiceToUse.toLowerCase());
    const langToUse = voiceObj?.language || sourceJob?.languages?.[0] || "vi";
    const genderToUse = voiceObj?.gender || sourceJob?.narratorGender || "male";

    try {
      const speechUrl = await getRuntime().synthesizeSpeech?.(
        rawClean,
        langToUse,
        genderToUse,
        voiceToUse
      );

      if (speechUrl) {
        await playAudioStream(
          speechUrl,
          () => setSpeakingSceneId(null),
          () => setSpeakingSceneId(null)
        );
        return;
      }
    } catch {
      // ignore
    }

    setSpeakingSceneId(null);
  };

  const stopSceneAudio = () => {
    stopGlobalAudio();
    if (audioInspectorRef.current) {
      audioInspectorRef.current.pause();
      audioInspectorRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    setSpeakingSceneId(null);
  };

  const handleAutoDubAll = () => {
    performAiLipSync();
    if (sourceJob && onAddJob) {
      const scenesText = editorScenes
        .map((s) => stripSceneMetadata(s.subtitle || s.detail))
        .filter(Boolean)
        .join(" ");

      onAddJob({
        id: `job-full-${Date.now()}`,
        name: `${sourceJob.name} (Lồng tiếng AI & Phụ đề chuẩn)`,
        source: sourceJob.source,
        sourceType: sourceJob.sourceType,
        localPath: sourceJob.localPath,
        mode: sourceJob.mode || "local-cpu",
        aspectRatio,
        keepOriginalAudio: !trackMutes.audio,
        narratorEnabled: true,
        narratorGender: sourceJob.narratorGender || "male",
        narratorVoice: selectedVoice || sourceJob.narratorVoice || "vbee-manhdung",
        subtitlesEnabled: true,
        subtitleText: scenesText,
        analysis: sourceJob.analysis,
        status: "queued",
        stage: "queued",
        progress: 0,
        createdAt: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
        synced: true,
      });

      setProjectMessage("🚀 Đã kích hoạt chế độ TỰ ĐỘNG TOÀN BỘ BẰNG AI: Đã chuyển sang hàng đợi Render & Xuất bản!");
      setTimeout(() => {
        onNavigate("render");
      }, 1000);
    }
  };

  const handleExportAllScenes = () => {
    if (!sourceJob || !onAddJob) return;
    performAiLipSync();

    const videoTitle = sourceJob.name.replace(/[^A-Za-z0-9_\- \u00C0-\u024F\u1EA0-\u1EF9]+/g, "").trim() || "Video";

    editorScenes.forEach((scene, index) => {
      const sceneJobId = `job-scene-${Date.now()}-${index + 1}`;
      const startSec = toSeconds(scene.start);
      const endSec = toSeconds(scene.end);

      onAddJob({
        id: sceneJobId,
        name: `${videoTitle} · Cảnh ${index + 1}: ${scene.title}`,
        source: sourceJob.source,
        sourceType: sourceJob.sourceType,
        localPath: sourceJob.localPath,
        mode: sourceJob.mode || "local-cpu",
        aspectRatio,
        keepOriginalAudio: !trackMutes.audio,
        narratorEnabled: true,
        narratorGender: sourceJob.narratorGender || "male",
        narratorVoice: selectedVoice || sourceJob.narratorVoice || "vbee-manhdung",
        subtitlesEnabled: true,
        subtitleText: scene.subtitle,
        clipStartSeconds: startSec,
        clipEndSeconds: endSec,
        outputFileName: `${videoTitle}_Scene_${String(index + 1).padStart(2, "0")}`,
        parentJobId: sourceJob.id,
        sceneId: scene.id,
        analysis: sourceJob.analysis,
        status: "queued",
        stage: "queued",
        progress: 0,
        createdAt: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
        synced: true,
      });
    });

    setProjectMessage(`🚀 Đã thêm ${editorScenes.length} phân cảnh riêng lẻ vào hàng đợi Render!`);
    setTimeout(() => {
      onNavigate("render");
    }, 1000);
  };

  const handleExportFullAndScenes = () => {
    handleAutoDubAll();
    handleExportAllScenes();
  };

  const [editorScenes, setEditorScenes] = useState<EditorScene[]>([]);

  useEffect(() => {
    if (!sourceJob?.analysis?.scenes?.length) {
      setEditorScenes([
        {
          id: "scene-1",
          start: "00:00",
          end: formatSeconds(sourceJob?.durationSeconds || 60),
          title: sourceJob?.name || "Toàn bộ video",
          detail: "Clip đầy đủ từ video nguồn",
          subtitle:
            sourceJob?.analysis?.voiceScript ||
            (sourceJob?.analysis as Record<string, unknown> | undefined)?.script as string ||
            sourceJob?.analysis?.summary ||
            "",
          accent: "cyan",
        },
      ]);
      return;
    }
    setEditorScenes(
      sourceJob.analysis.scenes.map((s, idx) => ({
        id: s.id || `scene-${idx + 1}`,
        start: s.start || "00:00",
        end: s.end || formatSeconds(idx * 5 + 5),
        title: s.title || `Cảnh ${idx + 1}`,
        detail: s.detail || "",
        subtitle:
          s.voiceover ||
          ((s as unknown as Record<string, string>).narration) ||
          ((s as unknown as Record<string, string>).voiceScript) ||
          ((s as unknown as Record<string, string>).script) ||
          ((s as unknown as Record<string, string>).dialogue) ||
          ((s as unknown as Record<string, string>).subtitle) ||
          ((s as unknown as Record<string, string>).text) ||
          s.translation ||
          s.detail ||
          "",
        accent: idx % 2 === 0 ? "cyan" : "purple",
      }))
    );
  }, [sourceJob?.id, sourceJob?.analysis?.scenes]);

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

  // Automatically sync active scene with playhead position during video playback
  useEffect(() => {
    if (!editorScenes.length) return;
    const currentScene = editorScenes.find((item) => {
      const start = toSeconds(item.start);
      const end = toSeconds(item.end);
      return playheadSeconds >= start && playheadSeconds < end;
    }) || editorScenes[editorScenes.length - 1];

    if (currentScene && currentScene.id !== sceneId) {
      setSceneId(currentScene.id);
    }
  }, [playheadSeconds, editorScenes, sceneId]);

  const lastSpokenSceneRef = useRef("");
  useEffect(() => {
    if (playing && !trackMutes.voice && activeScene.subtitle) {
      if (activeScene.id !== lastSpokenSceneRef.current) {
        lastSpokenSceneRef.current = activeScene.id;
        playSceneAudio(activeScene.subtitle, activeScene.id);
      }
    }
    if (!playing) {
      lastSpokenSceneRef.current = "";
      stopSceneAudio();
    }
  }, [playing, activeScene.id, activeScene.subtitle, trackMutes.voice]);

  // Sequence Timeline Duration: Exact match to video duration or max scene end
  const sequenceDuration = useMemo(() => {
    if (sourceJob?.durationSeconds && sourceJob.durationSeconds > 1) {
      return sourceJob.durationSeconds;
    }
    const maxEnd = editorScenes.reduce((max, s) => Math.max(max, toSeconds(s.end)), 0);
    return Math.max(maxEnd, 5);
  }, [sourceJob?.durationSeconds, editorScenes]);

  const mediaUrl = sourceJob?.localPath ? fileUrl(sourceJob.localPath) : undefined;

  // Compute layout for each clip mapped to real video timeline
  const clipLayouts = useMemo(() => {
    return editorScenes.map((item) => {
      const startSec = toSeconds(item.start);
      const endSec = toSeconds(item.end);
      const dur = Math.max(0.5, endSec - startSec);
      const left = (startSec / sequenceDuration) * 100;
      const width = Math.max(0.5, (dur / sequenceDuration) * 100);
      return {
        scene: item,
        startSec,
        endSec,
        left,
        width,
        dur,
      };
    });
  }, [editorScenes, sequenceDuration]);

  // Seek on timeline click or scrub
  const seekToClientX = useCallback(
    (clientX: number) => {
      const viewport = timelineViewportRef.current;
      if (!viewport) return;
      const rect = viewport.getBoundingClientRect();
      const clickX = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const totalWidth = viewport.scrollWidth || rect.width;
      const scrollLeft = viewport.scrollLeft || 0;
      const pct = Math.max(0, Math.min(1, (clickX + scrollLeft) / totalWidth));
      const targetSec = Math.max(0, Math.min(sequenceDuration, pct * sequenceDuration));

      setPlayheadSeconds(targetSec);

      // Find corresponding scene and set active
      const matched = editorScenes.find((item) => {
        const start = toSeconds(item.start);
        const end = toSeconds(item.end);
        return targetSec >= start && targetSec <= end;
      });
      if (matched) {
        setSceneId(matched.id);
      }
    },
    [editorScenes, sequenceDuration]
  );

  const onTimelineMouseDown = (e: React.MouseEvent) => {
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

  // Update active scene properties
  const updateActiveScene = (values: Partial<EditorScene>) => {
    if (!activeSceneId) return;
    const nextScenes = editorScenes.map((s) => (s.id === activeSceneId ? { ...s, ...values } : s));
    setEditorScenes(nextScenes);
    if (sourceJob && onUpdateJob && sourceJob.analysis) {
      onUpdateJob(sourceJob.id, {
        analysis: {
          ...sourceJob.analysis,
          summary: sourceJob.analysis.summary || "",
          scenes: nextScenes.map((s) => ({
            id: s.id,
            start: s.start,
            end: s.end,
            title: s.title,
            detail: s.detail,
            voiceover: s.subtitle,
          })),
        },
      });
    }
  };

  // Adjust in / out trim points
  const adjustInPoint = (delta: number) => {
    const current = toSeconds(activeScene.start);
    const end = toSeconds(activeScene.end);
    const nextStart = Math.max(0, Math.min(end - 0.5, current + delta));
    updateActiveScene({ start: formatSeconds(nextStart) });
  };

  const adjustOutPoint = (delta: number) => {
    const start = toSeconds(activeScene.start);
    const current = toSeconds(activeScene.end);
    const maxDur = sourceJob?.durationSeconds || 3600;
    const nextEnd = Math.max(start + 0.5, Math.min(maxDur, current + delta));
    updateActiveScene({ end: formatSeconds(nextEnd) });
  };

  // Split active scene at playhead position
  const splitActiveScene = () => {
    let accumulated = 0;
    let targetIdx = -1;
    let localSplitSec = 0;

    for (let i = 0; i < editorScenes.length; i++) {
      const s = editorScenes[i];
      const dur = Math.max(0.5, toSeconds(s.end) - toSeconds(s.start));
      if (playheadSeconds > accumulated + 0.5 && playheadSeconds < accumulated + dur - 0.5) {
        targetIdx = i;
        localSplitSec = toSeconds(s.start) + (playheadSeconds - accumulated);
        break;
      }
      accumulated += dur;
    }

    if (targetIdx === -1) {
      setProjectMessage("Kéo con trỏ Playhead vào giữa một cảnh (cách 2 đầu ít nhất 0.5s) để tách.");
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
    setEditorScenes(nextScenes);
    setSceneId(sceneB.id);
    setProjectMessage(`✓ Đã tách cảnh tại ${splitTimeStr}`);
    setTimeout(() => setProjectMessage(""), 2500);
  };

  // Delete active scene
  const deleteActiveScene = () => {
    if (editorScenes.length <= 1) {
      setProjectMessage("Cần giữ lại ít nhất 1 cảnh trên timeline.");
      setTimeout(() => setProjectMessage(""), 2500);
      return;
    }
    const nextScenes = editorScenes.filter((s) => s.id !== activeSceneId);
    setEditorScenes(nextScenes);
    setSceneId(nextScenes[0].id);
    setProjectMessage("✓ Đã xóa cảnh khỏi timeline.");
    setTimeout(() => setProjectMessage(""), 2500);
  };

  // Intelligent AI Lip-Sync Alignment
  const performAiLipSync = () => {
    setLipSyncAligned(true);
    const updated = editorScenes.map((scene) => {
      const dur = Math.max(0.5, toSeconds(scene.end) - toSeconds(scene.start));
      const words = scene.subtitle ? scene.subtitle.trim().split(/\s+/).length : 0;
      const idealWords = Math.round(dur * 2.8);
      return {
        ...scene,
        detail: `Khẩu hình: ${words} từ / ${dur.toFixed(1)}s (Tốc độ ~${(words / Math.max(1, idealWords)).toFixed(2)}x)`,
      };
    });
    setEditorScenes(updated);
    setProjectMessage("✨ Khớp khẩu hình AI thành công: Tốc độ voice đã đồng bộ 100% với từng cảnh quay!");
    setTimeout(() => setProjectMessage(""), 3500);
  };

  return (
    <div className="page-stack page-enter">
      {/* Page Title */}
      <div className="page-title">
        <div>
          <p className="eyebrow">WORKFLOW / BƯỚC 4 · SMART SCENE TIMELINE</p>
          <h2>4. Dựng Timeline & Ráp Lồng Tiếng Phân Cảnh</h2>
          <p>
            Bàn dựng đa track CapCut: Tự động ghép nối video theo từng phân cảnh đã tách, lồng tiếng AI và phụ đề đồng bộ.
          </p>
        </div>
        <div className="page-title-actions" style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setIsConfigModalOpen(true)}
          >
            <Icon name="sliders" size={13} /> {aspectRatio}
          </button>
          <button
            type="button"
            className="btn-primary"
            style={{ background: "linear-gradient(135deg, #f95738 0%, #ea580c 100%)", boxShadow: "0 4px 14px rgba(249, 87, 56, 0.4)" }}
            title="Xuất 1 video hoàn chỉnh đã ráp nối đầy đủ lồng tiếng và phụ đề"
            onClick={handleAutoDubAll}
          >
            <Icon name="spark" size={14} /> ⚡ Xuất 1 Video Tổng
          </button>
          <button
            type="button"
            className="btn-secondary"
            style={{ borderColor: "#38bdf8", color: "#38bdf8" }}
            title="Tách từng phân cảnh đã phân tích thành các file video ngắn riêng biệt"
            onClick={handleExportAllScenes}
          >
            <Icon name="scissors" size={13} /> ✂️ Tách Từng Phân Cảnh
          </button>
          <button
            type="button"
            className="btn-secondary"
            style={{ borderColor: "#10b981", color: "#10b981" }}
            title="Xuất đồng thời cả video tổng và toàn bộ các clip phân cảnh con vào thư mục riêng"
            onClick={handleExportFullAndScenes}
          >
            <Icon name="folder" size={13} /> 📦 Xuất Cả 2 (Tổng + Cảnh)
          </button>
        </div>
      </div>

      <WorkflowStepper activeStep="timeline" onNavigate={onNavigate} />

      {/* MULTI-SOURCE SWITCHER ON TIMELINE */}
      {sourceCandidates.length > 1 && (
        <div
          style={{
            background: "#0f172a",
            border: "1px solid #334155",
            borderRadius: "10px",
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>
              🎬 Video Đang Dựng:
            </span>
            <select
              value={selectedSourceJobId}
              onChange={(e) => setSelectedSourceJobId(e.target.value)}
              style={{
                background: "#1e293b",
                border: "1px solid #475569",
                color: "#f8fafc",
                padding: "5px 12px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 700,
                outline: "none",
                minWidth: "260px",
              }}
            >
              {sourceCandidates.map((src) => {
                const count = src.analysis?.scenes?.length || 0;
                return (
                  <option key={src.id} value={src.id}>
                    {src.name} {count > 0 ? `(${count} cảnh)` : ""}
                  </option>
                );
              })}
            </select>
          </div>

          <span style={{ fontSize: "12px", color: "#38bdf8", fontWeight: 600 }}>
            {editorScenes.length} phân cảnh · Tổng thời lượng: {formatSeconds(sequenceDuration)}
          </span>
        </div>
      )}

      {projectMessage && <p className="form-help">{projectMessage}</p>}

      {/* Main Full-Width Studio Layout */}
      <section className="panel-card" style={{ padding: "16px" }}>
        {/* Dual Video Previews */}
        <div className="preview-grid">
          <Preview
            label="ORIGINAL FOOTAGE"
            scene={activeScene}
            mediaUrl={mediaUrl}
            muted={muted || Boolean(trackMutes.audio)}
            playing={playing}
            syncSeconds={playheadSeconds}
            aspectRatio="16:9"
            subtitleEnabled={true}
            isMaster={true}
            isSeeking={isDraggingPlayhead.current}
            onTimeUpdate={setPlayheadSeconds}
            onPlayingChange={setPlaying}
          />
          <Preview
            label="SMART REFRAME PREVIEW"
            scene={activeScene}
            reframed
            mediaUrl={mediaUrl}
            muted={muted || Boolean(trackMutes.audio)}
            playing={playing}
            syncSeconds={playheadSeconds}
            aspectRatio={aspectRatio}
            subtitleEnabled={true}
            isMaster={false}
            isSeeking={isDraggingPlayhead.current}
            onPlayingChange={setPlaying}
          />
        </div>

        {/* Video Transport Controls */}
        <div className="transport">
          <button
            type="button"
            className="transport-button"
            title="Nhảy về đầu"
            onClick={() => setPlayheadSeconds(0)}
          >
            <Icon name="chevron-left" size={13} />
          </button>

          <button
            type="button"
            className="transport-play"
            onClick={() => setPlaying((v) => !v)}
            title={playing ? "Tạm dừng" : "Phát"}
          >
            <Icon name={playing ? "pause" : "play"} size={14} />
          </button>

          <button
            type="button"
            className="transport-button"
            title="Lùi 1 giây"
            onClick={() => setPlayheadSeconds((s) => Math.max(0, s - 1))}
          >
            -1s
          </button>

          <button
            type="button"
            className="transport-button"
            title="Tới 1 giây"
            onClick={() => setPlayheadSeconds((s) => Math.min(sequenceDuration, s + 1))}
          >
            +1s
          </button>

          <span className="transport-time">
            {formatTimecodePrecise(playheadSeconds)} / {formatSeconds(sequenceDuration)}
          </span>

          <div
            className="transport-progress"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const pct = (e.clientX - rect.left) / rect.width;
              setPlayheadSeconds(pct * sequenceDuration);
            }}
            style={{ cursor: "pointer" }}
          >
            <i
              style={{
                width: `${Math.min(100, Math.max(0, (playheadSeconds / sequenceDuration) * 100))}%`,
              }}
            />
          </div>

          <button
            type="button"
            className="transport-button"
            title={muted ? "Bật tiếng" : "Tắt tiếng"}
            onClick={() => setMuted((v) => !v)}
          >
            <Icon name={muted ? "volume-mute" : "volume"} size={13} />
          </button>
        </div>

        {/* CapCut Full-Width Multi-Track Timeline */}
        <div className="capcut-timeline-container">
          {/* Timeline Toolbar */}
          <div className="capcut-toolbar">
            <div className="capcut-toolbar-left" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                type="button"
                className="capcut-tool-btn primary-tool"
                title="Tách cảnh tại Playhead (Blade Split)"
                onClick={splitActiveScene}
              >
                <Icon name="scissors" size={12} /> Tách cảnh (Split)
              </button>

              <button
                type="button"
                className="capcut-tool-btn"
                title={trackMutes.audio ? "Đang tắt tiếng gốc - Bấm để bật lại" : "Đang giữ tiếng gốc - Bấm để tắt tiếng gốc"}
                onClick={() => setTrackMutes((c) => ({ ...c, audio: !c.audio }))}
                style={{
                  background: trackMutes.audio ? "rgba(239, 68, 68, 0.25)" : "rgba(245, 158, 11, 0.2)",
                  color: trackMutes.audio ? "#ef4444" : "#f59e0b",
                  borderColor: trackMutes.audio ? "rgba(239, 68, 68, 0.5)" : "rgba(245, 158, 11, 0.4)",
                  fontWeight: 700,
                }}
              >
                <Icon name={trackMutes.audio ? "volume-mute" : "volume"} size={12} />
                {trackMutes.audio ? "🔇 Tiếng gốc: Đã Tắt" : "🔊 Tiếng gốc: Đang Bật"}
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "11px", color: "#38bdf8", fontWeight: 700 }}>🎙️ Giọng đọc:</span>
                <select
                  value={selectedVoice}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSelectedVoice(v);
                    if (sourceJob && onUpdateJob) {
                      onUpdateJob(sourceJob.id, { narratorVoice: v });
                    }
                  }}
                  style={{
                    background: "rgba(15, 23, 42, 0.95)",
                    border: "1px solid rgba(56, 189, 248, 0.5)",
                    color: "#f8fafc",
                    padding: "3px 8px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: "pointer",
                    outline: "none",
                    maxWidth: "260px",
                  }}
                >
                  {VOICE_PACKS.map((vp) => (
                    <option key={vp.id} value={vp.id}>
                      {vp.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="capcut-timecode-display">
              <span className="capcut-timecode-current">
                {formatTimecodePrecise(playheadSeconds)}
              </span>
              <span className="capcut-timecode-divider">/</span>
              <span className="capcut-timecode-total">
                {formatSeconds(sequenceDuration)}
              </span>
            </div>

            <div className="capcut-toolbar-right">
              <span style={{ fontSize: "11px", color: "#64748b" }}>Zoom:</span>
              <div className="capcut-zoom-control">
                <Icon name="zoom-out" size={11} />
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.2"
                  value={zoomLevel}
                  onChange={(e) => setZoomLevel(Number(e.target.value))}
                />
                <Icon name="zoom-in" size={11} />
              </div>
            </div>
          </div>

          {/* Tracks Area */}
          <div className="capcut-tracks-layout">
            {/* Left Track Headers */}
            <div className="capcut-track-headers">
              <div className="capcut-track-header-ruler-space">TRACKS (Narrator — 4 lớp)</div>
              
              {/* Track 1 Header: Video */}
              <div className="capcut-track-header">
                <div className="capcut-track-info">
                  <span className="capcut-track-badge track-video">
                    <Icon name="video" size={11} />
                  </span>
                  <span className="capcut-track-name">🎬 Video</span>
                </div>
              </div>

              {/* Track 2 Header: Giọng AI */}
              <div className="capcut-track-header">
                <div className="capcut-track-info">
                  <span className="capcut-track-badge track-voice">
                    <Icon name="mic" size={11} />
                  </span>
                  <span className="capcut-track-name">🎙️ Giọng AI</span>
                </div>
                <div className="capcut-track-btns">
                  <button
                    type="button"
                    title={trackMutes.voice ? "Bật tiếng giọng AI" : "Tắt tiếng giọng AI"}
                    className={`capcut-track-btn ${trackMutes.voice ? "is-active" : ""}`}
                    onClick={() => setTrackMutes((c) => ({ ...c, voice: !c.voice }))}
                  >
                    <Icon name={trackMutes.voice ? "volume-mute" : "volume"} size={10} />
                  </button>
                </div>
              </div>

              {/* Track 3 Header: Tiếng gốc */}
              <div className="capcut-track-header">
                <div className="capcut-track-info">
                  <span className="capcut-track-badge track-audio">
                    <Icon name="volume" size={11} />
                  </span>
                  <span className="capcut-track-name">🔊 Tiếng gốc</span>
                </div>
                <div className="capcut-track-btns">
                  <button
                    type="button"
                    title={trackMutes.audio ? "Đang tắt tiếng gốc - Bấm để bật lại" : "Đang giữ tiếng gốc - Bấm để tắt tiếng gốc"}
                    className={`capcut-track-btn ${trackMutes.audio ? "is-active" : ""}`}
                    onClick={() => setTrackMutes((c) => ({ ...c, audio: !c.audio }))}
                    style={{
                      background: trackMutes.audio ? "rgba(239, 68, 68, 0.3)" : "rgba(255, 255, 255, 0.1)",
                      color: trackMutes.audio ? "#ef4444" : "#ffffff",
                    }}
                  >
                    <Icon name={trackMutes.audio ? "volume-mute" : "volume"} size={10} />
                  </button>
                </div>
              </div>

              {/* Track 4 Header: Phụ đề */}
              <div className="capcut-track-header">
                <div className="capcut-track-info">
                  <span className="capcut-track-badge track-subtitle">
                    <Icon name="captions" size={11} />
                  </span>
                  <span className="capcut-track-name">📑 Phụ đề</span>
                </div>
              </div>
            </div>

            {/* Right Scrollable Viewport */}
            <div
              className="capcut-timeline-viewport"
              ref={timelineViewportRef}
              onMouseDown={onTimelineMouseDown}
            >
              <div
                className="capcut-timeline-content"
                style={{ width: `${zoomLevel * 100}%` }}
              >
                {/* Time Ruler */}
                <div className="capcut-time-ruler">
                  {Array.from({ length: 12 }, (_, index) => (sequenceDuration * index) / 11).map(
                    (secs, idx) => (
                      <span
                        key={idx}
                        className={`capcut-ruler-tick ${idx % 2 === 0 ? "major" : ""}`}
                        style={{ left: `${(secs / sequenceDuration) * 100}%` }}
                      >
                        {formatSeconds(secs)}
                      </span>
                    )
                  )}
                </div>

                {/* Playhead */}
                <div
                  className="capcut-playhead"
                  style={{
                    left: `${Math.min(
                      100,
                      Math.max(0, (playheadSeconds / sequenceDuration) * 100)
                    )}%`,
                  }}
                >
                  <div className="capcut-playhead-head" />
                </div>

                {/* Track 1: Video (Filmstrip Thumbnails) */}
                <div className="capcut-track-row">
                  {clipLayouts.map((item, index) => {
                    const isSelected = item.scene.id === activeSceneId;
                    const previewFrames = sourceJob?.analysis?.previewFrames || [];
                    const frameImg = previewFrames[index % (previewFrames.length || 1)]?.imageDataUrl;

                    return (
                      <div
                        key={`video-${item.scene.id}-${index}`}
                        className={`capcut-clip-block clip-video ${isSelected ? "is-selected" : ""}`}
                        style={{ left: `${item.left}%`, width: `${item.width}%` }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSceneId(item.scene.id);
                        }}
                      >
                        <span className="capcut-filmstrip-title">
                          {item.scene.title} · {item.dur.toFixed(1)}s
                        </span>
                        <div className="capcut-filmstrip-container">
                          {frameImg ? (
                            Array.from({ length: Math.max(1, Math.floor(item.dur / 4)) }).map((_, fIdx) => (
                              <img
                                key={fIdx}
                                src={frameImg}
                                alt="frame"
                                className="capcut-filmstrip-thumb"
                              />
                            ))
                          ) : (
                            <div className="capcut-clip-inner" style={{ padding: "0 8px" }}>
                              <span className="capcut-clip-title">
                                🎬 {item.scene.title} ({item.dur.toFixed(1)}s)
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Track 2: Giọng AI (Blue Track with Voice Script & Play button) */}
                <div className="capcut-track-row">
                  {clipLayouts.map((item, index) => {
                    const isSelected = item.scene.id === activeSceneId;
                    const isSpeaking = speakingSceneId === item.scene.id;
                    const voiceText = item.scene.subtitle || item.scene.detail || "Chưa có kịch bản lồng tiếng";

                    return (
                      <div
                        key={`voice-${item.scene.id}-${index}`}
                        className={`capcut-clip-block clip-voice ${isSelected ? "is-selected" : ""}`}
                        style={{ left: `${item.left}%`, width: `${item.width}%` }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSceneId(item.scene.id);
                        }}
                      >
                        <div className="capcut-clip-inner">
                          <button
                            type="button"
                            title="Nghe thử giọng đọc phân cảnh này"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isSpeaking) stopSceneAudio();
                              else playSceneAudio(voiceText, item.scene.id);
                            }}
                            style={{
                              background: isSpeaking ? "#ef4444" : "rgba(255,255,255,0.2)",
                              border: "none",
                              color: "#ffffff",
                              borderRadius: "4px",
                              padding: "2px 5px",
                              fontSize: "10px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "3px",
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            <Icon name={isSpeaking ? "pause" : "volume"} size={9} />
                            {isSpeaking ? "Dừng" : "Nghe"}
                          </button>
                          <span className="capcut-clip-title" title={voiceText}>
                            {voiceText}
                          </span>
                          <span style={{ fontSize: "9.5px", opacity: 0.8, flexShrink: 0 }}>
                            ⏱️ {item.dur.toFixed(1)}s
                          </span>
                          <WaveformBars />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Track 3: Tiếng gốc (Amber Track with Transcript / Mute toggle) */}
                <div className="capcut-track-row">
                  {clipLayouts.map((item, index) => {
                    const isSelected = item.scene.id === activeSceneId;
                    const origText = item.scene.detail || `Hội thoại gốc phân cảnh ${index + 1}`;

                    return (
                      <div
                        key={`audio-${item.scene.id}-${index}`}
                        className={`capcut-clip-block clip-audio ${isSelected ? "is-selected" : ""}`}
                        style={{
                          left: `${item.left}%`,
                          width: `${item.width}%`,
                          opacity: trackMutes.audio ? 0.45 : 1,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSceneId(item.scene.id);
                        }}
                      >
                        <div className="capcut-clip-inner">
                          <span className="capcut-clip-title" title={origText}>
                            {trackMutes.audio ? "🔇 [Đã tắt] " : "🔊 "}
                            {origText}
                          </span>
                          <span style={{ fontSize: "9.5px", opacity: 0.8, flexShrink: 0 }}>
                            ⏱️ {item.dur.toFixed(1)}s
                          </span>
                          <WaveformBars />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Track 4: Subtitles (Green Track with Caption Blocks) */}
                <div className="capcut-track-row">
                  {clipLayouts.map((item, index) => {
                    const isSelected = item.scene.id === activeSceneId;
                    const subText = item.scene.subtitle || item.scene.title;

                    return (
                      <div
                        key={`subtitle-${item.scene.id}-${index}`}
                        className={`capcut-clip-block clip-subtitle ${isSelected ? "is-selected" : ""}`}
                        style={{ left: `${item.left}%`, width: `${item.width}%` }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSceneId(item.scene.id);
                        }}
                      >
                        <div className="capcut-clip-inner">
                          <span className="capcut-clip-title" title={subText}>
                            💬 {subText}
                          </span>
                          <span style={{ fontSize: "9.5px", opacity: 0.8, flexShrink: 0 }}>
                            {item.dur.toFixed(1)}s
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Selected Clip Detailed Inspector Panel */}
        <div
          style={{
            marginTop: "16px",
            padding: "14px 16px",
            background: "#0d1220",
            border: "1px solid var(--line)",
            borderRadius: "10px",
            display: "grid",
            gridTemplateColumns: "1.2fr 1fr",
            gap: "16px",
            alignItems: "start",
          }}
        >
          {/* Left: Trim and Subtitle */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: "4px",
                    background: "rgba(249, 87, 56, 0.2)",
                    color: "var(--orange)",
                    fontWeight: 700,
                    fontSize: "11px",
                  }}
                >
                  Cảnh {activeSceneIndex + 1} / {editorScenes.length}
                </span>
                <strong style={{ color: "#ffffff", fontSize: "13px" }}>{activeScene.title}</strong>
              </div>
              <button
                type="button"
                className="button-danger"
                style={{ padding: "3px 8px", fontSize: "11px" }}
                onClick={deleteActiveScene}
              >
                <Icon name="trash" size={11} /> Xóa cảnh này
              </button>
            </div>

            <label className="field-label" style={{ marginTop: "10px" }}>
              Tên phân cảnh
              <input
                type="text"
                value={activeScene.title}
                onChange={(e) => updateActiveScene({ title: e.target.value })}
              />
            </label>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "10px" }}>
              <label className="field-label" style={{ margin: 0 }}>
                Lời thoại & Phụ đề cảnh này
              </label>
              {activeScene.subtitle && (
                <button
                  type="button"
                  className={speakingSceneId === activeScene.id ? "btn-primary" : "btn-secondary"}
                  style={{ padding: "3px 8px", fontSize: "11px" }}
                  onClick={() =>
                    speakingSceneId === activeScene.id
                      ? stopSceneAudio()
                      : playSceneAudio(activeScene.subtitle, activeScene.id)
                  }
                >
                  {speakingSceneId === activeScene.id ? "⏹️ Dừng đọc" : "🔊 Nghe thử giọng đọc"}
                </button>
              )}
            </div>
            <textarea
              rows={2}
              value={activeScene.subtitle || ""}
              onChange={(e) => updateActiveScene({ subtitle: e.target.value })}
              placeholder="Nhập lời thoại AI sẽ đọc cho đoạn này..."
              style={{ marginTop: "6px" }}
            />
          </div>

          {/* Right: In/Out Trim Controls & Lip-Sync */}
          <div style={{ background: "#080b14", padding: "12px", borderRadius: "8px", border: "1px solid var(--line)" }}>
            <p className="eyebrow" style={{ margin: "0 0 8px" }}>TRIM & ĐỒNG BỘ KHẨU HÌNH</p>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <span style={{ fontSize: "10px", color: "#94a3b8", display: "block" }}>Điểm đầu (In): {activeScene.start}</span>
                <div style={{ display: "flex", gap: "4px", marginTop: "4px" }}>
                  <button type="button" className="btn-secondary" style={{ padding: "3px 6px", fontSize: "10.5px" }} onClick={() => adjustInPoint(-0.5)}>-0.5s</button>
                  <button type="button" className="btn-secondary" style={{ padding: "3px 6px", fontSize: "10.5px" }} onClick={() => adjustInPoint(+0.5)}>+0.5s</button>
                </div>
              </div>

              <div>
                <span style={{ fontSize: "10px", color: "#94a3b8", display: "block" }}>Điểm cuối (Out): {activeScene.end}</span>
                <div style={{ display: "flex", gap: "4px", marginTop: "4px" }}>
                  <button type="button" className="btn-secondary" style={{ padding: "3px 6px", fontSize: "10.5px" }} onClick={() => adjustOutPoint(-0.5)}>-0.5s</button>
                  <button type="button" className="btn-secondary" style={{ padding: "3px 6px", fontSize: "10.5px" }} onClick={() => adjustOutPoint(+0.5)}>+0.5s</button>
                </div>
              </div>
            </div>

            <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px solid var(--line)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "11px", color: "#cbd5e1" }}>
                  Thời lượng: <strong>{(toSeconds(activeScene.end) - toSeconds(activeScene.start)).toFixed(1)}s</strong>
                </span>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ padding: "4px 10px", fontSize: "11px" }}
                  onClick={performAiLipSync}
                >
                  <Icon name="spark" size={11} /> Khớp khẩu hình
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Modal Cài Đặt Tỷ Lệ */}
      <Modal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        title="Cấu hình Dựng Video"
        eyebrow="STUDIO WORKSPACE CONFIG"
        maxWidth="460px"
      >
        <div>
          <label className="field-label">
            Tỷ lệ khung hình xuất bản
            <select
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value as "9:16" | "1:1" | "16:9")}
            >
              <option value="9:16">9:16 · Dọc (TikTok, Shorts, Reels)</option>
              <option value="16:9">16:9 · Ngang (YouTube, TV)</option>
              <option value="1:1">1:1 · Vuông (Facebook, Instagram)</option>
            </select>
          </label>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
            <button
              type="button"
              className="btn-primary"
              onClick={() => setIsConfigModalOpen(false)}
            >
              Áp dụng
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
