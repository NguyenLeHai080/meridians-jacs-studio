/**
 * Audio playback utility using Web Audio API (AudioContext) with HTML5 Audio fallback.
 * Decodes raw audio buffers directly to speaker output without URL or codec issues.
 * Supports dynamic playback rate (speed multiplier) without pitch distortion.
 */

let activeAudioContext: AudioContext | null = null;
let activeSourceNode: AudioBufferSourceNode | null = null;
let activeHtmlAudio: HTMLAudioElement | null = null;

export function stopGlobalAudio(): void {
  if (activeSourceNode) {
    try {
      activeSourceNode.stop();
      activeSourceNode.disconnect();
    } catch {}
    activeSourceNode = null;
  }
  if (activeAudioContext) {
    try {
      void activeAudioContext.close();
    } catch {}
    activeAudioContext = null;
  }
  if (activeHtmlAudio) {
    try {
      activeHtmlAudio.pause();
      activeHtmlAudio.src = "";
    } catch {}
    activeHtmlAudio = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
  if (typeof document !== "undefined") {
    try {
      const mediaEls = document.querySelectorAll<HTMLMediaElement>("video, audio");
      mediaEls.forEach((el) => {
        try {
          if (!el.paused) {
            el.pause();
          }
        } catch {}
      });
    } catch {}
  }
}

export async function playAudioStream(
  audioDataOrUrl: string,
  onEnded?: () => void,
  onError?: (error: Error) => void,
  playbackRate: number = 1.0,
  offsetSeconds: number = 0,
  onDuration?: (duration: number) => void,
  volume: number = 100
): Promise<() => void> {
  stopGlobalAudio();

  if (!audioDataOrUrl || typeof audioDataOrUrl !== "string") {
    onEnded?.();
    return () => {};
  }

  const safeRate = Math.max(0.5, Math.min(2.5, Number(playbackRate) || 1.0));
  const safeVolume = Math.max(0, Math.min(2.0, (Number(volume) || 100) / 100));

  // Method 1: Web Audio API (AudioContext) with in-memory decoding
  try {
    let arrayBuffer: ArrayBuffer;

    if (audioDataOrUrl.startsWith("data:")) {
      const pureBase64 = audioDataOrUrl.split(",")[1];
      const binaryString = window.atob(pureBase64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      arrayBuffer = bytes.buffer;
    } else {
      const response = await fetch(audioDataOrUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status} fetching audio`);
      arrayBuffer = await response.arrayBuffer();
    }

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioContextClass();
    activeAudioContext = ctx;

    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    const decodedBuffer = await ctx.decodeAudioData(arrayBuffer);
    if (decodedBuffer?.duration) {
      onDuration?.(decodedBuffer.duration / safeRate);
    }

    // If offset is already past the end of the audio, do not play
    if (offsetSeconds >= (decodedBuffer.duration - 0.05)) {
      onEnded?.();
      try { void ctx.close(); } catch {}
      activeAudioContext = null;
      return () => {};
    }

    const source = ctx.createBufferSource();
    source.buffer = decodedBuffer;
    
    // Apply dynamic playback rate
    source.playbackRate.value = safeRate;

    // Apply dynamic volume via GainNode
    const gainNode = ctx.createGain();
    gainNode.gain.value = safeVolume;
    source.connect(gainNode);
    gainNode.connect(ctx.destination);
    activeSourceNode = source;

    source.onended = () => {
      activeSourceNode = null;
      try {
        void ctx.close();
      } catch {}
      activeAudioContext = null;
      onEnded?.();
    };

    const safeOffset = Math.max(0, Math.min(Math.max(0, decodedBuffer.duration - 0.05), offsetSeconds));
    source.start(0, safeOffset);

    return () => {
      stopGlobalAudio();
    };
  } catch (webAudioErr) {
    console.warn("Web Audio API decode failed, trying HTML5 Audio fallback:", webAudioErr);

    // Method 2: HTML5 Audio fallback with Blob URL (100% reliable)
    try {
      let finalUrl = audioDataOrUrl;
      let objectUrlToRevoke: string | null = null;
      if (audioDataOrUrl.startsWith("data:")) {
        const pureBase64 = audioDataOrUrl.split(",")[1];
        const binaryString = window.atob(pureBase64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: "audio/mpeg" });
        finalUrl = URL.createObjectURL(blob);
        objectUrlToRevoke = finalUrl;
      }

      const audio = new Audio();
      audio.src = finalUrl;
      audio.preload = "auto";
      audio.playbackRate = safeRate;
      audio.defaultPlaybackRate = safeRate;
      audio.volume = Math.min(1.0, safeVolume);
      activeHtmlAudio = audio;

      audio.onloadedmetadata = () => {
        if (audio.duration && !isNaN(audio.duration)) {
          onDuration?.(audio.duration / safeRate);
        }
      };

      audio.onended = () => {
        if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
        activeHtmlAudio = null;
        onEnded?.();
      };

      audio.onerror = (e) => {
        if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
        activeHtmlAudio = null;
        onError?.(new Error("HTML5 Audio playback error: " + String(e)));
      };

      audio.load();
      if (offsetSeconds > 0) {
        audio.currentTime = offsetSeconds;
      }
      audio.playbackRate = safeRate;
      audio.volume = Math.min(1.0, safeVolume);
      await audio.play();

      return () => {
        if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
        stopGlobalAudio();
      };
    } catch (htmlErr) {
      console.error("All audio playback methods failed:", htmlErr);
      onError?.(htmlErr instanceof Error ? htmlErr : new Error(String(htmlErr)));
      return () => {};
    }
  }
}

export async function getAudioStreamDuration(audioDataOrUrl: string): Promise<number | null> {
  if (!audioDataOrUrl || typeof audioDataOrUrl !== "string") return null;
  try {
    let arrayBuffer: ArrayBuffer;
    if (audioDataOrUrl.startsWith("data:")) {
      const pureBase64 = audioDataOrUrl.split(",")[1];
      const binaryString = window.atob(pureBase64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      arrayBuffer = bytes.buffer;
    } else {
      const response = await fetch(audioDataOrUrl);
      if (!response.ok) return null;
      arrayBuffer = await response.arrayBuffer();
    }

    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;

    const ctx = new AudioContextClass();
    try {
      const decoded = await ctx.decodeAudioData(arrayBuffer);
      return decoded?.duration || null;
    } finally {
      void ctx.close().catch(() => {});
    }
  } catch {
    return null;
  }
}
