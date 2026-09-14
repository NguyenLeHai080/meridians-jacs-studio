import type { LegalTerms } from "../../core/types";

export type EulaCategory = "enterprise" | "standard" | "ai_policy" | "security" | "custom";
export type EulaStatus = "active" | "draft" | "archived";
export type EulaStatusFilter = "all" | "active" | "draft" | "archived";

export interface EulaDocument {
  id: string;
  code: string;
  title: string;
  version: string;
  category: EulaCategory;
  status: EulaStatus;
  full_content: string;
  summary?: string;
  legal_basis?: string[];
  requires_hwid_binding: boolean;
  requires_content_disclaimer: boolean;
  created_at: string;
  updated_at: string;
  updated_by: string;
  digital_signature?: string;
}

export interface TermsMetrics {
  total: number;
  active: number;
  draft: number;
  archived: number;
  lastUpdated: string;
}

export type { LegalTerms };
