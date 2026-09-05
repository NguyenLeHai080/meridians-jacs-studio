function formatFrameTime(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(safe / 60).toString().padStart(2, "0");
  const remainder = Math.floor(safe % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}

/** Keep visual evidence tied to its source timestamp in every provider format. */
function frameTimeline(images) {
  return images.map((image, index) => `Frame ${index + 1}: ${formatFrameTime(image.timestampSeconds)} (${Number(image.timestampSeconds || 0).toFixed(1)}s)`).join("; ");
}

function hasTimestampedTranscript(value) {
  return /\[\d{2}:\d{2}(?::\d{2})?-\d{2}:\d{2}(?::\d{2})?\]/.test(String(value || ""));
}

function parseTimestamp(value, fallback = 0) {
  const parts = String(value || "").split(":").map(Number);
  if (!String(value || "").trim() || parts.some((part) => !Number.isFinite(part))) return fallback;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || fallback;
}

/** Convert the gateway's timestamped text into stable transcript segments. */
function parseTimestampedTranscript(value) {
  if (Array.isArray(value)) {
    return value.map((segment) => ({
      start: Math.max(0, Number(segment?.start || 0)),
      end: Math.max(0, Number(segment?.end || segment?.start || 0)),
      text: String(segment?.text || "").trim(),
      speaker: segment?.speaker ? String(segment.speaker).slice(0, 80) : undefined,
      confidence: Number.isFinite(Number(segment?.confidence)) ? Number(segment.confidence) : undefined,
      words: Array.isArray(segment?.words) ? segment.words.map((word) => ({ start: Math.max(0, Number(word?.start || 0)), end: Math.max(0, Number(word?.end || word?.start || 0)), text: String(word?.text || word?.word || "").trim(), confidence: Number.isFinite(Number(word?.confidence)) ? Number(word.confidence) : undefined })).filter((word) => word.text) : undefined,
    })).filter((segment) => segment.text && segment.end >= segment.start);
  }
  const text = String(value || "");
  const matches = [...text.matchAll(/\[(\d{2}:\d{2}(?::\d{2})?)-(\d{2}:\d{2}(?::\d{2})?)\]\s*([^[]+)/g)];
  if (!matches.length) return text.trim() ? [{ start: 0, end: 0, text: text.trim() }] : [];
  return matches.map((match) => ({ start: parseTimestamp(match[1]), end: parseTimestamp(match[2]), text: match[3].replace(/\s+/g, " ").trim() })).filter((segment) => segment.text);
}

function tokenize(value) {
  return new Set(String(value || "").toLocaleLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").split(/[^\p{L}\p{N}]+/u).filter((token) => token.length > 2));
}

function overlapScore(left, right) {
  const a = tokenize(left);
  const b = tokenize(right);
  if (!a.size || !b.size) return 0;
  let common = 0;
  a.forEach((token) => { if (b.has(token)) common += 1; });
  return common / Math.max(1, Math.sqrt(a.size * b.size));
}

function resolveSeconds(value, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const str = String(value || "").trim();
  if (!str) return fallback;
  if (/^\d+(?:\.\d+)?$/.test(str)) return Number(str);
  const parts = str.split(":").map(Number);
  if (!parts.length || parts.some((p) => !Number.isFinite(p))) return fallback;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || fallback;
}

function splitNarrationByScene(text, scenes) {
  const source = String(text || "").replace(/\s+/g, " ").trim();
  if (!source || !scenes.length) return [];
  const sentences = source.match(/[^.!?…。！？]+[.!?…。！？]?/gu)?.map((item) => item.trim()).filter(Boolean) || [source];
  const totalDuration = Math.max(0.25, scenes.reduce((sum, scene) => {
    const start = resolveSeconds(scene.sourceTimeStart ?? scene.sourceStart ?? scene.start, 0);
    const end = resolveSeconds(scene.sourceTimeEnd ?? scene.sourceEnd ?? scene.end, start + 0.25);
    return sum + Math.max(0.25, end - start);
  }, 0));
  const result = [];
  let sentenceIndex = 0;
  let elapsed = 0;
  scenes.forEach((scene, index) => {
    const start = resolveSeconds(scene.sourceTimeStart ?? scene.sourceStart ?? scene.start, 0);
    const end = resolveSeconds(scene.sourceTimeEnd ?? scene.sourceEnd ?? scene.end, start + 0.25);
    const duration = Math.max(0.25, end - start);
    elapsed += duration;
    const remainingScenes = scenes.length - index - 1;
    const target = Math.round(sentences.length * elapsed / totalDuration);
    const endIndex = index === scenes.length - 1
      ? sentences.length
      : Math.max(sentenceIndex + 1, Math.min(sentences.length - remainingScenes, target));
    result.push(sentences.slice(sentenceIndex, endIndex).join(" ").trim());
    sentenceIndex = endIndex;
  });
  return result;
}

/**
 * A few OpenAI-compatible gateways return a valid continuous `voice_script`
 * but omit `voiceover` within each scene. Split only that already-localized
 * script so scene fan-out can render every clip without reading a raw source
 * transcript or repeating the full script in each output.
 */
function restoreSceneVoiceovers(scenes, result) {
  if (!scenes.length || scenes.every((scene) => String(scene.voiceover || "").trim())) return scenes;
  const parts = splitNarrationByScene(result?.voiceScript || result?.translatedTranscript, scenes);
  if (!parts.length) return scenes;
  return scenes.map((scene, index) => ({
    ...scene,
    // Preserve a provider's explicit per-scene translation/voiceover. Only
    // synthesize the missing cue from the continuous contextual script.
    voiceover: String(scene.voiceover || "").trim() || parts[index] || String(scene.translation || "").trim() || undefined,
  }));
}

/**
 * Match every narration segment against all source scenes. This is intentionally
 * deterministic (and offline) so a customer gets a reviewable mapping even
 * when embeddings are unavailable; a later provider matcher can replace the
 * score without changing the contract.
 */
function buildSceneMatches(scenes = [], suppliedVoiceSegments = []) {
  let voiceCursor = 0;
  const voiceSegments = [];
  const sceneMatches = [];
  scenes.forEach((scene, index) => {
    const sceneId = String(scene.id || `scene-${index + 1}`);
    const text = String(scene.voiceover || scene.translation || scene.detail || scene.title || "").replace(/\s+/g, " ").trim();
    if (!text) return;
    const duration = Math.max(0.25, text.split(/\s+/).length / 2.8);
    const voiceStart = Number(voiceCursor.toFixed(3));
    const voiceEnd = Number((voiceCursor + duration).toFixed(3));
    voiceCursor = voiceEnd;
    const sourceStart = resolveSeconds(scene.sourceTimeStart ?? scene.sourceStart ?? scene.start, 0);
    const sourceEnd = resolveSeconds(scene.sourceTimeEnd ?? scene.sourceEnd ?? scene.end, sourceStart + 0.25);
    const voiceId = suppliedVoiceSegments[index]?.id || `voice-${index + 1}`;
    const supplied = suppliedVoiceSegments[index];
    voiceSegments.push({ id: voiceId, sceneId, text, start: voiceStart, end: voiceEnd, audioStart: Number.isFinite(Number(supplied?.audioStart)) ? Number(supplied.audioStart) : voiceStart, audioEnd: Number.isFinite(Number(supplied?.audioEnd)) ? Number(supplied.audioEnd) : voiceEnd, words: Array.isArray(supplied?.words) ? supplied.words : undefined, status: supplied?.status || "ready" });
    const ranked = scenes.map((candidate, candidateIndex) => {
      const candidateText = [candidate.title, candidate.detail, candidate.translation, candidate.voiceover, ...(candidate.keywords || [])].join(" ");
      const lexical = overlapScore(text, candidateText);
      const temporal = candidateIndex === index ? 0.25 : Math.max(0, 0.12 - Math.abs(candidateIndex - index) * 0.02);
      return { candidate, candidateIndex, score: Math.min(1, lexical * 0.75 + temporal) };
    }).sort((left, right) => right.score - left.score);
    const best = ranked[0] || { candidate: scene, candidateIndex: index, score: 0 };
    const candidateStart = resolveSeconds(best.candidate.sourceTimeStart ?? best.candidate.sourceStart ?? best.candidate.start, 0);
    const candidateEnd = resolveSeconds(best.candidate.sourceTimeEnd ?? best.candidate.sourceEnd ?? best.candidate.end, candidateStart + 0.25);
    const score = Math.max(0.35, Number(best.score.toFixed(3)));
    const sameScene = best.candidateIndex === index;
    const reason = sameScene ? "Từ khóa và mốc thời gian khớp với scene nguồn" : "Khớp từ khóa/ngữ nghĩa với scene nguồn khác thứ tự";
    const sourceClips = ranked.slice(0, 2).filter((item) => item.score >= Math.max(0.35, best.score - 0.12)).map((item) => {
      const cStart = resolveSeconds(item.candidate.sourceTimeStart ?? item.candidate.sourceStart ?? item.candidate.start, 0);
      const cEnd = resolveSeconds(item.candidate.sourceTimeEnd ?? item.candidate.sourceEnd ?? item.candidate.end, cStart + 0.25);
      return {
        sceneId: String(item.candidate.id || `scene-${item.candidateIndex + 1}`),
        sourceStart: cStart,
        sourceEnd: cEnd,
        score: Number(Math.max(0, Math.min(1, item.score)).toFixed(3))
      };
    });
    sceneMatches.push({ voiceSegmentId: voiceId, sceneId: String(best.candidate.id || `scene-${best.candidateIndex + 1}`), sourceStart: candidateStart, sourceEnd: Math.max(candidateStart + 0.25, candidateEnd), sourceClips, voiceStart, voiceEnd, matchScore: score, reason, fallbackReason: score < 0.6 ? "Không đủ tín hiệu từ khóa; cần người dùng duyệt cảnh" : undefined, needsReview: score < 0.6 || !sameScene });
  });
  return { voiceSegments, sceneMatches };
}

function enrichAnalysis(result, transcript) {
  const rawScenes = (result?.scenes || []).map((scene, index) => ({ ...scene, id: scene.id || `scene-${index + 1}` }));
  const scenes = restoreSceneVoiceovers(rawScenes, result);
  const transcriptSegments = parseTimestampedTranscript(result?.transcriptSegments || transcript);
  const topics = scenes.map((scene) => scene.title).filter(Boolean).slice(0, 12);
  const hookCandidates = scenes.filter((scene, index) => index === 0 || /(hook|highlight|cao trào|đỉnh|mở đầu)/i.test(`${scene.title} ${scene.detail}`)).map((scene) => ({ sceneId: scene.id, start: scene.start, end: scene.end, reason: "Scene đầu hoặc được đánh dấu nổi bật" }));
  const safetyNotes = transcriptSegments.length && transcriptSegments[0].start === 0 ? [] : ["Transcript chưa có đầy đủ mốc thời gian; cần review lời kể trước khi render."];
  const links = buildSceneMatches(scenes, result?.voiceSegments);
  const first = scenes[0];
  const middle = scenes[Math.floor(scenes.length / 2)] || first;
  const last = scenes[scenes.length - 1] || first;
  const storyPlan = result?.storyPlan || {
    hook: first ? String(first.voiceover || first.translation || first.detail || first.title) : "Mở đầu gây chú ý",
    setup: first ? String(first.detail || first.title) : "Giới thiệu bối cảnh",
    buildUp: middle ? String(middle.voiceover || middle.translation || middle.detail || middle.title) : "Dẫn dắt nội dung chính",
    climax: last ? String(last.voiceover || last.translation || last.detail || last.title) : "Cao trào hoặc kết luận",
    cta: "Mời người xem theo dõi phần tiếp theo.",
    targetDurationSeconds: links.voiceSegments.at(-1)?.end,
    status: "draft",
    version: 1,
  };
  return { ...result, scenes, transcriptSegments, topics, hookCandidates, safetyNotes, storyPlan, voiceSegments: links.voiceSegments, sceneMatches: links.sceneMatches };
}

module.exports = { formatFrameTime, frameTimeline, hasTimestampedTranscript, parseTimestampedTranscript, buildSceneMatches, splitNarrationByScene, restoreSceneVoiceovers, enrichAnalysis };
