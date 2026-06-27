import type { ReviewSession } from "@/lib/schema/review";
import type { ReviewProgress } from "@/lib/review/engine";

interface StreamHandlers {
  onProgress?: (p: ReviewProgress) => void;
  onSession?: (s: ReviewSession) => void;
  onError?: (message: string) => void;
  signal?: AbortSignal;
}

/**
 * Subscribe to a review run over SSE.
 * The server sends `progress` / `session` / `error` events.
 */
export async function streamReview(
  owner: string,
  repo: string,
  number: number,
  handlers: StreamHandlers,
): Promise<void> {
  const res = await fetch(`/api/repos/${owner}/${repo}/pulls/${number}/review`, {
    method: "POST",
    headers: { Accept: "text/event-stream" },
    signal: handlers.signal,
  });

  if (!res.ok || !res.body) {
    let message = `Failed to start the review (${res.status})`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      // ignore
    }
    handlers.onError?.(message);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE separates events with a blank line (\n\n).
    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const chunk = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      dispatch(chunk, handlers);
    }
  }
}

function dispatch(chunk: string, handlers: StreamHandlers): void {
  let event = "message";
  const dataLines: string[] = [];
  for (const line of chunk.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
  }
  if (dataLines.length === 0) return;

  let payload: unknown;
  try {
    payload = JSON.parse(dataLines.join("\n"));
  } catch {
    return;
  }

  if (event === "progress") handlers.onProgress?.(payload as ReviewProgress);
  else if (event === "session") handlers.onSession?.(payload as ReviewSession);
  else if (event === "error") handlers.onError?.((payload as { message: string }).message);
}
