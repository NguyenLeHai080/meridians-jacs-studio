import type { VoiceProfile } from "./types";

/** Built-in locale profiles. Speech is generated locally on the customer's OS. */
export const VOICE_PACKS: VoiceProfile[] = [
  // 👑 ELEVENLABS AI - Cảm xúc chân thật, có tiếng thở, ngắt nghỉ như người thật 100%
  {
    id: "eleven-adam",
    label: "👑 Adam (ElevenLabs · Hollywood Storyteller - Đỉnh cao cảm xúc & nhịp thở)",
    language: "vi",
    locale: "vi-VN",
    gender: "male",
    engine: "provider",
  },
  {
    id: "eleven-charlie",
    label: "👑 Charlie (ElevenLabs · Phim Tài Liệu & Phóng Sự - Trầm ấm, kịch tính)",
    language: "vi",
    locale: "vi-VN",
    gender: "male",
    engine: "provider",
  },
  {
    id: "eleven-george",
    label: "👑 George (ElevenLabs · Kể Chuyện Điện Ảnh - Cuốn hút, sâu lắng)",
    language: "vi",
    locale: "vi-VN",
    gender: "male",
    engine: "provider",
  },
  {
    id: "eleven-rachel",
    label: "👑 Rachel (ElevenLabs · Nữ Diễn Cảm - Chân thật, ngọt ngào tự nhiên)",
    language: "vi",
    locale: "vi-VN",
    gender: "female",
    engine: "provider",
  },

  // 🔥 VBEE AIVOICE - Giọng Review Phim Quốc Dân & Đa Vùng Miền Việt Nam
  {
    id: "vbee-manhdung",
    label: "🔥 Mạnh Dũng (Vbee · Nam Bắc - Giọng Review Phim Triệu View Quốc Dân)",
    language: "vi",
    locale: "vi-VN",
    gender: "male",
    engine: "provider",
  },
  {
    id: "vbee-minhhoang",
    label: "🌴 Minh Hoàng (Vbee · Nam Nam Bộ - Tự nhiên, trầm ấm, phóng khoáng)",
    language: "vi",
    locale: "vi-VN",
    gender: "male",
    engine: "provider",
  },
  {
    id: "vbee-maiphuong",
    label: "✨ Mai Phương (Vbee · Nữ Bắc - Truyền cảm, ngọt ngào, diễn cảm)",
    language: "vi",
    locale: "vi-VN",
    gender: "female",
    engine: "provider",
  },
  {
    id: "vbee-ngochoang",
    label: "🌸 Ngọc Huyền (Vbee · Nữ Nam Bộ - Dịu dàng, đằm thắm, sâu lắng)",
    language: "vi",
    locale: "vi-VN",
    gender: "female",
    engine: "provider",
  },

  // ⚡ MICROSOFT NEURAL PROSODY AI - Tốc độ tức thì
  {
    id: "vi-adam-review",
    label: "⚡ Adam Review Phim (Neural AI · Trầm ấm, nhịp dứt khoát YouTube/TikTok)",
    language: "vi",
    locale: "vi-VN",
    gender: "male",
    engine: "local",
  },
  {
    id: "vi-mystery-deep",
    label: "🎬 Nam Thuyết Minh Vụ Án (Neural AI · Trầm sâu, bí ẩn, điện ảnh kịch tính)",
    language: "vi",
    locale: "vi-VN",
    gender: "male",
    engine: "local",
  },
  {
    id: "vi-hoaimy-review",
    label: "✨ Nữ Review Phim / Viral (Neural AI · Sôi nổi, biểu cảm, cuốn hút)",
    language: "vi",
    locale: "vi-VN",
    gender: "female",
    engine: "local",
  },
  {
    id: "vi-hoaimy",
    label: "📻 Nữ Phát Thanh Viên Thời Sự (Neural AI · Chuẩn mực, trang trọng)",
    language: "vi",
    locale: "vi-VN",
    gender: "female",
    engine: "local",
  },
  {
    id: "vi-baolong",
    label: "🌴 Nam Nam Bộ / Miền Tây (Neural AI · Gần gũi, đời thường mộc mạc)",
    language: "vi",
    locale: "vi-VN",
    gender: "male",
    engine: "local",
  },
  {
    id: "vi-thihuong",
    label: "🌸 Nữ Nam Bộ Ngọt Ngào (Neural AI · Dịu dàng, đằm thắm)",
    language: "vi",
    locale: "vi-VN",
    gender: "female",
    engine: "local",
  },

  // English - Cinematic & Documentaries
  {
    id: "en-adam",
    label: "🎬 Adam Voice · English US (Hollywood Movie Narrator siêu trầm kịch tính - Guy)",
    language: "en",
    locale: "en-US",
    gender: "male",
    engine: "local",
  },
  {
    id: "en-brian",
    label: "🎙️ Brian Voice · English US (BBC / National Geographic Documentary Narrator)",
    language: "en",
    locale: "en-US",
    gender: "male",
    engine: "local",
  },
  {
    id: "en-jenny",
    label: "✨ Jenny · English US (Nữ diễn cảm, cảm xúc tự nhiên)",
    language: "en",
    locale: "en-US",
    gender: "female",
    engine: "local",
  },
  {
    id: "en-aria",
    label: "⚡ Aria · English US (Nữ sống động, kịch tính)",
    language: "en",
    locale: "en-US",
    gender: "female",
    engine: "local",
  },

  // Quốc tế đa ngôn ngữ
  { id: "ja-male", label: "🗾 Keita · 日本語 Nam (Thuyết minh & Anime)", language: "ja", locale: "ja-JP", gender: "male", engine: "local" },
  { id: "ja-female", label: "🌸 Nanami · 日本語 Nữ (Truyền cảm & Tự nhiên)", language: "ja", locale: "ja-JP", gender: "female", engine: "local" },
  { id: "ko-male", label: "🇰🇷 InJoon · 한국어 Nam (K-Drama & Thuyết minh)", language: "ko", locale: "ko-KR", gender: "male", engine: "local" },
  { id: "ko-female", label: "🌺 SunHi · 한국어 Nữ (Ngọt ngào & Truyền cảm)", language: "ko", locale: "ko-KR", gender: "female", engine: "local" },
  { id: "zh-CN-male", label: "🇨🇳 Yunxi · 中文 Nam (Thuyết minh phim CCTV)", language: "zh-CN", locale: "zh-CN", gender: "male", engine: "local" },
  { id: "zh-CN-female", label: "🏮 Xiaoxiao · 中文 Nữ (Cảm xúc sống động)", language: "zh-CN", locale: "zh-CN", gender: "female", engine: "local" },
  { id: "fr-male", label: "🇫🇷 Henri · Français Nam", language: "fr", locale: "fr-FR", gender: "male", engine: "local" },
  { id: "fr-female", label: "🥖 Denise · Français Nữ", language: "fr", locale: "fr-FR", gender: "female", engine: "local" },
  { id: "es-male", label: "🇪🇸 Alvaro · Español Nam", language: "es", locale: "es-ES", gender: "male", engine: "local" },
  { id: "es-female", label: "💃 Elvira · Español Nữ", language: "es", locale: "es-ES", gender: "female", engine: "local" },
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
