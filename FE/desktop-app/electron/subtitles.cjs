function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function stripSceneMetadata(text) {
  if (!text) return "";
  let cleaned = String(text || "")
    .replace(/\[\s*(?:Phân cảnh|Cảnh|Scene|Segment|Part|Hồi)\s*\d+[^\]]*\]/gi, "")
    .replace(/(?:^|\n)\s*(?:Phân cảnh|Cảnh|Scene|Segment|Part|Hồi)\s*\d+[:\-\.]\s*/gi, " ")
    .replace(/\[\d{1,2}[:.]\d{2}(?:[:.]\d{2})?\s*-\s*\d{1,2}[:.]\d{2}(?:[:.]\d{2})?\]/g, "")
    .replace(/\(\d{1,2}[:.]\d{2}(?:[:.]\d{2})?\s*-\s*\d{1,2}[:.]\d{2}(?:[:.]\d{2})?\)/g, "")
    .replace(/(?:tại|ở|từ)\s+mốc\s+\d{1,2}[:.]\d{2}(?:\s*đến\s+\d{1,2}[:.]\d{2})?,?\s*/gi, "")
    .replace(/(?:vào\s+)?lúc\s+\d{1,2}[:.]\d{2},?\s*/gi, "")
    .replace(/\(\d{1,2}[:.]\d{2}\)/g, "")
    .replace(/\[[^\]]{1,60}\]/g, "")
    .replace(/#\d+\b/g, "")
    .replace(/["'“”«»‘’`\\{}[\]^~*#_<>]/g, "")
    .replace(/\.{2,}/g, ".")
    .replace(/,{2,}/g, ",")
    .replace(/\s+/g, " ")
    .trim();
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

function estimateSpokenDuration(text, speed = 1.0) {
  const clean = stripSceneMetadata(text);
  if (!clean) return 0.5;
  const words = clean.split(/\s+/).filter(Boolean);
  if (!words.length) return 0.5;
  const punct = (clean.match(/[,.?!:;]/g) || []).length;
  // Calibrated for natural Vietnamese speech cadence: ~3.8 words/sec with natural pauses
  const safeSpeed = typeof speed === "number" && speed > 0 ? speed : 1.0;
  return Math.max(0.6, (0.10 + words.length * 0.26 + punct * 0.12) / safeSpeed);
}

function normalizeSubtitleSegments(segments, duration, fallbackText) {
  const total = Math.max(0.25, Number(duration) || 0.25);
  const source = Array.isArray(segments) ? segments : [];
  const raw = source.map((segment) => {
    const res = {
      start: clamp(segment?.start, 0, total),
      end: Number(segment?.end),
      text: stripSceneMetadata(segment?.text),
    };
    const vDur = Number(segment?.voiceDuration || segment?.audioDuration || 0);
    if (vDur > 0) res.voiceDuration = vDur;
    return res;
  }).filter((segment) => segment.text).sort((left, right) => left.start - right.start);

  const normalized = raw.map((segment, index) => {
    const nextStart = raw[index + 1]?.start;
    const explicitEnd = Number.isFinite(segment.end) && segment.end > segment.start ? segment.end : undefined;
    const inferredEnd = nextStart && nextStart > segment.start ? nextStart : total;
    return {
      ...segment,
      end: clamp(Math.max(segment.start + 0.01, explicitEnd || inferredEnd), 0, total),
    };
  }).filter((segment) => segment.end > segment.start + 0.01);

  if (normalized.length) return normalized;
  const text = stripSceneMetadata(fallbackText);
  return text ? [{ start: 0, end: total, text }] : [];
}

/** Split text into natural 4-6 word phrases breaking on punctuation and length */
function splitIntoPhrases(text, maxWords = 6, maxChars = 28) {
  const clean = stripSceneMetadata(text).replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const words = clean.split(" ").filter(Boolean);
  if (words.length <= maxWords && clean.length <= maxChars) {
    return [words];
  }

  const phrases = [];
  let cur = [];
  let curChars = 0;

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    cur.push(w);
    curChars += w.length + (cur.length > 1 ? 1 : 0);
    const hasPunctuation = /[.,!?;:]$/.test(w);
    const remaining = words.length - (i + 1);

    if (
      cur.length >= maxWords ||
      curChars >= maxChars ||
      (hasPunctuation && cur.length >= 3 && remaining >= 2)
    ) {
      phrases.push(cur);
      cur = [];
      curChars = 0;
    }
  }

  if (cur.length > 0) {
    if (phrases.length > 0 && cur.length <= 2 && curChars < 14) {
      phrases[phrases.length - 1] = phrases[phrases.length - 1].concat(cur);
    } else {
      phrases.push(cur);
    }
  }
  return phrases;
}

function getHighlightColor(style) {
  const s = String(style || "").toLowerCase();
  if (s === "neon") return "#00F0FF";
  if (s === "white") return "#38BDF8";
  return "#FFE478";
}

/** Build progressive word-by-word SRT cues synchronized with spoken voice cadence */
function buildWordByWordCues(segments, duration, fallbackText, options = {}) {
  const source = normalizeSubtitleSegments(segments, duration, fallbackText);
  const total = Math.max(0.25, Number(duration) || 0.25);
  const highlightColor = options.highlightColor || getHighlightColor(options.style);
  const speed = typeof options.speed === "number" && options.speed > 0 ? options.speed : 1.0;
  const cues = [];

  for (const segment of source) {
    const segSpan = Math.max(0.1, segment.end - segment.start);
    const hasCjk = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/u.test(segment.text);

    // If CJK text without spaces, fall back to chunked cues
    if (hasCjk && !segment.text.includes(" ")) {
      const chunks = splitText(segment.text);
      const weights = chunks.map((t) => Math.max(1, [...t.replace(/\n/g, "")].length));
      const totalW = weights.reduce((a, b) => a + b, 0);
      let cursor = segment.start;
      chunks.forEach((chunkText, idx) => {
        const isLast = idx === chunks.length - 1;
        const rawEnd = isLast ? segment.end : cursor + (segSpan * weights[idx]) / totalW;
        const end = isLast && segment.end < total ? Math.max(cursor + 0.1, rawEnd - 0.04) : rawEnd;
        cues.push({ start: cursor, end, text: chunkText });
        cursor = rawEnd;
      });
      continue;
    }

    const phrases = splitIntoPhrases(segment.text);
    if (!phrases.length) continue;

    // Calculate actual spoken voice duration:
    // If exact probed duration is provided (from TTS probe), use it!
    // Otherwise estimate based on natural speech cadence calibrated to Edge TTS
    const rawVoiceDur = segment.voiceDuration || segment.audioDuration || estimateSpokenDuration(segment.text, speed);
    const effectiveVoiceSpan = Math.min(segSpan, Math.max(0.6, rawVoiceDur));

    const phraseWeights = phrases.map((p) => Math.max(1, p.join(" ").length));
    const totalPhraseWeight = phraseWeights.reduce((a, b) => a + b, 0);

    let phraseCursor = segment.start;

    for (let pIdx = 0; pIdx < phrases.length; pIdx++) {
      const phraseWords = phrases[pIdx];
      const isLastPhrase = pIdx === phrases.length - 1;

      // Voice speaking duration allocated to this phrase
      const phraseVoiceSpan = (effectiveVoiceSpan * phraseWeights[pIdx]) / totalPhraseWeight;

      const wordWeights = phraseWords.map((w) => {
        let wt = 10;
        if (w.length > 3) wt += (w.length - 3) * 1.2;
        if (/[,:;]/.test(w)) wt += 3;
        if (/[.!?]/.test(w)) wt += 4;
        return wt;
      });
      const totalWordWeight = wordWeights.reduce((a, b) => a + b, 0);

      // Pre-compute raw cumulative boundaries
      const rawBounds = [];
      let acc = 0;
      for (let i = 0; i < phraseWords.length; i++) {
        acc += (phraseVoiceSpan * wordWeights[i]) / totalWordWeight;
        rawBounds.push(acc);
      }

      // 160ms anticipation lead so words reveal right as spoken instead of 1 word late
      const LEAD_OFFSET = 0.16;
      let wordCursor = phraseCursor;

      for (let wIdx = 0; wIdx < phraseWords.length; wIdx++) {
        const isLastWord = wIdx === phraseWords.length - 1;
        const rawEnd = isLastWord
          ? phraseCursor + phraseVoiceSpan
          : Math.max(wordCursor + 0.08, phraseCursor + rawBounds[wIdx] - LEAD_OFFSET);

        // Build progressive reveal with active word highlighted
        const wordsToShow = phraseWords.slice(0, wIdx + 1).map((w, idx) => {
          if (idx === wIdx) {
            return `<font color="${highlightColor}"><b>${w}</b></font>`;
          }
          return w;
        });

        cues.push({
          start: Number(wordCursor.toFixed(3)),
          end: Number(Math.max(wordCursor + 0.06, rawEnd).toFixed(3)),
          text: wordsToShow.join(" "),
        });

        wordCursor = rawEnd;
      }

      // If this is the last phrase and there is trailing scene duration after speech finishes,
      // keep the completed phrase visible on screen until scene end (minus 40ms lead-out)
      if (isLastPhrase && segment.end > (phraseCursor + phraseVoiceSpan + 0.08)) {
        const holdEnd = segment.end < total
          ? Math.max(phraseCursor + phraseVoiceSpan + 0.1, segment.end - 0.04)
          : segment.end;
        cues.push({
          start: Number((phraseCursor + phraseVoiceSpan).toFixed(3)),
          end: Number(holdEnd.toFixed(3)),
          text: phraseWords.join(" "),
        });
      }

      phraseCursor += phraseVoiceSpan;
    }
  }

  return cues;
}

/** Build readable, UTF-8 SRT cues with auto-line-wrap or progressive word-by-word reveal */
function buildCaptionCues(segments, duration, fallbackText, options = {}) {
  if (options && options.wordByWord === true) {
    return buildWordByWordCues(segments, duration, fallbackText, options);
  }

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

function buildSrt(segments, duration, fallbackText, options = {}) {
  const cues = buildCaptionCues(segments, duration, fallbackText, options);
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

module.exports = {
  buildCaptionCues,
  buildSrt,
  buildWordByWordCues,
  estimateSpokenDuration,
  getHighlightColor,
  normalizeSubtitleSegments,
  splitIntoPhrases,
  splitText,
  stripSceneMetadata,
  wrapToLines,
};
