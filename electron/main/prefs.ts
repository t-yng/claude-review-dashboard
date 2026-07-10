import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";

/**
 * Small store for UI preferences (currently just the display locale), kept next
 * to the app's other config under ~/.config/claude-review-dashboard. Replaces the
 * cookie-based locale persistence used by the former Next.js server.
 */
const CONFIG_DIR = join(homedir(), ".config", "claude-review-dashboard");
const PREFS_PATH = join(CONFIG_DIR, "ui.json");

interface UiPrefs {
  locale: Locale;
}

export async function getLocale(): Promise<Locale> {
  try {
    const raw = await readFile(PREFS_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<UiPrefs>;
    if (isLocale(parsed.locale)) return parsed.locale;
  } catch {
    // fall through to default
  }
  return defaultLocale;
}

export async function setLocale(locale: Locale): Promise<void> {
  if (!isLocale(locale)) return;
  await mkdir(CONFIG_DIR, { recursive: true });
  await writeFile(PREFS_PATH, JSON.stringify({ locale } satisfies UiPrefs, null, 2), "utf8");
}
