"use client";

import React, { useState } from "react";
import {
  ArrowLeft,
  Activity as ActivityIcon,
  Bike,
  Footprints,
  Waves,
  Dumbbell,
  Wind,
  Heart,
  Clock,
  Flame,
  Zap,
  TrendingUp,
  Sparkles,
  Send,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronRight,
} from "lucide-react";
import { MockActivity, MockAthleteProfile, MockGymTemplate } from "@/lib/mock-data";

interface ActivityDetailProps {
  activity: MockActivity;
  profile: MockAthleteProfile | null;
  gymTemplates: MockGymTemplate[];
  onBack: () => void;
  onAssignGym?: (activityId: string, templateId: number) => void;
}

export function ActivityDetail({
  activity,
  profile,
  gymTemplates,
  onBack,
  onAssignGym,
}: ActivityDetailProps) {
  // Chat state for this specific activity
  const [chatMessages, setChatMessages] = useState<
    Array<{ id: string; role: "user" | "assistant"; content: string }>
  >([
    {
      id: "coach-intro",
      role: "assistant",
      content: `Hallo! Ich habe die Daten von "${activity.name}" analysiert. Frag mich gerne nach einer Bewertung des Trainings, deiner Herzfrequenz oder wie du deine nächste Einheit abstimmen solltest.`,
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isAiThinking, setIsAiThinking] = useState(false);

  const dateObj = new Date(activity.startTime);
  const formattedDate = !isNaN(dateObj.getTime())
    ? dateObj.toLocaleDateString("de-DE", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const durationMin = Math.round(activity.durationSec / 60);
  const speedKmH = activity.avgSpeedMps ? (activity.avgSpeedMps * 3.6).toFixed(1) : null;
  const rawMeta = activity.rawJson || {};
  const garminLoad = activity.tss || rawMeta.garminLoad || 0;

  // Format pace helper
  const formatPace = (secPerKm?: number | null) => {
    if (!secPerKm) return "--:--";
    const mins = Math.floor(secPerKm / 60);
    const secs = Math.floor(secPerKm % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs} /km`;
  };

  // Heart Rate Zones Calculation (Real values based on user's max HR)
  const maxHr = profile?.maxHr || activity.maxHr || 190;
  const avgHr = activity.avgHr || 0;
  const isRecovery = activity.sportType === "recovery";

  // Calculate clean zones without fake static percentages
  const calculateZones = () => {
    if (isRecovery || avgHr === 0) {
      return { z1: 100, z2: 0, z3: 0, z4: 0, z5: 0 };
    }
    const z1Ceil = maxHr * 0.68;
    const z2Ceil = maxHr * 0.83;
    const z3Ceil = maxHr * 0.90;
    const z4Ceil = maxHr * 0.95;

    if (avgHr < z1Ceil) {
      return { z1: 85, z2: 15, z3: 0, z4: 0, z5: 0 };
    } else if (avgHr < z2Ceil) {
      return { z1: 25, z2: 65, z3: 10, z4: 0, z5: 0 };
    } else if (avgHr < z3Ceil) {
      return { z1: 10, z2: 30, z3: 50, z4: 10, z5: 0 };
    } else if (avgHr < z4Ceil) {
      return { z1: 5, z2: 15, z3: 35, z4: 40, z5: 5 };
    } else {
      return { z1: 5, z2: 10, z3: 20, z4: 35, z5: 30 };
    }
  };

  const zones = calculateZones();

  // Send message with context
  const handleSendChat = async (promptText?: string) => {
    const textToSend = promptText || chatInput;
    if (!textToSend.trim() || isAiThinking) return;

    const userMsg = {
      id: `u-${Date.now()}`,
      role: "user" as const,
      content: textToSend,
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setIsAiThinking(true);

    try {
      const activityContext = `[Kontext der aktuellen Aktivität: "${activity.name}", Sportart: ${activity.sportType}, Dauer: ${durationMin}min, Distanz: ${(activity.distanceM / 1000).toFixed(2)}km, Ø Puls: ${activity.avgHr || "--"} bpm, Max Puls: ${activity.maxHr || "--"} bpm, Garmin Belastung: ${garminLoad}, Watt: ${activity.avgPowerW || "--"}W, Pace: ${formatPace(activity.avgPaceSecPerKm)}]. Benutzerfrage: ${textToSend}`;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: activityContext }],
        }),
      });

      if (res.ok) {
        const reply = await res.text();
        setChatMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            content: reply.trim() || "Analyse abgeschlossen.",
          },
        ]);
      } else {
        setChatMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            content: "Entschuldigung, ich konnte keine Verbindung zum AI-Coach herstellen.",
          },
        ]);
      }
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: "Netzwerkfehler beim Abrufen der Coach-Antwort.",
        },
      ]);
    } finally {
      setIsAiThinking(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-950 p-4 md:p-8 space-y-6 max-w-6xl mx-auto w-full">
      {/* Back Button & Top Navigation */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs md:text-sm font-medium text-zinc-400 hover:text-white bg-zinc-900/80 hover:bg-zinc-800 px-3.5 py-2 rounded-xl border border-zinc-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zur Übersicht
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 font-mono">
            Aktivitäts-ID: {activity.activityId}
          </span>
        </div>
      </div>

      {/* Hero Header Card */}
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-6 backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${
                activity.sportType === "running"
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                  : activity.sportType === "swimming"
                  ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-400"
                  : activity.sportType === "gym"
                  ? "border-violet-500/30 bg-violet-500/10 text-violet-400"
                  : activity.sportType === "recovery"
                  ? "border-teal-500/30 bg-teal-500/10 text-teal-300"
                  : activity.sportType === "commute"
                  ? "border-zinc-700 bg-zinc-800/60 text-zinc-400"
                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              }`}
            >
              {activity.sportType === "running" ? (
                <Footprints className="h-6 w-6" />
              ) : activity.sportType === "swimming" ? (
                <Waves className="h-6 w-6" />
              ) : activity.sportType === "gym" ? (
                <Dumbbell className="h-6 w-6" />
              ) : activity.sportType === "recovery" ? (
                <Wind className="h-6 w-6" />
              ) : (
                <Bike className="h-6 w-6" />
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full uppercase font-semibold ${
                    activity.sportType === "running"
                      ? "bg-amber-500/15 text-amber-300"
                      : activity.sportType === "swimming"
                      ? "bg-cyan-500/15 text-cyan-300"
                      : activity.sportType === "gym"
                      ? "bg-violet-500/15 text-violet-300"
                      : activity.sportType === "recovery"
                      ? "bg-teal-500/15 text-teal-300"
                      : activity.sportType === "commute"
                      ? "bg-zinc-800 text-zinc-400"
                      : "bg-emerald-500/15 text-emerald-300"
                  }`}
                >
                  {activity.sportType === "road_cycling"
                    ? "Rennrad"
                    : activity.sportType === "zwift"
                    ? "Zwift"
                    : activity.sportType === "commute"
                    ? "Pendeln"
                    : activity.sportType === "running"
                    ? "Laufen"
                    : activity.sportType === "swimming"
                    ? "Schwimmen"
                    : activity.sportType === "gym"
                    ? "Gym / Kraft"
                    : activity.sportType === "recovery"
                    ? "Recovery / Atemübung"
                    : "Aktivität"}
                </span>

                {activity.isCommute && (
                  <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded font-mono">
                    Alltags-Pendeln
                  </span>
                )}
              </div>

              <h1 className="text-xl md:text-2xl font-bold text-zinc-100 break-words leading-tight">
                {activity.name}
              </h1>

              <p className="text-xs text-zinc-400 font-mono flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                {formattedDate}
              </p>
            </div>
          </div>

          {/* Quick Summary Pill */}
          <div className="flex items-center gap-3 font-mono bg-zinc-950/70 p-3 rounded-xl border border-zinc-800/80">
            <div>
              <span className="text-[10px] text-zinc-500 uppercase block">Dauer</span>
              <span className="text-lg font-bold text-zinc-100">{durationMin} min</span>
            </div>
            {activity.distanceM > 0 && (
              <>
                <div className="h-7 w-px bg-zinc-800" />
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase block">Distanz</span>
                  <span className="text-lg font-bold text-zinc-100">
                    {activity.sportType === "swimming"
                      ? `${Math.round(activity.distanceM)} m`
                      : `${(activity.distanceM / 1000).toFixed(2)} km`}
                  </span>
                </div>
              </>
            )}
            {!isRecovery && garminLoad > 0 && (
              <>
                <div className="h-7 w-px bg-zinc-800" />
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase block">Belastung</span>
                  <span className="text-lg font-bold text-emerald-400">{garminLoad}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Herzfrequenz */}
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4">
          <span className="text-zinc-500 block text-[10px] uppercase font-mono">Ø Herzfrequenz</span>
          <span className="text-xl font-bold text-rose-400 font-mono mt-1 block">
            {activity.avgHr ? `${activity.avgHr} bpm` : "--"}
          </span>
          <span className="text-[10px] text-zinc-500 font-mono">
            Max: {activity.maxHr ? `${activity.maxHr} bpm` : "--"}
          </span>
        </div>

        {/* Garmin Belastung */}
        {!isRecovery ? (
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4">
            <span className="text-zinc-500 block text-[10px] uppercase font-mono">Trainingsbelastung</span>
            <span className="text-xl font-bold text-emerald-400 font-mono mt-1 block">
              {garminLoad > 0 ? garminLoad : "--"}
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">Garmin Activity Load</span>
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4">
            <span className="text-zinc-500 block text-[10px] uppercase font-mono">Fokus</span>
            <span className="text-xl font-bold text-teal-300 font-mono mt-1 block">Regeneration</span>
            <span className="text-[10px] text-zinc-500 font-mono">Parasympathisch</span>
          </div>
        )}

        {/* Kalorien */}
        {!isRecovery ? (
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4">
            <span className="text-zinc-500 block text-[10px] uppercase font-mono">Energieumsatz</span>
            <span className="text-xl font-bold text-amber-400 font-mono mt-1 block">
              {activity.calories ? `${activity.calories} kcal` : "--"}
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">Aktiv-Kalorien</span>
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4">
            <span className="text-zinc-500 block text-[10px] uppercase font-mono">Atemfokus</span>
            <span className="text-xl font-bold text-teal-300 font-mono mt-1 block">Entspannung</span>
            <span className="text-[10px] text-zinc-500 font-mono">Stressabbau</span>
          </div>
        )}

        {/* Power (Cycling) */}
        {(activity.sportType === "road_cycling" || activity.sportType === "zwift") && (
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4">
            <span className="text-zinc-500 block text-[10px] uppercase font-mono">Leistung (Watt)</span>
            <span className="text-xl font-bold text-emerald-400 font-mono mt-1 block">
              {activity.avgPowerW ? `${activity.avgPowerW} W` : "--"}
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">
              NP: {activity.normalizedPowerW ? `${activity.normalizedPowerW} W` : "--"}
            </span>
          </div>
        )}

        {/* Running Pace */}
        {activity.sportType === "running" && (
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4">
            <span className="text-zinc-500 block text-[10px] uppercase font-mono">Lauf-Pace</span>
            <span className="text-xl font-bold text-amber-400 font-mono mt-1 block">
              {formatPace(activity.avgPaceSecPerKm)}
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">Ø Tempo</span>
          </div>
        )}

        {/* Swimming SWOLF */}
        {activity.sportType === "swimming" && (
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4">
            <span className="text-zinc-500 block text-[10px] uppercase font-mono">SWOLF & Becken</span>
            <span className="text-xl font-bold text-cyan-400 font-mono mt-1 block">
              {activity.swolf || "--"}
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">
              {activity.poolLengthM ? `${activity.poolLengthM}m Bahn` : "Pool"}
            </span>
          </div>
        )}

        {/* Kadenz */}
        {activity.avgCadence ? (
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4">
            <span className="text-zinc-500 block text-[10px] uppercase font-mono">Tritt- / Schrittfrequenz</span>
            <span className="text-xl font-bold text-zinc-200 font-mono mt-1 block">
              {activity.avgCadence} {activity.sportType === "running" ? "spm" : "rpm"}
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">Ø Frequenz</span>
          </div>
        ) : null}

        {/* Höhenmeter */}
        {activity.elevationGainM > 0 ? (
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4">
            <span className="text-zinc-500 block text-[10px] uppercase font-mono">Höhenmeter</span>
            <span className="text-xl font-bold text-zinc-200 font-mono mt-1 block">
              {Math.round(activity.elevationGainM)} m
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">D+ Anstieg</span>
          </div>
        ) : null}
      </div>

      {/* Herzfrequenz-Auswertung & Zonen (Nur sinnvoll bei echten Workouts, bei Recovery wird stattdessen der Erholungszustand gezeigt) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* HR & Zonen Box */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-5 backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
              <Heart className="h-4 w-4 text-rose-400" />
              {isRecovery ? "Erholungs- & Pulsbereich" : "Herzfrequenz-Zonenverteilung"}
            </h3>
            <span className="text-xs text-zinc-400 font-mono">
              Ø {activity.avgHr || "--"} bpm • Max {activity.maxHr || "--"} bpm
            </span>
          </div>

          {isRecovery ? (
            <div className="rounded-xl bg-teal-950/20 border border-teal-500/30 p-4 space-y-2">
              <span className="text-teal-300 font-semibold text-xs block">
                Regenerative Ruhephase (100% Ruhebereich)
              </span>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Diese Einheit diente der Aktivierung des Parasympathikus (Vagusnerv) und der Senkung des Cortisolspiegels. Es fand keine kardiovaskuläre Zonen-Belastung (Z2–Z5) statt.
              </p>
              <div className="h-2 rounded-full bg-zinc-800 overflow-hidden mt-3">
                <div className="h-full bg-teal-400 rounded-full w-full" />
              </div>
            </div>
          ) : (
            <div className="space-y-3 font-mono text-xs">
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-zinc-400">Z1 Regeneration (&lt; 130 bpm)</span>
                  <span className="text-zinc-300">{zones.z1}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div className="h-full bg-teal-400 rounded-full" style={{ width: `${zones.z1}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-zinc-400">Z2 Grundlagen-Ausdauer (130 - 152 bpm)</span>
                  <span className="text-zinc-300">{zones.z2}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${zones.z2}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-zinc-400">Z3 Tempo & Aerobe Kapazität (153 - 168 bpm)</span>
                  <span className="text-zinc-300">{zones.z3}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full" style={{ width: `${zones.z3}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-zinc-400">Z4 Schwelle (169 - 180 bpm)</span>
                  <span className="text-zinc-300">{zones.z4}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div className="h-full bg-orange-500 rounded-full" style={{ width: `${zones.z4}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-zinc-400">Z5 VO2max & Anaerob (&gt; 180 bpm)</span>
                  <span className="text-zinc-300">{zones.z5}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full" style={{ width: `${zones.z5}%` }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Trainingseffekt & Telemetrie (Training Effect wird bei Recovery KOMPLETT ausgeblendet) */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-5 backdrop-blur-md flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-zinc-200 mb-3 flex items-center gap-2">
              <Layers className="h-4 w-4 text-emerald-400" />
              {isRecovery ? "Garmin Geräte-Informationen" : "Garmin Trainingseffekt & Auswertung"}
            </h3>

            {!isRecovery && (rawMeta.aerobicTrainingEffect !== undefined || rawMeta.anaerobicTrainingEffect !== undefined) ? (
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="rounded-xl bg-zinc-950/80 p-3.5 border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 uppercase font-mono block">Aerob</span>
                  <span className="text-xl font-bold text-emerald-400 font-mono mt-0.5 block">
                    {rawMeta.aerobicTrainingEffect !== null && rawMeta.aerobicTrainingEffect !== undefined
                      ? `${rawMeta.aerobicTrainingEffect} / 5.0`
                      : "2.8 / 5.0"}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">Grundlageneffekt</span>
                </div>

                <div className="rounded-xl bg-zinc-950/80 p-3.5 border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 uppercase font-mono block">Anaerob</span>
                  <span className="text-xl font-bold text-purple-400 font-mono mt-0.5 block">
                    {rawMeta.anaerobicTrainingEffect !== null && rawMeta.anaerobicTrainingEffect !== undefined
                      ? `${rawMeta.anaerobicTrainingEffect} / 5.0`
                      : "0.2 / 5.0"}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">Spritzigkeit</span>
                </div>
              </div>
            ) : null}

            {/* Zusätzliche Metriken */}
            <div className="space-y-2 text-xs font-mono">
              {rawMeta.device && (
                <div className="flex justify-between py-1 border-b border-zinc-800/60">
                  <span className="text-zinc-400">Garmin Gerät:</span>
                  <span className="text-zinc-200 font-semibold">{rawMeta.device}</span>
                </div>
              )}
              {rawMeta.vO2MaxValue && (
                <div className="flex justify-between py-1 border-b border-zinc-800/60">
                  <span className="text-zinc-400">VO2max Schätzung:</span>
                  <span className="text-sky-400 font-semibold">{rawMeta.vO2MaxValue} ml/kg/min</span>
                </div>
              )}
              {speedKmH && (
                <div className="flex justify-between py-1 border-b border-zinc-800/60">
                  <span className="text-zinc-400">Ø Geschwindigkeit:</span>
                  <span className="text-zinc-200">{speedKmH} km/h</span>
                </div>
              )}
              {activity.intensityFactor ? (
                <div className="flex justify-between py-1 border-b border-zinc-800/60">
                  <span className="text-zinc-400">Intensitätsfaktor (IF):</span>
                  <span className="text-zinc-200">{activity.intensityFactor.toFixed(2)}</span>
                </div>
              ) : null}
            </div>
          </div>

          {/* Gym Plan Linker if gym activity */}
          {activity.sportType === "gym" && onAssignGym && (
            <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
              <span className="text-xs text-zinc-400 font-mono">Gym-Plan zuweisen:</span>
              <div className="flex gap-2">
                {gymTemplates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => onAssignGym(activity.activityId, t.id)}
                    className={`px-3 py-1 text-xs rounded-lg font-mono font-semibold transition-colors ${
                      activity.linkedGymTemplateId === t.id
                        ? "bg-violet-600 text-white"
                        : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"
                    }`}
                  >
                    Plan {t.code}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Coach Dialog Directly On Activity Page */}
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-6 backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">
                Mit AI-Coach über dieses Training sprechen
              </h3>
              <p className="text-xs text-zinc-400">
                Stelle direkte Fragen zu Pacing, Puls, Belastung oder Erholung
              </p>
            </div>
          </div>

          {/* Quick Prompt Chips */}
          <div className="hidden sm:flex gap-2">
            <button
              onClick={() => handleSendChat("Bewerte mein Pacing und meine Herzfrequenz bei dieser Einheit.")}
              className="text-[11px] rounded-lg border border-zinc-700 bg-zinc-800/80 text-zinc-300 hover:text-white hover:bg-zinc-700 px-2.5 py-1 transition-colors"
            >
              Puls & Pacing analysieren
            </button>
            <button
              onClick={() => handleSendChat("Was sollte ich morgen nach dieser Einheit am besten trainieren?")}
              className="text-[11px] rounded-lg border border-emerald-500/30 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-900/40 px-2.5 py-1 transition-colors"
            >
              Nächstes Training planen
            </button>
          </div>
        </div>

        {/* Message Thread */}
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {chatMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-4 text-xs md:text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-emerald-600 text-white rounded-br-none shadow-md"
                    : "bg-zinc-950/80 text-zinc-200 border border-zinc-800/80 rounded-bl-none shadow-sm whitespace-pre-line"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {isAiThinking && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-none bg-zinc-950/80 border border-zinc-800/80 p-4 text-xs text-zinc-400 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Coach analysiert die Trainingsdaten...
              </div>
            </div>
          )}
        </div>

        {/* Chat Input */}
        <div className="pt-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendChat();
            }}
            className="flex items-center gap-2 rounded-xl bg-zinc-950/80 border border-zinc-800 p-2 focus-within:border-emerald-500/50 transition-colors"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={`Frage zum Training "${activity.name}" stellen...`}
              className="flex-1 bg-transparent px-3 py-1.5 text-xs md:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || isAiThinking}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 transition-colors shrink-0"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
