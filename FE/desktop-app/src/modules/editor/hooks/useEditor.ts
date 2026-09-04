import { useState, useMemo } from "react";
import type { Job, TimelineClip } from "../../../core/types";

export function useEditor(job?: Job) {
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  const duration = useMemo(() => {
    return Number(job?.durationSeconds || 0);
  }, [job]);

  const clips: TimelineClip[] = useMemo(() => {
    return job?.timelineClips || [];
  }, [job]);

  return {
    currentTime,
    setCurrentTime,
    isPlaying,
    setIsPlaying,
    zoomLevel,
    setZoomLevel,
    duration,
    clips,
  };
}
