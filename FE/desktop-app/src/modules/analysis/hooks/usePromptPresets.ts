import { useState } from "react";
import { PRESET_PROMPTS, type PresetPrompt } from "../constants/prompts";

export function usePromptPresets(showToast?: (msg: string) => void) {
  const [selectedPresetId, setSelectedPresetId] = useState<string>(() => {
    const saved = localStorage.getItem("jacs_selected_preset_id");
    if (!saved || saved === "master_cops_storytelling") {
      return PRESET_PROMPTS[0].id;
    }
    return saved;
  });

  const [defaultPrompt, setDefaultPrompt] = useState<string>(() => {
    const savedPresetId = localStorage.getItem("jacs_selected_preset_id");
    if (savedPresetId && savedPresetId !== "__custom__" && savedPresetId !== "master_cops_storytelling") {
      const found = PRESET_PROMPTS.find((p) => p.id === savedPresetId);
      if (found) return found.prompt;
    }
    const savedCustom = localStorage.getItem("jacs_default_prompt");
    if (savedCustom && !savedCustom.includes("Cảnh sát tuần tra")) return savedCustom;
    return PRESET_PROMPTS[0].prompt;
  });

  const handleSelectPreset = (preset: PresetPrompt) => {
    setSelectedPresetId(preset.id);
    setDefaultPrompt(preset.prompt);
    try {
      localStorage.setItem("jacs_selected_preset_id", preset.id);
      localStorage.setItem("jacs_default_prompt", preset.prompt);
    } catch {}
    showToast?.(`✓ Đã chọn phong cách: ${preset.title}`);
  };

  return {
    selectedPresetId,
    setSelectedPresetId,
    defaultPrompt,
    setDefaultPrompt,
    handleSelectPreset,
  };
}
