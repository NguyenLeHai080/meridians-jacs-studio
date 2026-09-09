import { apiRequest } from "../../../core/api";
import { getToken } from "../../../core/session";
import type { LegalTerms } from "../../../core/types";
import type { EulaDocument } from "../types";

export const termsService = {
  // 1. Get all documents from Backend Database
  async getDocuments(): Promise<EulaDocument[]> {
    const res = await apiRequest<EulaDocument[] | { data: EulaDocument[] }>(
      "/api/v1/system/terms/documents",
      { method: "GET" },
      getToken() || undefined
    );
    if (Array.isArray(res)) return res;
    if (res && "data" in res && Array.isArray((res as any).data)) return (res as any).data;
    return [];
  },

  // 2. Create new document in Database
  async createDocument(doc: Partial<EulaDocument>): Promise<EulaDocument> {
    const res = await apiRequest<EulaDocument | { data: EulaDocument }>(
      "/api/v1/system/terms/documents",
      {
        method: "POST",
        body: JSON.stringify(doc),
      },
      getToken() || undefined
    );
    if (res && "id" in res) return res as EulaDocument;
    if (res && "data" in res) return (res as any).data as EulaDocument;
    return res as EulaDocument;
  },

  // 3. Update existing document in Database
  async updateDocument(id: string, doc: Partial<EulaDocument>): Promise<EulaDocument> {
    const res = await apiRequest<EulaDocument | { data: EulaDocument }>(
      `/api/v1/system/terms/documents/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(doc),
      },
      getToken() || undefined
    );
    if (res && "id" in res) return res as EulaDocument;
    if (res && "data" in res) return (res as any).data as EulaDocument;
    return res as EulaDocument;
  },

  // 4. Delete document from Database
  async deleteDocument(id: string): Promise<boolean> {
    const res = await apiRequest<{ success: boolean } | { data: { success: boolean } }>(
      `/api/v1/system/terms/documents/${id}`,
      {
        method: "DELETE",
      },
      getToken() || undefined
    );
    if (res && "success" in res) return res.success;
    if (res && "data" in res) return (res as any).data?.success ?? false;
    return false;
  },

  // 5. Activate document in Database
  async activateDocument(id: string): Promise<EulaDocument> {
    const res = await apiRequest<EulaDocument | { data: EulaDocument }>(
      `/api/v1/system/terms/documents/${id}/activate`,
      {
        method: "POST",
      },
      getToken() || undefined
    );
    if (res && "id" in res) return res as EulaDocument;
    if (res && "data" in res) return (res as any).data as EulaDocument;
    return res as EulaDocument;
  },

  // 6. Get active system terms
  async getTerms(): Promise<LegalTerms> {
    const res = await apiRequest<LegalTerms | { data: LegalTerms }>(
      "/api/v1/system/terms",
      { method: "GET" },
      getToken() || undefined
    );
    if (res && "title" in res) return res as LegalTerms;
    if (res && "data" in res) return (res as any).data as LegalTerms;
    return res as LegalTerms;
  },

  // 7. Update active system terms
  async updateTerms(terms: LegalTerms): Promise<LegalTerms> {
    const res = await apiRequest<any>(
      "/api/v1/system/terms",
      {
        method: "PUT",
        body: JSON.stringify(terms),
      },
      getToken() || undefined
    );
    return res?.terms || res?.data?.terms || res;
  },
};
