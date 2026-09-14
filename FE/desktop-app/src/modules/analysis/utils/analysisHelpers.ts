import type { Job, ProviderProfile } from "../../../core/types";
import { isNativeRuntime } from "../../../core/runtime";

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

export function formatAiScore(score?: number): string {
  if (score === undefined || score === null || isNaN(score)) return "9.5/10";
  if (score > 10) return `${(score / 10).toFixed(1)}/10`;
  return `${score.toFixed(1)}/10`;
}

export function formatTokenUsage(job: Job): { text: string; subText: string; isUsed: boolean } {
  const isCompleted = job.status === "completed" || Boolean(job.analysis?.scenes?.length);
  const isRunning = job.status === "running";

  if (isCompleted) {
    const rawTokens = job.tokensUsed || job.analysis?.tokensUsed;
    const tokens =
      rawTokens && rawTokens > 0
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

export function formatDuration(seconds?: number): string {
  if (!seconds || isNaN(seconds)) return "12:30";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function resolveMediaSrc(pathOrUrl?: string): string {
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

export function cleanVoiceoverText(text?: string): string {
  return String(text || "")
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
}

export function getEffectivePromptWithDuration(
  promptText: string,
  mode: "rules" | "fixed",
  durationKey: "full" | "60s" | "3m" | "5m" | "10m" | "15m" | "custom",
  customMins: number,
  options?: {
    emphasizeHook?: boolean;
    narratorEnabled?: boolean;
  }
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

  if (options?.emphasizeHook) {
    finalPrompt += `\n\n# 🚨 ĐẶC BIỆT - PHÂN CẢNH 1 (HOOK CAO TRÀO 5-10S ĐẦU):
1. NHẶT ĐOẠN CAO TRÀO: Hãy nhặt đúng khoảnh khắc giật gân, nghẹt thở nhất của video (tiếng còi hú cảnh sát, tiếng súng, tiếng rượt đuổi hoặc tiếng la hét/đối thoại gay cấn của nhân vật).
2. ÂM THANH GỐC & VOICE REVIEW: Giữ nguyên 2-3 giây đầu cho âm thanh hiện trường/tiếng còi hú bùng nổ, câu kể voiceover ngắn gọn, đanh thép sẽ nối tiếp ngay sau đó để giật hook giữ chân người xem tối đa.`;
  }

  finalPrompt += `\n\n# ⚡ TỐI ƯU NHỊP ĐIỆU & NGẮT NGHỈ DỒN DẬP (PACING):
- Các câu kể voiceover phải viết dồn dập, gãy gọn, giàu tính hành động và cảm xúc.
- Giảm thiểu tối đa khoảng lặng thừa giữa các câu (ngắt nghỉ chỉ 0.15s - 0.25s), giúp mạch dẫn chuyện liền mạch, gay cấn và cuốn hút như các kênh Review Phim triệu view.`;

  if (options?.narratorEnabled === false) {
    finalPrompt += `\n\n# 🎬 CHẾ ĐỘ CẮT GHÉP HIGHLIGHT THUẦN TIẾNG GỐC (KHÔNG CẦN LỒNG TIẾNG VOICE AI):
1. NHIỆM VỤ: Hãy tìm và nhặt ra các phân cảnh kịch tính, dồn dập, đắt giá nhất của video gốc (cảnh sát rượt đuổi, còi hú, đối thoại gay cấn, tội phạm phản kháng, tiếng súng, tiếng hò hét).
2. TỪNG PHÂN CẢNH: Chỉ định chính xác mốc "source_start" và "source_end" của đoạn video gốc đó. Hệ thống sẽ tự động cắt các đoạn này và nối lại liền mạch với 100% âm thanh thực tế của hiện trường.
3. Trường "voiceover": Chỉ ghi mô tả ngắn sự kiện hoặc đối thoại có trong cảnh.`;
  }

  return finalPrompt;
}
