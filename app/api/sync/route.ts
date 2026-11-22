import { config } from "dotenv";
config({ path: ".env.local" });

import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { saveSyncedData } from "@/lib/store";

function runPythonScript(
  execName: string,
  scriptPath: string,
  token: string,
  days: number = 30
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let isSettled = false;

    try {
      const pyProcess = spawn(execName, [scriptPath, String(days)], {
        env: { ...process.env, GARMIN_TOKEN: token },
      });

      // 60 Sekunden Timeout um Blockieren zu verhindern
      const timer = setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          try {
            pyProcess.kill("SIGKILL");
          } catch {}
          resolve({
            exitCode: 124,
            stdout,
            stderr: "Python Sync-Skript Zeitüberschreitung (Timeout nach 60s).",
          });
        }
      }, 60000);

      pyProcess.stdout?.on("data", (data) => {
        stdout += data.toString();
      });

      pyProcess.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      pyProcess.on("error", (err) => {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(timer);
          stderr += ` (Spawn ${execName} error: ${err.message})`;
          resolve({ exitCode: 1, stdout, stderr });
        }
      });

      pyProcess.on("close", (code) => {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(timer);
          resolve({ exitCode: code ?? 1, stdout, stderr });
        }
      });
    } catch (err) {
      if (!isSettled) {
        isSettled = true;
        resolve({
          exitCode: 1,
          stdout,
          stderr: err instanceof Error ? err.message : "Spawn failed",
        });
      }
    }
  });
}

export async function POST(req: Request) {
  const token = process.env.GARMIN_TOKEN;
  if (!token) {
    return NextResponse.json({
      success: false,
      message: "Keine GARMIN_TOKEN Umgebungsvariable auf Railway gesetzt. Bitte in Railway unter Variables als GARMIN_TOKEN eintragen.",
      isMock: true,
      syncedAt: new Date().toISOString(),
    });
  }

  let requestedDays = 30;
  try {
    const body = await req.json();
    if (typeof body?.days === "number" && body.days > 0) {
      requestedDays = Math.min(body.days, 60);
    }
  } catch {
    // Leerer Body ist zulässig
  }

  const scriptPath = path.join(process.cwd(), "scripts", "sync_garmin.py");

  try {
    // Robust executable resolution (Windows vs. Linux / Railway Nixpacks)
    const candidates: string[] = [];
    if (process.platform === "win32") {
      candidates.push("python", "py", "python3");
    } else {
      // Bekannte Linux / Nixpacks Pfade zuerst prüfen
      const nixPlaformPaths = [
        "/root/.nix-profile/bin/python3",
        "/nix/var/nix/profiles/default/bin/python3",
        "/usr/local/bin/python3",
        "/usr/bin/python3",
      ];
      for (const p of nixPlaformPaths) {
        if (fs.existsSync(p)) {
          candidates.push(p);
        }
      }
      candidates.push("python3", "python");
    }

    let result = { exitCode: 1, stdout: "", stderr: "" };

    for (const execName of candidates) {
      result = await runPythonScript(execName, scriptPath, token, requestedDays);
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
      // Fehler bereinigen (keine sensiblen Tokens im client anzeigen)
      const cleanErr = (result.stderr.trim() || "")
        .replace(/token=([^\s&]+)/gi, "token=***")
        .slice(0, 300);

      return NextResponse.json(
        {
          success: false,
          message: cleanErr || "Python Sync-Skript konnte nicht fehlerfrei ausgeführt werden. Bitte prüfe das Token-Format.",
        },
        { status: 500 }
      );
    }

    try {
      const parsed = JSON.parse(result.stdout);
      if (parsed.status === "error") {
        return NextResponse.json(
          {
            success: false,
            message: parsed.message,
          },
          { status: 500 }
        );
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
      return NextResponse.json(
        {
          success: false,
          message: "Ungültige Antwort vom Garmin Sync-Skript.",
          rawOutput: result.stdout,
        },
        { status: 500 }
      );
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unbekannter Serverfehler";
    return NextResponse.json(
      {
        success: false,
        message: `Sync-Fehler: ${msg}`,
      },
      { status: 500 }
    );
  }
}
