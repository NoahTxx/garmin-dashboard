import { NextResponse } from "next/server";
import { getGymTemplates, saveOrUpdateGymTemplate, linkActivityGymTemplate } from "@/lib/store";

export async function GET() {
  const templates = await getGymTemplates();
  return NextResponse.json(templates);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, payload } = body;

    if (action === "save_template") {
      const template = await saveOrUpdateGymTemplate(payload);
      return NextResponse.json({ success: true, template });
    }

    if (action === "link_activity") {
      const { activityId, templateId } = payload;
      const updated = await linkActivityGymTemplate(activityId, templateId);
      return NextResponse.json({ success: true, updated });
    }

    return NextResponse.json({ error: "Unbekannte Aktion" }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gym API Fehler";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
