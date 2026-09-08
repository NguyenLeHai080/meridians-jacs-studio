import React, { useState, useEffect, useMemo } from "react";
import {
  Bot,
  Zap,
  Check,
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  Sparkles,
  Link as LinkIcon,
  X,
  ShieldCheck,
  Cpu,
  Layers,
  AudioLines,
  FileText,
  Radio,
  CheckCircle2,
  Info,
} from "lucide-react";
import { useI18n } from "../../../../core/i18n";
import type { Provider } from "../../../../core/types";
import {
  providerService,
  type CreateProviderPayload,
  type UpdateProviderPayload,
  type ProviderType,
} from "../../services/providerService";

export interface ModelDetail {
  id: string;
  name: string;
  category: "analysis" | "vision" | "reasoning" | "fast" | "tts" | "transcription";
  badge: string;
  description: string;
  contextWindow?: string;
  isTts?: boolean;
}

export interface ProviderConfig {
  name: string;
  type: "openai" | "gemini" | "anthropic" | "openai-compatible" | "custom";
  baseUrl: string;
  defaultModel: string;
  models: ModelDetail[];
  loginUrl?: string;
  loginLabel?: string;
  ttsModel?: string;
  capabilities: string[];
  hint: string;
  isGateway?: boolean;
}

export const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
  meridians: {
    name: "Meridians Gateway (NexoraTech)",
    type: "openai-compatible",
    baseUrl: "https://api-meridians.nexoratech.com.vn/v1",
    defaultModel: "claude-opus-4.8",
    ttsModel: "eleven_multilingual_v2",
    loginUrl: "https://jacs-studio.nexoratech.com.vn",
    loginLabel: "🌐 Cổng AI Gateway Trung Tâm",
    capabilities: ["analysis", "vision", "transcription", "tts"],
    hint: "AI Gateway trung tâm JACS Studio (NexoraTech): Tích hợp toàn diện Claude Opus 4.8, GPT-4o, Gemini Pro 2M, DeepSeek R1, Voice TTS và Whisper.",
    isGateway: true,
    models: [
      {
        id: "claude-opus-4.8",
        name: "Claude Opus 4.8",
        category: "analysis",
        badge: "🎬 Kịch bản điện ảnh",
        description: "Tư duy sáng tạo kịch bản đỉnh cao, lời bình điện ảnh, phân tích tâm lý nhân vật và phân cảnh sâu sắc nhất thế giới.",
        contextWindow: "200K tokens",
      },
      {
        id: "claude-opus-4.8-thinking",
        name: "Claude Opus 4.8 Thinking",
        category: "reasoning",
        badge: "🧠 Suy luận sâu",
        description: "Mô hình kèm luồng suy luận logic chi tiết từng bước (Chain-of-Thought) giải quyết kịch bản đa tuyến nhân vật phức tạp.",
        contextWindow: "200K tokens",
      },
      {
        id: "claude-3-5-sonnet-latest",
        name: "Claude 3.5 Sonnet",
        category: "analysis",
        badge: "🎬 Kịch bản Viral",
        description: "Văn phong tiếng Việt tự nhiên nhất, tạo hook mở đầu cuốn hút, kịch bản sắc bén chuẩn xu hướng TikTok & YouTube.",
        contextWindow: "200K tokens",
      },
      {
        id: "gpt-4o",
        name: "OpenAI GPT-4o",
        category: "vision",
        badge: "👁️ Thị giác & Đa năng",
        description: "Nhận diện thị giác khung hình video, phân tích biểu cảm nhân vật, bối cảnh và trích xuất phân cảnh tự động.",
        contextWindow: "128K tokens",
      },
      {
        id: "gpt-4o-mini",
        name: "OpenAI GPT-4o Mini",
        category: "fast",
        badge: "⚡ Nhanh & Tiết kiệm",
        description: "Tốc độ xử lý cao, tối ưu chi phí phân tích kịch bản hàng loạt với độ chính xác chuẩn mực.",
        contextWindow: "128K tokens",
      },
      {
        id: "o3-mini",
        name: "OpenAI o3-mini",
        category: "reasoning",
        badge: "🧠 Logic đa bước",
        description: "Tư duy logic giải quyết bài toán cốt truyện khó, phản biện kịch bản và phân loại phân cảnh.",
        contextWindow: "128K tokens",
      },
      {
        id: "gemini-2.5-pro",
        name: "Gemini 2.5 Pro",
        category: "vision",
        badge: "👁️ Siêu ngữ cảnh 2M",
        description: "Cửa sổ ngữ cảnh 2 triệu tokens: Nạp toàn bộ video dài 1-2 tiếng để phân tích trọn vẹn mạch phim mà không cần cắt nhỏ.",
        contextWindow: "2M tokens",
      },
      {
        id: "gemini-2.5-flash",
        name: "Gemini 2.5 Flash",
        category: "fast",
        badge: "⚡ Trích xuất siêu tốc",
        description: "Xử lý hàng trăm khung hình mỗi giây, trích xuất cảnh và phân loại video thời gian thực.",
        contextWindow: "1M tokens",
      },
      {
        id: "deepseek-reasoner",
        name: "DeepSeek R1",
        category: "reasoning",
        badge: "🧠 Suy luận R1",
        description: "Mô hình suy luận mã nguồn mở thông minh tương đương o1 với chi phí siêu rẻ.",
        contextWindow: "64K tokens",
      },
      {
        id: "deepseek-chat",
        name: "DeepSeek V3",
        category: "analysis",
        badge: "🎬 Kịch bản V3",
        description: "Mô hình tổng hợp ngôn ngữ đa năng, viết kịch bản trôi chảy và chi phí cực thấp.",
        contextWindow: "64K tokens",
      },
      {
        id: "cc/claude-opus-5",
        name: "Claude Opus 5 (Next-Gen)",
        category: "analysis",
        badge: "🚀 Thế hệ mới",
        description: "Thế hệ Claude Opus tương lai hỗ trợ các tác vụ phân tích kịch bản phức tạp nhất.",
        contextWindow: "256K tokens",
      },
      {
        id: "whisper-large-v3",
        name: "Whisper Large v3",
        category: "transcription",
        badge: "🎙️ Bóc tách Sub 99%",
        description: "Bóc tách phụ đề từ âm thanh video với độ chính xác 99%, bắt chuẩn từng dấu ngắt câu tiếng Việt.",
        contextWindow: "Audio",
      },
      {
        id: "eleven_multilingual_v2",
        name: "ElevenLabs Voice v2",
        category: "tts",
        badge: "🗣️ Lồng tiếng Hollywood",
        description: "Giọng đọc truyền cảm chuẩn studio Hollywood, đầy đủ tiếng thở và biến chuyển cảm xúc kịch tính.",
        contextWindow: "TTS",
        isTts: true,
      },
      {
        id: "vi-manhdung",
        name: "Vbee Mạnh Dũng",
        category: "tts",
        badge: "🗣️ Review Phim VN",
        description: "Giọng đọc Review Phim triệu view nổi tiếng nhất Việt Nam với ngữ điệu ngắt nghỉ hào hứng.",
        contextWindow: "TTS",
        isTts: true,
      },
    ],
  },
  gemini: {
    name: "Google Gemini",
    type: "gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    defaultModel: "gemini-flash-latest",
    loginUrl: "https://aistudio.google.com/app/apikey",
    loginLabel: "🌐 Đăng Nhập Google AI Studio & Lấy API Key Miễn Phí",
    capabilities: ["analysis", "vision"],
    hint: "AI tốc độ cao của Google với cửa sổ ngữ cảnh video cực sâu 2M tokens và hạn mức miễn phí lớn.",
    models: [
      {
        id: "gemini-2.5-pro",
        name: "Gemini 2.5 Pro",
        category: "vision",
        badge: "👁️ Siêu ngữ cảnh 2M",
        description: "Phân tích toàn bộ video dài tới 2 tiếng, nhận diện chi tiết từng góc quay và chuyển động.",
        contextWindow: "2M tokens",
      },
      {
        id: "gemini-2.5-flash",
        name: "Gemini 2.5 Flash",
        category: "fast",
        badge: "⚡ Siêu tốc độ",
        description: "Tốc độ phản hồi dưới 1 giây, phù hợp bóc tách hàng trăm video cùng lúc.",
        contextWindow: "1M tokens",
      },
      {
        id: "gemini-flash-latest",
        name: "Gemini Flash (Latest)",
        category: "analysis",
        badge: "🎬 Kịch bản chuẩn",
        description: "Bản Flash ổn định được Google tối ưu cho phân tích kịch bản và tóm tắt.",
        contextWindow: "1M tokens",
      },
      {
        id: "gemini-flash-lite-latest",
        name: "Gemini Flash Lite",
        category: "fast",
        badge: "⚡ Siêu nhẹ & Free",
        description: "Bản tối giản tiết kiệm hạn mức tối đa, phù hợp tác vụ cơ bản.",
        contextWindow: "500K tokens",
      },
      {
        id: "gemini-3.7-flash",
        name: "Gemini 3.7 Flash",
        category: "fast",
        badge: "🚀 Thế hệ 3.7",
        description: "Thế hệ mô hình Flash mới nhất tích hợp khả năng suy luận thích ứng.",
        contextWindow: "1M tokens",
      },
      {
        id: "gemini-pro-latest",
        name: "Gemini Pro (Latest)",
        category: "analysis",
        badge: "🎬 Phân tích sâu",
        description: "Mô hình Pro đa năng dành cho các bài phân tích chuyên sâu.",
        contextWindow: "1M tokens",
      },
    ],
  },
  openai: {
    name: "OpenAI ChatGPT",
    type: "openai",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    ttsModel: "tts-1",
    loginUrl: "https://platform.openai.com/api-keys",
    loginLabel: "🌐 Đăng Nhập OpenAI Platform & Lấy Key ChatGPT",
    capabilities: ["analysis", "vision", "transcription", "tts"],
    hint: "Mô hình GPT-4o & o3-mini hàng đầu: Hỗ trợ thị giác nhận diện video, bóc phụ đề Whisper và giọng đọc TTS chất lượng cao.",
    models: [
      {
        id: "gpt-4o",
        name: "GPT-4o (Omni)",
        category: "vision",
        badge: "👁️ Thị giác & Kịch bản",
        description: "Đỉnh cao đa phương thức: Phân tích khung hình, nhận diện nhân vật và viết kịch bản đa phong cách.",
        contextWindow: "128K tokens",
      },
      {
        id: "gpt-4o-mini",
        name: "GPT-4o Mini",
        category: "fast",
        badge: "⚡ Nhanh & Giá rẻ",
        description: "Tối ưu hóa chi phí với tốc độ cao, hoàn hảo cho các tác vụ phân đoạn kịch bản hàng ngày.",
        contextWindow: "128K tokens",
      },
      {
        id: "o3-mini",
        name: "o3-mini (Reasoning)",
        category: "reasoning",
        badge: "🧠 Suy luận logic",
        description: "Tư duy logic giải quyết bài toán phức tạp, phân loại cảnh quay và lập kế hoạch biên tập.",
        contextWindow: "128K tokens",
      },
      {
        id: "o1-preview",
        name: "o1 Preview",
        category: "reasoning",
        badge: "🧠 Suy luận sâu",
        description: "Mô hình tư duy chuyên sâu của OpenAI dành cho các bài toán phân tích học thuật.",
        contextWindow: "128K tokens",
      },
      {
        id: "gpt-4-turbo",
        name: "GPT-4 Turbo",
        category: "analysis",
        badge: "🎬 Ngữ cảnh 128K",
        description: "Mô hình GPT-4 chuẩn mực với cửa sổ ngữ cảnh lớn cho văn bản dài.",
        contextWindow: "128K tokens",
      },
      {
        id: "tts-1",
        name: "TTS-1 Voice",
        category: "tts",
        badge: "🗣️ Giọng đọc chuẩn",
        description: "Giọng đọc AI tự nhiên chất lượng cao với các giọng Alloy, Echo, Fable, Onyx, Nova, Shimmer.",
        contextWindow: "Audio",
        isTts: true,
      },
      {
        id: "tts-1-hd",
        name: "TTS-1 HD Voice",
        category: "tts",
        badge: "🗣️ Giọng đọc HD",
        description: "Chất lượng âm thanh trung thực cao 24kHz dành cho sản xuất video chuyên nghiệp.",
        contextWindow: "Audio",
        isTts: true,
      },
      {
        id: "whisper-1",
        name: "Whisper 1",
        category: "transcription",
        badge: "🎙️ Bóc phụ đề",
        description: "Nhận diện giọng nói và sinh phụ đề tự động đa ngôn ngữ.",
        contextWindow: "Audio",
      },
    ],
  },
  anthropic: {
    name: "Anthropic Claude",
    type: "anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    defaultModel: "claude-3-5-sonnet-latest",
    loginUrl: "https://console.anthropic.com/settings/keys",
    loginLabel: "🌐 Đăng Nhập Anthropic Console & Lấy Key Claude",
    capabilities: ["analysis", "vision"],
    hint: "Claude 3.5 Sonnet chuyên viết kịch bản, lời bình video sâu sắc, giàu cảm xúc và tự nhiên nhất thế giới.",
    models: [
      {
        id: "claude-3-5-sonnet-latest",
        name: "Claude 3.5 Sonnet",
        category: "analysis",
        badge: "🎬 Lời bình đỉnh cao",
        description: "Văn phong tiếng Việt mượt mà, sâu sắc, kịch tính nhất; chuyên viết kịch bản review phim và phóng sự.",
        contextWindow: "200K tokens",
      },
      {
        id: "claude-3-5-haiku-latest",
        name: "Claude 3.5 Haiku",
        category: "fast",
        badge: "⚡ Siêu tốc độ",
        description: "Tốc độ xử lý cực nhanh với chi phí thấp, tối ưu cho sinh câu mở đầu (Hook) và tóm tắt cảnh.",
        contextWindow: "200K tokens",
      },
      {
        id: "claude-3-opus-latest",
        name: "Claude 3 Opus",
        category: "analysis",
        badge: "🧠 Lập luận văn học",
        description: "Khả năng phân tích tâm lý nhân vật và chủ đề phim phức tạp với chiều sâu triết lý.",
        contextWindow: "200K tokens",
      },
    ],
  },
  deepseek: {
    name: "DeepSeek AI",
    type: "openai-compatible",
    baseUrl: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat",
    loginUrl: "https://platform.deepseek.com/api_keys",
    loginLabel: "🌐 Đăng Nhập DeepSeek Platform & Lấy Key",
    capabilities: ["analysis"],
    hint: "DeepSeek-V3 & R1: Trí tuệ nhân tạo thế hệ mới với khả năng suy luận xuất sắc và chi phí tiết kiệm 95%.",
    models: [
      {
        id: "deepseek-chat",
        name: "DeepSeek-V3",
        category: "analysis",
        badge: "🎬 Kịch bản V3",
        description: "Mô hình ngôn ngữ thế hệ mới: Viết kịch bản tự nhiên, giàu thông tin với chi phí siêu tiết kiệm.",
        contextWindow: "64K tokens",
      },
      {
        id: "deepseek-reasoner",
        name: "DeepSeek-R1",
        category: "reasoning",
        badge: "🧠 Suy luận R1",
        description: "Tư duy logic từng bước (Chain-of-Thought) vượt trội, phân tích cốt truyện chặt chẽ.",
        contextWindow: "64K tokens",
      },
    ],
  },
  elevenlabs: {
    name: "ElevenLabs (Voice)",
    type: "openai-compatible",
    baseUrl: "https://api.elevenlabs.io/v1",
    defaultModel: "eleven_multilingual_v2",
    ttsModel: "eleven_multilingual_v2",
    loginUrl: "https://elevenlabs.io/app/api-keys",
    loginLabel: "🌐 Đăng Ký & Lấy API Key ElevenLabs",
    capabilities: ["tts"],
    hint: "Bộ Voice AI số 1 thế giới: Có tiếng thở, ngắt nghỉ như người thật, thăng trầm kịch tính và nhân bản giọng nói theo yêu cầu.",
    models: [
      {
        id: "eleven_multilingual_v2",
        name: "Multilingual v2",
        category: "tts",
        badge: "🗣️ Chuẩn Điện Ảnh",
        description: "Voice AI số 1 thế giới: Giọng đọc có hơi thở, ngữ điệu kịch tính, ngắt nghỉ như diễn viên lồng tiếng thật.",
        contextWindow: "TTS",
        isTts: true,
      },
      {
        id: "eleven_turbo_v2_5",
        name: "Turbo v2.5",
        category: "tts",
        badge: "⚡ Sinh âm siêu nhanh",
        description: "Tốc độ sinh âm thanh gấp 3 lần, giảm tối đa thời gian chờ render giọng đọc.",
        contextWindow: "TTS",
        isTts: true,
      },
      {
        id: "eleven_flash_v2_5",
        name: "Flash v2.5",
        category: "tts",
        badge: "⚡ Độ trễ cực thấp",
        description: "Độ trễ dưới 100ms dành cho xử lý giọng đọc tức thời.",
        contextWindow: "TTS",
        isTts: true,
      },
    ],
  },
  vbee: {
    name: "Vbee AIVoice",
    type: "openai-compatible",
    baseUrl: "https://api.vbee.vn/api/v1",
    defaultModel: "vi-manhdung",
    ttsModel: "vi-manhdung",
    loginUrl: "https://vbee.vn",
    loginLabel: "🌐 Đăng Nhập Vbee AIVoice Studio",
    capabilities: ["tts"],
    hint: "Giọng đọc Review Phim quốc dân Việt Nam (Mạnh Dũng, Minh Hoàng, Mai Phương) với ngữ điệu ngắt nghỉ tự nhiên.",
    models: [
      {
        id: "vi-manhdung",
        name: "Mạnh Dũng (Nam Bắc)",
        category: "tts",
        badge: "🗣️ Review Phim #1",
        description: "Giọng đọc Review Phim quốc dân số 1 Việt Nam: Ngữ điệu kịch tính, dồn dập, hút người xem.",
        contextWindow: "TTS",
        isTts: true,
      },
      {
        id: "vi-minhhoang",
        name: "Minh Hoàng (Nam Bắc)",
        category: "tts",
        badge: "🗣️ Kể chuyện truyền cảm",
        description: "Giọng đọc trầm ấm, truyền cảm, phù hợp phóng sự, tóm tắt sách và kể chuyện đời.",
        contextWindow: "TTS",
        isTts: true,
      },
      {
        id: "vi-maiphuong",
        name: "Mai Phương (Nữ Bắc)",
        category: "tts",
        badge: "🗣️ Nữ ngọt ngào",
        description: "Giọng nữ thanh lịch, truyền cảm cho quảng cáo, tin tức và kịch bản nhẹ nhàng.",
        contextWindow: "TTS",
        isTts: true,
      },
      {
        id: "vi-ngochoang",
        name: "Ngọc Hoàng (Nam Trung)",
        category: "tts",
        badge: "🗣️ Giọng miền Trung",
        description: "Giọng đọc đặc trưng miền Trung trang trọng, tự nhiên.",
        contextWindow: "TTS",
        isTts: true,
      },
    ],
  },
  groq: {
    name: "Groq (Siêu Tốc)",
    type: "openai-compatible",
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
    loginUrl: "https://console.groq.com/keys",
    loginLabel: "🌐 Đăng Nhập Groq Cloud & Lấy Key Miễn Phí",
    capabilities: ["analysis", "transcription"],
    hint: "Phần cứng chip LPU xử lý tốc độ hàng ngàn token/s. Hỗ trợ Whisper bóc phụ đề video siêu nhanh và hoàn toàn miễn phí.",
    models: [
      {
        id: "llama-3.3-70b-versatile",
        name: "Llama 3.3 70B",
        category: "analysis",
        badge: "🎬 Llama 3.3 70B",
        description: "Chạy trên chip LPU tốc độ 300 token/s, phân tích kịch bản thông minh.",
        contextWindow: "128K tokens",
      },
      {
        id: "llama-3.1-8b-instant",
        name: "Llama 3.1 8B Instant",
        category: "fast",
        badge: "⚡ 800 token/s",
        description: "Tốc độ ánh sáng, tóm tắt và sinh thẻ tag tức thì.",
        contextWindow: "128K tokens",
      },
      {
        id: "whisper-large-v3",
        name: "Whisper Large v3",
        category: "transcription",
        badge: "🎙️ Bóc Sub 99%",
        description: "Bóc phụ đề video tiếng Việt chính xác 99% tốc độ siêu tốc và hoàn toàn miễn phí.",
        contextWindow: "Audio",
      },
      {
        id: "whisper-large-v3-turbo",
        name: "Whisper Large v3 Turbo",
        category: "transcription",
        badge: "⚡ Bóc Sub siêu tốc",
        description: "Phiên bản Turbo rút ngắn thời gian bóc tách video xuống còn vài giây.",
        contextWindow: "Audio",
      },
    ],
  },
  openrouter: {
    name: "OpenRouter / Aggr",
    type: "openai-compatible",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "openai/gpt-4o-mini",
    loginUrl: "https://openrouter.ai/keys",
    loginLabel: "🌐 Đăng Nhập OpenRouter & Lấy Key",
    capabilities: ["analysis", "vision", "transcription", "tts"],
    hint: "Cổng kết nối hàng trăm mô hình AI trên toàn cầu qua 1 API key duy nhất.",
    models: [
      {
        id: "anthropic/claude-3.5-sonnet",
        name: "Claude 3.5 Sonnet",
        category: "analysis",
        badge: "🎬 Kịch bản",
        description: "Claude 3.5 Sonnet qua cổng kết nối OpenRouter.",
      },
      {
        id: "openai/gpt-4o",
        name: "GPT-4o",
        category: "vision",
        badge: "👁️ Thị giác",
        description: "GPT-4o đa phương thức qua OpenRouter.",
      },
      {
        id: "google/gemini-2.0-flash-exp:free",
        name: "Gemini 2.0 Flash (Free)",
        category: "fast",
        badge: "⚡ Miễn phí",
        description: "Model Gemini 2.0 Flash miễn phí không tốn credit.",
      },
      {
        id: "deepseek/deepseek-r1",
        name: "DeepSeek R1",
        category: "reasoning",
        badge: "🧠 Suy luận",
        description: "Mô hình suy luận DeepSeek R1 qua OpenRouter.",
      },
      {
        id: "meta-llama/llama-3.3-70b-instruct",
        name: "Llama 3.3 70B",
        category: "analysis",
        badge: "🎬 Đa năng",
        description: "Mô hình Llama 3.3 70B mã nguồn mở.",
      },
    ],
  },
  ollama: {
    name: "Ollama (Local)",
    type: "openai-compatible",
    baseUrl: "http://localhost:11434/v1",
    defaultModel: "llama3.2",
    capabilities: ["analysis", "vision"],
    hint: "Chạy mô hình AI trực tiếp trên máy tính cá nhân của bạn, bảo mật 100% dữ liệu không cần mạng Internet.",
    models: [
      {
        id: "llama3.2",
        name: "Llama 3.2",
        category: "analysis",
        badge: "💻 Local AI",
        description: "Chạy trực tiếp trên GPU máy tính, không cần mạng Internet.",
      },
      {
        id: "qwen2.5",
        name: "Qwen 2.5",
        category: "analysis",
        badge: "🇻🇳 Tiếng Việt tốt",
        description: "Mô hình Qwen 2.5 hiểu tiếng Việt rất tốt khi chạy offline.",
      },
      {
        id: "mistral",
        name: "Mistral 7B",
        category: "fast",
        badge: "⚡ Nhẹ & Mượt",
        description: "Tối ưu cho máy tính cấu hình vừa phải.",
      },
      {
        id: "llava",
        name: "LLaVA Vision",
        category: "vision",
        badge: "👁️ Thị giác Local",
        description: "Nhận diện hình ảnh offline trên máy tính.",
      },
    ],
  },
  custom: {
    name: "Custom AI",
    type: "custom",
    baseUrl: "https://api.example.com/v1",
    defaultModel: "custom-model",
    capabilities: ["analysis"],
    hint: "Dành cho máy chủ AI nội bộ hoặc proxy riêng của bạn.",
    models: [
      {
        id: "custom-model",
        name: "Custom Model",
        category: "analysis",
        badge: "⚙️ Tùy chỉnh",
        description: "Model tùy chỉnh trên máy chủ riêng của bạn.",
      },
    ],
  },
};

interface ProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  providerToEdit?: Provider | null;
}

export const ProviderModal: React.FC<ProviderModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  providerToEdit,
}) => {
  const { t } = useI18n();

  const [selectedPreset, setSelectedPreset] = useState<string>("meridians");
  const [showApiKey, setShowApiKey] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    id: "",
    name: "Meridians Gateway (NexoraTech)",
    provider_type: "openai-compatible" as ProviderType,
    base_url: "https://api-meridians.nexoratech.com.vn/v1",
    model: "claude-opus-4.8",
    tts_model: "eleven_multilingual_v2",
    api_key: "",
    capabilities: ["analysis", "vision", "transcription", "tts"],
    enabled: true,
  });

  // Active selected model detail
  const currentCfg = PROVIDER_CONFIGS[selectedPreset] || PROVIDER_CONFIGS.meridians;

  const selectedModelDetail = useMemo(() => {
    return currentCfg.models.find((m) => m.id === form.model) || null;
  }, [currentCfg, form.model]);

  // Initialize form when opened or when providerToEdit changes
  useEffect(() => {
    if (providerToEdit) {
      setForm({
        id: providerToEdit.id || "",
        name: providerToEdit.name || "",
        provider_type: (providerToEdit.provider_type as ProviderType) || "openai-compatible",
        base_url: providerToEdit.base_url || "",
        model: providerToEdit.model || "",
        tts_model: providerToEdit.tts_model || "",
        api_key: "",
        capabilities: providerToEdit.capabilities || ["analysis", "vision"],
        enabled: providerToEdit.is_enabled ?? providerToEdit.enabled ?? true,
      });

      // Match preset
      const matched = Object.entries(PROVIDER_CONFIGS).find(
        ([_, cfg]) =>
          cfg.baseUrl.toLowerCase() === (providerToEdit.base_url || "").toLowerCase() ||
          cfg.type === providerToEdit.provider_type
      );
      if (matched) setSelectedPreset(matched[0]);
    } else {
      const defaultCfg = PROVIDER_CONFIGS.meridians;
      setSelectedPreset("meridians");
      setForm({
        id: "",
        name: defaultCfg.name,
        provider_type: defaultCfg.type,
        base_url: defaultCfg.baseUrl,
        model: defaultCfg.defaultModel,
        tts_model: defaultCfg.ttsModel || "",
        api_key: "",
        capabilities: defaultCfg.capabilities,
        enabled: true,
      });
    }
    setError("");
    setShowApiKey(false);
  }, [providerToEdit, isOpen]);

  const handleSelectPreset = (key: string) => {
    const cfg = PROVIDER_CONFIGS[key];
    if (!cfg) return;
    setSelectedPreset(key);
    setForm((prev) => ({
      ...prev,
      name: cfg.name,
      provider_type: cfg.type,
      base_url: cfg.baseUrl,
      model: cfg.defaultModel,
      tts_model: cfg.ttsModel || "",
      capabilities: cfg.capabilities,
    }));
  };

  const handleSelectModel = (modelItem: ModelDetail) => {
    if (modelItem.isTts) {
      setForm((prev) => {
        const nextCaps = Array.from(new Set([...prev.capabilities, "tts"]));
        return {
          ...prev,
          tts_model: modelItem.id,
          capabilities: nextCaps,
        };
      });
    } else {
      setForm((prev) => {
        const nextCaps = new Set(prev.capabilities);
        if (modelItem.category === "analysis" || modelItem.category === "reasoning") nextCaps.add("analysis");
        if (modelItem.category === "vision") {
          nextCaps.add("analysis");
          nextCaps.add("vision");
        }
        if (modelItem.category === "transcription") nextCaps.add("transcription");
        if (modelItem.category === "tts") nextCaps.add("tts");

        return {
          ...prev,
          model: modelItem.id,
          capabilities: Array.from(nextCaps),
        };
      });
    }
  };

  const toggleAllCapabilities = () => {
    const allCaps = ["analysis", "vision", "transcription", "tts"];
    if (form.capabilities.length === allCaps.length) {
      setForm((prev) => ({ ...prev, capabilities: [] }));
    } else {
      setForm((prev) => ({ ...prev, capabilities: allCaps }));
    }
  };

  const handlePasteKey = async () => {
    try {
      if (navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        if (text) setForm((prev) => ({ ...prev, api_key: text.trim() }));
      }
    } catch {
      // Ignored
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (form.id) {
        // Edit mode
        const payload: UpdateProviderPayload = {
          name: form.name.trim(),
          provider_type: form.provider_type,
          base_url: form.base_url.trim(),
          model: form.model.trim(),
          tts_model: form.tts_model.trim() || undefined,
          capabilities: form.capabilities,
          enabled: form.enabled,
        };
        if (form.api_key.trim()) {
          payload.api_key = form.api_key.trim();
        }
        await providerService.updateProvider(form.id, payload);
        onSuccess(`Đã cập nhật provider ${form.name} thành công`);
      } else {
        // Create mode
        if (!form.api_key.trim()) {
          setError("Vui lòng nhập API Key cho Provider");
          setLoading(false);
          return;
        }
        const payload: CreateProviderPayload = {
          name: form.name.trim(),
          provider_type: form.provider_type,
          base_url: form.base_url.trim(),
          model: form.model.trim(),
          tts_model: form.tts_model.trim() || undefined,
          api_key: form.api_key.trim(),
          capabilities: form.capabilities,
          enabled: form.enabled,
        };
        await providerService.createProvider(payload);
        onSuccess(`Đã thêm provider ${form.name} thành công`);
      }
      onClose();
    } catch (err: any) {
      setError(err instanceof Error ? err.message : "Thao tác thất bại");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(8, 12, 20, 0.85)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99999,
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#0b1120",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "760px",
          maxHeight: "94vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 60px rgba(0, 0, 0, 0.75)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          overflow: "hidden",
          color: "#f8fafc",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Modal Top Bar */}
        <div
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#0f172a",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 850,
                color: "#f97316",
                letterSpacing: "0.8px",
                textTransform: "uppercase",
                marginBottom: "2px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Sparkles size={13} />
              <span>MULTI-PROVIDER BYOK & OAUTH ASSISTANT</span>
            </div>
            <h2 style={{ fontSize: "17px", fontWeight: 800, color: "#ffffff", margin: 0 }}>
              {form.id ? "Chỉnh Sửa AI Provider" : "Thêm AI Provider Mới"}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: "#94a3b8",
              borderRadius: "8px",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = "#ffffff")}
            onMouseOut={(e) => (e.currentTarget.style.color = "#94a3b8")}
          >
            <X size={16} />
          </button>
        </div>

        {/* 2. Scrollable Body */}
        <form
          onSubmit={handleSubmit}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: "15px",
          }}
        >
          {error && (
            <div
              style={{
                background: "rgba(225, 29, 72, 0.15)",
                border: "1px solid rgba(225, 29, 72, 0.35)",
                color: "#fecdd3",
                padding: "10px 14px",
                borderRadius: "8px",
                fontSize: "12.5px",
              }}
            >
              {error}
            </div>
          )}

          {/* 2.1 Preset Grid */}
          {!form.id && (
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "11px",
                  fontWeight: 800,
                  color: "#94a3b8",
                  letterSpacing: "0.5px",
                  marginBottom: "8px",
                  textTransform: "uppercase",
                }}
              >
                CHỌN NỀN TẢNG AI BẠN MUỐN KẾT NỐI
              </label>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: "8px",
                }}
              >
                {Object.entries(PROVIDER_CONFIGS).map(([key, cfg]) => {
                  const isSelected = selectedPreset === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleSelectPreset(key)}
                      style={{
                        background: isSelected
                          ? "linear-gradient(135deg, rgba(249, 115, 22, 0.28), rgba(15, 23, 42, 0.95))"
                          : "rgba(255, 255, 255, 0.03)",
                        border: isSelected
                          ? "1.5px solid #f97316"
                          : "1px solid rgba(255, 255, 255, 0.08)",
                        borderRadius: "10px",
                        padding: "9px 6px",
                        textAlign: "center",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                        boxShadow: isSelected ? "0 0 14px rgba(249, 115, 22, 0.35)" : "none",
                        position: "relative",
                      }}
                    >
                      {cfg.isGateway && (
                        <span
                          style={{
                            position: "absolute",
                            top: "-5px",
                            right: "-4px",
                            background: "#ea580c",
                            color: "#ffffff",
                            fontSize: "8.5px",
                            fontWeight: 850,
                            padding: "1px 5px",
                            borderRadius: "6px",
                            letterSpacing: "0.4px",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                          }}
                        >
                          OFFICIAL
                        </span>
                      )}
                      <strong
                        style={{
                          fontSize: "12px",
                          color: isSelected ? "#ffffff" : "#cbd5e1",
                          display: "block",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {cfg.name.split(" ")[0]} {cfg.name.split(" ")[1] || ""}
                      </strong>
                      <small
                        style={{
                          fontSize: "10px",
                          color: isSelected ? "#f97316" : "#64748b",
                          display: "block",
                          marginTop: "2px",
                        }}
                      >
                        {cfg.defaultModel.split("-")[0]}
                      </small>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2.2 Login & Key Helper Banner */}
          {currentCfg?.loginUrl && (
            <div
              style={{
                background: currentCfg.isGateway ? "rgba(249, 115, 22, 0.1)" : "rgba(59, 130, 246, 0.09)",
                border: currentCfg.isGateway ? "1px solid rgba(249, 115, 22, 0.3)" : "1px solid rgba(59, 130, 246, 0.28)",
                borderRadius: "12px",
                padding: "12px 16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <strong style={{ fontSize: "13px", color: "#ffffff", display: "block" }}>
                  {currentCfg.name}
                </strong>
                <small style={{ color: "#94a3b8", fontSize: "11px", lineHeight: 1.4, display: "block", marginTop: "2px" }}>
                  {currentCfg.hint}
                </small>
              </div>

              <a
                href={currentCfg.loginUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  padding: "8px 14px",
                  fontSize: "11.5px",
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: currentCfg.isGateway ? "rgba(249, 115, 22, 0.25)" : "rgba(59, 130, 246, 0.2)",
                  color: currentCfg.isGateway ? "#fed7aa" : "#93c5fd",
                  border: currentCfg.isGateway ? "1px solid rgba(249, 115, 22, 0.5)" : "1px solid rgba(59, 130, 246, 0.45)",
                  borderRadius: "8px",
                  textDecoration: "none",
                  cursor: "pointer",
                  flexShrink: 0,
                  transition: "all 0.15s ease",
                }}
              >
                <LinkIcon size={13} />
                <span>{currentCfg.loginLabel || "Đăng Nhập Lấy Key"}</span>
              </a>
            </div>
          )}

          {/* 2.3 Form Fields: Name & Provider Type */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "11px",
                  fontWeight: 800,
                  color: "#94a3b8",
                  letterSpacing: "0.4px",
                  marginBottom: "6px",
                  textTransform: "uppercase",
                }}
              >
                TÊN HIỂN THỊ
              </label>
              <input
                type="text"
                required
                maxLength={120}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                style={{
                  width: "100%",
                  background: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                  padding: "9px 12px",
                  color: "#ffffff",
                  fontSize: "13px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "11px",
                  fontWeight: 800,
                  color: "#94a3b8",
                  letterSpacing: "0.4px",
                  marginBottom: "6px",
                  textTransform: "uppercase",
                }}
              >
                LOẠI PROVIDER
              </label>
              <select
                value={form.provider_type}
                onChange={(e) => setForm({ ...form, provider_type: e.target.value as ProviderType })}
                style={{
                  width: "100%",
                  background: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                  padding: "9px 12px",
                  color: "#ffffff",
                  fontSize: "13px",
                  outline: "none",
                  boxSizing: "border-box",
                  cursor: "pointer",
                }}
              >
                <option value="openai-compatible">OpenAI Compatible (Meridians Gateway / OpenRouter / DeepSeek)</option>
                <option value="gemini">Google Gemini (AI Studio)</option>
                <option value="openai">OpenAI ChatGPT (Chính Thống)</option>
                <option value="anthropic">Anthropic Claude (Chính Thống)</option>
                <option value="custom">Custom Adapter (Proxy riêng)</option>
              </select>
            </div>
          </div>

          {/* 2.4 Base URL Endpoint */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "11px",
                fontWeight: 800,
                color: "#94a3b8",
                letterSpacing: "0.4px",
                marginBottom: "6px",
                textTransform: "uppercase",
              }}
            >
              BASE URL ENDPOINT
            </label>
            <input
              type="url"
              required
              value={form.base_url}
              onChange={(e) => setForm({ ...form, base_url: e.target.value })}
              style={{
                width: "100%",
                background: "#1e293b",
                border: "1px solid #334155",
                borderRadius: "8px",
                padding: "9px 12px",
                color: "#ffffff",
                fontSize: "13px",
                fontFamily: "monospace",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* 2.5 Categorized Model Catalog & Capability Breakdown */}
          <div
            style={{
              background: "rgba(15, 23, 42, 0.6)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "12px",
              padding: "14px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <strong style={{ fontSize: "12px", color: "#f8fafc", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                DANH MỤC MODEL KHẢ DỤNG & CHỨC NĂNG ({currentCfg.models.length} Models)
              </strong>
              <small style={{ color: "#94a3b8", fontSize: "11px" }}>Bấm vào model để áp dụng & tự cấu hình</small>
            </div>

            {/* Model Pills Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" }}>
              {currentCfg.models.map((m) => {
                const isSelected = form.model === m.id || form.tts_model === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleSelectModel(m)}
                    style={{
                      background: isSelected ? "rgba(249, 115, 22, 0.2)" : "rgba(255, 255, 255, 0.03)",
                      border: isSelected ? "1.5px solid #f97316" : "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: "8px",
                      padding: "8px 10px",
                      textAlign: "left",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      display: "flex",
                      flexDirection: "column",
                      gap: "3px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <code style={{ fontSize: "12px", fontWeight: 800, color: isSelected ? "#f97316" : "#ffffff" }}>
                        {m.id}
                      </code>
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 750,
                          padding: "1px 6px",
                          borderRadius: "4px",
                          background: isSelected ? "rgba(249, 115, 22, 0.3)" : "rgba(255, 255, 255, 0.08)",
                          color: isSelected ? "#ffffff" : "#94a3b8",
                        }}
                      >
                        {m.badge}
                      </span>
                    </div>
                    <div style={{ fontSize: "11px", color: "#94a3b8", lineHeight: 1.3, marginTop: "2px" }}>
                      {m.description}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Model Breakdown Notice */}
            {selectedModelDetail && (
              <div
                style={{
                  marginTop: "10px",
                  padding: "10px 14px",
                  background: "rgba(249, 115, 22, 0.08)",
                  border: "1px solid rgba(249, 115, 22, 0.25)",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                }}
              >
                <Sparkles size={16} color="#f97316" style={{ flexShrink: 0, marginTop: "2px" }} />
                <div style={{ fontSize: "12px", color: "#fed7aa" }}>
                  <strong>{selectedModelDetail.name}</strong> ({selectedModelDetail.badge}): {selectedModelDetail.description}
                  {selectedModelDetail.contextWindow && (
                    <span style={{ marginLeft: "8px", color: "#fdba74", fontWeight: 700 }}>
                      [Ngữ cảnh: {selectedModelDetail.contextWindow}]
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 2.6 Model Inputs (Manual Overrides) */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "11px",
                  fontWeight: 800,
                  color: "#94a3b8",
                  letterSpacing: "0.4px",
                  marginBottom: "6px",
                  textTransform: "uppercase",
                }}
              >
                MODEL PHÂN TÍCH (ANALYSIS MODEL)
              </label>
              <input
                type="text"
                required
                maxLength={160}
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                style={{
                  width: "100%",
                  background: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                  padding: "9px 12px",
                  color: "#ffffff",
                  fontSize: "13px",
                  fontFamily: "monospace",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "11px",
                  fontWeight: 800,
                  color: "#94a3b8",
                  letterSpacing: "0.4px",
                  marginBottom: "6px",
                  textTransform: "uppercase",
                }}
              >
                TTS MODEL GIỌNG ĐỌC (TÙY CHỌN)
              </label>
              <input
                type="text"
                maxLength={160}
                placeholder="tts-1 / eleven_multilingual_v2 / vi-manhdung"
                value={form.tts_model}
                onChange={(e) => setForm({ ...form, tts_model: e.target.value })}
                style={{
                  width: "100%",
                  background: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                  padding: "9px 12px",
                  color: "#ffffff",
                  fontSize: "13px",
                  fontFamily: "monospace",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          {/* 2.7 API Key Box */}
          <div
            style={{
              background: "rgba(15, 23, 42, 0.6)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "12px",
              padding: "14px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <div style={{ fontSize: "11.5px", fontWeight: 800, color: "#ffffff", letterSpacing: "0.5px" }}>
                MÃ API KEY / OAUTH TOKEN {form.id ? "(TÙY CHỌN NẾU KHÔNG ĐỔI)" : "(BẮT BUỘC)"}
              </div>
              <div style={{ fontSize: "10.5px", color: "#64748b", fontWeight: 600 }}>
                MÃ HÓA AN TOÀN TRÊN HỆ THỐNG
              </div>
            </div>

            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <input
                type={showApiKey ? "text" : "password"}
                required={!form.id}
                value={form.api_key}
                onChange={(e) => setForm({ ...form, api_key: e.target.value.trim() })}
                placeholder={
                  form.id
                    ? "Để trống nếu giữ nguyên API Key cũ"
                    : form.provider_type === "gemini"
                    ? "Dán mã khóa Google (AIzaSy... hoặc AQ...)"
                    : form.provider_type === "openai"
                    ? "Dán mã API Key OpenAI (sk-...)"
                    : form.provider_type === "anthropic"
                    ? "Dán mã API Key Claude (sk-ant-...)"
                    : "Dán mã API Key hoặc Token vào đây..."
                }
                style={{
                  width: "100%",
                  background: "#1e293b",
                  border:
                    form.api_key &&
                    form.provider_type === "gemini" &&
                    (form.api_key.startsWith("AIzaSy") || form.api_key.startsWith("AQ.") || form.api_key.startsWith("ya29."))
                      ? "1.5px solid #10b981"
                      : "1px solid #334155",
                  borderRadius: "8px",
                  padding: "10px 80px 10px 12px",
                  color: "#ffffff",
                  fontSize: "13px",
                  fontFamily: "monospace",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />

              <div style={{ position: "absolute", right: "6px", display: "flex", gap: "5px", alignItems: "center" }}>
                <button
                  type="button"
                  title={showApiKey ? "Ẩn khóa" : "Hiện khóa"}
                  onClick={() => setShowApiKey(!showApiKey)}
                  style={{
                    background: "rgba(255, 255, 255, 0.08)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "#ffffff",
                    borderRadius: "6px",
                    padding: "4px 8px",
                    cursor: "pointer",
                    fontSize: "12px",
                  }}
                >
                  {showApiKey ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>

                <button
                  type="button"
                  title="Dán từ Clipboard"
                  onClick={handlePasteKey}
                  style={{
                    background: "rgba(249, 115, 22, 0.2)",
                    border: "1px solid #f97316",
                    color: "#f97316",
                    borderRadius: "6px",
                    padding: "4px 9px",
                    cursor: "pointer",
                    fontSize: "11px",
                    fontWeight: 750,
                  }}
                >
                  Dán
                </button>
              </div>
            </div>

            {/* Validation Indicator */}
            {form.api_key && (
              <div style={{ marginTop: "6px" }}>
                {form.provider_type === "gemini" ? (
                  form.api_key.startsWith("AIzaSy") || form.api_key.startsWith("AQ.") || form.api_key.startsWith("ya29.") ? (
                    <span style={{ color: "#10b981", fontSize: "11.5px", display: "flex", alignItems: "center", gap: "4px" }}>
                      ✓ Định dạng khóa Google Gemini hợp lệ ({form.api_key.startsWith("AIzaSy") ? "Google AI Studio" : "Google Cloud"}).
                    </span>
                  ) : (
                    <span style={{ color: "#38bdf8", fontSize: "11.5px", display: "flex", alignItems: "center", gap: "4px" }}>
                      ℹ️ Đã nhận mã khóa. Bấm <strong>"Lưu AI Provider"</strong> $\rightarrow$ <strong>"Test"</strong> để kiểm tra kết nối.
                    </span>
                  )
                ) : (
                  <span style={{ color: "#10b981", fontSize: "11.5px", display: "flex", alignItems: "center", gap: "4px" }}>
                    ✓ Đã nhận mã API Key.
                  </span>
                )}
              </div>
            )}
          </div>

          {/* 2.8 Capability Selection */}
          <div
            style={{
              background: "rgba(15, 23, 42, 0.6)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "12px",
              padding: "14px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <strong style={{ fontSize: "12px", color: "#f8fafc", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                PHÂN BỔ CHỨC NĂNG CỦA AI NÀY
              </strong>
              <button
                type="button"
                onClick={toggleAllCapabilities}
                style={{
                  background: "rgba(249, 115, 22, 0.15)",
                  border: "1px solid rgba(249, 115, 22, 0.35)",
                  color: "#f97316",
                  padding: "4px 10px",
                  fontSize: "11px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Sparkles size={12} />
                Kích Hoạt Toàn Bộ Chức Năng
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {[
                { key: "analysis", label: "🎬 Phân tích kịch bản & Hook" },
                { key: "vision", label: "👁️ Nhận diện thị giác khung hình" },
                { key: "transcription", label: "🎙️ Bóc tách phụ đề (STT / Whisper)" },
                { key: "tts", label: "🗣️ Lồng tiếng AI (TTS Voice)" },
              ].map((cap) => {
                const checked = form.capabilities.includes(cap.key);
                return (
                  <label
                    key={cap.key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      fontSize: "12px",
                      color: checked ? "#ffffff" : "#94a3b8",
                      cursor: "pointer",
                      background: checked ? "rgba(255, 255, 255, 0.06)" : "transparent",
                      padding: "6px 10px",
                      borderRadius: "6px",
                      border: checked ? "1px solid rgba(249, 115, 22, 0.4)" : "1px solid transparent",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...form.capabilities, cap.key]
                          : form.capabilities.filter((c) => c !== cap.key);
                        setForm({ ...form, capabilities: next });
                      }}
                      style={{ width: "15px", height: "15px", accentColor: "#f97316" }}
                    />
                    <span>{cap.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* 2.9 Active Toggle */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 2px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px", color: "#f8fafc", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                style={{ width: "16px", height: "16px", accentColor: "#f97316" }}
              />
              <span>Kích hoạt provider này để sẵn sàng dùng cho các tác vụ</span>
            </label>
            <span style={{ fontSize: "11px", color: "#64748b" }}>Đa AI Provider (Multi-AI)</span>
          </div>

          {/* 3. Modal Footer */}
          <div
            style={{
              paddingTop: "12px",
              marginTop: "4px",
              borderTop: "1px solid rgba(255, 255, 255, 0.08)",
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: "#cbd5e1",
                padding: "9px 20px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={loading}
              style={{
                background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
                border: "none",
                color: "#ffffff",
                padding: "9px 24px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 750,
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: "0 4px 14px rgba(234, 88, 12, 0.35)",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Check size={15} />
              {loading ? "Đang lưu..." : "Lưu AI Provider"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProviderModal;
