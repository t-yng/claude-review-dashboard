import { NextResponse } from "next/server";
import { getAuthStatus } from "@/lib/github/auth";
import { errorResponse } from "@/lib/api";

export const dynamic = "force-dynamic";

/** GET /api/auth/status — gh login state and username */
export async function GET() {
  try {
    const status = await getAuthStatus();
    return NextResponse.json(status);
  } catch (error) {
    return errorResponse(error);
  }
}
