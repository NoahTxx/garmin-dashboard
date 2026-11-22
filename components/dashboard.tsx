"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  MockAthleteProfile,
  MockDailyMetric,
  MockActivity,
  MockGymTemplate,
  MockPlannedWorkout,
} from "@/lib/mock-data";
import { ActivityDetail } from "./activity-detail";
import { AnalyticsHub } from "./analytics-hub";
import { ApexSidebar, ApexMobileNav, ApexTab } from "./apex/ApexNavigation";
import { TodayView } from "./apex/TodayView";
import { TrainingView } from "./apex/TrainingView";
import { CoachView } from "./apex/CoachView";
import { ProfileView } from "./apex/ProfileView";
import { TodayCockpitData } from "@/lib/apex-types";
import { Zap, X, Save, Plus, Trash2 } from "lucide-react";

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
  const [activeTab, setActiveTab] = useState<ApexTab>("today");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const [profile, setProfile] = useState<MockAthleteProfile | null>(null);
  const [metrics, setMetrics] = useState<MockDailyMetric[]>([]);
  const [activities, setActivities] = useState<MockActivity[]>([]);
  const [gymTemplates, setGymTemplates] = useState<MockGymTemplate[]>([]);
  const [plannedWorkouts, setPlannedWorkouts] = useState<MockPlannedWorkout[]>([]);
  const [todayStr, setTodayStr] = useState("2026-11-08");

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
        "Willkommen bei APEX Training OS.\n\nIch habe deine Garmin-Metriken geladen. Du kannst mir Fragen zu deiner Erholung stellen, ein neues Ziel angeben oder ein Foto deines Gym-Plans hochladen, um ihn zu importieren.",
    },
  ]);
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [isAiReplying, setIsAiReplying] = useState(false);

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
      console.error("APEX loadData error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setTodayStr(new Date().toISOString().split("T")[0]);
    loadData();

    // Garmin auto-sync on load
    handleGarminSync();

    // Auto refresh every 10 min when tab visible
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        loadData();
      }
    }, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const handleGarminSync = async () => {
    if (syncing) return;
    try {
      setSyncing(true);
      setSyncNotice("Garmin Sync gestartet...");
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: 7 }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSyncNotice(`Sync OK: +${data.newActivities || 0} Aktivitäten.`);
        await loadData();
      } else {
        setSyncNotice("Sync fehlgeschlagen.");
      }
    } catch {
      setSyncNotice("Verbindungsfehler beim Garmin Sync.");
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncNotice(null), 4000);
    }
  };

  const handleSendMessage = async (textToSend: string, customImages?: string[]) => {
    const images = customImages ?? attachedImages;
    if ((!textToSend.trim() && images.length === 0) || isAiReplying) return;

    const userMsg = {
      id: `u-${Date.now()}`,
      role: "user" as const,
      content: textToSend || "Analysiere diese Trainingsplandaten:",
      images: images.length > 0 ? [...images] : undefined,
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setAttachedImages([]);
    setIsAiReplying(true);

    try {
      const payloadMessages = newHistory.map((m) => {
        if (m.images && m.images.length > 0) {
          const contentParts: any[] = [{ type: "text", text: m.content }];
          m.images.forEach((img) => contentParts.push({ type: "image", image: img }));
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

  const handleAssignGym = async (activityId: string, templateId: number) => {
    try {
      await fetch("/api/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "assign_gym_template",
          activityId,
          templateId,
        }),
      });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateProfile = async (updated: Partial<MockAthleteProfile>) => {
    try {
      await fetch("/api/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_profile",
          profile: updated,
        }),
      });
      setProfile((prev) => (prev ? { ...prev, ...updated } : null));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveGymTemplate = async (template: MockGymTemplate) => {
    try {
      await fetch("/api/gym", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_template",
          payload: template,
        }),
      });
      setGymTemplates((prev) => {
        const idx = prev.findIndex((t) => t.id === template.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = template;
          return next;
        }
        return [...prev, template];
      });
      setEditingPlan(null);
    } catch (e) {
      console.error(e);
    }
  };

  // Letzte Metrik mit echten Daten finden (oder die absolut neueste)
  const latestMetric = useMemo(() => {
    if (metrics.length === 0) return null;
    // Falls heute noch keine Schlafdaten hat, suchen wir von hinten nach der neuesten mit Schlaf/Readiness Daten
    const lastComplete = [...metrics].reverse().find(
      (m) => (m.sleepScore !== null && m.sleepScore !== undefined) || (m.trainingReadiness !== null && m.trainingReadiness !== undefined)
    );
    return lastComplete || metrics[metrics.length - 1];
  }, [metrics]);
  const todayWorkout = plannedWorkouts.find((w) => w.date === todayStr);

  // Calculate dynamic 30d HRV average and 7d averages from authentic Garmin history
  const { hrv30dAvg, hrvBaselineDiff } = useMemo(() => {
    const validHrv = metrics
      .slice(-30)
      .map((m) => m.hrvLastNight)
      .filter((v): v is number => v !== null && v !== undefined && v > 0);

    const avg =
      validHrv.length > 0
        ? Math.round(validHrv.reduce((a, b) => a + b, 0) / validHrv.length)
        : null;

    let diff: { diffPercent: number; reference: string; trend: "up" | "down" | "flat" } | undefined = undefined;
    if (avg && latestMetric?.hrvLastNight) {
      const diffP = Math.round(((latestMetric.hrvLastNight - avg) / avg) * 100);
      diff = {
        diffPercent: diffP,
        reference: `vs 30d average (${avg} ms)`,
        trend: diffP > 0 ? "up" : diffP < 0 ? "down" : "flat",
      };
    }
    return { hrv30dAvg: avg, hrvBaselineDiff: diff };
  }, [metrics, latestMetric]);

  // Build Normalized APEX Today Cockpit Data
  const todayCockpitData: TodayCockpitData = useMemo(() => {
    const readinessScore = latestMetric?.trainingReadiness ?? null;
    const readinessStatus: "success" | "warning" | "critical" =
      readinessScore !== null
        ? readinessScore >= 70
          ? "success"
          : readinessScore >= 45
          ? "warning"
          : "critical"
        : "warning";
    const readinessLabel =
      readinessScore !== null
        ? readinessScore >= 70
          ? "Ready to train"
          : readinessScore >= 45
          ? "Moderate"
          : "Recover / Rest"
        : "Moderate";

    const acute = latestMetric?.acuteLoad ?? null;
    const chronic = null;

    const sleepScoreVal = latestMetric?.sleepScore ?? null;
    const sleepDurVal = latestMetric?.sleepDurationSec ?? null;
    const deepVal = latestMetric?.deepSleepSec ?? null;
    const remVal = latestMetric?.remSleepSec ?? null;
    const lightVal =
      sleepDurVal !== null && deepVal !== null && remVal !== null
        ? Math.max(0, sleepDurVal - deepVal - remVal)
        : null;

    const rhrVal = latestMetric?.restingHr ?? profile?.restingHr ?? null;
    const bbVal = latestMetric?.bodyBatteryMax ?? null;

    return {
      athleteName: "Noah",
      dateStr: new Date().toLocaleDateString("de-DE", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
      readiness: {
        value: readinessScore,
        unit: "/ 100",
        source: "garmin",
        sourceEndpoint: "get_training_readiness",
        status: readinessScore !== null ? "OK" : "MISSING",
        interpretation:
          readinessScore !== null
            ? readinessScore >= 70
              ? "Hohe Regenerationskapazität für Training."
              : "Moderate Erholung. Belastung kontrollieren."
            : "Warte auf Garmin Trainingsbereitschaft.",
      },
      readinessLabel,
      readinessStatus,
      recommendation: {
        title:
          readinessScore !== null && readinessScore >= 70
            ? "Zone-2 Grundlageneinheit oder Krafttraining Plan A"
            : "Regeneratives Training oder aktive Erholung",
        description:
          readinessScore !== null && readinessScore >= 70
            ? "Dein Ruhepuls und Schlafscore zeigen eine vollständig erholte parasympathische Balance. Die Belastung der letzten 48 Stunden ist gut verarbeitet."
            : "Die Erholungsmetriken deuten auf Restmüdigkeit hin. Priorisiere lockere Bewegung, Schlaf und Hydration.",
        reasoning: [
          sleepScoreVal ? `Schlafscore ${sleepScoreVal}/100` : "Schlafscore: No data",
          latestMetric?.hrvLastNight ? `Nacht-HRV ${latestMetric.hrvLastNight} ms` : "Nacht-HRV: No data",
          rhrVal ? `Ruhepuls stabil bei ${rhrVal} bpm` : "Ruhepuls: No data",
        ].filter(Boolean),
      },
      workout: todayWorkout
        ? {
            id: todayWorkout.id,
            title: todayWorkout.title,
            type: todayWorkout.sportType as any,
            durationMin: todayWorkout.durationMin,
            intensity: "Moderate",
            focus: todayWorkout.description || "Aufbau aerober Kapazität",
            exercises: undefined,
          }
        : undefined,
      metrics: {
        sleepScore: {
          value: sleepScoreVal,
          unit: "",
          source: "garmin",
          sourceEndpoint: "get_sleep_data",
          status: sleepScoreVal !== null ? "OK" : "MISSING",
          interpretation: sleepScoreVal !== null ? `${sleepScoreVal}/100 · Garmin Schlaf` : undefined,
        },
        sleepDurationSec: {
          value: sleepDurVal,
          unit: "sec",
          source: "garmin",
          sourceEndpoint: "get_sleep_data",
          status: sleepDurVal !== null ? "OK" : "MISSING",
        },
        deepSleepSec: {
          value: deepVal,
          unit: "sec",
          source: "garmin",
          sourceEndpoint: "get_sleep_data",
          status: deepVal !== null ? "OK" : "MISSING",
        },
        remSleepSec: {
          value: remVal,
          unit: "sec",
          source: "garmin",
          sourceEndpoint: "get_sleep_data",
          status: remVal !== null ? "OK" : "MISSING",
        },
        lightSleepSec: {
          value: lightVal,
          unit: "sec",
          source: "garmin",
          sourceEndpoint: "get_sleep_data",
          status: lightVal !== null ? "OK" : "MISSING",
        },
        hrvLastNight: {
          value: latestMetric?.hrvLastNight ?? null,
          unit: "ms",
          source: "garmin",
          sourceEndpoint: "get_hrv_data",
          status: latestMetric?.hrvLastNight ? "OK" : "MISSING",
          baselineDiff: hrvBaselineDiff,
          interpretation: latestMetric?.hrvStatus ? `Status: ${latestMetric.hrvStatus}` : undefined,
        },
        restingHr: {
          value: rhrVal,
          unit: "bpm",
          source: "garmin",
          sourceEndpoint: "get_stats_and_body",
          status: rhrVal !== null ? "OK" : "MISSING",
        },
        bodyBattery: {
          value: bbVal,
          unit: "",
          source: "garmin",
          sourceEndpoint: "get_body_battery",
          status: bbVal !== null ? "OK" : "MISSING",
        },
        acuteLoad: {
          value: acute,
          unit: "",
          source: "garmin",
          sourceEndpoint: "get_stats_and_body",
          status: acute !== null ? "OK" : "MISSING",
          interpretation: acute !== null ? "Garmin Acute Load" : undefined,
        },
        chronicLoad: {
          value: chronic,
          unit: "",
          source: "calculated",
          status: chronic !== null ? "OK" : "MISSING",
        },
        steps: {
          value: null,
          unit: "",
          source: "garmin",
          sourceEndpoint: "get_stats_and_body",
          status: "MISSING",
        },
        activeCalories: {
          value: null,
          unit: "kcal",
          source: "garmin",
          sourceEndpoint: "get_stats_and_body",
          status: "MISSING",
        },
        intensityMinutes: {
          value: null,
          unit: "min",
          source: "garmin",
          sourceEndpoint: "get_stats_and_body",
          status: "MISSING",
        },
        weightKg: {
          value: profile?.weightKg ?? null,
          unit: "kg",
          source: profile?.weightKg ? "garmin" : "manual",
          sourceEndpoint: "get_user_summary",
          status: profile?.weightKg ? "OK" : "MISSING",
        },
        stressAvg: {
          value: latestMetric?.stressAvg ?? null,
          unit: "",
          source: "garmin",
          sourceEndpoint: "get_stats_and_body",
          status: latestMetric?.stressAvg !== null && latestMetric?.stressAvg !== undefined ? "OK" : "MISSING",
        },
      },
      bodyBatteryDetails: {
        current: bbVal,
        highest: latestMetric?.bodyBatteryMax ?? null,
        lowest: latestMetric?.bodyBatteryMin ?? null,
        statusText: bbVal !== null ? "Garmin Connect" : "No data",
      },
      stepsDetail: {
        current: null,
        goal: 8000,
      },
      intensityMinutesDetail: {
        current: null,
        goal: 150,
      },
      hrv30dAvg,
      weather: weather
        ? {
            tempC: Math.round(weather.current.temp),
            condition: weather.current.outdoorText,
            rainProb: weather.current.precipProb,
            windKmH: Math.round(weather.current.windKmH),
            outdoorIndex: weather.current.outdoorIndex,
            outdoorText: weather.current.outdoorText,
          }
        : undefined,
      nextBestAction: {
        category: "mobility",
        title: "15 min Voraktivierung vor dem Training",
        action:
          "Bereite Sehnen, Gelenke und Rumpf mit gezielten dynamischen Drills auf die anstehende Belastung vor.",
      },
    };
  }, [latestMetric, profile, weather, todayWorkout, hrv30dAvg, hrvBaselineDiff]);

  // Loading Skeleton without layout shift
  if (loading) {
    return (
      <div className="flex h-screen w-full bg-[#0B0F14] text-[#F8FAFC] items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#121821] border border-white/[0.08] shadow-xl">
            <Zap className="h-6 w-6 text-[#3B82F6] animate-pulse" />
          </div>
          <p className="text-xs text-[#94A3B8] font-mono tracking-wider uppercase">
            APEX Training OS initialisieren...
          </p>
        </div>
      </div>
    );
  }

  // Full Activity Detail View
  if (selectedActivity) {
    return (
      <div className="flex h-screen w-full bg-[#0B0F14] text-[#F8FAFC] antialiased overflow-hidden font-sans">
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
    <div className="flex h-screen w-full bg-[#0B0F14] text-[#F8FAFC] antialiased overflow-hidden font-sans">
      {/* 1. Desktop Sidebar */}
      <ApexSidebar
        currentTab={activeTab}
        onSelectTab={setActiveTab}
        syncStatus={{
          isSyncing: syncing,
          lastSyncText: syncNotice || "Garmin Sync bereit",
          onSync: handleGarminSync,
        }}
      />

      {/* 2. Main Content Surface */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header / Sync Bar */}
        <header className="h-14 border-b border-white/[0.06] bg-[#0B0F14]/80 backdrop-blur-md px-4 md:px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold capitalize text-[#F8FAFC]">
              {activeTab}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {syncNotice && (
              <span className="text-xs text-[#34D399] bg-[#34D399]/10 border border-[#34D399]/20 rounded-lg px-2.5 py-1">
                {syncNotice}
              </span>
            )}
            <button
              onClick={handleGarminSync}
              disabled={syncing}
              className="md:hidden flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#121821] px-3 py-1.5 text-xs text-[#F8FAFC]"
            >
              Sync
            </button>
          </div>
        </header>

        {/* View Router */}
        <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6 max-w-7xl w-full mx-auto">
          {activeTab === "today" && (
            <TodayView
              data={todayCockpitData}
              onNavigateTab={setActiveTab}
              onStartWorkout={() => setActiveTab("training")}
            />
          )}

          {activeTab === "training" && (
            <TrainingView
              todayStr={todayStr}
              plannedWorkouts={plannedWorkouts}
              gymTemplates={gymTemplates}
              recentActivities={activities}
              onOpenActivity={setSelectedActivity}
              onEditGymPlan={setEditingPlan}
              onOpenCoach={() => setActiveTab("coach")}
            />
          )}

          {activeTab === "analytics" && (
            <AnalyticsHub
              metrics={metrics}
              activities={activities}
              profile={profile}
              onSelectActivity={setSelectedActivity}
            />
          )}

          {activeTab === "coach" && (
            <CoachView
              profile={profile}
              cockpitData={todayCockpitData}
              messages={messages}
              onSendMessage={handleSendMessage}
              isReplying={isAiReplying}
              attachedImages={attachedImages}
              onRemoveImage={(idx) =>
                setAttachedImages(attachedImages.filter((_, i) => i !== idx))
              }
              onSelectImages={(e) => {
                const files = e.target.files;
                if (!files) return;
                const selected = Array.from(files).slice(0, 4 - attachedImages.length);
                selected.forEach((file) => {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    if (event.target?.result) {
                      setAttachedImages((prev) => [...prev.slice(0, 3), event.target!.result as string]);
                    }
                  };
                  reader.readAsDataURL(file);
                });
              }}
              onQuickAction={(actionText) => handleSendMessage(actionText)}
            />
          )}

          {activeTab === "profile" && (
            <ProfileView
              profile={profile}
              latestMetric={latestMetric ?? undefined}
              onSyncGarmin={handleGarminSync}
              syncing={syncing}
              onUpdateProfile={handleUpdateProfile}
            />
          )}
        </main>
      </div>

      {/* 3. Mobile Navigation Dock */}
      <ApexMobileNav currentTab={activeTab} onSelectTab={setActiveTab} />

      {/* 4. Gym Plan Editor Modal */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#121821] border border-white/[0.08] rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8B5CF6] px-2 py-0.5 rounded bg-[#8B5CF6]/15 border border-[#8B5CF6]/20">
                  Plan {editingPlan.code}
                </span>
                <h3 className="text-lg font-bold text-[#F8FAFC] mt-1">{editingPlan.name}</h3>
              </div>
              <button
                onClick={() => setEditingPlan(null)}
                className="p-2 rounded-xl text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.04]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="text-xs text-[#94A3B8] block mb-1">Plan Name</label>
                <input
                  type="text"
                  value={editingPlan.name}
                  onChange={(e) =>
                    setEditingPlan({ ...editingPlan, name: e.target.value })
                  }
                  className="w-full rounded-xl bg-[#0B0F14] border border-white/[0.08] px-3.5 py-2 text-sm text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6]"
                />
              </div>

              <div>
                <label className="text-xs text-[#94A3B8] block mb-1">Fokus Muskelgruppen</label>
                <input
                  type="text"
                  value={editingPlan.focusMuscles}
                  onChange={(e) =>
                    setEditingPlan({ ...editingPlan, focusMuscles: e.target.value })
                  }
                  className="w-full rounded-xl bg-[#0B0F14] border border-white/[0.08] px-3.5 py-2 text-sm text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6]"
                />
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs uppercase tracking-wider font-semibold text-[#94A3B8]">
                    Übungen ({editingPlan.exercisesJson?.length || 0})
                  </h4>
                  <button
                    onClick={() =>
                      setEditingPlan({
                        ...editingPlan,
                        exercisesJson: [
                          ...(editingPlan.exercisesJson || []),
                          { name: "Neue Übung", sets: 3, reps: "8-12", rir: 2 },
                        ],
                      })
                    }
                    className="inline-flex items-center gap-1 text-xs text-[#3B82F6] hover:text-blue-400"
                  >
                    <Plus className="w-3.5 h-3.5" /> Übung hinzufügen
                  </button>
                </div>

                <div className="space-y-2">
                  {editingPlan.exercisesJson?.map((ex, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-[#0B0F14] border border-white/[0.04] flex items-center gap-3"
                    >
                      <input
                        type="text"
                        value={ex.name}
                        onChange={(e) => {
                          const updated = [...editingPlan.exercisesJson];
                          updated[idx] = { ...updated[idx], name: e.target.value };
                          setEditingPlan({ ...editingPlan, exercisesJson: updated });
                        }}
                        className="flex-1 bg-transparent text-sm text-[#F8FAFC] focus:outline-none border-b border-transparent focus:border-[#3B82F6]"
                      />
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-[#64748B]">Sätze:</span>
                        <input
                          type="number"
                          value={ex.sets}
                          onChange={(e) => {
                            const updated = [...editingPlan.exercisesJson];
                            updated[idx] = { ...updated[idx], sets: parseInt(e.target.value) || 1 };
                            setEditingPlan({ ...editingPlan, exercisesJson: updated });
                          }}
                          className="w-12 bg-[#121821] rounded px-1.5 py-0.5 text-center text-[#F8FAFC]"
                        />
                        <span className="text-[#64748B]">Wdh:</span>
                        <input
                          type="text"
                          value={ex.reps}
                          onChange={(e) => {
                            const updated = [...editingPlan.exercisesJson];
                            updated[idx] = { ...updated[idx], reps: e.target.value };
                            setEditingPlan({ ...editingPlan, exercisesJson: updated });
                          }}
                          className="w-14 bg-[#121821] rounded px-1.5 py-0.5 text-center text-[#F8FAFC]"
                        />
                        <span className="text-[#64748B]">RIR:</span>
                        <input
                          type="number"
                          value={ex.rir}
                          onChange={(e) => {
                            const updated = [...editingPlan.exercisesJson];
                            updated[idx] = { ...updated[idx], rir: parseInt(e.target.value) || 0 };
                            setEditingPlan({ ...editingPlan, exercisesJson: updated });
                          }}
                          className="w-10 bg-[#121821] rounded px-1.5 py-0.5 text-center text-[#F8FAFC]"
                        />
                        <button
                          onClick={() => {
                            const updated = editingPlan.exercisesJson.filter((_, i) => i !== idx);
                            setEditingPlan({ ...editingPlan, exercisesJson: updated });
                          }}
                          className="text-[#64748B] hover:text-[#F87171] p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-white/[0.06] flex items-center justify-end gap-3">
              <button
                onClick={() => setEditingPlan(null)}
                className="px-4 py-2 rounded-xl text-xs text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={() => handleSaveGymTemplate(editingPlan)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#3B82F6] hover:bg-blue-600 text-xs font-semibold text-white transition-colors"
              >
                <Save className="w-3.5 h-3.5" /> Plan Speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
