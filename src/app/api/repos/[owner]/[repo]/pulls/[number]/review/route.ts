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
 * レビューを実行し ReviewSession を返す。
 * - `Accept: text/event-stream` の場合は進捗を SSE でストリーミングし、最後に session を流す。
 * - それ以外は完了後に JSON 一括返却。
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

/** SSE で進捗イベントを流しながらレビューを実行する。 */
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
