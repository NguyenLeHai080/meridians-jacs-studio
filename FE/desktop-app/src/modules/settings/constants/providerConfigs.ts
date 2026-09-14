import type { ProviderType } from "../../../core/types";

export interface CloudModelItem {
  id: string;
  model: string;
  provider_name: string;
  category?: string;
  input_price: number;
  output_price: number;
  cost_input_price?: number;
  cost_output_price?: number;
  cache_discount_pct?: number;
  price_per_request?: number;
  is_selling: boolean;
  purpose?: string;
  providerType?: ProviderType;
}

export const DEFAULT_CLOUD_MODELS: CloudModelItem[] = [
  {
    id: "cm-1",
    model: "gemini-2.5-flash",
    provider_name: "Google Gemini",
    category: "vision",
    input_price: 500,
    output_price: 900,
    cache_discount_pct: 20,
    price_per_request: 0,
    is_selling: true,
    purpose: "Thị giác video 1M tokens, trích xuất cảnh & multimodal siêu tốc",
    providerType: "gemini",
  },
  {
    id: "cm-2",
    model: "gemini-flash-latest",
    provider_name: "Google Gemini",
    category: "vision",
    input_price: 500,
    output_price: 900,
    cache_discount_pct: 20,
    price_per_request: 0,
    is_selling: true,
    purpose: "Bản Flash mới nhất luôn cập nhật từ Google AI Studio",
    providerType: "gemini",
  },
  {
    id: "cm-3",
    model: "claude-3-7-sonnet",
    provider_name: "Anthropic Claude",
    category: "cinema",
    input_price: 1100,
    output_price: 1800,
    cache_discount_pct: 15,
    price_per_request: 10,
    is_selling: true,
    purpose: "Biên kịch điện ảnh chuyên sâu, văn phong tự nhiên sâu sắc",
    providerType: "anthropic",
  },
  {
    id: "cm-4",
    model: "claude-opus-4.8",
    provider_name: "Anthropic Claude",
    category: "cinema",
    input_price: 1250,
    output_price: 2100,
    cache_discount_pct: 15,
    price_per_request: 15,
    is_selling: true,
    purpose: "Kịch bản điện ảnh & review phim triệu view, xây dựng cao trào",
    providerType: "anthropic",
  },
  {
    id: "cm-5",
    model: "gpt-5.5",
    provider_name: "OpenAI",
    category: "cinema",
    input_price: 1050,
    output_price: 1650,
    cache_discount_pct: 20,
    price_per_request: 10,
    is_selling: true,
    purpose: "Kịch bản điện ảnh thế hệ mới, văn phong đa tầng nghĩa",
    providerType: "openai",
  },
  {
    id: "cm-6",
    model: "gpt-4o",
    provider_name: "OpenAI",
    category: "vision",
    input_price: 950,
    output_price: 1500,
    cache_discount_pct: 20,
    price_per_request: 8,
    is_selling: true,
    purpose: "Phân tích hình ảnh & bối cảnh video chuẩn xác",
    providerType: "openai",
  },
  {
    id: "cm-7",
    model: "deepseek-reasoner",
    provider_name: "DeepSeek",
    category: "reasoning",
    input_price: 400,
    output_price: 700,
    cache_discount_pct: 25,
    price_per_request: 0,
    is_selling: true,
    purpose: "Mô hình lý luận R1, phân tích logic tình tiết và cấu trúc phim",
    providerType: "deepseek",
  },
  {
    id: "cm-8",
    model: "eleven_multilingual_v2",
    provider_name: "ElevenLabs",
    category: "voice",
    input_price: 1500,
    output_price: 2500,
    cache_discount_pct: 0,
    price_per_request: 20,
    is_selling: true,
    purpose: "Voice AI số 1 thế giới, ngắt nghỉ như người thật và truyền cảm",
    providerType: "elevenlabs",
  },
  {
    id: "cm-9",
    model: "vi-manhdung",
    provider_name: "Vbee AIVoice",
    category: "voice",
    input_price: 600,
    output_price: 1000,
    cache_discount_pct: 0,
    price_per_request: 5,
    is_selling: true,
    purpose: "Giọng đọc Review Phim quốc dân Việt Nam (Mạnh Dũng)",
    providerType: "openai-compatible",
  },
  {
    id: "cm-10",
    model: "whisper-large-v3",
    provider_name: "Whisper Audio",
    category: "transcription",
    input_price: 350,
    output_price: 600,
    cache_discount_pct: 0,
    price_per_request: 0,
    is_selling: true,
    purpose: "Bóc băng hội thoại đa ngôn ngữ, nhận diện tiếng Việt cực chuẩn",
    providerType: "openai-compatible",
  },
];

export const PROVIDER_CONFIGS: Record<
  string,
  {
    name: string;
    type: ProviderType;
    baseUrl: string;
    defaultModel: string;
    models: string[];
    loginUrl?: string;
    loginLabel?: string;
    ttsModel?: string;
    capabilities: string[];
    hint: string;
    isGateway?: boolean;
  }
> = {
  meridians: {
    name: "Meridians Gateway (NexoraTech)",
    type: "openai-compatible",
    baseUrl: "https://api-meridians.nexoratech.com.vn/v1",
    defaultModel: "claude-opus-4.8",
    models: [
      "claude-opus-4.8",
      "claude-opus-4.8-thinking",
      "claude-3-5-sonnet-latest",
      "gpt-4o",
      "gpt-4o-mini",
      "o3-mini",
      "gemini-2.5-pro",
      "gemini-2.5-flash",
      "deepseek-reasoner",
      "deepseek-chat",
      "cc/claude-opus-5",
      "whisper-large-v3",
    ],
    loginUrl: "https://jacs-studio.nexoratech.com.vn",
    loginLabel: "🌐 Cổng AI Gateway Trung Tâm",
    ttsModel: "eleven_multilingual_v2",
    capabilities: ["analysis", "vision", "transcription", "tts"],
    hint: "AI Gateway trung tâm JACS Studio (NexoraTech): Tích hợp toàn diện Claude Opus 4.8, GPT-4o, Gemini Pro 2M, DeepSeek R1, Voice TTS và Whisper.",
    isGateway: true,
  },
  elevenlabs: {
    name: "ElevenLabs (Voice AI Số 1 Thế Giới - Đỉnh Cao Cảm Xúc)",
    type: "openai-compatible",
    baseUrl: "https://api.elevenlabs.io/v1",
    defaultModel: "eleven_multilingual_v2",
    models: ["eleven_multilingual_v2", "eleven_turbo_v2_5", "eleven_flash_v2_5"],
    loginUrl: "https://elevenlabs.io/app/api-keys",
    loginLabel: "🌐 Đăng Ký & Lấy API Key ElevenLabs",
    ttsModel: "eleven_multilingual_v2",
    capabilities: ["tts"],
    hint: "Bộ Voice AI số 1 thế giới: Có tiếng thở, ngắt nghỉ như người thật, thăng trầm kịch tính và nhân bản giọng nói theo yêu cầu.",
  },
  vbee: {
    name: "Vbee AIVoice (Chuyên Review Phim Triệu View Việt Nam)",
    type: "openai-compatible",
    baseUrl: "https://api.vbee.vn/api/v1",
    defaultModel: "vi-manhdung",
    models: ["vi-manhdung", "vi-minhhoang", "vi-maiphuong", "vi-ngochoang"],
    loginUrl: "https://vbee.vn",
    loginLabel: "🌐 Đăng Nhập Vbee AIVoice Studio",
    ttsModel: "vbee-tts",
    capabilities: ["tts"],
    hint: "Giọng đọc Review Phim quốc dân Việt Nam (Mạnh Dũng, Minh Hoàng, Mai Phương) với ngữ điệu ngắt nghỉ tự nhiên.",
  },
  gemini: {
    name: "Google Gemini (Chính Thống)",
    type: "gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    defaultModel: "gemini-flash-latest",
    models: [
      "gemini-flash-latest",
      "gemini-2.5-flash",
      "gemini-2.5-pro",
      "gemini-flash-lite-latest",
      "gemini-3.7-flash",
      "gemini-pro-latest",
    ],
    loginUrl: "https://aistudio.google.com/app/apikey",
    loginLabel: "🌐 Đăng Nhập Google AI Studio & Lấy API Key Miễn Phí",
    capabilities: ["analysis", "vision"],
    hint: "AI tốc độ cao của Google, phân tích ngữ cảnh video cực sâu và miễn phí hạn mức lớn.",
  },
  openai: {
    name: "OpenAI ChatGPT (Chính Thống)",
    type: "openai",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "o1-mini", "o3-mini", "gpt-3.5-turbo"],
    loginUrl: "https://platform.openai.com/api-keys",
    loginLabel: "🌐 Đăng Nhập OpenAI Platform & Lấy Key ChatGPT",
    ttsModel: "tts-1",
    capabilities: ["analysis", "vision", "transcription", "tts"],
    hint: "OpenAI GPT-4o xử lý kịch bản sắc bén và hỗ trợ đầy đủ TTS thuyết minh.",
  },
  anthropic: {
    name: "Anthropic Claude (Chính Thống)",
    type: "anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    defaultModel: "claude-3-5-sonnet-latest",
    models: [
      "claude-3-5-sonnet-latest",
      "claude-3-5-haiku-latest",
      "claude-3-opus-latest",
      "claude-3-7-sonnet",
      "claude-opus-4.8",
    ],
    loginUrl: "https://console.anthropic.com/settings/keys",
    loginLabel: "🌐 Đăng Nhập Console Anthropic & Lấy Key Claude",
    capabilities: ["analysis", "vision"],
    hint: "Claude sở hữu văn phong điện ảnh tự nhiên và thông minh nhất cho kịch bản dài.",
  },
  deepseek: {
    name: "DeepSeek AI (Chính Thống)",
    type: "deepseek",
    baseUrl: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat",
    models: ["deepseek-chat", "deepseek-reasoner"],
    loginUrl: "https://platform.deepseek.com/api_keys",
    loginLabel: "🌐 Đăng Nhập DeepSeek Platform & Lấy Key",
    capabilities: ["analysis"],
    hint: "DeepSeek-V3 và R1 tối ưu chi phí cực rẻ và suy luận logic đỉnh cao.",
  },
  custom: {
    name: "Tùy Chỉnh (OpenAI-Compatible / OneAPI / NewAPI)",
    type: "openai-compatible",
    baseUrl: "http://localhost:8000/v1",
    defaultModel: "gpt-4o",
    models: ["gpt-4o", "claude-3-5-sonnet", "deepseek-chat", "qwen-max"],
    capabilities: ["analysis", "vision", "transcription", "tts"],
    hint: "Dùng cho OneAPI, NewAPI, Local LLM (Ollama, vLLM) hoặc cổng proxy riêng của bạn.",
  },
};
