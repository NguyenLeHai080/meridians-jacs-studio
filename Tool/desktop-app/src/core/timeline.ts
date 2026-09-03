import type { TimelineClip } from "./types";

export type TimelineHistory = {
  state: TimelineClip[];
  commit: (next: TimelineClip[]) => TimelineClip[];
  undo: () => TimelineClip[];
  redo: () => TimelineClip[];
  canUndo: boolean;
  canRedo: boolean;
};

export function normalizeTimeline(clips: TimelineClip[]): TimelineClip[] {
  return clips
    .filter((clip) => clip.sceneId)
    .sort((a, b) => a.order - b.order)
    .map((clip, order) => ({ ...clip, order }));
}

export function trimTimelineClip(clips: TimelineClip[], sceneId: string, trimIn: number, trimOut: number): TimelineClip[] {
  const start = Math.max(0, Number(trimIn) || 0);
  const end = Math.max(start + 0.25, Number(trimOut) || start + 0.25);
  return normalizeTimeline(clips.map((clip) => clip.sceneId === sceneId ? { ...clip, trimIn: start, trimOut: end } : clip));
}

export function splitTimelineClip(clips: TimelineClip[], sceneId: string, at: number): TimelineClip[] {
  const source = clips.find((clip) => clip.sceneId === sceneId);
  if (!source || source.trimIn === undefined || source.trimOut === undefined) return normalizeTimeline(clips);
  const splitAt = Number(at);
  if (!Number.isFinite(splitAt) || splitAt <= source.trimIn + 0.25 || splitAt >= source.trimOut - 0.25) return normalizeTimeline(clips);
  const first = { ...source, trimOut: splitAt };
  const second = { ...source, sceneId: `${source.sceneId}-part-2`, trimIn: splitAt, trimOut: source.trimOut, order: source.order + 1 };
  return normalizeTimeline([...clips.filter((clip) => clip !== source), first, second]);
}

export function createTimelineHistory(initial: TimelineClip[]): TimelineHistory {
  const snapshots = [normalizeTimeline(initial)];
  let cursor = 0;
  const copy = (value: TimelineClip[]) => value.map((clip) => ({ ...clip }));
  return {
    get state() { return copy(snapshots[cursor]); },
    commit(next) { snapshots.splice(cursor + 1); snapshots.push(normalizeTimeline(copy(next))); cursor = snapshots.length - 1; return copy(snapshots[cursor]); },
    undo() { if (cursor > 0) cursor -= 1; return copy(snapshots[cursor]); },
    redo() { if (cursor < snapshots.length - 1) cursor += 1; return copy(snapshots[cursor]); },
    get canUndo() { return cursor > 0; },
    get canRedo() { return cursor < snapshots.length - 1; },
  };
}
