import { getRuntime } from "../../../core/runtime";

export const brandService = {
  async pickLogoImage(): Promise<string | null> {
    const runtime = getRuntime();
    return (await runtime.pickImage?.()) || null;
  },
};
