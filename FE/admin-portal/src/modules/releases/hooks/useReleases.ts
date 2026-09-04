import { useState, useMemo } from "react";
import type { Release } from "../services/releaseService";

export function useReleases(initialReleases: Release[]) {
  const [releases, setReleases] = useState<Release[]>(initialReleases);
  const [platformFilter, setPlatformFilter] = useState("all");

  const filteredReleases = useMemo(() => {
    if (platformFilter === "all") return releases;
    return releases.filter((r) => r.platform.toLowerCase().includes(platformFilter.toLowerCase()));
  }, [releases, platformFilter]);

  return {
    releases,
    setReleases,
    platformFilter,
    setPlatformFilter,
    filteredReleases,
    totalCount: releases.length,
  };
}
