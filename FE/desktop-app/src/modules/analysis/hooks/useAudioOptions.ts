import { useState } from "react";

export function useAudioOptions() {
  const [narratorEnabled, setNarratorEnabled] = useState<boolean>(() => {
    return localStorage.getItem("jacs_narrator_enabled") !== "false";
  });
  const [removeOriginalBgm, setRemoveOriginalBgm] = useState<boolean>(() => {
    return localStorage.getItem("jacs_remove_original_bgm") === "true";
  });
  const [interweaveAudio, setInterweaveAudio] = useState<boolean>(() => {
    return localStorage.getItem("jacs_interweave_audio") !== "false";
  });
  const [emphasizeHook, setEmphasizeHook] = useState<boolean>(() => {
    return localStorage.getItem("jacs_emphasize_hook") !== "false";
  });
  const [autoDucking, setAutoDucking] = useState<boolean>(() => {
    return localStorage.getItem("jacs_auto_ducking") !== "false";
  });

  const updateNarratorEnabled = (val: boolean) => {
    setNarratorEnabled(val);
    try { localStorage.setItem("jacs_narrator_enabled", String(val)); } catch {}
  };

  const updateRemoveOriginalBgm = (val: boolean) => {
    setRemoveOriginalBgm(val);
    try { localStorage.setItem("jacs_remove_original_bgm", String(val)); } catch {}
  };

  const updateInterweaveAudio = (val: boolean) => {
    setInterweaveAudio(val);
    try { localStorage.setItem("jacs_interweave_audio", String(val)); } catch {}
  };

  const updateEmphasizeHook = (val: boolean) => {
    setEmphasizeHook(val);
    try { localStorage.setItem("jacs_emphasize_hook", String(val)); } catch {}
  };

  const updateAutoDucking = (val: boolean) => {
    setAutoDucking(val);
    try { localStorage.setItem("jacs_auto_ducking", String(val)); } catch {}
  };

  return {
    narratorEnabled,
    updateNarratorEnabled,
    removeOriginalBgm,
    updateRemoveOriginalBgm,
    interweaveAudio,
    updateInterweaveAudio,
    emphasizeHook,
    updateEmphasizeHook,
    autoDucking,
    updateAutoDucking,
  };
}
