import type { Job } from "./types";
import { timestampSeconds } from "./job-utils";
import { runRenderPreflight } from "./render-preflight";

export function subtitleSegmentsForClip(
  job: Job,
  analysis: Job["analysis"],
  clip: { startSeconds?: number; endSeconds?: number },
  fallback?: string,
  sourceDuration = 0
) {
  const start = Number(clip.startSeconds || 0);
  const end = Number(clip.endSeconds || 0);
  const total = Math.max(
    sourceDuration,
    Number(job.durationSeconds || 0),
    end,
    start + 1
  );
  const selectedText = String(job.subtitleText || "")
    .replace(/\s+/g, " ")
    .trim();
  if (selectedText && (job.parentJobId || job.sceneId)) {
    return [{ start, end: end || total, text: selectedText }];
  }

  const scenes = analysis?.scenes || [];
  const rawTranscriptSegments = [...(analysis?.transcriptSegments || [])]
    .map((item) => ({
      start: Math.max(0, Number(item.start) || 0),
      end: Number(item.end),
      text: String(item.text || "")
        .replace(/\s+/g, " ")
        .trim(),
    }))
    .filter((item) => item.text)
    .sort((left, right) => left.start - right.start);
  const transcriptSegments = rawTranscriptSegments.map((item, index) => {
    const nextStart = rawTranscriptSegments[index + 1]?.start;
    const explicitEnd =
      Number.isFinite(item.end) && item.end > item.start ? item.end : undefined;
    const inferredEnd = nextStart && nextStart > item.start ? nextStart : total;
    return {
      ...item,
      end: Math.min(total, Math.max(item.start + 0.25, explicitEnd || inferredEnd)),
    };
  });
  const sceneSegments = scenes.map((item, index) => {
    const sceneId = item.id || `scene-${index + 1}`;
    const sceneStart = timestampSeconds(item.start);
    const sceneEnd = Math.max(
      sceneStart + 0.25,
      timestampSeconds(
        item.end,
        timestampSeconds(scenes[index + 1]?.start, total)
      )
    );
    const localizedText = String(item.voiceover || item.translation || "")
      .replace(/\s+/g, " ")
      .trim();
    const timedText = transcriptSegments
      .filter((segment) => segment.end > sceneStart && segment.start < sceneEnd)
      .map((segment) => segment.text)
      .join(" ")
      .trim();
    return {
      sceneId,
      start: sceneStart,
      end: sceneEnd,
      text:
        localizedText ||
        timedText ||
        String(item.detail || "")
          .replace(/\s+/g, " ")
          .trim(),
    };
  });
  const matches = sceneSegments
    .filter(
      (item) =>
        (!job.sceneId || item.sceneId === job.sceneId) &&
        item.text &&
        (!end || item.end > start) &&
        (!end || item.start < end)
    )
    .map((item) => ({
      start: Math.max(0, item.start),
      end: Math.min(total, item.end || (end || start + 1)),
      text: item.text,
    }));
  if (matches.length) return matches;

  const timed = transcriptSegments
    .filter((item) => (!end || item.end > start) && (!end || item.start < end))
    .map((item) => ({
      start: Math.max(0, item.start),
      end: Math.min(total, item.end || (end || start + 1)),
      text: item.text,
    }));
  if (timed.length) return timed;
  const text =
    selectedText ||
    String(fallback || analysis?.voiceScript || analysis?.transcript || "")
      .replace(/\s+/g, " ")
      .trim();
  return text ? [{ start, end: end || total, text }] : [];
}

export function renderQualityChecks(
  job: Job,
  analysis: Job["analysis"],
  clip: { startSeconds?: number; endSeconds?: number },
  narrationText: string | undefined,
  outputPath: string | undefined,
  sourceDuration: number,
  outputProbe?: { durationSeconds?: number; hasAudio?: boolean },
  renderResult?: {
    subtitlesBurned?: boolean;
    narrationGenerated?: boolean;
    narrationDurationSeconds?: number;
    subtitleCueCount?: number;
  }
) {
  const subtitleSegments = subtitleSegmentsForClip(
    job,
    analysis,
    clip,
    narrationText,
    sourceDuration
  );
  const preflight = runRenderPreflight({
    job,
    sourcePath: job.localPath,
    sourceDuration,
    startSeconds: clip.startSeconds,
    endSeconds: clip.endSeconds,
    narrationText,
    subtitleSegments,
    outputPath,
  });
  const expectedDuration =
    (clip.endSeconds || 0) > (clip.startSeconds || 0)
      ? (clip.endSeconds || 0) - (clip.startSeconds || 0)
      : sourceDuration;
  const subtitlesRequested = job.subtitlesEnabled !== false;
  const subtitleContent = Boolean(
    subtitleSegments.length || job.subtitleText?.trim() || narrationText?.trim()
  );
  const checks = [
    ...preflight.checks,
    {
      id: "scene-map",
      passed:
        !job.narratorEnabled ||
        Boolean(analysis?.sceneMatches?.length || analysis?.scenes?.length),
      detail: "Có scene map để kiểm tra",
    },
    {
      id: "output-probe",
      passed:
        Boolean(outputPath) &&
        (!outputProbe || Number(outputProbe.durationSeconds || 0) > 0),
      detail: "Output có thể probe và có thời lượng hợp lệ",
    },
    {
      id: "output-checksum",
      passed:
        !renderResult ||
        Boolean((renderResult as { outputChecksum?: string }).outputChecksum),
      detail: "Output có checksum SHA-256 và manifest",
    },
    {
      id: "output-duration",
      passed:
        !outputProbe ||
        !expectedDuration ||
        Math.abs(Number(outputProbe.durationSeconds || 0) - expectedDuration) <=
          Math.max(1.5, expectedDuration * 0.2),
      detail: "Thời lượng output khớp khoảng dựng",
    },
    {
      id: "output-audio",
      passed:
        !job.narratorEnabled ||
        !outputProbe ||
        outputProbe.hasAudio === true,
      detail: "Output có audio stream cho voice-over",
    },
    {
      id: "output-voice",
      passed:
        !job.narratorEnabled ||
        !renderResult ||
        renderResult.narrationGenerated === true,
      detail: "Đã tạo voice-over theo scene",
    },
    {
      id: "voice-duration",
      passed:
        !job.narratorEnabled ||
        !renderResult ||
        Number(renderResult.narrationDurationSeconds || 0) > 0,
      detail: "Đã đo thời lượng audio voice-over thực tế",
    },
    {
      id: "subtitle-cues",
      passed:
        !subtitlesRequested ||
        !subtitleContent ||
        !renderResult ||
        Number(renderResult.subtitleCueCount || 0) > 0,
      detail: "Đã tạo cue phụ đề theo lời đọc",
    },
    {
      id: "output-subtitles",
      passed:
        !subtitlesRequested ||
        !subtitleContent ||
        !renderResult ||
        renderResult.subtitlesBurned === true,
      detail: subtitlesRequested
        ? "Đã burn phụ đề vào video"
        : "Đã tắt phụ đề",
    },
  ];
  return { passed: checks.every((check) => check.passed), checks };
}

export function sceneSlug(value: string, fallback: string) {
  const slug = String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return slug.slice(0, 64) || fallback;
}
