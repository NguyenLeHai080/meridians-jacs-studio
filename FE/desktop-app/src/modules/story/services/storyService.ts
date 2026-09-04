import { getRuntime } from "../../../core/runtime";
import type { VoiceProfile } from "../../../core/types";

export const storyService = {
  async listVoices(language?: string): Promise<VoiceProfile[]> {
    const runtime = getRuntime();
    return (await runtime.listVoices?.(language)) || [];
  },

  async synthesizeSpeech(
    text: string,
    language?: string,
    gender?: "male" | "female",
    voice?: string
  ): Promise<string | null> {
    const runtime = getRuntime();
    return (await runtime.synthesizeSpeech?.(text, language, gender, voice)) || null;
  },
};
