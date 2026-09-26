import { useCallback, useEffect, useRef, useState } from "react";
import type { Job } from "../../../core/types";
import type { EditorScene } from "../editor.types";
import { getRuntime } from "../../../core/runtime";
import { playAudioStream, stopGlobalAudio, getAudioStreamDuration, preloadAudioBuffer } from "../../../core/audio-player";
import { VOICE_PACKS } from "../../../core/voice-packs";
import { stripSceneMetadata, fileUrl } from "../utils/editorTime";

export interface UseEditorAudioParams {
  sourceJob?: Job;
  editorScenes?: EditorScene[];
  muted: boolean;
  trackMutes: Record<string, boolean>;
  originalAudioVolume: number;
  speedVal: number;
  playing: boolean;
  playheadSeconds?: number;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  stemAudioRef: React.RefObject<HTMLAudioElement | null>;
  bgmAudioRef?: React.RefObject<HTMLAudioElement | null>;
  defaultVoiceForLang: (lang?: string, gender?: string) => string;
}

export function useEditorAudio({
  sourceJob,
  editorScenes,
  muted,
  trackMutes,
  originalAudioVolume,
  speedVal,
  playing,
  playheadSeconds = 0,
  videoRef,
  stemAudioRef,
  bgmAudioRef,
  defaultVoiceForLang,
}: UseEditorAudioParams) {
  // Volume and voice configuration state
  const [bgmVolume, setBgmVolume] = useState(40);
  const [voiceVolume, setVoiceVolume] = useState(100);
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [selectedBgm, setSelectedBgm] = useState<string>("mus-1");
  const [customBgmPath, setCustomBgmPath] = useState<string | null>(null);
  const [customBgmTitle, setCustomBgmTitle] = useState<string | null>(null);
  const [bgmAudioPath, setBgmAudioPath] = useState<string | null>(null);
  const [bgmAudioDataUrl, setBgmAudioDataUrl] = useState<string | null>(null);
  const [previewingSoundId, setPreviewingSoundId] = useState<string | null>(null);

  const [selectedVoice, setSelectedVoice] = useState<string>("vi-namminh");
  const [speakingSceneId, setSpeakingSceneId] = useState<string | null>(null);
  const [isAudioSynthesizing, setIsAudioSynthesizing] = useState(false);
  const isAudioSynthesizingRef = useRef(false);
  const [sceneAudioDurations, setSceneAudioDurations] = useState<Record<string, number>>({});
  const measuredDurationsRef = useRef<Record<string, number>>({});
  const sceneAudioUrlMap = useRef<Map<string, string>>(new Map());

  // Vocal / Stem Isolation states
  const [removeOriginalBgm, setRemoveOriginalBgm] = useState(false);
  const [isolatedStemPath, setIsolatedStemPath] = useState<string | null>(null);
  const [isIsolatingStem, setIsIsolatingStem] = useState<boolean>(false);
  const [stemProgress, setStemProgress] = useState<number>(0);
  const [stemStage, setStemStage] = useState<string>("");

  // Stop all audio and elements on unmount
  useEffect(() => {
    return () => {
      stopGlobalAudio();
      if (bgmAudioRef?.current) {
        try {
          bgmAudioRef.current.pause();
          bgmAudioRef.current.currentTime = 0;
        } catch {}
      }
      if (stemAudioRef?.current) {
        try {
          stemAudioRef.current.pause();
          stemAudioRef.current.currentTime = 0;
        } catch {}
      }
    };
  }, [bgmAudioRef, stemAudioRef]);

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

  // Load preset or custom BGM path and dataUrl
  useEffect(() => {
    let cancelled = false;

    if (selectedBgm === "custom") {
      if (customBgmPath) {
        setBgmAudioPath(customBgmPath);
        void (async () => {
          try {
            const dataUrl = await getRuntime().readAudioFile?.(customBgmPath);
            if (!cancelled && dataUrl) {
              setBgmAudioDataUrl(dataUrl);
            }
          } catch {}
        })();
      }
      return;
    }

    if (selectedBgm && selectedBgm !== "none") {
      void (async () => {
        try {
          const res = await getRuntime().getPresetAudio?.("bgm", selectedBgm);
          if (!cancelled && res) {
            setBgmAudioPath(res.path);
            if (res.dataUrl) {
              setBgmAudioDataUrl(res.dataUrl);
            }
          }
        } catch {}
      })();
    } else {
      setBgmAudioPath(null);
      setBgmAudioDataUrl(null);
    }

    return () => {
      cancelled = true;
    };
  }, [selectedBgm, customBgmPath]);

  // Direct Hardware-Accelerated Video Audio & Stem Audio Control (No CORS Hijack)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const isOrigMuted = muted || Boolean(trackMutes.originalAudio) || originalAudioVolume === 0;
    const vol = isOrigMuted ? 0 : Math.max(0, Math.min(1, originalAudioVolume / 100));

    if (removeOriginalBgm && isolatedStemPath) {
      // Mute original video element and let isolated stem audio play
      video.muted = true;
      video.volume = 0;
      if (stemAudioRef.current) {
        stemAudioRef.current.muted = isOrigMuted;
        stemAudioRef.current.volume = vol;
      }
    } else {
      // Standard video original audio playback directly via native HTML5
      video.muted = isOrigMuted;
      video.volume = vol;
      if (stemAudioRef.current) {
        stemAudioRef.current.muted = true;
        stemAudioRef.current.volume = 0;
      }
    }
  }, [muted, trackMutes.originalAudio, originalAudioVolume, removeOriginalBgm, isolatedStemPath, videoRef, stemAudioRef]);

  // Synchronize AI isolated stem audio track with video playback
  useEffect(() => {
    const stemAudio = stemAudioRef.current;
    if (!stemAudio || !removeOriginalBgm || !isolatedStemPath) {
      if (stemAudio && !stemAudio.paused) {
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

  // Synchronize BGM Audio element with Timeline
  useEffect(() => {
    const bgmAudio = bgmAudioRef?.current;
    if (!bgmAudio) return;

    if (!bgmAudioPath || selectedBgm === "none") {
      if (!bgmAudio.paused) bgmAudio.pause();
      return;
    }

    const targetUrl = bgmAudioDataUrl || fileUrl(bgmAudioPath);
    if (targetUrl && bgmAudio.src !== targetUrl) {
      bgmAudio.src = targetUrl;
      bgmAudio.load();
    }

    const isBgmMuted = muted || Boolean(trackMutes.bgm) || bgmVolume === 0;
    const bVol = isBgmMuted ? 0 : Math.max(0, Math.min(1, bgmVolume / 100));
    bgmAudio.volume = bVol;
    bgmAudio.muted = isBgmMuted;
    bgmAudio.playbackRate = speedVal || 1.0;

    if (playing) {
      void bgmAudio.play().catch(() => {});
    } else {
      bgmAudio.pause();
    }
  }, [bgmAudioPath, bgmAudioDataUrl, selectedBgm, playing, muted, trackMutes.bgm, bgmVolume, speedVal, bgmAudioRef]);

  // Seek BGM on manual scrub
  useEffect(() => {
    const bgmAudio = bgmAudioRef?.current;
    if (!bgmAudio || !bgmAudio.duration || !playing) return;
    const loopPos = playheadSeconds % bgmAudio.duration;
    if (Math.abs(bgmAudio.currentTime - loopPos) > 0.5) {
      bgmAudio.currentTime = loopPos;
    }
  }, [playheadSeconds, playing, bgmAudioRef]);

  const playingRef = useRef(playing);
  playingRef.current = playing;
  const playbackSessionIdRef = useRef<number>(0);

  // Clear scene audio durations and url cache when voice or speed or job changes
  useEffect(() => {
    measuredDurationsRef.current = {};
    sceneAudioUrlMap.current.clear();
    setSceneAudioDurations({});
  }, [sourceJob?.id, selectedVoice, voiceSpeed]);

  // Content signature so timestamp adjustments don't restart TTS prewarming
  const scenesTextSignature = (editorScenes || [])
    .map((s) => `${s.id}:${s.subtitle || s.voiceover || s.translation || ""}`)
    .join(";;;");

  // Pre-synthesize, decode, and cache audio + measure duration for all scenes in parallel background batches
  useEffect(() => {
    if (!editorScenes || editorScenes.length === 0) return;
    let cancelled = false;

    const prewarm = async () => {
      const voiceToUse =
        selectedVoice ||
        sourceJob?.narratorVoice ||
        defaultVoiceForLang(sourceJob?.languages?.[0], sourceJob?.narratorGender);
      const voiceObj = VOICE_PACKS.find((v) => v.id.toLowerCase() === voiceToUse.toLowerCase());
      const langToUse = voiceObj?.language || sourceJob?.languages?.[0] || "vi";
      const genderToUse = voiceObj?.gender || sourceJob?.narratorGender || "male";
      const rateToUse = voiceSpeed || 1.0;

      const unmeasured = editorScenes.filter((sc) => {
        const rawClean = stripSceneMetadata(sc.subtitle || sc.voiceover || sc.translation || "");
        if (!rawClean) return false;
        const cacheKey = `${voiceToUse}_${rateToUse}_${rawClean}`;
        return !(sceneAudioUrlMap.current.has(cacheKey) && sc.id && measuredDurationsRef.current[sc.id]);
      });

      if (!unmeasured.length) return;

      const batchDurations: Record<string, number> = {};
      const chunkSize = 3;

      for (let i = 0; i < unmeasured.length; i += chunkSize) {
        if (cancelled) break;
        const chunk = unmeasured.slice(i, i + chunkSize);

        await Promise.all(
          chunk.map(async (sc) => {
            if (cancelled) return;
            const rawClean = stripSceneMetadata(sc.subtitle || sc.voiceover || sc.translation || "");
            const cacheKey = `${voiceToUse}_${rateToUse}_${rawClean}`;

            try {
              const speechUrl = await getRuntime().synthesizeSpeech?.(
                rawClean,
                langToUse,
                genderToUse,
                voiceToUse,
                rateToUse
              );

              if (cancelled || !speechUrl) return;
              sceneAudioUrlMap.current.set(cacheKey, speechUrl);
              void preloadAudioBuffer(speechUrl);

              const dur = await getAudioStreamDuration(speechUrl);
              if (!cancelled && dur && dur > 0.1 && sc.id) {
                measuredDurationsRef.current[sc.id] = dur;
                batchDurations[sc.id] = dur;
              }
            } catch {}
          })
        );

        if (!cancelled && Object.keys(batchDurations).length > 0) {
          setSceneAudioDurations((prev) => ({ ...prev, ...batchDurations }));
        }
      }
    };

    const timer = setTimeout(() => {
      void prewarm();
    }, 80);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [scenesTextSignature, selectedVoice, voiceSpeed, sourceJob?.id, defaultVoiceForLang]);

  // Play scene TTS audio with cancellation token & strict text cache
  const playSceneAudio = useCallback(
    async (text?: string, scId?: string, offsetSeconds: number = 0, isExplicitPreview: boolean = false) => {
      const rawClean = stripSceneMetadata(text);
      if (!rawClean || typeof window === "undefined") return;

      // Invalidate any previous or in-flight speech playback
      const playToken = ++playbackSessionIdRef.current;
      stopGlobalAudio();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        try { window.speechSynthesis.cancel(); } catch {}
      }

      // If this is an automated playback tick and the video is paused, abort
      if (!isExplicitPreview && !playingRef.current) {
        setSpeakingSceneId(null);
        return;
      }

      const isVoiceMuted = muted || Boolean(trackMutes.voice) || Boolean(trackMutes.voice1) || voiceVolume === 0;
      if (isVoiceMuted) {
        setSpeakingSceneId(null);
        return;
      }

      if (scId) setSpeakingSceneId(scId);

      const voiceToUse =
        selectedVoice ||
        sourceJob?.narratorVoice ||
        defaultVoiceForLang(sourceJob?.languages?.[0], sourceJob?.narratorGender);
      const voiceObj = VOICE_PACKS.find((v) => v.id.toLowerCase() === voiceToUse.toLowerCase());
      const langToUse = voiceObj?.language || sourceJob?.languages?.[0] || "vi";
      const genderToUse = voiceObj?.gender || sourceJob?.narratorGender || "male";
      const rateToUse = voiceSpeed || 1.0;
      const effectiveVol = Math.max(0, Math.min(200, voiceVolume));
      // Strict content-dependent cache key: never key solely by sceneId
      const cacheKey = `${voiceToUse}_${rateToUse}_${rawClean}`;

      const cachedUrl = sceneAudioUrlMap.current.get(cacheKey) || null;

      try {
        if (!cachedUrl) {
          setIsAudioSynthesizing(true);
          isAudioSynthesizingRef.current = true;
        }

        const speechUrl =
          cachedUrl ||
          (await getRuntime().synthesizeSpeech?.(
            rawClean,
            langToUse,
            genderToUse,
            voiceToUse,
            rateToUse
          ));

        setIsAudioSynthesizing(false);
        isAudioSynthesizingRef.current = false;

        // Abortion check: If paused or playToken changed while synthesizing, discard audio
        if (playToken !== playbackSessionIdRef.current) {
          return;
        }
        if (!isExplicitPreview && !playingRef.current) {
          setSpeakingSceneId(null);
          return;
        }

        if (speechUrl) {
          if (!cachedUrl) {
            sceneAudioUrlMap.current.set(cacheKey, speechUrl);
            void preloadAudioBuffer(speechUrl);
          }

          await playAudioStream(
            speechUrl,
            () => {
              if (playToken === playbackSessionIdRef.current) {
                setSpeakingSceneId(null);
              }
            },
            () => {
              if (playToken === playbackSessionIdRef.current) {
                setSpeakingSceneId(null);
              }
            },
            1.0, // Speech rate is already baked into speechUrl by synthesizeSpeech
            offsetSeconds,
            (dur) => {
              if (scId && dur > 0.1) {
                measuredDurationsRef.current[scId] = dur;
                setSceneAudioDurations((prev) => ({ ...prev, [scId]: dur }));
              }
            },
            effectiveVol
          );
          return;
        }
      } catch {
        setIsAudioSynthesizing(false);
        isAudioSynthesizingRef.current = false;
      }

      if (playToken === playbackSessionIdRef.current) {
        setSpeakingSceneId(null);
      }
    },
    [selectedVoice, sourceJob, voiceSpeed, voiceVolume, muted, trackMutes, defaultVoiceForLang]
  );

  const stopSceneAudio = useCallback(() => {
    playbackSessionIdRef.current++;
    setIsAudioSynthesizing(false);
    isAudioSynthesizingRef.current = false;
    stopGlobalAudio();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    setSpeakingSceneId(null);
  }, []);

  // Trigger Stem / Vocal Isolation
  const triggerIsolateVocals = useCallback(async () => {
    const videoPath = sourceJob?.localPath;
    if (!videoPath || isIsolatingStem) return;

    setIsIsolatingStem(true);
    setStemProgress(5);
    setStemStage("Đang khởi tạo bóc tách sóng âm AI...");

    try {
      const res = await getRuntime().isolateVocals?.(videoPath);
      if (res?.ok && res.path) {
        setIsolatedStemPath(res.path);
        setStemProgress(100);
        setStemStage("✓ Đã bóc tách 100% sạch nhạc nền!");
      } else {
        setStemStage(res?.error || "Không thể bóc tách âm thanh.");
      }
    } catch {
      setStemStage("Lỗi bóc tách sóng âm.");
    } finally {
      setIsIsolatingStem(false);
    }
  }, [sourceJob?.localPath, isIsolatingStem]);

  // Pick Custom BGM File
  const handlePickCustomBgm = useCallback(async () => {
    try {
      const picked = await getRuntime().pickAudio?.();
      if (picked) {
        const parts = picked.replace(/\\/g, "/").split("/");
        const filename = parts[parts.length - 1] || "Nhạc nền tùy chọn";
        setCustomBgmPath(picked);
        setCustomBgmTitle(filename);
        setSelectedBgm("custom");
        setBgmAudioPath(picked);
        try {
          const dataUrl = await getRuntime().readAudioFile?.(picked);
          if (dataUrl) {
            setBgmAudioDataUrl(dataUrl);
          }
        } catch {}
        return { path: picked, title: filename };
      }
    } catch (err) {
      console.error("Pick custom BGM error:", err);
    }
    return null;
  }, []);

  // Play SFX / BGM Preview with Play/Stop toggle and zero-CORS dataUrl support
  const playSfxPreview = useCallback(async (soundId: string) => {
    try {
      if (previewingSoundId === soundId) {
        stopGlobalAudio();
        setPreviewingSoundId(null);
        return;
      }

      setPreviewingSoundId(soundId);

      if (soundId === "custom") {
        let dataUrl = bgmAudioDataUrl;
        if (!dataUrl && customBgmPath) {
          dataUrl = (await getRuntime().readAudioFile?.(customBgmPath)) ?? null;
        }
        if (dataUrl) {
          await playAudioStream(
            dataUrl,
            () => setPreviewingSoundId(null),
            () => setPreviewingSoundId(null),
            1.0,
            0,
            undefined,
            100
          );
        } else if (customBgmPath) {
          const url = fileUrl(customBgmPath);
          if (url) {
            await playAudioStream(
              url,
              () => setPreviewingSoundId(null),
              () => setPreviewingSoundId(null),
              1.0,
              0,
              undefined,
              100
            );
          }
        }
        return;
      }

      const type = soundId.startsWith("mus-") ? "bgm" : "sfx";
      const res = await getRuntime().getPresetAudio?.(type, soundId);
      if (res?.dataUrl) {
        await playAudioStream(
          res.dataUrl,
          () => setPreviewingSoundId(null),
          () => setPreviewingSoundId(null),
          1.0,
          0,
          undefined,
          100
        );
      } else if (res?.path) {
        const url = fileUrl(res.path);
        if (url) {
          await playAudioStream(
            url,
            () => setPreviewingSoundId(null),
            () => setPreviewingSoundId(null),
            1.0,
            0,
            undefined,
            100
          );
        }
      } else {
        setPreviewingSoundId(null);
      }
    } catch (err) {
      console.warn("Play sound preview error:", err);
      setPreviewingSoundId(null);
    }
  }, [previewingSoundId, bgmAudioDataUrl, customBgmPath]);

  return {
    bgmVolume,
    setBgmVolume,
    voiceVolume,
    setVoiceVolume,
    voiceSpeed,
    setVoiceSpeed,
    selectedBgm,
    setSelectedBgm,
    customBgmPath,
    setCustomBgmPath,
    customBgmTitle,
    setCustomBgmTitle,
    bgmAudioPath,
    setBgmAudioPath,
    bgmAudioDataUrl,
    setBgmAudioDataUrl,
    previewingSoundId,
    setPreviewingSoundId,
    handlePickCustomBgm,
    selectedVoice,
    setSelectedVoice,
    speakingSceneId,
    setSpeakingSceneId,
    isAudioSynthesizing,
    sceneAudioDurations,
    setSceneAudioDurations,
    removeOriginalBgm,
    setRemoveOriginalBgm,
    isolatedStemPath,
    setIsolatedStemPath,
    isIsolatingStem,
    setIsIsolatingStem,
    stemProgress,
    stemStage,
    triggerIsolateVocals,
    playSceneAudio,
    stopSceneAudio,
    playSfxPreview,
  };
}
