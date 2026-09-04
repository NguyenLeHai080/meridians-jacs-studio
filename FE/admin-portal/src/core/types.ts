export type LicenseStatus = "active" | "blocked" | "expired" | "revoked";

export type License = {
  id: string;
  key_hint: string;
  customer_name: string;
  customer_contact: string;
  hwid: string;
  status: LicenseStatus;
  expires_at?: string | null;
  max_jobs_per_day: number;
  premium_ai: boolean;
  logo_url?: string | null;
  notes?: string | null;
  created_at: string;
  last_seen_at?: string | null;
  last_app_version?: string | null;
  last_platform?: string | null;
  last_ip?: string | null;
};

export type BillingTransaction = {
  id: string;
  license_id?: string | null;
  customer_name: string;
  plan_name?: string;
  plan_type?: string;
  amount: number;
  currency?: string;
  payment_method: string;
  transaction_type: string;
  reference_code?: string | null;
  notes?: string | null;
  created_at: string;
  actor?: string;
  created_by?: string;
};

export type BillingSummary = {
  total_revenue: number;
  this_month_revenue: number;
  total_deposits?: number;
  total_refunds?: number;
  net_revenue?: number;
  total_transactions: number;
  revenue_by_plan: Record<string, number>;
  revenue_by_method: Record<string, number>;
};

export type BankConfig = {
  bank_name: string;
  bank_bin: string;
  account_number: string;
  account_name: string;
  qr_template: string;
  custom_qr_url?: string | null;
  sepay_api_key?: string;
  plans_pricing: Record<string, number>;
  updated_at?: string | null;
};

export type RenewQrInfo = {
  license_key: string;
  customer_name?: string | null;
  current_expires_at?: string | null;
  plan_type: string;
  plan_name: string;
  amount: number;
  duration_days: number;
  bank_name: string;
  bank_bin: string;
  account_number: string;
  account_name: string;
  transfer_content: string;
  qr_url: string;
};

export type ClientSession = {
  license_id: string;
  customer_name: string;
  customer_contact?: string;
  key_hint: string;
  hwid: string;
  last_platform?: string | null;
  last_app_version?: string | null;
  last_ip?: string | null;
  last_seen_at?: string | null;
  is_online: boolean;
  status?: string;
};

export type Provider = {
  id: string;
  name: string;
  provider_type: "openai" | "gemini" | "custom" | string;
  base_url: string;
  model: string;
  tts_model?: string | null;
  masked_key?: string;
  api_key?: string;
  capabilities: string[];
  is_enabled?: boolean;
  enabled?: boolean;
};

export type TelemetryLog = {
  id: string;
  severity: "info" | "warning" | "error" | "fatal";
  event_name: string;
  fingerprint?: string;
  message: string;
  app_version: string;
  details?: Record<string, unknown>;
  created_at?: string;
};

export type AuditLog = {
  id: string;
  action: string;
  actor: string;
  license_id?: string;
  customer?: string;
  created_at: string;
  [key: string]: unknown;
};

export type MenuLockItem = {
  locked: boolean;
  title: string;
  message: string;
};

export type ToolConfig = {
  studio_brand_name: string;
  tool_slogan: string;
  custom_logo_url: string;
  support_contact: string;
  menu_locks: Record<string, MenuLockItem>;
};

export type Release = {
  id: string;
  version: string;
  platform: "windows" | "macos" | string;
  channel: "stable" | "beta" | string;
  download_url: string;
  sha512: string;
  release_notes: string;
  force_update: boolean;
  signature?: string;
  status: "draft" | "published" | string;
  rollout_percent?: number;
  min_app_version?: string;
  created_at?: string;
};

export type SystemSettings = {
  app_name: string;
  default_days_valid: number;
  default_max_jobs: number;
  telemetry_enabled: boolean;
  auto_backup: boolean;
  notification_email: string;
  studio_brand_name: string;
  custom_logo_url: string;
};

export type SystemInfo = {
  app_name: string;
  version: string;
  environment: string;
  python_version: string;
  platform: string;
  store_backend: string;
  telemetry_enabled: boolean;
  total_licenses: number;
  total_transactions: number;
  total_providers: number;
  total_telemetry_events: number;
  timestamp: string;
};

export type LegalTerms = {
  title: string;
  disclaimer: string;
  ai_usage: string;
  license_rights: string;
  dispute_resolution: string;
  updated_at?: string;
};

export type AdminMenuKey =
  | "overview"
  | "licenses"
  | "sessions"
  | "billing"
  | "plans"
  | "renewals"
  | "providers"
  | "telemetry"
  | "releases"
  | "terms"
  | "tool_branding"
  | "settings";
