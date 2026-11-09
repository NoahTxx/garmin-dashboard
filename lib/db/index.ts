import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;

let dbInstance: ReturnType<typeof drizzle> | null = null;
let sqlClient: ReturnType<typeof postgres> | null = null;

if (connectionString) {
  try {
    const isLocalhost = connectionString.includes("localhost") || connectionString.includes("127.0.0.1");
    sqlClient = postgres(connectionString, {
      max: 10,
      idle_timeout: 20,
      ssl: isLocalhost ? false : "prefer",
    });
    dbInstance = drizzle(sqlClient, { schema });
  } catch (err) {
    console.warn("Database connection could not be established:", err);
  }
}

export const db = dbInstance;
export const sql = sqlClient;
export const isDbConnected = Boolean(dbInstance);

let schemaEnsured = false;
export async function ensureDbSchema() {
  if (!sqlClient || schemaEnsured) return;
  try {
    await sqlClient`
      CREATE TABLE IF NOT EXISTS athlete_profile (
        id SERIAL PRIMARY KEY,
        current_ftp_w INTEGER,
        max_hr INTEGER DEFAULT 190,
        resting_hr INTEGER DEFAULT 48,
        lthr INTEGER,
        swim_css_pace_sec INTEGER,
        run_threshold_pace_sec INTEGER,
        weight_kg REAL DEFAULT 72.5,
        setup_completed BOOLEAN DEFAULT FALSE NOT NULL,
        coach_memory_json JSONB,
        location_lat REAL DEFAULT 52.5584,
        location_lon REAL DEFAULT 13.0914,
        intervals_icu_id TEXT,
        intervals_icu_api_key TEXT,
        last_sync_at TIMESTAMPTZ
      );
    `;
    await sqlClient`
      CREATE TABLE IF NOT EXISTS daily_metrics (
        date TEXT PRIMARY KEY,
        resting_hr INTEGER,
        hrv_last_night INTEGER,
        hrv_7d_avg INTEGER,
        hrv_status TEXT,
        sleep_score INTEGER,
        sleep_duration_sec INTEGER,
        rem_sleep_sec INTEGER,
        deep_sleep_sec INTEGER,
        body_battery_max INTEGER,
        body_battery_min INTEGER,
        stress_avg INTEGER,
        training_readiness INTEGER,
        acute_load INTEGER
      );
    `;
    await sqlClient`
      CREATE TABLE IF NOT EXISTS activities (
        activity_id BIGINT PRIMARY KEY,
        name TEXT NOT NULL,
        sport_type TEXT NOT NULL,
        is_commute BOOLEAN DEFAULT FALSE NOT NULL,
        start_time TIMESTAMPTZ NOT NULL,
        duration_sec INTEGER NOT NULL,
        distance_m REAL,
        avg_hr INTEGER,
        max_hr INTEGER,
        avg_power_w INTEGER,
        normalized_power_w INTEGER,
        avg_cadence INTEGER,
        avg_pace_sec_per_km INTEGER,
        tss REAL,
        intensity_factor REAL,
        avg_speed_mps REAL,
        elevation_gain_m REAL,
        pool_length_m INTEGER,
        swolf INTEGER,
        calories INTEGER,
        linked_gym_template_id INTEGER,
        muscle_load_tags JSONB,
        raw_json JSONB
      );
    `;
    await sqlClient`
      CREATE TABLE IF NOT EXISTS gym_templates (
        id SERIAL PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        focus_muscles TEXT NOT NULL,
        exercises_json JSONB NOT NULL,
        estimated_cns_fatigue INTEGER NOT NULL DEFAULT 6,
        active BOOLEAN DEFAULT TRUE NOT NULL
      );
    `;
    await sqlClient`
      CREATE TABLE IF NOT EXISTS planned_workouts (
        id SERIAL PRIMARY KEY,
        date TEXT NOT NULL,
        slot_index INTEGER DEFAULT 1 NOT NULL,
        sport_type TEXT NOT NULL,
        title TEXT NOT NULL,
        duration_min INTEGER NOT NULL,
        target_tss INTEGER DEFAULT 0,
        gym_template_code TEXT,
        description TEXT,
        structured_steps_json JSONB,
        zwo_xml TEXT,
        synced_to_zwift BOOLEAN DEFAULT FALSE,
        status TEXT DEFAULT 'planned' NOT NULL
      );
    `;
    await sqlClient`
      CREATE UNIQUE INDEX IF NOT EXISTS date_slot_unique ON planned_workouts (date, slot_index);
    `;
    schemaEnsured = true;
  } catch (err) {
    console.warn("ensureDbSchema warning:", err);
  }
}

