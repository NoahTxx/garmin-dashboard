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
  updateAthleteProfile,
} from "@/lib/store";

export async function GET() {
  const [profile, metrics, activities, gymTemplates, plannedWorkouts] = await Promise.all([
    getAthleteProfile(),
    getDailyMetrics(),
    getActivities(),
    getGymTemplates(),
    getPlannedWorkouts(),
  ]);

  // Sensibles intervalsIcuApiKey nicht unverschlüsselt an den Browser leaken
  const sanitizedProfile = profile
    ? {
        ...profile,
        intervalsIcuApiKey: profile.intervalsIcuApiKey ? "••••••••" : undefined,
      }
    : null;

  return NextResponse.json({
    profile: sanitizedProfile,
    metrics,
    activities,
    gymTemplates,
    plannedWorkouts,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, payload, activityId, templateId, profile } = body;

    if (action === "link_gym" || action === "assign_gym_template") {
      const actId = payload?.activityId ?? activityId;
      const tplId = payload?.templateId ?? templateId;
      const updated = await linkActivityGymTemplate(actId, tplId);
      return NextResponse.json({ success: true, updated });
    }

    if (action === "update_profile") {
      const profileData = payload || profile || {};
      const updated = await updateAthleteProfile(profileData);
      return NextResponse.json({ success: true, profile: updated });
    }

    if (action === "upsert_workout") {
      const res = await upsertPlannedWorkout(payload);
      return NextResponse.json({ success: true, workout: res });
    }

    if (action === "clear_workout") {
      const date = payload?.date ?? body.date;
      const slotIndex = payload?.slotIndex ?? body.slotIndex ?? 1;
      const res = await clearDayWorkout(date, slotIndex);
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
