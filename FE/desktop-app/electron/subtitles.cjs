function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function stripSceneMetadata(text) {
  if (!text) return "";
  let cleaned = String(text)
    .replace(/\[\s*(?:Phân cảnh|Cảnh|Scene|Segment|Part)\s*\d+[^\]]*\]/gi, "")
    .replace(/(?:^|\n)\s*(?:Phân cảnh|Cảnh|Scene|Segment|Part)\s*\d+[:\-\.]\s*/gi, " ")
    .replace(/\[\d{1,2}[:.]\d{2}(?:[:.]\d{2})?\s*-\s*\d{1,2}[:.]\d{2}(?:[:.]\d{2})?\]/g, "")
    .replace(/\(\d{1,2}[:.]\d{2}(?:[:.]\d{2})?\s*-\s*\d{1,2}[:.]\d{2}(?:[:.]\d{2})?\)/g, "")
    .replace(/(?:tại|ở|từ)\s+mốc\s+\d{1,2}[:.]\d{2}(?:\s*đến\s+\d{1,2}[:.]\d{2})?,?\s*/gi, "")
    .replace(/(?:vào\s+)?lúc\s+\d{1,2}[:.]\d{2},?\s*/gi, "")
    .replace(/\(\d{1,2}[:.]\d{2}\)/g, "")
    .replace(/\[[^\]]{1,60}\]/g, "")
    .replace(/[{}[\]"\\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) {
    cleaned = String(text).replace(/[{}[\]"\\]/g, "").trim();
  }
  return cleaned;
}

/** Formats text into at most 2 balanced lines separated by newline */
function wrapToLines(text, maxLineChars = 36) {
  const normalized = String(text || "").replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  const hasCjk = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/u.test(normalized);
  const effectiveMax = hasCjk ? Math.min(maxLineChars, 18) : maxLineChars;
  if (normalized.length <= effectiveMax) return normalized;

  if (hasCjk) {
    const midpoint = Math.ceil(normalized.length / 2);
    return `${normalized.slice(0, midpoint)}\n${normalized.slice(midpoint)}`;
  }

  const words = normalized.split(" ").filter(Boolean);
  if (words.length <= 2) return normalized;

  const targetHalf = Math.floor(normalized.length / 2);
  let bestIdx = -1;
  let bestDiff = Infinity;
  let accLength = 0;

  for (let i = 0; i < words.length - 1; i++) {
    accLength += words[i].length + (i > 0 ? 1 : 0);
    const diff = Math.abs(accLength - targetHalf);
    const hasPunctuation = /[.,;!?]$/.test(words[i]);
    const score = diff - (hasPunctuation ? 4 : 0);
    if (score < bestDiff) {
      bestDiff = score;
      bestIdx = i;
    }
  }

  if (bestIdx >= 0) {
    const line1 = words.slice(0, bestIdx + 1).join(" ");
    const line2 = words.slice(bestIdx + 1).join(" ");
    return `${line1}\n${line2}`;
  }

  return normalized;
}

/** Split long narrative into readable cues of at most 2 lines each (~50-60 chars) */
function splitText(text, maxCueChars = 50, maxLineChars = 34) {
  const clean = stripSceneMetadata(text);
  const normalized = String(clean || "").replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const hasCjk = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/u.test(normalized);
  const effectiveCueChars = hasCjk ? Math.min(maxCueChars, 24) : maxCueChars;
  const effectiveLineChars = hasCjk ? Math.min(maxLineChars, 18) : maxLineChars;

  if (normalized.length <= effectiveCueChars) {
    return [wrapToLines(normalized, effectiveLineChars)];
  }

  // Split by sentence/clause boundaries if present
  const sentences = normalized.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [normalized];
  const cues = [];

  for (const s of sentences) {
    const st = s.trim();
    if (!st) continue;
    if (st.length <= effectiveCueChars) {
      cues.push(wrapToLines(st, effectiveLineChars));
    } else if (hasCjk && !st.includes(" ")) {
      const characters = [...st];
      const numChunks = Math.max(2, Math.ceil(characters.length / effectiveCueChars));
      const chunkSize = Math.ceil(characters.length / numChunks);
      for (let i = 0; i < characters.length; i += chunkSize) {
        cues.push(wrapToLines(characters.slice(i, i + chunkSize).join(""), effectiveLineChars));
      }
    } else {
      const words = st.split(" ").filter(Boolean);
      const numChunks = Math.max(2, Math.ceil(st.length / effectiveCueChars));
      const targetChunkLen = Math.floor(st.length / numChunks);
      let currentWords = [];
      let currentLen = 0;
      let chunksMade = 0;

      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        currentWords.push(word);
        currentLen += (currentWords.length > 1 ? 1 : 0) + word.length;

        const remainingWords = words.length - (i + 1);
        const remainingChunks = numChunks - chunksMade - 1;

        if (chunksMade < numChunks - 1 && currentLen >= targetChunkLen && remainingWords >= remainingChunks) {
          cues.push(wrapToLines(currentWords.join(" "), effectiveLineChars));
          currentWords = [];
          currentLen = 0;
          chunksMade++;
        }
      }
      if (currentWords.length > 0) {
        cues.push(wrapToLines(currentWords.join(" "), effectiveLineChars));
      }
    }
  }

  return cues.length > 0 ? cues : [wrapToLines(normalized, effectiveLineChars)];
}

function normalizeSubtitleSegments(segments, duration, fallbackText) {
  const total = Math.max(0.25, Number(duration) || 0.25);
  const source = Array.isArray(segments) ? segments : [];
  const raw = source.map((segment) => ({
    start: clamp(segment?.start, 0, total),
    end: Number(segment?.end),
    text: stripSceneMetadata(segment?.text),
  })).filter((segment) => segment.text).sort((left, right) => left.start - right.start);

  const normalized = raw.map((segment, index) => {
    const nextStart = raw[index + 1]?.start;
    const explicitEnd = Number.isFinite(segment.end) && segment.end > segment.start ? segment.end : undefined;
    const inferredEnd = nextStart && nextStart > segment.start ? nextStart : total;
    return { ...segment, end: clamp(Math.max(segment.start + 0.01, explicitEnd || inferredEnd), 0, total) };
  }).filter((segment) => segment.end > segment.start + 0.01);

  if (normalized.length) return normalized;
  const text = stripSceneMetadata(fallbackText);
  return text ? [{ start: 0, end: total, text }] : [];
}

/** Build readable, UTF-8 SRT cues with auto-line-wrap and frame-accurate timing. */
function buildCaptionCues(segments, duration, fallbackText) {
  const source = normalizeSubtitleSegments(segments, duration, fallbackText);
  const total = Math.max(0.25, Number(duration) || 0.25);
  const cues = [];

  for (const segment of source) {
    const chunks = splitText(segment.text);
    const count = Math.max(1, chunks.length);
    const span = Math.max(0.1, segment.end - segment.start);
    const weights = chunks.map((text) => Math.max(1, [...text.replace(/\n/g, "")].length));
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let cursor = segment.start;

    chunks.forEach((text, index) => {
      const isLast = index === chunks.length - 1;
      const rawEnd = isLast ? segment.end : cursor + (span * weights[index]) / totalWeight;
      // Subtract 40ms lead-out on final cue of segment so it doesn't bleed into next scene frame
      const end = isLast && segment.end < total
        ? Math.max(cursor + 0.1, rawEnd - 0.04)
        : rawEnd;
      cues.push({ start: cursor, end, text });
      cursor = rawEnd;
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

module.exports = { buildCaptionCues, buildSrt, normalizeSubtitleSegments, splitText, stripSceneMetadata, wrapToLines };
