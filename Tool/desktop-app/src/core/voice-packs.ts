import type { VoiceProfile } from "./types";

/** Built-in locale profiles. Speech is generated locally on the customer's OS. */
export const VOICE_PACKS: VoiceProfile[] = [
  { id: "vi-female", label: "Linh · Nữ miền Nam", language: "vi", locale: "vi-VN", gender: "female", engine: "local" },
  { id: "vi-male", label: "Nam · Nam miền Bắc", language: "vi", locale: "vi-VN", gender: "male", engine: "local" },
  { id: "en-female", label: "Samantha · English nữ", language: "en", locale: "en-US", gender: "female", engine: "local" },
  { id: "en-male", label: "Alex · English nam", language: "en", locale: "en-US", gender: "male", engine: "local" },
  { id: "ja-female", label: "Kyoko · 日本語 nữ", language: "ja", locale: "ja-JP", gender: "female", engine: "local" },
  { id: "ja-male", label: "Otoya · 日本語 nam", language: "ja", locale: "ja-JP", gender: "male", engine: "local" },
  { id: "ko-female", label: "Yuna · 한국어 nữ", language: "ko", locale: "ko-KR", gender: "female", engine: "local" },
  { id: "ko-male", label: "Joon · 한국어 nam", language: "ko", locale: "ko-KR", gender: "male", engine: "local" },
  { id: "zh-CN-female", label: "Ting-Ting · 中文 nữ", language: "zh-CN", locale: "zh-CN", gender: "female", engine: "local" },
  { id: "zh-CN-male", label: "Sin-ji · 中文 nam", language: "zh-CN", locale: "zh-CN", gender: "male", engine: "local" },
  { id: "zh-TW-female", label: "Meijia · 繁體中文 nữ", language: "zh-TW", locale: "zh-TW", gender: "female", engine: "local" },
  { id: "zh-TW-male", label: "Chinese Taiwan · 繁體中文 nam", language: "zh-TW", locale: "zh-TW", gender: "male", engine: "local" },
  { id: "fr-female", label: "Amelie · Français nữ", language: "fr", locale: "fr-FR", gender: "female", engine: "local" },
  { id: "fr-male", label: "Thomas · Français nam", language: "fr", locale: "fr-FR", gender: "male", engine: "local" },
  { id: "es-female", label: "Monica · Español nữ", language: "es", locale: "es-ES", gender: "female", engine: "local" },
  { id: "es-male", label: "Jorge · Español nam", language: "es", locale: "es-ES", gender: "male", engine: "local" },
  { id: "th-female", label: "Kanya · ไทย nữ", language: "th", locale: "th-TH", gender: "female", engine: "local" },
  { id: "th-male", label: "Thai · ไทย nam", language: "th", locale: "th-TH", gender: "male", engine: "local" },
  { id: "id-female", label: "Damayanti · Indonesia nữ", language: "id", locale: "id-ID", gender: "female", engine: "local" },
  { id: "id-male", label: "Indonesian · Indonesia nam", language: "id", locale: "id-ID", gender: "male", engine: "local" },
  { id: "ms-female", label: "Amira · Melayu nữ", language: "ms", locale: "ms-MY", gender: "female", engine: "local" },
  { id: "ms-male", label: "Malay · Melayu nam", language: "ms", locale: "ms-MY", gender: "male", engine: "local" },
  { id: "pt-BR-female", label: "Luciana · Português nữ", language: "pt", locale: "pt-BR", gender: "female", engine: "local" },
  { id: "pt-BR-male", label: "Português · Brasil nam", language: "pt", locale: "pt-BR", gender: "male", engine: "local" },
  { id: "de-female", label: "Anna · Deutsch nữ", language: "de", locale: "de-DE", gender: "female", engine: "local" },
  { id: "de-male", label: "German · Deutsch nam", language: "de", locale: "de-DE", gender: "male", engine: "local" },
  { id: "it-female", label: "Alice · Italiano nữ", language: "it", locale: "it-IT", gender: "female", engine: "local" },
  { id: "it-male", label: "Italiano · Italiano nam", language: "it", locale: "it-IT", gender: "male", engine: "local" },
  { id: "ru-female", label: "Milena · Русский nữ", language: "ru", locale: "ru-RU", gender: "female", engine: "local" },
  { id: "ru-male", label: "Russian · Русский nam", language: "ru", locale: "ru-RU", gender: "male", engine: "local" },
  { id: "tr-female", label: "Yelda · Türkçe nữ", language: "tr", locale: "tr-TR", gender: "female", engine: "local" },
  { id: "tr-male", label: "Turkish · Türkçe nam", language: "tr", locale: "tr-TR", gender: "male", engine: "local" },
  { id: "ar-female", label: "Arabic · العربية nữ", language: "ar", locale: "ar-SA", gender: "female", engine: "local" },
  { id: "ar-male", label: "Arabic · العربية nam", language: "ar", locale: "ar-SA", gender: "male", engine: "local" },
  { id: "hi-female", label: "Lekha · हिन्दी nữ", language: "hi", locale: "hi-IN", gender: "female", engine: "local" },
  { id: "hi-male", label: "Hindi · हिन्दी nam", language: "hi", locale: "hi-IN", gender: "male", engine: "local" },
  { id: "nl-female", label: "Xander · Nederlands nữ", language: "nl", locale: "nl-NL", gender: "female", engine: "local" },
  { id: "nl-male", label: "Dutch · Nederlands nam", language: "nl", locale: "nl-NL", gender: "male", engine: "local" },
  { id: "fil-female", label: "English Philippines · Filipino nữ", language: "fil", locale: "en-PH", gender: "female", engine: "local" },
  { id: "fil-male", label: "English Philippines · Filipino nam", language: "fil", locale: "en-PH", gender: "male", engine: "local" },
];

export function voicesForLanguage(language: string): VoiceProfile[] {
  const code = String(language || "vi").toLowerCase();
  const exact = VOICE_PACKS.filter((voice) => voice.language.toLowerCase() === code);
  if (exact.length) return exact;
  const base = code.split(/[-_]/)[0];
  return VOICE_PACKS.filter((voice) => voice.language.toLowerCase().split(/[-_]/)[0] === base);
}

export function defaultVoice(language: string, gender: "male" | "female"): VoiceProfile {
  return voicesForLanguage(language).find((voice) => voice.gender === gender) || VOICE_PACKS[gender === "male" ? 1 : 0];
}
