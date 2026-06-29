import { NextResponse } from "next/server";
import { getPullDetail } from "@/lib/github/pulls";
import { loadSettings } from "@/lib/settings/store";
import { saveSession } from "@/lib/settings/sessions";
import { runReview, type ReviewProgress } from "@/lib/review/engine";
import { errorResponse, type RouteParams } from "@/lib/api";

export const dynamic = "force-dynamic";
export const maxDuration = 600;

/**
 * POST /api/repos/{owner}/{repo}/pulls/{number}/review
 * Run a review and return a ReviewSession.
 * - With `Accept: text/event-stream`, streams progress over SSE and emits the session last.
 * - Otherwise, returns the JSON in one response after completion.
 */
export async function POST(
  req: Request,
  { params }: RouteParams<{ owner: string; repo: string; number: string }>,
) {
  const { owner, repo, number } = await params;
  const prNumber = Number(number);
  const wantsStream = req.headers.get("accept")?.includes("text/event-stream");

  if (wantsStream) {
    return streamReview(owner, repo, prNumber);
  }

  try {
    const [pr, settings] = await Promise.all([
      getPullDetail(owner, repo, prNumber),
      loadSettings(),
    ]);
    const session = await runReview({ owner, repo, pr, settings });
    await saveSession(session).catch(() => {});
    return NextResponse.json(session);
  } catch (error) {
    return errorResponse(error);
  }
}

/** Run the review while streaming progress events over SSE. */
function streamReview(owner: string, repo: string, prNumber: number): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      const onProgress = (p: ReviewProgress) => send("progress", p);

      try {
        const [pr, settings] = await Promise.all([
          getPullDetail(owner, repo, prNumber),
          loadSettings(),
        ]);
        const session = await runReview({ owner, repo, pr, settings, onProgress });
        await saveSession(session).catch(() => {});
        send("session", session);
      } catch (error) {
        send("error", {
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
