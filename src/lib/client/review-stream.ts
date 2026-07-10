import type { ReviewSession } from "@/lib/schema/review";
import type { ReviewProgress } from "@/lib/review/engine";

interface StreamHandlers {
  onProgress?: (p: ReviewProgress) => void;
  onSession?: (s: ReviewSession) => void;
  onError?: (message: string) => void;
  signal?: AbortSignal;
}

/**
 * Subscribe to a review run over the IPC bridge. Mirrors the former SSE-based
 * client: forwards `progress` / `session` / `error` callbacks and resolves once
 * the run finishes. Aborting the provided signal cancels the run in the main
 * process.
 */
export function streamReview(
  owner: string,
  repo: string,
  number: number,
  handlers: StreamHandlers,
): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const onAbort = () => run.cancel();
    const finish = () => {
      if (settled) return;
      settled = true;
      handlers.signal?.removeEventListener("abort", onAbort);
      resolve();
    };

    const run = window.api.review.run(owner, repo, number, {
      onProgress: handlers.onProgress,
      onSession: (s) => {
        handlers.onSession?.(s);
        finish();
      },
      onError: (message) => {
        handlers.onError?.(message);
        finish();
      },
    });

    if (handlers.signal) {
      if (handlers.signal.aborted) run.cancel();
      else handlers.signal.addEventListener("abort", onAbort);
    }
  });
}
