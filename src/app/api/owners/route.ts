import { NextResponse } from "next/server";
import { listOwners } from "@/lib/github/repos";
import { errorResponse } from "@/lib/api";

export const dynamic = "force-dynamic";

/** GET /api/owners — candidate repository owners (yourself + your organizations) */
export async function GET() {
  try {
    const owners = await listOwners();
    return NextResponse.json({ owners });
  } catch (error) {
    return errorResponse(error);
  }
}
