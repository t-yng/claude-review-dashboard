import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { appSettingsSchema, DEFAULT_SETTINGS, type AppSettings } from "@/lib/schema/settings";

/** 設定ファイルの保存先（~/.config/ai-review-dashboard）。 */
const CONFIG_DIR = join(homedir(), ".config", "ai-review-dashboard");
const SETTINGS_PATH = join(CONFIG_DIR, "settings.json");

async function ensureDir(): Promise<void> {
  await mkdir(CONFIG_DIR, { recursive: true });
}

/** 設定を読み込む。未作成・壊れている場合はデフォルトを返す。 */
export async function loadSettings(): Promise<AppSettings> {
  try {
    const raw = await readFile(SETTINGS_PATH, "utf8");
    const parsed = appSettingsSchema.safeParse(JSON.parse(raw));
    if (parsed.success) {
      return parsed.data;
    }
    // 一部欠損などはデフォルトでマージ。
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AppSettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/** 設定を検証して保存する。 */
export async function saveSettings(input: unknown): Promise<AppSettings> {
  const settings = appSettingsSchema.parse(input);
  await ensureDir();
  await writeFile(SETTINGS_PATH, JSON.stringify(settings, null, 2), "utf8");
  return settings;
}
