import { config } from "dotenv";
config({ path: ".env.local" });

import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import { saveSyncedData } from "@/lib/store";

export async function POST() {
  const token = process.env.GARMIN_TOKEN;
  if (!token) {
    return NextResponse.json({
      success: false,
      message: "Kein GARMIN_TOKEN in .env.local gefunden.",
      isMock: true,
      syncedAt: new Date().toISOString(),
    });
  }

  const scriptPath = path.join(process.cwd(), "scripts", "sync_garmin.py");

  try {
    const pythonExec = process.platform === "win32" ? "python" : "python3";
    const pyProcess = spawn(pythonExec, [scriptPath], {
      env: { ...process.env, GARMIN_TOKEN: token },
    });

    let stdout = "";
    let stderr = "";

    pyProcess.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    pyProcess.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    const exitCode = await new Promise<number>((resolve) => {
      pyProcess.on("close", resolve);
      pyProcess.on("error", () => resolve(1));
    });

    if (exitCode !== 0 || !stdout.trim()) {
      return NextResponse.json({
        success: false,
        message: stderr || "Python Sync-Skript konnte nicht fehlerfrei ausgeführt werden.",
        fallback: true,
      });
    }

    try {
      const parsed = JSON.parse(stdout);
      if (parsed.status === "error") {
        return NextResponse.json({
          success: false,
          message: parsed.message,
          fallback: true,
        });
      }

      // Persist metrics, activities and athlete stats
      await saveSyncedData({
        athleteStats: parsed.athlete_stats,
        metrics: parsed.metrics,
        activities: parsed.activities,
      });

      return NextResponse.json({
        success: true,
        message: `Garmin Sync erfolgreich: ${parsed.metrics_count || 0} Tage Metriken und ${parsed.activities_count || 0} Aktivitäten synchronisiert.`,
        data: {
          metrics_count: parsed.metrics_count,
          activities_count: parsed.activities_count,
          athlete_stats: parsed.athlete_stats,
        },
      });
    } catch {
      return NextResponse.json({
        success: false,
        message: "Ungültige Antwort vom Garmin Sync-Skript.",
        rawOutput: stdout,
      });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unbekannter Serverfehler";
    return NextResponse.json({
      success: false,
      message: `Sync-Fehler: ${msg}`,
      fallback: true,
    });
  }
}
