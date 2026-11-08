import { config } from "dotenv";
config({ path: ".env.local" });

import {
  initialProfile,
  initialDailyMetrics,
  initialActivities,
  initialGymTemplates,
  initialPlannedWorkouts,
  MockAthleteProfile,
  MockDailyMetric,
  MockActivity,
  MockGymTemplate,
  MockPlannedWorkout,
} from "./mock-data";
import { db } from "./db";
import {
  athleteProfile,
  dailyMetrics,
  activities,
  gymTemplates,
  plannedWorkouts,
} from "./db/schema";
import { eq, desc, and } from "drizzle-orm";

const globalStore = {
  profile: { ...initialProfile },
  metrics: [...initialDailyMetrics],
  activities: [...initialActivities],
  gymTemplates: [...initialGymTemplates],
  plannedWorkouts: [...initialPlannedWorkouts],
};

export async function getAthleteProfile(): Promise<MockAthleteProfile> {
  if (db) {
    try {
      const rows = await db.select().from(athleteProfile).limit(1);
      if (rows.length > 0) {
        const r = rows[0];
        return {
          id: r.id,
          currentFtpW: r.currentFtpW ?? null,
          maxHr: r.maxHr ?? 190,
          restingHr: r.restingHr ?? 48,
          lthr: r.lthr ?? null,
          swimCssPaceSec: r.swimCssPaceSec ?? null,
          runThresholdPaceSec: r.runThresholdPaceSec ?? null,
          weightKg: r.weightKg ?? 72,
          setupCompleted: r.setupCompleted ?? false,
          coachMemoryJson: r.coachMemoryJson,
          locationLat: r.locationLat ?? 52.56,
          locationLon: r.locationLon ?? 13.09,
          intervalsIcuId: r.intervalsIcuId,
          intervalsIcuApiKey: r.intervalsIcuApiKey,
          lastSyncAt: r.lastSyncAt ? r.lastSyncAt.toISOString() : new Date().toISOString(),
        };
      }
    } catch (e) {
      console.warn("DB select athleteProfile fallback to store:", e);
    }
  }
  return globalStore.profile;
}

export async function updateAthleteProfile(updates: Partial<MockAthleteProfile>) {
  Object.assign(globalStore.profile, updates);
  if (db) {
    try {
      const setObj: any = { lastSyncAt: new Date() };
      if (updates.currentFtpW !== undefined) setObj.currentFtpW = updates.currentFtpW;
      if (updates.maxHr !== undefined) setObj.maxHr = updates.maxHr;
      if (updates.restingHr !== undefined) setObj.restingHr = updates.restingHr;
      if (updates.lthr !== undefined) setObj.lthr = updates.lthr;
      if (updates.swimCssPaceSec !== undefined) setObj.swimCssPaceSec = updates.swimCssPaceSec;
      if (updates.runThresholdPaceSec !== undefined) setObj.runThresholdPaceSec = updates.runThresholdPaceSec;
      if (updates.weightKg !== undefined) setObj.weightKg = updates.weightKg;
      if (updates.setupCompleted !== undefined) setObj.setupCompleted = updates.setupCompleted;
      if (updates.coachMemoryJson !== undefined) setObj.coachMemoryJson = updates.coachMemoryJson;
      if (updates.locationLat !== undefined) setObj.locationLat = updates.locationLat;
      if (updates.locationLon !== undefined) setObj.locationLon = updates.locationLon;

      const existing = await db.select().from(athleteProfile).limit(1);
      if (existing.length > 0) {
        await db.update(athleteProfile).set(setObj).where(eq(athleteProfile.id, existing[0].id));
      } else {
        await db.insert(athleteProfile).values({ id: 1, ...setObj });
      }
    } catch (e) {
      console.warn("DB update athleteProfile fallback:", e);
    }
  }
  return globalStore.profile;
}

export async function getDailyMetrics(): Promise<MockDailyMetric[]> {
  if (db) {
    try {
      const rows = await db.select().from(dailyMetrics).orderBy(desc(dailyMetrics.date)).limit(14);
      if (rows.length > 0) {
        return rows.reverse().map((r) => ({
          date: r.date,
          restingHr: r.restingHr ?? 48,
          hrvLastNight: r.hrvLastNight ?? 65,
          hrv7dAvg: r.hrv7dAvg ?? 65,
          hrvStatus: (r.hrvStatus as MockDailyMetric["hrvStatus"]) || "balanced",
          sleepScore: r.sleepScore ?? 80,
          sleepDurationSec: r.sleepDurationSec ?? 28800,
          remSleepSec: r.remSleepSec ?? 5000,
          deepSleepSec: r.deepSleepSec ?? 6000,
          bodyBatteryMax: r.bodyBatteryMax ?? 90,
          bodyBatteryMin: r.bodyBatteryMin ?? 25,
          stressAvg: r.stressAvg ?? 25,
          trainingReadiness: r.trainingReadiness ?? 80,
          acuteLoad: r.acuteLoad ?? 700,
        }));
      }
    } catch (e) {
      console.warn("DB select dailyMetrics fallback:", e);
    }
  }
  return globalStore.metrics;
}

export async function getActivities(): Promise<MockActivity[]> {
  if (db) {
    try {
      const rows = await db.select().from(activities).orderBy(desc(activities.startTime)).limit(30);
      if (rows.length > 0) {
        return rows.map((r) => ({
          activityId: r.activityId.toString(),
          name: r.name,
          sportType: r.sportType as MockActivity["sportType"],
          isCommute: r.isCommute,
          startTime: r.startTime.toISOString(),
          durationSec: r.durationSec,
          distanceM: r.distanceM ?? 0,
          avgHr: r.avgHr ?? 0,
          maxHr: r.maxHr ?? 0,
          avgPowerW: r.avgPowerW,
          normalizedPowerW: r.normalizedPowerW,
          avgCadence: r.avgCadence,
          avgPaceSecPerKm: r.avgPaceSecPerKm,
          tss: r.tss ?? 0,
          intensityFactor: r.intensityFactor ?? 0,
          avgSpeedMps: r.avgSpeedMps ?? 0,
          elevationGainM: r.elevationGainM ?? 0,
          poolLengthM: r.poolLengthM,
          swolf: r.swolf,
          calories: r.calories ?? 0,
          linkedGymTemplateId: r.linkedGymTemplateId,
          muscleLoadTags: (r.muscleLoadTags as string[]) ?? [],
          rawJson: r.rawJson,
        }));
      }
    } catch (e) {
      console.warn("DB select activities fallback:", e);
    }
  }
  return globalStore.activities;
}

export async function linkActivityGymTemplate(activityId: string, templateId: number | null) {
  const target = globalStore.activities.find((a) => a.activityId === activityId);
  if (target) {
    target.linkedGymTemplateId = templateId;
  }
  if (db) {
    try {
      await db
        .update(activities)
        .set({ linkedGymTemplateId: templateId })
        .where(eq(activities.activityId, BigInt(activityId)));
    } catch (e) {
      console.warn("DB linkActivityGymTemplate fallback:", e);
    }
  }
  return target;
}

export async function getGymTemplates(): Promise<MockGymTemplate[]> {
  if (db) {
    try {
      const rows = await db.select().from(gymTemplates).where(eq(gymTemplates.active, true));
      if (rows.length > 0) {
        return rows.map((r) => ({
          id: r.id,
          code: r.code,
          name: r.name,
          focusMuscles: r.focusMuscles,
          exercisesJson: r.exercisesJson as MockGymTemplate["exercisesJson"],
          estimatedCnsFatigue: r.estimatedCnsFatigue,
          active: r.active,
        }));
      }
    } catch (e) {
      console.warn("DB select gymTemplates fallback:", e);
    }
  }
  return globalStore.gymTemplates;
}

export async function saveOrUpdateGymTemplate(data: {
  code: string;
  name: string;
  focusMuscles: string;
  exercisesJson: MockGymTemplate["exercisesJson"];
  estimatedCnsFatigue: number;
}) {
  const idx = globalStore.gymTemplates.findIndex((t) => t.code.toUpperCase() === data.code.toUpperCase());
  let saved: MockGymTemplate;
  if (idx >= 0) {
    globalStore.gymTemplates[idx] = {
      ...globalStore.gymTemplates[idx],
      ...data,
      code: data.code.toUpperCase(),
    };
    saved = globalStore.gymTemplates[idx];
  } else {
    saved = {
      id: globalStore.gymTemplates.length + 1,
      ...data,
      code: data.code.toUpperCase(),
      active: true,
    };
    globalStore.gymTemplates.push(saved);
  }

  if (db) {
    try {
      await db
        .insert(gymTemplates)
        .values({
          code: saved.code,
          name: saved.name,
          focusMuscles: saved.focusMuscles,
          exercisesJson: saved.exercisesJson,
          estimatedCnsFatigue: saved.estimatedCnsFatigue,
          active: true,
        })
        .onConflictDoUpdate({
          target: gymTemplates.code,
          set: {
            name: saved.name,
            focusMuscles: saved.focusMuscles,
            exercisesJson: saved.exercisesJson,
            estimatedCnsFatigue: saved.estimatedCnsFatigue,
          },
        });
    } catch (e) {
      console.warn("DB upsert gymTemplates fallback:", e);
    }
  }

  return saved;
}

export async function getPlannedWorkouts(): Promise<MockPlannedWorkout[]> {
  if (db) {
    try {
      const rows = await db.select().from(plannedWorkouts).orderBy(plannedWorkouts.date);
      if (rows.length > 0) {
        return rows.map((r) => ({
          id: r.id,
          date: r.date,
          slotIndex: r.slotIndex,
          sportType: r.sportType as MockPlannedWorkout["sportType"],
          title: r.title,
          durationMin: r.durationMin,
          targetTss: r.targetTss ?? 0,
          gymTemplateCode: r.gymTemplateCode,
          description: r.description ?? "",
          structuredStepsJson: r.structuredStepsJson as MockPlannedWorkout["structuredStepsJson"],
          zwoXml: r.zwoXml,
          syncedToZwift: r.syncedToZwift ?? false,
          status: (r.status as MockPlannedWorkout["status"]) || "planned",
        }));
      }
    } catch (e) {
      console.warn("DB select plannedWorkouts fallback:", e);
    }
  }
  return globalStore.plannedWorkouts;
}

export async function upsertPlannedWorkout(workout: Omit<MockPlannedWorkout, "id"> & { id?: number }) {
  const slotIndex = workout.slotIndex || 1;
  const idx = globalStore.plannedWorkouts.findIndex(
    (w) => w.date === workout.date && w.slotIndex === slotIndex
  );

  let result: MockPlannedWorkout;
  if (idx >= 0) {
    globalStore.plannedWorkouts[idx] = {
      ...globalStore.plannedWorkouts[idx],
      ...workout,
      slotIndex,
      id: globalStore.plannedWorkouts[idx].id,
    };
    result = globalStore.plannedWorkouts[idx];
  } else {
    result = {
      id: Math.floor(Math.random() * 900000) + 1000,
      ...workout,
      slotIndex,
    };
    globalStore.plannedWorkouts.push(result);
  }

  if (db) {
    try {
      await db
        .insert(plannedWorkouts)
        .values({
          date: result.date,
          slotIndex: result.slotIndex,
          sportType: result.sportType,
          title: result.title,
          durationMin: result.durationMin,
          targetTss: result.targetTss,
          gymTemplateCode: result.gymTemplateCode,
          description: result.description,
          structuredStepsJson: result.structuredStepsJson,
          zwoXml: result.zwoXml,
          syncedToZwift: result.syncedToZwift,
          status: result.status,
        })
        .onConflictDoUpdate({
          target: [plannedWorkouts.date, plannedWorkouts.slotIndex],
          set: {
            sportType: result.sportType,
            title: result.title,
            durationMin: result.durationMin,
            targetTss: result.targetTss,
            gymTemplateCode: result.gymTemplateCode,
            description: result.description,
            structuredStepsJson: result.structuredStepsJson,
            zwoXml: result.zwoXml,
            syncedToZwift: result.syncedToZwift,
            status: result.status,
          },
        });
    } catch (e) {
      console.warn("DB upsert plannedWorkouts fallback:", e);
    }
  }

  return result;
}

export async function clearDayWorkout(date: string, slotIndex = 1) {
  const idx = globalStore.plannedWorkouts.findIndex(
    (w) => w.date === date && w.slotIndex === slotIndex
  );
  if (idx >= 0) {
    globalStore.plannedWorkouts.splice(idx, 1);
  }

  if (db) {
    try {
      await db
        .delete(plannedWorkouts)
        .where(and(eq(plannedWorkouts.date, date), eq(plannedWorkouts.slotIndex, slotIndex)));
    } catch (e) {
      console.warn("DB delete plannedWorkout fallback:", e);
    }
  }

  return { success: true, date, slotIndex };
}

export async function saveSyncedData(params: {
  athleteStats?: { resting_hr?: number | null; max_hr?: number | null; weight_kg?: number | null };
  metrics?: any[];
  activities?: any[];
}) {
  const { athleteStats, metrics = [], activities: acts = [] } = params;

  if (athleteStats) {
    if (athleteStats.resting_hr) globalStore.profile.restingHr = athleteStats.resting_hr;
    if (athleteStats.max_hr) globalStore.profile.maxHr = athleteStats.max_hr;
    if (athleteStats.weight_kg) globalStore.profile.weightKg = athleteStats.weight_kg;
  }
  globalStore.profile.lastSyncAt = new Date().toISOString();

  if (metrics.length > 0) {
    for (const m of metrics) {
      const idx = globalStore.metrics.findIndex((existing) => existing.date === m.date);
      const metricObj: MockDailyMetric = {
        date: m.date,
        restingHr: m.resting_hr ?? 48,
        hrvLastNight: m.hrv_last_night ?? 65,
        hrv7dAvg: m.hrv_7d_avg ?? 65,
        hrvStatus: m.hrv_status || "balanced",
        sleepScore: m.sleep_score ?? 80,
        sleepDurationSec: m.sleep_duration_sec ?? 28800,
        remSleepSec: m.rem_sleep_sec ?? 5000,
        deepSleepSec: m.deep_sleep_sec ?? 6000,
        bodyBatteryMax: m.body_battery_max ?? 90,
        bodyBatteryMin: m.body_battery_min ?? 25,
        stressAvg: m.stress_avg ?? 25,
        trainingReadiness: m.training_readiness ?? 80,
        acuteLoad: m.acute_load ?? 700,
      };
      if (idx >= 0) {
        globalStore.metrics[idx] = metricObj;
      } else {
        globalStore.metrics.push(metricObj);
      }

      if (db) {
        try {
          await db
            .insert(dailyMetrics)
            .values(metricObj)
            .onConflictDoUpdate({
              target: dailyMetrics.date,
              set: metricObj,
            });
        } catch (e) {
          // DB table might not be initialized yet
        }
      }
    }
    // Sort metrics by date ascending
    globalStore.metrics.sort((a, b) => a.date.localeCompare(b.date));
  }

  if (acts.length > 0) {
    for (const act of acts) {
      const idx = globalStore.activities.findIndex((existing) => existing.activityId === act.activity_id);
      const actObj: MockActivity = {
        activityId: act.activity_id,
        name: act.name,
        sportType: act.sport_type,
        isCommute: act.is_commute,
        startTime: act.start_time,
        durationSec: act.duration_sec,
        distanceM: act.distance_m ?? 0,
        avgHr: act.avg_hr ?? 0,
        maxHr: act.max_hr ?? 0,
        avgPowerW: act.avg_power_w,
        normalizedPowerW: act.normalized_power_w,
        avgCadence: act.avg_cadence,
        avgPaceSecPerKm: act.avg_pace_sec_per_km,
        tss: act.tss ?? 0,
        intensityFactor: act.intensity_factor ?? 0,
        avgSpeedMps: act.avg_speed_mps ?? 0,
        elevationGainM: act.elevation_gain_m ?? 0,
        poolLengthM: act.pool_length_m,
        swolf: act.swolf,
        calories: act.calories ?? 0,
        linkedGymTemplateId: act.linked_gym_template_id ?? null,
        rawJson: act.raw_json,
      };
      if (idx >= 0) {
        globalStore.activities[idx] = actObj;
      } else {
        globalStore.activities.unshift(actObj);
      }

      if (db) {
        try {
          const actValues = {
            activityId: BigInt(actObj.activityId),
            name: actObj.name,
            sportType: actObj.sportType,
            isCommute: actObj.isCommute,
            startTime: new Date(actObj.startTime),
            durationSec: actObj.durationSec,
            distanceM: actObj.distanceM,
            avgHr: actObj.avgHr,
            maxHr: actObj.maxHr,
            avgPowerW: actObj.avgPowerW,
            normalizedPowerW: actObj.normalizedPowerW,
            avgCadence: actObj.avgCadence,
            avgPaceSecPerKm: actObj.avgPaceSecPerKm,
            tss: actObj.tss,
            intensityFactor: actObj.intensityFactor,
            avgSpeedMps: actObj.avgSpeedMps,
            elevationGainM: actObj.elevationGainM,
            poolLengthM: actObj.poolLengthM,
            swolf: actObj.swolf,
            calories: actObj.calories,
            linkedGymTemplateId: actObj.linkedGymTemplateId,
            rawJson: actObj.rawJson,
          };
          await db
            .insert(activities)
            .values(actValues)
            .onConflictDoUpdate({
              target: activities.activityId,
              set: {
                name: actValues.name,
                sportType: actValues.sportType,
                isCommute: actValues.isCommute,
                startTime: actValues.startTime,
                durationSec: actValues.durationSec,
                distanceM: actValues.distanceM,
                avgHr: actValues.avgHr,
                maxHr: actValues.maxHr,
                avgPowerW: actValues.avgPowerW,
                normalizedPowerW: actValues.normalizedPowerW,
                avgCadence: actValues.avgCadence,
                avgPaceSecPerKm: actValues.avgPaceSecPerKm,
                tss: actValues.tss,
                intensityFactor: actValues.intensityFactor,
                avgSpeedMps: actValues.avgSpeedMps,
                elevationGainM: actValues.elevationGainM,
                poolLengthM: actValues.poolLengthM,
                swolf: actValues.swolf,
                calories: actValues.calories,
                rawJson: actValues.rawJson,
              },
            });
        } catch (e) {
          // DB table fallback
        }
      }
    }
  }

  return { success: true };
}
