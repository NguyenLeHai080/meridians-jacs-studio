import { useEffect, useState, useMemo, type ChangeEvent } from "react";
import { getRuntime, isNativeRuntime } from "../../core/runtime";
import { playAudioStream, stopGlobalAudio } from "../../core/audio-player";
import { popup } from "../../shared/popup";
import type { AnalysisResult, AnalysisScene, Job, NavKey, ProviderProfile, TimelineClip, DurationMappingRule, ProviderPoolItem } from "../../core/types";
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
    { label: "gemini-2.5-flash", tag: "⚡ [Khuyên Dùng Phân Tích] Siêu Nhanh, Multimodal 1M Token" },
    { label: "gemini-flash-latest", tag: "🌟 [Mới Nhất] Tự động cập nhật Google AI Studio" },
    { label: "gemini-1.5-flash", tag: "⚡ [Phân Tích Video] Ngữ Cảnh 1M Token Ổn Định" },
    { label: "gemini-1.5-pro", tag: "🧠 [Phân Tích Chi Tiết Khung Hình] 2M Token Chuyên Sâu" },
    { label: "gemini-2.0-flash", tag: "⚡ Tốc độ cao thế hệ mới" },
    { label: "gemini-2.5-pro", tag: "🧠 [Suy Luận Đỉnh Cao] Xử lý toàn bộ phim dài 2 giờ" },
  ],
  openai: [
    { label: "gpt-5.6-sol", tag: "⭐ [VIP Kịch Bản] Mô hình kịch bản đỉnh cao" },
    { label: "gpt-5.5", tag: "🎬 [Điện Ảnh Thế Hệ Mới] Văn phong đa tầng nghĩa" },
    { label: "gpt-4o", tag: "🧠 [Flagship Multimodal] Nhận diện khung hình & âm thanh" },
    { label: "gpt-4o-mini", tag: "⚡ [Siêu Tiết Kiệm] Phản hồi nhanh, tối ưu chi phí" },
    { label: "o3-mini", tag: "🧠 [Suy Luận Logic] Khớp cảnh chính xác từng giây" },
    { label: "gpt-4-turbo", tag: "📜 Ngữ cảnh lớn 128k tokens" },
  ],
  anthropic: [
    { label: "claude-3-7-sonnet", tag: "✍️ [Đỉnh Cao Kịch Bản] Tư duy lai & Viết văn siêu mượt" },
    { label: "claude-3-5-sonnet-20241022", tag: "🎬 [Biên Kịch Điện Ảnh] Kịch bản sâu sắc & Giàu cảm xúc" },
    { label: "claude-3-5-sonnet-latest", tag: "🎬 [Bản Mới Nhất] Tối ưu kịch bản viral triệu view" },
    { label: "claude-opus-5", tag: "👑 [Thế Hệ Mới] Biên kịch điện ảnh cao cấp & Plot twist" },
    { label: "claude-opus-4.8", tag: "👑 [Review Phim Triệu View] Xây dựng cao trào nghẹt thở" },
    { label: "claude-opus-4.8-thinking", tag: "🧠 [Thinking Mode] Phát hiện lỗ hổng cốt truyện" },
    { label: "claude-3-5-haiku", tag: "⚡ [Siêu Tốc Độ] Phản hồi tức thì" },
  ],
  deepseek: [
    { label: "deepseek-chat", tag: "⚡ [DeepSeek-V3] Siêu Rẻ & Thông Minh Vượt Trội" },
    { label: "deepseek-reasoner", tag: "🧠 [DeepSeek-R1] Tư Duy Lập Luận Chain-of-Thought" },
  ],
  groq: [
    { label: "llama-3.3-70b-versatile", tag: "⚡ [Groq Llama 3.3 70B] Siêu tốc độ dưới 200ms" },
    { label: "llama-3.1-8b-instant", tag: "⚡ Llama 3.1 8B tức thì" },
    { label: "whisper-large-v3", tag: "🎙️ Bóc giọng nói phụ đề chuẩn xác" },
  ],
  ollama: [
    { label: "llava", tag: "Local Vision AI (Offline)" },
    { label: "llama3.2", tag: "Local Llama 3.2" },
    { label: "qwen2.5", tag: "Local Qwen 2.5" },
    { label: "mistral", tag: "Local Mistral" },
  ],
  "openai-compatible": [
    { label: "openai/gpt-4o-mini", tag: "OpenRouter GPT-4o-mini" },
    { label: "anthropic/claude-3.5-sonnet", tag: "OpenRouter Claude 3.5 Sonnet" },
    { label: "google/gemini-2.0-flash-exp:free", tag: "OpenRouter Gemini Free" },
    { label: "deepseek/deepseek-r1", tag: "OpenRouter DeepSeek R1" },
  ],
};

export function getProviderBrandType(p?: ProviderProfile | null): string {
  if (!p) return "gemini";
  const str = `${p.providerType || ""} ${p.name || ""} ${p.model || ""}`.toLowerCase();
  if (str.includes("gemini") || str.includes("google")) return "gemini";
  if (str.includes("claude") || str.includes("anthropic") || str.includes("opus") || str.includes("sonnet")) return "anthropic";
  if (str.includes("deepseek")) return "deepseek";
  if (str.includes("groq") || str.includes("llama")) return "groq";
  if (str.includes("ollama")) return "ollama";
  if (str.includes("openrouter") || str.includes("openai-compatible")) return "openai-compatible";
  return "openai";
}

export function formatProviderLabel(p: ProviderProfile): string {
  const brand = getProviderBrandType(p);
  const brandName =
    brand === "gemini"
      ? "Google Gemini"
      : brand === "anthropic"
      ? "Anthropic Claude"
      : brand === "deepseek"
      ? "DeepSeek"
      : brand === "groq"
      ? "Groq Cloud"
      : "OpenAI";

  if (p.isManaged) {
    let cleanName = p.name || "";
    if (!cleanName || cleanName.startsWith("(") || cleanName === p.model) {
      cleanName = `👑 ${brandName} (${p.model || "Gateway"})`;
    }
    return `${cleanName} 🟢 (Cloud Gateway)`;
  }

  let cleanName = p.name || "";
  if (!cleanName || cleanName.startsWith("(") || cleanName === p.model) {
    cleanName = `${brandName} (BYOK)`;
  }
  return `${cleanName} ${p.hasApiKey ? "🟢 (Có Key)" : "🟡 (Chưa có key)"}`;
}

const PRESET_PROMPTS = [
  {
    id: "universal_storytelling",
    title: "🌟 Kể Chuyện & Tóm Tắt Toàn Diện (Tự Động Nhận Diện Mọi Video)",
    desc: "Tự động nhận diện thể loại (Phim, Vlog, Đời sống, Tin tức, Vụ án, Hướng dẫn...) và biên kịch Voice-over cuốn hút theo đúng nội dung thực tế",
    prompt: `# VAI TRÒ (ROLE)
Bạn là một Biên kịch - Kể chuyện Chuyên nghiệp (Master Storyteller & Scriptwriter) hàng đầu. Hãy phân tích toàn bộ nội dung video từ đầu đến cuối dựa trên các khung hình và lời thoại bóc băng thực tế.

# NHIỆM VỤ CHÍNH (CORE TASK)
1. QUAN SÁT & BÓC TÁCH: Đọc hiểu 100% hình ảnh và lời thoại thực tế của video gốc. Tuyệt đối bám sát diễn biến thực tế, không bịa đặt sai lệch nội dung hay thể loại của video.
2. TỰ ĐỘNG THÍCH ỨNG THEO THỂ LOẠI:
   - Phim / Hoạt hình / Drama: Tóm tắt cốt truyện, nhân vật, cao trào và plot twist đắt giá.
   - Vlog / Ẩm thực / Du lịch / Đời sống: Kể lại trải nghiệm, địa điểm, cảm xúc và những điểm nhấn thú vị.
   - Tin tức / Phóng sự / Thời sự: Tóm tắt trung thực dòng sự kiện, nhân vật và ý nghĩa xã hội.
   - Vụ án / Pháp luật / Cảnh sát: Phân tích điều tra, chứng cứ và kết luận pháp lý.
   - Hướng dẫn / Công nghệ / Game: Tóm tắt các điểm then chốt, mẹo hay và kết quả.
3. BIÊN KỊCH KỂ CHUYỆN (VOICEOVER): Viết kịch bản kể chuyện bằng NGÔI THỨ 3 với văn phong lôi cuốn, mượt mà, cảm xúc, không chèn mốc thời gian vào câu đọc.
4. TỰ ĐỘNG KHỚP CẢNH VIDEO: Mốc source_start và source_end của từng phân cảnh BẮT BUỘC chỉ đúng đoạn video có hình ảnh minh họa cho câu kể voiceover để hệ thống tự động cắt và ráp video khớp 100%.

# CẤU TRÚC STORYTELLING BẮT BUỘC (3 HỒI & HOOK 10S MỞ MÀN):
1. [00:00 - 00:10] HOOK CAO TRÀO MỞ MÀN: Trích đoạn câu nói hoặc tình tiết ấn tượng/kịch tính nhất để giữ chân người xem trong 3 giây đầu.
2. [HỒI 1] BỐI CẢNH & KHỞI ĐẦU: Giới thiệu nhân vật, hoàn cảnh, sự kiện mở đầu.
3. [HỒI 2] DIỄN BIẾN & CAO TRÀO: Đi sâu vào những tình huống trọng tâm, mâu thuẫn, thử thách hoặc bước ngoặt đắt giá nhất.
4. [HỒI 3] HỒI KẾT & THÔNG ĐIỆP: Kết quả chung cuộc, đọng lại cảm xúc và bài học/thông điệp ý nghĩa.`,
  },
  {
    id: "master_cops_storytelling",
    title: "🚔 Cops & Hồ Sơ Phá Án Kịch Tính (Police Bodycam / True Crime)",
    desc: "Cấu trúc 3 hồi dồn dập + Hook 10s gay cấn nghẹt thở, trực giác nghiệp vụ cảnh sát và đấu trí tâm lý",
    prompt: `# VAI TRÒ (ROLE)
Bạn là một Biên kịch - Kể chuyện Chuyên nghiệp (Master Storyteller & Scriptwriter) chuyên chuyển thể các tư liệu video đời thực/pháp luật/cảnh sát/xã hội thành kịch bản Voice-over kịch tính, gay cấn, lôi cuốn theo cấu trúc Hook cao trào và giữ chân người xem tối đa.

# NHIỆM VỤ CHÍNH (CORE TASK)
1. Xem và bóc tách dữ liệu video (phân đoạn mốc thời gian, lời thoại, hành động chính).
2. Dịch nghĩa chính xác sang tiếng Việt.
3. Viết lại toàn bộ câu chuyện thành kịch bản kể chuyện bằng NGÔI THỨ 3 (người kể chuyện giấu mặt/người quan sát) với văn phong kịch tính, cao trào, gay cấn, cuốn hút.
4. ĐẶC BIỆT: Tự động nhặt đúng khung cảnh trong video (mốc source_start và source_end) có hành động/biểu cảm đắt giá nhất để khớp hoàn hảo với từng câu kể chuyện kịch tính.

# CẤU TRÚC STORYTELLING BẮT BUỘC (3 HỒI & HOOK CAO TRÀO GAY CẤN)
1. [00:00 - 00:10] HOOK CAO TRÀO NGHẸT THỞ (BẮT BUỘC ĐẨY LÊN ĐẦU):
- Thời lượng đọc: Đúng 10 giây đầu (khoảng 25 - 35 từ).
- Kỹ thuật: Bê nguyên video gốc đoạn hook dưới 10s hoặc trích xuất ngay câu thoại đắt giá nhất / tình tiết mâu thuẫn sốc nhất của video.
- Mục tiêu: Chặn người xem lướt qua trong 3 giây đầu, tạo khoảng trống tò mò (curiosity gap) cực lớn.

2. [00:10 - 01:15] HỒI 1: KHỞI NGUỒN & NGHỊCH LÝ BAN ĐẦU:
- Diễn tả theo hướng giật tít để đưa hồi 2 vào cao trào.
- Bối cảnh sự việc bắt đầu từ một chi tiết tưởng chừng rất nhỏ nhặt, bình thường (dừng xe kiểm tra, va chạm nhẹ, cuộc gặp tình cờ).
- Khắc họa sự đối lập/nghịch lý: Vẻ ngoài bình thản của đối tượng vs. sự bất thường hoặc vết nứt tâm lý.

3. [01:15 - 02:45] HỒI 2: XUNG ĐỘT LEO THANG & LỚP MẶT NẠ BỊ XÉ TOẠC:
- Quá trình thẩm vấn/đối chất/khám xét/truy bắt, bóc trần từng lớp dối trá.
- Cao trào cảm xúc: Khoảnh khắc sự thật vỡ vụn, đối tượng bị khống chế hoặc lộ diện toàn bộ sự thật.

4. [02:45 - 04:30+] HỒI 3: KẾT CỤC, CÔNG LÝ & BÀI HỌC QUAN SÁT XÃ HỘI:
- Bằng chứng không thể chối cãi được đưa ra ánh sáng.
- Bài học đọng lại về pháp luật và nhân tâm xã hội.

# PHONG CÁCH VĂN PHONG & KHỚP CẢNH VIDEO
- Phong cách: Cảnh sát tuần tra / Hồ sơ phá án (Police Bodycam / Cops / True Crime).
- Ngôi kể: Ngôi thứ ba hoàn toàn ("gã đàn ông", "cô bé", "hắn", "viên cảnh sát tuần tra", "sĩ quan cảnh sát"...).
- TỰ ĐỘNG KHỚP CẢNH VIDEO: Mốc source_start và source_end phải chỉ đúng đoạn video minh họa cho câu kể voiceover.`,
  },
  {
    id: "movie_review",
    title: "🎬 Review Phim Điện Ảnh & Hoạt Hình (Cao Trào & Plot Twist)",
    desc: "Tập trung vào plot twist, cao trào, diễn biến gay cấn, ngắt nghỉ kịch tính và nhặt cảnh phim đắt giá",
    prompt: `# VAI TRÒ (ROLE)
Bạn là một Chuyên gia Kể chuyện & Review Phim Điện Ảnh chuyên nghiệp triệu view với phong cách kể chuyện gay cấn nghẹt thở.

# CẤU TRÚC STORYTELLING:
1. [00:00 - 00:10] HOOK CAO TRÀO: Câu dẫn giật gân về bí mật hoặc bước ngoặt lớn nhất của tác phẩm để giữ chân người xem.
2. [HỒI 1] Giới thiệu nhân vật & biến cố bất ngờ xảy đến.
3. [HỒI 2] Đấu trí nghẹt thở, những cú plot twist bất ngờ và cao trào mâu thuẫn.
4. [HỒI 3] Hồi kết mãn nhãn và thông điệp triết lý của tác phẩm.

# KHỚP CẢNH VIDEO:
- Mốc source_start và source_end phải khớp chính xác phân đoạn phim có hành động tương ứng với lời kể.`,
  },
  {
    id: "reality_show",
    title: "📺 Show Thực Tế & Drama Đời Sống Siêu Kịch Tính",
    desc: "Bình luận drama sắc sảo, bắt trọn biểu cảm giật mình, tranh cãi đối đầu, nhặt đúng cảnh va chạm nảy lửa",
    prompt: `# VAI TRÒ (ROLE)
Bạn là một Biên kịch - Kể chuyện Chuyên nghiệp chuyên phân tích Show truyền hình thực tế / Drama đời sống với lối dẫn dắt hồi hộp, cuốn hút, đẩy kịch tính lên đỉnh điểm.

# CẤU TRÚC STORYTELLING BẮT BUỘC:
1. [00:00 - 00:10] HOOK CAO TRÀO: Trích đoạn drama/phản ứng giật mình nảy lửa nhất để giữ chân người xem ngay 3 giây đầu.
2. [HỒI 1] KHỞI NGUỒN: Bối cảnh sự việc, sự đối đầu ban đầu của các nhân vật.
3. [HỒI 2] XUNG ĐỘT CAO TRÀO: Tranh cãi nảy lửa, bóc trần cảm xúc thật và những mâu thuẫn không thể hàn gắn.
4. [HỒI 3] HỒI KẾT & DƯ ÂM: Bài học và phản ứng cuối cùng.

# PHONG CÁCH & KHỚP CẢNH:
- Tone: Sôi nổi, cuốn hút, dí dỏm, bình luận sắc sảo, dồn dập.
- Ngôi kể: Ngôi thứ 3 quan sát.
- Khớp cảnh: Chỉ đúng mốc source_start và source_end của video gốc có khoảnh khắc tranh luận/biểu cảm tương ứng với lời thoại.`,
  },
  {
    id: "tiktok_viral",
    title: "⚡ Video Ngắn TikTok / Reels / Shorts Viral",
    desc: "Tối ưu hóa 3 giây đầu giữ chân người xem, nhịp điệu nhanh, dồn dập",
    prompt: `# VAI TRÒ (ROLE)
Bạn là một Chuyên gia Sáng tạo Nội dung Ngắn Viral (TikTok/Shorts/Reels).

# YÊU CẦU:
- Hook cực gắt trong 3 giây đầu tiên để giữ chân người xem (Retention > 90%).
- Nhịp điệu dồn dập, câu chữ gãy gọn, giàu cảm xúc, kích thích tương tác comment/share.
- Mốc source_start và source_end chọn đúng các khoảnh khắc visual bắt mắt nhất.`,
  },
  {
    id: "news_digest",
    title: "📰 Tin Tức, Phóng Sự & Thời Sự Nóng Hổi",
    desc: "Khách quan, súc tích, tóm tắt sự kiện chính xác và rành mạch",
    prompt: `# VAI TRÒ (ROLE)
Bạn là Biên tập viên Thời sự & Phóng sự Điều tra.

# YÊU CẦU:
- Khách quan, trung thực, mạch lạc, giọng văn đanh thép chuẩn mực báo chí.
- Bóc tách mốc thời gian, nhân vật, sự kiện và kết luận xác thực.
- Khớp cảnh chính xác theo dòng thời gian sự kiện.`,
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
    id: "tech_tutorial",
    title: "💻 Hướng Dẫn Kỹ Thuật, Công Nghệ & Review Sản Phẩm",
    desc: "Rõ ràng, trực quan, cô đọng các bước thực hành và đánh giá ưu nhược điểm",
    prompt: `# VAI TRÒ (ROLE)
Bạn là Chuyên gia Đánh giá Công nghệ & Hướng dẫn Kỹ thuật.

# YÊU CẦU:
- Mạch lạc, trực quan, làm nổi bật các tính năng chính, thao tác quan trọng và mẹo sử dụng.
- Khớp cảnh chính xác với thao tác trên màn hình hoặc sản phẩm được giới thiệu.`,
  },
];

export const DEFAULT_DURATION_RULES: DurationMappingRule[] = [
  { id: "rule-1", minInputMinutes: 0, maxInputMinutes: 10, targetOutputMinutes: 2, label: "0 - 10 phút" },
  { id: "rule-2", minInputMinutes: 10, maxInputMinutes: 25, targetOutputMinutes: 5, label: "10 - 25 phút" },
  { id: "rule-3", minInputMinutes: 25, maxInputMinutes: 60, targetOutputMinutes: 8, label: "25 - 60 phút" },
  { id: "rule-4", minInputMinutes: 60, maxInputMinutes: 9999, targetOutputMinutes: 12, label: "> 60 phút" },
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

function resolveMediaSrc(pathOrUrl?: string): string {
  if (!pathOrUrl) return "";
  if (
    pathOrUrl.startsWith("http://") ||
    pathOrUrl.startsWith("https://") ||
    pathOrUrl.startsWith("blob:") ||
    pathOrUrl.startsWith("data:") ||
    pathOrUrl.startsWith("jacs-media:")
  ) {
    return pathOrUrl;
  }
  if (isNativeRuntime()) {
    return `jacs-media://local?path=${encodeURIComponent(pathOrUrl)}`;
  }
  return pathOrUrl;
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
  const [cloudModels, setCloudModels] = useState<any[]>([]);
  const [defaultProviderId, setDefaultProviderId] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [isCustomModel, setIsCustomModel] = useState(false);
  const [customModelInput, setCustomModelInput] = useState("");
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [defaultVoiceId, setDefaultVoiceId] = useState("vi-adam-review");
  const [defaultLanguage, setDefaultLanguage] = useState("vi");

  // Fetch available cloud models on mount
  useEffect(() => {
    const apiBase = String((import.meta as any).env?.VITE_API_URL || "https://jacs-studio.nexoratech.com.vn").replace(/\/$/, "");
    fetch(`${apiBase}/api/v1/ai-providers/models-available`, { signal: AbortSignal.timeout(5000) })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        const available = payload?.data || [];
        if (Array.isArray(available) && available.length > 0) {
          setCloudModels(available);
        }
      })
      .catch(() => {});
  }, []);
  
  // Script Preset Style & Prompt State
  const [selectedPresetId, setSelectedPresetId] = useState<string>(() => {
    const saved = localStorage.getItem("jacs_selected_preset_id");
    if (!saved || saved === "master_cops_storytelling") {
      return PRESET_PROMPTS[0].id;
    }
    return saved;
  });
  const [defaultPrompt, setDefaultPrompt] = useState<string>(() => {
    const savedPresetId = localStorage.getItem("jacs_selected_preset_id");
    if (savedPresetId && savedPresetId !== "__custom__" && savedPresetId !== "master_cops_storytelling") {
      const found = PRESET_PROMPTS.find((p) => p.id === savedPresetId);
      if (found) return found.prompt;
    }
    const savedCustom = localStorage.getItem("jacs_default_prompt");
    if (savedCustom && !savedCustom.includes("Cảnh sát tuần tra")) return savedCustom;
    return PRESET_PROMPTS[0].prompt;
  });

  const handleSelectPreset = (preset: typeof PRESET_PROMPTS[0]) => {
    setSelectedPresetId(preset.id);
    setDefaultPrompt(preset.prompt);
    try {
      localStorage.setItem("jacs_selected_preset_id", preset.id);
      localStorage.setItem("jacs_default_prompt", preset.prompt);
    } catch {}
    showToast(`✓ Đã chọn phong cách: ${preset.title}`);
  };

  // Target output script duration state & Mapping Rules
  const [durationMode, setDurationMode] = useState<"rules" | "fixed">(() => {
    return (localStorage.getItem("jacs_duration_mode") as any) || "fixed";
  });
  const [durationRules, setDurationRules] = useState<DurationMappingRule[]>(() => {
    try {
      const saved = localStorage.getItem("jacs_duration_rules");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_DURATION_RULES;
  });
  const [targetDuration, setTargetDuration] = useState<"full" | "60s" | "3m" | "5m" | "10m" | "15m" | "custom">("5m");
  const [customDurationMinutes, setCustomDurationMinutes] = useState<number>(5);

  // Multi-Provider / Multi-Model pool & Parallel concurrency state (Cắm đêm siêu tốc)
  const [useProviderPool, setUseProviderPool] = useState<boolean>(() => {
    return localStorage.getItem("jacs_use_provider_pool") !== "false";
  });
  const [batchConcurrency, setBatchConcurrency] = useState<number>(() => {
    const val = Number(localStorage.getItem("jacs_batch_concurrency"));
    return val >= 1 && val <= 10 ? val : 3;
  });

  // Audio & Hook Mix Controls
  const [narratorEnabled, setNarratorEnabled] = useState<boolean>(() => {
    return localStorage.getItem("jacs_narrator_enabled") !== "false";
  });
  const [removeOriginalBgm, setRemoveOriginalBgm] = useState<boolean>(() => {
    return localStorage.getItem("jacs_remove_original_bgm") === "true";
  });
  const [interweaveAudio, setInterweaveAudio] = useState<boolean>(() => {
    return localStorage.getItem("jacs_interweave_audio") !== "false";
  });
  const [emphasizeHook, setEmphasizeHook] = useState<boolean>(() => {
    return localStorage.getItem("jacs_emphasize_hook") !== "false";
  });
  const [autoDucking, setAutoDucking] = useState<boolean>(() => {
    return localStorage.getItem("jacs_auto_ducking") !== "false";
  });

  const updateNarratorEnabled = (val: boolean) => {
    setNarratorEnabled(val);
    try { localStorage.setItem("jacs_narrator_enabled", String(val)); } catch {}
  };

  const updateRemoveOriginalBgm = (val: boolean) => {
    setRemoveOriginalBgm(val);
    try { localStorage.setItem("jacs_remove_original_bgm", String(val)); } catch {}
  };

  const updateInterweaveAudio = (val: boolean) => {
    setInterweaveAudio(val);
    try { localStorage.setItem("jacs_interweave_audio", String(val)); } catch {}
  };

  const updateEmphasizeHook = (val: boolean) => {
    setEmphasizeHook(val);
    try { localStorage.setItem("jacs_emphasize_hook", String(val)); } catch {}
  };

  const updateAutoDucking = (val: boolean) => {
    setAutoDucking(val);
    try { localStorage.setItem("jacs_auto_ducking", String(val)); } catch {}
  };

  const updateDurationMode = (mode: "rules" | "fixed") => {
    setDurationMode(mode);
    try { localStorage.setItem("jacs_duration_mode", mode); } catch {}
  };

  const updateDurationRules = (rules: DurationMappingRule[]) => {
    setDurationRules(rules);
    try { localStorage.setItem("jacs_duration_rules", JSON.stringify(rules)); } catch {}
  };

  const updateUseProviderPool = (use: boolean) => {
    setUseProviderPool(use);
    try { localStorage.setItem("jacs_use_provider_pool", String(use)); } catch {}
  };

  const updateBatchConcurrency = (c: number) => {
    const safe = Math.max(1, Math.min(10, c));
    setBatchConcurrency(safe);
    try { localStorage.setItem("jacs_batch_concurrency", String(safe)); } catch {}
  };

  const handleAddDurationRule = () => {
    const last = durationRules[durationRules.length - 1];
    const minM = last ? last.maxInputMinutes : 0;
    const maxM = minM + 15;
    const targetM = last ? last.targetOutputMinutes + 3 : 3;
    const newRule: DurationMappingRule = {
      id: `rule-${Date.now()}`,
      minInputMinutes: minM,
      maxInputMinutes: maxM,
      targetOutputMinutes: targetM,
      label: `${minM} - ${maxM} phút`,
    };
    updateDurationRules([...durationRules, newRule]);
  };

  const handleUpdateDurationRule = (id: string, updates: Partial<DurationMappingRule>) => {
    const updated = durationRules.map((r) => (r.id === id ? { ...r, ...updates } : r));
    updateDurationRules(updated);
  };

  const handleDeleteDurationRule = (id: string) => {
    if (durationRules.length <= 1) {
      showToast("⚠️ Cần giữ lại ít nhất 1 quy tắc thời lượng.");
      return;
    }
    updateDurationRules(durationRules.filter((r) => r.id !== id));
  };

  const handleResetDurationRules = () => {
    updateDurationRules(DEFAULT_DURATION_RULES);
    showToast("✓ Đã khôi phục bảng quy tắc thời lượng mặc định.");
  };

  function getEffectivePromptWithDuration(
    promptText: string,
    mode: "rules" | "fixed",
    durationKey: "full" | "60s" | "3m" | "5m" | "10m" | "15m" | "custom",
    customMins: number
  ): string {
    let finalPrompt = promptText.trim();
    if (mode === "rules") {
      finalPrompt += `\n\n# YÊU CẦU THỜI LƯỢNG KỊCH BẢN TỰ ĐỘNG THEO ĐỘ DÀI VIDEO GỐC:
1. THỜI LƯỢNG: Phân bổ và viết kịch bản voice-over phân cảnh có thời lượng đọc tối ưu tương ứng với độ dài của video nguồn. Tập trung vào các tình tiết cao trào, mâu thuẫn và đắt giá nhất.
2. TỰ ĐỘNG CẮT GHÉP VIDEO KHỚP LỜI KỂ: Với từng phân cảnh trong mảng "scenes", hãy nhặt đúng mốc thời gian "source_start" và "source_end" từ video gốc có hình ảnh, hành động, nét mặt hoặc tình huống thể hiện chính xác nội dung câu kể voice-over đó. Hệ thống sẽ tự động cắt và ráp video timeline khớp từng giây với lời thoại.`;
    } else if (durationKey !== "full") {
      const durationDesc =
        durationKey === "60s"
          ? "khoảng 60 giây (tổng số từ kịch bản khoảng 180 - 220 từ tiếng Việt chia đều thành 4 - 5 phân cảnh, tiết tấu dồn dập, giật gân, phù hợp video ngắn Shorts / TikTok / Reels)"
          : durationKey === "3m"
          ? "khoảng 3 phút (tổng số từ kịch bản khoảng 650 - 800 từ tiếng Việt chia đều thành 8 - 10 phân cảnh, tóm tắt cô đọng, giữ nhịp nhanh và lôi cuốn)"
          : durationKey === "5m"
          ? "khoảng 5 phút (tổng số từ kịch bản khoảng 1100 - 1350 từ tiếng Việt chia đều thành 12 - 16 phân cảnh, chuẩn review phim / phóng sự chuyên nghiệp)"
          : durationKey === "10m"
          ? "khoảng 10 phút (tổng số từ kịch bản khoảng 2200 - 2600 từ tiếng Việt chia đều thành 22 - 28 phân cảnh, mỗi phân cảnh dài 85 - 110 từ, phân tích sâu sắc toàn diện)"
          : durationKey === "15m"
          ? "khoảng 15 phút (tổng số từ kịch bản khoảng 3300 - 3800 từ tiếng Việt chia đều thành 32 - 38 phân cảnh, mỗi phân cảnh dài 90 - 115 từ, phân tích sâu sắc toàn diện tất cả các hồi và cao trào)"
          : `khoảng ${customMins} phút (tổng số từ kịch bản khoảng ${customMins * 230} từ tiếng Việt chia đều thành ${Math.max(4, Math.round(customMins * 2.4))} phân cảnh)`;

      finalPrompt += `\n\n# YÊU CẦU THỜI LƯỢNG KỊCH BẢN & TỰ ĐỘNG CẮT KHỚP CẢNH VIDEO (BẮT BUỘC):
1. THỜI LƯỢNG: Hãy phân tích và viết kịch bản voice-over phân cảnh sao cho tổng thời lượng đọc kịch bản kéo dài ${durationDesc}. Tập trung vào các tình tiết cao trào, mâu thuẫn và đắt giá nhất.
2. TỰ ĐỘNG CẮT GHÉP VIDEO KHỚP LỜI KỂ: Với từng phân cảnh trong mảng "scenes", hãy nhặt đúng mốc thời gian "source_start" và "source_end" từ video gốc có hình ảnh, hành động, nét mặt hoặc tình huống thể hiện chính xác nội dung câu kể voice-over đó. Hệ thống sẽ tự động cắt và ráp video timeline khớp từng giây với lời thoại.`;
    } else {
      finalPrompt += `\n\n# YÊU CẦU TỰ ĐỘNG CẮT GHÉP VIDEO KHỚP LỜI KỂ KỊCH TÍNH (BẮT BUỘC):
Với từng phân cảnh trong mảng "scenes", hãy nhặt đúng mốc thời gian "source_start" và "source_end" từ video gốc có hình ảnh/hành động kịch tính tương ứng với lời kể voice-over. Hệ thống sẽ tự động cắt các đoạn video này và ráp lên timeline khớp chuẩn xác với giọng đọc.`;
    }

    if (emphasizeHook) {
      finalPrompt += `\n\n# 🚨 ĐẶC BIỆT - PHÂN CẢNH 1 (HOOK CAO TRÀO 5-10S ĐẦU):
Hãy nhặt đúng khoảnh khắc giật gân, nghẹt thở và kịch tính nhất của video (tiếng còi hú, tiếng súng, tiếng rượt đuổi hoặc câu thoại đắt giá của nhân vật/cảnh sát). Viết câu kể ngắn gọn, đanh thép để tạo điểm nhấn giật hook giữ chân người xem ngay trong 5-10 giây đầu tiên.`;
    }

    if (!narratorEnabled) {
      finalPrompt += `\n\n# 🎬 CHẾ ĐỘ CẮT GHÉP HIGHLIGHT THUẦN TIẾNG GỐC (KHÔNG CẦN LỒNG TIẾNG VOICE AI):
1. NHIỆM VỤ: Hãy tìm và nhặt ra các phân cảnh kịch tính, dồn dập, đắt giá nhất của video gốc (cảnh sát rượt đuổi, còi hú, đối thoại gay cấn, tội phạm phản kháng, tiếng súng, tiếng hò hét).
2. TỪNG PHÂN CẢNH: Chỉ định chính xác mốc "source_start" và "source_end" của đoạn video gốc đó. Hệ thống sẽ tự động cắt các đoạn này và nối lại liền mạch với 100% âm thanh thực tế của hiện trường.
3. Trường "voiceover": Chỉ ghi mô tả ngắn sự kiện hoặc đối thoại có trong cảnh.`;
    }

    return finalPrompt;
  }

  // Global Progress & Real-time Batch State
  const [batchProgress, setBatchProgress] = useState<Record<string, { progress: number; stage: string }>>({});
  const [runningJobIds, setRunningJobIds] = useState<Set<string>>(new Set());

  // Modals state
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [analysisTargetJob, setAnalysisTargetJob] = useState<Job | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);
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
      .then((raw) => {
        const p = Array.isArray(raw) ? raw : [];
        setProviders(p);

        // Filter analysis-capable providers
        const analysisList = p.filter(
          (item) =>
            item &&
            item.enabled &&
            item.providerType !== "elevenlabs" &&
            !String(item.name || "").toLowerCase().includes("elevenlabs")
        );

        const savedProviderId = localStorage.getItem("jacs_default_analysis_provider_id");
        const matchingSaved = analysisList.find((item) => item.id === savedProviderId);

        const userByok = analysisList.find(
          (item) => item.hasApiKey && !item.isManaged
        );

        const active = matchingSaved || userByok || analysisList.find((item) => item.hasApiKey) || analysisList[0];

        if (active) {
          setDefaultProviderId(active.id);
          setSelectedModel(active.model || "");
        } else if (p.length > 0 && p[0]) {
          setDefaultProviderId(p[0].id);
          setSelectedModel(p[0].model || "");
        }
      })
      .catch(() => setProviders([]));
  }, []);

  const [syncingQuick, setSyncingQuick] = useState(false);
  async function handleQuickSync() {
    setSyncingQuick(true);
    try {
      const apiBase = String((import.meta as any).env?.VITE_API_URL || "https://jacs-studio.nexoratech.com.vn").replace(/\/$/, "");
      const res = await fetch(`${apiBase}/api/v1/ai-providers/models-available`, { signal: AbortSignal.timeout(6000) }).catch(() => null);
      if (res && res.ok) {
        const payload = await res.json();
        const available = payload?.data || [];
        if (Array.isArray(available) && available.length > 0) {
          await getRuntime().syncManagedProviders?.(available);
        }
      }
      const p = (await getRuntime().getProviderProfiles()) || [];
      setProviders(p);
      popup.success("Đồng bộ thành công", "Đã cập nhật danh sách AI Provider & Model mới nhất từ Cloud Admin.");
    } catch {
      popup.error("Lỗi đồng bộ", "Không thể kết nối Cloud Admin Gateway.");
    } finally {
      setSyncingQuick(false);
    }
  }

  // Filter active providers configured and enabled in system (excluding voice-only like ElevenLabs)
  const configuredProviders = useMemo(() => {
    const analysisList = (providers || []).filter(
      (p) =>
        p &&
        p.enabled &&
        p.providerType !== "elevenlabs" &&
        !String(p.name || "").toLowerCase().includes("elevenlabs")
    );
    // Sort: User's BYOK providers (hasApiKey & !isManaged) at the TOP, then Cloud Gateway
    return [...analysisList].sort((a, b) => {
      const aScore = (!a.isManaged && a.hasApiKey) ? 3 : (!a.isManaged ? 2 : (a.hasApiKey ? 1 : 0));
      const bScore = (!b.isManaged && b.hasApiKey) ? 3 : (!b.isManaged ? 2 : (b.hasApiKey ? 1 : 0));
      return bScore - aScore;
    });
  }, [providers]);

  // Selected pool keys state
  const [selectedPoolKeys, setSelectedPoolKeys] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("jacs_selected_pool_keys");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const togglePoolKey = (key: string) => {
    setSelectedPoolKeys((prev) => {
      let next: string[];
      if (prev.includes(key)) {
        next = prev.filter((k) => k !== key);
      } else {
        next = [...prev, key];
      }
      try { localStorage.setItem("jacs_selected_pool_keys", JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const selectAllPoolKeys = (allKeys: string[]) => {
    setSelectedPoolKeys(allKeys);
    try { localStorage.setItem("jacs_selected_pool_keys", JSON.stringify(allKeys)); } catch {}
  };

  const clearAllPoolKeys = () => {
    setSelectedPoolKeys(["__NONE__"]);
    try { localStorage.setItem("jacs_selected_pool_keys", JSON.stringify(["__NONE__"])); } catch {}
  };

  // Full available pool items across all configured and managed providers of the tool
  const allAvailablePoolItems = useMemo<ProviderPoolItem[]>(() => {
    const list: ProviderPoolItem[] = [];
    const seen = new Set<string>();

    for (const p of configuredProviders) {
      if (p && p.enabled && (p.hasApiKey || p.isManaged)) {
        const brand = getProviderBrandType(p);
        const brandName =
          brand === "gemini"
            ? "Google Gemini"
            : brand === "anthropic"
            ? "Anthropic Claude"
            : brand === "deepseek"
            ? "DeepSeek"
            : brand === "groq"
            ? "Groq Cloud"
            : "OpenAI";
        const cleanName = p.isManaged ? `👑 ${brandName} (Cloud)` : `${brandName} (BYOK)`;
        const pModel = p.model || (brand === "gemini" ? "gemini-2.5-flash" : brand === "anthropic" ? "claude-3-7-sonnet" : brand === "deepseek" ? "deepseek-chat" : "gpt-5.6-sol");
        const key = `${p.id}:${pModel}`;
        if (!seen.has(key)) {
          seen.add(key);
          list.push({
            providerId: p.id,
            model: pModel,
            name: cleanName,
            providerType: brand,
          });
        }
      }
    }
    return list;
  }, [configuredProviders]);

  // Active Provider Pool for Round-Robin load balancing & Auto-failover
  const activeProviderPool = useMemo<ProviderPoolItem[]>(() => {
    if (!selectedPoolKeys || selectedPoolKeys.length === 0) {
      return allAvailablePoolItems;
    }
    if (selectedPoolKeys.includes("__NONE__") && selectedPoolKeys.length === 1) {
      return allAvailablePoolItems.length > 0 ? [allAvailablePoolItems[0]] : [];
    }
    const filtered = allAvailablePoolItems.filter((item) => {
      const key = `${item.providerId}:${item.model}`;
      return selectedPoolKeys.includes(key) || selectedPoolKeys.includes(item.providerId);
    });
    return filtered.length > 0 ? filtered : allAvailablePoolItems;
  }, [allAvailablePoolItems, selectedPoolKeys]);

  // Selected Provider & Models
  const selectedProvider = useMemo(() => {
    return configuredProviders.find((p) => p.id === defaultProviderId) || configuredProviders[0] || (providers && providers[0]);
  }, [configuredProviders, providers, defaultProviderId]);

  const availableModels = useMemo(() => {
    const brand = getProviderBrandType(selectedProvider);
    const presets = PROVIDER_MODEL_PRESETS[brand] || PROVIDER_MODEL_PRESETS.gemini || [];
    const currentModel = selectedProvider?.model;

    // Merge with models returned from cloud models endpoint
    const cloudList = (cloudModels || []).filter((m) => {
      const mStr = `${m.provider_name || ""} ${m.model || ""} ${m.provider_type || ""}`.toLowerCase();
      if (brand === "gemini") return mStr.includes("gemini") || mStr.includes("google");
      if (brand === "anthropic") return mStr.includes("claude") || mStr.includes("anthropic") || mStr.includes("opus") || mStr.includes("sonnet");
      if (brand === "deepseek") return mStr.includes("deepseek");
      if (brand === "groq") return mStr.includes("groq") || mStr.includes("llama");
      return !mStr.includes("gemini") && !mStr.includes("claude") && !mStr.includes("deepseek") && !mStr.includes("groq");
    });

    const merged = [...presets];
    for (const cm of cloudList) {
      if (cm.model && !merged.some((m) => m.label === cm.model)) {
        merged.push({
          label: cm.model,
          tag: cm.purpose || `⭐ [${cm.provider_name || "Cloud"}] Đã cấp phép`,
        });
      }
    }

    if (currentModel && !merged.some((m) => m.label === currentModel)) {
      return [{ label: currentModel, tag: "⭐ Mô hình đã chọn" }, ...merged];
    }
    return merged;
  }, [selectedProvider, cloudModels]);

  // Sync selectedModel whenever selectedProvider changes
  useEffect(() => {
    if (selectedProvider) {
      setSelectedModel(selectedProvider.model || "");
    }
  }, [selectedProvider?.id, selectedProvider?.model]);

  function handleSelectProvider(id: string) {
    setDefaultProviderId(id);
    try { localStorage.setItem("jacs_default_analysis_provider_id", id); } catch {}
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
          capabilities: Array.isArray(selectedProvider.capabilities) ? selectedProvider.capabilities : ["analysis", "vision"],
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
          capabilities: Array.isArray(selectedProvider.capabilities) ? selectedProvider.capabilities : ["analysis", "vision"],
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
        capabilities: Array.isArray(selectedProvider.capabilities) && selectedProvider.capabilities.length ? selectedProvider.capabilities : ["analysis", "vision"],
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

  const openAnalysisConfigForJob = (job: Job) => {
    setAnalysisTargetJob(job);
    if (job.providerId) setDefaultProviderId(job.providerId);
    if (job.customPrompt) setDefaultPrompt(job.customPrompt);
    if (job.languages?.[0]) setDefaultLanguage(job.languages[0]);
    setShowBatchModal(true);
  };

  const openBatchAnalysisModal = () => {
    setAnalysisTargetJob(null);
    setShowBatchModal(true);
  };

  async function runAnalysisForJob(
    job: Job,
    overrideProviderId?: string,
    overridePrompt?: string,
    overrideVoice?: string,
    overrideLang?: string,
    overrideDurationRules?: DurationMappingRule[],
    overrideProviderPool?: ProviderPoolItem[]
  ) {
    const analyzeVideo = getRuntime().analyzeVideo;
    if (!analyzeVideo) {
      showToast("⚠️ Hãy chọn video trong bản Electron Desktop đã cài đặt.");
      return;
    }

    const pId = overrideProviderId || defaultProviderId || job.providerId;
    const voice = overrideVoice || defaultVoiceId || (job.narratorVoice && !job.narratorVoice.startsWith("en-") ? job.narratorVoice : "vi-adam-review");
    const lang = overrideLang || defaultLanguage || "vi";
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

    const targetMins = targetDuration === "full"
      ? (job.durationSeconds && job.durationSeconds > 10 ? Math.ceil(job.durationSeconds / 60) : 10)
      : targetDuration === "60s"
      ? 1
      : targetDuration === "3m"
      ? 3
      : targetDuration === "5m"
      ? 5
      : targetDuration === "10m"
      ? 10
      : targetDuration === "15m"
      ? 15
      : (customDurationMinutes || 5);
    const effectivePrompt = getEffectivePromptWithDuration(prompt, durationMode, targetDuration, customDurationMinutes);
    const rules = overrideDurationRules ?? (durationMode === "rules" ? durationRules : undefined);
    const pool = overrideProviderPool ?? (useProviderPool ? activeProviderPool : undefined);

    try {
      const analysis = await analyzeVideo(targetFile, pId || "", opId, {
        languages: [lang],
        narratorEnabled: narratorEnabled,
        narratorGender: "male",
        narratorVoice: voice,
        keepOriginalAudio: !narratorEnabled ? true : interweaveAudio,
        interweaveAudio: narratorEnabled && interweaveAudio,
        originalAudioVolume: !narratorEnabled ? 100 : (interweaveAudio ? 20 : 0),
        autoDucking: autoDucking,
        emphasizeHook: emphasizeHook,
        removeOriginalBgm: removeOriginalBgm,
        isolateVocals: removeOriginalBgm,
        customPrompt: effectivePrompt.trim() || undefined,
        targetDurationMinutes: targetMins,
        durationMode: durationMode,
        durationRules: rules,
        providerPool: pool,
        analysisMode: narratorEnabled ? "story_recap" : "highlight_clips",
      });

      const newName = (analysis as any).videoTitle || job.name;
      if (onUpdateJob) {
        onUpdateJob(job.id, {
          name: newName,
          videoTitle: (analysis as any).videoTitle,
          suggestedTitles: (analysis as any).suggestedTitles,
          status: "completed",
          stage: "completed",
          progress: 100,
          analysis,
          narratorEnabled: narratorEnabled,
          narratorVoice: voice,
          languages: [lang],
          keepOriginalAudio: !narratorEnabled ? true : interweaveAudio,
          interweaveAudio: narratorEnabled && interweaveAudio,
          originalAudioVolume: !narratorEnabled ? 100 : (interweaveAudio ? 20 : 0),
          autoDucking: autoDucking,
          emphasizeHook: emphasizeHook,
          removeOriginalBgm: removeOriginalBgm,
          isolateVocals: removeOriginalBgm,
          customPrompt: prompt,
        });
      }
      setExpandedJobIds((prev) => new Set(prev).add(job.id));
      showToast(`🎉 Phân tích AI thành công: ${newName} (${analysis.scenes?.length || 0} phân cảnh)`);
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
    lang: string
  ) {
    setShowBatchModal(false);
    const targetIds = selectedJobIds.size > 0 ? Array.from(selectedJobIds) : sourceCandidates.map((j) => j.id);
    const targetJobs = sourceCandidates.filter((j) => targetIds.includes(j.id));

    if (!targetJobs.length) {
      showToast("⚠️ Không có video nào được chọn để phân tích.");
      return;
    }

    const concurrency = useProviderPool ? Math.max(1, Math.min(5, batchConcurrency)) : 1;
    const poolInfo = useProviderPool && activeProviderPool.length > 0 ? ` [${activeProviderPool.length} AI Models Pool]` : "";
    showToast(`🚀 Bắt đầu phân tích AI cho ${targetJobs.length} video (${concurrency} luồng song song${poolInfo})...`);

    const pool = useProviderPool ? activeProviderPool : undefined;
    const rules = durationMode === "rules" ? durationRules : undefined;
    let nextJobIndex = 0;

    const runWorker = async () => {
      while (nextJobIndex < targetJobs.length) {
        const currentIdx = nextJobIndex++;
        const job = targetJobs[currentIdx];
        const assignedProviderId = pool && pool.length > 0
          ? pool[currentIdx % pool.length].providerId
          : pId;

        await runAnalysisForJob(
          job,
          assignedProviderId,
          prompt,
          undefined,
          lang,
          rules,
          pool
        );
      }
    };

    const workerPromises = Array.from({ length: Math.min(concurrency, targetJobs.length) }, () => runWorker());
    await Promise.all(workerPromises);

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
      onUpdateJob(job.id, {
        timelineClips: clips,
        narratorEnabled: job.narratorEnabled ?? narratorEnabled,
        keepOriginalAudio: job.keepOriginalAudio ?? (!narratorEnabled ? true : interweaveAudio),
        interweaveAudio: job.interweaveAudio ?? (narratorEnabled && interweaveAudio),
        originalAudioVolume: job.originalAudioVolume ?? (!narratorEnabled ? 100 : (interweaveAudio ? 20 : 0)),
        autoDucking: job.autoDucking ?? autoDucking,
        emphasizeHook: job.emphasizeHook ?? emphasizeHook,
        removeOriginalBgm: job.removeOriginalBgm ?? removeOriginalBgm,
        isolateVocals: job.isolateVocals ?? removeOriginalBgm,
      });
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
        const fileName = (p ? String(p).split(/[\\/]/).pop() : "") || "Video";
        const id = `job-source-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        if (onAddJob) {
          onAddJob({
            id,
            name: fileName.replace(/\.[^.]+$/, ""),
            source: p,
            sourceType: "file",
            localPath: p,
            sourceOnly: true,
            mode: "local-gpu",
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
          mode: "local-gpu",
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

  async function handleDeleteSelected() {
    if (!selectedJobIds.size) return;
    const ids = Array.from(selectedJobIds);
    const confirmed = await popup.confirmDelete(
      "Xác Nhận Xóa Video",
      `Bạn có chắc chắn muốn xóa ${ids.length} video đã chọn khỏi danh sách không?`
    );
    if (confirmed) {
      if (onDeleteSources) onDeleteSources(ids);
      else if (onDeleteJobs) onDeleteJobs(ids);
      setSelectedJobIds(new Set());
      popup.success(`Đã xóa ${ids.length} video thành công!`);
    }
  }

  function handleSaveEditedScene(updatedScene: AnalysisScene) {
    if (!editingSceneInfo) return;
    const { jobId, sceneIdx } = editingSceneInfo;
    const job = sourceCandidates.find((j) => j.id === jobId);
    if (!job || !job.analysis) return;

    const cleanVoice = String(updatedScene.voiceover || updatedScene.translation || updatedScene.detail || "").trim();
    const syncedScene: AnalysisScene = {
      ...updatedScene,
      voiceover: cleanVoice,
      translation: cleanVoice,
      ...(updatedScene as any),
    };

    const nextScenes = [...(job.analysis.scenes || [])];
    nextScenes[sceneIdx] = syncedScene;

    const fullScript = nextScenes.map((s) => s.voiceover || s.translation || "").filter(Boolean).join(" ");
    const nextAnalysis: AnalysisResult = {
      ...job.analysis,
      scenes: nextScenes,
      voiceScript: fullScript,
    };

    if (onUpdateJob) {
      onUpdateJob(job.id, {
        analysis: nextAnalysis,
        narrationText: fullScript,
        subtitleText: fullScript,
      });
    }

    setEditingSceneInfo(null);
    showToast(`✓ Đã cập nhật phân cảnh Cảnh #${sceneIdx + 1} thành công!`);
  }

  async function handleDeleteScene(jobId: string, sceneIdx: number) {
    const job = sourceCandidates.find((j) => j.id === jobId);
    if (!job || !job.analysis) return;

    const confirmed = await popup.confirmDelete(
      "Xóa Phân Cảnh",
      `Bạn có chắc muốn xóa phân cảnh Cảnh #${sceneIdx + 1} này không?`
    );
    if (confirmed) {
      const nextScenes = (job.analysis.scenes || []).filter((_, idx) => idx !== sceneIdx);
      const nextAnalysis: AnalysisResult = {
        ...job.analysis,
        scenes: nextScenes,
      };
      if (onUpdateJob) {
        onUpdateJob(job.id, { analysis: nextAnalysis });
      }
      popup.success("Đã xóa phân cảnh");
    }
  }

  function handlePreviewVoice(_jobId: string, _sceneId: string, text?: string) {
    const rawClean = String(text || "")
      .replace(/\[\s*(?:Phân cảnh|Cảnh|Scene|Segment|Part|Hồi)\s*\d+[^\]]*\]/gi, "")
      .replace(/(?:^|\n)\s*(?:Phân cảnh|Cảnh|Scene|Segment|Part|Hồi)\s*\d+[:\-\.]\s*/gi, " ")
      .replace(/\[\d{1,2}[:.]\d{2}(?:[:.]\d{2})?\s*-\s*\d{1,2}[:.]\d{2}(?:[:.]\d{2})?\]/g, "")
      .replace(/\(\d{1,2}[:.]\d{2}(?:[:.]\d{2})?\s*-\s*\d{1,2}[:.]\d{2}(?:[:.]\d{2})?\)/g, "")
      .replace(/(?:tại|ở|từ)\s+mốc\s+\d{1,2}[:.]\d{2}(?:\s*đến\s+\d{1,2}[:.]\d{2})?,?\s*/gi, "")
      .replace(/(?:vào\s+)?lúc\s+\d{1,2}[:.]\d{2},?\s*/gi, "")
      .replace(/\(\d{1,2}[:.]\d{2}\)/g, "")
      .replace(/\[[^\]]{1,60}\]/g, "")
      .replace(/#\d+\b/g, "")
      .replace(/["'“”«»‘’`\\{}[\]^~*#_<>]/g, "")
      .replace(/\.{2,}/g, ".")
      .replace(/,{2,}/g, ",")
      .replace(/\s+/g, " ")
      .trim();

    if (!rawClean) return;
    try {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(rawClean);
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
    <div className="analysis-workspace-root animate-fade-in" style={{ padding: "8px 14px 78px 14px", width: "100%", margin: 0, height: "100%", flex: "1 1 0%", minHeight: 0, display: "flex", flexDirection: "column", boxSizing: "border-box", overflow: "hidden" }}>
      
      {/* 1. Unified Studio Control Toolbar */}
      <div style={{ background: "rgba(18, 22, 32, 0.8)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "8px", padding: "6px 12px", marginBottom: "6px", display: "flex", flexDirection: "column", gap: "6px", flexShrink: 0 }}>
        
        {/* Row 1: AI Model & Clean Script Style Dropdown & Action Buttons */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
          
          {/* AI Model & Key Status */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0, flexWrap: "wrap" }}>
            <span style={{ fontSize: "11px", fontWeight: 800, color: "#cbd5e1", display: "flex", alignItems: "center", gap: "4px", textTransform: "uppercase", letterSpacing: "0.4px" }}>
              <CpuFill size={11} color="#fbbf24" /> AI MODEL:
            </span>
            
            <select
              value={defaultProviderId}
              onChange={(e) => handleSelectProvider(e.target.value)}
              style={{ background: "#10131c", border: "1px solid rgba(255, 255, 255, 0.12)", borderRadius: "5px", padding: "4px 8px", color: "#f8fafc", fontSize: "11.5px", outline: "none", cursor: "pointer", maxWidth: "220px" }}
              title="Chọn Nhà cung cấp AI"
            >
              {configuredProviders.map((p) => {
                const name = p.name || p.providerType.toUpperCase();
                return (
                  <option key={p.id} value={p.id}>
                    {name} {p.hasApiKey ? "🟢" : "🟡"} ({selectedModel || p.model})
                  </option>
                );
              })}
            </select>

            {/* Quick Model Selector with Recommendations */}
            <select
              value={selectedModel || selectedProvider?.model || ""}
              onChange={(e) => handleSelectModel(e.target.value)}
              style={{ background: "#10131c", border: "1px solid rgba(245, 158, 11, 0.25)", borderRadius: "5px", padding: "4px 8px", color: "#fbbf24", fontSize: "11.5px", fontWeight: 700, outline: "none", cursor: "pointer", maxWidth: "260px" }}
              title="Chọn Model chuyên phân tích video"
            >
              {availableModels.map((m) => (
                <option key={m.label} value={m.label}>
                  {m.label} {m.tag ? `— ${m.tag}` : ""}
                </option>
              ))}
            </select>

            {/* Quick API Key Action */}
            {selectedProvider?.hasApiKey ? (
              <span style={{ fontSize: "10px", color: "#fbbf24", background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.25)", padding: "2px 6px", borderRadius: "4px", fontWeight: 700 }} title={`API Key: ${selectedProvider.maskedKey}`}>
                ✓ Key Sẵn Sàng
              </span>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setApiKeyInput("");
                  setShowApiKeyModal(true);
                }}
                style={{ background: "rgba(245, 158, 11, 0.15)", border: "1px solid rgba(245, 158, 11, 0.4)", color: "#fbbf24", padding: "2px 8px", borderRadius: "4px", fontSize: "10.5px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "3px" }}
              >
                <KeyFill size={10} /> Nhập Key
              </button>
            )}

            <button
              type="button"
              onClick={handleQuickSync}
              disabled={syncingQuick}
              style={{ background: "transparent", border: "none", color: syncingQuick ? "#fbbf24" : "#94a3b8", padding: "2px", cursor: syncingQuick ? "not-allowed" : "pointer", display: "flex", alignItems: "center" }}
              title="Đồng bộ Model từ Cloud Admin"
            >
              <ArrowRepeat size={12} className={syncingQuick ? "animate-spin" : ""} />
            </button>

            <button
              type="button"
              onClick={() => onNavigate?.("settings")}
              style={{ background: "transparent", border: "none", color: "#64748b", padding: "2px", cursor: "pointer", display: "flex", alignItems: "center" }}
              title="Cài đặt Provider"
            >
              <GearFill size={11} />
            </button>
          </div>

          {/* Clean Script Style Dropdown & Prompt Customizer Button */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0, flexWrap: "wrap" }}>
            <span style={{ fontSize: "10.5px", fontWeight: 800, color: "#94a3b8", display: "flex", alignItems: "center", gap: "3px", textTransform: "uppercase" }}>
              <Stars size={11} color="#fbbf24" /> KỊCH BẢN:
            </span>

            <select
              value={PRESET_PROMPTS.find((p) => p.prompt === defaultPrompt)?.id || PRESET_PROMPTS[0].id}
              onChange={(e) => {
                const found = PRESET_PROMPTS.find((p) => p.id === e.target.value);
                if (found) {
                  setDefaultPrompt(found.prompt);
                  showToast(`✓ Đã chọn phong cách: ${found.title}`);
                }
              }}
              style={{
                background: "#10131c",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                borderRadius: "5px",
                padding: "4px 8px",
                color: "#fbbf24",
                fontSize: "11.5px",
                fontWeight: 700,
                outline: "none",
                cursor: "pointer",
                maxWidth: "320px",
              }}
              title="Chọn phong cách biên kịch phân cảnh"
            >
              {PRESET_PROMPTS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setShowPromptModal(true)}
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "#cbd5e1",
                padding: "4px 8px",
                borderRadius: "5px",
                fontSize: "11px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                transition: "all 0.15s ease",
              }}
              title="Xem và chỉnh sửa prompt kịch bản chi tiết"
            >
              <PencilSquare size={11} color="#fbbf24" /> Tùy Chỉnh Prompt
            </button>
          </div>

          {/* Primary Action Buttons */}
          <div style={{ display: "flex", gap: "6px", alignItems: "center", flexShrink: 0 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowAddModal(true)}
              style={{ display: "flex", alignItems: "center", gap: "5px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#f8fafc", padding: "5px 11px", borderRadius: "6px", fontSize: "11.5px", fontWeight: 700, cursor: "pointer", transition: "all 0.15s ease" }}
            >
              <PlusLg size={12} /> Thêm Video Nguồn
            </button>
            
            <button
              type="button"
              className="btn btn-primary"
              onClick={openBatchAnalysisModal}
              style={{ display: "flex", alignItems: "center", gap: "5px", background: "linear-gradient(135deg, #d97706, #f59e0b)", border: "none", color: "#12151f", padding: "5px 13px", borderRadius: "6px", fontSize: "11.5px", fontWeight: 800, cursor: "pointer", boxShadow: "0 0 14px rgba(245, 158, 11, 0.35)", transition: "all 0.15s ease" }}
            >
              <LightningChargeFill size={12} /> Phân Tích Hàng Loạt ({selectedJobIds.size > 0 ? selectedJobIds.size : sourceCandidates.length})
            </button>
          </div>

        </div>
            


        {/* Row 2: Search, Status Pills & Sorting */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", flexWrap: "wrap", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "7px" }}>
          
          {/* Search Box */}
          <div style={{ position: "relative", flex: "1 1 200px", maxWidth: "340px" }}>
            <Search size={12} style={{ position: "absolute", left: "9px", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm tên video, kịch bản, cảnh..."
              style={{ width: "100%", background: "rgba(0, 0, 0, 0.35)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "5px", padding: "4px 8px 4px 28px", color: "#f8fafc", fontSize: "11.5px", outline: "none" }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{ position: "absolute", right: "7px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#64748b", cursor: "pointer" }}
              >
                <XLg size={10} />
              </button>
            )}
          </div>

          {/* Filter Status Pills & Selects */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
            
            {/* Status Pills */}
            <div style={{ display: "flex", background: "rgba(0,0,0,0.3)", padding: "2px", borderRadius: "5px", border: "1px solid rgba(255,255,255,0.05)" }}>
              {[
                { key: "all", label: `Tất Cả (${sourceCandidates.length})` },
                { key: "completed", label: `Đã Xong (${completedCount})` },
                { key: "running", label: `Đang Chạy (${runningCount})` },
                { key: "queued", label: "Chờ" },
              ].map((st) => (
                <button
                  key={st.key}
                  type="button"
                  onClick={() => setFilterStatus(st.key as any)}
                  style={{
                    background: filterStatus === st.key ? "rgba(245, 158, 11, 0.2)" : "transparent",
                    color: filterStatus === st.key ? "#fbbf24" : "#94a3b8",
                    border: filterStatus === st.key ? "1px solid rgba(245, 158, 11, 0.35)" : "1px solid transparent",
                    padding: "2px 7px",
                    borderRadius: "4px",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {st.label}
                </button>
              ))}
            </div>

            {/* Category / Genre Filter */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "5px", padding: "3px 8px", color: "#f8fafc", fontSize: "11.5px", outline: "none", cursor: "pointer" }}
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
              style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "5px", padding: "3px 8px", color: "#f8fafc", fontSize: "11.5px", outline: "none", cursor: "pointer" }}
            >
              <option value="latest">Mới nhất</option>
              <option value="name">Tên video (A-Z)</option>
              <option value="duration">Thời lượng</option>
              <option value="scenes">Số phân cảnh</option>
              <option value="score">Điểm AI cao nhất</option>
            </select>
          </div>

        </div>

        {/* Dynamic Batch Action Banner (Only visible when items selected) */}
        {selectedJobIds.size > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "linear-gradient(90deg, rgba(217, 119, 6, 0.15), rgba(245, 158, 11, 0.15))", border: "1px solid rgba(245, 158, 11, 0.4)", borderRadius: "6px", padding: "5px 10px", flexWrap: "wrap", gap: "6px", marginTop: "2px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "12px", fontWeight: 800, color: "#fbbf24" }}>
                ✓ Đã chọn {selectedJobIds.size} video
              </span>
              <button
                type="button"
                onClick={() => setSelectedJobIds(new Set())}
                style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "11px", textDecoration: "underline", cursor: "pointer" }}
              >
                Bỏ chọn
              </button>
            </div>

            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={openBatchAnalysisModal}
                style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)", color: "#12151f", border: "none", padding: "3px 10px", borderRadius: "5px", fontSize: "11px", fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
              >
                <LightningChargeFill size={11} /> Phân Tích AI ({selectedJobIds.size})
              </button>
              <button
                type="button"
                onClick={handleDeleteSelected}
                style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.4)", color: "#f87171", padding: "3px 10px", borderRadius: "5px", fontSize: "11px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
              >
                <Trash3Fill size={11} /> Xóa ({selectedJobIds.size})
              </button>
            </div>
          </div>
        )}

      </div>

      {/* 3. Main Workspace: Hierarchical Master-Detail Table */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, background: "rgba(18, 21, 31, 0.75)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "10px", overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }}>
        
        {/* Table Header: Sticky at top */}
        <div style={{ display: "grid", gridTemplateColumns: "36px 36px minmax(240px, 1.8fr) 150px 140px 90px 220px", padding: "10px 14px", background: "rgba(26, 30, 43, 0.8)", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", fontSize: "11px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", alignItems: "center", flexShrink: 0 }}>
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

        {/* Table Body: Smooth Internal Scroll Container */}
        <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", minHeight: 0, scrollbarWidth: "thin", scrollbarColor: "rgba(245, 158, 11, 0.3) transparent" }}>
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
              style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)", border: "none", color: "#12151f", padding: "7px 16px", borderRadius: "7px", fontSize: "12.5px", fontWeight: 800, cursor: "pointer" }}
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
                    background: isRunning ? "rgba(245, 158, 11, 0.05)" : isSelected ? "rgba(217, 119, 6, 0.08)" : isExpanded ? "rgba(255, 255, 255, 0.02)" : "transparent",
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
                        background: isExpanded ? "rgba(245, 158, 11, 0.15)" : "rgba(255,255,255,0.06)",
                        color: isExpanded ? "#fbbf24" : "#94a3b8",
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
                        background: "#10131c",
                        border: "1px solid rgba(255,255,255,0.12)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fbbf24",
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
                          const assignedProvider = (Array.isArray(providers) ? providers : []).find((p) => p && p.id === (job.providerId || defaultProviderId)) || selectedProvider;
                          const providerShortName = assignedProvider?.name ? assignedProvider.name.split(" ")[0] : (assignedProvider?.id || "AI");
                          const modelName = assignedProvider?.model || "Auto";
                          return (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.25)", color: "#fbbf24", padding: "1px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: 700 }}>
                              <CpuFill size={9} /> {assignedProvider ? `${providerShortName} · ${modelName}` : "AI Auto"}
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
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10.5px", fontWeight: 700, color: "#fbbf24", marginBottom: "3px" }}>
                          <span>⚡ Đang phân tích...</span>
                          <span>{prog.progress}%</span>
                        </div>
                        <div style={{ width: "100%", height: "4px", background: "rgba(0,0,0,0.4)", borderRadius: "10px", overflow: "hidden" }}>
                          <div style={{ width: `${prog.progress}%`, height: "100%", background: "linear-gradient(90deg, #d97706, #f59e0b)", transition: "width 0.3s ease" }} />
                        </div>
                        <span style={{ fontSize: "9.5px", color: "#64748b", marginTop: "2px", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {prog.stage || "Đang xử lý khung hình..."}
                        </span>
                      </div>
                    ) : isCompleted ? (
                      <div>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "rgba(245, 158, 11, 0.12)", border: "1px solid rgba(245, 158, 11, 0.25)", color: "#fbbf24", padding: "2px 7px", borderRadius: "5px", fontSize: "11px", fontWeight: 700 }}>
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
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.08)", color: "#94a3b8", padding: "2px 7px", borderRadius: "5px", fontSize: "11px", fontWeight: 700 }}>
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
                          <div style={{ fontSize: "11.5px", fontWeight: 800, color: tokenInfo.isUsed ? "#fbbf24" : "#64748b" }}>
                            {tokenInfo.text}
                          </div>
                          <div style={{ fontSize: "10px", color: tokenInfo.isUsed ? "#94a3b8" : "#475569", fontWeight: 600 }}>
                            {tokenInfo.subText}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* AI Score */}
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "12.5px", fontWeight: 800, color: isCompleted ? "#fbbf24" : "#64748b" }}>
                      ⭐ {formatAiScore(job.analysis?.score)}
                    </div>
                  </div>

                  {/* Row Actions */}
                  <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "5px" }}>
                    
                    {/* Run Single Analysis Button */}
                    <button
                      type="button"
                      onClick={() => openAnalysisConfigForJob(job)}
                      disabled={isRunning}
                      style={{
                        background: isCompleted ? "rgba(245, 158, 11, 0.12)" : "linear-gradient(135deg, #d97706, #f59e0b)",
                        color: isCompleted ? "#fbbf24" : "#12151f",
                        border: isCompleted ? "1px solid rgba(245, 158, 11, 0.3)" : "none",
                        padding: "4px 8px",
                        borderRadius: "5px",
                        fontSize: "11px",
                        fontWeight: 700,
                        cursor: isRunning ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                      title="Cài đặt mô hình AI & phong cách để phân tích video này"
                    >
                      <LightningChargeFill size={11} /> {isRunning ? "Đang chạy..." : isCompleted ? "Chạy lại" : "Phân tích"}
                    </button>

                    {/* Export to Timeline */}
                    {isCompleted && (
                      <button
                        type="button"
                        onClick={() => handleExportToTimeline(job)}
                        style={{
                          background: "rgba(245, 158, 11, 0.12)",
                          border: "1px solid rgba(245, 158, 11, 0.3)",
                          color: "#fbbf24",
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
                      onClick={async () => {
                        const confirmed = await popup.confirmDelete(
                          "Xác Nhận Xóa Video",
                          `Bạn có chắc muốn xóa video "${job.name}" khỏi danh sách?`
                        );
                        if (confirmed) {
                          if (onDeleteSources) onDeleteSources([job.id]);
                          else if (onDeleteJobs) onDeleteJobs([job.id]);
                          popup.success(`Đã xóa video ${job.name}`);
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
                  <div style={{ background: "#0e111a", borderTop: "1px solid rgba(245, 158, 11, 0.2)", padding: "12px 16px 16px 36px" }}>
                    
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "13px" }}>🎬</span>
                        <strong style={{ fontSize: "12px", color: "#fbbf24", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          Danh Sách {scenes.length} Phân Cảnh Trích Xuất · {job.name}
                        </strong>
                      </div>

                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={() => handleExportToTimeline(job)}
                          style={{ background: "rgba(245, 158, 11, 0.15)", border: "1px solid rgba(245, 158, 11, 0.35)", color: "#fbbf24", padding: "3px 8px", borderRadius: "5px", fontSize: "11px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
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

                    {/* AI Video Title & Overview Story Banner */}
                    {job.analysis && (
                      <div style={{ background: "linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(15, 23, 42, 0.6))", border: "1px solid rgba(245, 158, 11, 0.25)", borderRadius: "8px", padding: "10px 14px", marginBottom: "12px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", flexWrap: "wrap", marginBottom: "6px" }}>
                          <div>
                            <div style={{ fontSize: "10px", fontWeight: 800, color: "#fbbf24", textTransform: "uppercase", letterSpacing: "0.5px", display: "flex", alignItems: "center", gap: "5px", marginBottom: "2px" }}>
                              <span>🎯</span> TIÊU ĐỀ VIDEO ĐỀ XUẤT (VIRAL VIDEO TITLE):
                            </div>
                            <div style={{ fontSize: "13.5px", fontWeight: 800, color: "#f8fafc", lineHeight: 1.35 }}>
                              {job.analysis?.videoTitle || job.name}
                            </div>
                          </div>
                        </div>

                        {/* Suggested Alternative Viral Titles */}
                        {Array.isArray(job.analysis?.suggestedTitles) && job.analysis.suggestedTitles.length > 0 && (
                          <div style={{ marginTop: "6px", display: "flex", flexWrap: "wrap", gap: "5px", alignItems: "center" }}>
                            <span style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 700 }}>💡 Tiêu đề gợi ý:</span>
                            {job.analysis.suggestedTitles.map((st, sIdx) => (
                              <button
                                key={sIdx}
                                type="button"
                                onClick={() => {
                                  if (onUpdateJob) onUpdateJob(job.id, { name: st, analysis: { ...job.analysis!, videoTitle: st } });
                                  showToast(`✓ Đã áp dụng tiêu đề: "${st}"`);
                                }}
                                style={{
                                  background: (job.analysis?.videoTitle || job.name) === st ? "rgba(245, 158, 11, 0.25)" : "rgba(255, 255, 255, 0.05)",
                                  border: (job.analysis?.videoTitle || job.name) === st ? "1px solid #fbbf24" : "1px solid rgba(255, 255, 255, 0.1)",
                                  color: (job.analysis?.videoTitle || job.name) === st ? "#fbbf24" : "#cbd5e1",
                                  fontSize: "10.5px",
                                  fontWeight: 600,
                                  padding: "2px 8px",
                                  borderRadius: "12px",
                                  cursor: "pointer",
                                }}
                                title="Bấm để chọn tiêu đề này làm tiêu đề chính của video"
                              >
                                {st}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Overall Story Summary */}
                        {job.analysis?.summary && (
                          <div style={{ marginTop: "8px", paddingTop: "6px", borderTop: "1px dashed rgba(255, 255, 255, 0.08)" }}>
                            <div style={{ fontSize: "9.5px", fontWeight: 800, color: "#38bdf8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "2px" }}>
                              📖 CỐT TRUYỆN TỔNG QUAN & MẠCH NỘI DUNG CLIP:
                            </div>
                            <p style={{ fontSize: "11px", color: "#94a3b8", margin: 0, lineHeight: 1.45 }}>
                              {job.analysis.summary}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {scenes.length === 0 ? (
                      <div style={{ padding: "20px", textAlign: "center", color: "#64748b", background: "rgba(0,0,0,0.2)", borderRadius: "6px", border: "1px dashed rgba(255,255,255,0.1)" }}>
                        <p style={{ margin: "0 0 8px", fontSize: "12.5px" }}>Video này chưa có phân cảnh nào được trích xuất.</p>
                        <button
                          type="button"
                          onClick={() => openAnalysisConfigForJob(job)}
                          style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)", color: "#12151f", border: "none", padding: "5px 12px", borderRadius: "5px", fontSize: "11.5px", fontWeight: 800, cursor: "pointer" }}
                        >
                          <LightningChargeFill size={11} /> Cài Đặt & Chạy Phân Tích AI
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
                                  background: "rgba(26, 30, 43, 0.6)",
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
                                  <span style={{ fontSize: "10.5px", fontWeight: 800, background: "rgba(245, 158, 11, 0.15)", color: "#fbbf24", padding: "1px 5px", borderRadius: "3px", display: "inline-block" }}>
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
                                  <div style={{ fontSize: "9.5px", fontWeight: 700, color: "#fbbf24", marginBottom: "1px", display: "flex", alignItems: "center", gap: "3px" }}>
                                    <ChatQuoteFill size={9} /> LỜI THOẠI LỒNG TIẾNG AI:
                                  </div>
                                  <p style={{ fontSize: "11px", color: "#e2e8f0", margin: 0, fontStyle: "italic", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                    "{voiceText || "Chưa có lời thoại thuyết minh..."}"
                                  </p>
                                </div>

                                {/* Scene Tag */}
                                <div>
                                  <span style={{ fontSize: "10px", fontWeight: 700, background: idx === 0 ? "rgba(245, 158, 11, 0.15)" : "rgba(255, 255, 255, 0.05)", color: idx === 0 ? "#fbbf24" : "#cbd5e1", border: idx === 0 ? "1px solid rgba(245, 158, 11, 0.3)" : "1px solid rgba(255, 255, 255, 0.08)", padding: "2px 7px", borderRadius: "6px", display: "inline-block", whiteSpace: "nowrap" }}>
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
                                      background: isPlayingThis ? "#ef4444" : "rgba(245, 158, 11, 0.12)",
                                      border: "1px solid rgba(245, 158, 11, 0.25)",
                                      color: isPlayingThis ? "#fff" : "#fbbf24",
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
                                      background: "rgba(245, 158, 11, 0.12)",
                                      border: "1px solid rgba(245, 158, 11, 0.25)",
                                      color: "#fbbf24",
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
                              <span style={{ fontSize: "11px", fontWeight: 700, color: "#fbbf24", padding: "0 4px" }}>
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
        </div>

        {/* Parent Video Pagination Footer: Pinned at bottom of table container */}
        {filteredVideos.length > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 14px", background: "rgba(26, 30, 43, 0.85)", borderTop: "1px solid rgba(255, 255, 255, 0.08)", flexWrap: "wrap", gap: "10px", flexShrink: 0 }}>
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
                style={{ background: "#10131c", border: "1px solid rgba(255, 255, 255, 0.12)", borderRadius: "5px", padding: "3px 6px", color: "#f8fafc", fontSize: "11px", outline: "none" }}
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

              <span style={{ fontSize: "11.5px", fontWeight: 800, color: "#fbbf24", padding: "0 4px" }}>
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
      </div>      {/* ========================================================================= */}
      {/* ACTION MODALS */}
      {/* ========================================================================= */}

      {/* MODAL 1: BATCH AI ANALYSIS SETTINGS MODAL */}
      {showBatchModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(3, 7, 18, 0.85)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999, padding: "24px 16px", boxSizing: "border-box" }}>
          <div style={{ background: "linear-gradient(180deg, #131724 0%, #0a0c14 100%)", border: "1px solid rgba(245, 158, 11, 0.32)", borderRadius: "18px", width: "100%", maxWidth: "820px", maxHeight: "92vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 25px 80px rgba(0,0,0,0.92), 0 0 50px rgba(245, 158, 11, 0.08)", boxSizing: "border-box" }}>
            
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 24px", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(18, 22, 34, 0.85)", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "linear-gradient(135deg, #d97706, #f59e0b)", color: "#12151f", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0, boxShadow: "0 0 18px rgba(245, 158, 11, 0.4)" }}>
                  <LightningChargeFill />
                </div>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#f8fafc", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {analysisTargetJob ? `Cài Đặt Phân Tích AI: ${analysisTargetJob.name}` : "Cài Đặt Phân Tích & Viết Kịch Bản AI Hàng Loạt"}
                  </h3>
                  <div style={{ fontSize: "12px", color: "#94a3b8", display: "flex", alignItems: "center", gap: "6px", marginTop: "3px" }}>
                    {analysisTargetJob ? (
                      <>Áp dụng cho video: <span style={{ color: "#fbbf24", fontWeight: 700 }}>{analysisTargetJob.name}</span></>
                    ) : (
                      <>Đang chọn: <span style={{ background: "rgba(245, 158, 11, 0.16)", color: "#fbbf24", padding: "1px 8px", borderRadius: "5px", fontWeight: 800, border: "1px solid rgba(245, 158, 11, 0.3)" }}>{selectedJobIds.size > 0 ? selectedJobIds.size : sourceCandidates.length} video</span> trong danh sách</>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowBatchModal(false);
                  setAnalysisTargetJob(null);
                }}
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", cursor: "pointer", flexShrink: 0, transition: "all 0.15s ease" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#f87171"; e.currentTarget.style.background = "rgba(239, 68, 68, 0.15)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "#94a3b8"; e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
              >
                <XLg size={14} />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (analysisTargetJob) {
                  setShowBatchModal(false);
                  runAnalysisForJob(
                    analysisTargetJob,
                    defaultProviderId,
                    defaultPrompt,
                    undefined,
                    defaultLanguage,
                    durationMode === "rules" ? durationRules : undefined,
                    useProviderPool ? activeProviderPool : undefined
                  );
                  setAnalysisTargetJob(null);
                } else {
                  handleStartBatchAnalysis(defaultProviderId, defaultPrompt, defaultLanguage);
                }
              }}
              style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, margin: 0 }}
            >
              <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "18px 22px", display: "flex", flexDirection: "column", gap: "14px", boxSizing: "border-box" }}>
                
                {/* SECTION 1: AI Provider & Multi-Model Pool (Cắm đêm) */}
                <div style={{ background: "rgba(18, 23, 35, 0.75)", border: "1px solid rgba(255, 255, 255, 0.09)", borderRadius: "12px", padding: "14px 16px", display: "flex", flexDirection: "column", gap: "11px" }}>
                  
                  {/* Switch Row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <CpuFill size={16} color="#fbbf24" />
                      <div>
                        <span style={{ fontSize: "13px", fontWeight: 800, color: "#f8fafc" }}>
                          1. Chế Độ AI Tự Động Luân Chuyển (Cắm Đêm Siêu Tốc)
                        </span>
                        <p style={{ fontSize: "11px", color: "#94a3b8", margin: "1px 0 0" }}>
                          Tự động chia tải và đảo model khi dính lỗi 429 hoặc nghẽn quota để cắm đêm liên tục
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => updateUseProviderPool(!useProviderPool)}
                      style={{
                        background: useProviderPool ? "linear-gradient(135deg, #d97706, #f59e0b)" : "rgba(255,255,255,0.07)",
                        color: useProviderPool ? "#12151f" : "#94a3b8",
                        border: useProviderPool ? "none" : "1px solid rgba(255,255,255,0.14)",
                        borderRadius: "20px",
                        padding: "5px 14px",
                        fontSize: "11px",
                        fontWeight: 800,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        boxShadow: useProviderPool ? "0 0 14px rgba(245, 158, 11, 0.35)" : "none",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: useProviderPool ? "#12151f" : "#64748b" }} />
                      {useProviderPool ? "TỰ ĐỘNG BẬT" : "ĐƠN MÔ HÌNH"}
                    </button>
                  </div>

                  {useProviderPool ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", paddingTop: "8px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                      {/* Concurrency Selector */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", background: "rgba(0,0,0,0.3)", padding: "8px 12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
                        <span style={{ fontSize: "11.5px", color: "#e2e8f0", fontWeight: 700 }}>
                          🚀 Tốc độ phân tích song song:
                        </span>
                        <div style={{ display: "flex", gap: "5px" }}>
                          {[1, 2, 3, 4, 5].map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => updateBatchConcurrency(c)}
                              style={{
                                background: batchConcurrency === c ? "linear-gradient(135deg, #d97706, #f59e0b)" : "rgba(255,255,255,0.06)",
                                color: batchConcurrency === c ? "#12151f" : "#cbd5e1",
                                border: batchConcurrency === c ? "none" : "1px solid rgba(255,255,255,0.1)",
                                padding: "4px 11px",
                                borderRadius: "6px",
                                fontSize: "11px",
                                fontWeight: batchConcurrency === c ? 800 : 600,
                                cursor: "pointer",
                                boxShadow: batchConcurrency === c ? "0 0 10px rgba(245, 158, 11, 0.3)" : "none",
                              }}
                            >
                              {c} {c === 1 ? "luồng" : c === 3 ? "luồng (khuyên dùng) ⭐" : "luồng"}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Multi-Model Rotation Pool List */}
                      <div style={{ background: "rgba(0,0,0,0.22)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", padding: "10px 12px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ fontSize: "11.5px", fontWeight: 800, color: "#fbbf24", textTransform: "uppercase", letterSpacing: "0.3px" }}>
                              Vòng Luân Chuyển Model AI ({activeProviderPool.length}/{allAvailablePoolItems.length} đang bật)
                            </span>
                            <span style={{ fontSize: "10.5px", color: "#94a3b8" }}>
                              • Tự động đảo model khi lỗi 429 / Timeout
                            </span>
                          </div>

                          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                            <button
                              type="button"
                              onClick={() => selectAllPoolKeys(allAvailablePoolItems.map((i) => `${i.providerId}:${i.model}`))}
                              style={{
                                background: "rgba(255,255,255,0.06)",
                                border: "1px solid rgba(255,255,255,0.1)",
                                color: "#cbd5e1",
                                padding: "3px 8px",
                                borderRadius: "4px",
                                fontSize: "10.5px",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              Chọn tất cả
                            </button>

                            <button
                              type="button"
                              onClick={() => clearAllPoolKeys()}
                              style={{
                                background: "rgba(255,255,255,0.06)",
                                border: "1px solid rgba(255,255,255,0.1)",
                                color: "#94a3b8",
                                padding: "3px 8px",
                                borderRadius: "4px",
                                fontSize: "10.5px",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              Bỏ chọn hết
                            </button>

                            <button
                              type="button"
                              onClick={handleQuickSync}
                              disabled={syncingQuick}
                              style={{
                                background: "rgba(245, 158, 11, 0.15)",
                                border: "1px solid rgba(245, 158, 11, 0.35)",
                                color: "#fbbf24",
                                padding: "3px 8px",
                                borderRadius: "4px",
                                fontSize: "10.5px",
                                fontWeight: 750,
                                cursor: syncingQuick ? "not-allowed" : "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <ArrowRepeat size={10} className={syncingQuick ? "animate-spin" : ""} />
                              {syncingQuick ? "Đang đồng bộ..." : "🔄 Đồng bộ Model"}
                            </button>
                          </div>
                        </div>

                        {/* Model Items Grid */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "6px", maxHeight: "180px", overflowY: "auto", paddingRight: "4px" }}>
                          {allAvailablePoolItems.length === 0 ? (
                            <div style={{ padding: "12px", textAlign: "center", color: "#94a3b8", fontSize: "11.5px", gridColumn: "1 / -1" }}>
                              Chưa có Provider/Model nào được kích hoạt. Hãy cấu hình API Key trong mục Cài Đặt hoặc bấm <strong>"Đồng bộ Model"</strong>.
                            </div>
                          ) : (
                            allAvailablePoolItems.map((item, idx) => {
                              const key = `${item.providerId}:${item.model}`;
                              const isChecked = selectedPoolKeys.length === 0
                                ? true
                                : selectedPoolKeys.includes(key) || selectedPoolKeys.includes(item.providerId);

                              return (
                                <div
                                  key={key}
                                  onClick={() => togglePoolKey(key)}
                                  style={{
                                    background: isChecked ? "rgba(245, 158, 11, 0.09)" : "rgba(255, 255, 255, 0.03)",
                                    border: isChecked ? "1px solid rgba(245, 158, 11, 0.35)" : "1px solid rgba(255, 255, 255, 0.08)",
                                    borderRadius: "6px",
                                    padding: "6px 10px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    cursor: "pointer",
                                    transition: "all 0.15s ease",
                                  }}
                                >
                                  <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => {}} // handled by wrapper click
                                      style={{ cursor: "pointer", accentColor: "#f59e0b", width: "14px", height: "14px", margin: 0 }}
                                    />
                                    <div style={{ minWidth: 0 }}>
                                      <div style={{ fontSize: "12px", fontWeight: 750, color: isChecked ? "#f8fafc" : "#94a3b8", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        {item.model || item.name}
                                      </div>
                                      <div style={{ fontSize: "10.5px", color: "#64748b", display: "flex", alignItems: "center", gap: "4px" }}>
                                        <span>Ưu tiên #{idx + 1}</span>
                                        <span>•</span>
                                        <span>{item.name}</span>
                                      </div>
                                    </div>
                                  </div>

                                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px", flexShrink: 0 }}>
                                    <span
                                      style={{
                                        fontSize: "9.5px",
                                        fontWeight: 800,
                                        padding: "1px 5px",
                                        borderRadius: "3px",
                                        background: (item.name || "").includes("Cloud") || (item.name || "").includes("Gateway") ? "rgba(245, 158, 11, 0.2)" : "rgba(59, 130, 246, 0.2)",
                                        color: (item.name || "").includes("Cloud") || (item.name || "").includes("Gateway") ? "#fbbf24" : "#60a5fa",
                                      }}
                                    >
                                      {(item.name || "").includes("Cloud") || (item.name || "").includes("Gateway") ? "⚡ Cloud Gateway" : "🔑 BYOK Key"}
                                    </span>
                                    <span style={{ fontSize: "9.5px", color: isChecked ? "#34d399" : "#64748b", fontWeight: 700 }}>
                                      {isChecked ? "● Sẵn sàng" : "○ Đã tắt"}
                                    </span>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Single Provider Selector when pool is disabled */
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", width: "100%", boxSizing: "border-box", paddingTop: "4px" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#cbd5e1", marginBottom: "4px" }}>
                          NHÀ CUNG CẤP AI ƯU TIÊN
                        </label>
                        <select
                          value={defaultProviderId}
                          onChange={(e) => handleSelectProvider(e.target.value)}
                          style={{ width: "100%", background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255, 255, 255, 0.14)", borderRadius: "6px", padding: "7px 10px", color: "#f8fafc", fontSize: "12px", outline: "none", cursor: "pointer" }}
                        >
                          {configuredProviders.some((p) => !p.isManaged) && (
                            <optgroup label="🔑 NHÀ CUNG CẤP BYOK (API KEY RIÊNG)">
                              {configuredProviders.filter((p) => !p.isManaged).map((p) => (
                                <option key={p.id} value={p.id}>
                                  {formatProviderLabel(p)}
                                </option>
                              ))}
                            </optgroup>
                          )}
                          {configuredProviders.some((p) => p.isManaged) && (
                            <optgroup label="⚡ CLOUD AI GATEWAY (ADMIN CẤP PHÉP)">
                              {configuredProviders.filter((p) => p.isManaged).map((p) => (
                                <option key={p.id} value={p.id}>
                                  {formatProviderLabel(p)}
                                </option>
                              ))}
                            </optgroup>
                          )}
                        </select>
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#cbd5e1", marginBottom: "4px" }}>
                          MÔ HÌNH AI (MODEL)
                        </label>
                        <select
                          value={isCustomModel ? "__custom__" : (selectedModel || selectedProvider?.model || "")}
                          onChange={(e) => handleSelectModel(e.target.value)}
                          style={{ width: "100%", background: "rgba(0,0,0,0.45)", border: "1px solid rgba(245, 158, 11, 0.35)", borderRadius: "6px", padding: "7px 10px", color: "#fbbf24", fontWeight: 700, fontSize: "12px", outline: "none", cursor: "pointer" }}
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
                  )}
                </div>

                {/* SECTION 2: Target Output Duration (Mapping Rules Table vs Fixed) */}
                <div style={{ background: "rgba(18, 23, 35, 0.75)", border: "1px solid rgba(255, 255, 255, 0.09)", borderRadius: "12px", padding: "14px 16px", display: "flex", flexDirection: "column", gap: "11px" }}>
                  
                  {/* Header & Tabs */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <ClockFill size={16} color="#fbbf24" />
                      <div>
                        <span style={{ fontSize: "13px", fontWeight: 800, color: "#f8fafc" }}>
                          2. Thời Lượng Kịch Bản Đầu Ra Mong Muốn
                        </span>
                      </div>
                    </div>

                    <div style={{ display: "flex", background: "rgba(0,0,0,0.45)", borderRadius: "8px", padding: "3px", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <button
                        type="button"
                        onClick={() => updateDurationMode("rules")}
                        style={{
                          background: durationMode === "rules" ? "linear-gradient(135deg, #d97706, #f59e0b)" : "transparent",
                          color: durationMode === "rules" ? "#12151f" : "#94a3b8",
                          border: "none",
                          padding: "5px 12px",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: durationMode === "rules" ? 800 : 600,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        🎯 Bảng Ánh Xạ Theo Dải Phút
                      </button>
                      <button
                        type="button"
                        onClick={() => updateDurationMode("fixed")}
                        style={{
                          background: durationMode === "fixed" ? "linear-gradient(135deg, #d97706, #f59e0b)" : "transparent",
                          color: durationMode === "fixed" ? "#12151f" : "#94a3b8",
                          border: "none",
                          padding: "5px 12px",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: durationMode === "fixed" ? 800 : 600,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        ⏱️ Cố Định 1 Mốc
                      </button>
                    </div>
                  </div>

                  {/* Mode 1: DURATION MAPPING RULES TABLE */}
                  {durationMode === "rules" ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <p style={{ fontSize: "11px", color: "#94a3b8", margin: "0 0 2px" }}>
                        💡 Hệ thống tự đo độ dài từng video trong danh sách nạp và chọn đúng số phút kịch bản theo bảng:
                      </p>

                      {/* Table Container */}
                      <div style={{ background: "rgba(9, 12, 18, 0.85)", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "2.4fr 1.8fr 1.4fr 38px", padding: "8px 14px", background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: "10.5px", fontWeight: 800, color: "#94a3b8", letterSpacing: "0.4px" }}>
                          <span>📹 ĐỘ DÀI VIDEO GỐC</span>
                          <span>🎙️ KỊCH BẢN XUẤT RA</span>
                          <span>ƯỚC TÍNH SỐ TỪ</span>
                          <span style={{ textAlign: "center" }}>XÓA</span>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column" }}>
                          {durationRules.map((rule, idx) => (
                            <div
                              key={rule.id || idx}
                              style={{
                                display: "grid",
                                gridTemplateColumns: "2.4fr 1.8fr 1.4fr 38px",
                                padding: "8px 14px",
                                alignItems: "center",
                                background: idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)",
                                borderBottom: idx < durationRules.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                                gap: "8px",
                              }}
                            >
                              {/* Input Range: Min -> Max */}
                              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                                <span style={{ fontSize: "11px", color: "#94a3b8" }}>Từ</span>
                                <input
                                  type="number"
                                  min={0}
                                  max={9999}
                                  value={rule.minInputMinutes}
                                  onChange={(e) => handleUpdateDurationRule(rule.id, { minInputMinutes: Math.max(0, Number(e.target.value) || 0) })}
                                  style={{ width: "46px", background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: "5px", padding: "4px 6px", color: "#f8fafc", fontSize: "12px", fontWeight: 700, textAlign: "center", outline: "none" }}
                                />
                                <span style={{ fontSize: "11px", color: "#94a3b8" }}>đến</span>
                                <input
                                  type="number"
                                  min={1}
                                  max={9999}
                                  value={rule.maxInputMinutes}
                                  onChange={(e) => handleUpdateDurationRule(rule.id, { maxInputMinutes: Math.max(1, Number(e.target.value) || 1) })}
                                  style={{ width: "50px", background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: "5px", padding: "4px 6px", color: "#f8fafc", fontSize: "12px", fontWeight: 700, textAlign: "center", outline: "none" }}
                                />
                                <span style={{ fontSize: "11px", color: "#94a3b8" }}>phút</span>
                              </div>

                              {/* Target Output Minutes */}
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span style={{ fontSize: "11px", color: "#fbbf24", fontWeight: 700 }}>➔ Ra:</span>
                                <input
                                  type="number"
                                  min={1}
                                  max={60}
                                  value={rule.targetOutputMinutes}
                                  onChange={(e) => handleUpdateDurationRule(rule.id, { targetOutputMinutes: Math.max(1, Math.min(60, Number(e.target.value) || 1)) })}
                                  style={{ width: "46px", background: "rgba(245, 158, 11, 0.15)", border: "1px solid rgba(245, 158, 11, 0.5)", borderRadius: "5px", padding: "4px 6px", color: "#fbbf24", fontWeight: 800, fontSize: "12.5px", textAlign: "center", outline: "none" }}
                                />
                                <span style={{ fontSize: "11px", color: "#fbbf24", fontWeight: 700 }}>phút</span>
                              </div>

                              {/* Estimated Words */}
                              <span style={{ fontSize: "11px", color: "#cbd5e1" }}>
                                ~{rule.targetOutputMinutes * 280} từ thoại
                              </span>

                              {/* Delete Rule Button */}
                              <div style={{ textAlign: "center" }}>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteDurationRule(rule.id)}
                                  title="Xóa quy tắc này"
                                  style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.25)", color: "#f87171", borderRadius: "5px", width: "26px", height: "26px", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.15s ease" }}
                                >
                                  <Trash3Fill size={11} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Table Actions */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "2px" }}>
                        <button
                          type="button"
                          onClick={handleAddDurationRule}
                          style={{ background: "rgba(245, 158, 11, 0.12)", border: "1px solid rgba(245, 158, 11, 0.3)", color: "#fbbf24", padding: "5px 12px", borderRadius: "6px", fontSize: "11.5px", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "5px" }}
                        >
                          <PlusLg size={11} /> Thêm dải thời lượng mới
                        </button>

                        <button
                          type="button"
                          onClick={handleResetDurationRules}
                          style={{ background: "none", border: "none", color: "#64748b", fontSize: "11px", cursor: "pointer", textDecoration: "underline" }}
                        >
                          ↺ Khôi phục 4 bậc mặc định
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Mode 2: FIXED TARGET OUTPUT DURATION */
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(135px, 1fr))", gap: "8px", width: "100%", boxSizing: "border-box" }}>
                        {[
                          { key: "full", label: "🎬 Toàn Bộ", sub: "Theo video gốc" },
                          { key: "60s", label: "⚡ 60 Giây", sub: "Shorts / TikTok / Reels" },
                          { key: "3m", label: "⏱️ 3 Phút", sub: "Review ngắn gọn" },
                          { key: "5m", label: "⏱️ 5 Phút", sub: "Chuẩn Recap / Review" },
                          { key: "10m", label: "⏱️ 10 Phút", sub: "Phóng sự chuyên sâu" },
                          { key: "15m", label: "⏱️ 15 Phút", sub: "Review chi tiết toàn cảnh" },
                          { key: "custom", label: "✍️ Tùy Chỉnh", sub: "Nhập số phút mong muốn" },
                        ].map((dur) => {
                          const isSelected = targetDuration === dur.key;
                          return (
                            <button
                              key={dur.key}
                              type="button"
                              onClick={() => {
                                setTargetDuration(dur.key as any);
                                updateDurationMode("fixed");
                              }}
                              style={{
                                background: isSelected ? "rgba(217, 119, 6, 0.25)" : "rgba(10, 13, 20, 0.6)",
                                border: isSelected ? "1.5px solid #f59e0b" : "1px solid rgba(255,255,255,0.08)",
                                borderRadius: "8px",
                                padding: "8px 10px",
                                cursor: "pointer",
                                textAlign: "center",
                                transition: "all 0.15s ease",
                              }}
                            >
                              <div style={{ fontSize: "11.5px", fontWeight: 700, color: isSelected ? "#fbbf24" : "#f8fafc" }}>
                                {dur.label}
                              </div>
                              <div style={{ fontSize: "10px", color: isSelected ? "#fde68a" : "#94a3b8", marginTop: "2px" }}>
                                {dur.sub}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {targetDuration === "custom" && (
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(0,0,0,0.3)", padding: "8px 14px", borderRadius: "8px", border: "1px solid rgba(245, 158, 11, 0.3)" }}>
                          <span style={{ fontSize: "11.5px", color: "#cbd5e1" }}>Số phút mong muốn:</span>
                          <input
                            type="number"
                            min={1}
                            max={60}
                            value={customDurationMinutes}
                            onChange={(e) => setCustomDurationMinutes(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
                            style={{ width: "65px", background: "rgba(0,0,0,0.6)", border: "1px solid rgba(245, 158, 11, 0.5)", borderRadius: "5px", padding: "4px 8px", color: "#fbbf24", fontWeight: 800, fontSize: "12.5px", textAlign: "center", outline: "none" }}
                          />
                          <span style={{ fontSize: "11.5px", color: "#fbbf24", fontWeight: 700 }}>phút (~{customDurationMinutes * 280} từ thuyết minh)</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* SECTION 3: Preset Prompts Grid */}
                <div style={{ background: "rgba(18, 23, 35, 0.75)", border: "1px solid rgba(255, 255, 255, 0.09)", borderRadius: "12px", padding: "14px 16px", display: "flex", flexDirection: "column", gap: "10px", boxSizing: "border-box", width: "100%" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", minWidth: 0 }}>
                    <span style={{ fontSize: "13px", fontWeight: 800, color: "#f8fafc", display: "flex", alignItems: "center", gap: "8px" }}>
                      <Sliders size={15} color="#fbbf24" /> 3. Phong Cách Kịch Bản & Giọng Điệu
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowBatchModal(false);
                        setShowPromptModal(true);
                      }}
                      style={{ background: "none", border: "none", color: "#fbbf24", fontSize: "11px", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}
                    >
                      <PencilSquare size={11} /> Tùy chỉnh prompt kịch bản ↗
                    </button>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "8px", width: "100%", boxSizing: "border-box" }}>
                    {PRESET_PROMPTS.map((pr) => {
                      const isSelected = selectedPresetId === pr.id || defaultPrompt === pr.prompt;
                      return (
                        <div
                          key={pr.id}
                          onClick={() => handleSelectPreset(pr)}
                          style={{
                            background: isSelected ? "rgba(217, 119, 6, 0.22)" : "rgba(10, 13, 20, 0.6)",
                            border: isSelected ? "1.5px solid #f59e0b" : "1px solid rgba(255,255,255,0.07)",
                            borderRadius: "8px",
                            padding: "10px 12px",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                            boxShadow: isSelected ? "0 0 14px rgba(245, 158, 11, 0.25)" : "none",
                            minWidth: 0,
                            width: "100%",
                            boxSizing: "border-box",
                            overflow: "hidden",
                            display: "flex",
                            flexDirection: "column",
                            gap: "3px",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "6px", minWidth: 0 }}>
                            <strong
                              title={pr.title}
                              style={{
                                fontSize: "12px",
                                color: isSelected ? "#fbbf24" : "#f1f5f9",
                                display: "block",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                flex: "1 1 0%",
                                minWidth: 0,
                              }}
                            >
                              {pr.title}
                            </strong>
                            {isSelected && (
                              <span
                                style={{
                                  fontSize: "10.5px",
                                  color: "#fbbf24",
                                  fontWeight: 800,
                                  background: "rgba(245, 158, 11, 0.18)",
                                  border: "1px solid rgba(245, 158, 11, 0.4)",
                                  borderRadius: "4px",
                                  padding: "1px 5px",
                                  flexShrink: 0,
                                  lineHeight: 1.2,
                                }}
                              >
                                ✓
                              </span>
                            )}
                          </div>
                          <span
                            title={pr.desc}
                            style={{
                              fontSize: "10.5px",
                              color: isSelected ? "#fde68a" : "#94a3b8",
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              lineHeight: 1.35,
                              wordBreak: "break-word",
                            }}
                          >
                            {pr.desc}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* SECTION 4: Audio & Voice Mode Controls */}
                <div style={{ background: "rgba(18, 23, 35, 0.75)", border: "1px solid rgba(255, 255, 255, 0.09)", borderRadius: "12px", padding: "13px 16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "13px", fontWeight: 800, color: "#f8fafc", display: "flex", alignItems: "center", gap: "8px" }}>
                      <VolumeUpFill size={15} color="#fbbf24" /> 4. Tùy Chọn Giọng Đọc & Tách Âm Thanh Gốc
                    </span>
                    <span style={{ fontSize: "10.5px", color: narratorEnabled ? "#34d399" : "#60a5fa", fontWeight: 700 }}>
                      {narratorEnabled ? "🎙️ Có Lồng Tiếng Voice AI" : "🎬 Cắt Ghép Thuần Tiếng Gốc (Không Voice AI)"}
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "8px" }}>
                    {/* Option 1: Bật/Tắt Voice AI */}
                    <label
                      style={{
                        background: narratorEnabled ? "rgba(59, 130, 246, 0.12)" : "rgba(255,255,255,0.03)",
                        border: narratorEnabled ? "1px solid rgba(59, 130, 246, 0.4)" : "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "8px",
                        padding: "8px 12px",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "10px",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={narratorEnabled}
                        onChange={(e) => updateNarratorEnabled(e.target.checked)}
                        style={{ accentColor: "#3b82f6", width: "16px", height: "16px", marginTop: "2px", cursor: "pointer" }}
                      />
                      <div>
                        <strong style={{ fontSize: "12px", color: narratorEnabled ? "#60a5fa" : "#f8fafc", display: "block" }}>
                          🎙️ Bật giọng đọc Voice AI review
                        </strong>
                        <span style={{ fontSize: "10.5px", color: "#94a3b8", display: "block", marginTop: "2px" }}>
                          {narratorEnabled ? "Tạo voice AI đọc review theo kịch bản." : "TẮT: Chỉ cắt ghép các cảnh hay nhất & giữ 100% tiếng gốc."}
                        </span>
                      </div>
                    </label>

                    {/* Option 2: Tách/Lọc bỏ nhạc nền gốc */}
                    <label
                      style={{
                        background: removeOriginalBgm ? "rgba(168, 85, 247, 0.15)" : "rgba(255,255,255,0.03)",
                        border: removeOriginalBgm ? "1px solid rgba(168, 85, 247, 0.45)" : "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "8px",
                        padding: "8px 12px",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "10px",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={removeOriginalBgm}
                        onChange={(e) => updateRemoveOriginalBgm(e.target.checked)}
                        style={{ accentColor: "#a855f7", width: "16px", height: "16px", marginTop: "2px", cursor: "pointer" }}
                      />
                      <div>
                        <strong style={{ fontSize: "12px", color: removeOriginalBgm ? "#c084fc" : "#f8fafc", display: "block" }}>
                          🎼 AI Vocal & SFX Remover (Tách sạch Nhạc nền gốc)
                        </strong>
                        <span style={{ fontSize: "10.5px", color: "#94a3b8", display: "block", marginTop: "2px" }}>
                          Bóc tách triệt để bài nhạc nền cũ bằng thuật toán triệt pha AI, giữ trọn vẹn 100% tiếng nói nhân vật, tiếng còi hú cảnh sát, tiếng súng & hiện trường.
                        </span>
                      </div>
                    </label>

                    {/* Option 3: Đan tiếng gốc (chỉ hiện khi bật voice) */}
                    {narratorEnabled && (
                      <label
                        style={{
                          background: interweaveAudio ? "rgba(245, 158, 11, 0.12)" : "rgba(255,255,255,0.03)",
                          border: interweaveAudio ? "1px solid rgba(245, 158, 11, 0.4)" : "1px solid rgba(255,255,255,0.08)",
                          borderRadius: "8px",
                          padding: "8px 12px",
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "10px",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={interweaveAudio}
                          onChange={(e) => updateInterweaveAudio(e.target.checked)}
                          style={{ accentColor: "#f59e0b", width: "16px", height: "16px", marginTop: "2px", cursor: "pointer" }}
                        />
                        <div>
                          <strong style={{ fontSize: "12px", color: interweaveAudio ? "#fbbf24" : "#f8fafc", display: "block" }}>
                            🎧 Đan tiếng gốc (~20% nền)
                          </strong>
                          <span style={{ fontSize: "10.5px", color: "#94a3b8", display: "block", marginTop: "2px" }}>
                            Giữ âm thanh hiện trường làm nền chạy bên dưới giọng đọc Voice AI.
                          </span>
                        </div>
                      </label>
                    )}

                    {/* Option 4: Hook cao trào */}
                    <label
                      style={{
                        background: emphasizeHook ? "rgba(239, 68, 68, 0.12)" : "rgba(255,255,255,0.03)",
                        border: emphasizeHook ? "1px solid rgba(239, 68, 68, 0.4)" : "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "8px",
                        padding: "8px 12px",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "10px",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={emphasizeHook}
                        onChange={(e) => updateEmphasizeHook(e.target.checked)}
                        style={{ accentColor: "#ef4444", width: "16px", height: "16px", marginTop: "2px", cursor: "pointer" }}
                      />
                      <div>
                        <strong style={{ fontSize: "12px", color: emphasizeHook ? "#fca5a5" : "#f8fafc", display: "block" }}>
                          🚨 Hook: Cao trào mở màn
                        </strong>
                        <span style={{ fontSize: "10.5px", color: "#94a3b8", display: "block", marginTop: "2px" }}>
                          Cảnh 1 giữ 100% tiếng gốc & kịch tính để hút người xem ngay 5-10s đầu.
                        </span>
                      </div>
                    </label>

                    {/* Option 5: Auto-Ducking Nhạc nền */}
                    <label
                      style={{
                        background: autoDucking ? "rgba(16, 185, 129, 0.12)" : "rgba(255,255,255,0.03)",
                        border: autoDucking ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "8px",
                        padding: "8px 12px",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "10px",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={autoDucking}
                        onChange={(e) => updateAutoDucking(e.target.checked)}
                        style={{ accentColor: "#10b981", width: "16px", height: "16px", marginTop: "2px", cursor: "pointer" }}
                      />
                      <div>
                        <strong style={{ fontSize: "12px", color: autoDucking ? "#6ee7b7" : "#f8fafc", display: "block" }}>
                          🎵 Nhạc nền tự né (Ducking)
                        </strong>
                        <span style={{ fontSize: "10.5px", color: "#94a3b8", display: "block", marginTop: "2px" }}>
                          Tự hạ âm lượng nhạc nền/tiếng video khi có Voice AI và nâng lên khi ngắt câu.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* SECTION 5: Language Selection */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(18, 23, 35, 0.75)", border: "1px solid rgba(255, 255, 255, 0.09)", borderRadius: "12px", padding: "11px 16px", gap: "12px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#cbd5e1", whiteSpace: "nowrap" }}>
                    🌐 5. Ngôn ngữ kịch bản đầu ra:
                  </span>
                  <select
                    value={defaultLanguage}
                    onChange={(e) => setDefaultLanguage(e.target.value)}
                    style={{ flex: 1, maxWidth: "280px", background: "rgba(0,0,0,0.55)", border: "1px solid rgba(255, 255, 255, 0.15)", borderRadius: "6px", padding: "6px 10px", color: "#f8fafc", fontSize: "12px", outline: "none", cursor: "pointer" }}
                  >
                    {ANALYSIS_LANGUAGES.map(([code, name]) => (
                      <option key={code} value={code}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

              </div>

              {/* Modal Footer (Sticky Bottom) */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.08)", padding: "14px 24px", background: "rgba(18, 22, 34, 0.85)", flexShrink: 0 }}>
                <span style={{ fontSize: "11.5px", color: "#94a3b8" }}>
                  {useProviderPool ? `⚡ Tự động luân chuyển ${activeProviderPool.length} Model (${batchConcurrency} luồng song song)` : `⚡ Chạy theo Model đã chọn`}
                </span>
                <div style={{ display: "flex", gap: "10px", flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowBatchModal(false);
                      setAnalysisTargetJob(null);
                    }}
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#e2e8f0", padding: "8px 18px", borderRadius: "8px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                  >
                    Hủy Bỏ
                  </button>
                  <button
                    type="submit"
                    style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)", color: "#12151f", border: "none", padding: "8px 24px", borderRadius: "8px", fontSize: "12.5px", fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", boxShadow: "0 0 18px rgba(245, 158, 11, 0.45)" }}
                  >
                    <LightningChargeFill size={13} /> {analysisTargetJob ? "Bắt Đầu Phân Tích Video Này" : `Bắt Đầu Phân Tích (${selectedJobIds.size > 0 ? selectedJobIds.size : sourceCandidates.length} Video)`}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT SCENE DETAILS MODAL */}
      {editingSceneInfo && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999, padding: "20px" }}>
          <div style={{ background: "#10131c", border: "1px solid rgba(245, 158, 11, 0.35)", borderRadius: "12px", width: "100%", maxWidth: "560px", padding: "20px", boxShadow: "0 20px 50px rgba(0,0,0,0.6)" }}>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "10px", marginBottom: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <PencilSquare size={16} color="#fbbf24" />
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
                    style={{ width: "100%", background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255, 255, 255, 0.12)", borderRadius: "6px", padding: "6px 10px", color: "#f8fafc", fontSize: "12px", fontFamily: "monospace", outline: "none" }}
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
                    style={{ width: "100%", background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255, 255, 255, 0.12)", borderRadius: "6px", padding: "6px 10px", color: "#f8fafc", fontSize: "12px", fontFamily: "monospace", outline: "none" }}
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
                  style={{ width: "100%", background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255, 255, 255, 0.12)", borderRadius: "6px", padding: "6px 10px", color: "#f8fafc", fontSize: "12px", outline: "none", marginBottom: "5px" }}
                />
                <textarea
                  rows={2}
                  value={editingSceneInfo.scene.detail}
                  onChange={(e) => setEditingSceneInfo({
                    ...editingSceneInfo,
                    scene: { ...editingSceneInfo.scene, detail: e.target.value }
                  })}
                  placeholder="Mô tả hành động, diễn biến nhân vật trong cảnh này..."
                  style={{ width: "100%", background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255, 255, 255, 0.12)", borderRadius: "6px", padding: "6px 10px", color: "#f8fafc", fontSize: "12px", outline: "none", resize: "vertical" }}
                />
              </div>

              {/* AI Voiceover Script */}
              <div>
                <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11.5px", fontWeight: 700, color: "#fbbf24", marginBottom: "3px" }}>
                  <span>🎙️ LỜI THOẠI LỒNG TIẾNG AI CHO PHÂN CẢNH NÀY</span>
                  <button
                    type="button"
                    onClick={() => handlePlaySceneVoice(editingSceneInfo.scene.voiceover || editingSceneInfo.scene.detail || "", "modal-preview")}
                    style={{ background: "none", border: "none", color: "#fbbf24", cursor: "pointer", fontSize: "11px", fontWeight: 700, display: "flex", alignItems: "center", gap: "3px" }}
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
                  style={{ width: "100%", background: "rgba(0,0,0,0.35)", border: "1px solid rgba(245, 158, 11, 0.4)", borderRadius: "6px", padding: "8px 10px", color: "#f8fafc", fontSize: "12px", outline: "none", resize: "vertical" }}
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
                  style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)", color: "#12151f", border: "none", padding: "6px 18px", borderRadius: "6px", fontSize: "12px", fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: "5px" }}
                >
                  <Check2 size={14} /> Lưu Thay Đổi
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: VIDEO PLAYER & TRANSCRIPT SYNC MODAL */}
      {previewPlayerInfo && (() => {
        const activeJob = jobs.find((j) => j.id === previewPlayerInfo.job.id) || previewPlayerInfo.job;
        const scenes = activeJob.analysis?.scenes || [];
        const hasScenes = scenes.length > 0;
        const isJobRunning = activeJob.status === "running" || runningJobIds.has(activeJob.id);
        const prog = batchProgress[activeJob.id] || { progress: activeJob.progress || 0, stage: activeJob.stage || "" };
        const mediaSrc = resolveMediaSrc(activeJob.localPath || activeJob.source);
        const assignedProvider = providers.find((p) => p.id === (activeJob.providerId || defaultProviderId)) || selectedProvider;

        return (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", backdropFilter: "blur(14px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999, padding: "20px" }}>
            <div style={{ background: "#10131c", border: "1px solid rgba(245, 158, 11, 0.35)", borderRadius: "14px", width: "100%", maxWidth: "1320px", maxHeight: "92vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 30px 80px rgba(0,0,0,0.9)" }}>
              
              {/* Modal Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(26, 30, 43, 0.95)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "linear-gradient(135deg, rgba(217, 119, 6, 0.25), rgba(245, 158, 11, 0.15))", color: "#fbbf24", border: "1px solid rgba(245, 158, 11, 0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Film size={17} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <strong style={{ fontSize: "14px", color: "#f8fafc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "480px" }} title={activeJob.name}>
                        {activeJob.name}
                      </strong>
                      <span style={{ fontSize: "10.5px", background: hasScenes ? "rgba(245, 158, 11, 0.15)" : "rgba(255, 255, 255, 0.06)", color: hasScenes ? "#fbbf24" : "#94a3b8", border: hasScenes ? "1px solid rgba(245, 158, 11, 0.3)" : "1px solid rgba(255, 255, 255, 0.1)", padding: "1px 7px", borderRadius: "4px", fontWeight: 800, flexShrink: 0 }}>
                        {hasScenes ? `${scenes.length} PHÂN CẢNH` : "CHƯA PHÂN CẢNH"}
                      </span>
                      <span style={{ fontSize: "10.5px", background: "rgba(255, 255, 255, 0.06)", color: "#94a3b8", padding: "1px 7px", borderRadius: "4px", fontFamily: "monospace", flexShrink: 0 }}>
                        ⏱️ {formatDuration(activeJob.durationSeconds)}
                      </span>
                      {isJobRunning ? (
                        <span style={{ fontSize: "10px", background: "rgba(245, 158, 11, 0.2)", color: "#fbbf24", border: "1px solid rgba(245, 158, 11, 0.4)", padding: "1px 7px", borderRadius: "4px", fontWeight: 800, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          ⚡ ĐANG PHÂN TÍCH ({prog.progress}%)
                        </span>
                      ) : hasScenes ? (
                        <span style={{ fontSize: "10px", background: "rgba(52, 211, 153, 0.15)", color: "#34d399", border: "1px solid rgba(52, 211, 153, 0.3)", padding: "1px 7px", borderRadius: "4px", fontWeight: 800, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <CheckCircleFill size={10} /> ĐÃ KHỚP TIMELINE
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  {!hasScenes && !isJobRunning && (
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewPlayerInfo(null);
                        openAnalysisConfigForJob(activeJob);
                      }}
                      style={{
                        background: "linear-gradient(135deg, #d97706, #f59e0b)",
                        color: "#12151f",
                        border: "none",
                        padding: "5px 14px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: 800,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                        boxShadow: "0 0 12px rgba(245, 158, 11, 0.3)",
                      }}
                    >
                      <LightningChargeFill size={12} /> Bắt Đầu Phân Tích AI
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setPreviewPlayerInfo(null)}
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", cursor: "pointer", transition: "all 0.15s ease" }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "#f87171"; e.currentTarget.style.background = "rgba(239, 68, 68, 0.15)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "#94a3b8"; e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                  >
                    <XLg size={14} />
                  </button>
                </div>
              </div>

              {/* Modal Body: Video Left + Synced Scenes Right */}
              <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", height: "600px" }}>
                
                {/* Left: Video Player */}
                <div style={{ background: "#05070a", display: "flex", flexDirection: "column", justifyContent: "center", position: "relative", borderRight: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>
                  {mediaSrc ? (
                    <video
                      id="analysis-preview-video"
                      key={mediaSrc}
                      src={mediaSrc}
                      controls
                      autoPlay
                      onTimeUpdate={(e) => {
                        const cur = e.currentTarget.currentTime;
                        if (!scenes.length) return;
                        const idx = scenes.findIndex((s) => {
                          const partsStart = (s?.start ? String(s.start) : "0:0").split(":").map(Number);
                          const startSec = partsStart.length === 3 ? partsStart[0] * 3600 + partsStart[1] * 60 + partsStart[2] : partsStart.length === 2 ? partsStart[0] * 60 + partsStart[1] : 0;
                          const partsEnd = (s?.end ? String(s.end) : "").split(":").map(Number);
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
                      <Film size={48} style={{ margin: "0 auto 14px", opacity: 0.4, color: "#fbbf24" }} />
                      <h4 style={{ fontSize: "14px", color: "#f8fafc", marginBottom: "6px", fontWeight: 700 }}>Chưa Tìm Thấy Tệp Video Nguồn</h4>
                      <p style={{ fontSize: "12px", color: "#94a3b8", maxWidth: "340px", margin: "0 auto" }}>Video từ link URL đang tải về hoặc đường dẫn tệp chưa sẵn sàng trên máy.</p>
                    </div>
                  )}
                </div>

                {/* Right: Synchronized Scenes Timeline & Empty Hub */}
                <div style={{ background: "rgba(16, 19, 28, 0.98)", display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
                  
                  {/* Scenes Top Bar */}
                  <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(26, 30, 43, 0.6)", flexShrink: 0 }}>
                    <span style={{ fontSize: "11px", fontWeight: 800, color: "#fbbf24", textTransform: "uppercase", letterSpacing: "0.5px", display: "flex", alignItems: "center", gap: "6px" }}>
                      <CollectionPlayFill size={13} /> KỊCH BẢN PHÂN CẢNH ĐỒNG BỘ
                    </span>
                    {hasScenes ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "10.5px", color: "#34d399", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#34d399", display: "inline-block" }} /> Auto-Sync Timeline
                        </span>
                        <button
                          type="button"
                          onClick={() => handleExportToTimeline(activeJob)}
                          style={{ background: "rgba(245, 158, 11, 0.15)", border: "1px solid rgba(245, 158, 11, 0.3)", color: "#fbbf24", padding: "2px 8px", borderRadius: "4px", fontSize: "10.5px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "3px" }}
                          title="Đưa sang bàn dựng Timeline"
                        >
                          <CollectionPlayFill size={10} /> Timeline
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: "10.5px", color: "#fbbf24", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#fbbf24", display: "inline-block" }} /> Chờ phân tích AI
                      </span>
                    )}
                  </div>

                  {/* Body Content */}
                  {hasScenes ? (
                    /* Scrollable Scenes Cards */
                    <div style={{ flex: 1, overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                      {scenes.map((sc, idx) => {
                        const isActive = activePlayingSceneIdx === idx;
                        const isPlayingThis = playingVoiceKey === (sc.id || `scene-${idx + 1}`);
                        const isLoadingThis = loadingVoiceKey === (sc.id || `scene-${idx + 1}`);

                        return (
                          <div
                            id={`preview-scene-card-${idx}`}
                            key={sc.id || idx}
                            onClick={() => {
                              setActivePlayingSceneIdx(idx);
                              const vid = document.getElementById("analysis-preview-video") as HTMLVideoElement;
                              if (vid) {
                                const parts = (sc?.start ? String(sc.start) : "0:0").split(":").map(Number);
                                const secs = parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : parts.length === 2 ? parts[0] * 60 + parts[1] : 0;
                                vid.currentTime = secs;
                                vid.play();
                              }
                            }}
                            style={{
                              background: isActive ? "linear-gradient(135deg, rgba(217, 119, 6, 0.22), rgba(245, 158, 11, 0.12))" : "rgba(26, 30, 43, 0.6)",
                              border: isActive ? "1px solid #f59e0b" : "1px solid rgba(255, 255, 255, 0.06)",
                              borderRadius: "8px",
                              padding: "10px 12px",
                              cursor: "pointer",
                              transition: "all 0.2s ease",
                              boxShadow: isActive ? "0 0 16px rgba(245, 158, 11, 0.2)" : "none",
                            }}
                          >
                            {/* Scene Header */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span style={{ fontSize: "11px", fontWeight: 800, color: isActive ? "#fbbf24" : "#94a3b8" }}>
                                  Cảnh #{idx + 1}
                                </span>
                                {isActive && (
                                  <span style={{ fontSize: "9px", background: "rgba(245, 158, 11, 0.25)", color: "#fbbf24", border: "1px solid rgba(245, 158, 11, 0.4)", padding: "1px 5px", borderRadius: "3px", fontWeight: 800 }}>
                                    ⚡ ĐANG PHÁT
                                  </span>
                                )}
                              </div>

                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span style={{ fontSize: "10.5px", color: "#fbbf24", fontFamily: "monospace", fontWeight: 700 }}>
                                  ⏱️ {sc.start} ➔ {sc.end || "00:15"}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePlaySceneVoice(sc.voiceover || sc.translation || sc.detail, sc.id || `scene-${idx + 1}`);
                                  }}
                                  style={{ background: isPlayingThis ? "rgba(245, 158, 11, 0.25)" : "rgba(255,255,255,0.06)", border: isPlayingThis ? "1px solid rgba(245, 158, 11, 0.5)" : "1px solid rgba(255,255,255,0.1)", borderRadius: "4px", padding: "3px 7px", color: "#e2e8f0", fontSize: "10.5px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "3px" }}
                                  title="Nghe thử giọng đọc TTS"
                                >
                                  {isLoadingThis ? (
                                    <ArrowRepeat size={11} color="#fbbf24" />
                                  ) : isPlayingThis ? (
                                    <PauseFill size={11} color="#fbbf24" />
                                  ) : (
                                    <VolumeUpFill size={11} color="#fbbf24" />
                                  )}
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
                            <div style={{ background: "rgba(0, 0, 0, 0.35)", borderLeft: "2px solid #f59e0b", borderRadius: "0 4px 4px 0", padding: "6px 8px", fontSize: "11px", color: "#e2e8f0", fontStyle: "italic", lineHeight: 1.4 }}>
                              🎙️ "{sc.voiceover || sc.translation || sc.detail}"
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : isJobRunning ? (
                    /* Live Analysis Running Progress View */
                    <div style={{ flex: 1, padding: "24px 20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
                      <div style={{ width: "56px", height: "56px", borderRadius: "14px", background: "linear-gradient(135deg, rgba(217, 119, 6, 0.25), rgba(245, 158, 11, 0.15))", border: "1px solid rgba(245, 158, 11, 0.4)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fbbf24", marginBottom: "16px", boxShadow: "0 0 24px rgba(245, 158, 11, 0.25)" }}>
                        <LightningChargeFill size={28} />
                      </div>
                      <h4 style={{ fontSize: "15px", fontWeight: 800, color: "#f8fafc", marginBottom: "6px" }}>
                        AI Đang Phân Tích & Bóc Tách Phân Cảnh
                      </h4>
                      <p style={{ fontSize: "12px", color: "#94a3b8", maxWidth: "340px", marginBottom: "16px", lineHeight: 1.5 }}>
                        {prog.stage || "Hệ thống đang quét từng khung hình, nhận diện mốc thời gian và biên tập kịch bản đồng bộ..."}
                      </p>
                      
                      <div style={{ width: "85%", maxWidth: "320px", marginBottom: "10px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: 800, color: "#fbbf24", marginBottom: "4px" }}>
                          <span>Tiến độ xử lý</span>
                          <span>{prog.progress}%</span>
                        </div>
                        <div style={{ width: "100%", height: "6px", background: "rgba(0,0,0,0.5)", borderRadius: "10px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
                          <div style={{ width: `${prog.progress}%`, height: "100%", background: "linear-gradient(90deg, #d97706, #f59e0b)", transition: "width 0.3s ease" }} />
                        </div>
                      </div>
                      <span style={{ fontSize: "11px", color: "#64748b" }}>
                        ⏱️ Các phân cảnh sẽ tự động nạp vào đây ngay sau khi hoàn tất.
                      </span>
                    </div>
                  ) : (
                    /* Interactive Video Intelligence Hub & 1-Click Trigger (Empty State) */
                    <div style={{ flex: 1, padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "14px" }}>
                      
                      {/* Hero Info Card */}
                      <div style={{ background: "linear-gradient(135deg, rgba(217, 119, 6, 0.12), rgba(245, 158, 11, 0.05))", border: "1px solid rgba(245, 158, 11, 0.25)", borderRadius: "10px", padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                          <Stars size={16} color="#fbbf24" />
                          <strong style={{ fontSize: "13px", color: "#fbbf24" }}>
                            Video Nguồn Đã Sẵn Sàng Phân Tích
                          </strong>
                        </div>
                        <p style={{ fontSize: "11.5px", color: "#cbd5e1", lineHeight: 1.5, margin: 0 }}>
                          Tệp video đã được nạp thành công vào hệ thống. Hãy bắt đầu phân tích AI để tự động bóc tách từng phân cảnh, nhận diện sự kiện khung hình và viết kịch bản thuyết minh đồng bộ.
                        </p>
                      </div>

                      {/* Video Specs Summary */}
                      <div style={{ background: "rgba(26, 30, 43, 0.7)", border: "1px solid rgba(255, 255, 255, 0.06)", borderRadius: "8px", padding: "12px 14px", display: "flex", flexDirection: "column", gap: "8px" }}>
                        <div style={{ fontSize: "11px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          📊 Thông Số Kỹ Thuật Video
                        </div>
                        
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "11.5px" }}>
                          <div style={{ background: "rgba(0,0,0,0.3)", padding: "6px 10px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.04)" }}>
                            <span style={{ color: "#64748b", display: "block", fontSize: "10px" }}>Thời Lượng</span>
                            <strong style={{ color: "#f8fafc", fontFamily: "monospace" }}>⏱️ {formatDuration(activeJob.durationSeconds)}</strong>
                          </div>

                          <div style={{ background: "rgba(0,0,0,0.3)", padding: "6px 10px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.04)" }}>
                            <span style={{ color: "#64748b", display: "block", fontSize: "10px" }}>Loại Nguồn</span>
                            <strong style={{ color: "#f8fafc" }}>{activeJob.sourceType === "url" ? "🌐 Trực Tuyến (URL)" : "💾 Tệp Máy Tính (Local)"}</strong>
                          </div>
                        </div>

                        <div style={{ background: "rgba(0,0,0,0.3)", padding: "6px 10px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.04)", fontSize: "11px" }}>
                          <span style={{ color: "#64748b", display: "block", fontSize: "10px" }}>Mô Hình AI Xử Lý</span>
                          <span style={{ color: "#fbbf24", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
                            <CpuFill size={11} /> {assignedProvider ? `${assignedProvider.name} · ${assignedProvider.model}` : "Mô hình AI Khuyên Dùng (Gemini / Claude / GPT-4o)"}
                          </span>
                        </div>

                        <div style={{ background: "rgba(0,0,0,0.3)", padding: "6px 10px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.04)", fontSize: "10.5px", color: "#94a3b8", wordBreak: "break-all" }}>
                          <span style={{ color: "#64748b", display: "block", fontSize: "10px" }}>Đường Dẫn Tệp Nguồn</span>
                          {activeJob.localPath || activeJob.source || "Chưa có đường dẫn"}
                        </div>
                      </div>

                      {/* Primary Actions */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "auto" }}>
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewPlayerInfo(null);
                            openAnalysisConfigForJob(activeJob);
                          }}
                          style={{
                            background: "linear-gradient(135deg, #d97706, #f59e0b)",
                            color: "#12151f",
                            border: "none",
                            padding: "10px 18px",
                            borderRadius: "8px",
                            fontSize: "13px",
                            fontWeight: 800,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                            boxShadow: "0 0 20px rgba(245, 158, 11, 0.35)",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <LightningChargeFill size={15} /> ⚡ Bắt Đầu Phân Tích AI Ngay
                        </button>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewPlayerInfo(null);
                              openAnalysisConfigForJob(activeJob);
                            }}
                            style={{
                              background: "rgba(255,255,255,0.06)",
                              border: "1px solid rgba(255,255,255,0.12)",
                              color: "#e2e8f0",
                              padding: "7px 12px",
                              borderRadius: "6px",
                              fontSize: "11.5px",
                              fontWeight: 700,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "5px",
                            }}
                          >
                            <Sliders size={12} color="#fbbf24" /> Chọn Phong Cách
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setPreviewPlayerInfo(null);
                              onNavigate?.("story");
                            }}
                            style={{
                              background: "rgba(255,255,255,0.06)",
                              border: "1px solid rgba(255,255,255,0.12)",
                              color: "#e2e8f0",
                              padding: "7px 12px",
                              borderRadius: "6px",
                              fontSize: "11.5px",
                              fontWeight: 700,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "5px",
                            }}
                          >
                            <ChatQuoteFill size={12} color="#fbbf24" /> Studio Kịch Bản
                          </button>
                        </div>
                      </div>

                    </div>
                  )}

                  {/* Scenes Footer (if has scenes) */}
                  {hasScenes && (
                    <div style={{ padding: "10px 14px", borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(26, 30, 43, 0.6)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
                      <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                        ✨ Đã trích xuất {scenes.length} phân cảnh
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewPlayerInfo(null);
                            openAnalysisConfigForJob(activeJob);
                          }}
                          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#e2e8f0", padding: "4px 8px", borderRadius: "5px", fontSize: "11px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                        >
                          <ArrowRepeat size={11} color="#fbbf24" /> Phân tích lại
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExportToStory(activeJob)}
                          style={{ background: "rgba(245, 158, 11, 0.15)", border: "1px solid rgba(245, 158, 11, 0.3)", color: "#fbbf24", padding: "4px 10px", borderRadius: "5px", fontSize: "11px", fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                        >
                          <ChatQuoteFill size={11} /> Kịch Bản Voice Studio
                        </button>
                      </div>
                    </div>
                  )}

                </div>

              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL 4: ADD NEW VIDEOS MODAL */}
      {showAddModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999, padding: "20px" }}>
          <div style={{ background: "#10131c", border: "1px solid rgba(245, 158, 11, 0.35)", borderRadius: "12px", width: "100%", maxWidth: "500px", padding: "20px", boxShadow: "0 20px 50px rgba(0,0,0,0.6)" }}>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "10px", marginBottom: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <PlusLg size={16} color="#fbbf24" />
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
              <div style={{ background: "rgba(26, 30, 43, 0.5)", border: "1px dashed rgba(245, 158, 11, 0.4)", borderRadius: "8px", padding: "16px", textAlign: "center" }}>
                <FolderFill size={28} color="#fbbf24" style={{ margin: "0 auto 8px" }} />
                <h4 style={{ fontSize: "13px", fontWeight: 700, color: "#f8fafc", margin: "0 0 3px" }}>
                  Chọn File Video Từ Máy Tính
                </h4>
                <p style={{ fontSize: "11px", color: "#94a3b8", margin: "0 0 12px" }}>
                  Hỗ trợ nạp 1 hoặc nhiều video cùng lúc (MP4, MKV, MOV, AVI, WEBM).
                </p>
                <button
                  type="button"
                  onClick={handlePickFiles}
                  style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)", color: "#12151f", border: "none", padding: "7px 16px", borderRadius: "6px", fontSize: "12px", fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "5px" }}
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
                    style={{ flex: 1, background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255, 255, 255, 0.12)", borderRadius: "6px", padding: "7px 10px", color: "#f8fafc", fontSize: "12px", outline: "none" }}
                  />
                  <button
                    type="button"
                    onClick={handleAddUrlSubmit}
                    disabled={!inputUrl.trim() || isAddingUrl}
                    style={{ background: "rgba(245, 158, 11, 0.15)", border: "1px solid rgba(245, 158, 11, 0.4)", color: "#fbbf24", padding: "7px 14px", borderRadius: "6px", fontSize: "12px", fontWeight: 700, cursor: "pointer", flexShrink: 0 }}
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
          <div style={{ background: "#10131c", border: "1px solid rgba(245, 158, 11, 0.4)", borderRadius: "12px", width: "100%", maxWidth: "520px", boxShadow: "0 25px 60px rgba(0,0,0,0.7)", padding: "20px" }}>
            
            {/* Modal header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "10px", marginBottom: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <KeyFill size={17} color="#fbbf24" />
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
                style={{ width: "100%", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255, 255, 255, 0.12)", borderRadius: "6px", padding: "8px 10px", color: "#f8fafc", fontSize: "13px", outline: "none" }}
              />
            </div>

            {/* Helper Links */}
            {selectedProvider?.providerType === "gemini" && (
              <div style={{ background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.2)", borderRadius: "6px", padding: "8px 12px", marginBottom: "14px", fontSize: "11.5px", color: "#94a3b8" }}>
                💡 Chưa có key Google Gemini? Lấy API Key miễn phí tại:{" "}
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: "#fbbf24", fontWeight: 700, textDecoration: "underline" }}>
                  Google AI Studio ↗
                </a>
              </div>
            )}
            {selectedProvider?.providerType === "openai" && (
              <div style={{ background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.2)", borderRadius: "6px", padding: "8px 12px", marginBottom: "14px", fontSize: "11.5px", color: "#94a3b8" }}>
                💡 Lấy API Key OpenAI tại:{" "}
                <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" style={{ color: "#fbbf24", fontWeight: 700, textDecoration: "underline" }}>
                  OpenAI Platform ↗
                </a>
              </div>
            )}
            {selectedProvider?.providerType === "deepseek" && (
              <div style={{ background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.2)", borderRadius: "6px", padding: "8px 12px", marginBottom: "14px", fontSize: "11.5px", color: "#94a3b8" }}>
                💡 Lấy API Key DeepSeek tại:{" "}
                <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noreferrer" style={{ color: "#fbbf24", fontWeight: 700, textDecoration: "underline" }}>
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
                style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)", color: "#12151f", border: "none", padding: "6px 16px", borderRadius: "6px", fontSize: "12px", fontWeight: 800, cursor: apiKeyInput.trim() ? "pointer" : "not-allowed", opacity: apiKeyInput.trim() ? 1 : 0.6 }}
              >
                Lưu & Kích Hoạt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: CUSTOM SCRIPT PROMPT MODAL */}
      {showPromptModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999999, padding: "20px" }}>
          <div style={{ background: "#10131c", border: "1px solid rgba(245, 158, 11, 0.45)", borderRadius: "14px", width: "100%", maxWidth: "880px", maxHeight: "92vh", display: "flex", flexDirection: "column", boxShadow: "0 25px 60px rgba(0,0,0,0.8)", padding: "20px 24px" }}>
            
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "14px", borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "rgba(245, 158, 11, 0.15)", color: "#fbbf24", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(245, 158, 11, 0.3)" }}>
                  <PencilSquare size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#f8fafc", margin: 0 }}>
                    Tùy Chỉnh Prompt & Cấu Trúc Kịch Bản AI
                  </h3>
                  <span style={{ fontSize: "11.5px", color: "#94a3b8" }}>
                    Cấu hình prompt mẫu hướng dẫn AI bóc tách ngữ cảnh, thời gian, hành động và lời kể chuyện
                  </span>
                </div>
              </div>
              <button type="button" onClick={() => setShowPromptModal(false)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}>
                <XLg size={16} />
              </button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "14px", paddingRight: "4px" }}>
              
              {/* Style selection chips */}
              <div style={{ width: "100%", boxSizing: "border-box" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#cbd5e1", marginBottom: "6px" }}>
                  🎯 CHỌN PHONG CÁCH KỊCH BẢN MẪU (PRESET)
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "8px", width: "100%", boxSizing: "border-box" }}>
                  {PRESET_PROMPTS.map((pr) => {
                    const isSelected = selectedPresetId === pr.id || defaultPrompt === pr.prompt;
                    return (
                      <div
                        key={pr.id}
                        onClick={() => handleSelectPreset(pr)}
                        style={{
                          background: isSelected ? "rgba(217, 119, 6, 0.22)" : "rgba(26, 30, 43, 0.5)",
                          border: isSelected ? "1.5px solid #f59e0b" : "1px solid rgba(255,255,255,0.06)",
                          borderRadius: "8px",
                          padding: "9px 11px",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          boxShadow: isSelected ? "0 0 12px rgba(245, 158, 11, 0.2)" : "none",
                          minWidth: 0,
                          width: "100%",
                          boxSizing: "border-box",
                          overflow: "hidden",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3px", minWidth: 0 }}>
                          <strong style={{ fontSize: "11.5px", color: isSelected ? "#fbbf24" : "#f1f5f9", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: "1 1 0%", minWidth: 0, paddingRight: "4px" }}>
                            {pr.title}
                          </strong>
                          {isSelected && <span style={{ fontSize: "11px", color: "#fbbf24", fontWeight: 800, flexShrink: 0 }}>✓</span>}
                        </div>
                        <span style={{ fontSize: "10px", color: "#94a3b8", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.35, wordBreak: "break-word" }}>
                          {pr.desc}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Master Prompt Textarea */}
              <div style={{ background: "rgba(18, 22, 32, 0.95)", border: "1.5px solid rgba(245, 158, 11, 0.5)", borderRadius: "10px", padding: "14px 16px", boxShadow: "0 0 20px rgba(245, 158, 11, 0.12)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "6px" }}>
                  <label style={{ fontSize: "13px", fontWeight: 800, color: "#fbbf24", textTransform: "uppercase", letterSpacing: "0.3px", margin: 0 }}>
                    ✍️ PROMPT ĐIỀU KHIỂN AI CHI TIẾT (SYSTEM PROMPT)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      handleSelectPreset(PRESET_PROMPTS[0]);
                      showToast("✓ Đã khôi phục prompt chuẩn Cops & Biên Kịch 3 Hồi");
                    }}
                    style={{ background: "rgba(245, 158, 11, 0.12)", border: "1px solid rgba(245, 158, 11, 0.3)", color: "#fbbf24", padding: "3px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}
                  >
                    Khôi phục prompt mặc định
                  </button>
                </div>
                <textarea
                  rows={13}
                  value={defaultPrompt}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDefaultPrompt(val);
                    setSelectedPresetId("__custom__");
                    try {
                      localStorage.setItem("jacs_default_prompt", val);
                      localStorage.setItem("jacs_selected_preset_id", "__custom__");
                    } catch {}
                  }}
                  placeholder="Nội dung prompt phân tích chi tiết..."
                  style={{
                    width: "100%",
                    minHeight: "220px",
                    background: "rgba(0, 0, 0, 0.55)",
                    border: "1px solid rgba(245, 158, 11, 0.35)",
                    borderRadius: "8px",
                    padding: "10px 12px",
                    color: "#f8fafc",
                    fontSize: "12.5px",
                    lineHeight: 1.5,
                    fontFamily: "monospace",
                    outline: "none",
                    resize: "vertical",
                    boxShadow: "inset 0 2px 6px rgba(0,0,0,0.5)",
                  }}
                />
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,0.08)", background: "rgba(26, 30, 43, 0.7)" }}>
              <span style={{ fontSize: "11px", color: "#64748b" }}>
                Prompt sẽ được áp dụng cho các lần phân tích video tiếp theo
              </span>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => setShowPromptModal(false)}
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#e2e8f0", padding: "6px 14px", borderRadius: "6px", fontSize: "12px", cursor: "pointer" }}
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPromptModal(false);
                    showToast("✓ Đã lưu prompt kịch bản thành công!");
                  }}
                  style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)", color: "#12151f", border: "none", padding: "6px 18px", borderRadius: "6px", fontSize: "12px", fontWeight: 800, cursor: "pointer" }}
                >
                  Lưu Cấu Hình
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
