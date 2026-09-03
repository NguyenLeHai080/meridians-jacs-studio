const VOICE_ALIASES = {
  "vi-VN-HoaiMy": "nova",
  "vi-VN-NamMinh": "onyx",
  "en-US-AriaNeural": "coral",
  "en-US-GuyNeural": "echo",
};

const SUPPORTED_VOICES = new Set(["alloy", "ash", "ballad", "coral", "echo", "fable", "nova", "onyx", "sage", "shimmer"]);
const FEMALE_VOICES = new Set(["coral", "nova", "shimmer", "sage"]);
const MALE_VOICES = new Set(["alloy", "ash", "ballad", "echo", "fable", "onyx"]);

function normalizeTtsVoice(value, gender) {
  const candidate = VOICE_ALIASES[String(value || "").trim()] || String(value || "").trim().toLowerCase();
  if (SUPPORTED_VOICES.has(candidate)) return candidate;
  return gender === "male" ? "onyx" : "nova";
}

function resolveTtsVoices(value, gender) {
  const selected = normalizeTtsVoice(value, gender);
  const fallback = gender === "male" ? "onyx" : "nova";
  return [...new Set([selected, fallback])];
}

function resolveTtsModels(record) {
  const configured = String(record?.ttsModel || "").trim();
  const baseUrl = String(record?.baseUrl || "");
  let officialOpenAi = false;
  try { officialOpenAi = new URL(baseUrl).hostname === "api.openai.com"; } catch { /* validation happens when the provider is saved */ }

  // Respect an explicitly configured gateway model first. Gateways often use
  // custom pricing tables, so forcing `tts-1` before that value causes a
  // confusing pricing error even when the selected model is supported.
  if (officialOpenAi) return [...new Set([configured, "tts-1", "gpt-4o-mini-tts"].filter(Boolean))];
  return [...new Set([configured, "tts-1"].filter((model) => model && model !== "gpt-4o-mini-tts"))];
}

function formatTtsProviderError(status, detail, model) {
  const normalized = String(detail || "").replace(/\s+/g, " ").trim().slice(0, 300);
  if (/no pricing rule|pricing rule/i.test(normalized)) {
    return `Gateway chưa cấu hình pricing cho model TTS "${model}". Hãy chọn model TTS có trong bảng giá của gateway (thường là tts-1) hoặc bổ sung pricing rule rồi thử lại.`;
  }
  return `HTTP ${status}${normalized ? `: ${normalized}` : ""}`;
}

function isRetryableTtsStatus(status) {
  return [400, 404, 405, 422].includes(Number(status));
}

function isVoiceCompatibilityError(detail) {
  return /voice|speaker|vocal/i.test(String(detail || ""));
}

module.exports = { FEMALE_VOICES, MALE_VOICES, SUPPORTED_VOICES, normalizeTtsVoice, resolveTtsVoices, resolveTtsModels, formatTtsProviderError, isRetryableTtsStatus, isVoiceCompatibilityError };
