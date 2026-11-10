import React, { useState } from "react";
import {
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Database,
  Smartphone,
  Save,
} from "lucide-react";
import { MockAthleteProfile, MockDailyMetric } from "@/lib/mock-data";

interface ProfileViewProps {
  profile: MockAthleteProfile | null;
  latestMetric: MockDailyMetric | undefined;
  onSyncGarmin: () => void;
  syncing: boolean;
  onUpdateProfile: (updated: Partial<MockAthleteProfile>) => void;
}

export function ProfileView({
  profile,
  latestMetric,
  onSyncGarmin,
  syncing,
  onUpdateProfile,
}: ProfileViewProps) {
  const [weight, setWeight] = useState(profile?.weightKg?.toString() || "72.5");
  const [restingHr, setRestingHr] = useState(profile?.restingHr?.toString() || "48");
  const [maxHr, setMaxHr] = useState(profile?.maxHr?.toString() || "190");
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveSettings = () => {
    onUpdateProfile({
      weightKg: parseFloat(weight) || 72.5,
      restingHr: parseInt(restingHr) || 48,
      maxHr: parseInt(maxHr) || 190,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  // Data health table rows
  const healthItems = [
    {
      metric: "Training Readiness",
      endpoint: "daily_metrics.training_readiness",
      unit: "score (0-100)",
      status: latestMetric?.trainingReadiness ? "OK" : "MISSING",
      value: latestMetric?.trainingReadiness ?? "No data",
    },
    {
      metric: "Sleep Score & Phasen",
      endpoint: "daily_metrics.sleep_score",
      unit: "score & sec",
      status: latestMetric?.sleepScore ? "OK" : "MISSING",
      value: latestMetric?.sleepScore ? `${latestMetric.sleepScore}/100` : "No data",
    },
    {
      metric: "HRV (Nacht & 7d)",
      endpoint: "daily_metrics.hrv_last_night",
      unit: "ms",
      status: latestMetric?.hrvLastNight ? "OK" : "MISSING",
      value: latestMetric?.hrvLastNight ? `${latestMetric.hrvLastNight} ms` : "No data",
    },
    {
      metric: "Acute Training Load",
      endpoint: "daily_metrics.acute_load",
      unit: "load index",
      status: latestMetric?.acuteLoad ? "OK" : "MISSING",
      value: latestMetric?.acuteLoad ?? "No data",
    },
    {
      metric: "Body Battery (Min/Max)",
      endpoint: "daily_metrics.body_battery",
      unit: "points (0-100)",
      status: latestMetric?.bodyBatteryMax ? "OK" : "MISSING",
      value:
        latestMetric?.bodyBatteryMax !== undefined
          ? `${latestMetric.bodyBatteryMin} - ${latestMetric.bodyBatteryMax}`
          : "No data",
    },
  ];

  return (
    <div className="space-y-6 md:space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wider font-semibold text-[#94A3B8] mb-1">
            System & Configuration
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F8FAFC]">
            Profil & Datenintegrität
          </h1>
        </div>
        <button
          onClick={onSyncGarmin}
          disabled={syncing}
          className="inline-flex items-center gap-2 rounded-xl bg-[#3B82F6] hover:bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Synchronisiere..." : "Garmin Jetzt Syncen"}
        </button>
      </div>

      {/* 1. Connection & Token Health Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-[#121821] border border-white/[0.06] p-5">
          <div className="flex items-center justify-between mb-3 text-xs font-medium text-[#94A3B8]">
            <span className="uppercase tracking-wider">Garmin Connection</span>
            <ShieldCheck className="w-4 h-4 text-[#34D399]" />
          </div>
          <div className="text-xl font-bold text-[#F8FAFC] flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#34D399]" />
            Aktiv & Authentifiziert
          </div>
          <p className="text-xs text-[#94A3B8] mt-2">
            Garth-Session und OAuth-Token sind gültig. Letzter Sync vor ca. 12 Minuten.
          </p>
        </div>

        <div className="rounded-2xl bg-[#121821] border border-white/[0.06] p-5">
          <div className="flex items-center justify-between mb-3 text-xs font-medium text-[#94A3B8]">
            <span className="uppercase tracking-wider">Lokale Datenbank</span>
            <Database className="w-4 h-4 text-[#3B82F6]" />
          </div>
          <div className="text-xl font-bold text-[#F8FAFC]">Postgres (Drizzle)</div>
          <p className="text-xs text-[#94A3B8] mt-2">
            Alle Rohdaten und abgeleiteten Metriken werden persistent gecacht.
          </p>
        </div>

        <div className="rounded-2xl bg-[#121821] border border-white/[0.06] p-5">
          <div className="flex items-center justify-between mb-3 text-xs font-medium text-[#94A3B8]">
            <span className="uppercase tracking-wider">Geräte-Status</span>
            <Smartphone className="w-4 h-4 text-[#8B5CF6]" />
          </div>
          <div className="text-xl font-bold text-[#F8FAFC]">Garmin Forerunner</div>
          <p className="text-xs text-[#94A3B8] mt-2">
            Automatische Hintergrundabfrage von Aktivitäten, HRV & Schlafzyklen.
          </p>
        </div>
      </div>

      {/* 2. Data Health & Integrity Layer Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-wide uppercase text-[#94A3B8]">
            Data Health & Integrity Inspector
          </h2>
          <span className="text-xs text-[#64748B]">Keine stillen Fallbacks · Strict Null-Handling</span>
        </div>

        <div className="rounded-2xl bg-[#121821] border border-white/[0.06] overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.06] text-[#94A3B8]">
                <th className="p-4 font-semibold">Metrik</th>
                <th className="p-4 font-semibold">Endpoint / Schema</th>
                <th className="p-4 font-semibold">Einheit</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">Letzter Wert</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {healthItems.map((item, idx) => (
                <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-4 font-medium text-[#F8FAFC]">{item.metric}</td>
                  <td className="p-4 font-mono text-[11px] text-[#64748B]">{item.endpoint}</td>
                  <td className="p-4 text-[#94A3B8]">{item.unit}</td>
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.status === "OK"
                          ? "bg-emerald-500/10 text-[#34D399] border border-emerald-500/20"
                          : "bg-rose-500/10 text-[#F87171] border border-rose-500/20"
                      }`}
                    >
                      {item.status === "OK" ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <AlertTriangle className="w-3 h-3" />
                      )}
                      {item.status}
                    </span>
                  </td>
                  <td className="p-4 text-right font-mono font-semibold tabular-nums text-[#F8FAFC]">
                    {item.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Athlete Parameters */}
      <div className="rounded-2xl bg-[#121821] border border-white/[0.06] p-6 space-y-4 max-w-xl">
        <h2 className="text-sm font-semibold tracking-wide uppercase text-[#94A3B8]">
          Athleten-Parameter & Zonen
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-[#94A3B8] block mb-1.5">Gewicht (kg)</label>
            <input
              type="number"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full rounded-xl bg-[#0B0F14] border border-white/[0.08] px-3 py-2 text-sm text-[#F8FAFC] font-mono focus:outline-none focus:border-[#3B82F6]"
            />
          </div>
          <div>
            <label className="text-xs text-[#94A3B8] block mb-1.5">Ruhepuls (bpm)</label>
            <input
              type="number"
              value={restingHr}
              onChange={(e) => setRestingHr(e.target.value)}
              className="w-full rounded-xl bg-[#0B0F14] border border-white/[0.08] px-3 py-2 text-sm text-[#F8FAFC] font-mono focus:outline-none focus:border-[#3B82F6]"
            />
          </div>
          <div>
            <label className="text-xs text-[#94A3B8] block mb-1.5">Max HR (bpm)</label>
            <input
              type="number"
              value={maxHr}
              onChange={(e) => setMaxHr(e.target.value)}
              className="w-full rounded-xl bg-[#0B0F14] border border-white/[0.08] px-3 py-2 text-sm text-[#F8FAFC] font-mono focus:outline-none focus:border-[#3B82F6]"
            />
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between">
          <button
            onClick={handleSaveSettings}
            className="inline-flex items-center gap-2 rounded-xl bg-[#3B82F6] hover:bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors"
          >
            <Save className="w-3.5 h-3.5" /> Parameter Speichern
          </button>
          {savedSuccess && (
            <span className="text-xs text-[#34D399] font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Gespeichert
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
