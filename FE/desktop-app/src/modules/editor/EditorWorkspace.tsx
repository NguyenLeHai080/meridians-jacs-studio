import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import type { Job, NavKey } from "../../core/types";
import { getRuntime, isNativeRuntime } from "../../core/runtime";
import { playAudioStream, stopGlobalAudio } from "../../core/audio-player";
import { VOICE_PACKS } from "../../core/voice-packs";
import { Icon } from "../../shared/Icon";
import { type EditorScene } from "./editor.types";
import { Modal } from "../../shared/Modal";

type Props = {
  jobs: Job[];
  onNavigate: (key: NavKey) => void;
  onAddJob?: (job: Job) => void;
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
  const hundredths = Math.floor((total % 1) * 100);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${hundredths.toString().padStart(2, "0")}`;
}

// Media assets for Timeline Studio Library
const SAMPLE_LIBRARY_IMAGES = [
  { id: "img-1", title: "Nature cover, Nov...", meta: "1345 × 1959 · Public domain", color: "#334155" },
  { id: "img-2", title: "Скелі Демерджі...", meta: "3124 × 3124 · CC BY-SA 3.0", color: "#475569" },
  { id: "img-3", title: "Valley Sunset View", meta: "1920 × 1080 · Unsplash", color: "#1e293b" },
  { id: "img-4", title: "Cyberpunk City Neon", meta: "1080 × 1920 · Creative Commons", color: "#0f172a" },
  { id: "img-5", title: "Technology AI Core", meta: "1920 × 1080 · Premium Stock", color: "#0e7490" },
];

const SAMPLE_LIBRARY_VIDEOS = [
  { id: "vid-1", title: "Cinematic B-roll Forest", meta: "00:15 · 1080p 60fps", color: "#065f46" },
  { id: "vid-2", title: "Urban Drone Hyperlapse", meta: "00:10 · 4K UHD", color: "#1e3a8a" },
  { id: "vid-3", title: "Action Combat Sequence", meta: "00:25 · 1080p 60fps", color: "#78350f" },
  { id: "vid-4", title: "Time-lapse Starry Night", meta: "00:18 · 4K 60fps", color: "#4c1d95" },
];

const SAMPLE_LIBRARY_MUSIC = [
  { id: "mus-1", title: "Hoà Cùng Yêu Dấu Nỗi Buồn", meta: "03:45 · Lo-Fi Chill", color: "#38bdf8", type: "music" },
  { id: "mus-2", title: "Kịch Tính Phá Án & Điều Tra", meta: "04:12 · Suspense Thriller", color: "#f59e0b", type: "music" },
  { id: "mus-3", title: "Hành Động Khởi Chiến", meta: "02:30 · Epic Cinematic", color: "#ef4444", type: "music" },
  { id: "mus-4", title: "Vlog Tươi Vui Năng Động", meta: "02:15 · Happy Upbeat", color: "#10b981", type: "music" },
];

const SAMPLE_LIBRARY_SFX = [
  { id: "sfx-1", title: "SFX Whoosh Chuyển Cảnh", meta: "00:01 · Whoosh Sound", color: "#a855f7", type: "sfx" },
  { id: "sfx-2", title: "SFX Cinematic Impact Boom", meta: "00:02 · Bass Drop", color: "#ec4899", type: "sfx" },
  { id: "sfx-3", title: "SFX Pop Notification", meta: "00:01 · Digital Chime", color: "#06b6d4", type: "sfx" },
  { id: "sfx-4", title: "SFX Camera Shutter Snap", meta: "00:01 · Shutter", color: "#64748b", type: "sfx" },
];

const FILTER_PRESETS = [
  { id: "none", name: "Gốc (Normal)", css: "none" },
  { id: "cinematic", name: "Điện ảnh (Cinematic)", css: "contrast(1.15) saturate(1.2) brightness(0.95)" },
  { id: "warm", name: "Ấm áp (Warm Film)", css: "sepia(0.25) saturate(1.3) contrast(1.05)" },
  { id: "noir", name: "Đen trắng (Dark Noir)", css: "grayscale(1) contrast(1.3) brightness(0.9)" },
  { id: "cyber", name: "Cyberpunk Neon", css: "hue-rotate(180deg) saturate(1.5) contrast(1.2)" },
  { id: "vibrant", name: "Rực rỡ (Vibrant)", css: "saturate(1.6) contrast(1.1)" },
  { id: "teal-orange", name: "Teal & Orange", css: "hue-rotate(20deg) contrast(1.2) saturate(1.4)" },
  { id: "moody", name: "Moody Dark", css: "brightness(0.85) contrast(1.25) saturate(0.9)" },
];

const MASK_PRESETS = [
  { id: "none", name: "Không Mask", clip: "none" },
  { id: "letterbox", name: "21:9 Letterbox (Viền trên dưới)", clip: "inset(12% 0 12% 0)" },
  { id: "rounded", name: "Bo góc tròn (Rounded)", clip: "inset(4% 4% 4% 4% round 16px)" },
  { id: "circle", name: "Hình tròn (Circle)", clip: "circle(46% at 50% 50%)" },
  { id: "diamond", name: "Hình thoi (Diamond)", clip: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" },
];

const STICKER_PRESETS = [
  { id: "stk-1", label: "🔔 Like & Subscribe", color: "#ef4444" },
  { id: "stk-2", label: "✨ TikTok Follow", color: "#06b6d4" },
  { id: "stk-3", label: "🔥 Hot News / Tin Nóng", color: "#f97316" },
  { id: "stk-4", label: "🎯 Đăng ký kênh", color: "#10b981" },
  { id: "stk-5", label: "⚡ 50% GIẢM GIÁ", color: "#eab308" },
  { id: "stk-6", label: "💎 100% UY TÍN", color: "#38bdf8" },
];

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
  const [isLooping, setIsLooping] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "1:1" | "16:9" | "4:5">("9:16");
  const [fitMode, setFitMode] = useState<"fit" | "100" | "75" | "50">("fit");
  const [trackMutes, setTrackMutes] = useState<Record<string, boolean>>({});
  const [trackLocks, setTrackLocks] = useState<Record<string, boolean>>({});
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const [isJobDropdownOpen, setIsJobDropdownOpen] = useState(false);
  const [projectMessage, setProjectMessage] = useState("");
  const [speakingSceneId, setSpeakingSceneId] = useState<string | null>(null);

  // Timeline Studio Left Dock / Drawer Navigation
  const [dockTab, setDockTab] = useState<"media" | "captions" | "smart" | "audio" | "effects" | "stickers">("media");
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

  // Audio Controls State
  const [bgmVolume, setBgmVolume] = useState(50);
  const [voiceVolume, setVoiceVolume] = useState(100);
  const [originalAudioVolume, setOriginalAudioVolume] = useState(100);
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [selectedBgm, setSelectedBgm] = useState<string>("mus-1");

  // Captions & Stickers State
  const [activeStickers, setActiveStickers] = useState<Array<{ id: string; label: string; x: number; y: number }>>([]);
  const [subtitleStyle, setSubtitleStyle] = useState<"gold" | "white" | "neon" | "box">("gold");
  const [subtitleSize, setSubtitleSize] = useState<"sm" | "md" | "lg" | "xl">("md");
  const [subtitlePosition, setSubtitlePosition] = useState<"bottom" | "center" | "top">("bottom");
  const [subtitlesVisible, setSubtitlesVisible] = useState(true);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    sceneId: string;
    trackType: string;
  } | null>(null);
  const [copiedScene, setCopiedScene] = useState<EditorScene | null>(null);

  // Drag-and-drop scene reordering & trim states
  const [draggedSceneIdx, setDraggedSceneIdx] = useState<number | null>(null);
  const [dragOverSceneIdx, setDragOverSceneIdx] = useState<number | null>(null);
  const [activeTrimming, setActiveTrimming] = useState<{
    sceneId: string;
    handle: "left" | "right";
    initialDur: number;
    tempScenes: EditorScene[];
  } | null>(null);

  // Undo / Redo History
  const [scenesHistory, setScenesHistory] = useState<EditorScene[][]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);

  const timelineViewportRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingPlayhead = useRef(false);

  const sourceCandidates = useMemo(
    () => jobs.filter((job) => job.localPath || job.sourceType === "url" || job.analysis || job.source),
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
      .replace(/\[\d{1,2}[:.]\d{2}(?:[:.]\d{2})?\s*-\s*\d{1,2}[:.]\d{2}(?:[:.]\d{2})?\]/g, "")
      .replace(/\(\d{1,2}[:.]\d{2}(?:[:.]\d{2})?\s*-\s*\d{1,2}[:.]\d{2}(?:[:.]\d{2})?\)/g, "")
      .replace(/(?:tại|ở|từ)\s+mốc\s+\d{1,2}[:.]\d{2}(?:\s*đến\s+\d{1,2}[:.]\d{2})?,?\s*/gi, "")
      .replace(/(?:vào\s+)?lúc\s+\d{1,2}[:.]\d{2},?\s*/gi, "")
      .replace(/\(\d{1,2}[:.]\d{2}\)/g, "")
      .replace(/\[[^\]]{1,60}\]/g, "")
      .replace(/[{}[\]"\\]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

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
      // fallback
    }

    setSpeakingSceneId(null);
  };

  const stopSceneAudio = () => {
    stopGlobalAudio();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    setSpeakingSceneId(null);
  };

  const [editorScenes, setEditorScenes] = useState<EditorScene[]>([]);

  // Push history state on scene edits
  const setScenesWithHistory = useCallback((newScenes: EditorScene[]) => {
    setEditorScenes(newScenes);
    setScenesHistory((prev) => [...prev.slice(0, historyIdx + 1), newScenes]);
    setHistoryIdx((prev) => prev + 1);
  }, [historyIdx]);

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

  useEffect(() => {
    if (!sourceJob?.analysis?.scenes?.length) {
      const dur = sourceJob?.durationSeconds && sourceJob.durationSeconds > 1 ? sourceJob.durationSeconds : 60;
      const step = dur / 8;
      const sampleTitles = [
        "Hook mở đầu kịch tính",
        "Giới thiệu bối cảnh câu chuyện",
        "Diễn biến kịch tính xuất hiện",
        "Xung đột và mâu thuẫn chính",
        "Bí mật dần được hé lộ",
        "Chi tiết bất ngờ xuất hiện",
        "Cao trào và bước ngoặt",
        "Tổng kết & Kêu gọi theo dõi",
      ];
      const sampleDialogues = [
        "Khám phá ngay: Những diễn biến bất ngờ liên tục xuất hiện!",
        "Linh hồn cứ trôi dạt đến những miền ký ức xa xăm khó tả.",
        "Những kẻ phá hoại đang âm thầm lên kế hoạch đằng sau màn đêm.",
        "Trước lòng yêu thương và sự hy sinh, mọi thử thách đều nhỏ bé.",
        "Để giúp cô ấy vượt qua khó khăn, chúng ta cần tìm ra sự thật.",
        "Một bí mật đã được chôn giấu suốt nhiều năm qua nay hé mở.",
        "Quyết định sinh tử trong khoảnh khắc định mệnh của cuộc đời.",
        "Đừng quên like và đăng ký kênh để đón xem những video tiếp theo!",
      ];

      const initial: EditorScene[] = Array.from({ length: 8 }).map((_, idx) => {
        const startSec = idx * step;
        const endSec = (idx + 1) * step;
        return {
          id: `scene-${idx + 1}`,
          start: formatSeconds(startSec),
          end: formatSeconds(endSec),
          title: `Cảnh ${idx + 1}: ${sampleTitles[idx]}`,
          detail: `Phân đoạn ${idx + 1}`,
          subtitle: sampleDialogues[idx],
          accent: idx % 2 === 0 ? "cyan" : "purple",
        };
      });

      setEditorScenes(initial);
      setScenesHistory([initial]);
      setHistoryIdx(0);
      return;
    }

    const initial: EditorScene[] = sourceJob.analysis.scenes.map((s, idx) => ({
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
    }));
    setEditorScenes(initial);
    setScenesHistory([initial]);
    setHistoryIdx(0);
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

  // Sync active scene with playhead
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

  // Sync video element & audio volume
  const mediaUrl = sourceJob?.localPath ? fileUrl(sourceJob.localPath) : undefined;
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const isOrigMuted = muted || Boolean(trackMutes.originalAudio) || originalAudioVolume === 0;
    video.muted = isOrigMuted;
    video.volume = isOrigMuted ? 0 : Math.max(0, Math.min(1, originalAudioVolume / 100));
  }, [muted, trackMutes.originalAudio, originalAudioVolume]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !mediaUrl) return;
    if (Math.abs(video.currentTime - playheadSeconds) > 0.3) {
      video.currentTime = playheadSeconds;
    }
    if (playing) {
      void video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  }, [mediaUrl, playing, playheadSeconds]);

  const effectiveScenes = useMemo(() => {
    return activeTrimming?.tempScenes || editorScenes;
  }, [activeTrimming, editorScenes]);

  // Sequence Timeline Duration
  const sequenceDuration = useMemo(() => {
    const maxEnd = effectiveScenes.reduce((max, s) => Math.max(max, toSeconds(s.end)), 0);
    if (sourceJob?.durationSeconds && sourceJob.durationSeconds > 1) {
      return Math.max(sourceJob.durationSeconds, maxEnd);
    }
    return Math.max(maxEnd, 10);
  }, [sourceJob?.durationSeconds, effectiveScenes]);

  // Compute layout for each clip
  const clipLayouts = useMemo(() => {
    return effectiveScenes.map((item, idx) => {
      const startSec = toSeconds(item.start);
      const endSec = toSeconds(item.end);
      const dur = Math.max(0.5, endSec - startSec);
      const left = (startSec / sequenceDuration) * 100;
      const width = Math.max(0.5, (dur / sequenceDuration) * 100);
      return {
        scene: item,
        index: idx,
        startSec,
        endSec,
        left,
        width,
        dur,
        // Stagger across 3 audio lanes: Lane 0, Lane 1, Lane 2
        audioLane: idx % 3,
      };
    });
  }, [effectiveScenes, sequenceDuration]);

  // Interactive Clip Trimming (Magnetic Ripple Edit: Đẩy và kéo mượt mà các phân cảnh tiếp theo)
  const handleTrimStart = (
    e: React.MouseEvent,
    scene: EditorScene,
    handle: "left" | "right"
  ) => {
    e.stopPropagation();
    e.preventDefault();
    const viewport = timelineViewportRef.current;
    if (!viewport) return;
    const rect = viewport.getBoundingClientRect();
    const startX = e.clientX;
    const initDur = Math.max(0.3, toSeconds(scene.end) - toSeconds(scene.start));
    const contentEl = viewport.querySelector<HTMLElement>(".ts-lanes-content");
    const totalWidth = (contentEl ? contentEl.clientWidth : (rect.width * zoomLevel)) || rect.width;
    const secPerPx = sequenceDuration / totalWidth;

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    let rafId: number | null = null;

    const onPointerMove = (moveEvt: MouseEvent) => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const deltaX = moveEvt.clientX - startX;
        const deltaSec = deltaX * secPerPx;
        let targetDur = initDur;
        if (handle === "right") {
          targetDur = Math.max(0.3, initDur + deltaSec);
        } else {
          targetDur = Math.max(0.3, initDur - deltaSec);
        }

        // Magnetic Ripple calculation: tự động đẩy toàn bộ phân cảnh phía sau, không bao giờ bị đè chồng
        let curTime = 0;
        const rippled = editorScenes.map((s) => {
          let d = Math.max(0.3, toSeconds(s.end) - toSeconds(s.start));
          if (s.id === scene.id) {
            d = targetDur;
          }
          const sStr = formatSeconds(curTime);
          curTime += d;
          const eStr = formatSeconds(curTime);
          return { ...s, start: sStr, end: eStr };
        });

        setActiveTrimming({
          sceneId: scene.id,
          handle,
          initialDur: initDur,
          tempScenes: rippled,
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
      let targetDur = initDur;
      if (handle === "right") {
        targetDur = Math.max(0.3, initDur + deltaSec);
      } else {
        targetDur = Math.max(0.3, initDur - deltaSec);
      }

      let curTime = 0;
      const finalScenes = editorScenes.map((s) => {
        let d = Math.max(0.3, toSeconds(s.end) - toSeconds(s.start));
        if (s.id === scene.id) {
          d = targetDur;
        }
        const sStr = formatSeconds(curTime);
        curTime += d;
        const eStr = formatSeconds(curTime);
        return { ...s, start: sStr, end: eStr };
      });

      setScenesWithHistory(finalScenes);
      setActiveTrimming(null);
      const changedScene = finalScenes.find((s) => s.id === scene.id);
      if (changedScene) {
        setProjectMessage(
          `✓ Đã chỉnh thời lượng cảnh: ${changedScene.start} - ${changedScene.end} (${targetDur.toFixed(1)}s)`
        );
        setTimeout(() => setProjectMessage(""), 2000);
      }
    };

    window.addEventListener("mousemove", onPointerMove);
    window.addEventListener("mouseup", onPointerUp);
  };

  // Drag & Drop Reordering of Scenes
  const handleDragStartScene = (e: React.DragEvent, index: number) => {
    setDraggedSceneIdx(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragOverScene = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverSceneIdx !== index) {
      setDragOverSceneIdx(index);
    }
  };

  const handleDragLeaveScene = () => {
    setDragOverSceneIdx(null);
  };

  const handleDropScene = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    setDragOverSceneIdx(null);
    const fromIndex = draggedSceneIdx;
    setDraggedSceneIdx(null);
    if (fromIndex === null || fromIndex === targetIndex) return;

    const nextScenes = [...editorScenes];
    const [moved] = nextScenes.splice(fromIndex, 1);
    nextScenes.splice(targetIndex, 0, moved);

    // Recalculate sequential start and end times
    let curTime = 0;
    const recalculated = nextScenes.map((sc) => {
      const dur = Math.max(1, toSeconds(sc.end) - toSeconds(sc.start));
      const startStr = formatSeconds(curTime);
      curTime += dur;
      const endStr = formatSeconds(curTime);
      return { ...sc, start: startStr, end: endStr };
    });

    setScenesWithHistory(recalculated);
    setSceneId(moved.id);
    setPlayheadSeconds(toSeconds(recalculated[targetIndex].start));
    setProjectMessage(`✓ Đã chuyển "${moved.title}" sang vị trí ${targetIndex + 1}`);
    setTimeout(() => setProjectMessage(""), 2500);
  };

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
    if (e.button === 2) return;
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

  // Split active scene at playhead position
  const splitActiveScene = () => {
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
  };

  // Delete active scene
  const deleteActiveScene = () => {
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
  };

  // Add new scene segment
  const addNewSceneSegment = () => {
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
    setPlayheadSeconds(startNum);
    setProjectMessage(`✓ Đã thêm phân cảnh mới: "${newScene.title}"`);
    setTimeout(() => setProjectMessage(""), 2500);
  };

  // Native Upload Video/Image File Picker
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
          mode: "local-cpu",
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

  // Export handlers
  const handleExportFull = () => {
    setIsExportDropdownOpen(false);
    if (!sourceJob || !onAddJob) return;

    onAddJob({
      id: `export-full-${Date.now()}`,
      name: `${sourceJob.name} (Xuất 1 Video Hoàn Chỉnh)`,
      source: sourceJob.source,
      sourceType: sourceJob.sourceType,
      localPath: sourceJob.localPath,
      mode: "local-cpu",
      aspectRatio: aspectRatio === "4:5" ? "9:16" : aspectRatio,
      narratorEnabled: true,
      narratorGender: "male",
      narratorVoice: selectedVoice,
      subtitlesEnabled: subtitlesVisible,
      subtitleText: editorScenes.map((s) => s.subtitle).filter(Boolean).join(" "),
      status: "queued",
      stage: "queued",
      progress: 0,
      createdAt: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      synced: true,
    });
    setProjectMessage("🚀 Đã đưa 1 Video hoàn chỉnh vào hàng đợi Render!");
    setTimeout(() => onNavigate("render"), 800);
  };

  const handleExportScenes = () => {
    setIsExportDropdownOpen(false);
    if (!sourceJob || !onAddJob) return;

    editorScenes.forEach((scene, index) => {
      onAddJob({
        id: `export-scene-${Date.now()}-${index + 1}`,
        name: `${sourceJob.name} · Cảnh ${index + 1}: ${scene.title}`,
        source: sourceJob.source,
        sourceType: sourceJob.sourceType,
        localPath: sourceJob.localPath,
        mode: "local-cpu",
        aspectRatio: aspectRatio === "4:5" ? "9:16" : aspectRatio,
        narratorEnabled: true,
        narratorGender: "male",
        narratorVoice: selectedVoice,
        subtitlesEnabled: subtitlesVisible,
        subtitleText: scene.subtitle,
        clipStartSeconds: toSeconds(scene.start),
        clipEndSeconds: toSeconds(scene.end),
        status: "queued",
        stage: "queued",
        progress: 0,
        createdAt: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
        synced: true,
      });
    });
    setProjectMessage(`🚀 Đã thêm ${editorScenes.length} phân cảnh riêng lẻ vào hàng đợi Render!`);
    setTimeout(() => onNavigate("render"), 800);
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

  // Right-click context menu handler (Positioned directly at mouse pointer)
  const handleClipContextMenu = (e: React.MouseEvent, sceneId?: string, trackType = "clip") => {
    e.preventDefault();
    e.stopPropagation();
    if (sceneId) {
      setSceneId(sceneId);
    }
    const menuW = 230;
    const menuH = 290;
    let x = e.clientX;
    let y = e.clientY;

    // Smart anchor: if opening downwards overflows window bottom, open upwards from cursor
    if (y + menuH > window.innerHeight - 8) {
      y = e.clientY - menuH;
    }
    // If opening rightwards overflows window right, open to the left of cursor
    if (x + menuW > window.innerWidth - 8) {
      x = e.clientX - menuW;
    }

    x = Math.max(8, Math.min(x, window.innerWidth - menuW - 8));
    y = Math.max(8, Math.min(y, window.innerHeight - menuH - 8));

    setContextMenu({
      visible: true,
      x,
      y,
      sceneId: sceneId || activeSceneId,
      trackType,
    });
  };

  // Keyboard Shortcuts & Click Outside
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

  // Subtitle Karaoke Word Highlight
  const sceneStartSec = toSeconds(activeScene.start);
  const sceneEndSec = toSeconds(activeScene.end);
  const sceneDur = Math.max(0.5, sceneEndSec - sceneStartSec);
  const currentOffset = Math.max(0, Math.min(sceneDur, playheadSeconds - sceneStartSec));
  const progressRatio = currentOffset / sceneDur;
  const subtitleWords = (activeScene.subtitle || "").split(/\s+/).filter(Boolean);
  const activeWordIdx = Math.floor(progressRatio * subtitleWords.length);

  const activeFilterObj = FILTER_PRESETS.find((f) => f.id === selectedFilter) || FILTER_PRESETS[0];
  const activeMaskObj = MASK_PRESETS.find((m) => m.id === selectedMask) || MASK_PRESETS[0];

  return (
    <div className="timeline-studio-app page-enter">
      {/* 1. TOP GLOBAL HEADER BAR WITH WORKFLOW NAVIGATION */}
      <header className="ts-top-header">
        <div className="ts-header-left">
          {/* Workflow Stepper Shortcut Bar */}
          <div className="ts-workflow-steps-pills">
            <button type="button" className="ts-wf-pill" onClick={() => onNavigate("sources")}>
              1. Nguồn
            </button>
            <button type="button" className="ts-wf-pill" onClick={() => onNavigate("analysis")}>
              2. Phân tích
            </button>
            <button type="button" className="ts-wf-pill" onClick={() => onNavigate("story")}>
              3. Kịch bản
            </button>
            <button type="button" className="ts-wf-pill is-active">
              4. Dựng & Timeline
            </button>
            <button type="button" className="ts-wf-pill" onClick={() => onNavigate("render")}>
              5. Xuất bản
            </button>
          </div>

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
            <span className="ts-autosave-dot" /> Autosaved · {editorScenes.length} Cảnh ({formatSeconds(sequenceDuration)})
          </div>

          {projectMessage && (
            <div className="ts-toast-badge">{projectMessage}</div>
          )}
        </div>

        <div className="ts-header-center">
          <button type="button" className="ts-header-btn" title="Hoàn tác (Ctrl+Z)" onClick={undoTimeline}>
            <Icon name="undo" size={13} /> Undo
          </button>
          <button type="button" className="ts-header-btn" title="Làm lại (Ctrl+Y)" onClick={redoTimeline}>
            <Icon name="redo" size={13} /> Redo
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
          <button
            type="button"
            className="ts-header-btn"
            onClick={() => setPlaying((p) => !p)}
          >
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
                ✂️ Tách Từng Phân Cảnh Riêng ({editorScenes.length} video)
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

      {/* 2. MAIN 4-COLUMN RESIZABLE / RESPONSIVE WORKSPACE */}
      <div className="ts-workspace-body">
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
                            setPlayheadSeconds(toSeconds(sc.start));
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
                      setPlayheadSeconds(toSeconds(sc.start));
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
                  <span>Âm thanh video gốc</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <strong style={{ color: trackMutes.originalAudio ? "#ef4444" : "#f59e0b" }}>
                      {trackMutes.originalAudio ? "Đang tắt" : `${originalAudioVolume}%`}
                    </strong>
                    <button
                      type="button"
                      className={`ts-chip-btn ${trackMutes.originalAudio ? "is-active" : ""}`}
                      onClick={() => {
                        setTrackMutes((c) => {
                          const next = !c.originalAudio;
                          setProjectMessage(next ? "🔇 Đã tắt âm thanh gốc video" : "🔊 Đã bật lại âm thanh gốc video");
                          setTimeout(() => setProjectMessage(""), 2000);
                          return { ...c, originalAudio: next };
                        });
                      }}
                      style={{ padding: "1px 6px", fontSize: "9.5px", color: trackMutes.originalAudio ? "#ef4444" : "#2dd4bf" }}
                    >
                      {trackMutes.originalAudio ? "🔇 Bật lại" : "🔊 Tắt gốc"}
                    </button>
                  </div>
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

        {/* COLUMN 2: CENTER VIDEO STAGE & PLAYER CONTROLS */}
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
                  muted={muted || Boolean(trackMutes.audio)}
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
                  onEnded={() => {
                    if (isLooping) {
                      setPlayheadSeconds(0);
                      void videoRef.current?.play();
                    } else {
                      setPlaying(false);
                    }
                  }}
                  onTimeUpdate={(e) => {
                    if (!isDraggingPlayhead.current) {
                      setPlayheadSeconds(e.currentTarget.currentTime);
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
                      const isSpoken = wIdx <= activeWordIdx;
                      const isCurrent = wIdx === activeWordIdx;

                      return (
                        <span
                          key={wIdx}
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

          {/* Under-Player Scrub Bar & Action Controls */}
          <div className="ts-player-controls-bar">
            {/* Scrubber Bar */}
            <div
              className="ts-player-scrub-track"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pct = (e.clientX - rect.left) / rect.width;
                setPlayheadSeconds(pct * sequenceDuration);
              }}
            >
              <div
                className="ts-player-scrub-progress"
                style={{ width: `${(playheadSeconds / sequenceDuration) * 100}%` }}
              />
              <div
                className="ts-player-scrub-thumb"
                style={{ left: `${(playheadSeconds / sequenceDuration) * 100}%` }}
              />
            </div>

            {/* Bottom Row Buttons */}
            <div className="ts-player-bottom-buttons">
              <span className="ts-player-timecode">
                {formatTimecodePrecise(playheadSeconds)} / {formatTimecodePrecise(sequenceDuration)}
              </span>

              <div className="ts-player-transport-actions">
                <button
                  type="button"
                  className="ts-transport-btn"
                  title="Về đầu (Home)"
                  onClick={() => setPlayheadSeconds(0)}
                >
                  <span style={{ fontSize: "11px", fontWeight: 800 }}>|◀</span>
                </button>
                <button
                  type="button"
                  className="ts-transport-btn"
                  title="Lùi 1s (Left Arrow)"
                  onClick={() => setPlayheadSeconds((s) => Math.max(0, s - 1))}
                >
                  <Icon name="chevron-left" size={13} />
                </button>
                <button
                  type="button"
                  className="ts-transport-play-btn"
                  title="Phát / Dừng (Space)"
                  onClick={() => setPlaying((p) => !p)}
                >
                  <Icon name={playing ? "pause" : "play"} size={15} />
                </button>
                <button
                  type="button"
                  className="ts-transport-btn"
                  title="Tiến 1s (Right Arrow)"
                  onClick={() => setPlayheadSeconds((s) => Math.min(sequenceDuration, s + 1))}
                >
                  <Icon name="chevron-right" size={13} />
                </button>
                <button
                  type="button"
                  className="ts-transport-btn"
                  title="Về cuối (End)"
                  onClick={() => setPlayheadSeconds(sequenceDuration)}
                >
                  <span style={{ fontSize: "11px", fontWeight: 800 }}>▶|</span>
                </button>
                <button
                  type="button"
                  className={`ts-transport-btn ${isLooping ? "is-active" : ""}`}
                  title={isLooping ? "Đang bật lặp lại" : "Lặp lại (Loop)"}
                  onClick={() => setIsLooping((l) => !l)}
                >
                  <Icon name="refresh" size={12} />
                </button>
                <button
                  type="button"
                  className={`ts-transport-btn ${muted ? "is-active" : ""}`}
                  title={muted ? "Bật tổng âm lượng" : "Tắt tổng âm lượng (Master Mute)"}
                  onClick={() => setMuted((m) => !m)}
                >
                  <Icon name={muted ? "volume-mute" : "volume"} size={12} />
                </button>
                <button
                  type="button"
                  className={`ts-transport-btn ${trackMutes.originalAudio ? "is-active" : ""}`}
                  title={trackMutes.originalAudio ? "Âm thanh gốc: ĐANG TẮT (Nhấn để bật lại)" : "Âm thanh gốc: ĐANG BẬT (Nhấn để tắt tiếng gốc)"}
                  onClick={() => {
                    setTrackMutes((c) => {
                      const next = !c.originalAudio;
                      setProjectMessage(next ? "🔇 Đã tắt âm thanh gốc video" : "🔊 Đã bật âm thanh gốc video");
                      setTimeout(() => setProjectMessage(""), 2000);
                      return { ...c, originalAudio: next };
                    });
                  }}
                  style={{
                    color: trackMutes.originalAudio ? "#ef4444" : "#94a3b8",
                    display: "flex",
                    alignItems: "center",
                    gap: "2px",
                    padding: "2px 5px",
                    borderRadius: "4px",
                    background: trackMutes.originalAudio ? "rgba(239, 68, 68, 0.12)" : "transparent",
                    border: trackMutes.originalAudio ? "1px solid rgba(239, 68, 68, 0.35)" : "none",
                  }}
                >
                  <Icon name={trackMutes.originalAudio ? "volume-mute" : "volume"} size={11} />
                  <span style={{ fontSize: "9.5px", fontWeight: 700 }}>Gốc</span>
                </button>
              </div>

              <div className="ts-player-fit-actions">
                <select
                  value={fitMode}
                  onChange={(e) => setFitMode(e.target.value as "fit" | "100" | "75" | "50")}
                  className="ts-fit-select"
                >
                  <option value="fit">Fit ⌵</option>
                  <option value="100">100%</option>
                  <option value="75">75%</option>
                  <option value="50">50%</option>
                </select>
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
          </div>
        </main>

        {/* COLUMN 3: RIGHT PROPERTIES & INSPECTOR PANEL */}
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
                    const nextScenes = editorScenes.map((s) => (s.id === activeSceneId ? { ...s, subtitle: e.target.value } : s));
                    setScenesWithHistory(nextScenes);
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
                      const updated = editorScenes.map((s) => (s.id === activeSceneId ? { ...s, subtitle: polished } : s));
                      setScenesWithHistory(updated);
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
      </div>

      {/* 3. BOTTOM MULTI-TRACK STAGGERED CAPCUT-STYLE TIMELINE */}
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
                const updated = editorScenes.map((s) => s.id === activeSceneId ? { ...s, start: formatSeconds(nextStart) } : s);
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

            {/* Track 3: Audio A1 (Staggered Lane 1) */}
            <div className="ts-lane-header-row header-audio">
              <button
                type="button"
                className="ts-lane-btn"
                title={trackMutes.voice1 ? "Bật tiếng A1" : "Tắt tiếng A1"}
                onClick={() => setTrackMutes((c) => ({ ...c, voice1: !c.voice1 }))}
              >
                <Icon name="mic" size={11} />
              </button>
              <button
                type="button"
                className="ts-lane-btn"
                title={trackLocks.voice1 ? "Mở khóa" : "Khóa track"}
                onClick={() => setTrackLocks((c) => ({ ...c, voice1: !c.voice1 }))}
              >
                <Icon name={trackLocks.voice1 ? "lock" : "unlock"} size={11} />
              </button>
              <span className="ts-lane-title">🎵 Voice A1</span>
            </div>

            {/* Track 4: Audio A2 (Staggered Lane 2) */}
            <div className="ts-lane-header-row header-audio">
              <button
                type="button"
                className="ts-lane-btn"
                title={trackMutes.voice2 ? "Bật tiếng A2" : "Tắt tiếng A2"}
                onClick={() => setTrackMutes((c) => ({ ...c, voice2: !c.voice2 }))}
              >
                <Icon name="mic" size={11} />
              </button>
              <button
                type="button"
                className="ts-lane-btn"
                title={trackLocks.voice2 ? "Mở khóa" : "Khóa track"}
                onClick={() => setTrackLocks((c) => ({ ...c, voice2: !c.voice2 }))}
              >
                <Icon name={trackLocks.voice2 ? "lock" : "unlock"} size={11} />
              </button>
              <span className="ts-lane-title">🎵 Voice A2</span>
            </div>

            {/* Track 5: Audio A3 (Staggered Lane 3) */}
            <div className="ts-lane-header-row header-audio">
              <button
                type="button"
                className="ts-lane-btn"
                title={trackMutes.voice3 ? "Bật tiếng A3" : "Tắt tiếng A3"}
                onClick={() => setTrackMutes((c) => ({ ...c, voice3: !c.voice3 }))}
              >
                <Icon name="mic" size={11} />
              </button>
              <button
                type="button"
                className="ts-lane-btn"
                title={trackLocks.voice3 ? "Mở khóa" : "Khóa track"}
                onClick={() => setTrackLocks((c) => ({ ...c, voice3: !c.voice3 }))}
              >
                <Icon name={trackLocks.voice3 ? "lock" : "unlock"} size={11} />
              </button>
              <span className="ts-lane-title">🎵 Voice A3</span>
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
                        style={{ left: `${(secs / sequenceDuration) * 100}%` }}
                      >
                        {isMajor ? formatSeconds(secs) : `${formatSeconds(secs)}.50`}
                      </span>
                    );
                  }
                )}
              </div>

              {/* Playhead Marker & Line */}
              <div
                className="ts-timeline-playhead"
                style={{
                  left: `${Math.min(100, Math.max(0, (playheadSeconds / sequenceDuration) * 100))}%`,
                }}
                onMouseDown={onTimelineMouseDown}
                title="Kéo con trỏ Playhead"
              >
                <div className="ts-playhead-pointer">▽</div>
              </div>

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
                      style={{ left: `${item.left}%`, width: `${item.width}%` }}
                      draggable={true}
                      onDragStart={(e) => handleDragStartScene(e, item.index)}
                      onDragOver={(e) => handleDragOverScene(e, item.index)}
                      onDragLeave={handleDragLeaveScene}
                      onDrop={(e) => handleDropScene(e, item.index)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSceneId(item.scene.id);
                        setPlayheadSeconds(toSeconds(item.scene.start));
                      }}
                      onContextMenu={(e) => handleClipContextMenu(e, item.scene.id, "captions")}
                    >
                      <div
                        className="ts-clip-handle ts-handle-left"
                        draggable={false}
                        title="Kéo co giãn đầu phân cảnh (Ripple)"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleTrimStart(e, item.scene, "left");
                        }}
                      />
                      <span className="ts-caption-coral-tag">T</span>
                      <span className="ts-caption-coral-text" title={subText}>
                        {subText}
                      </span>
                      <div
                        className="ts-clip-handle ts-handle-right"
                        draggable={false}
                        title="Kéo co giãn đuôi phân cảnh (Ripple)"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleTrimStart(e, item.scene, "right");
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
                  const frameImg = previewFrames[item.index % (previewFrames.length || 1)]?.imageDataUrl;

                  return (
                    <div
                      key={`visual-${item.scene.id}-${item.index}`}
                      className={`ts-clip-card clip-visuals-teal ${isSelected ? "is-selected" : ""} ${isDragOver ? "is-drag-over" : ""} ${isDragging ? "is-dragging" : ""}`}
                      style={{ left: `${item.left}%`, width: `${item.width}%` }}
                      draggable={true}
                      onDragStart={(e) => handleDragStartScene(e, item.index)}
                      onDragOver={(e) => handleDragOverScene(e, item.index)}
                      onDragLeave={handleDragLeaveScene}
                      onDrop={(e) => handleDropScene(e, item.index)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSceneId(item.scene.id);
                        setPlayheadSeconds(toSeconds(item.scene.start));
                      }}
                      onContextMenu={(e) => handleClipContextMenu(e, item.scene.id, "visuals")}
                    >
                      <div
                        className="ts-clip-handle ts-handle-left"
                        draggable={false}
                        title="Kéo co giãn đầu cảnh (Ripple)"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleTrimStart(e, item.scene, "left");
                        }}
                      />
                      <div className="ts-visual-topline">
                        <span className="ts-visual-title-tag">
                          {item.scene.title} · {item.scene.start}
                        </span>
                      </div>
                      <div className="ts-clip-filmstrip-row">
                        {frameImg ? (
                          Array.from({ length: Math.max(1, Math.floor(item.dur / 2.5)) }).map((_, fIdx) => (
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
                        title="Kéo co giãn đuôi cảnh (Ripple)"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleTrimStart(e, item.scene, "right");
                        }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* TRACK 3: AUDIO A1 (Staggered Lane 0) */}
              <div className="ts-track-lane lane-audio-staggered">
                {clipLayouts.filter((item) => item.audioLane === 0).map((item) => {
                  const isSelected = item.scene.id === activeSceneId;
                  const isSpeaking = speakingSceneId === item.scene.id;
                  const isDragOver = dragOverSceneIdx === item.index;
                  return (
                    <div
                      key={`aud1-${item.scene.id}-${item.index}`}
                      className={`ts-clip-card clip-audio-staggered ${isSelected ? "is-selected" : ""} ${isSpeaking ? "is-speaking" : ""} ${isDragOver ? "is-drag-over" : ""}`}
                      style={{ left: `${item.left}%`, width: `${item.width}%` }}
                      draggable={true}
                      onDragStart={(e) => handleDragStartScene(e, item.index)}
                      onDragOver={(e) => handleDragOverScene(e, item.index)}
                      onDragLeave={handleDragLeaveScene}
                      onDrop={(e) => handleDropScene(e, item.index)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSceneId(item.scene.id);
                        setPlayheadSeconds(toSeconds(item.scene.start));
                        if (item.scene.subtitle) {
                          playSceneAudio(item.scene.subtitle, item.scene.id);
                        }
                      }}
                      onContextMenu={(e) => handleClipContextMenu(e, item.scene.id, "voice")}
                    >
                      <div
                        className="ts-clip-handle ts-handle-left"
                        draggable={false}
                        title="Kéo co giãn đầu âm thanh (Ripple)"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleTrimStart(e, item.scene, "left");
                        }}
                      />
                      <div className="ts-audio-clip-header">
                        <span className="ts-audio-file-name">sub_{item.index + 1}_voice.wav</span>
                        <span className="ts-audio-duration-tag">{item.dur.toFixed(1)}s</span>
                      </div>
                      <div className="ts-audio-waveform-row">
                        {Array.from({ length: Math.max(12, Math.floor(item.dur * 8)) }).map((_, wIdx) => (
                          <span
                            key={wIdx}
                            className="ts-waveform-bar"
                            style={{
                              height: `${[40, 85, 100, 50, 95, 70, 90, 45, 80, 60, 95, 75][wIdx % 12]}%`,
                              background: "#38bdf8",
                            }}
                          />
                        ))}
                      </div>
                      <div
                        className="ts-clip-handle ts-handle-right"
                        draggable={false}
                        title="Kéo co giãn đuôi âm thanh (Ripple)"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleTrimStart(e, item.scene, "right");
                        }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* TRACK 4: AUDIO A2 (Staggered Lane 1) */}
              <div className="ts-track-lane lane-audio-staggered">
                {clipLayouts.filter((item) => item.audioLane === 1).map((item) => {
                  const isSelected = item.scene.id === activeSceneId;
                  const isSpeaking = speakingSceneId === item.scene.id;
                  const isDragOver = dragOverSceneIdx === item.index;
                  return (
                    <div
                      key={`aud2-${item.scene.id}-${item.index}`}
                      className={`ts-clip-card clip-audio-staggered ${isSelected ? "is-selected" : ""} ${isSpeaking ? "is-speaking" : ""} ${isDragOver ? "is-drag-over" : ""}`}
                      style={{ left: `${item.left}%`, width: `${item.width}%` }}
                      draggable={true}
                      onDragStart={(e) => handleDragStartScene(e, item.index)}
                      onDragOver={(e) => handleDragOverScene(e, item.index)}
                      onDragLeave={handleDragLeaveScene}
                      onDrop={(e) => handleDropScene(e, item.index)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSceneId(item.scene.id);
                        setPlayheadSeconds(toSeconds(item.scene.start));
                        if (item.scene.subtitle) {
                          playSceneAudio(item.scene.subtitle, item.scene.id);
                        }
                      }}
                      onContextMenu={(e) => handleClipContextMenu(e, item.scene.id, "voice")}
                    >
                      <div
                        className="ts-clip-handle ts-handle-left"
                        draggable={false}
                        title="Kéo co giãn đầu âm thanh (Ripple)"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleTrimStart(e, item.scene, "left");
                        }}
                      />
                      <div className="ts-audio-clip-header">
                        <span className="ts-audio-file-name">sub_{item.index + 1}_voice.wav</span>
                        <span className="ts-audio-duration-tag">{item.dur.toFixed(1)}s</span>
                      </div>
                      <div className="ts-audio-waveform-row">
                        {Array.from({ length: Math.max(12, Math.floor(item.dur * 8)) }).map((_, wIdx) => (
                          <span
                            key={wIdx}
                            className="ts-waveform-bar"
                            style={{
                              height: `${[55, 90, 75, 100, 45, 80, 65, 95, 40, 85, 70, 90][wIdx % 12]}%`,
                              background: "#38bdf8",
                            }}
                          />
                        ))}
                      </div>
                      <div
                        className="ts-clip-handle ts-handle-right"
                        draggable={false}
                        title="Kéo co giãn đuôi âm thanh (Ripple)"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleTrimStart(e, item.scene, "right");
                        }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* TRACK 5: AUDIO A3 (Staggered Lane 2) */}
              <div className="ts-track-lane lane-audio-staggered">
                {clipLayouts.filter((item) => item.audioLane === 2).map((item) => {
                  const isSelected = item.scene.id === activeSceneId;
                  const isSpeaking = speakingSceneId === item.scene.id;
                  const isDragOver = dragOverSceneIdx === item.index;
                  return (
                    <div
                      key={`aud3-${item.scene.id}-${item.index}`}
                      className={`ts-clip-card clip-audio-staggered ${isSelected ? "is-selected" : ""} ${isSpeaking ? "is-speaking" : ""} ${isDragOver ? "is-drag-over" : ""}`}
                      style={{ left: `${item.left}%`, width: `${item.width}%` }}
                      draggable={true}
                      onDragStart={(e) => handleDragStartScene(e, item.index)}
                      onDragOver={(e) => handleDragOverScene(e, item.index)}
                      onDragLeave={handleDragLeaveScene}
                      onDrop={(e) => handleDropScene(e, item.index)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSceneId(item.scene.id);
                        setPlayheadSeconds(toSeconds(item.scene.start));
                        if (item.scene.subtitle) {
                          playSceneAudio(item.scene.subtitle, item.scene.id);
                        }
                      }}
                      onContextMenu={(e) => handleClipContextMenu(e, item.scene.id, "voice")}
                    >
                      <div
                        className="ts-clip-handle ts-handle-left"
                        draggable={false}
                        title="Kéo co giãn đầu âm thanh (Ripple)"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleTrimStart(e, item.scene, "left");
                        }}
                      />
                      <div className="ts-audio-clip-header">
                        <span className="ts-audio-file-name">sub_{item.index + 1}_voice.wav</span>
                        <span className="ts-audio-duration-tag">{item.dur.toFixed(1)}s</span>
                      </div>
                      <div className="ts-audio-waveform-row">
                        {Array.from({ length: Math.max(12, Math.floor(item.dur * 8)) }).map((_, wIdx) => (
                          <span
                            key={wIdx}
                            className="ts-waveform-bar"
                            style={{
                              height: `${[45, 75, 95, 60, 85, 50, 100, 40, 90, 65, 80, 70][wIdx % 12]}%`,
                              background: "#38bdf8",
                            }}
                          />
                        ))}
                      </div>
                      <div
                        className="ts-clip-handle ts-handle-right"
                        draggable={false}
                        title="Kéo co giãn đuôi âm thanh (Ripple)"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleTrimStart(e, item.scene, "right");
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
                    {Array.from({ length: 48 }).map((_, wIdx) => (
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

      {/* RIGHT-CLICK CONTEXT MENU (CAPCUT & TIMELINE STUDIO STYLE) VIA PORTAL */}
      {contextMenu && contextMenu.visible && typeof document !== "undefined" && createPortal(
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
      )}

      {/* Modal Cài Đặt Tỷ Lệ & Render */}
      <Modal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        title="Cấu hình Dựng & Render Video"
        eyebrow="TIMELINE STUDIO SETTINGS"
        maxWidth="480px"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <label className="field-label">
            Tỷ lệ khung hình mặc định
            <select
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value as "9:16" | "1:1" | "16:9" | "4:5")}
              className="ts-select-box"
              style={{ marginTop: "4px" }}
            >
              <option value="9:16">9:16 · Dọc (TikTok, Shorts, Reels)</option>
              <option value="16:9">16:9 · Ngang (YouTube, TV)</option>
              <option value="1:1">1:1 · Vuông (Facebook, Instagram)</option>
              <option value="4:5">4:5 · Chân dung (Instagram Portrait)</option>
            </select>
          </label>

          <label className="field-label">
            Độ phân giải Render Video
            <select className="ts-select-box" style={{ marginTop: "4px" }}>
              <option value="1080p">1080p Full HD (Khuyên dùng)</option>
              <option value="4k">4K Ultra HD (Chất lượng cao nhất)</option>
              <option value="720p">720p HD (Tốc độ render nhanh)</option>
            </select>
          </label>

          <label className="field-label">
            Tốc độ khung hình (Frame Rate)
            <select className="ts-select-box" style={{ marginTop: "4px" }}>
              <option value="60fps">60 FPS (Siêu mượt mà)</option>
              <option value="30fps">30 FPS (Chuẩn cơ bản)</option>
              <option value="24fps">24 FPS (Chuẩn điện ảnh)</option>
            </select>
          </label>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px", gap: "8px" }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setIsConfigModalOpen(false)}
            >
              Đóng
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setIsConfigModalOpen(false);
                setProjectMessage("✓ Đã lưu cài đặt cấu hình thành công!");
                setTimeout(() => setProjectMessage(""), 2000);
              }}
            >
              Lưu cấu hình
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
