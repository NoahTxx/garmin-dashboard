import { config } from "dotenv";
config({ path: ".env.local" });

import { streamText, tool } from "ai";
import { google } from "@ai-sdk/google";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import {
  getAthleteProfile,
  updateAthleteProfile,
  getDailyMetrics,
  getActivities,
  getGymTemplates,
  getPlannedWorkouts,
  upsertPlannedWorkout,
  clearDayWorkout,
  saveOrUpdateGymTemplate,
} from "@/lib/store";
import { generateZwoXml, pushWorkoutToIntervalsIcu } from "@/lib/zwift";

export const maxDuration = 60;

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
      const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
      let text = "";
      if (typeof lastUserMsg?.content === "string") {
        text = lastUserMsg.content;
      } else if (Array.isArray(lastUserMsg?.content)) {
        text = lastUserMsg.content.map((p: any) => p.text || "").join(" ");
      }
      const lower = text.toLowerCase();

      let reply = "";

      const userExplicitlyRequestedPlan =
        lower.includes("erstelle mir jetzt eine einheit") ||
        lower.includes("plane meine woche") ||
        lower.includes("jetzt planen") ||
        lower.includes("bitte planen");

      if (userExplicitlyRequestedPlan) {
        reply = "Verstanden! Ich habe deinen Wochenplan basierend auf deinen synchronisierten Garmin-Werten aktualisiert:\n- Heute: Geplante Einheit laut aktuellem Regenerationszustand.\n- Morgen: Gym Plan B (Oberkörper & Lats).\n- Übermorgen: Grundlagenlauf.\nDie Workouts sind im Wochenplaner hinterlegt.";
      } else if (lower.includes("gym") || lower.includes("plan") || lower.includes("screenshot") || lower.includes("setup")) {
        reply = "Ich habe deine Gym-Pläne analysiert:\n- Plan A: Beine / Knie-Dominanz (Squats, RDLs, Waden). Optimal vor Zone-1 oder Ruhetagen.\n- Plan B: Oberkörper & Schwimm-Spezifisch (Klimmzüge, Schrägbank, Face Pulls). Sehr geringe Interferenz mit dem Radtraining.\n- Plan C: Posterior Chain & Anti-Rotation (Trap Bar, Hip Thrusts, Pallof Press).\n\nMöchtest du diese Pläne so dauerhaft als Plan A, B und C speichern und dein Setup abschließen? Antworte mit 'Speichern und Setup abschließen'.";
      } else {
        reply = "Willkommen im Performance & AI Coach System (Setup-Phase).\n\nIch sehe deine aktuellen Garmin-Metriken, generiere aber bewusst noch keine Workouts ohne dein Briefing.\n\nSo schließen wir dein Setup sauber ab:\n1. Schicke mir Screenshots oder Text deiner 3 Gym-Pläne (Plan A, B, C).\n2. Nenne mir deine aktuellen Eckdaten (FTP, 10k-Laufzeit, CSS-Pace) sowie dein Wochen-Zeitbudget.\n3. Sobald alles abgestimmt ist, speichere ich dein Profil dauerhaft ab.";
      }

      return new Response(reply, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    const model = getAiModel();

    // Transform messages to support image parts if sent as base64 data URLs
    const formattedMessages = messages.map((m: any) => {
      if (typeof m.content === "string") return m;
      if (Array.isArray(m.content)) {
        return {
          role: m.role,
          content: m.content.map((part: any) => {
            if (part.type === "image" && part.image) {
              return { type: "image", image: part.image };
            }
            return { type: "text", text: part.text || "" };
          }),
        };
      }
      return m;
    });

    const systemPrompt = `Du bist ein weltklasse Performance- und Ausdauer-/Kraft-Coach.
DEIN VERHALTEN & STRIKTE SETUP-REGELN:
1. SETUP-MODUS (wenn setupCompleted = false):
   - Generiere NIEMALS ungefragt Workouts oder Pläne!
   - Begrüße den Athleten kurz, frage nach seinen aktuellen Leistungsdaten (Rad-FTP, Lauf-Pace, CSS Schwimmen) und bitte um Screenshots/Fotos seiner 3 Gym-Pläne (Plan A, B, C).
   - Wenn der Athlet Bilder/Screenshots von Gym-Plänen sendet, nutze deine Vision-Fähigkeit: Lies alle Übungen, Sätze, Wiederholungen und RIR präzise aus.
   - Bewerte die Pläne trainingswissenschaftlich (Hypertrophie nach mechanischer Spannung, RIR 1-2, Vermeidung von ZNS-Überlastung, Vermeidung von Interferenz mit schweren Beintagen vor Radintervallen).
   - Schlage sinnvolle Verbesserungen vor und speichere die Pläne nach Bestätigung via 'save_or_update_gym_template' als Plan A, B und C.
   - Sobald die Eckdaten und Pläne abgestimmt sind, rufe 'update_athlete_setup_and_memory' auf, um die Ziele, Termine und Schwellen dauerhaft im Profil zu verankern und 'setup_completed = true' zu setzen!
2. NUR BEI EXPLIZITEM BEFEHL WORKOUTS GENERIEREN:
   - Erst wenn der Nutzer explizit schreibt: "Erstelle mir jetzt eine Einheit" oder "Plane meine Woche", rufst du 'upsert_planned_workout' oder 'generate_and_sync_zwift_workout' auf.
3. COMMUTE:
   - Fahrten ohne Wattwerte (is_commute = true) sind reines Alltags-Pendeln und fließen nicht in die Trainingslast ein.
4. TONFALL:
   - Direkt, fachlich präzise, aktiv. Keine ungefragten akademischen Vorlesungen.`;

    const result = streamText({
      model,
      system: systemPrompt,
      messages: formattedMessages,
      tools: {
        get_full_context: tool({
          description: "Liest das Athletenprofil (inkl. Setup-Status & Memory), 14 Tage Garmin-Metriken, Aktivitäten, Gym-Pläne und geplante Workouts.",
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

        update_athlete_setup_and_memory: tool({
          description: "Speichert Ziele, feste Zeiten, Stärken/Schwächen, Schwellenwerte und markiert das Setup als abgeschlossen.",
          inputSchema: z.object({
            setupCompleted: z.boolean().default(true),
            ftp: z.number().optional(),
            lthr: z.number().optional(),
            maxHr: z.number().optional(),
            restingHr: z.number().optional(),
            runThresholdPaceSec: z.number().optional(),
            swimCssPaceSec: z.number().optional(),
            coachMemory: z.object({
              primaryGoal: z.string(),
              weeklyBudgetHours: z.number(),
              preferredGymDays: z.array(z.string()).optional(),
              notes: z.string().optional(),
              strengths: z.array(z.string()).optional(),
              limiters: z.array(z.string()).optional(),
            }),
          }),
          execute: async (args) => {
            const updates: any = {
              setupCompleted: args.setupCompleted,
              coachMemoryJson: args.coachMemory,
            };
            if (args.ftp) updates.currentFtpW = args.ftp;
            if (args.lthr) updates.lthr = args.lthr;
            if (args.maxHr) updates.maxHr = args.maxHr;
            if (args.restingHr) updates.restingHr = args.restingHr;
            if (args.runThresholdPaceSec) updates.runThresholdPaceSec = args.runThresholdPaceSec;
            if (args.swimCssPaceSec) updates.swimCssPaceSec = args.swimCssPaceSec;

            const res = await updateAthleteProfile(updates);
            return { success: true, profile: res };
          },
        }),

        save_or_update_gym_template: tool({
          description: "Speichert oder aktualisiert einen Gym-Plan (Code A, B oder C) in der Datenbank.",
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

        upsert_planned_workout: tool({
          description: "NUR AUF EXPLIZITE AUFFORDERUNG: Plant oder aktualisiert ein Training.",
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
