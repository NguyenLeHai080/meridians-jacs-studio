import { apiRequest } from "../../../core/api";
import { getToken } from "../../../core/session";
import type { LegalTerms } from "../../../core/types";

export const termsService = {
  async getTerms(): Promise<LegalTerms> {
    return apiRequest<LegalTerms>("/api/v1/system/terms", { method: "GET" }, getToken() || undefined);
  },

  async updateTerms(terms: LegalTerms): Promise<LegalTerms> {
    return apiRequest<LegalTerms>("/api/v1/system/terms", {
      method: "PUT",
      body: JSON.stringify(terms),
    }, getToken() || undefined);
  },
};
