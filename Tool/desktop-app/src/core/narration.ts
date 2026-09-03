import type { AnalysisResult } from "./types";

/** Use the model's contextual voice script instead of reading analysis labels. */
export function buildNarrationText(analysis?: AnalysisResult | null, range?: { startSeconds?: number; endSeconds?: number }): string {
  const hasRange = Boolean(range && range.startSeconds !== undefined && range.endSeconds !== undefined);
  const startSeconds = range?.startSeconds;
  const endSeconds = range?.endSeconds;
  const allScenes = analysis?.scenes || [];
  const scenes = allScenes.filter((scene, index) => {
    if (!hasRange) return true;
    const toSeconds = (value?: string) => {
      const parts = String(value || "0").split(":").map(Number);
      return parts.length === 2 ? parts[0] * 60 + parts[1] : Number(parts[0] || 0);
    };
    const nextStart = allScenes[index + 1] ? toSeconds(allScenes[index + 1].start) : Number(endSeconds);
    const sceneStart = toSeconds(scene.start);
    const sceneEnd = scene.end ? toSeconds(scene.end) : nextStart;
    return sceneEnd > (startSeconds as number) && sceneStart < (endSeconds as number);
  });
  const direct = String(analysis?.voiceScript || "").replace(/\s+/g, " ").trim();
  const contextual = scenes
    .map((scene) => String(scene.voiceover || scene.translation || "").replace(/\s+/g, " ").trim())
    .join(" ")
    .slice(0, 12000);
  // A scene clip must have its own voiceover. Falling back to a translated
  // full transcript makes the narration describe the wrong visual segment.
  if (hasRange) {
    if (!scenes.length || scenes.some((scene) => !String(scene.voiceover || scene.translation || "").trim())) return "";
    return contextual;
  }
  if (contextual && scenes.length && scenes.every((scene) => String(scene.voiceover || scene.translation || "").trim())) return contextual;
  if (direct) return direct.slice(0, 12000);
  // Raw transcripts are not safe narration: they may contain source-language
  // dialogue or text from another scene. Require a contextual script.
  return "";
}
