export type MetricQuality = "OK" | "STALE" | "MISSING" | "INVALID" | "PARTIAL";

export interface ApexMetric<T = number> {
  value: T | null;
  unit: string;
  source: "garmin" | "intervals" | "calculated" | "manual";
  sourceEndpoint?: string;
  fetchedAt?: string;
  date?: string;
  status: MetricQuality;
  quality?: string;
  baselineDiff?: {
    diffPercent: number;
    reference: string;
    trend: "up" | "down" | "flat";
  };
  interpretation?: string;
}

export interface TodayWorkout {
  id: string | number;
  title: string;
  type: "strength" | "running" | "cycling" | "rest" | "zwift" | "road_cycling" | "gym" | "swimming";
  durationMin: number;
  intensity: "Low" | "Moderate" | "High";
  focus: string;
  exercises?: Array<{
    name: string;
    sets: number;
    reps: string;
    weightKg?: number;
    completed?: boolean;
  }>;
}

export interface TodayCockpitData {
  athleteName: string;
  dateStr: string;
  readiness: ApexMetric<number>;
  readinessLabel: "Ready to train" | "Moderate" | "Recover / Rest";
  readinessStatus: "success" | "warning" | "critical";
  recommendation: {
    title: string;
    description: string;
    reasoning: string[];
  };
  workout?: TodayWorkout;
  metrics: {
    sleepScore: ApexMetric<number>;
    sleepDurationSec: ApexMetric<number>;
    deepSleepSec: ApexMetric<number>;
    remSleepSec: ApexMetric<number>;
    lightSleepSec: ApexMetric<number>;
    hrvLastNight: ApexMetric<number>;
    restingHr: ApexMetric<number>;
    bodyBattery: ApexMetric<number>;
    acuteLoad: ApexMetric<number>;
    chronicLoad: ApexMetric<number>;
    steps: ApexMetric<number>;
    activeCalories: ApexMetric<number>;
    intensityMinutes: ApexMetric<number>;
    weightKg: ApexMetric<number>;
    stressAvg: ApexMetric<number>;
  };
  bodyBatteryDetails?: {
    current: number | null;
    highest: number | null;
    lowest: number | null;
    statusText: string;
  };
  stepsDetail?: {
    current: number | null;
    goal: number;
  };
  intensityMinutesDetail?: {
    current: number | null;
    goal: number;
  };
  hrv30dAvg?: number | null;
  weather?: {
    tempC: number;
    condition: string;
    rainProb: number;
    windKmH: number;
    outdoorIndex: "green" | "yellow" | "red";
    outdoorText: string;
  };
  nextBestAction: {
    category: "recovery" | "nutrition" | "mobility" | "sleep";
    title: string;
    action: string;
  };
}
