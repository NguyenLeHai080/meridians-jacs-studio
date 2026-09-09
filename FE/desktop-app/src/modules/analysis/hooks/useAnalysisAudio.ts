import { useState } from "react";
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

  const handlePreviewVoice = (_jobId: string, _sceneId: string, text?: string) => {
    const rawClean = cleanVoiceoverText(text);
    if (!rawClean) return;

    try {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(rawClean);
        utterance.lang = "vi-VN";
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
        showToast?.("🔊 Đang đọc thử lời thoại thuyết minh AI...");
      }
    } catch {
      showToast?.("Không thể phát thử giọng đọc trên thiết bị này.");
    }
  };

  return {
    playingVoiceKey,
    loadingVoiceKey,
    activePlayingSceneIdx,
    setActivePlayingSceneIdx,
    handlePlaySceneVoice,
    handlePreviewVoice,
  };
}
