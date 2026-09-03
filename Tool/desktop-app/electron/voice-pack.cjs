// Built-in voice profiles. The actual speech engine is local to the customer
// machine (Python worker when bundled, otherwise macOS say/Windows Speech).
const VOICE_PACKS = [
  // 👑 ElevenLabs
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

  // English - US & UK
  { id: "en-adam", label: "Adam Voice · English US (Hollywood Narrator)", language: "en", locale: "en-US", gender: "male" },
  { id: "en-jenny", label: "Jenny · English US (Female Expressive)", language: "en", locale: "en-US", gender: "female" },
  { id: "en-aria", label: "Aria · English US (Dynamic Narrative)", language: "en", locale: "en-US", gender: "female" },
  { id: "en-brian", label: "Brian · English UK (BBC Documentary)", language: "en", locale: "en-GB", gender: "male" },

  // Quốc Tế
  { id: "ja-male", label: "Keita · 日本語 nam", language: "ja", locale: "ja-JP", gender: "male" },
  { id: "ja-female", label: "Nanami · 日本語 nữ", language: "ja", locale: "ja-JP", gender: "female" },
  { id: "ko-male", label: "InJoon · 한국어 nam", language: "ko", locale: "ko-KR", gender: "male" },
  { id: "ko-female", label: "SunHi · 한국어 nữ", language: "ko", locale: "ko-KR", gender: "female" },
  { id: "zh-CN-male", label: "Yunxi · 中文 nam", language: "zh-CN", locale: "zh-CN", gender: "male" },
  { id: "zh-CN-female", label: "Xiaoxiao · 中文 nữ", language: "zh-CN", locale: "zh-CN", gender: "female" },
  { id: "fr-male", label: "Henri · Français nam", language: "fr", locale: "fr-FR", gender: "male" },
  { id: "fr-female", label: "Denise · Français nữ", language: "fr", locale: "fr-FR", gender: "female" },
  { id: "es-male", label: "Alvaro · Español nam", language: "es", locale: "es-ES", gender: "male" },
  { id: "es-female", label: "Elvira · Español nữ", language: "es", locale: "es-ES", gender: "female" },
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
