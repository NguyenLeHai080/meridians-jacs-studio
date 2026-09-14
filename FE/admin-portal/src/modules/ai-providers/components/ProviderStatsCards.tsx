import React from "react";
import { Bot, ShieldCheck, Sparkles, AudioLines } from "lucide-react";
import { useI18n } from "../../../core/i18n";

interface ProviderStatsCardsProps {
  metrics: {
    total: number;
    active: number;
    disabled: number;
    visionCount: number;
    ttsCount: number;
    cinemaCount: number;
    reasoningCount: number;
  };
}

export const ProviderStatsCards: React.FC<ProviderStatsCardsProps> = ({ metrics }) => {
  const { t } = useI18n();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Total AI Providers */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200 flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-orange-50/80 border border-orange-100 flex items-center justify-center text-orange-600 shrink-0">
          <Bot size={20} className="stroke-[2]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {t("statTotalProviders", "Tổng số AI Providers")}
          </div>
          <div className="text-xl font-extrabold text-slate-900 mt-0.5">
            {metrics.total}{" "}
            <span className="text-xs font-normal text-slate-400">
              {t("statProvidersUnit", "cổng AI")}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 truncate">
            OpenAI, Gemini, Claude & Custom
          </div>
        </div>
      </div>

      {/* Card 2: Active Online */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200 flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-emerald-50/80 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
          <ShieldCheck size={20} className="stroke-[2]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {t("statActiveProviders", "Đang hoạt động online")}
          </div>
          <div className="text-xl font-extrabold text-emerald-700 mt-0.5">
            {metrics.active}{" "}
            <span className="text-xs font-normal text-emerald-600/70">
              {t("statActiveUnit", "hoạt động")}
            </span>
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1 truncate">
            Sẵn sàng nhận request kịch bản
          </div>
        </div>
      </div>

      {/* Card 3: Vision & Cinema */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200 flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-purple-50/80 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0">
          <Sparkles size={20} className="stroke-[2]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {t("statVisionCinema", "Thị giác & Điện ảnh")}
          </div>
          <div className="text-xl font-extrabold text-purple-700 mt-0.5">
            {metrics.visionCount + metrics.cinemaCount}{" "}
            <span className="text-xs font-normal text-slate-400">
              ({metrics.visionCount} vision / {metrics.cinemaCount} kịch bản)
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 truncate">
            Gemini 2M & Claude Opus 4.8
          </div>
        </div>
      </div>

      {/* Card 4: Voice & TTS Engine */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200 flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-rose-50/80 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
          <AudioLines size={20} className="stroke-[2]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {t("statVoiceTts", "Hạ tầng Voice & TTS")}
          </div>
          <div className="text-xl font-extrabold text-rose-700 mt-0.5">
            {metrics.ttsCount}{" "}
            <span className="text-xs font-normal text-slate-400">
              {t("statProvidersUnit", "cổng")}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 truncate">
            ElevenLabs, Vbee & Whisper
          </div>
        </div>
      </div>
    </div>
  );
};
