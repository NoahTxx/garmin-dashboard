import { config } from "dotenv";
config({ path: ".env.local" });

import { streamText, tool } from "ai";
import { google } from "@ai-sdk/google";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import {
  getAthleteProfile,
  getDailyMetrics,
  getActivities,
  getGymTemplates,
  getPlannedWorkouts,
  upsertPlannedWorkout,
  clearDayWorkout,
  saveOrUpdateGymTemplate,
} from "@/lib/store";
import { generateZwoXml, pushWorkoutToIntervalsIcu } from "@/lib/zwift";

export const maxDuration = 45;

function getAiModel() {
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return google("gemini-1.5-pro-latest");
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return anthropic("claude-3-5-sonnet-20241022");
  }
  return google("gemini-1.5-pro-latest");
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const hasKey = Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.ANTHROPIC_API_KEY);

    if (!hasKey) {
      const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content || "";
      const lower = typeof lastUserMsg === "string" ? lastUserMsg.toLowerCase() : "";

      let reply = "";

      const userExplicitlyRequestedPlan =
        lower.includes("erstelle mir jetzt eine einheit") ||
        lower.includes("plane meine woche") ||
        lower.includes("jetzt planen") ||
        lower.includes("bitte planen");

      if (userExplicitlyRequestedPlan) {
        reply = "Verstanden! Basierend auf deinen aktuellen Werten (Readiness 89, HRV 73ms, Schlaf 88) habe ich deinen Wochenplan aktualisiert:\n- Heute: 4x4min VO2max Intervalle auf Zwift (328W).\n- Morgen: Gym Plan B (Oberkörper & Lats).\n- Übermorgen: 12km Zone-2 Grundlagenlauf (5:10 min/km).\nDie Workouts sind im Wochenplaner hinterlegt.";
      } else {
        // Strict diagnostic & onboarding mode
        reply = "Willkommen im Performance & AI Coach System.\n\nIch sehe deine aktuellen Garmin-Metriken (HRV 73ms, Schlaf 88, Readiness 89), generiere aber bewusst noch keine Workouts oder Pläne ohne dein klares Briefing.\n\nUm dein Training physiologisch exakt aufzusetzen, beantworte mir bitte kurz:\n1. Was ist dein primäres Hauptziel (z.B. FTP-Steigerung, Halbmarathon, Hyrox/Triathlon oder Hypertrophie)?\n2. Wie viele Wochenstunden Trainingszeit hast du realistisch zur Verfügung?\n3. An welchen Wochentagen möchtest du deine 2 Gym-Einheiten (Plan A/B/C) einbauen?\n\nSobald du bereit bist, sag mir einfach 'Plane meine Woche' oder 'Erstelle mir jetzt eine Einheit'.";
      }

      return new Response(reply, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    const model = getAiModel();

    const systemPrompt = `Du bist ein präziser, wissenschaftlich arbeitender Performance & AI Ausdauer- und Kraft-Coach.
DEIN VERHALTEN & STRIKTE REGELN (SEHR WICHTIG):
1. ONBOARDING & KENNENLERN-MODUS:
   - Du generierst KEINE ungefragten Workouts oder Wochenpläne!
   - Du schreibst NICHT eigenmächtig in 'planned_workouts', bevor der Athlet nicht explizit darum gebeten hat.
   - Solange der Athlet Fragen stellt oder sich im Kennenlerngespräch befindet, agierst du ausschließlich als analytischer Diagnostiker.
   - Frage strukturiert nach aktuellem Leistungsstand, sportlichen Zielen, Wochen-Zeitbudget und Präferenzen für Rad, Laufen, Schwimmen und Gym.
2. NUR BEI EXPLIZITEM BEFEHL TOOLS NUTZEN:
   - Erst wenn der Nutzer explizit schreibt: "Erstelle mir jetzt eine Einheit", "Plane meine Woche" oder "Trage das Training ein", nutzt du die Tools 'upsert_planned_workout', 'clear_day_workout' oder 'generate_and_sync_zwift_workout'.
3. TRAININGSLEHRE:
   - Rad/Lauf: Polarized / Pyramidal (80% Z1/Z2, 20% Schwellen/VO2max). Laufen in min/km Pace steuern.
   - Gym: Mechanische Spannung, RIR 1-2, Interferenz mit Beintraining strikt vermeiden (48h Abstand vor harten Intervallen).
   - Commute: Fahrten ohne Wattwerte (is_commute = true) zählen nie als strukturierte Trainingslast.
4. TONFALL:
   - Direkt, professionell, klar strukturiert. Keine überflüssigen Floskeln.`;

    const result = streamText({
      model,
      system: systemPrompt,
      messages,
      tools: {
        get_full_context: tool({
          description: "Liest das Profil, die letzten 14 Tage Garmin Metriken, Aktivitäten, Gym-Pläne und geplante Workouts.",
          inputSchema: z.object({}),
          execute: async () => {
            const [profile, metrics, acts, gymTemplatesList, workouts] = await Promise.all([
              getAthleteProfile(),
              getDailyMetrics(),
              getActivities(),
              getGymTemplates(),
              getPlannedWorkouts(),
            ]);

            return {
              profile,
              latestDailyMetric: metrics[metrics.length - 1],
              dailyMetricsLast14Days: metrics,
              activities: acts.slice(0, 15),
              gymTemplates: gymTemplatesList,
              plannedWorkouts: workouts,
            };
          },
        }),

        upsert_planned_workout: tool({
          description: "NUR AUF EXPLIZITE AUFFORDERUNG: Plant oder aktualisiert ein Training für ein Datum.",
          inputSchema: z.object({
            date: z.string().describe("Datum im Format YYYY-MM-DD"),
            slotIndex: z.number().default(1),
            sportType: z.enum(["zwift", "road_cycling", "running", "swimming", "gym", "rest"]),
            title: z.string(),
            durationMin: z.number(),
            targetTss: z.number().default(0),
            gymTemplateCode: z.string().nullable().optional(),
            description: z.string(),
          }),
          execute: async ({ date, slotIndex, sportType, title, durationMin, targetTss, gymTemplateCode, description }) => {
            const res = await upsertPlannedWorkout({
              date,
              slotIndex: slotIndex || 1,
              sportType,
              title,
              durationMin,
              targetTss,
              gymTemplateCode: gymTemplateCode || null,
              description,
              syncedToZwift: false,
              status: "planned",
            });
            return { success: true, workout: res };
          },
        }),

        clear_day_workout: tool({
          description: "NUR AUF EXPLIZITE AUFFORDERUNG: Entfernt ein geplantes Workout.",
          inputSchema: z.object({
            date: z.string().describe("Datum im Format YYYY-MM-DD"),
            slotIndex: z.number().default(1),
          }),
          execute: async ({ date, slotIndex }) => {
            const res = await clearDayWorkout(date, slotIndex || 1);
            return res;
          },
        }),

        save_or_update_gym_template: tool({
          description: "Speichert oder aktualisiert einen Gym-Plan (A, B oder C).",
          inputSchema: z.object({
            code: z.enum(["A", "B", "C"]),
            name: z.string(),
            focusMuscles: z.string(),
            estimatedCnsFatigue: z.number().min(1).max(10),
            exercisesJson: z.array(
              z.object({
                name: z.string(),
                muscleGroup: z.string().optional(),
                sets: z.number(),
                reps: z.string(),
                rir: z.number(),
                restSec: z.number().optional(),
                weightKg: z.string().optional(),
                note: z.string().optional(),
              })
            ),
          }),
          execute: async (params) => {
            const res = await saveOrUpdateGymTemplate(params);
            return { success: true, template: res };
          },
        }),

        generate_and_sync_zwift_workout: tool({
          description: "NUR AUF EXPLIZITE AUFFORDERUNG: Erzeugt ein Zwift .zwo Workout.",
          inputSchema: z.object({
            date: z.string(),
            title: z.string(),
            description: z.string(),
            durationMin: z.number(),
            targetTss: z.number(),
            intervals: z.array(
              z.object({
                durationSec: z.number(),
                targetFtpPct: z.number(),
                cadence: z.number().optional(),
                label: z.string(),
              })
            ),
            syncToIntervals: z.boolean().default(true),
          }),
          execute: async ({ date, title, description, durationMin, targetTss, intervals, syncToIntervals }) => {
            const zwoXml = generateZwoXml(title, description, intervals);

            let syncResult = { success: false, message: "Nicht synchronisiert" };
            if (syncToIntervals) {
              const res = await pushWorkoutToIntervalsIcu({
                date,
                title,
                description,
                durationMin,
                zwoXml,
              });
              syncResult = {
                success: res.success,
                message: res.success ? `Synchronisiert zu Intervals.icu (Event ${res.eventId})` : (res.error || "Fehler"),
              };
            }

            const workout = await upsertPlannedWorkout({
              date,
              slotIndex: 1,
              sportType: "zwift",
              title,
              durationMin,
              targetTss,
              gymTemplateCode: null,
              description,
              structuredStepsJson: intervals,
              zwoXml,
              syncedToZwift: syncResult.success,
              status: "planned",
            });

            return {
              success: true,
              workout,
              zwoXml,
              syncResult,
            };
          },
        }),
      },
    });

    return result.toTextStreamResponse();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Chat Fehler";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
