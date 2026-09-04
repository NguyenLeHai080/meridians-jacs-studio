export const PROVIDER_TYPES = [
  { value: "openai", label: "OpenAI (GPT-4o, Whisper, TTS)" },
  { value: "gemini", label: "Google Gemini (Gemini 1.5 Pro / Flash)" },
  { value: "anthropic", label: "Anthropic Claude (Claude 3.5 Sonnet)" },
  { value: "openai-compatible", label: "OpenAI Compatible (Groq, DeepSeek, LocalLLM)" },
  { value: "custom", label: "Custom Provider" },
];

export const ENGINES = [
  { value: "auto", label: "Tự động chọn Engine tối ưu (Auto)" },
  { value: "apple", label: "Apple Silicon VideoToolbox (M1/M2/M3)" },
  { value: "nvidia", label: "NVIDIA NVENC CUDA" },
  { value: "cpu", label: "CPU Software (x264 / libx264)" },
];
