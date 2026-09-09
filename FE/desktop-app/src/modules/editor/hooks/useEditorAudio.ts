import { useCallback, useEffect, useRef, useState } from "react";
import type { Job } from "../../../core/types";
import { getRuntime } from "../../../core/runtime";
import { playAudioStream, stopGlobalAudio } from "../../../core/audio-player";
import { VOICE_PACKS } from "../../../core/voice-packs";
import { stripSceneMetadata } from "../utils/editorTime";

export interface UseEditorAudioParams {
  sourceJob?: Job;
  muted: boolean;
  trackMutes: Record<string, boolean>;
  originalAudioVolume: number;
  speedVal: number;
  playing: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  stemAudioRef: React.RefObject<HTMLAudioElement | null>;
  defaultVoiceForLang: (lang?: string, gender?: string) => string;
}

export function useEditorAudio({
  sourceJob,
  muted,
  trackMutes,
  originalAudioVolume,
  speedVal,
  playing,
  videoRef,
  stemAudioRef,
  defaultVoiceForLang,
}: UseEditorAudioParams) {
  // Volume and voice configuration state
  const [bgmVolume, setBgmVolume] = useState(50);
  const [voiceVolume, setVoiceVolume] = useState(100);
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [selectedBgm, setSelectedBgm] = useState<string>("mus-1");
  const [selectedVoice, setSelectedVoice] = useState<string>("vi-namminh");
  const [speakingSceneId, setSpeakingSceneId] = useState<string | null>(null);

  // Vocal / Stem Isolation states
  const [removeOriginalBgm, setRemoveOriginalBgm] = useState(false);
  const [isolatedStemPath, setIsolatedStemPath] = useState<string | null>(null);
  const [isIsolatingStem, setIsIsolatingStem] = useState<boolean>(false);
  const [stemProgress, setStemProgress] = useState<number>(0);
  const [stemStage, setStemStage] = useState<string>("");

  // Web Audio Context & Equalizer Nodes
  const audioCtxRef = useRef<AudioContext | null>(null);
  const hpFilterRef = useRef<BiquadFilterNode | null>(null);
  const lpFilterRef = useRef<BiquadFilterNode | null>(null);
  const peakFilterRef = useRef<BiquadFilterNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  // Listen to Electron stem isolation progress
  useEffect(() => {
    const unsub = getRuntime().onIsolateVocalsProgress?.((data) => {
      if (typeof data?.progress === "number") {
        setStemProgress(data.progress);
        if (data.stage) setStemStage(data.stage);
      }
    });
    return () => {
      unsub?.();
    };
  }, []);

  // Sync isolated stem path from sourceJob
  useEffect(() => {
    if ((sourceJob as any)?.isolatedVocalsPath) {
      setIsolatedStemPath((sourceJob as any).isolatedVocalsPath);
    }
    if (sourceJob?.removeOriginalBgm || sourceJob?.isolateVocals) {
      setRemoveOriginalBgm(true);
    }
  }, [(sourceJob as any)?.isolatedVocalsPath, sourceJob?.removeOriginalBgm, sourceJob?.isolateVocals]);

  // Audio equalizer effect on video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (!audioCtxRef.current) {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
          const ctx = new AudioContextClass();
          const source = ctx.createMediaElementSource(video);
          const hp = ctx.createBiquadFilter();
          hp.type = "highpass";
          hp.frequency.value = 20;

          const lp = ctx.createBiquadFilter();
          lp.type = "lowpass";
          lp.frequency.value = 20000;

          const peak = ctx.createBiquadFilter();
          peak.type = "peaking";
          peak.frequency.value = 1200;
          peak.Q.value = 1.5;
          peak.gain.value = 0;

          const gain = ctx.createGain();
          gain.gain.value = 1;

          source.connect(hp);
          hp.connect(lp);
          lp.connect(peak);
          peak.connect(gain);
          gain.connect(ctx.destination);

          audioCtxRef.current = ctx;
          hpFilterRef.current = hp;
          lpFilterRef.current = lp;
          peakFilterRef.current = peak;
          gainNodeRef.current = gain;
        }
      }
    } catch {
      // Element might already be connected or not supported
    }

    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume().catch(() => {});
    }

    const isOrigMuted = muted || Boolean(trackMutes.originalAudio) || originalAudioVolume === 0;
    const vol = isOrigMuted ? 0 : Math.max(0, Math.min(1, originalAudioVolume / 100));

    if (removeOriginalBgm && isolatedStemPath) {
      if (gainNodeRef.current) {
        gainNodeRef.current.gain.value = 0;
      }
      video.muted = true;
      if (stemAudioRef.current) {
        stemAudioRef.current.volume = isOrigMuted ? 0 : vol;
      }
    } else {
      if (gainNodeRef.current) {
        gainNodeRef.current.gain.value = vol;
      } else {
        video.muted = isOrigMuted;
        video.volume = vol;
      }
      if (stemAudioRef.current) {
        stemAudioRef.current.volume = 0;
      }
    }

    if (hpFilterRef.current && lpFilterRef.current && peakFilterRef.current) {
      if (removeOriginalBgm) {
        // Deep Vocal, Siren & SFX Isolation
        hpFilterRef.current.frequency.value = 140;
        lpFilterRef.current.frequency.value = 6000;
        peakFilterRef.current.frequency.value = 1200;
        peakFilterRef.current.gain.value = 6.0;
      } else {
        // Bypass to original flat sound
        hpFilterRef.current.frequency.value = 20;
        lpFilterRef.current.frequency.value = 20000;
        peakFilterRef.current.gain.value = 0;
      }
    }
  }, [muted, trackMutes.originalAudio, originalAudioVolume, removeOriginalBgm, isolatedStemPath, videoRef, stemAudioRef]);

  // Synchronize AI isolated stem audio track with video playback
  useEffect(() => {
    const stemAudio = stemAudioRef.current;
    if (!stemAudio || !removeOriginalBgm || !isolatedStemPath) {
      if (stemAudio) {
        stemAudio.pause();
      }
      return;
    }
    if (playing) {
      if (videoRef.current) {
        if (Math.abs(stemAudio.currentTime - videoRef.current.currentTime) > 0.08) {
          stemAudio.currentTime = videoRef.current.currentTime;
        }
      }
      stemAudio.playbackRate = speedVal || 1.0;
      stemAudio.play().catch(() => {});
    } else {
      stemAudio.pause();
    }
  }, [playing, removeOriginalBgm, isolatedStemPath, speedVal, videoRef, stemAudioRef]);

  // Play scene TTS audio
  const playSceneAudio = useCallback(
    async (text?: string, scId?: string, offsetSeconds: number = 0) => {
      const rawClean = stripSceneMetadata(text);
      if (!rawClean || typeof window === "undefined") return;
      stopSceneAudio();
      if (scId) setSpeakingSceneId(scId);

      const voiceToUse =
        selectedVoice ||
        sourceJob?.narratorVoice ||
        defaultVoiceForLang(sourceJob?.languages?.[0], sourceJob?.narratorGender);
      const voiceObj = VOICE_PACKS.find((v) => v.id.toLowerCase() === voiceToUse.toLowerCase());
      const langToUse = voiceObj?.language || sourceJob?.languages?.[0] || "vi";
      const genderToUse = voiceObj?.gender || sourceJob?.narratorGender || "male";
      const rateToUse = voiceSpeed || 1.0;

      try {
        const speechUrl = await getRuntime().synthesizeSpeech?.(
          rawClean,
          langToUse,
          genderToUse,
          voiceToUse,
          rateToUse
        );

        if (speechUrl) {
          await playAudioStream(
            speechUrl,
            () => setSpeakingSceneId(null),
            () => setSpeakingSceneId(null),
            rateToUse,
            offsetSeconds
          );
          return;
        }
      } catch {
        // fallback to Web Speech API
      }

      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        try {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(rawClean);
          utterance.lang = langToUse === "vi" ? "vi-VN" : langToUse === "en" ? "en-US" : langToUse;
          utterance.rate = rateToUse;
          utterance.onend = () => setSpeakingSceneId(null);
          utterance.onerror = () => setSpeakingSceneId(null);
          window.speechSynthesis.speak(utterance);
          return;
        } catch {}
      }

      setSpeakingSceneId(null);
    },
    [selectedVoice, sourceJob, voiceSpeed, defaultVoiceForLang]
  );

  const stopSceneAudio = useCallback(() => {
    stopGlobalAudio();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    setSpeakingSceneId(null);
  }, []);

  return {
    bgmVolume,
    setBgmVolume,
    voiceVolume,
    setVoiceVolume,
    voiceSpeed,
    setVoiceSpeed,
    selectedBgm,
    setSelectedBgm,
    selectedVoice,
    setSelectedVoice,
    speakingSceneId,
    setSpeakingSceneId,
    removeOriginalBgm,
    setRemoveOriginalBgm,
    isolatedStemPath,
    setIsolatedStemPath,
    isIsolatingStem,
    setIsIsolatingStem,
    stemProgress,
    stemStage,
    playSceneAudio,
    stopSceneAudio,
  };
}
