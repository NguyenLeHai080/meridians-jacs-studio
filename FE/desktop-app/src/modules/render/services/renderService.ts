import { getRuntime } from "../../../core/runtime";
import type { RenderResult } from "../../../core/types";

export const renderService = {
  async renderVideo(path: string, outputFolder?: string, options?: any, operationId?: string): Promise<RenderResult> {
    const runtime = getRuntime();
    if (!runtime.renderVideo) {
      throw new Error("Trình xuất bản video chưa sẵn sàng.");
    }
    return await runtime.renderVideo(path, outputFolder, options, operationId);
  },

  async pickOutputFolder(): Promise<string | null> {
    const runtime = getRuntime();
    return (await runtime.pickOutputFolder?.()) || null;
  },

  async revealPath(path: string): Promise<void> {
    const runtime = getRuntime();
    await runtime.revealPath?.(path);
  },
};
