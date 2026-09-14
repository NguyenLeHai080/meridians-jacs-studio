import { useState } from "react";
import type { DurationMappingRule } from "../../../core/types";
import { DEFAULT_DURATION_RULES } from "../constants/modelPresets";

export function useDurationRules(showToast?: (msg: string) => void) {
  const [durationMode, setDurationMode] = useState<"rules" | "fixed">(() => {
    return (localStorage.getItem("jacs_duration_mode") as any) || "fixed";
  });

  const [durationRules, setDurationRules] = useState<DurationMappingRule[]>(() => {
    try {
      const saved = localStorage.getItem("jacs_duration_rules");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_DURATION_RULES;
  });

  const [targetDuration, setTargetDuration] = useState<"full" | "60s" | "3m" | "5m" | "10m" | "15m" | "custom">("5m");
  const [customDurationMinutes, setCustomDurationMinutes] = useState<number>(5);

  const updateDurationMode = (mode: "rules" | "fixed") => {
    setDurationMode(mode);
    try { localStorage.setItem("jacs_duration_mode", mode); } catch {}
  };

  const updateDurationRules = (rules: DurationMappingRule[]) => {
    setDurationRules(rules);
    try { localStorage.setItem("jacs_duration_rules", JSON.stringify(rules)); } catch {}
  };

  const handleAddDurationRule = () => {
    const last = durationRules[durationRules.length - 1];
    const minM = last ? last.maxInputMinutes : 0;
    const maxM = minM + 15;
    const targetM = last ? last.targetOutputMinutes + 3 : 3;
    const newRule: DurationMappingRule = {
      id: `rule-${Date.now()}`,
      minInputMinutes: minM,
      maxInputMinutes: maxM,
      targetOutputMinutes: targetM,
      label: `${minM} - ${maxM} phút`,
    };
    updateDurationRules([...durationRules, newRule]);
  };

  const handleUpdateDurationRule = (id: string, updates: Partial<DurationMappingRule>) => {
    const updated = durationRules.map((r) => (r.id === id ? { ...r, ...updates } : r));
    updateDurationRules(updated);
  };

  const handleDeleteDurationRule = (id: string) => {
    if (durationRules.length <= 1) {
      showToast?.("⚠️ Cần giữ lại ít nhất 1 quy tắc thời lượng.");
      return;
    }
    updateDurationRules(durationRules.filter((r) => r.id !== id));
  };

  const handleResetDurationRules = () => {
    updateDurationRules(DEFAULT_DURATION_RULES);
    showToast?.("✓ Đã khôi phục bảng quy tắc thời lượng mặc định.");
  };

  return {
    durationMode,
    updateDurationMode,
    durationRules,
    updateDurationRules,
    targetDuration,
    setTargetDuration,
    customDurationMinutes,
    setCustomDurationMinutes,
    handleAddDurationRule,
    handleUpdateDurationRule,
    handleDeleteDurationRule,
    handleResetDurationRules,
  };
}
