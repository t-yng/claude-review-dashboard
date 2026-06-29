import { NextResponse } from "next/server";
import { z } from "zod";
import { getPullDetail } from "@/lib/github/pulls";
import { submitReview } from "@/lib/github/reviews";
import { reviewItemSchema } from "@/lib/schema/review";
import { errorResponse, type RouteParams } from "@/lib/api";
import { randomUUID } from "node:crypto";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  headSha: z.string().optional(),
  items: z.array(reviewItemSchema).min(1),
});

/**
 * POST /api/repos/{owner}/{repo}/pulls/{number}/comments
 * Post the selected ReviewItem[] inline as a single Review (COMMENT).
 */
export async function POST(
  req: Request,
  { params }: RouteParams<{ owner: string; repo: string; number: string }>,
) {
  try {
    const { owner, repo, number } = await params;
    const prNumber = Number(number);
    const parsed = bodySchema.parse(await req.json());

    // Fetch the latest diff / headSha to validate whether posting is possible.
    const pr = await getPullDetail(owner, repo, prNumber);
    const headSha = parsed.headSha ?? pr.headRefOid;

    const items = parsed.items.map((item) => ({
      ...item,
      id: item.id ?? randomUUID(),
      status: item.status ?? ("pending" as const),
      side: item.side ?? ("RIGHT" as const),
      codeSnippet: item.codeSnippet ?? "",
    }));

    const result = await submitReview(owner, repo, prNumber, headSha, pr.diff, items);
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
