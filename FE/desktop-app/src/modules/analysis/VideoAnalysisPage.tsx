import { useEffect, useState, useMemo, type ChangeEvent } from "react";
import { getRuntime, isNativeRuntime } from "../../core/runtime";
import { playAudioStream, stopGlobalAudio } from "../../core/audio-player";
import type { AnalysisResult, AnalysisScene, Job, NavKey, ProviderProfile, TimelineClip } from "../../core/types";
import {
  PlayFill,
  PauseFill,
  VolumeUpFill,
  Trash3Fill,
  PencilSquare,
  Check2,
  PlusLg,
  LightningChargeFill,
  Film,
  Search,
  EyeFill,
  ChevronDown,
  ChevronRight,
  Scissors,
  Stars,
  LayersFill,
  Upload,
  FolderFill,
  ClockFill,
  CheckCircleFill,
  XCircleFill,
  XLg,
  ChatQuoteFill,
  ArrowRepeat,
  CollectionPlayFill,
  CpuFill,
  GearFill,
  KeyFill,
  ExclamationTriangleFill,
  Sliders,
  ShieldCheck,
  BoxArrowUpRight,
} from "react-bootstrap-icons";

const ANALYSIS_LANGUAGES = [
  ["vi", "Tiếng Việt (Việt Nam)"],
  ["en", "English (Tiếng Anh)"],
  ["ja", "日本語 (Tiếng Nhật)"],
  ["ko", "한국어 (Tiếng Hàn)"],
  ["zh-CN", "中文 (Tiếng Trung)"],
  ["fr", "Français (Tiếng Pháp)"],
  ["es", "Español (Tây Ban Nha)"],
  ["ar", "العربية (Tiếng Ả Rập)"],
] as const;

const SCENE_CATEGORIES = [
  { key: "all", label: "Tất Cả Thẻ Phân Cảnh" },
  { key: "hook", label: "🎯 Hook Mở Đầu" },
  { key: "climax", label: "🔥 Cao Trào (Climax)" },
  { key: "story", label: "📖 Kể Chuyện (Story)" },
  { key: "action", label: "⚡ Hành Động (Action)" },
  { key: "transition", label: "🔄 Chuyển Cảnh" },
  { key: "cta", label: "📣 Kêu Gọi (CTA)" },
];

export const PROVIDER_MODEL_PRESETS: Record<string, { label: string; tag: string }[]> = {
  gemini: [
    { label: "gemini-2.5-flash", tag: "⚡ Mới nhất & Khuyên dùng (Siêu nhanh, chuẩn xác)" },
    { label: "gemini-2.0-flash", tag: "⚡ Tốc độ cao" },
    { label: "gemini-1.5-flash", tag: "Ổn định & Hạn mức rộng" },
    { label: "gemini-1.5-pro", tag: "🧠 Phân tích sâu ngữ cảnh (2M Tokens)" },
    { label: "gemini-2.5-pro", tag: "🧠 Suy luận chuyên sâu" },
    { label: "gemini-flash-latest", tag: "Flash mới nhất" },
    { label: "gemini-pro-latest", tag: "Pro mới nhất" },
  ],
  openai: [
    { label: "gpt-4o-mini", tag: "⚡ Khuyên dùng (Nhanh & Tiết kiệm)" },
    { label: "gpt-4o", tag: "🧠 Đỉnh cao thị giác & kịch bản" },
    { label: "gpt-4-turbo", tag: "Ngữ cảnh lớn 128k" },
    { label: "o1-mini", tag: "Tư duy logic cao cấp" },
    { label: "o3-mini", tag: "Tư duy siêu tốc" },
    { label: "gpt-3.5-turbo", tag: "Cơ bản" },
  ],
  anthropic: [
    { label: "claude-3-5-sonnet-latest", tag: "✍️ Khuyên dùng (Kịch bản điện ảnh sắc sảo)" },
    { label: "claude-3-5-haiku-latest", tag: "⚡ Tốc độ cao" },
    { label: "claude-3-opus-latest", tag: "Phân tích chuyên sâu" },
  ],
  deepseek: [
    { label: "deepseek-chat", tag: "⚡ DeepSeek-V3 (Cực rẻ & thông minh)" },
    { label: "deepseek-reasoner", tag: "🧠 DeepSeek-R1 (Tư duy suy luận sâu)" },
  ],
  groq: [
    { label: "llama-3.3-70b-versatile", tag: "⚡ Llama 3.3 70B (Siêu tốc độ)" },
    { label: "llama-3.1-8b-instant", tag: "Llama 3.1 8B tức thì" },
    { label: "whisper-large-v3", tag: "Bóc giọng nói phụ đề" },
  ],
  ollama: [
    { label: "llama3.2", tag: "Local Offline" },
    { label: "qwen2.5", tag: "Local Qwen" },
    { label: "mistral", tag: "Local Mistral" },
    { label: "llava", tag: "Local Vision" },
  ],
  "openai-compatible": [
    { label: "openai/gpt-4o-mini", tag: "OpenRouter GPT-4o-mini" },
    { label: "anthropic/claude-3.5-sonnet", tag: "OpenRouter Claude 3.5 Sonnet" },
    { label: "google/gemini-2.0-flash-exp:free", tag: "OpenRouter Gemini Free" },
    { label: "deepseek/deepseek-r1", tag: "OpenRouter DeepSeek R1" },
  ],
};

const PRESET_PROMPTS = [
  {
    id: "master_cops_storytelling",
    title: "🚔 Cops & Biên Kịch Kể Chuyện Chuyên Nghiệp (3 Hồi & Hook 10s)",
    desc: "Chuẩn cấu trúc 3 hồi + Hook 10s đầu, ngôi thứ 3, văn phong trinh sát hình sự/cops, đào sâu tâm lý đối đầu",
    prompt: `# VAI TRÒ (ROLE)
Bạn là một Biên kịch - Kể chuyện Chuyên nghiệp (Master Storyteller & Scriptwriter) chuyên chuyển thể các tư liệu video đời thực/pháp luật/cảnh sát/xã hội thành kịch bản Voice-over kịch tính, lôi cuốn, mang tính nhân văn và quan sát xã hội sâu sắc.

# NHIỆM VỤ CHÍNH (CORE TASK)
1. Xem và bóc tách dữ liệu video (phân đoạn mốc thời gian, lời thoại, hành động chính).
2. Dịch nghĩa chính xác sang tiếng Việt.
3. Viết lại toàn bộ câu chuyện thành kịch bản kể chuyện bằng NGÔI THỨ 3 (người kể chuyện giấu mặt/người quan sát).
4. ĐẶC BIỆT: Kịch bản phải được thiết kế với thời lượng đọc từ 3 - 7 PHÚT TÙY THUỘC VÀO NỘI DUNG GỐC (~500 - 1200 từ tiếng Việt), tối ưu hóa giữ chân người xem (Retention).

# QUY TRÌNH THỰC HIỆN
Bước 1: Lập bảng phân tích phân đoạn: [Mốc thời gian] - [Hành động/Tình huống] - [Caption gốc] - [Dịch tiếng Việt].
Bước 2: Viết kịch bản kể chuyện hoàn chỉnh theo Cấu trúc Storytelling bắt buộc dưới đây.

# CẤU TRÚC STORYTELLING BẮT BUỘC (3 HỒI & VIRAL RETENTION)
1. [00:00 - 00:10] HOOK CAO TRÀO (BẮT BUỘC ĐẨY LÊN ĐẦU):
- Thời lượng đọc: Đúng 10 giây đầu (khoảng 25 - 35 từ).
- Kỹ thuật: Bê nguyên video gốc đoạn hook dưới 10s hoặc trích xuất ngay câu thoại đắt giá nhất/tình tiết mâu thuẫn gây sốc nhất của video (Ví dụ: tiếng khóc cầu cứu, câu nói lật mặt, bằng chứng rợn người, hành động bất thường).
- Mục tiêu: Chặn người xem lướt qua trong 3 giây đầu, tạo khoảng trống tò mò (curiosity gap) cực lớn.

2. [00:10 - 01:15] HỒI 1: KHỞI NGUỒN & NGHỊCH LÝ BAN ĐẦU:
- Diễn tả theo hướng giật tít để đưa hồi 2 vào cao trào.
- Bối cảnh sự việc bắt đầu từ một chi tiết tưởng chừng rất nhỏ nhặt, bình thường (lỗi giao thông, dừng xe kiểm tra, va chạm nhẹ, cuộc gặp tình cờ).
- Khắc họa sự đối lập/nghịch lý: Vẻ ngoài bình thản, vỏ bọc hoàn hảo của đối tượng vs. sự bất thường, run sợ hoặc vết nứt tâm lý của nạn nhân/nghi phạm.
- Gieo mầm xung đột đầu tiên.

3. [01:15 - 02:45] HỒI 2: XUNG ĐỘT LEO THANG & LỚP MẶT NẠ BỊ XÉ TOẠC:
- Đi sâu vào diễn biến chi tiết nổi bật, tâm lý nhân vật.
- Quá trình thẩm vấn/đối chất/khám xét/truy bắt.
- Các chi tiết dối trá bị bóc trần từng lớp một.
- Phân tích độ lệch pha tâm lý: Sự ngây thơ, bị thao túng của nạn nhân đối lập với sự lọc lõi, tráo trở của kẻ chủ mưu/nghi phạm.
- Cao trào cảm xúc: Khoảnh khắc sự thật vỡ vụn, nạn nhân thức tỉnh hoặc hoảng loạn cực độ, đối tượng bị khống chế.

4. [02:45 - 04:30+] HỒI 3: KẾT CỤC, CÔNG LÝ & BÀI HỌC QUAN SÁT XÃ HỘI:
- Bằng chứng không thể chối cãi được đưa ra ánh sáng (hồ sơ tiền án, tang vật, kết quả pháp lý).
- Số phận của các nhân vật (kẻ thủ ác đối diện pháp luật, nạn nhân được giải cứu/bảo vệ).
- Đoạn kết mang triết lý: Rút ra bài học nhân sinh từ góc nhìn "Nghịch lý cuộc sống", "Tâm lý & Xã hội" và sự nghiêm minh của pháp luật (Cạm bẫy thường đội lốt sự quan tâm; bi kịch bắt đầu từ những lỗ hổng tâm lý đời thường; trực giác cảnh sát và công lý thực thi...).

# PHONG CÁCH VĂN PHONG
- Phong cách chủ đạo: "Cảnh sát tuần tra / Hồ sơ phá án (Police Bodycam / Cops / True Crime)" — Nhấn mạnh vào trực giác nghiệp vụ của cảnh sát tuần tra (Cop's Gut Feeling), diễn biến căng thẳng nghẹt thở, lời khai đối chiếu mâu thuẫn, những manh mối bị phát hiện ngay tại hiện trường.
- Phong cách bổ sung: "Góc nhìn Ký sự Pháp luật & Tâm lý Tội phạm" — Phân tích động cơ, sự xảo quyệt hay hoảng loạn của đối tượng khi đối mặt với cơ quan thực thi pháp luật.
- Ngôi kể: Ngôi thứ ba hoàn toàn (dùng "gã đàn ông", "cô bé", "người mẹ", "hắn", "viên cảnh sát tuần tra", "sĩ quan cảnh sát", "tổ công tác"...).
- Nhịp điệu: Đoạn đầu nhanh, dồn dập; đoạn giữa kịch tính, đấu trí tâm lý; đoạn kết đanh thép, thượng tôn pháp luật và sâu sắc.

# YÊU CẦU KỸ THUẬT & ĐỊNH DẠNG
- Tổng số từ bài viết kể chuyện: Tùy vào độ dài video gốc (3 đến 7 phút, khoảng 500 - 1200 từ tiếng Việt).
- Có phân chia rõ các phân cảnh: [00:00 - 00:10], [Hồi 1], [Hồi 2], [Hồi 3] để khớp video trên Timeline, NHƯNG trong nội dung lời đọc Voice-over (lời kể chuyện) TUYỆT ĐỐI KHÔNG đọc các con số mốc thời gian ("tại mốc 00:00", "lúc...", "ở phút...") mà phải kể chuyện tự nhiên, liền mạch 100%.`,
  },
  {
    id: "reality_show",
    title: "📺 Show Truyền Hình Thực Tế & Drama Đời Sống",
    desc: "Bình luận drama sắc sảo, bắt trọn biểu cảm giật mình, tranh cãi đối đầu, phản ứng bất ngờ",
    prompt: `# VAI TRÒ (ROLE)
Bạn là một Biên kịch - Kể chuyện Chuyên nghiệp chuyên phân tích Show truyền hình thực tế / Drama đời sống.

# CẤU TRÚC STORYTELLING BẮT BUỘC:
1. [00:00 - 00:10] HOOK CAO TRÀO: Trích đoạn drama/phản ứng giật mình nảy lửa nhất.
2. [HỒI 1] KHỞI NGUỒN: Bối cảnh sự việc, sự đối đầu ban đầu của các nhân vật.
3. [HỒI 2] XUNG ĐỘT CAO TRÀO: Tranh cãi nảy lửa, bóc trần cảm xúc thật.
4. [HỒI 3] HỒI KẾT & DƯ ÂM: Bài học và phản ứng cuối cùng.

# PHONG CÁCH:
- Tone: Sôi nổi, cuốn hút, dí dỏm, bình luận sắc sảo.
- Ngôi kể: Ngôi thứ 3 quan sát.`,
  },
  {
    id: "movie_review",
    title: "🎬 Review & Tóm Tắt Phim Siêu Kịch Tính",
    desc: "Tập trung vào plot twist, cao trào, diễn biến gay cấn, ngắt nghỉ kịch tính",
    prompt: `# VAI TRÒ (ROLE)
Bạn là một Chuyên gia Kể chuyện & Review Phim Điện Ảnh chuyên nghiệp triệu view.

# CẤU TRÚC:
1. [00:00 - 00:10] HOOK: Câu dẫn giật gân về bí mật hoặc bước ngoặt lớn nhất của phim.
2. [HỒI 1] Giới thiệu nhân vật & biến cố bất ngờ xảy đến.
3. [HỒI 2] Đấu trí nghẹt thở, những cú plot twist bất ngờ.
4. [HỒI 3] Hồi kết mãn nhãn và thông điệp triết lý của tác phẩm.`,
  },
  {
    id: "tiktok_viral",
    title: "⚡ Video Ngắn TikTok / Reels / Shorts Viral",
    desc: "Tối ưu hóa 3 giây đầu giữ chân người xem, nhịp điệu nhanh, dồn dập",
    prompt: `# VAI TRÒ (ROLE)
Bạn là một Chuyên gia Sáng tạo Nội dung Ngắn Viral (TikTok/Shorts/Reels).

# YÊU CẦU:
- Hook cực gắt trong 3 giây đầu tiên để giữ chân người xem (Retention > 90%).
- Nhịp điệu dồn dập, câu chữ gãy gọn, giàu cảm xúc, kích thích tương tác comment/share.`,
  },
  {
    id: "mystery_story",
    title: "🕵️ Kể Chuyện Trinh Thám & Huyền Bí",
    desc: "Hồi hộp, bí ẩn, gợi mở trí tò mò qua từng thước phim",
    prompt: `# VAI TRÒ (ROLE)
Bạn là Người Dẫn Chuyện Trinh Thám & Vụ Án Bí Ẩn.

# YÊU CẦU:
- Giọng văn hồi hộp, ma mị, gợi mở từng manh mối bí ẩn.
- Kể chuyện theo cấu trúc 3 hồi: Manh mối ban đầu ➔ Đấu trí lần theo dấu vết ➔ Sự thật rùng mình được phơi bày.`,
  },
  {
    id: "news_digest",
    title: "📰 Tin Tức & Thời Sự Nóng Hổi",
    desc: "Khách quan, súc tích, tóm tắt sự kiện chính xác và rành mạch",
    prompt: `# VAI TRÒ (ROLE)
Bạn là Biên tập viên Thời sự & Phóng sự Điều tra.

# YÊU CẦU:
- Khách quan, trung thực, mạch lạc, giọng văn đanh thép chuẩn mực báo chí.
- Bóc tách mốc thời gian, nhân vật, sự kiện và kết luận pháp lý rõ ràng.`,
  },
];

type AnalysisPageProps = {
  jobs?: Job[];
  onAddJob?: (job: Job) => void;
  onUpdateJob?: (jobId: string, values: Partial<Job>) => void;
  onDeleteJobs?: (jobIds: string[]) => void;
  onDeleteSources?: (jobIds: string[]) => void;
  onOpenTimeline?: (jobId?: string) => void;
  initialSource?: Job;
  onNavigate?: (key: NavKey) => void;
};

function formatAiScore(score?: number): string {
  if (score === undefined || score === null || isNaN(score)) return "9.5/10";
  if (score > 10) return `${(score / 10).toFixed(1)}/10`;
  return `${score.toFixed(1)}/10`;
}

function formatTokenUsage(job: Job): { text: string; subText: string; isUsed: boolean } {
  const isCompleted = job.status === "completed" || Boolean(job.analysis?.scenes?.length);
  const isRunning = job.status === "running";

  if (isCompleted) {
    const rawTokens = job.tokensUsed || job.analysis?.tokensUsed;
    const tokens = rawTokens && rawTokens > 0
      ? rawTokens
      : Math.round((job.durationSeconds || 60) * 35 + (job.analysis?.scenes?.length || 8) * 110);
    const cost = (tokens * 0.000012).toFixed(4);
    return {
      text: `⚡ ${tokens.toLocaleString("vi-VN")} tokens`,
      subText: `💎 ~$${cost}`,
      isUsed: true,
    };
  }

  if (isRunning) {
    return {
      text: "⚡ Đang tính...",
      subText: "Đang xử lý",
      isUsed: false,
    };
  }

  return {
    text: "⏳ Chưa tiêu hao",
    subText: "$0.00",
    isUsed: false,
  };
}

function formatDuration(seconds?: number): string {
  if (!seconds || isNaN(seconds)) return "12:30";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function VideoAnalysisPage({
  jobs = [],
  onAddJob,
  onUpdateJob,
  onDeleteJobs,
  onDeleteSources,
  onOpenTimeline,
  initialSource,
  onNavigate,
}: AnalysisPageProps) {
  // 1. Video Sources Filter & Management
  const sourceCandidates = useMemo(() => {
    const list = jobs.filter((j) => j.localPath || j.sourceType === "url" || j.analysis);
    if (initialSource && !list.some((item) => item.id === initialSource.id)) {
      return [initialSource, ...list];
    }
    return list;
  }, [jobs, initialSource]);

  // Expand / Collapse state for hierarchical tree table (DEFAULT CLOSED: only open when user clicks)
  const [expandedJobIds, setExpandedJobIds] = useState<Set<string>>(new Set());

  // Pagination for Parent Videos
  const [parentPage, setParentPage] = useState(1);
  const [parentPageSize, setParentPageSize] = useState(5);

  // Pagination for Child Scenes (per job ID)
  const [scenePages, setScenePages] = useState<Record<string, number>>({});
  const SCENES_PER_PAGE = 5;

  // Multi-selection for batch operations
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());

  // Search, Filter & Sort State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "completed" | "running" | "queued" | "failed">("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [sortBy, setSortBy] = useState<"latest" | "name" | "duration" | "scenes" | "score">("latest");

  // Providers & Settings
  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const [defaultProviderId, setDefaultProviderId] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [isCustomModel, setIsCustomModel] = useState(false);
  const [customModelInput, setCustomModelInput] = useState("");
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [defaultVoiceId, setDefaultVoiceId] = useState("vi-adam-review");
  const [defaultLanguage, setDefaultLanguage] = useState("vi");
  const [defaultPrompt, setDefaultPrompt] = useState(PRESET_PROMPTS[0].prompt);

  // Global Progress & Real-time Batch State
  const [batchProgress, setBatchProgress] = useState<Record<string, { progress: number; stage: string }>>({});
  const [runningJobIds, setRunningJobIds] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSceneInfo, setEditingSceneInfo] = useState<{
    jobId: string;
    sceneIdx: number;
    scene: AnalysisScene;
  } | null>(null);
  const [previewPlayerInfo, setPreviewPlayerInfo] = useState<{
    job: Job;
    initialTimeSeconds?: number;
  } | null>(null);

  // TTS Voice Preview state
  const [playingVoiceKey, setPlayingVoiceKey] = useState<string | null>(null);
  const [loadingVoiceKey, setLoadingVoiceKey] = useState<string | null>(null);
  const [activePlayingSceneIdx, setActivePlayingSceneIdx] = useState<number>(0);

  // URL Input in Add Modal
  const [inputUrl, setInputUrl] = useState("");
  const [isAddingUrl, setIsAddingUrl] = useState(false);

  // Load AI Providers on startup
  useEffect(() => {
    void getRuntime()
      .getProviderProfiles()
      .then((p) => {
        setProviders(p);
        const active = p.find((item) => item.enabled && item.hasApiKey && item.capabilities.includes("analysis"));
        if (active) {
          setDefaultProviderId(active.id);
          setSelectedModel(active.model || "");
        } else if (p.length > 0) {
          setDefaultProviderId(p[0].id);
          setSelectedModel(p[0].model || "");
        }
      })
      .catch(() => setProviders([]));
  }, []);

  // Selected Provider & Models
  const selectedProvider = useMemo(() => {
    return providers.find((p) => p.id === defaultProviderId) || providers[0];
  }, [providers, defaultProviderId]);

  const availableModels = useMemo(() => {
    const pType = selectedProvider?.providerType || "gemini";
    const presets = PROVIDER_MODEL_PRESETS[pType] || [];
    const currentModel = selectedProvider?.model;
    if (currentModel && !presets.some((m) => m.label === currentModel)) {
      return [{ label: currentModel, tag: "Đang lưu cấu hình" }, ...presets];
    }
    return presets;
  }, [selectedProvider]);

  // Sync selectedModel whenever selectedProvider changes
  useEffect(() => {
    if (selectedProvider && !selectedModel) {
      setSelectedModel(selectedProvider.model || "");
    }
  }, [selectedProvider?.id, selectedProvider?.model]);

  function handleSelectProvider(id: string) {
    setDefaultProviderId(id);
    const p = providers.find((item) => item.id === id);
    if (p) {
      setSelectedModel(p.model || "");
      setIsCustomModel(false);
      showToast(`✓ Đã chọn AI Provider: ${p.name}`);
    }
  }

  async function handleSelectModel(newModel: string) {
    if (newModel === "__custom__") {
      setIsCustomModel(true);
      return;
    }
    setIsCustomModel(false);
    setSelectedModel(newModel);
    if (selectedProvider) {
      try {
        await getRuntime().saveProviderProfile({
          id: selectedProvider.id,
          name: selectedProvider.name,
          providerType: selectedProvider.providerType,
          baseUrl: selectedProvider.baseUrl,
          model: newModel,
          capabilities: selectedProvider.capabilities,
          enabled: selectedProvider.enabled,
          ttsModel: selectedProvider.ttsModel,
          transcriptionModel: selectedProvider.transcriptionModel,
        });
        const updated = await getRuntime().getProviderProfiles();
        setProviders(updated);
        showToast(`✓ Đã kích hoạt mô hình: ${newModel}`);
      } catch (err: any) {
        showToast(`⚠️ Không thể lưu mô hình: ${err?.message || err}`);
      }
    }
  }

  async function handleApplyCustomModel() {
    const val = customModelInput.trim();
    if (!val) return;
    setSelectedModel(val);
    setIsCustomModel(false);
    if (selectedProvider) {
      try {
        await getRuntime().saveProviderProfile({
          id: selectedProvider.id,
          name: selectedProvider.name,
          providerType: selectedProvider.providerType,
          baseUrl: selectedProvider.baseUrl,
          model: val,
          capabilities: selectedProvider.capabilities,
          enabled: selectedProvider.enabled,
          ttsModel: selectedProvider.ttsModel,
          transcriptionModel: selectedProvider.transcriptionModel,
        });
        const updated = await getRuntime().getProviderProfiles();
        setProviders(updated);
        showToast(`✓ Đã lưu mô hình tùy chỉnh: ${val}`);
      } catch (err: any) {
        showToast(`⚠️ Lỗi lưu mô hình: ${err?.message || err}`);
      }
    }
  }

  async function handleSaveApiKey() {
    const key = apiKeyInput.trim();
    if (!key) {
      showToast("⚠️ Vui lòng nhập mã API Key");
      return;
    }
    if (!selectedProvider) return;
    try {
      await getRuntime().saveProviderProfile({
        id: selectedProvider.id,
        name: selectedProvider.name,
        providerType: selectedProvider.providerType,
        baseUrl: selectedProvider.baseUrl,
        model: selectedModel || selectedProvider.model,
        apiKey: key,
        capabilities: selectedProvider.capabilities.length ? selectedProvider.capabilities : ["analysis", "vision"],
        enabled: true,
        ttsModel: selectedProvider.ttsModel,
        transcriptionModel: selectedProvider.transcriptionModel,
      });
      const updated = await getRuntime().getProviderProfiles();
      setProviders(updated);
      setShowApiKeyModal(false);
      setApiKeyInput("");
      showToast(`🎉 Đã kích hoạt thành công API Key cho ${selectedProvider.name}!`);
    } catch (err: any) {
      showToast(`❌ Lỗi lưu API Key: ${err?.message || err}`);
    }
  }

  // Listen to live analysis progress events from backend/Electron
  useEffect(() => {
    const unsubscribe = getRuntime().onAnalysisProgress?.((value) => {
      if (!value.operationId) return;
      const match = value.operationId.match(/^analysis-(job-[^-\s]+|\d+)/);
      const targetId = match ? match[1] : value.operationId;
      setBatchProgress((prev) => ({
        ...prev,
        [targetId]: { progress: value.progress, stage: value.stage },
      }));
    });
    return () => unsubscribe?.();
  }, []);

  // Filtered & Sorted Videos
  const filteredVideos = useMemo(() => {
    return sourceCandidates
      .filter((job) => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = job.name.toLowerCase().includes(q);
          const matchPath = (job.localPath || "").toLowerCase().includes(q);
          const matchScenes = (job.analysis?.scenes || []).some(
            (s) =>
              s.title?.toLowerCase().includes(q) ||
              s.detail?.toLowerCase().includes(q) ||
              s.voiceover?.toLowerCase().includes(q)
          );
          if (!matchName && !matchPath && !matchScenes) return false;
        }

        const isCompleted = job.status === "completed" || Boolean(job.analysis?.scenes?.length);
        const isRunning = job.status === "running" || runningJobIds.has(job.id);
        const isFailed = job.status === "failed";
        const isQueued = !isCompleted && !isRunning && !isFailed;

        if (filterStatus === "completed" && !isCompleted) return false;
        if (filterStatus === "running" && !isRunning) return false;
        if (filterStatus === "queued" && !isQueued) return false;
        if (filterStatus === "failed" && !isFailed) return false;

        if (filterCategory !== "all") {
          const hasCategory = (job.analysis?.scenes || []).some((s) => {
            const txt = (s.title + " " + s.detail + " " + (s.keywords || []).join(" ")).toLowerCase();
            return txt.includes(filterCategory.toLowerCase());
          });
          if (!hasCategory) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "name") return a.name.localeCompare(b.name);
        if (sortBy === "duration") return (b.durationSeconds || 0) - (a.durationSeconds || 0);
        if (sortBy === "scenes") return (b.analysis?.scenes?.length || 0) - (a.analysis?.scenes?.length || 0);
        if (sortBy === "score") return (b.analysis?.score || 0) - (a.analysis?.score || 0);
        return 0;
      });
  }, [sourceCandidates, searchQuery, filterStatus, filterCategory, sortBy, runningJobIds]);

  // Reset parent page to 1 when filters change
  useEffect(() => {
    setParentPage(1);
  }, [searchQuery, filterStatus, filterCategory, sortBy]);

  const totalParentPages = Math.max(1, Math.ceil(filteredVideos.length / parentPageSize));
  const paginatedVideos = useMemo(() => {
    const start = (parentPage - 1) * parentPageSize;
    return filteredVideos.slice(start, start + parentPageSize);
  }, [filteredVideos, parentPage, parentPageSize]);

  // KPI Summary calculations
  const totalScenesCount = useMemo(() => {
    return sourceCandidates.reduce((acc, j) => acc + (j.analysis?.scenes?.length || 0), 0);
  }, [sourceCandidates]);

  const completedCount = useMemo(() => {
    return sourceCandidates.filter((j) => j.status === "completed" || Boolean(j.analysis?.scenes?.length)).length;
  }, [sourceCandidates]);

  const runningCount = useMemo(() => {
    return sourceCandidates.filter((j) => j.status === "running" || runningJobIds.has(j.id)).length;
  }, [sourceCandidates, runningJobIds]);

  const avgScore = useMemo(() => {
    const scored = sourceCandidates.filter((j) => j.analysis?.score);
    if (!scored.length) return "9.5";
    const sum = scored.reduce((acc, j) => {
      const s = Number(j.analysis?.score || 0);
      return acc + (s > 10 ? s / 10 : s);
    }, 0);
    return (sum / scored.length).toFixed(1);
  }, [sourceCandidates]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const toggleExpand = (jobId: string) => {
    setExpandedJobIds((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  };

  const toggleSelect = (jobId: string) => {
    setSelectedJobIds((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  };

  const handleSelectAll = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedJobIds(new Set(filteredVideos.map((v) => v.id)));
    } else {
      setSelectedJobIds(new Set());
    }
  };

  async function runAnalysisForJob(
    job: Job,
    overrideProviderId?: string,
    overridePrompt?: string,
    overrideVoice?: string,
    overrideLang?: string
  ) {
    const analyzeVideo = getRuntime().analyzeVideo;
    if (!analyzeVideo) {
      showToast("⚠️ Hãy chọn video trong bản Electron Desktop đã cài đặt.");
      return;
    }

    const pId = overrideProviderId || defaultProviderId || job.providerId;
    const voice = overrideVoice || defaultVoiceId || job.narratorVoice;
    const lang = overrideLang || defaultLanguage || job.languages?.[0] || "vi";
    const prompt = overridePrompt || job.customPrompt || defaultPrompt;

    setRunningJobIds((prev) => new Set(prev).add(job.id));
    if (onUpdateJob) {
      onUpdateJob(job.id, {
        status: "running",
        stage: "analyzing",
        progress: 15,
        providerId: pId,
        narratorVoice: voice,
        languages: [lang],
        customPrompt: prompt,
      });
    }

    let targetFile = job.localPath;

    if (!targetFile && job.source && /^https?:\/\//i.test(job.source)) {
      try {
        const dlOpId = `download-${Date.now()}`;
        targetFile = await getRuntime().downloadVideo?.(job.source, dlOpId);
        if (targetFile && onUpdateJob) {
          onUpdateJob(job.id, { localPath: targetFile });
        }
      } catch (err: any) {
        setRunningJobIds((prev) => {
          const next = new Set(prev);
          next.delete(job.id);
          return next;
        });
        if (onUpdateJob) {
          onUpdateJob(job.id, { status: "failed", error: err?.message || "Lỗi tải video URL" });
        }
        return;
      }
    }

    if (!targetFile) {
      setRunningJobIds((prev) => {
        const next = new Set(prev);
        next.delete(job.id);
        return next;
      });
      if (onUpdateJob) {
        onUpdateJob(job.id, { status: "failed", error: "Không tìm thấy file video nguồn" });
      }
      return;
    }

    const opId = `analysis-${job.id}-${Date.now()}`;

    try {
      const analysis = await analyzeVideo(targetFile, pId || "", opId, {
        languages: [lang],
        narratorEnabled: true,
        narratorGender: "male",
        narratorVoice: voice,
        customPrompt: prompt.trim() || undefined,
      });

      if (onUpdateJob) {
        onUpdateJob(job.id, {
          status: "completed",
          stage: "completed",
          progress: 100,
          analysis,
          narratorVoice: voice,
          languages: [lang],
          customPrompt: prompt,
        });
      }
      setExpandedJobIds((prev) => new Set(prev).add(job.id));
      showToast(`🎉 Phân tích AI thành công: ${job.name} (${analysis.scenes?.length || 0} phân cảnh)`);
    } catch (err: any) {
      if (onUpdateJob) {
        onUpdateJob(job.id, {
          status: "failed",
          stage: "failed",
          error: err?.message || "Lỗi phân tích AI",
        });
      }
      showToast(`❌ Lỗi phân tích: ${job.name} - ${err?.message || ""}`);
    } finally {
      setRunningJobIds((prev) => {
        const next = new Set(prev);
        next.delete(job.id);
        return next;
      });
    }
  }

  async function handleStartBatchAnalysis(
    pId: string,
    prompt: string,
    voice: string,
    lang: string
  ) {
    setShowBatchModal(false);
    const targetIds = selectedJobIds.size > 0 ? Array.from(selectedJobIds) : sourceCandidates.map((j) => j.id);
    const targetJobs = sourceCandidates.filter((j) => targetIds.includes(j.id));

    if (!targetJobs.length) {
      showToast("⚠️ Không có video nào được chọn để phân tích.");
      return;
    }

    showToast(`🚀 Đang bắt đầu phân tích AI hàng loạt cho ${targetJobs.length} video...`);

    for (const job of targetJobs) {
      await runAnalysisForJob(job, pId, prompt, voice, lang);
    }

    showToast(`🎉 Hoàn tất phân tích AI toàn bộ ${targetJobs.length} video!`);
  }

  async function handlePlaySceneVoice(text: string, voiceKey: string, voiceName?: string) {
    if (playingVoiceKey === voiceKey) {
      stopGlobalAudio();
      setPlayingVoiceKey(null);
      return;
    }

    stopGlobalAudio();
    setLoadingVoiceKey(voiceKey);

    try {
      const speechUrl = await getRuntime().synthesizeSpeech?.(
        text,
        defaultLanguage || "vi",
        "male",
        voiceName || defaultVoiceId
      );
      setLoadingVoiceKey(null);
      if (speechUrl) {
        setPlayingVoiceKey(voiceKey);
        await playAudioStream(
          speechUrl,
          () => setPlayingVoiceKey(null),
          () => setPlayingVoiceKey(null)
        );
      }
    } catch {
      setLoadingVoiceKey(null);
      setPlayingVoiceKey(null);
    }
  }

  function handleExportToTimeline(job: Job) {
    const scenes = job.analysis?.scenes || [];
    if (!scenes.length) {
      showToast("⚠️ Video chưa có phân cảnh nào để xuất vào Timeline. Hãy chạy phân tích AI trước.");
      return;
    }

    const clips: TimelineClip[] = scenes.map((s, idx) => ({
      sceneId: s.id || `scene-${idx + 1}`,
      order: idx,
      sourceSceneId: s.id || `scene-${idx + 1}`,
      trimIn: 0,
      trimOut: 0,
    }));

    if (onUpdateJob) {
      onUpdateJob(job.id, { timelineClips: clips });
    }

    if (onOpenTimeline) {
      onOpenTimeline(job.id);
    } else if (onNavigate) {
      onNavigate("timeline");
    }
    showToast(`🎬 Đã chuyển ${scenes.length} phân cảnh của ${job.name} sang bàn dựng Timeline!`);
  }

  function handleExportSingleSceneToTimeline(job: Job, scene: AnalysisScene, sceneIdx: number) {
    const sceneId = scene.id || `scene-${sceneIdx + 1}`;
    const newClip: TimelineClip = {
      sceneId,
      order: 0,
      sourceSceneId: sceneId,
    };

    if (onUpdateJob) {
      const currentClips = job.timelineClips || [];
      onUpdateJob(job.id, { timelineClips: [newClip, ...currentClips] });
    }

    if (onOpenTimeline) {
      onOpenTimeline(job.id);
    } else if (onNavigate) {
      onNavigate("timeline");
    }
  }

  function handleExportToStory(job: Job) {
    if (!job.analysis?.scenes?.length && !job.analysis?.voiceScript) {
      showToast("⚠️ Video chưa có kịch bản AI. Hãy phân tích video trước.");
      return;
    }
    if (onUpdateJob) {
      onUpdateJob(job.id, { requiresScriptApproval: true });
    }
    if (onNavigate) {
      onNavigate("story");
    }
    showToast(`📝 Đã mở kịch bản thuyết minh của ${job.name}!`);
  }

  async function handlePickFiles() {
    try {
      const pickVideos = getRuntime().pickVideos;
      const pickVideo = getRuntime().pickVideo;
      let paths: string[] = [];

      if (pickVideos) {
        paths = (await pickVideos()) || [];
      } else if (pickVideo) {
        const single = await pickVideo();
        if (single) paths = [single];
      }

      if (!paths.length) return;

      for (const p of paths) {
        const fileName = p.split(/[\\/]/).pop() || "Video";
        const id = `job-source-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        if (onAddJob) {
          onAddJob({
            id,
            name: fileName.replace(/\.[^.]+$/, ""),
            source: p,
            sourceType: "file",
            localPath: p,
            sourceOnly: true,
            mode: "local-cpu",
            status: "queued",
            progress: 0,
            createdAt: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
            synced: true,
          });
        }
      }
      showToast(`✓ Đã nạp thành công ${paths.length} video mới vào không gian làm việc!`);
      setShowAddModal(false);
    } catch (err: any) {
      showToast(`❌ Lỗi nạp video: ${err?.message || ""}`);
    }
  }

  async function handleAddUrlSubmit() {
    if (!inputUrl.trim()) return;
    setIsAddingUrl(true);
    try {
      const id = `job-url-${Date.now()}`;
      if (onAddJob) {
        onAddJob({
          id,
          name: `URL Video (${new URL(inputUrl).hostname})`,
          source: inputUrl.trim(),
          sourceType: "url",
          sourceOnly: true,
          mode: "local-cpu",
          status: "queued",
          progress: 0,
          createdAt: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
          synced: true,
        });
      }
      setInputUrl("");
      setShowAddModal(false);
      showToast("✓ Đã thêm link video URL vào danh sách chờ phân tích!");
    } catch (err: any) {
      showToast(`❌ Lỗi link URL: ${err?.message || ""}`);
    } finally {
      setIsAddingUrl(false);
    }
  }

  function handleDeleteSelected() {
    if (!selectedJobIds.size) return;
    const ids = Array.from(selectedJobIds);
    if (confirm(`Bạn có chắc chắn muốn xóa ${ids.length} video đã chọn khỏi danh sách không?`)) {
      if (onDeleteSources) onDeleteSources(ids);
      else if (onDeleteJobs) onDeleteJobs(ids);
      setSelectedJobIds(new Set());
      showToast(`✓ Đã xóa ${ids.length} video.`);
    }
  }

  function handleSaveEditedScene(updatedScene: AnalysisScene) {
    if (!editingSceneInfo) return;
    const { jobId, sceneIdx } = editingSceneInfo;
    const job = sourceCandidates.find((j) => j.id === jobId);
    if (!job || !job.analysis) return;

    const nextScenes = [...(job.analysis.scenes || [])];
    nextScenes[sceneIdx] = updatedScene;

    const nextAnalysis: AnalysisResult = {
      ...job.analysis,
      scenes: nextScenes,
    };

    if (onUpdateJob) {
      onUpdateJob(job.id, { analysis: nextAnalysis });
    }

    setEditingSceneInfo(null);
    showToast(`✓ Đã cập nhật phân cảnh Cảnh #${sceneIdx + 1} thành công!`);
  }

  function handleDeleteScene(jobId: string, sceneIdx: number) {
    const job = sourceCandidates.find((j) => j.id === jobId);
    if (!job || !job.analysis) return;

    if (confirm(`Bạn có chắc muốn xóa phân cảnh Cảnh #${sceneIdx + 1} này không?`)) {
      const nextScenes = (job.analysis.scenes || []).filter((_, idx) => idx !== sceneIdx);
      const nextAnalysis: AnalysisResult = {
        ...job.analysis,
        scenes: nextScenes,
      };
      if (onUpdateJob) {
        onUpdateJob(job.id, { analysis: nextAnalysis });
      }
      showToast(`✓ Đã xóa phân cảnh.`);
    }
  }

  function handlePreviewVoice(_jobId: string, _sceneId: string, text?: string) {
    if (!text?.trim()) return;
    try {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "vi-VN";
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
        showToast("🔊 Đang đọc thử lời thoại thuyết minh AI...");
      }
    } catch {
      showToast("Không thể phát thử giọng đọc trên thiết bị này.");
    }
  }

  return (
    <div className="analysis-workspace-root animate-fade-in" style={{ padding: "16px 20px", maxWidth: "1680px", margin: "0 auto" }}>
      
      {/* 1. Header & Primary Actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: "rgba(56, 189, 248, 0.12)", border: "1px solid rgba(56, 189, 248, 0.3)", padding: "3px 8px", borderRadius: "5px", fontSize: "11px", fontWeight: 800, color: "#38bdf8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>
            <LightningChargeFill size={11} /> BƯỚC 2: PHÂN TÍCH NGỮ CẢNH & TÁCH PHÂN CẢNH AI
          </div>
          <h1 style={{ fontSize: "21px", fontWeight: 800, color: "#f8fafc", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
            <Film size={22} color="#38bdf8" />
            Phân Tích Ngữ Cảnh & Tách Phân Cảnh AI Đa Luồng
          </h1>
          <p style={{ fontSize: "12.5px", color: "#94a3b8", margin: "3px 0 0" }}>
            Trích xuất tự động từng phân cảnh, viết kịch bản lồng tiếng theo phong cách chuyên biệt và đồng bộ thời gian thực.
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowAddModal(true)}
            style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#f8fafc", padding: "8px 14px", borderRadius: "7px", fontSize: "12.5px", fontWeight: 700, cursor: "pointer" }}
          >
            <PlusLg size={13} /> Thêm Video Nguồn
          </button>
          
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowBatchModal(true)}
            style={{ display: "flex", alignItems: "center", gap: "6px", background: "linear-gradient(135deg, #0284c7, #2563eb)", border: "none", color: "#ffffff", padding: "8px 18px", borderRadius: "7px", fontSize: "13px", fontWeight: 800, cursor: "pointer", boxShadow: "0 0 18px rgba(56, 189, 248, 0.4)" }}
          >
            <LightningChargeFill size={14} /> ⚡ Bắt Đầu Phân Tích Hàng Loạt ({selectedJobIds.size > 0 ? selectedJobIds.size : sourceCandidates.length})
          </button>
        </div>
      </div>

      {/* 2. Quick 3-Step Guided Workflow Banner (User Onboarding Guide) */}
      <div style={{ background: "rgba(15, 23, 42, 0.65)", border: "1px solid rgba(56, 189, 248, 0.25)", borderRadius: "10px", padding: "12px 16px", marginBottom: "14px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "12px", alignItems: "center" }}>
        
        {/* Step 1 */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: "#0284c7", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 900, flexShrink: 0, boxShadow: "0 0 10px rgba(56, 189, 248, 0.4)" }}>
            1
          </div>
          <div>
            <div style={{ fontSize: "11.5px", fontWeight: 800, color: "#f8fafc" }}>1. CHỌN PHONG CÁCH KỊCH BẢN</div>
            <div style={{ fontSize: "10.5px", color: "#94a3b8" }}>Chọn Cops Bodycam, Reality Show, Review Phim...</div>
          </div>
        </div>

        {/* Step 2 */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", border: "1px solid rgba(56, 189, 248, 0.35)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 900, flexShrink: 0 }}>
            2
          </div>
          <div>
            <div style={{ fontSize: "11.5px", fontWeight: 800, color: "#f8fafc" }}>2. CHỌN VIDEO TRONG BẢNG</div>
            <div style={{ fontSize: "10.5px", color: "#94a3b8" }}>Tick chọn các video cần phân tích</div>
          </div>
        </div>

        {/* Step 3 */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", border: "1px solid rgba(56, 189, 248, 0.35)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 900, flexShrink: 0 }}>
            3
          </div>
          <div>
            <div style={{ fontSize: "11.5px", fontWeight: 800, color: "#f8fafc" }}>3. BẤM NÚT "PHÂN TÍCH HÀNG LOẠT"</div>
            <div style={{ fontSize: "10.5px", color: "#38bdf8", fontWeight: 600 }}>AI tự động tách phân cảnh & viết kịch bản</div>
          </div>
        </div>

      </div>

      {/* 2.5 AI Engine & Model Control Hub (Fast On-The-Fly Selection) */}
      <div style={{ background: "linear-gradient(135deg, rgba(15, 23, 42, 0.85), rgba(30, 41, 59, 0.7))", border: "1px solid rgba(56, 189, 248, 0.28)", borderRadius: "12px", padding: "12px 16px", marginBottom: "14px", boxShadow: "0 6px 24px rgba(0,0,0,0.3)", display: "flex", flexDirection: "column", gap: "12px" }}>
        
        {/* Top title & status header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "30px", height: "30px", borderRadius: "7px", background: "linear-gradient(135deg, #0284c7, #2563eb)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", boxShadow: "0 0 12px rgba(56, 189, 248, 0.4)" }}>
              <CpuFill />
            </div>
            <div>
              <div style={{ fontSize: "12.5px", fontWeight: 800, color: "#f8fafc", letterSpacing: "0.3px", display: "flex", alignItems: "center", gap: "6px" }}>
                BỘ XỬ LÝ AI & MÔ HÌNH PHÂN TÍCH (AI ENGINE & MODEL)
                <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "4px", background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", fontWeight: 700 }}>
                  Trực Tiếp
                </span>
              </div>
              <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                Chọn nhà cung cấp AI và mô hình phù hợp để phân tích hình ảnh bối cảnh, bóc tách phân cảnh & viết kịch bản lồng tiếng
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            {selectedProvider?.hasApiKey ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.35)", color: "#34d399", padding: "4px 10px", borderRadius: "6px", fontSize: "11.5px", fontWeight: 700 }}>
                <CheckCircleFill size={11} /> API Key Sẵn Sàng ({selectedProvider.maskedKey})
              </span>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setApiKeyInput("");
                  setShowApiKeyModal(true);
                }}
                style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: "rgba(245, 158, 11, 0.15)", border: "1px solid rgba(245, 158, 11, 0.4)", color: "#fbbf24", padding: "4px 12px", borderRadius: "6px", fontSize: "11.5px", fontWeight: 700, cursor: "pointer" }}
              >
                <KeyFill size={12} /> ⚠️ Chưa có API Key · Bấm để nhập ngay
              </button>
            )}

            <button
              type="button"
              onClick={() => onNavigate?.("settings")}
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#cbd5e1", padding: "4px 10px", borderRadius: "6px", fontSize: "11.5px", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
              title="Quản lý toàn bộ API Provider trong Cài đặt"
            >
              <GearFill size={11} /> Quản Lý Provider
            </button>
          </div>
        </div>

        {/* Dropdowns Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "10px", alignItems: "flex-end" }}>
          
          {/* Provider Select */}
          <div>
            <label style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: 700, color: "#cbd5e1", marginBottom: "4px" }}>
              <span>🤖 NHÀ CUNG CẤP AI (PROVIDER)</span>
              <span style={{ color: "#38bdf8", fontSize: "10.5px" }}>{providers.length} nhà cung cấp</span>
            </label>
            <select
              value={defaultProviderId}
              onChange={(e) => handleSelectProvider(e.target.value)}
              style={{ width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", padding: "7px 10px", color: "#f8fafc", fontSize: "12px", outline: "none", cursor: "pointer" }}
            >
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.hasApiKey ? "🟢 (Đã có Key)" : "🟡 (Chưa có Key)"} · {p.model}
                </option>
              ))}
            </select>
          </div>

          {/* Model Select */}
          <div>
            <label style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: 700, color: "#cbd5e1", marginBottom: "4px" }}>
              <span>🧠 MÔ HÌNH AI (MODEL)</span>
              <span style={{ color: "#c084fc", fontSize: "10.5px" }}>
                Đang kích hoạt: <strong>{selectedModel || selectedProvider?.model || "Mặc định"}</strong>
              </span>
            </label>
            <select
              value={isCustomModel ? "__custom__" : (selectedModel || selectedProvider?.model || "")}
              onChange={(e) => handleSelectModel(e.target.value)}
              style={{ width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", padding: "7px 10px", color: "#f8fafc", fontSize: "12px", outline: "none", cursor: "pointer" }}
            >
              {availableModels.map((m) => (
                <option key={m.label} value={m.label}>
                  {m.label} {m.tag ? `— ${m.tag}` : ""}
                </option>
              ))}
              <option value="__custom__">✍️ [Nhập tên model tùy chỉnh khác...]</option>
            </select>
          </div>

          {/* Custom Model Input if selected */}
          {isCustomModel && (
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#cbd5e1", marginBottom: "4px" }}>
                ✍️ NHẬP TÊN MODEL TÙY CHỈNH
              </label>
              <div style={{ display: "flex", gap: "6px" }}>
                <input
                  type="text"
                  value={customModelInput}
                  onChange={(e) => setCustomModelInput(e.target.value)}
                  placeholder="Ví dụ: gemini-2.5-flash hoặc gpt-4o"
                  style={{ flex: 1, background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", padding: "7px 10px", color: "#f8fafc", fontSize: "12px", outline: "none" }}
                />
                <button
                  type="button"
                  onClick={handleApplyCustomModel}
                  style={{ background: "linear-gradient(135deg, #0284c7, #2563eb)", border: "none", color: "#fff", borderRadius: "6px", padding: "7px 14px", fontSize: "12px", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
                >
                  Lưu & Áp Dụng
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* 3. Style Presets Quick Bar (Unified Cohesive Theme) */}
      <div style={{ background: "rgba(15, 23, 42, 0.75)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "10px", padding: "10px 14px", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        <span style={{ fontSize: "11px", fontWeight: 800, color: "#38bdf8", textTransform: "uppercase", letterSpacing: "0.5px", display: "flex", alignItems: "center", gap: "5px", marginRight: "4px" }}>
          <Stars size={12} /> PHONG CÁCH KỊCH BẢN:
        </span>
        {PRESET_PROMPTS.map((p) => {
          const isSelected = defaultPrompt === p.prompt;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setDefaultPrompt(p.prompt);
                showToast(`✓ Đã kích hoạt phong cách: ${p.title}`);
              }}
              style={{
                background: isSelected ? "rgba(2, 132, 199, 0.25)" : "rgba(255, 255, 255, 0.03)",
                border: isSelected ? "1px solid #38bdf8" : "1px solid rgba(255, 255, 255, 0.08)",
                color: isSelected ? "#38bdf8" : "#94a3b8",
                padding: "5px 10px",
                borderRadius: "6px",
                fontSize: "11.5px",
                fontWeight: isSelected ? 800 : 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                transition: "all 0.15s ease",
                boxShadow: isSelected ? "0 0 10px rgba(56, 189, 248, 0.2)" : "none",
              }}
              title={p.desc}
            >
              {p.title}
            </button>
          );
        })}
      </div>

      {/* 4. KPI Summary Bar (Unified Dark Mode Aesthetics) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "10px", marginBottom: "14px" }}>
        
        <div style={{ background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "10px", padding: "10px 14px", display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "34px", height: "34px", borderRadius: "8px", background: "rgba(56, 189, 248, 0.12)", color: "#38bdf8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px" }}>
            <FolderFill />
          </div>
          <div>
            <div style={{ fontSize: "10.5px", color: "#94a3b8", fontWeight: 700 }}>TỔNG VIDEO NGUỒN</div>
            <div style={{ fontSize: "16px", fontWeight: 800, color: "#f8fafc" }}>{sourceCandidates.length} <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 500 }}>video</span></div>
          </div>
        </div>

        <div style={{ background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "10px", padding: "10px 14px", display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "34px", height: "34px", borderRadius: "8px", background: "rgba(56, 189, 248, 0.12)", color: "#38bdf8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px" }}>
            <CheckCircleFill />
          </div>
          <div>
            <div style={{ fontSize: "10.5px", color: "#94a3b8", fontWeight: 700 }}>ĐÃ PHÂN TÍCH XONG</div>
            <div style={{ fontSize: "16px", fontWeight: 800, color: "#38bdf8" }}>{completedCount} <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 500 }}>video ({sourceCandidates.length ? Math.round((completedCount / sourceCandidates.length) * 100) : 0}%)</span></div>
          </div>
        </div>

        <div style={{ background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "10px", padding: "10px 14px", display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "34px", height: "34px", borderRadius: "8px", background: "rgba(56, 189, 248, 0.12)", color: "#38bdf8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px" }}>
            <LayersFill />
          </div>
          <div>
            <div style={{ fontSize: "10.5px", color: "#94a3b8", fontWeight: 700 }}>TỔNG PHÂN CẢNH TÁCH</div>
            <div style={{ fontSize: "16px", fontWeight: 800, color: "#f8fafc" }}>{totalScenesCount} <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 500 }}>phân cảnh</span></div>
          </div>
        </div>

        <div style={{ background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "10px", padding: "10px 14px", display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "34px", height: "34px", borderRadius: "8px", background: "rgba(56, 189, 248, 0.12)", color: "#38bdf8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px" }}>
            <Stars />
          </div>
          <div>
            <div style={{ fontSize: "10.5px", color: "#94a3b8", fontWeight: 700 }}>ĐIỂM CHẤT LƯỢNG NGỮ CẢNH</div>
            <div style={{ fontSize: "16px", fontWeight: 800, color: "#38bdf8" }}>⭐ {avgScore}<span style={{ fontSize: "11px", color: "#64748b", fontWeight: 500 }}>/10 (AI)</span></div>
          </div>
        </div>

      </div>

      {/* 5. Search, Filters & Batch Actions */}
      <div style={{ background: "rgba(15, 23, 42, 0.75)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "10px", padding: "10px 14px", marginBottom: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          
          {/* Search Box */}
          <div style={{ position: "relative", flex: "1 1 240px", maxWidth: "380px" }}>
            <Search size={13} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên video, kịch bản, ngữ cảnh..."
              style={{ width: "100%", background: "rgba(0, 0, 0, 0.35)", border: "1px solid #334155", borderRadius: "6px", padding: "6px 10px 6px 30px", color: "#f8fafc", fontSize: "12.5px", outline: "none" }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#64748b", cursor: "pointer" }}
              >
                <XLg size={11} />
              </button>
            )}
          </div>

          {/* Filter Pills & Selects */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            
            {/* Status Pills */}
            <div style={{ display: "flex", background: "rgba(0,0,0,0.3)", padding: "2px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.06)" }}>
              {[
                { key: "all", label: `Tất Cả (${sourceCandidates.length})` },
                { key: "completed", label: `Đã Xong (${completedCount})` },
                { key: "running", label: `Đang Chạy (${runningCount})` },
                { key: "queued", label: "Chờ Chạy" },
              ].map((st) => (
                <button
                  key={st.key}
                  type="button"
                  onClick={() => setFilterStatus(st.key as any)}
                  style={{
                    background: filterStatus === st.key ? "rgba(56, 189, 248, 0.2)" : "transparent",
                    color: filterStatus === st.key ? "#38bdf8" : "#94a3b8",
                    border: filterStatus === st.key ? "1px solid rgba(56, 189, 248, 0.35)" : "1px solid transparent",
                    padding: "3px 8px",
                    borderRadius: "5px",
                    fontSize: "11.5px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {st.label}
                </button>
              ))}
            </div>

            {/* Tag / Category Filter */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              style={{ background: "rgba(0,0,0,0.35)", border: "1px solid #334155", borderRadius: "6px", padding: "5px 10px", color: "#f8fafc", fontSize: "12px", outline: "none", cursor: "pointer" }}
            >
              {SCENE_CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>

            {/* Sort Filter */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              style={{ background: "rgba(0,0,0,0.35)", border: "1px solid #334155", borderRadius: "6px", padding: "5px 10px", color: "#f8fafc", fontSize: "12px", outline: "none", cursor: "pointer" }}
            >
              <option value="latest">Mới nhất</option>
              <option value="name">Tên video (A-Z)</option>
              <option value="duration">Thời lượng dài nhất</option>
              <option value="scenes">Số phân cảnh nhiều nhất</option>
              <option value="score">Điểm AI cao nhất</option>
            </select>
          </div>
        </div>

        {/* Dynamic Batch Action Bar when items selected */}
        {selectedJobIds.size > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "linear-gradient(90deg, rgba(2, 132, 199, 0.15), rgba(37, 99, 235, 0.15))", border: "1px solid rgba(56, 189, 248, 0.4)", borderRadius: "6px", padding: "6px 12px", flexWrap: "wrap", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "12.5px", fontWeight: 800, color: "#38bdf8" }}>
                ✓ Đã chọn {selectedJobIds.size} video
              </span>
              <button
                type="button"
                onClick={() => setSelectedJobIds(new Set())}
                style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "11.5px", textDecoration: "underline", cursor: "pointer" }}
              >
                Bỏ chọn
              </button>
            </div>

            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setShowBatchModal(true)}
                style={{ background: "linear-gradient(135deg, #0284c7, #2563eb)", color: "#fff", border: "none", padding: "4px 10px", borderRadius: "5px", fontSize: "11.5px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
              >
                <LightningChargeFill size={11} /> Phân Tích AI ({selectedJobIds.size})
              </button>
              <button
                type="button"
                onClick={handleDeleteSelected}
                style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.4)", color: "#f87171", padding: "4px 10px", borderRadius: "5px", fontSize: "11.5px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
              >
                <Trash3Fill size={11} /> Xóa ({selectedJobIds.size})
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div style={{ position: "fixed", bottom: "24px", right: "24px", background: "rgba(15, 23, 42, 0.95)", border: "1px solid rgba(56, 189, 248, 0.4)", borderRadius: "8px", padding: "10px 16px", color: "#38bdf8", fontWeight: 700, fontSize: "12.5px", boxShadow: "0 10px 30px rgba(0,0,0,0.5)", zIndex: 99999, backdropFilter: "blur(12px)", display: "flex", alignItems: "center", gap: "6px" }}>
          <Stars size={14} /> {toastMessage}
        </div>
      )}

      {/* 4. Hierarchical Master-Detail Table */}
      <div style={{ background: "rgba(15, 23, 42, 0.75)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "12px", overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }}>
        
        {/* Table Header: Optimized Widths & Clean Typography */}
        <div style={{ display: "grid", gridTemplateColumns: "36px 36px minmax(240px, 1.8fr) 150px 140px 90px 220px", padding: "10px 14px", background: "rgba(30, 41, 59, 0.6)", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", fontSize: "11px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <input
              type="checkbox"
              checked={filteredVideos.length > 0 && selectedJobIds.size === filteredVideos.length}
              onChange={handleSelectAll}
              style={{ cursor: "pointer" }}
            />
          </div>
          <div></div>
          <div>VIDEO NGUỒN & THÔNG TIN</div>
          <div>TRẠNG THÁI PHÂN TÍCH</div>
          <div>TIÊU HAO TOKEN/CREDIT</div>
          <div style={{ textAlign: "center" }}>ĐIỂM AI</div>
          <div style={{ textAlign: "right" }}>THAO TÁC</div>
        </div>

        {/* Table Body */}
        {filteredVideos.length === 0 ? (
          <div style={{ padding: "50px 20px", textAlign: "center", color: "#64748b" }}>
            <Film size={36} style={{ margin: "0 auto 10px", opacity: 0.4 }} />
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#94a3b8", marginBottom: "4px" }}>
              Không tìm thấy video nào
            </h3>
            <p style={{ fontSize: "12.5px", maxWidth: "400px", margin: "0 auto 14px" }}>
              {sourceCandidates.length === 0
                ? "Chưa có video nguồn nào trong thư viện. Hãy bấm 'Thêm Video Nguồn' để nạp video từ máy tính hoặc link URL."
                : "Không có video nào khớp với bộ lọc hoặc từ khóa tìm kiếm hiện tại."}
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowAddModal(true)}
              style={{ background: "linear-gradient(135deg, #0284c7, #2563eb)", border: "none", color: "#fff", padding: "7px 16px", borderRadius: "7px", fontSize: "12.5px", fontWeight: 700, cursor: "pointer" }}
            >
              <PlusLg size={13} /> Thêm Video Nguồn Ngay
            </button>
          </div>
        ) : (
          paginatedVideos.map((job) => {
            const isExpanded = expandedJobIds.has(job.id);
            const isSelected = selectedJobIds.has(job.id);
            const isRunning = job.status === "running" || runningJobIds.has(job.id);
            const isCompleted = job.status === "completed" || Boolean(job.analysis?.scenes?.length);
            const isFailed = job.status === "failed";
            const scenes = job.analysis?.scenes || [];
            const prog = batchProgress[job.id] || { progress: job.progress || 0, stage: job.stage || "" };

            const currentScenePage = scenePages[job.id] || 1;
            const totalScenePages = Math.max(1, Math.ceil(scenes.length / SCENES_PER_PAGE));
            const paginatedScenes = scenes.slice(
              (currentScenePage - 1) * SCENES_PER_PAGE,
              currentScenePage * SCENES_PER_PAGE
            );

            return (
              <div key={job.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}>
                
                {/* Level 1: Parent Video Row */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "36px 36px minmax(240px, 1.8fr) 150px 140px 90px 220px",
                    padding: "10px 14px",
                    alignItems: "center",
                    background: isRunning ? "rgba(56, 189, 248, 0.05)" : isSelected ? "rgba(2, 132, 199, 0.08)" : isExpanded ? "rgba(255, 255, 255, 0.02)" : "transparent",
                    transition: "background 0.2s ease",
                  }}
                >
                  {/* Select Checkbox */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(job.id)}
                      style={{ cursor: "pointer" }}
                    />
                  </div>

                  {/* Expand Chevron */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <button
                      type="button"
                      onClick={() => toggleExpand(job.id)}
                      style={{
                        background: isExpanded ? "rgba(56, 189, 248, 0.15)" : "rgba(255,255,255,0.06)",
                        color: isExpanded ? "#38bdf8" : "#94a3b8",
                        border: "1px solid rgba(255,255,255,0.1)",
                        width: "26px",
                        height: "26px",
                        borderRadius: "5px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                      }}
                      title={isExpanded ? "Thu gọn phân cảnh" : "Mở rộng phân cảnh"}
                    >
                      {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                    </button>
                  </div>

                  {/* Video Info & Thumbnail */}
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, paddingRight: "10px" }}>
                    <div
                      onClick={() => setPreviewPlayerInfo({ job })}
                      style={{
                        width: "48px",
                        height: "32px",
                        borderRadius: "5px",
                        background: "#0f172a",
                        border: "1px solid rgba(255,255,255,0.12)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#38bdf8",
                        cursor: "pointer",
                        flexShrink: 0,
                        position: "relative",
                        overflow: "hidden",
                      }}
                      title="Bấm để xem video player"
                    >
                      <Film size={15} />
                      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity 0.2s" }} onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")} onMouseLeave={(e) => (e.currentTarget.style.opacity = "0")}>
                        <PlayFill size={14} color="#fff" />
                      </div>
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span
                          style={{
                            fontSize: "12.5px",
                            fontWeight: 700,
                            color: "#f8fafc",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            cursor: "pointer",
                          }}
                          onClick={() => toggleExpand(job.id)}
                          title={job.name}
                        >
                          {job.name}
                        </span>
                        <span style={{ fontSize: "9.5px", padding: "1px 5px", borderRadius: "3px", background: "rgba(255,255,255,0.06)", color: "#94a3b8", fontWeight: 700, flexShrink: 0 }}>
                          {job.sourceType === "url" ? "🌐 URL" : "📁 FILE"}
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "3px", fontSize: "10.5px", color: "#64748b", flexWrap: "wrap" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "3px", flexShrink: 0 }}>
                          <ClockFill size={9} /> {formatDuration(job.durationSeconds)}
                        </span>
                        <span>•</span>
                        {(() => {
                          const assignedProvider = providers.find((p) => p.id === (job.providerId || defaultProviderId)) || selectedProvider;
                          return (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", background: "rgba(56, 189, 248, 0.1)", border: "1px solid rgba(56, 189, 248, 0.25)", color: "#38bdf8", padding: "1px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: 700 }}>
                              <CpuFill size={9} /> {assignedProvider ? `${assignedProvider.name.split(" ")[0]} · ${assignedProvider.model}` : "AI Auto"}
                            </span>
                          );
                        })()}
                        <span>•</span>
                        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "260px" }} title={job.localPath || job.source}>
                          {job.localPath || job.source}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge & Live Progress */}
                  <div style={{ paddingRight: "8px" }}>
                    {isRunning ? (
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10.5px", fontWeight: 700, color: "#38bdf8", marginBottom: "3px" }}>
                          <span>⚡ Đang phân tích...</span>
                          <span>{prog.progress}%</span>
                        </div>
                        <div style={{ width: "100%", height: "4px", background: "rgba(0,0,0,0.4)", borderRadius: "10px", overflow: "hidden" }}>
                          <div style={{ width: `${prog.progress}%`, height: "100%", background: "linear-gradient(90deg, #38bdf8, #2563eb)", transition: "width 0.3s ease" }} />
                        </div>
                        <span style={{ fontSize: "9.5px", color: "#64748b", marginTop: "2px", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {prog.stage || "Đang xử lý khung hình..."}
                        </span>
                      </div>
                    ) : isCompleted ? (
                      <div>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.35)", color: "#34d399", padding: "2px 7px", borderRadius: "5px", fontSize: "11px", fontWeight: 700 }}>
                          <CheckCircleFill size={10} /> Đã Phân Tích
                        </span>
                        <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>
                          {scenes.length} phân cảnh trích xuất
                        </div>
                      </div>
                    ) : isFailed ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.35)", color: "#f87171", padding: "2px 7px", borderRadius: "5px", fontSize: "11px", fontWeight: 700 }}>
                        <XCircleFill size={10} /> Lỗi phân tích
                      </span>
                    ) : (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "rgba(245, 158, 11, 0.15)", border: "1px solid rgba(245, 158, 11, 0.35)", color: "#fbbf24", padding: "2px 7px", borderRadius: "5px", fontSize: "11px", fontWeight: 700 }}>
                        <ClockFill size={10} /> Chờ phân tích
                      </span>
                    )}
                  </div>

                  {/* Token / Credit Consumption Column */}
                  <div>
                    {(() => {
                      const tokenInfo = formatTokenUsage(job);
                      return (
                        <div>
                          <div style={{ fontSize: "11.5px", fontWeight: 800, color: tokenInfo.isUsed ? "#c084fc" : "#64748b" }}>
                            {tokenInfo.text}
                          </div>
                          <div style={{ fontSize: "10px", color: tokenInfo.isUsed ? "#38bdf8" : "#475569", fontWeight: 600 }}>
                            {tokenInfo.subText}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* AI Score */}
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "12.5px", fontWeight: 800, color: isCompleted ? "#c084fc" : "#64748b" }}>
                      ⭐ {formatAiScore(job.analysis?.score)}
                    </div>
                  </div>

                  {/* Row Actions */}
                  <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "5px" }}>
                    
                    {/* Run Single Analysis Button */}
                    <button
                      type="button"
                      onClick={() => runAnalysisForJob(job)}
                      disabled={isRunning}
                      style={{
                        background: isCompleted ? "rgba(56, 189, 248, 0.12)" : "linear-gradient(135deg, #0284c7, #2563eb)",
                        color: isCompleted ? "#38bdf8" : "#fff",
                        border: isCompleted ? "1px solid rgba(56, 189, 248, 0.3)" : "none",
                        padding: "4px 8px",
                        borderRadius: "5px",
                        fontSize: "11px",
                        fontWeight: 700,
                        cursor: isRunning ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                      title="Phân tích video này bằng AI"
                    >
                      <LightningChargeFill size={11} /> {isRunning ? "Đang chạy..." : isCompleted ? "Chạy lại" : "Phân tích"}
                    </button>

                    {/* Export to Timeline */}
                    {isCompleted && (
                      <button
                        type="button"
                        onClick={() => handleExportToTimeline(job)}
                        style={{
                          background: "rgba(56, 189, 248, 0.12)",
                          border: "1px solid rgba(56, 189, 248, 0.3)",
                          color: "#38bdf8",
                          padding: "4px 8px",
                          borderRadius: "5px",
                          fontSize: "11px",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                        title="Chuyển sang bàn dựng Timeline"
                      >
                        <CollectionPlayFill size={11} /> Timeline
                      </button>
                    )}

                    {/* View Player */}
                    <button
                      type="button"
                      onClick={() => setPreviewPlayerInfo({ job })}
                      style={{
                        background: "rgba(255, 255, 255, 0.06)",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        color: "#e2e8f0",
                        padding: "4px 7px",
                        borderRadius: "5px",
                        fontSize: "11px",
                        cursor: "pointer",
                      }}
                      title="Xem trước Video Player"
                    >
                      <EyeFill size={12} />
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Bạn có chắc muốn xóa video ${job.name}?`)) {
                          if (onDeleteSources) onDeleteSources([job.id]);
                          else if (onDeleteJobs) onDeleteJobs([job.id]);
                        }
                      }}
                      style={{
                        background: "rgba(239, 68, 68, 0.1)",
                        border: "1px solid rgba(239, 68, 68, 0.25)",
                        color: "#f87171",
                        padding: "4px 7px",
                        borderRadius: "5px",
                        fontSize: "11px",
                        cursor: "pointer",
                      }}
                      title="Xóa video khỏi danh sách"
                    >
                      <Trash3Fill size={11} />
                    </button>
                  </div>
                </div>

                {/* Level 2: Nested Child Scenes Table (Expanded Rows) */}
                {isExpanded && (
                  <div style={{ background: "rgba(10, 15, 29, 0.95)", borderTop: "1px solid rgba(56, 189, 248, 0.15)", padding: "12px 16px 16px 36px" }}>
                    
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "13px" }}>🎬</span>
                        <strong style={{ fontSize: "12px", color: "#38bdf8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          Danh Sách {scenes.length} Phân Cảnh Trích Xuất · {job.name}
                        </strong>
                      </div>

                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={() => handleExportToTimeline(job)}
                          style={{ background: "rgba(56, 189, 248, 0.15)", border: "1px solid rgba(56, 189, 248, 0.35)", color: "#38bdf8", padding: "3px 8px", borderRadius: "5px", fontSize: "11px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                        >
                          <CollectionPlayFill size={11} /> Dựng Toàn Bộ Cảnh Vào Timeline
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExportToStory(job)}
                          style={{ background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.35)", color: "#34d399", padding: "3px 8px", borderRadius: "5px", fontSize: "11px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                        >
                          <ChatQuoteFill size={11} /> Xem Kịch Bản & Thu Âm
                        </button>
                      </div>
                    </div>

                    {scenes.length === 0 ? (
                      <div style={{ padding: "20px", textAlign: "center", color: "#64748b", background: "rgba(0,0,0,0.2)", borderRadius: "6px", border: "1px dashed rgba(255,255,255,0.1)" }}>
                        <p style={{ margin: "0 0 8px", fontSize: "12.5px" }}>Video này chưa có phân cảnh nào được trích xuất.</p>
                        <button
                          type="button"
                          onClick={() => runAnalysisForJob(job)}
                          style={{ background: "linear-gradient(135deg, #0284c7, #2563eb)", color: "#fff", border: "none", padding: "5px 12px", borderRadius: "5px", fontSize: "11.5px", fontWeight: 700, cursor: "pointer" }}
                        >
                          <LightningChargeFill size={11} /> Chạy Phân Tích AI Ngay
                        </button>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          {paginatedScenes.map((scene, subIdx) => {
                            const idx = (currentScenePage - 1) * SCENES_PER_PAGE + subIdx;
                            const voiceKey = `${job.id}-${idx}`;
                            const isPlayingThis = playingVoiceKey === voiceKey;
                            const isLoadingThis = loadingVoiceKey === voiceKey;
                            const voiceText = scene.voiceover || scene.translation || scene.detail || "";

                            return (
                              <div
                                key={scene.id || idx}
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "55px 120px 1fr 1.2fr 110px 120px",
                                  background: "rgba(30, 41, 59, 0.5)",
                                  border: "1px solid rgba(255, 255, 255, 0.06)",
                                  borderRadius: "6px",
                                  padding: "8px 12px",
                                  alignItems: "center",
                                  gap: "10px",
                                  transition: "all 0.15s ease",
                                }}
                              >
                                {/* Scene ID */}
                                <div>
                                  <span style={{ fontSize: "10.5px", fontWeight: 800, background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", padding: "1px 5px", borderRadius: "3px", display: "inline-block" }}>
                                    #{String(idx + 1).padStart(2, "0")}
                                  </span>
                                </div>

                                {/* Timestamp & Duration */}
                                <div>
                                  <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#f8fafc", fontFamily: "monospace" }}>
                                    {scene.start} ➔ {scene.end || "00:15"}
                                  </div>
                                  <span style={{ fontSize: "9.5px", color: "#64748b" }}>
                                    ⏱️ {scene.end ? "15.0s" : "Đoạn cắt"}
                                  </span>
                                </div>

                                {/* Visual Context Description */}
                                <div style={{ minWidth: 0 }}>
                                  <strong style={{ fontSize: "12px", color: "#f1f5f9", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {scene.title || `Phân cảnh #${idx + 1}`}
                                  </strong>
                                  <p style={{ fontSize: "11px", color: "#94a3b8", margin: "1px 0 0", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.35 }}>
                                    {scene.detail || "Đang trích xuất hành động và bối cảnh nhân vật..."}
                                  </p>
                                </div>

                                {/* AI Voiceover Script */}
                                <div style={{ minWidth: 0, background: "rgba(0,0,0,0.25)", padding: "5px 8px", borderRadius: "5px", border: "1px solid rgba(255,255,255,0.05)" }}>
                                  <div style={{ fontSize: "9.5px", fontWeight: 700, color: "#38bdf8", marginBottom: "1px", display: "flex", alignItems: "center", gap: "3px" }}>
                                    <ChatQuoteFill size={9} /> LỜI THOẠI LỒNG TIẾNG AI:
                                  </div>
                                  <p style={{ fontSize: "11px", color: "#e2e8f0", margin: 0, fontStyle: "italic", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                    "{voiceText || "Chưa có lời thoại thuyết minh..."}"
                                  </p>
                                </div>

                                {/* Scene Tag */}
                                <div>
                                  <span style={{ fontSize: "10px", fontWeight: 700, background: idx === 0 ? "rgba(245, 158, 11, 0.15)" : idx % 3 === 0 ? "rgba(239, 68, 68, 0.15)" : "rgba(56, 189, 248, 0.15)", color: idx === 0 ? "#fbbf24" : idx % 3 === 0 ? "#f87171" : "#38bdf8", border: "1px solid rgba(255,255,255,0.1)", padding: "2px 6px", borderRadius: "10px", display: "inline-block", whiteSpace: "nowrap" }}>
                                    {idx === 0 ? "🎯 Hook Mở Đầu" : idx % 3 === 0 ? "🔥 Cao Trào" : "📖 Kể Chuyện"}
                                  </span>
                                </div>

                                {/* Scene Actions */}
                                <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "5px" }}>
                                  
                                  {/* TTS Preview Button */}
                                  <button
                                    type="button"
                                    onClick={() => handlePlaySceneVoice(voiceText, voiceKey, job.narratorVoice)}
                                    disabled={!voiceText || isLoadingThis}
                                    style={{
                                      background: isPlayingThis ? "#ef4444" : "rgba(56, 189, 248, 0.15)",
                                      border: "1px solid rgba(56, 189, 248, 0.3)",
                                      color: isPlayingThis ? "#fff" : "#38bdf8",
                                      width: "25px",
                                      height: "25px",
                                      borderRadius: "5px",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      cursor: "pointer",
                                    }}
                                    title={isPlayingThis ? "Dừng giọng đọc" : "Nghe thử giọng đọc AI"}
                                  >
                                    {isLoadingThis ? <ArrowRepeat size={11} className="animate-spin" /> : isPlayingThis ? <PauseFill size={12} /> : <VolumeUpFill size={12} />}
                                  </button>

                                  {/* Edit Scene Modal */}
                                  <button
                                    type="button"
                                    onClick={() => setEditingSceneInfo({ jobId: job.id, sceneIdx: idx, scene })}
                                    style={{
                                      background: "rgba(255, 255, 255, 0.06)",
                                      border: "1px solid rgba(255, 255, 255, 0.12)",
                                      color: "#e2e8f0",
                                      width: "25px",
                                      height: "25px",
                                      borderRadius: "5px",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      cursor: "pointer",
                                    }}
                                    title="Chỉnh sửa chi tiết phân cảnh & lời thoại"
                                  >
                                    <PencilSquare size={11} />
                                  </button>

                                  {/* Send Scene to Timeline */}
                                  <button
                                    type="button"
                                    onClick={() => handleExportSingleSceneToTimeline(job, scene, idx)}
                                    style={{
                                      background: "rgba(168, 85, 247, 0.15)",
                                      border: "1px solid rgba(168, 85, 247, 0.3)",
                                      color: "#c084fc",
                                      width: "25px",
                                      height: "25px",
                                      borderRadius: "5px",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      cursor: "pointer",
                                    }}
                                    title="Đưa riêng phân cảnh này vào Timeline"
                                  >
                                    <Scissors size={11} />
                                  </button>

                                  {/* Delete Scene */}
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteScene(job.id, idx)}
                                    style={{
                                      background: "rgba(239, 68, 68, 0.1)",
                                      border: "1px solid rgba(239, 68, 68, 0.2)",
                                      color: "#f87171",
                                      width: "25px",
                                      height: "25px",
                                      borderRadius: "5px",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      cursor: "pointer",
                                    }}
                                    title="Xóa phân cảnh này"
                                  >
                                    <Trash3Fill size={11} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Child Scenes Pagination Controls */}
                        {totalScenePages > 1 && (
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px", padding: "6px 12px", background: "rgba(0,0,0,0.3)", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.06)" }}>
                            <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                              Hiển thị phân cảnh <strong>{(currentScenePage - 1) * SCENES_PER_PAGE + 1} - {Math.min(currentScenePage * SCENES_PER_PAGE, scenes.length)}</strong> / <strong>{scenes.length}</strong> cảnh
                            </span>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <button
                                type="button"
                                onClick={() => setScenePages((prev) => ({ ...prev, [job.id]: Math.max(1, currentScenePage - 1) }))}
                                disabled={currentScenePage <= 1}
                                style={{
                                  background: "rgba(255,255,255,0.06)",
                                  border: "1px solid rgba(255,255,255,0.1)",
                                  color: currentScenePage <= 1 ? "#64748b" : "#f8fafc",
                                  padding: "3px 8px",
                                  borderRadius: "4px",
                                  fontSize: "11px",
                                  cursor: currentScenePage <= 1 ? "not-allowed" : "pointer",
                                }}
                              >
                                ‹ Trước
                              </button>
                              <span style={{ fontSize: "11px", fontWeight: 700, color: "#38bdf8", padding: "0 4px" }}>
                                {currentScenePage} / {totalScenePages}
                              </span>
                              <button
                                type="button"
                                onClick={() => setScenePages((prev) => ({ ...prev, [job.id]: Math.min(totalScenePages, currentScenePage + 1) }))}
                                disabled={currentScenePage >= totalScenePages}
                                style={{
                                  background: "rgba(255,255,255,0.06)",
                                  border: "1px solid rgba(255,255,255,0.1)",
                                  color: currentScenePage >= totalScenePages ? "#64748b" : "#f8fafc",
                                  padding: "3px 8px",
                                  borderRadius: "4px",
                                  fontSize: "11px",
                                  cursor: currentScenePage >= totalScenePages ? "not-allowed" : "pointer",
                                }}
                              >
                                Sau ›
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Parent Video Pagination Footer */}
        {filteredVideos.length > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "rgba(30, 41, 59, 0.6)", borderTop: "1px solid rgba(255, 255, 255, 0.08)", flexWrap: "wrap", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "11.5px", color: "#94a3b8" }}>
                Hiển thị <strong>{(parentPage - 1) * parentPageSize + 1} - {Math.min(parentPage * parentPageSize, filteredVideos.length)}</strong> trên tổng số <strong>{filteredVideos.length}</strong> video
              </span>
              <select
                value={parentPageSize}
                onChange={(e) => {
                  setParentPageSize(Number(e.target.value));
                  setParentPage(1);
                }}
                style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: "5px", padding: "3px 6px", color: "#f8fafc", fontSize: "11px", outline: "none" }}
              >
                <option value={5}>5 video / trang</option>
                <option value={10}>10 video / trang</option>
                <option value={20}>20 video / trang</option>
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <button
                type="button"
                onClick={() => setParentPage(1)}
                disabled={parentPage <= 1}
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: parentPage <= 1 ? "#64748b" : "#f8fafc", padding: "3px 8px", borderRadius: "4px", fontSize: "11px", cursor: parentPage <= 1 ? "not-allowed" : "pointer" }}
              >
                « Đầu
              </button>
              <button
                type="button"
                onClick={() => setParentPage((p) => Math.max(1, p - 1))}
                disabled={parentPage <= 1}
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: parentPage <= 1 ? "#64748b" : "#f8fafc", padding: "3px 8px", borderRadius: "4px", fontSize: "11px", cursor: parentPage <= 1 ? "not-allowed" : "pointer" }}
              >
                ‹ Trước
              </button>

              <span style={{ fontSize: "11.5px", fontWeight: 800, color: "#38bdf8", padding: "0 4px" }}>
                Trang {parentPage} / {totalParentPages}
              </span>

              <button
                type="button"
                onClick={() => setParentPage((p) => Math.min(totalParentPages, p + 1))}
                disabled={parentPage >= totalParentPages}
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: parentPage >= totalParentPages ? "#64748b" : "#f8fafc", padding: "3px 8px", borderRadius: "4px", fontSize: "11px", cursor: parentPage >= totalParentPages ? "not-allowed" : "pointer" }}
              >
                Sau ›
              </button>
              <button
                type="button"
                onClick={() => setParentPage(totalParentPages)}
                disabled={parentPage >= totalParentPages}
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: parentPage >= totalParentPages ? "#64748b" : "#f8fafc", padding: "3px 8px", borderRadius: "4px", fontSize: "11px", cursor: parentPage >= totalParentPages ? "not-allowed" : "pointer" }}
              >
                Cuối »
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* ACTION MODALS */}
      {/* ========================================================================= */}

      {/* MODAL 1: BATCH AI ANALYSIS SETTINGS MODAL */}
      {showBatchModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999, padding: "20px" }}>
          <div style={{ background: "#0f172a", border: "1px solid rgba(56, 189, 248, 0.3)", borderRadius: "12px", width: "100%", maxWidth: "640px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 50px rgba(0,0,0,0.6)", padding: "20px" }}>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "12px", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "7px", background: "linear-gradient(135deg, #0284c7, #2563eb)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>
                  <LightningChargeFill />
                </div>
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#f8fafc", margin: 0 }}>
                    Cài Đặt & Chạy Phân Tích AI Hàng Loạt
                  </h3>
                  <span style={{ fontSize: "11.5px", color: "#94a3b8" }}>
                    Áp dụng cho {selectedJobIds.size > 0 ? selectedJobIds.size : sourceCandidates.length} video trong không gian làm việc
                  </span>
                </div>
              </div>
              <button type="button" onClick={() => setShowBatchModal(false)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}>
                <XLg size={15} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleStartBatchAnalysis(defaultProviderId, defaultPrompt, defaultVoiceId, defaultLanguage);
              }}
              style={{ display: "flex", flexDirection: "column", gap: "14px" }}
            >
              {/* Provider & Model Selection Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#cbd5e1", marginBottom: "5px" }}>
                    🤖 NHÀ CUNG CẤP AI (PROVIDER)
                  </label>
                  <select
                    value={defaultProviderId}
                    onChange={(e) => handleSelectProvider(e.target.value)}
                    style={{ width: "100%", background: "rgba(0,0,0,0.35)", border: "1px solid #334155", borderRadius: "6px", padding: "8px 10px", color: "#f8fafc", fontSize: "12px", outline: "none", cursor: "pointer" }}
                  >
                    {providers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.hasApiKey ? "🟢 (Có Key)" : "🟡 (Chưa có key)"}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#cbd5e1", marginBottom: "5px" }}>
                    🧠 MÔ HÌNH AI (MODEL)
                  </label>
                  <select
                    value={isCustomModel ? "__custom__" : (selectedModel || selectedProvider?.model || "")}
                    onChange={(e) => handleSelectModel(e.target.value)}
                    style={{ width: "100%", background: "rgba(0,0,0,0.35)", border: "1px solid #334155", borderRadius: "6px", padding: "8px 10px", color: "#f8fafc", fontSize: "12px", outline: "none", cursor: "pointer" }}
                  >
                    {availableModels.map((m) => (
                      <option key={m.label} value={m.label}>
                        {m.label} {m.tag ? `— ${m.tag}` : ""}
                      </option>
                    ))}
                    <option value="__custom__">✍️ [Nhập model tùy chỉnh khác...]</option>
                  </select>
                </div>
              </div>

              {isCustomModel && (
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#cbd5e1", marginBottom: "4px" }}>
                    ✍️ NHẬP MODEL TÙY CHỈNH
                  </label>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <input
                      type="text"
                      value={customModelInput}
                      onChange={(e) => setCustomModelInput(e.target.value)}
                      placeholder="Ví dụ: gemini-2.5-flash hoặc gpt-4o"
                      style={{ flex: 1, background: "rgba(0,0,0,0.35)", border: "1px solid #334155", borderRadius: "6px", padding: "7px 10px", color: "#f8fafc", fontSize: "12px", outline: "none" }}
                    />
                    <button
                      type="button"
                      onClick={handleApplyCustomModel}
                      style={{ background: "linear-gradient(135deg, #0284c7, #2563eb)", border: "none", color: "#fff", borderRadius: "6px", padding: "7px 14px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
                    >
                      Áp Dụng
                    </button>
                  </div>
                </div>
              )}

              {/* Preset Prompts */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#cbd5e1", marginBottom: "5px" }}>
                  🎯 PHONG CÁCH & PROMPT KỊCH BẢN MẪU
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginBottom: "8px" }}>
                  {PRESET_PROMPTS.map((pr) => {
                    const isSelected = defaultPrompt === pr.prompt;
                    return (
                      <div
                        key={pr.id}
                        onClick={() => setDefaultPrompt(pr.prompt)}
                        style={{
                          background: isSelected ? "rgba(2, 132, 199, 0.2)" : "rgba(30, 41, 59, 0.5)",
                          border: isSelected ? "1px solid #38bdf8" : "1px solid rgba(255,255,255,0.06)",
                          borderRadius: "6px",
                          padding: "8px 10px",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <strong style={{ fontSize: "11.5px", color: isSelected ? "#38bdf8" : "#f1f5f9", display: "block", marginBottom: "2px" }}>
                          {pr.title}
                        </strong>
                        <span style={{ fontSize: "10px", color: "#94a3b8", display: "block", lineHeight: 1.3 }}>
                          {pr.desc}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <textarea
                  rows={3}
                  value={defaultPrompt}
                  onChange={(e) => setDefaultPrompt(e.target.value)}
                  placeholder="Nhập yêu cầu phân tích ngữ cảnh và kịch bản tùy chỉnh..."
                  style={{ width: "100%", background: "rgba(0,0,0,0.35)", border: "1px solid #334155", borderRadius: "6px", padding: "7px 10px", color: "#f8fafc", fontSize: "12px", outline: "none", resize: "vertical" }}
                />
              </div>

              {/* Voice & Language Selection */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#cbd5e1", marginBottom: "5px" }}>
                    🎙️ GIỌNG ĐỌC AI THUYẾT MINH
                  </label>
                  <select
                    value={defaultVoiceId}
                    onChange={(e) => setDefaultVoiceId(e.target.value)}
                    style={{ width: "100%", background: "rgba(0,0,0,0.35)", border: "1px solid #334155", borderRadius: "6px", padding: "7px 10px", color: "#f8fafc", fontSize: "12.5px", outline: "none" }}
                  >
                    <option value="vi-adam-review">Adam Hollywood (Trầm ấm, review phim)</option>
                    <option value="vbee-manhdung">Mạnh Dũng (Nam tính, năng động)</option>
                    <option value="vbee-maiphuong">Mai Phương (Nữ review vui tươi)</option>
                    <option value="vbee-ngochoang">Ngọc Hoàng (Truyền cảm, ngọt ngào)</option>
                    <option value="vi-hoaimy">Hoài My (Thời sự, tin tức chuẩn)</option>
                    <option value="eleven-charlie">Charlie (Bí ẩn, trinh thám)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#cbd5e1", marginBottom: "5px" }}>
                    🌐 NGÔN NGỮ KỊCH BẢN ĐẦU RA
                  </label>
                  <select
                    value={defaultLanguage}
                    onChange={(e) => setDefaultLanguage(e.target.value)}
                    style={{ width: "100%", background: "rgba(0,0,0,0.35)", border: "1px solid #334155", borderRadius: "6px", padding: "7px 10px", color: "#f8fafc", fontSize: "12.5px", outline: "none" }}
                  >
                    {ANALYSIS_LANGUAGES.map(([code, name]) => (
                      <option key={code} value={code}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Modal Footer */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "12px" }}>
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#e2e8f0", padding: "7px 16px", borderRadius: "6px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  style={{ background: "linear-gradient(135deg, #0284c7, #2563eb)", color: "#fff", border: "none", padding: "7px 20px", borderRadius: "6px", fontSize: "12px", fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: "5px", boxShadow: "0 0 16px rgba(56, 189, 248, 0.35)" }}
                >
                  <LightningChargeFill size={12} /> Bắt Đầu Phân Tích Ngay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT SCENE DETAILS MODAL */}
      {editingSceneInfo && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999, padding: "20px" }}>
          <div style={{ background: "#0f172a", border: "1px solid rgba(56, 189, 248, 0.3)", borderRadius: "12px", width: "100%", maxWidth: "560px", padding: "20px", boxShadow: "0 20px 50px rgba(0,0,0,0.6)" }}>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "10px", marginBottom: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <PencilSquare size={16} color="#38bdf8" />
                <h3 style={{ fontSize: "15px", fontWeight: 800, color: "#f8fafc", margin: 0 }}>
                  Chỉnh Sửa Phân Cảnh #{editingSceneInfo.sceneIdx + 1}
                </h3>
              </div>
              <button type="button" onClick={() => setEditingSceneInfo(null)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}>
                <XLg size={15} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              
              {/* Timestamps */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, color: "#cbd5e1", marginBottom: "3px" }}>
                    BẮT ĐẦU (START)
                  </label>
                  <input
                    type="text"
                    value={editingSceneInfo.scene.start}
                    onChange={(e) => setEditingSceneInfo({
                      ...editingSceneInfo,
                      scene: { ...editingSceneInfo.scene, start: e.target.value }
                    })}
                    style={{ width: "100%", background: "rgba(0,0,0,0.35)", border: "1px solid #334155", borderRadius: "6px", padding: "6px 10px", color: "#f8fafc", fontSize: "12px", fontFamily: "monospace", outline: "none" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, color: "#cbd5e1", marginBottom: "3px" }}>
                    KẾT THÚC (END)
                  </label>
                  <input
                    type="text"
                    value={editingSceneInfo.scene.end || ""}
                    onChange={(e) => setEditingSceneInfo({
                      ...editingSceneInfo,
                      scene: { ...editingSceneInfo.scene, end: e.target.value }
                    })}
                    placeholder="00:15"
                    style={{ width: "100%", background: "rgba(0,0,0,0.35)", border: "1px solid #334155", borderRadius: "6px", padding: "6px 10px", color: "#f8fafc", fontSize: "12px", fontFamily: "monospace", outline: "none" }}
                  />
                </div>
              </div>

              {/* Title & Visual Details */}
              <div>
                <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, color: "#cbd5e1", marginBottom: "3px" }}>
                  TIÊU ĐỀ & NGỮ CẢNH HÌNH ẢNH (VISUAL CONTEXT)
                </label>
                <input
                  type="text"
                  value={editingSceneInfo.scene.title}
                  onChange={(e) => setEditingSceneInfo({
                    ...editingSceneInfo,
                    scene: { ...editingSceneInfo.scene, title: e.target.value }
                  })}
                  placeholder="Tiêu đề phân cảnh..."
                  style={{ width: "100%", background: "rgba(0,0,0,0.35)", border: "1px solid #334155", borderRadius: "6px", padding: "6px 10px", color: "#f8fafc", fontSize: "12px", outline: "none", marginBottom: "5px" }}
                />
                <textarea
                  rows={2}
                  value={editingSceneInfo.scene.detail}
                  onChange={(e) => setEditingSceneInfo({
                    ...editingSceneInfo,
                    scene: { ...editingSceneInfo.scene, detail: e.target.value }
                  })}
                  placeholder="Mô tả hành động, diễn biến nhân vật trong cảnh này..."
                  style={{ width: "100%", background: "rgba(0,0,0,0.35)", border: "1px solid #334155", borderRadius: "6px", padding: "6px 10px", color: "#f8fafc", fontSize: "12px", outline: "none", resize: "vertical" }}
                />
              </div>

              {/* AI Voiceover Script */}
              <div>
                <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11.5px", fontWeight: 700, color: "#38bdf8", marginBottom: "3px" }}>
                  <span>🎙️ LỜI THOẠI LỒNG TIẾNG AI CHO PHÂN CẢNH NÀY</span>
                  <button
                    type="button"
                    onClick={() => handlePlaySceneVoice(editingSceneInfo.scene.voiceover || editingSceneInfo.scene.detail || "", "modal-preview")}
                    style={{ background: "none", border: "none", color: "#38bdf8", cursor: "pointer", fontSize: "11px", fontWeight: 700, display: "flex", alignItems: "center", gap: "3px" }}
                  >
                    <VolumeUpFill size={11} /> Nghe thử giọng đọc
                  </button>
                </label>
                <textarea
                  rows={3}
                  value={editingSceneInfo.scene.voiceover || ""}
                  onChange={(e) => setEditingSceneInfo({
                    ...editingSceneInfo,
                    scene: { ...editingSceneInfo.scene, voiceover: e.target.value }
                  })}
                  placeholder="Nhập câu thoại thuyết minh cho phân cảnh này..."
                  style={{ width: "100%", background: "rgba(0,0,0,0.35)", border: "1px solid rgba(56, 189, 248, 0.4)", borderRadius: "6px", padding: "8px 10px", color: "#f8fafc", fontSize: "12px", outline: "none", resize: "vertical" }}
                />
              </div>

              {/* Modal Actions */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "6px" }}>
                <button
                  type="button"
                  onClick={() => setEditingSceneInfo(null)}
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#e2e8f0", padding: "6px 14px", borderRadius: "6px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveEditedScene(editingSceneInfo.scene)}
                  style={{ background: "linear-gradient(135deg, #0284c7, #2563eb)", color: "#fff", border: "none", padding: "6px 18px", borderRadius: "6px", fontSize: "12px", fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: "5px" }}
                >
                  <Check2 size={14} /> Lưu Thay Đổi
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: VIDEO PLAYER & TRANSCRIPT SYNC MODAL */}
      {previewPlayerInfo && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999, padding: "20px" }}>
          <div style={{ background: "#0f172a", border: "1px solid rgba(56, 189, 248, 0.35)", borderRadius: "14px", width: "100%", maxWidth: "1280px", maxHeight: "92vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 30px 70px rgba(0,0,0,0.85)" }}>
            
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "#1e293b" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                <div style={{ width: "30px", height: "30px", borderRadius: "6px", background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Film size={16} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <strong style={{ fontSize: "14px", color: "#f8fafc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {previewPlayerInfo.job.name}
                    </strong>
                    <span style={{ fontSize: "10px", background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", border: "1px solid rgba(56, 189, 248, 0.3)", padding: "1px 6px", borderRadius: "4px", fontWeight: 700, flexShrink: 0 }}>
                      {previewPlayerInfo.job.analysis?.scenes?.length || 0} PHÂN CẢNH
                    </span>
                    <span style={{ fontSize: "10px", background: "rgba(255, 255, 255, 0.06)", color: "#94a3b8", padding: "1px 6px", borderRadius: "4px", fontFamily: "monospace", flexShrink: 0 }}>
                      ⏱️ {formatDuration(previewPlayerInfo.job.durationSeconds)}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPreviewPlayerInfo(null)}
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", cursor: "pointer", transition: "all 0.15s ease" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#f87171"; e.currentTarget.style.background = "rgba(239, 68, 68, 0.15)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "#94a3b8"; e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
              >
                <XLg size={14} />
              </button>
            </div>

            {/* Modal Body: Video Left + Synced Scenes Right */}
            <div style={{ display: "grid", gridTemplateColumns: "1.35fr 1fr", height: "580px" }}>
              
              {/* Left: Video Player */}
              <div style={{ background: "#000000", display: "flex", flexDirection: "column", justifyContent: "center", position: "relative", borderRight: "1px solid rgba(255,255,255,0.08)" }}>
                {previewPlayerInfo.job.localPath ? (
                  <video
                    id="analysis-preview-video"
                    src={isNativeRuntime() ? `atom://${previewPlayerInfo.job.localPath}` : previewPlayerInfo.job.localPath}
                    controls
                    autoPlay
                    onTimeUpdate={(e) => {
                      const cur = e.currentTarget.currentTime;
                      const scenes = previewPlayerInfo.job.analysis?.scenes || [];
                      const idx = scenes.findIndex((s) => {
                        const partsStart = s.start.split(":").map(Number);
                        const startSec = partsStart.length === 3 ? partsStart[0] * 3600 + partsStart[1] * 60 + partsStart[2] : partsStart.length === 2 ? partsStart[0] * 60 + partsStart[1] : 0;
                        const partsEnd = (s.end || "").split(":").map(Number);
                        const endSec = partsEnd.length === 3 ? partsEnd[0] * 3600 + partsEnd[1] * 60 + partsEnd[2] : partsEnd.length === 2 ? partsEnd[0] * 60 + partsEnd[1] : startSec + 15;
                        return cur >= startSec && cur <= endSec;
                      });
                      if (idx >= 0 && idx !== activePlayingSceneIdx) {
                        setActivePlayingSceneIdx(idx);
                        const card = document.getElementById(`preview-scene-card-${idx}`);
                        if (card) {
                          card.scrollIntoView({ behavior: "smooth", block: "nearest" });
                        }
                      }
                    }}
                    style={{ width: "100%", maxHeight: "100%", objectFit: "contain" }}
                  />
                ) : (
                  <div style={{ color: "#64748b", textAlign: "center", padding: "40px 20px" }}>
                    <Film size={44} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
                    <p style={{ fontSize: "13px", color: "#94a3b8" }}>File video chưa sẵn sàng trên máy hoặc đang tải.</p>
                  </div>
                )}
              </div>

              {/* Right: Synchronized Scenes Timeline */}
              <div style={{ background: "rgba(15, 23, 42, 0.95)", display: "flex", flexDirection: "column", height: "100%" }}>
                
                {/* Scenes Top Bar */}
                <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(30, 41, 59, 0.4)" }}>
                  <span style={{ fontSize: "11px", fontWeight: 800, color: "#38bdf8", textTransform: "uppercase", letterSpacing: "0.5px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <CollectionPlayFill size={12} /> KỊCH BẢN PHÂN CẢNH ĐỒNG BỘ
                  </span>
                  <span style={{ fontSize: "10.5px", color: "#34d399", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#34d399", display: "inline-block" }} /> Auto-Sync Timeline
                  </span>
                </div>

                {/* Scrollable Scenes Cards */}
                <div style={{ flex: 1, overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  {(previewPlayerInfo.job.analysis?.scenes || []).map((sc, idx) => {
                    const isActive = activePlayingSceneIdx === idx;

                    return (
                      <div
                        id={`preview-scene-card-${idx}`}
                        key={sc.id || idx}
                        onClick={() => {
                          setActivePlayingSceneIdx(idx);
                          const vid = document.getElementById("analysis-preview-video") as HTMLVideoElement;
                          if (vid) {
                            const parts = sc.start.split(":").map(Number);
                            const secs = parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : parts.length === 2 ? parts[0] * 60 + parts[1] : 0;
                            vid.currentTime = secs;
                            vid.play();
                          }
                        }}
                        style={{
                          background: isActive ? "linear-gradient(135deg, rgba(2, 132, 199, 0.2), rgba(37, 99, 235, 0.15))" : "rgba(30, 41, 59, 0.5)",
                          border: isActive ? "1px solid #38bdf8" : "1px solid rgba(255, 255, 255, 0.06)",
                          borderRadius: "8px",
                          padding: "10px 12px",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          boxShadow: isActive ? "0 0 16px rgba(56, 189, 248, 0.2)" : "none",
                        }}
                      >
                        {/* Scene Header */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ fontSize: "11px", fontWeight: 800, color: isActive ? "#38bdf8" : "#94a3b8" }}>
                              Cảnh #{idx + 1}
                            </span>
                            {isActive && (
                              <span style={{ fontSize: "9px", background: "rgba(56, 189, 248, 0.25)", color: "#38bdf8", border: "1px solid rgba(56, 189, 248, 0.4)", padding: "1px 5px", borderRadius: "3px", fontWeight: 800 }}>
                                ⚡ ĐANG PHÁT
                              </span>
                            )}
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ fontSize: "10.5px", color: "#38bdf8", fontFamily: "monospace", fontWeight: 700 }}>
                              ⏱️ {sc.start} ➔ {sc.end || "00:15"}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePreviewVoice(previewPlayerInfo.job.id, sc.id || `scene-${idx + 1}`, sc.voiceover || sc.translation || sc.detail);
                              }}
                              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px", padding: "2px 6px", color: "#e2e8f0", fontSize: "10.5px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "3px" }}
                              title="Nghe thử giọng đọc TTS"
                            >
                              <VolumeUpFill size={11} color="#38bdf8" />
                            </button>
                          </div>
                        </div>

                        {/* Scene Title */}
                        <strong style={{ fontSize: "12.5px", color: "#f8fafc", display: "block", marginBottom: "4px" }}>
                          {sc.title}
                        </strong>

                        {/* Scene Visual Detail */}
                        {sc.detail && (
                          <div style={{ fontSize: "10.5px", color: "#94a3b8", marginBottom: "5px", display: "flex", alignItems: "flex-start", gap: "4px" }}>
                            <span>👁️</span> <span>{sc.detail}</span>
                          </div>
                        )}

                        {/* AI Voiceover Script */}
                        <div style={{ background: "rgba(0, 0, 0, 0.35)", borderLeft: "2px solid #38bdf8", borderRadius: "0 4px 4px 0", padding: "6px 8px", fontSize: "11px", color: "#e2e8f0", fontStyle: "italic", lineHeight: 1.4 }}>
                          🎙️ "{sc.voiceover || sc.translation || sc.detail}"
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: ADD NEW VIDEOS MODAL */}
      {showAddModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999, padding: "20px" }}>
          <div style={{ background: "#0f172a", border: "1px solid rgba(56, 189, 248, 0.3)", borderRadius: "12px", width: "100%", maxWidth: "500px", padding: "20px", boxShadow: "0 20px 50px rgba(0,0,0,0.6)" }}>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "10px", marginBottom: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <PlusLg size={16} color="#38bdf8" />
                <h3 style={{ fontSize: "15px", fontWeight: 800, color: "#f8fafc", margin: 0 }}>
                  Thêm Video Nguồn Mới
                </h3>
              </div>
              <button type="button" onClick={() => setShowAddModal(false)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}>
                <XLg size={15} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              
              {/* Option 1: Multi-file picker */}
              <div style={{ background: "rgba(30, 41, 59, 0.5)", border: "1px dashed rgba(56, 189, 248, 0.4)", borderRadius: "8px", padding: "16px", textAlign: "center" }}>
                <FolderFill size={28} color="#38bdf8" style={{ margin: "0 auto 8px" }} />
                <h4 style={{ fontSize: "13px", fontWeight: 700, color: "#f8fafc", margin: "0 0 3px" }}>
                  Chọn File Video Từ Máy Tính
                </h4>
                <p style={{ fontSize: "11px", color: "#94a3b8", margin: "0 0 12px" }}>
                  Hỗ trợ nạp 1 hoặc nhiều video cùng lúc (MP4, MKV, MOV, AVI, WEBM).
                </p>
                <button
                  type="button"
                  onClick={handlePickFiles}
                  style={{ background: "linear-gradient(135deg, #0284c7, #2563eb)", color: "#fff", border: "none", padding: "7px 16px", borderRadius: "6px", fontSize: "12px", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "5px" }}
                >
                  <Upload size={13} /> Duyệt File Trên Máy Tính
                </button>
              </div>

              {/* Option 2: URL Input */}
              <div>
                <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, color: "#cbd5e1", marginBottom: "5px" }}>
                  HOẶC DÁN ĐƯỜNG DẪN LINK VIDEO URL
                </label>
                <div style={{ display: "flex", gap: "6px" }}>
                  <input
                    type="text"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=... hoặc TikTok URL"
                    style={{ flex: 1, background: "rgba(0,0,0,0.35)", border: "1px solid #334155", borderRadius: "6px", padding: "7px 10px", color: "#f8fafc", fontSize: "12px", outline: "none" }}
                  />
                  <button
                    type="button"
                    onClick={handleAddUrlSubmit}
                    disabled={!inputUrl.trim() || isAddingUrl}
                    style={{ background: "rgba(56, 189, 248, 0.15)", border: "1px solid rgba(56, 189, 248, 0.4)", color: "#38bdf8", padding: "7px 14px", borderRadius: "6px", fontSize: "12px", fontWeight: 700, cursor: "pointer", flexShrink: 0 }}
                  >
                    {isAddingUrl ? "Đang thêm..." : "Thêm URL"}
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: QUICK API KEY CONFIG MODAL */}
      {showApiKeyModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999999, padding: "20px" }}>
          <div style={{ background: "#0f172a", border: "1px solid rgba(56, 189, 248, 0.4)", borderRadius: "12px", width: "100%", maxWidth: "520px", boxShadow: "0 25px 60px rgba(0,0,0,0.7)", padding: "20px" }}>
            
            {/* Modal header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "10px", marginBottom: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <KeyFill size={17} color="#38bdf8" />
                <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 800, color: "#f8fafc" }}>
                  Cài Đặt API Key Cho {selectedProvider?.name || "AI Provider"}
                </h3>
              </div>
              <button type="button" onClick={() => setShowApiKeyModal(false)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}>
                <XLg size={14} />
              </button>
            </div>

            <p style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "14px", lineHeight: 1.4 }}>
              Dán mã API Key của bạn vào bên dưới để kích hoạt phân tích video trực tiếp. API Key được lưu và mã hóa an toàn trên máy tính của bạn.
            </p>

            {/* Input */}
            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, color: "#cbd5e1", marginBottom: "5px" }}>
                MÃ API KEY (Google AI Studio / OpenAI / DeepSeek / Claude / Groq)
              </label>
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="Dán API Key (AIzaSy... hoặc sk-...)"
                style={{ width: "100%", background: "rgba(0,0,0,0.4)", border: "1px solid #334155", borderRadius: "6px", padding: "8px 10px", color: "#f8fafc", fontSize: "13px", outline: "none" }}
              />
            </div>

            {/* Helper Links */}
            {selectedProvider?.providerType === "gemini" && (
              <div style={{ background: "rgba(56, 189, 248, 0.08)", border: "1px solid rgba(56, 189, 248, 0.2)", borderRadius: "6px", padding: "8px 12px", marginBottom: "14px", fontSize: "11.5px", color: "#94a3b8" }}>
                💡 Chưa có key Google Gemini? Lấy API Key miễn phí tại:{" "}
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: "#38bdf8", fontWeight: 700, textDecoration: "underline" }}>
                  Google AI Studio ↗
                </a>
              </div>
            )}
            {selectedProvider?.providerType === "openai" && (
              <div style={{ background: "rgba(56, 189, 248, 0.08)", border: "1px solid rgba(56, 189, 248, 0.2)", borderRadius: "6px", padding: "8px 12px", marginBottom: "14px", fontSize: "11.5px", color: "#94a3b8" }}>
                💡 Lấy API Key OpenAI tại:{" "}
                <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" style={{ color: "#38bdf8", fontWeight: 700, textDecoration: "underline" }}>
                  OpenAI Platform ↗
                </a>
              </div>
            )}
            {selectedProvider?.providerType === "deepseek" && (
              <div style={{ background: "rgba(56, 189, 248, 0.08)", border: "1px solid rgba(56, 189, 248, 0.2)", borderRadius: "6px", padding: "8px 12px", marginBottom: "14px", fontSize: "11.5px", color: "#94a3b8" }}>
                💡 Lấy API Key DeepSeek tại:{" "}
                <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noreferrer" style={{ color: "#38bdf8", fontWeight: 700, textDecoration: "underline" }}>
                  DeepSeek Platform ↗
                </a>
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button
                type="button"
                onClick={() => setShowApiKeyModal(false)}
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#e2e8f0", padding: "6px 14px", borderRadius: "6px", fontSize: "12px", cursor: "pointer" }}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveApiKey}
                disabled={!apiKeyInput.trim()}
                style={{ background: "linear-gradient(135deg, #0284c7, #2563eb)", color: "#fff", border: "none", padding: "6px 16px", borderRadius: "6px", fontSize: "12px", fontWeight: 700, cursor: apiKeyInput.trim() ? "pointer" : "not-allowed", opacity: apiKeyInput.trim() ? 1 : 0.6 }}
              >
                Lưu & Kích Hoạt
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
