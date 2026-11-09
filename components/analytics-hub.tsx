"use client";

import React, { useState, useMemo } from "react";
import {
  Clock,
  Bike,
  Footprints,
  Waves,
  Dumbbell,
  Wind,
  Heart,
  Moon,
  BatteryCharging,
  Zap,
  TrendingUp,
  Filter,
  Search,
  ChevronRight,
  Flame,
  Calendar,
  Activity as ActivityIcon,
  BarChart3,
  SlidersHorizontal,
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
  ReferenceLine,
} from "recharts";
import { MockActivity, MockDailyMetric, MockAthleteProfile } from "@/lib/mock-data";

interface AnalyticsHubProps {
  metrics: MockDailyMetric[];
  activities: MockActivitiesProp[];
  profile: MockAthleteProfile | null;
  onSelectActivity: (activity: MockActivity) => void;
}

type MockActivitiesProp = MockActivity;

export function AnalyticsHub({
  metrics,
  activities,
  profile,
  onSelectActivity,
}: AnalyticsHubProps) {
  const [timeRange, setTimeRange] = useState<"7d" | "14d" | "30d">("14d");
  const [sportFilter, setSportFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const daysCount = timeRange === "7d" ? 7 : timeRange === "14d" ? 14 : 30;

  // Filter metrics according to selected time range
  const filteredMetrics = useMemo(() => {
    if (metrics.length === 0) return [];
    return metrics.slice(-daysCount);
  }, [metrics, daysCount]);

  // Filter activities according to time range and sport filter
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

  // Aggregate KPI numbers for the selected range
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

    const avgSleepScore =
      filteredMetrics.length > 0
        ? Math.round(
            filteredMetrics.reduce((acc, m) => acc + (m.sleepScore || 0), 0) / filteredMetrics.length
          )
        : "--";

    const avgHrvNight =
      filteredMetrics.length > 0
        ? Math.round(
            filteredMetrics.reduce((acc, m) => acc + (m.hrvLastNight || 0), 0) / filteredMetrics.length
          )
        : "--";

    const avgRestingHr =
      filteredMetrics.length > 0
        ? Math.round(
            filteredMetrics.reduce((acc, m) => acc + (m.restingHr || 0), 0) / filteredMetrics.length
          )
        : "--";

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

  // Load trend data for Recharts
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

  // HRV & RHR Trend
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

  // Sleep Breakdown Trend
  const sleepTrendData = useMemo(() => {
    return filteredMetrics.map((m) => {
      const parts = m.date.split("-");
      const totalH = parseFloat(((m.sleepDurationSec || 0) / 3600).toFixed(1));
      const deepH = parseFloat(((m.deepSleepSec || 0) / 3600).toFixed(1));
      const remH = parseFloat(((m.remSleepSec || 0) / 3600).toFixed(1));
      return {
        date: `${parts[2]}.${parts[1]}`,
        totalH,
        deepH,
        remH,
        score: m.sleepScore || 0,
      };
    });
  }, [filteredMetrics]);

  // Discipline stacked load chart
  const disciplineStackData = useMemo(() => {
    const mapByDate: Record<string, { Rad: number; Lauf: number; Schwimm: number; Gym: number; Recovery: number }> = {};
    filteredMetrics.forEach((m) => {
      mapByDate[m.date] = { Rad: 0, Lauf: 0, Schwimm: 0, Gym: 0, Recovery: 0 };
    });

    activities.forEach((act) => {
      const d = act.startTime.split("T")[0];
      if (!mapByDate[d]) return;
      const loadVal = act.tss || Math.round(act.durationSec / 60);
      if (act.isCommute) return;

      if (act.sportType === "running") mapByDate[d].Lauf += loadVal;
      else if (act.sportType === "swimming") mapByDate[d].Schwimm += loadVal;
      else if (act.sportType === "gym") mapByDate[d].Gym += loadVal;
      else if (act.sportType === "recovery") mapByDate[d].Recovery += 5;
      else mapByDate[d].Rad += loadVal;
    });

    return filteredMetrics.map((m) => {
      const parts = m.date.split("-");
      const loads = mapByDate[m.date] || { Rad: 0, Lauf: 0, Schwimm: 0, Gym: 0, Recovery: 0 };
      return {
        date: `${parts[2]}.${parts[1]}`,
        Rad: loads.Rad,
        Lauf: loads.Lauf,
        Schwimm: loads.Schwimm,
        Gym: loads.Gym,
      };
    });
  }, [filteredMetrics, activities]);

  const formatPace = (secPerKm?: number | null) => {
    if (!secPerKm) return "--:--";
    const mins = Math.floor(secPerKm / 60);
    const secs = Math.floor(secPerKm % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs} /km`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full pb-12">
      {/* Top Header & Range Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-zinc-100 flex items-center gap-2.5">
            <BarChart3 className="h-5 w-5 text-emerald-400" />
            Performance & Health Analytics
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Auswertung von Garmin Trainingsbelastung, Herzfrequenz, Schlaf und Erholungsstatus
          </p>
        </div>

        {/* Time Filter Pills */}
        <div className="flex items-center gap-1.5 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800">
          {(["7d", "14d", "30d"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg transition-colors ${
                timeRange === r
                  ? "bg-zinc-800 text-emerald-400 shadow-sm border border-zinc-700/60"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {r === "7d" ? "7 Tage" : r === "14d" ? "14 Tage" : "30 Tage"}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Overview Cards (Row of 6) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Trainingsdauer */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-4 backdrop-blur-md">
          <span className="text-[10px] uppercase font-mono text-zinc-500 block">Trainingszeit</span>
          <span className="text-2xl font-bold font-mono tabular-nums text-zinc-100 mt-1 block">
            {summaryKpis.hoursTotal}h
          </span>
          <span className="text-[10px] text-zinc-500 font-mono">Netto (exkl. Pendeln)</span>
        </div>

        {/* Gesamtdistanz */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-4 backdrop-blur-md">
          <span className="text-[10px] uppercase font-mono text-zinc-500 block">Gesamtdistanz</span>
          <span className="text-2xl font-bold font-mono tabular-nums text-zinc-100 mt-1 block">
            {summaryKpis.kmTotal} km
          </span>
          <span className="text-[10px] text-zinc-500 font-mono">Rad & Lauf</span>
        </div>

        {/* Garmin Belastung */}
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/10 p-4 backdrop-blur-md">
          <span className="text-[10px] uppercase font-mono text-emerald-400 block">Garmin Belastung</span>
          <span className="text-2xl font-bold font-mono tabular-nums text-emerald-400 mt-1 block">
            {summaryKpis.garminLoadTotal}
          </span>
          <span className="text-[10px] text-zinc-500 font-mono">Akkumulierter Load</span>
        </div>

        {/* Ø Schlafscore */}
        <div className="rounded-2xl border border-indigo-500/30 bg-indigo-950/10 p-4 backdrop-blur-md">
          <span className="text-[10px] uppercase font-mono text-indigo-400 block">Ø Schlafscore</span>
          <span className="text-2xl font-bold font-mono tabular-nums text-indigo-300 mt-1 block">
            {summaryKpis.avgSleepScore}
          </span>
          <span className="text-[10px] text-zinc-500 font-mono">Qualitäts-Index</span>
        </div>

        {/* Ø HRV Nacht */}
        <div className="rounded-2xl border border-rose-500/30 bg-rose-950/10 p-4 backdrop-blur-md">
          <span className="text-[10px] uppercase font-mono text-rose-400 block">Ø HRV Nacht</span>
          <span className="text-2xl font-bold font-mono tabular-nums text-rose-400 mt-1 block">
            {summaryKpis.avgHrvNight} ms
          </span>
          <span className="text-[10px] text-zinc-500 font-mono">Autonome Balance</span>
        </div>

        {/* Ø Ruhepuls */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-4 backdrop-blur-md">
          <span className="text-[10px] uppercase font-mono text-zinc-500 block">Ø Ruhepuls</span>
          <span className="text-2xl font-bold font-mono tabular-nums text-zinc-100 mt-1 block">
            {summaryKpis.avgRestingHr} bpm
          </span>
          <span className="text-[10px] text-zinc-500 font-mono">Erholungs-Indikator</span>
        </div>
      </div>

      {/* Chart Section 1: Akute Trainingsbelastung & Disziplin-Stack */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Akute Last Trend */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-zinc-200">Garmin Akute Trainingsbelastung</h3>
              <p className="text-xs text-zinc-500 font-mono">Optimaler Belastungskorridor & Readiness</p>
            </div>
            <span className="text-xs text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Optimal
            </span>
          </div>

          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={loadTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="date" stroke="#71717a" fontSize={11} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18181b",
                    borderColor: "#3f3f46",
                    borderRadius: "0.75rem",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="acuteLoad"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fill="#10b981"
                  fillOpacity={0.15}
                  name="Akute Belastung"
                />
                <Area
                  type="monotone"
                  dataKey="readiness"
                  stroke="#06b6d4"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  fill="none"
                  name="Readiness Score"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gestackte Belastung nach Sportart */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-zinc-200">Belastung nach Disziplinen</h3>
              <p className="text-xs text-zinc-500 font-mono">Tägliche Garmin Belastung gestackt</p>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-400">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Rad
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-500" /> Lauf
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-cyan-500" /> Schwimm
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-violet-500" /> Gym
              </span>
            </div>
          </div>

          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={disciplineStackData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="date" stroke="#71717a" fontSize={11} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18181b",
                    borderColor: "#3f3f46",
                    borderRadius: "0.75rem",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="Rad" stackId="a" fill="#10b981" />
                <Bar dataKey="Lauf" stackId="a" fill="#f59e0b" />
                <Bar dataKey="Schwimm" stackId="a" fill="#06b6d4" />
                <Bar dataKey="Gym" stackId="a" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Chart Section 2: HRV Trend & Schlafarchitektur */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* HRV Nacht & Ruhepuls */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-zinc-200">HRV (Nacht) & Ruhepuls (RHR)</h3>
              <p className="text-xs text-zinc-500 font-mono">Autonome Balance & Erholungs-Baseline</p>
            </div>
          </div>

          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={hrvTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="date" stroke="#71717a" fontSize={11} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18181b",
                    borderColor: "#3f3f46",
                    borderRadius: "0.75rem",
                    fontSize: "12px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="hrvNight"
                  stroke="#f43f5e"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  name="HRV Nacht (ms)"
                />
                <Line
                  type="monotone"
                  dataKey="hrvBaseline"
                  stroke="#a1a1aa"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                  name="7d Baseline (ms)"
                />
                <Line
                  type="monotone"
                  dataKey="restingHr"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  dot={false}
                  name="Ruhepuls (bpm)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Schlafphasen & Schlafkonsistenz */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-zinc-200">Schlafarchitektur & Phasen</h3>
              <p className="text-xs text-zinc-500 font-mono">Gesamtdauer, Tiefschlaf & REM-Phasen</p>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-400">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-indigo-500" /> Gesamt
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-purple-500" /> Tiefschlaf
              </span>
            </div>
          </div>

          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sleepTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="date" stroke="#71717a" fontSize={11} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={11} tickLine={false} domain={[0, 10]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18181b",
                    borderColor: "#3f3f46",
                    borderRadius: "0.75rem",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="totalH" fill="#6366f1" name="Gesamt (h)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="deepH" fill="#a855f7" name="Tiefschlaf (h)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detaillierte Aktivitäten-Tabelle mit Such- & Filterfunktion */}
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-5 backdrop-blur-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              <ActivityIcon className="h-4 w-4 text-emerald-400" />
              Aktivitäten im gewählten Zeitraum ({filteredActivities.length})
            </h3>
            <p className="text-xs text-zinc-400">
              Klicke auf eine Aktivität, um die vollständige Auswertungs- und Coach-Seite zu öffnen
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Aktivität suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-xl bg-zinc-950/80 border border-zinc-800 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-700 w-44"
              />
            </div>

            {/* Sport Filter Pills */}
            <div className="flex items-center gap-1 bg-zinc-950/80 p-1 rounded-xl border border-zinc-800">
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
                      ? "bg-zinc-800 text-zinc-100 font-semibold"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table List */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500 uppercase text-[10px]">
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
            <tbody className="divide-y divide-zinc-800/60">
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
                    className="hover:bg-zinc-800/40 cursor-pointer transition-colors group"
                  >
                    <td className="py-3 px-3 text-zinc-400 whitespace-nowrap">{dateStr}</td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] uppercase font-semibold ${
                          act.sportType === "running"
                            ? "bg-amber-500/15 text-amber-300"
                            : act.sportType === "swimming"
                            ? "bg-cyan-500/15 text-cyan-300"
                            : act.sportType === "gym"
                            ? "bg-violet-500/15 text-violet-300"
                            : act.sportType === "recovery"
                            ? "bg-teal-500/15 text-teal-300"
                            : act.sportType === "commute"
                            ? "bg-zinc-800 text-zinc-400"
                            : "bg-emerald-500/15 text-emerald-300"
                        }`}
                      >
                        {act.sportType === "road_cycling"
                          ? "Rennrad"
                          : act.sportType === "zwift"
                          ? "Zwift"
                          : act.sportType === "commute"
                          ? "Pendeln"
                          : act.sportType === "running"
                          ? "Lauf"
                          : act.sportType === "swimming"
                          ? "Schwimm"
                          : act.sportType === "gym"
                          ? "Gym"
                          : act.sportType === "recovery"
                          ? "Recovery"
                          : "Aktivität"}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-zinc-200 break-words max-w-xs font-sans">
                      {act.name}
                    </td>
                    <td className="py-3 px-3 text-zinc-300 whitespace-nowrap">
                      {Math.round(act.durationSec / 60)} min
                    </td>
                    <td className="py-3 px-3 text-zinc-300 whitespace-nowrap">
                      {act.distanceM > 0
                        ? act.sportType === "swimming"
                          ? `${Math.round(act.distanceM)} m`
                          : `${(act.distanceM / 1000).toFixed(1)} km`
                        : "--"}
                    </td>
                    <td className="py-3 px-3 text-rose-400 whitespace-nowrap">
                      {act.avgHr ? `${act.avgHr} bpm` : "--"}
                    </td>
                    <td className="py-3 px-3 font-bold text-emerald-400 whitespace-nowrap">
                      {loadVal > 0 ? loadVal : "--"}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400 group-hover:text-emerald-400 font-sans transition-colors">
                        Details öffnen <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </td>
                  </tr>
                );
              })}

              {filteredActivities.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-zinc-500 font-sans">
                    Keine Aktivitäten für die gewählten Filterkriterien gefunden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
