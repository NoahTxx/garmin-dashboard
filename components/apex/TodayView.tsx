import React from "react";
import {
  Moon,
  Heart,
  BatteryCharging,
  Zap,
  Activity,
  Flame,
  CloudSun,
  Dumbbell,
  Clock,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { TodayCockpitData } from "@/lib/apex-types";
import { MetricCard } from "./MetricCard";
import { HeroReadiness } from "./HeroReadiness";

interface TodayViewProps {
  data: TodayCockpitData;
  onNavigateTab: (tab: "today" | "training" | "analytics" | "coach" | "profile") => void;
  onStartWorkout?: () => void;
}

export function TodayView({ data, onNavigateTab, onStartWorkout }: TodayViewProps) {
  const formatDuration = (sec: number | null) => {
    if (!sec) return "--";
    const hours = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="space-y-6 md:space-y-8 pb-16">
      {/* 1. Header: Greeting & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wider font-semibold text-[#94A3B8] mb-1">
            {data.dateStr}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F8FAFC]">
            Guten Tag, {data.athleteName}
          </h1>
        </div>

        {/* Weather capsule if available */}
        {data.weather && (
          <div className="flex items-center gap-3 bg-[#121821] border border-white/[0.06] rounded-2xl px-4 py-2.5">
            <CloudSun className="w-5 h-5 text-[#38BDF8]" />
            <div className="flex flex-col text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#F8FAFC]">{data.weather.tempC}°C</span>
                <span className="text-[#94A3B8]">{data.weather.condition}</span>
              </div>
              <span className="text-[11px] text-[#64748B]">{data.weather.outdoorText}</span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Hero Readiness Cockpit */}
      <HeroReadiness
        score={data.readiness}
        label={data.readinessLabel}
        status={data.readinessStatus}
        recommendation={data.recommendation}
        onAskCoach={() => onNavigateTab("coach")}
      />

      {/* 3. Primary Workout Card for Today */}
      {data.workout && (
        <div className="rounded-2xl bg-gradient-to-r from-[#121821] to-[#17202C] border border-white/[0.08] p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#8B5CF6]/15 text-[#A78BFA] border border-[#8B5CF6]/20">
                {data.workout.type.toUpperCase()}
              </span>
              <span className="text-xs text-[#94A3B8] flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {data.workout.durationMin} Min
              </span>
              <span className="text-xs text-[#94A3B8]">· Intensität: {data.workout.intensity}</span>
            </div>
            <h3 className="text-lg md:text-xl font-bold text-[#F8FAFC]">
              {data.workout.title}
            </h3>
            <p className="text-xs md:text-sm text-[#94A3B8]">
              Fokus: {data.workout.focus}
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={onStartWorkout}
              className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 rounded-xl bg-[#3B82F6] hover:bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all"
            >
              <Dumbbell className="w-4 h-4" /> Start Workout
            </button>
            <button
              onClick={() => onNavigateTab("training")}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] px-4 py-2.5 text-sm font-medium text-[#F8FAFC] transition-colors"
            >
              Plan öffnen <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 4. Core Metrics Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-wide uppercase text-[#94A3B8]">
            Key Vitals & Recovery
          </h2>
          <button
            onClick={() => onNavigateTab("analytics")}
            className="text-xs text-[#3B82F6] hover:underline flex items-center gap-1"
          >
            Alle Trends anzeigen <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <MetricCard
            label="Schlaf Score"
            metric={data.metrics.sleepScore}
            icon={<Moon className="w-4 h-4" />}
            accent="success"
            onClick={() => onNavigateTab("analytics")}
          />
          <MetricCard
            label="Nacht HRV"
            metric={data.metrics.hrvLastNight}
            icon={<Heart className="w-4 h-4" />}
            accent={data.metrics.hrvLastNight.status === "OK" ? "success" : "default"}
            subValue={
              data.hrv30dAvg
                ? `${data.metrics.hrvLastNight.value ? (data.metrics.hrvLastNight.value >= data.hrv30dAvg ? "+" : "") + Math.round(((data.metrics.hrvLastNight.value - data.hrv30dAvg) / data.hrv30dAvg) * 100) : 0}% vs. 30-day average (${data.hrv30dAvg} ms)`
                : undefined
            }
            onClick={() => onNavigateTab("analytics")}
          />
          <MetricCard
            label="Body Battery"
            metric={data.metrics.bodyBattery}
            icon={<BatteryCharging className="w-4 h-4" />}
            accent="energy"
            subValue={
              data.bodyBatteryDetails?.lowest !== null && data.bodyBatteryDetails?.highest !== null
                ? `Low: ${data.bodyBatteryDetails?.lowest} · High: ${data.bodyBatteryDetails?.highest}`
                : undefined
            }
            onClick={() => onNavigateTab("analytics")}
          />
          <MetricCard
            label="Ruhepuls (RHR)"
            metric={data.metrics.restingHr}
            icon={<Activity className="w-4 h-4" />}
            onClick={() => onNavigateTab("analytics")}
          />
        </div>
      </div>

      {/* 5. Second Grid: Load, Activity & Sleep Architecture */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Sleep breakdown card */}
        <div className="rounded-2xl bg-[#121821] border border-white/[0.06] p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-medium text-[#94A3B8] mb-3">
              <span className="uppercase tracking-wider">Schlafphasen</span>
              <Moon className="w-4 h-4 text-[#64748B]" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-[#F8FAFC] mb-2">
              {formatDuration(data.metrics.sleepDurationSec.value)}
            </div>
            <p className="text-xs text-[#94A3B8] mb-4">
              {data.metrics.sleepScore.interpretation || "Regenerativer Schlafzyklus"}
            </p>
          </div>

          <div className="space-y-2 pt-3 border-t border-white/[0.04]">
            <div className="flex justify-between text-xs">
              <span className="text-[#94A3B8]">Tiefschlaf</span>
              <span className="font-semibold tabular-nums text-[#F8FAFC]">
                {formatDuration(data.metrics.deepSleepSec.value)}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[#94A3B8]">REM</span>
              <span className="font-semibold tabular-nums text-[#F8FAFC]">
                {formatDuration(data.metrics.remSleepSec.value)}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[#94A3B8]">Leichtschlaf</span>
              <span className="font-semibold tabular-nums text-[#F8FAFC]">
                {formatDuration(data.metrics.lightSleepSec.value)}
              </span>
            </div>
          </div>
        </div>

        {/* Load status card */}
        <div className="rounded-2xl bg-[#121821] border border-white/[0.06] p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-medium text-[#94A3B8] mb-3">
              <span className="uppercase tracking-wider">Trainingsbelastung</span>
              <Zap className="w-4 h-4 text-[#F59E0B]" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-[#F8FAFC] mb-2">
              {data.metrics.acuteLoad.value ?? "--"}
              <span className="text-xs font-normal text-[#94A3B8] ml-1.5">Akute Last</span>
            </div>
            <p className="text-xs text-[#94A3B8] mb-4">
              Chronische Last (Fitness): {data.metrics.chronicLoad.value ?? "--"}
            </p>
          </div>

          <div className="space-y-2 pt-3 border-t border-white/[0.04]">
            <div className="flex justify-between text-xs">
              <span className="text-[#94A3B8]">ACWR Ratio</span>
              <span className="font-semibold text-[#34D399]">1.05 (Optimal)</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[#94A3B8]">Stress Avg</span>
              <span className="font-semibold text-[#F8FAFC]">
                {data.metrics.stressAvg.value ?? "--"}/100
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[#94A3B8]">Status</span>
              <span className="text-[#34D399] font-medium">Produktiv</span>
            </div>
          </div>
        </div>

        {/* Activity & Energy card */}
        <div className="rounded-2xl bg-[#121821] border border-white/[0.06] p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-medium text-[#94A3B8] mb-3">
              <span className="uppercase tracking-wider">Aktivität & Energie</span>
              <Flame className="w-4 h-4 text-[#F87171]" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-[#F8FAFC] mb-2">
              {data.metrics.steps.value !== null ? (
                <>
                  <span className="tabular-nums">{data.metrics.steps.value.toLocaleString("de-DE")}</span>
                  <span className="text-xs font-normal text-[#94A3B8] ml-1.5">
                    / {data.stepsDetail?.goal?.toLocaleString("de-DE") || "8.000"} Schritte
                  </span>
                </>
              ) : (
                <span className="text-xl text-[#64748B]">No data</span>
              )}
            </div>
            <p className="text-xs text-[#94A3B8] mb-4">
              Aktive Kalorien: {data.metrics.activeCalories.value !== null ? `${data.metrics.activeCalories.value} kcal` : "No data"}
            </p>
          </div>

          <div className="space-y-2 pt-3 border-t border-white/[0.04]">
            <div className="flex justify-between text-xs">
              <span className="text-[#94A3B8]">Intensitätsminuten</span>
              <span className="font-semibold text-[#F8FAFC] tabular-nums">
                {data.metrics.intensityMinutes.value !== null ? `${data.metrics.intensityMinutes.value} / ${data.intensityMinutesDetail?.goal || 150} min` : "No data"}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[#94A3B8]">Gewicht</span>
              <span className="font-semibold text-[#F8FAFC] tabular-nums">
                {data.metrics.weightKg.value !== null ? `${data.metrics.weightKg.value} kg` : "No data"}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[#94A3B8]">Zielerreichung</span>
              <span className="text-[#34D399] font-medium tabular-nums">
                {data.metrics.steps.value !== null && data.stepsDetail?.goal
                  ? `${Math.round((data.metrics.steps.value / data.stepsDetail.goal) * 100)}%`
                  : "--"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Next Best Action */}
      <div className="rounded-2xl bg-[#121821] border border-white/[0.06] p-5 flex items-start sm:items-center gap-4">
        <div className="rounded-xl bg-[#3B82F6]/10 p-2.5 text-[#3B82F6] shrink-0">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-[#3B82F6]">
            Next Best Action · {data.nextBestAction.category.toUpperCase()}
          </span>
          <h4 className="text-sm font-semibold text-[#F8FAFC] mt-0.5">
            {data.nextBestAction.title}
          </h4>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            {data.nextBestAction.action}
          </p>
        </div>
        <button
          onClick={() => onNavigateTab("coach")}
          className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-[#94A3B8] hover:text-[#F8FAFC] shrink-0 transition-colors"
        >
          Details <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
