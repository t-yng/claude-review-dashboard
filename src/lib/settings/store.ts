import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { appSettingsSchema, DEFAULT_SETTINGS, type AppSettings } from "@/lib/schema/settings";

/** Destination for the settings file (~/.config/claude-review-dashboard). */
const CONFIG_DIR = join(homedir(), ".config", "claude-review-dashboard");
const SETTINGS_PATH = join(CONFIG_DIR, "settings.json");

async function ensureDir(): Promise<void> {
  await mkdir(CONFIG_DIR, { recursive: true });
}

/** Load settings. Returns defaults if not yet created or corrupted. */
export async function loadSettings(): Promise<AppSettings> {
  try {
    const raw = await readFile(SETTINGS_PATH, "utf8");
    const parsed = appSettingsSchema.safeParse(JSON.parse(raw));
    if (parsed.success) {
      return parsed.data;
    }
    // Merge with defaults to fill in any missing fields.
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AppSettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/** Validate and save settings. */
export async function saveSettings(input: unknown): Promise<AppSettings> {
  const settings = appSettingsSchema.parse(input);
  await ensureDir();
  await writeFile(SETTINGS_PATH, JSON.stringify(settings, null, 2), "utf8");
  return settings;
}
