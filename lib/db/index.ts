import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

let dbInstance: ReturnType<typeof drizzle> | null = null;

if (connectionString) {
  try {
    const client = postgres(connectionString, { max: 10, idle_timeout: 20 });
    dbInstance = drizzle(client, { schema });
  } catch (err) {
    console.warn("Database connection could not be established:", err);
  }
}

export const db = dbInstance;
export const isDbConnected = Boolean(dbInstance);
