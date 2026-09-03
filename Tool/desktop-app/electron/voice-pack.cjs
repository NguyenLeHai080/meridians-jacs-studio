// Built-in voice profiles. The actual speech engine is local to the customer
// machine (Python worker when bundled, otherwise macOS say/Windows Speech).
const VOICE_PACKS = [
  { id: "vi-female", label: "Linh · Nữ miền Nam", language: "vi", locale: "vi-VN", gender: "female" },
  { id: "vi-male", label: "Nam · Nam miền Bắc", language: "vi", locale: "vi-VN", gender: "male" },
  { id: "en-female", label: "Samantha · English nữ", language: "en", locale: "en-US", gender: "female" },
  { id: "en-male", label: "Alex · English nam", language: "en", locale: "en-US", gender: "male" },
  { id: "ja-female", label: "Kyoko · 日本語 nữ", language: "ja", locale: "ja-JP", gender: "female" },
  { id: "ja-male", label: "Otoya · 日本語 nam", language: "ja", locale: "ja-JP", gender: "male" },
  { id: "ko-female", label: "Yuna · 한국어 nữ", language: "ko", locale: "ko-KR", gender: "female" },
  { id: "ko-male", label: "Joon · 한국어 nam", language: "ko", locale: "ko-KR", gender: "male" },
  { id: "zh-CN-female", label: "Ting-Ting · 中文 nữ", language: "zh-CN", locale: "zh-CN", gender: "female" },
  { id: "zh-CN-male", label: "Sin-ji · 中文 nam", language: "zh-CN", locale: "zh-CN", gender: "male" },
  { id: "zh-TW-female", label: "Meijia · 繁體中文 nữ", language: "zh-TW", locale: "zh-TW", gender: "female" },
  { id: "zh-TW-male", label: "Chinese Taiwan · 繁體中文 nam", language: "zh-TW", locale: "zh-TW", gender: "male" },
  { id: "fr-female", label: "Amelie · Français nữ", language: "fr", locale: "fr-FR", gender: "female" },
  { id: "fr-male", label: "Thomas · Français nam", language: "fr", locale: "fr-FR", gender: "male" },
  { id: "es-female", label: "Monica · Español nữ", language: "es", locale: "es-ES", gender: "female" },
  { id: "es-male", label: "Jorge · Español nam", language: "es", locale: "es-ES", gender: "male" },
  { id: "th-female", label: "Kanya · ไทย nữ", language: "th", locale: "th-TH", gender: "female" },
  { id: "th-male", label: "Thai · ไทย nam", language: "th", locale: "th-TH", gender: "male" },
  { id: "id-female", label: "Damayanti · Indonesia nữ", language: "id", locale: "id-ID", gender: "female" },
  { id: "id-male", label: "Indonesian · Indonesia nam", language: "id", locale: "id-ID", gender: "male" },
  { id: "ms-female", label: "Amira · Melayu nữ", language: "ms", locale: "ms-MY", gender: "female" },
  { id: "ms-male", label: "Malay · Melayu nam", language: "ms", locale: "ms-MY", gender: "male" },
  { id: "pt-BR-female", label: "Luciana · Português nữ", language: "pt", locale: "pt-BR", gender: "female" },
  { id: "pt-BR-male", label: "Português · Brasil nam", language: "pt", locale: "pt-BR", gender: "male" },
  { id: "de-female", label: "Anna · Deutsch nữ", language: "de", locale: "de-DE", gender: "female" },
  { id: "de-male", label: "German · Deutsch nam", language: "de", locale: "de-DE", gender: "male" },
  { id: "it-female", label: "Alice · Italiano nữ", language: "it", locale: "it-IT", gender: "female" },
  { id: "it-male", label: "Italiano · Italiano nam", language: "it", locale: "it-IT", gender: "male" },
  { id: "ru-female", label: "Milena · Русский nữ", language: "ru", locale: "ru-RU", gender: "female" },
  { id: "ru-male", label: "Russian · Русский nam", language: "ru", locale: "ru-RU", gender: "male" },
  { id: "tr-female", label: "Yelda · Türkçe nữ", language: "tr", locale: "tr-TR", gender: "female" },
  { id: "tr-male", label: "Turkish · Türkçe nam", language: "tr", locale: "tr-TR", gender: "male" },
  { id: "ar-female", label: "Arabic · العربية nữ", language: "ar", locale: "ar-SA", gender: "female" },
  { id: "ar-male", label: "Arabic · العربية nam", language: "ar", locale: "ar-SA", gender: "male" },
  { id: "hi-female", label: "Lekha · हिन्दी nữ", language: "hi", locale: "hi-IN", gender: "female" },
  { id: "hi-male", label: "Hindi · हिन्दी nam", language: "hi", locale: "hi-IN", gender: "male" },
  { id: "nl-female", label: "Xander · Nederlands nữ", language: "nl", locale: "nl-NL", gender: "female" },
  { id: "nl-male", label: "Dutch · Nederlands nam", language: "nl", locale: "nl-NL", gender: "male" },
  { id: "fil-female", label: "English Philippines · Filipino nữ", language: "fil", locale: "en-PH", gender: "female" },
  { id: "fil-male", label: "English Philippines · Filipino nam", language: "fil", locale: "en-PH", gender: "male" },
];

function languageBase(value) { return String(value || "vi").toLowerCase().split(/[-_]/)[0]; }
function languageMatches(profileLanguage, requestedLanguage) {
  const profile = String(profileLanguage || "").toLowerCase();
  const requested = String(requestedLanguage || "").toLowerCase();
  if (profile === requested) return true;
  // Keep regional Chinese voices distinct (zh-CN vs zh-TW).
  if (requested.startsWith("zh-") || profile.startsWith("zh-")) return false;
  return languageBase(profile) === languageBase(requested);
}

function resolveVoicePack(value, language = "vi", gender = "female") {
  const requested = String(value || "").trim().toLowerCase();
  const exact = VOICE_PACKS.find((item) => item.id.toLowerCase() === requested);
  // A persisted/hand-edited job must not make a Vietnamese script use an
  // English voice simply because its old voice id is still present.
  if (exact && languageMatches(exact.language, language)) return exact;
  const languageCode = String(language || "vi").toLowerCase();
  const localeMatch = VOICE_PACKS.find((item) => languageMatches(item.language, languageCode) && item.gender === gender)
    || VOICE_PACKS.find((item) => languageMatches(item.language, languageCode));
  if (localeMatch) return localeMatch;
  throw new Error(`Chưa có voice pack local cho ngôn ngữ ${language || "đã chọn"}. Hãy chọn ngôn ngữ được hỗ trợ hoặc cài voice tương ứng.`);
}

function listVoicePacks(language) {
  const base = language ? languageBase(language) : "";
  return (base ? VOICE_PACKS.filter((item) => languageBase(item.language) === base) : VOICE_PACKS).map((item) => ({ ...item, engine: "python-local/system" }));
}

module.exports = { VOICE_PACKS, resolveVoicePack, listVoicePacks };
