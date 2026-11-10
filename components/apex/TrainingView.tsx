import React from "react";
import {
  Clock,
  CheckCircle2,
  ChevronRight,
  Edit3,
  Play,
  Sparkles,
  Dumbbell,
  Upload,
  PlusCircle,
  Activity as ActivityIcon,
} from "lucide-react";
import { MockGymTemplate, MockPlannedWorkout, MockActivity } from "@/lib/mock-data";

interface TrainingViewProps {
  todayStr: string;
  plannedWorkouts: MockPlannedWorkout[];
  gymTemplates: MockGymTemplate[];
  recentActivities: MockActivity[];
  onOpenActivity: (act: MockActivity) => void;
  onEditGymPlan: (plan: MockGymTemplate) => void;
  onOpenCoach: () => void;
}

export function TrainingView({
  todayStr,
  plannedWorkouts,
  gymTemplates,
  recentActivities,
  onOpenActivity,
  onEditGymPlan,
  onOpenCoach,
}: TrainingViewProps) {
  const todayWorkout = plannedWorkouts.find((w) => w.date === todayStr) || plannedWorkouts[0];
  const gymTemplateMap = new Map(gymTemplates.map((t) => [t.code, t]));

  const getDayName = (dateStr: string) => {
    try {
      const d = new Date(dateStr + "T00:00:00");
      return d.toLocaleDateString("de-DE", { weekday: "short" });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 pb-16">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wider font-semibold text-[#8B5CF6] mb-1">
            Training Execution
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F8FAFC]">
            Trainingsplanung & Ausführung
          </h1>
        </div>
        <button
          onClick={onOpenCoach}
          className="inline-flex items-center gap-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] px-4 py-2 text-xs font-semibold text-[#F8FAFC] transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#8B5CF6]" />
          Woche neu generieren
        </button>
      </div>

      {/* 2. 7-Tage Timeline Strip */}
      <div className="rounded-2xl bg-[#121821] border border-white/[0.06] p-4 md:p-5">
        <div className="text-xs font-medium uppercase tracking-wider text-[#94A3B8] mb-3">
          7-Tage Trainingszyklus
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {plannedWorkouts.map((w, i) => {
            const isToday = w.date === todayStr;
            const isDone = w.status === "completed";
            return (
              <div
                key={w.id || i}
                className={`flex flex-col justify-between p-3 rounded-xl border text-xs transition-all ${
                  isToday
                    ? "bg-[#3B82F6]/10 border-[#3B82F6]/50 shadow-sm shadow-[#3B82F6]/10"
                    : "bg-[#0B0F14]/50 border-white/[0.04] hover:border-white/[0.1]"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-[#94A3B8] text-[11px] uppercase">
                    {getDayName(w.date)}
                  </span>
                  {isDone ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#34D399]" />
                  ) : isToday ? (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#3B82F6] text-white">
                      HEUTE
                    </span>
                  ) : null}
                </div>
                <div className="space-y-1">
                  <span className="font-semibold text-[#F8FAFC] line-clamp-1 block text-xs">
                    {w.title}
                  </span>
                  <span className="text-[11px] text-[#94A3B8] block">
                    {w.durationMin} Min · {w.sportType}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Today's Featured Workout Runner */}
      {todayWorkout && (() => {
        const linkedTemplate = todayWorkout.gymTemplateCode
          ? gymTemplateMap.get(todayWorkout.gymTemplateCode)
          : null;
        const exercises = linkedTemplate?.exercisesJson || [];

        return (
          <div className="rounded-3xl bg-[#121821] border border-white/[0.08] p-6 md:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/[0.06]">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#3B82F6]/15 text-[#60A5FA] border border-[#3B82F6]/20">
                    {todayWorkout.sportType.toUpperCase()}
                  </span>
                  <span className="text-xs text-[#94A3B8] flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {todayWorkout.durationMin} Minuten
                  </span>
                  {todayWorkout.gymTemplateCode && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#8B5CF6]/15 text-[#A78BFA] border border-[#8B5CF6]/20">
                      PLAN {todayWorkout.gymTemplateCode}
                    </span>
                  )}
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-[#F8FAFC]">
                  {todayWorkout.title}
                </h2>
                <p className="text-xs md:text-sm text-[#94A3B8] mt-1">
                  Fokus: {todayWorkout.description || "Gezielter Reiz zur Aufrechterhaltung der aeroben Basis."}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button className="inline-flex items-center gap-2 rounded-xl bg-[#3B82F6] hover:bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors">
                  <Play className="w-4 h-4 fill-white" /> Start Session
                </button>
                <button
                  onClick={onOpenCoach}
                  className="inline-flex items-center gap-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] px-4 py-2.5 text-sm font-medium text-[#F8FAFC] transition-colors"
                >
                  Verschieben / Anpassen
                </button>
              </div>
            </div>

            {/* Structured checklist preview */}
            {exercises.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">
                  Übungsablauf & Belastungsvorgaben
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {exercises.map((ex, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-[#0B0F14]/60 border border-white/[0.04]"
                    >
                      <div>
                        <span className="text-sm font-semibold text-[#F8FAFC] block">
                          {ex.name}
                        </span>
                        <span className="text-xs text-[#94A3B8]">
                          {ex.sets} Sätze × {ex.reps} Wdh · RIR: {ex.rir}
                        </span>
                      </div>
                      {ex.weightKg && (
                        <span className="text-xs font-semibold font-mono tabular-nums text-[#34D399]">
                          {ex.weightKg} kg
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* 4. Gym Plans Library (A/B/C) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-wide uppercase text-[#94A3B8]">
            Gym Plan Bibliothek (A / B / C)
          </h2>
          <button
            onClick={onOpenCoach}
            className="text-xs text-[#8B5CF6] hover:underline flex items-center gap-1"
          >
            Mit Coach optimieren <Sparkles className="w-3 h-3" />
          </button>
        </div>

        {gymTemplates.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/[0.08] bg-[#121821]/60 p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#8B5CF6]/10 text-[#8B5CF6] flex items-center justify-center mx-auto border border-[#8B5CF6]/20">
              <Dumbbell className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#F8FAFC]">No training plan yet</h3>
              <p className="text-xs text-[#94A3B8] max-w-md mx-auto mt-1">
                Create a personalized plan with your AI Coach or upload an existing plan photo.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={onOpenCoach}
                className="inline-flex items-center gap-2 rounded-xl bg-[#3B82F6] hover:bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors"
              >
                <PlusCircle className="w-4 h-4" /> Start Setup
              </button>
              <button
                onClick={onOpenCoach}
                className="inline-flex items-center gap-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] px-4 py-2 text-xs font-semibold text-[#F8FAFC] transition-colors"
              >
                <Upload className="w-4 h-4 text-[#8B5CF6]" /> Upload Plan Photo
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {gymTemplates.map((template) => (
              <div
                key={template.id}
                className="rounded-2xl bg-[#121821] border border-white/[0.06] p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#8B5CF6]/15 text-[#A78BFA] border border-[#8B5CF6]/20">
                      PLAN {template.code}
                    </span>
                    <span className="text-xs text-[#64748B]">
                      {template.exercisesJson?.length || 0} Übungen
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-[#F8FAFC]">{template.name}</h3>
                  <p className="text-xs text-[#94A3B8] mt-1 mb-4">
                    Fokus: {template.focusMuscles || "Ganzkörper & Stabilität"}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/[0.04] flex items-center justify-between">
                  <span className="text-xs text-[#64748B]">
                    {template.exercisesJson?.[0]?.name ? `Start: ${template.exercisesJson[0].name}` : "Leer"}
                  </span>
                  <button
                    onClick={() => onEditGymPlan(template)}
                    className="inline-flex items-center gap-1 text-xs text-[#3B82F6] hover:text-blue-400 font-medium"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Bearbeiten
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Recent Activity Stream */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold tracking-wide uppercase text-[#94A3B8]">
          Letzte Garmin Aktivitäten
        </h2>
        {recentActivities.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[1, 2, 3].map((idx) => (
              <div
                key={idx}
                className="rounded-2xl bg-[#121821]/40 border border-white/[0.04] p-5 flex flex-col justify-between h-32 animate-pulse"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase text-[#64748B]">Aktivität {idx}</span>
                  <ActivityIcon className="w-4 h-4 text-[#64748B]/40" />
                </div>
                <div className="text-xs text-[#64748B]">Waiting for Garmin activity data...</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04] rounded-2xl bg-[#121821] border border-white/[0.06] overflow-hidden">
            {recentActivities.slice(0, 5).map((act) => (
              <div
                key={act.activityId}
                onClick={() => onOpenActivity(act)}
                className="p-4 flex items-center justify-between hover:bg-white/[0.02] cursor-pointer transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase text-[#3B82F6]">
                      {act.sportType.replace("_", " ")}
                    </span>
                    <span className="text-xs text-[#64748B]">{act.startTime.split("T")[0]}</span>
                  </div>
                  <h4 className="text-sm font-semibold text-[#F8FAFC]">{act.name}</h4>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono tabular-nums">
                  {act.distanceM > 0 && act.sportType !== "recovery" && act.sportType !== "gym" && (
                    <span className="text-[#F8FAFC]">
                      {(act.distanceM / 1000).toFixed(1)} km
                    </span>
                  )}
                  {act.avgHr && (
                    <span className="text-[#94A3B8]">
                      {act.avgHr} bpm
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-[#64748B]" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
