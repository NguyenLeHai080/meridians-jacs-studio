export type ApiError = { code: string; message: string; details?: Record<string, unknown>; request_id?: string };
export type ApiResponse<T> = { data: T; meta?: Record<string, unknown> };

export type LicenseStatus = "active" | "blocked" | "expired" | "revoked";
export type ExecutionMode = "local-cpu" | "local-gpu" | "cloud" | "hybrid";
export type JobKind = "analysis" | "tts" | "render";
export type ProviderType = "openai" | "gemini" | "anthropic" | "openai-compatible" | "custom";

export type LicenseSummary = {
  id: string;
  key_hint: string;
  customer_name: string;
  customer_contact: string;
  hwid: string;
  expires_at?: string | null;
  status: LicenseStatus;
  max_jobs_per_day: number;
  premium_ai: boolean;
};

export type ProviderSummary = {
  id: string;
  name: string;
  provider_type: ProviderType;
  base_url: string;
  model: string;
  capabilities: string[];
  enabled: boolean;
  has_api_key: boolean;
  masked_key: string;
};

export type JobSummary = {
  id: string;
  kind: JobKind;
  execution_mode: ExecutionMode;
  provider_id?: string | null;
  project_id: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  progress: number;
  engine?: string;
};
