function buildAudioFilter({ hasOriginalAudio, narrationInputIndex, musicInputIndex, keepOriginalAudio = true, musicVolume = 20 }) {
  const inputs = [];
  if (keepOriginalAudio && hasOriginalAudio) inputs.push({ label: "[0:a]", volume: 1 });
  if (Number.isInteger(narrationInputIndex)) inputs.push({ label: `[${narrationInputIndex}:a]`, volume: 1 });
  if (Number.isInteger(musicInputIndex)) inputs.push({ label: `[${musicInputIndex}:a]`, volume: Math.max(0, Math.min(1, Number(musicVolume) / 100)) });
  if (!inputs.length) return null;
  // Avoid an unnecessary filter graph when the original stream is used as-is.
  if (inputs.length === 1 && inputs[0].label === "[0:a]" && inputs[0].volume === 1) return null;
  const normalized = inputs.map((input, index) => `${input.label}volume=${input.volume}[a${index}]`);
  const mixInputs = inputs.map((_input, index) => `[a${index}]`).join("");
  return `${normalized.join(";")};${mixInputs}amix=inputs=${inputs.length}:duration=longest:dropout_transition=2[aout]`;
}

module.exports = { buildAudioFilter };
