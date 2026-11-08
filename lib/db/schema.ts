import {
  pgTable,
  text,
  integer,
  bigint,
  boolean,
  timestamp,
  jsonb,
  serial,
  real,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// 1. Athlete Profile
export const athleteProfile = pgTable("athlete_profile", {
  id: serial("id").primaryKey(),
  currentFtpW: integer("current_ftp_w").default(250),
  maxHr: integer("max_hr").default(190),
  restingHr: integer("resting_hr").default(48),
  lthr: integer("lthr").default(172),
  swimCssPaceSec: integer("swim_css_pace_sec").default(95), // sec per 100m
  runThresholdPaceSec: integer("run_threshold_pace_sec").default(255), // sec per km (e.g. 4:15 min/km)
  weightKg: real("weight_kg").default(72.5),
  setupCompleted: boolean("setup_completed").default(false).notNull(),
  coachMemoryJson: jsonb("coach_memory_json"), // Goals, schedule, strengths/weaknesses, injuries, setup notes
  locationLat: real("location_lat").default(52.56),
  locationLon: real("location_lon").default(13.09),
  intervalsIcuId: text("intervals_icu_id"),
  intervalsIcuApiKey: text("intervals_icu_api_key"),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
});

// 2. Daily Metrics (last 14+ days)
export const dailyMetrics = pgTable("daily_metrics", {
  date: text("date").primaryKey(), // YYYY-MM-DD
  restingHr: integer("resting_hr"),
  hrvLastNight: integer("hrv_last_night"),
  hrv7dAvg: integer("hrv_7d_avg"),
  hrvStatus: text("hrv_status"), // balanced, unbalanced, low, poor
  sleepScore: integer("sleep_score"),
  sleepDurationSec: integer("sleep_duration_sec"),
  remSleepSec: integer("rem_sleep_sec"),
  deepSleepSec: integer("deep_sleep_sec"),
  bodyBatteryMax: integer("body_battery_max"),
  bodyBatteryMin: integer("body_battery_min"),
  stressAvg: integer("stress_avg"),
  trainingReadiness: integer("training_readiness"),
  acuteLoad: integer("acute_load"),
});

// 3. Activities
export const activities = pgTable("activities", {
  activityId: bigint("activity_id", { mode: "bigint" }).primaryKey(),
  name: text("name").notNull(),
  sportType: text("sport_type").notNull(), // road_cycling, zwift, running, commute, swimming, gym, other
  isCommute: boolean("is_commute").default(false).notNull(),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  durationSec: integer("duration_sec").notNull(),
  distanceM: real("distance_m"),
  avgHr: integer("avg_hr"),
  maxHr: integer("max_hr"),
  avgPowerW: integer("avg_power_w"),
  normalizedPowerW: integer("normalized_power_w"),
  avgCadence: integer("avg_cadence"),
  avgPaceSecPerKm: integer("avg_pace_sec_per_km"),
  tss: real("tss"),
  intensityFactor: real("intensity_factor"),
  avgSpeedMps: real("avg_speed_mps"),
  elevationGainM: real("elevation_gain_m"),
  poolLengthM: integer("pool_length_m"),
  swolf: integer("swolf"),
  calories: integer("calories"),
  linkedGymTemplateId: integer("linked_gym_template_id"),
  muscleLoadTags: jsonb("muscle_load_tags"), // string[]
  rawJson: jsonb("raw_json"),
});

// 4. Gym Templates (A, B, C)
export const gymTemplates = pgTable("gym_templates", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(), // "A", "B", "C"
  name: text("name").notNull(),
  focusMuscles: text("focus_muscles").notNull(),
  exercisesJson: jsonb("exercises_json").notNull(), // Array<{ name: string; muscleGroup?: string; sets: number; reps: string; rir: number; restSec?: number; weightKg?: string; note?: string }>
  estimatedCnsFatigue: integer("estimated_cns_fatigue").notNull().default(6), // 1-10
  active: boolean("active").default(true).notNull(),
});

// 5. Planned Workouts
export const plannedWorkouts = pgTable(
  "planned_workouts",
  {
    id: serial("id").primaryKey(),
    date: text("date").notNull(), // YYYY-MM-DD
    slotIndex: integer("slot_index").default(1).notNull(),
    sportType: text("sport_type").notNull(), // zwift, road_cycling, running, swimming, gym, rest
    title: text("title").notNull(),
    durationMin: integer("duration_min").notNull(),
    targetTss: integer("target_tss").default(0),
    gymTemplateCode: text("gym_template_code"), // "A", "B", "C", or null
    description: text("description"),
    structuredStepsJson: jsonb("structured_steps_json"),
    zwoXml: text("zwo_xml"),
    syncedToZwift: boolean("synced_to_zwift").default(false),
    status: text("status").default("planned").notNull(), // planned, completed, skipped
  },
  (table) => [
    uniqueIndex("date_slot_unique").on(table.date, table.slotIndex),
  ]
);

export type AthleteProfile = typeof athleteProfile.$inferSelect;
export type DailyMetric = typeof dailyMetrics.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type GymTemplate = typeof gymTemplates.$inferSelect;
export type PlannedWorkout = typeof plannedWorkouts.$inferSelect;
