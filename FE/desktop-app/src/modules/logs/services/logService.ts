import { getRuntime } from "../../../core/runtime";

export const logService = {
  async copyLogText(text: string): Promise<void> {
    const runtime = getRuntime();
    await runtime.copyText?.(text);
  },
};
