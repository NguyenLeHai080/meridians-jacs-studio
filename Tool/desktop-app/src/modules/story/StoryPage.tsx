import React, { useEffect, useMemo, useState } from "react";
import type { Job, NavKey } from "../../core/types";
import { defaultVoice, voicesForLanguage } from "../../core/voice-packs";
import { Modal } from "../../shared/Modal";
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
} from "react-bootstrap-icons";

type Props = {
  jobs: Job[];
  onNavigate: (key: NavKey) => void;
  onUpdateJob: (jobId: string, values: Partial<Job>) => void;
  onAddJob: (job: Job) => void;
};

function scriptFor(job?: Job) {
  if (!job?.analysis) return "";
  return (
    job.analysis.voiceScript?.trim() ||
    job.analysis.scenes
      .map((scene) => scene.voiceover || scene.translation || "")
      .filter(Boolean)
      .join(" ")
  );
}

export function StoryPage({ jobs, onNavigate, onUpdateJob }: Props) {
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState(false);
  const [voiceLanguage, setVoiceLanguage] = useState("vi");
  const [voiceGender, setVoiceGender] = useState<"male" | "female">("female");
  const [voiceId, setVoiceId] = useState("vi-female");
  const [voiceRate, setVoiceRate] = useState<number>(1.0);
  const [sceneDrafts, setSceneDrafts] = useState<Record<string, string>>({});
  const [isAidaModalOpen, setIsAidaModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"full" | "scenes">("full");
  const [isPlayingFull, setIsPlayingFull] = useState(false);
  const [playingSceneKey, setPlayingSceneKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
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

  const words = draft.trim() ? draft.trim().split(/\s+/).length : 0;
  const estimatedSeconds = Math.max(0, Math.round(words / (2.8 * voiceRate)));

  useEffect(() => {
    if (!selected) {
      setSelectedId("");
      setDraft("");
      return;
    }
    setSelectedId((current) => current || selected.id);
    setDraft(scriptFor(selected));
    const language = selected.languages?.[0] || "vi";
    const gender = selected.narratorGender || "female";
    setVoiceLanguage(language);
    setVoiceGender(gender);
    setVoiceId(selected.narratorVoice || defaultVoice(language, gender).id);
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

  function saveDraft() {
    if (!selected?.analysis) return;
    const scenes = selected.analysis.scenes.map((scene, index) => ({
      ...scene,
      voiceover:
        sceneDrafts[scene.id || `scene-${index + 1}`]?.trim() || scene.voiceover,
    }));
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
      narratorEnabled: true,
      narratorGender: voiceGender,
      narratorVoice: voiceId,
      languages: [voiceLanguage],
      requiresScriptApproval: true,
    });
    setSaved(true);
    showToast("✓ Đã lưu bản thảo kịch bản & cấu hình giọng đọc!");
    setTimeout(() => setSaved(false), 2500);
  }

  function approveScript() {
    if (!selected?.analysis || !draft.trim()) return;
    const currentPlan = selected.analysis.storyPlan || {
      hook: "",
      setup: "",
      buildUp: "",
      climax: "",
      cta: "",
      status: "draft" as const,
    };
    onUpdateJob(selected.id, {
      analysis: {
        ...selected.analysis,
        voiceScript: draft.trim(),
        storyPlan: {
          ...currentPlan,
          status: "approved",
          approvedAt: new Date().toISOString(),
          version: (currentPlan.version || 0) + 1,
        },
      },
      narratorEnabled: true,
      narratorGender: voiceGender,
      narratorVoice: voiceId,
      languages: [voiceLanguage],
      requiresScriptApproval: false,
      sourceOnly: false,
      status: "queued",
      stage: "queued",
      progress: 0,
      error: undefined,
      synced: false,
    });
    setSaved(true);
    showToast("✓ Đã duyệt kịch bản! Video sẵn sàng chuyển sang Timeline Dựng.");
    setTimeout(() => setSaved(false), 2500);
  }

  // TTS Voice Playback Handlers
  function playFullVoice() {
    if (!draft.trim()) return;
    try {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(draft);
        utterance.lang = voiceLanguage === "vi" ? "vi-VN" : "en-US";
        utterance.rate = voiceRate;
        utterance.onend = () => setIsPlayingFull(false);
        utterance.onerror = () => setIsPlayingFull(false);
        window.speechSynthesis.speak(utterance);
        setIsPlayingFull(true);
        showToast("🔊 Đang phát thử toàn bộ kịch bản thuyết minh...");
      }
    } catch {
      showToast("Không thể phát giọng đọc trên trình duyệt.");
    }
  }

  function playSceneVoice(sceneKey: string, text?: string) {
    if (!text?.trim()) return;
    try {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        setIsPlayingFull(false);
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = voiceLanguage === "vi" ? "vi-VN" : "en-US";
        utterance.rate = voiceRate;
        utterance.onend = () => setPlayingSceneKey(null);
        utterance.onerror = () => setPlayingSceneKey(null);
        window.speechSynthesis.speak(utterance);
        setPlayingSceneKey(sceneKey);
        showToast("🔊 Đang đọc thử phân cảnh...");
      }
    } catch {
      showToast("Không thể phát giọng đọc trên thiết bị này.");
    }
  }

  function stopVoice() {
    try {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setIsPlayingFull(false);
      setPlayingSceneKey(null);
    } catch {
      // ignore
    }
  }

  const availableVoices = voicesForLanguage(voiceLanguage);

  return (
    <div className="story-workspace-root animate-fade-in" style={{ padding: "12px 18px", maxWidth: "1680px", margin: "0 auto", display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
      
      {/* 1. Header & Primary Actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "10px" }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: "rgba(56, 189, 248, 0.12)", border: "1px solid rgba(56, 189, 248, 0.3)", padding: "2px 7px", borderRadius: "5px", fontSize: "10.5px", fontWeight: 800, color: "#38bdf8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "3px" }}>
            <MicFill size={10} /> BƯỚC 3: KỊCH BẢN & PHÒNG THU GIỌNG ĐỌC AI (TTS)
          </div>
          <h1 style={{ fontSize: "19px", fontWeight: 800, color: "#f8fafc", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
            <CpuFill size={19} color="#38bdf8" />
            Biên Tập Kịch Bản & Cấu Hình Giọng Đọc Studio
          </h1>
          <p style={{ fontSize: "11.5px", color: "#94a3b8", margin: "2px 0 0" }}>
            Tùy chỉnh nội dung lời bình AI, chọn giọng đọc nam/nữ theo vùng miền, kiểm soát tốc độ đọc và đồng bộ khớp từng giây khung hình.
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center", flexShrink: 0 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={isPlayingFull ? stopVoice : playFullVoice}
            disabled={!draft.trim() || !selected}
            style={{ display: "flex", alignItems: "center", gap: "6px", background: isPlayingFull ? "rgba(239, 68, 68, 0.2)" : "rgba(255,255,255,0.06)", border: isPlayingFull ? "1px solid rgba(239, 68, 68, 0.4)" : "1px solid rgba(255,255,255,0.12)", color: isPlayingFull ? "#f87171" : "#f8fafc", padding: "7px 12px", borderRadius: "7px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
          >
            {isPlayingFull ? <StopFill size={14} color="#f87171" /> : <PlayFill size={14} color="#38bdf8" />}
            {isPlayingFull ? "Dừng Giọng Đọc" : "🔊 Nghe Thử Toàn Kịch Bản"}
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onNavigate("timeline")}
            disabled={!selected || !draft.trim()}
            style={{ display: "flex", alignItems: "center", gap: "6px", background: "linear-gradient(135deg, #0284c7, #2563eb)", border: "none", color: "#ffffff", padding: "7px 16px", borderRadius: "7px", fontSize: "12.5px", fontWeight: 800, cursor: !selected || !draft.trim() ? "not-allowed" : "pointer", boxShadow: "0 0 16px rgba(56, 189, 248, 0.35)", opacity: !selected || !draft.trim() ? 0.5 : 1 }}
          >
            <CollectionPlayFill size={13} /> 4. Sang Bàn Dựng Timeline <ArrowRightShort size={16} />
          </button>
        </div>
      </div>

      {/* 2. Quick 3-Step Guided Workflow Banner */}
      <div style={{ background: "rgba(15, 23, 42, 0.65)", border: "1px solid rgba(56, 189, 248, 0.25)", borderRadius: "8px", padding: "8px 14px", marginBottom: "10px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px", alignItems: "center" }}>
        
        {/* Step 1 */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
          <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: "#0284c7", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 900, flexShrink: 0, boxShadow: "0 0 8px rgba(56, 189, 248, 0.4)" }}>
            1
          </div>
          <div style={{ minWidth: 0, overflow: "hidden" }}>
            <div style={{ fontSize: "11px", fontWeight: 800, color: "#f8fafc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>1. CHỌN VIDEO KỊCH BẢN</div>
            <div style={{ fontSize: "10px", color: "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Chọn video từ danh sách bên trái</div>
          </div>
        </div>

        {/* Step 2 */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
          <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", border: "1px solid rgba(56, 189, 248, 0.35)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 900, flexShrink: 0 }}>
            2
          </div>
          <div style={{ minWidth: 0, overflow: "hidden" }}>
            <div style={{ fontSize: "11px", fontWeight: 800, color: "#f8fafc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>2. CHỌN GIỌNG ĐỌC & TỐC ĐỘ</div>
            <div style={{ fontSize: "10px", color: "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Chọn giọng AI, chỉnh 1.0x - 1.2x</div>
          </div>
        </div>

        {/* Step 3 */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
          <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", border: "1px solid rgba(56, 189, 248, 0.35)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 900, flexShrink: 0 }}>
            3
          </div>
          <div style={{ minWidth: 0, overflow: "hidden" }}>
            <div style={{ fontSize: "11px", fontWeight: 800, color: "#f8fafc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>3. DUYỆT & XUẤT TIMELINE</div>
            <div style={{ fontSize: "10px", color: "#38bdf8", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Ghép khớp video, audio & sub</div>
          </div>
        </div>

      </div>

      {/* 3. KPI Summary Bar (Responsive with minWidth: 0) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "8px", marginBottom: "10px" }}>
        
        <div style={{ background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "8px", padding: "8px 12px", display: "flex", alignItems: "center", gap: "8px", minWidth: 0, overflow: "hidden" }}>
          <div style={{ width: "30px", height: "30px", borderRadius: "7px", background: "rgba(56, 189, 248, 0.12)", color: "#38bdf8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", flexShrink: 0 }}>
            <FileEarmarkTextFill />
          </div>
          <div style={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
            <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 700 }}>TỔNG KỊCH BẢN</div>
            <div style={{ fontSize: "14px", fontWeight: 800, color: "#f8fafc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {storyJobs.length} <span style={{ fontSize: "10.5px", color: "#64748b", fontWeight: 500 }}>kịch bản</span>
            </div>
          </div>
        </div>

        <div style={{ background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "8px", padding: "8px 12px", display: "flex", alignItems: "center", gap: "8px", minWidth: 0, overflow: "hidden" }}>
          <div style={{ width: "30px", height: "30px", borderRadius: "7px", background: "rgba(56, 189, 248, 0.12)", color: "#38bdf8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", flexShrink: 0 }}>
            <Stars />
          </div>
          <div style={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
            <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 700 }}>PHÂN CẢNH THOẠI</div>
            <div style={{ fontSize: "14px", fontWeight: 800, color: "#38bdf8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {selected?.analysis?.scenes?.length || 0} <span style={{ fontSize: "10.5px", color: "#64748b", fontWeight: 500 }}>phân cảnh</span>
            </div>
          </div>
        </div>

        <div style={{ background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "8px", padding: "8px 12px", display: "flex", alignItems: "center", gap: "8px", minWidth: 0, overflow: "hidden" }}>
          <div style={{ width: "30px", height: "30px", borderRadius: "7px", background: "rgba(56, 189, 248, 0.12)", color: "#38bdf8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", flexShrink: 0 }}>
            <ClockFill />
          </div>
          <div style={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
            <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 700 }}>THỜI LƯỢNG ĐỌC DỰ KIẾN</div>
            <div style={{ fontSize: "14px", fontWeight: 800, color: "#f8fafc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              ~{estimatedSeconds}s <span style={{ fontSize: "10.5px", color: "#64748b", fontWeight: 500 }}>({words} từ)</span>
            </div>
          </div>
        </div>

        <div style={{ background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "8px", padding: "8px 12px", display: "flex", alignItems: "center", gap: "8px", minWidth: 0, overflow: "hidden" }}>
          <div style={{ width: "30px", height: "30px", borderRadius: "7px", background: "rgba(56, 189, 248, 0.12)", color: "#38bdf8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", flexShrink: 0 }}>
            <MicFill />
          </div>
          <div style={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
            <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 700 }}>GIỌNG ĐỌC HIỆN TẠI</div>
            <div style={{ fontSize: "13px", fontWeight: 800, color: "#38bdf8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={availableVoices.find((v) => v.id === voiceId)?.label || "Hoài My"}>
              {availableVoices.find((v) => v.id === voiceId)?.label?.replace(/^⚡\s*/, "") || "Hoài My"} <span style={{ fontSize: "10.5px", color: "#64748b", fontWeight: 500 }}>({voiceRate}x)</span>
            </div>
          </div>
        </div>

      </div>

      {/* Toast */}
      {toastMessage && (
        <div style={{ position: "fixed", bottom: "24px", right: "24px", background: "rgba(15, 23, 42, 0.95)", border: "1px solid rgba(56, 189, 248, 0.4)", borderRadius: "8px", padding: "8px 14px", color: "#38bdf8", fontWeight: 700, fontSize: "12px", boxShadow: "0 10px 30px rgba(0,0,0,0.5)", zIndex: 99999, backdropFilter: "blur(12px)" }}>
          {toastMessage}
        </div>
      )}

      {/* 4. Empty State or Studio Workspace */}
      {!storyJobs.length ? (
        <div style={{ background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "12px", padding: "60px 20px", textAlign: "center", color: "#64748b" }}>
          <MicFill size={44} style={{ margin: "0 auto 12px", opacity: 0.4, color: "#38bdf8" }} />
          <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#f8fafc", marginBottom: "6px" }}>
            Chưa có kịch bản nào được phân tích
          </h3>
          <p style={{ fontSize: "12.5px", color: "#94a3b8", maxWidth: "460px", margin: "0 auto 18px" }}>
            Hãy mở <strong>Bước 2: Phân Tích AI</strong> để tự động trích xuất các phân cảnh và viết kịch bản lồng tiếng từ video gốc.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onNavigate("analysis")}
            style={{ background: "linear-gradient(135deg, #0284c7, #2563eb)", border: "none", color: "#fff", padding: "8px 18px", borderRadius: "7px", fontSize: "12.5px", fontWeight: 800, cursor: "pointer", boxShadow: "0 0 16px rgba(56, 189, 248, 0.35)" }}
          >
            <LightningChargeFill size={13} /> Mở Bước 2: Phân Tích AI
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "310px 1fr", gap: "12px", alignItems: "stretch", height: "calc(100vh - 255px)", minHeight: "450px" }}>
          
          {/* Left: Video Scripts Library */}
          <div style={{ background: "rgba(15, 23, 42, 0.75)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "10px", padding: "12px", display: "flex", flexDirection: "column", height: "100%", boxSizing: "border-box", minHeight: 0 }}>
            
            {/* Library Top & Search */}
            <div style={{ marginBottom: "8px", flexShrink: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <span style={{ fontSize: "10.5px", fontWeight: 800, color: "#38bdf8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  DANH SÁCH KỊCH BẢN ({filteredJobs.length})
                </span>
              </div>

              <div style={{ position: "relative" }}>
                <Search size={11} style={{ position: "absolute", left: "9px", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kịch bản..."
                  style={{ width: "100%", background: "rgba(0, 0, 0, 0.35)", border: "1px solid #334155", borderRadius: "6px", padding: "4px 8px 4px 26px", color: "#f8fafc", fontSize: "11.5px", outline: "none", boxSizing: "border-box" }}
                />
                {searchQuery && (
                  <button type="button" onClick={() => setSearchQuery("")} style={{ position: "absolute", right: "6px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#64748b", cursor: "pointer" }}>
                    <XLg size={10} />
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable Script Cards */}
            <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px", paddingRight: "2px" }}>
              {filteredJobs.map((job) => {
                const isSelected = job.id === selected?.id;
                const scenesCount = job.analysis?.scenes?.length || 0;

                return (
                  <div
                    key={job.id}
                    onClick={() => chooseJob(job)}
                    style={{
                      background: isSelected ? "rgba(2, 132, 199, 0.18)" : "rgba(30, 41, 59, 0.45)",
                      border: isSelected ? "1px solid #38bdf8" : "1px solid rgba(255, 255, 255, 0.06)",
                      borderRadius: "7px",
                      padding: "8px 10px",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      boxShadow: isSelected ? "0 0 12px rgba(56, 189, 248, 0.2)" : "none",
                      flexShrink: 0,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "6px" }}>
                      <strong style={{ fontSize: "11.5px", color: isSelected ? "#38bdf8" : "#f8fafc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1 }} title={job.name}>
                        {job.name}
                      </strong>
                      <ChevronRight size={10} color={isSelected ? "#38bdf8" : "#64748b"} style={{ marginTop: "2px", flexShrink: 0 }} />
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px", fontSize: "10px", color: "#94a3b8" }}>
                      <span style={{ background: "rgba(56, 189, 248, 0.12)", color: "#38bdf8", padding: "1px 5px", borderRadius: "3px", fontWeight: 700 }}>
                        {scenesCount} Cảnh
                      </span>
                      <span>•</span>
                      <span>{job.createdAt || "Vừa xong"}</span>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

          {/* Right: Studio Script & Voice Synthesizer Editor */}
          <div style={{ background: "rgba(15, 23, 42, 0.75)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "10px", padding: "14px", display: "flex", flexDirection: "column", height: "100%", boxSizing: "border-box", minHeight: 0 }}>
            
            {/* Top Bar of Editor */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "8px", marginBottom: "10px", flexWrap: "wrap", gap: "8px", flexShrink: 0 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <FileEarmarkTextFill size={14} color="#38bdf8" style={{ flexShrink: 0 }} />
                  <strong style={{ fontSize: "13px", color: "#f8fafc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={selected?.name}>
                    {selected?.name}
                  </strong>
                </div>
                <span style={{ fontSize: "10.5px", color: "#64748b", marginTop: "1px", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {selected?.source}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                {selected?.analysis?.storyPlan && (
                  <button
                    type="button"
                    onClick={() => setIsAidaModalOpen(true)}
                    style={{ background: "rgba(56, 189, 248, 0.1)", border: "1px solid rgba(56, 189, 248, 0.3)", color: "#38bdf8", padding: "4px 8px", borderRadius: "5px", fontSize: "11px", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
                  >
                    <Stars size={11} /> Cấu Trúc AIDA
                  </button>
                )}

                <span style={{ padding: "2px 7px", borderRadius: "4px", background: saved ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)", color: saved ? "#34d399" : "#fbbf24", border: saved ? "1px solid rgba(16, 185, 129, 0.35)" : "1px solid rgba(245, 158, 11, 0.35)", fontSize: "10.5px", fontWeight: 800 }}>
                  {saved ? "✓ Đã Lưu" : "📝 Bản Thảo"}
                </span>
              </div>
            </div>

            {/* Voice Pack & Synthesizer Controls Console */}
            <div style={{ background: "rgba(0, 0, 0, 0.35)", border: "1px solid rgba(56, 189, 248, 0.2)", borderRadius: "7px", padding: "8px 10px", marginBottom: "10px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "8px", alignItems: "center", flexShrink: 0 }}>
              
              {/* Language */}
              <div style={{ minWidth: 0 }}>
                <label style={{ display: "block", fontSize: "10px", fontWeight: 700, color: "#94a3b8", marginBottom: "2px" }}>
                  NGÔN NGỮ
                </label>
                <select
                  value={voiceLanguage}
                  onChange={(e) => {
                    const next = e.target.value;
                    setVoiceLanguage(next);
                    setVoiceId(defaultVoice(next, voiceGender).id);
                  }}
                  style={{ width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: "4px", padding: "3px 6px", color: "#f8fafc", fontSize: "11px", outline: "none", boxSizing: "border-box" }}
                >
                  <option value="vi">Tiếng Việt (VN)</option>
                  <option value="en">English (US)</option>
                  <option value="ja">日本語 (JP)</option>
                  <option value="ko">한국어 (KR)</option>
                  <option value="zh-CN">中文 (CN)</option>
                </select>
              </div>

              {/* Gender */}
              <div style={{ minWidth: 0 }}>
                <label style={{ display: "block", fontSize: "10px", fontWeight: 700, color: "#94a3b8", marginBottom: "2px" }}>
                  GIỚI TÍNH
                </label>
                <select
                  value={voiceGender}
                  onChange={(e) => {
                    const next = e.target.value as "male" | "female";
                    setVoiceGender(next);
                    setVoiceId(defaultVoice(voiceLanguage, next).id);
                  }}
                  style={{ width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: "4px", padding: "3px 6px", color: "#f8fafc", fontSize: "11px", outline: "none", boxSizing: "border-box" }}
                >
                  <option value="female">Nữ · Truyền cảm</option>
                  <option value="male">Nam · Trầm ấm</option>
                </select>
              </div>

              {/* Voice Pack */}
              <div style={{ minWidth: 0 }}>
                <label style={{ display: "block", fontSize: "10px", fontWeight: 700, color: "#94a3b8", marginBottom: "2px" }}>
                  GIỌNG ĐỌC AI
                </label>
                <select
                  value={voiceId}
                  onChange={(e) => setVoiceId(e.target.value)}
                  style={{ width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: "4px", padding: "3px 6px", color: "#f8fafc", fontSize: "11px", outline: "none", boxSizing: "border-box" }}
                >
                  {availableVoices.map((voice) => (
                    <option value={voice.id} key={voice.id}>
                      {voice.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Speed / Rate */}
              <div style={{ minWidth: 0 }}>
                <label style={{ display: "block", fontSize: "10px", fontWeight: 700, color: "#94a3b8", marginBottom: "2px" }}>
                  TỐC ĐỘ: <span style={{ color: "#38bdf8" }}>{voiceRate}x</span>
                </label>
                <select
                  value={voiceRate}
                  onChange={(e) => setVoiceRate(Number(e.target.value))}
                  style={{ width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: "4px", padding: "3px 6px", color: "#f8fafc", fontSize: "11px", outline: "none", boxSizing: "border-box" }}
                >
                  <option value={0.8}>0.8x (Chậm)</option>
                  <option value={1.0}>1.0x (Chuẩn)</option>
                  <option value={1.15}>1.15x (Nhanh)</option>
                  <option value={1.3}>1.3x (TikTok)</option>
                </select>
              </div>

            </div>

            {/* Tab Switcher: Full Script vs Scene-by-Scene */}
            <div style={{ display: "flex", gap: "6px", marginBottom: "8px", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "6px", flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => setActiveTab("full")}
                style={{
                  background: activeTab === "full" ? "rgba(2, 132, 199, 0.25)" : "transparent",
                  color: activeTab === "full" ? "#38bdf8" : "#94a3b8",
                  border: activeTab === "full" ? "1px solid #38bdf8" : "1px solid transparent",
                  padding: "3px 9px",
                  borderRadius: "4px",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                📜 Kịch Bản Toàn Văn
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("scenes")}
                style={{
                  background: activeTab === "scenes" ? "rgba(2, 132, 199, 0.25)" : "transparent",
                  color: activeTab === "scenes" ? "#38bdf8" : "#94a3b8",
                  border: activeTab === "scenes" ? "1px solid #38bdf8" : "1px solid transparent",
                  padding: "3px 9px",
                  borderRadius: "4px",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                🎞️ Từng Phân Cảnh ({selected?.analysis?.scenes?.length || 0})
              </button>
            </div>

            {/* Script Text Editor Area (Stretches with flex: 1) */}
            <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              {activeTab === "full" ? (
                <textarea
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    setSaved(false);
                  }}
                  placeholder="Nhập hoặc chỉnh sửa kịch bản lồng tiếng toàn bài..."
                  style={{
                    width: "100%",
                    height: "100%",
                    flex: 1,
                    minHeight: 0,
                    background: "#080c14",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "7px",
                    padding: "10px",
                    color: "#f8fafc",
                    fontSize: "13px",
                    lineHeight: "1.6",
                    outline: "none",
                    resize: "none",
                    fontFamily: "inherit",
                    boxShadow: "inset 0 2px 8px rgba(0,0,0,0.5)",
                    boxSizing: "border-box",
                  }}
                />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1, minHeight: 0, overflowY: "auto", paddingRight: "2px" }}>
                  {(selected?.analysis?.scenes || []).map((sc, idx) => {
                    const sceneKey = sc.id || `scene-${idx + 1}`;
                    const sceneVal = sceneDrafts[sceneKey] ?? (sc.voiceover || sc.translation || "");
                    const isPlayingThis = playingSceneKey === sceneKey;

                    return (
                      <div
                        key={sceneKey}
                        style={{
                          background: "rgba(30, 41, 59, 0.4)",
                          border: "1px solid rgba(255, 255, 255, 0.06)",
                          borderRadius: "6px",
                          padding: "8px 10px",
                          flexShrink: 0,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3px" }}>
                          <span style={{ fontSize: "10.5px", fontWeight: 800, color: "#38bdf8" }}>
                            Cảnh #{idx + 1}: {sc.title}
                          </span>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ fontSize: "10px", color: "#64748b", fontFamily: "monospace" }}>
                              ⏱️ {sc.start} ➔ {sc.end || "00:15"}
                            </span>
                            <button
                              type="button"
                              onClick={() => isPlayingThis ? stopVoice() : playSceneVoice(sceneKey, sceneVal)}
                              style={{ background: isPlayingThis ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.06)", border: isPlayingThis ? "1px solid rgba(239,68,68,0.4)" : "1px solid rgba(255,255,255,0.1)", color: isPlayingThis ? "#f87171" : "#38bdf8", padding: "1px 5px", borderRadius: "3px", fontSize: "10px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "3px" }}
                            >
                              <VolumeUpFill size={10} /> {isPlayingThis ? "Dừng" : "Đọc thử"}
                            </button>
                          </div>
                        </div>

                        <input
                          type="text"
                          value={sceneVal}
                          onChange={(e) => {
                            const v = e.target.value;
                            setSceneDrafts((prev) => ({ ...prev, [sceneKey]: v }));
                            setSaved(false);
                          }}
                          style={{
                            width: "100%",
                            background: "rgba(0,0,0,0.3)",
                            border: "1px solid #334155",
                            borderRadius: "4px",
                            padding: "5px 7px",
                            color: "#f8fafc",
                            fontSize: "11.5px",
                            outline: "none",
                            boxSizing: "border-box",
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Actions Bar (Always Visible at bottom of Editor Card) */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "10px", marginTop: "8px", flexWrap: "wrap", gap: "8px", flexShrink: 0 }}>
              <div style={{ display: "flex", gap: "10px", fontSize: "10.5px", color: "#94a3b8" }}>
                <span>⏱️ <strong>~{estimatedSeconds}s</strong></span>
                <span>📝 <strong>{words} từ</strong> ({draft.length} ký tự)</span>
              </div>

              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  type="button"
                  onClick={saveDraft}
                  disabled={!draft.trim() || !selected}
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#f8fafc", padding: "5px 10px", borderRadius: "5px", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}
                >
                  <CheckLg size={11} /> Lưu Bản Thảo
                </button>

                <button
                  type="button"
                  onClick={approveScript}
                  disabled={!draft.trim() || !selected}
                  style={{ background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.35)", color: "#34d399", padding: "5px 10px", borderRadius: "5px", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}
                >
                  <CheckCircleFill size={11} /> Duyệt Kịch Bản
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate("timeline")}
                  style={{ background: "linear-gradient(135deg, #0284c7, #2563eb)", border: "none", color: "#fff", padding: "5px 12px", borderRadius: "5px", fontSize: "11px", fontWeight: 800, cursor: "pointer", boxShadow: "0 0 10px rgba(56, 189, 248, 0.35)" }}
                >
                  <CollectionPlayFill size={11} /> Sang Dựng Timeline
                </button>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* Modal AIDA */}
      <Modal
        isOpen={isAidaModalOpen}
        onClose={() => setIsAidaModalOpen(false)}
        title="Cấu Trúc Story Plan AIDA 5 Nhịp"
        eyebrow="AI CONTEXTUAL STORY PLAN"
        maxWidth="600px"
      >
        {selected?.analysis?.storyPlan && (
          <div style={{ display: "grid", gap: "8px" }}>
            <div style={{ padding: "8px 10px", background: "rgba(2, 132, 199, 0.1)", borderRadius: "7px", border: "1px solid rgba(56, 189, 248, 0.3)" }}>
              <strong style={{ color: "#38bdf8", fontSize: "11px", display: "block" }}>1. HOOK (3s Đầu Thu Hút)</strong>
              <p style={{ margin: "2px 0 0", fontSize: "11.5px", color: "#e2e8f0" }}>{selected.analysis.storyPlan.hook || "Chưa có"}</p>
            </div>

            <div style={{ padding: "8px 10px", background: "rgba(255,255,255,0.03)", borderRadius: "7px", border: "1px solid rgba(255,255,255,0.08)" }}>
              <strong style={{ color: "#38bdf8", fontSize: "11px", display: "block" }}>2. SETUP & BUILD-UP (Mở Đầu & Cao Trào)</strong>
              <p style={{ margin: "2px 0 0", fontSize: "11.5px", color: "#e2e8f0" }}>{selected.analysis.storyPlan.buildUp || "Chưa có"}</p>
            </div>

            <div style={{ padding: "8px 10px", background: "rgba(255,255,255,0.03)", borderRadius: "7px", border: "1px solid rgba(255,255,255,0.08)" }}>
              <strong style={{ color: "#34d399", fontSize: "11px", display: "block" }}>3. CLIMAX (Đỉnh Điểm Xung Đột)</strong>
              <p style={{ margin: "2px 0 0", fontSize: "11.5px", color: "#e2e8f0" }}>{selected.analysis.storyPlan.climax || "Chưa có"}</p>
            </div>

            <div style={{ padding: "8px 10px", background: "rgba(255,255,255,0.03)", borderRadius: "7px", border: "1px solid rgba(255,255,255,0.08)" }}>
              <strong style={{ color: "#c084fc", fontSize: "11px", display: "block" }}>4. CTA (Kêu Gọi Tương Tác)</strong>
              <p style={{ margin: "2px 0 0", fontSize: "11.5px", color: "#e2e8f0" }}>{selected.analysis.storyPlan.cta || "Chưa có"}</p>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
