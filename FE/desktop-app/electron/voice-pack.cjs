// Built-in voice profiles. The actual speech engine is local to the customer
// machine (Python worker when bundled, otherwise macOS say/Windows Speech).
const VOICE_PACKS = [
  // 🇻🇳 Local Standard Voices
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

  // 👑 ElevenLabs & Specialized Studio Profiles
  { id: "eleven-adam", label: "Adam (ElevenLabs · Hollywood Storyteller)", language: "vi", locale: "vi-VN", gender: "male" },
  { id: "eleven-charlie", label: "Charlie (ElevenLabs · Phóng Sự & Vụ Án)", language: "vi", locale: "vi-VN", gender: "male" },
  { id: "eleven-george", label: "George (ElevenLabs · Điện Ảnh Trầm Sâu)", language: "vi", locale: "vi-VN", gender: "male" },
  { id: "eleven-rachel", label: "Rachel (ElevenLabs · Nữ Diễn Cảm Tự Nhiên)", language: "vi", locale: "vi-VN", gender: "female" },

  // 🔥 Vbee AIVoice & Đa Vùng Miền
  { id: "vbee-manhdung", label: "Mạnh Dũng (Nam Bắc · Review Phim Triệu View)", language: "vi", locale: "vi-VN", gender: "male" },
  { id: "vbee-minhhoang", label: "Minh Hoàng (Nam Nam Bộ · Tự Nhiên Phóng Khoáng)", language: "vi", locale: "vi-VN", gender: "male" },
  { id: "vbee-maiphuong", label: "Mai Phương (Nữ Bắc · Ngọt Ngào Truyền Cảm)", language: "vi", locale: "vi-VN", gender: "female" },
  { id: "vbee-ngochoang", label: "Ngọc Huyền (Nữ Nam Bộ · Dịu Dàng Đằm Thắm)", language: "vi", locale: "vi-VN", gender: "female" },

  // ⚡ Neural Prosody AI
  { id: "vi-adam-review", label: "Adam Review Phim (Nam Bắc · Dứt Khoát)", language: "vi", locale: "vi-VN", gender: "male" },
  { id: "vi-mystery-deep", label: "Nam Thuyết Minh Vụ Án (Nam · Bí Ẩn Trầm Sâu)", language: "vi", locale: "vi-VN", gender: "male" },
  { id: "vi-hoaimy-review", label: "Nữ Review Phim / Viral (Nữ · Sôi Nổi)", language: "vi", locale: "vi-VN", gender: "female" },
  { id: "vi-hoaimy", label: "Hoài My (Nữ Bắc · Phát Thanh Viên Thời Sự)", language: "vi", locale: "vi-VN", gender: "female" },
  { id: "vi-namminh", label: "Nam Minh (Nam Bắc · Trầm Ấm)", language: "vi", locale: "vi-VN", gender: "male" },
  { id: "vi-baolong", label: "Bảo Long (Nam Nam Bộ)", language: "vi", locale: "vi-VN", gender: "male" },
  { id: "vi-thihuong", label: "Thị Hương (Nữ Nam Bộ)", language: "vi", locale: "vi-VN", gender: "female" },

  // English Extended
  { id: "en-adam", label: "Adam Voice · English US (Hollywood Narrator)", language: "en", locale: "en-US", gender: "male" },
  { id: "en-jenny", label: "Jenny · English US (Female Expressive)", language: "en", locale: "en-US", gender: "female" },
  { id: "en-aria", label: "Aria · English US (Dynamic Narrative)", language: "en", locale: "en-US", gender: "female" },
  { id: "en-brian", label: "Brian · English UK (BBC Documentary)", language: "en", locale: "en-GB", gender: "male" },
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
