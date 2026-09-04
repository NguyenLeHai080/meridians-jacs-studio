import { useState, useEffect } from "react";
import type { VoiceProfile } from "../../../core/types";
import { storyService } from "../services/storyService";

export function useStory(language = "vi") {
  const [voices, setVoices] = useState<VoiceProfile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    storyService
      .listVoices(language)
      .then(setVoices)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [language]);

  return { voices, loading };
}
