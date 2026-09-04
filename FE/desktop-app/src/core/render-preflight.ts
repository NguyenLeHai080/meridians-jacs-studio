import type { Job } from "./types";

export type RenderPreflightCheck = { id: string; passed: boolean; detail: string };
export type RenderPreflightInput = {
  job: Pick<Job, "narratorEnabled" | "subtitlesEnabled" | "backgroundMusic" | "backgroundMusicVolume" | "aspectRatio" | "logoPath" | "logoPosition">;
  sourcePath?: string;
  sourceDuration?: number;
  startSeconds?: number;
  endSeconds?: number;
  narrationText?: string;
  subtitleSegments?: Array<{ start: number; end: number; text: string }>;
  outputPath?: string;
  /** Set false for the invariant pass that runs before FFmpeg creates output. */
  requireOutput?: boolean;
};

/** Validate cheap, deterministic render invariants before invoking FFmpeg. */
export function runRenderPreflight(input: RenderPreflightInput) {
  const start = Number(input.startSeconds ?? 0);
  const end = Number(input.endSeconds ?? 0);
  const duration = Number(input.sourceDuration ?? 0);
  const subtitlesEnabled = input.job.subtitlesEnabled !== false;
  const subtitleSegments = input.subtitleSegments || [];
  const hasSubtitleContent = subtitleSegments.some((segment) => segment.text.trim().length > 0)
    || Boolean(input.job.narratorEnabled && input.narrationText?.trim());
  const checks: RenderPreflightCheck[] = [
    { id: "source", passed: Boolean(input.sourcePath), detail: input.sourcePath ? "Đã xác định video nguồn" : "Thiếu video nguồn" },
    { id: "clip-range", passed: Number.isFinite(start) && Number.isFinite(end) && (end <= 0 || end > start) && (duration <= 0 || end <= duration + 0.5), detail: "Khoảng cắt nằm trong thời lượng nguồn" },
    { id: "voice-script", passed: !input.job.narratorEnabled || Boolean(input.narrationText?.trim()), detail: input.job.narratorEnabled ? "Có lời đọc theo ngữ cảnh" : "Không bật voice-over" },
    { id: "subtitle-content", passed: !subtitlesEnabled || hasSubtitleContent, detail: subtitlesEnabled ? "Đã có nội dung phụ đề theo scene" : "Đã tắt phụ đề" },
    { id: "subtitle-safe-area", passed: !subtitlesEnabled || subtitleSegments.every((segment) => segment.end > segment.start && segment.text.trim().length <= 1200), detail: "Phụ đề có mốc hợp lệ và không vượt giới hạn" },
    { id: "audio-level", passed: !input.job.backgroundMusic || (input.job.backgroundMusicVolume ?? 20) >= 0 && (input.job.backgroundMusicVolume ?? 20) <= 100, detail: "Âm lượng nhạc nền nằm trong 0-100%" },
    { id: "aspect-ratio", passed: !input.job.aspectRatio || ["original", "9:16", "1:1", "16:9"].includes(input.job.aspectRatio), detail: "Tỷ lệ khung hình hợp lệ" },
    { id: "output", passed: input.requireOutput === false || Boolean(input.outputPath), detail: input.outputPath ? "Đã tạo file output" : "Chưa có file output" },
  ];
  return { passed: checks.every((check) => check.passed), checks };
}
