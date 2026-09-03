import type { Job, ProviderProfile, ProviderType } from "./types";

/** Normalize URLs copied from Markdown, chat apps and escaped text fields. */
export function normalizePastedUrl(value: string): string {
  return String(value || "")
    .trim()
    .replace(/^\s*\[[^\]]*\]\((https?:\/\/[^)]+)\)\s*[.;,]*\s*$/i, "$1")
    .replace(/^\s*<([^>]+)>\s*$/, "$1")
    .replace(/\\([_?&#=])/g, "$1")
    .replace(/[),.;]+$/, "")
    .trim();
}

export function sourceNameFromUrl(value: string): string {
  try {
    const parsed = new URL(value);
    const tikTokId = parsed.pathname.match(/\/video\/(\d+)/)?.[1];
    if (tikTokId) return `TikTok · ${tikTokId}`;
    return decodeURIComponent(parsed.pathname.split("/").filter(Boolean).pop() || parsed.hostname);
  } catch {
    return "Video URL";
  }
}

export function providerIsReady(provider: ProviderProfile | undefined, capability: string, supportedTypes?: ProviderType[]): provider is ProviderProfile {
  return Boolean(
    provider?.enabled
    && provider.hasApiKey
    // OpenAI-compatible gateways often do not publish a capability list. The
    // desktop runtime probes the endpoint and provides a safe fallback, so a
    // saved OpenAI profile with only URL + key remains usable.
    && (provider.capabilities.includes(capability)
      || (provider.providerType === "openai" && ["analysis", "transcription", "tts"].includes(capability))
      || (provider.providerType === "openai-compatible" && ["analysis", "transcription", "tts"].includes(capability)))
    && (!supportedTypes || supportedTypes.includes(provider.providerType)),
  );
}

/** Prefer the saved profile, but recover old jobs through another ready BYOK profile. */
export function resolveReadyProvider(providers: ProviderProfile[], preferredId: string | undefined, capability: string, supportedTypes?: ProviderType[]): ProviderProfile | undefined {
  const preferred = preferredId ? providers.find((provider) => provider.id === preferredId) : undefined;
  return providerIsReady(preferred, capability, supportedTypes)
    ? preferred
    : providers.find((provider) => providerIsReady(provider, capability, supportedTypes));
}

export function timestampSeconds(value: string | undefined, fallback = 0): number {
  const parts = String(value || "").split(":").map(Number);
  if (!parts.length || parts.some((part) => !Number.isFinite(part))) return fallback;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0];
}

/** Pick a bounded scene for highlight-only rendering after AI analysis. */
export function highlightRange(job: Pick<Job, "highlightOnly" | "highlightMaxSeconds" | "clipStartSeconds" | "clipEndSeconds">, analysis: Job["analysis"], durationSeconds: number) {
  const existingStart = job.clipStartSeconds;
  const existingEnd = job.clipEndSeconds;
  if (!job.highlightOnly || existingEnd !== undefined || !analysis?.scenes?.length) {
    return { startSeconds: existingStart, endSeconds: existingEnd };
  }
  const total = Math.max(0.25, durationSeconds || 0.25);
  const maxDuration = Math.min(Math.max(3, job.highlightMaxSeconds || 30), total);
  const preferred = analysis.scenes.find((scene) => /(hook|highlight|cao trào|đỉnh|ấn tượng|mở đầu)/i.test(`${scene.title} ${scene.detail}`)) || analysis.scenes[0];
  const start = Math.max(0, Math.min(total - 0.25, timestampSeconds(preferred.start)));
  const requestedEnd = timestampSeconds(preferred.end, start + maxDuration);
  const end = Math.min(total, Math.max(start + 0.25, Math.min(start + maxDuration, requestedEnd)));
  return { startSeconds: start, endSeconds: end };
}

/** Decide whether a persisted job can be picked up after an app restart. */
export function shouldResumeJob(job: Pick<Job, "sourceOnly" | "status" | "stage" | "localPath" | "sourceType" | "sourcePaths" | "childJobIds">) {
  if (job.sourceOnly || job.childJobIds?.length) return false;
  if (!(job.localPath || job.sourceType === "url" || job.sourcePaths?.length)) return false;
  if (job.status === "queued" || (job.status === "running" && !["script_review", "timeline_review", "completed", "failed", "cancelled"].includes(job.stage || ""))) return true;
  return job.status === "running" && job.stage === "downloading";
}

/** Uncertain matches must be reviewed before automatic scene fan-out. */
export function hasUnreviewedSceneMatches(matches: Array<{ needsReview?: boolean }> | undefined) {
  return Array.isArray(matches) && matches.some((match) => match.needsReview);
}

/** Mark all scene matches as operator-reviewed without changing their ranges. */
export function approveSceneMatches<T extends { needsReview?: boolean }>(matches: T[] | undefined): T[] | undefined {
  return Array.isArray(matches) ? matches.map((match) => ({ ...match, needsReview: false })) : matches;
}

/** Replace an uncertain match with a selected candidate clip. */
export function replaceSceneMatch<T extends { sceneId: string; sourceStart: number; sourceEnd: number; needsReview?: boolean }>(matches: T[] | undefined, index: number, candidate: { sceneId: string; sourceStart: number; sourceEnd: number }): T[] | undefined {
  if (!Array.isArray(matches) || !matches[index]) return matches;
  return matches.map((match, matchIndex) => matchIndex === index ? { ...match, ...candidate, needsReview: false } : match);
}
