import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import { updateAthleteProfile } from "@/lib/store";

export async function POST() {
  const token = process.env.GARMIN_TOKEN;
  if (!token) {
    return NextResponse.json({
      success: false,
      message: "Kein GARMIN_TOKEN in Umgebungsvariablen gefunden. Die App nutzt aktuelle lokale Mock- und Fallback-Daten.",
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

      // Update sync time
      await updateAthleteProfile({ lastSyncAt: new Date().toISOString() });

      return NextResponse.json({
        success: true,
        message: `Garmin Sync erfolgreich: ${parsed.metrics_count || 0} Metriken und ${parsed.activities_count || 0} Aktivitäten synchronisiert.`,
        data: parsed,
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
