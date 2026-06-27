/** サポートするロケール定義。UI 表示言語にのみ使用する（レビュー出力言語はプロンプトで制御）。 */
export const locales = ["ja", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "ja";

/** ロケールを保持する Cookie 名。 */
export const LOCALE_COOKIE = "locale";

/** 各ロケールの表示名（言語切替 UI 用）。 */
export const LOCALE_LABELS: Record<Locale, string> = {
  ja: "日本語",
  en: "English",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && locales.includes(value as Locale);
}
