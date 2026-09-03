const LANGUAGE_NAMES = {
  vi: "tiếng Việt tự nhiên",
  en: "English",
  ja: "日本語",
  ko: "한국어",
  "zh-CN": "简体中文",
  "zh-TW": "繁體中文",
  th: "ภาษาไทย",
  id: "Bahasa Indonesia",
  ms: "Bahasa Melayu",
  fil: "Filipino",
  fr: "français",
  es: "español",
  "pt-BR": "português do Brasil",
  de: "Deutsch",
  it: "italiano",
  ru: "русский",
  tr: "Türkçe",
  ar: "العربية",
  hi: "हिन्दी",
  nl: "Nederlands",
};

// Local speech engines use installed voices. Keep the locale mapping in one
// place so a translated script is spoken with a matching pronunciation.
const SPEECH_LOCALES = {
  vi: "vi-VN",
  en: "en-US",
  ja: "ja-JP",
  ko: "ko-KR",
  "zh-CN": "zh-CN",
  "zh-TW": "zh-TW",
  fr: "fr-FR",
  es: "es-ES",
  th: "th-TH",
  ms: "ms-MY",
  fil: "en-PH",
  "pt-BR": "pt-BR",
  de: "de-DE",
  it: "it-IT",
  id: "id-ID",
  ru: "ru-RU",
  tr: "tr-TR",
  ar: "ar-SA",
  hi: "hi-IN",
  nl: "nl-NL",
};

function languageName(value) {
  const code = String(value || "vi").trim();
  return LANGUAGE_NAMES[code] || code;
}

function speechLocale(value) {
  const code = String(value || "").trim();
  if (SPEECH_LOCALES[code]) return SPEECH_LOCALES[code];
  const base = code.split(/[-_]/)[0].toLowerCase();
  return SPEECH_LOCALES[base] || "en-US";
}

function cleanText(value, maxLength = 12000) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

/** Prefer the model's contextual script; only use scene metadata as a fallback. */
function buildNarrationText(analysis, range) {
  const direct = cleanText(analysis?.voiceScript || analysis?.narration || "");
  const allScenes = Array.isArray(analysis?.scenes) ? analysis.scenes : [];
  const hasRange = Boolean(range && range.startSeconds !== undefined && range.endSeconds !== undefined);
  const toSeconds = (value) => {
    const parts = String(value || "0").split(":").map(Number);
    if (parts.some((part) => !Number.isFinite(part))) return 0;
    return parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : parts.length === 2 ? parts[0] * 60 + parts[1] : parts[0];
  };
  const scenes = hasRange
    ? allScenes.filter((scene, index) => {
      const sceneStart = toSeconds(scene.start);
      const nextStart = allScenes[index + 1] ? toSeconds(allScenes[index + 1].start) : Number(range.endSeconds);
      const sceneEnd = scene.end ? toSeconds(scene.end) : nextStart;
      return sceneEnd > range.startSeconds && sceneStart < range.endSeconds;
    })
    : allScenes;
  const contextual = scenes
    .map((scene) => cleanText(scene?.voiceover || scene?.narration || scene?.translation || "", 900))
    .join(" ")
    .slice(0, 12000);
  if (hasRange) {
    if (!scenes.length || scenes.some((scene) => !cleanText(scene?.voiceover || scene?.narration || scene?.translation || "", 900))) return "";
    return contextual;
  }
  if (contextual && scenes.length && scenes.every((scene) => cleanText(scene?.voiceover || scene?.narration || scene?.translation || "", 900))) return contextual;
  if (direct) return direct;
  // Never read a raw/full transcript as narration. It may be in the source
  // language or contain dialogue from another scene; the analysis pass must
  // provide a contextual voice_script (or per-scene voiceovers) first.
  return "";
}

module.exports = { LANGUAGE_NAMES, SPEECH_LOCALES, languageName, speechLocale, buildNarrationText };
