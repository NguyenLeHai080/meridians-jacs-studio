export const SAMPLE_LIBRARY_IMAGES = [
  { id: "img-1", title: "Nature cover, Nov...", meta: "1345 × 1959 · Public domain", color: "#334155" },
  { id: "img-2", title: "Скелі Демерджі...", meta: "3124 × 3124 · CC BY-SA 3.0", color: "#475569" },
  { id: "img-3", title: "Valley Sunset View", meta: "1920 × 1080 · Unsplash", color: "#1e293b" },
  { id: "img-4", title: "Cyberpunk City Neon", meta: "1080 × 1920 · Creative Commons", color: "#0f172a" },
  { id: "img-5", title: "Technology AI Core", meta: "1920 × 1080 · Premium Stock", color: "#0e7490" },
];

export const SAMPLE_LIBRARY_VIDEOS = [
  { id: "vid-1", title: "Cinematic B-roll Forest", meta: "00:15 · 1080p 60fps", color: "#065f46" },
  { id: "vid-2", title: "Urban Drone Hyperlapse", meta: "00:10 · 4K UHD", color: "#1e3a8a" },
  { id: "vid-3", title: "Action Combat Sequence", meta: "00:25 · 1080p 60fps", color: "#78350f" },
  { id: "vid-4", title: "Time-lapse Starry Night", meta: "00:18 · 4K 60fps", color: "#4c1d95" },
];

export const SAMPLE_LIBRARY_MUSIC = [
  { id: "mus-1", title: "Hoà Cùng Yêu Dấu Nỗi Buồn", meta: "03:45 · Lo-Fi Chill", color: "#38bdf8", type: "music" },
  { id: "mus-2", title: "Kịch Tính Phá Án & Điều Tra", meta: "04:12 · Suspense Thriller", color: "#f59e0b", type: "music" },
  { id: "mus-3", title: "Hành Động Khởi Chiến", meta: "02:30 · Epic Cinematic", color: "#ef4444", type: "music" },
  { id: "mus-4", title: "Vlog Tươi Vui Năng Động", meta: "02:15 · Happy Upbeat", color: "#10b981", type: "music" },
];

export const SAMPLE_LIBRARY_SFX = [
  { id: "sfx-1", title: "SFX Whoosh Chuyển Cảnh", meta: "00:01 · Whoosh Sound", color: "#a855f7", type: "sfx" },
  { id: "sfx-2", title: "SFX Cinematic Impact Boom", meta: "00:02 · Bass Drop", color: "#ec4899", type: "sfx" },
  { id: "sfx-3", title: "SFX Pop Notification", meta: "00:01 · Digital Chime", color: "#06b6d4", type: "sfx" },
  { id: "sfx-4", title: "SFX Camera Shutter Snap", meta: "00:01 · Shutter", color: "#64748b", type: "sfx" },
];

export const FILTER_PRESETS = [
  { id: "none", name: "Gốc (Normal)", css: "none" },
  { id: "cinematic", name: "Điện ảnh (Cinematic)", css: "contrast(1.15) saturate(1.2) brightness(0.95)" },
  { id: "warm", name: "Ấm áp (Warm Film)", css: "sepia(0.25) saturate(1.3) contrast(1.05)" },
  { id: "noir", name: "Đen trắng (Dark Noir)", css: "grayscale(1) contrast(1.3) brightness(0.9)" },
  { id: "cyber", name: "Cyberpunk Neon", css: "hue-rotate(180deg) saturate(1.5) contrast(1.2)" },
  { id: "vibrant", name: "Rực rỡ (Vibrant)", css: "saturate(1.6) contrast(1.1)" },
  { id: "teal-orange", name: "Teal & Orange", css: "hue-rotate(20deg) contrast(1.2) saturate(1.4)" },
  { id: "moody", name: "Moody Dark", css: "brightness(0.85) contrast(1.25) saturate(0.9)" },
];

export const MASK_PRESETS = [
  { id: "none", name: "Không Mask", clip: "none" },
  { id: "letterbox", name: "21:9 Letterbox (Viền trên dưới)", clip: "inset(12% 0 12% 0)" },
  { id: "rounded", name: "Bo góc tròn (Rounded)", clip: "inset(4% 4% 4% 4% round 16px)" },
  { id: "circle", name: "Hình tròn (Circle)", clip: "circle(46% at 50% 50%)" },
  { id: "diamond", name: "Hình thoi (Diamond)", clip: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" },
];

export const STICKER_PRESETS = [
  { id: "stk-1", label: "🔔 Like & Subscribe", color: "#ef4444" },
  { id: "stk-2", label: "✨ TikTok Follow", color: "#06b6d4" },
  { id: "stk-3", label: "🔥 Hot News / Tin Nóng", color: "#f97316" },
  { id: "stk-4", label: "🎯 Đăng ký kênh", color: "#10b981" },
  { id: "stk-5", label: "⚡ 50% GIẢM GIÁ", color: "#eab308" },
  { id: "stk-6", label: "💎 100% UY TÍN", color: "#38bdf8" },
];
