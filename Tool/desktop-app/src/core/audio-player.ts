/**
 * Audio playback utility using Web Audio API (AudioContext) with HTML5 Audio fallback.
 * Decodes raw audio buffers directly to speaker output without URL or codec issues.
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
}

export async function playAudioStream(
  audioDataOrUrl: string,
  onEnded?: () => void,
  onError?: (error: Error) => void
): Promise<() => void> {
  stopGlobalAudio();

  if (!audioDataOrUrl) {
    onEnded?.();
    return () => {};
  }

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
    const source = ctx.createBufferSource();
    source.buffer = decodedBuffer;
    source.connect(ctx.destination);
    activeSourceNode = source;

    source.onended = () => {
      activeSourceNode = null;
      try {
        void ctx.close();
      } catch {}
      activeAudioContext = null;
      onEnded?.();
    };

    source.start(0);

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
      activeHtmlAudio = audio;

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
