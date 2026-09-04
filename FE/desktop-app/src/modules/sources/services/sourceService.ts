import { getRuntime } from "../../../core/runtime";
import type { VideoProbe } from "../../../core/types";

export const sourceService = {
  async pickVideo(): Promise<string | null> {
    const runtime = getRuntime();
    return (await runtime.pickVideo?.()) || null;
  },

  async pickVideos(): Promise<string[]> {
    const runtime = getRuntime();
    return (await runtime.pickVideos?.()) || [];
  },

  async probeVideo(path: string): Promise<VideoProbe | null> {
    try {
      const runtime = getRuntime();
      return (await runtime.probeVideo?.(path)) || null;
    } catch {
      return null;
    }
  },

  async revealPath(path: string): Promise<void> {
    const runtime = getRuntime();
    await runtime.revealPath?.(path);
  },
};
