import { gh, getToken } from "./gh";
import { parseDiffRightLines, isLineInDiff } from "./diff";
import type { ReviewItem } from "@/lib/schema/review";

export interface ReviewCommentInput {
  path: string;
  line: number;
  side: "RIGHT" | "LEFT";
  start_line?: number;
  start_side?: "RIGHT" | "LEFT";
  body: string;
}

export interface SubmitResult {
  submittedIds: string[];
  skipped: { id: string; reason: string }[];
  reviewUrl?: string;
}

/** Convert a ReviewItem into the GitHub inline comment format. */
function toComment(item: ReviewItem): ReviewCommentInput {
  const comment: ReviewCommentInput = {
    path: item.filePath,
    line: item.endLine,
    side: item.side,
    body: formatBody(item),
  };
  if (item.startLine !== item.endLine) {
    comment.start_line = item.startLine;
    comment.start_side = item.side;
  }
  return comment;
}

/** Prepend a severity/category heading to the finding body. */
function formatBody(item: ReviewItem): string {
  const badge = `**[${item.severity.toUpperCase()} / ${item.category}] ${item.title}**`;
  return `${badge}\n\n${item.body}\n\n<sub>🤖 AI Review Dashboard</sub>`;
}

/**
 * Submit the selected ReviewItems together as a single Review (event: COMMENT).
 * Lines outside the diff range are skipped as not inline-commentable.
 */
export async function submitReview(
  owner: string,
  repo: string,
  prNumber: number,
  headSha: string,
  diff: string,
  items: ReviewItem[],
): Promise<SubmitResult> {
  const diffMap = parseDiffRightLines(diff);
  const comments: ReviewCommentInput[] = [];
  const submittedIds: string[] = [];
  const skipped: { id: string; reason: string }[] = [];

  for (const item of items) {
    if (!isLineInDiff(diffMap, item.filePath, item.endLine)) {
      skipped.push({
        id: item.id,
        reason: `${item.filePath}:${item.endLine} is not part of the PR diff, so it cannot be posted inline.`,
      });
      continue;
    }
    comments.push(toComment(item));
    submittedIds.push(item.id);
  }

  if (comments.length === 0) {
    return { submittedIds: [], skipped };
  }

  // POST to the REST reviews endpoint via gh api.
  const payload = JSON.stringify({
    commit_id: headSha,
    event: "COMMENT",
    comments,
  });

  // gh resolves auth internally, but we also fetch the token as an explicit check.
  await getToken();

  const out = await gh(
    [
      "api",
      "--method",
      "POST",
      `/repos/${owner}/${repo}/pulls/${prNumber}/reviews`,
      "--input",
      "-",
    ],
    { input: payload },
  );

  let reviewUrl: string | undefined;
  try {
    const parsed = JSON.parse(out) as { html_url?: string };
    reviewUrl = parsed.html_url;
  } catch {
    // ignore
  }

  return { submittedIds, skipped, reviewUrl };
}
