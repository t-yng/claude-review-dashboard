import { mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { reviewSessionSchema, type ReviewSession } from "@/lib/schema/review";

/** Destination for review history (~/.config/ai-review-dashboard/sessions). */
const SESSIONS_DIR = join(homedir(), ".config", "ai-review-dashboard", "sessions");

async function ensureDir(): Promise<void> {
  await mkdir(SESSIONS_DIR, { recursive: true });
}

/** Save a ReviewSession as a JSON file (history, optional). */
export async function saveSession(session: ReviewSession): Promise<void> {
  await ensureDir();
  const path = join(SESSIONS_DIR, `${session.id}.json`);
  await writeFile(path, JSON.stringify(session, null, 2), "utf8");
}

/** Load a single session. Returns null if it does not exist. */
export async function loadSession(id: string): Promise<ReviewSession | null> {
  try {
    const raw = await readFile(join(SESSIONS_DIR, `${id}.json`), "utf8");
    return reviewSessionSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** Return saved session IDs, newest first (simple). */
export async function listSessionIds(): Promise<string[]> {
  try {
    const files = await readdir(SESSIONS_DIR);
    return files.filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""));
  } catch {
    return [];
  }
}
