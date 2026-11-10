"use client";

import React, { useState, useMemo } from "react";
import {
  Clock,
  Bike,
  Heart,
  Moon,
  BatteryCharging,
  Zap,
  TrendingUp,
  Search,
  ChevronRight,
  Flame,
  Activity as ActivityIcon,
  BarChart3,
  Trophy,
  Scale,
  Award,
  Layers,
  Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { MockActivity, MockDailyMetric, MockAthleteProfile } from "@/lib/mock-data";

interface AnalyticsHubProps {
  metrics: MockDailyMetric[];
  activities: MockActivity[];
  profile: MockAthleteProfile | null;
  onSelectActivity: (activity: MockActivity) => void;
}

type SectionKey =
  | "overview"
  | "sleep"
  | "recovery"
  | "performance"
  | "racing"
  | "body"
  | "activities"
  | "records";

export function AnalyticsHub({
  metrics,
  activities,
  profile,
  onSelectActivity,
}: AnalyticsHubProps) {
  const [activeSection, setActiveSection] = useState<SectionKey>("overview");
  const [timeRange, setTimeRange] = useState<"7d" | "14d" | "30d">("14d");
  const [sportFilter, setSportFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const daysCount = timeRange === "7d" ? 7 : timeRange === "14d" ? 14 : 30;

  // Filtered metrics by time range
  const filteredMetrics = useMemo(() => {
    if (metrics.length === 0) return [];
    return metrics.slice(-daysCount);
  }, [metrics, daysCount]);

  // Filtered activities by time range and sport filter
  const filteredActivities = useMemo(() => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysCount);

    return activities.filter((act) => {
      const actDate = new Date(act.startTime);
      const inRange = actDate >= cutoffDate;
      const matchesSport =
        sportFilter === "all" ||
        (sportFilter === "bike" && (act.sportType === "road_cycling" || act.sportType === "zwift")) ||
        (sportFilter === "run" && act.sportType === "running") ||
        (sportFilter === "swim" && act.sportType === "swimming") ||
        (sportFilter === "gym" && act.sportType === "gym") ||
        (sportFilter === "recovery" && act.sportType === "recovery");

      const matchesSearch = !searchQuery || act.name.toLowerCase().includes(searchQuery.toLowerCase());

      return inRange && matchesSport && matchesSearch;
    });
  }, [activities, daysCount, sportFilter, searchQuery]);

  // Authentically calculated KPI numbers
  const summaryKpis = useMemo(() => {
    let totalSec = 0;
    let totalDistKm = 0;
    let totalGarminLoad = 0;
    let totalCalories = 0;

    filteredActivities.forEach((act) => {
      if (!act.isCommute) {
        totalSec += act.durationSec;
        totalDistKm += (act.distanceM || 0) / 1000;
        totalGarminLoad += act.tss || (act.rawJson?.garminLoad || 0);
        totalCalories += act.calories || 0;
      }
    });

    const sleepScoreVals = filteredMetrics.map((m) => m.sleepScore).filter((v): v is number => v !== null && v !== undefined);
    const avgSleepScore =
      sleepScoreVals.length > 0
        ? Math.round(sleepScoreVals.reduce((a, b) => a + b, 0) / sleepScoreVals.length)
        : null;

    const hrvVals = filteredMetrics.map((m) => m.hrvLastNight).filter((v): v is number => v !== null && v !== undefined && v > 0);
    const avgHrvNight =
      hrvVals.length > 0
        ? Math.round(hrvVals.reduce((a, b) => a + b, 0) / hrvVals.length)
        : null;

    const rhrVals = filteredMetrics.map((m) => m.restingHr).filter((v): v is number => v !== null && v !== undefined && v > 0);
    const avgRestingHr =
      rhrVals.length > 0
        ? Math.round(rhrVals.reduce((a, b) => a + b, 0) / rhrVals.length)
        : null;

    return {
      hoursTotal: (totalSec / 3600).toFixed(1),
      kmTotal: totalDistKm.toFixed(1),
      garminLoadTotal: Math.round(totalGarminLoad),
      caloriesTotal: totalCalories,
      avgSleepScore,
      avgHrvNight,
      avgRestingHr,
      activityCount: filteredActivities.length,
    };
  }, [filteredActivities, filteredMetrics]);

  // Chart series
  const loadTrendData = useMemo(() => {
    return filteredMetrics.map((m) => {
      const parts = m.date.split("-");
      return {
        date: `${parts[2]}.${parts[1]}`,
        acuteLoad: m.acuteLoad || 0,
        readiness: m.trainingReadiness || 0,
      };
    });
  }, [filteredMetrics]);

  const hrvTrendData = useMemo(() => {
    return filteredMetrics.map((m) => {
      const parts = m.date.split("-");
      return {
        date: `${parts[2]}.${parts[1]}`,
        hrvNight: m.hrvLastNight || 0,
        hrvBaseline: m.hrv7dAvg || 0,
        restingHr: m.restingHr || 0,
      };
    });
  }, [filteredMetrics]);

  const sleepTrendData = useMemo(() => {
    return filteredMetrics.map((m) => {
      const parts = m.date.split("-");
      const totalH = m.sleepDurationSec ? parseFloat((m.sleepDurationSec / 3600).toFixed(1)) : 0;
      const deepH = m.deepSleepSec ? parseFloat((m.deepSleepSec / 3600).toFixed(1)) : 0;
      const remH = m.remSleepSec ? parseFloat((m.remSleepSec / 3600).toFixed(1)) : 0;
      return {
        date: `${parts[2]}.${parts[1]}`,
        totalH,
        deepH,
        remH,
        score: m.sleepScore || 0,
      };
    });
  }, [filteredMetrics]);

  const bodyBatteryTrendData = useMemo(() => {
    return filteredMetrics.map((m) => {
      const parts = m.date.split("-");
      return {
        date: `${parts[2]}.${parts[1]}`,
        max: m.bodyBatteryMax || 0,
        min: m.bodyBatteryMin || 0,
        stress: m.stressAvg || 0,
      };
    });
  }, [filteredMetrics]);

  // Personal Records calculated from authentic Garmin activities
  const personalRecords = useMemo(() => {
    let longestRide = 0;
    let longestRun = 0;
    let maxPower = 0;
    let maxHrOverall = 0;

    activities.forEach((act) => {
      const dist = (act.distanceM || 0) / 1000;
      if (act.sportType === "road_cycling" || act.sportType === "zwift") {
        if (dist > longestRide) longestRide = dist;
      }
      if (act.sportType === "running") {
        if (dist > longestRun) longestRun = dist;
      }
      if (act.maxHr && act.maxHr > maxHrOverall) maxHrOverall = act.maxHr;
      if (act.avgPowerW && act.avgPowerW > maxPower) maxPower = act.avgPowerW;
    });

    return {
      longestRide: longestRide > 0 ? `${longestRide.toFixed(1)} km` : "No data",
      longestRun: longestRun > 0 ? `${longestRun.toFixed(1)} km` : "No data",
      maxPower: maxPower > 0 ? `${maxPower} W` : "No data",
      maxHrOverall: maxHrOverall > 0 ? `${maxHrOverall} bpm` : "No data",
      currentFtp: profile?.currentFtpW ? `${profile.currentFtpW} W` : "No data",
    };
  }, [activities, profile]);

  const sections: Array<{ id: SectionKey; label: string; icon: React.ReactNode }> = [
    { id: "overview", label: "Overview", icon: <BarChart3 className="w-3.5 h-3.5" /> },
    { id: "sleep", label: "Sleep", icon: <Moon className="w-3.5 h-3.5" /> },
    { id: "recovery", label: "Recovery", icon: <Heart className="w-3.5 h-3.5" /> },
    { id: "performance", label: "Performance", icon: <Zap className="w-3.5 h-3.5" /> },
    { id: "racing", label: "Racing", icon: <Trophy className="w-3.5 h-3.5" /> },
    { id: "body", label: "Body", icon: <Scale className="w-3.5 h-3.5" /> },
    { id: "activities", label: "Activities", icon: <ActivityIcon className="w-3.5 h-3.5" /> },
    { id: "records", label: "Records", icon: <Award className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full pb-16">
      {/* 1. Header & Section Navigation Bar */}
      <div className="flex flex-col gap-4 border-b border-white/[0.06] pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider font-semibold text-[#8B5CF6] mb-1">
              Garmin Analytics Hub
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F8FAFC]">
              Health & Performance Intelligence
            </h1>
          </div>

          {/* Time range selector */}
          <div className="flex items-center gap-1.5 bg-[#121821] p-1 rounded-xl border border-white/[0.06]">
            {(["7d", "14d", "30d"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg transition-colors ${
                  timeRange === r
                    ? "bg-[#17202C] text-[#3B82F6] shadow-sm border border-white/[0.08]"
                    : "text-[#94A3B8] hover:text-[#F8FAFC]"
                }`}
              >
                {r === "7d" ? "7 Tage" : r === "14d" ? "14 Tage" : "30 Tage"}
              </button>
            ))}
          </div>
        </div>

        {/* 8 Dedicated Garmin Section Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                activeSection === s.id
                  ? "bg-[#3B82F6]/15 text-[#60A5FA] border border-[#3B82F6]/30 shadow-sm"
                  : "bg-[#121821] text-[#94A3B8] hover:text-[#F8FAFC] border border-white/[0.04]"
              }`}
            >
              {s.icon}
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Section: Overview */}
      {activeSection === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="rounded-2xl border border-white/[0.06] bg-[#121821] p-4">
              <span className="text-[10px] uppercase font-mono text-[#64748B] block">Trainingszeit</span>
              <span className="text-2xl font-bold font-mono tabular-nums text-[#F8FAFC] mt-1 block">
                {summaryKpis.hoursTotal}h
              </span>
              <span className="text-[10px] text-[#64748B] font-mono">Netto (exkl. Pendeln)</span>
            </div>

            <div className="rounded-2xl border border-white/[0.06] bg-[#121821] p-4">
              <span className="text-[10px] uppercase font-mono text-[#64748B] block">Gesamtdistanz</span>
              <span className="text-2xl font-bold font-mono tabular-nums text-[#F8FAFC] mt-1 block">
                {summaryKpis.kmTotal} km
              </span>
              <span className="text-[10px] text-[#64748B] font-mono">Rad & Lauf</span>
            </div>

            <div className="rounded-2xl border border-white/[0.06] bg-[#121821] p-4">
              <span className="text-[10px] uppercase font-mono text-[#34D399] block">Garmin Belastung</span>
              <span className="text-2xl font-bold font-mono tabular-nums text-[#34D399] mt-1 block">
                {summaryKpis.garminLoadTotal > 0 ? summaryKpis.garminLoadTotal : "--"}
              </span>
              <span className="text-[10px] text-[#64748B] font-mono">Akkumulierter Load</span>
            </div>

            <div className="rounded-2xl border border-white/[0.06] bg-[#121821] p-4">
              <span className="text-[10px] uppercase font-mono text-[#818CF8] block">Ø Schlafscore</span>
              <span className="text-2xl font-bold font-mono tabular-nums text-[#A5B4FC] mt-1 block">
                {summaryKpis.avgSleepScore !== null ? summaryKpis.avgSleepScore : "--"}
              </span>
              <span className="text-[10px] text-[#64748B] font-mono">Qualitäts-Index</span>
            </div>

            <div className="rounded-2xl border border-white/[0.06] bg-[#121821] p-4">
              <span className="text-[10px] uppercase font-mono text-[#F87171] block">Ø HRV Nacht</span>
              <span className="text-2xl font-bold font-mono tabular-nums text-[#F87171] mt-1 block">
                {summaryKpis.avgHrvNight !== null ? `${summaryKpis.avgHrvNight} ms` : "--"}
              </span>
              <span className="text-[10px] text-[#64748B] font-mono">Autonome Balance</span>
            </div>

            <div className="rounded-2xl border border-white/[0.06] bg-[#121821] p-4">
              <span className="text-[10px] uppercase font-mono text-[#64748B] block">Ø Ruhepuls</span>
              <span className="text-2xl font-bold font-mono tabular-nums text-[#F8FAFC] mt-1 block">
                {summaryKpis.avgRestingHr !== null ? `${summaryKpis.avgRestingHr} bpm` : "--"}
              </span>
              <span className="text-[10px] text-[#64748B] font-mono">Erholungs-Indikator</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-3xl border border-white/[0.06] bg-[#121821] p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-[#F8FAFC]">Garmin Akute Trainingsbelastung</h3>
                  <p className="text-xs text-[#64748B] font-mono">Optimaler Belastungskorridor & Readiness</p>
                </div>
                <span className="text-xs text-[#34D399] font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Garmin API
                </span>
              </div>
              <div className="h-56 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={loadTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                    <XAxis dataKey="date" stroke="#64748B" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: "#0B0F14", borderColor: "#334155", borderRadius: "0.75rem", fontSize: "12px" }} />
                    <Area type="monotone" dataKey="acuteLoad" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.2} name="Akute Last" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-3xl border border-white/[0.06] bg-[#121821] p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-[#F8FAFC]">Herzfrequenzvariabilität (HRV) & RHR</h3>
                  <p className="text-xs text-[#64748B] font-mono">Parasympathischer Erholungszustand</p>
                </div>
                <span className="text-xs text-[#F87171] font-mono bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                  Nacht-HRV
                </span>
              </div>
              <div className="h-56 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={hrvTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                    <XAxis dataKey="date" stroke="#64748B" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: "#0B0F14", borderColor: "#334155", borderRadius: "0.75rem", fontSize: "12px" }} />
                    <Line type="monotone" dataKey="hrvNight" stroke="#F87171" strokeWidth={2} dot={{ r: 3, fill: "#F87171" }} name="HRV Nacht (ms)" />
                    <Line type="monotone" dataKey="restingHr" stroke="#38BDF8" strokeWidth={2} dot={false} name="Ruhepuls (bpm)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Section: Sleep */}
      {activeSection === "sleep" && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-white/[0.06] bg-[#121821] p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs uppercase font-semibold text-[#818CF8] tracking-wider">
                  Schlafarchitektur & Phasenanalyse
                </span>
                <h3 className="text-lg font-bold text-[#F8FAFC] mt-0.5">
                  Garmin Sleep Data & Phasenverteilung
                </h3>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono text-[#94A3B8]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#6366F1]" /> Gesamt (h)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#A855F7]" /> Tiefschlaf (h)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#38BDF8]" /> REM (h)
                </span>
              </div>
            </div>

            <div className="h-64 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sleepTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748B" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={11} tickLine={false} domain={[0, 10]} />
                  <Tooltip contentStyle={{ backgroundColor: "#0B0F14", borderColor: "#334155", borderRadius: "0.75rem", fontSize: "12px" }} />
                  <Bar dataKey="totalH" fill="#6366F1" name="Gesamt (h)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="deepH" fill="#A855F7" name="Tiefschlaf (h)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="remH" fill="#38BDF8" name="REM (h)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* 4. Section: Recovery */}
      {activeSection === "recovery" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-3xl border border-white/[0.06] bg-[#121821] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs uppercase font-semibold text-[#8B5CF6] tracking-wider">
                    Body Battery & Stress
                  </span>
                  <h3 className="text-base font-bold text-[#F8FAFC] mt-0.5">
                    Garmin Body Battery Min / Max
                  </h3>
                </div>
                <BatteryCharging className="w-5 h-5 text-[#8B5CF6]" />
              </div>
              <div className="h-56 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={bodyBatteryTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                    <XAxis dataKey="date" stroke="#64748B" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748B" fontSize={11} tickLine={false} domain={[0, 100]} />
                    <Tooltip contentStyle={{ backgroundColor: "#0B0F14", borderColor: "#334155", borderRadius: "0.75rem", fontSize: "12px" }} />
                    <Area type="monotone" dataKey="max" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.2} name="Body Battery Max" />
                    <Area type="monotone" dataKey="min" stroke="#EC4899" fill="#EC4899" fillOpacity={0.1} name="Body Battery Min" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-3xl border border-white/[0.06] bg-[#121821] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs uppercase font-semibold text-[#34D399] tracking-wider">
                    Ruhepuls & Stress
                  </span>
                  <h3 className="text-base font-bold text-[#F8FAFC] mt-0.5">
                    Durchschnittlicher Stresspegel
                  </h3>
                </div>
                <Heart className="w-5 h-5 text-[#F87171]" />
              </div>
              <div className="h-56 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={bodyBatteryTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                    <XAxis dataKey="date" stroke="#64748B" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748B" fontSize={11} tickLine={false} domain={[0, 100]} />
                    <Tooltip contentStyle={{ backgroundColor: "#0B0F14", borderColor: "#334155", borderRadius: "0.75rem", fontSize: "12px" }} />
                    <Line type="monotone" dataKey="stress" stroke="#F59E0B" strokeWidth={2} dot={{ r: 3, fill: "#F59E0B" }} name="Ø Stresspegel" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Section: Performance */}
      {activeSection === "performance" && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-white/[0.06] bg-[#121821] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs uppercase font-semibold text-[#3B82F6] tracking-wider">
                  Trainingsbereitschaft & Last
                </span>
                <h3 className="text-lg font-bold text-[#F8FAFC] mt-0.5">
                  Garmin Training Readiness vs. Acute Load
                </h3>
              </div>
              <Zap className="w-5 h-5 text-[#3B82F6]" />
            </div>
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={loadTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748B" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "#0B0F14", borderColor: "#334155", borderRadius: "0.75rem", fontSize: "12px" }} />
                  <Area type="monotone" dataKey="readiness" stroke="#34D399" fill="#34D399" fillOpacity={0.2} name="Readiness Score" />
                  <Area type="monotone" dataKey="acuteLoad" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.15} name="Acute Load" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* 6. Section: Racing */}
      {activeSection === "racing" && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-white/[0.06] bg-[#121821] p-6 space-y-4">
            <div>
              <span className="text-xs uppercase font-semibold text-[#EAB308] tracking-wider">
                Race Readiness & Forecasts
              </span>
              <h3 className="text-lg font-bold text-[#F8FAFC] mt-0.5">
                Garmin Wettkampf-Prognosen & Schwellenwerte
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-[#0B0F14]/70 border border-white/[0.04]">
                <span className="text-xs text-[#94A3B8] block">Laktatschwelle (LTHR)</span>
                <span className="text-xl font-bold font-mono text-[#F8FAFC] mt-1 block">
                  {profile?.lthr ? `${profile.lthr} bpm` : "No data"}
                </span>
                <span className="text-[10px] text-[#64748B]">Garmin Heart Rate Zones</span>
              </div>
              <div className="p-4 rounded-2xl bg-[#0B0F14]/70 border border-white/[0.04]">
                <span className="text-xs text-[#94A3B8] block">FTP (Radleistung)</span>
                <span className="text-xl font-bold font-mono text-[#3B82F6] mt-1 block">
                  {profile?.currentFtpW ? `${profile.currentFtpW} W` : "No data"}
                </span>
                <span className="text-[10px] text-[#64748B]">
                  {profile?.weightKg && profile?.currentFtpW
                    ? `${(profile.currentFtpW / profile.weightKg).toFixed(2)} W/kg`
                    : "Garmin Connect"}
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-[#0B0F14]/70 border border-white/[0.04]">
                <span className="text-xs text-[#94A3B8] block">Laufschwellen-Pace</span>
                <span className="text-xl font-bold font-mono text-[#34D399] mt-1 block">
                  {profile?.runThresholdPaceSec
                    ? `${Math.floor(profile.runThresholdPaceSec / 60)}:${(profile.runThresholdPaceSec % 60).toString().padStart(2, "0")} /km`
                    : "No data"}
                </span>
                <span className="text-[10px] text-[#64748B]">Garmin Threshold Pace</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. Section: Body */}
      {activeSection === "body" && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-white/[0.06] bg-[#121821] p-6 space-y-4">
            <div>
              <span className="text-xs uppercase font-semibold text-[#8B5CF6] tracking-wider">
                Körperdaten & Zusammensetzung
              </span>
              <h3 className="text-lg font-bold text-[#F8FAFC] mt-0.5">
                Garmin Index & User Summary
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-[#0B0F14]/70 border border-white/[0.04]">
                <span className="text-xs text-[#94A3B8] block">Körpergewicht</span>
                <span className="text-2xl font-bold font-mono text-[#F8FAFC] mt-1 block">
                  {profile?.weightKg ? `${profile.weightKg} kg` : "No data"}
                </span>
                <span className="text-[10px] text-[#64748B]">Garmin Connect Endpoint get_user_summary</span>
              </div>
              <div className="p-4 rounded-2xl bg-[#0B0F14]/70 border border-white/[0.04]">
                <span className="text-xs text-[#94A3B8] block">Maximaler Puls</span>
                <span className="text-2xl font-bold font-mono text-[#F87171] mt-1 block">
                  {profile?.maxHr ? `${profile.maxHr} bpm` : "No data"}
                </span>
                <span className="text-[10px] text-[#64748B]">Garmin User Summary</span>
              </div>
              <div className="p-4 rounded-2xl bg-[#0B0F14]/70 border border-white/[0.04]">
                <span className="text-xs text-[#94A3B8] block">Basaler Ruhepuls</span>
                <span className="text-2xl font-bold font-mono text-[#38BDF8] mt-1 block">
                  {profile?.restingHr ? `${profile.restingHr} bpm` : "No data"}
                </span>
                <span className="text-[10px] text-[#64748B]">Garmin User Summary</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. Section: Activities */}
      {activeSection === "activities" && (
        <div className="rounded-3xl border border-white/[0.06] bg-[#121821] p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
            <div>
              <h3 className="text-sm font-semibold text-[#F8FAFC] flex items-center gap-2">
                <ActivityIcon className="w-4 h-4 text-[#3B82F6]" />
                Aktivitäten im gewählten Zeitraum ({filteredActivities.length})
              </h3>
              <p className="text-xs text-[#94A3B8]">
                Garmin Aktivitäten aus get_activities. Klicke für Detailanalyse.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Aktivität suchen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs rounded-xl bg-[#0B0F14] border border-white/[0.06] text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6] w-44"
                />
              </div>

              <div className="flex items-center gap-1 bg-[#0B0F14] p-1 rounded-xl border border-white/[0.06]">
                {[
                  { key: "all", label: "Alle" },
                  { key: "bike", label: "Rad" },
                  { key: "run", label: "Lauf" },
                  { key: "swim", label: "Schwimm" },
                  { key: "gym", label: "Gym" },
                  { key: "recovery", label: "Recovery" },
                ].map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setSportFilter(s.key)}
                    className={`px-2.5 py-1 text-[11px] font-mono rounded-lg transition-colors ${
                      sportFilter === s.key
                        ? "bg-[#121821] text-[#F8FAFC] font-semibold border border-white/[0.06]"
                        : "text-[#94A3B8] hover:text-[#F8FAFC]"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-white/[0.06] text-[#64748B] uppercase text-[10px]">
                  <th className="py-2.5 px-3">Datum / Start</th>
                  <th className="py-2.5 px-3">Sportart</th>
                  <th className="py-2.5 px-3">Aktivitätsname</th>
                  <th className="py-2.5 px-3">Dauer</th>
                  <th className="py-2.5 px-3">Distanz</th>
                  <th className="py-2.5 px-3">Ø Puls</th>
                  <th className="py-2.5 px-3">Belastung</th>
                  <th className="py-2.5 px-3 text-right">Aktion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredActivities.map((act) => {
                  const actDate = new Date(act.startTime);
                  const dateStr = !isNaN(actDate.getTime())
                    ? actDate.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }) +
                      " " +
                      actDate.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
                    : "";

                  const loadVal = act.sportType !== "recovery" ? (act.tss || act.rawJson?.garminLoad || 0) : 0;

                  return (
                    <tr
                      key={act.activityId}
                      onClick={() => onSelectActivity(act)}
                      className="hover:bg-white/[0.02] cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-3 text-[#94A3B8] whitespace-nowrap">{dateStr}</td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] uppercase font-semibold bg-[#3B82F6]/15 text-[#60A5FA] border border-[#3B82F6]/20">
                          {act.sportType.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-semibold text-[#F8FAFC] break-words max-w-xs font-sans">
                        {act.name}
                      </td>
                      <td className="py-3 px-3 text-[#94A3B8] whitespace-nowrap">
                        {Math.round(act.durationSec / 60)} min
                      </td>
                      <td className="py-3 px-3 text-[#F8FAFC] whitespace-nowrap tabular-nums">
                        {act.distanceM > 0 && act.sportType !== "recovery" && act.sportType !== "gym"
                          ? act.sportType === "swimming"
                            ? `${Math.round(act.distanceM)} m`
                            : `${(act.distanceM / 1000).toFixed(1)} km`
                          : "--"}
                      </td>
                      <td className="py-3 px-3 text-[#F87171] whitespace-nowrap tabular-nums">
                        {act.avgHr ? `${act.avgHr} bpm` : "--"}
                      </td>
                      <td className="py-3 px-3 font-bold text-[#34D399] whitespace-nowrap tabular-nums">
                        {loadVal > 0 ? Math.round(loadVal) : "--"}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-[11px] text-[#94A3B8] group-hover:text-[#3B82F6] font-sans transition-colors">
                          Öffnen <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {filteredActivities.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-[#64748B]">
                      Keine Garmin Aktivitäten im gewählten Zeitraum gefunden.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 9. Section: Records */}
      {activeSection === "records" && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-white/[0.06] bg-[#121821] p-6 space-y-4">
            <div>
              <span className="text-xs uppercase font-semibold text-[#34D399] tracking-wider">
                Garmin Personal Records & Bestleistungen
              </span>
              <h3 className="text-lg font-bold text-[#F8FAFC] mt-0.5">
                Authentische Höchstwerte aus deinen Aktivitäten
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-[#0B0F14]/70 border border-white/[0.04]">
                <span className="text-xs text-[#94A3B8] block">Längste Radfahrt</span>
                <span className="text-xl font-bold font-mono text-[#3B82F6] mt-1 block">
                  {personalRecords.longestRide}
                </span>
                <span className="text-[10px] text-[#64748B]">Garmin Aktivitätsdaten</span>
              </div>
              <div className="p-4 rounded-2xl bg-[#0B0F14]/70 border border-white/[0.04]">
                <span className="text-xs text-[#94A3B8] block">Längster Lauf</span>
                <span className="text-xl font-bold font-mono text-[#34D399] mt-1 block">
                  {personalRecords.longestRun}
                </span>
                <span className="text-[10px] text-[#64748B]">Garmin Aktivitätsdaten</span>
              </div>
              <div className="p-4 rounded-2xl bg-[#0B0F14]/70 border border-white/[0.04]">
                <span className="text-xs text-[#94A3B8] block">Höchste Maximal-HF</span>
                <span className="text-xl font-bold font-mono text-[#F87171] mt-1 block">
                  {personalRecords.maxHrOverall}
                </span>
                <span className="text-[10px] text-[#64748B]">Garmin Max HR</span>
              </div>
              <div className="p-4 rounded-2xl bg-[#0B0F14]/70 border border-white/[0.04]">
                <span className="text-xs text-[#94A3B8] block">Max. Durchschnittsleistung</span>
                <span className="text-xl font-bold font-mono text-[#8B5CF6] mt-1 block">
                  {personalRecords.maxPower}
                </span>
                <span className="text-[10px] text-[#64748B]">Power Meter / Smart Trainer</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
