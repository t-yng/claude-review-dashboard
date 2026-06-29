import { NextResponse } from "next/server";
import { listRepos } from "@/lib/github/repos";
import { errorResponse } from "@/lib/api";

export const dynamic = "force-dynamic";

/** GET /api/repos?owner=foo — list of accessible repositories (optionally filtered by owner) */
export async function GET(request: Request) {
  try {
    const owner = new URL(request.url).searchParams.get("owner") ?? undefined;
    const repos = await listRepos(owner);
    return NextResponse.json({ repos });
  } catch (error) {
    return errorResponse(error);
  }
}
