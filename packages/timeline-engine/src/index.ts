export type TrackKind = "video" | "voice" | "audio" | "subtitle";

export type TimelineClip = {
  id: string;
  track: TrackKind;
  sourceId: string;
  start: number;
  end: number;
  trimIn?: number;
  trimOut?: number;
};

export type TimelineState = { clips: TimelineClip[] };

const clone = (state: TimelineState): TimelineState => ({ clips: state.clips.map((clip) => ({ ...clip })) });

export function normalizeTimeline(state: TimelineState): TimelineState {
  return { clips: state.clips
    .filter((clip) => Number.isFinite(clip.start) && Number.isFinite(clip.end) && clip.end > clip.start)
    .map((clip) => ({ ...clip, start: Math.max(0, clip.start), end: Math.max(clip.start + 0.01, clip.end) }))
    .sort((a, b) => a.start - b.start || a.id.localeCompare(b.id)) };
}

export function trimClip(state: TimelineState, id: string, trimIn: number, trimOut: number): TimelineState {
  return normalizeTimeline({ clips: state.clips.map((clip) => clip.id !== id ? clip : {
    ...clip,
    trimIn: Math.max(0, trimIn),
    trimOut: Math.max(trimIn + 0.01, trimOut),
    start: Math.max(0, trimIn),
    end: Math.max(trimIn + 0.01, trimOut),
  }) });
}

export function splitClip(state: TimelineState, id: string, at: number): TimelineState {
  const clip = state.clips.find((item) => item.id === id);
  if (!clip || at <= clip.start + 0.01 || at >= clip.end - 0.01) return clone(state);
  const left = { ...clip, id: `${clip.id}-a`, end: at, trimOut: at };
  const right = { ...clip, id: `${clip.id}-b`, start: at, trimIn: at };
  return normalizeTimeline({ clips: state.clips.flatMap((item) => item.id === id ? [left, right] : [item]) });
}

export function mergeClips(state: TimelineState, ids: string[]): TimelineState {
  const selected = state.clips.filter((clip) => ids.includes(clip.id)).sort((a, b) => a.start - b.start);
  if (selected.length < 2 || selected.some((clip) => clip.track !== selected[0].track || clip.sourceId !== selected[0].sourceId)) return clone(state);
  const first = selected[0];
  const merged: TimelineClip = { ...first, id: `${first.id}-merged`, start: first.start, end: selected[selected.length - 1].end, trimIn: first.trimIn, trimOut: selected[selected.length - 1].trimOut };
  const selectedIds = new Set(ids);
  return normalizeTimeline({ clips: [...state.clips.filter((clip) => !selectedIds.has(clip.id)), merged] });
}

export function createHistory(initial: TimelineState) {
  const history: TimelineState[] = [clone(initial)];
  let cursor = 0;
  return {
    get state() { return clone(history[cursor]); },
    commit(next: TimelineState) { history.splice(cursor + 1); history.push(clone(next)); cursor = history.length - 1; return clone(history[cursor]); },
    undo() { if (cursor > 0) cursor -= 1; return clone(history[cursor]); },
    redo() { if (cursor < history.length - 1) cursor += 1; return clone(history[cursor]); },
    get canUndo() { return cursor > 0; },
    get canRedo() { return cursor < history.length - 1; },
  };
}
