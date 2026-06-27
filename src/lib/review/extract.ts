import { llmReviewItemsSchema, type ReviewItem } from "@/lib/schema/review";
import { randomUUID } from "node:crypto";

/**
 * Extract and validate ReviewItem[] from the LLM's final message string.
 * - Prefers extracting a ```json block if present
 * - Otherwise searches for the first [ ... ] / { ... }
 * - Also absorbs the `{ "items": [...] }` shape
 * Returns null if extraction/validation fails (the caller decides whether to retry).
 */
export function extractReviewItems(text: string): ReviewItem[] | null {
  // Try candidates in priority order and take the first one that parses and validates.
  // To avoid breaking when `body` / `codeSnippet` contain nested ``` fences,
  // prefer candidates sliced by bracket balancing (ignoring brackets inside string literals).
  for (const candidate of findJsonCandidates(text)) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(candidate);
    } catch {
      continue;
    }

    // Normalize the `{ items: [...] }` shape into an array.
    const arrayLike =
      Array.isArray(parsed) || parsed == null ? parsed : (parsed as { items?: unknown }).items;

    const result = llmReviewItemsSchema.safeParse(arrayLike);
    if (!result.success) continue;

    return result.data.map((item) => ({
      ...item,
      side: item.side ?? "RIGHT",
      codeSnippet: item.codeSnippet ?? "",
      id: item.id ?? randomUUID(),
      status: item.status ?? "pending",
    }));
  }

  return null;
}

/**
 * Enumerate candidate JSON strings from the text in priority order.
 * Fence extraction can be cut short by nested ``` inside the body, so we first try
 * bracket-balanced extraction that correctly ignores string literals.
 */
function findJsonCandidates(text: string): string[] {
  const candidates: string[] = [];

  // 1. First array literal ([ ] / ``` inside strings are ignored)
  const arr = sliceBalanced(text, "[", "]");
  if (arr) candidates.push(arr);

  // 2. First object literal
  const obj = sliceBalanced(text, "{", "}");
  if (obj) candidates.push(obj);

  // 3. Contents of a ```json ... ``` block (fallback)
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    const inner = fenced[1].trim();
    if (inner) candidates.push(inner);
  }

  return candidates;
}

/** Slice out the first block where open/close are balanced (ignoring brackets in string literals). */
function sliceBalanced(text: string, open: string, close: string): string | null {
  const start = text.indexOf(open);
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}
