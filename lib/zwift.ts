export interface StructuredInterval {
  durationSec: number;
  targetFtpPct: number; // e.g. 115 for 115%
  cadence?: number;
  label: string;
}

export function generateZwoXml(title: string, description: string, intervals: StructuredInterval[]): string {
  const stepsXml = intervals
    .map((step) => {
      const powerDec = (step.targetFtpPct / 100).toFixed(2);
      const cadenceAttr = step.cadence ? ` Cadence="${step.cadence}"` : "";
      if (step.targetFtpPct <= 65) {
        return `    <SteadyState Duration="${step.durationSec}" Power="${powerDec}"${cadenceAttr}/>`;
      }
      return `    <SteadyState Duration="${step.durationSec}" Power="${powerDec}"${cadenceAttr}/>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<workout_file>
  <author>AI Performance Coach</author>
  <name>${escapeXml(title)}</name>
  <description>${escapeXml(description)}</description>
  <sportType>bike</sportType>
  <workout>
${stepsXml}
  </workout>
</workout_file>`;
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      case '"':
        return "&quot;";
      default:
        return c;
    }
  });
}

export async function pushWorkoutToIntervalsIcu(params: {
  date: string; // YYYY-MM-DD
  title: string;
  description: string;
  durationMin: number;
  zwoXml: string;
}): Promise<{ success: boolean; eventId?: string; error?: string }> {
  const athleteId = process.env.INTERVALS_ATHLETE_ID;
  const apiKey = process.env.INTERVALS_API_KEY;

  if (!athleteId || !apiKey) {
    return {
      success: false,
      error: "INTERVALS_ATHLETE_ID oder INTERVALS_API_KEY nicht in Umgebungsvariablen konfiguriert.",
    };
  }

  try {
    const authHeader = `Basic ${Buffer.from(`API_KEY:${apiKey}`).toString("base64")}`;
    const payload = {
      start_date_local: `${params.date}T09:00:00`,
      type: "Ride",
      name: params.title,
      description: params.description,
      moving_time: params.durationMin * 60,
      file_contents: params.zwoXml,
      file_contents_type: "zwo",
    };

    const res = await fetch(`https://intervals.icu/api/v1/athlete/${athleteId}/events`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `Intervals.icu API Fehler (${res.status}): ${errText}` };
    }

    const data = await res.json();
    return { success: true, eventId: data.id?.toString() };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Netzwerkfehler";
    return { success: false, error: msg };
  }
}
