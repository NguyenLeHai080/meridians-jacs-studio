import { useState } from "react";
import type { Job } from "../../../core/types";

export function useBrand(job?: Job) {
  const [logoPosition, setLogoPosition] = useState<Job["logoPosition"]>(job?.logoPosition || "bottom-right");
  const [logoOpacity, setLogoOpacity] = useState<number>(job?.logoOpacity ?? 0.85);
  const [subtitleStyle, setSubtitleStyle] = useState<Job["subtitleStyle"]>(job?.subtitleStyle || "bottom");

  return {
    logoPosition,
    setLogoPosition,
    logoOpacity,
    setLogoOpacity,
    subtitleStyle,
    setSubtitleStyle,
  };
}
