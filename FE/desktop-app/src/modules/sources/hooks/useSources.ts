import { useState, useMemo } from "react";
import type { Job } from "../../../core/types";

export function useSources(jobs: Job[]) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);

  const sources = useMemo(() => {
    return jobs.filter((j) => j.sourceOnly || (!j.parentJobId && !j.sceneId));
  }, [jobs]);

  const filteredSources = useMemo(() => {
    if (!searchTerm.trim()) return sources;
    const q = searchTerm.toLowerCase();
    return sources.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.source.toLowerCase().includes(q) ||
        (s.localPath && s.localPath.toLowerCase().includes(q))
    );
  }, [sources, searchTerm]);

  const toggleSelect = (id: string) => {
    setSelectedSourceIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedSourceIds.length === filteredSources.length) {
      setSelectedSourceIds([]);
    } else {
      setSelectedSourceIds(filteredSources.map((s) => s.id));
    }
  };

  return {
    sources,
    filteredSources,
    searchTerm,
    setSearchTerm,
    selectedSourceIds,
    setSelectedSourceIds,
    toggleSelect,
    selectAll,
  };
}
