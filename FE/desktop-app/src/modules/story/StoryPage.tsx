import { useEffect, useMemo, useState } from "react";
import type { Job, NavKey } from "../../core/types";
import { defaultVoice, VOICE_PACKS } from "../../core/voice-packs";
import { getRuntime } from "../../core/runtime";
import { Modal } from "../../shared/Modal";
import { popup } from "../../shared/popup";
import { playAudioStream, stopGlobalAudio } from "../../core/audio-player";
import {
  MicFill,
  PlayFill,
  StopFill,
  CheckCircleFill,
  ClockFill,
  Stars,
  CollectionPlayFill,
  Search,
  XLg,
  FileEarmarkTextFill,
  CheckLg,
  VolumeUpFill,
  LightningChargeFill,
  CpuFill,
  ChevronRight,
  ArrowRightShort,
  Sliders,
  PencilSquare,
  ArrowRepeat,
  Film,
  Check2,
} from "react-bootstrap-icons";

type Props = {
  jobs: Job[];
  onNavigate: (key: NavKey) => void;
  onUpdateJob: (jobId: string, values: Partial<Job>) => void;
  onAddJob?: (job: Job) => void;
  onOpenTimeline?: (jobId: string) => void;
};

const SPEED_OPTIONS = [
  { value: 0.8, label: "0.8x (Chậm & Truyền cảm)" },
  { value: 0.9, label: "0.9x (Khoan thai, sâu lắng)" },
  { value: 1.0, label: "1.0x (Tốc độ chuẩn tự nhiên)" },
  { value: 1.15, label: "1.15x (Review Phim / Kể chuyện nhanh)" },
  { value: 1.25, label: "1.25x (Viral TikTok / Reels cuốn hút)" },
  { value: 1.35, label: "1.35x (Dồn dập, tiết tấu gấp)" },
  { value: 1.5, label: "1.5x (Siêu tốc độ tóm tắt)" },
];

function scriptFor(job?: Job) {
  if (!job?.analysis) return "";
  return (
    job.analysis.voiceScript?.trim() ||
    job.analysis.scenes
      .map((scene) => scene.voiceover || scene.translation || "")
      .filter(Boolean)
      .join("\n\n")
  );
}

function parseTimeToSec(tStr?: string): number {
  if (!tStr) return 0;
  const parts = tStr.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

function formatSeconds(total: number): string {
  const mins = Math.floor(total / 60);
  const secs = Math.floor(Math.max(0, total % 60));
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function StoryPage({ jobs, onNavigate, onUpdateJob, onOpenTimeline }: Props) {
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState(false);
  
  // Voice & Studio State
  const [voiceEngineFilter, setVoiceEngineFilter] = useState<"all" | "eleven" | "vbee" | "neural" | "intl">("all");
  const [voiceRegionFilter, setVoiceRegionFilter] = useState<"all" | "north" | "south" | "mystery" | "eleven" | "intl">("all");
  const [voiceGender, setVoiceGender] = useState<"all" | "male" | "female">("all");
  const [voiceLanguage, setVoiceLanguage] = useState("vi");
  const [voiceId, setVoiceId] = useState("vbee-manhdung");
  const [voiceRate, setVoiceRate] = useState<number>(1.15);
  
  // Scene-by-scene Drafts
  const [sceneDrafts, setSceneDrafts] = useState<Record<string, string>>({});
  const [isAidaModalOpen, setIsAidaModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"full" | "scenes" | "aida">("full");
  
  // Audio Playback & Synthesis State (Exclusive Playback)
  const [playingVoiceKey, setPlayingVoiceKey] = useState<string | null>(null);
  const [loadingVoiceKey, setLoadingVoiceKey] = useState<string | null>(null);

  const isPlayingFull = playingVoiceKey === "full";
  const playingSceneKey = (playingVoiceKey && playingVoiceKey !== "full" && playingVoiceKey !== "sample") ? playingVoiceKey : null;

  const showToast = (msg: string) => {
    if (msg.startsWith("✓") || msg.startsWith("🎉")) {
      popup.success(msg);
    } else if (msg.startsWith("❌")) {
      popup.error(msg, undefined, true);
    } else if (msg.startsWith("⚠️")) {
      popup.warning(msg, undefined, true);
    } else {
      popup.toast(msg, "info");
    }
  };

  const storyJobs = useMemo(
    () =>
      jobs.filter(
        (job) => job.analysis?.voiceScript || job.analysis?.scenes?.length
      ),
    [jobs]
  );

  const filteredJobs = useMemo(() => {
    if (!searchQuery.trim()) return storyJobs;
    const q = searchQuery.toLowerCase();
    return storyJobs.filter(
      (j) =>
        j.name.toLowerCase().includes(q) ||
        (j.analysis?.voiceScript || "").toLowerCase().includes(q)
    );
  }, [storyJobs, searchQuery]);

  const selected = useMemo(
    () => filteredJobs.find((job) => job.id === selectedId) || storyJobs.find((j) => j.id === selectedId) || storyJobs[0],
    [filteredJobs, storyJobs, selectedId]
  );

  const words = useMemo(() => {
    return draft.trim() ? draft.trim().split(/\s+/).length : 0;
  }, [draft]);

  const estimatedSeconds = useMemo(() => {
    return Math.max(0, Math.round(words / (2.8 * voiceRate)));
  }, [words, voiceRate]);

  // Sync draft and voice settings when selected job changes
  useEffect(() => {
    if (!selected) {
      setSelectedId("");
      setDraft("");
      return;
    }
    setSelectedId(selected.id);
    setDraft(scriptFor(selected));
    const language = selected.languages?.[0] || "vi";
    const gender = selected.narratorGender || "male";
    setVoiceLanguage(language);
    setVoiceId(selected.narratorVoice || (language === "vi" ? "vbee-manhdung" : defaultVoice(language, gender === "female" ? "female" : "male").id));
    
    setSceneDrafts(
      Object.fromEntries(
        (selected.analysis?.scenes || []).map((scene, index) => [
          scene.id || `scene-${index + 1}`,
          scene.voiceover || scene.translation || "",
        ])
      )
    );
  }, [selected?.id]);

  function chooseJob(job: Job) {
    setSelectedId(job.id);
    setDraft(scriptFor(job));
    setSaved(false);
    stopVoice();
  }

  // Filter available voices based on engine, region, gender, and language
  // Filter available voices based on engine, region, gender, and language
  const filteredVoiceList = useMemo(() => {
    return VOICE_PACKS.filter((v) => {
      // Engine filter
      if (voiceEngineFilter === "eleven" && v.region !== "eleven" && !v.id.startsWith("eleven")) return false;
      if (voiceEngineFilter === "vbee" && !v.id.startsWith("vbee")) return false;
      if (voiceEngineFilter === "neural" && !v.id.startsWith("vi-")) return false;
      if (voiceEngineFilter === "intl" && v.language === "vi") return false;

      // Language match (when not intl filter)
      if (voiceEngineFilter !== "intl" && voiceLanguage && v.language !== voiceLanguage) {
        return false;
      }

      // Region / Style filter
      if (voiceRegionFilter === "north" && v.region !== "north") return false;
      if (voiceRegionFilter === "south" && v.region !== "south") return false;
      if (voiceRegionFilter === "mystery" && v.region !== "mystery") return false;
      if (voiceRegionFilter === "eleven" && v.region !== "eleven") return false;

      // Gender filter
      if (voiceGender !== "all" && v.gender !== voiceGender) return false;

      return true;
    });
  }, [voiceEngineFilter, voiceRegionFilter, voiceGender, voiceLanguage]);

  // Automatically select valid voice if current voiceId is outside filtered options
  useEffect(() => {
    if (filteredVoiceList.length > 0 && !filteredVoiceList.some((v) => v.id === voiceId)) {
      const nextVoice = filteredVoiceList[0];
      setVoiceId(nextVoice.id);
      if (nextVoice.language) {
        setVoiceLanguage(nextVoice.language);
      }
    }
  }, [filteredVoiceList, voiceId]);

  const activeVoiceProfile = useMemo(() => {
    return VOICE_PACKS.find((v) => v.id === voiceId) || filteredVoiceList[0] || VOICE_PACKS[0];
  }, [voiceId, filteredVoiceList]);

  // Audio Exclusivity Cleanup Hook: stop any audio on unmount or tab/job switch
  useEffect(() => {
    return () => {
      stopVoice();
    };
  }, [selectedId, activeTab]);

  function saveDraft() {
    if (!selected?.analysis) return;
    let timelineCursor = 0;
    const scenes = (selected.analysis.scenes || []).map((scene, index) => {
      const vo = sceneDrafts[scene.id || `scene-${index + 1}`]?.trim() || scene.voiceover || scene.translation || "";
      const words = vo.split(/\s+/).filter(Boolean).length;
      const rate = voiceRate > 0 ? voiceRate : 1.0;
      const sceneDur = Math.max(3, Math.round(words / (2.8 * rate)));
      const startSec = timelineCursor;
      const endSec = timelineCursor + sceneDur;
      timelineCursor = endSec;

      const srcStart = scene.sourceStart || scene.start || "00:00";
      const srcStartSec = parseTimeToSec(srcStart);
      const srcEnd = scene.sourceEnd || formatSeconds(srcStartSec + sceneDur);

      return {
        ...scene,
        voiceover: vo,
        translation: vo,
        start: formatSeconds(startSec),
        end: formatSeconds(endSec),
        timeStart: startSec,
        timeEnd: endSec,
        sourceStart: srcStart,
        sourceEnd: srcEnd,
        sourceTimeStart: srcStartSec,
        sourceTimeEnd: parseTimeToSec(srcEnd),
      };
    });
    onUpdateJob(selected.id, {
      analysis: {
        ...selected.analysis,
        scenes,
        voiceScript: draft.trim(),
        storyPlan: selected.analysis.storyPlan
          ? {
              ...selected.analysis.storyPlan,
              status: "draft",
              version: (selected.analysis.storyPlan.version || 0) + 1,
            }
          : undefined,
      },
      durationSeconds: timelineCursor,
      narratorEnabled: true,
      narratorGender: activeVoiceProfile?.gender || "male",
      narratorVoice: voiceId,
      languages: [voiceLanguage],
      requiresScriptApproval: true,
      keepOriginalAudio: false,
    });
    setSaved(true);
    showToast("✓ Đã lưu bản thảo kịch bản & cấu hình phòng thu giọng đọc!");
    setTimeout(() => setSaved(false), 2500);
  }

  async function handleApproveAndNavigate() {
    if (!selected?.analysis || !draft.trim()) {
      showToast("⚠️ Nội dung kịch bản không được để trống!");
      return;
    }

    const ok = await popup.confirm(
      "Duyệt Kịch Bản & Sang Timeline",
      `Bạn có muốn duyệt toàn bộ kịch bản và áp dụng giọng đọc "${activeVoiceProfile?.label?.split("(")[0]?.trim()}" (${voiceRate}x) để chuyển sang dựng video timeline?`,
      "Duyệt & Sang Timeline ➔",
      "Hủy"
    );

    if (!ok) return;

    const currentPlan = selected.analysis.storyPlan || {
      hook: "",
      setup: "",
      buildUp: "",
      climax: "",
      cta: "",
      status: "draft" as const,
    };

    let timelineCursor = 0;
    const scenes = (selected.analysis.scenes || []).map((scene, index) => {
      const vo = sceneDrafts[scene.id || `scene-${index + 1}`]?.trim() || scene.voiceover || scene.translation || "";
      const words = vo.split(/\s+/).filter(Boolean).length;
      const rate = voiceRate > 0 ? voiceRate : 1.0;
      const sceneDur = Math.max(3, Math.round(words / (2.8 * rate)));
      const startSec = timelineCursor;
      const endSec = timelineCursor + sceneDur;
      timelineCursor = endSec;

      const srcStart = scene.sourceStart || scene.start || "00:00";
      const srcStartSec = parseTimeToSec(srcStart);
      const srcEnd = scene.sourceEnd || formatSeconds(srcStartSec + sceneDur);

      return {
        ...scene,
        voiceover: vo,
        translation: vo,
        start: formatSeconds(startSec),
        end: formatSeconds(endSec),
        timeStart: startSec,
        timeEnd: endSec,
        sourceStart: srcStart,
        sourceEnd: srcEnd,
        sourceTimeStart: srcStartSec,
        sourceTimeEnd: parseTimeToSec(srcEnd),
      };
    });

    onUpdateJob(selected.id, {
      analysis: {
        ...selected.analysis,
        scenes,
        voiceScript: draft.trim(),
        storyPlan: {
          ...currentPlan,
          status: "approved",
          approvedAt: new Date().toISOString(),
          version: (currentPlan.version || 0) + 1,
        },
      },
      durationSeconds: timelineCursor,
      narratorEnabled: true,
      narratorGender: activeVoiceProfile?.gender || "male",
      narratorVoice: voiceId,
      languages: [voiceLanguage],
      requiresScriptApproval: false,
      sourceOnly: false,
      keepOriginalAudio: false,
      status: "completed",
    });

    setSaved(true);
    showToast("✓ Đã duyệt kịch bản thành công! Đã tắt âm thanh gốc để tập trung vào Voice thuyết minh.");

    if (onOpenTimeline) {
      onOpenTimeline(selected.id);
    } else {
      onNavigate("timeline");
    }
  }

  // Unified Exclusive Voice Synthesizer Handler (High Quality Microsoft Neural / Edge TTS with Speed Control)
  async function handlePlayVoice(
    text: string,
    key: string,
    targetVoiceId?: string,
    targetLanguage?: string,
    targetGender?: "male" | "female",
    customRate?: number
  ) {
    if (!text.trim()) return;

    // Toggle off if currently playing this exact key
    if (playingVoiceKey === key) {
      stopVoice();
      return;
    }

    // Stop any existing audio immediately (Audio Exclusivity)
    stopVoice();
    setLoadingVoiceKey(key);

    const activeVoice = targetVoiceId || voiceId;
    const activeLang = targetLanguage || (activeVoice.startsWith("en-") ? "en" : voiceLanguage) || "vi";
    const activeGen = targetGender || activeVoiceProfile?.gender || "male";
    const activeRate = customRate ?? voiceRate ?? 1.0;

    try {
      const speechUrl = await getRuntime().synthesizeSpeech?.(
        text,
        activeLang,
        activeGen,
        activeVoice,
        activeRate
      );
      setLoadingVoiceKey(null);

      if (speechUrl) {
        setPlayingVoiceKey(key);
        await playAudioStream(
          speechUrl,
          () => setPlayingVoiceKey(null),
          () => setPlayingVoiceKey(null),
          activeRate
        );
      } else {
        // Fallback to Web Speech API if synthesizeSpeech returns null
        if (typeof window !== "undefined" && window.speechSynthesis) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = activeLang === "vi" ? "vi-VN" : activeLang === "en" ? "en-US" : activeLang;
          utterance.rate = activeRate;
          utterance.onend = () => setPlayingVoiceKey(null);
          utterance.onerror = () => setPlayingVoiceKey(null);
          window.speechSynthesis.speak(utterance);
          setPlayingVoiceKey(key);
        } else {
          showToast("⚠️ Không thể phát âm thanh trên thiết bị này.");
        }
      }
    } catch {
      setLoadingVoiceKey(null);
      setPlayingVoiceKey(null);
      showToast("⚠️ Không thể phát âm thanh.");
    }
  }

  function playSampleVoice() {
    const isEn = voiceLanguage === "en" || voiceId.startsWith("en-");
    const isJa = voiceLanguage === "ja" || voiceId.startsWith("ja-");
    const isKo = voiceLanguage === "ko" || voiceId.startsWith("ko-");
    const isZh = voiceLanguage === "zh" || voiceLanguage === "zh-CN" || voiceId.startsWith("zh-");
    const isFr = voiceLanguage === "fr" || voiceId.startsWith("fr-");
    const isEs = voiceLanguage === "es" || voiceId.startsWith("es-");

    const sampleText = isEn
      ? "Hello! This is a crystal-clear, ultra-realistic neural voice sample for your movie recap and storytelling narration."
      : isJa
      ? "こんにちは！こちらは映画の解説やナレーション用のAI音声サンプルです。"
      : isKo
      ? "안녕하세요! 이것은 영화 리뷰 및 내레이션을 위한 AI 음성 샘플입니다."
      : isZh
      ? "你好！这是用于电影解说与纪录片旁白的AI人声试听。"
      : isFr
      ? "Bonjour ! Ceci est un échantillon vocal IA pour la narration de votre vidéo."
      : isEs
      ? "¡Hola! Esta es una muestra de voz de IA para la narración de tu video."
      : "Xin chào! Đây là mẫu giọng đọc AI phòng thu chuẩn điện ảnh, chân thật và truyền cảm cho video của bạn.";

    handlePlayVoice(sampleText, "sample", voiceId, isEn ? "en" : isJa ? "ja" : isKo ? "ko" : isZh ? "zh-CN" : isFr ? "fr" : isEs ? "es" : "vi");
  }

  function playFullVoice() {
    if (!draft.trim()) return;
    const isEn = voiceLanguage === "en" || voiceId.startsWith("en-");
    handlePlayVoice(draft.trim(), "full", voiceId, isEn ? "en" : voiceLanguage);
  }

  function playSceneVoice(sceneKey: string, text?: string) {
    if (!text?.trim()) return;
    const isEn = voiceLanguage === "en" || voiceId.startsWith("en-");
    handlePlayVoice(text.trim(), sceneKey, voiceId, isEn ? "en" : voiceLanguage);
  }

  function stopVoice() {
    stopGlobalAudio();
    try {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    } catch {}
    setPlayingVoiceKey(null);
    setLoadingVoiceKey(null);
  }

  return (
    <div
      className="story-workspace-root animate-fade-in"
      style={{
        padding: "10px 16px 78px 16px",
        width: "100%",
        margin: 0,
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        height: "100%",
        flex: "1 1 0%",
        overflow: "hidden",
      }}
    >
      {/* 1. Primary Action Toolbar */}
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "8px", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center", flexShrink: 0 }}>
          <button
            type="button"
            onClick={isPlayingFull ? stopVoice : playFullVoice}
            disabled={!draft.trim() || !selected}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: isPlayingFull ? "rgba(239, 68, 68, 0.2)" : "rgba(255,255,255,0.06)",
              border: isPlayingFull ? "1px solid rgba(239, 68, 68, 0.4)" : "1px solid rgba(255,255,255,0.12)",
              color: isPlayingFull ? "#f87171" : "#f8fafc",
              padding: "7px 14px",
              borderRadius: "7px",
              fontSize: "12px",
              fontWeight: 700,
              cursor: !draft.trim() || !selected ? "not-allowed" : "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {loadingVoiceKey === "full" ? (
              <ArrowRepeat size={14} color="#fbbf24" className="animate-spin" />
            ) : isPlayingFull ? (
              <StopFill size={14} color="#f87171" />
            ) : (
              <PlayFill size={14} color="#fbbf24" />
            )}
            {loadingVoiceKey === "full" ? "Đang tạo giọng..." : isPlayingFull ? "Dừng Phát Giọng" : "🔊 Nghe Thử Kịch Bản"}
          </button>

          <button
            type="button"
            onClick={saveDraft}
            disabled={!draft.trim() || !selected}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#e2e8f0",
              padding: "7px 14px",
              borderRadius: "7px",
              fontSize: "12px",
              fontWeight: 700,
              cursor: !draft.trim() || !selected ? "not-allowed" : "pointer",
            }}
          >
            <CheckLg size={12} /> Lưu Bản Thảo
          </button>

          <button
            type="button"
            onClick={handleApproveAndNavigate}
            disabled={!selected || !draft.trim()}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "linear-gradient(135deg, #d97706, #f59e0b)",
              border: "none",
              color: "#12151f",
              padding: "7px 18px",
              borderRadius: "7px",
              fontSize: "12.5px",
              fontWeight: 800,
              cursor: !selected || !draft.trim() ? "not-allowed" : "pointer",
              boxShadow: "0 0 16px rgba(245, 158, 11, 0.4)",
              opacity: !selected || !draft.trim() ? 0.5 : 1,
            }}
          >
            <CollectionPlayFill size={13} /> Duyệt & Sang Timeline Dựng <ArrowRightShort size={16} />
          </button>
        </div>
      </div>

      {/* 2. KPI Summary Bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "8px", marginBottom: "10px", flexShrink: 0 }}>
        
        <div style={{ background: "rgba(18, 22, 32, 0.8)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "8px", padding: "8px 12px", display: "flex", alignItems: "center", gap: "10px", minWidth: 0, overflow: "hidden" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "7px", background: "rgba(245, 158, 11, 0.12)", color: "#fbbf24", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", flexShrink: 0 }}>
            <FileEarmarkTextFill />
          </div>
          <div style={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
            <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>TỔNG KỊCH BẢN</div>
            <div style={{ fontSize: "13.5px", fontWeight: 800, color: "#f8fafc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {storyJobs.length} <span style={{ fontSize: "10.5px", color: "#64748b", fontWeight: 500 }}>video</span>
            </div>
          </div>
        </div>

        <div style={{ background: "rgba(18, 22, 32, 0.8)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "8px", padding: "8px 12px", display: "flex", alignItems: "center", gap: "10px", minWidth: 0, overflow: "hidden" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "7px", background: "rgba(245, 158, 11, 0.12)", color: "#fbbf24", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", flexShrink: 0 }}>
            <Stars />
          </div>
          <div style={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
            <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>PHÂN CẢNH THOẠI</div>
            <div style={{ fontSize: "13.5px", fontWeight: 800, color: "#fbbf24", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {selected?.analysis?.scenes?.length || 0} <span style={{ fontSize: "10.5px", color: "#64748b", fontWeight: 500 }}>phân đoạn</span>
            </div>
          </div>
        </div>

        <div style={{ background: "rgba(18, 22, 32, 0.8)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "8px", padding: "8px 12px", display: "flex", alignItems: "center", gap: "10px", minWidth: 0, overflow: "hidden" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "7px", background: "rgba(245, 158, 11, 0.12)", color: "#fbbf24", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", flexShrink: 0 }}>
            <ClockFill />
          </div>
          <div style={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
            <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>THỜI LƯỢNG ĐỌC DỰ KIẾN</div>
            <div style={{ fontSize: "13.5px", fontWeight: 800, color: "#f8fafc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              ~{estimatedSeconds}s <span style={{ fontSize: "10.5px", color: "#64748b", fontWeight: 500 }}>({words} từ)</span>
            </div>
          </div>
        </div>

        <div style={{ background: "rgba(18, 22, 32, 0.8)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "8px", padding: "8px 12px", display: "flex", alignItems: "center", gap: "10px", minWidth: 0, overflow: "hidden" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "7px", background: "rgba(245, 158, 11, 0.12)", color: "#fbbf24", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", flexShrink: 0 }}>
            <MicFill />
          </div>
          <div style={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
            <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>GIỌNG ĐỌC HIỆN TẠI</div>
            <div style={{ fontSize: "12.5px", fontWeight: 800, color: "#fbbf24", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={activeVoiceProfile?.label || ""}>
              {activeVoiceProfile?.label ? activeVoiceProfile.label.split("(")[0]?.trim() : "Mặc định"} <span style={{ fontSize: "10.5px", color: "#34d399", fontWeight: 700 }}>({voiceRate}x)</span>
            </div>
          </div>
        </div>

      </div>

      {/* 3. Empty State or Studio Workspace */}
      {!storyJobs.length ? (
        <div style={{ background: "rgba(18, 22, 32, 0.85)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "12px", padding: "60px 20px", textAlign: "center", color: "#64748b", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
          <MicFill size={44} style={{ margin: "0 auto 12px", opacity: 0.4, color: "#fbbf24" }} />
          <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#f8fafc", marginBottom: "6px" }}>
            Chưa có kịch bản nào được phân tích
          </h3>
          <p style={{ fontSize: "12.5px", color: "#94a3b8", maxWidth: "480px", margin: "0 auto 18px", lineHeight: 1.5 }}>
            Hãy mở <strong>Phân Tích AI</strong> để tự động bóc tách ngữ cảnh, tạo phân cảnh và viết kịch bản voice-over tự động từ video gốc.
          </p>
          <button
            type="button"
            onClick={() => onNavigate("analysis")}
            style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)", border: "none", color: "#12151f", padding: "8px 20px", borderRadius: "7px", fontSize: "12.5px", fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px", boxShadow: "0 0 16px rgba(245, 158, 11, 0.4)" }}
          >
            <LightningChargeFill size={13} /> Mở Phân Tích AI
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "320px minmax(0, 1fr)", gap: "12px", alignItems: "stretch", flex: "1 1 0%", minHeight: 0 }}>
          
          {/* Left: Video Scripts Library */}
          <div style={{ background: "rgba(16, 20, 30, 0.9)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "10px", padding: "12px", display: "flex", flexDirection: "column", height: "100%", boxSizing: "border-box", minHeight: 0, overflow: "hidden" }}>
            
            {/* Library Top & Search */}
            <div style={{ marginBottom: "8px", flexShrink: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <span style={{ fontSize: "11px", fontWeight: 800, color: "#fbbf24", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  DANH SÁCH KỊCH BẢN ({filteredJobs.length})
                </span>
              </div>

              <div style={{ position: "relative" }}>
                <Search size={11} style={{ position: "absolute", left: "9px", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kịch bản video..."
                  style={{ width: "100%", background: "rgba(0, 0, 0, 0.4)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "6px", padding: "5px 8px 5px 26px", color: "#f8fafc", fontSize: "11.5px", outline: "none", boxSizing: "border-box" }}
                />
                {searchQuery && (
                  <button type="button" onClick={() => setSearchQuery("")} style={{ position: "absolute", right: "6px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#64748b", cursor: "pointer" }}>
                    <XLg size={10} />
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable Script Cards */}
            <div style={{ flex: "1 1 0%", minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px", paddingRight: "2px" }}>
              {filteredJobs.map((job) => {
                const isSelected = job.id === selected?.id;
                const scenesCount = job.analysis?.scenes?.length || 0;
                const isApproved = job.analysis?.storyPlan?.status === "approved";

                return (
                  <div
                    key={job.id}
                    onClick={() => chooseJob(job)}
                    style={{
                      background: isSelected ? "rgba(217, 119, 6, 0.18)" : "rgba(26, 30, 43, 0.5)",
                      border: isSelected ? "1.5px solid #f59e0b" : "1px solid rgba(255, 255, 255, 0.06)",
                      borderRadius: "8px",
                      padding: "9px 11px",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      boxShadow: isSelected ? "0 0 12px rgba(245, 158, 11, 0.2)" : "none",
                      flexShrink: 0,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "6px" }}>
                      <strong style={{ fontSize: "12px", color: isSelected ? "#fbbf24" : "#f8fafc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1 }} title={job.name}>
                        {job.name}
                      </strong>
                      <ChevronRight size={11} color={isSelected ? "#fbbf24" : "#64748b"} style={{ marginTop: "2px", flexShrink: 0 }} />
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "5px", fontSize: "10.5px" }}>
                      <span style={{ background: "rgba(245, 158, 11, 0.12)", color: "#fbbf24", padding: "1px 6px", borderRadius: "3px", fontWeight: 700 }}>
                        {scenesCount} Phân cảnh
                      </span>
                      {isApproved ? (
                        <span style={{ color: "#34d399", fontWeight: 700, display: "flex", alignItems: "center", gap: "3px" }}>
                          <CheckCircleFill size={10} /> Đã Duyệt
                        </span>
                      ) : (
                        <span style={{ color: "#94a3b8" }}>
                          {job.createdAt || "Vừa xong"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

          {/* Right: Studio Script & Voice Synthesizer Editor */}
          <div style={{ background: "rgba(16, 20, 30, 0.9)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "10px", padding: "14px", display: "flex", flexDirection: "column", height: "100%", boxSizing: "border-box", minHeight: 0, overflow: "hidden" }}>
            
            {/* Top Bar of Editor */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "10px", marginBottom: "10px", flexWrap: "wrap", gap: "8px", flexShrink: 0 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <FileEarmarkTextFill size={14} color="#fbbf24" style={{ flexShrink: 0 }} />
                  <strong style={{ fontSize: "13.5px", color: "#f8fafc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={selected?.name}>
                    {selected?.name}
                  </strong>
                </div>
                <span style={{ fontSize: "11px", color: "#64748b", marginTop: "1px", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {selected?.source || selected?.localPath || "Đang chỉnh sửa kịch bản thuyết minh"}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                {selected?.analysis?.storyPlan && (
                  <button
                    type="button"
                    onClick={() => setIsAidaModalOpen(true)}
                    style={{ background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.3)", color: "#fbbf24", padding: "4px 9px", borderRadius: "5px", fontSize: "11px", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
                  >
                    <Stars size={11} /> Cấu Trúc AIDA 5 Nhịp
                  </button>
                )}

                <span style={{ padding: "3px 8px", borderRadius: "4px", background: saved ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)", color: saved ? "#34d399" : "#fbbf24", border: saved ? "1px solid rgba(16, 185, 129, 0.35)" : "1px solid rgba(245, 158, 11, 0.35)", fontSize: "11px", fontWeight: 800 }}>
                  {saved ? "✓ Đã Lưu" : "📝 Bản Thảo"}
                </span>
              </div>
            </div>

            {/* Suggested Titles Pill Bar */}
            {Array.isArray(selected?.analysis?.suggestedTitles) && selected.analysis.suggestedTitles.length > 0 && (
              <div style={{ background: "rgba(245, 158, 11, 0.06)", border: "1px solid rgba(245, 158, 11, 0.2)", borderRadius: "6px", padding: "6px 10px", marginBottom: "8px", display: "flex", flexWrap: "wrap", gap: "5px", alignItems: "center" }}>
                <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#fbbf24" }}>🎯 Đổi Tiêu Đề Viral:</span>
                {selected.analysis.suggestedTitles.map((st, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      onUpdateJob(selected.id, { name: st, analysis: { ...selected.analysis!, videoTitle: st } });
                      showToast(`✓ Đã áp dụng tiêu đề: "${st}"`);
                    }}
                    style={{
                      background: (selected.analysis?.videoTitle || selected.name) === st ? "rgba(245, 158, 11, 0.25)" : "rgba(255, 255, 255, 0.05)",
                      border: (selected.analysis?.videoTitle || selected.name) === st ? "1px solid #fbbf24" : "1px solid rgba(255, 255, 255, 0.1)",
                      color: (selected.analysis?.videoTitle || selected.name) === st ? "#fbbf24" : "#cbd5e1",
                      fontSize: "10.5px",
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: "12px",
                      cursor: "pointer",
                    }}
                  >
                    {st}
                  </button>
                ))}
              </div>
            )}

            {/* Voice Pack & Synthesizer Studio Console */}
            <div style={{ background: "rgba(10, 13, 20, 0.75)", border: "1px solid rgba(245, 158, 11, 0.25)", borderRadius: "8px", padding: "10px 12px", marginBottom: "10px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
              
              {/* Row 1: Engine Filter + Region Filter + Gender */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center", justifyContent: "space-between" }}>
                
                {/* Engine Pills */}
                <div style={{ display: "flex", gap: "4px", alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#94a3b8", marginRight: "2px" }}>ĐỘNG CƠ AI:</span>
                  {[
                    { key: "all", label: "Tất Cả" },
                    { key: "eleven", label: "👑 ElevenLabs" },
                    { key: "vbee", label: "🔥 Vbee Quốc Dân" },
                    { key: "neural", label: "⚡ Neural AI" },
                    { key: "intl", label: "🌐 Quốc Tế" },
                  ].map((eng) => (
                    <button
                      key={eng.key}
                      type="button"
                      onClick={() => setVoiceEngineFilter(eng.key as any)}
                      style={{
                        background: voiceEngineFilter === eng.key ? "rgba(245, 158, 11, 0.25)" : "rgba(255,255,255,0.05)",
                        border: voiceEngineFilter === eng.key ? "1px solid #f59e0b" : "1px solid rgba(255,255,255,0.08)",
                        color: voiceEngineFilter === eng.key ? "#fbbf24" : "#94a3b8",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "10.5px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {eng.label}
                    </button>
                  ))}
                </div>

                {/* Gender Pills */}
                <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                  <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#94a3b8", marginRight: "2px" }}>GIỚI TÍNH:</span>
                  {[
                    { key: "all", label: "Tất Cả" },
                    { key: "male", label: "👨 Nam" },
                    { key: "female", label: "👩 Nữ" },
                  ].map((g) => (
                    <button
                      key={g.key}
                      type="button"
                      onClick={() => setVoiceGender(g.key as any)}
                      style={{
                        background: voiceGender === g.key ? "rgba(245, 158, 11, 0.25)" : "rgba(255,255,255,0.05)",
                        border: voiceGender === g.key ? "1px solid #f59e0b" : "1px solid rgba(255,255,255,0.08)",
                        color: voiceGender === g.key ? "#fbbf24" : "#94a3b8",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "10.5px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>

              </div>

              {/* Row 2: Detailed Selectors Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr", gap: "8px", alignItems: "center" }}>
                
                {/* Voice Profile Dropdown */}
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3px" }}>
                    <label style={{ fontSize: "10px", fontWeight: 700, color: "#cbd5e1", margin: 0 }}>
                      🎙️ CHỌN GIỌNG ĐỌC AI PHÒNG THU
                    </label>
                    <button
                      type="button"
                      onClick={playSampleVoice}
                      style={{
                        background: playingVoiceKey === "sample" ? "rgba(239, 68, 68, 0.25)" : "rgba(245, 158, 11, 0.2)",
                        border: playingVoiceKey === "sample" ? "1px solid rgba(239, 68, 68, 0.5)" : "1px solid rgba(245, 158, 11, 0.4)",
                        color: playingVoiceKey === "sample" ? "#f87171" : "#fbbf24",
                        padding: "1px 7px",
                        borderRadius: "4px",
                        fontSize: "10px",
                        fontWeight: 800,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "3px",
                      }}
                      title="Nghe thử mẫu giọng đọc này"
                    >
                      {loadingVoiceKey === "sample" ? (
                        <ArrowRepeat size={10} className="animate-spin" />
                      ) : playingVoiceKey === "sample" ? (
                        <StopFill size={10} />
                      ) : (
                        <VolumeUpFill size={10} />
                      )}
                      {playingVoiceKey === "sample" ? "Dừng" : "🔊 Nghe thử mẫu"}
                    </button>
                  </div>
                  <select
                    value={voiceId}
                    onChange={(e) => {
                      const newId = e.target.value;
                      setVoiceId(newId);
                      const found = VOICE_PACKS.find((v) => v.id === newId);
                      if (found?.language) {
                        setVoiceLanguage(found.language);
                      }
                      stopVoice();
                    }}
                    style={{ width: "100%", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(245, 158, 11, 0.35)", borderRadius: "5px", padding: "5px 8px", color: "#fbbf24", fontWeight: 700, fontSize: "11.5px", outline: "none", cursor: "pointer", boxSizing: "border-box" }}
                  >
                    {filteredVoiceList.map((voice) => (
                      <option value={voice.id} key={voice.id}>
                        {voice.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Vùng Miền & Phong Cách */}
                <div style={{ minWidth: 0 }}>
                  <label style={{ display: "block", fontSize: "10px", fontWeight: 700, color: "#cbd5e1", marginBottom: "3px" }}>
                    📍 VÙNG MIỀN & PHONG CÁCH
                  </label>
                  <select
                    value={voiceRegionFilter}
                    onChange={(e) => {
                      const newRegion = e.target.value as any;
                      setVoiceRegionFilter(newRegion);
                      stopVoice();
                      // Find first voice matching this region
                      const matching = VOICE_PACKS.filter((v) => {
                        if (voiceEngineFilter === "eleven" && v.region !== "eleven" && !v.id.startsWith("eleven")) return false;
                        if (voiceEngineFilter === "vbee" && !v.id.startsWith("vbee")) return false;
                        if (voiceEngineFilter === "neural" && !v.id.startsWith("vi-")) return false;
                        if (newRegion !== "all" && v.region !== newRegion) return false;
                        if (voiceGender !== "all" && v.gender !== voiceGender) return false;
                        return true;
                      });
                      if (matching.length > 0) {
                        setVoiceId(matching[0].id);
                        if (matching[0].language) setVoiceLanguage(matching[0].language);
                      }
                    }}
                    style={{ width: "100%", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255, 255, 255, 0.12)", borderRadius: "5px", padding: "5px 8px", color: "#f8fafc", fontSize: "11.5px", outline: "none", cursor: "pointer", boxSizing: "border-box" }}
                  >
                    <option value="all">🌐 Tất cả vùng miền & phong cách</option>
                    <option value="north">🏛️ Miền Bắc (Hà Nội · Chuẩn Review)</option>
                    <option value="south">🌴 Miền Nam (Sài Gòn / Miền Tây)</option>
                    <option value="mystery">🎬 Thuyết Minh Kịch Tính / Vụ Án</option>
                    <option value="eleven">👑 Siêu Chân Thật (ElevenLabs Studio)</option>
                  </select>
                </div>

                {/* Speed / Rate */}
                <div style={{ minWidth: 0 }}>
                  <label style={{ display: "block", fontSize: "10px", fontWeight: 700, color: "#cbd5e1", marginBottom: "3px" }}>
                    ⚡ TỐC ĐỘ ĐỌC: <span style={{ color: "#fbbf24" }}>{voiceRate}x</span>
                  </label>
                  <select
                    value={voiceRate}
                    onChange={(e) => {
                      const newRate = Number(e.target.value);
                      setVoiceRate(newRate);
                      stopVoice();
                    }}
                    style={{ width: "100%", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255, 255, 255, 0.12)", borderRadius: "5px", padding: "5px 8px", color: "#fbbf24", fontWeight: 700, fontSize: "11.5px", outline: "none", cursor: "pointer", boxSizing: "border-box" }}
                  >
                    {SPEED_OPTIONS.map((sp) => (
                      <option key={sp.value} value={sp.value}>
                        {sp.label}
                      </option>
                    ))}
                  </select>
                </div>

              </div>

            </div>

            {/* Tab Switcher: Full Script vs Scene-by-Scene vs AIDA Plan */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "6px", flexShrink: 0 }}>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  type="button"
                  onClick={() => setActiveTab("full")}
                  style={{
                    background: activeTab === "full" ? "rgba(217, 119, 6, 0.25)" : "transparent",
                    color: activeTab === "full" ? "#fbbf24" : "#94a3b8",
                    border: activeTab === "full" ? "1px solid #f59e0b" : "1px solid transparent",
                    padding: "4px 10px",
                    borderRadius: "5px",
                    fontSize: "11.5px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  📜 Kịch Bản Toàn Văn ({words} từ)
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("scenes")}
                  style={{
                    background: activeTab === "scenes" ? "rgba(217, 119, 6, 0.25)" : "transparent",
                    color: activeTab === "scenes" ? "#fbbf24" : "#94a3b8",
                    border: activeTab === "scenes" ? "1px solid #f59e0b" : "1px solid transparent",
                    padding: "4px 10px",
                    borderRadius: "5px",
                    fontSize: "11.5px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  🎞️ Khớp Từng Phân Cảnh ({selected?.analysis?.scenes?.length || 0} cảnh)
                </button>

                {selected?.analysis?.storyPlan && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("aida")}
                    style={{
                      background: activeTab === "aida" ? "rgba(217, 119, 6, 0.25)" : "transparent",
                      color: activeTab === "aida" ? "#fbbf24" : "#94a3b8",
                      border: activeTab === "aida" ? "1px solid #f59e0b" : "1px solid transparent",
                      padding: "4px 10px",
                      borderRadius: "5px",
                      fontSize: "11.5px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    🎯 Cấu Trúc AIDA 5 Nhịp
                  </button>
                )}
              </div>

              <span style={{ fontSize: "11px", color: "#64748b" }}>
                ⏱️ Tổng thời lượng đọc: <strong style={{ color: "#fbbf24" }}>~{estimatedSeconds}s</strong>
              </span>
            </div>

            {/* Script Text Editor Area */}
            <div style={{ flex: "1 1 0%", minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              
              {/* Tab 1: Full Master Script */}
              {activeTab === "full" && (
                <textarea
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    setSaved(false);
                  }}
                  placeholder="Nhập hoặc chỉnh sửa toàn bộ lời bình thuyết minh kịch bản..."
                  style={{
                    width: "100%",
                    height: "100%",
                    flex: "1 1 0%",
                    minHeight: 0,
                    background: "#080c14",
                    border: "1px solid rgba(245, 158, 11, 0.25)",
                    borderRadius: "8px",
                    padding: "12px 14px",
                    color: "#f8fafc",
                    fontSize: "13px",
                    lineHeight: "1.65",
                    outline: "none",
                    resize: "none",
                    fontFamily: "inherit",
                    boxShadow: "inset 0 2px 8px rgba(0,0,0,0.5)",
                    boxSizing: "border-box",
                  }}
                />
              )}

              {/* Tab 2: Synced Scene-by-Scene Editor */}
              {activeTab === "scenes" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: "1 1 0%", minHeight: 0, overflowY: "auto", paddingRight: "4px" }}>
                  {(selected?.analysis?.scenes || []).map((sc, idx) => {
                    const sceneKey = sc.id || `scene-${idx + 1}`;
                    const sceneVal = sceneDrafts[sceneKey] ?? (sc.voiceover || sc.translation || "");
                    const isPlayingThis = playingSceneKey === sceneKey;

                    // Calculate time sync
                    const startSec = parseTimeToSec(sc.start);
                    const endSec = parseTimeToSec(sc.end || "00:15");
                    const sceneDurationSec = Math.max(1, endSec - startSec || 15);
                    const sceneWords = sceneVal.trim() ? sceneVal.trim().split(/\s+/).length : 0;
                    const sceneEstSpeechSec = Math.round(sceneWords / (2.8 * voiceRate));
                    const diffSec = sceneEstSpeechSec - sceneDurationSec;

                    return (
                      <div
                        key={sceneKey}
                        style={{
                          background: isPlayingThis ? "rgba(217, 119, 6, 0.15)" : "rgba(26, 30, 43, 0.5)",
                          border: isPlayingThis ? "1.5px solid #f59e0b" : "1px solid rgba(255, 255, 255, 0.07)",
                          borderRadius: "8px",
                          padding: "10px 12px",
                          flexShrink: 0,
                          transition: "all 0.15s ease",
                        }}
                      >
                        {/* Scene Header with Time Sync Badge */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "11.5px", fontWeight: 800, color: "#fbbf24" }}>
                              Cảnh #{idx + 1}: {sc.title}
                            </span>
                            <span style={{ fontSize: "10.5px", background: "rgba(0,0,0,0.35)", color: "#94a3b8", padding: "1px 6px", borderRadius: "3px", fontFamily: "monospace" }}>
                              ⏱️ {sc.start} ➔ {sc.end || "00:15"} ({sceneDurationSec}s)
                            </span>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            {/* Sync Status Badge */}
                            {diffSec <= 0 ? (
                              <span style={{ fontSize: "10px", background: "rgba(16, 185, 129, 0.15)", color: "#34d399", border: "1px solid rgba(16, 185, 129, 0.35)", padding: "1px 6px", borderRadius: "3px", fontWeight: 700 }}>
                                🟢 Khớp ({sceneEstSpeechSec}s / {sceneDurationSec}s)
                              </span>
                            ) : diffSec <= 2 ? (
                              <span style={{ fontSize: "10px", background: "rgba(245, 158, 11, 0.15)", color: "#fbbf24", border: "1px solid rgba(245, 158, 11, 0.35)", padding: "1px 6px", borderRadius: "3px", fontWeight: 700 }}>
                                🟡 Hơi dài (+{diffSec}s)
                              </span>
                            ) : (
                              <span style={{ fontSize: "10px", background: "rgba(239, 68, 68, 0.15)", color: "#f87171", border: "1px solid rgba(239, 68, 68, 0.35)", padding: "1px 6px", borderRadius: "3px", fontWeight: 700 }}>
                                🔴 Quá dài (+{diffSec}s)
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() => isPlayingThis ? stopVoice() : playSceneVoice(sceneKey, sceneVal)}
                              style={{ background: isPlayingThis ? "rgba(239,68,68,0.2)" : "rgba(245, 158, 11, 0.15)", border: isPlayingThis ? "1px solid rgba(239,68,68,0.4)" : "1px solid rgba(245, 158, 11, 0.35)", color: isPlayingThis ? "#f87171" : "#fbbf24", padding: "2px 7px", borderRadius: "4px", fontSize: "10.5px", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "3px" }}
                            >
                              {loadingVoiceKey === sceneKey ? (
                                <ArrowRepeat size={11} color="#fbbf24" className="animate-spin" />
                              ) : isPlayingThis ? (
                                <StopFill size={11} color="#f87171" />
                              ) : (
                                <VolumeUpFill size={11} color="#fbbf24" />
                              )}
                              {isPlayingThis ? "Dừng" : "Đọc thử"}
                            </button>
                          </div>
                        </div>

                        {/* Visual scene detail context */}
                        {sc.detail && (
                          <div style={{ fontSize: "10.5px", color: "#94a3b8", marginBottom: "6px", display: "flex", alignItems: "flex-start", gap: "4px" }}>
                            <span>👁️</span> <span style={{ fontStyle: "italic" }}>{sc.detail}</span>
                          </div>
                        )}

                        {/* Scene Voiceover Input */}
                        <textarea
                          rows={2}
                          value={sceneVal}
                          onChange={(e) => {
                            const v = e.target.value;
                            setSceneDrafts((prev) => ({ ...prev, [sceneKey]: v }));
                            setSaved(false);
                          }}
                          placeholder="Nhập câu thoại thuyết minh cho phân cảnh này..."
                          style={{
                            width: "100%",
                            background: "rgba(0,0,0,0.4)",
                            border: "1px solid rgba(245, 158, 11, 0.25)",
                            borderRadius: "5px",
                            padding: "6px 9px",
                            color: "#f8fafc",
                            fontSize: "12px",
                            lineHeight: 1.45,
                            outline: "none",
                            resize: "vertical",
                            boxSizing: "border-box",
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Tab 3: AIDA Story Structure */}
              {activeTab === "aida" && selected?.analysis?.storyPlan && (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", flex: "1 1 0%", minHeight: 0, overflowY: "auto", paddingRight: "4px" }}>
                  <div style={{ padding: "12px 14px", background: "rgba(217, 119, 6, 0.15)", borderRadius: "8px", border: "1px solid rgba(245, 158, 11, 0.4)" }}>
                    <strong style={{ color: "#fbbf24", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                      🎯 1. HOOK (3 Giây Đầu Giữ Chân Người Xem)
                    </strong>
                    <p style={{ margin: "5px 0 0", fontSize: "12px", color: "#f8fafc", lineHeight: 1.5 }}>
                      {selected.analysis.storyPlan.hook || "Chưa có nội dung hook"}
                    </p>
                  </div>

                  <div style={{ padding: "12px 14px", background: "rgba(26, 30, 43, 0.6)", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                    <strong style={{ color: "#fbbf24", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                      📖 2. SETUP & BUILD-UP (Mở Đầu & Kể Chuyện)
                    </strong>
                    <p style={{ margin: "5px 0 0", fontSize: "12px", color: "#cbd5e1", lineHeight: 1.5 }}>
                      {selected.analysis.storyPlan.buildUp || selected.analysis.storyPlan.setup || "Chưa có nội dung setup"}
                    </p>
                  </div>

                  <div style={{ padding: "12px 14px", background: "rgba(26, 30, 43, 0.6)", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                    <strong style={{ color: "#34d399", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                      🔥 3. CLIMAX (Đỉnh Điểm Xung Đột & Plot Twist)
                    </strong>
                    <p style={{ margin: "5px 0 0", fontSize: "12px", color: "#cbd5e1", lineHeight: 1.5 }}>
                      {selected.analysis.storyPlan.climax || "Chưa có nội dung climax"}
                    </p>
                  </div>

                  <div style={{ padding: "12px 14px", background: "rgba(26, 30, 43, 0.6)", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                    <strong style={{ color: "#c084fc", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                      📣 4. CTA (Kêu Gọi Hành Động & Tương Tác)
                    </strong>
                    <p style={{ margin: "5px 0 0", fontSize: "12px", color: "#cbd5e1", lineHeight: 1.5 }}>
                      {selected.analysis.storyPlan.cta || "Chưa có nội dung CTA"}
                    </p>
                  </div>
                </div>
              )}

            </div>

            {/* Bottom Actions Bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "10px", marginTop: "8px", flexWrap: "wrap", gap: "8px", flexShrink: 0 }}>
              <div style={{ display: "flex", gap: "12px", fontSize: "11px", color: "#94a3b8" }}>
                <span>⏱️ Dự kiến: <strong style={{ color: "#fbbf24" }}>~{estimatedSeconds}s</strong></span>
                <span>📝 Tổng: <strong style={{ color: "#f8fafc" }}>{words} từ</strong> ({draft.length} ký tự)</span>
                <span>🎙️ Giọng: <strong style={{ color: "#34d399" }}>{activeVoiceProfile?.label ? activeVoiceProfile.label.split("(")[0]?.trim() : "Mặc định"}</strong></span>
              </div>

              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  type="button"
                  onClick={saveDraft}
                  disabled={!draft.trim() || !selected}
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#f8fafc", padding: "6px 12px", borderRadius: "5px", fontSize: "11.5px", fontWeight: 700, cursor: "pointer" }}
                >
                  <CheckLg size={11} /> Lưu Bản Thảo
                </button>

                <button
                  type="button"
                  onClick={handleApproveAndNavigate}
                  disabled={!draft.trim() || !selected}
                  style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)", border: "none", color: "#12151f", padding: "6px 16px", borderRadius: "5px", fontSize: "11.5px", fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: "5px", boxShadow: "0 0 12px rgba(245, 158, 11, 0.4)" }}
                >
                  <CollectionPlayFill size={11} /> Duyệt Kịch Bản & Sang Timeline
                </button>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* Modal AIDA Popup */}
      <Modal
        isOpen={isAidaModalOpen}
        onClose={() => setIsAidaModalOpen(false)}
        title="Cấu Trúc Story Plan AIDA 5 Nhịp"
        eyebrow="AI CONTEXTUAL STORY PLAN"
        maxWidth="620px"
      >
        {selected?.analysis?.storyPlan && (
          <div style={{ display: "grid", gap: "10px" }}>
            <div style={{ padding: "10px 12px", background: "rgba(217, 119, 6, 0.12)", borderRadius: "8px", border: "1px solid rgba(245, 158, 11, 0.35)" }}>
              <strong style={{ color: "#fbbf24", fontSize: "11.5px", display: "block" }}>1. HOOK (3s Đầu Thu Hút Người Xem)</strong>
              <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#f8fafc", lineHeight: 1.45 }}>{selected.analysis.storyPlan.hook || "Chưa có"}</p>
            </div>

            <div style={{ padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)" }}>
              <strong style={{ color: "#fbbf24", fontSize: "11.5px", display: "block" }}>2. SETUP & BUILD-UP (Mở Đầu & Kể Chuyện)</strong>
              <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#cbd5e1", lineHeight: 1.45 }}>{selected.analysis.storyPlan.buildUp || selected.analysis.storyPlan.setup || "Chưa có"}</p>
            </div>

            <div style={{ padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)" }}>
              <strong style={{ color: "#34d399", fontSize: "11.5px", display: "block" }}>3. CLIMAX (Đỉnh Điểm Xung Đột)</strong>
              <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#cbd5e1", lineHeight: 1.45 }}>{selected.analysis.storyPlan.climax || "Chưa có"}</p>
            </div>

            <div style={{ padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)" }}>
              <strong style={{ color: "#c084fc", fontSize: "11.5px", display: "block" }}>4. CTA (Kêu Gọi Tương Tác)</strong>
              <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#cbd5e1", lineHeight: 1.45 }}>{selected.analysis.storyPlan.cta || "Chưa có"}</p>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
