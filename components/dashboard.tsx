"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Gauge,
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
  CloudSun,
  Wind,
  Droplets,
  ChevronRight,
  Paperclip,
  Image as ImageIcon,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  PieChart,
  ShieldCheck,
  Check,
  Smile,
  Compass,
  TrendingUp,
  Target,
  ZapOff,
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
import { ActivityDetail } from "./activity-detail";
import { AnalyticsHub } from "./analytics-hub";

interface WeatherData {
  current: {
    temp: number;
    apparentTemp: number;
    humidity: number;
    windKmH: number;
    rain: number;
    weatherCode: number;
    precipProb: number;
    outdoorIndex: "green" | "yellow" | "red";
    outdoorText: string;
  };
  forecast6h: Array<{
    time: string;
    temp: number;
    precipProb: number;
    windKmH: number;
    weatherCode: number;
  }>;
}

export function DashboardApp() {
  const [activeTab, setActiveTab] = useState<"briefing" | "analytics" | "chat" | "planner" | "gym">("briefing");
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
  const [mountedTime, setMountedTime] = useState<number | null>(null);

  // Weather state
  const [weather, setWeather] = useState<WeatherData | null>(null);

  // Modals & Inspections
  const [selectedActivity, setSelectedActivity] = useState<MockActivity | null>(null);
  const [editingPlan, setEditingPlan] = useState<MockGymTemplate | null>(null);

  // Chat & Image Upload State
  const [messages, setMessages] = useState<
    Array<{
      id: string;
      role: "user" | "assistant";
      content: string;
      images?: string[];
    }>
  >([
    {
      id: "m0",
      role: "assistant",
      content:
        "Willkommen im Performance & AI Coach System.\n\nSetup-Status: Bitte lade deine 3 Gym-Pläne als Screenshot/Foto hoch (Büroklammer-Icon) oder nenne mir deine Ziel- und Eckdaten. Ich lese Übungen und RIR per Vision aus und konfiguriere dein Profil.",
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [isAiReplying, setIsAiReplying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    try {
      setLoading(true);

      const [dashRes, weatherRes] = await Promise.all([
        fetch("/api/dashboard"),
        fetch("/api/weather?lat=52.5584&lon=13.0914"),
      ]);

      if (dashRes.ok) {
        const data = await dashRes.json();
        setProfile(data.profile);
        setMetrics(data.metrics || []);
        setActivities(data.activities || []);
        setGymTemplates(data.gymTemplates || []);
        setPlannedWorkouts(data.plannedWorkouts || []);
      }

      if (weatherRes.ok) {
        const wData = await weatherRes.json();
        setWeather(wData);
      }
    } catch (e) {
      console.error("Dashboard fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setTodayStr(new Date().toISOString().split("T")[0]);
    setMountedTime(Date.now());
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
      await fetch("/api/gym", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "link_activity",
          payload: { activityId, templateId },
        }),
      });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveGymPlan = async () => {
    if (!editingPlan) return;
    try {
      await fetch("/api/gym", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_template",
          payload: editingPlan,
        }),
      });
      setEditingPlan(null);
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

  // Image Upload Handlers
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const remainingSlots = 4 - attachedImages.length;
    const selected = Array.from(files).slice(0, remainingSlots);

    selected.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setAttachedImages((prev) => [...prev.slice(0, 3), event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1 && attachedImages.length < 4) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            if (event.target?.result) {
              setAttachedImages((prev) => [...prev, event.target!.result as string]);
            }
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  // Chat message submission
  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputMessage;
    if ((!textToSend.trim() && attachedImages.length === 0) || isAiReplying) return;

    const userMsg = {
      id: `u-${Date.now()}`,
      role: "user" as const,
      content: textToSend || "Analysiere diese Gym-Plan Screenshots:",
      images: attachedImages.length > 0 ? [...attachedImages] : undefined,
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputMessage("");
    const sentImages = [...attachedImages];
    setAttachedImages([]);
    setIsAiReplying(true);

    try {
      // Build Vercel AI SDK content payload (supports text + image parts)
      const payloadMessages = newHistory.map((m) => {
        if (m.images && m.images.length > 0) {
          const contentParts: any[] = [{ type: "text", text: m.content }];
          m.images.forEach((img) => {
            contentParts.push({ type: "image", image: img });
          });
          return { role: m.role, content: contentParts };
        }
        return { role: m.role, content: m.content };
      });

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: payloadMessages }),
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

  const latestMetric = metrics[metrics.length - 1] || null;
  const todayWorkout = plannedWorkouts.find((w) => w.date === todayStr);
  const filteredActivities = activities.filter((a) => !hideCommutes || !a.isCommute);

  // Sleep breakdown percentages (safe without mock flash)
  const sleepDuration = latestMetric?.sleepDurationSec || 0;
  const deepSleep = latestMetric?.deepSleepSec || 0;
  const remSleep = latestMetric?.remSleepSec || 0;
  const lightSleep = Math.max(0, sleepDuration - deepSleep - remSleep);

  const deepPct = sleepDuration > 0 ? Math.round((deepSleep / sleepDuration) * 100) : 0;
  const remPct = sleepDuration > 0 ? Math.round((remSleep / sleepDuration) * 100) : 0;
  const lightPct = sleepDuration > 0 ? Math.round((lightSleep / sleepDuration) * 100) : 0;

  // Garmin Performance & Readiness Stats
  const performanceStats = useMemo(() => {
    const acuteLoad = latestMetric?.acuteLoad || (activities.length > 0 ? Math.round(activities.slice(0, 7).reduce((acc, a) => acc + (a.tss || 0), 0) / 2) : 0);

    let loadStatus = "Optimal";
    let loadBadge = "Im grünen Bereich";
    let loadColor = "text-emerald-400";
    if (acuteLoad > 900) {
      loadStatus = "Sehr hoch";
      loadBadge = "Erhöhte Belastung";
      loadColor = "text-amber-400";
    } else if (acuteLoad < 300 && acuteLoad > 0) {
      loadStatus = "Erholung";
      loadBadge = "Regenerationsphase";
      loadColor = "text-sky-400";
    } else if (acuteLoad === 0) {
      loadStatus = "Neu";
      loadBadge = "Bereit für Sync";
      loadColor = "text-zinc-400";
    }

    const readiness = latestMetric?.trainingReadiness ?? (metrics.length > 0 ? 80 : 0);
    const hrvStatus = latestMetric?.hrvStatus || "balanced";

    // 7-day volume totals
    let weeklyHours = 0;
    let weeklyKm = 0;
    let weeklyGarminLoad = 0;
    let weeklyActivities = 0;
    const nowTime = mountedTime || Date.now();
    activities.forEach((act) => {
      const actTime = new Date(act.startTime).getTime();
      if (!isNaN(actTime) && nowTime - actTime <= 7 * 24 * 3600 * 1000) {
        if (!act.isCommute) {
          weeklyHours += act.durationSec / 3600;
          weeklyKm += (act.distanceM || 0) / 1000;
          weeklyGarminLoad += act.tss || act.rawJson?.garminLoad || 0;
          weeklyActivities++;
        }
      }
    });

    return {
      acuteLoad,
      loadStatus,
      loadBadge,
      loadColor,
      readiness,
      hrvStatus,
      weeklyHours: weeklyHours.toFixed(1),
      weeklyKm: weeklyKm.toFixed(1),
      weeklyGarminLoad: Math.round(weeklyGarminLoad),
      weeklyActivities,
    };
  }, [latestMetric, metrics, activities, mountedTime]);

  // 14-Day Charts Data
  const hrvChartData = useMemo(() => {
    return metrics.map((m) => {
      const parts = m.date.split("-");
      return {
        date: `${parts[2]}.${parts[1]}`,
        hrvNight: m.hrvLastNight,
        hrvAvg: m.hrv7dAvg,
        readiness: m.trainingReadiness,
      };
    });
  }, [metrics]);

  const loadChartData = useMemo(() => {
    const mapByDate: Record<string, { Rad: number; Lauf: number; Schwimm: number; Gym: number }> = {};
    metrics.forEach((m) => {
      mapByDate[m.date] = { Rad: 0, Lauf: 0, Schwimm: 0, Gym: 0 };
    });
    activities.forEach((act) => {
      const d = act.startTime.split("T")[0];
      if (!mapByDate[d]) mapByDate[d] = { Rad: 0, Lauf: 0, Schwimm: 0, Gym: 0 };
      const val = act.tss || Math.round(act.durationSec / 60);
      if (act.isCommute) return;
      if (act.sportType === "running") mapByDate[d].Lauf += val;
      else if (act.sportType === "swimming") mapByDate[d].Schwimm += val;
      else if (act.sportType === "gym") mapByDate[d].Gym += val;
      else mapByDate[d].Rad += val;
    });

    return metrics.map((m) => {
      const parts = m.date.split("-");
      const loads = mapByDate[m.date] || { Rad: 0, Lauf: 0, Schwimm: 0, Gym: 0 };
      return {
        date: `${parts[2]}.${parts[1]}`,
        Rad: loads.Rad,
        Lauf: loads.Lauf,
        Schwimm: loads.Schwimm,
        Gym: loads.Gym,
      };
    });
  }, [metrics, activities]);

  // 7-Day Sleep Consistency Chart Data
  const sleepChartData = useMemo(() => {
    return metrics.slice(-7).map((m) => {
      const parts = m.date.split("-");
      return {
        date: `${parts[2]}.${parts[1]}`,
        hoursTotal: parseFloat(((m.sleepDurationSec || 28800) / 3600).toFixed(1)),
        deepHours: parseFloat(((m.deepSleepSec || 6000) / 3600).toFixed(1)),
        remHours: parseFloat(((m.remSleepSec || 5000) / 3600).toFixed(1)),
        score: m.sleepScore || 80,
      };
    });
  }, [metrics]);

  // Weekly Discipline Totals (excluding commutes)
  const weeklyTotals = useMemo(() => {
    let bikeKm = 0, bikeSec = 0, bikeEle = 0, bikeWattsSum = 0, bikeWattCount = 0;
    let runKm = 0, runSec = 0, runPaceSum = 0, runPaceCount = 0;
    let swimM = 0, swimSec = 0, swimSwolfSum = 0, swimSwolfCount = 0;
    let gymCount = 0, gymSec = 0;

    activities.forEach((act) => {
      if (act.isCommute) return;
      if (act.sportType === "road_cycling" || act.sportType === "zwift") {
        bikeKm += act.distanceM / 1000;
        bikeSec += act.durationSec;
        bikeEle += act.elevationGainM || 0;
        if (act.avgPowerW) {
          bikeWattsSum += act.avgPowerW;
          bikeWattCount++;
        }
      } else if (act.sportType === "running") {
        runKm += act.distanceM / 1000;
        runSec += act.durationSec;
        if (act.avgPaceSecPerKm) {
          runPaceSum += act.avgPaceSecPerKm;
          runPaceCount++;
        }
      } else if (act.sportType === "swimming") {
        swimM += act.distanceM;
        swimSec += act.durationSec;
        if (act.swolf) {
          swimSwolfSum += act.swolf;
          swimSwolfCount++;
        }
      } else if (act.sportType === "gym") {
        gymCount++;
        gymSec += act.durationSec;
      }
    });

    return {
      bike: {
        km: bikeKm.toFixed(1),
        hours: (bikeSec / 3600).toFixed(1),
        ele: Math.round(bikeEle),
        avgWatts: bikeWattCount > 0 ? Math.round(bikeWattsSum / bikeWattCount) : profile?.currentFtpW ?? null,
      },
      run: {
        km: runKm.toFixed(1),
        hours: (runSec / 3600).toFixed(1),
        avgPaceSec: runPaceCount > 0 ? Math.round(runPaceSum / runPaceCount) : (runKm > 0 ? profile?.runThresholdPaceSec ?? null : null),
      },
      swim: {
        meters: Math.round(swimM),
        hours: (swimSec / 3600).toFixed(1),
        avgSwolf: swimSwolfCount > 0 ? Math.round(swimSwolfSum / swimSwolfCount) : (swimM > 0 ? 34 : null),
      },
      gym: {
        sessions: gymCount,
        hours: (gymSec / 3600).toFixed(1),
      },
    };
  }, [activities, profile]);

  const formatPace = (secPerKm?: number | null) => {
    if (!secPerKm) return "--:--";
    const mins = Math.floor(secPerKm / 60);
    const secs = Math.floor(secPerKm % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs} /km`;
  };

  // Loading Skeleton View (Eliminates mock data flash on page load)
  if (loading) {
    return (
      <div className="flex h-screen w-full bg-zinc-950 text-zinc-100 items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl">
            <Zap className="h-6 w-6 text-emerald-400 animate-pulse" />
          </div>
          <p className="text-xs text-zinc-400 font-mono tracking-wide">
            Lade Garmin Performance Dashboard...
          </p>
        </div>
      </div>
    );
  }

  // Full-Page Activity Detail View (Replaces the small modal with a dedicated full screen)
  if (selectedActivity) {
    return (
      <div className="flex h-screen w-full bg-zinc-950 text-zinc-100 antialiased overflow-hidden font-sans">
        <ActivityDetail
          activity={selectedActivity}
          profile={profile}
          gymTemplates={gymTemplates}
          onBack={() => setSelectedActivity(null)}
          onAssignGym={handleAssignGym}
        />
      </div>
    );
  }

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
              onClick={() => setActiveTab("briefing")}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === "briefing"
                  ? "bg-zinc-800/90 text-white shadow-sm border border-zinc-700/60"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
              }`}
            >
              <ActivityIcon className="h-4 w-4 text-emerald-400" />
              Briefing
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === "analytics"
                  ? "bg-zinc-800/90 text-white shadow-sm border border-zinc-700/60"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
              }`}
            >
              <BarChart3 className="h-4 w-4 text-sky-400" />
              Analytics
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
              AI Coach
              {!profile?.setupCompleted && (
                <span className="ml-auto rounded-full bg-amber-500/20 text-amber-300 text-[10px] px-1.5 py-0.2 font-mono">
                  Setup
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("planner")}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === "planner"
                  ? "bg-zinc-800/90 text-white shadow-sm border border-zinc-700/60"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
              }`}
            >
              <Calendar className="h-4 w-4 text-teal-400" />
              Wochenplaner
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

        {/* Sidebar Footer */}
        <div className="space-y-3 rounded-xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-md p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Athlet</span>
            {profile?.setupCompleted ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 font-mono">
                <Check className="h-3 w-3" /> Setup Aktiv
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400 font-mono">
                Setup offen
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div>
              <p className="text-zinc-500 text-[10px] uppercase">Ruhepuls</p>
              <p className="font-mono tabular-nums font-semibold text-zinc-200">
                {latestMetric?.restingHr || profile?.restingHr ? `${latestMetric?.restingHr || profile?.restingHr} bpm` : "--"}
              </p>
            </div>
            <div>
              <p className="text-zinc-500 text-[10px] uppercase">Gewicht</p>
              <p className="font-mono tabular-nums font-semibold text-zinc-200">
                {profile?.weightKg ? `${profile.weightKg} kg` : "--"}
              </p>
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
        {/* TOP HEADER */}
        <header className="flex h-14 items-center justify-between border-b border-zinc-800/80 bg-zinc-950/80 px-4 md:px-6 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold tracking-wide text-zinc-100">
              {activeTab === "briefing" && "Morning Briefing & Status"}
              {activeTab === "analytics" && "Deep Analytics & Belastungsmatrix"}
              {activeTab === "chat" && "AI Head Coach (Setup & Vision-Upload)"}
              {activeTab === "planner" && "7-Tage Trainingszyklus"}
              {activeTab === "gym" && "Gym Pläne (A/B/C Editor)"}
            </h2>
          </div>

          <div className="flex items-center gap-3">
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

        {/* TAB 1: BRIEFING (LANDING PAGE) */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6 space-y-6">
          {activeTab === "briefing" && (
            <div className="space-y-6 max-w-7xl mx-auto w-full">
              {/* 1. TOP LIVE-BAR & WETTER-WIDGET */}
              <div className="rounded-2xl border border-zinc-800/80 bg-gradient-to-r from-zinc-900/70 via-zinc-900/50 to-zinc-900/70 p-4 md:p-5 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-800/80 border border-zinc-700/60 text-amber-400 shadow-inner">
                    <CloudSun className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold font-mono tabular-nums text-zinc-100">
                        {weather ? `${Math.round(weather.current.temp)}°C` : "17°C"}
                      </span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${
                          weather?.current.outdoorIndex === "green"
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                            : weather?.current.outdoorIndex === "yellow"
                            ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                            : "border-rose-500/40 bg-rose-500/10 text-rose-400"
                        }`}
                      >
                        {weather?.current.outdoorText || "Top Rennrad-Wetter"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1 font-mono">
                      <span className="flex items-center gap-1">
                        <Wind className="h-3 w-3" /> {weather ? Math.round(weather.current.windKmH) : 12} km/h
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Droplets className="h-3 w-3" /> {weather ? weather.current.precipProb : 10}% Regen
                      </span>
                      <span>•</span>
                      <span className="text-zinc-300 font-semibold">Falkensee</span>
                    </div>
                  </div>
                </div>

                {/* 6h Weather Mini Forecast */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
                  {weather?.forecast6h && weather.forecast6h.length > 0 ? (
                    weather.forecast6h.map((f, i) => (
                      <div key={i} className="text-center rounded-lg bg-zinc-950/50 border border-zinc-800 px-2.5 py-1.5 text-xs font-mono">
                        <span className="text-[10px] text-zinc-500 block">{f.time}</span>
                        <span className="font-semibold text-zinc-200 block">{Math.round(f.temp)}°</span>
                        <span className="text-[10px] text-sky-400 block">{f.precipProb}%</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-zinc-500 font-mono">6h Prognose lädt...</div>
                  )}
                  <button
                    onClick={handleGarminSync}
                    disabled={syncing}
                    className="ml-2 flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 px-3 py-2 text-xs font-medium text-zinc-200 transition-colors"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin text-emerald-400" : ""}`} />
                    Sync
                  </button>
                </div>
              </div>

              {/* 2. DESKTOP WIDESCREEN PERFORMANCE METRICS BAR */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Garmin Trainingsbelastung */}
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/10 p-4 backdrop-blur-md flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                    <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5" /> Trainingsbelastung
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">Garmin Load</span>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-2xl font-bold font-mono tabular-nums ${performanceStats.loadColor}`}>
                        {performanceStats.acuteLoad > 0 ? performanceStats.acuteLoad : "--"}
                      </span>
                      <span className="text-xs font-mono text-zinc-400">Akute Last</span>
                    </div>
                    <span className="text-[11px] text-zinc-300 font-mono block mt-1">
                      Status: {performanceStats.loadStatus} ({performanceStats.loadBadge})
                    </span>
                  </div>
                  <div className="mt-3 pt-2 border-t border-zinc-800/80 flex justify-between text-[11px] font-mono text-zinc-500">
                    <span>Optimaler Bereich: 400 - 850</span>
                    <span className="text-emerald-400 font-semibold">Garmin Connect</span>
                  </div>
                </div>

                {/* 7-Tage Trainingsumfang */}
                <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-4 backdrop-blur-md flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                    <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-sky-400" /> 7-Tage Volumen
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">Letzte 7 Tage</span>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold font-mono tabular-nums text-zinc-100">
                        {performanceStats.weeklyHours}h
                      </span>
                      <span className="text-xs font-mono text-zinc-400">Nettozeit</span>
                    </div>
                    <span className="text-[11px] text-zinc-400 font-mono block mt-1">
                      {performanceStats.weeklyKm} km • {performanceStats.weeklyActivities} Einheiten
                    </span>
                  </div>
                  <div className="mt-3 pt-2 border-t border-zinc-800/80 flex justify-between text-[11px] font-mono text-zinc-500">
                    <span>Exkl. Commute</span>
                    <span className="text-emerald-400 font-semibold">
                      {performanceStats.weeklyGarminLoad > 0 ? `${performanceStats.weeklyGarminLoad} Belastung` : "Im Soll"}
                    </span>
                  </div>
                </div>

                {/* HRV Autonome Balance */}
                <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-4 backdrop-blur-md flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                    <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                      <Heart className="h-3.5 w-3.5 text-rose-400" /> HRV Balance
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 uppercase">
                      {latestMetric?.hrvStatus || "Ausgeglichen"}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold font-mono tabular-nums text-zinc-100">
                        {latestMetric?.hrvLastNight ?? "--"}
                      </span>
                      <span className="text-xs font-mono text-zinc-400">
                        {latestMetric?.hrv7dAvg ? `ms (7d: ${latestMetric.hrv7dAvg}ms)` : "ms"}
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-400 font-mono block mt-1">
                      Parasympathischer Erholungsstatus
                    </span>
                  </div>
                  <div className="mt-3 pt-2 border-t border-zinc-800/80 flex justify-between text-[11px] font-mono text-zinc-500">
                    <span>RHR: {latestMetric?.restingHr ? `${latestMetric.restingHr} bpm` : "--"}</span>
                    <span className="text-emerald-400">Baseline-Band</span>
                  </div>
                </div>

                {/* Trainingsbereitschaft & ZNS */}
                <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-4 backdrop-blur-md flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                    <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                      <Target className="h-3.5 w-3.5 text-amber-400" /> Readiness Score
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400">
                      {latestMetric?.trainingReadiness && latestMetric.trainingReadiness >= 75 ? "Bereit" : "Optimal"}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold font-mono tabular-nums text-emerald-400">
                        {latestMetric?.trainingReadiness ?? "--"}
                      </span>
                      <span className="text-xs font-mono text-zinc-400">/ 100</span>
                    </div>
                    <span className="text-[11px] text-zinc-400 font-mono block mt-1">
                      Hohe Belastungsverträglichkeit
                    </span>
                  </div>
                  <div className="mt-3 pt-2 border-t border-zinc-800/80 flex justify-between text-[11px] font-mono text-zinc-500">
                    <span>Body Battery: {latestMetric?.bodyBatteryMax ? `${latestMetric.bodyBatteryMax}` : "--"}</span>
                    <span className="text-emerald-400">Fit</span>
                  </div>
                </div>
              </div>

              {/* 3. SLEEP & MORNING RECOVERY HERO-CARD */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Sleep Analysis Ring & Breakdown */}
                <div className="lg:col-span-2 rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-5 backdrop-blur-md flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Moon className="h-4 w-4 text-indigo-400" />
                        <h3 className="text-sm font-semibold text-zinc-200">Schlafanalyse Letzte Nacht</h3>
                      </div>
                      <span className="text-xs text-indigo-400 font-mono">
                        {Math.floor(sleepDuration / 3600)}h {Math.floor((sleepDuration % 3600) / 60)}m Dauer
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                      {/* Gauge / Score Badge */}
                      <div className="flex flex-col items-center justify-center h-28 w-28 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 shrink-0">
                        <span className="text-4xl font-bold font-mono tabular-nums text-indigo-300">
                          {latestMetric?.sleepScore || 88}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-mono mt-0.5">Sleep Score</span>
                      </div>

                      {/* Phasen Bar & Details */}
                      <div className="flex-1 space-y-3">
                        <div className="h-4 w-full rounded-full bg-zinc-950 overflow-hidden flex border border-zinc-800">
                          <div style={{ width: `${deepPct}%` }} className="bg-indigo-500 h-full" title="Tiefschlaf" />
                          <div style={{ width: `${remPct}%` }} className="bg-purple-500 h-full" title="REM Schlaf" />
                          <div style={{ width: `${lightPct}%` }} className="bg-sky-500/70 h-full" title="Leichtschlaf" />
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                          <div>
                            <span className="text-indigo-400 font-semibold block">Tiefschlaf</span>
                            <span className="text-zinc-200">{Math.floor(deepSleep / 3600)}h {Math.floor((deepSleep % 3600) / 60)}m ({deepPct}%)</span>
                          </div>
                          <div>
                            <span className="text-purple-400 font-semibold block">REM Schlaf</span>
                            <span className="text-zinc-200">{Math.floor(remSleep / 3600)}h {Math.floor((remSleep % 3600) / 60)}m ({remPct}%)</span>
                          </div>
                          <div>
                            <span className="text-sky-400 font-semibold block">Leichtschlaf</span>
                            <span className="text-zinc-200">{Math.floor(lightSleep / 3600)}h {Math.floor((lightSleep % 3600) / 60)}m ({lightPct}%)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-zinc-400 mt-4 border-t border-zinc-800/80 pt-3">
                    Hervorragende parasympathische Regeneration. Tiefschlaf liegt 18% über deinem 7-Tage-Schnitt.
                  </p>
                </div>

                {/* Morning Readiness & HRV Card */}
                <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-5 backdrop-blur-md flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-zinc-400">Erholung & Autonomes Nervensystem</span>
                      <Heart className="h-4 w-4 text-rose-400" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                        <span className="text-[10px] text-zinc-500 block">HRV Nacht</span>
                        <span className="text-2xl font-bold font-mono tabular-nums text-zinc-100 block">
                          {latestMetric?.hrvLastNight ?? "--"} <span className="text-xs text-zinc-500">ms</span>
                        </span>
                        <span className="text-[10px] text-emerald-400 font-mono">
                          {latestMetric?.hrv7dAvg ? `Baseline: ${latestMetric.hrv7dAvg}ms` : "Baseline aktiv"}
                        </span>
                      </div>

                      <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                        <span className="text-[10px] text-zinc-500 block">Readiness</span>
                        <span className="text-2xl font-bold font-mono tabular-nums text-emerald-400 block">
                          {latestMetric?.trainingReadiness ?? "--"} <span className="text-xs text-zinc-500">/100</span>
                        </span>
                        <span className="text-[10px] text-zinc-400 font-mono">
                          {latestMetric?.trainingReadiness && latestMetric.trainingReadiness >= 75 ? "Optimal" : "Erholung"}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs font-mono">
                      <div className="flex justify-between text-zinc-400">
                        <span>Ruhepuls (RHR):</span>
                        <span className="text-zinc-200 font-semibold">
                          {latestMetric?.restingHr ? `${latestMetric.restingHr} bpm` : "--"}
                        </span>
                      </div>
                      <div className="flex justify-between text-zinc-400">
                        <span>Body Battery:</span>
                        <span className="text-amber-400 font-semibold">
                          {latestMetric?.bodyBatteryMin !== undefined && latestMetric?.bodyBatteryMax !== undefined
                            ? `${latestMetric.bodyBatteryMin} → ${latestMetric.bodyBatteryMax}`
                            : "--"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. HEUTIGER FOKUS & ACTIVITY FEED */}
              <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/40 p-5 md:p-6 backdrop-blur-md space-y-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                        Heutiger Fokus
                      </span>
                      {!profile?.setupCompleted && (
                        <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                          Setup im AI Coach ausstehend
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg md:text-xl font-bold text-zinc-100 mt-1">
                      {todayWorkout ? todayWorkout.title : "Regeneration oder freie Einheit"}
                    </h3>
                    <p className="text-xs md:text-sm text-zinc-400 max-w-2xl mt-0.5">
                      {todayWorkout?.description || "Kein strukturiertes Training geplant. Nutze den Ruhetag für Erholung."}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {!profile?.setupCompleted ? (
                      <button
                        onClick={() => setActiveTab("chat")}
                        className="flex items-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 px-4 py-2 text-xs font-semibold text-white transition-colors"
                      >
                        <Sparkles className="h-4 w-4" />
                        Setup jetzt abschließen
                      </button>
                    ) : (
                      todayWorkout?.zwoXml && (
                        <button
                          onClick={() => handleDownloadZwo(todayWorkout)}
                          className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 px-3.5 py-2 text-xs font-medium text-zinc-200 transition-colors"
                        >
                          <Download className="h-3.5 w-3.5 text-sky-400" />
                          .zwo Download
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Letzte 4 Aktivitäten */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-semibold text-zinc-300">Letzte Aktivitäten</h4>
                    <button
                      onClick={() => setHideCommutes(!hideCommutes)}
                      className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                    >
                      <Filter className="h-3 w-3" />
                      Pendeln ausblenden: {hideCommutes ? "An" : "Aus"}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {filteredActivities.slice(0, 4).map((act) => {
                      const dateObj = new Date(act.startTime);
                      const dateStr = !isNaN(dateObj.getTime())
                        ? `${dateObj.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })} • ${dateObj.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}`
                        : "";
                      const speedKmH = act.avgSpeedMps ? (act.avgSpeedMps * 3.6).toFixed(1) : null;
                      const swimPace100m = act.distanceM > 0 && act.durationSec > 0
                        ? `${Math.floor((act.durationSec / (act.distanceM / 100)) / 60)}:${Math.floor((act.durationSec / (act.distanceM / 100)) % 60).toString().padStart(2, "0")} /100m`
                        : null;

                      return (
                        <div
                          key={act.activityId}
                          onClick={() => setSelectedActivity(act)}
                          className="rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-4 flex flex-col justify-between cursor-pointer hover:border-zinc-700 hover:bg-zinc-900/60 transition-all shadow-sm group"
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2.5">
                                <div
                                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                                    act.sportType === "running"
                                      ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                                      : act.sportType === "swimming"
                                      ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-400"
                                      : act.sportType === "gym"
                                      ? "border-violet-500/30 bg-violet-500/10 text-violet-400"
                                      : act.sportType === "recovery"
                                      ? "border-teal-500/30 bg-teal-500/10 text-teal-300"
                                      : act.sportType === "commute"
                                      ? "border-zinc-700 bg-zinc-800/60 text-zinc-400"
                                      : act.sportType === "other"
                                      ? "border-zinc-700 bg-zinc-800/60 text-zinc-300"
                                      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                  }`}
                                >
                                  {act.sportType === "running" ? (
                                    <Footprints className="h-4 w-4" />
                                  ) : act.sportType === "swimming" ? (
                                    <Waves className="h-4 w-4" />
                                  ) : act.sportType === "gym" ? (
                                    <Dumbbell className="h-4 w-4" />
                                  ) : act.sportType === "recovery" ? (
                                    <Wind className="h-4 w-4" />
                                  ) : act.sportType === "other" ? (
                                    <ActivityIcon className="h-4 w-4" />
                                  ) : (
                                    <Bike className="h-4 w-4" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span
                                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase font-semibold ${
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
                                          : act.sportType === "other"
                                          ? "bg-zinc-800 text-zinc-300"
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
                                        ? "Laufen"
                                        : act.sportType === "swimming"
                                        ? "Schwimmen"
                                        : act.sportType === "gym"
                                        ? "Gym"
                                        : act.sportType === "recovery"
                                        ? "Recovery"
                                        : "Aktivität"}
                                    </span>
                                    {act.isCommute && act.sportType !== "commute" && (
                                      <span className="text-[9px] bg-zinc-800 text-zinc-400 px-1.5 py-0.2 rounded font-mono">
                                        Commute
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[11px] text-zinc-500 font-mono block mt-0.5">{dateStr}</span>
                                </div>
                              </div>
                              <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-zinc-300 transition-colors shrink-0" />
                            </div>

                            <h5
                              title={act.name}
                              className="text-sm font-semibold text-zinc-100 line-clamp-2 leading-snug break-words"
                            >
                              {act.name}
                            </h5>
                          </div>

                          {/* Sport-specific Core Metrics Bar */}
                          <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono">
                            <span className="text-zinc-300 font-semibold">{Math.round(act.durationSec / 60)} min</span>

                            {/* Cycling */}
                            {(act.sportType === "road_cycling" || act.sportType === "zwift") && (
                              <div className="flex items-center gap-2 text-zinc-400">
                                <span className="text-emerald-400 font-semibold">
                                  {act.avgPowerW ? `${act.avgPowerW}W` : ""}
                                </span>
                                <span>{(act.distanceM / 1000).toFixed(1)} km</span>
                                {act.tss > 0 && <span className="text-zinc-300 font-semibold">{act.tss} Belastung</span>}
                                {act.avgHr && <span>{act.avgHr} bpm</span>}
                              </div>
                            )}

                            {/* Commute */}
                            {act.sportType === "commute" && (
                              <div className="flex items-center gap-2 text-zinc-400">
                                <span>{(act.distanceM / 1000).toFixed(1)} km</span>
                                {speedKmH && <span>{speedKmH} km/h</span>}
                                {act.avgHr && <span>{act.avgHr} bpm</span>}
                              </div>
                            )}

                            {/* Running */}
                            {act.sportType === "running" && (
                              <div className="flex items-center gap-2 text-zinc-400">
                                <span className="text-amber-400 font-semibold">
                                  {formatPace(act.avgPaceSecPerKm)}
                                </span>
                                <span>{(act.distanceM / 1000).toFixed(1)} km</span>
                                {act.tss > 0 && <span className="text-zinc-300 font-semibold">{act.tss} Belastung</span>}
                                {act.avgHr && <span>{act.avgHr} bpm</span>}
                              </div>
                            )}

                            {/* Swimming */}
                            {act.sportType === "swimming" && (
                              <div className="flex items-center gap-2 text-zinc-400">
                                <span className="text-cyan-400 font-semibold">{Math.round(act.distanceM)} m</span>
                                {swimPace100m && <span>{swimPace100m}</span>}
                                {act.swolf && <span>SWOLF {act.swolf}</span>}
                              </div>
                            )}

                            {/* Gym */}
                            {act.sportType === "gym" && (
                              <div className="flex items-center gap-2 text-zinc-400">
                                {act.avgHr && <span>Ø {act.avgHr} bpm</span>}
                                {act.calories > 0 && <span>{act.calories} kcal</span>}
                                {act.tss > 0 && <span className="text-zinc-300 font-semibold">{act.tss} Belastung</span>}
                                {act.linkedGymTemplateId ? (
                                  <span className="text-violet-400 font-semibold">Plan verknüpft</span>
                                ) : (
                                  <span className="text-zinc-500">Kein Plan</span>
                                )}
                              </div>
                            )}

                            {/* Recovery / Breathwork */}
                            {act.sportType === "recovery" && (
                              <div className="flex items-center gap-2 text-teal-300">
                                {act.avgHr && <span>Ø {act.avgHr} bpm</span>}
                                {act.maxHr && <span>Max {act.maxHr}</span>}
                                <span>Entspannung & Ruhe</span>
                              </div>
                            )}

                            {/* Other */}
                            {act.sportType === "other" && (
                              <div className="flex items-center gap-2 text-zinc-400">
                                {act.distanceM > 0 && <span>{(act.distanceM / 1000).toFixed(1)} km</span>}
                                {act.tss > 0 && <span>{act.tss} Belastung</span>}
                                {act.avgHr && <span>{act.avgHr} bpm</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ANALYTICS (DEEP DATA SEITE) */}
          {activeTab === "analytics" && (
            <AnalyticsHub
              activities={activities}
              metrics={metrics}
              profile={profile}
              onSelectActivity={(act) => setSelectedActivity(act)}
            />
          )}

          {/* TAB 3: AI COACH (MIT SETUP-MODUS & BILD-UPLOAD) */}
          {activeTab === "chat" && (
            <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-8.5rem)] rounded-2xl border border-zinc-800/80 bg-zinc-900/40 backdrop-blur-md overflow-hidden">
              <div className="flex items-center justify-between border-b border-zinc-800/80 p-3.5 bg-zinc-950/60">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-zinc-100">AI Performance Coach</h3>
                    <p className="text-[10px] text-zinc-400">
                      {profile?.setupCompleted ? "Diagnostiker & Planer" : "Strukturierter Setup-Modus"}
                    </p>
                  </div>
                </div>

                <div className="flex gap-1.5">
                  {!profile?.setupCompleted && (
                    <button
                      onClick={() => handleSendMessage("Hier sind meine Eckdaten: FTP 285W, 10k Laufzeit 42min. Bitte speichere mein Setup ab.")}
                      className="text-[11px] rounded-lg border border-amber-500/40 bg-amber-950/30 text-amber-300 px-2.5 py-1 hover:bg-amber-900/40"
                    >
                      Quick Setup Check
                    </button>
                  )}
                  <button
                    onClick={() => handleSendMessage("Plane meine Woche")}
                    className="text-[11px] rounded-lg border border-emerald-500/40 bg-emerald-950/30 text-emerald-300 px-2.5 py-1 hover:bg-emerald-900/40"
                  >
                    Woche planen
                  </button>
                </div>
              </div>

              {/* Chat Message Scroll */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl p-4 text-xs md:text-sm leading-relaxed space-y-2 ${
                        m.role === "user"
                          ? "bg-emerald-600 text-white rounded-br-none shadow-md"
                          : "bg-zinc-800/85 text-zinc-200 border border-zinc-700/60 rounded-bl-none shadow-sm"
                      }`}
                    >
                      {/* Image Thumbnails inside message */}
                      {m.images && m.images.length > 0 && (
                        <div className="flex gap-2 flex-wrap pb-1">
                          {m.images.map((img, i) => (
                            <img
                              key={i}
                              src={img}
                              alt="Upload preview"
                              className="h-20 w-20 object-cover rounded-lg border border-zinc-700"
                            />
                          ))}
                        </div>
                      )}
                      <div className="whitespace-pre-wrap">{m.content}</div>
                    </div>
                  </div>
                ))}
                {isAiReplying && (
                  <div className="flex justify-start">
                    <div className="bg-zinc-800/60 border border-zinc-700/40 rounded-2xl p-3 text-xs text-zinc-400 flex items-center gap-2">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                      Coach analysiert Daten & Vision-Uploads...
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input & Image Preview Bar */}
              <div className="p-3 border-t border-zinc-800/80 bg-zinc-950/80 space-y-2">
                {/* Uploaded Thumbnails Preview */}
                {attachedImages.length > 0 && (
                  <div className="flex items-center gap-2 p-1.5 bg-zinc-900/80 border border-zinc-800 rounded-xl">
                    {attachedImages.map((img, idx) => (
                      <div key={idx} className="relative group">
                        <img src={img} alt="thumbnail" className="h-12 w-12 object-cover rounded-lg border border-zinc-700" />
                        <button
                          onClick={() => setAttachedImages(attachedImages.filter((_, i) => i !== idx))}
                          className="absolute -top-1 -right-1 bg-rose-600 rounded-full p-0.5 text-white"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {attachedImages.length}/4 Screenshots angehängt
                    </span>
                  </div>
                )}

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  onPaste={handlePaste}
                  className="flex items-center gap-2"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageSelect}
                    multiple
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Screenshot oder Gym-Plan Bild anhängen"
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition-colors"
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>

                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Frag den Coach, lade Gym-Screenshots hoch oder sag 'Plane meine Woche'..."
                    className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-2.5 text-xs md:text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/50"
                  />
                  <button
                    type="submit"
                    disabled={(!inputMessage.trim() && attachedImages.length === 0) || isAiReplying}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 transition-colors"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 4: WOCHENPLANER */}
          {activeTab === "planner" && (
            <div className="space-y-6 max-w-7xl mx-auto w-full">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-zinc-100">7-Tage Trainingszyklus</h3>
                  <p className="text-xs text-zinc-400">
                    Polarisierte Steuerung, HRV-Monitoring und Interferenz-Vermeidung
                  </p>
                </div>
                {profile?.setupCompleted && (
                  <button
                    onClick={() => {
                      setActiveTab("chat");
                      handleSendMessage("Plane meine Woche: Erstelle mir einen optimalen 7-Tage-Trainingsplan mit 2x Rad, 1x Laufen, 2x Gym und 1x Schwimmen.");
                    }}
                    className="flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-white transition-all shadow-md shadow-emerald-600/20"
                  >
                    <Sparkles className="h-4 w-4" />
                    Woche von AI neu planen
                  </button>
                )}
              </div>

              {!profile?.setupCompleted ? (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-950/15 p-8 text-center backdrop-blur-md space-y-4 max-w-2xl mx-auto my-8">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mx-auto">
                    <Calendar className="h-7 w-7" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-zinc-100">Noch kein Trainingsplan generiert</h4>
                    <p className="text-xs text-zinc-400 max-w-md mx-auto mt-1">
                      Dein Wochenplan wird erst berechnet, sobald du dein Setup mit dem AI Coach abgeschlossen hast. Der Coach stimmt die Einheiten exakt auf deine FTP, Lauf-Pace und verfügbare Zeit ab.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setActiveTab("chat");
                      handleSendMessage("Hallo Coach, lass uns mein Profil-Setup abschließen, damit du meinen Wochenplan erstellen kannst.");
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 px-5 py-2.5 text-xs font-semibold text-white transition-all shadow-lg shadow-amber-600/20"
                  >
                    <Sparkles className="h-4 w-4" />
                    Setup mit AI Coach starten
                  </button>
                </div>
              ) : (
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
              )}
            </div>
          )}

          {/* TAB 5: GYM PLÄNE (A/B/C CRUD EDITOR) */}
          {activeTab === "gym" && (
            <div className="space-y-6 max-w-7xl mx-auto w-full">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-zinc-100">Gym Pläne A, B & C</h3>
                  <p className="text-xs text-zinc-400">
                    Mechanische Spannung, saubere RIR-Vorgaben und ZNS-Schonung fürs Ausdauertraining.
                  </p>
                </div>
                {profile?.setupCompleted && (
                  <button
                    onClick={() => {
                      setActiveTab("chat");
                      handleSendMessage("Ich möchte meine Gym-Pläne per Screenshot neu einlesen oder anpassen.");
                    }}
                    className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 text-xs text-zinc-200 transition-colors"
                  >
                    <Paperclip className="h-3.5 w-3.5 text-violet-400" />
                    Neue Pläne hochladen
                  </button>
                )}
              </div>

              {!profile?.setupCompleted && gymTemplates.length === 0 ? (
                <div className="rounded-2xl border border-violet-500/30 bg-violet-950/15 p-8 text-center backdrop-blur-md space-y-4 max-w-2xl mx-auto my-8">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 border border-violet-500/30 text-violet-400 mx-auto">
                    <Dumbbell className="h-7 w-7" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-zinc-100">Gym-Pläne warten auf deine Screenshots</h4>
                    <p className="text-xs text-zinc-400 max-w-md mx-auto mt-1">
                      Lade einfach Fotos oder Screenshots deiner Trainingspläne (A, B, C) im AI Coach hoch. Das Vision-Modell erkennt Übungen, Sätze, Wiederholungen und RIR automatisch und hinterlegt sie hier.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab("chat")}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 px-5 py-2.5 text-xs font-semibold text-white transition-all shadow-lg shadow-violet-600/20"
                  >
                    <Paperclip className="h-4 w-4" />
                    Screenshots im AI Coach hochladen
                  </button>
                </div>
              ) : (
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
              )}
            </div>
          )}
        </div>

        {/* GYM PLAN EDITOR MODAL */}
        {editingPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
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

        {/* MOBILE NAVIGATION BAR (5 TABS) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur-lg flex items-center justify-around px-2 z-50">
          <button
            onClick={() => setActiveTab("briefing")}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg text-[10px] font-medium transition-colors ${
              activeTab === "briefing" ? "text-emerald-400" : "text-zinc-400"
            }`}
          >
            <ActivityIcon className="h-4 w-4" />
            Briefing
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg text-[10px] font-medium transition-colors ${
              activeTab === "analytics" ? "text-sky-400" : "text-zinc-400"
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Analytics
          </button>
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg text-[10px] font-medium transition-colors ${
              activeTab === "chat" ? "text-purple-400" : "text-zinc-400"
            }`}
          >
            <Sparkles className="h-4 w-4" />
            Coach
          </button>
          <button
            onClick={() => setActiveTab("planner")}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg text-[10px] font-medium transition-colors ${
              activeTab === "planner" ? "text-teal-400" : "text-zinc-400"
            }`}
          >
            <Calendar className="h-4 w-4" />
            Planer
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
