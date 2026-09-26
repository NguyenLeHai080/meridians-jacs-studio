import { useEffect, useState } from "react";
import { getRuntime } from "../../../core/runtime";
import { playAudioStream, stopGlobalAudio } from "../../../core/audio-player";
import { cleanVoiceoverText } from "../utils/analysisHelpers";

export function useAnalysisAudio(defaultLanguage = "vi", defaultVoiceId = "vi-adam-review", showToast?: (msg: string) => void) {
  const [playingVoiceKey, setPlayingVoiceKey] = useState<string | null>(null);
  const [loadingVoiceKey, setLoadingVoiceKey] = useState<string | null>(null);
  const [activePlayingSceneIdx, setActivePlayingSceneIdx] = useState<number>(0);

  const handlePlaySceneVoice = async (text: string, voiceKey: string, voiceName?: string) => {
    if (playingVoiceKey === voiceKey) {
      stopGlobalAudio();
      setPlayingVoiceKey(null);
      return;
    }

    stopGlobalAudio();
    setLoadingVoiceKey(voiceKey);

    try {
      const speechUrl = await getRuntime().synthesizeSpeech?.(
        text,
        defaultLanguage || "vi",
        "male",
        voiceName || defaultVoiceId
      );
      setLoadingVoiceKey(null);
      if (speechUrl) {
        setPlayingVoiceKey(voiceKey);
        await playAudioStream(
          speechUrl,
          () => setPlayingVoiceKey(null),
          () => setPlayingVoiceKey(null)
        );
      }
    } catch {
      setLoadingVoiceKey(null);
      setPlayingVoiceKey(null);
    }
  };

  const handlePreviewVoice = async (_jobId: string, _sceneId: string, text?: string) => {
    const rawClean = cleanVoiceoverText(text);
    if (!rawClean) return;

    try {
      showToast?.("🔊 Đang nạp giọng đọc AI...");
      const speechUrl = await getRuntime().synthesizeSpeech?.(
        rawClean.slice(0, 300),
        defaultLanguage || "vi",
        "male",
        defaultVoiceId
      );
      if (speechUrl) {
        await playAudioStream(speechUrl);
        return;
      }
    } catch {
      // fallback
    }

    try {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(rawClean.slice(0, 200));
        utterance.lang = defaultLanguage === "vi" ? "vi-VN" : "en-US";
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
      }
    } catch {
      showToast?.("Không thể phát thử giọng đọc trên thiết bị này.");
    }
  };

  useEffect(() => {
    return () => {
      stopGlobalAudio();
    };
  }, []);

  return {
    playingVoiceKey,
    loadingVoiceKey,
    activePlayingSceneIdx,
    setActivePlayingSceneIdx,
    handlePlaySceneVoice,
    handlePreviewVoice,
  };
}
