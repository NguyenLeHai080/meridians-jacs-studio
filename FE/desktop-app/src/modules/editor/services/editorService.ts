import { getRuntime } from "../../../core/runtime";
import type { VideoProbe } from "../../../core/types";

export const editorService = {
  async probeVideo(path: string): Promise<VideoProbe | null> {
    try {
      const runtime = getRuntime();
      return (await runtime.probeVideo?.(path)) || null;
    } catch {
      return null;
    }
  },

  async pickAudio(): Promise<string | null> {
    const runtime = getRuntime();
    return (await runtime.pickAudio?.()) || null;
  },

  async pickImage(): Promise<string | null> {
    const runtime = getRuntime();
    return (await runtime.pickImage?.()) || null;
  },
};
