function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function splitText(text, maxChars = 44) {
  const normalized = String(text || "").replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  // CJK captions have no whitespace and generally need a shorter line
  // length than Latin text to remain readable on a portrait preview.
  const hasCjk = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/u.test(normalized);
  const effectiveMaxChars = hasCjk ? Math.min(maxChars, 24) : maxChars;
  const words = normalized.split(" ").filter(Boolean);
  const chunks = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (current && next.length > effectiveMaxChars) {
      chunks.push(current);
      current = word;
    } else current = next;
  }
  if (current) chunks.push(current);

  // CJK scripts can arrive without whitespace. Split those long lines by
  // characters so captions stay readable instead of rendering off-screen.
  return chunks.flatMap((chunk) => {
    if ([...chunk].length <= effectiveMaxChars) return [chunk];
    const characters = [...chunk];
    const pieces = [];
    for (let index = 0; index < characters.length; index += effectiveMaxChars) {
      pieces.push(characters.slice(index, index + effectiveMaxChars).join(""));
    }
    return pieces;
  });
}

function normalizeSubtitleSegments(segments, duration, fallbackText) {
  const total = Math.max(0.25, Number(duration) || 0.25);
  const source = Array.isArray(segments) ? segments : [];
  const raw = source.map((segment) => ({
    start: clamp(segment?.start, 0, total),
    end: Number(segment?.end),
    text: String(segment?.text || "").replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim(),
  })).filter((segment) => segment.text).sort((left, right) => left.start - right.start);
  const normalized = raw.map((segment, index) => {
    const nextStart = raw[index + 1]?.start;
    const explicitEnd = Number.isFinite(segment.end) && segment.end > segment.start ? segment.end : undefined;
    const inferredEnd = nextStart && nextStart > segment.start ? nextStart : total;
    return { ...segment, end: clamp(Math.max(segment.start + 0.01, explicitEnd || inferredEnd), 0, total) };
  }).filter((segment) => segment.end > segment.start + 0.01);
  if (normalized.length) return normalized;
  const text = String(fallbackText || "").replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
  return text ? [{ start: 0, end: total, text }] : [];
}

/** Build readable, UTF-8 SRT cues. Long scene text is split by phrase. */
function buildCaptionCues(segments, duration, fallbackText) {
  const source = normalizeSubtitleSegments(segments, duration, fallbackText);
  const cues = [];
  for (const segment of source) {
    const chunks = splitText(segment.text);
    const count = Math.max(1, chunks.length);
    const span = segment.end - segment.start;
    // Weight each cue by the amount of text it contains. This keeps a short
    // final phrase from staying on screen as long as a full sentence.
    const weights = chunks.map((text) => Math.max(1, [...text].length));
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let cursor = segment.start;
    chunks.forEach((text, index) => {
      const end = index === chunks.length - 1 ? segment.end : cursor + span * weights[index] / totalWeight;
      cues.push({ start: cursor, end, text });
      cursor = end;
    });
  }
  return cues;
}

function buildSrt(segments, duration, fallbackText) {
  const cues = buildCaptionCues(segments, duration, fallbackText);
  const stamp = (seconds) => {
    const ms = Math.max(0, Math.round(Number(seconds || 0) * 1000));
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const secondsPart = Math.floor((ms % 60000) / 1000);
    const rest = ms % 1000;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secondsPart).padStart(2, "0")},${String(rest).padStart(3, "0")}`;
  };
  return cues.map((cue, index) => `${index + 1}\n${stamp(cue.start)} --> ${stamp(cue.end)}\n${cue.text}\n`).join("\n");
}

module.exports = { buildCaptionCues, buildSrt, normalizeSubtitleSegments };
