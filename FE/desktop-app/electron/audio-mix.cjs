function atempoChain(value) {
  const ratio = Number(value);
  if (!Number.isFinite(ratio) || ratio <= 1.02) return "";
  let remaining = ratio;
  const filters = [];
  while (remaining > 2.0) { filters.push("atempo=2.0"); remaining /= 2; }
  filters.push(`atempo=${Math.max(0.5, Math.min(2, remaining)).toFixed(4)}`);
  return filters.join(",");
}

function buildAudioFilter({
  hasOriginalAudio,
  audioInputLabel = "[0:a]",
  narrationInputIndex,
  musicInputIndex,
  keepOriginalAudio = true,
  interweaveAudio = true,
  originalAudioVolume,
  musicVolume = 20,
  narrationTempo = 1,
  duckOriginalAudio = false,
  autoDucking = false,
  removeOriginalBgm = false,
  isolateVocals = false,
}) {
  const inputs = [];
  const srcAudio = String(audioInputLabel || "[0:a]").startsWith("[") ? String(audioInputLabel || "[0:a]") : `[${audioInputLabel}]`;
  const bgmFilter = (removeOriginalBgm || isolateVocals)
    ? "pan=stereo|c0=0.5*c0+0.5*c1|c1=0.5*c0+0.5*c1,stereotools=mlev=2.0:slev=0.0:sbal=0:mpan=0,highpass=f=140:poles=2,lowpass=f=6000:poles=2,equalizer=f=200:t=q:w=1.5:g=-10,equalizer=f=1200:t=q:w=1.5:g=6,equalizer=f=2800:t=q:w=1.5:g=4,afftdn=nf=-32:om=o,dynaudnorm=f=150:g=15:p=0.95"
    : "";

  if (keepOriginalAudio && hasOriginalAudio) {
    let origVol = 1;
    if (typeof originalAudioVolume === "number" && !isNaN(originalAudioVolume)) {
      origVol = Math.max(0, Math.min(1, originalAudioVolume / 100));
    } else if ((duckOriginalAudio || autoDucking) && Number.isInteger(narrationInputIndex)) {
      origVol = 0.2;
    }
    inputs.push({ label: srcAudio, volume: origVol, extraFilter: bgmFilter });
  }
  if (Number.isInteger(narrationInputIndex)) inputs.push({ label: `[${narrationInputIndex}:a]`, volume: 1 });
  if (Number.isInteger(musicInputIndex)) {
    const rawMVol = Math.max(0, Math.min(1, Number(musicVolume) / 100));
    const effectiveMVol = autoDucking && Number.isInteger(narrationInputIndex) ? Math.min(rawMVol, 0.15) : rawMVol;
    inputs.push({ label: `[${musicInputIndex}:a]`, volume: effectiveMVol });
  }
  if (!inputs.length) return null;
  // Avoid an unnecessary filter graph when the original stream is used as-is.
  if (inputs.length === 1) {
    const input = inputs[0];
    if ((input.label === "[0:a]" || input.label === "0:a") && input.volume === 1 && !input.extraFilter) {
      return null;
    }
    const tempo = Number.isInteger(narrationInputIndex) && input.label === `[${narrationInputIndex}:a]` ? atempoChain(narrationTempo) : "";
    const filterParts = [];
    if (input.extraFilter) filterParts.push(input.extraFilter);
    if (input.volume !== 1) filterParts.push(`volume=${input.volume}`);
    if (tempo) filterParts.push(tempo);
    const filterStr = filterParts.length ? filterParts.join(",") : "anull";
    return `${input.label}${filterStr}[aout]`;
  }
  const normalized = inputs.map((input, index) => {
    const tempo = Number.isInteger(narrationInputIndex) && input.label === `[${narrationInputIndex}:a]` ? atempoChain(narrationTempo) : "";
    const filterParts = [];
    if (input.extraFilter) filterParts.push(input.extraFilter);
    filterParts.push(`volume=${input.volume}`);
    if (tempo) filterParts.push(tempo);
    return `${input.label}${filterParts.join(",")}[a${index}]`;
  });
  const mixInputs = inputs.map((_input, index) => `[a${index}]`).join("");
  return `${normalized.join(";")};${mixInputs}amix=inputs=${inputs.length}:duration=longest:dropout_transition=2[aout]`;
}

module.exports = { buildAudioFilter };
