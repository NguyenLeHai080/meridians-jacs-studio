import React, { useState, useMemo, useEffect } from "react";
import {
  Search,
  Copy,
  Check,
  RotateCw,
  Sparkles,
  SlidersHorizontal,
  ChevronRight,
  X,
  ExternalLink,
  Zap,
  Activity,
  Gauge,
  Code2,
  Layers,
  ChevronLeft,
  Sliders,
  LayoutGrid,
  List,
} from "lucide-react";
import { showToast } from "../../../core/swal";
import { getToken } from "../../../core/session";
import { apiRequest } from "../../../core/api";
import { ModelDetailDrawer } from "../components/ModelDetailDrawer";

export interface SquareModel {
  id: string;
  name: string;
  provider: "OpenAI" | "Anthropic" | "Google" | "DeepSeek" | "xAI" | "Xiaomi" | "Alibaba" | "Moonshot AI" | "Z.AI";
  provider_code: string;
  description: string;
  group: "codex-pro" | "openai-gpt" | "claude-kire" | "claude-max" | "gemini-pro" | "grok-heavy" | "china-model" | "image-model" | "free-model";
  group_multiplier: string;
  tags: string[];
  price_type: "Giá linh hoạt" | "Giá cố định" | "Theo yêu cầu";
  pricing_unit: "1M" | "call";
  input_price_1m: number;
  output_price_1m: number;
  cache_price_1m: number;
  cache_write_1m?: number;
  cost_per_call?: number;
  endpoint: string;
  uptime: number;
  latency_s: number;
  tps: number;
  context_window: string;
  max_output: string;
  is_featured?: boolean;
}

export const ALL_SQUARE_MODELS: SquareModel[] = [
  // 1. OpenAI
  {
    id: "gpt-5.6-sol",
    name: "gpt-5.6-sol",
    provider: "OpenAI",
    provider_code: "openai",
    description: "Frontier GPT-5.6 model for complex professional work, coding, and agentic workflows",
    group: "codex-pro",
    group_multiplier: "x0.076",
    tags: ["Reasoning", "Tools +3", "Coding"],
    price_type: "Giá linh hoạt",
    pricing_unit: "1M",
    input_price_1m: 9867,
    output_price_1m: 59202,
    cache_price_1m: 2466,
    endpoint: "openai, openai-response +4",
    uptime: 100.0,
    latency_s: 17.58,
    tps: 39.4,
    context_window: "256K",
    max_output: "16K",
    is_featured: true,
  },
  {
    id: "gpt-5.6-terra",
    name: "gpt-5.6-terra",
    provider: "OpenAI",
    provider_code: "openai",
    description: "Balanced GPT-5.6 model for capable, cost-efficient everyday work",
    group: "codex-pro",
    group_multiplier: "x0.076",
    tags: ["Reasoning", "Tools +3"],
    price_type: "Giá linh hoạt",
    pricing_unit: "1M",
    input_price_1m: 4933.5,
    output_price_1m: 29601,
    cache_price_1m: 1233,
    endpoint: "openai, openai-response +4",
    uptime: 96.6,
    latency_s: 18.09,
    tps: 48.0,
    context_window: "128K",
    max_output: "8K",
    is_featured: true,
  },
  {
    id: "gpt-6-astra",
    name: "gpt-6-astra",
    provider: "OpenAI",
    provider_code: "openai",
    description: "GPT-6 Astra is OpenAI's most capable model for complex reasoning, coding, computer use, research, and document creation.",
    group: "codex-pro",
    group_multiplier: "x0.076",
    tags: ["Reasoning", "Tools +3", "Vision"],
    price_type: "Giá linh hoạt",
    pricing_unit: "1M",
    input_price_1m: 19734,
    output_price_1m: 98670,
    cache_price_1m: 4933,
    endpoint: "openai, openai-response +4",
    uptime: 99.8,
    latency_s: 21.52,
    tps: 32.0,
    context_window: "512K",
    max_output: "32K",
    is_featured: true,
  },
  {
    id: "gpt-6-luna",
    name: "gpt-6-luna",
    provider: "OpenAI",
    provider_code: "openai",
    description: "OpenAI's most efficient model for focused, high-volume tasks",
    group: "codex-pro",
    group_multiplier: "x0.076",
    tags: ["Reasoning", "Tools +3", "Speed"],
    price_type: "Giá linh hoạt",
    pricing_unit: "1M",
    input_price_1m: 157.34,
    output_price_1m: 986.7,
    cache_price_1m: 39.3,
    endpoint: "openai, openai-response +4",
    uptime: 100.0,
    latency_s: 23.44,
    tps: 36.9,
    context_window: "128K",
    max_output: "8K",
  },
  {
    id: "gpt-6-sol",
    name: "gpt-6-sol",
    provider: "OpenAI",
    provider_code: "openai",
    description: "OpenAI model for complex coding and agentic workflows",
    group: "codex-pro",
    group_multiplier: "x0.076",
    tags: ["Reasoning", "Tools +3", "Coding"],
    price_type: "Giá linh hoạt",
    pricing_unit: "1M",
    input_price_1m: 3946.8,
    output_price_1m: 19734,
    cache_price_1m: 986,
    endpoint: "openai, openai-response +4",
    uptime: 100.0,
    latency_s: 18.82,
    tps: 36.9,
    context_window: "256K",
    max_output: "16K",
  },
  {
    id: "gpt-4o",
    name: "gpt-4o",
    provider: "OpenAI",
    provider_code: "openai",
    description: "Mô hình đa phương thức hàng đầu của OpenAI xử lý chữ, hình ảnh và âm thanh thời gian thực",
    group: "openai-gpt",
    group_multiplier: "x0.127",
    tags: ["Reasoning", "Tools +3", "Vision"],
    price_type: "Giá linh hoạt",
    pricing_unit: "1M",
    input_price_1m: 6250,
    output_price_1m: 25000,
    cache_price_1m: 1560,
    endpoint: "openai",
    uptime: 99.9,
    latency_s: 0.65,
    tps: 82.4,
    context_window: "128K",
    max_output: "16K",
    is_featured: true,
  },
  {
    id: "gpt-4o-mini",
    name: "gpt-4o-mini",
    provider: "OpenAI",
    provider_code: "openai",
    description: "Phiên bản siêu nhẹ, tốc độ phản hồi cực nhanh, giá siêu tiết kiệm cho tác vụ hàng ngày",
    group: "openai-gpt",
    group_multiplier: "x0.127",
    tags: ["Speed", "Tools +3", "Vision"],
    price_type: "Giá linh hoạt",
    pricing_unit: "1M",
    input_price_1m: 375,
    output_price_1m: 1500,
    cache_price_1m: 95,
    endpoint: "openai",
    uptime: 100.0,
    latency_s: 0.38,
    tps: 110.2,
    context_window: "128K",
    max_output: "16K",
  },
  {
    id: "o1-preview",
    name: "o1-preview",
    provider: "OpenAI",
    provider_code: "openai",
    description: "Mô hình suy luận chuyên sâu thế hệ mới, tối ưu cho bài toán khoa học, toán học và lập trình",
    group: "openai-gpt",
    group_multiplier: "x0.127",
    tags: ["Reasoning", "Coding", "Mathematics"],
    price_type: "Giá linh hoạt",
    pricing_unit: "1M",
    input_price_1m: 37500,
    output_price_1m: 150000,
    cache_price_1m: 9375,
    endpoint: "openai",
    uptime: 99.5,
    latency_s: 4.85,
    tps: 28.5,
    context_window: "128K",
    max_output: "32K",
  },
  {
    id: "gpt-image-2",
    name: "gpt-image-2",
    provider: "OpenAI",
    provider_code: "openai",
    description: "Image model for prompt-driven generation, editing, and visual design workflows",
    group: "image-model",
    group_multiplier: "x0.015",
    tags: ["Files", "Vision +1", "Image Generation"],
    price_type: "Giá cố định",
    pricing_unit: "call",
    input_price_1m: 0,
    output_price_1m: 0,
    cache_price_1m: 0,
    cost_per_call: 312,
    endpoint: "image-generation, openai",
    uptime: 99.3,
    latency_s: 23.86,
    tps: 17.9,
    context_window: "N/A",
    max_output: "1024x1024",
  },
  {
    id: "gpt-image-2.5",
    name: "gpt-image-2.5",
    provider: "OpenAI",
    provider_code: "openai",
    description: "Mô hình sinh ảnh AI độ nét cao, tương thích DALL-E 3 & FLUX",
    group: "image-model",
    group_multiplier: "x0.015",
    tags: ["Vision +1", "Image Generation"],
    price_type: "Giá cố định",
    pricing_unit: "call",
    input_price_1m: 0,
    output_price_1m: 0,
    cache_price_1m: 0,
    cost_per_call: 350,
    endpoint: "image-generation",
    uptime: 100.0,
    latency_s: 41.54,
    tps: 32.2,
    context_window: "N/A",
    max_output: "1792x1024",
  },
  {
    id: "gpt-image-2.5-flare",
    name: "gpt-image-2.5-flare",
    provider: "OpenAI",
    provider_code: "openai",
    description: "Mô hình sinh ảnh thế hệ mới, tối ưu tốc độ và độ chi tiết",
    group: "image-model",
    group_multiplier: "x0.015",
    tags: ["Vision +1", "Image Generation"],
    price_type: "Giá cố định",
    pricing_unit: "call",
    input_price_1m: 0,
    output_price_1m: 0,
    cache_price_1m: 0,
    cost_per_call: 200,
    endpoint: "image-generation",
    uptime: 98.5,
    latency_s: 14.32,
    tps: 22.0,
    context_window: "N/A",
    max_output: "1024x1024",
  },
  {
    id: "gpt-image-2.5-sunburst",
    name: "gpt-image-2.5-sunburst",
    provider: "OpenAI",
    provider_code: "openai",
    description: "Mô hình sáng tạo phong cách điện ảnh với độ bão hòa màu sắc sống động",
    group: "image-model",
    group_multiplier: "x0.015",
    tags: ["Vision +1", "Image Generation"],
    price_type: "Giá cố định",
    pricing_unit: "call",
    input_price_1m: 0,
    output_price_1m: 0,
    cache_price_1m: 0,
    cost_per_call: 300,
    endpoint: "image-generation",
    uptime: 97.2,
    latency_s: 18.25,
    tps: 20.4,
    context_window: "N/A",
    max_output: "1024x1024",
  },

  // 2. xAI (Grok)
  {
    id: "grok-4.6",
    name: "grok-4.6",
    provider: "xAI",
    provider_code: "xai",
    description: "xAI's frontier model for long-running agents, coding, knowledge work, and visual projects",
    group: "grok-heavy",
    group_multiplier: "x0.035",
    tags: ["Reasoning", "Tools +3", "Coding"],
    price_type: "Giá linh hoạt",
    pricing_unit: "1M",
    input_price_1m: 1820,
    output_price_1m: 5460,
    cache_price_1m: 455,
    endpoint: "openai",
    uptime: 99.7,
    latency_s: 23.90,
    tps: 64.7,
    context_window: "128K",
    max_output: "8K",
    is_featured: true,
  },
  {
    id: "grok-4.7",
    name: "grok-4.7",
    provider: "xAI",
    provider_code: "xai",
    description: "xAI's frontier model for long-running agents, coding, knowledge work, and visual projects",
    group: "grok-heavy",
    group_multiplier: "x0.035",
    tags: ["Reasoning", "Tools +3", "Agentic"],
    price_type: "Giá linh hoạt",
    pricing_unit: "1M",
    input_price_1m: 1820,
    output_price_1m: 5460,
    cache_price_1m: 455,
    endpoint: "openai",
    uptime: 99.4,
    latency_s: 14.32,
    tps: 89.0,
    context_window: "128K",
    max_output: "16K",
  },
  {
    id: "grok-imagine-image",
    name: "grok-imagine-image",
    provider: "xAI",
    provider_code: "xai",
    description: "Image model for prompt-driven generation, editing, and visual design workflows",
    group: "image-model",
    group_multiplier: "x0.015",
    tags: ["Files", "Vision +1", "Image Generation"],
    price_type: "Giá cố định",
    pricing_unit: "call",
    input_price_1m: 0,
    output_price_1m: 0,
    cache_price_1m: 0,
    cost_per_call: 350,
    endpoint: "image-generation",
    uptime: 100.0,
    latency_s: 9.47,
    tps: 24.0,
    context_window: "N/A",
    max_output: "1024x1024",
  },
  {
    id: "grok-imagine-image-2.0",
    name: "grok-imagine-image-2.0",
    provider: "xAI",
    provider_code: "xai",
    description: "Image model for prompt-driven generation, editing, and visual design workflows",
    group: "image-model",
    group_multiplier: "x0.015",
    tags: ["Files", "Vision +1", "Image Generation"],
    price_type: "Giá cố định",
    pricing_unit: "call",
    input_price_1m: 0,
    output_price_1m: 0,
    cache_price_1m: 0,
    cost_per_call: 780,
    endpoint: "image-generation",
    uptime: 100.0,
    latency_s: 12.55,
    tps: 28.0,
    context_window: "N/A",
    max_output: "1536x1024",
  },
  {
    id: "grok-imagine-image-quality",
    name: "grok-imagine-image-quality",
    provider: "xAI",
    provider_code: "xai",
    description: "Higher-fidelity Grok Imagine image model for prompt-driven generation, editing, and visual design workflows",
    group: "image-model",
    group_multiplier: "x0.015",
    tags: ["Files", "Vision +1"],
    price_type: "Giá cố định",
    pricing_unit: "call",
    input_price_1m: 0,
    output_price_1m: 0,
    cache_price_1m: 0,
    cost_per_call: 260,
    endpoint: "image-generation",
    uptime: 98.2,
    latency_s: 11.2,
    tps: 18.0,
    context_window: "N/A",
    max_output: "1024x1024",
  },
  {
    id: "cheap/grok-imagine-image-2.0",
    name: "cheap/grok-imagine-image-2.0",
    provider: "xAI",
    provider_code: "xai",
    description: "Bản tối ưu chi phí thấp của Grok Imagine 2.0 dành cho sinh ảnh số lượng lớn",
    group: "image-model",
    group_multiplier: "x0.015",
    tags: ["Theo yêu cầu", "Image Generation"],
    price_type: "Theo yêu cầu",
    pricing_unit: "call",
    input_price_1m: 0,
    output_price_1m: 0,
    cache_price_1m: 0,
    cost_per_call: 220,
    endpoint: "openai",
    uptime: 100.0,
    latency_s: 23.68,
    tps: 19.5,
    context_window: "N/A",
    max_output: "1024x1024",
  },
  {
    id: "grok-2-1212",
    name: "grok-2-1212",
    provider: "xAI",
    provider_code: "xai",
    description: "Mô hình ngôn ngữ xAI Grok-2 đa năng kèm khả năng truy vấn web",
    group: "grok-heavy",
    group_multiplier: "x0.035",
    tags: ["Reasoning", "Tools +3"],
    price_type: "Giá linh hoạt",
    pricing_unit: "1M",
    input_price_1m: 5000,
    output_price_1m: 25000,
    cache_price_1m: 1250,
    endpoint: "openai",
    uptime: 99.8,
    latency_s: 0.95,
    tps: 72.0,
    context_window: "128K",
    max_output: "8K",
  },

  // 3. Anthropic (Claude)
  {
    id: "claude-fable-5",
    name: "claude-fable-5",
    provider: "Anthropic",
    provider_code: "anthropic",
    description: "Claude model for creative writing, analysis, and controlled agent workflows",
    group: "claude-kire",
    group_multiplier: "x0.186",
    tags: ["Reasoning", "Tools +3", "Writing"],
    price_type: "Giá linh hoạt",
    pricing_unit: "1M",
    input_price_1m: 28028,
    output_price_1m: 140140,
    cache_price_1m: 3500,
    endpoint: "anthropic, openai",
    uptime: 100.0,
    latency_s: 13.78,
    tps: 76.5,
    context_window: "200K",
    max_output: "16K",
    is_featured: true,
  },
  {
    id: "claude-fable-5-1",
    name: "claude-fable-5-1",
    provider: "Anthropic",
    provider_code: "anthropic",
    description: "Claude model for demanding reasoning and long-horizon agentic work",
    group: "claude-kire",
    group_multiplier: "x0.186",
    tags: ["Reasoning", "Tools +3", "Agentic"],
    price_type: "Giá linh hoạt",
    pricing_unit: "1M",
    input_price_1m: 28028,
    output_price_1m: 140140,
    cache_price_1m: 3500,
    endpoint: "anthropic, openai",
    uptime: 100.0,
    latency_s: 11.83,
    tps: 81.5,
    context_window: "200K",
    max_output: "16K",
  },
  {
    id: "claude-haiku-4-5",
    name: "claude-haiku-4-5",
    provider: "Anthropic",
    provider_code: "anthropic",
    description: "Fast Claude lama for lightweight agents, office tasks, and responsive chat",
    group: "claude-max",
    group_multiplier: "x0.255",
    tags: ["Reasoning", "Tools +3", "Speed"],
    price_type: "Giá linh hoạt",
    pricing_unit: "1M",
    input_price_1m: 6615,
    output_price_1m: 33050,
    cache_price_1m: 825,
    endpoint: "anthropic, openai",
    uptime: 100.0,
    latency_s: 5.71,
    tps: 82.7,
    context_window: "200K",
    max_output: "8K",
  },
  {
    id: "claude-opus-4-6",
    name: "claude-opus-4-6",
    provider: "Anthropic",
    provider_code: "anthropic",
    description: "High-end Claude for difficult coding, planning, and slower expert reasoning",
    group: "claude-max",
    group_multiplier: "x0.255",
    tags: ["Reasoning", "Tools +3", "Coding"],
    price_type: "Giá linh hoạt",
    pricing_unit: "1M",
    input_price_1m: 14014,
    output_price_1m: 70070,
    cache_price_1m: 1750,
    endpoint: "anthropic, openai",
    uptime: 99.2,
    latency_s: 16.4,
    tps: 45.0,
    context_window: "200K",
    max_output: "8K",
  },
  {
    id: "claude-opus-4-7",
    name: "claude-opus-4-7",
    provider: "Anthropic",
    provider_code: "anthropic",
    description: "Stronger Opus tier for advanced software work and high-stakes reasoning",
    group: "claude-max",
    group_multiplier: "x0.255",
    tags: ["Reasoning", "Tools +3", "Coding"],
    price_type: "Giá linh hoạt",
    pricing_unit: "1M",
    input_price_1m: 14014,
    output_price_1m: 70070,
    cache_price_1m: 1750,
    endpoint: "anthropic, openai",
    uptime: 99.1,
    latency_s: 15.8,
    tps: 48.0,
    context_window: "200K",
    max_output: "16K",
  },
  {
    id: "claude-3-7-sonnet",
    name: "claude-3-7-sonnet",
    provider: "Anthropic",
    provider_code: "anthropic",
    description: "Mô hình kết hợp tư duy tức thì và tư duy mở rộng (Hybrid Reasoning) vượt trội về lập trình và giải toán",
    group: "claude-kire",
    group_multiplier: "x0.186",
    tags: ["Reasoning", "Tools +3", "Coding", "Vision"],
    price_type: "Giá linh hoạt",
    pricing_unit: "1M",
    input_price_1m: 7500,
    output_price_1m: 37500,
    cache_price_1m: 935,
    endpoint: "anthropic",
    uptime: 99.9,
    latency_s: 0.82,
    tps: 78.5,
    context_window: "200K",
    max_output: "64K",
    is_featured: true,
  },
  {
    id: "claude-3-5-sonnet",
    name: "claude-3-5-sonnet",
    provider: "Anthropic",
    provider_code: "anthropic",
    description: "Mô hình lập trình và giải quyết bài toán phân tích logic chuẩn mực cao nhất từ Anthropic",
    group: "claude-kire",
    group_multiplier: "x0.186",
    tags: ["Reasoning", "Tools +3", "Vision", "Coding"],
    price_type: "Giá linh hoạt",
    pricing_unit: "1M",
    input_price_1m: 7500,
    output_price_1m: 37500,
    cache_price_1m: 935,
    endpoint: "anthropic",
    uptime: 100.0,
    latency_s: 0.74,
    tps: 85.0,
    context_window: "200K",
    max_output: "8K",
  },
  {
    id: "claude-3-5-haiku",
    name: "claude-3-5-haiku",
    provider: "Anthropic",
    provider_code: "anthropic",
    description: "Mô hình siêu tốc với độ trễ thấp nhất trong hệ sinh thái Claude 3.5",
    group: "claude-max",
    group_multiplier: "x0.255",
    tags: ["Speed", "Tools +3"],
    price_type: "Giá linh hoạt",
    pricing_unit: "1M",
    input_price_1m: 2000,
    output_price_1m: 10000,
    cache_price_1m: 250,
    endpoint: "anthropic",
    uptime: 99.8,
    latency_s: 0.45,
    tps: 98.0,
    context_window: "200K",
    max_output: "8K",
  },
  {
    id: "claude-3-opus",
    name: "claude-3-opus",
    provider: "Anthropic",
    provider_code: "anthropic",
    description: "Mô hình kiến thức sâu cho các nhiệm vụ đòi hỏi chiều sâu suy luận và triết lý phức tạp",
    group: "claude-max",
    group_multiplier: "x0.255",
    tags: ["Reasoning", "Tools +3"],
    price_type: "Giá linh hoạt",
    pricing_unit: "1M",
    input_price_1m: 37500,
    output_price_1m: 187500,
    cache_price_1m: 4680,
    endpoint: "anthropic",
    uptime: 99.6,
    latency_s: 2.15,
    tps: 34.0,
    context_window: "200K",
    max_output: "4K",
  },

  // 4. Google (Gemini)
  {
    id: "gemini-2.5-flash",
    name: "gemini-2.5-flash",
    provider: "Google",
    provider_code: "google",
    description: "Mô hình đa phương thức thế hệ mới của Google, hỗ trợ bóc tách video, âm thanh với ngữ cảnh 1M tokens",
    group: "gemini-pro",
    group_multiplier: "x0.072",
    tags: ["Reasoning", "Vision", "1:1m", "Tools +3"],
    price_type: "Giá linh hoạt",
    pricing_unit: "1M",
    input_price_1m: 1850,
    output_price_1m: 7400,
    cache_price_1m: 460,
    endpoint: "gemini, openai",
    uptime: 99.9,
    latency_s: 0.42,
    tps: 112.5,
    context_window: "1M",
    max_output: "8K",
    is_featured: true,
  },
  {
    id: "gemini-2.5-pro",
    name: "gemini-2.5-pro",
    provider: "Google",
    provider_code: "google",
    description: "Frontier Google AI model for deep reasoning, complex code, and long-document synthesis with 2M context window",
    group: "gemini-pro",
    group_multiplier: "x0.072",
    tags: ["Reasoning", "Vision", "1:1m", "Tools +3", "Coding"],
    price_type: "Giá linh hoạt",
    pricing_unit: "1M",
    input_price_1m: 8200,
    output_price_1m: 32800,
    cache_price_1m: 2050,
    endpoint: "gemini, openai",
    uptime: 99.8,
    latency_s: 0.85,
    tps: 84.0,
    context_window: "2M",
    max_output: "16K",
    is_featured: true,
  },
  {
    id: "gemini-1.5-flash",
    name: "gemini-1.5-flash",
    provider: "Google",
    provider_code: "google",
    description: "Tốc độ phản hồi cực cao với cửa sổ ngữ cảnh 1 triệu token, lý tưởng cho phân tích phim và video dài",
    group: "gemini-pro",
    group_multiplier: "x0.072",
    tags: ["Vision", "1:1m", "Tools +3"],
    price_type: "Giá linh hoạt",
    pricing_unit: "1M",
    input_price_1m: 1875,
    output_price_1m: 7500,
    cache_price_1m: 468,
    endpoint: "gemini",
    uptime: 100.0,
    latency_s: 0.35,
    tps: 120.0,
    context_window: "1M",
    max_output: "8K",
  },
  {
    id: "gemini-1.5-pro",
    name: "gemini-1.5-pro",
    provider: "Google",
    provider_code: "google",
    description: "Cửa sổ ngữ cảnh 2 triệu token đột phá, phân tích hàng giờ video và hàng trăm trang tài liệu đồng thời",
    group: "gemini-pro",
    group_multiplier: "x0.072",
    tags: ["Reasoning", "Vision", "1:1m", "Tools +3"],
    price_type: "Giá linh hoạt",
    pricing_unit: "1M",
    input_price_1m: 8750,
    output_price_1m: 26250,
    cache_price_1m: 2187,
    endpoint: "gemini",
    uptime: 99.7,
    latency_s: 1.15,
    tps: 75.0,
    context_window: "2M",
    max_output: "8K",
  },

  // 5. DeepSeek
  {
    id: "deepseek-chat",
    name: "deepseek-chat",
    provider: "DeepSeek",
    provider_code: "deepseek",
    description: "DeepSeek-V3 general purpose conversational and reasoning model with extreme cost efficiency",
    group: "china-model",
    group_multiplier: "x0.075",
    tags: ["Reasoning", "Tools +3", "Coding"],
    price_type: "Giá linh hoạt",
    pricing_unit: "1M",
    input_price_1m: 3450,
    output_price_1m: 13800,
    cache_price_1m: 860,
    endpoint: "openai",
    uptime: 99.6,
    latency_s: 0.58,
    tps: 76.2,
    context_window: "64K",
    max_output: "8K",
    is_featured: true,
  },
  {
    id: "deepseek-reasoner",
    name: "deepseek-reasoner",
    provider: "DeepSeek",
    provider_code: "deepseek",
    description: "DeepSeek-R1 full reasoning model with chain-of-thought processing, matching top closed-source benchmarks",
    group: "china-model",
    group_multiplier: "x0.075",
    tags: ["Reasoning", "Coding", "Mathematics"],
    price_type: "Giá linh hoạt",
    pricing_unit: "1M",
    input_price_1m: 12500,
    output_price_1m: 52000,
    cache_price_1m: 3125,
    endpoint: "openai",
    uptime: 99.4,
    latency_s: 1.45,
    tps: 52.4,
    context_window: "64K",
    max_output: "8K",
    is_featured: true,
  },
  {
    id: "deepseek-coder",
    name: "deepseek-coder",
    provider: "DeepSeek",
    provider_code: "deepseek",
    description: "Mô hình chuyên biệt lập trình phần mềm, viết script và xử lý thuật toán tối ưu",
    group: "china-model",
    group_multiplier: "x0.075",
    tags: ["Coding", "Tools +3"],
    price_type: "Giá linh hoạt",
    pricing_unit: "1M",
    input_price_1m: 3200,
    output_price_1m: 12800,
    cache_price_1m: 800,
    endpoint: "openai",
    uptime: 99.7,
    latency_s: 0.62,
    tps: 68.0,
    context_window: "64K",
    max_output: "8K",
  },

  // 6. Xiaomi
  {
    id: "xiaomi-mimo-v1",
    name: "xiaomi-mimo-v1",
    provider: "Xiaomi",
    provider_code: "xiaomi",
    description: "Mô hình ngôn ngữ tự phát triển của Xiaomi cho thiết bị thông minh và trợ lý ảo",
    group: "china-model",
    group_multiplier: "x0.075",
    tags: ["Reasoning", "Speed"],
    price_type: "Giá linh hoạt",
    pricing_unit: "1M",
    input_price_1m: 2800,
    output_price_1m: 8400,
    cache_price_1m: 700,
    endpoint: "openai",
    uptime: 99.5,
    latency_s: 0.52,
    tps: 88.0,
    context_window: "64K",
    max_output: "4K",
  },
  {
    id: "xiaomi-vision-pro",
    name: "xiaomi-vision-pro",
    provider: "Xiaomi",
    provider_code: "xiaomi",
    description: "Mô hình thị giác máy tính Xiaomi nhận diện đồ vật, trích xuất văn bản từ ảnh chất lượng cao",
    group: "china-model",
    group_multiplier: "x0.075",
    tags: ["Vision", "Tools +3"],
    price_type: "Giá linh hoạt",
    pricing_unit: "1M",
    input_price_1m: 3500,
    output_price_1m: 14000,
    cache_price_1m: 875,
    endpoint: "openai",
    uptime: 99.3,
    latency_s: 0.68,
    tps: 65.0,
    context_window: "32K",
    max_output: "4K",
  },

  // 7. Alibaba (Qwen)
  {
    id: "qwen-2.5-72b",
    name: "qwen-2.5-72b",
    provider: "Alibaba",
    provider_code: "alibaba",
    description: "Mô hình mã nguồn mở mạnh mẽ nhất của Alibaba Cloud với khả năng hiểu sâu ngôn ngữ châu Á",
    group: "china-model",
    group_multiplier: "x0.075",
    tags: ["Reasoning", "Coding", "Tools +3"],
    price_type: "Giá linh hoạt",
    pricing_unit: "1M",
    input_price_1m: 4200,
    output_price_1m: 16800,
    cache_price_1m: 1050,
    endpoint: "openai",
    uptime: 99.8,
    latency_s: 0.72,
    tps: 74.0,
    context_window: "128K",
    max_output: "8K",
  },
  {
    id: "qwen-2.5-coder-32b",
    name: "qwen-2.5-coder-32b",
    provider: "Alibaba",
    provider_code: "alibaba",
    description: "Mô hình chuyên biệt về lập trình xuất sắc từ Alibaba Qwen, cạnh tranh trực tiếp Claude 3.5 Sonnet về mã nguồn",
    group: "china-model",
    group_multiplier: "x0.075",
    tags: ["Coding", "Reasoning", "Tools +3"],
    price_type: "Giá linh hoạt",
    pricing_unit: "1M",
    input_price_1m: 2800,
    output_price_1m: 11200,
    cache_price_1m: 700,
    endpoint: "openai",
    uptime: 99.9,
    latency_s: 0.58,
    tps: 82.5,
    context_window: "128K",
    max_output: "8K",
    is_featured: true,
  },
  {
    id: "qwen-max",
    name: "qwen-max",
    provider: "Alibaba",
    provider_code: "alibaba",
    description: "Mô hình flagship hàng đầu của Alibaba DashScope cho tác vụ suy luận phức tạp và xử lý khối lượng lớn",
    group: "china-model",
    group_multiplier: "x0.075",
    tags: ["Reasoning", "Tools +3", "Vision"],
    price_type: "Giá linh hoạt",
    pricing_unit: "1M",
    input_price_1m: 5600,
    output_price_1m: 22400,
    cache_price_1m: 1400,
    endpoint: "openai",
    uptime: 99.7,
    latency_s: 0.85,
    tps: 62.0,
    context_window: "128K",
    max_output: "8K",
  },
  {
    id: "qwen-plus",
    name: "qwen-plus",
    provider: "Alibaba",
    provider_code: "alibaba",
    description: "Mô hình cân bằng tối ưu giữa hiệu năng và chi phí của hệ sinh thái Qwen Alibaba Cloud",
    group: "china-model",
    group_multiplier: "x0.075",
    tags: ["Reasoning", "1:1m"],
    price_type: "Giá linh hoạt",
    pricing_unit: "1M",
    input_price_1m: 1500,
    output_price_1m: 6000,
    cache_price_1m: 375,
    endpoint: "openai",
    uptime: 100.0,
    latency_s: 0.42,
    tps: 95.0,
    context_window: "128K",
    max_output: "8K",
  },

  // 8. Moonshot AI (Kimi)
  {
    id: "moonshot-v1-128k",
    name: "moonshot-v1-128k",
    provider: "Moonshot AI",
    provider_code: "moonshot",
    description: "Kimi AI dẫn đầu về khả năng đọc hiểu tài liệu siêu dài và ghi nhớ ngữ cảnh phong phú",
    group: "china-model",
    group_multiplier: "x0.075",
    tags: ["Reasoning", "1:1m"],
    price_type: "Giá linh hoạt",
    pricing_unit: "1M",
    input_price_1m: 3600,
    output_price_1m: 14400,
    cache_price_1m: 900,
    endpoint: "openai",
    uptime: 99.6,
    latency_s: 0.64,
    tps: 68.5,
    context_window: "128K",
    max_output: "8K",
  },

  // 9. Z.AI
  {
    id: "z-ai-chat-v2",
    name: "z-ai-chat-v2",
    provider: "Z.AI",
    provider_code: "zai",
    description: "Mô hình đàm thoại tốc độ cao với kiến trúc MoE tinh gọn",
    group: "free-model",
    group_multiplier: "x0.045",
    tags: ["Speed", "Tools +3"],
    price_type: "Giá linh hoạt",
    pricing_unit: "1M",
    input_price_1m: 1200,
    output_price_1m: 4800,
    cache_price_1m: 300,
    endpoint: "openai",
    uptime: 99.1,
    latency_s: 0.32,
    tps: 115.0,
    context_window: "64K",
    max_output: "4K",
  },
  {
    id: "z-ai-reasoner",
    name: "z-ai-reasoner",
    provider: "Z.AI",
    provider_code: "zai",
    description: "Mô hình suy luận bước nhỏ cho các quy trình tự động hóa workflow",
    group: "free-model",
    group_multiplier: "x0.045",
    tags: ["Reasoning"],
    price_type: "Giá linh hoạt",
    pricing_unit: "1M",
    input_price_1m: 2400,
    output_price_1m: 9600,
    cache_price_1m: 600,
    endpoint: "openai",
    uptime: 99.4,
    latency_s: 0.78,
    tps: 62.0,
    context_window: "64K",
    max_output: "4K",
  },

  // 10. Free / Lightweight Models
  {
    id: "llama-3.3-70b",
    name: "llama-3.3-70b",
    provider: "OpenAI",
    provider_code: "meta",
    description: "Meta Llama 3.3 70B mã nguồn mở với hiệu năng tiệm cận các mô hình hàng đầu",
    group: "free-model",
    group_multiplier: "x0.045",
    tags: ["Reasoning", "Tools +3", "Coding"],
    price_type: "Giá linh hoạt",
    pricing_unit: "1M",
    input_price_1m: 1950,
    output_price_1m: 7800,
    cache_price_1m: 488,
    endpoint: "openai",
    uptime: 99.8,
    latency_s: 0.48,
    tps: 94.0,
    context_window: "128K",
    max_output: "8K",
  },
  {
    id: "mistral-large-2411",
    name: "mistral-large-2411",
    provider: "OpenAI",
    provider_code: "mistral",
    description: "Flagship model từ Mistral AI hỗ trợ đa ngôn ngữ hàng đầu và suy luận chính xác",
    group: "openai-gpt",
    group_multiplier: "x0.127",
    tags: ["Reasoning", "Tools +3", "Coding"],
    price_type: "Giá linh hoạt",
    pricing_unit: "1M",
    input_price_1m: 5000,
    output_price_1m: 15000,
    cache_price_1m: 1250,
    endpoint: "openai",
    uptime: 99.7,
    latency_s: 0.71,
    tps: 72.0,
    context_window: "128K",
    max_output: "8K",
  },
];

export const ProviderLogo: React.FC<{ provider: string; size?: number; className?: string }> = ({
  provider,
  size = 16,
  className = "",
}) => {
  switch (provider) {
    case "Anthropic":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#d97706"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`shrink-0 ${className}`}
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12" />
        </svg>
      );
    case "OpenAI":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="#10a37f"
          className={`shrink-0 ${className}`}
        >
          <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1683a.071.071 0 0 1 .038.052v5.5826a4.5045 4.5045 0 0 1-4.4945 4.4947zm-9.66-4.6657a4.4707 4.4707 0 0 1-.5346-3.0044l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1401-2.1867zM2.345 8.9324a4.466 4.466 0 0 1 2.3486-2.0008V12.7a.7854.7854 0 0 0 .3927.6813l5.8428 3.3685-2.02 1.1683a.071.071 0 0 1-.0615 0L3.9877 15.17a4.4992 4.4992 0 0 1-1.6427-6.2376zm16.5932 3.8643l-5.8428-3.3732 2.02-1.1636a.071.071 0 0 1 .0615 0l4.8598 2.8055a4.4992 4.4992 0 0 1-.6813 8.1005v-5.6879a.79.79 0 0 0-.4172-.6813zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 10.2704V7.938a.0804.0804 0 0 1 .0332-.0615l4.8598-2.8055a4.4992 4.4992 0 0 1 6.636 4.9389zM12 14.5375l-2.6588-1.5348 2.6588-1.5349 2.6589 1.5349z" />
        </svg>
      );
    case "xAI":
      return (
        <span className="font-black font-sans text-[11px] leading-none tracking-tight text-slate-900 bg-slate-100 border border-slate-300 px-1 py-0.5 rounded-sm shrink-0">
          xI
        </span>
      );
    case "Google":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="#4285F4"
          className={`shrink-0 ${className}`}
        >
          <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
        </svg>
      );
    case "DeepSeek":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="#4f46e5"
          className={`shrink-0 ${className}`}
        >
          <path d="M12 3C6.48 3 2 6.48 2 10.76c0 2.84 1.95 5.34 4.88 6.68L6 21l4.28-2.14c.56.09 1.13.14 1.72.14 5.52 0 10-3.48 10-7.76S17.52 3 12 3z" />
        </svg>
      );
    default:
      return (
        <Sparkles size={size} className={`text-orange-500 shrink-0 ${className}`} />
      );
  }
};

interface ModelSquarePageProps {
  searchTerm?: string;
  onNotify?: (msg: string, type?: "success" | "error") => void;
}

export const ModelSquarePage: React.FC<ModelSquarePageProps> = ({
  searchTerm: globalSearch = "",
  onNotify,
}) => {
  const [searchQuery, setSearchQuery] = useState(globalSearch);
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [selectedProvider, setSelectedProvider] = useState<string>("all");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [unitMode, setUnitMode] = useState<"1M" | "1K">("1M");
  const [filterMode, setFilterMode] = useState<"all" | "featured" | "cheapest" | "fastest">("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 18;

  // Detail Modal State
  const [detailModel, setDetailModel] = useState<SquareModel | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sync external search term
  useEffect(() => {
    if (globalSearch) {
      setSearchQuery(globalSearch);
    }
  }, [globalSearch]);

  const handleCopy = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard?.writeText(id);
    setCopiedId(id);
    showToast(`Đã sao chép ID: ${id}`, "success");
    setTimeout(() => setCopiedId(null), 1800);
  };

  const token = getToken() ?? "";
  const [pricingOverrides, setPricingOverrides] = useState<Record<string, any>>({});

  const loadCustomPricing = async () => {
    try {
      const res = (await apiRequest("/api/v1/ai-providers/catalog/model-configs", { method: "GET" }, token)) as any;
      const list = Array.isArray(res) ? res : (res?.configs || res?.data || []);
      if (Array.isArray(list)) {
        const map: Record<string, any> = {};
        for (const cfg of list) {
          if (cfg && cfg.model_name) {
            map[cfg.model_name.trim().toLowerCase()] = cfg;
          }
        }
        setPricingOverrides(map);
      }
    } catch {
      // Ignore network errors or unauthenticated state
    }
  };

  useEffect(() => {
    loadCustomPricing();
  }, [token]);

  // Synchronized square models with Admin custom pricing overrides
  const squareModels = useMemo(() => {
    return ALL_SQUARE_MODELS.map((m) => {
      const key = m.name.trim().toLowerCase();
      const idKey = m.id.trim().toLowerCase();
      const cfg = pricingOverrides[key] || pricingOverrides[idKey];
      if (!cfg) return m;

      return {
        ...m,
        input_price_1m: cfg.input_price_1m !== undefined ? cfg.input_price_1m : m.input_price_1m,
        output_price_1m: cfg.output_price_1m !== undefined ? cfg.output_price_1m : m.output_price_1m,
        cache_price_1m:
          cfg.cache_read_1m !== undefined && cfg.cache_read_1m > 0
            ? cfg.cache_read_1m
            : cfg.cache_write_1m !== undefined && cfg.cache_write_1m > 0
            ? cfg.cache_write_1m
            : m.cache_price_1m,
        cache_write_1m: cfg.cache_write_1m !== undefined ? cfg.cache_write_1m : m.cache_write_1m,
        cost_per_call: cfg.cost_per_call !== undefined ? cfg.cost_per_call : m.cost_per_call,
        pricing_unit: cfg.pricing_unit || m.pricing_unit,
        price_type: cfg.price_type || m.price_type,
      };
    });
  }, [pricingOverrides]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadCustomPricing();
    setTimeout(() => {
      setIsRefreshing(false);
      showToast("Đã đồng bộ số liệu và bảng giá mới nhất từ mạng lưới", "success");
    }, 600);
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedGroup("all");
    setSelectedProvider("all");
    setSelectedTag("all");
    setFilterMode("all");
    setCurrentPage(1);
  };

  // Group Definitions with multiplier tags
  const groupFilters = [
    { key: "all", label: "Tất cả các nhóm", count: squareModels.length },
    { key: "codex-pro", label: "codex-pro", multiplier: "x0.076" },
    { key: "openai-gpt", label: "openai-gpt", multiplier: "x0.127" },
    { key: "claude-kire", label: "claude-kire", multiplier: "x0.186" },
    { key: "claude-max", label: "claude-max", multiplier: "x0.255" },
    { key: "gemini-pro", label: "gemini-pro", multiplier: "x0.072" },
    { key: "grok-heavy", label: "grok-heavy", multiplier: "x0.035" },
    { key: "china-model", label: "china-model", multiplier: "x0.075" },
    { key: "image-model", label: "image-model", multiplier: "x0.015" },
    { key: "free-model", label: "free-model", multiplier: "x0.045" },
  ];

  // Provider Filters
  const providerList = [
    { key: "all", label: "Tất cả Nhà cung cấp", count: squareModels.length },
    { key: "OpenAI", label: "OpenAI", count: squareModels.filter((m) => m.provider === "OpenAI").length },
    { key: "Anthropic", label: "Anthropic", count: squareModels.filter((m) => m.provider === "Anthropic").length },
    { key: "xAI", label: "xAI", count: squareModels.filter((m) => m.provider === "xAI").length },
    { key: "Google", label: "Google", count: squareModels.filter((m) => m.provider === "Google").length },
    { key: "DeepSeek", label: "DeepSeek", count: squareModels.filter((m) => m.provider === "DeepSeek").length },
    { key: "Xiaomi", label: "Xiaomi", count: squareModels.filter((m) => m.provider === "Xiaomi").length },
    { key: "Alibaba", label: "Qwen (Alibaba)", count: squareModels.filter((m) => m.provider === "Alibaba").length },
    { key: "Moonshot AI", label: "Moonshot AI", count: squareModels.filter((m) => m.provider === "Moonshot AI").length },
    { key: "Z.AI", label: "Z.AI", count: squareModels.filter((m) => m.provider === "Z.AI").length },
  ];

  // Tag Filters
  const tagList = [
    { key: "all", label: "Tất cả thẻ", count: squareModels.length },
    { key: "Reasoning", label: "Reasoning", count: squareModels.filter((m) => m.tags.includes("Reasoning")).length },
    { key: "Vision", label: "Vision", count: squareModels.filter((m) => m.tags.some((t) => t.includes("Vision"))).length },
    { key: "Tools", label: "Tools", count: squareModels.filter((m) => m.tags.some((t) => t.includes("Tools"))).length },
    { key: "Coding", label: "Coding", count: squareModels.filter((m) => m.tags.includes("Coding")).length },
    { key: "1:1m", label: "1:1m Context", count: squareModels.filter((m) => m.tags.includes("1:1m")).length },
    { key: "Image Generation", label: "Sinh Ảnh (Image)", count: squareModels.filter((m) => m.tags.includes("Image Generation")).length },
  ];

  // Filtering & Sorting
  const filteredModels = useMemo(() => {
    let list = squareModels.filter((m) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = m.name.toLowerCase().includes(q);
        const matchesDesc = m.description.toLowerCase().includes(q);
        const matchesProvider = m.provider.toLowerCase().includes(q);
        const matchesEndpoint = m.endpoint.toLowerCase().includes(q);
        const matchesTag = m.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchesName && !matchesDesc && !matchesProvider && !matchesEndpoint && !matchesTag) {
          return false;
        }
      }

      // Group filter
      if (selectedGroup !== "all" && m.group !== selectedGroup) {
        return false;
      }

      // Provider filter
      if (selectedProvider !== "all" && m.provider !== selectedProvider) {
        return false;
      }

      // Tag filter
      if (selectedTag !== "all") {
        if (!m.tags.some((t) => t.toLowerCase().includes(selectedTag.toLowerCase()))) {
          return false;
        }
      }

      // Filter mode
      if (filterMode === "featured" && !m.is_featured) return false;

      return true;
    });

    // Sorting
    if (filterMode === "cheapest") {
      list = [...list].sort((a, b) => (a.input_price_1m || a.cost_per_call || 0) - (b.input_price_1m || b.cost_per_call || 0));
    } else if (filterMode === "fastest") {
      list = [...list].sort((a, b) => (a.latency_s || 99) - (b.latency_s || 99));
    }

    return list;
  }, [searchQuery, selectedGroup, selectedProvider, selectedTag, filterMode]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredModels.length / pageSize) || 1;
  const paginatedModels = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredModels.slice(start, start + pageSize);
  }, [filteredModels, currentPage]);



  const formatPrice = (val: number) => {
    if (unitMode === "1K") {
      const per1k = val / 1000;
      return per1k >= 1 ? `₫ ${per1k.toLocaleString("vi-VN", { maximumFractionDigits: 2 })} / 1K` : `₫ ${per1k.toFixed(3)} / 1K`;
    }
    return `₫ ${val.toLocaleString("vi-VN", { maximumFractionDigits: 1 })} / 1M`;
  };

  const getProviderColor = (p: string) => {
    switch (p) {
      case "OpenAI":
        return { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "#10b981" };
      case "Anthropic":
        return { bg: "bg-amber-50 text-amber-700 border-amber-200", dot: "#f59e0b" };
      case "Google":
        return { bg: "bg-blue-50 text-blue-700 border-blue-200", dot: "#3b82f6" };
      case "DeepSeek":
        return { bg: "bg-indigo-50 text-indigo-700 border-indigo-200", dot: "#6366f1" };
      case "xAI":
        return { bg: "bg-slate-100 text-slate-800 border-slate-300", dot: "#1e293b" };
      default:
        return { bg: "bg-orange-50 text-orange-700 border-orange-200", dot: "#f97316" };
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50/60 pb-16">
      {/* Main Content Split: Left Filters & Right Model Cards */}
      <div className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 pt-5 flex flex-col lg:flex-row gap-6">
        {/* Left Filter Sidebar */}
        <aside className="w-full lg:w-64 shrink-0 flex flex-col gap-5">
          {/* Filter Header Box */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="font-extrabold text-xs text-slate-900 block">Lọc</span>
                <span className="text-[10px] text-slate-400">Tinh chỉnh mô hình theo bộ lọc</span>
              </div>
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-[11px] font-bold text-orange-600 hover:text-orange-700 cursor-pointer"
              >
                Đặt lại
              </button>
            </div>

            {/* Nhóm Filter */}
            <div className="pt-3">
              <span className="text-[11px] font-bold text-slate-800 block mb-2">Nhóm</span>
              <div className="flex flex-col gap-1 max-h-56 overflow-y-auto pr-1">
                {groupFilters.map((g) => {
                  const isSelected = selectedGroup === g.key;
                  return (
                    <button
                      key={g.key}
                      type="button"
                      onClick={() => {
                        setSelectedGroup(g.key);
                        setCurrentPage(1);
                      }}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all text-left cursor-pointer ${
                        isSelected
                          ? "bg-slate-900 text-white font-bold"
                          : "text-slate-600 hover:bg-slate-100/80"
                      }`}
                    >
                      <span className="truncate">{g.label}</span>
                      {g.multiplier && (
                        <span
                          className={`text-[9.5px] font-mono px-1.5 py-0.5 rounded ${
                            isSelected ? "bg-slate-800 text-amber-300" : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {g.multiplier}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Nhà Cung Cấp Filter */}
            <div className="pt-4 border-t border-slate-100 mt-3">
              <span className="text-[11px] font-bold text-slate-800 block mb-2">Tất cả Nhà cung cấp</span>

              {/* All Providers Button */}
              <button
                type="button"
                onClick={() => {
                  setSelectedProvider("all");
                  setCurrentPage(1);
                }}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-bold transition-all mb-2 cursor-pointer ${
                  selectedProvider === "all"
                    ? "bg-orange-500 text-white shadow-2xs"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80"
                }`}
              >
                <span>Tất cả Nhà cung cấp</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    selectedProvider === "all" ? "bg-orange-600 text-white" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {squareModels.length}
                </span>
              </button>

              {/* Provider Grid */}
              <div className="grid grid-cols-2 gap-1.5">
                {providerList.filter((p) => p.key !== "all").map((p) => {
                  const isSelected = selectedProvider === p.key;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => {
                        setSelectedProvider(isSelected ? "all" : p.key);
                        setCurrentPage(1);
                      }}
                      className={`flex items-center justify-between px-2 py-1.5 rounded-xl text-[11px] transition-all text-left cursor-pointer border ${
                        isSelected
                          ? "bg-slate-900 text-white font-bold border-slate-900 shadow-2xs"
                          : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <ProviderLogo provider={p.key} size={13} />
                        <span className="truncate font-medium">{p.label}</span>
                      </div>
                      <span
                        className={`text-[9.5px] px-1 py-0.2 rounded font-bold ml-1 ${
                          isSelected ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {p.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Thẻ mô hình Filter */}
            <div className="pt-4 border-t border-slate-100 mt-3">
              <span className="text-[11px] font-bold text-slate-800 block mb-2">Thẻ mô hình</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {tagList.map((t) => {
                  const isSelected = selectedTag === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => {
                        setSelectedTag(t.key);
                        setCurrentPage(1);
                      }}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer border ${
                        isSelected
                          ? "bg-slate-900 text-white font-bold border-slate-900 shadow-2xs"
                          : "bg-white hover:bg-slate-50 text-slate-600 border-slate-200"
                      }`}
                    >
                      <span>{t.label}</span>
                      <span
                        className={`text-[9.5px] px-1 py-0.2 rounded font-bold ${
                          isSelected ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {t.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>

        {/* Right Main Grid Area */}
        <main className="flex-1 min-w-0 flex flex-col gap-4">
          {/* Toolbar Above Grid */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="font-extrabold text-xs text-slate-900 whitespace-nowrap">
                {filteredModels.length} mô hình
              </span>
              {(selectedGroup !== "all" || selectedProvider !== "all" || selectedTag !== "all" || searchQuery) && (
                <span className="text-[10.5px] text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full font-bold whitespace-nowrap">
                  Đang lọc
                </span>
              )}

              {/* Compact Search Bar */}
              <div className="relative w-48 sm:w-64">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Tìm tên mô hình, thẻ..."
                  className="w-full pl-7 pr-6 py-1.5 bg-slate-50 hover:bg-white focus:bg-white text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500 font-medium text-slate-800 transition-all shadow-2xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-[10px] cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Quick Sort / Mode Options */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <div className="inline-flex rounded-xl p-0.5 bg-slate-100 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setFilterMode("all")}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                    filterMode === "all" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Tiêu chuẩn
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode("featured")}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                    filterMode === "featured" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Featured
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode("cheapest")}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                    filterMode === "cheapest" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Giá rẻ nhất
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode("fastest")}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                    filterMode === "fastest" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Tốc độ cao
                </button>
              </div>

              {/* Unit Toggle (/1M vs /1K) */}
              <div className="inline-flex rounded-xl p-0.5 bg-slate-100 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setUnitMode("1M")}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                    unitMode === "1M" ? "bg-white text-orange-600 shadow-2xs" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  /1M
                </button>
                <button
                  type="button"
                  onClick={() => setUnitMode("1K")}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                    unitMode === "1K" ? "bg-white text-orange-600 shadow-2xs" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  /1K
                </button>
              </div>

              {/* View Toggle */}
              <div className="inline-flex rounded-xl p-0.5 bg-slate-100 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  title="Chế độ thẻ lưới"
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === "grid" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-400 hover:text-slate-700"
                  }`}
                >
                  <LayoutGrid size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  title="Chế độ bảng danh sách"
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === "table" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-400 hover:text-slate-700"
                  }`}
                >
                  <List size={14} />
                </button>
              </div>

              {/* Refresh Button */}
              <button
                type="button"
                onClick={handleRefresh}
                title="Làm mới bảng giá"
                className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
              >
                <RotateCw size={14} className={isRefreshing ? "animate-spin text-orange-500" : ""} />
              </button>
            </div>
          </div>

          {/* Cards Grid View */}
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {paginatedModels.map((m) => {
                const isImageCall = m.pricing_unit === "call";

                return (
                  <div
                    key={m.id}
                    onClick={() => setDetailModel(m)}
                    className="bg-white border border-slate-200/80 hover:border-orange-300 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between gap-3 cursor-pointer group"
                  >
                    <div>
                      {/* Top Row: Provider Logo & Title & Copy Icon */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <ProviderLogo provider={m.provider} size={18} />
                            <h3 className="font-mono font-bold text-[13.5px] text-slate-900 group-hover:text-orange-600 transition-colors truncate">
                              {m.name}
                            </h3>
                          </div>
                          <span className="text-[10px] text-slate-400 font-semibold block mt-1 pl-6.5">
                            {m.provider}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => handleCopy(m.id, e)}
                          title="Sao chép tên model"
                          className="text-slate-400 hover:text-slate-800 p-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                        >
                          {copiedId === m.id ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                        </button>
                      </div>

                      {/* Description */}
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed mb-2 min-h-[32px]">
                        {m.description || "Chưa có mô tả chi tiết."}
                      </p>

                      {/* Tags */}
                      <div className="text-[10.5px] text-slate-400 mb-2.5 truncate">
                        <span className="font-medium text-slate-500">Thẻ: </span>
                        <span className="text-slate-600">{m.tags.join(", ")}</span>
                      </div>

                      {/* Pricing Section */}
                      <div className="bg-[#f8fafc] rounded-xl p-3 border border-slate-100 mb-2.5">
                        <div className="flex items-center justify-between text-[10px] mb-2">
                          <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200/60 font-bold">
                            {m.price_type}
                          </span>
                          {m.cache_price_1m > 0 && (
                            <span className="text-emerald-600 font-mono text-[10px] font-bold">
                              Cache: {formatPrice(m.cache_price_1m)}
                            </span>
                          )}
                        </div>

                        {isImageCall ? (
                          <div>
                            <span className="text-[10px] text-slate-400 block font-medium">Mỗi lần gọi</span>
                            <span className="text-[13px] font-black text-slate-900 font-mono">
                              {m.cost_per_call ? `₫ ${m.cost_per_call.toLocaleString("vi-VN")} / yêu cầu` : "Miễn phí"}
                            </span>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-[10px] text-slate-400 block font-medium">Đầu vào</span>
                              <span className="text-[12.5px] font-black text-slate-900 font-mono truncate block">
                                {formatPrice(m.input_price_1m)}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block font-medium">Đầu ra</span>
                              <span className="text-[12.5px] font-black text-slate-900 font-mono truncate block">
                                {formatPrice(m.output_price_1m)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Group & Endpoints info */}
                      <div className="text-[10px] text-slate-400 flex items-center justify-between mb-1">
                        <span className="truncate">
                          Nhóm: <span className="font-mono text-slate-600 font-medium">{m.group}</span>
                        </span>
                        <span className="truncate max-w-[160px] text-right font-mono" title={m.endpoint}>
                          Điểm cuối: {m.endpoint}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Status & Performance Metrics */}
                    <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10.5px]">
                      <div className="flex items-center gap-3">
                        {/* Uptime visual bar */}
                        <div className="flex flex-col">
                          <span className="text-[9px] text-slate-400 font-medium leading-none mb-1">
                            Trạng thái {m.uptime.toFixed(1)}%
                          </span>
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((idx) => (
                              <span
                                key={idx}
                                className={`w-2 h-1 rounded-2xs ${
                                  m.uptime >= 98 ? "bg-[#10b981]" : m.uptime >= 90 ? "bg-amber-400" : "bg-slate-300"
                                }`}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Latency */}
                        <div>
                          <span className="text-[9px] text-slate-400 block font-medium leading-none">Độ trễ</span>
                          <span className="text-[11px] font-bold text-slate-700 font-mono mt-0.5 block">
                            {m.latency_s}s
                          </span>
                        </div>

                        {/* TPS */}
                        <div>
                          <span className="text-[9px] text-slate-400 block font-medium leading-none">TPS</span>
                          <span className="text-[11px] font-bold text-slate-700 font-mono mt-0.5 block">
                            {m.tps}t/s
                          </span>
                        </div>
                      </div>

                      <span className="text-[11px] font-bold text-orange-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                        Chi tiết <ChevronRight size={12} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Table View */
            <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Mô hình & Nhà cung cấp</th>
                      <th className="py-3 px-4">Nhóm</th>
                      <th className="py-3 px-4 text-right">Đầu vào</th>
                      <th className="py-3 px-4 text-right">Đầu ra</th>
                      <th className="py-3 px-4 text-right">Cache</th>
                      <th className="py-3 px-4 text-center">Độ trễ</th>
                      <th className="py-3 px-4 text-center">TPS</th>
                      <th className="py-3 px-4 text-center">Uptime</th>
                      <th className="py-3 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {paginatedModels.map((m) => (
                      <tr
                        key={m.id}
                        onClick={() => setDetailModel(m)}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <ProviderLogo provider={m.provider} size={15} />
                            <span className="font-mono font-bold text-slate-900">{m.name}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                              {m.provider}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600 text-[11px] font-mono">{m.group}</td>
                        <td className="py-3 px-4 text-right font-bold text-slate-800">
                          {m.pricing_unit === "call" ? `₫ ${m.cost_per_call?.toLocaleString("vi-VN")}/lần` : formatPrice(m.input_price_1m)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-800">
                          {m.pricing_unit === "call" ? "-" : formatPrice(m.output_price_1m)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-emerald-600">
                          {m.cache_price_1m > 0 ? formatPrice(m.cache_price_1m) : "-"}
                        </td>
                        <td className="py-3 px-4 text-center font-mono">{m.latency_s}s</td>
                        <td className="py-3 px-4 text-center font-mono">{m.tps}t/s</td>
                        <td className="py-3 px-4 text-center font-bold text-emerald-600">{m.uptime}%</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={(e) => handleCopy(m.id, e)}
                            className="p-1 text-slate-400 hover:text-slate-800"
                            title="Sao chép tên model"
                          >
                            <Copy size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Empty State */}
          {filteredModels.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center shadow-2xs">
              <Sparkles size={28} className="mx-auto text-slate-300 mb-2" />
              <h3 className="font-bold text-sm text-slate-800 mb-1">Không tìm thấy mô hình nào</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                Thử thay đổi từ khóa tìm kiếm hoặc bấm đặt lại bộ lọc để xem toàn bộ danh mục.
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Đặt lại bộ lọc
              </button>
            </div>
          )}

          {/* Pagination Controls */}
          {filteredModels.length > pageSize && (
            <div className="flex items-center justify-between pt-4 pb-6">
              <span className="text-xs font-medium text-slate-500">
                Hiển thị trang {currentPage} / {totalPages} ({filteredModels.length} mô hình)
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
                >
                  <ChevronLeft size={14} />
                  <span>Trang trước</span>
                </button>

                <div className="flex items-center gap-1 text-xs">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                    <button
                      key={pg}
                      type="button"
                      onClick={() => setCurrentPage(pg)}
                      className={`w-7 h-7 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                        currentPage === pg
                          ? "bg-orange-500 text-white shadow-2xs"
                          : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                      }`}
                    >
                      {pg}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
                >
                  <span>Trang tiếp theo</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* 3. Detailed Model Drawer (Slide-over matching screenshot) */}
      <ModelDetailDrawer
        model={detailModel}
        onClose={() => setDetailModel(null)}
        formatPrice={formatPrice}
      />
    </div>
  );
};
