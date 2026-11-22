export interface MockExercise {
  name: string;
  muscleGroup?: string;
  sets: number;
  reps: string;
  rir: number;
  restSec?: number;
  weightKg?: string;
  note?: string;
}

export interface MockGymTemplate {
  id: number;
  code: string;
  name: string;
  focusMuscles: string;
  exercisesJson: MockExercise[];
  estimatedCnsFatigue: number;
  active: boolean;
}

export interface MockAthleteProfile {
  id: number;
  currentFtpW: number | null;
  maxHr: number | null;
  restingHr: number | null;
  lthr: number | null;
  swimCssPaceSec: number | null;
  runThresholdPaceSec: number | null;
  weightKg: number | null;
  setupCompleted: boolean;
  coachMemoryJson?: any;
  locationLat: number;
  locationLon: number;
  intervalsIcuId: string | null;
  intervalsIcuApiKey: string | null;
  lastSyncAt: string | null;
}

export interface MockDailyMetric {
  date: string;
  restingHr: number | null;
  hrvLastNight: number | null;
  hrv7dAvg: number | null;
  hrvStatus: "balanced" | "unbalanced" | "low" | "poor" | string | null;
  sleepScore: number | null;
  sleepDurationSec: number | null;
  remSleepSec: number | null;
  deepSleepSec: number | null;
  bodyBatteryMax: number | null;
  bodyBatteryMin: number | null;
  stressAvg: number | null;
  trainingReadiness: number | null;
  acuteLoad: number | null;
}

export interface MockActivity {
  activityId: string;
  name: string;
  sportType: "road_cycling" | "zwift" | "running" | "commute" | "swimming" | "gym" | "recovery" | "other";
  isCommute: boolean;
  startTime: string;
  durationSec: number;
  distanceM: number;
  avgHr: number;
  maxHr: number;
  avgPowerW: number | null;
  normalizedPowerW: number | null;
  avgCadence?: number | null;
  avgPaceSecPerKm?: number | null;
  tss: number;
  intensityFactor: number;
  avgSpeedMps: number;
  elevationGainM: number;
  poolLengthM?: number | null;
  swolf?: number | null;
  calories: number;
  linkedGymTemplateId: number | null;
  muscleLoadTags?: string[];
  rawJson?: any;
}

export interface MockPlannedWorkout {
  id: number;
  date: string;
  slotIndex: number;
  sportType: "zwift" | "road_cycling" | "running" | "swimming" | "gym" | "rest";
  title: string;
  durationMin: number;
  targetTss: number;
  gymTemplateCode: string | null;
  description: string;
  structuredStepsJson?: Array<{ durationSec: number; targetFtpPct: number; cadence?: number; label: string }> | null;
  zwoXml?: string | null;
  syncedToZwift: boolean;
  status: "planned" | "completed" | "skipped";
}

export function getRelativeDate(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split("T")[0];
}

export const initialProfile: MockAthleteProfile = {
  id: 1,
  currentFtpW: null,
  maxHr: null,
  restingHr: null,
  lthr: null,
  swimCssPaceSec: null,
  runThresholdPaceSec: null,
  weightKg: null,
  setupCompleted: false,
  coachMemoryJson: null,
  locationLat: 52.56,
  locationLon: 13.09,
  intervalsIcuId: process.env.INTERVALS_ATHLETE_ID || null,
  intervalsIcuApiKey: process.env.INTERVALS_API_KEY ? "***" : null,
  lastSyncAt: null,
};

export const initialGymTemplates: MockGymTemplate[] = [];

// Empty initial metrics - populated exclusively via real Garmin Connect sync
export const initialDailyMetrics: MockDailyMetric[] = [];

// Empty initial activities - populated exclusively via real Garmin Connect sync
export const initialActivities: MockActivity[] = [];

export const sampleZwoXml = `<?xml version="1.0" encoding="UTF-8"?>
<workout_file>
  <author>AI Performance Coach</author>
  <name>Polarized VO2max 4x4min</name>
  <description>4x 4min bei 115% FTP mit je 4min Zone 1 Pause. Hohe Sauerstoffaufnahme, maximale mitochondriale Stimulation.</description>
  <sportType>bike</sportType>
  <workout>
    <Warmup Duration="600" PowerLow="0.50" PowerHigh="0.75" Cadence="90"/>
    <IntervalsT Repeat="3" OnDuration="30" OffDuration="30" OnPower="1.05" OffPower="0.55" Cadence="100" CadenceResting="85"/>
    <SteadyState Duration="120" Power="0.55" Cadence="85"/>
    <IntervalsT Repeat="4" OnDuration="240" OffDuration="240" OnPower="1.15" OffPower="0.50" Cadence="95" CadenceResting="80"/>
    <Cooldown Duration="600" PowerLow="0.60" PowerHigh="0.45" Cadence="85"/>
  </workout>
</workout_file>`;

export const initialPlannedWorkouts: MockPlannedWorkout[] = [];
