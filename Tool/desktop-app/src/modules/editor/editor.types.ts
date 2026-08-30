export type EditorScene = {
  id: string;
  start: string;
  end: string;
  title: string;
  detail: string;
  accent: string;
};

export type EditorTrack = {
  id: string;
  label: string;
  icon: "video" | "mic" | "volume" | "captions";
  color: string;
  clips: Array<{ sceneId: string; label: string; width: number }>;
};

export const EDITOR_SCENES: EditorScene[] = [
  { id: "hook", start: "00:04", end: "00:12", title: "Hook mở đầu", detail: "Host nhìn thẳng camera · high energy", accent: "cyan" },
  { id: "reveal", start: "00:12", end: "00:31", title: "Product reveal", detail: "Phát hiện sản phẩm · đề xuất zoom 110%", accent: "lime" },
  { id: "proof", start: "00:31", end: "00:54", title: "Social proof", detail: "Cắt nhịp theo câu thoại và reaction", accent: "orange" },
  { id: "cta", start: "00:54", end: "01:08", title: "Call to action", detail: "Voice peak · phù hợp chèn subtitle", accent: "blue" },
];

export const EDITOR_TRACKS: EditorTrack[] = [
  { id: "video", label: "Video", icon: "video", color: "#31d8d0", clips: [{ sceneId: "hook", label: "HOOK", width: 21 }, { sceneId: "reveal", label: "REVEAL", width: 26 }, { sceneId: "proof", label: "PROOF", width: 29 }, { sceneId: "cta", label: "CTA", width: 20 }] },
  { id: "voice", label: "AI voice", icon: "mic", color: "#b9ea6c", clips: [{ sceneId: "hook", label: "Narrator voice", width: 44 }, { sceneId: "reveal", label: "Narrator voice", width: 31 }, { sceneId: "cta", label: "Narrator voice", width: 24 }] },
  { id: "audio", label: "Original audio", icon: "volume", color: "#e9a76f", clips: [{ sceneId: "hook", label: "Original audio", width: 73 }, { sceneId: "cta", label: "Original audio", width: 27 }] },
  { id: "subtitle", label: "Subtitle", icon: "captions", color: "#8fa8ff", clips: [{ sceneId: "hook", label: "Xin chào mọi người", width: 22 }, { sceneId: "reveal", label: "Đây là sản phẩm mới", width: 27 }, { sceneId: "proof", label: "Đã được kiểm chứng", width: 25 }, { sceneId: "cta", label: "Thử ngay hôm nay", width: 20 }] },
];
