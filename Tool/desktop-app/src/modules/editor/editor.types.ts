export type EditorScene = {
  id: string;
  start: string;
  end: string;
  title: string;
  detail: string;
  /** Contextual line used by the voice and subtitle tracks in the editor. */
  subtitle?: string;
  /** Caption cues relative to the scene clip, used by the live preview. */
  subtitleCues?: Array<{ start: number; end: number; text: string }>;
  accent: string;
};

export type EditorTrack = {
  id: string;
  label: string;
  icon: "video" | "mic" | "volume" | "captions";
  color: string;
  clips: Array<{ sceneId: string; label: string; width: number; left: number }>;
};
