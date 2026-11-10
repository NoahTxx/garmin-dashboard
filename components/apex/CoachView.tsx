import React, { useState } from "react";
import {
  Send,
  Paperclip,
  Sparkles,
  Camera,
  RefreshCw,
  X,
  Target,
  Dumbbell,
  Clock,
  Heart,
  Moon,
  BatteryCharging,
  Zap,
} from "lucide-react";
import { MockAthleteProfile } from "@/lib/mock-data";
import { TodayCockpitData } from "@/lib/apex-types";

interface CoachViewProps {
  profile: MockAthleteProfile | null;
  cockpitData?: TodayCockpitData;
  messages: Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
    images?: string[];
  }>;
  onSendMessage: (msg: string, images?: string[]) => void;
  isReplying: boolean;
  attachedImages: string[];
  onRemoveImage: (idx: number) => void;
  onSelectImages: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onQuickAction: (actionText: string) => void;
}

export function CoachView({
  profile,
  cockpitData,
  messages,
  onSendMessage,
  isReplying,
  attachedImages,
  onRemoveImage,
  onSelectImages,
  onQuickAction,
}: CoachViewProps) {
  const [inputVal, setInputVal] = useState("");
  const [showWizard, setShowWizard] = useState(!profile?.setupCompleted);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() && attachedImages.length === 0) return;
    onSendMessage(inputVal, attachedImages);
    setInputVal("");
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wider font-semibold text-[#8B5CF6] mb-1">
            Performance Intelligence
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F8FAFC]">
            AI Performance Coach
          </h1>
        </div>
        <button
          onClick={() => setShowWizard(!showWizard)}
          className="inline-flex items-center gap-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] px-4 py-2 text-xs font-semibold text-[#F8FAFC] transition-colors"
        >
          <Target className="w-3.5 h-3.5 text-[#3B82F6]" />
          {showWizard ? "Chat anzeigen" : "Geführtes Onboarding"}
        </button>
      </div>

      {/* Morning Check: Garmin Vitals & Adaptive Recommendation */}
      {cockpitData && (
        <div className="rounded-3xl bg-[#121821] border border-white/[0.08] p-5 md:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#34D399] animate-pulse" />
                <span className="text-xs uppercase font-semibold text-[#8B5CF6] tracking-wider">
                  Morning Check · Garmin Vitals
                </span>
              </div>
              <h2 className="text-base md:text-lg font-bold text-[#F8FAFC] mt-0.5">
                {cockpitData.recommendation.title}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#94A3B8]">Readiness:</span>
              <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold ${
                cockpitData.readinessStatus === "success"
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                  : cockpitData.readinessStatus === "warning"
                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                  : "bg-rose-500/15 text-rose-400 border border-rose-500/20"
              }`}>
                {cockpitData.readiness.value ?? "--"} / 100
              </span>
            </div>
          </div>

          <p className="text-xs md:text-sm text-[#94A3B8]">
            {cockpitData.recommendation.description}
          </p>

          {/* Vitals summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            <div className="p-3 rounded-xl bg-[#0B0F14]/70 border border-white/[0.04]">
              <div className="flex items-center gap-1.5 text-xs text-[#94A3B8] mb-1">
                <Moon className="w-3.5 h-3.5 text-indigo-400" /> Schlaf
              </div>
              <div className="text-base font-bold font-mono text-[#F8FAFC]">
                {cockpitData.metrics.sleepScore.value !== null ? `${cockpitData.metrics.sleepScore.value}/100` : "No data"}
              </div>
              <div className="text-[10px] text-[#64748B] mt-0.5 truncate">
                {cockpitData.metrics.sleepScore.interpretation || "Garmin Schlaf"}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#0B0F14]/70 border border-white/[0.04]">
              <div className="flex items-center gap-1.5 text-xs text-[#94A3B8] mb-1">
                <Heart className="w-3.5 h-3.5 text-rose-400" /> Nacht HRV
              </div>
              <div className="text-base font-bold font-mono text-[#F8FAFC]">
                {cockpitData.metrics.hrvLastNight.value !== null ? `${cockpitData.metrics.hrvLastNight.value} ms` : "No data"}
              </div>
              <div className="text-[10px] text-[#64748B] mt-0.5 truncate">
                {cockpitData.hrv30dAvg ? `30d Ø: ${cockpitData.hrv30dAvg} ms` : "Garmin HRV"}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#0B0F14]/70 border border-white/[0.04]">
              <div className="flex items-center gap-1.5 text-xs text-[#94A3B8] mb-1">
                <BatteryCharging className="w-3.5 h-3.5 text-violet-400" /> Body Battery
              </div>
              <div className="text-base font-bold font-mono text-[#F8FAFC]">
                {cockpitData.metrics.bodyBattery.value !== null ? cockpitData.metrics.bodyBattery.value : "No data"}
              </div>
              <div className="text-[10px] text-[#64748B] mt-0.5 truncate">
                {cockpitData.bodyBatteryDetails?.lowest !== null && cockpitData.bodyBatteryDetails?.highest !== null
                  ? `Low: ${cockpitData.bodyBatteryDetails?.lowest} · High: ${cockpitData.bodyBatteryDetails?.highest}`
                  : "Garmin Connect"}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#0B0F14]/70 border border-white/[0.04]">
              <div className="flex items-center gap-1.5 text-xs text-[#94A3B8] mb-1">
                <Zap className="w-3.5 h-3.5 text-amber-400" /> Akute Last
              </div>
              <div className="text-base font-bold font-mono text-[#F8FAFC]">
                {cockpitData.metrics.acuteLoad.value !== null ? cockpitData.metrics.acuteLoad.value : "No data"}
              </div>
              <div className="text-[10px] text-[#64748B] mt-0.5 truncate">
                Garmin Acute Load
              </div>
            </div>
          </div>

          {/* Reasoning list */}
          {cockpitData.recommendation.reasoning.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                Garmin Begründung:
              </span>
              {cockpitData.recommendation.reasoning.map((r, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs text-[#94A3B8]"
                >
                  {r}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Guided Onboarding Wizard Card if active */}
      {showWizard && (
        <div className="rounded-3xl bg-[#121821] border border-white/[0.08] p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
            <div>
              <span className="text-xs uppercase font-semibold text-[#8B5CF6] tracking-wider">
                Coach Setup
              </span>
              <h2 className="text-lg font-bold text-[#F8FAFC] mt-0.5">
                Strukturiertes Athleten-Profil
              </h2>
            </div>
            <span className="text-xs text-[#94A3B8]">Schritt 1 von 3</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              onClick={() => onQuickAction("Mein Hauptziel: Ausdauer & Halbmarathon PB")}
              className="p-4 rounded-2xl bg-[#0B0F14] border border-white/[0.06] hover:border-[#3B82F6]/50 text-left transition-all group"
            >
              <Clock className="w-5 h-5 text-[#3B82F6] mb-2" />
              <h4 className="text-sm font-semibold text-[#F8FAFC] group-hover:text-[#3B82F6]">
                Ausdauer & Pace
              </h4>
              <p className="text-xs text-[#94A3B8] mt-1">
                Zone-2 Optimierung, Laktatschwelle und Halbmarathon-Fokus.
              </p>
            </button>

            <button
              onClick={() => onQuickAction("Mein Hauptziel: Hypertrophie & Kraftaufbau")}
              className="p-4 rounded-2xl bg-[#0B0F14] border border-white/[0.06] hover:border-[#8B5CF6]/50 text-left transition-all group"
            >
              <Dumbbell className="w-5 h-5 text-[#8B5CF6] mb-2" />
              <h4 className="text-sm font-semibold text-[#F8FAFC] group-hover:text-[#8B5CF6]">
                Kraft & Hypertrophie
              </h4>
              <p className="text-xs text-[#94A3B8] mt-1">
                Progressive Overload, 3er-Split & RIR-gesteuertes Training.
              </p>
            </button>

            <button
              onClick={() => onQuickAction("Mein Hauptziel: Body Recomp & Vitalität")}
              className="p-4 rounded-2xl bg-[#0B0F14] border border-white/[0.06] hover:border-[#34D399]/50 text-left transition-all group"
            >
              <Sparkles className="w-5 h-5 text-[#34D399] mb-2" />
              <h4 className="text-sm font-semibold text-[#F8FAFC] group-hover:text-[#34D399]">
                Rekomposition
              </h4>
              <p className="text-xs text-[#94A3B8] mt-1">
                Fettabbau bei Muskelerhalt und hoher Erholungsqualität.
              </p>
            </button>
          </div>
        </div>
      )}

      {/* Coach Chat & Vision Workspace */}
      <div className="rounded-3xl bg-[#121821] border border-white/[0.08] flex flex-col h-[650px] overflow-hidden">
        {/* Quick Actions Header */}
        <div className="p-3 md:p-4 border-b border-white/[0.06] flex items-center gap-2 overflow-x-auto">
          <span className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider shrink-0 mr-1">
            Quick Actions:
          </span>
          <button
            onClick={() => onQuickAction("Mach das heutige Workout etwas leichter, ich fühle mich ermüdet.")}
            className="px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-xs text-[#F8FAFC] whitespace-nowrap transition-colors"
          >
            📉 Heute leichter machen
          </button>
          <button
            onClick={() => onQuickAction("Verschiebe mein Krafttraining auf morgen.")}
            className="px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-xs text-[#F8FAFC] whitespace-nowrap transition-colors"
          >
            🗓️ Session verschieben
          </button>
          <button
            onClick={() => onQuickAction("Erkläre mir meinen aktuellen 7-Tage HRV-Trend und was er für mein Training bedeutet.")}
            className="px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-xs text-[#F8FAFC] whitespace-nowrap transition-colors"
          >
            ❤️ HRV-Trend analysieren
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-xl bg-[#8B5CF6]/15 hover:bg-[#8B5CF6]/25 border border-[#8B5CF6]/30 text-xs text-[#A78BFA] whitespace-nowrap transition-colors flex items-center gap-1.5"
          >
            <Camera className="w-3.5 h-3.5" /> Plan-Foto importieren
          </button>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-2xl rounded-2xl p-4 text-xs md:text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-[#3B82F6] text-white"
                    : "bg-[#0B0F14] border border-white/[0.06] text-[#F8FAFC]"
                }`}
              >
                {m.images && m.images.length > 0 && (
                  <div className="flex gap-2 mb-3 overflow-x-auto">
                    {m.images.map((img, i) => (
                      <img
                        key={i}
                        src={img}
                        alt="Upload"
                        className="h-24 w-24 object-cover rounded-xl border border-white/10"
                      />
                    ))}
                  </div>
                )}
                <div className="whitespace-pre-wrap">{m.content}</div>
              </div>
            </div>
          ))}

          {isReplying && (
            <div className="flex justify-start">
              <div className="bg-[#0B0F14] border border-white/[0.06] rounded-2xl p-4 text-xs text-[#94A3B8] flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[#3B82F6]" />
                Coach analysiert Garmin-Metriken & berechnet Empfehlungen...
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-3 md:p-4 border-t border-white/[0.06] bg-[#0B0F14]/70 space-y-2">
          {attachedImages.length > 0 && (
            <div className="flex items-center gap-2 p-2 rounded-xl bg-[#121821] border border-white/[0.06]">
              {attachedImages.map((img, idx) => (
                <div key={idx} className="relative">
                  <img
                    src={img}
                    alt="Upload thumbnail"
                    className="h-12 w-12 object-cover rounded-lg border border-white/10"
                  />
                  <button
                    onClick={() => onRemoveImage(idx)}
                    className="absolute -top-1 -right-1 bg-rose-600 rounded-full p-0.5 text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <span className="text-[11px] text-[#94A3B8]">
                {attachedImages.length} Bild(er) angehängt
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={onSelectImages}
              multiple
              accept="image/*"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Foto hochladen"
              className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-[#94A3B8] transition-colors border border-white/[0.06]"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Frag deinen Coach, lade Trainingspläne hoch oder passe den Zyklus an..."
              className="flex-1 rounded-xl bg-[#121821] border border-white/[0.06] px-4 py-2.5 text-xs md:text-sm text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none focus:border-[#3B82F6]"
            />
            <button
              type="submit"
              disabled={(!inputVal.trim() && attachedImages.length === 0) || isReplying}
              className="h-10 w-10 flex items-center justify-center rounded-xl bg-[#3B82F6] hover:bg-blue-600 text-white disabled:opacity-40 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
