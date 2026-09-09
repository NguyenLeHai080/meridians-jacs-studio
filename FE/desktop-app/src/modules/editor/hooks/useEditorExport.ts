import { useCallback } from "react";
import type { Job, NavKey } from "../../../core/types";
import { VOICE_PACKS } from "../../../core/voice-packs";
import type { EditorScene } from "../editor.types";
import { formatSeconds, stripSceneMetadata, toSeconds } from "../utils/editorTime";

export interface UseEditorExportParams {
  sourceJob?: Job;
  editorScenes: EditorScene[];
  trackMutes: Record<string, boolean>;
  originalAudioVolume: number;
  selectedVoice: string;
  aspectRatio: "9:16" | "1:1" | "16:9" | "4:5";
  removeOriginalBgm: boolean;
  subtitlesVisible: boolean;
  subtitleStyle: "gold" | "white" | "neon" | "box";
  sequenceDuration: number;
  setIsExportDropdownOpen: (open: boolean) => void;
  setProjectMessage: (msg: string) => void;
  onNavigate: (key: NavKey) => void;
  onAddJob?: (job: Job) => void;
  onUpdateJob?: (jobId: string, values: Partial<Job>) => void;
  defaultVoiceForLang: (lang?: string, gender?: string) => string;
}

export function useEditorExport({
  sourceJob,
  editorScenes,
  trackMutes,
  originalAudioVolume,
  selectedVoice,
  aspectRatio,
  removeOriginalBgm,
  subtitlesVisible,
  subtitleStyle,
  sequenceDuration,
  setIsExportDropdownOpen,
  setProjectMessage,
  onNavigate,
  onAddJob,
  onUpdateJob,
  defaultVoiceForLang,
}: UseEditorExportParams) {
  const handleExportFull = useCallback(() => {
    setIsExportDropdownOpen(false);
    if (!sourceJob || !onAddJob) return;

    let timelineCursor = 0;
    const timelineSubtitleSegments: Array<{ start: number; end: number; text: string }> = [];

    const fullScenes = editorScenes.map((s, idx) => {
      const sceneDur = Math.max(0.5, toSeconds(s.end) - toSeconds(s.start));
      const srcStart = s.sourceTimeStart ?? toSeconds(s.sourceStart || s.start);
      const srcEnd = srcStart + sceneDur;
      const tStart = timelineCursor;
      const tEnd = timelineCursor + sceneDur;
      timelineCursor += sceneDur;

      const sceneText = stripSceneMetadata(s.subtitle || s.voiceover || s.translation || s.detail || "").trim();
      if (sceneText) {
        timelineSubtitleSegments.push({
          start: tStart,
          end: tEnd,
          text: sceneText,
        });
      }

      return {
        id: s.id || `scene-${idx + 1}`,
        start: formatSeconds(tStart),
        end: formatSeconds(tEnd),
        sourceStart: formatSeconds(srcStart),
        sourceEnd: formatSeconds(srcEnd),
        sourceTimeStart: srcStart,
        sourceTimeEnd: srcEnd,
        action_visual: s.action_visual || s.detail,
        title: s.title,
        detail: s.detail || "",
        voiceover: sceneText || s.subtitle || "",
        translation: sceneText || s.subtitle || "",
      };
    });

    const cutClips = editorScenes
      .map((s) => {
        const sceneDur = Math.max(0.5, toSeconds(s.end) - toSeconds(s.start));
        const srcStart = s.sourceTimeStart ?? toSeconds(s.sourceStart || s.start);
        const srcEnd = srcStart + sceneDur;
        const sceneText = stripSceneMetadata(s.subtitle || s.voiceover || s.translation || s.detail || "").trim();
        return {
          sourceStart: srcStart,
          sourceEnd: srcEnd,
          duration: sceneDur,
          text: sceneText || s.subtitle || s.detail,
          title: s.title,
        };
      })
      .filter((c) => c.sourceEnd > c.sourceStart);

    const isVoiceMuted = Boolean(trackMutes.voice);
    const isOriginalAudioMuted =
      Boolean(trackMutes.originalAudio) || originalAudioVolume === 0 || sourceJob.keepOriginalAudio === false;
    const isCaptionsMuted = Boolean(trackMutes.captions);
    const effectiveVoice =
      selectedVoice ||
      sourceJob.narratorVoice ||
      defaultVoiceForLang(sourceJob?.languages?.[0], sourceJob?.narratorGender) ||
      "vi-namminh";
    const voicePackObj = VOICE_PACKS.find((v) => v.id.toLowerCase() === effectiveVoice.toLowerCase());
    const hasAnyNarration = editorScenes.some((s) =>
      Boolean(s.subtitle?.trim() || s.voiceover?.trim() || s.detail?.trim())
    );
    const fullNarrationText = editorScenes
      .map((s) => stripSceneMetadata(s.subtitle || s.voiceover || s.detail))
      .filter(Boolean)
      .join(" ");

    const effectiveTitle = sourceJob.analysis?.videoTitle || sourceJob.name;
    const totalDuration = timelineCursor || sequenceDuration || sourceJob.durationSeconds || 60;

    // Save timeline state back to source job
    if (onUpdateJob && sourceJob.id) {
      onUpdateJob(sourceJob.id, {
        cutClips,
        timelineClips: cutClips as any,
        analysis: {
          summary: sourceJob.analysis?.summary || `Dự án timeline (${editorScenes.length} phân cảnh)`,
          score: sourceJob.analysis?.score || 9.5,
          tokensUsed: sourceJob.analysis?.tokensUsed || 0,
          creditsUsed: sourceJob.analysis?.creditsUsed || 0,
          ...(sourceJob.analysis || {}),
          scenes: fullScenes as any,
        },
      });
    }

    onAddJob({
      id: `export-full-${Date.now()}`,
      name: `${effectiveTitle} (Xuất 1 Video Hoàn Chỉnh)`,
      source: sourceJob.source,
      sourceType: sourceJob.sourceType,
      localPath: sourceJob.localPath,
      durationSeconds: totalDuration,
      mode: "local-gpu",
      aspectRatio: aspectRatio === "4:5" ? "9:16" : aspectRatio,
      keepOriginalAudio: !isOriginalAudioMuted,
      interweaveAudio: !isOriginalAudioMuted && originalAudioVolume < 90,
      originalAudioVolume: isOriginalAudioMuted ? 0 : originalAudioVolume,
      autoDucking: true,
      removeOriginalBgm: Boolean(removeOriginalBgm || sourceJob.removeOriginalBgm || sourceJob.isolateVocals),
      isolateVocals: Boolean(removeOriginalBgm || sourceJob.removeOriginalBgm || sourceJob.isolateVocals),
      narratorEnabled: sourceJob.narratorEnabled === false ? false : !isVoiceMuted && hasAnyNarration,
      narratorGender: (voicePackObj?.gender as any) || sourceJob.narratorGender || "male",
      narratorVoice: effectiveVoice,
      subtitlesEnabled: !isCaptionsMuted && subtitlesVisible,
      subtitleStyle: subtitleStyle || "gold",
      subtitleText: fullNarrationText,
      narrationText: fullNarrationText,
      subtitleSegments: timelineSubtitleSegments as any,
      cutClips,
      timelineClips: cutClips as any,
      analysis: {
        summary: sourceJob.analysis?.summary || `Dự án timeline ghép hoàn chỉnh (${editorScenes.length} phân cảnh)`,
        scenes: fullScenes as any,
        voiceScript: fullNarrationText,
        score: sourceJob.analysis?.score || 9.5,
        tokensUsed: sourceJob.analysis?.tokensUsed || 0,
        creditsUsed: sourceJob.analysis?.creditsUsed || 0,
        ...(sourceJob.analysis || {}),
      },
      status: "queued",
      stage: "queued",
      progress: 0,
      createdAt: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      synced: true,
    });
    setProjectMessage("🚀 Đã đưa 1 Video hoàn chỉnh vào hàng đợi Render!");
    setTimeout(() => onNavigate("render"), 800);
  }, [
    sourceJob,
    onAddJob,
    onUpdateJob,
    editorScenes,
    trackMutes,
    originalAudioVolume,
    selectedVoice,
    aspectRatio,
    removeOriginalBgm,
    subtitlesVisible,
    subtitleStyle,
    sequenceDuration,
    defaultVoiceForLang,
    setIsExportDropdownOpen,
    setProjectMessage,
    onNavigate,
  ]);

  const handleExportScenes = useCallback(() => {
    setIsExportDropdownOpen(false);
    if (!sourceJob || !onAddJob) return;

    const isVoiceMuted = Boolean(trackMutes.voice);
    const isOriginalAudioMuted =
      Boolean(trackMutes.originalAudio) || originalAudioVolume === 0 || sourceJob.keepOriginalAudio === false;
    const isCaptionsMuted = Boolean(trackMutes.captions);
    const effectiveVoice =
      selectedVoice ||
      sourceJob.narratorVoice ||
      defaultVoiceForLang(sourceJob?.languages?.[0], sourceJob?.narratorGender) ||
      "vi-namminh";
    const voicePackObj = VOICE_PACKS.find((v) => v.id.toLowerCase() === effectiveVoice.toLowerCase());
    const effectiveTitle = sourceJob.analysis?.videoTitle || sourceJob.name;

    editorScenes.forEach((scene, index) => {
      const sceneDur = Math.max(0.5, toSeconds(scene.end) - toSeconds(scene.start));
      const srcStartSec = scene.sourceTimeStart ?? toSeconds(scene.sourceStart || scene.start);
      const srcEndSec = srcStartSec + sceneDur;
      const sceneText = stripSceneMetadata(scene.subtitle || scene.voiceover || scene.translation || scene.detail || "").trim();
      onAddJob({
        id: `export-scene-${Date.now()}-${index + 1}`,
        name: `${effectiveTitle} · Cảnh ${index + 1}: ${scene.title}`,
        source: sourceJob.source,
        sourceType: sourceJob.sourceType,
        localPath: sourceJob.localPath,
        durationSeconds: sceneDur,
        mode: "local-gpu",
        aspectRatio: aspectRatio === "4:5" ? "9:16" : aspectRatio,
        keepOriginalAudio: !isOriginalAudioMuted,
        interweaveAudio: !isOriginalAudioMuted && originalAudioVolume < 90,
        originalAudioVolume: isOriginalAudioMuted ? 0 : originalAudioVolume,
        autoDucking: true,
        removeOriginalBgm: Boolean(removeOriginalBgm || sourceJob.removeOriginalBgm || sourceJob.isolateVocals),
        isolateVocals: Boolean(removeOriginalBgm || sourceJob.removeOriginalBgm || sourceJob.isolateVocals),
        narratorEnabled: sourceJob.narratorEnabled === false ? false : !isVoiceMuted && Boolean(sceneText),
        narratorGender: (voicePackObj?.gender as any) || sourceJob.narratorGender || "male",
        narratorVoice: effectiveVoice,
        subtitlesEnabled: !isCaptionsMuted && subtitlesVisible,
        subtitleStyle: subtitleStyle || "gold",
        subtitleText: sceneText,
        narrationText: sceneText,
        clipStartSeconds: srcStartSec,
        clipEndSeconds: srcEndSec,
        cutClips: [
          {
            sourceStart: srcStartSec,
            sourceEnd: srcEndSec,
            duration: sceneDur,
            text: sceneText,
            title: scene.title,
          },
        ],
        subtitleSegments: sceneText ? [{ start: 0, end: sceneDur, text: sceneText }] : [],
        analysis: {
          summary: sourceJob.analysis?.summary || `Phân cảnh ${index + 1}: ${scene.title}`,
          voiceScript: sceneText,
          scenes: [
            {
              id: scene.id,
              start: "00:00",
              end: formatSeconds(sceneDur),
              sourceStart: formatSeconds(srcStartSec),
              sourceEnd: formatSeconds(srcEndSec),
              sourceTimeStart: srcStartSec,
              sourceTimeEnd: srcEndSec,
              title: scene.title,
              detail: scene.detail || "",
              voiceover: sceneText,
              translation: sceneText,
            },
          ],
          score: sourceJob.analysis?.score || 9.5,
          tokensUsed: sourceJob.analysis?.tokensUsed || 0,
          creditsUsed: sourceJob.analysis?.creditsUsed || 0,
          ...(sourceJob.analysis || {}),
        },
        status: "queued",
        stage: "queued",
        progress: 0,
        createdAt: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
        synced: true,
      });
    });
    setProjectMessage(`🚀 Đã thêm ${editorScenes.length} phân cảnh riêng lẻ vào hàng đợi Render!`);
    setTimeout(() => onNavigate("render"), 800);
  }, [
    sourceJob,
    onAddJob,
    editorScenes,
    trackMutes,
    originalAudioVolume,
    selectedVoice,
    aspectRatio,
    removeOriginalBgm,
    subtitlesVisible,
    subtitleStyle,
    defaultVoiceForLang,
    setIsExportDropdownOpen,
    setProjectMessage,
    onNavigate,
  ]);

  return {
    handleExportFull,
    handleExportScenes,
  };
}
