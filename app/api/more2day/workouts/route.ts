import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db, ensureDbSchema } from "@/lib/db";
import { activities } from "@/lib/db/schema";
import { getActivities } from "@/lib/store";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function getTodayBerlin(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(new Date());
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  const expectedKey = process.env.MORE2DAY_API_KEY;

  if (!expectedKey || !token || token !== expectedKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const queryDate = req.nextUrl.searchParams.get("date");
  const targetDate = queryDate && DATE_REGEX.test(queryDate) ? queryDate : getTodayBerlin();

  let dayActivities: Array<{
    sportType: string;
    isCommute: boolean;
    avgPowerW: number | null;
  }> = [];

  if (db) {
    try {
      await ensureDbSchema();
      const rows = await db
        .select({
          sportType: activities.sportType,
          isCommute: activities.isCommute,
          avgPowerW: activities.avgPowerW,
        })
        .from(activities)
        .where(
          sql`(${activities.startTime} AT TIME ZONE 'Europe/Berlin')::date = ${targetDate}::date`
        );
      dayActivities = rows;
    } catch (e) {
      console.warn("DB select activities for more2day fallback:", e);
    }
  }

  if (dayActivities.length === 0 && !db) {
    const all = await getActivities();
    const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" });
    dayActivities = all.filter((a) => {
      const actDate = formatter.format(new Date(a.startTime));
      return actDate === targetDate;
    });
  }

  const cyclingWithPower = dayActivities.some(
    (a) =>
      ["road_cycling", "zwift", "commute"].includes(a.sportType) &&
      ((a.avgPowerW ?? 0) > 0 || !a.isCommute)
  );
  const running = dayActivities.some((a) => a.sportType === "running");
  const swimming = dayActivities.some((a) => a.sportType === "swimming");

  return NextResponse.json({
    date: targetDate,
    cyclingWithPower,
    running,
    swimming,
  });
}
