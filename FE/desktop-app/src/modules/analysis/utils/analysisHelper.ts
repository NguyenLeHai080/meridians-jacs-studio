import type { AnalysisResult, AnalysisScene } from "../../../core/types";

export function getSceneCount(analysis?: AnalysisResult): number {
  return analysis?.scenes?.length || 0;
}

export function formatConfidence(score?: number): string {
  if (score === undefined || score === null) return "--";
  return `${Math.round(score * 100)}%`;
}

export function extractKeywords(scenes: AnalysisScene[] = []): string[] {
  const set = new Set<string>();
  for (const scene of scenes) {
    if (scene.keywords) {
      for (const kw of scene.keywords) {
        set.add(kw);
      }
    }
  }
  return Array.from(set);
}
