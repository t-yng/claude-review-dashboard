import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

/** Destination for AI output logs (~/.config/ai-review-dashboard/logs). */
const LOGS_DIR = join(homedir(), ".config", "ai-review-dashboard", "logs");

export interface ReviewLogContext {
  owner: string;
  repo: string;
  prNumber: number;
  model: string;
  /** Which run stage this is, e.g. "initial" or "retry". */
  attempt: string;
  /** Whether extraction succeeded (for filtering during debugging). */
  extracted: boolean;
}

/**
 * Save the AI's raw output to a log file (for debugging).
 * Lets you inspect outputs that failed JSON extraction afterward.
 * Failures here do not stop the review (log saving is best-effort).
 * Returns the saved file path (or null on failure).
 */
export async function saveAiOutputLog(text: string, ctx: ReviewLogContext): Promise<string | null> {
  try {
    await mkdir(LOGS_DIR, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const safeRepo = `${ctx.owner}-${ctx.repo}`.replace(/[^a-zA-Z0-9_-]/g, "_");
    const fileName = `${timestamp}_${safeRepo}_pr${ctx.prNumber}_${ctx.attempt}.log`;
    const path = join(LOGS_DIR, fileName);

    const header = [
      `# AI Output Log`,
      `timestamp: ${new Date().toISOString()}`,
      `repo: ${ctx.owner}/${ctx.repo}`,
      `pr: #${ctx.prNumber}`,
      `model: ${ctx.model}`,
      `attempt: ${ctx.attempt}`,
      `extracted: ${ctx.extracted}`,
      `${"=".repeat(60)}`,
      "",
    ].join("\n");

    await writeFile(path, header + text, "utf8");
    return path;
  } catch {
    // A failure to save the log must not affect the review process.
    return null;
  }
}
