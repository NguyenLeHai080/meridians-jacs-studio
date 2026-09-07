import type { VoiceProfile } from "./types";

/** Built-in locale profiles. Speech is generated locally on the customer's OS or via Neural Cloud. */
export const VOICE_PACKS: VoiceProfile[] = [
  // 👑 ELEVENLABS AI - Cảm xúc chân thật, có tiếng thở, ngắt nghỉ như người thật 100%
  {
    id: "eleven-adam",
    label: "👑 Adam (ElevenLabs · Hollywood Storyteller - Đỉnh cao cảm xúc & nhịp thở)",
    language: "vi",
    locale: "vi-VN",
    gender: "male",
    engine: "provider",
    region: "eleven",
    style: "story",
  },
  {
    id: "eleven-charlie",
    label: "👑 Charlie (ElevenLabs · Phim Tài Liệu & Phóng Sự - Trầm ấm, kịch tính)",
    language: "vi",
    locale: "vi-VN",
    gender: "male",
    engine: "provider",
    region: "eleven",
    style: "mystery",
  },
  {
    id: "eleven-george",
    label: "👑 George (ElevenLabs · Kể Chuyện Điện Ảnh - Cuốn hút, sâu lắng)",
    language: "vi",
    locale: "vi-VN",
    gender: "male",
    engine: "provider",
    region: "eleven",
    style: "story",
  },
  {
    id: "eleven-rachel",
    label: "👑 Rachel (ElevenLabs · Nữ Diễn Cảm - Chân thật, ngọt ngào tự nhiên)",
    language: "vi",
    locale: "vi-VN",
    gender: "female",
    engine: "provider",
    region: "eleven",
    style: "emotional",
  },

  // 🔥 VBEE AIVOICE - Giọng Review Phim Quốc Dân & Đa Vùng Miền Việt Nam
  {
    id: "vbee-manhdung",
    label: "🔥 Mạnh Dũng (Vbee · Nam Bắc - Giọng Review Phim Triệu View Quốc Dân)",
    language: "vi",
    locale: "vi-VN",
    gender: "male",
    engine: "provider",
    region: "north",
    style: "review",
  },
  {
    id: "vbee-minhhoang",
    label: "🌴 Minh Hoàng (Vbee · Nam Nam Bộ - Tự nhiên, trầm ấm, phóng khoáng)",
    language: "vi",
    locale: "vi-VN",
    gender: "male",
    engine: "provider",
    region: "south",
    style: "story",
  },
  {
    id: "vbee-maiphuong",
    label: "✨ Mai Phương (Vbee · Nữ Bắc - Truyền cảm, ngọt ngào, diễn cảm)",
    language: "vi",
    locale: "vi-VN",
    gender: "female",
    engine: "provider",
    region: "north",
    style: "emotional",
  },
  {
    id: "vbee-ngochoang",
    label: "🌸 Ngọc Huyền (Vbee · Nữ Nam Bộ - Dịu dàng, đằm thắm, sâu lắng)",
    language: "vi",
    locale: "vi-VN",
    gender: "female",
    engine: "provider",
    region: "south",
    style: "emotional",
  },

  // ⚡ MICROSOFT NEURAL PROSODY AI - Tốc độ tức thì
  {
    id: "vi-adam-review",
    label: "⚡ Nam Review Phim Nhanh (Neural AI · Miền Bắc, nhịp dứt khoát TikTok)",
    language: "vi",
    locale: "vi-VN",
    gender: "male",
    engine: "local",
    region: "north",
    style: "review",
  },
  {
    id: "vi-namminh",
    label: "🎙️ Nam Minh (Neural AI · Nam Bắc - Thời sự, tin tức chính luận)",
    language: "vi",
    locale: "vi-VN",
    gender: "male",
    engine: "local",
    region: "north",
    style: "news",
  },
  {
    id: "vi-mystery-deep",
    label: "🎬 Nam Thuyết Minh Vụ Án (Neural AI · Trầm sâu, bí ẩn, điện ảnh kịch tính)",
    language: "vi",
    locale: "vi-VN",
    gender: "male",
    engine: "local",
    region: "mystery",
    style: "mystery",
  },
  {
    id: "vi-hoaimy-review",
    label: "✨ Nữ Review Phim / Viral (Neural AI · Nữ Bắc - Sôi nổi, biểu cảm cuốn hút)",
    language: "vi",
    locale: "vi-VN",
    gender: "female",
    engine: "local",
    region: "north",
    style: "review",
  },
  {
    id: "vi-hoaimy",
    label: "📻 Hoài My (Neural AI · Nữ Bắc - Phát thanh viên chuẩn mực)",
    language: "vi",
    locale: "vi-VN",
    gender: "female",
    engine: "local",
    region: "north",
    style: "news",
  },
  {
    id: "vi-baolong",
    label: "🌴 Bảo Long (Neural AI · Nam Nam Bộ / Miền Tây - Mộc mạc, gần gũi)",
    language: "vi",
    locale: "vi-VN",
    gender: "male",
    engine: "local",
    region: "south",
    style: "story",
  },
  {
    id: "vi-thihuong",
    label: "🌸 Thị Hương (Neural AI · Nữ Nam Bộ Ngọt Ngào - Dịu dàng, đằm thắm)",
    language: "vi",
    locale: "vi-VN",
    gender: "female",
    engine: "local",
    region: "south",
    style: "emotional",
  },

  // 🎬 English - Hollywood, Cinematic & Documentaries
  {
    id: "en-adam",
    label: "🎬 Adam Voice · English US (Hollywood Movie Narrator siêu trầm kịch tính)",
    language: "en",
    locale: "en-US",
    gender: "male",
    engine: "local",
    region: "intl",
    style: "story",
  },
  {
    id: "en-brian",
    label: "🎙️ Brian Voice · English US (BBC / National Geographic Documentary Narrator)",
    language: "en",
    locale: "en-US",
    gender: "male",
    engine: "local",
    region: "intl",
    style: "news",
  },
  {
    id: "en-jenny",
    label: "✨ Jenny · English US (Nữ diễn cảm, cảm xúc tự nhiên)",
    language: "en",
    locale: "en-US",
    gender: "female",
    engine: "local",
    region: "intl",
    style: "emotional",
  },
  {
    id: "en-aria",
    label: "⚡ Aria · English US (Nữ sống động, kịch tính)",
    language: "en",
    locale: "en-US",
    gender: "female",
    engine: "local",
    region: "intl",
    style: "review",
  },

  // 🌐 Quốc tế đa ngôn ngữ
  { id: "ja-male", label: "🗾 Keita · 日本語 Nam (Thuyết minh & Anime)", language: "ja", locale: "ja-JP", gender: "male", engine: "local", region: "intl", style: "story" },
  { id: "ja-female", label: "🌸 Nanami · 日本語 Nữ (Truyền cảm & Tự nhiên)", language: "ja", locale: "ja-JP", gender: "female", engine: "local", region: "intl", style: "emotional" },
  { id: "ko-male", label: "🇰🇷 InJoon · 한국어 Nam (K-Drama & Thuyết minh)", language: "ko", locale: "ko-KR", gender: "male", engine: "local", region: "intl", style: "story" },
  { id: "ko-female", label: "🌺 SunHi · 한국어 Nữ (Ngọt ngào & Truyền cảm)", language: "ko", locale: "ko-KR", gender: "female", engine: "local", region: "intl", style: "emotional" },
  { id: "zh-CN-male", label: "🇨🇳 Yunxi · 中文 Nam (Thuyết minh phim CCTV)", language: "zh-CN", locale: "zh-CN", gender: "male", engine: "local", region: "intl", style: "story" },
  { id: "zh-CN-female", label: "🏮 Xiaoxiao · 中文 Nữ (Cảm xúc sống động)", language: "zh-CN", locale: "zh-CN", gender: "female", engine: "local", region: "intl", style: "emotional" },
  { id: "fr-male", label: "🇫🇷 Henri · Français Nam", language: "fr", locale: "fr-FR", gender: "male", engine: "local", region: "intl", style: "story" },
  { id: "fr-female", label: "🥖 Denise · Français Nữ", language: "fr", locale: "fr-FR", gender: "female", engine: "local", region: "intl", style: "emotional" },
  { id: "es-male", label: "🇪🇸 Alvaro · Español Nam", language: "es", locale: "es-ES", gender: "male", engine: "local", region: "intl", style: "story" },
  { id: "es-female", label: "💃 Elvira · Español Nữ", language: "es", locale: "es-ES", gender: "female", engine: "local", region: "intl", style: "emotional" },
];

export function voicesForLanguage(language: string): VoiceProfile[] {
  const code = String(language || "vi").toLowerCase();
  const exact = VOICE_PACKS.filter((voice) => (voice?.language ? voice.language.toLowerCase() : "") === code);
  if (exact.length) return exact;
  const base = (code ? code.split(/[-_]/)[0] : "vi");
  return VOICE_PACKS.filter((voice) => (voice?.language ? voice.language.toLowerCase().split(/[-_]/)[0] : "") === base);
}

export function defaultVoice(language: string, gender: "male" | "female"): VoiceProfile {
  return voicesForLanguage(language).find((voice) => voice.gender === gender) || VOICE_PACKS[gender === "male" ? 1 : 0];
}
