export interface JobItem {
  id: string;
  client_job_id: string;
  name: string;
  source_name: string;
  kind: "render" | "analysis" | "tts" | string;
  execution_mode: "hybrid" | "cloud" | "local" | string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled" | string;
  progress: number;
  stage: string;
  tokens_used: number;
  credits_used: number;
  duration_seconds: number;
  customer_name: string;
  license_key: string;
  error?: string | null;
  created_at: string;
}

export interface JobMetrics {
  total: number;
  running: number;
  completed: number;
  failed: number;
}

export interface CreateJobInput {
  name: string;
  source_name: string;
  kind: "render" | "analysis" | "tts";
  execution_mode: "hybrid" | "cloud" | "local";
  customer_name?: string;
  license_id?: string;
}
