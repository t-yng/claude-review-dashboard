import { query } from "@anthropic-ai/claude-agent-sdk";
import { resolveClaudeExecutable } from "./claude-executable";
import type { ModelOption } from "@/lib/schema/settings";

/** Cached for the app session so the settings screen doesn't respawn the CLI. */
let cache: Promise<ModelOption[]> | null = null;

/**
 * List the models available to the user's account via the Agent SDK.
 * Starts a throwaway query, asks it for `supportedModels()`, then aborts it.
 * Failures are not cached so the next call can retry.
 */
export function listModels(): Promise<ModelOption[]> {
  if (!cache) {
    cache = fetchModels().catch((error) => {
      cache = null;
      throw error;
    });
  }
  return cache;
}

async function fetchModels(): Promise<ModelOption[]> {
  const pathToClaudeCodeExecutable = resolveClaudeExecutable();
  const abortController = new AbortController();

  // A never-yielding prompt keeps the CLI idle (no model call) until aborted.
  const q = query({
    prompt: (async function* () {
      await new Promise<void>((resolve) =>
        abortController.signal.addEventListener("abort", () => resolve()),
      );
      yield* [];
    })(),
    options: {
      abortController,
      ...(pathToClaudeCodeExecutable ? { pathToClaudeCodeExecutable } : {}),
    },
  });

  try {
    const models = await q.supportedModels();
    return models.map((m) => ({
      value: m.value,
      resolvedModel: m.resolvedModel,
      displayName: m.displayName,
      description: m.description,
    }));
  } finally {
    abortController.abort();
    q.close();
  }
}

/**
 * Resolve a model alias (e.g. "opus") to its concrete id. Falls back to the
 * given value when the list is unavailable or has no match.
 */
export async function resolveModelId(model: string): Promise<string> {
  try {
    const found = (await listModels()).find((m) => m.value === model);
    return found?.resolvedModel ?? model;
  } catch {
    return model;
  }
}
