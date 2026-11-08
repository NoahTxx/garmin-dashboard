"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Activity as ActivityIcon,
  Zap,
  Heart,
  Moon,
  BatteryCharging,
  Calendar,
  Dumbbell,
  RefreshCw,
  Download,
  CheckCircle2,
  Filter,
  Send,
  Sparkles,
  Bike,
  Waves,
  Coffee,
  Footprints,
  Edit3,
  X,
  Plus,
  Trash2,
  Clock,
  Flame,
  TrendingUp,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from "recharts";
import {
  MockAthleteProfile,
  MockDailyMetric,
  MockActivity,
  MockGymTemplate,
  MockPlannedWorkout,
  MockExercise,
} from "@/lib/mock-data";

export function DashboardApp() {
  const [activeTab, setActiveTab] = useState<"today" | "planner" | "chat" | "gym">("today");
  const [hideCommutes, setHideCommutes] = useState(true);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const [profile, setProfile] = useState<MockAthleteProfile | null>(null);
  const [metrics, setMetrics] = useState<MockDailyMetric[]>([]);
  const [activities, setActivities] = useState<MockActivity[]>([]);
  const [gymTemplates, setGymTemplates] = useState<MockGymTemplate[]>([]);
  const [plannedWorkouts, setPlannedWorkouts] = useState<MockPlannedWorkout[]>([]);
  const [todayStr, setTodayStr] = useState("2026-11-08");

  // Gym Editor Modal
  const [editingPlan, setEditingPlan] = useState<MockGymTemplate | null>(null);

  // Chat State
  const [messages, setMessages] = useState<Array<{ id: string; role: "user" | "assistant"; content: string }>>([
    {
      id: "m0",
      role: "assistant",
      content:
        "Willkommen im Performance & AI Coach System.\n\nIch sehe deine aktuellen Garmin-Metriken (HRV 73ms, Schlaf 88, Readiness 89), plane aber bewusst noch keine Einheiten ohne dein Briefing.\n\nBeantworte mir kurz:\n1. Was ist dein primäres Ziel (FTP-Steigerung, Halbmarathon, Triathlon oder Hypertrophie)?\n2. Wie viele Wochenstunden Trainingszeit hast du zur Verfügung?\n3. An welchen Tagen möchtest du deine 2 Gym-Einheiten einbauen?\n\nSobald du bereit bist, sag einfach 'Plane meine Woche' oder 'Erstelle mir jetzt eine Einheit'.",
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isAiReplying, setIsAiReplying] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setTodayStr(new Date().toISOString().split("T")[0]);
      const res = await fetch("/api/dashboard");
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
        setMetrics(data.metrics || []);
        setActivities(data.activities || []);
        setGymTemplates(data.gymTemplates || []);
        setPlannedWorkouts(data.plannedWorkouts || []);
      }
    } catch (e) {
      console.error("Dashboard fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleGarminSync = async () => {
    try {
      setSyncing(true);
      setSyncNotice(null);
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      setSyncNotice(data.message);
      await loadData();
    } catch {
      setSyncNotice("Netzwerkfehler beim Garmin Sync");
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncNotice(null), 5000);
    }
  };

  const handleAssignGym = async (activityId: string, templateId: number) => {
    try {
      await fetch("/api/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "link_gym",
          payload: { activityId, templateId },
        }),
      });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownloadZwo = (workout: MockPlannedWorkout) => {
    if (!workout.zwoXml) return;
    const blob = new Blob([workout.zwoXml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${workout.title.replace(/[^a-zA-Z0-9_-]/g, "_")}.zwo`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveGymPlan = async () => {
    if (!editingPlan) return;
    try {
      await fetch("/api/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_gym_template",
          payload: editingPlan,
        }),
      });
      setEditingPlan(null);
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputMessage;
    if (!textToSend.trim() || isAiReplying) return;

    const userMsg = {
      id: `u-${Date.now()}`,
      role: "user" as const,
      content: textToSend,
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputMessage("");
    setIsAiReplying(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newHistory.map((m) => ({ role: m.role, content: m.content })) }),
      });

      if (res.ok) {
        const replyText = await res.text();
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            content: replyText.trim() || "Analyse abgeschlossen.",
          },
        ]);
        await loadData();
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: "Verbindungsfehler zum AI Coach.",
        },
      ]);
    } finally {
      setIsAiReplying(false);
    }
  };

  // 14-Day HRV & Readiness Chart Data
  const hrvChartData = useMemo(() => {
    return metrics.map((m) => {
      const parts = m.date.split("-");
      const shortDate = `${parts[2]}.${parts[1]}`;
      return {
        date: shortDate,
        fullDate: m.date,
        hrvNight: m.hrvLastNight,
        hrvAvg: m.hrv7dAvg,
        readiness: m.trainingReadiness,
        balancedMin: 62,
        balancedMax: 74,
      };
    });
  }, [metrics]);

  // 14-Day Training Load Stacked Bar Data
  const loadChartData = useMemo(() => {
    const mapByDate: Record<string, { cycling: number; running: number; swimming: number; gym: number; commute: number }> = {};

    metrics.forEach((m) => {
      mapByDate[m.date] = { cycling: 0, running: 0, swimming: 0, gym: 0, commute: 0 };
    });

    activities.forEach((act) => {
      const d = act.startTime.split("T")[0];
      if (!mapByDate[d]) {
        mapByDate[d] = { cycling: 0, running: 0, swimming: 0, gym: 0, commute: 0 };
      }
      const val = act.tss || Math.round(act.durationSec / 60);

      if (act.isCommute) {
        mapByDate[d].commute += val;
      } else if (act.sportType === "running") {
        mapByDate[d].running += val;
      } else if (act.sportType === "swimming") {
        mapByDate[d].swimming += val;
      } else if (act.sportType === "gym") {
        mapByDate[d].gym += val;
      } else {
        mapByDate[d].cycling += val;
      }
    });

    return metrics.map((m) => {
      const parts = m.date.split("-");
      const shortDate = `${parts[2]}.${parts[1]}`;
      const loads = mapByDate[m.date] || { cycling: 0, running: 0, swimming: 0, gym: 0, commute: 0 };
      return {
        date: shortDate,
        fullDate: m.date,
        Rad: loads.cycling,
        Lauf: loads.running,
        Schwimm: loads.swimming,
        Gym: loads.gym,
        Pendeln: loads.commute,
      };
    });
  }, [metrics, activities]);

  const latestMetric = metrics[metrics.length - 1] || null;
  const todayWorkout = plannedWorkouts.find((w) => w.date === todayStr);
  const filteredActivities = activities.filter((a) => !hideCommutes || !a.isCommute);

  // Format pace helper (sec/km to min:sec /km)
  const formatPace = (secPerKm?: number | null) => {
    if (!secPerKm) return "--:--";
    const mins = Math.floor(secPerKm / 60);
    const secs = Math.floor(secPerKm % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs} /km`;
  };

  return (
    <div className="flex h-screen w-full bg-zinc-950 text-zinc-100 antialiased overflow-hidden font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex w-64 flex-col border-r border-zinc-800/80 bg-zinc-950/70 backdrop-blur-xl p-4 justify-between">
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2 pt-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 shadow-md shadow-emerald-500/20">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-wide text-zinc-100">AI Coach</h1>
              <p className="text-xs text-zinc-400 font-mono">Garmin & Zwift Sync</p>
            </div>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab("today")}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === "today"
                  ? "bg-zinc-800/90 text-white shadow-sm border border-zinc-700/60"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
              }`}
            >
              <ActivityIcon className="h-4 w-4 text-emerald-400" />
              Heute & Status
            </button>
            <button
              onClick={() => setActiveTab("planner")}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === "planner"
                  ? "bg-zinc-800/90 text-white shadow-sm border border-zinc-700/60"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
              }`}
            >
              <Calendar className="h-4 w-4 text-sky-400" />
              Wochenplaner
            </button>
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === "chat"
                  ? "bg-zinc-800/90 text-white shadow-sm border border-zinc-700/60"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
              }`}
            >
              <Sparkles className="h-4 w-4 text-purple-400" />
              AI Coach Chat
            </button>
            <button
              onClick={() => setActiveTab("gym")}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === "gym"
                  ? "bg-zinc-800/90 text-white shadow-sm border border-zinc-700/60"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
              }`}
            >
              <Dumbbell className="h-4 w-4 text-violet-400" />
              Gym Pläne (A/B/C)
            </button>
          </nav>
        </div>

        {/* Athlete Profile Footer */}
        <div className="space-y-3 rounded-xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-md p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Athletenstatus</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Sync Aktiv
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-zinc-500">Rad FTP</p>
              <p className="font-mono tabular-nums font-semibold text-zinc-200">{profile?.currentFtpW || 285} W</p>
            </div>
            <div>
              <p className="text-zinc-500">Lauf Schwellen-Pace</p>
              <p className="font-mono tabular-nums font-semibold text-amber-400">{formatPace(profile?.runThresholdPaceSec || 250)}</p>
            </div>
            <div>
              <p className="text-zinc-500">Ruhepuls</p>
              <p className="font-mono tabular-nums font-semibold text-zinc-200">{profile?.restingHr || 46} bpm</p>
            </div>
            <div>
              <p className="text-zinc-500">Gewicht</p>
              <p className="font-mono tabular-nums font-semibold text-zinc-200">{profile?.weightKg || 71.4} kg</p>
            </div>
          </div>
          <button
            onClick={handleGarminSync}
            disabled={syncing}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 py-2 text-xs font-medium text-zinc-200 disabled:opacity-50 transition-all border border-zinc-700/50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin text-emerald-400" : ""}`} />
            {syncing ? "Synchronisiere..." : "Garmin Jetzt Sync"}
          </button>
        </div>
      </aside>

      {/* MAIN VIEW */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="flex h-14 items-center justify-between border-b border-zinc-800/80 bg-zinc-950/80 px-4 md:px-6 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold tracking-wide text-zinc-100">
              {activeTab === "today" && "Performance Overview & Diagnostik"}
              {activeTab === "planner" && "7-Tage Trainingszyklus"}
              {activeTab === "chat" && "AI Head Coach (Diagnostiker & Planer)"}
              {activeTab === "gym" && "Gym Pläne (Hypertrophie, RIR & ZNS)"}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {syncNotice && (
              <span className="text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 rounded px-2.5 py-1">
                {syncNotice}
              </span>
            )}
            <button
              onClick={handleGarminSync}
              disabled={syncing}
              className="md:hidden flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200"
            >
              <RefreshCw className={`h-3 w-3 ${syncing ? "animate-spin text-emerald-400" : ""}`} />
              Sync
            </button>
          </div>
        </header>

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6 space-y-6">
          {/* TAB 1: HEUTE & STATUS */}
          {activeTab === "today" && (
            <div className="space-y-6 max-w-6xl mx-auto">
              {/* TOP KPI BENTO-GRID */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-4 relative overflow-hidden backdrop-blur-md">
                  <div className="flex items-center justify-between text-zinc-400 mb-2">
                    <span className="text-xs font-medium">Training Readiness</span>
                    <Zap className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-3xl font-bold tabular-nums text-emerald-400">
                      {latestMetric?.trainingReadiness || 89}
                    </span>
                    <span className="text-xs text-zinc-400">/ 100</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1">Bereit für harte Schwellen- & VO2max Reize</p>
                </div>

                <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-4 relative overflow-hidden backdrop-blur-md">
                  <div className="flex items-center justify-between text-zinc-400 mb-2">
                    <span className="text-xs font-medium">HRV Status</span>
                    <Heart className="h-4 w-4 text-rose-400" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-3xl font-bold tabular-nums text-zinc-100">
                      {latestMetric?.hrvLastNight || 73}
                    </span>
                    <span className="text-xs text-zinc-400 font-mono">ms (7d: {latestMetric?.hrv7dAvg || 68}ms)</span>
                  </div>
                  <span className="inline-block mt-1 text-[11px] font-medium text-emerald-400">
                    Ausgewogen (+5ms über Baseline)
                  </span>
                </div>

                <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-4 relative overflow-hidden backdrop-blur-md">
                  <div className="flex items-center justify-between text-zinc-400 mb-2">
                    <span className="text-xs font-medium">Schlaf Score</span>
                    <Moon className="h-4 w-4 text-indigo-400" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-3xl font-bold tabular-nums text-indigo-300">
                      {latestMetric?.sleepScore || 88}
                    </span>
                    <span className="text-xs text-zinc-400 font-mono">
                      {Math.floor((latestMetric?.sleepDurationSec || 28800) / 3600)}h{" "}
                      {Math.floor(((latestMetric?.sleepDurationSec || 28800) % 3600) / 60)}m
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1">Erholung: Tiefschlaf 1h 58m</p>
                </div>

                <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-4 relative overflow-hidden backdrop-blur-md">
                  <div className="flex items-center justify-between text-zinc-400 mb-2">
                    <span className="text-xs font-medium">Acute Load & Body Battery</span>
                    <BatteryCharging className="h-4 w-4 text-amber-400" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-3xl font-bold tabular-nums text-zinc-100">
                      {latestMetric?.acuteLoad || 780}
                    </span>
                    <span className="text-xs text-zinc-400 font-mono">BB Max {latestMetric?.bodyBatteryMax || 96}</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1">Rad: {profile?.currentFtpW || 285}W • Lauf: {formatPace(profile?.runThresholdPaceSec || 250)}</p>
                </div>
              </div>

              {/* RECHARTS SECTION: 14-TAGE TRENDS */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* 1. HRV & Readiness Spline Trend */}
                <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-4 md:p-5 backdrop-blur-md flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-200">HRV- & Readiness-Trend (14 Tage)</h3>
                      <p className="text-xs text-zinc-400">Nächtliche HRV vs. 7-Tage Baseline & Readiness-Score</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1.5 text-rose-400 font-medium">
                        <span className="h-2 w-2 rounded-full bg-rose-400" /> HRV Nacht
                      </span>
                      <span className="flex items-center gap-1.5 text-zinc-400 font-medium">
                        <span className="h-2 w-2 rounded-full bg-zinc-400" /> 7d Schnitt
                      </span>
                      <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                        <span className="h-2 w-2 rounded-full bg-emerald-400" /> Readiness
                      </span>
                    </div>
                  </div>

                  <div className="h-56 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={hrvChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="hrvGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                          </linearGradient>
                          <linearGradient id="readinessGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                        <XAxis dataKey="date" stroke="#71717a" fontSize={11} tickLine={false} />
                        <YAxis stroke="#71717a" fontSize={11} tickLine={false} domain={[40, 100]} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#18181b", borderColor: "#3f3f46", borderRadius: "0.75rem", fontSize: "12px" }}
                          labelStyle={{ color: "#a1a1aa" }}
                        />
                        <ReferenceLine y={68} stroke="#52525b" strokeDasharray="3 3" label={{ value: "Baseline", fill: "#71717a", fontSize: 10 }} />
                        <Area type="monotone" dataKey="hrvNight" stroke="#f43f5e" strokeWidth={2.5} fillOpacity={1} fill="url(#hrvGradient)" name="HRV (ms)" />
                        <Area type="monotone" dataKey="hrvAvg" stroke="#a1a1aa" strokeWidth={1.5} strokeDasharray="4 4" fill="none" name="7d Baseline" />
                        <Area type="monotone" dataKey="readiness" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#readinessGradient)" name="Readiness" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 2. Acute Load Stacked Bar Chart */}
                <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-4 md:p-5 backdrop-blur-md flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-200">Tägliche Belastung (TSS & Sportarten)</h3>
                      <p className="text-xs text-zinc-400">Verteilung über die letzten 14 Tage</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs flex-wrap">
                      <span className="flex items-center gap-1 text-emerald-400"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Rad</span>
                      <span className="flex items-center gap-1 text-amber-400"><span className="h-2 w-2 rounded-full bg-amber-500" /> Lauf</span>
                      <span className="flex items-center gap-1 text-cyan-400"><span className="h-2 w-2 rounded-full bg-cyan-500" /> Schwimm</span>
                      <span className="flex items-center gap-1 text-violet-400"><span className="h-2 w-2 rounded-full bg-violet-500" /> Gym</span>
                    </div>
                  </div>

                  <div className="h-56 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={loadChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                        <XAxis dataKey="date" stroke="#71717a" fontSize={11} tickLine={false} />
                        <YAxis stroke="#71717a" fontSize={11} tickLine={false} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#18181b", borderColor: "#3f3f46", borderRadius: "0.75rem", fontSize: "12px" }}
                          labelStyle={{ color: "#a1a1aa" }}
                        />
                        <Bar dataKey="Rad" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="Lauf" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="Schwimm" stackId="a" fill="#06b6d4" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="Gym" stackId="a" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* HEUTIGES TRAINING CARD */}
              <div className="rounded-2xl border border-zinc-800/90 bg-gradient-to-b from-zinc-900/80 to-zinc-900/40 p-5 md:p-6 backdrop-blur-md">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                        Heutiges Training
                      </span>
                      {todayWorkout?.syncedToZwift && (
                        <span className="text-xs text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20 flex items-center gap-1 font-mono">
                          <CheckCircle2 className="h-3 w-3" /> In Zwift synchronisiert
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg md:text-xl font-bold text-zinc-100">
                      {todayWorkout ? todayWorkout.title : "Ruhetag oder freie Ausfahrt"}
                    </h3>
                    <p className="text-xs md:text-sm text-zinc-400 max-w-2xl">
                      {todayWorkout?.description || "Kein strukturiertes Training geplant. Regeneriere oder bewege dich locker."}
                    </p>
                  </div>

                  {todayWorkout && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {todayWorkout.zwoXml && (
                        <button
                          onClick={() => handleDownloadZwo(todayWorkout)}
                          className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 px-3.5 py-2 text-xs font-medium text-zinc-200 transition-colors"
                        >
                          <Download className="h-3.5 w-3.5 text-sky-400" />
                          .zwo Datei
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setActiveTab("chat");
                          handleSendMessage("Passe mein heutiges Training an: Ich habe heute nur 45 Minuten Zeit.");
                        }}
                        className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3.5 py-2 text-xs font-medium text-white transition-colors"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        AI Coach anpassen
                      </button>
                    </div>
                  )}
                </div>

                {todayWorkout?.structuredStepsJson && (
                  <div className="mt-4 pt-2">
                    <p className="text-xs font-medium text-zinc-400 mb-2">Intervall-Profil (% FTP)</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-9 gap-2">
                      {todayWorkout.structuredStepsJson.map((step, idx) => (
                        <div
                          key={idx}
                          className={`rounded-lg p-2.5 border text-center transition-all ${
                            step.targetFtpPct >= 100
                              ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
                              : step.targetFtpPct >= 85
                              ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                              : "border-zinc-800 bg-zinc-900/60 text-zinc-300"
                          }`}
                        >
                          <span className="text-[10px] font-mono text-zinc-400 block truncate">
                            {Math.floor(step.durationSec / 60)}m
                          </span>
                          <span className="font-mono text-sm font-bold tabular-nums block">
                            {step.targetFtpPct}%
                          </span>
                          <span className="text-[10px] text-zinc-500 block truncate">{step.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ACTIVITY FEED WITH RUNNING SUPPORT & AUTO-COMMUTE FILTER */}
              <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 backdrop-blur-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ActivityIcon className="h-4 w-4 text-emerald-400" />
                    <h3 className="text-sm font-semibold text-zinc-200">Aktivitäten</h3>
                    <span className="text-xs text-zinc-500 font-mono">({filteredActivities.length})</span>
                  </div>

                  <button
                    onClick={() => setHideCommutes(!hideCommutes)}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                      hideCommutes
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                        : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <Filter className="h-3 w-3" />
                    Pendeln (ohne Watt) ausblenden: {hideCommutes ? "An" : "Aus"}
                  </button>
                </div>

                <div className="divide-y divide-zinc-800/60">
                  {filteredActivities.map((act) => (
                    <div
                      key={act.activityId}
                      className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-zinc-800/20 px-2 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
                            act.isCommute
                              ? "border-zinc-800 bg-zinc-900 text-zinc-400"
                              : act.sportType === "running"
                              ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                              : act.sportType === "swimming"
                              ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-400"
                              : act.sportType === "gym"
                              ? "border-violet-500/30 bg-violet-500/10 text-violet-400"
                              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                          }`}
                        >
                          {act.sportType === "running" ? (
                            <Footprints className="h-5 w-5" />
                          ) : act.sportType === "swimming" ? (
                            <Waves className="h-5 w-5" />
                          ) : act.sportType === "gym" ? (
                            <Dumbbell className="h-5 w-5" />
                          ) : (
                            <Bike className="h-5 w-5" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-zinc-200">{act.name}</span>
                            {act.isCommute && (
                              <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-mono">
                                Auto-Commute (0W)
                              </span>
                            )}
                            {act.sportType === "running" && (
                              <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded font-mono">
                                Lauf
                              </span>
                            )}
                            {act.linkedGymTemplateId && (
                              <span className="text-[10px] bg-violet-500/10 text-violet-400 border border-violet-500/30 px-1.5 py-0.5 rounded font-mono">
                                Plan {gymTemplates.find((t) => t.id === act.linkedGymTemplateId)?.code || "A"}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-zinc-400 mt-0.5 font-mono">
                            <span>{new Date(act.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                            <span>•</span>
                            <span>{Math.round(act.durationSec / 60)} min</span>
                            {act.distanceM > 0 && (
                              <>
                                <span>•</span>
                                <span>{(act.distanceM / 1000).toFixed(1)} km</span>
                              </>
                            )}
                            {act.sportType === "running" && act.avgPaceSecPerKm && (
                              <>
                                <span>•</span>
                                <span className="text-amber-400 font-semibold">{formatPace(act.avgPaceSecPerKm)}</span>
                              </>
                            )}
                            {act.avgPowerW ? (
                              <>
                                <span>•</span>
                                <span className="text-emerald-400 font-semibold">{act.avgPowerW} W</span>
                              </>
                            ) : null}
                            {act.avgCadence ? (
                              <>
                                <span>•</span>
                                <span>{act.avgCadence} {act.sportType === "running" ? "spm" : "rpm"}</span>
                              </>
                            ) : null}
                            {act.elevationGainM > 0 && (
                              <>
                                <span>•</span>
                                <span>{Math.round(act.elevationGainM)}m D+</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 1-Click Gym Linker */}
                      {act.sportType === "gym" && (
                        <div className="flex items-center gap-2 self-start md:self-center">
                          <span className="text-xs text-zinc-400">Plan zuweisen:</span>
                          <div className="flex gap-1">
                            {gymTemplates.map((t) => (
                              <button
                                key={t.id}
                                onClick={() => handleAssignGym(act.activityId, t.id)}
                                className={`px-2.5 py-1 text-xs rounded font-medium transition-colors font-mono ${
                                  act.linkedGymTemplateId === t.id
                                    ? "bg-violet-600 text-white font-bold"
                                    : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                                }`}
                              >
                                {t.code}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: WOCHENPLANER */}
          {activeTab === "planner" && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-zinc-100">7-Tage Trainingszyklus</h3>
                  <p className="text-xs text-zinc-400">
                    Polarisiertes Ausdauertraining, HRV-Monitoring und Interferenz-Vermeidung
                  </p>
                </div>
                <button
                  onClick={() => {
                    setActiveTab("chat");
                    handleSendMessage("Plane meine Woche: Erstelle mir einen optimalen 7-Tage-Trainingsplan mit 2x Rad, 1x Laufen, 2x Gym und 1x Schwimmen.");
                  }}
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-white transition-all shadow-md shadow-emerald-600/20"
                >
                  <Sparkles className="h-4 w-4" />
                  Woche von AI planen lassen
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                {plannedWorkouts.map((workout) => {
                  const isToday = workout.date === todayStr;
                  return (
                    <div
                      key={workout.id}
                      className={`rounded-2xl border p-4 flex flex-col justify-between transition-all ${
                        isToday
                          ? "border-emerald-500/60 bg-emerald-950/20 ring-1 ring-emerald-500/40"
                          : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700"
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-mono font-bold ${isToday ? "text-emerald-400" : "text-zinc-400"}`}>
                            {new Date(workout.date).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" })}
                          </span>
                          {workout.sportType === "running" ? (
                            <Footprints className="h-3.5 w-3.5 text-amber-400" />
                          ) : workout.sportType === "gym" ? (
                            <Dumbbell className="h-3.5 w-3.5 text-violet-400" />
                          ) : workout.sportType === "swimming" ? (
                            <Waves className="h-3.5 w-3.5 text-cyan-400" />
                          ) : workout.sportType === "rest" ? (
                            <Coffee className="h-3.5 w-3.5 text-zinc-500" />
                          ) : (
                            <Bike className="h-3.5 w-3.5 text-emerald-400" />
                          )}
                        </div>

                        <div>
                          <h4 className="text-sm font-semibold text-zinc-100 line-clamp-2">{workout.title}</h4>
                          <p className="text-[11px] text-zinc-400 line-clamp-3 mt-1">{workout.description}</p>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-xs font-mono">
                        <span className="font-semibold tabular-nums text-zinc-300">
                          {workout.durationMin > 0 ? `${workout.durationMin} min` : "Rest"}
                        </span>
                        {workout.targetTss > 0 && (
                          <span className="text-[10px] text-zinc-400">TSS {workout.targetTss}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: AI COACH CHAT (DIAGNOSTIKER & PLANER) */}
          {activeTab === "chat" && (
            <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-8.5rem)] rounded-2xl border border-zinc-800/80 bg-zinc-900/40 backdrop-blur-md overflow-hidden">
              <div className="flex items-center justify-between border-b border-zinc-800/80 p-3.5 bg-zinc-950/60">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-zinc-100">AI Head Coach</h3>
                    <p className="text-[10px] text-zinc-400">Strikter Diagnostiker & Trainingsplaner</p>
                  </div>
                </div>

                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleSendMessage("Plane meine Woche")}
                    className="text-[11px] rounded-lg border border-emerald-500/40 bg-emerald-950/30 text-emerald-300 px-2.5 py-1 hover:bg-emerald-900/40"
                  >
                    Woche jetzt planen
                  </button>
                  <button
                    onClick={() => handleSendMessage("Erstelle mir jetzt eine Einheit für heute")}
                    className="text-[11px] rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-zinc-300 hover:bg-zinc-800"
                  >
                    Heute planen
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl p-4 text-xs md:text-sm leading-relaxed ${
                        m.role === "user"
                          ? "bg-emerald-600 text-white rounded-br-none shadow-md"
                          : "bg-zinc-800/85 text-zinc-200 border border-zinc-700/60 rounded-bl-none shadow-sm"
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{m.content}</div>
                    </div>
                  </div>
                ))}
                {isAiReplying && (
                  <div className="flex justify-start">
                    <div className="bg-zinc-800/60 border border-zinc-700/40 rounded-2xl p-3 text-xs text-zinc-400 flex items-center gap-2">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                      Coach analysiert physiologische Parameter...
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3 border-t border-zinc-800/80 bg-zinc-950/80">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Frag den Coach oder sag 'Plane meine Woche'..."
                    className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-2.5 text-xs md:text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/50"
                  />
                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || isAiReplying}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 transition-colors"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 4: GYM PLÄNE A/B/C (DETAILLIERTE TABELLEN & MODAL EDITOR) */}
          {activeTab === "gym" && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-zinc-100">Gym Pläne A, B & C</h3>
                  <p className="text-xs text-zinc-400">
                    Mechanische Spannung, saubere RIR-Vorgaben und gezielte ZNS-Schonung fürs Ausdauertraining.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {gymTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 flex flex-col justify-between backdrop-blur-sm"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/30 font-bold font-mono text-sm">
                            {template.code}
                          </span>
                          <div>
                            <h4 className="text-sm font-bold text-zinc-100">{template.name}</h4>
                            <p className="text-[11px] text-zinc-400">{template.focusMuscles}</p>
                          </div>
                        </div>
                        <span className="text-[11px] font-mono text-zinc-400">
                          ZNS: <strong className="text-zinc-200">{template.estimatedCnsFatigue}/10</strong>
                        </span>
                      </div>

                      {/* Detail Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="text-zinc-500 border-b border-zinc-800/60 pb-1">
                              <th className="font-medium pb-1.5">Übung</th>
                              <th className="font-medium pb-1.5 text-center">Sätze × Wdh</th>
                              <th className="font-medium pb-1.5 text-center">RIR</th>
                              <th className="font-medium pb-1.5 text-right">Gewicht</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-800/40">
                            {template.exercisesJson.map((ex, i) => (
                              <tr key={i} className="hover:bg-zinc-800/30">
                                <td className="py-2 pr-2">
                                  <span className="font-semibold text-zinc-200 block">{ex.name}</span>
                                  {ex.muscleGroup && (
                                    <span className="text-[10px] text-zinc-500 block">{ex.muscleGroup}</span>
                                  )}
                                  {ex.note && <span className="text-[10px] text-zinc-400 block italic">{ex.note}</span>}
                                </td>
                                <td className="py-2 text-center font-mono tabular-nums text-zinc-300">
                                  {ex.sets} × {ex.reps}
                                </td>
                                <td className="py-2 text-center font-mono tabular-nums text-amber-400 font-semibold">
                                  {ex.rir}
                                </td>
                                <td className="py-2 text-right font-mono tabular-nums text-zinc-300">
                                  {ex.weightKg || "--"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <button
                      onClick={() => setEditingPlan(JSON.parse(JSON.stringify(template)))}
                      className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 py-2 text-xs font-medium text-zinc-200 transition-colors"
                    >
                      <Edit3 className="h-3.5 w-3.5 text-violet-400" />
                      Plan bearbeiten & Gewichte anpassen
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* GYM PLAN EDITOR MODAL */}
        {editingPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900 p-5 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="text-sm font-bold text-zinc-100">
                  Plan {editingPlan.code} bearbeiten ({editingPlan.name})
                </h3>
                <button onClick={() => setEditingPlan(null)} className="text-zinc-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-zinc-400 block mb-1">Plan Name</label>
                    <input
                      type="text"
                      value={editingPlan.name}
                      onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 block mb-1">Muskelfokus</label>
                    <input
                      type="text"
                      value={editingPlan.focusMuscles}
                      onChange={(e) => setEditingPlan({ ...editingPlan, focusMuscles: e.target.value })}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-zinc-100"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-300">Übungen</span>
                    <button
                      onClick={() => {
                        const newEx: MockExercise = {
                          name: "Neue Übung",
                          sets: 3,
                          reps: "8-10",
                          rir: 2,
                          weightKg: "",
                        };
                        setEditingPlan({
                          ...editingPlan,
                          exercisesJson: [...editingPlan.exercisesJson, newEx],
                        });
                      }}
                      className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300"
                    >
                      <Plus className="h-3.5 w-3.5" /> Übung hinzufügen
                    </button>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {editingPlan.exercisesJson.map((ex, idx) => (
                      <div key={idx} className="flex items-center gap-2 rounded-lg border border-zinc-800/80 bg-zinc-950/60 p-2 text-xs">
                        <input
                          type="text"
                          value={ex.name}
                          onChange={(e) => {
                            const updated = [...editingPlan.exercisesJson];
                            updated[idx].name = e.target.value;
                            setEditingPlan({ ...editingPlan, exercisesJson: updated });
                          }}
                          placeholder="Übungsname"
                          className="flex-1 rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-zinc-100"
                        />
                        <input
                          type="number"
                          value={ex.sets}
                          onChange={(e) => {
                            const updated = [...editingPlan.exercisesJson];
                            updated[idx].sets = parseInt(e.target.value) || 1;
                            setEditingPlan({ ...editingPlan, exercisesJson: updated });
                          }}
                          placeholder="Sätze"
                          className="w-12 rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-zinc-100 text-center font-mono"
                        />
                        <input
                          type="text"
                          value={ex.reps}
                          onChange={(e) => {
                            const updated = [...editingPlan.exercisesJson];
                            updated[idx].reps = e.target.value;
                            setEditingPlan({ ...editingPlan, exercisesJson: updated });
                          }}
                          placeholder="Wdh"
                          className="w-16 rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-zinc-100 text-center font-mono"
                        />
                        <input
                          type="number"
                          value={ex.rir}
                          onChange={(e) => {
                            const updated = [...editingPlan.exercisesJson];
                            updated[idx].rir = parseInt(e.target.value) || 0;
                            setEditingPlan({ ...editingPlan, exercisesJson: updated });
                          }}
                          placeholder="RIR"
                          className="w-12 rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-amber-400 text-center font-mono font-semibold"
                        />
                        <input
                          type="text"
                          value={ex.weightKg || ""}
                          onChange={(e) => {
                            const updated = [...editingPlan.exercisesJson];
                            updated[idx].weightKg = e.target.value;
                            setEditingPlan({ ...editingPlan, exercisesJson: updated });
                          }}
                          placeholder="Gewicht"
                          className="w-20 rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-zinc-100 text-center font-mono"
                        />
                        <button
                          onClick={() => {
                            const updated = editingPlan.exercisesJson.filter((_, i) => i !== idx);
                            setEditingPlan({ ...editingPlan, exercisesJson: updated });
                          }}
                          className="text-zinc-500 hover:text-rose-400 p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  onClick={() => setEditingPlan(null)}
                  className="rounded-lg border border-zinc-700 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleSaveGymPlan}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
                >
                  Änderungen speichern
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MOBILE NAVIGATION BAR */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur-lg flex items-center justify-around px-2 z-50">
          <button
            onClick={() => setActiveTab("today")}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg text-[10px] font-medium transition-colors ${
              activeTab === "today" ? "text-emerald-400" : "text-zinc-400"
            }`}
          >
            <ActivityIcon className="h-4 w-4" />
            Heute
          </button>
          <button
            onClick={() => setActiveTab("planner")}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg text-[10px] font-medium transition-colors ${
              activeTab === "planner" ? "text-sky-400" : "text-zinc-400"
            }`}
          >
            <Calendar className="h-4 w-4" />
            Planer
          </button>
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg text-[10px] font-medium transition-colors ${
              activeTab === "chat" ? "text-purple-400" : "text-zinc-400"
            }`}
          >
            <Sparkles className="h-4 w-4" />
            AI Coach
          </button>
          <button
            onClick={() => setActiveTab("gym")}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg text-[10px] font-medium transition-colors ${
              activeTab === "gym" ? "text-violet-400" : "text-zinc-400"
            }`}
          >
            <Dumbbell className="h-4 w-4" />
            Gym
          </button>
        </nav>
      </main>
    </div>
  );
}
