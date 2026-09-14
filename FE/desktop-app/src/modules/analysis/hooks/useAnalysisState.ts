import type { Job } from "../../../core/types";
import { popup } from "../../../shared/popup";
import { useVideoFilters } from "./useVideoFilters";
import { useProviderConfig } from "./useProviderConfig";
import { useDurationRules } from "./useDurationRules";
import { usePromptPresets } from "./usePromptPresets";
import { useAudioOptions } from "./useAudioOptions";

export function useAnalysisState(jobs: Job[] = [], initialSource?: Job) {
  const showToast = (msg: string) => {
    if (msg.startsWith("✓") || msg.startsWith("🎉")) {
      popup.success(msg);
    } else if (msg.startsWith("❌")) {
      popup.error(msg, undefined, true);
    } else if (msg.startsWith("⚠️")) {
      popup.warning(msg, undefined, true);
    } else {
      popup.toast(msg, "info");
    }
  };

  const filters = useVideoFilters(jobs, initialSource);
  const providers = useProviderConfig(showToast);
  const duration = useDurationRules(showToast);
  const prompts = usePromptPresets(showToast);
  const audio = useAudioOptions();

  return {
    showToast,
    // Video Filters & Selection
    ...filters,
    // AI Providers & Models
    ...providers,
    // Duration Mode & Mapping Rules
    ...duration,
    // Preset Prompts & Templates
    ...prompts,
    // Audio & Voice Options
    ...audio,
  };
}

export { useVideoFilters, useProviderConfig, useDurationRules, usePromptPresets, useAudioOptions };
