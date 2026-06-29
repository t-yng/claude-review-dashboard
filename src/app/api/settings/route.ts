import { NextResponse } from "next/server";
import { loadSettings, saveSettings } from "@/lib/settings/store";
import { errorResponse } from "@/lib/api";

export const dynamic = "force-dynamic";

/** GET /api/settings — fetch AppSettings */
export async function GET() {
  try {
    const settings = await loadSettings();
    return NextResponse.json(settings);
  } catch (error) {
    return errorResponse(error);
  }
}

/** PUT /api/settings — update AppSettings */
export async function PUT(req: Request) {
  try {
    const settings = await saveSettings(await req.json());
    return NextResponse.json(settings);
  } catch (error) {
    return errorResponse(error);
  }
}
