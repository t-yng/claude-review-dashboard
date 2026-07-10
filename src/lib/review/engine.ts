import { query } from "@anthropic-ai/claude-agent-sdk";
import { randomUUID } from "node:crypto";
import { buildReviewPrompt, JSON_ONLY_RETRY_PROMPT } from "./prompt";
import { extractReviewItems } from "./extract";
import { checkoutPr } from "./checkout";
import { saveAiOutputLog } from "./log";
import type { PullRequestDetail } from "@/lib/schema/github";
import type { AppSettings } from "@/lib/schema/settings";
import type { ReviewItem, ReviewSession } from "@/lib/schema/review";

/** A stage of review progress. Can be streamed to the client over SSE. */
export type ReviewProgress =
  | { phase: "checkout"; message: string }
  | { phase: "generating"; message: string }
  | { phase: "done"; message: string }
  | { phase: "error"; message: string };

export type ProgressCallback = (p: ReviewProgress) => void;

export interface RunReviewParams {
  owner: string;
  repo: string;
  pr: PullRequestDetail;
  settings: AppSettings;
  onProgress?: ProgressCallback;
  /** Optional controller to cancel the underlying SDK query. */
  abortController?: AbortController;
}

/**
 * Core of a single review run.
 * checkout → run query → extract JSON (retry once on failure) → return a ReviewSession.
 * Cleans up the temporary directory on completion.
 */
export async function runReview(params: RunReviewParams): Promise<ReviewSession> {
  const { owner, repo, pr, settings, onProgress, abortController } = params;
  const emit = (p: ReviewProgress) => onProgress?.(p);

  emit({ phase: "checkout", message: "Fetching the PR into a temporary directory…" });
  const checkout = await checkoutPr(owner, repo, pr.number);

  try {
    emit({ phase: "generating", message: "Analyzing the repository and generating the review…" });
    const prompt = buildReviewPrompt(pr, settings.reviewPrompt);

    let text = await runQuery(prompt, settings.model, checkout.dir, emit, abortController);
    let items = extractReviewItems(text);

    // Always save the AI's raw output for debugging.
    await saveAiOutputLog(text, {
      owner,
      repo,
      prNumber: pr.number,
      model: settings.model,
      attempt: "initial",
      extracted: items !== null,
    });

    if (items === null) {
      // Retry just once (re-instruct it to return JSON only).
      emit({ phase: "generating", message: "Failed to parse the output. Retrying…" });
      text = await runQuery(
        `${prompt}\n\n${JSON_ONLY_RETRY_PROMPT}`,
        settings.model,
        checkout.dir,
        emit,
        abortController,
      );
      items = extractReviewItems(text);

      await saveAiOutputLog(text, {
        owner,
        repo,
        prNumber: pr.number,
        model: settings.model,
        attempt: "retry",
        extracted: items !== null,
      });
    }

    if (items === null) {
      throw new Error(
        "Could not extract valid review JSON from the AI output. " +
          "Try changing the prompt or model and run again. " +
          "(The AI's raw output was saved to ~/.config/claude-review-dashboard/logs/)",
      );
    }

    const session: ReviewSession = {
      id: randomUUID(),
      repo: `${owner}/${repo}`,
      prNumber: pr.number,
      headSha: pr.headRefOid,
      promptUsed: settings.reviewPrompt,
      model: settings.model,
      items: normalizeItems(items),
      createdAt: new Date().toISOString(),
    };

    emit({ phase: "done", message: `Generated ${session.items.length} findings.` });
    return session;
  } finally {
    await checkout.cleanup();
  }
}

/** Run the SDK's query() and return the final assistant body (result). */
async function runQuery(
  prompt: string,
  model: string,
  cwd: string,
  emit: ProgressCallback,
  abortController?: AbortController,
): Promise<string> {
  const result = query({
    prompt,
    options: {
      systemPrompt: { type: "preset", preset: "claude_code" },
      model,
      cwd,
      allowedTools: ["Read", "Grep", "Glob", "Bash"],
      permissionMode: "bypassPermissions",
      abortController,
    },
  });

  let finalText = "";

  for await (const message of result) {
    if (message.type === "assistant") {
      emit({ phase: "generating", message: "Claude is writing the review…" });
    } else if (message.type === "result") {
      if (message.subtype === "success") {
        finalText = message.result;
      } else {
        const detail =
          "errors" in message && message.errors?.length
            ? message.errors.join("; ")
            : message.subtype;
        throw new Error(`Review run failed: ${detail}`);
      }
    }
  }

  return finalText;
}

/** Ensure id / status are filled in. */
function normalizeItems(items: ReviewItem[]): ReviewItem[] {
  return items.map((item) => ({
    ...item,
    id: item.id ?? randomUUID(),
    status: item.status ?? "pending",
  }));
}
