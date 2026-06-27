import { NextResponse } from "next/server";
import { listPulls } from "@/lib/github/pulls";
import { errorResponse, type RouteParams } from "@/lib/api";

export const dynamic = "force-dynamic";

/** GET /api/repos/{owner}/{repo}/pulls — PR 一覧 */
export async function GET(_req: Request, { params }: RouteParams<{ owner: string; repo: string }>) {
  try {
    const { owner, repo } = await params;
    const pulls = await listPulls(owner, repo);
    return NextResponse.json({ pulls });
  } catch (error) {
    return errorResponse(error);
  }
}
