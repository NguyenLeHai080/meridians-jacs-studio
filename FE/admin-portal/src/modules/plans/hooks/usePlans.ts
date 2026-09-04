import { useState, useMemo } from "react";
import type { PlanItem } from "../utils/planHelper";

export function usePlans(initialPlans: PlanItem[]) {
  const [plans, setPlans] = useState<PlanItem[]>(initialPlans);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredPlans = useMemo(() => {
    return plans.filter((p) => {
      const matchesSearch =
        !searchTerm ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || (statusFilter === "active" ? p.active !== false : p.active === false);
      return matchesSearch && matchesStatus;
    });
  }, [plans, searchTerm, statusFilter]);

  return {
    plans,
    setPlans,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    filteredPlans,
  };
}
