function atempoChain(value) {
  const ratio = Number(value);
  if (!Number.isFinite(ratio) || ratio <= 1.02) return "";
  let remaining = ratio;
  const filters = [];
  while (remaining > 2.0) { filters.push("atempo=2.0"); remaining /= 2; }
  filters.push(`atempo=${Math.max(0.5, Math.min(2, remaining)).toFixed(4)}`);
  return filters.join(",");
}

function buildAudioFilter({ hasOriginalAudio, audioInputLabel = "[0:a]", narrationInputIndex, musicInputIndex, keepOriginalAudio = true, musicVolume = 20, narrationTempo = 1, duckOriginalAudio = false }) {
  const inputs = [];
  const srcAudio = String(audioInputLabel || "[0:a]").startsWith("[") ? String(audioInputLabel || "[0:a]") : `[${audioInputLabel}]`;
  if (keepOriginalAudio && hasOriginalAudio) inputs.push({ label: srcAudio, volume: duckOriginalAudio && Number.isInteger(narrationInputIndex) ? 0.2 : 1 });
  if (Number.isInteger(narrationInputIndex)) inputs.push({ label: `[${narrationInputIndex}:a]`, volume: 1 });
  if (Number.isInteger(musicInputIndex)) inputs.push({ label: `[${musicInputIndex}:a]`, volume: Math.max(0, Math.min(1, Number(musicVolume) / 100)) });
  if (!inputs.length) return null;
  // Avoid an unnecessary filter graph when the original stream is used as-is.
  if (inputs.length === 1 && inputs[0].label === "[0:a]" && inputs[0].volume === 1) return null;
  const normalized = inputs.map((input, index) => {
    const tempo = Number.isInteger(narrationInputIndex) && input.label === `[${narrationInputIndex}:a]` ? atempoChain(narrationTempo) : "";
    return `${input.label}volume=${input.volume}${tempo ? `,${tempo}` : ""}[a${index}]`;
  });
  const mixInputs = inputs.map((_input, index) => `[a${index}]`).join("");
  return `${normalized.join(";")};${mixInputs}amix=inputs=${inputs.length}:duration=longest:dropout_transition=2[aout]`;
}

module.exports = { buildAudioFilter };
