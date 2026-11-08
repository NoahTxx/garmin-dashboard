import { NextResponse } from "next/server";
import {
  getAthleteProfile,
  getDailyMetrics,
  getActivities,
  getGymTemplates,
  getPlannedWorkouts,
  linkActivityGymTemplate,
  upsertPlannedWorkout,
  clearDayWorkout,
  saveOrUpdateGymTemplate,
} from "@/lib/store";

export async function GET() {
  const [profile, metrics, activities, gymTemplates, plannedWorkouts] = await Promise.all([
    getAthleteProfile(),
    getDailyMetrics(),
    getActivities(),
    getGymTemplates(),
    getPlannedWorkouts(),
  ]);

  return NextResponse.json({
    profile,
    metrics,
    activities,
    gymTemplates,
    plannedWorkouts,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, payload } = body;

    if (action === "link_gym") {
      const updated = await linkActivityGymTemplate(payload.activityId, payload.templateId);
      return NextResponse.json({ success: true, updated });
    }

    if (action === "upsert_workout") {
      const res = await upsertPlannedWorkout(payload);
      return NextResponse.json({ success: true, workout: res });
    }

    if (action === "clear_workout") {
      const res = await clearDayWorkout(payload.date, payload.slotIndex || 1);
      return NextResponse.json(res);
    }

    if (action === "save_gym_template") {
      const res = await saveOrUpdateGymTemplate(payload);
      return NextResponse.json({ success: true, template: res });
    }

    return NextResponse.json({ error: "Unbekannte Aktion" }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Serverfehler";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
