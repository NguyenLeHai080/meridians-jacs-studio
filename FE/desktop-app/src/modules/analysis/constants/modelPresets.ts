import type { DurationMappingRule } from "../../../core/types";

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

export const DEFAULT_DURATION_RULES: DurationMappingRule[] = [
  { id: "rule-1", minInputMinutes: 0, maxInputMinutes: 10, targetOutputMinutes: 2, label: "0 - 10 phút" },
  { id: "rule-2", minInputMinutes: 10, maxInputMinutes: 25, targetOutputMinutes: 5, label: "10 - 25 phút" },
  { id: "rule-3", minInputMinutes: 25, maxInputMinutes: 60, targetOutputMinutes: 8, label: "25 - 60 phút" },
  { id: "rule-4", minInputMinutes: 60, maxInputMinutes: 9999, targetOutputMinutes: 12, label: "> 60 phút" },
];
