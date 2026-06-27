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
}

/**
 * Core of a single review run.
 * checkout → run query → extract JSON (retry once on failure) → return a ReviewSession.
 * Cleans up the temporary directory on completion.
 */
export async function runReview(params: RunReviewParams): Promise<ReviewSession> {
  const { owner, repo, pr, settings, onProgress } = params;
  const emit = (p: ReviewProgress) => onProgress?.(p);

  emit({ phase: "checkout", message: "PR を一時ディレクトリへ取得しています…" });
  const checkout = await checkoutPr(owner, repo, pr.number);

  try {
    emit({ phase: "generating", message: "リポジトリを解析しレビューを生成しています…" });
    const prompt = buildReviewPrompt(pr, settings.reviewPrompt);

    let text = await runQuery(prompt, settings.model, checkout.dir, emit);
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
      emit({ phase: "generating", message: "出力の解析に失敗。再試行しています…" });
      text = await runQuery(
        `${prompt}\n\n${JSON_ONLY_RETRY_PROMPT}`,
        settings.model,
        checkout.dir,
        emit,
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
        "AI 出力から有効なレビュー JSON を抽出できませんでした。" +
          "プロンプトやモデルを変えて再実行してください。" +
          "（AI の生出力は ~/.config/ai-review-dashboard/logs/ に保存しました）",
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

    emit({ phase: "done", message: `${session.items.length} 件の指摘を生成しました。` });
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
): Promise<string> {
  const result = query({
    prompt,
    options: {
      systemPrompt: { type: "preset", preset: "claude_code" },
      model,
      cwd,
      allowedTools: ["Read", "Grep", "Glob", "Bash"],
      permissionMode: "bypassPermissions",
    },
  });

  let finalText = "";

  for await (const message of result) {
    if (message.type === "assistant") {
      emit({ phase: "generating", message: "Claude がレビューを記述しています…" });
    } else if (message.type === "result") {
      if (message.subtype === "success") {
        finalText = message.result;
      } else {
        const detail =
          "errors" in message && message.errors?.length
            ? message.errors.join("; ")
            : message.subtype;
        throw new Error(`レビュー実行に失敗しました: ${detail}`);
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
