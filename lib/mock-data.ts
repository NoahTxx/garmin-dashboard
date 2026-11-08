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
  currentFtpW: number;
  maxHr: number;
  restingHr: number;
  lthr: number;
  swimCssPaceSec: number;
  runThresholdPaceSec: number;
  weightKg: number;
  intervalsIcuId: string | null;
  intervalsIcuApiKey: string | null;
  lastSyncAt: string;
}

export interface MockDailyMetric {
  date: string;
  restingHr: number;
  hrvLastNight: number;
  hrv7dAvg: number;
  hrvStatus: "balanced" | "unbalanced" | "low" | "poor";
  sleepScore: number;
  sleepDurationSec: number;
  remSleepSec: number;
  deepSleepSec: number;
  bodyBatteryMax: number;
  bodyBatteryMin: number;
  stressAvg: number;
  trainingReadiness: number;
  acuteLoad: number;
}

export interface MockActivity {
  activityId: string;
  name: string;
  sportType: "road_cycling" | "zwift" | "running" | "commute" | "swimming" | "gym" | "other";
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
  currentFtpW: 285,
  maxHr: 192,
  restingHr: 46,
  lthr: 174,
  swimCssPaceSec: 88, // 1:28 / 100m
  runThresholdPaceSec: 250, // 4:10 min/km
  weightKg: 71.4,
  intervalsIcuId: process.env.INTERVALS_ATHLETE_ID || null,
  intervalsIcuApiKey: process.env.INTERVALS_API_KEY ? "***" : null,
  lastSyncAt: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
};

export const initialGymTemplates: MockGymTemplate[] = [
  {
    id: 1,
    code: "A",
    name: "Plan A: Unterkörper Primär (Squat & Knie-Dominanz)",
    focusMuscles: "Quadrizeps, Gluteus, Core, Waden",
    estimatedCnsFatigue: 8,
    active: true,
    exercisesJson: [
      { name: "Safety Bar Squat", muscleGroup: "Quadrizeps / Gluteus", sets: 3, reps: "6-8", rir: 2, restSec: 180, weightKg: "90 kg", note: "3s kontrollierte Exzentrik, kein Lockout der Knie oben" },
      { name: "Romanian Deadlift (Kurzhanteln)", muscleGroup: "Hamstrings / Glutes", sets: 3, reps: "8-10", rir: 2, restSec: 120, weightKg: "2x 30 kg", note: "Maximale Dehnung, neutraler Rücken" },
      { name: "Bulgarian Split Squat", muscleGroup: "Quads / Stabilisatoren", sets: 2, reps: "10-12", rir: 1, restSec: 90, weightKg: "2x 18 kg", note: "Unilateraler Beinausgleich" },
      { name: "Stehendes Wadenheben", muscleGroup: "Gastrocnemius", sets: 3, reps: "12-15", rir: 1, restSec: 60, weightKg: "65 kg", note: "2 Sek Dehnung in der unteren Position" },
      { name: "Hanging Leg Raises", muscleGroup: "Rectus Abdominis", sets: 3, reps: "10-12", rir: 2, restSec: 60, weightKg: "BW", note: "Becken kippen, Schultern fixiert" },
    ],
  },
  {
    id: 2,
    code: "B",
    name: "Plan B: Oberkörper (Zug, Schultergesundheit & Schwimm-Power)",
    focusMuscles: "Lats, Schultern, Brust, Scapula",
    estimatedCnsFatigue: 5,
    active: true,
    exercisesJson: [
      { name: "Klimmzüge (neutraler Griff)", muscleGroup: "Latissimus / Biceps", sets: 4, reps: "6-8", rir: 2, restSec: 150, weightKg: "+10 kg", note: "Explosiv hoch, Fokus auf Schwimm-Zugphase" },
      { name: "Schrägbankdrücken (Kurzhanteln 30°)", muscleGroup: "Brust / Vordere Schulter", sets: 3, reps: "8-10", rir: 2, restSec: 120, weightKg: "2x 28 kg", note: "Ellenbogen ca. 45° zum Torso" },
      { name: "Kabelrudern sitzend (breiter Griff)", muscleGroup: "Rhomboids / Trapezius", sets: 3, reps: "10-12", rir: 2, restSec: 90, weightKg: "55 kg", note: "Volle Scapula-Retraktion am Peak" },
      { name: "Seitheben am Kabelzug", muscleGroup: "Laterale Deltamuskulatur", sets: 3, reps: "12-15", rir: 1, restSec: 60, weightKg: "7.5 kg", note: "Konstanter Kabelzug" },
      { name: "Face Pulls mit Außenrotation", muscleGroup: "Rotatorenmanschette", sets: 3, reps: "15-20", rir: 2, restSec: 60, weightKg: "20 kg", note: "Verletzungsprophylaxe für Rad & Kraulschwimmen" },
    ],
  },
  {
    id: 3,
    code: "C",
    name: "Plan C: Posterior Chain & Hüft-Extension (Hintere Kette)",
    focusMuscles: "Hamstrings, Gluteus, Rückenstrecker, Rumpf-Anti-Rotation",
    estimatedCnsFatigue: 7,
    active: true,
    exercisesJson: [
      { name: "Trap Bar Deadlift (High Handle)", muscleGroup: "Gesamte Kette", sets: 3, reps: "5", rir: 2, restSec: 180, weightKg: "120 kg", note: "Volle Körperspannung, neutraler Nacken" },
      { name: "Barbell Hip Thrust", muscleGroup: "Gluteus Maximus", sets: 3, reps: "8-10", rir: 1, restSec: 120, weightKg: "110 kg", note: "1 Sekunde Peak-Kontraktion oben" },
      { name: "Einarmiges Latzug-Kabel", muscleGroup: "Latissimus", sets: 3, reps: "10-12", rir: 2, restSec: 90, weightKg: "35 kg", note: "Gezielter Ellbogenzug zur Hüfte" },
      { name: "Pallof Press", muscleGroup: "Anti-Rotation Core", sets: 3, reps: "12 / Seite", rir: 2, restSec: 60, weightKg: "15 kg", note: "Stabilität gegen Torsion im Sattel" },
      { name: "Back Hyperextensions 45°", muscleGroup: "Erector Spinae / Hamstrings", sets: 3, reps: "12-15", rir: 2, restSec: 60, weightKg: "+15 kg", note: "Wirbelsäule bleibt gerade, Bewegung rein aus der Hüfte" },
    ],
  },
];

// Full 14-day metrics series for real Recharts rendering
export const initialDailyMetrics: MockDailyMetric[] = [
  { date: getRelativeDate(-13), restingHr: 49, hrvLastNight: 61, hrv7dAvg: 64, hrvStatus: "balanced", sleepScore: 78, sleepDurationSec: 25800, remSleepSec: 4900, deepSleepSec: 5400, bodyBatteryMax: 84, bodyBatteryMin: 16, stressAvg: 29, trainingReadiness: 70, acuteLoad: 640 },
  { date: getRelativeDate(-12), restingHr: 48, hrvLastNight: 65, hrv7dAvg: 65, hrvStatus: "balanced", sleepScore: 82, sleepDurationSec: 27000, remSleepSec: 5300, deepSleepSec: 6100, bodyBatteryMax: 88, bodyBatteryMin: 20, stressAvg: 25, trainingReadiness: 74, acuteLoad: 660 },
  { date: getRelativeDate(-11), restingHr: 47, hrvLastNight: 68, hrv7dAvg: 65, hrvStatus: "balanced", sleepScore: 85, sleepDurationSec: 27900, remSleepSec: 5700, deepSleepSec: 6400, bodyBatteryMax: 92, bodyBatteryMin: 22, stressAvg: 23, trainingReadiness: 80, acuteLoad: 690 },
  { date: getRelativeDate(-10), restingHr: 50, hrvLastNight: 57, hrv7dAvg: 64, hrvStatus: "unbalanced", sleepScore: 69, sleepDurationSec: 23400, remSleepSec: 3900, deepSleepSec: 4600, bodyBatteryMax: 74, bodyBatteryMin: 12, stressAvg: 36, trainingReadiness: 58, acuteLoad: 720 },
  { date: getRelativeDate(-9), restingHr: 48, hrvLastNight: 63, hrv7dAvg: 64, hrvStatus: "balanced", sleepScore: 79, sleepDurationSec: 26400, remSleepSec: 5100, deepSleepSec: 5600, bodyBatteryMax: 85, bodyBatteryMin: 18, stressAvg: 28, trainingReadiness: 72, acuteLoad: 710 },
  { date: getRelativeDate(-8), restingHr: 46, hrvLastNight: 70, hrv7dAvg: 65, hrvStatus: "balanced", sleepScore: 87, sleepDurationSec: 28500, remSleepSec: 6200, deepSleepSec: 6900, bodyBatteryMax: 95, bodyBatteryMin: 26, stressAvg: 21, trainingReadiness: 84, acuteLoad: 700 },
  { date: getRelativeDate(-7), restingHr: 47, hrvLastNight: 67, hrv7dAvg: 66, hrvStatus: "balanced", sleepScore: 83, sleepDurationSec: 27300, remSleepSec: 5600, deepSleepSec: 6300, bodyBatteryMax: 90, bodyBatteryMin: 21, stressAvg: 24, trainingReadiness: 78, acuteLoad: 695 },
  { date: getRelativeDate(-6), restingHr: 48, hrvLastNight: 64, hrv7dAvg: 68, hrvStatus: "balanced", sleepScore: 82, sleepDurationSec: 27000, remSleepSec: 5400, deepSleepSec: 6200, bodyBatteryMax: 90, bodyBatteryMin: 18, stressAvg: 26, trainingReadiness: 76, acuteLoad: 680 },
  { date: getRelativeDate(-5), restingHr: 47, hrvLastNight: 66, hrv7dAvg: 67, hrvStatus: "balanced", sleepScore: 84, sleepDurationSec: 27600, remSleepSec: 5900, deepSleepSec: 6800, bodyBatteryMax: 92, bodyBatteryMin: 22, stressAvg: 24, trainingReadiness: 81, acuteLoad: 710 },
  { date: getRelativeDate(-4), restingHr: 50, hrvLastNight: 58, hrv7dAvg: 66, hrvStatus: "unbalanced", sleepScore: 71, sleepDurationSec: 24000, remSleepSec: 4200, deepSleepSec: 4800, bodyBatteryMax: 76, bodyBatteryMin: 12, stressAvg: 34, trainingReadiness: 62, acuteLoad: 745 },
  { date: getRelativeDate(-3), restingHr: 46, hrvLastNight: 72, hrv7dAvg: 67, hrvStatus: "balanced", sleepScore: 89, sleepDurationSec: 29400, remSleepSec: 6500, deepSleepSec: 7200, bodyBatteryMax: 98, bodyBatteryMin: 28, stressAvg: 20, trainingReadiness: 88, acuteLoad: 720 },
  { date: getRelativeDate(-2), restingHr: 45, hrvLastNight: 70, hrv7dAvg: 68, hrvStatus: "balanced", sleepScore: 86, sleepDurationSec: 28200, remSleepSec: 6100, deepSleepSec: 6900, bodyBatteryMax: 94, bodyBatteryMin: 24, stressAvg: 22, trainingReadiness: 85, acuteLoad: 750 },
  { date: getRelativeDate(-1), restingHr: 47, hrvLastNight: 65, hrv7dAvg: 67, hrvStatus: "balanced", sleepScore: 80, sleepDurationSec: 26400, remSleepSec: 5100, deepSleepSec: 5800, bodyBatteryMax: 88, bodyBatteryMin: 19, stressAvg: 28, trainingReadiness: 79, acuteLoad: 765 },
  { date: getRelativeDate(0), restingHr: 46, hrvLastNight: 73, hrv7dAvg: 68, hrvStatus: "balanced", sleepScore: 88, sleepDurationSec: 28800, remSleepSec: 6200, deepSleepSec: 7100, bodyBatteryMax: 96, bodyBatteryMin: 32, stressAvg: 21, trainingReadiness: 89, acuteLoad: 780 },
];

export const initialActivities: MockActivity[] = [
  {
    activityId: "1098231201",
    name: "Morgenpendeln Büro",
    sportType: "commute",
    isCommute: true,
    startTime: `${getRelativeDate(0)}T07:15:00Z`,
    durationSec: 1560,
    distanceM: 9200,
    avgHr: 118,
    maxHr: 139,
    avgPowerW: null,
    normalizedPowerW: null,
    tss: 12,
    intensityFactor: 0.55,
    avgSpeedMps: 5.9,
    elevationGainM: 45,
    calories: 210,
    linkedGymTemplateId: null,
  },
  {
    activityId: "1097881023",
    name: "Zwift - 4x8min Threshold Intervals",
    sportType: "zwift",
    isCommute: false,
    startTime: `${getRelativeDate(-1)}T18:00:00Z`,
    durationSec: 4200,
    distanceM: 38400,
    avgHr: 158,
    maxHr: 178,
    avgPowerW: 242,
    normalizedPowerW: 268,
    avgCadence: 92,
    tss: 84,
    intensityFactor: 0.94,
    avgSpeedMps: 9.14,
    elevationGainM: 210,
    calories: 890,
    linkedGymTemplateId: null,
  },
  {
    activityId: "1097654321",
    name: "Tempo-Dauerlauf 10km (Schwellen-Pace)",
    sportType: "running",
    isCommute: false,
    startTime: `${getRelativeDate(-2)}T07:00:00Z`,
    durationSec: 2550, // 42:30 min
    distanceM: 10000,
    avgHr: 164,
    maxHr: 177,
    avgPowerW: 310,
    normalizedPowerW: 318,
    avgCadence: 178, // spm
    avgPaceSecPerKm: 255, // 4:15 min/km
    tss: 68,
    intensityFactor: 0.88,
    avgSpeedMps: 3.92, // 10000 / 2550
    elevationGainM: 65,
    calories: 720,
    linkedGymTemplateId: null,
  },
  {
    activityId: "1097410291",
    name: "Gym Workout (Plan A Squat)",
    sportType: "gym",
    isCommute: false,
    startTime: `${getRelativeDate(-3)}T17:30:00Z`,
    durationSec: 3900,
    distanceM: 0,
    avgHr: 124,
    maxHr: 161,
    avgPowerW: null,
    normalizedPowerW: null,
    tss: 45,
    intensityFactor: 0.65,
    avgSpeedMps: 0,
    elevationGainM: 0,
    calories: 420,
    linkedGymTemplateId: 1,
    muscleLoadTags: ["Quads", "Glutes", "Hamstrings"],
  },
  {
    activityId: "1096998124",
    name: "Heimweg Pendeln",
    sportType: "commute",
    isCommute: true,
    startTime: `${getRelativeDate(-3)}T16:45:00Z`,
    durationSec: 1680,
    distanceM: 9400,
    avgHr: 115,
    maxHr: 132,
    avgPowerW: null,
    normalizedPowerW: null,
    tss: 14,
    intensityFactor: 0.54,
    avgSpeedMps: 5.6,
    elevationGainM: 52,
    calories: 230,
    linkedGymTemplateId: null,
  },
  {
    activityId: "1096412891",
    name: "Schwimmtraining CSS & Technik",
    sportType: "swimming",
    isCommute: false,
    startTime: `${getRelativeDate(-4)}T06:45:00Z`,
    durationSec: 3300,
    distanceM: 2500,
    avgHr: 142,
    maxHr: 165,
    avgPowerW: null,
    normalizedPowerW: null,
    tss: 52,
    intensityFactor: 0.82,
    avgSpeedMps: 0.76,
    elevationGainM: 0,
    poolLengthM: 25,
    swolf: 34,
    calories: 580,
    linkedGymTemplateId: null,
  },
  {
    activityId: "1095982103",
    name: "Sweetspot Over-Under 3x12min",
    sportType: "road_cycling",
    isCommute: false,
    startTime: `${getRelativeDate(-5)}T14:30:00Z`,
    durationSec: 5400,
    distanceM: 48200,
    avgHr: 152,
    maxHr: 174,
    avgPowerW: 235,
    normalizedPowerW: 258,
    avgCadence: 90,
    tss: 96,
    intensityFactor: 0.90,
    avgSpeedMps: 8.92,
    elevationGainM: 480,
    calories: 1150,
    linkedGymTemplateId: null,
  },
  {
    activityId: "1095551234",
    name: "Regenerativer Abendlauf 6km",
    sportType: "running",
    isCommute: false,
    startTime: `${getRelativeDate(-7)}T18:15:00Z`,
    durationSec: 1980, // 33 min
    distanceM: 6200,
    avgHr: 136,
    maxHr: 148,
    avgPowerW: 250,
    normalizedPowerW: 255,
    avgCadence: 172,
    avgPaceSecPerKm: 319, // 5:19 min/km
    tss: 34,
    intensityFactor: 0.72,
    avgSpeedMps: 3.13,
    elevationGainM: 30,
    calories: 430,
    linkedGymTemplateId: null,
  },
];

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

export const initialPlannedWorkouts: MockPlannedWorkout[] = [
  {
    id: 101,
    date: getRelativeDate(0),
    slotIndex: 1,
    sportType: "zwift",
    title: "Polarized VO2max 4x4min",
    durationMin: 65,
    targetTss: 78,
    gymTemplateCode: null,
    description: "4x 4min bei 115% FTP (328W) mit je 4min Pause. Hohe Sauerstoffaufnahme bei optimaler Readiness (89).",
    structuredStepsJson: [
      { durationSec: 600, targetFtpPct: 65, cadence: 90, label: "Warmup" },
      { durationSec: 240, targetFtpPct: 115, cadence: 96, label: "Intervall 1 @ 328W" },
      { durationSec: 240, targetFtpPct: 50, cadence: 85, label: "Pause" },
      { durationSec: 240, targetFtpPct: 115, cadence: 96, label: "Intervall 2 @ 328W" },
      { durationSec: 240, targetFtpPct: 50, cadence: 85, label: "Pause" },
      { durationSec: 240, targetFtpPct: 115, cadence: 96, label: "Intervall 3 @ 328W" },
      { durationSec: 240, targetFtpPct: 50, cadence: 85, label: "Pause" },
      { durationSec: 240, targetFtpPct: 115, cadence: 96, label: "Intervall 4 @ 328W" },
      { durationSec: 600, targetFtpPct: 50, cadence: 85, label: "Cooldown" },
    ],
    zwoXml: sampleZwoXml,
    syncedToZwift: true,
    status: "planned",
  },
  {
    id: 102,
    date: getRelativeDate(1),
    slotIndex: 1,
    sportType: "gym",
    title: "Gym Plan B (Oberkörper & Lats)",
    durationMin: 60,
    targetTss: 40,
    gymTemplateCode: "B",
    description: "Fokus auf Zugmuskulatur & Rotatorenmanschette. Beine schonen für die Ausdauerblöcke.",
    syncedToZwift: false,
    status: "planned",
  },
  {
    id: 103,
    date: getRelativeDate(2),
    slotIndex: 1,
    sportType: "running",
    title: "Z2 Grundlagenausdauer Lauf 12km",
    durationMin: 65,
    targetTss: 58,
    gymTemplateCode: null,
    description: "Lockeres Aerobes Laufen bei 5:05 - 5:20 min/km mit Fokus auf 175+ spm Schrittfrequenz.",
    syncedToZwift: false,
    status: "planned",
  },
  {
    id: 104,
    date: getRelativeDate(3),
    slotIndex: 1,
    sportType: "swimming",
    title: "CSS Ausdauer 2600m",
    durationMin: 50,
    targetTss: 45,
    gymTemplateCode: null,
    description: "Hauptblock: 6x 300m @ CSS + 3s mit Pullbuoy.",
    syncedToZwift: false,
    status: "planned",
  },
  {
    id: 105,
    date: getRelativeDate(4),
    slotIndex: 1,
    sportType: "rest",
    title: "Aktiver Ruhetag / Mobility",
    durationMin: 20,
    targetTss: 0,
    gymTemplateCode: null,
    description: "Spaziergang und Foam Rolling zur Beinerholung.",
    syncedToZwift: false,
    status: "planned",
  },
  {
    id: 106,
    date: getRelativeDate(5),
    slotIndex: 1,
    sportType: "road_cycling",
    title: "Zone 2 Ausfahrt 3h (195W)",
    durationMin: 180,
    targetTss: 135,
    gymTemplateCode: null,
    description: "Aerobe Fettstoffwechselbasis bei 65-72% FTP.",
    syncedToZwift: false,
    status: "planned",
  },
  {
    id: 107,
    date: getRelativeDate(6),
    slotIndex: 1,
    sportType: "gym",
    title: "Gym Plan A (Squat & Leg Drive)",
    durationMin: 65,
    targetTss: 50,
    gymTemplateCode: "A",
    description: "Schwere Safety Bar Kniebeugen mit RIR 2, danach RDLs.",
    syncedToZwift: false,
    status: "planned",
  },
];
