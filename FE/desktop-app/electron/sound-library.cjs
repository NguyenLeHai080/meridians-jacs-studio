const fs = require("fs");
const path = require("path");

function createWavBuffer(sampleRate, durationSec, generateSample) {
  const numChannels = 2;
  const bytesPerSample = 2;
  const totalSamples = Math.floor(sampleRate * durationSec);
  const dataSize = totalSamples * numChannels * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);

  // fmt chunk
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * numChannels * bytesPerSample, 28);
  buffer.writeUInt16LE(numChannels * bytesPerSample, 32);
  buffer.writeUInt16LE(bytesPerSample * 8, 34);

  // data chunk
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  let offset = 44;
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const [left, right] = generateSample(t, i, totalSamples);
    const cl = Math.max(-1, Math.min(1, left));
    const cr = Math.max(-1, Math.min(1, right));
    const intL = cl < 0 ? cl * 32768 : cl * 32767;
    const intR = cr < 0 ? cr * 32768 : cr * 32767;
    buffer.writeInt16LE(Math.round(intL), offset);
    buffer.writeInt16LE(Math.round(intR), offset + 2);
    offset += 4;
  }

  return buffer;
}

// BGM 1: Lo-Fi Chill (Loop 16s)
function generateLofiChill(t) {
  const loopT = t % 16;
  const chordIdx = Math.floor((loopT / 4) % 4);
  const chords = [
    [261.63, 329.63, 392.0, 493.88], // Cmaj7
    [220.0, 261.63, 329.63, 392.0],  // Am7
    [146.83, 174.61, 220.0, 261.63], // Dm7
    [196.0, 246.94, 293.66, 349.23], // G7
  ];
  const notes = chords[chordIdx];
  const chordT = loopT % 4;
  const env = Math.exp(-chordT * 0.9) * 0.28;

  let left = 0;
  let right = 0;
  notes.forEach((freq, idx) => {
    const tone = Math.sin(2 * Math.PI * freq * t) * 0.5 + Math.sin(2 * Math.PI * freq * 2 * t) * 0.12;
    left += tone * env * (0.8 + idx * 0.05);
    right += tone * env * (0.9 - idx * 0.05);
  });

  // Warm sub bass
  const bassFreq = notes[0] / 2;
  const bassEnv = Math.exp(-chordT * 1.2) * 0.35;
  const bass = Math.sin(2 * Math.PI * bassFreq * t) * bassEnv;
  left += bass;
  right += bass;

  // Gentle vinyl texture
  const noise = (Math.random() * 2 - 1) * 0.008;
  left += noise;
  right += noise;

  return [left * 0.65, right * 0.65];
}

// BGM 2: Suspense Thriller (Loop 16s)
function generateSuspense(t) {
  const loopT = t % 16;
  // Low D minor drone
  const drone1 = Math.sin(2 * Math.PI * 73.42 * t) * 0.3; // D2
  const drone2 = Math.sin(2 * Math.PI * 110.0 * t) * 0.18; // A2
  const detune = Math.sin(2 * Math.PI * 73.8 * t) * 0.15;

  // Tension pulse every 1 second
  const pulseT = loopT % 1.0;
  const pulseEnv = Math.exp(-pulseT * 6.0) * 0.22;
  const pulse = Math.sin(2 * Math.PI * 146.83 * t) * pulseEnv; // D3

  // Eerie swell
  const swell = (Math.sin(2 * Math.PI * (loopT / 16)) * 0.5 + 0.5) * 0.15;
  const highTone = Math.sin(2 * Math.PI * 440.0 * t) * swell;

  const left = drone1 + detune + pulse * 0.9 + highTone * 0.4;
  const right = drone1 + drone2 + pulse * 1.1 + highTone * 0.6;
  return [left * 0.6, right * 0.6];
}

// BGM 3: Epic Action (Loop 16s)
function generateEpicAction(t) {
  const loopT = t % 16;
  // Rhythmic ostinato pulse (4 beats per second = 120 bpm, 16th notes)
  const beatT = (loopT * 4) % 1.0;
  const hitEnv = Math.exp(-beatT * 10.0) * 0.35;
  const bassHit = Math.sin(2 * Math.PI * 55.0 * t) * hitEnv; // A1

  // Orchestral swell (chord progression: Am - F - C - G)
  const chordIdx = Math.floor((loopT / 4) % 4);
  const chords = [
    [220.0, 261.63, 329.63], // Am
    [174.61, 220.0, 261.63], // F
    [261.63, 329.63, 392.0], // C
    [196.0, 246.94, 293.66], // G
  ];
  const chordNotes = chords[chordIdx];
  let chordTone = 0;
  chordNotes.forEach((f) => {
    chordTone += Math.sin(2 * Math.PI * f * t) * 0.12;
  });

  const left = bassHit * 1.1 + chordTone * 0.8;
  const right = bassHit * 0.9 + chordTone * 1.0;
  return [left * 0.7, right * 0.7];
}

// BGM 4: Happy Upbeat (Loop 16s)
function generateHappyUpbeat(t) {
  const loopT = t % 16;
  const chordIdx = Math.floor((loopT / 4) % 4);
  // C - G - Am - F
  const rootFreqs = [261.63, 196.0, 220.0, 174.61];
  const root = rootFreqs[chordIdx];

  // Bright bouncy marimba arpeggio (8 notes per bar)
  const arpStep = Math.floor((loopT * 4) % 4);
  const scale = [1, 1.25, 1.5, 2.0];
  const arpFreq = root * scale[arpStep];
  const arpT = (loopT * 4) % 1.0;
  const arpEnv = Math.exp(-arpT * 7.0) * 0.28;
  const arpTone = Math.sin(2 * Math.PI * arpFreq * t) * arpEnv;

  // Bouncy acoustic bass
  const bassT = (loopT * 2) % 1.0;
  const bassEnv = Math.exp(-bassT * 5.0) * 0.3;
  const bass = Math.sin(2 * Math.PI * (root / 2) * t) * bassEnv;

  const left = arpTone * 0.85 + bass * 0.7;
  const right = arpTone * 0.75 + bass * 0.7;
  return [left * 0.65, right * 0.65];
}

// SFX 1: Whoosh Chuyển Cảnh (0.6s)
function generateWhoosh(t) {
  const p = t / 0.6;
  const noise = Math.random() * 2 - 1;
  const freq = 150 + Math.sin(p * Math.PI) * 1200;
  const env = Math.sin(p * Math.PI) * 0.65;
  const tone = Math.sin(2 * Math.PI * freq * t) * 0.3;
  const s = (noise * 0.7 + tone) * env;
  return [s * (1 - p * 0.5), s * (0.5 + p * 0.5)];
}

// SFX 2: Cinematic Boom (1.5s)
function generateBoom(t) {
  const p = t / 1.5;
  const env = Math.exp(-p * 3.5) * 0.8;
  const freq = 120 * Math.exp(-p * 4.0) + 35;
  const bass = Math.sin(2 * Math.PI * freq * t);
  const click = t < 0.03 ? (Math.random() * 2 - 1) * 0.6 : 0;
  const s = (bass * 0.85 + click) * env;
  return [s, s];
}

// SFX 3: Pop Notification (0.4s)
function generatePop(t) {
  const p = t / 0.4;
  const env1 = Math.exp(-p * 12.0) * 0.5;
  const env2 = p > 0.08 ? Math.exp(-(p - 0.08) * 10.0) * 0.6 : 0;
  const tone1 = Math.sin(2 * Math.PI * 880 * t) * env1;
  const tone2 = Math.sin(2 * Math.PI * 1318.5 * t) * env2;
  const s = tone1 + tone2;
  return [s * 0.9, s * 1.1];
}

// SFX 4: Camera Shutter (0.25s)
function generateShutter(t) {
  const click1 = t < 0.04 ? (Math.random() * 2 - 1) * 0.7 * Math.exp(-t * 80) : 0;
  const click2 = (t > 0.07 && t < 0.12) ? (Math.random() * 2 - 1) * 0.8 * Math.exp(-(t - 0.07) * 90) : 0;
  const s = click1 + click2;
  return [s, s];
}

const PRESET_BGM_GENERATORS = {
  "mus-1": { duration: 16, fn: generateLofiChill, title: "Hoà Cùng Yêu Dấu Nỗi Buồn (Lo-Fi Chill)" },
  "mus-2": { duration: 16, fn: generateSuspense, title: "Kịch Tính Phá Án & Điều Tra (Suspense Thriller)" },
  "mus-3": { duration: 16, fn: generateEpicAction, title: "Hành Động Khởi Chiến (Epic Cinematic)" },
  "mus-4": { duration: 16, fn: generateHappyUpbeat, title: "Vlog Tươi Vui Năng Động (Happy Upbeat)" },
};

const PRESET_SFX_GENERATORS = {
  "sfx-1": { duration: 0.6, fn: generateWhoosh, title: "SFX Whoosh Chuyển Cảnh" },
  "sfx-2": { duration: 1.5, fn: generateBoom, title: "SFX Cinematic Impact Boom" },
  "sfx-3": { duration: 0.4, fn: generatePop, title: "SFX Pop Notification" },
  "sfx-4": { duration: 0.25, fn: generateShutter, title: "SFX Camera Shutter Snap" },
};

function ensureSoundLibrary(userDataDir) {
  const libDir = path.join(userDataDir, "sound_library");
  if (!fs.existsSync(libDir)) {
    fs.mkdirSync(libDir, { recursive: true });
  }

  // Generate BGM files
  for (const [id, config] of Object.entries(PRESET_BGM_GENERATORS)) {
    const targetFile = path.join(libDir, `${id}.wav`);
    if (!fs.existsSync(targetFile) || fs.statSync(targetFile).size < 1000) {
      try {
        const buf = createWavBuffer(44100, config.duration, config.fn);
        fs.writeFileSync(targetFile, buf);
      } catch (err) {
        console.error(`Failed to generate preset BGM ${id}:`, err);
      }
    }
  }

  // Generate SFX files
  for (const [id, config] of Object.entries(PRESET_SFX_GENERATORS)) {
    const targetFile = path.join(libDir, `${id}.wav`);
    if (!fs.existsSync(targetFile) || fs.statSync(targetFile).size < 100) {
      try {
        const buf = createWavBuffer(44100, config.duration, config.fn);
        fs.writeFileSync(targetFile, buf);
      } catch (err) {
        console.error(`Failed to generate preset SFX ${id}:`, err);
      }
    }
  }

  return libDir;
}

function getPresetAudioPath(type, id, userDataDir) {
  const libDir = ensureSoundLibrary(userDataDir);
  const targetFile = path.join(libDir, `${id}.wav`);
  if (fs.existsSync(targetFile)) {
    return targetFile;
  }
  return null;
}

module.exports = {
  ensureSoundLibrary,
  getPresetAudioPath,
  PRESET_BGM_GENERATORS,
  PRESET_SFX_GENERATORS,
};
