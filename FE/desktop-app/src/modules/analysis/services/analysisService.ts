import { getRuntime } from "../../../core/runtime";
import type { AnalysisResult, ProviderProfile } from "../../../core/types";

export const analysisService = {
  async getProviders(): Promise<ProviderProfile[]> {
    const runtime = getRuntime();
    return (await runtime.getProviderProfiles?.()) || [];
  },

  async analyzeVideo(
    path: string,
    providerId?: string,
    operationId?: string,
    options?: any
  ): Promise<AnalysisResult> {
    const runtime = getRuntime();
    if (!runtime.analyzeVideo) {
      throw new Error("Tính năng phân tích video chưa được hỗ trợ trên môi trường này.");
    }
    return await runtime.analyzeVideo(path, providerId, operationId, options);
  },

  async cancelAnalysis(operationId: string): Promise<boolean> {
    const runtime = getRuntime();
    return (await runtime.cancelOperation?.(operationId)) || false;
  },
};
