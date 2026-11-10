import { config } from "dotenv";
config({ path: ".env.local" });

import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import { saveSyncedData } from "@/lib/store";

function runPythonScript(execName: string, scriptPath: string, token: string): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";

    try {
      const pyProcess = spawn(execName, [scriptPath], {
        env: { ...process.env, GARMIN_TOKEN: token },
      });

      pyProcess.stdout?.on("data", (data) => {
        stdout += data.toString();
      });

      pyProcess.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      pyProcess.on("error", (err) => {
        stderr += ` (Spawn ${execName} error: ${err.message})`;
        resolve({ exitCode: 1, stdout, stderr });
      });

      pyProcess.on("close", (code) => {
        resolve({ exitCode: code ?? 1, stdout, stderr });
      });
    } catch (err) {
      resolve({
        exitCode: 1,
        stdout,
        stderr: err instanceof Error ? err.message : "Spawn failed",
      });
    }
  });
}

export async function POST() {
  const token = process.env.GARMIN_TOKEN;
  if (!token) {
    return NextResponse.json({
      success: false,
      message: "Keine GARMIN_TOKEN Umgebungsvariable auf Railway gesetzt. Bitte in Railway unter Variables als GARMIN_TOKEN eintragen.",
      isMock: true,
      syncedAt: new Date().toISOString(),
    });
  }

  const scriptPath = path.join(process.cwd(), "scripts", "sync_garmin.py");

  try {
    // Try candidate executables in order until one succeeds with JSON output
    const candidates = process.platform === "win32"
      ? ["python", "py", "python3"]
      : ["python3", "python"];

    let result = { exitCode: 1, stdout: "", stderr: "" };

    for (const execName of candidates) {
      result = await runPythonScript(execName, scriptPath, token);
      if (result.stdout.trim()) {
        try {
          const testParse = JSON.parse(result.stdout);
          if (testParse.status === "success" || testParse.status === "error") {
            break;
          }
        } catch {
          // stdout wasn't valid sync json, continue to next candidate if available
        }
      }
    }

    if (result.exitCode !== 0 || !result.stdout.trim()) {
      return NextResponse.json({
        success: false,
        message: result.stderr.trim() || "Python Sync-Skript konnte nicht fehlerfrei ausgeführt werden. Bitte prüfe das Token-Format.",
        fallback: true,
      });
    }

    try {
      const parsed = JSON.parse(result.stdout);
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
        rawOutput: result.stdout,
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
