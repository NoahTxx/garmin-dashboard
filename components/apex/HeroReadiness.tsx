import React from "react";
import { Sparkles, ArrowRight, ShieldCheck, AlertTriangle, BatteryCharging } from "lucide-react";
import { ApexMetric } from "@/lib/apex-types";

interface HeroReadinessProps {
  score: ApexMetric<number>;
  label: "Ready to train" | "Moderate" | "Recover / Rest";
  status: "success" | "warning" | "critical";
  recommendation: {
    title: string;
    description: string;
    reasoning: string[];
  };
  onAskCoach?: () => void;
}

export function HeroReadiness({
  score,
  label,
  status,
  recommendation,
  onAskCoach,
}: HeroReadinessProps) {
  const isMissing = score.status === "MISSING" || score.value === null;

  const statusConfig = {
    success: {
      color: "#34D399",
      bgLight: "bg-emerald-500/10",
      border: "border-emerald-500/30",
      text: "text-[#34D399]",
      badge: "High Capacity",
      icon: <ShieldCheck className="w-4 h-4 text-[#34D399]" />,
    },
    warning: {
      color: "#F59E0B",
      bgLight: "bg-amber-500/10",
      border: "border-amber-500/30",
      text: "text-[#F59E0B]",
      badge: "Moderate Load",
      icon: <BatteryCharging className="w-4 h-4 text-[#F59E0B]" />,
    },
    critical: {
      color: "#F87171",
      bgLight: "bg-rose-500/10",
      border: "border-rose-500/30",
      text: "text-[#F87171]",
      badge: "Recovery Needed",
      icon: <AlertTriangle className="w-4 h-4 text-[#F87171]" />,
    },
  }[status];

  return (
    <div className="relative overflow-hidden rounded-3xl bg-[#121821] border border-white/[0.08] p-6 md:p-8">
      {/* Background radial glow */}
      <div
        className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full opacity-15 blur-3xl transition-all"
        style={{ backgroundColor: statusConfig.color }}
      />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
        {/* Left: Large Readiness Number + Status */}
        <div className="flex items-center gap-6 md:gap-8">
          <div className="relative flex flex-col items-center justify-center">
            {isMissing ? (
              <div className="w-24 h-24 md:w-28 md:h-28 rounded-full border border-white/10 flex items-center justify-center text-[#64748B] text-lg font-medium">
                --
              </div>
            ) : (
              <div className="relative flex items-center justify-center">
                <svg className="w-28 h-28 md:w-32 md:h-32 -rotate-90">
                  <circle
                    cx="60"
                    cy="60"
                    r="48"
                    className="stroke-white/[0.06]"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="48"
                    stroke={statusConfig.color}
                    strokeWidth="8"
                    strokeDasharray={301.6}
                    strokeDashoffset={301.6 - (301.6 * (score.value ?? 0)) / 100}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl md:text-5xl font-bold tracking-tight tabular-nums text-[#F8FAFC]">
                    {score.value}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-[#94A3B8] tracking-widest mt-0.5">
                    Score
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusConfig.bgLight} ${statusConfig.text} border ${statusConfig.border}`}
              >
                {statusConfig.icon}
                {statusConfig.badge}
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-[#F8FAFC]">
              {label}
            </h2>
            <p className="text-xs md:text-sm text-[#94A3B8] mt-1 max-w-sm">
              {isMissing
                ? "Keine Readiness-Daten von Garmin synchronisiert. Bitte Garmin Sync prüfen."
                : `Trainingsbereitschaft berechnet aus Schlafqualität, 7d-HRV-Status und akuter Belastung.`}
            </p>
          </div>
        </div>

        {/* Right: Recommendation + Actionable reasoning */}
        <div className="flex-1 lg:max-w-xl bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider font-semibold text-[#8B5CF6] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Empfehlung für Heute
            </span>
            {onAskCoach && (
              <button
                onClick={onAskCoach}
                className="text-xs text-[#94A3B8] hover:text-[#F8FAFC] flex items-center gap-1 transition-colors"
              >
                Coach fragen <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          <h3 className="text-base md:text-lg font-semibold text-[#F8FAFC]">
            {recommendation.title}
          </h3>
          <p className="text-xs md:text-sm text-[#94A3B8] mt-1 leading-relaxed">
            {recommendation.description}
          </p>

          {recommendation.reasoning.length > 0 && (
            <div className="mt-3.5 pt-3 border-t border-white/[0.04] flex flex-wrap gap-2">
              {recommendation.reasoning.map((item, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-white/[0.04] text-[#94A3B8] border border-white/[0.04]"
                >
                  • {item}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
