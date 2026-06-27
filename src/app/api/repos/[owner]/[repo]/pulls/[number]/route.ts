import { NextResponse } from "next/server";
import { getPullDetail } from "@/lib/github/pulls";
import { errorResponse, type RouteParams } from "@/lib/api";

export const dynamic = "force-dynamic";

/** GET /api/repos/{owner}/{repo}/pulls/{number} — PR 詳細（diff・headSha 含む） */
export async function GET(
  _req: Request,
  { params }: RouteParams<{ owner: string; repo: string; number: string }>,
) {
  try {
    const { owner, repo, number } = await params;
    const detail = await getPullDetail(owner, repo, Number(number));
    return NextResponse.json(detail);
  } catch (error) {
    return errorResponse(error);
  }
}
